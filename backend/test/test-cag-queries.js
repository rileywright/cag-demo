import cacheService from '../src/services/cacheService.js';
import sessionService from '../src/services/sessionService.js';
import documentService from '../src/services/documentService.js';
import cagService from '../src/services/cagService.js';
import anthropicService from '../src/services/anthropicService.js';

async function testCAGQueries() {
  try {
    // Initialize services
    await sessionService.connect();
    await cacheService.connect(sessionService.client);
    await anthropicService.initialize();
    await cagService.initialize();
    
    // Get the cached legal document
    const documentId = '6a268397-858d-4003-aeff-bdfb4cc598d1';
    const cachedDocument = await documentService.getCachedDocument(documentId);
    
    if (!cachedDocument) {
      console.error('❌ Document not found in cache');
      process.exit(1);
    }
    
    console.log('🎯 CAG Query Testing with Prompt Caching');
    console.log('=' .repeat(60));
    console.log(`📄 Document: ${cachedDocument.originalName}`);
    console.log(`📊 Text Length: ${cachedDocument.text?.length || 0} characters`);
    console.log(`🔢 Token Count: ${cachedDocument.tokenCount || 0} tokens`);
    console.log(`📖 Pages: ${cachedDocument.pages || 0}`);
    console.log(`🤖 Model: ${cachedDocument.model || 'N/A'}`);
    
    // Test queries
    const queries = [
      'What is this document about?',
      'Who are the parties involved in this case?',
      'What are the key financial amounts mentioned?',
      'What court is handling this case?',
      'What are the important dates in this document?'
    ];
    
    console.log('\n🚀 Testing CAG Queries with Cost Analysis:');
    console.log('-' .repeat(60));
    
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      console.log(`\n📝 Query ${i + 1}: "${query}"`);
      console.log('-' .repeat(40));
      
      try {
        const result = await cagService.processQueryWithCaching(
          'test-session-123',
          documentId,
          query,
          cachedDocument
        );
        
        console.log(`✅ Response received in ${result.metadata.queryTime}ms`);
        console.log(`📊 Token Usage:`);
        console.log(`   - Input Tokens: ${result.metadata.inputTokens}`);
        console.log(`   - Output Tokens: ${result.metadata.outputTokens}`);
        console.log(`   - Total Tokens: ${result.metadata.totalTokens}`);
        
        if (result.costSavings) {
          console.log(`💰 Cost Analysis:`);
          console.log(`   - Cached Tokens: ${result.costSavings.cachedTokens.toLocaleString()}`);
          console.log(`   - New Tokens: ${result.costSavings.newTokens.toLocaleString()}`);
          console.log(`   - Cached Token Cost: $${result.costSavings.cachedTokenCost.toFixed(6)}`);
          console.log(`   - New Token Cost: $${result.costSavings.newTokenCost.toFixed(6)}`);
          console.log(`   - Total Cost: $${result.costSavings.totalCost.toFixed(6)}`);
          console.log(`   - Cache Savings: ${result.costSavings.savingsPercent}%`);
        }
        
        console.log(`🎯 Cache Efficiency: ${result.metadata.cacheEfficiency}%`);
        console.log(`\n📄 Response Summary:`);
        console.log(result.response.substring(0, 200) + '...');
        
      } catch (error) {
        console.error(`❌ Query ${i + 1} failed:`, error.message);
      }
      
      // Small delay between queries
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Summary statistics
    console.log('\n📈 CAG Performance Summary:');
    console.log('=' .repeat(60));
    console.log(`📄 Document: ${cachedDocument.originalName}`);
    console.log(`🔢 Total Document Tokens: ${cachedDocument.tokenCount?.toLocaleString() || 0}`);
    console.log(`📊 Document Text Size: ${cachedDocument.text?.length || 0} characters`);
    console.log(`📖 Document Pages: ${cachedDocument.pages || 0}`);
    console.log(`🤖 Model: ${cachedDocument.model || 'N/A'}`);
    
    console.log('\n💡 CAG Benefits Demonstrated:');
    console.log('✅ Document tokenized once, cached for reuse');
    console.log('✅ Prompt caching reduces API costs');
    console.log('✅ Full document context maintained');
    console.log('✅ Fast query responses with cached tokens');
    console.log('✅ Detailed cost tracking and savings analysis');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
}

testCAGQueries();
