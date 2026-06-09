// import { useState, useCallback } from 'react';

// const useCompanySplit = () => {
//     const [loading, setLoading] = useState(false);
//     const [error, setError] = useState(null);
//     const [progress, setProgress] = useState(0);
//     const [processLog, setProcessLog] = useState([]);

//     const addToLog = useCallback((message) => {
//         const timestamp = new Date().toLocaleTimeString();
//         setProcessLog(prev => [...prev, { timestamp, message }]);
//     }, []);

//     // Regular POST request (non-SSE)
//     const splitCompany = useCallback(async (splitData) => {
//         setLoading(true);
//         setError(null);
//         setProgress(0);
//         setProcessLog([]);

//         try {
//             addToLog('Starting company split process...');

//             const response = await fetch('/api/split-fiscal-year', {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                 },
//                 credentials: 'include',
//                 body: JSON.stringify(splitData)
//             });

//             if (!response.ok) {
//                 throw new Error(`HTTP error! status: ${response.status}`);
//             }

//             const result = await response.json();

//             if (result.success) {
//                 addToLog('Company split completed successfully!');
//                 return result;
//             } else {
//                 throw new Error(result.error);
//             }
//         } catch (err) {
//             const errorMsg = err.message || 'Failed to split company';
//             setError(errorMsg);
//             addToLog(`Error: ${errorMsg}`);
//             throw err;
//         } finally {
//             setLoading(false);
//         }
//     }, [addToLog]);

//     // SSE version for GET request
//     const splitCompanyWithSSE = useCallback((splitData) => {
//         return new Promise((resolve, reject) => {
//             setLoading(true);
//             setError(null);
//             setProgress(0);
//             setProcessLog([]);

//             // Create URL with query parameters for GET request
//             const params = new URLSearchParams();
//             params.append('sourceCompanyId', splitData.sourceCompanyId);
//             params.append('fiscalYearId', splitData.fiscalYearId);
//             params.append('newCompanyName', splitData.newCompanyName);
//             params.append('deleteAfterSplit', splitData.deleteAfterSplit.toString());

//             const url = `/api/split-fiscal-year?${params.toString()}`;

//             console.log('SSE GET URL:', url);

//             const eventSource = new EventSource(url, {
//                 withCredentials: true
//             });

//             eventSource.onopen = () => {
//                 addToLog('Connected to server, starting company split...');
//             };

//             eventSource.onmessage = (event) => {
//                 try {
//                     const data = JSON.parse(event.data);
//                     console.log('SSE Data received:', data);

//                     if (data.type === 'progress') {
//                         setProgress(data.value);
//                         if (data.message) addToLog(data.message);
//                     } else if (data.type === 'complete') {
//                         eventSource.close();
//                         setLoading(false);
//                         addToLog('Company split completed successfully!');
//                         resolve(data);
//                     } else if (data.type === 'error') {
//                         eventSource.close();
//                         setLoading(false);
//                         setError(data.error);
//                         addToLog(`Error: ${data.error}`);
//                         reject(new Error(data.error));
//                     }
//                 } catch (parseError) {
//                     console.error('Error parsing SSE data:', parseError);
//                 }
//             };

//             eventSource.onerror = (error) => {
//                 console.error('SSE Error:', error);
//                 eventSource.close();
//                 setLoading(false);
//                 const errorMsg = 'Connection to server failed';
//                 setError(errorMsg);
//                 addToLog(`Error: ${errorMsg}`);
//                 reject(new Error(errorMsg));
//             };
//         });
//     }, [addToLog]);

//     const reset = useCallback(() => {
//         setLoading(false);
//         setError(null);
//         setProgress(0);
//         setProcessLog([]);
//     }, []);

//     return {
//         loading,
//         error,
//         progress,
//         processLog,
//         splitCompany,
//         splitCompanyWithSSE,
//         reset,
//         addToLog
//     };
// };

// export default useCompanySplit;

//-------------------------------------------------------end

// // hooks/useCompanySplit.js
// import { useState, useCallback } from 'react';
// import axios from 'axios';

// const useCompanySplit = () => {
//     const [loading, setLoading] = useState(false);
//     const [error, setError] = useState(null);
//     const [progress, setProgress] = useState(0);
//     const [processLog, setProcessLog] = useState([]);

//     const addToLog = useCallback((message) => {
//         const timestamp = new Date().toLocaleTimeString();
//         setProcessLog(prev => [...prev, { timestamp, message }]);
//     }, []);

//     const api = axios.create({
//         baseURL: process.env.REACT_APP_API_BASE_URL,
//         withCredentials: true,
//     });

//     // Add Authorization header to all requests
//     api.interceptors.request.use(config => {
//         const token = localStorage.getItem('token');
//         if (token) {
//             config.headers.Authorization = `Bearer ${token}`;
//         }
//         return config;
//     });

//     // SSE version for GET request (matching backend endpoint)
//     const splitCompanyWithSSE = useCallback((splitData) => {
//         return new Promise((resolve, reject) => {
//             setLoading(true);
//             setError(null);
//             setProgress(0);
//             setProcessLog([]);

//             // Create URL with query parameters for GET request
//             const params = new URLSearchParams();
//             params.append('sourceCompanyId', splitData.sourceCompanyId);
//             params.append('fiscalYearId', splitData.fiscalYearId);
//             params.append('newCompanyName', splitData.newCompanyName);
//             params.append('deleteAfterSplit', splitData.deleteAfterSplit.toString());

//             const baseURL = process.env.REACT_APP_API_BASE_URL || '';
//             const url = `${baseURL}/api/FiscalYears/split-fiscal-year?${params.toString()}`;

//             console.log('SSE GET URL:', url);

//             const eventSource = new EventSource(url, {
//                 withCredentials: true
//             });

//             let eventSourceReady = true;

//             eventSource.onopen = () => {
//                 addToLog('Connected to server, starting company split...');
//             };

//             eventSource.onmessage = (event) => {
//                 try {
//                     const data = JSON.parse(event.data);
//                     console.log('SSE Data received:', data);

//                     if (data.type === 'progress') {
//                         setProgress(data.value || 0);
//                         if (data.message) addToLog(data.message);
//                     } else if (data.type === 'complete') {
//                         eventSource.close();
//                         setLoading(false);
//                         addToLog('Company split completed successfully!');
//                         if (data.data && data.data.success) {
//                             resolve(data.data);
//                         } else {
//                             resolve(data);
//                         }
//                     } else if (data.type === 'log') {
//                         if (data.message) addToLog(data.message);
//                     } else if (data.type === 'error') {
//                         eventSource.close();
//                         setLoading(false);
//                         const errorMsg = data.error || 'An error occurred during company split';
//                         setError(errorMsg);
//                         addToLog(`Error: ${errorMsg}`);
//                         if (data.details) {
//                             console.error('Error details:', data.details);
//                         }
//                         reject(new Error(errorMsg));
//                     }
//                 } catch (parseError) {
//                     console.error('Error parsing SSE data:', parseError);
//                     addToLog(`Parse error: ${parseError.message}`);
//                 }
//             };

//             eventSource.onerror = (error) => {
//                 console.error('SSE Error:', error);
                
//                 // Don't close if we're already processing
//                 if (eventSourceReady) {
//                     eventSourceReady = false;
//                     eventSource.close();
//                     setLoading(false);
                    
//                     // Check if this is just a connection issue after completion
//                     if (progress < 100) {
//                         const errorMsg = 'Connection to server lost. Please check your network and try again.';
//                         setError(errorMsg);
//                         addToLog(`Error: ${errorMsg}`);
//                         reject(new Error(errorMsg));
//                     }
//                 }
//             };

//             // Store eventSource in a ref-like variable for cleanup
//             window.__currentSplitEventSource = eventSource;
//         });
//     }, [addToLog, progress]);

//     const cancelSplit = useCallback(() => {
//         if (window.__currentSplitEventSource) {
//             window.__currentSplitEventSource.close();
//             window.__currentSplitEventSource = null;
//         }
//         setLoading(false);
//         addToLog('Split operation cancelled by user');
//     }, [addToLog]);

//     const reset = useCallback(() => {
//         if (window.__currentSplitEventSource) {
//             window.__currentSplitEventSource.close();
//             window.__currentSplitEventSource = null;
//         }
//         setLoading(false);
//         setError(null);
//         setProgress(0);
//         setProcessLog([]);
//     }, []);

//     return {
//         loading,
//         error,
//         progress,
//         processLog,
//         splitCompanyWithSSE,
//         cancelSplit,
//         reset,
//         addToLog
//     };
// };

// export default useCompanySplit;

//-------------------------------------------------------end

// hooks/useCompanySplit.js
import { useState, useCallback } from 'react';
import axios from 'axios';

const useCompanySplit = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [progress, setProgress] = useState(0);
    const [processLog, setProcessLog] = useState([]);
    
    let eventSourceRef = null;

    const addToLog = useCallback((message) => {
        const timestamp = new Date().toLocaleTimeString();
        setProcessLog(prev => [...prev, { timestamp, message }]);
    }, []);

    const getAuthToken = () => {
        return localStorage.getItem('token');
    };

    // SSE version for GET request
    const splitCompanyWithSSE = useCallback((splitData) => {
        return new Promise((resolve, reject) => {
            setLoading(true);
            setError(null);
            setProgress(0);
            setProcessLog([]);

            // Get auth token
            const token = getAuthToken();
            
            // Create URL with query parameters
            const params = new URLSearchParams();
            params.append('sourceCompanyId', splitData.sourceCompanyId);
            params.append('fiscalYearId', splitData.fiscalYearId);
            params.append('newCompanyName', splitData.newCompanyName);
            params.append('deleteAfterSplit', splitData.deleteAfterSplit.toString());

            const baseURL = process.env.REACT_APP_API_BASE_URL || '';
            const url = `${baseURL}/api/FiscalYears/split-fiscal-year?${params.toString()}`;

            console.log('SSE GET URL:', url);

            // EventSource doesn't support custom headers, so we need to pass token in URL if required
            // or use fetch API with ReadableStream for better header support
            const eventSourceUrl = token ? `${url}&token=${encodeURIComponent(token)}` : url;
            const eventSource = new EventSource(eventSourceUrl, {
                withCredentials: true
            });
            
            eventSourceRef = eventSource;

            eventSource.onopen = () => {
                addToLog('Connected to server, starting company split...');
            };

            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('SSE Data received:', data);

                    if (data.type === 'progress') {
                        setProgress(data.value || 0);
                        if (data.message) addToLog(data.message);
                    } else if (data.type === 'complete') {
                        eventSource.close();
                        eventSourceRef = null;
                        setLoading(false);
                        addToLog('Company split completed successfully!');
                        if (data.data && data.data.success) {
                            resolve(data.data);
                        } else if (data.success) {
                            resolve(data);
                        } else {
                            resolve(data);
                        }
                    } else if (data.type === 'log') {
                        if (data.message) addToLog(data.message);
                    } else if (data.type === 'error') {
                        eventSource.close();
                        eventSourceRef = null;
                        setLoading(false);
                        const errorMsg = data.error || 'An error occurred during company split';
                        setError(errorMsg);
                        addToLog(`Error: ${errorMsg}`);
                        if (data.details) {
                            console.error('Error details:', data.details);
                        }
                        reject(new Error(errorMsg));
                    }
                } catch (parseError) {
                    console.error('Error parsing SSE data:', parseError);
                    addToLog(`Parse error: ${parseError.message}`);
                }
            };

            eventSource.onerror = (error) => {
                console.error('SSE Error:', error);
                
                if (eventSourceRef) {
                    eventSource.close();
                    eventSourceRef = null;
                }
                
                // Don't show error if we're already at 100% progress
                if (progress < 100) {
                    setLoading(false);
                    const errorMsg = 'Connection to server lost. Please check your network and try again.';
                    setError(errorMsg);
                    addToLog(`Error: ${errorMsg}`);
                    reject(new Error(errorMsg));
                } else {
                    setLoading(false);
                }
            };
        });
    }, [addToLog, progress]);

    const cancelSplit = useCallback(() => {
        if (eventSourceRef) {
            eventSourceRef.close();
            eventSourceRef = null;
        }
        setLoading(false);
        addToLog('Split operation cancelled by user');
    }, [addToLog]);

    const reset = useCallback(() => {
        if (eventSourceRef) {
            eventSourceRef.close();
            eventSourceRef = null;
        }
        setLoading(false);
        setError(null);
        setProgress(0);
        setProcessLog([]);
    }, []);

    return {
        loading,
        error,
        progress,
        processLog,
        splitCompanyWithSSE,
        cancelSplit,
        reset,
        addToLog
    };
};

export default useCompanySplit;