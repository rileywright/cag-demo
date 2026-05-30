import redis from 'redis';
import logger from '../utils/logger.js';

class SessionService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.redisUrl = process.env.REDIS_URL;
    this.sessionTimeout = parseInt(process.env.SESSION_TIMEOUT_MINUTES) || 30;
  }

  async connect() {
    try {
      this.client = redis.createClient({
        url: this.redisUrl,
        retry_delay_on_failover: 100,
        socket: {
          connectTimeout: 5000,
          lazyConnect: true,
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              logger.error('Redis reconnection failed after 10 attempts');
              return new Error('Redis reconnection failed');
            }
            return Math.min(retries * 50, 1000);
          }
        }
      });

      this.client.on('error', (err) => {
        logger.error('Redis connection error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis connected successfully');
        this.isConnected = true;
      });

      this.client.on('ready', () => {
        logger.info('Redis ready for commands');
      });

      this.client.on('end', () => {
        logger.warn('Redis connection ended');
        this.isConnected = false;
      });

      await this.client.connect();
      return true;
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw new Error('Redis connection failed');
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.disconnect();
      this.isConnected = false;
      logger.info('Redis disconnected');
    }
  }

  async createSession(sessionId, sessionData) {
    logger.info('Creating session', { sessionId, isConnected: this.isConnected });
    
    if (!this.isConnected) {
      logger.error('Redis not connected during session creation');
      throw new Error('Redis not connected');
    }

    try {
      const sessionKey = `session:${sessionId}`;
      const session = {
        ...sessionData,
        createdAt: new Date().toISOString(),
        lastAccessed: new Date().toISOString(),
        isActive: true
      };

      await Promise.race([
        this.client.setEx(
          sessionKey,
          this.sessionTimeout * 60,
          JSON.stringify(session)
        ),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Redis set operation timeout')), 5000)
        )
      ]);

      logger.info('Session created', { sessionId });
      return session;
    } catch (error) {
      logger.error('Failed to create session:', error);
      throw new Error('Session creation failed');
    }
  }

  async getSession(sessionId) {
    logger.info('Getting session', { sessionId, isConnected: this.isConnected });
    
    if (!this.isConnected) {
      logger.error('Redis not connected during session retrieval');
      throw new Error('Redis not connected');
    }

    try {
      const sessionKey = `session:${sessionId}`;
      const sessionData = await Promise.race([
        this.client.get(sessionKey),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Redis operation timeout')), 5000)
        )
      ]);

      if (!sessionData) {
        logger.warn('Session not found', { sessionId });
        return null;
      }

      const session = JSON.parse(sessionData);
      
      return session;
    } catch (error) {
      logger.error('Failed to get session:', error);
      throw new Error('Session retrieval failed');
    }
  }

  async updateSession(sessionId, updates) {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }

    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      const updatedSession = {
        ...session,
        ...updates,
        lastAccessed: new Date().toISOString()
      };

      const sessionKey = `session:${sessionId}`;
      await this.client.setEx(
        sessionKey,
        this.sessionTimeout * 60,
        JSON.stringify(updatedSession)
      );

      logger.info('Session updated', { sessionId });
      return updatedSession;
    } catch (error) {
      logger.error('Failed to update session:', error);
      throw new Error('Session update failed');
    }
  }

  async updateLastAccessed(sessionId) {
    if (!this.isConnected) return;

    try {
      const session = await this.getSession(sessionId);
      if (session) {
        await this.updateSession(sessionId, { lastAccessed: new Date().toISOString() });
      }
    } catch (error) {
      logger.warn('Failed to update last accessed:', error);
    }
  }

  async deleteSession(sessionId) {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }

    try {
      const sessionKey = `session:${sessionId}`;
      const result = await this.client.del(sessionKey);
      
      if (result > 0) {
        logger.info('Session deleted', { sessionId });
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('Failed to delete session:', error);
      throw new Error('Session deletion failed');
    }
  }

  async getSessionStats(sessionId) {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }

    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        return null;
      }

      const now = new Date();
      const createdAt = new Date(session.createdAt);
      const lastAccessed = new Date(session.lastAccessed);
      
      return {
        sessionId,
        createdAt: session.createdAt,
        lastAccessed: session.lastAccessed,
        sessionAge: Math.floor((now - createdAt) / 1000),
        idleTime: Math.floor((now - lastAccessed) / 1000),
        isActive: session.isActive,
        documentCount: session.documents?.length || 0,
        queryCount: session.queryCount || 0
      };
    } catch (error) {
      logger.error('Failed to get session stats:', error);
      throw new Error('Session stats retrieval failed');
    }
  }

  async cleanupExpiredSessions() {
    if (!this.isConnected) return;

    try {
      const pattern = 'session:*';
      const keys = await this.client.keys(pattern);
      let cleanedCount = 0;

      for (const key of keys) {
        const ttl = await this.client.ttl(key);
        if (ttl === -1 || ttl === -2) {
          await this.client.del(key);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        logger.info('Cleaned up expired sessions', { count: cleanedCount });
      }
    } catch (error) {
      logger.error('Failed to cleanup expired sessions:', error);
    }
  }

  isRedisConnected() {
    return this.isConnected;
  }

  async findUserSession(username, userHash) {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }

    try {
      // Look for all sessions and find ones matching userHash
      const pattern = 'session:*';
      const keys = await this.client.keys(pattern);
      
      if (keys.length === 0) {
        return null;
      }

      // Find sessions with matching userHash
      let matchingSession = null;
      let mostRecentTime = 0;

      for (const key of keys) {
        try {
          const sessionData = await this.client.get(key);
          if (sessionData) {
            const session = JSON.parse(sessionData);
            
            // Check if this session belongs to the same user (by userHash)
            if (session.userHash === userHash) {
              const sessionTime = new Date(session.createdAt).getTime();
              
              if (sessionTime > mostRecentTime) {
                mostRecentTime = sessionTime;
                matchingSession = session;
              }
            }
          }
        } catch (parseError) {
          logger.warn('Failed to parse session data:', parseError);
          // Clean up corrupted session
          await this.client.del(key);
        }
      }

      return matchingSession;
    } catch (error) {
      logger.error('Failed to find user session:', error);
      throw new Error('User session lookup failed');
    }
  }
}

export default new SessionService();
