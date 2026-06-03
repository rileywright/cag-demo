import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '../.env');
console.log('Loading .env from:', envPath);
const result = dotenv.config({ path: envPath });
console.log('Dotenv result:', result);
console.log('JWT_SECRET after dotenv:', process.env.JWT_SECRET);

import validateEnv from './utils/envValidator.js';
import logger from './utils/logger.js';
import securityMiddleware from './middleware/security.js';
import errorHandler from './middleware/errorHandler.js';
import sessionService from './services/sessionService.js';
import tokenService from './services/tokenService.js';
import cagService from './services/cagService.js';
import roiService from './services/roiService.js';
import documentProcessorService from './services/documentProcessorService.js';
import sessionRoutes from './routes/sessionRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import cagRoutes from './routes/cagRoutes.js';
import roiRoutes from './routes/roiRoutes.js';
import swaggerMiddleware from './middleware/swaggerMiddleware.js';

const app = express();

try {
  const env = validateEnv();
  
  if (!fs.existsSync(path.join(__dirname, '../logs'))) {
    fs.mkdirSync(path.join(__dirname, '../logs'), { recursive: true });
  }

  app.use(securityMiddleware.securityHeaders);
  app.use(securityMiddleware.helmet);
  app.use(securityMiddleware.cors);
  app.use(securityMiddleware.rateLimiter);
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(securityMiddleware.requestSizeLimit);

  app.get('/api/health', (req, res) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: env.NODE_ENV,
      services: {
        redis: sessionService.isRedisConnected() ? 'connected' : 'disconnected'
      }
    });
  });

  app.get('/api/security/info', (req, res) => {
    res.status(200).json({
      security: {
        csrfProtection: 'enabled',
        rateLimit: {
          windowMs: '15 minutes',
          maxRequests: 100
        },
        fileUpload: {
          maxSize: `${env.MAX_FILE_SIZE_MB}MB`,
          allowedTypes: env.ALLOWED_FILE_TYPES
        },
        sessionTimeout: `${env.SESSION_TIMEOUT_MINUTES} minutes`,
        sessionStorage: 'Redis',
        tokenAlgorithm: 'HS256'
      }
    });
  });

  app.use('/api/session', sessionRoutes);
  app.use('/api/documents', documentRoutes);
  app.use('/api/cag', cagRoutes);
  app.use('/api/roi', roiRoutes);

  // API Documentation
  app.use('/api-docs', swaggerMiddleware.serve, swaggerMiddleware.setup);
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    import('./config/swagger.js').then(specs => {
      res.send(specs.default);
    }).catch(err => {
      res.status(500).json({ error: 'Failed to load API spec' });
    });
  });

  app.use(errorHandler.notFound);
  app.use(errorHandler.global);

  const PORT = env.PORT || 3001;
  const HOST = env.HOST || 'localhost';

  await sessionService.connect();
  tokenService.initialize();
  await cagService.initialize();
  await documentProcessorService.initialize();

  const server = app.listen(PORT, HOST, () => {
    logger.info(`Server running in ${env.NODE_ENV} mode on ${HOST}:${PORT}`);
    logger.info('Security middleware initialized');
    logger.info('Session management initialized');
    logger.info('Document processing initialized');
    logger.info('Python document processor initialized');
    logger.info('CAG system initialized');
    logger.info('ROI tracking initialized');
    logger.info('API endpoints available');
    logger.info('Session endpoints: /api/session/*');
    logger.info('Document endpoints: /api/documents/*');
    logger.info('CAG endpoints: /api/cag/*');
    logger.info('ROI endpoints: /api/roi/*');
    logger.info('API Documentation: http://localhost:3001/api-docs');
  });

  const gracefulShutdown = async (signal) => {
    logger.info(`Received ${signal}, shutting down gracefully`);
    
    await sessionService.disconnect();
    
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  process.on('unhandledRejection', (err) => {
    logger.error('Unhandled Rejection:', err);
    process.exit(1);
  });

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err);
    process.exit(1);
  });

} catch (error) {
  logger.error('Failed to start server:', error);
  process.exit(1);
}

export default app;
