import express from 'express';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
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
  body('username')
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Username must be 2-50 characters'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Password must be 2-100 characters'),
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
    const { username, password, clientInfo = {} } = req.body;
    
    // For POC, accept any username/password combination
    // In production, validate against user database
    
    // Generate user-specific session ID using JWT UUID
    const userHash = crypto.createHash('sha256').update(`${username}:${password}`).digest('hex').substring(0, 16);
    const { token, sessionId } = tokenService.generateSessionToken();

    const sessionData = {
      sessionId,
      username,
      userHash,
      clientInfo: {
        userAgent: clientInfo.userAgent || req.get('User-Agent'),
        ip: clientInfo.ip || req.ip,
        ...clientInfo
      },
      documents: [],
      queryCount: 0,
      totalCost: 0,
      cacheHits: 0,
      cacheMisses: 0,
      createdAt: new Date().toISOString()
    };

    await sessionService.createSession(sessionId, sessionData, 0); // Initial session has no token savings yet

    logger.info('User session created', {
      sessionId,
      username,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      tokenSavings: 0
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

/**
 * @swagger
 * /api/session/login:
 *   post:
 *     tags:
 *       - Session
 *     summary: Login with existing credentials
 *     description: Authenticates user and returns existing session or creates new one
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *               password:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *     responses:
 *       200:
 *         description: Login successful
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
 */
router.post('/login', sessionCreationLimiter, [
  body('username')
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Username must be 2-50 characters'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Password must be 2-100 characters')
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
    const { username, password } = req.body;
    
    // For POC, accept any username/password combination
    // In production, validate against user database
    
    // Generate consistent user hash for same credentials
    const userHash = crypto.createHash('sha256').update(`${username}:${password}`).digest('hex').substring(0, 16);
    
    // Try to find existing session for this user
    const existingSession = await sessionService.findUserSession(username, userHash);
    
    let sessionId, token, sessionData, isNewSession = false;
    
    if (existingSession) {
      // Return existing session
      sessionId = existingSession.sessionId;
      const tokenResult = tokenService.generateSessionTokenForId(sessionId); // Use existing session ID
      token = tokenResult.token;
      sessionData = existingSession;
      
      // Update session with new token optimization data
      if (tokenResult.savings) {
        await sessionService.updateSessionOptimization(sessionId, tokenResult.savings);
      }
      
      logger.info('User logged in with existing session', {
        sessionId,
        username,
        existingDocuments: existingSession.documents?.length || 0,
        tokenSavings: tokenResult.savings,
        tokenSize: tokenResult.tokenSize
      });
    } else {
      // Create new session
      const tokenResult = tokenService.generateSessionToken();
      token = tokenResult.token;
      sessionId = tokenResult.sessionId;
      isNewSession = true;
      
      sessionData = {
        sessionId,
        username,
        userHash,
        clientInfo: {
          userAgent: req.get('User-Agent'),
          ip: req.ip
        },
        documents: [],
        queryCount: 0,
        totalCost: 0,
        cacheHits: 0,
        cacheMisses: 0,
        createdAt: new Date().toISOString()
      };

      await sessionService.createSession(sessionId, sessionData, tokenResult.savings || 0);
      
      logger.info('User created new session', {
        sessionId,
        username,
        tokenSavings: tokenResult.savings || 0
      });
    }

    res.status(existingSession ? 200 : 201).json({
      success: true,
      data: {
        sessionId,
        token,
        username,
        expiresAt: new Date(Date.now() + (30 * 60 * 1000)).toISOString(),
        existingSession: !!existingSession,
        documentCount: sessionData.documents?.length || 0,
        isNewSession,
        security: {
          sessionTimeout: `${process.env.SESSION_TIMEOUT_MINUTES} minutes`,
          tokenType: 'JWT',
          storage: 'Redis'
        }
      }
    });
  } catch (error) {
    logger.error('Login failed:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
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
    // Use existing session ID for token refresh to maintain consistency
    const { token } = tokenService.generateSessionTokenForId(req.sessionId);
    
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
