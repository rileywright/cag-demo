import { useState } from 'react';
import { Clock, FileText, Search, Filter, ChevronDown, ChevronUp, MessageCircle, DollarSign, Zap, Calendar } from 'lucide-react';
import { formatCurrency, formatTime, formatPercentage, formatDate } from '../utils/formatters';

const QueryHistory = ({ queries, documents }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDocument, setFilterDocument] = useState('all');
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' | 'desc'
  const [expandedQuery, setExpandedQuery] = useState(null);

  // Filter queries based on search and document filter
  const filteredQueries = queries.filter(query => {
    const matchesSearch = searchTerm === '' || 
      query.query.toLowerCase().includes(searchTerm.toLowerCase()) ||
      query.response.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDocument = filterDocument === 'all' || query.documentId === filterDocument;
    
    return matchesSearch && matchesDocument;
  });

  // Sort queries
  const sortedQueries = [...filteredQueries].sort((a, b) => {
    const dateA = new Date(a.timestamp);
    const dateB = new Date(b.timestamp);
    return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
  });

  const toggleQueryExpansion = (queryId) => {
    setExpandedQuery(expandedQuery === queryId ? null : queryId);
  };

  const getDocumentName = (documentId) => {
    const doc = documents.find(d => d.documentId === documentId);
    return doc?.originalName || 'Unknown Document';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <Clock className="h-8 w-8 text-blue-600 mx-auto mb-2" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Query History</h2>
        <p className="text-gray-600">
          Complete audit trail of all document analysis queries
        </p>
      </div>

      {/* Filters and Search */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search queries or responses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Document Filter */}
          <div>
            <select
              value={filterDocument}
              onChange={(e) => setFilterDocument(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Documents</option>
              {documents.map(doc => (
                <option key={doc.documentId} value={doc.documentId}>
                  {doc.originalName}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Order */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="flex items-center space-x-1 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Calendar className="h-4 w-4" />
              <span className="text-sm">Date</span>
              {sortOrder === 'desc' ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      {queries.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <MessageCircle className="h-6 w-6 text-blue-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Total Queries</p>
            <p className="text-xl font-semibold text-gray-900">{queries.length}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <DollarSign className="h-6 w-6 text-green-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Total Cost</p>
            <p className="text-xl font-semibold text-gray-900">
              {formatCurrency(queries.reduce((sum, q) => sum + (q.costAnalysis?.totalCost || 0), 0))}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <Clock className="h-6 w-6 text-purple-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Avg Response Time</p>
            <p className="text-xl font-semibold text-gray-900">
              {formatTime(queries.reduce((sum, q) => sum + q.responseTime, 0) / queries.length)}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <Zap className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Cache Efficiency</p>
            <p className="text-xl font-semibold text-gray-900">
              {formatPercentage(queries.reduce((sum, q) => sum + (q.costAnalysis?.cacheEfficiency || 0), 0) / queries.length)}
            </p>
          </div>
        </div>
      )}

      {/* Query List */}
      {sortedQueries.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Queries Found</h3>
          <p className="text-gray-500">
            {queries.length === 0 
              ? "No queries have been made yet. Ask questions about your documents to see them here."
              : "No queries match your current filters."
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedQueries.map((query) => (
            <div
              key={query.id}
              className="bg-white border border-gray-200 rounded-lg overflow-hidden"
            >
              {/* Query Header */}
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <MessageCircle className="h-4 w-4 text-blue-600" />
                      <span className="text-sm text-gray-500">Query</span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-400">{formatDate(query.timestamp)}</span>
                    </div>
                    <p className="font-medium text-gray-900 mb-2">{query.query}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <FileText className="h-3 w-3" />
                        <span>{getDocumentName(query.documentId)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatTime(query.responseTime)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <DollarSign className="h-3 w-3" />
                        <span>{formatCurrency(query.costAnalysis?.totalCost || 0)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Zap className="h-3 w-3" />
                        <span>{formatPercentage(query.costAnalysis?.cacheEfficiency || 0)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => toggleQueryExpansion(query.id)}
                    className="ml-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {expandedQuery === query.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Expanded Content */}
              {expandedQuery === query.id && (
                <div className="border-t border-gray-200 p-4 bg-gray-50">
                  <div className="space-y-4">
                    {/* Response */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Response</h4>
                      <div className="bg-white rounded-lg p-3">
                        <p className="text-gray-700 text-sm whitespace-pre-wrap">
                          {query.response}
                        </p>
                      </div>
                    </div>

                    {/* Detailed Metrics */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Performance Details</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Response Time</p>
                          <p className="font-medium text-gray-900">{formatTime(query.responseTime)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Total Cost</p>
                          <p className="font-medium text-gray-900">{formatCurrency(query.costAnalysis?.totalCost || 0)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Cached Tokens</p>
                          <p className="font-medium text-gray-900">{query.costAnalysis?.cachedTokens?.toLocaleString() || 0}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">New Tokens</p>
                          <p className="font-medium text-gray-900">{query.costAnalysis?.newTokens?.toLocaleString() || 0}</p>
                        </div>
                      </div>
                    </div>

                    {/* ROI Impact */}
                    {query.roi && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">ROI Impact</h4>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Annual Impact</p>
                            <p className="font-medium text-green-600">
                              {formatCurrency(query.roi.summary?.totalAnnualImpact || 0)}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">ROI</p>
                            <p className="font-medium text-green-600">
                              {formatPercentage(query.roi.summary?.roiPercentage || 0)}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">Payback</p>
                            <p className="font-medium text-green-600">
                              {query.roi.summary?.paybackPeriodMonths || 0} months
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Export Options */}
      {queries.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-blue-900">Export Query History</h4>
              <p className="text-sm text-blue-700">Download complete audit trail for compliance and billing</p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  const csvContent = [
                    ['Date', 'Query', 'Document', 'Response Time', 'Cost', 'Cache Efficiency'],
                    ...sortedQueries.map(q => [
                      formatDate(q.timestamp),
                      q.query,
                      getDocumentName(q.documentId),
                      formatTime(q.responseTime),
                      formatCurrency(q.costAnalysis?.totalCost || 0),
                      formatPercentage(q.costAnalysis?.cacheEfficiency || 0)
                    ])
                  ].map(row => row.join(',')).join('\n');
                  
                  const blob = new Blob([csvContent], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `query-history-${formatDate(new Date()).replace(/[:\s]/g, '-')}.csv`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  window.URL.revokeObjectURL(url);
                }}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Export CSV
              </button>
              <button
                onClick={() => {
                  const jsonContent = JSON.stringify(sortedQueries, null, 2);
                  const blob = new Blob([jsonContent], { type: 'application/json' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `query-history-${formatDate(new Date()).replace(/[:\s]/g, '-')}.json`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  window.URL.revokeObjectURL(url);
                }}
                className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
              >
                Export JSON
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QueryHistory;
