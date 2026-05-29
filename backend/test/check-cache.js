import cacheService from '../src/services/cacheService.js';
import sessionService from '../src/services/sessionService.js';

async function checkCache() {
  try {
    console.log('🔍 Checking Redis Cache...');
    
    // Initialize services
    await sessionService.connect();
    await cacheService.connect(sessionService.client);
    
    // Check if our cached document exists
    const documentId = '6a268397-858d-4003-aeff-bdfb4cc598d1';
    const cacheKey = `doc:${documentId}`;
    
    console.log(`📋 Checking cache key: ${cacheKey}`);
    
    const cachedData = await cacheService.get(cacheKey);
    
    if (cachedData) {
      console.log('✅ Document found in cache!');
      console.log(`📄 Original Name: ${cachedData.originalName}`);
      console.log(`📊 Text Length: ${cachedData.text?.length || 0}`);
      console.log(`🔢 Token Count: ${cachedData.tokenCount || 0}`);
      console.log(`🤖 Model: ${cachedData.model || 'N/A'}`);
      console.log(`📖 Pages: ${cachedData.pages || 0}`);
      console.log(`💾 Cached: ${cachedData.cached ? 'Yes' : 'No'}`);
    } else {
      console.log('❌ Document not found in cache');
      
      // Check all keys in cache
      console.log('\n📋 Checking all cache keys...');
      const stats = await cacheService.getCacheStats();
      console.log('Cache Stats:', stats);
      
      // Try to find any document keys
      const keys = await sessionService.client.keys('doc:*');
      console.log(`Found ${keys.length} document keys:`, keys);
    }
    
  } catch (error) {
    console.error('❌ Cache check failed:', error);
  } finally {
    process.exit(0);
  }
}

checkCache();
