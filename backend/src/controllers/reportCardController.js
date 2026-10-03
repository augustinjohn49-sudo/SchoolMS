import {
  createReportCard,
  createReportCardSubject,
  getReportCards,
  getReportCardById,
  updateClassTeacherComment,
  updateHeadTeacherComment,
  approveReportCard,
  publishReportCard,
  generateReportCard,
} from "../services/reportCardService.js";

export async function createReportCardController(req, res) {
  try {
    const schoolId = req.user.schoolId;

    const {
      studentEnrollmentId,
      academicYearId,
      termId,
      gradingScaleId,
      title,
      overallRemarks,
    } = req.body;

    const reportCard = await createReportCard({
      schoolId,
      studentEnrollmentId,
      academicYearId,
      termId,
      gradingScaleId,
      title,
      overallRemarks,
    });

    return res.status(201).json({
      message: "Report card created successfully.",
      reportCard,
    });
  } catch (error) {
    console.error("Create report card error:", error);

    if (error.code === "SCHOOL_REQUIRED") {
      return res.status(400).json({
        message: error.message,
      });
    }

    if (error.code === "REPORT_CARD_EXISTS") {
      return res.status(409).json({
        message: error.message,
      });
    }

    if (
      error.code === "ENROLLMENT_NOT_FOUND" ||
      error.code === "ACADEMIC_YEAR_MISMATCH" ||
      error.code === "TERM_NOT_FOUND" ||
      error.code === "GRADING_SCALE_NOT_FOUND"
    ) {
      return res.status(400).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: "Failed to create report card.",
    });
  }
}

export async function createReportCardSubjectController(req, res) {
  try {
    const schoolId = req.user.schoolId;
    const { reportCardId } = req.params;

    const { examResultId, remarks } = req.body;

    const subject = await createReportCardSubject({
      schoolId,
      reportCardId,
      examResultId,
      remarks,
    });

    return res.status(201).json({
      message: "Report card subject added successfully.",
      subject,
    });
  } catch (error) {
    console.error("Create report card subject error:", error);

    if (error.code === "SCHOOL_REQUIRED") {
      return res.status(400).json({
        message: error.message,
      });
    }

    if (
      error.code === "REPORT_CARD_REQUIRED" ||
      error.code === "EXAM_RESULT_REQUIRED" ||
      error.code === "MARKS_INVALID"
    ) {
      return res.status(400).json({
        message: error.message,
      });
    }

    if (
      error.code === "REPORT_CARD_NOT_FOUND" ||
      error.code === "EXAM_RESULT_NOT_FOUND"
    ) {
      return res.status(404).json({
        message: error.message,
      });
    }

    if (
      error.code === "STUDENT_MISMATCH" ||
      error.code === "ACADEMIC_YEAR_MISMATCH" ||
      error.code === "TERM_MISMATCH" ||
      error.code === "CLASS_MISMATCH"
    ) {
      return res.status(400).json({
        message: error.message,
      });
    }

    if (error.code === "REPORT_CARD_SUBJECT_EXISTS") {
      return res.status(409).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: "Failed to add report card subject.",
    });
  }
}

export async function getReportCardsController(req, res) {
  try {
    const schoolId = req.user.schoolId;

    const { academicYearId, termId, studentId } = req.query;

    const reportCards = await getReportCards({
      schoolId,
      academicYearId,
      termId,
      studentId,
    });

    return res.status(200).json({
      reportCards,
    });
  } catch (error) {
    console.error("Get report cards error:", error);

    if (error.code === "SCHOOL_REQUIRED") {
      return res.status(400).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: "Failed to retrieve report cards.",
    });
  }
}

export async function getReportCardByIdController(req, res) {
  try {
    const schoolId = req.user.schoolId;
    const { reportCardId } = req.params;

    const reportCard = await getReportCardById({
      schoolId,
      reportCardId,
    });

    return res.status(200).json({
      reportCard,
    });
  } catch (error) {
    console.error("Get report card by ID error:", error);

    if (
      error.code === "SCHOOL_REQUIRED" ||
      error.code === "REPORT_CARD_REQUIRED"
    ) {
      return res.status(400).json({
        message: error.message,
      });
    }

    if (error.code === "REPORT_CARD_NOT_FOUND") {
      return res.status(404).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: "Failed to retrieve report card.",
    });
  }
}

export async function updateClassTeacherCommentController(req, res) {
  try {
    const schoolId = req.user.schoolId;
    const { reportCardId } = req.params;
    const { classTeacherComment } = req.body;

    const reportCard = await updateClassTeacherComment({
      schoolId,
      reportCardId,
      classTeacherComment,
    });

    return res.status(200).json({
      message: "Class teacher comment updated successfully.",
      reportCard,
    });
  } catch (error) {
    console.error("Update class teacher comment error:", error);

    if (
      error.code === "SCHOOL_REQUIRED" ||
      error.code === "REPORT_CARD_REQUIRED"
    ) {
      return res.status(400).json({
        message: error.message,
      });
    }

    if (error.code === "REPORT_CARD_NOT_FOUND") {
      return res.status(404).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: "Failed to update class teacher comment.",
    });
  }
}

export async function updateHeadTeacherCommentController(req, res) {
  try {
    const schoolId = req.user.schoolId;
    const { reportCardId } = req.params;
    const { headTeacherComment } = req.body;

    const reportCard = await updateHeadTeacherComment({
      schoolId,
      reportCardId,
      headTeacherComment,
    });

    return res.status(200).json({
      message: "Head teacher comment updated successfully.",
      reportCard,
    });
  } catch (error) {
    console.error("Update head teacher comment error:", error);

    if (
      error.code === "SCHOOL_REQUIRED" ||
      error.code === "REPORT_CARD_REQUIRED"
    ) {
      return res.status(400).json({
        message: error.message,
      });
    }

    if (error.code === "REPORT_CARD_NOT_FOUND") {
      return res.status(404).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: "Failed to update head teacher comment.",
    });
  }
}

export async function approveReportCardController(req, res) {
  try {
    const schoolId = req.user.schoolId;
    const { reportCardId } = req.params;

    const reportCard = await approveReportCard({
      schoolId,
      reportCardId,
    });

    return res.status(200).json({
      message: "Report card approved successfully.",
      reportCard,
    });
  } catch (error) {
    console.error("Approve report card error:", error);

    if (
      error.code === "SCHOOL_REQUIRED" ||
      error.code === "REPORT_CARD_REQUIRED"
    ) {
      return res.status(400).json({
        message: error.message,
      });
    }

    if (error.code === "REPORT_CARD_NOT_FOUND") {
      return res.status(404).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: "Failed to approve report card.",
    });
  }
}

export async function publishReportCardController(req, res) {
  try {
    const schoolId = req.user.schoolId;
    const { reportCardId } = req.params;

    const reportCard = await publishReportCard({
      schoolId,
      reportCardId,
    });

    return res.status(200).json({
      message: "Report card published successfully.",
      reportCard,
    });
  } catch (error) {
    console.error("Publish report card error:", error);

    if (
      error.code === "SCHOOL_REQUIRED" ||
      error.code === "REPORT_CARD_REQUIRED"
    ) {
      return res.status(400).json({
        message: error.message,
      });
    }

    if (error.code === "REPORT_CARD_NOT_FOUND") {
      return res.status(404).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: "Failed to publish report card.",
    });
  }
}

export async function generateReportCardController(req, res) {
  try {
    const schoolId = req.user.schoolId;
    const { reportCardId } = req.params;

    const reportCard = await generateReportCard({
      schoolId,
      reportCardId,
    });

    return res.status(200).json({
      message: "Report card generated successfully.",
      reportCard,
    });
  } catch (error) {
    console.error("Generate report card error:", error);

    if (
      error.code === "SCHOOL_REQUIRED" ||
      error.code === "REPORT_CARD_REQUIRED"
    ) {
      return res.status(400).json({
        message: error.message,
      });
    }

    if (error.code === "REPORT_CARD_NOT_FOUND") {
      return res.status(404).json({
        message: error.message,
      });
    }

    if (error.code === "REPORT_CARD_NOT_PUBLISHED") {
      return res.status(400).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: "Failed to generate report card.",
    });
  }
}
