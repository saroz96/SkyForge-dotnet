// components/services/api.js
import axios from 'axios';

let loadingManager = null;
let refreshPromise = null;
let isRefreshing = false;
let failedQueue = [];
let inactivityTimer = null;
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

// Function to set loading manager from React
export const setLoadingManager = (manager) => {
  loadingManager = manager;
};

// Process failed queue after token refresh
const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Inactivity timer functions
let logoutCallback = null;

export const setLogoutCallback = (callback) => {
  logoutCallback = callback;
};

const resetInactivityTimer = () => {
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
  }
  inactivityTimer = setTimeout(() => {
    console.log('User inactive for 30 minutes. Logging out...');
    if (logoutCallback) {
      logoutCallback();
    } else {
      // Default logout behavior
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('currentCompany');
      localStorage.removeItem('fiscalYearId');
      if (window.location.pathname !== '/auth/login') {
        window.location.href = '/auth/login';
      }
    }
  }, INACTIVITY_TIMEOUT);
};

const clearInactivityTimer = () => {
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
    inactivityTimer = null;
  }
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

// Setup interceptors function
export const setupInterceptors = (showLoading, hideLoading, updateProgress) => {
  loadingManager = { showLoading, hideLoading, updateProgress };

  // Request interceptor
  api.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Reset inactivity timer on each request
      resetInactivityTimer();

      // Show loading for this request
      if (loadingManager && !config.skipLoading) {
        pendingRequests++;
        if (pendingRequests === 1) {
          const isFileRequest = config.url?.includes('upload') || config.url?.includes('download');
          const duration = isFileRequest ? 10000 : 3000;
          loadingManager.showLoading(duration);
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

  // Response interceptor with token refresh
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
    async (error) => {
      const originalRequest = error.config;

      // Check if it's a 401 error and not already retried
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        // Check for inactivity timeout
        if (error.response?.data?.code === 'INACTIVITY_TIMEOUT') {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('currentCompany');
          localStorage.removeItem('fiscalYearId');
          clearInactivityTimer();
          if (window.location.pathname !== '/auth/login') {
            window.location.href = '/auth/login';
          }
          return Promise.reject(error);
        }

        // Check if token expired specifically
        // if (error.response?.data?.error?.includes('token is expired') || 
        //     error.response?.data?.error?.includes('IDX10223') ||
        //     error.response?.data?.message?.includes('expired')) {

        //     // If already refreshing, add to queue
        //     if (isRefreshing) {
        //         return new Promise((resolve, reject) => {
        //             failedQueue.push({ resolve, reject });
        //         })
        //         .then(token => {
        //             originalRequest.headers.Authorization = `Bearer ${token}`;
        //             return api(originalRequest);
        //         })
        //         .catch(err => {
        //             return Promise.reject(err);
        //         });
        //     }

        //     isRefreshing = true;
        //     const refreshToken = localStorage.getItem('refreshToken');

        //     // If no refresh token, redirect to login
        //     if (!refreshToken) {
        //         localStorage.removeItem('token');
        //         localStorage.removeItem('refreshToken');
        //         isRefreshing = false;
        //         clearInactivityTimer();
        //         if (window.location.pathname !== '/auth/login') {
        //             window.location.href = '/auth/login';
        //         }
        //         return Promise.reject(error);
        //     }

        //     try {
        //         // Attempt to refresh token
        //         const response = await axios.post(
        //             `${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5142'}/api/User/refresh-token`,
        //             { refreshToken },
        //             { withCredentials: false }
        //         );

        //         if (response.data.success && response.data.token) {
        //             const newToken = response.data.token;
        //             localStorage.setItem('token', newToken);

        //             // If refresh token is renewed, update it
        //             if (response.data.refreshToken) {
        //                 localStorage.setItem('refreshToken', response.data.refreshToken);
        //             }

        //             // Update authorization header for all future requests
        //             api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

        //             // Process queued requests
        //             processQueue(null, newToken);

        //             // Retry original request with new token
        //             originalRequest.headers.Authorization = `Bearer ${newToken}`;
        //             return api(originalRequest);
        //         } else {
        //             throw new Error('Refresh failed');
        //         }
        //     } catch (refreshError) {
        //         console.error('Refresh token failed:', refreshError);

        //         // Clear tokens and redirect to login
        //         localStorage.removeItem('token');
        //         localStorage.removeItem('refreshToken');
        //         delete api.defaults.headers.common['Authorization'];
        //         clearInactivityTimer();

        //         // Process queue with error
        //         processQueue(refreshError, null);

        //         if (window.location.pathname !== '/auth/login') {
        //             window.location.href = '/auth/login';
        //         }
        //         return Promise.reject(refreshError);
        //     } finally {
        //         isRefreshing = false;
        //     }
        // }

        // ✅ Refresh on ANY 401 — no message check needed
        // If already refreshing, add to queue
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then(token => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return api(originalRequest);
            })
            .catch(err => {
              return Promise.reject(err);
            });
        }

        isRefreshing = true;
        const refreshToken = localStorage.getItem('refreshToken');

        // If no refresh token, redirect to login
        if (!refreshToken) {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('currentCompany');
          localStorage.removeItem('fiscalYearId');
          isRefreshing = false;
          clearInactivityTimer();
          if (window.location.pathname !== '/auth/login') {
            window.location.href = '/auth/login';
          }
          return Promise.reject(error);
        }

        try {
          // Attempt to refresh token
          const response = await axios.post(
            `${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5142'}/api/User/refresh-token`,
            {
              refreshToken,
              currentCompany: localStorage.getItem('currentCompany') || null,
              currentFiscalYear: localStorage.getItem('fiscalYearId') || null
            },
            { withCredentials: false }
          );

          if (response.data.success && response.data.token) {
            const newToken = response.data.token;
            localStorage.setItem('token', newToken);

            // If refresh token is renewed, update it
            if (response.data.refreshToken) {
              localStorage.setItem('refreshToken', response.data.refreshToken);
            }

            // Update authorization header for all future requests
            api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

            // Process queued requests
            processQueue(null, newToken);

            // Retry original request with new token
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          } else {
            throw new Error('Refresh failed');
          }
        } catch (refreshError) {
          console.error('Refresh token failed:', refreshError);

          // Clear tokens and redirect to login
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('currentCompany');
          localStorage.removeItem('fiscalYearId');
          delete api.defaults.headers.common['Authorization'];
          clearInactivityTimer();

          // Process queue with error
          processQueue(refreshError, null);

          if (window.location.pathname !== '/auth/login') {
            window.location.href = '/auth/login';
          }
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      // Handle non-401 errors or 401 errors that aren't token expiration
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

// Add refresh function that can be called manually
export const refreshToken = async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  try {
    const response = await axios.post(
      `${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5142'}/api/User/refresh-token`,
      {
        refreshToken,
        currentCompany: localStorage.getItem('currentCompany') || null,
        currentFiscalYear: localStorage.getItem('fiscalYearId') || null
      },
      { withCredentials: false }
    );

    if (response.data.success && response.data.token) {
      const newToken = response.data.token;
      localStorage.setItem('token', newToken);
      if (response.data.refreshToken) {
        localStorage.setItem('refreshToken', response.data.refreshToken);
      }
      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      resetInactivityTimer(); // Reset timer on successful refresh
      return newToken;
    }
    throw new Error('Refresh failed');
  } catch (error) {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('currentCompany');
    localStorage.removeItem('fiscalYearId');
    delete api.defaults.headers.common['Authorization'];
    clearInactivityTimer();
    throw error;
  }
};

export default api;