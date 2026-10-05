import {
  createStudentFeeCharge,
  getStudentFeeChargeById,
  getStudentFeeCharges,
  updateStudentFeeCharge,
  deleteStudentFeeCharge,
} from "../services/studentFeeChargeService.js";

const handleStudentFeeChargeError = (res, error) => {
  const statusMap = {
    SCHOOL_REQUIRED: 400,
    REQUIRED_FIELDS: 400,
    INVALID_AMOUNT: 400,
    NAME_REQUIRED: 400,
    STUDENT_ENROLLMENT_NOT_FOUND: 404,
    FEE_STRUCTURE_ITEM_NOT_FOUND: 404,
    STUDENT_FEE_CHARGE_NOT_FOUND: 404,
    FEE_CHARGE_HAS_PAYMENTS: 409,
    FEE_CHARGE_HAS_ADJUSTMENTS: 409,
  };

  const statusCode = statusMap[error.code] || 500;

  console.error("Student Fee Charge Error:", error);

  return res.status(statusCode).json({
    success: false,
    message: error.message || "An unexpected error occurred.",
  });
};

export const createStudentFeeChargeController = async (req, res) => {
  try {
    const studentFeeCharge = await createStudentFeeCharge({
      schoolId: req.user.schoolId,
      ...req.body,
    });

    return res.status(201).json({
      success: true,
      message: "Student fee charge created successfully.",
      data: studentFeeCharge,
    });
  } catch (error) {
    return handleStudentFeeChargeError(res, error);
  }
};

export const getStudentFeeChargeByIdController = async (req, res) => {
  try {
    const studentFeeCharge = await getStudentFeeChargeById({
      schoolId: req.user.schoolId,
      studentFeeChargeId: req.params.studentFeeChargeId,
    });

    return res.status(200).json({
      success: true,
      data: studentFeeCharge,
    });
  } catch (error) {
    return handleStudentFeeChargeError(res, error);
  }
};

export const getStudentFeeChargesController = async (req, res) => {
  try {
    const studentFeeCharges = await getStudentFeeCharges({
      schoolId: req.user.schoolId,
      studentEnrollmentId: req.query.studentEnrollmentId,
    });

    return res.status(200).json({
      success: true,
      count: studentFeeCharges.length,
      data: studentFeeCharges,
    });
  } catch (error) {
    return handleStudentFeeChargeError(res, error);
  }
};

export const updateStudentFeeChargeController = async (req, res) => {
  try {
    const studentFeeCharge = await updateStudentFeeCharge({
      schoolId: req.user.schoolId,
      studentFeeChargeId: req.params.studentFeeChargeId,
      ...req.body,
    });

    return res.status(200).json({
      success: true,
      message: "Student fee charge updated successfully.",
      data: studentFeeCharge,
    });
  } catch (error) {
    return handleStudentFeeChargeError(res, error);
  }
};

export const deleteStudentFeeChargeController = async (req, res) => {
  try {
    await deleteStudentFeeCharge({
      schoolId: req.user.schoolId,
      studentFeeChargeId: req.params.studentFeeChargeId,
    });

    return res.status(200).json({
      success: true,
      message: "Student fee charge deleted successfully.",
    });
  } catch (error) {
    return handleStudentFeeChargeError(res, error);
  }
};
