import { getStudentFeeAccount } from "../services/studentFeeAccountService.js";

function handleStudentFeeAccountError(error, res) {
  const statusMap = {
    SCHOOL_REQUIRED: 400,
    ENROLLMENT_REQUIRED: 400,
    ENROLLMENT_NOT_FOUND: 404,
  };

  return res.status(statusMap[error.code] || 500).json({
    success: false,
    message: error.message || "An unexpected error occurred.",
  });
}

export async function getStudentFeeAccountController(req, res) {
  try {
    const account = await getStudentFeeAccount({
      schoolId: req.user.schoolId,
      studentEnrollmentId: req.params.studentEnrollmentId,
    });

    return res.status(200).json({
      success: true,
      data: account,
    });
  } catch (error) {
    console.error("Get student fee account error:", error);
    return handleStudentFeeAccountError(error, res);
  }
}
