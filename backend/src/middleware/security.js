import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import logger from '../utils/logger.js';

const securityMiddleware = {
  helmet: helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }),

  cors: cors({
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://your-domain.com'] 
      : ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-ID']
  }),

  rateLimiter: rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
      error: 'Too many requests from this IP',
      retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path
      });
      res.status(429).json({
        error: 'Too many requests',
        retryAfter: '15 minutes'
      });
    }
  }),

  apiRateLimiter: rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 30,
    message: {
      error: 'Too many API requests',
      retryAfter: '1 minute'
    },
    skip: (req) => req.path === '/api/health'
  }),

  requestSizeLimit: (req, res, next) => {
    const contentLength = req.get('content-length');
    const maxSize = 10 * 1024 * 1024;
    
    if (contentLength && parseInt(contentLength) > maxSize) {
      logger.warn('Request size limit exceeded', {
        ip: req.ip,
        contentLength,
        path: req.path
      });
      return res.status(413).json({
        error: 'Request entity too large',
        maxSize: '10MB'
      });
    }
    
    next();
  },

  securityHeaders: (req, res, next) => {
    res.removeHeader('X-Powered-By');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    
    next();
  }
};

export default securityMiddleware;
