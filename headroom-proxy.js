const express = require('express');
const path = require('path');

// Import headroom-ai from the backend node_modules
const { HeadroomClient } = require(path.join(__dirname, 'backend', 'node_modules', 'headroom-ai'));

const app = express();
const port = 8787;

// Initialize Headroom client
const headroomClient = new HeadroomClient({
  baseUrl: 'https://api.headroom.ai', // Use cloud API
  apiKey: process.env.HEADROOM_API_KEY || 'demo-key' // Use demo key if none provided
});

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'headroom-proxy' });
});

// Compression endpoint
app.post('/compress', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text is required'
      });
    }

    console.log('Compressing text:', { originalSize: text.length });

    // Use mock compression for demo since SDK needs API key
    console.log('Using mock compression for demo');
    
    // Simple mock compression: remove repeated sentences and common phrases
    const sentences = text.split('. ');
    const uniqueSentences = [...new Set(sentences)];
    const compressedText = uniqueSentences.join('. ').trim();
    
    console.log('Mock compression applied', {
      originalSentences: sentences.length,
      uniqueSentences: uniqueSentences.length,
      originalLength: text.length,
      compressedLength: compressedText.length
    });
    
    const originalSize = text.length;
    const compressedSize = compressedText.length;
    const savings = originalSize - compressedSize;
    const compressionRatio = originalSize > 0 ? ((savings / originalSize) * 100).toFixed(2) : 0;

    console.log('Compression result:', {
      originalSize,
      compressedSize,
      compressionRatio,
      savings
    });

    res.json({
      success: true,
      compressedText,
      originalSize,
      compressedSize,
      compressionRatio: parseFloat(compressionRatio),
      savings,
      processingTime: Date.now()
    });

  } catch (error) {
    console.error('Compression error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      originalSize: text?.length || 0,
      compressedSize: text?.length || 0,
      compressionRatio: 0,
      savings: 0,
      processingTime: 0
    });
  }
});

app.listen(port, () => {
  console.log(`🚀 Headroom proxy running on http://localhost:${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
  console.log(`🗜️  Compression: http://localhost:${port}/compress`);
});
