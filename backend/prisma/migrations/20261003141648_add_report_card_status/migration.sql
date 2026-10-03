-- CreateEnum
CREATE TYPE "ReportCardStatus" AS ENUM ('DRAFT', 'APPROVED', 'PUBLISHED');

-- AlterTable
ALTER TABLE "ReportCard" ADD COLUMN     "status" "ReportCardStatus" NOT NULL DEFAULT 'DRAFT';
