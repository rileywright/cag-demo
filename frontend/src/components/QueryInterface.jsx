import { useState } from 'react';
import { MessageCircle, Send, FileText, Clock, DollarSign, Zap, Lightbulb, ArrowLeft } from 'lucide-react';
import { formatCurrency, formatTime, formatPercentage } from '../utils/formatters';

const QueryInterface = ({ documents, onQuery, loading, currentQuery, onNewQuery }) => {
  const [queryText, setQueryText] = useState('');
  const [selectedDocument, setSelectedDocument] = useState('');
  const [suggestions] = useState([
    'What is this document about?',
    'Who are the parties involved?',
    'What are the key dates mentioned?',
    'Summarize the main legal issues',
    'What are the next steps required?',
    'What obligations are outlined?',
    'What jurisdiction applies?',
    'Are there any risks or concerns?'
  ]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!queryText.trim()) return;
    if (!selectedDocument) {
      alert('Please select a document to analyze');
      return;
    }
    
    onQuery(queryText.trim(), selectedDocument);
  };

  const handleSuggestionClick = (suggestion) => {
    setQueryText(suggestion);
  };

  const isProcessing = currentQuery?.status === 'processing';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        {currentQuery && (
          <div className="mb-4">
            <button
              onClick={onNewQuery}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Ask Another Question</span>
            </button>
          </div>
        )}
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Ask Legal Questions</h2>
        <p className="text-gray-600">
          Get instant AI-powered analysis of your legal documents
        </p>
      </div>

      {/* Document Selection */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Document to Analyze
        </label>
        <select
          value={selectedDocument}
          onChange={(e) => setSelectedDocument(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={loading || documents.length === 0}
        >
          <option value="">Choose a document...</option>
          {documents.map((doc) => (
            <option key={doc.documentId} value={doc.documentId}>
              {doc.originalName} ({doc.tokenCount?.toLocaleString() || 'N/A'} tokens)
            </option>
          ))}
        </select>
        
        {documents.length === 0 && (
          <p className="text-sm text-gray-500 mt-2">
            No documents uploaded yet. Please upload a document first.
          </p>
        )}
      </div>

      {/* Query Input */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your Legal Question
          </label>
          <textarea
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder="Ask anything about your document... (e.g., 'What are the key obligations in this contract?')"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={4}
            disabled={loading || !selectedDocument}
          />
          <p className="text-sm text-gray-500 mt-1">
            Be specific about what you want to know. The AI will analyze the entire document context.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || !queryText.trim() || !selectedDocument}
          className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isProcessing ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Analyzing Document...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-2">
              <Send className="h-4 w-4" />
              <span>Get Answer</span>
            </div>
          )}
        </button>
      </form>

      {/* Query Suggestions */}
      {selectedDocument && !isProcessing && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <Lightbulb className="h-4 w-4 text-yellow-600" />
            <h3 className="text-sm font-medium text-gray-700">Suggested Questions</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 hover:text-blue-800 rounded-md transition-colors"
                disabled={loading}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Processing Status */}
      {isProcessing && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <div>
              <h3 className="text-lg font-medium text-blue-900 mb-1">
                Analyzing Your Document
              </h3>
              <p className="text-blue-700">
                Our AI is reading and understanding your document to provide the most accurate answer.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <FileText className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                <p className="text-xs text-blue-700">Full Context Analysis</p>
              </div>
              <div>
                <Zap className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                <p className="text-xs text-blue-700">Cache-Augmented Generation</p>
              </div>
              <div>
                <MessageCircle className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                <p className="text-xs text-blue-700">Legal Expertise Applied</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Current Query Results Preview */}
      {currentQuery && currentQuery.status === 'completed' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <div className="h-2 w-2 bg-green-600 rounded-full"></div>
            <h3 className="text-sm font-medium text-green-900">Analysis Complete</h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <Clock className="h-5 w-5 text-green-600 mx-auto mb-1" />
              <p className="text-xs text-green-700">Response Time</p>
              <p className="text-sm font-medium text-green-900">
                {formatTime(currentQuery.responseTime)}
              </p>
            </div>
            <div>
              <DollarSign className="h-5 w-5 text-green-600 mx-auto mb-1" />
              <p className="text-xs text-green-700">Cost</p>
              <p className="text-sm font-medium text-green-900">
                {formatCurrency(currentQuery.costAnalysis?.totalCost || 0)}
              </p>
            </div>
            <div>
              <Zap className="h-5 w-5 text-green-600 mx-auto mb-1" />
              <p className="text-xs text-green-700">Cache Savings</p>
              <p className="text-sm font-medium text-green-900">
                {formatPercentage(currentQuery.costAnalysis?.savingsPercent || 0)}
              </p>
            </div>
            <div>
              <MessageCircle className="h-5 w-5 text-green-600 mx-auto mb-1" />
              <p className="text-xs text-green-700">Tokens Used</p>
              <p className="text-sm font-medium text-green-900">
                {formatTokens(currentQuery.costAnalysis?.cachedTokens + currentQuery.costAnalysis?.newTokens || 0)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-medium text-yellow-900 mb-2">💡 Pro Tips</h3>
        <ul className="text-sm text-yellow-800 space-y-1">
          <li>• Ask specific questions about dates, parties, obligations, or risks</li>
          <li>• The AI considers the entire document context for accurate answers</li>
          <li>• Cached queries are faster and cheaper - ask follow-up questions!</li>
          <li>• All queries are logged for billing and compliance purposes</li>
        </ul>
      </div>
    </div>
  );
};

export default QueryInterface;
