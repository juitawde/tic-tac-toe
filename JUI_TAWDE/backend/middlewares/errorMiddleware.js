/**
 * Express Error Handling Middlewares
 */

function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    message: `Resource not found: ${req.originalUrl}`
  });
}

function globalErrorHandler(err, req, res, next) {
  console.error('🔥 Global Express Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
}

module.exports = {
  notFoundHandler,
  globalErrorHandler
};
