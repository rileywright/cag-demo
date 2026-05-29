import crypto from 'crypto';
import logger from '../utils/logger.js';
import cacheService from './cacheService.js';
import anthropicService from './anthropicService.js';
import sessionService from './sessionService.js';

class CAGService {
  constructor() {
    this.cacheHitRate = 0;
    this.totalQueries = 0;
    this.cacheHits = 0;
    this.totalCost = 0;
    this.costPerInputToken = parseFloat(process.env.COST_PER_INPUT_TOKEN) || 0.000001;
    this.costPerOutputToken = parseFloat(process.env.COST_PER_OUTPUT_TOKEN) || 0.000005;
  }

  async initialize() {
    try {
      await anthropicService.initialize();
      await cacheService.connect(sessionService.client);
      logger.info('CAG service initialized successfully');
      return true;
    } catch (error) {
      logger.error('CAG service initialization failed:', error);
      throw new Error(`CAG initialization failed: ${error.message}`);
    }
  }

  async processQuery(sessionId, documentId, query, documentText, documentMetadata = {}) {
    try {
      this.totalQueries++;
      const queryStartTime = Date.now();

      const { key: queryHash, context, semanticHash } = await cacheService.generateCacheKey(
        sessionId, 
        documentId, 
        query
      );

      const cachedResponse = await this.checkCache(queryHash, query);
      if (cachedResponse) {
        this.cacheHits++;
        await this.updateSessionStats(sessionId, 'cache_hit', cachedResponse.metadata.cost);
        return this.formatResponse(cachedResponse, true, queryHash);
      }

      const freshResponse = await this.generateFreshResponse(
        query, 
        documentText, 
        documentMetadata, 
        queryHash
      );

      await this.cacheResponse(queryHash, freshResponse, query, context);
      await this.indexForSimilarity(query, queryHash, semanticHash);
      await this.updateSessionStats(sessionId, 'cache_miss', freshResponse.metadata.cost);

      const queryTime = Date.now() - queryStartTime;
      logger.info('Query processed', {
        sessionId,
        queryHash: queryHash.substring(0, 16) + '...',
        queryTime,
        fromCache: false,
        cost: freshResponse.metadata.cost.totalCost
      });

      return this.formatResponse(freshResponse, false, queryHash, queryTime);
    } catch (error) {
      logger.error('Query processing failed:', error);
      throw new Error(`Query processing failed: ${error.message}`);
    }
  }

  async checkCache(queryHash, originalQuery) {
    try {
      const cachedResponse = await cacheService.getCachedResponse(queryHash);
      
      if (cachedResponse) {
        logger.debug('Cache hit', {
          queryHash: queryHash.substring(0, 16) + '...',
          cachedAt: cachedResponse.metadata.cachedAt
        });
        
        return cachedResponse;
      }

      const similarQueries = await cacheService.findSimilarQueries(originalQuery);
      if (similarQueries.length > 0) {
        const bestMatch = similarQueries[0];
        
        if (bestMatch.similarity > 0.85) {
          logger.info('Semantic cache hit', {
            queryHash: queryHash.substring(0, 16) + '...',
            similarity: bestMatch.similarity
          });
          
          return {
            response: bestMatch.response,
            metadata: {
              ...bestMatch,
              isSemanticMatch: true,
              similarity: bestMatch.similarity
            }
          };
        }
      }

      return null;
    } catch (error) {
      logger.error('Cache check failed:', error);
      return null;
    }
  }

  async generateFreshResponse(query, documentText, documentMetadata, queryHash) {
    try {
      const analysis = await anthropicService.analyzeLegalQuery(
        documentText, 
        query, 
        documentMetadata
      );

      const enhancedMetadata = {
        ...analysis.metadata,
        queryHash,
        originalQuery: query,
        documentTitle: documentMetadata.title,
        processedAt: new Date().toISOString()
      };

      return {
        response: analysis.response,
        metadata: enhancedMetadata
      };
    } catch (error) {
      logger.error('Fresh response generation failed:', error);
      throw error;
    }
  }

  async processQueryWithCaching(sessionId, documentId, query, cachedDocument) {
    try {
      this.totalQueries++;
      const queryStartTime = Date.now();

      logger.info('Processing CAG query with prompt caching', {
        sessionId,
        documentId,
        queryLength: query.length,
        documentTokenCount: cachedDocument.tokenCount
      });

      // Use prompt caching with cached tokens
      const analysis = await anthropicService.analyzeWithPromptCaching(
        cachedDocument.text,
        cachedDocument.tokens,
        query,
        cachedDocument.metadata
      );

      const queryTime = Date.now() - queryStartTime;
      
      // Calculate cost savings
      const cachedTokensUsed = cachedDocument.tokenCount || 0;
      const newTokensUsed = analysis.metadata.inputTokens - cachedTokensUsed;
      const cachedTokenCost = cachedTokensUsed * this.costPerInputToken;
      const newTokenCost = newTokensUsed * this.costPerInputToken;
      const totalCost = analysis.metadata.cost.totalCost || analysis.metadata.cost;
      
      const costSavings = {
        cachedTokens: cachedTokensUsed,
        newTokens: newTokensUsed,
        cachedTokenCost: cachedTokenCost,
        newTokenCost: newTokenCost,
        totalCost: totalCost,
        savingsPercent: ((cachedTokenCost / totalCost) * 100).toFixed(2)
      };

      const enhancedMetadata = {
        ...analysis.metadata,
        queryTime,
        sessionId,
        documentId,
        documentTokenCount: cachedDocument.tokenCount,
        costSavings,
        queryHash: crypto.createHash('sha256').update(query).digest('hex'),
        processedAt: new Date().toISOString()
      };

      logger.info('CAG query completed with cost analysis', {
        sessionId,
        cachedTokensUsed,
        newTokensUsed,
        totalCost,
        savingsPercent: costSavings.savingsPercent
      });

      return {
        response: analysis.response,
        metadata: enhancedMetadata,
        costSavings
      };
    } catch (error) {
      logger.error('CAG query processing failed:', error);
      throw error;
    }
  }

  async cacheResponse(queryHash, response, originalQuery, context) {
    try {
      const cacheMetadata = {
        ...response.metadata,
        originalQuery,
        context,
        queryHash
      };

      await cacheService.cacheResponse(queryHash, response.response, cacheMetadata);
      
      logger.debug('Response cached', {
        queryHash: queryHash.substring(0, 16) + '...'
      });
    } catch (error) {
      logger.error('Caching failed:', error);
    }
  }

  async indexForSimilarity(query, queryHash, semanticHash) {
    try {
      await cacheService.indexSemanticQuery(query, queryHash);
    } catch (error) {
      logger.error('Similarity indexing failed:', error);
    }
  }

  async updateSessionStats(sessionId, cacheStatus, cost) {
    try {
      const session = await sessionService.getSession(sessionId);
      if (!session) return;

      const updates = {
        queryCount: (session.queryCount || 0) + 1,
        totalCost: (session.totalCost || 0) + cost.totalCost,
        lastActivity: 'query_processed'
      };

      if (cacheStatus === 'cache_hit') {
        updates.cacheHits = (session.cacheHits || 0) + 1;
      } else {
        updates.cacheMisses = (session.cacheMisses || 0) + 1;
      }

      await sessionService.updateSession(sessionId, updates);
    } catch (error) {
      logger.error('Session stats update failed:', error);
    }
  }

  formatResponse(response, fromCache, queryHash, queryTime = null) {
    const formatted = {
      success: true,
      data: {
        response: response.response,
        metadata: {
          queryHash: queryHash.substring(0, 16) + '...',
          fromCache,
          processedAt: response.metadata.processedAt || new Date().toISOString(),
          model: response.metadata.model,
          tokens: {
            input: response.metadata.inputTokens,
            output: response.metadata.outputTokens,
            total: response.metadata.totalTokens
          },
          cost: anthropicService.formatCostBreakdown(response.metadata.cost)
        }
      }
    };

    if (fromCache) {
      formatted.data.metadata.cacheInfo = {
        cachedAt: response.metadata.cachedAt,
        isSemanticMatch: response.metadata.isSemanticMatch || false,
        similarity: response.metadata.similarity || null
      };
    }

    if (queryTime) {
      formatted.data.metadata.responseTime = queryTime;
    }

    if (response.metadata.isSemanticMatch) {
      formatted.data.metadata.semanticMatch = {
        similarity: response.metadata.similarity,
        originalQuery: response.metadata.originalQuery
      };
    }

    return formatted;
  }

  async getCachePerformance() {
    try {
      const cacheStats = await cacheService.getCacheStats();
      const hitRate = this.totalQueries > 0 ? (this.cacheHits / this.totalQueries) : 0;

      return {
        totalQueries: this.totalQueries,
        cacheHits: this.cacheHits,
        cacheMisses: this.totalQueries - this.cacheHits,
        hitRate: Math.round(hitRate * 10000) / 100,
        totalCost: this.totalCost,
        cacheStats
      };
    } catch (error) {
      logger.error('Failed to get cache performance:', error);
      return null;
    }
  }

  async simulateRAGCost(query, documentText) {
    const ragSimulated = {
      embeddingCost: this.calculateEmbeddingCost(documentText),
      vectorSearchCost: 0.0002,
      retrievalCost: 0.0005,
      contextTokens: Math.min(documentText.length / 4, 8000),
      generationCost: this.calculateGenerationCost(2000, 500)
    };

    const totalRAGCost = Object.values(ragSimulated).reduce((sum, cost) => sum + cost, 0);

    return {
      breakdown: ragSimulated,
      totalCost: Math.round(totalRAGCost * 1000000) / 1000000,
      estimatedResponseTime: 3500,
      components: {
        embedding: 'Text embedding generation',
        vectorSearch: 'Vector database search',
        retrieval: 'Document retrieval',
        generation: 'Response generation'
      }
    };
  }

  calculateEmbeddingCost(text) {
    const tokenCount = Math.ceil(text.length / 4);
    const embeddingCostPer1K = 0.0001;
    return (tokenCount / 1000) * embeddingCostPer1K;
  }

  calculateGenerationCost(inputTokens, outputTokens) {
    const inputCost = inputTokens * 0.00000013;
    const outputCost = outputTokens * 0.00000032;
    return inputCost + outputCost;
  }

  async compareApproaches(sessionId, documentId, query, documentText, documentMetadata) {
    try {
      const cagStart = Date.now();
      const cagResult = await this.processQuery(sessionId, documentId, query, documentText, documentMetadata);
      const cagTime = Date.now() - cagStart;

      const ragResult = await this.simulateRAGCost(query, documentText);

      const manualReviewCost = {
        hourlyRate: 500,
        estimatedMinutes: Math.max(15, Math.ceil(documentText.length / 10000)),
        totalCost: 0
      };
      manualReviewCost.totalCost = (manualReviewCost.estimatedMinutes / 60) * manualReviewCost.hourlyRate;

      const comparison = {
        cag: {
          approach: 'Cache Augmented Generation',
          responseTime: cagTime,
          cost: cagResult.data.metadata.cost,
          fromCache: cagResult.data.metadata.fromCache,
          accuracy: 'High',
          scalability: 'Excellent'
        },
        rag: {
          approach: 'Retrieval Augmented Generation',
          responseTime: ragResult.estimatedResponseTime,
          cost: {
            currency: 'USD',
            totalCost: ragResult.totalCost,
            breakdown: ragResult.components
          },
          accuracy: 'High',
          scalability: 'Good'
        },
        manual: {
          approach: 'Manual Attorney Review',
          responseTime: manualReviewCost.estimatedMinutes * 60 * 1000,
          cost: {
            currency: 'USD',
            totalCost: manualReviewCost.totalCost,
            breakdown: {
              attorneyTime: `${manualReviewCost.estimatedMinutes} minutes @ $${manualReviewCost.hourlyRate}/hr`
            }
          },
          accuracy: 'Very High',
          scalability: 'Poor'
        }
      };

      const savings = {
        cagVsManual: {
          costSavings: manualReviewCost.totalCost - cagResult.data.metadata.cost.total.totalCost,
          timeSavings: manualReviewCost.estimatedMinutes * 60 - (cagTime / 1000),
          percentageSavings: Math.round((1 - cagResult.data.metadata.cost.total.totalCost / manualReviewCost.totalCost) * 10000) / 100
        },
        cagVsRag: {
          costSavings: ragResult.totalCost - cagResult.data.metadata.cost.total.totalCost,
          timeSavings: ragResult.estimatedResponseTime - cagTime,
          percentageSavings: Math.round((1 - cagResult.data.metadata.cost.total.totalCost / ragResult.totalCost) * 10000) / 100
        }
      };

      return {
        comparison,
        savings,
        recommendation: this.generateRecommendation(comparison, savings),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Approach comparison failed:', error);
      throw new Error(`Comparison failed: ${error.message}`);
    }
  }

  generateRecommendation(comparison, savings) {
    const cagCost = comparison.cag.cost.total.totalCost;
    const ragCost = comparison.rag.cost.totalCost;
    const manualCost = comparison.manual.cost.totalCost;

    let recommendation = 'CAG';
    let reasoning = [];

    if (savings.cagVsManual.percentageSavings > 80) {
      reasoning.push('Significant cost savings vs manual review');
    }

    if (savings.cagVsRag.percentageSavings > 50) {
      reasoning.push('Substantial cost advantage vs traditional RAG');
    }

    if (comparison.cag.responseTime < 2000) {
      reasoning.push('Fast response times for user experience');
    }

    if (comparison.cag.fromCache) {
      reasoning.push('Current response served from cache - optimal efficiency');
    }

    return {
      recommended: recommendation,
      confidence: reasoning.length >= 2 ? 'High' : 'Medium',
      reasoning,
      keyMetrics: {
        costEfficiency: `${Math.round(savings.cagVsManual.percentageSavings)}% savings vs manual`,
        speed: `${Math.round(comparison.cag.responseTime)}ms response time`,
        scalability: 'Excellent with cache optimization'
      }
    };
  }

  async getSystemHealth() {
    try {
      const anthropicHealth = await anthropicService.healthCheck();
      const cacheStats = await cacheService.getCacheStats();
      const performance = await this.getCachePerformance();

      return {
        status: anthropicHealth.status === 'healthy' ? 'healthy' : 'degraded',
        services: {
          anthropic: anthropicHealth,
          cache: {
            connected: cacheStats !== null,
            stats: cacheStats
          },
          performance
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('System health check failed:', error);
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

export default new CAGService();
