import { useState } from 'react';
import { Trash2, FileText, AlertTriangle, CheckCircle } from 'lucide-react';
import { formatTokens, formatTime } from '../utils/formatters';
import CompressionMetrics from './CompressionMetrics';

const DocumentManager = ({ documents, onDeleteDocument, onDeleteAllDocuments, loading }) => {
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const handleDeleteDocument = async (documentId) => {
    try {
      await onDeleteDocument(documentId);
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  };

  const handleDeleteAllDocuments = async () => {
    try {
      await onDeleteAllDocuments();
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete all documents:', error);
    }
  };

  if (documents.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">No documents uploaded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Delete All */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">
          Documents ({documents.length})
        </h3>
        {documents.length > 1 && (
          <button
            onClick={() => setDeleteConfirm('all')}
            className="inline-flex items-center space-x-2 px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
            disabled={loading}
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete All</span>
          </button>
        )}
      </div>

      {/* Documents List */}
      <div className="space-y-3">
        {documents.map((doc) => (
          <div
            key={doc.documentId}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-900 truncate">
                  {doc.originalName}
                </h4>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-500">
                  <span>
                    {formatTokens(doc.tokenCount)} tokens
                  </span>
                  {doc.pages && (
                    <span>{doc.pages} pages</span>
                  )}
                  <span>
                    Uploaded {formatTime(new Date(doc.uploadedAt))}
                  </span>
                  <CompressionMetrics compression={doc.compression} />
                </div>
              </div>
              
              <button
                onClick={() => setDeleteConfirm(doc.documentId)}
                className="ml-4 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                disabled={loading}
                title="Delete document"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">
                Confirm Deletion
              </h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              {deleteConfirm === 'all' 
                ? `Are you sure you want to delete all ${documents.length} documents? This action cannot be undone.`
                : 'Are you sure you want to delete this document? This action cannot be undone.'
              }
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={() => deleteConfirm === 'all' 
                  ? handleDeleteAllDocuments() 
                  : handleDeleteDocument(deleteConfirm)
                }
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
                disabled={loading}
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentManager;
