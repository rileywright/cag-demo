import { useState } from 'react';
import { ToggleLeft, ToggleRight, Minimize2, TrendingDown, Info, Zap } from 'lucide-react';

const HeadroomToggle = ({ isHeadroomEnabled, onToggle, loading, compressionStats }) => {
  const [showInfo, setShowInfo] = useState(false);

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            {isHeadroomEnabled ? (
              <ToggleRight className="h-6 w-6 text-purple-600 cursor-pointer" onClick={() => !loading && onToggle(false)} />
            ) : (
              <ToggleLeft className="h-6 w-6 text-gray-400 cursor-pointer" onClick={() => !loading && onToggle(true)} />
            )}
            <span className={`font-medium ${isHeadroomEnabled ? 'text-purple-700' : 'text-gray-700'}`}>
              {isHeadroomEnabled ? 'Headroom AI' : 'Standard Processing'}
            </span>
          </div>
          
          <div className="flex items-center space-x-4 text-sm">
            {isHeadroomEnabled && (
              <>
                <div className="flex items-center space-x-1 text-purple-600">
                  <Minimize2 className="h-4 w-4" />
                  <span>Smart Compression</span>
                </div>
                <div className="flex items-center space-x-1 text-purple-600">
                  <TrendingDown className="h-4 w-4" />
                  <span>{compressionStats?.averageCompressionRatio || '0'}% smaller</span>
                </div>
                <div className="flex items-center space-x-1 text-purple-600">
                  <Zap className="h-4 w-4" />
                  <span>AI-powered</span>
                </div>
              </>
            )}
          </div>
        </div>

        <button
          onMouseEnter={() => setShowInfo(true)}
          onMouseLeave={() => setShowInfo(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          <Info className="h-4 w-4" />
        </button>
      </div>

      {showInfo && (
        <div className="mt-3 pt-3 border-t border-purple-200">
          <p className="text-sm text-gray-600">
            <strong>Headroom AI:</strong> Advanced document compression that reduces token usage by 60-80% 
            while preserving critical information. Uses AI to intelligently compress content before LLM processing.
          </p>
        </div>
      )}

      {isHeadroomEnabled && compressionStats && (
        <div className="mt-3 pt-3 border-t border-purple-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-purple-700 font-medium">Documents Compressed</div>
              <div className="text-purple-900 font-bold">{compressionStats.totalCompressed || 0}</div>
            </div>
            <div>
              <div className="text-purple-700 font-medium">Total Space Saved</div>
              <div className="text-purple-900 font-bold">
                {formatBytes(compressionStats.totalSavings || 0)}
              </div>
            </div>
            <div>
              <div className="text-purple-700 font-medium">Average Compression</div>
              <div className="text-purple-900 font-bold">
                {compressionStats.averageCompressionRatio || 0}%
              </div>
            </div>
          </div>
        </div>
      )}

      {isHeadroomEnabled && (
        <div className="mt-3 pt-3 border-t border-purple-200">
          <div className="flex items-center justify-between">
            <p className="text-sm text-purple-700 font-medium">
              🤖 Headroom AI is compressing documents before processing
            </p>
            <div className="text-xs text-purple-600">
              Estimated savings: 60-80% token reduction
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HeadroomToggle;
