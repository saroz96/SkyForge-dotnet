// // context/LoadingContext.js
// import React, { createContext, useContext, useState } from 'react';

// import Loader from '../components/Loader';

// const LoadingContext = createContext();

// export const useLoading = () => {
//   return useContext(LoadingContext);
// };

// export const LoadingProvider = ({ children }) => {
//   const [loading, setLoading] = useState(false);

//   const showLoading = () => setLoading(true);
//   const hideLoading = () => setLoading(false);

//   return (
//     <LoadingContext.Provider value={{ loading, showLoading, hideLoading }}>
//       {children}
//       {loading && <Loader />}
//     </LoadingContext.Provider>
//   );
// };

//--------------------------------------------------------------------------end

// context/LoadingContext.js
import React, { createContext, useContext, useState, useRef } from 'react';
import Loader, { ProgressTracker } from '../components/Loader';

const LoadingContext = createContext();

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within LoadingProvider');
  }
  return context;
};

export const LoadingProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const trackerRef = useRef(null);
  const requestCount = useRef(0);

  const showLoading = (expectedDuration = 3000) => {
    requestCount.current++;
    
    if (requestCount.current === 1) {
      setIsLoading(true);
      setProgress(0);
      
      if (trackerRef.current) {
        trackerRef.current.start(expectedDuration);
      } else {
        trackerRef.current = new ProgressTracker(setProgress);
        trackerRef.current.start(expectedDuration);
      }
    }
  };

  const hideLoading = () => {
    requestCount.current--;
    
    if (requestCount.current === 0) {
      if (trackerRef.current) {
        trackerRef.current.complete();
        setTimeout(() => {
          setIsLoading(false);
          setProgress(0);
        }, 300);
      } else {
        setIsLoading(false);
        setProgress(0);
      }
    }
  };

  const updateProgress = (newProgress) => {
    if (trackerRef.current) {
      trackerRef.current.setProgress(newProgress);
    } else {
      setProgress(Math.min(newProgress, 99));
    }
  };

  const resetLoading = () => {
    requestCount.current = 0;
    setIsLoading(false);
    setProgress(0);
    if (trackerRef.current) {
      trackerRef.current.complete();
    }
  };

  return (
    <LoadingContext.Provider value={{ 
      isLoading, 
      progress, 
      showLoading, 
      hideLoading, 
      updateProgress,
      resetLoading 
    }}>
      {children}
      <Loader type="topbar" isLoading={isLoading} progress={progress} />
    </LoadingContext.Provider>
  );
};