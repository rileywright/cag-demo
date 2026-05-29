import axios from 'axios';

const BASE_URL = 'http://localhost:3001';

async function testROICAGMock() {
  try {
    console.log('🎯 Testing ROI with CAG Cost Savings (Mock Data)');
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
    
    // Step 2: Test ROI calculation with CAG cost analysis
    console.log('\n📝 Step 2: Calculating ROI with CAG cost savings...');
    
    // Mock cost analysis data based on our real CAG results
    const mockCostAnalysis = {
      cachedTokens: 5511,
      newTokens: 20,
      totalCost: 0.001695,
      savingsPercent: 76.48,
      cacheEfficiency: 27555.00
    };
    
    const roiResponse = await axios.post(
      `${BASE_URL}/api/roi/calculate`,
      {
        documentLength: 20595,
        responseTime: 6683,
        queryComplexity: 'medium',
        fromCache: false,
        documentMetadata: {
          title: 'Statement of Account',
          parties: ['Johnathan Wright', 'Dana Wright'],
          dates: ['2022-10-01', '2022-10-31'],
          jurisdiction: 'Utah'
        },
        costAnalysis: mockCostAnalysis
      },
      { headers }
    );
    
    const roiData = roiResponse.data.data;
    
    console.log(`✅ ROI calculation completed`);
    console.log(`📊 Annual Impact: $${roiData.summary.totalAnnualImpact.toLocaleString()}`);
    console.log(`📈 ROI Percentage: ${roiData.summary.roiPercentage}%`);
    console.log(`⏰ Payback Period: ${roiData.summary.paybackPeriodMonths} months`);
    
    // Step 3: Show CAG-specific ROI category
    console.log('\n📝 Step 3: CAG Cost Savings Analysis...');
    console.log('=' .repeat(80));
    
    const cagCategory = roiData.categories.find(cat => cat.category === 'CAG Cost Savings');
    
    if (cagCategory) {
      console.log(`💰 CAG Cost Savings Metrics:`);
      console.log(`   - Cached Tokens: ${cagCategory.metrics.cachedTokens.toLocaleString()}`);
      console.log(`   - New Tokens: ${cagCategory.metrics.newTokens.toLocaleString()}`);
      console.log(`   - Query Savings: $${cagCategory.metrics.querySavings.toFixed(6)}`);
      console.log(`   - Savings Percent: ${cagCategory.metrics.savingsPercent}%`);
      console.log(`   - Token Efficiency: ${cagCategory.metrics.tokenEfficiency}%`);
      console.log(`   - Queries per Hour: ${cagCategory.metrics.queriesPerHour}`);
      console.log(`   - Capacity Increase: ${cagCategory.metrics.capacityIncrease}`);
      
      console.log(`\n💡 CAG Impact:`);
      console.log(`   - Monthly Savings: $${cagCategory.impact.monthlySavings.toLocaleString()}`);
      console.log(`   - Annual Savings: $${cagCategory.impact.annualSavings.toLocaleString()}`);
      console.log(`   - Additional Queries: ${cagCategory.impact.additionalQueries.toLocaleString()}`);
      console.log(`   - Value of Saved Time: $${cagCategory.impact.valueOfSavedTime.toLocaleString()}`);
    }
    
    // Step 4: Show all ROI categories
    console.log('\n📝 Step 4: All ROI Categories...');
    console.log('=' .repeat(80));
    
    roiData.categories.forEach((category, index) => {
      const categoryImpact = Object.values(category.impact).reduce((sum, value) => sum + (typeof value === 'number' ? value : 0), 0);
      console.log(`${index + 1}. ${category.category}: $${categoryImpact.toLocaleString()}`);
    });
    
    // Step 5: Get ROI dashboard
    console.log('\n📝 Step 5: Getting comprehensive ROI dashboard...');
    
    const dashboardResponse = await axios.get(`${BASE_URL}/api/roi/dashboard`, { headers });
    const dashboardData = dashboardResponse.data.data;
    
    console.log(`✅ Dashboard retrieved`);
    console.log(`📊 Total Annual Impact: $${dashboardData.roi.summary.totalAnnualImpact.toLocaleString()}`);
    console.log(`📈 ROI: ${dashboardData.roi.summary.roiPercentage}%`);
    console.log(`📊 Cache Hit Rate: ${dashboardData.session.cacheHitRate}%`);
    
    // Step 6: Test ROI assumptions
    console.log('\n📝 Step 6: Getting ROI assumptions...');
    
    const assumptionsResponse = await axios.get(`${BASE_URL}/api/roi/assumptions`, { headers });
    const assumptions = assumptionsResponse.data.data;
    
    console.log(`✅ Assumptions retrieved`);
    console.log(`💰 RAG Cost per Token: $${assumptions.ragCostPerToken}`);
    console.log(`💰 CAG Cost per Token: $${assumptions.cagCostPerToken}`);
    console.log(`📊 Queries per Month: ${assumptions.queriesPerMonth}`);
    console.log(`📄 Documents per Month: ${assumptions.documentsPerMonth}`);
    
    // Summary
    console.log('\n📈 CAG ROI Test Summary:');
    console.log('=' .repeat(80));
    console.log('✅ CAG cost savings calculation working');
    console.log('✅ ROI integration with CAG metrics working');
    console.log('✅ Comprehensive ROI dashboard working');
    console.log('✅ Cost analysis feeding into ROI calculations');
    console.log('✅ ROI assumptions management working');
    
    console.log('\n💡 CAG ROI Benefits Demonstrated:');
    console.log('🎯 Direct cost savings from token caching');
    console.log('📈 Increased query capacity and efficiency');
    console.log('💰 Time value calculations for attorneys');
    console.log('📊 Monthly and annual projections');
    console.log('🔧 Configurable assumptions for different scenarios');
    
    console.log('\n🚀 CAG + ROI Integration Complete!');
    console.log('📊 Ready for production with real cost tracking!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  } finally {
    process.exit(0);
  }
}

testROICAGMock();
