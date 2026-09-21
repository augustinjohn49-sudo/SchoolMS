import { verifyToken } from "../utils/jwt.js";

export function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({
        success: false,
        message: "Invalid authorization format.",
      });
    }

    const decoded = verifyToken(token);

    req.user = {
      userId: decoded.userId,
      schoolId: decoded.schoolId ?? null,
      role: decoded.role,
    };

    next();
  } catch (error) {
    console.error("Authentication error:", error);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
}

export function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action.",
      });
    }

    next();
  };
}

export function requireSchoolAccess(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
  }

  // SUPER_ADMIN has system-wide access.
  if (req.user.role === "SUPER_ADMIN") {
    return next();
  }

  if (!req.user.schoolId) {
    return res.status(403).json({
      success: false,
      message: "Your account is not associated with a school.",
    });
  }

  const requestedSchoolId =
    req.params.schoolId || req.body?.schoolId || req.query.schoolId;

  if (requestedSchoolId && requestedSchoolId !== req.user.schoolId) {
    return res.status(403).json({
      success: false,
      message: "You do not have access to this school.",
    });
  }

  next();
}
