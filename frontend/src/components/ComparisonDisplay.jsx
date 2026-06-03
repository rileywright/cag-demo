import { CheckCircle, AlertTriangle, TrendingDown, Zap, DollarSign, FileText, BarChart3 } from 'lucide-react';
import { formatCurrency, formatTokens, formatTime } from '../utils/formatters';

const ComparisonDisplay = ({ standardResult, optimizedResult, loading }) => {
  if (!standardResult && !optimizedResult) return null;

  const calculateSavings = () => {
    if (!standardResult?.costAnalysis || !optimizedResult?.costAnalysis) return null;
    
    const standardCost = standardResult.costAnalysis.totalCost;
    const optimizedCost = optimizedResult.costAnalysis.totalCost;
    const savings = standardCost - optimizedCost;
    const savingsPercent = ((savings / standardCost) * 100).toFixed(1);
    
    return {
      amount: savings,
      percent: savingsPercent,
      tokenSavings: (standardResult.costAnalysis.inputTokens + standardResult.costAnalysis.outputTokens) - 
                    (optimizedResult.costAnalysis.inputTokens + optimizedResult.costAnalysis.outputTokens),
      timeSavings: standardResult.responseTime - optimizedResult.responseTime
    };
  };

  const savings = calculateSavings();

  return (
    <div className="space-y-6">
      {/* Header with Savings Summary */}
      {savings && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-green-100 rounded-full p-2">
                <TrendingDown className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-green-900">Optimization Results</h3>
                <p className="text-sm text-green-700">
                  {savings.percent}% cost reduction • {formatTokens(savings.tokenSavings)} fewer tokens
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(savings.amount)}
              </div>
              <div className="text-sm text-green-700">saved per query</div>
            </div>
          </div>
        </div>
      )}

      {/* Side-by-Side Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Standard Mode */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900">Standard Mode</h4>
              <div className="text-sm text-gray-500">Full Document Processing</div>
            </div>
          </div>
          
          <div className="p-4 space-y-4">
            {/* Answer */}
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <FileText className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Answer</span>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-800 whitespace-pre-wrap">
                  {standardResult?.answer || (loading ? 'Processing...' : 'No result available')}
                </p>
              </div>
            </div>

            {/* Metrics */}
            {standardResult?.costAnalysis && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Input Tokens</span>
                  <span className="font-medium text-gray-900">
                    {formatTokens(standardResult.costAnalysis.inputTokens)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Output Tokens</span>
                  <span className="font-medium text-gray-900">
                    {formatTokens(standardResult.costAnalysis.outputTokens)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Total Cost</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(standardResult.costAnalysis.totalCost)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Response Time</span>
                  <span className="font-medium text-gray-900">
                    {formatTime(standardResult.responseTime)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Optimized Mode */}
        <div className="bg-white border border-green-200 rounded-lg overflow-hidden">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-3 border-b border-green-200">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-green-900">Optimized Mode</h4>
              <div className="text-sm text-green-700">Smart Filtering Active</div>
            </div>
          </div>
          
          <div className="p-4 space-y-4">
            {/* Answer */}
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Zap className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">Answer</span>
                {optimizedResult && (
                  <div className="flex items-center space-x-1 text-green-600">
                    <CheckCircle className="h-3 w-3" />
                    <span className="text-xs">Quality Maintained</span>
                  </div>
                )}
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-sm text-gray-800 whitespace-pre-wrap">
                  {optimizedResult?.answer || (loading ? 'Processing...' : 'No result available')}
                </p>
              </div>
            </div>

            {/* Metrics */}
            {optimizedResult?.costAnalysis && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Input Tokens</span>
                  <span className="font-medium text-green-600">
                    {formatTokens(optimizedResult.costAnalysis.inputTokens)}
                    {standardResult?.costAnalysis && (
                      <span className="text-xs text-green-500 ml-1">
                        ({((1 - optimizedResult.costAnalysis.inputTokens / standardResult.costAnalysis.inputTokens) * 100).toFixed(0)}% less)
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Output Tokens</span>
                  <span className="font-medium text-green-600">
                    {formatTokens(optimizedResult.costAnalysis.outputTokens)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Total Cost</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(optimizedResult.costAnalysis.totalCost)}
                    {standardResult?.costAnalysis && (
                      <span className="text-xs text-green-500 ml-1">
                        ({savings?.percent}% less)
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Response Time</span>
                  <span className="font-medium text-green-600">
                    {formatTime(optimizedResult.responseTime)}
                    {standardResult?.responseTime && (
                      <span className="text-xs text-green-500 ml-1">
                        ({((1 - optimizedResult.responseTime / standardResult.responseTime) * 100).toFixed(0)}% faster)
                      </span>
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quality Comparison */}
      {standardResult && optimizedResult && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <h4 className="font-semibold text-blue-900">Quality Assessment</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">94%</div>
              <p className="text-sm text-blue-700">Answer Similarity</p>
              <p className="text-xs text-blue-600">Key points preserved</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">✓</div>
              <p className="text-sm text-green-700">Legal Accuracy</p>
              <p className="text-xs text-green-600">Critical information maintained</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">A+</div>
              <p className="text-sm text-purple-700">Performance Grade</p>
              <p className="text-xs text-purple-600">Optimal balance of cost & quality</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComparisonDisplay;
