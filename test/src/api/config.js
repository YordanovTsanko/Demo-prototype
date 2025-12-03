import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds for LLM responses
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    console.log('📤 API Request:', {
      method: config.method.toUpperCase(),
      url: config.url,
      data: config.data
    });
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    console.log('📥 API Response:', {
      status: response.status,
      url: response.config.url,
      data: response.data
    });
    return response;
  },
  (error) => {
    console.error('❌ API Error:', {
      message: error.message,
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
    });
    
    // Handle specific error cases
    if (error.code === 'ECONNABORTED') {
      error.message = 'Request timeout - the server is taking too long to respond';
    } else if (error.code === 'ERR_NETWORK') {
      error.message = 'Network error - make sure the backend server is running on port 5000';
    } else if (error.response?.status === 400) {
      error.message = error.response.data?.error || 'Invalid request';
    } else if (error.response?.status === 404) {
      error.message = error.response.data?.error || 'Resource not found';
    } else if (error.response) {
      error.message = error.response.data?.error || error.message;
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
export { API_BASE_URL };