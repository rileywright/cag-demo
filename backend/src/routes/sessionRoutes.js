import express from 'express';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import tokenService from '../services/tokenService.js';
import sessionService from '../services/sessionService.js';
import sessionAuth from '../middleware/sessionAuth.js';
import errorHandler from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     SessionCreateRequest:
 *       type: object
 *       properties:
 *         clientInfo:
 *           type: object
 *           properties:
 *             userAgent:
 *               type: string
 *               maxLength: 500
 *             ip:
 *               type: string
 *               format: ipv4
 *     SessionResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/Session'
 *         - type: object
 *           properties:
 *             security:
 *               type: object
 *               properties:
 *                 sessionTimeout:
 *                   type: string
 *                 tokenType:
 *                   type: string
 */

const sessionCreationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  message: {
    error: 'Too many session creation attempts',
    retryAfter: '5 minutes'
  },
  skipSuccessfulRequests: true
});

/**
 * @swagger
 * /api/session/create:
 *   post:
 *     tags:
 *       - Session
 *     summary: Create a new session
 *     description: Creates a new user session with JWT authentication
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SessionCreateRequest'
 *     responses:
 *       201:
 *         description: Session created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/SessionResponse'
 *       400:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Too many requests
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/create', sessionCreationLimiter, [
  body('clientInfo')
    .optional()
    .isObject()
    .withMessage('Client info must be an object'),
  body('clientInfo.userAgent')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('User agent must be a string (max 500 chars)'),
  body('clientInfo.ip')
    .optional()
    .isIP()
    .withMessage('IP address must be valid')
], errorHandler.async(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }

  try {
    const { clientInfo = {} } = req.body;
    const { token, sessionId } = tokenService.generateSessionToken();

    const sessionData = {
      sessionId,
      clientInfo: {
        userAgent: clientInfo.userAgent || req.get('User-Agent'),
        ip: clientInfo.ip || req.ip,
        ...clientInfo
      },
      documents: [],
      queryCount: 0,
      totalCost: 0,
      cacheHits: 0,
      cacheMisses: 0
    };

    await sessionService.createSession(sessionId, sessionData);

    logger.info('New session created', {
      sessionId,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      success: true,
      data: {
        sessionId,
        token,
        expiresAt: new Date(Date.now() + (30 * 60 * 1000)).toISOString(),
        security: {
          sessionTimeout: `${process.env.SESSION_TIMEOUT_MINUTES} minutes`,
          tokenType: 'JWT',
          storage: 'Redis'
        }
      }
    });
  } catch (error) {
    logger.error('Session creation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Session creation failed',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}));

router.get('/status', sessionAuth.authenticate, errorHandler.async(async (req, res) => {
  try {
    const stats = await sessionService.getSessionStats(req.sessionId);
    const tokenExpiration = tokenService.getTokenExpiration(req.sessionToken);

    res.json({
      success: true,
      data: {
        session: stats,
        security: {
          tokenExpiresAt: new Date(tokenExpiration * 1000).toISOString(),
          timeRemaining: Math.max(0, tokenExpiration * 1000 - Date.now()),
          isActive: req.session.isActive
        }
      }
    });
  } catch (error) {
    logger.error('Session status check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get session status',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}));

router.post('/refresh', sessionAuth.authenticate, errorHandler.async(async (req, res) => {
  try {
    const { token, sessionId } = tokenService.generateSessionToken();
    
    await sessionService.updateSession(req.sessionId, {
      lastAccessed: new Date().toISOString()
    });

    logger.info('Session refreshed', { sessionId: req.sessionId });

    res.json({
      success: true,
      data: {
        newToken: token,
        expiresAt: new Date(Date.now() + (30 * 60 * 1000)).toISOString()
      }
    });
  } catch (error) {
    logger.error('Session refresh failed:', error);
    res.status(500).json({
      success: false,
      error: 'Session refresh failed',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}));

router.delete('/terminate', sessionAuth.authenticate, errorHandler.async(async (req, res) => {
  try {
    await sessionService.deleteSession(req.sessionId);

    logger.info('Session terminated', {
      sessionId: req.sessionId,
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Session terminated successfully',
      data: {
        terminatedAt: new Date().toISOString(),
        sessionId: req.sessionId
      }
    });
  } catch (error) {
    logger.error('Session termination failed:', error);
    res.status(500).json({
      success: false,
      error: 'Session termination failed',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}));

/**
 * @swagger
 * /api/session/health:
 *   get:
 *     tags:
 *       - Session
 *     summary: Check session service health
 *     description: Returns the health status of the session management service
 *     responses:
 *       200:
 *         description: Service health status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     redis:
 *                       type: object
 *                       properties:
 *                         connected:
 *                           type: boolean
 *                         url:
 *                           type: string
 *                     session:
 *                       type: object
 *                       properties:
 *                         timeoutMinutes:
 *                           type: integer
 *                         tokenAlgorithm:
 *                           type: string
 */
router.get('/health', errorHandler.async(async (req, res) => {
  try {
    const redisConnected = sessionService.isRedisConnected();
    
    res.json({
      success: true,
      data: {
        redis: {
          connected: redisConnected,
          url: process.env.REDIS_URL.replace(/\/\/.*@/, '//***@')
        },
        session: {
          timeoutMinutes: process.env.SESSION_TIMEOUT_MINUTES,
          tokenAlgorithm: 'HS256'
        }
      }
    });
  } catch (error) {
    logger.error('Session health check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}));

export default router;
