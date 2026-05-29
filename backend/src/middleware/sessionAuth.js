import tokenService from '../services/tokenService.js';
import sessionService from '../services/sessionService.js';
import logger from '../utils/logger.js';

const sessionAuth = {
  authenticate: async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      const sessionToken = req.headers['x-session-token'] || 
                          req.cookies?.sessionToken ||
                          authHeader?.replace('Bearer ', '');

      if (!sessionToken) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          details: 'No session token provided'
        });
      }

      if (tokenService.isTokenExpired(sessionToken)) {
        return res.status(401).json({
          success: false,
          error: 'Session expired',
          details: 'Please start a new session'
        });
      }

      const decoded = tokenService.verifyToken(sessionToken);
      const session = await sessionService.getSession(decoded.sessionId);

      if (!session) {
        return res.status(401).json({
          success: false,
          error: 'Invalid session',
          details: 'Session not found or expired'
        });
      }

      if (!session.isActive) {
        return res.status(401).json({
          success: false,
          error: 'Session inactive',
          details: 'Session has been deactivated'
        });
      }

      req.session = session;
      req.sessionId = decoded.sessionId;
      req.sessionToken = sessionToken;

      logger.info('Session authenticated', {
        sessionId: decoded.sessionId,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      next();
    } catch (error) {
      logger.warn('Authentication failed:', {
        error: error.message,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      return res.status(401).json({
        success: false,
        error: 'Authentication failed',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Invalid credentials'
      });
    }
  },

  optional: async (req, res, next) => {
    try {
      const sessionToken = req.headers['x-session-token'] || 
                          req.cookies?.sessionToken ||
                          req.headers.authorization?.replace('Bearer ', '');

      if (sessionToken && !tokenService.isTokenExpired(sessionToken)) {
        const decoded = tokenService.verifyToken(sessionToken);
        const session = await sessionService.getSession(decoded.sessionId);

        if (session && session.isActive) {
          req.session = session;
          req.sessionId = decoded.sessionId;
          req.sessionToken = sessionToken;
        }
      }

      next();
    } catch (error) {
      logger.debug('Optional authentication failed:', error.message);
      next();
    }
  },

  requireActiveSession: (req, res, next) => {
    if (!req.session) {
      return res.status(401).json({
        success: false,
        error: 'Session required',
        details: 'This endpoint requires an active session'
      });
    }
    next();
  },

  validateSessionOwnership: (resourceSessionId) => {
    return (req, res, next) => {
      if (!req.session || req.sessionId !== resourceSessionId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          details: 'You do not have permission to access this resource'
        });
      }
      next();
    };
  }
};

export default sessionAuth;
