// // services/api.js
// import axios from 'axios';
// const api = axios.create({
//     baseURL: process.env.REACT_APP_API_BASE_URL||'http://localhost:5142',
//     withCredentials: false,
// });
// // Inject loading functions into Axios interceptors
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

import axios from 'axios';

// Create axios instance with JWT support
const api = axios.create({
    baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:5142',
    withCredentials: false,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request interceptor to add JWT token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
         console.log('Request URL:', config.url);
    console.log('Request Headers:', config.headers);
    console.log('Full token:', token);
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('Token payload:', payload);
      } catch (e) {
        console.log('Could not decode token');
      }
    }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle token expiration
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('token');
            delete api.defaults.headers.common['Authorization'];
            
            // Redirect to login if not already there
            if (window.location.pathname !== '/auth/login') {
                window.location.href = '/auth/login';
            }
        }
        return Promise.reject(error);
    }
);

// Optional: Loading interceptors
export const setupInterceptors = (showLoading, hideLoading) => {
    api.interceptors.request.use(
        (config) => {
            showLoading();
            return config;
        },
        (error) => {
            hideLoading();
            return Promise.reject(error);
        }
    );

    api.interceptors.response.use(
        (response) => {
            hideLoading();
            return response;
        },
        (error) => {
            hideLoading();
            return Promise.reject(error);
        }
    );
};

export default api;