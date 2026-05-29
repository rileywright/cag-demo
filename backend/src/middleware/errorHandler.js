import logger from '../utils/logger.js';

const errorHandler = {
  notFound: (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
  },

  global: (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;

    logger.error('Error occurred:', {
      message: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    if (err.name === 'ValidationError') {
      const message = Object.values(err.errors).map(val => val.message).join(', ');
      error = {
        statusCode: 400,
        message: 'Validation Error',
        details: message
      };
    }

    if (err.code === 11000) {
      error = {
        statusCode: 400,
        message: 'Duplicate field value',
        details: 'A record with this value already exists'
      };
    }

    if (err.name === 'CastError') {
      error = {
        statusCode: 400,
        message: 'Invalid ID format',
        details: 'The provided ID is not in a valid format'
      };
    }

    if (err.name === 'JsonWebTokenError') {
      error = {
        statusCode: 401,
        message: 'Invalid token',
        details: 'Authentication token is invalid'
      };
    }

    if (err.name === 'TokenExpiredError') {
      error = {
        statusCode: 401,
        message: 'Token expired',
        details: 'Authentication token has expired'
      };
    }

    if (err.name === 'MulterError') {
      if (err.code === 'LIMIT_FILE_SIZE') {
        error = {
          statusCode: 400,
          message: 'File too large',
          details: `Maximum file size is ${process.env.MAX_FILE_SIZE_MB || 10}MB`
        };
      } else {
        error = {
          statusCode: 400,
          message: 'File upload error',
          details: err.message
        };
      }
    }

    const statusCode = error.statusCode || 500;
    const message = process.env.NODE_ENV === 'production' && statusCode === 500 
      ? 'Internal server error' 
      : error.message || 'Internal server error';

    const response = {
      success: false,
      error: message,
      statusCode
    };

    if (process.env.NODE_ENV === 'development' && error.details) {
      response.details = error.details;
    }

    if (process.env.NODE_ENV === 'development') {
      response.stack = err.stack;
    }

    res.status(statusCode).json(response);
  },

  async: (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  }
};

export default errorHandler;
