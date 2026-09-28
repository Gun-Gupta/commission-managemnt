require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    await prisma.$connect();
    const users = await prisma.user.count();
    const leads = await prisma.lead.count();
    const commissions = await prisma.commissionLedger.count();

    console.log('✅ Connected to Neon Cloud DB successfully!\n');
    console.log('📊 Users in DB       :', users);
    console.log('📋 Leads in DB       :', leads);
    console.log('💰 Commission Records:', commissions);

    const userList = await prisma.user.findMany({ select: { name: true, role: true } });
    console.log('\n👥 Users:', userList.map(u => `${u.name} (${u.role})`).join(', '));
    console.log('\n🌐 DB Host: Neon Cloud (AWS us-east-2)');
  } catch (e) {
    console.error('❌ Connection failed:', e.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

check();
