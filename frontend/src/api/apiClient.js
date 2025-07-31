// src/api/apiClient.js
import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:6510/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Enhanced request interceptor with detailed logging
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  
  console.log('🌐 API Request:', {
    method: config.method?.toUpperCase(),
    url: config.url,
    baseURL: config.baseURL,
    fullURL: `${config.baseURL}${config.url}`,
    headers: config.headers,
    data: config.data,
    token: token ? `${token.substring(0, 20)}...` : 'NO TOKEN',
    timestamp: new Date().toISOString()
  });

  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
    console.log('🔑 Authorization header added');
  } else {
    console.warn('⚠️ No JWT token found in localStorage');
  }

  return config;
}, (error) => {
  console.error('❌ Request interceptor error:', error);
  return Promise.reject(error);
});

// Enhanced response interceptor with detailed logging
apiClient.interceptors.response.use((response) => {
  console.log('✅ API Response:', {
    status: response.status,
    statusText: response.statusText,
    url: response.config.url,
    method: response.config.method?.toUpperCase(),
    data: response.data,
    headers: response.headers,
    timestamp: new Date().toISOString()
  });
  return response;
}, (error) => {
  console.error('❌ API Error:', {
    message: error.message,
    status: error.response?.status,
    statusText: error.response?.statusText,
    url: error.config?.url,
    method: error.config?.method?.toUpperCase(),
    data: error.response?.data,
    headers: error.response?.headers,
    config: error.config,
    timestamp: new Date().toISOString()
  });

  // Log specific error types
  if (error.code === 'ERR_NETWORK') {
    console.error('🌐 Network Error - Check if backend server is running');
  }
  
  if (error.response?.status === 401) {
    console.error('🔒 Unauthorized - Token might be invalid or expired');
  }
  
  if (error.response?.status === 403) {
    console.error('🚫 Forbidden - User might not have required permissions');
  }
  
  if (error.response?.status === 404) {
    console.error('🔍 Not Found - API endpoint might not exist');
  }

  return Promise.reject(error);
});

export default apiClient;