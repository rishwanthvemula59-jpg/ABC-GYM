import logger from '../utils/logger.js';

function requestLogger(req, res, next) {
  const start = Date.now();
  logger.debug(`📥 ${req.method} ${req.path}`);

  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - start;
    logger.info(`📤 ${req.method} ${req.path} - ${res.statusCode} ${duration}ms`);
    originalSend.call(this, data);
  };

  next();
}

export default requestLogger;