import express from 'express';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import cagService from '../services/cagService.js';
import sessionService from '../services/sessionService.js';
import documentService from '../services/documentService.js';
import sessionAuth from '../middleware/sessionAuth.js';
import errorHandler from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';

const router = express.Router();

const queryLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: {
    error: 'Too many queries',
    retryAfter: '1 minute'
  },
  skipSuccessfulRequests: true
});

/**
 * @swagger
 * /api/cag/query:
 *   post:
 *     tags:
 *       - CAG
 *     summary: Process legal query with CAG
 *     description: Analyzes legal document using Cache Augmented Generation
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Query'
 *     responses:
 *       200:
 *         description: Query processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/QueryResponse'
 *       400:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/query', 
  sessionAuth.authenticate,
  queryLimiter,
  [
    body('query')
      .trim()
      .isLength({ min: 10, max: 1000 })
      .withMessage('Query must be between 10 and 1000 characters'),
    body('documentId')
      .optional()
      .isUUID()
      .withMessage('Document ID must be a valid UUID'),
    body('includeComparison')
      .optional()
      .isBoolean()
      .withMessage('includeComparison must be a boolean')
  ],
  errorHandler.async(async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { query, documentId, includeComparison = false } = req.body;
      
      let cachedDocument = null;
      
      if (documentId) {
        // Try to get from cache first (CAG approach)
        cachedDocument = await documentService.getCachedDocument(documentId);
        
        if (!cachedDocument) {
          // Fallback to session documents
          const document = req.session.documents?.find(doc => doc.documentId === documentId);
          if (!document) {
            return res.status(404).json({
              success: false,
              error: 'Document not found',
              details: 'The specified document does not exist in your session or cache'
            });
          }
          cachedDocument = document;
        }
      } else if (req.session.documents && req.session.documents.length > 0) {
        // Use latest document from session
        const latestDoc = req.session.documents[req.session.documents.length - 1];
        cachedDocument = await documentService.getCachedDocument(latestDoc.documentId) || latestDoc;
      }

      if (!cachedDocument) {
        return res.status(400).json({
          success: false,
          error: 'No document available',
          details: 'Please upload a document or specify a valid document ID'
        });
      }

      let result;
      if (includeComparison) {
        // Use comparison method (existing functionality)
        result = await cagService.compareApproaches(
          req.sessionId,
          documentId,
          query,
          cachedDocument.text,
          cachedDocument.metadata
        );
      } else {
        // Use new CAG method with cost analysis
        result = await cagService.processQueryWithCaching(
          req.sessionId,
          documentId,
          query,
          cachedDocument
        );
      }

      await sessionService.updateSession(req.sessionId, {
        lastActivity: 'query_processed',
        lastQueryAt: new Date().toISOString()
      });

      logger.info('Query processed successfully', {
        sessionId: req.sessionId,
        documentId,
        queryLength: query.length,
        includeComparison,
        fromCache: result.data?.metadata?.fromCache || false
      });

      // Format response with cost analysis if available
      const responseData = {
        success: true,
        data: result,
        sessionId: req.sessionId
      };

      // Add cost analysis if available
      if (result.costSavings) {
        responseData.costAnalysis = {
          cachedTokens: result.costSavings.cachedTokens,
          newTokens: Math.max(0, result.costSavings.newTokens),
          totalCost: result.costSavings.totalCost,
          savingsPercent: result.costSavings.savingsPercent,
          cacheEfficiency: result.metadata.cacheEfficiency
        };
      }

      res.json(responseData);
    } catch (error) {
      logger.error('Query processing failed:', error);
      
      if (error.message.includes('Rate limit')) {
        return res.status(429).json({
          success: false,
          error: 'Rate limit exceeded',
          details: 'Too many requests. Please try again later.'
        });
      }

      if (error.message.includes('Anthropic')) {
        return res.status(503).json({
          success: false,
          error: 'AI service unavailable',
          details: 'The AI analysis service is temporarily unavailable'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Query processing failed',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  })
);

router.get('/performance', sessionAuth.authenticate, errorHandler.async(async (req, res) => {
  try {
    const performance = await cagService.getCachePerformance();
    const sessionStats = await sessionService.getSessionStats(req.sessionId);

    res.json({
      success: true,
      data: {
        system: performance,
        session: {
          queryCount: sessionStats.queryCount,
          cacheHits: sessionStats.cacheHits || 0,
          cacheMisses: sessionStats.cacheMisses || 0,
          hitRate: sessionStats.queryCount > 0 ? 
            Math.round(((sessionStats.cacheHits || 0) / sessionStats.queryCount) * 10000) / 100 : 0,
          totalCost: sessionStats.totalCost || 0
        }
      }
    });
  } catch (error) {
    logger.error('Performance retrieval failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve performance data',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}));

router.get('/compare/:documentId', 
  sessionAuth.authenticate,
  [
    body('query')
      .trim()
      .isLength({ min: 10, max: 1000 })
      .withMessage('Query must be between 10 and 1000 characters')
  ],
  errorHandler.async(async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { documentId } = req.params;
      const { query } = req.body;
      
      const document = req.session.documents?.find(doc => doc.documentId === documentId);
      if (!document) {
        return res.status(404).json({
          success: false,
          error: 'Document not found',
          details: 'The specified document does not exist in your session'
        });
      }

      const comparison = await cagService.compareApproaches(
        req.sessionId,
        documentId,
        query,
        document.text,
        document.metadata
      );

      logger.info('Comparison completed', {
        sessionId: req.sessionId,
        documentId,
        queryLength: query.length
      });

      res.json({
        success: true,
        data: comparison
      });
    } catch (error) {
      logger.error('Comparison failed:', error);
      res.status(500).json({
        success: false,
        error: 'Comparison failed',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  })
);

router.get('/health', errorHandler.async(async (req, res) => {
  try {
    const health = await cagService.getSystemHealth();

    res.status(health.status === 'healthy' ? 200 : 503).json({
      success: health.status === 'healthy',
      data: health
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      success: false,
      error: 'Health check failed',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Service unavailable'
    });
  }
}));

router.get('/cache/stats', sessionAuth.authenticate, errorHandler.async(async (req, res) => {
  try {
    const cacheStats = await cagService.getCachePerformance();
    
    res.json({
      success: true,
      data: cacheStats
    });
  } catch (error) {
    logger.error('Cache stats retrieval failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve cache statistics',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}));

router.post('/cache/clear', 
  sessionAuth.authenticate,
  errorHandler.async(async (req, res) => {
    try {
      const result = await cagService.cacheService.clearCache();
      
      logger.info('Cache cleared', {
        sessionId: req.sessionId,
        clearedCount: result.clearedCount
      });

      res.json({
        success: true,
        message: 'Cache cleared successfully',
        data: result
      });
    } catch (error) {
      logger.error('Cache clearing failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to clear cache',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  })
);

router.get('/cost/estimate', 
  sessionAuth.authenticate,
  [
    body('query')
      .optional()
      .trim()
      .isLength({ min: 10, max: 1000 })
      .withMessage('Query must be between 10 and 1000 characters'),
    body('documentId')
      .optional()
      .isUUID()
      .withMessage('Document ID must be a valid UUID')
  ],
  errorHandler.async(async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { query = 'Sample legal analysis query', documentId } = req.body;
      
      let documentText = '';
      if (documentId) {
        const document = req.session.documents?.find(doc => doc.documentId === documentId);
        if (document) {
          documentText = document.text || '';
        }
      } else if (req.session.documents && req.session.documents.length > 0) {
        documentText = req.session.documents[0].text || '';
      }

      if (!documentText) {
        documentText = 'Sample contract text for cost estimation purposes...';
      }

      const ragCost = await cagService.simulateRAGCost(query, documentText);
      const cagCost = {
        approach: 'Cache Augmented Generation',
        estimatedCost: 0.00015,
        responseTime: 800,
        accuracy: 'High'
      };

      const manualCost = {
        approach: 'Manual Attorney Review',
        estimatedCost: 125.00,
        responseTime: 1800000,
        accuracy: 'Very High'
      };

      res.json({
        success: true,
        data: {
          estimates: {
            cag: cagCost,
            rag: ragCost,
            manual: manualCost
          },
          assumptions: {
            attorneyHourlyRate: 500,
            estimatedReviewTime: '15 minutes',
            cacheHitRate: 60
          },
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Cost estimation failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to estimate costs',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  })
);

export default router;
