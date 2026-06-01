import { useState, useEffect } from 'react';
import { FileText, Upload, MessageCircle, TrendingUp, Clock, DollarSign, Zap, Shield, LogOut } from 'lucide-react';
import { authAPI, documentAPI, cagAPI, roiAPI } from './services/api';
import { formatCurrency, formatTime, formatTokens, formatPercentage } from './utils/formatters';
import Login from './components/Login';
import DocumentUpload from './components/DocumentUpload';
import QueryInterface from './components/QueryInterface';
import ResultsDisplay from './components/ResultsDisplay';
import ROIDashboard from './components/ROIDashboard';
import QueryHistory from './components/QueryHistory';

function App() {
  const [session, setSession] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [queries, setQueries] = useState([]);
  const [currentQuery, setCurrentQuery] = useState(null);
  const [roiData, setROIData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('upload');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState('');

  // Check for existing session on mount
  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = () => {
    const sessionId = localStorage.getItem('sessionId');
    const sessionToken = localStorage.getItem('sessionToken');
    
    if (sessionId && sessionToken) {
      // User has a stored session, try to validate it
      validateStoredSession();
    } else {
      // No stored session, show login
      setIsLoggedIn(false);
    }
  };

  const validateStoredSession = async () => {
    try {
      const sessionData = await authAPI.getSessionStatus();
      setSession(sessionData.session);
      setIsLoggedIn(true);
      await loadCachedDocuments();
    } catch (err) {
      // Session invalid, clear and show login
      localStorage.removeItem('sessionId');
      localStorage.removeItem('sessionToken');
      setIsLoggedIn(false);
    }
  };

  const handleLogin = async (username, password) => {
    try {
      setLoading(true);
      const sessionData = await authAPI.login(username, password);
      setSession(sessionData);
      localStorage.setItem('sessionId', sessionData.sessionId);
      localStorage.setItem('sessionToken', sessionData.token);
      setIsLoggedIn(true);
      
      // Load cached documents if they exist
      await loadCachedDocuments();
      
      setError(null);
    } catch (err) {
      setError('Login failed. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCachedDocuments = async () => {
    try {
      // Try to get documents from session or cache
      const response = await documentAPI.getDocuments();
      if (response && response.documents) {
        setDocuments(response.documents);
      }
    } catch (err) {
      console.log('No cached documents found:', err.message);
      // It's okay if there are no cached documents
    }
  };

  const handleDocumentUpload = async (file) => {
    try {
      setLoading(true);
      const uploadedDoc = await documentAPI.uploadDocument(file);
      setDocuments(prev => [...prev, uploadedDoc.document]);
      setSelectedDocument(uploadedDoc.document.documentId); // Auto-select new document
      setActiveTab('query');
      setError(null);
    } catch (err) {
      setError('Failed to upload document. Please try again.');
      console.error('Document upload error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuery = async (queryText, documentId) => {
    try {
      setLoading(true);
      setCurrentQuery({ query: queryText, status: 'processing' });
      
      const response = await cagAPI.queryDocument(queryText, documentId);
      
      // Calculate ROI for this query
      const roiCalculation = await roiAPI.calculateROI({
        documentLength: documents.find(d => d.documentId === documentId)?.statistics?.textLength || 50000,
        responseTime: response.data.metadata.queryTime,
        queryComplexity: 'medium',
        fromCache: response.data.metadata.fromCache || false,
        documentMetadata: {},
        costAnalysis: response.costAnalysis
      });
      
      const queryResult = {
        id: Date.now(),
        query: queryText,
        response: response.data.response,
        documentId,
        documentName: documents.find(d => d.documentId === documentId)?.originalName,
        timestamp: new Date().toISOString(),
        responseTime: response.data.metadata.queryTime,
        costAnalysis: response.costAnalysis,
        roi: roiCalculation,
        status: 'completed'
      };
      
      setQueries(prev => [queryResult, ...prev]);
      setCurrentQuery(queryResult);
      setROIData(roiCalculation);
      setActiveTab('results');
      setError(null);
    } catch (err) {
      setError('Failed to process query. Please try again.');
      console.error('Query error:', err);
      setCurrentQuery({ 
        query: queryText, 
        status: 'error', 
        error: err.message,
        timestamp: new Date().toISOString()
      });
      setActiveTab('query'); // Stay on query tab if there's an error
    } finally {
      setLoading(false);
    }
  };

  const handleNewQuery = () => {
    setCurrentQuery(null);
    // Keep selected document to maintain user context
    setActiveTab('query');
  };

  const handleLogout = () => {
    localStorage.removeItem('sessionId');
    localStorage.removeItem('sessionToken');
    setSession(null);
    setDocuments([]);
    setQueries([]);
    setCurrentQuery(null);
    setROIData(null);
    setSelectedDocument(''); // Clear selected document
    setIsLoggedIn(false);
    setActiveTab('upload');
  };

  // Show login screen if not logged in
  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} loading={loading} />;
  }

  if (loading && !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing Legal CAG System...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Legal CAG System</h1>
                <p className="text-sm text-gray-500">Cache Augmented Generation for Legal Analysis</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {session && (
                <div className="text-right">
                  <p className="text-sm text-gray-500">Welcome, {session.username || 'Guest'}</p>
                  <p className="text-xs text-gray-400">Session: {session.sessionId?.substring(0, 8)}...</p>
                </div>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Error Display */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        {queries.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <MessageCircle className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Total Queries</p>
                  <p className="text-2xl font-semibold text-gray-900">{queries.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-green-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Total Cost</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {formatCurrency(queries.reduce((sum, q) => sum + (q.costAnalysis?.totalCost || 0), 0))}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-purple-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Avg Response Time</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {formatTime(queries.reduce((sum, q) => sum + q.responseTime, 0) / queries.length)}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <Zap className="h-8 w-8 text-yellow-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Cache Efficiency</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {formatPercentage(queries.reduce((sum, q) => sum + (q.costAnalysis?.cacheEfficiency || 0), 0) / queries.length)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {[
                { id: 'upload', label: 'Upload Documents', icon: Upload, disabled: false },
                { id: 'query', label: 'Ask Questions', icon: MessageCircle, disabled: documents.length === 0 },
                { id: 'results', label: 'Results', icon: FileText, disabled: queries.length === 0 },
                { id: 'roi', label: 'ROI Analysis', icon: TrendingUp, disabled: queries.length === 0 },
                { id: 'history', label: 'Query History', icon: Clock, disabled: queries.length === 0 },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => !tab.disabled && setActiveTab(tab.id)}
                  disabled={tab.disabled}
                  className={`flex items-center space-x-2 py-4 px-6 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : tab.disabled
                      ? 'border-transparent text-gray-400 cursor-not-allowed'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="h-5 w-5" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'upload' && (
              <DocumentUpload onUpload={handleDocumentUpload} loading={loading} />
            )}
            
            {activeTab === 'query' && (
              <QueryInterface 
                documents={documents} 
                onQuery={handleQuery} 
                loading={loading}
                currentQuery={currentQuery}
                onNewQuery={handleNewQuery}
                selectedDocument={selectedDocument}
                onDocumentSelect={setSelectedDocument}
              />
            )}
            
            {activeTab === 'results' && (
              <ResultsDisplay query={currentQuery} />
            )}
            
            {activeTab === 'roi' && (
              <ROIDashboard roiData={roiData} queries={queries} />
            )}
            
            {activeTab === 'history' && (
              <QueryHistory queries={queries} documents={documents} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
