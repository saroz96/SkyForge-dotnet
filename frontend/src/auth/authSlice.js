
// import { createSlice } from '@reduxjs/toolkit';

// const initialState = {
//   userInfo: null,
//   currentCompany: null,
//   userCompanies: [],
//   token: null,
// };

// const authSlice = createSlice({
//   name: 'auth',
//   initialState,
//   reducers: {
//     setCredentials: (state, action) => {
//       state.userInfo = action.payload.user;
//       state.currentCompany = action.payload.currentCompany;
//       state.userCompanies = action.payload.userCompanies || [];
//       state.token = action.payload.token;
//     },
    
//     // Add this action to set user info only
//     setUserInfo: (state, action) => {
//       state.userInfo = action.payload;
//     },
    
//     setCurrentCompany: (state, action) => {
//       state.currentCompany = action.payload.company;
//       // Also save fiscal year if provided
//       if (action.payload.fiscalYear) {
//         state.currentCompany = {
//           ...state.currentCompany,
//           fiscalYear: action.payload.fiscalYear
//         };
//       }
//     },
    
//     setUserCompanies: (state, action) => {
//       state.userCompanies = action.payload;
//     },
    
//     // Add this to update only token
//     setToken: (state, action) => {
//       state.token = action.payload;
//     },
    
//     logout: (state) => {
//       state.userInfo = null;
//       state.currentCompany = null;
//       state.userCompanies = [];
//       state.token = null;
//     },
    
//     // Add this to clear specific data if needed
//     clearCurrentCompany: (state) => {
//       state.currentCompany = null;
//     },
    
//     // Add this to clear user companies
//     clearUserCompanies: (state) => {
//       state.userCompanies = [];
//     },
//   },
// });

// export const { 
//   setCredentials, 
//   setUserInfo, 
//   setCurrentCompany, 
//   setUserCompanies, 
//   setToken,
//   logout,
//   clearCurrentCompany,
//   clearUserCompanies 
// } = authSlice.actions;

// export default authSlice.reducer;

//-------------------------------------------end1

import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  userInfo: null,
  currentCompany: null,
  userCompanies: [],
  token: null,
  refreshToken: null, // Add refresh token to state
  isLoading: false,
  error: null,
  isAuthenticated: false,
  tokenExpiry: null, // Track token expiry time
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      const { user, currentCompany, userCompanies, token, refreshToken, expiresIn } = action.payload;
      
      state.userInfo = user;
      state.currentCompany = currentCompany || null;
      state.userCompanies = userCompanies || [];
      state.token = token || null;
      state.refreshToken = refreshToken || null;
      state.isAuthenticated = !!token;
      
      // Calculate token expiry if expiresIn is provided
      if (expiresIn) {
        state.tokenExpiry = Date.now() + (expiresIn * 1000);
      } else if (token) {
        // Try to decode token to get expiry
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.exp) {
            state.tokenExpiry = payload.exp * 1000;
          }
        } catch (e) {
          // If can't decode, set to 1 hour from now
          state.tokenExpiry = Date.now() + (3600 * 1000);
        }
      }
      
      state.error = null;
      state.isLoading = false;
    },
    
    setUserInfo: (state, action) => {
      state.userInfo = action.payload;
    },
    
    setCurrentCompany: (state, action) => {
      state.currentCompany = action.payload.company;
      // Also save fiscal year if provided
      if (action.payload.fiscalYear) {
        state.currentCompany = {
          ...state.currentCompany,
          fiscalYear: action.payload.fiscalYear
        };
      }
    },
    
    setUserCompanies: (state, action) => {
      state.userCompanies = action.payload;
    },
    
    setToken: (state, action) => {
      state.token = action.payload;
      state.isAuthenticated = !!action.payload;
      
      // Update token expiry
      if (action.payload) {
        try {
          const payload = JSON.parse(atob(action.payload.split('.')[1]));
          if (payload.exp) {
            state.tokenExpiry = payload.exp * 1000;
          }
        } catch (e) {
          state.tokenExpiry = Date.now() + (3600 * 1000);
        }
      } else {
        state.tokenExpiry = null;
      }
    },
    
    setRefreshToken: (state, action) => {
      state.refreshToken = action.payload;
    },
    
    setTokenExpiry: (state, action) => {
      state.tokenExpiry = action.payload;
    },
    
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    
    setError: (state, action) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    
    clearError: (state) => {
      state.error = null;
    },
    
    logout: (state) => {
      state.userInfo = null;
      state.currentCompany = null;
      state.userCompanies = [];
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.tokenExpiry = null;
      state.error = null;
      state.isLoading = false;
    },
    
    clearCurrentCompany: (state) => {
      state.currentCompany = null;
    },
    
    clearUserCompanies: (state) => {
      state.userCompanies = [];
    },
    
    // Update token when refreshed
    updateTokens: (state, action) => {
      const { token, refreshToken, expiresIn } = action.payload;
      
      if (token) {
        state.token = token;
        state.isAuthenticated = true;
        
        // Update token expiry
        if (expiresIn) {
          state.tokenExpiry = Date.now() + (expiresIn * 1000);
        } else {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (payload.exp) {
              state.tokenExpiry = payload.exp * 1000;
            }
          } catch (e) {
            state.tokenExpiry = Date.now() + (3600 * 1000);
          }
        }
      }
      
      if (refreshToken) {
        state.refreshToken = refreshToken;
      }
      
      state.error = null;
    },
    
    // Check if token is expired
    checkTokenExpiry: (state) => {
      if (state.tokenExpiry && state.tokenExpiry < Date.now()) {
        state.isAuthenticated = false;
        // Optionally clear token if expired
        // state.token = null;
      }
    },
    
    // Refresh token failed - clear auth state
    refreshFailed: (state) => {
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.tokenExpiry = null;
      state.userInfo = null;
      state.userCompanies = [];
      state.currentCompany = null;
    }
  },
});

// Selectors
export const selectAuth = (state) => state.auth;
export const selectUser = (state) => state.auth.userInfo;
export const selectToken = (state) => state.auth.token;
export const selectRefreshToken = (state) => state.auth.refreshToken;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectUserCompanies = (state) => state.auth.userCompanies;
export const selectCurrentCompany = (state) => state.auth.currentCompany;
export const selectTokenExpiry = (state) => state.auth.tokenExpiry;
export const selectIsLoading = (state) => state.auth.isLoading;
export const selectError = (state) => state.auth.error;

// Check if token is expired
export const selectIsTokenExpired = (state) => {
  const { tokenExpiry } = state.auth;
  return tokenExpiry ? tokenExpiry < Date.now() : true;
};

// Get time until token expires (in seconds)
export const selectTokenExpiryTime = (state) => {
  const { tokenExpiry } = state.auth;
  if (!tokenExpiry) return 0;
  return Math.max(0, Math.floor((tokenExpiry - Date.now()) / 1000));
};

export const { 
  setCredentials, 
  setUserInfo, 
  setCurrentCompany, 
  setUserCompanies, 
  setToken,
  setRefreshToken,
  setTokenExpiry,
  setLoading,
  setError,
  clearError,
  logout,
  clearCurrentCompany,
  clearUserCompanies,
  updateTokens,
  checkTokenExpiry,
  refreshFailed
} = authSlice.actions;

export default authSlice.reducer;