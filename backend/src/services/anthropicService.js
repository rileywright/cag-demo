import Anthropic from '@anthropic-ai/sdk';
import logger from '../utils/logger.js';
import { get_encoding } from 'tiktoken';

class AnthropicService {
  constructor() {
    this.client = null;
    this.model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';
    this.maxTokens = 4000;
    this.temperature = 0.1;
    this.costPerInputToken = parseFloat(process.env.COST_PER_INPUT_TOKEN) || 0.000001;
    this.costPerOutputToken = parseFloat(process.env.COST_PER_OUTPUT_TOKEN) || 0.000005;
  }

  async initialize() {
    try {
      if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error('ANTHROPIC_API_KEY environment variable is required');
      }

      this.client = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
      });

      await this.testConnection();
      logger.info('Anthropic service initialized', { model: this.model });
      return true;
    } catch (error) {
      logger.error('Failed to initialize Anthropic service:', error);
      throw new Error(`Anthropic initialization failed: ${error.message}`);
    }
  }

  async testConnection() {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hello' }]
      });
      
      logger.info('Anthropic connection test successful', {
        model: this.model,
        responseId: response.id
      });
      
      return true;
    } catch (error) {
      logger.error('Anthropic connection test failed:', error);
      throw new Error('Anthropic API connection failed');
    }
  }

  createLegalSystemPrompt() {
    return `You are a specialized legal AI assistant designed to analyze legal documents and provide professional guidance. Your expertise includes contract analysis, risk assessment, and legal compliance.

Your responsibilities:
1. Analyze legal documents with precision and attention to detail
2. Identify potential risks, liabilities, and areas of concern
3. Provide clear, actionable legal insights
4. Reference specific clauses or sections when relevant
5. Maintain professional legal terminology and tone

Important guidelines:
- Be thorough but concise in your responses
- Focus on practical legal implications
- Highlight high-risk areas that require attorney attention
- Provide structured, easy-to-understand analysis
- Never provide definitive legal advice - always recommend consultation with qualified counsel
- Consider jurisdiction and governing law implications

Context: You are analyzing uploaded legal documents within a secure, session-based environment. All documents are confidential and covered by attorney-client privilege.`;
  }

  async analyzeLegalQuery(documentText, query, documentMetadata = {}) {
    try {
      if (!this.client) {
        throw new Error('Anthropic service not initialized');
      }

      const systemPrompt = this.createLegalSystemPrompt();
      
      const contextPrompt = this.buildContextPrompt(documentText, query, documentMetadata);
      
      const startTime = Date.now();
      
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: contextPrompt
          }
        ]
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      const analysis = {
        response: response.content[0].text,
        metadata: {
          model: this.model,
          responseTime: responseTime,
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
          cost: this.calculateCost(response.usage.input_tokens, response.usage.output_tokens),
          timestamp: new Date().toISOString(),
          requestId: response.id
        }
      };

      logger.info('Legal analysis completed', {
        requestId: response.id,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        cost: analysis.metadata.cost,
        responseTime
      });

      return analysis;
    } catch (error) {
      logger.error('Legal analysis failed:', error);
      
      if (error.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      
      if (error.status === 400) {
        throw new Error('Invalid request. Please check your query and document.');
      }
      
      if (error.status === 401) {
        throw new Error('Authentication failed. Please check API configuration.');
      }
      
      throw new Error(`Analysis failed: ${error.message}`);
    }
  }

  buildContextPrompt(documentText, query, documentMetadata) {
    const textPreview = documentText.length > 8000 
      ? documentText.substring(0, 4000) + '...' + documentText.substring(documentText.length - 4000)
      : documentText;

    return `DOCUMENT ANALYSIS REQUEST

Query: ${query}

Document Information:
- Title: ${documentMetadata.title || 'Untitled'}
- Pages: ${documentMetadata.pages || 'Unknown'}
- Parties: ${documentMetadata.parties?.join(', ') || 'Not identified'}
- Jurisdiction: ${documentMetadata.jurisdiction || 'Not specified'}

Document Content (relevant sections):
${textPreview}

Please provide a comprehensive legal analysis addressing the specific query. Focus on:
1. Direct answer to the question
2. Relevant clauses or sections
3. Potential risks or concerns
4. Practical implications
5. Recommendations for further review

Structure your response clearly with headings and bullet points where appropriate.`;
  }

  async analyzeContractRisks(documentText, documentMetadata = {}) {
    const riskQuery = "What are the key legal risks, liabilities, and areas of concern in this contract? Please provide a comprehensive risk assessment.";
    return this.analyzeLegalQuery(documentText, riskQuery, documentMetadata);
  }

  async explainClause(documentText, clauseText, documentMetadata = {}) {
    const query = `Please analyze this specific clause: "${clauseText}". Explain its meaning, implications, and potential risks.`;
    return this.analyzeLegalQuery(documentText, query, documentMetadata);
  }

  async checkCompliance(documentText, jurisdiction, documentMetadata = {}) {
    const query = `Does this document comply with ${jurisdiction} law? Please identify any compliance issues or concerns.`;
    return this.analyzeLegalQuery(documentText, query, documentMetadata);
  }

  calculateCost(inputTokens, outputTokens) {
    const inputCost = inputTokens * this.costPerInputToken;
    const outputCost = outputTokens * this.costPerOutputToken;
    const totalCost = inputCost + outputCost;
    
    return {
      inputTokens,
      outputTokens,
      inputCost: Math.round(inputCost * 1000000) / 1000000,
      outputCost: Math.round(outputCost * 1000000) / 1000000,
      totalCost: Math.round(totalCost * 1000000) / 1000000
    };
  }

  getModelInfo() {
    return {
      model: this.model,
      maxTokens: this.maxTokens,
      temperature: this.temperature,
      costPerInputToken: this.costPerInputToken,
      costPerOutputToken: this.costPerOutputToken
    };
  }

  async tokenizeText(text) {
    try {
      if (!this.client) {
        throw new Error('Service not initialized');
      }

      // Use proper tokenizer to get REAL tokens
      const enc = get_encoding('cl100k_base'); // Claude's tokenizer
      const tokens = enc.encode(text);
      const tokenCount = tokens.length;
      
      // Create token objects with REAL values - decode BEFORE freeing
      const tokenObjects = [];
      for (let i = 0; i < tokens.length; i++) {
        const tokenId = tokens[i];
        const decodedText = new TextDecoder().decode(enc.decode([tokenId]));
        tokenObjects.push({
          id: tokenId,
          text: decodedText,
          value: tokenId, // The actual token number
          index: i
        });
      }
      
      // Free the encoding now that we're done with it
      enc.free();
      
      // Also get Anthropic's token count for verification
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 1,
        messages: [{ role: 'user', content: text }],
        stream: false
      });

      const anthropicTokenCount = response.usage?.input_tokens || 0;
      
      logger.info('Document tokenized successfully', {
        textLength: text.length,
        tokenCount,
        anthropicTokenCount,
        model: this.model
      });
      
      return {
        text,
        tokens: tokenObjects,
        tokenCount,
        anthropicTokenCount,
        model: this.model
      };
    } catch (error) {
      logger.error('Tokenization failed:', error);
      throw new Error(`Tokenization failed: ${error.message}`);
    }
  }

  async analyzeWithPromptCaching(documentText, documentTokens, query, metadata = {}) {
    try {
      if (!this.client) {
        throw new Error('Service not initialized');
      }

      const startTime = Date.now();

      // Build the prompt with cached document tokens
      const systemPrompt = `You are a legal document analysis expert. Analyze the provided legal document and answer the user's question accurately and comprehensively.`;
      
      // Combine document text with user query
      const userPrompt = `DOCUMENT:\n${documentText}\n\nQUESTION: ${query}`;

      // Create message with cache control for the document portion
      const messages = [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: documentText,
              cache_control: { type: 'ephemeral' }
            },
            {
              type: 'text', 
              text: `\n\nBased on the legal document above, please answer: ${query}`
            }
          ]
        }
      ];

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        messages: messages,
        system: systemPrompt
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Calculate token usage and costs
      const inputTokens = response.usage.input_tokens;
      const outputTokens = response.usage.output_tokens;
      const totalTokens = inputTokens + outputTokens;
      const cost = this.calculateCost(inputTokens, outputTokens);

      // Calculate cache efficiency
      const cachedTokens = documentTokens?.length || 0;
      const newTokens = inputTokens - cachedTokens;
      const cacheEfficiency = cachedTokens > 0 ? ((cachedTokens / inputTokens) * 100).toFixed(2) : 0;

      const analysis = {
        response: response.content[0].text,
        metadata: {
          model: this.model,
          responseTime,
          inputTokens,
          outputTokens,
          totalTokens,
          cachedTokens,
          newTokens,
          cacheEfficiency,
          cost,
          timestamp: new Date().toISOString(),
          requestId: response.id
        }
      };

      logger.info('CAG analysis completed with prompt caching', {
        requestId: response.id,
        inputTokens,
        outputTokens,
        cachedTokens,
        newTokens,
        cacheEfficiency,
        cost,
        responseTime
      });

      return analysis;
    } catch (error) {
      logger.error('CAG analysis with prompt caching failed:', error);
      throw error;
    }
  }

  createSampleTokens(text, tokenCount) {
    // Create approximate token samples for demonstration
    const words = text.split(/\s+/).filter(word => word.length > 0);
    const tokens = [];
    
    // Sample first 20 tokens for demonstration
    const sampleSize = Math.min(20, words.length);
    for (let i = 0; i < sampleSize; i++) {
      tokens.push({
        id: i + 1,
        text: words[i],
        type: 'word_token'
      });
    }
    
    // Add some special tokens
    tokens.push({ id: tokens.length + 1, text: '<|endoftext|>', type: 'special' });
    
    return tokens;
  }

  decodeToken(tokenId, encoder) {
    try {
      if (!encoder) return `[token_${tokenId}]`;
      const decoded = encoder.decode([tokenId]);
      return decoded;
    } catch (error) {
      return `[token_${tokenId}]`;
    }
  }

  async healthCheck() {
    try {
      if (!this.client) {
        return { status: 'uninitialized', error: 'Service not initialized' };
      }

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 5,
        messages: [{ role: 'user', content: 'Health check' }]
      });

      return {
        status: 'healthy',
        model: this.model,
        responseId: response.id,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  formatCostBreakdown(costData) {
    return {
      currency: 'USD',
      breakdown: {
        input: {
          tokens: costData.inputTokens,
          cost: costData.inputCost,
          rate: this.costPerInputToken
        },
        output: {
          tokens: costData.outputTokens,
          cost: costData.outputCost,
          rate: this.costPerOutputToken
        },
        total: {
          tokens: costData.inputTokens + costData.outputTokens,
          cost: costData.totalCost
        }
      },
      estimatedAttorneyCost: {
        hourlyRate: 500,
        timeSavedMinutes: Math.round(costData.totalTokens / 100),
        estimatedSavings: Math.round((costData.totalTokens / 100) * (500 / 60) * 100) / 100
      }
    };
  }
}

export default new AnthropicService();
