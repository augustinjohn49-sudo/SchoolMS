import {
  createFeeAdjustment,
  getFeeAdjustmentById,
  getFeeAdjustments,
} from "../services/feeAdjustmentService.js";

function handleFeeAdjustmentError(error, res) {
  const statusMap = {
    SCHOOL_REQUIRED: 400,
    REQUIRED_FIELDS: 400,
    INVALID_AMOUNT: 400,
    INVALID_ADJUSTMENT_TYPE: 400,
    ADJUSTMENT_REQUIRED: 400,
    ADJUSTMENT_EXCEEDS_CHARGE: 400,
    STUDENT_FEE_CHARGE_NOT_FOUND: 404,
    FEE_ADJUSTMENT_NOT_FOUND: 404,
    USER_NOT_FOUND: 403,
  };

  return res.status(statusMap[error.code] || 500).json({
    success: false,
    message: error.message || "An unexpected error occurred.",
  });
}

export async function createFeeAdjustmentController(req, res) {
  try {
    const adjustment = await createFeeAdjustment({
      schoolId: req.user.schoolId,
      studentFeeChargeId: req.body.studentFeeChargeId,
      type: req.body.type,
      amount: req.body.amount,
      reason: req.body.reason,
      createdByUserId: req.user.userId,
    });

    return res.status(201).json({
      success: true,
      message: "Fee adjustment created successfully.",
      data: adjustment,
    });
  } catch (error) {
    console.error("Create fee adjustment error:", error);
    return handleFeeAdjustmentError(error, res);
  }
}

export async function getFeeAdjustmentByIdController(req, res) {
  try {
    const adjustment = await getFeeAdjustmentById({
      schoolId: req.user.schoolId,
      adjustmentId: req.params.adjustmentId,
    });

    return res.status(200).json({
      success: true,
      data: adjustment,
    });
  } catch (error) {
    console.error("Get fee adjustment error:", error);
    return handleFeeAdjustmentError(error, res);
  }
}

export async function getFeeAdjustmentsController(req, res) {
  try {
    const adjustments = await getFeeAdjustments({
      schoolId: req.user.schoolId,
      studentFeeChargeId: req.query.studentFeeChargeId,
    });

    return res.status(200).json({
      success: true,
      data: {
        adjustments,
      },
    });
  } catch (error) {
    console.error("Get fee adjustments error:", error);
    return handleFeeAdjustmentError(error, res);
  }
}
