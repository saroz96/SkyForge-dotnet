// import React, { useState, useEffect, createContext, useContext } from 'react';
// import '../stylesheet/loader.css'

// const LoadingContext = createContext();

// // Loader Component with rotating SVG animation
// const Loader = () => {
//   return (
//     <div className="loader-overlay">
//       <div className="loader-content">
//         <div className="loader-spinner">
//           <svg
//             xmlns="http://www.w3.org/2000/svg"
//             viewBox="0 0 100 100"
//             preserveAspectRatio="xMidYMid"
//             className="loading-svg"
//           >
//             <circle
//               cx="50"
//               cy="50"
//               r="40"
//               strokeWidth="8"
//               stroke="#2c7be5"
//               strokeDasharray="62.83 62.83"
//               fill="none"
//               strokeLinecap="round"
//             >
//               <animateTransform
//                 attributeName="transform"
//                 type="rotate"
//                 repeatCount="indefinite"
//                 dur="1.5s"
//                 keyTimes="0;1"
//                 values="0 50 50;360 50 50"
//               />
//             </circle>
//             <circle
//               cx="50"
//               cy="50"
//               r="33"
//               strokeWidth="8"
//               stroke="#e63757"
//               strokeDasharray="51.84 51.84"
//               strokeDashoffset="51.84"
//               fill="none"
//               strokeLinecap="round"
//             >
//               <animateTransform
//                 attributeName="transform"
//                 type="rotate"
//                 repeatCount="indefinite"
//                 dur="1.8s"
//                 keyTimes="0;1"
//                 values="0 50 50;-360 50 50"
//               />
//             </circle>
//           </svg>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Loader;

//-----------------------------------------------------end

// import React, { useState, useEffect, createContext, useContext } from 'react';
// import '../stylesheet/loader.css';

// const LoadingContext = createContext();

// // YouTube-style Top Progress Bar Component
// const TopProgressBar = ({ isLoading }) => {
//   const [progress, setProgress] = useState(0);

//   useEffect(() => {
//     if (isLoading) {
//       // Animate progress from 0 to 90% while loading
//       setProgress(0);
//       const interval = setInterval(() => {
//         setProgress(prev => {
//           if (prev >= 90) {
//             clearInterval(interval);
//             return 90;
//           }
//           return prev + Math.random() * 10;
//         });
//       }, 200);
//       return () => clearInterval(interval);
//     } else {
//       // Complete to 100% and hide
//       setProgress(100);
//       const timeout = setTimeout(() => {
//         setProgress(0);
//       }, 300);
//       return () => clearTimeout(timeout);
//     }
//   }, [isLoading]);

//   if (progress === 0) return null;

//   return (
//     <div className="top-progress-bar">
//       <div 
//         className="top-progress-bar-fill" 
//         style={{ width: `${progress}%` }}
//       />
//     </div>
//   );
// };

// // Optional: Full page loader with spinner (for initial load)
// const FullPageLoader = () => {
//   return (
//     <div className="full-page-loader-overlay">
//       <div className="full-page-loader-content">
//         <div className="full-page-loader-spinner">
//           <svg
//             xmlns="http://www.w3.org/2000/svg"
//             viewBox="0 0 100 100"
//             preserveAspectRatio="xMidYMid"
//             className="loading-svg"
//           >
//             <circle
//               cx="50"
//               cy="50"
//               r="40"
//               strokeWidth="8"
//               stroke="#2c7be5"
//               strokeDasharray="62.83 62.83"
//               fill="none"
//               strokeLinecap="round"
//             >
//               <animateTransform
//                 attributeName="transform"
//                 type="rotate"
//                 repeatCount="indefinite"
//                 dur="1.5s"
//                 keyTimes="0;1"
//                 values="0 50 50;360 50 50"
//               />
//             </circle>
//             <circle
//               cx="50"
//               cy="50"
//               r="33"
//               strokeWidth="8"
//               stroke="#e63757"
//               strokeDasharray="51.84 51.84"
//               strokeDashoffset="51.84"
//               fill="none"
//               strokeLinecap="round"
//             >
//               <animateTransform
//                 attributeName="transform"
//                 type="rotate"
//                 repeatCount="indefinite"
//                 dur="1.8s"
//                 keyTimes="0;1"
//                 values="0 50 50;-360 50 50"
//               />
//             </circle>
//           </svg>
//         </div>
//         <div className="full-page-loader-text">Loading...</div>
//       </div>
//     </div>
//   );
// };

// // Main Loader Component - Choose between top bar or full page
// const Loader = ({ type = 'topbar', isLoading = false }) => {
//   // If type is 'topbar', show YouTube-style progress bar
//   if (type === 'topbar') {
//     return <TopProgressBar isLoading={isLoading} />;
//   }
  
//   // If type is 'fullpage' or default, show full page loader
//   return <FullPageLoader />;
// };

// // Loading Provider for global loading state
// export const LoadingProvider = ({ children }) => {
//   const [isLoading, setIsLoading] = useState(false);

//   const showLoader = () => setIsLoading(true);
//   const hideLoader = () => setIsLoading(false);

//   return (
//     <LoadingContext.Provider value={{ isLoading, showLoader, hideLoader }}>
//       {children}
//       <Loader type="topbar" isLoading={isLoading} />
//     </LoadingContext.Provider>
//   );
// };

// // Custom hook to use loading context
// export const useLoading = () => {
//   const context = useContext(LoadingContext);
//   if (!context) {
//     throw new Error('useLoading must be used within LoadingProvider');
//   }
//   return context;
// };

// export default Loader;


//---------------------------------------------------------------end

// // components/Loader.js
// import React, { useState, useEffect, useRef } from 'react';

// // YouTube-style Top Progress Bar Component with real progress tracking
// const TopProgressBar = ({ progress, isLoading }) => {
//   if (!isLoading && progress === 0) return null;

//   return (
//     <>
//       <style>{`
//         .top-progress-bar {
//           position: fixed;
//           top: 0;
//           left: 0;
//           right: 0;
//           height: 3px;
//           background-color: rgba(229, 55, 87, 0.2);
//           z-index: 10000;
//           overflow: hidden;
//         }

//         .top-progress-bar-fill {
//           height: 100%;
//           background: linear-gradient(90deg, #e63757, #ff6b6b, #e63757);
//           background-size: 200% 100%;
//           transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
//           animation: progressShimmer 1.5s ease-in-out infinite;
//           border-radius: 2px;
//           box-shadow: 0 0 6px rgba(230, 55, 87, 0.8);
//         }

//         @keyframes progressShimmer {
//           0% {
//             background-position: 200% 0;
//           }
//           100% {
//             background-position: -200% 0;
//           }
//         }

//         @media (max-width: 768px) {
//           .top-progress-bar {
//             height: 2px;
//           }
//         }
//       `}</style>
//       <div className="top-progress-bar">
//         <div className="top-progress-bar-fill" style={{ width: `${progress}%` }} />
//       </div>
//     </>
//   );
// };

// // Progress Tracker
// class ProgressTracker {
//   constructor(onProgress) {
//     this.onProgress = onProgress;
//     this.startTime = null;
//     this.duration = null;
//     this.animationFrame = null;
//     this.currentProgress = 0;
//   }

//   start(expectedDuration = 3000) {
//     this.startTime = Date.now();
//     this.duration = expectedDuration;
//     this.updateProgress();
//   }

//   updateProgress() {
//     const elapsed = Date.now() - this.startTime;
//     let progress = Math.min((elapsed / this.duration) * 100, 99);
//     progress = Math.pow(progress / 100, 1.5) * 100;
    
//     this.currentProgress = Math.min(progress, 99);
//     this.onProgress(this.currentProgress);
    
//     if (progress < 99) {
//       this.animationFrame = requestAnimationFrame(() => this.updateProgress());
//     }
//   }

//   complete() {
//     if (this.animationFrame) {
//       cancelAnimationFrame(this.animationFrame);
//     }
//     this.onProgress(100);
//     setTimeout(() => {
//       this.onProgress(0);
//     }, 300);
//   }

//   setProgress(progress) {
//     this.currentProgress = Math.min(progress, 99);
//     this.onProgress(this.currentProgress);
//   }
// }

// // Main Loader Component
// const Loader = ({ type = 'topbar', isLoading = false, progress = 0 }) => {
//   if (type === 'topbar') {
//     return <TopProgressBar progress={progress} isLoading={isLoading} />;
//   }
//   return null;
// };

// export default Loader;
// export { ProgressTracker };

//---------------------------------------------------end

// components/Loader.js
import React, { useState, useEffect, useRef } from 'react';

// YouTube-style Top Progress Bar Component with real progress tracking
const TopProgressBar = ({ progress, isLoading }) => {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (isLoading && progress > 0 && progress < 100) {
      // Small delay before showing to avoid flash for fast loads
      timeoutRef.current = setTimeout(() => setVisible(true), 100);
    } else if (!isLoading || progress >= 100) {
      clearTimeout(timeoutRef.current);
      // Keep visible for a moment after completion for smooth exit
      if (progress >= 100) {
        setTimeout(() => setVisible(false), 300);
      } else {
        setVisible(false);
      }
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isLoading, progress]);

  if (!visible && (progress === 0 || progress >= 100)) return null;

  return (
    <>
      <style>{`
        .youtube-progress-bar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background-color: transparent;
          z-index: 10000;
          overflow: hidden;
        }

        .youtube-progress-bar-fill {
          height: 100%;
          background: #e63757;
          background: linear-gradient(90deg, #e63757 0%, #ff6b6b 50%, #e63757 100%);
          background-size: 200% 100%;
          width: 0%;
          transition: width 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          animation: youtubeShimmer 1s ease-in-out infinite;
          box-shadow: 0 0 4px rgba(230, 55, 87, 0.5);
        }

        @keyframes youtubeShimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }

        /* Optional: Add a subtle glow effect */
        .youtube-progress-bar-fill::after {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          width: 100px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          animation: youtubeGlow 1.5s ease-in-out infinite;
        }

        @keyframes youtubeGlow {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(200%);
          }
        }

        @media (max-width: 768px) {
          .youtube-progress-bar {
            height: 2px;
          }
        }
      `}</style>
      <div className="youtube-progress-bar">
        <div className="youtube-progress-bar-fill" style={{ width: `${Math.min(progress, 100)}%` }} />
      </div>
    </>
  );
};

// Enhanced Progress Tracker with YouTube-like behavior
class ProgressTracker {
  constructor(onProgress) {
    this.onProgress = onProgress;
    this.startTime = null;
    this.duration = null;
    this.animationFrame = null;
    this.currentProgress = 0;
    this.isComplete = false;
  }

  start(expectedDuration = 3000) {
    this.startTime = Date.now();
    this.duration = expectedDuration;
    this.isComplete = false;
    this.currentProgress = 0;
    this.updateProgress();
  }

  updateProgress() {
    if (this.isComplete) return;
    
    const elapsed = Date.now() - this.startTime;
    let progress = Math.min((elapsed / this.duration) * 100, 99);
    
    // YouTube-like easing curve: fast start, slow middle, fast end
    if (progress < 30) {
      // Fast start
      progress = progress * 1.2;
    } else if (progress < 70) {
      // Slow middle
      progress = 30 + (progress - 30) * 0.8;
    } else {
      // Fast end
      progress = 70 + (progress - 70) * 1.1;
    }
    
    progress = Math.min(progress, 99);
    
    // Only update if progress increased
    if (progress > this.currentProgress) {
      this.currentProgress = progress;
      this.onProgress(this.currentProgress);
    }
    
    if (progress < 99) {
      this.animationFrame = requestAnimationFrame(() => this.updateProgress());
    }
  }

  complete() {
    this.isComplete = true;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    // Jump to 100% immediately
    this.onProgress(100);
    // Reset after animation completes
    setTimeout(() => {
      this.onProgress(0);
      this.currentProgress = 0;
    }, 300);
  }

  setProgress(progress) {
    if (this.isComplete) return;
    // Cap at 99% for actual progress (YouTube never shows 100% until done)
    const cappedProgress = Math.min(progress, 99);
    if (cappedProgress > this.currentProgress) {
      this.currentProgress = cappedProgress;
      this.onProgress(this.currentProgress);
    }
  }
}

// Main Loader Component
const Loader = ({ type = 'topbar', isLoading = false, progress = 0 }) => {
  if (type === 'topbar') {
    return <TopProgressBar progress={progress} isLoading={isLoading} />;
  }
  return null;
};

export default Loader;
export { ProgressTracker };