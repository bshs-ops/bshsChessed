/*
  Warnings:

  - You are about to drop the column `category` on the `Budget` table. All the data in the column will be lost.
  - You are about to drop the column `fiscalYear` on the `Budget` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[groupId]` on the table `Budget` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."Budget_fiscalYear_category_groupId_key";

-- AlterTable
ALTER TABLE "public"."Budget" DROP COLUMN "category",
DROP COLUMN "fiscalYear";

-- DropEnum
DROP TYPE "public"."BudgetCategory";

-- CreateIndex
CREATE UNIQUE INDEX "Budget_groupId_key" ON "public"."Budget"("groupId");
