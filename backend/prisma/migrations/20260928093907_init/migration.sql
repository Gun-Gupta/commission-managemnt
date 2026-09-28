-- CreateEnum
CREATE TYPE "Role" AS ENUM ('AGENT', 'MANAGER');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "BeneficiaryType" AS ENUM ('USER', 'COMPANY');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "managerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "revenue" DECIMAL(15,2) NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'OPEN',
    "assignedUserId" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionLedger" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "userId" TEXT,
    "beneficiaryType" "BeneficiaryType" NOT NULL,
    "level" INTEGER,
    "percentage" DECIMAL(8,4) NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionLedger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_managerId_idx" ON "User"("managerId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "Lead_assignedUserId_idx" ON "Lead"("assignedUserId");

-- CreateIndex
CREATE INDEX "CommissionLedger_leadId_idx" ON "CommissionLedger"("leadId");

-- CreateIndex
CREATE INDEX "CommissionLedger_userId_idx" ON "CommissionLedger"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionLedger_leadId_level_key" ON "CommissionLedger"("leadId", "level");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionLedger" ADD CONSTRAINT "CommissionLedger_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionLedger" ADD CONSTRAINT "CommissionLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
