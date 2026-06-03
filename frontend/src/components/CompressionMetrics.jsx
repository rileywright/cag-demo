import { Compress, TrendingDown, DollarSign, Clock } from 'lucide-react';

const CompressionMetrics = ({ compression }) => {
  if (!compression || !compression.enabled) {
    return (
      <div className="flex items-center gap-2 px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-xs">
        <Compress className="h-3 w-3" />
        <span>No compression</span>
      </div>
    );
  }

  const formatBytes = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatPercent = (value) => {
    return `${value.toFixed(1)}%`;
  };

  const formatCost = (cost) => {
    return `$${cost.toFixed(6)}`;
  };

  const formatTime = (ms) => {
    return `${ms.toFixed(0)}ms`;
  };

  return (
    <div className="group relative">
      <div className="flex items-center gap-2 px-2 py-1 bg-green-100 text-green-800 rounded-md text-xs">
        <Compress className="h-3 w-3" />
        <span className="font-medium">{formatPercent(compression.tokenCompression)}</span>
        <TrendingDown className="h-3 w-3" />
      </div>

      {/* Tooltip with detailed metrics */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 w-64">
        <div className="space-y-2">
          {/* Size Compression */}
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Size:</span>
            <div className="text-right">
              <div>{formatBytes(compression.originalSize)} → {formatBytes(compression.compressedSize)}</div>
              <div className="text-green-400">{formatPercent(compression.compressionRatio * 100)}</div>
            </div>
          </div>

          {/* Token Compression */}
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Tokens:</span>
            <div className="text-right">
              <div className="text-green-400">{formatPercent(compression.tokenCompression)}</div>
              <div className="text-gray-500">{compression.savings} tokens saved</div>
            </div>
          </div>

          {/* Cost Savings */}
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Cost:</span>
            <div className="text-right">
              <div className="text-green-400">{formatCost(compression.costSavings)}</div>
              <div className="text-gray-500">per document</div>
            </div>
          </div>

          {/* Processing Time */}
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Time:</span>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{formatTime(compression.processingTime)}</span>
            </div>
          </div>

          {/* ROI Info */}
          {compression.roi && (
            <div className="border-t border-gray-700 pt-2 mt-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Monthly Savings:</span>
                <span className="text-green-400">${compression.roi.estimated_monthly_savings}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Payback:</span>
                <span className="text-yellow-400">{compression.roi.payback_documents} docs</span>
              </div>
            </div>
          )}
        </div>

        {/* Arrow */}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
          <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      </div>
    </div>
  );
};

export default CompressionMetrics;
