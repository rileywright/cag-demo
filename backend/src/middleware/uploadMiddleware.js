import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import logger from '../utils/logger.js';

const uploadMiddleware = {
  storage: multer.memoryStorage(),

  fileFilter: (req, file, cb) => {
    const allowedTypes = process.env.ALLOWED_FILE_TYPES?.split(',') || ['pdf', 'txt', 'docx'];
    const fileExtension = path.extname(file.originalname).toLowerCase().substring(1);
    
    if (!allowedTypes.includes(fileExtension)) {
      const error = new Error(`File type .${fileExtension} not allowed. Allowed types: ${allowedTypes.join(', ')}`);
      error.code = 'INVALID_FILE_TYPE';
      return cb(error, false);
    }

    // Validate MIME types for each file type
    const allowedMimeTypes = {
      'pdf': 'application/pdf',
      'txt': ['text/plain', 'text/plain;charset=utf-8'],
      'docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    };

    const mimeTypes = allowedMimeTypes[fileExtension];
    if (mimeTypes) {
      if (Array.isArray(mimeTypes)) {
        if (!mimeTypes.includes(file.mimetype)) {
          const error = new Error(`Invalid MIME type for .${fileExtension}. Expected: ${mimeTypes.join(' or ')}`);
          error.code = 'INVALID_MIME_TYPE';
          return cb(error, false);
        }
      } else {
        if (file.mimetype !== mimeTypes) {
          const error = new Error(`Invalid MIME type for .${fileExtension}. Expected: ${mimeTypes}`);
          error.code = 'INVALID_MIME_TYPE';
          return cb(error, false);
        }
      }
    }

    cb(null, true);
  },

  limits: {
    fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB) || 10) * 1024 * 1024,
    files: 1,
    fields: 10,
    fieldNameSize: 100,
    fieldSize: 1024 * 1024
  },

  generateFileId: () => {
    return crypto.randomUUID();
  },

  validateFileName: (filename) => {
    const maxFileNameLength = 255;
    const forbiddenChars = /[<>:"/\\|?*\x00-\x1f]/;
    
    if (filename.length > maxFileNameLength) {
      throw new Error(`Filename too long. Maximum ${maxFileNameLength} characters`);
    }

    if (forbiddenChars.test(filename)) {
      throw new Error('Filename contains forbidden characters');
    }

    const pathTraversal = /\.\./;
    if (pathTraversal.test(filename)) {
      throw new Error('Filename contains path traversal sequences');
    }

    return true;
  },

  sanitizeFileName: (filename) => {
    const sanitized = filename
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .substring(0, 255);

    if (!sanitized || sanitized === '.' || sanitized === '..') {
      return `document_${Date.now()}.pdf`;
    }

    return sanitized;
  },

  scanForMaliciousContent: (buffer) => {
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /vbscript:/i,
      /onload=/i,
      /onerror=/i,
      /eval\(/i,
      /exec\(/i,
      /system\(/i
    ];

    const content = buffer.toString('utf8', 0, Math.min(1024, buffer.length));
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(content)) {
        throw new Error('File contains potentially malicious content');
      }
    }

    return true;
  },

  validateFileStructure: (buffer, filename) => {
    const fileExtension = path.extname(filename).toLowerCase().substring(1);
    
    if (fileExtension === 'pdf') {
      if (buffer.length < 4) {
        throw new Error('File too small to be a valid PDF');
      }

      const header = buffer.toString('utf8', 0, 4);
      if (header !== '%PDF') {
        throw new Error('Invalid PDF file format');
      }

      const footer = buffer.toString('utf8', buffer.length - 1024, buffer.length);
      if (!footer.includes('%%EOF')) {
        throw new Error('PDF file appears to be corrupted or incomplete');
      }
    } else if (fileExtension === 'docx') {
      // Basic DOCX validation - check for ZIP signature
      const header = buffer.toString('utf8', 0, 4);
      if (header !== 'PK\x03\x04') {
        throw new Error('Invalid DOCX file format');
      }
    } else if (fileExtension === 'txt') {
      // TXT files are simple text - just check if they have content
      if (buffer.length === 0) {
        throw new Error('Empty TXT file');
      }
    }

    return true;
  },

  createUploadMiddleware: () => {
    return multer({
      storage: uploadMiddleware.storage,
      fileFilter: uploadMiddleware.fileFilter,
      limits: uploadMiddleware.limits
    });
  },

  processUploadedFile: async (file) => {
    try {
      uploadMiddleware.validateFileName(file.originalname);
      uploadMiddleware.scanForMaliciousContent(file.buffer);
      uploadMiddleware.validateFileStructure(file.buffer, file.originalname);

      const fileId = uploadMiddleware.generateFileId();
      const sanitizedFileName = uploadMiddleware.sanitizeFileName(file.originalname);
      const fileHash = crypto.createHash('sha256').update(file.buffer).digest('hex');

      const processedFile = {
        fileId,
        originalName: file.originalname,
        sanitizedName: sanitizedFileName,
        buffer: file.buffer,
        size: file.size,
        mimetype: file.mimetype,
        hash: fileHash,
        uploadedAt: new Date().toISOString()
      };

      logger.info('File processed successfully', {
        fileId,
        originalName: file.originalname,
        size: file.size,
        hash: fileHash.substring(0, 16) + '...'
      });

      return processedFile;
    } catch (error) {
      logger.error('File processing failed:', {
        error: error.message,
        originalName: file.originalname,
        size: file.size
      });
      throw error;
    }
  }
};

export default uploadMiddleware;
