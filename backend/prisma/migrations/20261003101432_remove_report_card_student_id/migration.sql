/*
  Warnings:

  - You are about to drop the column `studentId` on the `ReportCard` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "ReportCard" DROP CONSTRAINT "ReportCard_studentId_fkey";

-- AlterTable
ALTER TABLE "ReportCard" DROP COLUMN "studentId";
