import cacheService from '../src/services/cacheService.js';
import sessionService from '../src/services/sessionService.js';
import documentService from '../src/services/documentService.js';
import anthropicService from '../src/services/anthropicService.js';
import fs from 'fs';

async function testNewDocument() {
  try {
    // Initialize services
    await sessionService.connect();
    await cacheService.connect(sessionService.client);
    await anthropicService.initialize();
    
    // Read a test document (create a simple text file for testing)
    const testText = `
    John Wright
    Software Engineer
    
    Experience:
    - Senior Developer at Tech Corp (2020-2024)
    - Full Stack Developer with 5 years experience
    - Expert in JavaScript, Python, and cloud technologies
    
    Education:
    - Bachelor of Science in Computer Science
    - Graduated with honors
    
    Skills:
    - Programming: JavaScript, Python, Java
    - Cloud: AWS, Azure, GCP
    - Databases: PostgreSQL, MongoDB, Redis
    
    Contact:
    - Email: john.wright@email.com
    - Phone: (555) 123-4567
    `;
    
    // Create a buffer as if it's a document
    const buffer = Buffer.from(testText, 'utf8');
    const originalName = 'test-resume.txt';
    const mimetype = 'text/plain';
    
    console.log('🧪 Testing new document processing...');
    console.log(`📄 Text length: ${testText.length} characters`);
    
    // Process the document
    const result = await documentService.processDocument(buffer, originalName, mimetype);
    
    console.log('\n✅ Document processed successfully!');
    console.log(`📄 Document ID: ${result.documentId}`);
    console.log(`📊 Text Length: ${result.textLength}`);
    console.log(`🔢 Token Count: ${result.tokenCount}`);
    console.log(`💾 Cached: ${result.cached}`);
    
    // Inspect the cache
    const cacheKey = `doc:${result.documentId}`;
    const cachedData = await cacheService.get(cacheKey);
    
    console.log('\n🔍 Cache inspection:');
    console.log(`📝 First 200 chars: ${cachedData.text?.substring(0, 200)}...`);
    console.log(`🔢 Tokens length: ${cachedData.tokens?.length || 0}`);
    
    if (cachedData.tokens && cachedData.tokens.length > 0) {
      console.log('\n📝 Sample tokens:');
      cachedData.tokens.slice(0, 10).forEach((token, index) => {
        console.log(`  ${index + 1}. "${token.text}" (${token.type})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    process.exit(0);
  }
}

testNewDocument();
