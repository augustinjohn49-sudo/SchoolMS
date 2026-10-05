import {
  createFeeStructure,
  getFeeStructureById,
  getFeeStructures,
  updateFeeStructure,
  activateFeeStructure,
  archiveFeeStructure,
  addFeeStructureItem,
  updateFeeStructureItem,
  deleteFeeStructureItem,
} from "../services/feeStructureService.js";

const handleFeeStructureError = (res, error) => {
  const statusMap = {
    SCHOOL_REQUIRED: 400,
    REQUIRED_FIELDS: 400,
    ACADEMIC_YEAR_NOT_FOUND: 404,
    TERM_NOT_FOUND: 404,
    CLASS_NOT_FOUND: 404,
    STREAM_NOT_FOUND: 404,
    FEE_STRUCTURE_EXISTS: 409,
    FEE_STRUCTURE_NOT_FOUND: 404,
    FEE_STRUCTURE_NOT_DRAFT: 409,
    FEE_STRUCTURE_NOT_ACTIVE: 409,
    NAME_REQUIRED: 400,
    INVALID_AMOUNT: 400,
    FEE_ITEM_EXISTS: 409,
    FEE_ITEM_NOT_FOUND: 404,
  };

  const statusCode = statusMap[error.code] || 500;

  console.error("Fee Structure Error:", error);

  return res.status(statusCode).json({
    success: false,
    message: error.message || "An unexpected error occurred.",
  });
};

export const createFeeStructureController = async (req, res) => {
  try {
    const feeStructure = await createFeeStructure({
      schoolId: req.user.schoolId,
      ...req.body,
    });

    return res.status(201).json({
      success: true,
      message: "Fee structure created successfully.",
      data: feeStructure,
    });
  } catch (error) {
    return handleFeeStructureError(res, error);
  }
};

export const getFeeStructureByIdController = async (req, res) => {
  try {
    const feeStructure = await getFeeStructureById({
      schoolId: req.user.schoolId,
      feeStructureId: req.params.feeStructureId,
    });

    return res.status(200).json({
      success: true,
      data: feeStructure,
    });
  } catch (error) {
    return handleFeeStructureError(res, error);
  }
};

export const getFeeStructuresController = async (req, res) => {
  try {
    const feeStructures = await getFeeStructures({
      schoolId: req.user.schoolId,
      academicYearId: req.query.academicYearId,
      termId: req.query.termId,
      classId: req.query.classId,
      streamId: req.query.streamId,
      status: req.query.status,
    });

    return res.status(200).json({
      success: true,
      count: feeStructures.length,
      data: feeStructures,
    });
  } catch (error) {
    return handleFeeStructureError(res, error);
  }
};

export const updateFeeStructureController = async (req, res) => {
  try {
    const feeStructure = await updateFeeStructure({
      schoolId: req.user.schoolId,
      feeStructureId: req.params.feeStructureId,
      ...req.body,
    });

    return res.status(200).json({
      success: true,
      message: "Fee structure updated successfully.",
      data: feeStructure,
    });
  } catch (error) {
    return handleFeeStructureError(res, error);
  }
};

export const activateFeeStructureController = async (req, res) => {
  try {
    const feeStructure = await activateFeeStructure({
      schoolId: req.user.schoolId,
      feeStructureId: req.params.feeStructureId,
    });

    return res.status(200).json({
      success: true,
      message: "Fee structure activated successfully.",
      data: feeStructure,
    });
  } catch (error) {
    return handleFeeStructureError(res, error);
  }
};

export const archiveFeeStructureController = async (req, res) => {
  try {
    const feeStructure = await archiveFeeStructure({
      schoolId: req.user.schoolId,
      feeStructureId: req.params.feeStructureId,
    });

    return res.status(200).json({
      success: true,
      message: "Fee structure archived successfully.",
      data: feeStructure,
    });
  } catch (error) {
    return handleFeeStructureError(res, error);
  }
};

export const addFeeStructureItemController = async (req, res) => {
  try {
    const item = await addFeeStructureItem({
      schoolId: req.user.schoolId,
      feeStructureId: req.params.feeStructureId,
      ...req.body,
    });

    return res.status(201).json({
      success: true,
      message: "Fee structure item added successfully.",
      data: item,
    });
  } catch (error) {
    return handleFeeStructureError(res, error);
  }
};

export const updateFeeStructureItemController = async (req, res) => {
  try {
    const item = await updateFeeStructureItem({
      schoolId: req.user.schoolId,
      feeStructureId: req.params.feeStructureId,
      itemId: req.params.itemId,
      ...req.body,
    });

    return res.status(200).json({
      success: true,
      message: "Fee structure item updated successfully.",
      data: item,
    });
  } catch (error) {
    return handleFeeStructureError(res, error);
  }
};

export const deleteFeeStructureItemController = async (req, res) => {
  try {
    await deleteFeeStructureItem({
      schoolId: req.user.schoolId,
      feeStructureId: req.params.feeStructureId,
      itemId: req.params.itemId,
    });

    return res.status(200).json({
      success: true,
      message: "Fee structure item deleted successfully.",
    });
  } catch (error) {
    return handleFeeStructureError(res, error);
  }
};
