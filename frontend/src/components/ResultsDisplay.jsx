import { useState } from 'react';
import { FileText, Clock, DollarSign, Zap, MessageCircle, CheckCircle, AlertTriangle, Copy, Download, ThumbsUp, ThumbsDown } from 'lucide-react';
import { formatCurrency, formatTime, formatPercentage, formatTokens, formatDate } from '../utils/formatters';

const ResultsDisplay = ({ query }) => {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState(null); // 'up' | 'down' | null

  if (!query) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Yet</h3>
        <p className="text-gray-500">
          Ask a question about your document to see results here.
        </p>
      </div>
    );
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(query.response);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([query.response], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `legal-analysis-${query.documentName}-${formatDate(query.timestamp).replace(/[:\s]/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleFeedback = (type) => {
    setFeedback(type);
    // Here you would send feedback to your backend
    console.log('User feedback:', type, 'for query:', query.id);
  };

  const confidenceScore = query.costAnalysis?.cacheEfficiency > 80 ? 'High' : 
                        query.costAnalysis?.cacheEfficiency > 50 ? 'Medium' : 'Low';

  const confidenceColor = confidenceScore === 'High' ? 'text-green-600 bg-green-100' :
                       confidenceScore === 'Medium' ? 'text-yellow-600 bg-yellow-100' :
                       'text-red-600 bg-red-100';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Analysis Results</h2>
        <p className="text-gray-600">
          AI-powered legal analysis for: <span className="font-medium">{query.documentName}</span>
        </p>
      </div>

      {/* Query Info */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Your Question</p>
            <p className="font-medium text-gray-900">{query.query}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Analyzed At</p>
            <p className="font-medium text-gray-900">{formatDate(query.timestamp)}</p>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <Clock className="h-6 w-6 text-blue-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Response Time</p>
            <p className="text-lg font-semibold text-gray-900">
              {formatTime(query.responseTime)}
            </p>
          </div>
          <div className="text-center">
            <DollarSign className="h-6 w-6 text-green-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Cost</p>
            <p className="text-lg font-semibold text-gray-900">
              {formatCurrency(query.costAnalysis?.totalCost || 0)}
            </p>
          </div>
          <div className="text-center">
            <Zap className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Cache Savings</p>
            <p className="text-lg font-semibold text-gray-900">
              {formatPercentage(query.costAnalysis?.savingsPercent || 0)}
            </p>
          </div>
          <div className="text-center">
            <MessageCircle className="h-6 w-6 text-purple-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Tokens Used</p>
            <p className="text-lg font-semibold text-gray-900">
              {formatTokens((query.costAnalysis?.cachedTokens || 0) + (query.costAnalysis?.newTokens || 0))}
            </p>
          </div>
        </div>
      </div>

      {/* Analysis Response */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Legal Analysis</h3>
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${confidenceColor}`}>
              {confidenceScore} Confidence
            </span>
            <div className="flex items-center space-x-1">
              <button
                onClick={handleCopy}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Copy response"
              >
                {copied ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </button>
              <button
                onClick={handleDownload}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Download response"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
        
        <div className="prose max-w-none">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">
              {query.response}
            </p>
          </div>
        </div>

        {/* Feedback Section */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-500 mb-2">Was this analysis helpful?</p>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => handleFeedback('up')}
              className={`flex items-center space-x-1 px-3 py-1 rounded-md transition-colors ${
                feedback === 'up' 
                  ? 'bg-green-100 text-green-700' 
                  : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
              }`}
            >
              <ThumbsUp className="h-4 w-4" />
              <span className="text-sm">Helpful</span>
            </button>
            <button
              onClick={() => handleFeedback('down')}
              className={`flex items-center space-x-1 px-3 py-1 rounded-md transition-colors ${
                feedback === 'down' 
                  ? 'bg-red-100 text-red-700' 
                  : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
              }`}
            >
              <ThumbsDown className="h-4 w-4" />
              <span className="text-sm">Not Helpful</span>
            </button>
          </div>
        </div>
      </div>

      {/* Cost Analysis Details */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">Cost Analysis Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-blue-800 mb-2">Token Usage</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-blue-700">Cached Tokens:</span>
                <span className="font-medium text-blue-900">
                  {formatTokens(query.costAnalysis?.cachedTokens || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">New Tokens:</span>
                <span className="font-medium text-blue-900">
                  {formatTokens(query.costAnalysis?.newTokens || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">Total Tokens:</span>
                <span className="font-medium text-blue-900">
                  {formatTokens((query.costAnalysis?.cachedTokens || 0) + (query.costAnalysis?.newTokens || 0))}
                </span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-blue-800 mb-2">Cost Breakdown</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-blue-700">Cached Cost:</span>
                <span className="font-medium text-blue-900">
                  {formatCurrency(query.costAnalysis?.cachedCost || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">New Cost:</span>
                <span className="font-medium text-blue-900">
                  {formatCurrency(query.costAnalysis?.newCost || 0)}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-blue-200">
                <span className="text-blue-700 font-medium">Total Cost:</span>
                <span className="font-medium text-blue-900">
                  {formatCurrency(query.costAnalysis?.totalCost || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-blue-200">
          <div className="flex items-center justify-between">
            <span className="text-blue-700">Cache Efficiency:</span>
            <span className="font-medium text-blue-900">
              {formatPercentage(query.costAnalysis?.cacheEfficiency || 0)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-blue-700">Estimated Time Saved:</span>
            <span className="font-medium text-blue-900">
              ~{Math.round((query.responseTime / 1000) * 0.75 * 60)} minutes
            </span>
          </div>
        </div>
      </div>

      {/* ROI Impact */}
      {query.roi && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-900 mb-4">ROI Impact</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-green-700">Annual Impact</p>
              <p className="text-lg font-semibold text-green-900">
                {formatCurrency(query.roi.summary?.totalAnnualImpact || 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-green-700">ROI Percentage</p>
              <p className="text-lg font-semibold text-green-900">
                {formatPercentage(query.roi.summary?.roiPercentage || 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-green-700">Payback Period</p>
              <p className="text-lg font-semibold text-green-900">
                {query.roi.summary?.paybackPeriodMonths || 0} months
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-yellow-900">Legal Disclaimer</h4>
            <p className="text-sm text-yellow-800 mt-1">
              This AI-generated analysis is for informational purposes only and should not be considered legal advice. 
              Always consult with qualified legal professionals for important matters.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsDisplay;
