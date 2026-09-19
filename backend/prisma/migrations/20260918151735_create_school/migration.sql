-- CreateEnum
CREATE TYPE "SchoolType" AS ENUM ('PRIMARY', 'SECONDARY', 'PRIMARY_AND_SECONDARY');

-- CreateEnum
CREATE TYPE "SchoolStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "School" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "SchoolType" NOT NULL,
    "location" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "logo" TEXT,
    "status" "SchoolStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "School_code_key" ON "School"("code");
