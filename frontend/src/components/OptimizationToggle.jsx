import { useState } from 'react';
import { ToggleLeft, ToggleRight, Zap, DollarSign, TrendingDown, Info } from 'lucide-react';

const OptimizationToggle = ({ isOptimized, onToggle, loading, estimatedSavings }) => {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            {isOptimized ? (
              <ToggleRight className="h-6 w-6 text-green-600 cursor-pointer" onClick={() => !loading && onToggle(false)} />
            ) : (
              <ToggleLeft className="h-6 w-6 text-gray-400 cursor-pointer" onClick={() => !loading && onToggle(true)} />
            )}
            <span className={`font-medium ${isOptimized ? 'text-green-700' : 'text-gray-700'}`}>
              {isOptimized ? 'Optimized' : 'Standard'} Processing
            </span>
          </div>
          
          <div className="flex items-center space-x-4 text-sm">
            {isOptimized && (
              <>
                <div className="flex items-center space-x-1 text-green-600">
                  <Zap className="h-4 w-4" />
                  <span>70% faster</span>
                </div>
                <div className="flex items-center space-x-1 text-green-600">
                  <DollarSign className="h-4 w-4" />
                  <span>70% cost reduction</span>
                </div>
                <div className="flex items-center space-x-1 text-green-600">
                  <TrendingDown className="h-4 w-4" />
                  <span>~70% fewer tokens</span>
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
        <div className="mt-3 pt-3 border-t border-blue-200">
          <p className="text-sm text-gray-600">
            <strong>Optimized Processing:</strong> Uses smart filtering to send only relevant document sections to the AI, 
            reducing costs by ~70% while maintaining answer quality. Compare results side-by-side to verify accuracy.
          </p>
        </div>
      )}

      {isOptimized && (
        <div className="mt-3 pt-3 border-t border-green-200">
          <div className="flex items-center justify-between">
            <p className="text-sm text-green-700 font-medium">
              💡 Running both modes for comparison
            </p>
            <div className="text-xs text-green-600">
              Estimated savings: ${estimatedSavings?.toFixed(4) || '0.0021'} per query
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OptimizationToggle;
