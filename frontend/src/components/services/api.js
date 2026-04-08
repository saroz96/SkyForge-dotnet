// import axios from 'axios';

// // Create axios instance with JWT support
// const api = axios.create({
//     baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:5142',
//     withCredentials: false,
//     headers: {
//         'Content-Type': 'application/json'
//     }
// });

// // Request interceptor to add JWT token
// api.interceptors.request.use(
//     (config) => {
//         const token = localStorage.getItem('token');
//         if (token) {
//             config.headers.Authorization = `Bearer ${token}`;
//         }
//          console.log('Request URL:', config.url);
//     console.log('Request Headers:', config.headers);
//     console.log('Full token:', token);
//     if (token) {
//       try {
//         const payload = JSON.parse(atob(token.split('.')[1]));
//         console.log('Token payload:', payload);
//       } catch (e) {
//         console.log('Could not decode token');
//       }
//     }
//         return config;
//     },
//     (error) => {
//         return Promise.reject(error);
//     }
// );

// // Response interceptor to handle token expiration
// api.interceptors.response.use(
//     (response) => response,
//     (error) => {
//         if (error.response?.status === 401) {
//             // Token expired or invalid
//             localStorage.removeItem('token');
//             delete api.defaults.headers.common['Authorization'];
            
//             // Redirect to login if not already there
//             if (window.location.pathname !== '/auth/login') {
//                 window.location.href = '/auth/login';
//             }
//         }
//         return Promise.reject(error);
//     }
// );

// // Optional: Loading interceptors
// export const setupInterceptors = (showLoading, hideLoading) => {
//     api.interceptors.request.use(
//         (config) => {
//             showLoading();
//             return config;
//         },
//         (error) => {
//             hideLoading();
//             return Promise.reject(error);
//         }
//     );

//     api.interceptors.response.use(
//         (response) => {
//             hideLoading();
//             return response;
//         },
//         (error) => {
//             hideLoading();
//             return Promise.reject(error);
//         }
//     );
// };

// export default api;

//---------------------------------------------------------------end

// components/services/api.js
import axios from 'axios';

let loadingManager = null;

// Function to set loading manager from React
export const setLoadingManager = (manager) => {
  loadingManager = manager;
};

// Create axios instance with JWT support
const api = axios.create({
    baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:5142',
    withCredentials: false,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Track pending requests
let pendingRequests = 0;

// Setup interceptors function - NOW EXPORTED
export const setupInterceptors = (showLoading, hideLoading, updateProgress) => {
  // Store loading functions
  loadingManager = { showLoading, hideLoading, updateProgress };
  
  // Request interceptor
  api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        
        // Show loading for this request (skip if explicitly disabled)
        if (loadingManager && !config.skipLoading) {
            pendingRequests++;
            if (pendingRequests === 1) {
                // For file uploads/downloads, use longer duration estimate
                const isFileRequest = config.url?.includes('upload') || config.url?.includes('download');
                const duration = isFileRequest ? 10000 : 3000;
                loadingManager.showLoading(duration);
            }
        }
        
        console.log('Request URL:', config.url);
        console.log('Request Headers:', config.headers);
        
        const tokenPayload = localStorage.getItem('token');
        if (tokenPayload) {
            try {
                const payload = JSON.parse(atob(tokenPayload.split('.')[1]));
                console.log('Token payload:', payload);
            } catch (e) {
                console.log('Could not decode token');
            }
        }
        return config;
    },
    (error) => {
        if (loadingManager && pendingRequests > 0) {
            pendingRequests--;
            if (pendingRequests === 0) {
                loadingManager.hideLoading();
            }
        }
        return Promise.reject(error);
    }
  );

  // Response interceptor
  api.interceptors.response.use(
    (response) => {
        if (loadingManager && !response.config.skipLoading) {
            pendingRequests--;
            if (pendingRequests === 0) {
                loadingManager.hideLoading();
            }
        }
        return response;
    },
    (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('token');
            delete api.defaults.headers.common['Authorization'];
            
            // Reset loading
            if (loadingManager) {
                pendingRequests = 0;
                if (loadingManager.resetLoading) {
                    loadingManager.resetLoading();
                } else {
                    loadingManager.hideLoading();
                }
            }
            
            // Redirect to login if not already there
            if (window.location.pathname !== '/auth/login') {
                window.location.href = '/auth/login';
            }
        }
        
        if (loadingManager && !error.config?.skipLoading) {
            pendingRequests--;
            if (pendingRequests === 0) {
                loadingManager.hideLoading();
            }
        }
        return Promise.reject(error);
    }
  );
};

// Helper function to make requests with progress tracking
export const apiWithProgress = {
  get: (url, config = {}) => {
    return api.get(url, {
      ...config,
      onDownloadProgress: (progressEvent) => {
        if (loadingManager && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          if (loadingManager.updateProgress) {
            loadingManager.updateProgress(percent);
          }
        }
        if (config.onDownloadProgress) config.onDownloadProgress(progressEvent);
      }
    });
  },
  
  post: (url, data, config = {}) => {
    return api.post(url, data, {
      ...config,
      onUploadProgress: (progressEvent) => {
        if (loadingManager && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          if (loadingManager.updateProgress) {
            loadingManager.updateProgress(percent);
          }
        }
        if (config.onUploadProgress) config.onUploadProgress(progressEvent);
      },
      onDownloadProgress: (progressEvent) => {
        if (loadingManager && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          if (loadingManager.updateProgress) {
            loadingManager.updateProgress(percent);
          }
        }
        if (config.onDownloadProgress) config.onDownloadProgress(progressEvent);
      }
    });
  },
  
  put: (url, data, config = {}) => {
    return api.put(url, data, {
      ...config,
      onUploadProgress: (progressEvent) => {
        if (loadingManager && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          if (loadingManager.updateProgress) {
            loadingManager.updateProgress(percent);
          }
        }
        if (config.onUploadProgress) config.onUploadProgress(progressEvent);
      }
    });
  },
  
  delete: (url, config = {}) => {
    return api.delete(url, config);
  }
};

export default api;