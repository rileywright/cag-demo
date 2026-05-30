import express from 'express';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import uploadMiddleware from '../middleware/uploadMiddleware.js';
import documentService from '../services/documentService.js';
import sessionService from '../services/sessionService.js';
import cacheService from '../services/cacheService.js';
import sessionAuth from '../middleware/sessionAuth.js';
import errorHandler from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';

const router = express.Router();

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: {
    error: 'Too many upload attempts',
    retryAfter: '1 minute'
  },
  skipSuccessfulRequests: true
});

/**
 * @swagger
 * /api/documents/upload:
 *   post:
 *     tags: [Documents]
 *     summary: Upload and process a legal document
 *     description: Upload a PDF, TXT, or DOCX file for legal analysis and processing
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - document
 *             properties:
 *               document:
 *                 type: string
 *                 format: binary
 *                 description: Legal document file (PDF, TXT, or DOCX)
 *     responses:
 *       200:
 *         description: Document uploaded and processed successfully
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
 *                     documentId:
 *                       type: string
 *                       example: "doc_1234567890"
 *                     originalName:
 *                       type: string
 *                       example: "contract.pdf"
 *                     fileHash:
 *                       type: string
 *                       example: "sha256:abc123..."
 *                     metadata:
 *                       type: object
 *                       properties:
 *                         parties:
 *                           type: array
 *                           items:
 *                             type: string
 *                         clauses:
 *                           type: array
 *                           items:
 *                             type: string
 *                         risks:
 *                           type: array
 *                           items:
 *                             type: object
 *                     statistics:
 *                       type: object
 *                       properties:
 *                         textLength:
 *                           type: integer
 *                         chunkCount:
 *                           type: integer
 *                         partiesCount:
 *                           type: integer
 *                         clausesCount:
 *                           type: integer
 *                         risksCount:
 *                           type: integer
 *       400:
 *         description: Bad request - validation failed or no file uploaded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - invalid session token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Too many requests - rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/upload', 
  sessionAuth.authenticate,
  uploadLimiter,
  uploadMiddleware.createUploadMiddleware().single('document'),
  errorHandler.async(async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded',
          details: 'Please select a PDF file to upload'
        });
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const processedFile = await uploadMiddleware.processUploadedFile(req.file);
      
      // Ensure cache service is connected
      if (!cacheService.isConnected) {
        await cacheService.connect(sessionService.client);
      }
      
      const processedDocument = await documentService.processDocument(
        processedFile.buffer,
        processedFile.originalName,
        processedFile.mimetype,
        req.sessionId
      );

      const document = {
        documentId: processedDocument.documentId,
        originalName: processedFile.originalName,
        sanitizedFileName: processedFile.sanitizedName,
        fileHash: processedFile.hash,
        uploadedAt: processedFile.uploadedAt,
        processedAt: processedDocument.processedAt,
        metadata: processedDocument.metadata,
        statistics: processedDocument.statistics,
        pages: processedDocument.pages,
        tokenCount: processedDocument.tokenCount,
        cached: processedDocument.cached,
        model: processedDocument.model
      };

      const updatedSession = await sessionService.updateSession(req.sessionId, {
        documents: [...(req.session.documents || []), document],
        lastActivity: 'document_upload',
        documentCount: (req.session.documents?.length || 0) + 1
      });

      logger.info('Document uploaded successfully', {
        documentId: document.documentId,
        sessionId: req.sessionId,
        originalName: document.originalName,
        fileSize: processedFile.size
      });

      res.status(201).json({
        success: true,
        data: {
          document,
          session: {
            documentCount: updatedSession.documentCount,
            lastActivity: updatedSession.lastActivity
          },
          security: {
            fileHash: document.fileHash.substring(0, 16) + '...',
            processedInMemory: true,
            autoDeleteMinutes: process.env.SESSION_TIMEOUT_MINUTES
          }
        }
      });
    } catch (error) {
      logger.error('Document upload failed:', error);
      
      if (error.code === 'INVALID_FILE_TYPE') {
        return res.status(400).json({
          success: false,
          error: 'Invalid file type',
          details: error.message
        });
      }

      if (error.code === 'INVALID_MIME_TYPE') {
        return res.status(400).json({
          success: false,
          error: 'Invalid MIME type',
          details: error.message
        });
      }

      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: 'File too large',
          details: `Maximum file size is ${process.env.MAX_FILE_SIZE_MB || 10}MB`
        });
      }

      res.status(500).json({
        success: false,
        error: 'Document upload failed',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  })
);

/**
 * @swagger
 * /api/documents/list:
 *   get:
 *     tags: [Documents]
 *     summary: List all uploaded documents
 *     description: Retrieve a list of all documents uploaded in the current session
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Documents retrieved successfully
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
 *                     documents:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           documentId:
 *                             type: string
 *                           originalName:
 *                             type: string
 *                           uploadedAt:
 *                             type: string
 *                           processedAt:
 *                             type: string
 *                           statistics:
 *                             type: object
 *                             properties:
 *                               textLength:
 *                                 type: integer
 *                               chunkCount:
 *                                 type: integer
 *                               partiesCount:
 *                                 type: integer
 *                               clausesCount:
 *                                 type: integer
 *                               risksCount:
 *                                 type: integer
 *                     count:
 *                       type: integer
 *                       example: 3
 *       401:
 *         description: Unauthorized - invalid session token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Get all documents for the current session
router.get('/', sessionAuth.authenticate, errorHandler.async(async (req, res) => {
  try {
    const documents = req.session.documents || [];
    
    res.json({
      success: true,
      data: {
        documents: documents,
        count: documents.length
      }
    });
  } catch (error) {
    logger.error('Failed to get documents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve documents',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}));

router.get('/list', sessionAuth.authenticate, errorHandler.async(async (req, res) => {
  try {
    const documents = req.session.documents || [];
    
    const documentList = documents.map(doc => ({
      documentId: doc.documentId,
      originalName: doc.originalName,
      uploadedAt: doc.uploadedAt,
      processedAt: doc.processedAt,
      pages: doc.pages,
      statistics: doc.statistics,
      metadata: {
        title: doc.metadata.title,
        partiesCount: doc.metadata.parties.length,
        clausesCount: doc.metadata.clauses.length,
        risksCount: doc.metadata.risks.length
      }
    }));

    res.json({
      success: true,
      data: {
        documents: documentList,
        totalCount: documents.length,
        sessionInfo: {
          sessionId: req.sessionId,
          documentCount: documents.length
        }
      }
    });
  } catch (error) {
    logger.error('Document list retrieval failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve documents',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}));

/**
 * @swagger
 * /api/documents/{documentId}:
 *   get:
 *     tags: [Documents]
 *     summary: Get document details
 *     description: Retrieve detailed information about a specific document
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the document to retrieve
 *     responses:
 *       200:
 *         description: Document retrieved successfully
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
 *                     documentId:
 *                       type: string
 *                     originalName:
 *                       type: string
 *                     text:
 *                       type: string
 *                     chunks:
 *                       type: array
 *                       items:
 *                         type: string
 *                     metadata:
 *                       type: object
 *                       properties:
 *                         parties:
 *                           type: array
 *                           items:
 *                             type: string
 *                         clauses:
 *                           type: array
 *                           items:
 *                             type: string
 *                         risks:
 *                           type: array
 *                           items:
 *                             type: object
 *                     statistics:
 *                       type: object
 *       401:
 *         description: Unauthorized - invalid session token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Document not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:documentId', sessionAuth.authenticate, errorHandler.async(async (req, res) => {
  try {
    const { documentId } = req.params;
    
    const document = req.session.documents?.find(doc => doc.documentId === documentId);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found',
        details: 'The requested document does not exist in your session'
      });
    }

    const documentWithDetails = {
      ...document,
      security: {
        fileHash: document.fileHash.substring(0, 16) + '...',
        processedInMemory: true,
        autoDeleteMinutes: process.env.SESSION_TIMEOUT_MINUTES
      }
    };

    res.json({
      success: true,
      data: {
        document: documentWithDetails
      }
    });
  } catch (error) {
    logger.error('Document retrieval failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve document',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}));

/**
 * @swagger
 * /api/documents/{documentId}/metadata:
 *   get:
 *     tags: [Documents]
 *     summary: Get document metadata
 *     description: Retrieve legal metadata extracted from a specific document
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the document to retrieve metadata for
 *     responses:
 *       200:
 *         description: Document metadata retrieved successfully
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
 *                     documentId:
 *                       type: string
 *                     metadata:
 *                       type: object
 *                       properties:
 *                         parties:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: ["Acme Corp", "Beta Inc"]
 *                         clauses:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: ["Non-disclosure", "Termination"]
 *                         risks:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               type:
 *                                 type: string
 *                                 example: "Ambiguous language"
 *                               severity:
 *                                 type: string
 *                                 example: "medium"
 *                               description:
 *                                 type: string
 *                                 example: "Clause could be interpreted multiple ways"
 *                         jurisdiction:
 *                           type: string
 *                           example: "California"
 *                         contractType:
 *                           type: string
 *                           example: "Service Agreement"
 *                         effectiveDate:
 *                           type: string
 *                           example: "2024-01-01"
 *                         expirationDate:
 *                           type: string
 *                           example: "2025-12-31"
 *       401:
 *         description: Unauthorized - invalid session token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Document not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:documentId/metadata', sessionAuth.authenticate, errorHandler.async(async (req, res) => {
  try {
    const { documentId } = req.params;
    
    const document = req.session.documents?.find(doc => doc.documentId === documentId);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found',
        details: 'The requested document does not exist in your session'
      });
    }

    res.json({
      success: true,
      data: {
        metadata: document.metadata,
        statistics: document.statistics,
        processing: {
          processedAt: document.processedAt,
          pages: document.pages,
          chunkCount: document.statistics.textLength > 4000 ? 
            Math.ceil(document.statistics.textLength / 4000) : 1
        }
      }
    });
  } catch (error) {
    logger.error('Document metadata retrieval failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve document metadata',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}));

/**
 * @swagger
 * /api/documents/{documentId}:
 *   delete:
 *     tags: [Documents]
 *     summary: Delete a document
 *     description: Remove a specific document from the session
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the document to delete
 *     responses:
 *       200:
 *         description: Document deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Document deleted successfully"
 *       401:
 *         description: Unauthorized - invalid session token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Document not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:documentId', sessionAuth.authenticate, errorHandler.async(async (req, res) => {
  try {
    const { documentId } = req.params;
    
    const documents = req.session.documents || [];
    const documentIndex = documents.findIndex(doc => doc.documentId === documentId);
    
    if (documentIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Document not found',
        details: 'The requested document does not exist in your session'
      });
    }

    const deletedDocument = documents[documentIndex];
    documents.splice(documentIndex, 1);

    await sessionService.updateSession(req.sessionId, {
      documents,
      lastActivity: 'document_deletion',
      documentCount: documents.length
    });

    logger.info('Document deleted from session', {
      documentId,
      sessionId: req.sessionId,
      originalName: deletedDocument.originalName
    });

    res.json({
      success: true,
      message: 'Document removed from session',
      data: {
        deletedDocumentId: documentId,
        remainingDocuments: documents.length,
        deletedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Document deletion failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete document',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}));

/**
 * @swagger
 * /api/documents/all:
 *   delete:
 *     tags: [Documents]
 *     summary: Delete all documents
 *     description: Remove all documents from the current session
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: All documents deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "All documents deleted successfully"
 *                 deletedCount:
 *                   type: integer
 *                   example: 5
 *       401:
 *         description: Unauthorized - invalid session token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/all', sessionAuth.authenticate, errorHandler.async(async (req, res) => {
  try {
    const documentCount = req.session.documents?.length || 0;
    
    await sessionService.updateSession(req.sessionId, {
      documents: [],
      lastActivity: 'all_documents_cleared',
      documentCount: 0
    });

    logger.info('All documents cleared from session', {
      sessionId: req.sessionId,
      clearedCount: documentCount
    });

    res.json({
      success: true,
      message: 'All documents removed from session',
      data: {
        clearedCount: documentCount,
        clearedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Document clearing failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear documents',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}));

export default router;
