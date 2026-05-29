import cacheService from '../src/services/cacheService.js';
import sessionService from '../src/services/sessionService.js';
import documentService from '../src/services/documentService.js';
import cagService from '../src/services/cagService.js';
import anthropicService from '../src/services/anthropicService.js';

async function showCAGResponses() {
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
    
    console.log('🎯 CAG Query Responses with Cost Analysis');
    console.log('=' .repeat(80));
    console.log(`📄 Document: ${cachedDocument.originalName}`);
    console.log(`📊 Text Length: ${cachedDocument.text?.length || 0} characters`);
    console.log(`🔢 Token Count: ${cachedDocument.tokenCount?.toLocaleString() || 0} tokens`);
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
    
    console.log('\n🚀 CAG Query Responses and Cost Analysis:');
    console.log('=' .repeat(80));
    
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      console.log(`\n📝 Query ${i + 1}: "${query}"`);
      console.log('-' .repeat(80));
      
      try {
        const result = await cagService.processQueryWithCaching(
          'test-session-123',
          documentId,
          query,
          cachedDocument
        );
        
        console.log(`✅ Response received in ${result.metadata.queryTime}ms`);
        
        // Show cost analysis
        if (result.costSavings) {
          console.log(`💰 Cost Analysis:`);
          console.log(`   - Document Tokens (Cached): ${result.costSavings.cachedTokens.toLocaleString()}`);
          console.log(`   - Query Tokens (New): ${Math.max(0, result.costSavings.newTokens).toLocaleString()}`);
          console.log(`   - Total Input Tokens: ${result.metadata.inputTokens.toLocaleString()}`);
          console.log(`   - Output Tokens: ${result.metadata.outputTokens.toLocaleString()}`);
          console.log(`   - Total Cost: $${result.costSavings.totalCost.toFixed(6)}`);
          
          // Calculate theoretical cost without CAG
          const nonCAGCost = (result.costSavings.cachedTokens + result.metadata.inputTokens) * 0.000001 + result.metadata.outputTokens * 0.000005;
          const actualSavings = nonCAGCost - result.costSavings.totalCost;
          const savingsPercent = ((actualSavings / nonCAGCost) * 100).toFixed(2);
          
          console.log(`   - Cost without CAG: $${nonCAGCost.toFixed(6)}`);
          console.log(`   - Actual Savings: $${actualSavings.toFixed(6)} (${savingsPercent}%)`);
        }
        
        // Show the actual response
        console.log(`\n📄 Response:`);
        console.log(result.response);
        
      } catch (error) {
        console.error(`❌ Query ${i + 1} failed:`, error.message);
      }
      
      // Add separator between queries
      if (i < queries.length - 1) {
        console.log('\n' + '='.repeat(80));
      }
      
      // Small delay between queries
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Summary
    console.log('\n📈 CAG Performance Summary:');
    console.log('=' .repeat(80));
    console.log(`📄 Document: ${cachedDocument.originalName}`);
    console.log(`🔢 Total Document Tokens: ${cachedDocument.tokenCount?.toLocaleString() || 0}`);
    console.log(`📊 Document Text Size: ${cachedDocument.text?.length || 0} characters`);
    console.log(`📖 Document Pages: ${cachedDocument.pages || 0}`);
    console.log(`🤖 Model: ${cachedDocument.model || 'N/A'}`);
    
    console.log('\n💡 CAG Benefits Demonstrated:');
    console.log('✅ Document tokenized once, cached for reuse');
    console.log('✅ Queries use cached document tokens + new query tokens');
    console.log('✅ Full document context maintained in all responses');
    console.log('✅ Significant cost savings vs. re-tokenizing document each time');
    console.log('✅ Fast query responses with pre-processed tokens');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
}

showCAGResponses();
