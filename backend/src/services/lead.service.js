const prisma = require('../lib/prisma');
const { createError } = require('../utils/createError');
const commissionService = require('./commission.service');

const LEAD_SELECT = {
  id: true,
  title: true,
  customerName: true,
  revenue: true,
  status: true,
  assignedUserId: true,
  closedAt: true,
  createdAt: true,
  updatedAt: true,
  assignedUser: {
    select: { id: true, name: true, email: true, role: true },
  },
};

/**
 * Create a new lead.
 */
async function createLead(data) {
  const { title, customerName, revenue } = data;

  const lead = await prisma.lead.create({
    data: {
      title,
      customerName,
      revenue,
    },
    select: LEAD_SELECT,
  });

  return lead;
}

/**
 * Get all leads.
 */
async function getAllLeads() {
  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: 'desc' },
    select: LEAD_SELECT,
  });

  return leads;
}

/**
 * Get a single lead with full hierarchy and optional commission breakdown.
 */
async function getLeadById(id) {
  const lead = await prisma.lead.findUnique({
    where: { id },
    select: {
      ...LEAD_SELECT,
      commissions: {
        select: {
          id: true,
          beneficiaryType: true,
          level: true,
          percentage: true,
          amount: true,
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
        orderBy: { level: 'asc' },
      },
    },
  });

  if (!lead) {
    throw createError('Lead not found.', 404);
  }

  // Build hierarchy
  const hierarchy = await commissionService.getHierarchy(
    prisma,
    lead.assignedUserId
  );

  const result = {
    lead: {
      id: lead.id,
      title: lead.title,
      customerName: lead.customerName,
      revenue: lead.revenue,
      status: lead.status,
      closedAt: lead.closedAt,
      createdAt: lead.createdAt,
      updatedAt: lead.updatedAt,
      assignedUser: lead.assignedUser,
    },
    hierarchy: {
      level1: hierarchy.level1,
      level2: hierarchy.level2,
      level3: hierarchy.level3,
    },
  };

  if (lead.status === 'CLOSED') {
    result.commissionBreakdown = lead.commissions;
  }

  return result;
}

/**
 * Assign a lead to a user.
 */
async function assignLead(leadId, userId) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) {
    throw createError('Lead not found.', 404);
  }

  if (lead.status === 'CLOSED') {
    throw createError('Cannot assign a closed lead.', 409);
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw createError('User not found.', 404);
  }

  const updatedLead = await prisma.lead.update({
    where: { id: leadId },
    data: { assignedUserId: userId },
    select: LEAD_SELECT,
  });

  return updatedLead;
}

/**
 * Close a lead and distribute commission.
 *
 * CONCURRENCY SAFETY:
 * 1. Uses a PostgreSQL transaction.
 * 2. Uses SELECT ... FOR UPDATE (via $queryRaw) to lock the lead row.
 * 3. Re-checks lead status INSIDE the transaction after locking.
 * 4. Database unique constraint (leadId, level) prevents duplicate ledger entries.
 *
 * Idempotency:
 * - If the lead is already CLOSED inside the transaction, returns existing commissions.
 */
async function closeLead(leadId) {
  let result;

  try {
    result = await prisma.$transaction(
      async (tx) => {
        // --- STEP 1: Lock the lead row with SELECT FOR UPDATE ---
        // This prevents concurrent transactions from reading OPEN status simultaneously.
        const rows = await tx.$queryRaw`
          SELECT id, status, "assignedUserId", revenue
          FROM "Lead"
          WHERE id = ${leadId}
          FOR UPDATE
        `;

        if (!rows || rows.length === 0) {
          throw createError('Lead not found.', 404);
        }

        const lockedLead = rows[0];

        // --- STEP 2: Idempotency check AFTER acquiring lock ---
        if (lockedLead.status === 'CLOSED') {
          // Another concurrent request already closed it. Return existing commissions.
          const existingCommissions = await tx.commissionLedger.findMany({
            where: { leadId },
            select: {
              id: true,
              beneficiaryType: true,
              level: true,
              percentage: true,
              amount: true,
              user: {
                select: { id: true, name: true, email: true, role: true },
              },
            },
            orderBy: { level: 'asc' },
          });

          const lead = await tx.lead.findUnique({
            where: { id: leadId },
            select: LEAD_SELECT,
          });

          return { lead, commissions: existingCommissions, alreadyClosed: true };
        }

        // --- STEP 3: Validate assigned user ---
        if (!lockedLead.assignedUserId) {
          throw createError(
            'Cannot close a lead without an assigned user.',
            422
          );
        }

        // --- STEP 4: Build hierarchy ---
        const hierarchy = await commissionService.getHierarchy(
          tx,
          lockedLead.assignedUserId
        );

        if (!hierarchy.level1) {
          throw createError('Assigned user not found.', 422);
        }

        // --- STEP 5: Calculate commission ---
        const amounts = commissionService.calculateCommission(
          lockedLead.revenue,
          hierarchy.level2,
          hierarchy.level3
        );

        // --- STEP 6: Build ledger entries ---
        const entries = commissionService.buildLedgerEntries(
          leadId,
          hierarchy,
          amounts,
          lockedLead.revenue
        );

        // --- STEP 7: Insert commission ledger entries ---
        // createMany is atomic; unique constraint (leadId, level) prevents duplicates
        await tx.commissionLedger.createMany({
          data: entries.map((e) => ({
            leadId: e.leadId,
            userId: e.userId,
            beneficiaryType: e.beneficiaryType,
            level: e.level,
            percentage: e.percentage.toString(),
            amount: e.amount.toString(),
          })),
          skipDuplicates: true, // belt-and-suspenders alongside the unique constraint
        });

        // --- STEP 8: Update lead status ---
        const updatedLead = await tx.lead.update({
          where: { id: leadId },
          data: {
            status: 'CLOSED',
            closedAt: new Date(),
          },
          select: LEAD_SELECT,
        });

        // --- STEP 9: Fetch and return commissions ---
        const commissions = await tx.commissionLedger.findMany({
          where: { leadId },
          select: {
            id: true,
            beneficiaryType: true,
            level: true,
            percentage: true,
            amount: true,
            user: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
          orderBy: { level: 'asc' },
        });

        return { lead: updatedLead, commissions, alreadyClosed: false };
      },
      {
        // Use SERIALIZABLE to catch any race conditions the FOR UPDATE might miss
        isolationLevel: 'Serializable',
        timeout: 10000, // 10 seconds max
      }
    );
  } catch (err) {
    // Re-throw custom app errors
    if (err.statusCode) throw err;

    // Handle unique constraint violation (race condition safety net)
    if (err.code === 'P2002') {
      // Commission records already exist — another request won the race
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        select: LEAD_SELECT,
      });
      const commissions = await prisma.commissionLedger.findMany({
        where: { leadId },
        select: {
          id: true,
          beneficiaryType: true,
          level: true,
          percentage: true,
          amount: true,
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
        orderBy: { level: 'asc' },
      });
      return { lead, commissions, alreadyClosed: true };
    }

    throw err;
  }

  return result;
}

module.exports = {
  createLead,
  getAllLeads,
  getLeadById,
  assignLead,
  closeLead,
};
