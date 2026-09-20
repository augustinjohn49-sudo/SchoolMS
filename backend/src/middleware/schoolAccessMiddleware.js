export function requireSchoolAccess(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
  }

  // Super Admin is a system-wide administrator.
  if (req.user.role === "SUPER_ADMIN") {
    return next();
  }

  // Every other school-level user must belong to a school.
  if (!req.user.schoolId) {
    return res.status(403).json({
      success: false,
      message: "Your account is not associated with a school.",
    });
  }

  // If a schoolId is supplied in the URL, make sure it matches
  // the school assigned to the authenticated user.
  // If a schoolId is supplied in the URL, make sure it matches
  // the school assigned to the authenticated user.

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
