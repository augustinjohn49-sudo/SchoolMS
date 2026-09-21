import {
  createStream,
  getStreamsByClass,
  getStreamById,
  updateStream,
  deleteStream,
} from "../services/streamService.js";

export async function createStreamController(req, res) {
  try {
    const { classId, name } = req.body;

    if (!classId || !name) {
      return res.status(400).json({
        success: false,
        message: "classId and name are required.",
      });
    }

    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "Your account is not associated with a school.",
      });
    }

    const stream = await createStream({
      schoolId,
      classId,
      name,
    });

    return res.status(201).json({
      success: true,
      message: "Stream created successfully.",
      data: stream,
    });
  } catch (error) {
    console.error("Create stream error:", error);

    if (error.code === "CLASS_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Class not found.",
      });
    }

    if (error.code === "CLASS_ACCESS_DENIED") {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this class.",
      });
    }

    if (error.code === "STREAM_EXISTS") {
      return res.status(409).json({
        success: false,
        message: "A stream with this name already exists for this class.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create stream.",
    });
  }
}

export async function getStreamsByClassController(req, res) {
  try {
    const { classId } = req.params;

    if (!classId) {
      return res.status(400).json({
        success: false,
        message: "classId is required.",
      });
    }

    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "Your account is not associated with a school.",
      });
    }

    const streams = await getStreamsByClass({
      schoolId,
      classId,
    });

    return res.status(200).json({
      success: true,
      message: "Streams retrieved successfully.",
      data: streams,
    });
  } catch (error) {
    console.error("Get streams by class error:", error);

    if (error.code === "CLASS_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Class not found.",
      });
    }

    if (error.code === "CLASS_ACCESS_DENIED") {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this class.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve streams.",
    });
  }
}

export async function getStreamByIdController(req, res) {
  try {
    const { streamId } = req.params;

    if (!streamId) {
      return res.status(400).json({
        success: false,
        message: "streamId is required.",
      });
    }

    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "Your account is not associated with a school.",
      });
    }

    const stream = await getStreamById({
      schoolId,
      streamId,
    });

    return res.status(200).json({
      success: true,
      message: "Stream retrieved successfully.",
      data: stream,
    });
  } catch (error) {
    console.error("Get stream by ID error:", error);

    if (error.code === "STREAM_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Stream not found.",
      });
    }

    if (error.code === "STREAM_ACCESS_DENIED") {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this stream.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve stream.",
    });
  }
}

export async function updateStreamController(req, res) {
  try {
    const { streamId } = req.params;
    const { name } = req.body;

    if (!streamId) {
      return res.status(400).json({
        success: false,
        message: "streamId is required.",
      });
    }

    if (name === undefined) {
      return res.status(400).json({
        success: false,
        message: "At least one field must be provided.",
      });
    }

    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "Your account is not associated with a school.",
      });
    }

    const stream = await updateStream({
      schoolId,
      streamId,
      name,
    });

    return res.status(200).json({
      success: true,
      message: "Stream updated successfully.",
      data: stream,
    });
  } catch (error) {
    console.error("Update stream error:", error);

    if (error.code === "STREAM_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Stream not found.",
      });
    }

    if (error.code === "STREAM_ACCESS_DENIED") {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this stream.",
      });
    }

    if (error.code === "STREAM_EXISTS") {
      return res.status(409).json({
        success: false,
        message: "A stream with this name already exists for this class.",
      });
    }

    if (error.code === "NO_CHANGES") {
      return res.status(400).json({
        success: false,
        message: "At least one field must be changed.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update stream.",
    });
  }
}

export async function deleteStreamController(req, res) {
  try {
    const { streamId } = req.params;

    if (!streamId) {
      return res.status(400).json({
        success: false,
        message: "streamId is required.",
      });
    }

    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "Your account is not associated with a school.",
      });
    }

    const deletedStream = await deleteStream({
      schoolId,
      streamId,
    });

    return res.status(200).json({
      success: true,
      message: "Stream deleted successfully.",
      data: deletedStream,
    });
  } catch (error) {
    console.error("Delete stream error:", error);

    if (error.code === "STREAM_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Stream not found.",
      });
    }

    if (error.code === "STREAM_ACCESS_DENIED") {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this stream.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to delete stream.",
    });
  }
}
