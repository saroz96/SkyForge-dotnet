// hooks/useCompanySplit.js
import { useState, useCallback, useRef } from 'react';

const useCompanySplit = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [progress, setProgress] = useState(0);
    const [processLog, setProcessLog] = useState([]);
    const [splitResult, setSplitResult] = useState(null);
    
    const abortControllerRef = useRef(null);

    const addToLog = useCallback((message) => {
        const timestamp = new Date().toLocaleTimeString();
        setProcessLog(prev => [...prev, { timestamp, message }]);
    }, []);

    const getAuthToken = () => {
        return localStorage.getItem('token');
    };

    const splitCompanyWithSSE = useCallback(async (splitData) => {
        setLoading(true);
        setError(null);
        setProgress(0);
        setProcessLog([]);
        setSplitResult(null);

        try {
            const token = getAuthToken();
            if (!token) {
                throw new Error('No authentication token found');
            }

            // Create URL with query parameters
            const params = new URLSearchParams({
                sourceCompanyId: splitData.sourceCompanyId,
                fiscalYearId: splitData.fiscalYearId,
                newCompanyName: splitData.newCompanyName,
                deleteAfterSplit: splitData.deleteAfterSplit.toString()
            });

            const baseURL = process.env.REACT_APP_API_BASE_URL || '';
            const url = `${baseURL}/api/FiscalYears/split-fiscal-year?${params.toString()}`;
            console.log('SSE GET URL:', url);

            // Create abort controller for cancellation
            abortControllerRef.current = new AbortController();

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'text/event-stream'
                },
                credentials: 'include',
                signal: abortControllerRef.current.signal
            });

            console.log('Response status:', response.status);
            console.log('Response headers:', response.headers);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error response:', errorText);
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            let buffer = '';
            let isComplete = false;
            let resultData = null;

            addToLog('Connected to server, starting company split...');

            while (!isComplete) {
                const { value, done } = await reader.read();
                if (done) {
                    console.log('Stream ended');
                    break;
                }

                const chunk = decoder.decode(value, { stream: true });
                console.log('Raw chunk received:', chunk);
                buffer += chunk;
                
                // Process SSE events (event: type\ndata: {...}\n\n)
                const events = buffer.split('\n\n');
                buffer = events.pop() || '';

                for (const event of events) {
                    const lines = event.split('\n');
                    let eventType = 'message';
                    let eventData = '';

                    for (const line of lines) {
                        if (line.startsWith('event:')) {
                            eventType = line.substring(6).trim();
                        } else if (line.startsWith('data:')) {
                            eventData = line.substring(5).trim();
                        }
                    }

                    if (eventData) {
                        try {
                            const data = JSON.parse(eventData);
                            console.log('SSE Data received:', { eventType, data });

                            if (eventType === 'progress') {
                                const progressValue = data.progress?.value || data.value || 0;
                                setProgress(progressValue);
                                if (data.progress?.message || data.message) {
                                    addToLog(data.progress?.message || data.message);
                                }
                            } else if (eventType === 'log') {
                                if (data.message) {
                                    addToLog(data.message);
                                }
                            } else if (eventType === 'complete') {
                                isComplete = true;
                                // The data might be in data.data or directly in data
                                const responseData = data.data || data;
                                resultData = responseData;
                                setSplitResult(resultData);
                                setProgress(100);
                                addToLog('✓ Company split completed successfully!');
                                console.log('Split result data:', resultData);
                            } else if (eventType === 'error') {
                                const errorMsg = data.error || data.message || 'An error occurred during company split';
                                setError(errorMsg);
                                addToLog(`Error: ${errorMsg}`);
                                if (data.details) {
                                    console.error('Error details:', data.details);
                                }
                                throw new Error(errorMsg);
                            } else {
                                // Default handling for any other events
                                if (data.message) {
                                    addToLog(data.message);
                                }
                                if (data.progress !== undefined) {
                                    setProgress(data.progress);
                                }
                            }
                        } catch (parseError) {
                            console.error('Error parsing SSE data:', parseError);
                            console.error('Raw event data:', eventData);
                            // Don't throw, just log
                        }
                    }
                }
            }

            setLoading(false);
            return resultData || { success: true, message: 'Split completed successfully' };

        } catch (err) {
            console.error('Split failed:', err);
            setLoading(false);
            
            // Don't show error for abort (user cancelled)
            if (err.name === 'AbortError') {
                addToLog('Split operation cancelled by user');
                return { success: false, cancelled: true };
            }
            
            setError(err.message);
            addToLog(`Error: ${err.message}`);
            throw err;
        }
    }, [addToLog]);

    const cancelSplit = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setLoading(false);
        addToLog('Split operation cancelled by user');
    }, [addToLog]);

    const reset = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setLoading(false);
        setError(null);
        setProgress(0);
        setProcessLog([]);
        setSplitResult(null);
    }, []);

    return {
        loading,
        error,
        progress,
        processLog,
        splitResult,
        splitCompanyWithSSE,
        cancelSplit,
        reset,
        addToLog
    };
};

export default useCompanySplit;

