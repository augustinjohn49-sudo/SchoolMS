-- CreateTable
CREATE TABLE "TeacherClassSubject" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "classSubjectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherClassSubject_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeacherClassSubject_staffId_idx" ON "TeacherClassSubject"("staffId");

-- CreateIndex
CREATE INDEX "TeacherClassSubject_classSubjectId_idx" ON "TeacherClassSubject"("classSubjectId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherClassSubject_staffId_classSubjectId_key" ON "TeacherClassSubject"("staffId", "classSubjectId");

-- AddForeignKey
ALTER TABLE "TeacherClassSubject" ADD CONSTRAINT "TeacherClassSubject_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherClassSubject" ADD CONSTRAINT "TeacherClassSubject_classSubjectId_fkey" FOREIGN KEY ("classSubjectId") REFERENCES "ClassSubject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
