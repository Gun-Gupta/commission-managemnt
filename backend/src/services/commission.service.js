const Decimal = require('decimal.js');

/**
 * Commission Distribution Rules:
 *  - Company always gets 20% of revenue
 *  - Level 1 (assigned user) gets 40% of revenue
 *  - Level 2 (manager) gets 24% of revenue
 *  - Level 3 (manager's manager) gets 16% of revenue
 *
 * If Level 2 is missing: Company absorbs 24%
 * If Level 3 is missing: Company absorbs 16%
 */

const COMMISSION_RATES = {
  COMPANY: new Decimal('0.20'),
  LEVEL_1: new Decimal('0.40'),
  LEVEL_2: new Decimal('0.24'),
  LEVEL_3: new Decimal('0.16'),
};

/**
 * Traverse the user hierarchy from the assigned user up to 3 levels.
 * @param {Object} prisma - Prisma client (can be tx client)
 * @param {string} assignedUserId
 * @returns {{ level1: User|null, level2: User|null, level3: User|null }}
 */
async function getHierarchy(prisma, assignedUserId) {
  if (!assignedUserId) {
    return { level1: null, level2: null, level3: null };
  }

  // Level 1 - the assigned user
  const level1 = await prisma.user.findUnique({
    where: { id: assignedUserId },
    select: { id: true, name: true, email: true, role: true, managerId: true },
  });

  if (!level1) {
    return { level1: null, level2: null, level3: null };
  }

  // Level 2 - the manager of the assigned user
  let level2 = null;
  if (level1.managerId) {
    level2 = await prisma.user.findUnique({
      where: { id: level1.managerId },
      select: { id: true, name: true, email: true, role: true, managerId: true },
    });
  }

  // Level 3 - manager's manager
  let level3 = null;
  if (level2 && level2.managerId) {
    level3 = await prisma.user.findUnique({
      where: { id: level2.managerId },
      select: { id: true, name: true, email: true, role: true, managerId: true },
    });
  }

  return { level1, level2, level3 };
}

/**
 * Calculate commission amounts based on revenue and available hierarchy.
 * The total of all commission amounts MUST equal the revenue (no rounding errors).
 *
 * @param {string|number} revenue - Lead revenue
 * @param {Object|null} level2 - Level 2 user (or null)
 * @param {Object|null} level3 - Level 3 user (or null)
 * @returns {{ companyAmount: Decimal, level1Amount: Decimal, level2Amount: Decimal, level3Amount: Decimal }}
 */
function calculateCommission(revenue, level2, level3) {
  const rev = new Decimal(revenue.toString());

  const level1Amount = rev.mul(COMMISSION_RATES.LEVEL_1);
  const level2Amount = level2 ? rev.mul(COMMISSION_RATES.LEVEL_2) : new Decimal('0');
  const level3Amount = level3 ? rev.mul(COMMISSION_RATES.LEVEL_3) : new Decimal('0');

  // Company gets 20% base + any unclaimed level amounts
  const distributedToUsers = level1Amount.plus(level2Amount).plus(level3Amount);
  const companyAmount = rev.minus(distributedToUsers);

  // Validate: total must equal revenue (prevents off-by-one errors)
  const total = companyAmount.plus(level1Amount).plus(level2Amount).plus(level3Amount);
  if (!total.equals(rev)) {
    throw new Error(`Commission calculation error: total ${total} does not equal revenue ${rev}`);
  }

  return {
    companyAmount,
    level1Amount,
    level2Amount,
    level3Amount,
  };
}

/**
 * Build the commission ledger entries to be inserted.
 * Company always gets level = null (uniquely identified in DB by leadId + level = null via unique constraint).
 * We use level 0 for company to satisfy the unique constraint (leadId, level).
 *
 * @param {string} leadId
 * @param {{ level1: User, level2: User|null, level3: User|null }} hierarchy
 * @param {{ companyAmount, level1Amount, level2Amount, level3Amount }} amounts
 * @param {string|number} revenue - Lead revenue for percentage calculation
 * @returns {Array} Array of commission ledger data objects
 */
function buildLedgerEntries(leadId, hierarchy, amounts, revenue) {
  const rev = new Decimal(revenue.toString());
  const entries = [];

  // Company entry (level = 0 represents company in the unique constraint)
  entries.push({
    leadId,
    userId: null,
    beneficiaryType: 'COMPANY',
    level: 0,
    percentage: new Decimal(amounts.companyAmount.toString()).div(rev).mul(100).toDecimalPlaces(4),
    amount: amounts.companyAmount.toDecimalPlaces(2),
  });

  // Level 1
  if (hierarchy.level1) {
    entries.push({
      leadId,
      userId: hierarchy.level1.id,
      beneficiaryType: 'USER',
      level: 1,
      percentage: new Decimal(amounts.level1Amount.toString()).div(rev).mul(100).toDecimalPlaces(4),
      amount: amounts.level1Amount.toDecimalPlaces(2),
    });
  }

  // Level 2
  if (hierarchy.level2 && amounts.level2Amount.gt(0)) {
    entries.push({
      leadId,
      userId: hierarchy.level2.id,
      beneficiaryType: 'USER',
      level: 2,
      percentage: new Decimal(amounts.level2Amount.toString()).div(rev).mul(100).toDecimalPlaces(4),
      amount: amounts.level2Amount.toDecimalPlaces(2),
    });
  }

  // Level 3
  if (hierarchy.level3 && amounts.level3Amount.gt(0)) {
    entries.push({
      leadId,
      userId: hierarchy.level3.id,
      beneficiaryType: 'USER',
      level: 3,
      percentage: new Decimal(amounts.level3Amount.toString()).div(rev).mul(100).toDecimalPlaces(4),
      amount: amounts.level3Amount.toDecimalPlaces(2),
    });
  }

  return entries;
}

module.exports = {
  getHierarchy,
  calculateCommission,
  buildLedgerEntries,
  COMMISSION_RATES,
};
