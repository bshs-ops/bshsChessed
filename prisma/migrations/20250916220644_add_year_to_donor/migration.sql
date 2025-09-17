-- AlterTable
ALTER TABLE "public"."Donor" ADD COLUMN     "year" TEXT;

-- CreateIndex
CREATE INDEX "Donor_year_idx" ON "public"."Donor"("year");
