
// import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
// import { useDispatch, useSelector } from 'react-redux';
// import { setCredentials, logout as reduxLogout, setCurrentCompany } from '../auth/authSlice';
// import api from '../components/services/api';

// const AuthContext = createContext();

// export const useAuth = () => {
//   const context = useContext(AuthContext);
//   if (!context) {
//     throw new Error('useAuth must be used within an AuthProvider');
//   }
//   return context;
// };

// export const AuthProvider = ({ children }) => {
//   const dispatch = useDispatch();
//   const { userInfo, currentCompany } = useSelector((state) => state.auth);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);

//   useEffect(() => {
//   const initializeAuth = async () => {
//     try {
//       const token = localStorage.getItem('token');
//       if (token) {
//         // Set the token in axios headers
//         api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
//         // Get current user data (including companies)
//         const { data } = await api.get('/api/User/current');
        
//         if (data.success) {
//           dispatch(setCredentials({
//             user: data.user,
//             currentCompany: null,
//             userCompanies: data.companies || []
//           }));
//         } else {
//           throw new Error(data.error);
//         }
//       }
//     } catch (err) {
//       console.error('Auth initialization error:', err);
//       localStorage.removeItem('token');
//       delete api.defaults.headers.common['Authorization'];
//     } finally {
//       setLoading(false);
//     }
//   };

//   initializeAuth();
// }, [dispatch]);

//   const hasPermission = (requiredPermission) => {
//     if (!userInfo || !userInfo.permissions) return false;
//     return userInfo.permissions.includes(requiredPermission);
//   };

//   const clearAuthData = useCallback(() => {
//     localStorage.removeItem('token');
//     dispatch(reduxLogout());
//   }, [dispatch]);

//   const register = async (userData, options = {}) => {
//     try {
//       setLoading(true);
//       setError(null);

//       const { data } = await api.post('/api/User/register', userData);

//       if (options.autoLogin && data.token) {
//         localStorage.setItem('token', data.token);
//         await validateToken(data.token);
//       }

//       return data;
//     } catch (err) {
//       console.error('Registration error:', err);
//       const error = err.response?.data?.error ||
//         err.response?.data?.message ||
//         'Registration failed';
//       setError(error);
//       throw error;
//     } finally {
//       setLoading(false);
//     }
//   };

//   const validateToken = async (token) => {
//     try {
//       // Test the token by calling a protected endpoint
//       const { data } = await api.get('/api/User/protected');
//       if (data.userId) {
//         // Fetch user details
//         const userResponse = await api.get(`/api/User/${data.userId}`);
//         dispatch(setCredentials({
//           user: userResponse.data,
//           currentCompany: null
//         }));
//         return userResponse.data;
//       }
//       throw new Error('Invalid token');
//     } catch (err) {
//       clearAuthData();
//       throw err;
//     }
//   };

 
//   const login = async (credentials) => {
//     try {
//       setLoading(true);
//       setError(null);

//       const { data } = await api.post('/api/User/login', credentials);

//       console.log('Login response:', data);

//       if (!data.success || !data.token) {
//         throw new Error(data.error || 'Login failed');
//       }

//       // ⭐️ Store the JWT token
//       localStorage.setItem('token', data.token);

//       // ⭐️ Set Authorization header for future requests
//       api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;

//       // ⭐️ Dispatch user data AND companies to Redux
//       dispatch(setCredentials({
//         user: data.user,
//         currentCompany: null,
//         userCompanies: data.companies || [] // ⭐️ Store companies in Redux
//       }));

//       return {
//         success: true,
//         token: data.token,
//         user: data.user,
//         companies: data.companies || [], // ⭐️ Return companies
//         message: data.message,
//         redirectTo: '/user-dashboard'
//       };

//     } catch (err) {
//       console.error('Login error:', err);

//       let errorMessage = err.response?.data?.error ||
//         err.response?.data?.message ||
//         err.message ||
//         'Login failed';

//       if (err.response?.status === 401) {
//         errorMessage = 'Invalid email or password';
//       }

//       setError(errorMessage);
//       throw errorMessage;
//     } finally {
//       setLoading(false);
//     }
//   };

//   const logout = useCallback(async () => {
//     try {
//       setLoading(true);
//       // Call logout endpoint if you have one
//       await api.post('/api/User/logout');
//     } catch (err) {
//       console.error('Logout error:', err);
//     } finally {
//       // Always clear frontend auth state
//       clearAuthData();
//       delete api.defaults.headers.common['Authorization'];
//       // window.location.href = '/auth/login';
//       setLoading(false);
//     }
//   }, [clearAuthData]);

//   const switchCompany = async (companyId) => {
//     try {
//       setLoading(true);
//       setError(null);

//       const { data } = await api.get(`/api/switch/${companyId}`);

//       if (!data.success) {
//         throw new Error(data.message || 'Failed to switch company');
//       }

//       dispatch(setCurrentCompany({
//         company: data.data?.sessionData?.company || data.company,
//         fiscalYear: data.data?.sessionData?.fiscalYear
//       }));

//       return data;
//     } catch (err) {
//       const error = err.response?.data?.message || err.message || 'Failed to switch company';
//       setError(error);
//       throw error;
//     } finally {
//       setLoading(false);
//     }
//   };

//   const value = {
//     currentUser: userInfo,
//     currentCompany,
//     loading,
//     error,
//     hasPermission,
//     register,
//     login,
//     logout,
//     switchCompany,
//     clearError: () => setError(null),
//     validateToken
//   };

//   return (
//     <AuthContext.Provider value={value}>
//       {children}
//     </AuthContext.Provider>
//   );
// };

//------------------------------------------------------end1

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setCredentials, logout as reduxLogout, setCurrentCompany } from '../auth/authSlice';
import api from '../components/services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const dispatch = useDispatch();
  const { userInfo, currentCompany } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        const refreshToken = localStorage.getItem('refreshToken');
        
        if (token) {
          // Set the token in axios headers
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Get current user data (including companies)
          const { data } = await api.get('/api/User/current');
          
          if (data.success) {
            dispatch(setCredentials({
              user: data.user,
              currentCompany: null,
              userCompanies: data.companies || []
            }));
            
            // Reset activity timer on successful auth
            if (window.resetActivityTimer) {
              window.resetActivityTimer();
            }
          } else {
            throw new Error(data.error || 'Failed to fetch user data');
          }
        } else if (refreshToken) {
          // If only refresh token exists, try to refresh
          try {
            const response = await api.post('/api/User/refresh-token', { refreshToken });
            if (response.data.success) {
              const newToken = response.data.token;
              const newRefreshToken = response.data.refreshToken;
              
              localStorage.setItem('token', newToken);
              localStorage.setItem('refreshToken', newRefreshToken);
              api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
              
              // Fetch user data with new token
              const { data } = await api.get('/api/User/current');
              if (data.success) {
                dispatch(setCredentials({
                  user: data.user,
                  currentCompany: null,
                  userCompanies: data.companies || []
                }));
              }
            }
          } catch (refreshError) {
            console.error('Auto-refresh failed:', refreshError);
            clearAuthData();
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        // Only clear tokens if it's a 401 error
        if (err.response?.status === 401) {
          clearAuthData();
        }
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [dispatch]);

  const hasPermission = (requiredPermission) => {
    if (!userInfo || !userInfo.permissions) return false;
    return userInfo.permissions.includes(requiredPermission);
  };

  const clearAuthData = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('companies');
    delete api.defaults.headers.common['Authorization'];
    dispatch(reduxLogout());
    
    // Clear activity timer
    if (window.clearActivityTimer) {
      window.clearActivityTimer();
    }
  }, [dispatch]);

  const register = async (userData, options = {}) => {
    try {
      setLoading(true);
      setError(null);

      const { data } = await api.post('/api/User/register', userData);

      if (options.autoLogin && data.token) {
        localStorage.setItem('token', data.token);
        // If refresh token is returned, store it
        if (data.refreshToken) {
          localStorage.setItem('refreshToken', data.refreshToken);
        }
        await validateToken(data.token);
      }

      return data;
    } catch (err) {
      console.error('Registration error:', err);
      const error = err.response?.data?.error ||
        err.response?.data?.message ||
        'Registration failed';
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const validateToken = async (token) => {
    try {
      // Test the token by calling a protected endpoint
      const { data } = await api.get('/api/User/protected');
      if (data.userId) {
        // Fetch user details
        const userResponse = await api.get(`/api/User/${data.userId}`);
        dispatch(setCredentials({
          user: userResponse.data,
          currentCompany: null
        }));
        return userResponse.data;
      }
      throw new Error('Invalid token');
    } catch (err) {
      clearAuthData();
      throw err;
    }
  };

  const login = async (credentials) => {
    try {
      setLoading(true);
      setError(null);

      const { data } = await api.post('/api/User/login', credentials);

      console.log('Login response:', data);

      if (!data.success || !data.token) {
        throw new Error(data.error || 'Login failed');
      }

      // Store both tokens
      localStorage.setItem('token', data.token);
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }

      // Store user data
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      // Store companies if available
      if (data.companies) {
        localStorage.setItem('companies', JSON.stringify(data.companies));
      }

      // Set Authorization header for future requests
      api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;

      // Dispatch user data AND companies to Redux
      dispatch(setCredentials({
        user: data.user,
        currentCompany: null,
        userCompanies: data.companies || []
      }));

      // Reset activity timer on successful login
      if (window.resetActivityTimer) {
        window.resetActivityTimer();
      }

      return {
        success: true,
        token: data.token,
        refreshToken: data.refreshToken,
        user: data.user,
        companies: data.companies || [],
        message: data.message || 'Login successful',
        redirectTo: '/user-dashboard'
      };

    } catch (err) {
      console.error('Login error:', err);

      let errorMessage = err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Login failed';

      if (err.response?.status === 401) {
        errorMessage = err.response?.data?.error || 'Invalid email or password';
      }

      setError(errorMessage);
      throw errorMessage;
    } finally {
      setLoading(false);
    }
  };

  const logout = useCallback(async () => {
    try {
      setLoading(true);
      
      // Call logout endpoint to clear refresh token on server
      const token = localStorage.getItem('token');
      if (token) {
        try {
          await api.post('/api/User/logout', {}, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
        } catch (err) {
          console.error('Server logout error:', err);
          // Continue with client-side logout even if server fails
        }
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      // Always clear frontend auth state
      clearAuthData();
      
      // Reset activity timer
      if (window.clearActivityTimer) {
        window.clearActivityTimer();
      }
      
      // Redirect to login page
      window.location.href = '/auth/login';
      setLoading(false);
    }
  }, [clearAuthData]);

  const switchCompany = async (companyId) => {
    try {
      setLoading(true);
      setError(null);

      const { data } = await api.get(`/api/switch/${companyId}`);

      if (!data.success) {
        throw new Error(data.message || 'Failed to switch company');
      }

      dispatch(setCurrentCompany({
        company: data.data?.sessionData?.company || data.company,
        fiscalYear: data.data?.sessionData?.fiscalYear
      }));

      // Reset activity timer on company switch
      if (window.resetActivityTimer) {
        window.resetActivityTimer();
      }

      return data;
    } catch (err) {
      const error = err.response?.data?.message || err.message || 'Failed to switch company';
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Function to refresh token manually
  const refreshToken = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await api.post('/api/User/refresh-token', { refreshToken });
      
      if (response.data.success) {
        const newToken = response.data.token;
        const newRefreshToken = response.data.refreshToken;
        
        localStorage.setItem('token', newToken);
        if (newRefreshToken) {
          localStorage.setItem('refreshToken', newRefreshToken);
        }
        
        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        
        return {
          success: true,
          token: newToken,
          refreshToken: newRefreshToken
        };
      }
      throw new Error('Refresh failed');
    } catch (err) {
      console.error('Manual refresh failed:', err);
      clearAuthData();
      throw err;
    }
  }, [clearAuthData]);

  const value = {
    currentUser: userInfo,
    currentCompany,
    loading,
    error,
    hasPermission,
    register,
    login,
    logout,
    switchCompany,
    refreshToken,
    clearError: () => setError(null),
    validateToken,
    clearAuthData
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};