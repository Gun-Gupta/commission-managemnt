/**
 * Seed script for the Commission Management System.
 *
 * Test Hierarchy:
 *   Raj (MANAGER, no manager)
 *    └─ Amit (MANAGER, manager = Raj)
 *        └─ Rahul (AGENT, manager = Amit)
 *
 * Test Leads:
 *   Lead 1: Revenue=100000, Assigned=Rahul  → Full 3-level hierarchy
 *   Lead 2: Revenue=50000,  Assigned=Amit   → 2-level hierarchy (Amit → Raj)
 *   Lead 3: Revenue=75000,  Assigned=Solo   → 1-level hierarchy (no manager)
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Starting seed...');

  // Clean existing data in correct order (respect FK constraints)
  await prisma.commissionLedger.deleteMany();
  await prisma.lead.deleteMany();

  // Delete users in order to avoid FK constraint (reports before managers)
  const allUsers = await prisma.user.findMany({ select: { id: true, managerId: true } });

  // Topological delete: delete users with managers first, then managers
  const withManager = allUsers.filter((u) => u.managerId !== null);
  const withoutManager = allUsers.filter((u) => u.managerId === null);

  for (const u of withManager) {
    await prisma.user.delete({ where: { id: u.id } });
  }
  for (const u of withoutManager) {
    await prisma.user.delete({ where: { id: u.id } });
  }

  // --- Create Users ---
  // Level 3: Raj (top manager)
  const raj = await prisma.user.create({
    data: {
      name: 'Raj',
      email: 'raj@example.com',
      role: 'MANAGER',
    },
  });
  console.log(`✅ Created user: ${raj.name} (${raj.id})`);

  // Level 2: Amit (manager of Rahul, reports to Raj)
  const amit = await prisma.user.create({
    data: {
      name: 'Amit',
      email: 'amit@example.com',
      role: 'MANAGER',
      managerId: raj.id,
    },
  });
  console.log(`✅ Created user: ${amit.name} (${amit.id})`);

  // Level 1: Rahul (agent, reports to Amit)
  const rahul = await prisma.user.create({
    data: {
      name: 'Rahul',
      email: 'rahul@example.com',
      role: 'AGENT',
      managerId: amit.id,
    },
  });
  console.log(`✅ Created user: ${rahul.name} (${rahul.id})`);

  // Solo agent (no manager) — demonstrates 1-level hierarchy
  const solo = await prisma.user.create({
    data: {
      name: 'Solo Agent',
      email: 'solo@example.com',
      role: 'AGENT',
    },
  });
  console.log(`✅ Created user: ${solo.name} (${solo.id})`);

  // --- Create Leads ---
  // Lead 1: Full hierarchy (Rahul → Amit → Raj)
  const lead1 = await prisma.lead.create({
    data: {
      title: 'Website Development',
      customerName: 'ABC Ltd',
      revenue: '100000',
      assignedUserId: rahul.id,
    },
  });
  console.log(`✅ Created lead: ${lead1.title} (Revenue: ${lead1.revenue})`);

  // Lead 2: 2-level hierarchy (Amit → Raj)
  const lead2 = await prisma.lead.create({
    data: {
      title: 'Mobile App Development',
      customerName: 'XYZ Corp',
      revenue: '50000',
      assignedUserId: amit.id,
    },
  });
  console.log(`✅ Created lead: ${lead2.title} (Revenue: ${lead2.revenue})`);

  // Lead 3: 1-level hierarchy (Solo only)
  const lead3 = await prisma.lead.create({
    data: {
      title: 'ERP Implementation',
      customerName: 'Standalone Inc',
      revenue: '75000',
      assignedUserId: solo.id,
    },
  });
  console.log(`✅ Created lead: ${lead3.title} (Revenue: ${lead3.revenue})`);

  // Lead 4: Unassigned open lead
  const lead4 = await prisma.lead.create({
    data: {
      title: 'Cloud Migration',
      customerName: 'Future Tech',
      revenue: '200000',
    },
  });
  console.log(`✅ Created lead: ${lead4.title} (Unassigned, Revenue: ${lead4.revenue})`);

  console.log('\n✨ Seed complete!\n');
  console.log('Test cases:');
  console.log(`  Lead 1 (${lead1.id}): Rahul → Amit → Raj | Revenue: 100000`);
  console.log('    Expected: Company=20000, Rahul=40000, Amit=24000, Raj=16000');
  console.log(`  Lead 2 (${lead2.id}): Amit → Raj | Revenue: 50000`);
  console.log('    Expected: Company=18000, Amit=20000, Raj=12000');
  console.log(`  Lead 3 (${lead3.id}): Solo only | Revenue: 75000`);
  console.log('    Expected: Company=45000, Solo=30000');
  console.log(`  Lead 4 (${lead4.id}): Unassigned | Revenue: 200000`);
  console.log('    Expected: Error - cannot close without assigned user');
}

seed()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
