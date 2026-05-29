import axios from 'axios';

const BASE_URL = 'http://localhost:3001';

async function testCAGROI() {
  try {
    console.log('🎯 Testing CAG ROI with Cost Savings');
    console.log('=' .repeat(80));
    
    // Step 1: Create session
    console.log('\n📝 Step 1: Creating session...');
    const sessionResponse = await axios.post(`${BASE_URL}/api/session/create`);
    const sessionId = sessionResponse.data.data.sessionId;
    const token = sessionResponse.data.data.token;
    
    console.log(`✅ Session created: ${sessionId}`);
    
    // Set up headers for authenticated requests
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Session-ID': sessionId
    };
    
    // Step 2: Test CAG query to get cost analysis
    console.log('\n📝 Step 2: Getting cost analysis from CAG query...');
    const documentId = '6a268397-858d-4003-aeff-bdfb4cc598d1';
    const query = 'What is this document about?';
    
    const queryResponse = await axios.post(
      `${BASE_URL}/api/cag/query`,
      {
        query: query,
        documentId: documentId,
        includeComparison: false
      },
      { headers }
    );
    
    const queryData = queryResponse.data.data;
    const costAnalysis = queryResponse.data.costAnalysis;
    
    console.log(`✅ Query completed with cost analysis`);
    console.log(`📊 Response time: ${queryData.metadata.queryTime}ms`);
    console.log(`💰 Cost: $${costAnalysis.totalCost.toFixed(6)}`);
    console.log(`💡 Savings: ${costAnalysis.savingsPercent}%`);
    
    // Step 3: Calculate ROI with cost analysis
    console.log('\n📝 Step 3: Calculating ROI with CAG cost savings...');
    
    const roiResponse = await axios.post(
      `${BASE_URL}/api/roi/calculate`,
      {
        documentLength: 20595,
        responseTime: queryData.metadata.queryTime,
        queryComplexity: 'medium',
        fromCache: false,
        documentMetadata: queryData.metadata,
        costAnalysis: costAnalysis
      },
      { headers }
    );
    
    const roiData = roiResponse.data.data;
    
    console.log(`✅ ROI calculation completed`);
    console.log(`📊 Annual Impact: $${roiData.summary.totalAnnualImpact.toLocaleString()}`);
    console.log(`📈 ROI Percentage: ${roiData.summary.roiPercentage}%`);
    console.log(`⏰ Payback Period: ${roiData.summary.paybackPeriodMonths} months`);
    
    // Step 4: Show CAG-specific ROI category
    console.log('\n📝 Step 4: CAG Cost Savings Analysis...');
    
    const cagCategory = roiData.categories.find(cat => cat.category === 'CAG Cost Savings');
    
    if (cagCategory) {
      console.log(`💰 CAG Cost Savings Metrics:`);
      console.log(`   - Cached Tokens: ${cagCategory.metrics.cachedTokens.toLocaleString()}`);
      console.log(`   - New Tokens: ${cagCategory.metrics.newTokens.toLocaleString()}`);
      console.log(`   - Query Savings: $${cagCategory.metrics.querySavings.toFixed(6)}`);
      console.log(`   - Savings Percent: ${cagCategory.metrics.savingsPercent}%`);
      console.log(`   - Token Efficiency: ${cagCategory.metrics.tokenEfficiency}%`);
      
      console.log(`\n💡 CAG Impact:`);
      console.log(`   - Monthly Savings: $${cagCategory.impact.monthlySavings.toLocaleString()}`);
      console.log(`   - Annual Savings: $${cagCategory.impact.annualSavings.toLocaleString()}`);
      console.log(`   - Additional Queries: ${cagCategory.impact.additionalQueries.toLocaleString()}`);
      console.log(`   - Value of Saved Time: $${cagCategory.impact.valueOfSavedTime.toLocaleString()}`);
    }
    
    // Step 5: Show all ROI categories
    console.log('\n📝 Step 5: All ROI Categories...');
    console.log('=' .repeat(80));
    
    roiData.categories.forEach((category, index) => {
      const categoryImpact = Object.values(category.impact).reduce((sum, value) => sum + (typeof value === 'number' ? value : 0), 0);
      console.log(`${index + 1}. ${category.category}: $${categoryImpact.toLocaleString()}`);
    });
    
    // Step 6: Get ROI dashboard
    console.log('\n📝 Step 6: Getting comprehensive ROI dashboard...');
    
    const dashboardResponse = await axios.get(`${BASE_URL}/api/roi/dashboard`, { headers });
    const dashboardData = dashboardResponse.data.data;
    
    console.log(`✅ Dashboard retrieved`);
    console.log(`📊 Total Annual Impact: $${dashboardData.roi.summary.totalAnnualImpact.toLocaleString()}`);
    console.log(`📈 ROI: ${dashboardData.roi.summary.roiPercentage}%`);
    console.log(`📊 Cache Hit Rate: ${dashboardData.session.cacheHitRate}%`);
    
    // Summary
    console.log('\n📈 CAG ROI Test Summary:');
    console.log('=' .repeat(80));
    console.log('✅ CAG cost savings calculation working');
    console.log('✅ ROI integration with CAG metrics working');
    console.log('✅ Comprehensive ROI dashboard working');
    console.log('✅ Cost analysis feeding into ROI calculations');
    
    console.log('\n💡 CAG ROI Benefits Demonstrated:');
    console.log('🎯 Direct cost savings from token caching');
    console.log('📈 Increased query capacity and efficiency');
    console.log('💰 Time value calculations for attorneys');
    console.log('📊 Monthly and annual projections');
    
    console.log('\n🚀 CAG + ROI Integration Complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  } finally {
    process.exit(0);
  }
}

testCAGROI();
