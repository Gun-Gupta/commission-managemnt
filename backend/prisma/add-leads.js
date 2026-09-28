/**
 * Script to add 10 more leads to existing seeded data.
 * Reads existing users from DB to assign leads correctly.
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addLeads() {
  console.log('➕ Adding 10 more leads...');

  // Fetch existing users
  const users = await prisma.user.findMany();
  const rahul = users.find((u) => u.name === 'Rahul');
  const amit  = users.find((u) => u.name === 'Amit');
  const raj   = users.find((u) => u.name === 'Raj');
  const solo  = users.find((u) => u.name === 'Solo Agent');

  const leads = [
    {
      title: 'CRM Integration',
      customerName: 'TechCorp Pvt Ltd',
      revenue: '150000',
      assignedUserId: rahul?.id,
    },
    {
      title: 'E-Commerce Platform',
      customerName: 'ShopEasy Ltd',
      revenue: '250000',
      assignedUserId: amit?.id,
    },
    {
      title: 'HR Management System',
      customerName: 'PeopleFirst Inc',
      revenue: '80000',
      assignedUserId: solo?.id,
    },
    {
      title: 'Inventory Management',
      customerName: 'Storewell Pvt Ltd',
      revenue: '120000',
      assignedUserId: rahul?.id,
    },
    {
      title: 'Digital Marketing Portal',
      customerName: 'AdGrowth Media',
      revenue: '45000',
      assignedUserId: amit?.id,
    },
    {
      title: 'Healthcare App',
      customerName: 'MedPoint Hospitals',
      revenue: '300000',
      assignedUserId: raj?.id,
    },
    {
      title: 'Real Estate Listing System',
      customerName: 'PropView Realty',
      revenue: '175000',
      assignedUserId: rahul?.id,
    },
    {
      title: 'Online Learning Platform',
      customerName: 'EduSmart Solutions',
      revenue: '95000',
      assignedUserId: solo?.id,
    },
    {
      title: 'Logistics Tracking System',
      customerName: 'FastMove Logistics',
      revenue: '210000',
      assignedUserId: amit?.id,
    },
    {
      title: 'Payment Gateway Integration',
      customerName: 'FinPay Technologies',
      revenue: '500000',
      assignedUserId: rahul?.id,
    },
  ];

  for (const lead of leads) {
    const created = await prisma.lead.create({ data: lead });
    const assignedName = users.find((u) => u.id === lead.assignedUserId)?.name || 'Unassigned';
    console.log(`✅ "${created.title}" — ₹${Number(created.revenue).toLocaleString('en-IN')} → ${assignedName}`);
  }

  console.log('\n✨ 10 leads added successfully!\n');
}

addLeads()
  .catch((err) => {
    console.error('❌ Failed:', err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
