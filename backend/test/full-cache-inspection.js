import cacheService from '../src/services/cacheService.js';
import sessionService from '../src/services/sessionService.js';
import logger from '../src/utils/logger.js';

async function fullCacheInspection() {
  try {
    // Initialize services
    await sessionService.connect();
    await cacheService.connect(sessionService.client);
    
    // Get the cached document
    const documentId = '6a268397-858d-4003-aeff-bdfb4cc598d1';
    const cacheKey = `doc:${documentId}`;
    
    console.log(`🔍 Full Cache Inspection: ${cacheKey}`);
    console.log('=' .repeat(60));
    
    const cachedData = await cacheService.get(cacheKey);
    
    if (!cachedData) {
      console.log('❌ No data found in cache');
      return;
    }
    
    console.log('\n📋 DOCUMENT OVERVIEW:');
    console.log(`📄 Document ID: ${documentId}`);
    console.log(`📝 Original Name: ${cachedData.originalName}`);
    console.log(`📊 Text Length: ${cachedData.text?.length || 0} characters`);
    console.log(`🔢 Token Count: ${cachedData.tokenCount || 0}`);
    console.log(`🤖 Model: ${cachedData.model || 'N/A'}`);
    console.log(`📅 Processed At: ${cachedData.processedAt || 'N/A'}`);
    
    console.log('\n📄 COMPLETE DOCUMENT TEXT:');
    console.log('-'.repeat(60));
    console.log(cachedData.text || 'No text');
    console.log('-'.repeat(60));
    
    console.log('\n🔢 TOKENIZATION DETAILS:');
    console.log(`📊 Total Tokens: ${cachedData.tokenCount || 0}`);
    console.log(`📝 Tokens Array Length: ${cachedData.tokens?.length || 0}`);
    
    if (cachedData.tokens && cachedData.tokens.length > 0) {
      console.log('\n📝 ALL TOKENS IN DOCUMENT:');
      console.log('-'.repeat(60));
      cachedData.tokens.forEach((token, index) => {
        console.log(`${(index + 1).toString().padStart(3)}. Token ID: ${token.id?.toString().padStart(6) || 'N/A'}, Value: ${token.value || 'N/A'}, Text: "${token.text}"`);
      });
      console.log('-'.repeat(60));
    } else {
      console.log('❌ No tokens found in cache');
    }
    
    console.log('\n📊 STATISTICS:');
    console.log(JSON.stringify(cachedData.statistics, null, 2));
    
    console.log('\n🏷️ METADATA:');
    console.log(JSON.stringify(cachedData.metadata, null, 2));
    
    // Calculate token efficiency
    const textLength = cachedData.text?.length || 0;
    const tokenCount = cachedData.tokenCount || 0;
    const charsPerToken = tokenCount > 0 ? (textLength / tokenCount).toFixed(2) : 0;
    
    console.log('\n📈 TOKENIZATION EFFICIENCY:');
    console.log(`📝 Characters per Token: ${charsPerToken}`);
    console.log(`🔢 Tokens per 1000 chars: ${((tokenCount / textLength) * 1000).toFixed(2)}`);
    
  } catch (error) {
    console.error('❌ Error inspecting cache:', error);
  } finally {
    process.exit(0);
  }
}

fullCacheInspection();
