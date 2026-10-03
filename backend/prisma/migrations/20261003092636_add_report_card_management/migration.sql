-- CreateTable
CREATE TABLE "ReportCard" (
    "id" TEXT NOT NULL,
    "studentEnrollmentId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "gradingScaleId" TEXT NOT NULL,
    "title" TEXT,
    "overallRemarks" TEXT,
    "generatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "studentId" TEXT,

    CONSTRAINT "ReportCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportCardSubject" (
    "id" TEXT NOT NULL,
    "reportCardId" TEXT NOT NULL,
    "examResultId" TEXT NOT NULL,
    "subjectName" TEXT NOT NULL,
    "marks" DECIMAL(65,30) NOT NULL,
    "maxMarks" DECIMAL(65,30) NOT NULL,
    "percentage" DECIMAL(65,30) NOT NULL,
    "gradeName" TEXT,
    "gradeRemarks" TEXT,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportCardSubject_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReportCard_studentEnrollmentId_idx" ON "ReportCard"("studentEnrollmentId");

-- CreateIndex
CREATE INDEX "ReportCard_academicYearId_idx" ON "ReportCard"("academicYearId");

-- CreateIndex
CREATE INDEX "ReportCard_termId_idx" ON "ReportCard"("termId");

-- CreateIndex
CREATE INDEX "ReportCard_gradingScaleId_idx" ON "ReportCard"("gradingScaleId");

-- CreateIndex
CREATE UNIQUE INDEX "ReportCard_studentEnrollmentId_termId_key" ON "ReportCard"("studentEnrollmentId", "termId");

-- CreateIndex
CREATE INDEX "ReportCardSubject_reportCardId_idx" ON "ReportCardSubject"("reportCardId");

-- CreateIndex
CREATE INDEX "ReportCardSubject_examResultId_idx" ON "ReportCardSubject"("examResultId");

-- CreateIndex
CREATE UNIQUE INDEX "ReportCardSubject_reportCardId_examResultId_key" ON "ReportCardSubject"("reportCardId", "examResultId");

-- AddForeignKey
ALTER TABLE "ReportCard" ADD CONSTRAINT "ReportCard_studentEnrollmentId_fkey" FOREIGN KEY ("studentEnrollmentId") REFERENCES "StudentEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportCard" ADD CONSTRAINT "ReportCard_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportCard" ADD CONSTRAINT "ReportCard_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportCard" ADD CONSTRAINT "ReportCard_gradingScaleId_fkey" FOREIGN KEY ("gradingScaleId") REFERENCES "GradingScale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportCard" ADD CONSTRAINT "ReportCard_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportCardSubject" ADD CONSTRAINT "ReportCardSubject_reportCardId_fkey" FOREIGN KEY ("reportCardId") REFERENCES "ReportCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportCardSubject" ADD CONSTRAINT "ReportCardSubject_examResultId_fkey" FOREIGN KEY ("examResultId") REFERENCES "ExamResult"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
