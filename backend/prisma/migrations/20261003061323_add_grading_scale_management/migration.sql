-- CreateTable
CREATE TABLE "GradingScale" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GradingScale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Grade" (
    "id" TEXT NOT NULL,
    "gradingScaleId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "minPercentage" DECIMAL(65,30) NOT NULL,
    "maxPercentage" DECIMAL(65,30) NOT NULL,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Grade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GradingScale_schoolId_idx" ON "GradingScale"("schoolId");

-- CreateIndex
CREATE INDEX "GradingScale_isDefault_idx" ON "GradingScale"("isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "GradingScale_schoolId_name_key" ON "GradingScale"("schoolId", "name");

-- CreateIndex
CREATE INDEX "Grade_gradingScaleId_idx" ON "Grade"("gradingScaleId");

-- CreateIndex
CREATE UNIQUE INDEX "Grade_gradingScaleId_name_key" ON "Grade"("gradingScaleId", "name");

-- AddForeignKey
ALTER TABLE "GradingScale" ADD CONSTRAINT "GradingScale_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_gradingScaleId_fkey" FOREIGN KEY ("gradingScaleId") REFERENCES "GradingScale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
