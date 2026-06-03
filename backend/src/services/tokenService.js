import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import logger from '../utils/logger.js';

class TokenService {
  constructor() {
    this.jwtSecret = null;
    this.sessionTimeout = parseInt(process.env.SESSION_TIMEOUT_MINUTES) || 30;
  }
  
  initialize() {
    this.jwtSecret = process.env.JWT_SECRET;
    
    if (!this.jwtSecret) {
      logger.error('JWT_SECRET environment variable is not set');
      throw new Error('JWT_SECRET environment variable is required');
    }
    
    logger.info('TokenService initialized', {
      jwtSecretSet: !!this.jwtSecret,
      sessionTimeout: this.sessionTimeout
    });
  }
  
  ensureInitialized() {
    if (!this.jwtSecret) {
      this.initialize();
    }
  }

  generateSessionToken() {
    this.ensureInitialized();
    
    const sessionId = crypto.randomUUID();
    const tokenPayload = {
      sid: sessionId,  // Shortened field name
      // Removed 'type' field - all tokens are session tokens
    };

    const token = jwt.sign(tokenPayload, this.jwtSecret, {
      algorithm: 'HS256',
      expiresIn: `${this.sessionTimeout}m`
    });

    // Calculate token size for optimization tracking
    const tokenSize = Buffer.byteLength(token, 'utf8');
    const unoptimizedSize = this.calculateUnoptimizedTokenSize();
    const savings = unoptimizedSize - tokenSize;
    const savingsPercent = ((savings / unoptimizedSize) * 100).toFixed(2);

    logger.info('Session token generated', { 
      sessionId, 
      tokenSize,
      unoptimizedSize,
      savings,
      savingsPercent: `${savingsPercent}%`
    });
    return { token, sessionId, tokenSize, savings };
  }

  generateSessionTokenForId(sessionId) {
    this.ensureInitialized();
    
    const tokenPayload = {
      sid: sessionId,  // Shortened field name
      // Removed 'type' field - all tokens are session tokens
    };

    const token = jwt.sign(tokenPayload, this.jwtSecret, {
      algorithm: 'HS256',
      expiresIn: `${this.sessionTimeout}m`
    });

    // Calculate token size for optimization tracking
    const tokenSize = Buffer.byteLength(token, 'utf8');
    const unoptimizedSize = this.calculateUnoptimizedTokenSize();
    const savings = unoptimizedSize - tokenSize;
    const savingsPercent = ((savings / unoptimizedSize) * 100).toFixed(2);

    logger.info('Session token generated for existing session', { 
      sessionId, 
      tokenSize,
      unoptimizedSize,
      savings,
      savingsPercent: `${savingsPercent}%`
    });
    return { token, sessionId, tokenSize, savings };
  }

  calculateUnoptimizedTokenSize() {
    // Calculate size of unoptimized token for comparison
    const unoptimizedPayload = {
      sessionId: crypto.randomUUID(),  // Full field name
      type: 'session'                  // Include type field
    };
    const unoptimizedToken = jwt.sign(unoptimizedPayload, this.jwtSecret, {
      algorithm: 'HS256',
      expiresIn: `${this.sessionTimeout}m`
    });
    return Buffer.byteLength(unoptimizedToken, 'utf8');
  }

  verifyToken(token) {
    this.ensureInitialized();
    
    try {
      const decoded = jwt.verify(token, this.jwtSecret, {
        algorithms: ['HS256']
      });

      // Map shortened field name back to original for compatibility
      if (decoded.sid) {
        decoded.sessionId = decoded.sid;
        delete decoded.sid;
      }

      // Removed type check - all tokens are session tokens

      return decoded;
    } catch (error) {
      logger.warn('Token verification failed', {
        error: error.message,
        token: token.substring(0, 20) + '...'
      });
      throw new Error('Invalid or expired token');
    }
  }

  decodeToken(token) {
    try {
      return jwt.decode(token, { complete: true });
    } catch (error) {
      logger.warn('Token decode failed', { error: error.message });
      return null;
    }
  }

  getTokenExpiration(token) {
    const decoded = this.decodeToken(token);
    return decoded?.payload?.exp || null;
  }

  isTokenExpired(token) {
    const exp = this.getTokenExpiration(token);
    if (!exp) return true;
    
    return Date.now() >= exp * 1000;
  }
}

export default new TokenService();
