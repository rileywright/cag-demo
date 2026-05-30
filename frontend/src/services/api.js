import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth headers
api.interceptors.request.use(
  (config) => {
    const sessionId = localStorage.getItem('sessionId');
    const sessionToken = localStorage.getItem('sessionToken');
    
    if (sessionId) {
      config.headers['X-Session-ID'] = sessionId;
    }
    
    if (sessionToken) {
      config.headers['Authorization'] = `Bearer ${sessionToken}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear session on auth error
      localStorage.removeItem('sessionId');
      localStorage.removeItem('sessionToken');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  createSession: async (username, password) => {
    const response = await api.post('/api/session/create', { username, password });
    return response.data.data;
  },
  
  login: async (username, password) => {
    const response = await api.post('/api/session/login', { username, password });
    return response.data.data;
  },
  
  getSessionStatus: async () => {
    const response = await api.get('/api/session/status');
    return response.data.data;
  },
};

// Document API
export const documentAPI = {
  uploadDocument: async (file) => {
    const formData = new FormData();
    formData.append('document', file);
    
    const response = await api.post('/api/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  },
  
  getDocument: async (documentId) => {
    const response = await api.get(`/api/documents/${documentId}`);
    return response.data.data;
  },
  
  getDocuments: async () => {
    const response = await api.get('/api/documents');
    return response.data.data;
  },
};

// CAG Query API
export const cagAPI = {
  queryDocument: async (query, documentId, includeComparison = false) => {
    const response = await api.post('/api/cag/query', {
      query,
      documentId,
      includeComparison,
    });
    return response.data;
  },
};

// ROI API
export const roiAPI = {
  calculateROI: async (data) => {
    const response = await api.post('/api/roi/calculate', data);
    return response.data.data;
  },
};

// Health Check API
export const healthAPI = {
  checkHealth: async () => {
    const response = await api.get('/api/health');
    return response.data.data;
  },
};

export default api;
