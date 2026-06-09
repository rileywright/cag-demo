import { TrendingUp, DollarSign, Clock, Zap, Target, Calendar, BarChart3, PieChart, Cpu, Minimize2 } from 'lucide-react';
import { formatCurrency, formatTime, formatPercentage, formatTokens } from '../utils/formatters';

const ROIDashboard = ({ roiData, queries }) => {
  if (!roiData) {
    return (
      <div className="text-center py-12">
        <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No ROI Data Yet</h3>
        <p className="text-gray-500">
          Ask questions about your documents to see ROI analysis here.
        </p>
      </div>
    );
  }

  // Calculate aggregate metrics from all queries for display
  const totalQueries = queries.length;
  const totalCost = queries.reduce((sum, q) => sum + (q.costAnalysis?.totalCost || 0), 0);
  const avgResponseTime = totalQueries > 0 ? queries.reduce((sum, q) => sum + q.responseTime, 0) / totalQueries : 0;
  const totalCachedTokens = queries.reduce((sum, q) => sum + (q.costAnalysis?.cachedTokens || 0), 0);
  const totalNewTokens = queries.reduce((sum, q) => sum + (q.costAnalysis?.newTokens || 0), 0);
  const avgCacheEfficiency = totalQueries > 0 ? queries.reduce((sum, q) => sum + (q.costAnalysis?.cacheEfficiency || 0), 0) / totalQueries : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">ROI Analysis Dashboard</h2>
        <p className="text-gray-600">
          Track the value and cost savings of your legal document analysis
        </p>
      </div>

      {/* Main ROI Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Annual Impact</p>
              <p className="text-2xl font-bold">
                {formatCurrency(roiData.summary.totalAnnualImpact)}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-green-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">ROI Percentage</p>
              <p className="text-2xl font-bold">
                {formatPercentage(roiData.summary.roiPercentage)}
              </p>
            </div>
            <Target className="h-8 w-8 text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Payback Period</p>
              <p className="text-2xl font-bold">
                {roiData.summary.paybackPeriodMonths} months
              </p>
            </div>
            <Calendar className="h-8 w-8 text-purple-200" />
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <BarChart3 className="h-6 w-6 text-blue-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Total Queries</p>
            <p className="text-xl font-semibold text-gray-900">{totalQueries}</p>
          </div>
          
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <Clock className="h-6 w-6 text-purple-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Avg Response Time</p>
            <p className="text-xl font-semibold text-gray-900">
              {formatTime(avgResponseTime)}
            </p>
          </div>
          
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <DollarSign className="h-6 w-6 text-green-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Total Cost</p>
            <p className="text-xl font-semibold text-gray-900">
              {formatCurrency(totalCost)}
            </p>
          </div>
          
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <Zap className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Cache Efficiency</p>
            <p className="text-xl font-semibold text-gray-900">
              {formatPercentage(avgCacheEfficiency)}
            </p>
          </div>
        </div>
      </div>

      {/* Cost Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Analysis</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Investment</span>
              <span className="font-semibold text-gray-900">
                {formatCurrency(roiData.summary.investmentAmount || totalCost)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Monthly Impact</span>
              <span className="font-semibold text-green-600">
                {formatCurrency(roiData.summary.totalMonthlyImpact)}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-gray-600 font-medium">Net Return</span>
              <span className="font-semibold text-green-600">
                {formatCurrency(roiData.summary.totalAnnualImpact - (roiData.summary.investmentAmount || totalCost))}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Token Usage</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Cached Tokens</span>
              <span className="font-semibold text-blue-600">
                {formatTokens(totalCachedTokens)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">New Tokens</span>
              <span className="font-semibold text-purple-600">
                {formatTokens(totalNewTokens)}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-gray-600 font-medium">Total Tokens</span>
              <span className="font-semibold text-gray-900">
                {formatTokens(totalCachedTokens + totalNewTokens)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Token Optimization */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center">
          <Cpu className="h-5 w-5 text-green-600 mr-2" />
          Token Optimization
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">14.16%</div>
            <p className="text-sm text-green-700">Token Size Reduction</p>
            <p className="text-xs text-green-600 mt-1">31 bytes saved per token</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">62</div>
            <p className="text-sm text-green-700">Total Bytes Saved</p>
            <p className="text-xs text-green-600 mt-1">Across 2 tokens</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">188</div>
            <p className="text-sm text-green-700">Optimized Token Size</p>
            <p className="text-xs text-green-600 mt-1">vs 219 unoptimized</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">$0.43</div>
            <p className="text-sm text-green-700">Annual Savings</p>
            <p className="text-xs text-green-600 mt-1">From optimization</p>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700 font-medium">Performance Impact</p>
              <p className="text-xs text-green-600">Faster transmission & reduced storage</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-green-900">14.16% more efficient</p>
              <p className="text-xs text-green-600">JWT token optimization</p>
            </div>
          </div>
        </div>
      </div>

      {/* Headroom AI Compression */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-purple-900 mb-4 flex items-center">
          <Minimize2 className="h-5 w-5 text-purple-600 mr-2" />
          Headroom AI Compression
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <Minimize2 className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <p className="text-sm text-purple-700">Documents Compressed</p>
            <p className="text-xl font-semibold text-purple-900">
              {roiData?.categories?.find(cat => cat.category === 'Headroom AI Compression')?.metrics?.documentsCompressed || 0}
            </p>
          </div>
          <div className="text-center">
            <TrendingUp className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <p className="text-sm text-purple-700">Compression Ratio</p>
            <p className="text-xl font-semibold text-purple-900">
              {roiData?.categories?.find(cat => cat.category === 'Headroom AI Compression')?.metrics?.averageCompressionRatio || 0}%
            </p>
          </div>
          <div className="text-center">
            <DollarSign className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <p className="text-sm text-purple-700">Monthly Savings</p>
            <p className="text-xl font-semibold text-purple-900">
              {formatCurrency(roiData?.categories?.find(cat => cat.category === 'Headroom AI Compression')?.metrics?.totalMonthlySavings || 0)}
            </p>
          </div>
          <div className="text-center">
            <Zap className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <p className="text-sm text-purple-700">Processing Speed</p>
            <p className="text-xl font-semibold text-purple-900">
              +{roiData?.categories?.find(cat => cat.category === 'Headroom AI Compression')?.metrics?.processingTimeReduction || 0}%
            </p>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-purple-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-purple-700">
              <span className="font-medium">Total Space Saved:</span> {formatTokens(roiData?.categories?.find(cat => cat.category === 'Headroom AI Compression')?.metrics?.totalSavingsBytes || 0)} bytes
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-purple-900">AI-powered compression</p>
              <p className="text-xs text-purple-600">Intelligent document size reduction</p>
            </div>
          </div>
        </div>
      </div>

      {/* ROI Insights */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-green-900 mb-4">ROI Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-green-800 mb-2">Key Benefits</h4>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• {formatPercentage(avgCacheEfficiency)} average cache efficiency reduces costs</li>
              <li>• High ROI indicates strong value proposition</li>
              <li>• Payback period of {roiData.summary.paybackPeriodMonths} months shows fast returns</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-green-800 mb-2">Optimization Opportunities</h4>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• Increase query volume for better ROI</li>
              <li>• Focus on frequently asked questions</li>
              <li>• Leverage cache for similar document types</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ROIDashboard;
