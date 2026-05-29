import anthropicService from '../src/services/anthropicService.js';

async function debugTokenizer() {
  try {
    await anthropicService.initialize();
    
    const testText = "John Wright Senior Software Engineer with 8 years experience in JavaScript, Python, and cloud technologies.";
    console.log('🧪 Debugging tokenizer with test text:');
    console.log(`📝 Text: "${testText}"`);
    console.log(`📊 Length: ${testText.length} characters`);
    
    const result = await anthropicService.tokenizeText(testText);
    
    console.log('\n🔢 Tokenization Results:');
    console.log(`📊 Token Count: ${result.tokenCount}`);
    console.log(`🤖 Anthropic Count: ${result.anthropicTokenCount}`);
    console.log(`📝 Tokens Array Length: ${result.tokens?.length || 0}`);
    
    if (result.tokens && result.tokens.length > 0) {
      console.log('\n📝 First 10 Tokens:');
      result.tokens.slice(0, 10).forEach((token, index) => {
        console.log(`${index + 1}. ID: ${token.id}, Value: ${token.value}, Text: "${token.text}"`);
      });
    } else {
      console.log('❌ No tokens in array!');
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
}

debugTokenizer();
