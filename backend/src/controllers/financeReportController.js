import {
  getFinanceSummary,
  getStudentBalances,
  getPaymentReport,
} from "../services/financeReportService.js";

function handleFinanceReportError(error, res) {
  const statusMap = {
    SCHOOL_REQUIRED: 400,
  };

  return res.status(statusMap[error.code] || 500).json({
    success: false,
    message: error.message || "An unexpected error occurred.",
  });
}

export async function getFinanceSummaryController(req, res) {
  try {
    const report = await getFinanceSummary({
      schoolId: req.user.schoolId,
      academicYearId: req.query.academicYearId,
      termId: req.query.termId,
    });

    return res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error("Get finance summary error:", error);
    return handleFinanceReportError(error, res);
  }
}

export async function getStudentBalancesController(req, res) {
  try {
    const report = await getStudentBalances({
      schoolId: req.user.schoolId,
      academicYearId: req.query.academicYearId,
      termId: req.query.termId,
      classId: req.query.classId,
      streamId: req.query.streamId,
      outstandingOnly: req.query.outstandingOnly === "true",
      page: req.query.page,
      limit: req.query.limit,
    });

    return res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error("Get student balances error:", error);
    return handleFinanceReportError(error, res);
  }
}

export async function getPaymentReportController(req, res) {
  try {
    const report = await getPaymentReport({
      schoolId: req.user.schoolId,
      academicYearId: req.query.academicYearId,
      termId: req.query.termId,
      classId: req.query.classId,
      streamId: req.query.streamId,
      method: req.query.method,
      status: req.query.status,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      page: req.query.page,
      limit: req.query.limit,
    });

    return res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error("Get payment report error:", error);
    return handleFinanceReportError(error, res);
  }
}
