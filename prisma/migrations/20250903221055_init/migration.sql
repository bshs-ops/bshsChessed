-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "public"."QRType" AS ENUM ('IDENTITY', 'PRESET');

-- CreateEnum
CREATE TYPE "public"."GroupType" AS ENUM ('FUND', 'VOLUNTEER');

-- CreateEnum
CREATE TYPE "public"."DonationSource" AS ENUM ('SCAN', 'MANUAL');

-- CreateEnum
CREATE TYPE "public"."FundingSource" AS ENUM ('RAISED', 'SPONSORED', 'BUDGET', 'COLLECTED');

-- CreateEnum
CREATE TYPE "public"."BudgetCategory" AS ENUM ('GENERAL', 'GROUP');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "password" TEXT,
    "role" "public"."Role" NOT NULL DEFAULT 'ADMIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."GroupType" NOT NULL DEFAULT 'FUND',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Donor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "className" TEXT NOT NULL,
    "gradeName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Donor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."QRCode" (
    "id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "type" "public"."QRType" NOT NULL,
    "donorId" TEXT,
    "presetGroupId" TEXT,
    "presetAmount" DECIMAL(10,2),
    "label" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "storagePath" TEXT NOT NULL,
    "qrCodeUrl" TEXT NOT NULL,

    CONSTRAINT "QRCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Donation" (
    "id" TEXT NOT NULL,
    "donorId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "source" "public"."DonationSource" NOT NULL DEFAULT 'SCAN',
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Donation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Budget" (
    "id" TEXT NOT NULL,
    "fiscalYear" INTEGER NOT NULL,
    "category" "public"."BudgetCategory" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "groupId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Expense" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "fundingSource" "public"."FundingSource" NOT NULL,
    "groupId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Sale" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "unitCost" DECIMAL(10,2) NOT NULL,
    "totalCost" DECIMAL(12,2) NOT NULL,
    "revenue" DECIMAL(12,2) NOT NULL,
    "fundingSource" "public"."FundingSource" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Participation" (
    "id" TEXT NOT NULL,
    "donorId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Participation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Group_name_key" ON "public"."Group"("name");

-- CreateIndex
CREATE INDEX "Donor_className_idx" ON "public"."Donor"("className");

-- CreateIndex
CREATE INDEX "Donor_gradeName_idx" ON "public"."Donor"("gradeName");

-- CreateIndex
CREATE UNIQUE INDEX "QRCode_value_key" ON "public"."QRCode"("value");

-- CreateIndex
CREATE UNIQUE INDEX "QRCode_donorId_key" ON "public"."QRCode"("donorId");

-- CreateIndex
CREATE INDEX "Donation_donorId_idx" ON "public"."Donation"("donorId");

-- CreateIndex
CREATE INDEX "Donation_groupId_idx" ON "public"."Donation"("groupId");

-- CreateIndex
CREATE INDEX "Donation_scannedAt_idx" ON "public"."Donation"("scannedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Budget_fiscalYear_category_groupId_key" ON "public"."Budget"("fiscalYear", "category", "groupId");

-- CreateIndex
CREATE INDEX "Expense_groupId_date_idx" ON "public"."Expense"("groupId", "date");

-- CreateIndex
CREATE INDEX "Sale_groupId_date_idx" ON "public"."Sale"("groupId", "date");

-- CreateIndex
CREATE INDEX "Participation_groupId_date_idx" ON "public"."Participation"("groupId", "date");

-- CreateIndex
CREATE INDEX "Participation_donorId_date_idx" ON "public"."Participation"("donorId", "date");

-- AddForeignKey
ALTER TABLE "public"."QRCode" ADD CONSTRAINT "QRCode_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "public"."Donor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QRCode" ADD CONSTRAINT "QRCode_presetGroupId_fkey" FOREIGN KEY ("presetGroupId") REFERENCES "public"."Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Donation" ADD CONSTRAINT "Donation_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "public"."Donor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Donation" ADD CONSTRAINT "Donation_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Budget" ADD CONSTRAINT "Budget_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Expense" ADD CONSTRAINT "Expense_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Sale" ADD CONSTRAINT "Sale_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Participation" ADD CONSTRAINT "Participation_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "public"."Donor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Participation" ADD CONSTRAINT "Participation_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
