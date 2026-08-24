// // src/hooks/useSessionManager.js
// import { useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { setLogoutCallback } from '../components/services/api';

// export const useSessionManager = () => {
//     const navigate = useNavigate();
    
//     const handleLogout = () => {
//         console.log('Session expired - logging out');
//         localStorage.removeItem('token');
//         localStorage.removeItem('refreshToken');
//         navigate('/auth/login');
//     };
    
//     useEffect(() => {
//         // Set the logout callback for the api
//         setLogoutCallback(handleLogout);
        
//         // Cleanup
//         return () => {
//             setLogoutCallback(null);
//         };
//     }, []);
    
//     return { handleLogout };
// };

//----------------------------------------end1

// src/hooks/useSessionManager.js
import { useEffect } from 'react';

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export const useSessionManager = (onLogout) => {
    useEffect(() => {
        let inactivityTimer = null;
        
        const handleLogout = () => {
            console.log('User inactive for 30 minutes. Logging out...');
            if (onLogout) {
                onLogout();
            } else {
                // Default logout behavior
                localStorage.removeItem('token');
                localStorage.removeItem('refreshToken');
                if (window.location.pathname !== '/auth/login') {
                    window.location.href = '/auth/login';
                }
            }
        };
        
        const resetTimer = () => {
            if (inactivityTimer) {
                clearTimeout(inactivityTimer);
            }
            inactivityTimer = setTimeout(handleLogout, INACTIVITY_TIMEOUT);
        };
        
        const clearTimer = () => {
            if (inactivityTimer) {
                clearTimeout(inactivityTimer);
                inactivityTimer = null;
            }
        };
        
        // Set up event listeners for user activity
        const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'click', 'mousemove'];
        events.forEach(event => {
            document.addEventListener(event, resetTimer);
        });
        
        // Initial timer start
        resetTimer();
        
        // Expose functions globally for API interceptors
        window.resetActivityTimer = resetTimer;
        window.clearActivityTimer = clearTimer;
        
        // Cleanup
        return () => {
            events.forEach(event => {
                document.removeEventListener(event, resetTimer);
            });
            clearTimer();
            delete window.resetActivityTimer;
            delete window.clearActivityTimer;
        };
    }, [onLogout]);
};