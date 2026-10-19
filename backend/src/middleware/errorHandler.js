export function notFoundHandler(req, res) {
  res.status(404).json({ success: false, message: 'Route not found.' });
}

export function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const mapped = {
    ER_DUP_ENTRY: [409, 'A record with these details already exists.'],
    ER_NO_REFERENCED_ROW_2: [400, 'A referenced category, location, or user does not exist.'],
    ER_CHECK_CONSTRAINT_VIOLATED: [400, 'The submitted data violates a database constraint.'],
  }[err.code];
  const status = Number.isInteger(err.status) ? err.status : (mapped?.[0] || 500);
  if (status >= 500) {
    // Log only stable error identifiers; never log request bodies, credentials, or tokens.
    console.error(`API request failed (${err.code || err.name || 'UnknownError'}).`);
  }
  res.status(status).json({
    success: false,
    message: status >= 500 ? 'Internal server error.' : (mapped?.[1] || err.message),
  });
}
