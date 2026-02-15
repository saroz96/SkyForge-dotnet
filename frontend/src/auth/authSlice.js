
// // In your authSlice.js
// import { createSlice } from '@reduxjs/toolkit';

// const initialState = {
//   userInfo: null,
//   currentCompany: null,
//   userCompanies: [], // ⭐️ Add this
//   token: null,
// };

// const authSlice = createSlice({
//   name: 'auth',
//   initialState,
//   reducers: {
//     setCredentials: (state, action) => {
//       state.userInfo = action.payload.user;
//       state.currentCompany = action.payload.currentCompany;
//       state.userCompanies = action.payload.userCompanies || []; // ⭐️ Store companies
//       state.token = action.payload.token;
//     },
//     setCurrentCompany: (state, action) => {
//       state.currentCompany = action.payload.company;
//     },
//     setUserCompanies: (state, action) => { // ⭐️ Add this reducer
//       state.userCompanies = action.payload;
//     },
//     logout: (state) => {
//       state.userInfo = null;
//       state.currentCompany = null;
//       state.userCompanies = []; // ⭐️ Clear companies
//       state.token = null;
//     },
//   },
// });

// export const { setCredentials, setCurrentCompany, setUserCompanies, logout } = authSlice.actions;
// export default authSlice.reducer;

// In your authSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  userInfo: null,
  currentCompany: null,
  userCompanies: [],
  token: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      state.userInfo = action.payload.user;
      state.currentCompany = action.payload.currentCompany;
      state.userCompanies = action.payload.userCompanies || [];
      state.token = action.payload.token;
    },
    
    // Add this action to set user info only
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
    
    // Add this to update only token
    setToken: (state, action) => {
      state.token = action.payload;
    },
    
    logout: (state) => {
      state.userInfo = null;
      state.currentCompany = null;
      state.userCompanies = [];
      state.token = null;
    },
    
    // Add this to clear specific data if needed
    clearCurrentCompany: (state) => {
      state.currentCompany = null;
    },
    
    // Add this to clear user companies
    clearUserCompanies: (state) => {
      state.userCompanies = [];
    },
  },
});

export const { 
  setCredentials, 
  setUserInfo, 
  setCurrentCompany, 
  setUserCompanies, 
  setToken,
  logout,
  clearCurrentCompany,
  clearUserCompanies 
} = authSlice.actions;

export default authSlice.reducer;