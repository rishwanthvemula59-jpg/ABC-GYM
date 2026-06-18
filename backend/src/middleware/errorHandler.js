import logger from '../utils/logger.js';

function errorHandler(err, req, res, next) {
  logger.error('Error:', { message: err.message, path: req.path });

  if (err.isJoi) {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details: err.details?.map(d => ({ field: d.path.join('.'), message: d.message }))
    });
  }

  if (err.statusCode) {
    return res.status(err.statusCode).json({ success: false, error: err.message });
  }

  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Server error' : err.message
  });
}

export default errorHandler;