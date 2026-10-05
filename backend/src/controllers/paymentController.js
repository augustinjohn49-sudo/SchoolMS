import {
  createPayment,
  getPaymentById,
  getPayments,
  updatePaymentStatus,
} from "../services/paymentService.js";

/**
 * Handle payment service errors.
 */
const handlePaymentError = (error, res) => {
  const statusCodeMap = {
    SCHOOL_REQUIRED: 400,
    REQUIRED_FIELDS: 400,
    INVALID_AMOUNT: 400,
    INVALID_PAYMENT_METHOD: 400,
    INVALID_PAYMENT_STATUS: 400,
    INVALID_PAYMENT_STATUS_TRANSITION: 409,
    PAYMENT_ALREADY_REFUNDED: 409,
    PAYMENT_REFERENCE_EXISTS: 409,
    STUDENT_ENROLLMENT_NOT_FOUND: 404,
    RECEIVED_BY_USER_NOT_FOUND: 404,
    PAYMENT_NOT_FOUND: 404,
  };

  const statusCode = statusCodeMap[error.code] || 500;

  console.error("Payment error:", error);

  return res.status(statusCode).json({
    success: false,
    message: error.message || "An error occurred while processing the payment.",
  });
};

/**
 * Create payment.
 */
export const createPaymentController = async (req, res) => {
  try {
    console.log("Authenticated user:", req.user);
    const {
      studentEnrollmentId,
      receivedByUserId,
      amount,
      method,
      reference,
      status,
      paymentDate,
      notes,
    } = req.body;

    const payment = await createPayment({
      schoolId: req.user.schoolId,
      studentEnrollmentId,
      receivedByUserId: req.user.userId,
      amount,
      method,
      reference,
      status,
      paymentDate,
      notes,
    });

    return res.status(201).json({
      success: true,
      message: "Payment created successfully.",
      data: payment,
    });
  } catch (error) {
    return handlePaymentError(error, res);
  }
};

/**
 * Get payment by ID.
 */
export const getPaymentByIdController = async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await getPaymentById({
      schoolId: req.user.schoolId,
      paymentId,
    });

    return res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    return handlePaymentError(error, res);
  }
};

/**
 * Get payments.
 */
export const getPaymentsController = async (req, res) => {
  try {
    const { studentEnrollmentId, method, status, page, limit } = req.query;

    const result = await getPayments({
      schoolId: req.user.schoolId,
      studentEnrollmentId,
      method,
      status,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handlePaymentError(error, res);
  }
};

/**
 * Update payment status.
 */
export const updatePaymentStatusController = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { status } = req.body;

    const payment = await updatePaymentStatus({
      schoolId: req.user.schoolId,
      paymentId,
      status,
    });

    return res.status(200).json({
      success: true,
      message: "Payment status updated successfully.",
      data: payment,
    });
  } catch (error) {
    return handlePaymentError(error, res);
  }
};
