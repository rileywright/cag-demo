import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import crypto from 'crypto';
import path from 'path';
import logger from '../utils/logger.js';
import anthropicService from './anthropicService.js';
import cacheService from './cacheService.js';
import documentProcessorService from './documentProcessorService.js';

class DocumentService {
  constructor() {
    this.maxTextLength = 1000000; // 1MB of text
    // NO CHUNKING - Pure CAG implementation
  }

  async extractTextFromFile(buffer, filename, mimetype) {
    try {
      const fileExtension = path.extname(filename).toLowerCase().substring(1);
      
      if (fileExtension === 'pdf') {
        return await this.extractTextFromPDF(buffer);
      } else if (fileExtension === 'txt') {
        return await this.extractTextFromTXT(buffer);
      } else if (fileExtension === 'docx') {
        return await this.extractTextFromDOCX(buffer);
      } else {
        throw new Error(`Unsupported file type: ${fileExtension}`);
      }
    } catch (error) {
      logger.error('File text extraction failed:', error);
      throw new Error(`File processing failed: ${error.message}`);
    }
  }

  async extractTextFromPDF(buffer) {
    try {
      const data = await pdfParse(buffer);
      
      if (!data.text || data.text.trim().length === 0) {
        throw new Error('No text content found in PDF');
      }

      const documentInfo = {
        text: data.text,
        pages: data.numpages,
        info: data.info,
        metadata: data.metadata,
        extractedAt: new Date().toISOString()
      };

      logger.info('PDF text extracted successfully', {
        pages: data.numpages,
        textLength: data.text.length,
        info: data.info?.Title || 'Untitled'
      });

      return documentInfo;
    } catch (error) {
      logger.error('PDF text extraction failed:', error);
      throw new Error(`PDF processing failed: ${error.message}`);
    }
  }

  async extractTextFromTXT(buffer) {
    try {
      const text = buffer.toString('utf8');
      
      if (!text || text.trim().length === 0) {
        throw new Error('No text content found in TXT file');
      }

      const documentInfo = {
        text: text,
        pages: 1,
        info: {},
        metadata: {},
        extractedAt: new Date().toISOString()
      };

      logger.info('TXT text extracted successfully', {
        textLength: text.length,
        pages: 1
      });

      return documentInfo;
    } catch (error) {
      logger.error('TXT text extraction failed:', error);
      throw new Error(`TXT processing failed: ${error.message}`);
    }
  }

  async extractTextFromDOCX(buffer) {
    try {
      // Use mammoth to properly extract text from DOCX
      const result = await mammoth.extractRawText({ buffer });
      const text = result.value;
      
      // Log any warnings from mammoth
      if (result.messages.length > 0) {
        logger.warn('DOCX extraction warnings', { messages: result.messages });
      }
      
      // Clean up the text
      let cleanedText = text
        .replace(/\s+/g, ' ') // Normalize whitespace
        .replace(/[^\x20-\x7E]/g, '') // Remove non-printable characters
        .trim();
      
      // Limit to reasonable size for tokenization
      cleanedText = cleanedText.substring(0, 50000); // 50K chars max
      
      if (!cleanedText || cleanedText.length === 0) {
        throw new Error('No readable text content found in DOCX file');
      }

      const documentInfo = {
        text: cleanedText,
        pages: 1,
        info: {},
        metadata: {},
        extractedAt: new Date().toISOString()
      };

      logger.info('DOCX text extracted successfully', {
        textLength: cleanedText.length,
        pages: 1
      });

      return documentInfo;
    } catch (error) {
      logger.error('DOCX text extraction failed:', error);
      throw new Error(`DOCX processing failed: ${error.message}`);
    }
  }

  validateDocumentContent(text) {
    if (!text || typeof text !== 'string') {
      throw new Error('Invalid document content');
    }

    if (text.length > this.maxTextLength) {
      throw new Error(`Document too large. Maximum ${this.maxTextLength} characters`);
    }

    const minLength = 100;
    if (text.length < minLength) {
      throw new Error(`Document too short. Minimum ${minLength} characters`);
    }

    // DISABLED - Skip regex validation to prevent memory issues
    return true;
  }

  cleanText(text) {
    // DISABLED - No regex processing, return as-is
    return text;
  }

  // chunkText REMOVED - Pure CAG uses full document context

  async getCachedDocument(documentId, sessionId) {
    try {
      const cacheKey = `doc:${sessionId}:${documentId}`;
      const cachedData = await cacheService.get(cacheKey);
      
      if (!cachedData) {
        logger.warn('Document not found in cache', { documentId, cacheKey });
        return null;
      }
      
      logger.info('Document retrieved from cache', {
        documentId,
        textLength: cachedData.text?.length || 0,
        tokenCount: cachedData.tokenCount || 0
      });
      
      return cachedData;
    } catch (error) {
      logger.error('Failed to retrieve cached document:', error);
      throw new Error(`Cache retrieval failed: ${error.message}`);
    }
  }

  extractLegalMetadata(text) {
    // DISABLED - Let LLM handle metadata extraction via CAG queries
    const metadata = {
      title: 'Document',
      parties: [],
      dates: [],
      clauses: [],
      risks: [],
      jurisdiction: null
    };

    return metadata;
  }

  extractTitle(text) {
    // DISABLED - Let LLM handle via CAG
    return 'Document';
  }

  extractParties(text) {
    // DISABLED - Let LLM handle via CAG
    return [];
  }

  extractDates(text) {
    // DISABLED - Let LLM handle via CAG
    return [];
  }

  extractClauses(text) {
    // DISABLED - Let LLM handle via CAG
    return [];
  }

  identifyPotentialRisks(text) {
    // DISABLED - Let LLM handle via CAG
    return [];
  }

  assessRiskSeverity(keyword) {
    const highRiskKeywords = ['unlimited liability', 'personal guarantee', 'penalty'];
    const mediumRiskKeywords = ['indemnify', 'liquidated damages', 'forfeiture'];
    
    if (highRiskKeywords.some(high => keyword.includes(high))) return 'high';
    if (mediumRiskKeywords.some(medium => keyword.includes(medium))) return 'medium';
    return 'low';
  }

  extractJurisdiction(text) {
    // DISABLED - Let LLM handle via CAG
    return null;
  }

  async processDocument(buffer, originalName, mimetype, sessionId) {
    try {
      logger.info('processDocument called', { sessionId, originalName });
      
      // Force garbage collection before processing
      if (global.gc) {
        global.gc();
      }

      // First extract raw text using existing method
      const documentInfo = await this.extractTextFromFile(buffer, originalName, mimetype);
      this.validateDocumentContent(documentInfo.text);
      
      // Process with Python document processor for cleaning and compression
      logger.info('Processing document with Python API');
      const processingResult = await documentProcessorService.processDocument(buffer, originalName, mimetype);
      
      let processedText = documentInfo.text;
      let compressionResult = null;
      
      if (processingResult.success) {
        processedText = processingResult.processedText;
        compressionResult = processingResult.metrics;
        
        logger.info('Document processing successful', {
          originalSize: compressionResult.original.size_bytes,
          processedSize: compressionResult.processed.size_bytes,
          tokenCompression: compressionResult.compression.token_compression_percent
        });
      } else {
        logger.warn('Document processing failed, using original text', {
          error: processingResult.error
        });
      }
      
      // Tokenize the processed document using Anthropic tokenizer
      logger.info('Tokenizing processed document for CAG cache');
      const tokenizationResult = await anthropicService.tokenizeText(processedText);
      
      // Create document ID and hash
      const documentId = crypto.randomUUID();
      const documentHash = crypto.createHash('sha256').update(buffer).digest('hex');
      
      // Store in Redis with session-specific cache key for security
      const cacheKey = `doc:${sessionId}:${documentId}`;
      const cacheData = {
        text: processedText,
        tokens: tokenizationResult.tokens,
        tokenCount: tokenizationResult.tokenCount,
        model: tokenizationResult.model,
        originalName,
        hash: documentHash,
        pages: documentInfo.pages,
        processedAt: new Date().toISOString(),
        compression: compressionResult ? {
          enabled: compressionResult.success,
          originalSize: compressionResult.originalSize,
          compressedSize: compressionResult.compressedSize,
          compressionRatio: compressionResult.compressionRatio,
          savings: compressionResult.savings,
          processingTime: compressionResult.processingTime
        } : {
          enabled: false,
          originalSize: documentInfo.text.length,
          compressedSize: documentInfo.text.length,
          compressionRatio: 0,
          savings: 0,
          processingTime: 0
        },
        metadata: {
          title: 'Document',
          parties: [],
          dates: [],
          clauses: [],
          risks: [],
          jurisdiction: null
        },
        statistics: {
          textLength: processedText.length,
          tokenCount: tokenizationResult.tokenCount,
          partiesCount: 0,
          clausesCount: 0,
          risksCount: 0
        }
      };
      
      // Store in Redis with TTL (30 days)
      await cacheService.set(cacheKey, cacheData, 30 * 24 * 60 * 60); // 30 days
      
      const processedDocument = {
        documentId,
        originalName,
        hash: documentHash,
        text: processedText,
        metadata: cacheData.metadata,
        pages: documentInfo.pages,
        processedAt: cacheData.processedAt,
        statistics: cacheData.statistics,
        tokenCount: tokenizationResult.tokenCount,
        cached: true,
        compression: compressionResult ? {
          enabled: true,
          originalSize: compressionResult.original.size_bytes,
          compressedSize: compressionResult.processed.size_bytes,
          compressionRatio: compressionResult.compression.size_compression_percent / 100,
          savings: compressionResult.compression.token_savings,
          processingTime: compressionResult.compression.processing_time_ms,
          tokenCompression: compressionResult.compression.token_compression_percent,
          costSavings: compressionResult.compression.cost_savings_usd,
          roi: compressionResult.roi
        } : {
          enabled: false,
          originalSize: documentInfo.text.length,
          compressedSize: documentInfo.text.length,
          compressionRatio: 0,
          savings: 0,
          processingTime: 0,
          tokenCompression: 0,
          costSavings: 0,
          roi: null
        }
      };

      logger.info('Document processed and cached successfully', {
        documentId: processedDocument.documentId,
        originalName,
        textLength: processedText.length,
        tokenCount: tokenizationResult.tokenCount,
        cacheKey
      });

      // Clear large objects from memory
      buffer = null;
      // documentInfo is const, will be garbage collected automatically
      
      return processedDocument;
    } catch (error) {
      logger.error('Document processing failed:', error);
      throw error;
    }
  }
}

export default new DocumentService();
