import cacheService from '../src/services/cacheService.js';
import sessionService from '../src/services/sessionService.js';
import documentService from '../src/services/documentService.js';
import anthropicService from '../src/services/anthropicService.js';
import fs from 'fs';

async function debugUpload() {
  try {
    console.log('🔍 Debugging Document Upload Process...');
    
    // Initialize services
    await sessionService.connect();
    await cacheService.connect(sessionService.client);
    await anthropicService.initialize();
    
    console.log('✅ Services initialized');
    
    // Read the document
    const documentPath = '../docs/Garnishment Final for Court - Richard Ady.pdf';
    const documentBuffer = fs.readFileSync(documentPath);
    
    console.log(`📄 Document read: ${documentBuffer.length} bytes`);
    
    // Process the document directly
    console.log('🔄 Processing document...');
    
    const processedDocument = await documentService.processDocument(
      documentBuffer,
      'Garnishment Final for Court - Richard Ady.pdf',
      'application/pdf'
    );
    
    console.log('✅ Document processed successfully');
    console.log(`📄 Document ID: ${processedDocument.documentId}`);
    console.log(`📊 Token Count: ${processedDocument.tokenCount}`);
    console.log(`💾 Cached: ${processedDocument.cached}`);
    console.log(`📖 Pages: ${processedDocument.pages}`);
    
    // Check if it's in the cache
    console.log('\n🔍 Checking cache...');
    const cachedDoc = await documentService.getCachedDocument(processedDocument.documentId);
    
    if (cachedDoc) {
      console.log('✅ Document found in cache!');
      console.log(`📊 Text Length: ${cachedDoc.text?.length || 0}`);
      console.log(`🔢 Token Count: ${cachedDoc.tokenCount || 0}`);
      console.log(`🤖 Model: ${cachedDoc.model || 'N/A'}`);
    } else {
      console.log('❌ Document not found in cache');
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
}

debugUpload();
