import express from 'express';
import { body, validationResult } from 'express-validator';
import roiService from '../services/roiService.js';
import sessionService from '../services/sessionService.js';
import cagService from '../services/cagService.js';
import sessionAuth from '../middleware/sessionAuth.js';
import errorHandler from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * @swagger
 * /api/roi/dashboard:
 *   get:
 *     tags:
 *       - ROI
 *     summary: Get comprehensive ROI dashboard
 *     description: Returns complete ROI analysis with all categories and metrics
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: ROI dashboard data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ROI'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/dashboard', sessionAuth.authenticate, errorHandler.async(async (req, res) => {
  try {
    const session = await sessionService.getSession(req.sessionId);
    const performance = await cagService.getCachePerformance();
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    const mockQueryData = {
      documentLength: 50000,
      responseTime: 800,
      queryComplexity: 'medium',
      fromCache: session.cacheHits > 0
    };

    const mockSessionData = {
      queryCount: session.queryCount || 0,
      documentCount: session.documentCount || 0,
      cacheHitRate: session.queryCount > 0 ? (session.cacheHits || 0) / session.queryCount : 0,
      totalCost: session.totalCost || 0,
      documents: session.documents || []
    };

    const roiData = roiService.calculateComprehensiveROI(mockSessionData, mockQueryData, performance);

    res.json({
      success: true,
      data: {
        roi: roiData,
        session: {
          sessionId: req.sessionId,
          queryCount: session.queryCount,
          documentCount: session.documentCount,
          cacheHitRate: Math.round((session.cacheHits || 0) / Math.max(1, session.queryCount) * 100)
        },
        assumptions: roiService.getAssumptions()
      }
    });
  } catch (error) {
    logger.error('ROI dashboard failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate ROI dashboard',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}));

router.post('/calculate', 
  sessionAuth.authenticate,
  [
    body('documentLength')
      .isInt({ min: 100, max: 1000000 })
      .withMessage('Document length must be between 100 and 1,000,000 characters'),
    body('responseTime')
      .isInt({ min: 100, max: 30000 })
      .withMessage('Response time must be between 100ms and 30s'),
    body('queryComplexity')
      .isIn(['low', 'medium', 'high'])
      .withMessage('Query complexity must be low, medium, or high'),
    body('fromCache')
      .optional()
      .isBoolean()
      .withMessage('fromCache must be a boolean'),
    body('documentMetadata')
      .optional()
      .isObject()
      .withMessage('Document metadata must be an object'),
    body('costAnalysis')
      .optional()
      .isObject()
      .withMessage('Cost analysis must be an object')
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

      const { documentLength, responseTime, queryComplexity, fromCache = false, documentMetadata = {}, costAnalysis = null } = req.body;
      
      const session = await sessionService.getSession(req.sessionId);
      
      logger.info('Getting cache performance data for ROI calculation');
      const performanceData = await cagService.getCachePerformance();
      logger.info('Cache performance data retrieved', { performanceData });

      const queryData = {
        documentLength,
        responseTime,
        queryComplexity,
        fromCache,
        queryResponse: 'Sample legal analysis response for ROI calculation',
        costAnalysis: costAnalysis
      };

      const sessionData = {
        queryCount: session?.queryCount || 1,
        documentCount: session?.documentCount || 1,
        cacheHitRate: session?.queryCount > 0 ? (session?.cacheHits || 0) / session?.queryCount : 0,
        totalCost: session?.totalCost || 0,
        documents: session?.documents || [],
        documentMetadata: Object.keys(documentMetadata).length > 0 ? documentMetadata : session?.documents?.[0]?.metadata || {}
      };

      const roiData = roiService.calculateComprehensiveROI(sessionData, queryData, performanceData);

      logger.info('ROI calculation completed', {
        sessionId: req.sessionId,
        documentLength,
        responseTime,
        totalAnnualImpact: roiData.summary.totalAnnualImpact
      });

      res.json({
        success: true,
        data: roiData
      });
    } catch (error) {
      logger.error('ROI calculation failed:', error);
      res.status(500).json({
        success: false,
        error: 'ROI calculation failed',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  })
);

router.get('/assumptions', errorHandler.async(async (req, res) => {
  try {
    const assumptions = roiService.getAssumptions();
    
    res.json({
      success: true,
      data: assumptions
    });
  } catch (error) {
    logger.error('Failed to get assumptions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve assumptions',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}));

router.put('/assumptions',
  sessionAuth.authenticate,
  [
    body('attorneyHourlyRate')
      .optional()
      .isInt({ min: 100, max: 2000 })
      .withMessage('Attorney hourly rate must be between $100 and $2000'),
    body('juniorAttorneyRate')
      .optional()
      .isInt({ min: 50, max: 1000 })
      .withMessage('Junior attorney rate must be between $50 and $1000'),
    body('seniorAttorneyRate')
      .optional()
      .isInt({ min: 200, max: 3000 })
      .withMessage('Senior attorney rate must be between $200 and $3000'),
    body('averageContractValue')
      .optional()
      .isInt({ min: 1000, max: 1000000 })
      .withMessage('Average contract value must be between $1,000 and $1,000,000'),
    body('riskExposurePerIssue')
      .optional()
      .isInt({ min: 1000, max: 100000 })
      .withMessage('Risk exposure per issue must be between $1,000 and $100,000')
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

      const newAssumptions = req.body;
      roiService.updateAssumptions(newAssumptions);

      logger.info('ROI assumptions updated', {
        sessionId: req.sessionId,
        updatedAssumptions: Object.keys(newAssumptions)
      });

      res.json({
        success: true,
        message: 'ROI assumptions updated successfully',
        data: roiService.getAssumptions()
      });
    } catch (error) {
      logger.error('Failed to update assumptions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update assumptions',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  })
);

router.get('/report/:format?', 
  sessionAuth.authenticate,
  errorHandler.async(async (req, res) => {
    try {
      const format = req.params.format || 'json';
      const session = await sessionService.getSession(req.sessionId);
      const performance = await cagService.getCachePerformance();

      const mockQueryData = {
        documentLength: 50000,
        responseTime: 800,
        queryComplexity: 'medium',
        fromCache: session.cacheHits > 0
      };

      const mockSessionData = {
        queryCount: session.queryCount || 0,
        documentCount: session.documentCount || 0,
        cacheHitRate: session.queryCount > 0 ? (session.cacheHits || 0) / session.queryCount : 0,
        totalCost: session.totalCost || 0,
        documents: session.documents || []
      };

      const roiData = roiService.calculateComprehensiveROI(mockSessionData, mockQueryData, performance);

      if (format === 'summary') {
        const summary = {
          executiveSummary: {
            totalAnnualImpact: roiData.summary.totalAnnualImpact,
            roiPercentage: roiData.summary.roiPercentage,
            paybackPeriodMonths: roiData.summary.paybackPeriodMonths
          },
          topImpacts: roiData.categories
            .sort((a, b) => {
              const impactA = Object.values(a.impact).reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0);
              const impactB = Object.values(b.impact).reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0);
              return impactB - impactA;
            })
            .slice(0, 3)
            .map(cat => ({
              category: cat.category,
              impact: Math.round(Object.values(cat.impact).reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0))
            })),
          highImpactStories: roiData.highImpactStories
        };

        return res.json({
          success: true,
          data: summary
        });
      }

      if (format === 'cfo') {
        return res.json({
          success: true,
          data: {
            cfoReadyMetrics: roiData.cfoReadyMetrics,
            investmentSummary: {
              totalInvestment: 50000,
              expectedReturn: roiData.summary.totalAnnualImpact,
              roiMultiple: roiData.cfoReadyMetrics.investmentMetrics.roiMultiple,
              paybackPeriod: roiData.cfoReadyMetrics.investmentMetrics.paybackPeriod
            }
          }
        });
      }

      res.json({
        success: true,
        data: roiData
      });
    } catch (error) {
      logger.error('ROI report generation failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate ROI report',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  })
);

router.get('/stories', sessionAuth.authenticate, errorHandler.async(async (req, res) => {
  try {
    const session = await sessionService.getSession(req.sessionId);
    const performance = await cagService.getCachePerformance();

    const mockQueryData = {
      documentLength: 50000,
      responseTime: 800,
      queryComplexity: 'medium',
      fromCache: session.cacheHits > 0
    };

    const mockSessionData = {
      queryCount: session.queryCount || 0,
      documentCount: session.documentCount || 0,
      cacheHitRate: session.queryCount > 0 ? (session.cacheHits || 0) / session.queryCount : 0,
      totalCost: session.totalCost || 0,
      documents: session.documents || []
    };

    const roiData = roiService.calculateComprehensiveROI(mockSessionData, mockQueryData, performance);

    res.json({
      success: true,
      data: {
        stories: roiData.highImpactStories,
        totalStoryValue: roiData.highImpactStories.reduce((sum, story) => sum + story.value, 0),
        storyCount: roiData.highImpactStories.length
      }
    });
  } catch (error) {
    logger.error('ROI stories retrieval failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve ROI stories',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}));

export default router;
