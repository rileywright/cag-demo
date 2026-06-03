import logger from '../utils/logger.js';

class DocumentProcessorService {
  constructor() {
    this.baseUrl = process.env.DOCUMENT_PROCESSOR_URL || 'http://localhost:5000';
    this.timeout = 30000; // 30 seconds timeout
  }

  async initialize() {
    logger.info('DocumentProcessorService initialized', {
      baseUrl: this.baseUrl
    });
  }

  async testConnection() {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        timeout: this.timeout
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      const health = await response.json();
      logger.info('Document processor health check successful', {
        status: health.status,
        version: health.version
      });

      return true;
    } catch (error) {
      logger.error('Document processor health check failed:', error);
      return false;
    }
  }

  async processDocument(buffer, filename, mimetype) {
    try {
      logger.info('Processing document with Python API', {
        filename,
        mimetype,
        size: buffer.length
      });

      // Create form data
      const formData = new FormData();
      const blob = new Blob([buffer], { type: mimetype });
      formData.append('file', blob, filename);

      const startTime = Date.now();

      const response = await fetch(`${this.baseUrl}/process`, {
        method: 'POST',
        body: formData,
        timeout: this.timeout
      });

      const processingTime = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Processing failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(`Processing error: ${result.error}`);
      }

      logger.info('Document processed successfully', {
        filename,
        originalSize: result.metrics.original.size_bytes,
        processedSize: result.metrics.processed.size_bytes,
        tokenCompression: result.metrics.compression.token_compression_percent,
        processingTime
      });

      return {
        success: true,
        processedText: result.processed_text,
        originalText: result.processed_text, // We'll need to extract this differently
        metrics: result.metrics,
        filename: result.filename,
        fileType: result.file_type,
        processingTime
      };

    } catch (error) {
      logger.error('Document processing failed:', error);
      return {
        success: false,
        error: error.message,
        processedText: null,
        metrics: null
      };
    }
  }

  async analyzeText(text) {
    try {
      logger.info('Analyzing text with Python API', {
        textLength: text.length
      });

      const startTime = Date.now();

      const response = await fetch(`${this.baseUrl}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text }),
        timeout: this.timeout
      });

      const processingTime = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Analysis failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(`Analysis error: ${result.error}`);
      }

      logger.info('Text analysis completed', {
        originalSize: result.metrics.original.size_bytes,
        processedSize: result.metrics.processed.size_bytes,
        tokenCompression: result.metrics.compression.token_compression_percent,
        processingTime
      });

      return {
        success: true,
        processedText: result.processed_text,
        originalText: text,
        metrics: result.metrics,
        processingTime
      };

    } catch (error) {
      logger.error('Text analysis failed:', error);
      return {
        success: false,
        error: error.message,
        processedText: null,
        metrics: null
      };
    }
  }

  calculateCompressionMetrics(originalText, processedText, processingTime) {
    const originalSize = Buffer.byteLength(originalText, 'utf8');
    const processedSize = Buffer.byteLength(processedText, 'utf8');
    const originalTokens = this.estimateTokens(originalText);
    const processedTokens = this.estimateTokens(processedText);

    // Calculate savings
    const sizeSavings = originalSize - processedSize;
    const tokenSavings = originalTokens - processedTokens;

    // Calculate percentages
    const sizeCompressionPercent = (sizeSavings / originalSize * 100) || 0;
    const tokenCompressionPercent = (tokenSavings / originalTokens * 100) || 0;

    // Calculate cost savings (assuming $0.003 per 1K tokens for Claude)
    const costPerToken = 0.003 / 1000;
    const costSavings = tokenSavings * costPerToken;

    return {
      original: {
        size_bytes: originalSize,
        size_mb: Math.round(originalSize / (1024 * 1024) * 10000) / 10000,
        character_count: originalText.length,
        token_count: originalTokens
      },
      processed: {
        size_bytes: processedSize,
        size_mb: Math.round(processedSize / (1024 * 1024) * 10000) / 10000,
        character_count: processedText.length,
        token_count: processedTokens
      },
      compression: {
        size_savings_bytes: sizeSavings,
        size_compression_percent: Math.round(sizeCompressionPercent * 100) / 100,
        token_savings: tokenSavings,
        token_compression_percent: Math.round(tokenCompressionPercent * 100) / 100,
        cost_savings_usd: Math.round(costSavings * 1000000) / 1000000,
        processing_time_ms: processingTime
      },
      roi: {
        cost_per_1000_tokens: 0.003,
        estimated_monthly_savings: Math.round(costSavings * 30 * 100) / 100,
        payback_documents: Math.max(1, Math.round(0.003 / costSavings)) || 1
      }
    };
  }

  estimateTokens(text) {
    // Simple estimation: ~4 characters per token for English text
    return Math.ceil(text.length / 4);
  }

  isEnabledForProcessing() {
    return true; // Always enabled since we have a real processor
  }
}

export default new DocumentProcessorService();
