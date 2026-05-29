import crypto from 'crypto';
import logger from '../utils/logger.js';

class CacheService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.defaultTTL = 1800; // 30 minutes
    this.similarityThreshold = 0.85;
  }

  async connect(redisClient) {
    this.client = redisClient;
    this.isConnected = true;
    logger.info('Cache service connected to Redis');
  }

  disconnect() {
    this.client = null;
    this.isConnected = false;
    logger.info('Cache service disconnected from Redis');
  }

  generateQueryHash(query, documentContext = '') {
    const normalizedQuery = query.toLowerCase().trim();
    const normalizedContext = documentContext.toLowerCase().trim();
    const combinedText = `${normalizedQuery}|${normalizedContext}`;
    
    return crypto.createHash('sha256').update(combinedText).digest('hex');
  }

  generateSemanticHash(query) {
    const words = query.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .sort()
      .join(' ');
    
    return crypto.createHash('sha256').update(words).digest('hex');
  }

  async cacheResponse(queryHash, response, metadata = {}) {
    if (!this.isConnected) {
      throw new Error('Cache service not connected');
    }

    try {
      const cacheKey = `cag:response:${queryHash}`;
      const cacheData = {
        response,
        metadata: {
          ...metadata,
          cachedAt: new Date().toISOString(),
          ttl: this.defaultTTL
        }
      };

      await this.client.setEx(
        cacheKey,
        this.defaultTTL,
        JSON.stringify(cacheData)
      );

      await this.client.zAdd(
        'cag:response:index',
        {
          score: Date.now(),
          value: queryHash
        }
      );

      logger.info('Response cached', {
        queryHash: queryHash.substring(0, 16) + '...',
        responseLength: response.length,
        metadata
      });

      return true;
    } catch (error) {
      logger.error('Failed to cache response:', error);
      throw new Error('Cache operation failed');
    }
  }

  async get(key) {
    if (!this.isConnected) {
      throw new Error('Cache service not connected');
    }

    try {
      const cachedData = await this.client.get(key);
      
      if (!cachedData) {
        return null;
      }

      return JSON.parse(cachedData);
    } catch (error) {
      logger.error('Failed to get from cache:', error);
      return null;
    }
  }

  async set(key, value, ttl = this.defaultTTL) {
    if (!this.isConnected) {
      throw new Error('Cache service not connected');
    }

    try {
      const serializedValue = JSON.stringify(value);
      await this.client.setEx(key, ttl, serializedValue);
      
      logger.debug('Cache set successful', {
        key: key.substring(0, 50) + '...',
        ttl
      });
      
      return true;
    } catch (error) {
      logger.error('Failed to set cache:', error);
      throw new Error(`Cache set failed: ${error.message}`);
    }
  }

  async getCachedResponse(queryHash) {
    if (!this.isConnected) {
      throw new Error('Cache service not connected');
    }

    try {
      const cacheKey = `cag:response:${queryHash}`;
      const cachedData = await this.client.get(cacheKey);

      if (!cachedData) {
        return null;
      }

      const cacheEntry = JSON.parse(cachedData);
      
      await this.client.zAdd(
        'cag:response:index',
        {
          score: Date.now(),
          value: queryHash
        }
      );

      logger.info('Cache hit', {
        queryHash: queryHash.substring(0, 16) + '...',
        cachedAt: cacheEntry.metadata.cachedAt
      });

      return cacheEntry;
    } catch (error) {
      logger.error('Failed to retrieve cached response:', error);
      return null;
    }
  }

  async findSimilarQueries(query, limit = 5) {
    if (!this.isConnected) {
      return [];
    }

    try {
      const semanticHash = this.generateSemanticHash(query);
      const similarityKey = `cag:similar:${semanticHash}`;
      
      const similarHashes = await this.client.lRange(similarityKey, 0, limit - 1);
      
      if (similarHashes.length === 0) {
        return [];
      }

      const similarQueries = [];
      for (const hash of similarHashes) {
        const cached = await this.getCachedResponse(hash);
        if (cached && cached.metadata.originalQuery) {
          similarQueries.push({
            hash,
            query: cached.metadata.originalQuery,
            response: cached.response,
            similarity: cached.metadata.similarity || 0.9
          });
        }
      }

      return similarQueries.sort((a, b) => b.similarity - a.similarity);
    } catch (error) {
      logger.error('Failed to find similar queries:', error);
      return [];
    }
  }

  async indexSemanticQuery(query, queryHash) {
    if (!this.isConnected) {
      return;
    }

    try {
      const semanticHash = this.generateSemanticHash(query);
      const similarityKey = `cag:similar:${semanticHash}`;
      
      await this.client.lPush(similarityKey, queryHash);
      await this.client.lTrim(similarityKey, 0, 19);
      await this.client.expire(similarityKey, this.defaultTTL);

      logger.debug('Query indexed for similarity', {
        semanticHash: semanticHash.substring(0, 16) + '...',
        queryHash: queryHash.substring(0, 16) + '...'
      });
    } catch (error) {
      logger.error('Failed to index semantic query:', error);
    }
  }

  async getCacheStats() {
    if (!this.isConnected) {
      return null;
    }

    try {
      const indexSize = await this.client.zCard('cag:response:index');
      const info = await this.client.info('memory');
      
      const memoryMatch = info.match(/used_memory:(\d+)/);
      const usedMemory = memoryMatch ? parseInt(memoryMatch[1]) : 0;

      return {
        totalCachedResponses: indexSize,
        memoryUsageBytes: usedMemory,
        memoryUsageMB: Math.round(usedMemory / 1024 / 1024 * 100) / 100,
        defaultTTL: this.defaultTTL
      };
    } catch (error) {
      logger.error('Failed to get cache stats:', error);
      return null;
    }
  }

  async cleanupExpiredEntries() {
    if (!this.isConnected) {
      return;
    }

    try {
      const now = Date.now();
      const expiredThreshold = now - (this.defaultTTL * 1000);
      
      const expiredEntries = await this.client.zRangeByScore(
        'cag:response:index',
        0,
        expiredThreshold
      );

      let cleanedCount = 0;
      for (const queryHash of expiredEntries) {
        const cacheKey = `cag:response:${queryHash}`;
        await this.client.del(cacheKey);
        await this.client.zRem('cag:response:index', queryHash);
        cleanedCount++;
      }

      if (cleanedCount > 0) {
        logger.info('Cleaned up expired cache entries', { count: cleanedCount });
      }

      return cleanedCount;
    } catch (error) {
      logger.error('Failed to cleanup expired entries:', error);
      return 0;
    }
  }

  async clearCache() {
    if (!this.isConnected) {
      throw new Error('Cache service not connected');
    }

    try {
      const pattern = 'cag:*';
      const keys = await this.client.keys(pattern);
      
      if (keys.length === 0) {
        return { clearedCount: 0 };
      }

      await this.client.del(keys);
      
      logger.info('Cache cleared', { clearedCount: keys.length });
      
      return { clearedCount: keys.length };
    } catch (error) {
      logger.error('Failed to clear cache:', error);
      throw new Error('Cache clearing failed');
    }
  }

  calculateSimilarity(query1, query2) {
    const words1 = new Set(query1.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/));
    const words2 = new Set(query2.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  async generateCacheKey(sessionId, documentId, query) {
    const context = `${sessionId}:${documentId || 'global'}`;
    const queryHash = this.generateQueryHash(query, context);
    
    return {
      key: queryHash,
      context,
      semanticHash: this.generateSemanticHash(query)
    };
  }
}

export default new CacheService();
