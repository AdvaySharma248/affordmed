function requireAuth(req, res, next) {
  const authorizationHeader = req.get('Authorization');

  if (!authorizationHeader) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      error: {
        code: 'UNAUTHORIZED',
        details: 'A valid authorization token is required.'
      },
      requestId: req.requestId
    });
  }

  next();
}

module.exports = requireAuth;
