import cacheService from '../src/services/cacheService.js';
import sessionService from '../src/services/sessionService.js';
import documentService from '../src/services/documentService.js';
import anthropicService from '../src/services/anthropicService.js';
import fs from 'fs';
import path from 'path';

async function processLegalDocument() {
  try {
    // Initialize services
    await sessionService.connect();
    await cacheService.connect(sessionService.client);
    await anthropicService.initialize();
    
    // Read the actual legal document
    const documentPath = '../docs/Garnishment Final for Court - Richard Ady.pdf';
    
    console.log('🧪 Processing REAL LEGAL document with proper tokenization...');
    
    if (!fs.existsSync(documentPath)) {
      console.error('❌ Legal document not found at:', documentPath);
      process.exit(1);
    }
    
    const fileBuffer = fs.readFileSync(documentPath);
    const originalName = path.basename(documentPath);
    const mimetype = 'application/pdf';
    
    console.log(`📄 File: ${originalName}`);
    console.log(`📊 File size: ${fileBuffer.length} bytes`);
    console.log(`🔍 Processing...`);
    
    // Process the legal document
    const result = await documentService.processDocument(fileBuffer, originalName, mimetype);
    
    console.log('\n✅ Legal document processed successfully!');
    console.log(`📄 Document ID: ${result.documentId}`);
    console.log(`📊 Text Length: ${result.textLength || 'N/A'}`);
    console.log(`🔢 Token Count: ${result.tokenCount || 'N/A'}`);
    console.log(`📖 Pages: ${result.pages || 'N/A'}`);
    console.log(`💾 Cached: ${result.cached}`);
    console.log(`🤖 Model: ${result.model || 'N/A'}`);
    
    // Store the document ID for inspection
    console.log(`\n📝 Document ID for inspection: ${result.documentId}`);
    
    // Write the document ID to a file for easy access
    fs.writeFileSync('test/current-doc-id.txt', result.documentId);
    console.log('📝 Document ID saved to test/current-doc-id.txt');
    
  } catch (error) {
    console.error('❌ Processing failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
}

processLegalDocument();
