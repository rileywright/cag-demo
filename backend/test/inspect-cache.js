import cacheService from '../src/services/cacheService.js';
import sessionService from '../src/services/sessionService.js';
import logger from '../src/utils/logger.js';

async function inspectCache() {
  try {
    // Initialize services
    await sessionService.connect();
    await cacheService.connect(sessionService.client);
    
    // Get the cached document
    const documentId = '2507aca6-23cb-4d5c-ae2e-d361bfa71e9c';
    const cacheKey = `doc:${documentId}`;
    
    console.log(`\n🔍 Inspecting cache key: ${cacheKey}`);
    console.log('=' .repeat(50));
    
    const cachedData = await cacheService.get(cacheKey);
    
    if (!cachedData) {
      console.log('❌ No data found in cache');
      return;
    }
    
    console.log('✅ Found cached document:');
    console.log(`📄 Document ID: ${documentId}`);
    console.log(`📝 Original Name: ${cachedData.originalName}`);
    console.log(`📊 Text Length: ${cachedData.text?.length || 0} characters`);
    console.log(`🔢 Token Count: ${cachedData.tokenCount || 0}`);
    console.log(`🤖 Model: ${cachedData.model || 'N/A'}`);
    console.log(`📅 Processed At: ${cachedData.processedAt || 'N/A'}`);
    console.log(`🔐 Hash: ${cachedData.hash?.substring(0, 20) || 'N/A'}...`);
    
    console.log('\n📋 Statistics:');
    console.log(JSON.stringify(cachedData.statistics, null, 2));
    
    console.log('\n📄 First 200 characters of text:');
    console.log(cachedData.text?.substring(0, 200) || 'No text');
    console.log('...');
    
    console.log('\n🏷️ Metadata:');
    console.log(JSON.stringify(cachedData.metadata, null, 2));
    
    console.log('\n🔢 Tokens array length:', cachedData.tokens?.length || 0);
    
    if (cachedData.tokens && cachedData.tokens.length > 0) {
      console.log('\n📝 Sample tokens (first 10):');
      cachedData.tokens.slice(0, 10).forEach((token, index) => {
        console.log(`  ${index + 1}. ID: ${token.id}, Text: "${token.text}", Type: ${token.type}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error inspecting cache:', error);
  } finally {
    process.exit(0);
  }
}

inspectCache();
