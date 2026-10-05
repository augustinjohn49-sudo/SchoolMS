import {
  createPaymentAllocation,
  getPaymentAllocationById,
  getPaymentAllocations,
} from "../services/paymentAllocationService.js";

function handlePaymentAllocationError(error, res) {
  const statusMap = {
    SCHOOL_REQUIRED: 400,
    REQUIRED_FIELDS: 400,
    INVALID_AMOUNT: 400,
    PAYMENT_NOT_FOUND: 404,
    PAYMENT_NOT_COMPLETED: 409,
    STUDENT_FEE_CHARGE_NOT_FOUND: 404,
    ENROLLMENT_MISMATCH: 409,
    INSUFFICIENT_UNALLOCATED_PAYMENT: 409,
    INSUFFICIENT_CHARGE_BALANCE: 409,
    PAYMENT_ALLOCATION_NOT_FOUND: 404,
  };

  return res.status(statusMap[error.code] || 500).json({
    success: false,
    message: error.message || "An unexpected error occurred.",
  });
}

export async function createPaymentAllocationController(req, res) {
  try {
    const { paymentId, studentFeeChargeId, amount } = req.body;

    const allocation = await createPaymentAllocation({
      schoolId: req.user.schoolId,
      paymentId,
      studentFeeChargeId,
      amount,
    });

    return res.status(201).json({
      success: true,
      message: "Payment allocation created successfully.",
      data: allocation,
    });
  } catch (error) {
    console.error("Create payment allocation error:", error);
    return handlePaymentAllocationError(error, res);
  }
}

export async function getPaymentAllocationByIdController(req, res) {
  try {
    const allocation = await getPaymentAllocationById({
      schoolId: req.user.schoolId,
      allocationId: req.params.allocationId,
    });

    return res.status(200).json({
      success: true,
      data: allocation,
    });
  } catch (error) {
    console.error("Get payment allocation error:", error);
    return handlePaymentAllocationError(error, res);
  }
}

export async function getPaymentAllocationsController(req, res) {
  try {
    const allocations = await getPaymentAllocations({
      schoolId: req.user.schoolId,
      paymentId: req.query.paymentId,
      studentFeeChargeId: req.query.studentFeeChargeId,
    });

    return res.status(200).json({
      success: true,
      data: {
        allocations,
      },
    });
  } catch (error) {
    console.error("Get payment allocations error:", error);
    return handlePaymentAllocationError(error, res);
  }
}
