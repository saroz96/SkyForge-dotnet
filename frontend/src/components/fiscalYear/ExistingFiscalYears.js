// import React, { useState, useEffect, useMemo } from 'react';
// import { useNavigate } from 'react-router-dom';
// import axios from 'axios';
// import { FaCalendarAlt, FaCheckCircle, FaExchangeAlt, FaSyncAlt, FaBuilding } from 'react-icons/fa';
// import Header from '../retailer/Header';
// import Loader from '../Loader';
// import NotificationToast from '../NotificationToast';
// import { useDispatch } from 'react-redux';
// import { setCurrentCompany } from '../../auth/authSlice';

// const ExistingFiscalYears = () => {
//     const navigate = useNavigate();
//     const dispatch = useDispatch();
    
//     // API instance with JWT token
//     const api = useMemo(() => {
//         const instance = axios.create({
//             baseURL: process.env.REACT_APP_API_BASE_URL,
//             withCredentials: true,
//         });
//         instance.interceptors.request.use(
//             (config) => {
//                 const token = localStorage.getItem('token');
//                 if (token) {
//                     config.headers.Authorization = `Bearer ${token}`;
//                 }
//                 return config;
//             },
//             (error) => {
//                 return Promise.reject(error);
//             }
//         );
//         return instance;
//     }, []);

//     const [fiscalYears, setFiscalYears] = useState([]);
//     const [currentFiscalYear, setCurrentFiscalYear] = useState('');
//     const [currentCompanyName, setCurrentCompanyName] = useState('');
//     const [companyDateFormat, setCompanyDateFormat] = useState('english');
//     const [loading, setLoading] = useState(true);
//     const [switchingFiscalYearId, setSwitchingFiscalYearId] = useState(null);
//     const [error, setError] = useState(null);
//     const [notification, setNotification] = useState({
//         show: false,
//         message: '',
//         type: 'success',
//         duration: 3000
//     });

//     useEffect(() => {
//         fetchFiscalYears();
//     }, []);

//     const fetchFiscalYears = async () => {
//         try {
//             setLoading(true);
//             const response = await api.get('/api/FiscalYears/switch-fiscal-year');
            
//             if (response.data.success) {
//                 const { data } = response.data;
//                 setFiscalYears(data.fiscalYears || []);
//                 setCurrentFiscalYear(data.currentFiscalYear || '');
//                 setCurrentCompanyName(data.currentCompanyName || '');
//                 setCompanyDateFormat(data.company?.dateFormat?.toLowerCase() || 'english');
//                 setError(null);
//             } else {
//                 throw new Error(response.data.error || 'Failed to fetch fiscal years');
//             }
//         } catch (err) {
//             console.error('Fetch error:', err);
//             const errorMsg = err.response?.data?.error || err.message || 'Failed to fetch fiscal years';
//             setError(errorMsg);
//             setNotification({
//                 show: true,
//                 message: errorMsg,
//                 type: 'error',
//                 duration: 3000
//             });
            
//             // Handle unauthorized - redirect to login
//             if (err.response?.status === 401) {
//                 localStorage.removeItem('token');
//                 navigate('/login');
//             }
//         } finally {
//             setLoading(false);
//         }
//     };

//     const handleSwitchFiscalYear = async (fiscalYearId, fiscalYearName) => {
//         if (switchingFiscalYearId) return;
        
//         setSwitchingFiscalYearId(fiscalYearId);
        
//         try {
//             const response = await api.post('/api/FiscalYears/switch-fiscal-year', {
//                 fiscalYearId: fiscalYearId
//             });

//             if (response.data.success) {
//                 const { token: newToken, sessionData } = response.data.data;
                
//                 // CRITICAL: Store the new token
//                 if (newToken) {
//                     console.log('Updating JWT token after fiscal year switch');
//                     localStorage.setItem('token', newToken);
                    
//                     // Update axios default headers for all future requests
//                     axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
//                     api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
//                 } else {
//                     console.warn('No new token returned from fiscal year switch API');
//                 }
                
//                 // Update Redux store with new fiscal year and company data
//                 dispatch(setCurrentCompany({
//                     company: sessionData.company,
//                     fiscalYear: sessionData.fiscalYear
//                 }));
                
//                 // Store in localStorage for persistence
//                 const currentCompanyData = {
//                     company: sessionData.company,
//                     fiscalYear: sessionData.fiscalYear
//                 };
//                 localStorage.setItem('currentCompany', JSON.stringify(currentCompanyData));
//                 localStorage.setItem('currentCompanyId', sessionData.company.id);
//                 localStorage.setItem('currentFiscalYear', JSON.stringify(sessionData.fiscalYear));
                
//                 // Store in session storage for backward compatibility
//                 sessionStorage.setItem('currentCompany', JSON.stringify(sessionData.company));
//                 sessionStorage.setItem('currentFiscalYear', JSON.stringify(sessionData.fiscalYear));
                
//                 setNotification({
//                     show: true,
//                     message: `Successfully switched to ${fiscalYearName} fiscal year`,
//                     type: 'success',
//                     duration: 3000
//                 });
                
//                 // Update current fiscal year in state
//                 setCurrentFiscalYear(fiscalYearId);
                
//                 // Refresh the fiscal years list and also refresh the page to ensure middleware picks up new claims
//                 setTimeout(() => {
//                     // Option 1: Just refresh the list
//                     fetchFiscalYears();
                    
//                     // Option 2: Or reload the page to ensure all middleware gets the new claims
//                     // window.location.reload();
//                 }, 1000);
//             } else {
//                 throw new Error(response.data.message || 'Failed to change fiscal year');
//             }
//         } catch (err) {
//             console.error('Switch error:', err);
//             const errorMsg = err.response?.data?.message || err.message || 'Failed to change fiscal year';
//             setNotification({
//                 show: true,
//                 message: errorMsg,
//                 type: 'error',
//                 duration: 3000
//             });
            
//             // Handle unauthorized
//             if (err.response?.status === 401) {
//                 localStorage.removeItem('token');
//                 navigate('/login');
//             }
//         } finally {
//             setSwitchingFiscalYearId(null);
//         }
//     };

//     const formatEnglishDate = (dateString) => {
//         if (!dateString) return 'N/A';
//         try {
//             return new Date(dateString).toLocaleDateString();
//         } catch {
//             return dateString;
//         }
//     };

//     const getStartDateDisplay = (fiscalYear) => {
//         if (!fiscalYear) return 'N/A';
//         const isNepaliFormat = companyDateFormat === 'nepali';
        
//         if (isNepaliFormat && fiscalYear.startDateNepali) {
//             return fiscalYear.startDateNepali;
//         } else {
//             return formatEnglishDate(fiscalYear.startDate);
//         }
//     };

//     const getEndDateDisplay = (fiscalYear) => {
//         if (!fiscalYear) return 'N/A';
//         const isNepaliFormat = companyDateFormat === 'nepali';
        
//         if (isNepaliFormat && fiscalYear.endDateNepali) {
//             return fiscalYear.endDateNepali;
//         } else {
//             return formatEnglishDate(fiscalYear.endDate);
//         }
//     };

//     if (loading) {
//         return (
//             <>
//                 <Header />
//                 <Loader />
//             </>
//         );
//     }

//     return (
//         <div className="container-fluid">
//             <Header />
//             <div className="card mt-2 shadow-lg p-0 expanded-card ledger-card compact">
//                 <div className="card-header bg-white py-1">
//                     <h1 className="h5 mb-0 text-center text-primary">
//                         <FaCalendarAlt className="me-2" />
//                         Fiscal Years Management
//                     </h1>
//                 </div>
//                 <div className="card-body p-2 p-md-3">
//                     {error && (
//                         <div className="alert alert-danger text-center py-1 mb-2 small" style={{ fontSize: '0.75rem' }}>
//                             {error}
//                             <button type="button" className="btn-close btn-sm ms-2" onClick={() => setError(null)}></button>
//                         </div>
//                     )}

//                     {/* Fiscal Years Table */}
//                     <div className="table-responsive" style={{ maxHeight: '450px', overflow: 'auto' }}>
//                         <table className="table table-sm table-hover mb-0" style={{ fontSize: '0.75rem' }}>
//                             <thead className="table-light" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
//                                 <tr>
//                                     <th style={{ padding: '6px 8px', textAlign: 'center', width: '40px' }}>#</th>
//                                     <th style={{ padding: '6px 8px' }}>Fiscal Year</th>
//                                     <th style={{ padding: '6px 8px' }}>Start Date</th>
//                                     <th style={{ padding: '6px 8px' }}>End Date</th>
//                                     <th style={{ padding: '6px 8px', textAlign: 'center', width: '100px' }}>Status</th>
//                                     <th style={{ padding: '6px 8px', textAlign: 'center', width: '100px' }}>Action</th>
//                                 </tr>
//                             </thead>
//                             <tbody>
//                                 {fiscalYears.length > 0 ? (
//                                     fiscalYears.map((fiscalYear, index) => {
//                                         const isActive = fiscalYear.id === currentFiscalYear;
//                                         const isSwitching = switchingFiscalYearId === fiscalYear.id;
                                        
//                                         return (
//                                             <tr key={fiscalYear.id} className={isActive ? 'table-success' : ''}>
//                                                 <td style={{ padding: '4px 6px', textAlign: 'center' }}>{index + 1}</td>
//                                                 <td style={{ padding: '4px 6px' }}>
//                                                     <strong>{fiscalYear.name}</strong>
//                                                     {fiscalYear.dateFormat && (
//                                                         <span className="text-muted ms-1" style={{ fontSize: '0.65rem' }}>
//                                                             ({fiscalYear.dateFormat})
//                                                         </span>
//                                                     )}
//                                                 </td>
//                                                 <td style={{ padding: '4px 6px' }}>{getStartDateDisplay(fiscalYear)}</td>
//                                                 <td style={{ padding: '4px 6px' }}>{getEndDateDisplay(fiscalYear)}</td>
//                                                 <td style={{ padding: '4px 6px', textAlign: 'center' }}>
//                                                     {isActive ? (
//                                                         <span className="badge bg-success" style={{ fontSize: '0.7rem', padding: '3px 8px' }}>
//                                                             <FaCheckCircle className="me-1" style={{ fontSize: '10px' }} />
//                                                             Active
//                                                         </span>
//                                                     ) : (
//                                                         <span className="badge bg-secondary" style={{ fontSize: '0.7rem', padding: '3px 8px' }}>
//                                                             Inactive
//                                                         </span>
//                                                     )}
//                                                 </td>
//                                                 <td style={{ padding: '4px 6px', textAlign: 'center' }}>
//                                                     {!isActive && (
//                                                         <button
//                                                             className="btn btn-primary btn-sm"
//                                                             onClick={() => handleSwitchFiscalYear(fiscalYear.id, fiscalYear.name)}
//                                                             disabled={!!switchingFiscalYearId}
//                                                             style={{ fontSize: '0.7rem', padding: '2px 8px' }}
//                                                         >
//                                                             {isSwitching ? (
//                                                                 <>
//                                                                     <span className="spinner-border spinner-border-sm me-1" style={{ width: '10px', height: '10px' }} />
//                                                                     Switching...
//                                                                 </>
//                                                             ) : (
//                                                                 <>
//                                                                     <FaExchangeAlt className="me-1" style={{ fontSize: '10px' }} />
//                                                                     Switch
//                                                                 </>
//                                                             )}
//                                                         </button>
//                                                     )}
//                                                     {isActive && (
//                                                         <span className="text-muted small">Current</span>
//                                                     )}
//                                                 </td>
//                                             </tr>
//                                         );
//                                     })
//                                 ) : (
//                                     <tr>
//                                         <td colSpan="6" className="text-center py-3">
//                                             <FaCalendarAlt className="text-muted mb-2" style={{ fontSize: '24px' }} />
//                                             <p className="text-muted mb-0 small">No fiscal years found</p>
//                                         </td>
//                                     </tr>
//                                 )}
//                             </tbody>
//                         </table>
//                     </div>
//                 </div>
//             </div>

//             <NotificationToast
//                 show={notification.show} 
//                 message={notification.message} 
//                 type={notification.type} 
//                 duration={notification.duration} 
//                 onClose={() => setNotification({ ...notification, show: false })} 
//             />
//         </div>
//     );
// };

// export default ExistingFiscalYears;

//----------------------------------------------------------------end

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaCalendarAlt, FaCheckCircle, FaExchangeAlt, FaSyncAlt, FaBuilding } from 'react-icons/fa';
import Header from '../retailer/Header';
import Loader from '../Loader';
import NotificationToast from '../NotificationToast';
import { useDispatch } from 'react-redux';
import { setCurrentCompany } from '../../auth/authSlice';

const ExistingFiscalYears = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    
    // API instance with JWT token
    const api = useMemo(() => {
        const instance = axios.create({
            baseURL: process.env.REACT_APP_API_BASE_URL,
            withCredentials: true,
        });
        instance.interceptors.request.use(
            (config) => {
                const token = localStorage.getItem('token');
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error) => {
                return Promise.reject(error);
            }
        );
        return instance;
    }, []);

    const [fiscalYears, setFiscalYears] = useState([]);
    const [currentFiscalYear, setCurrentFiscalYear] = useState('');
    const [currentCompanyName, setCurrentCompanyName] = useState('');
    const [companyDateFormat, setCompanyDateFormat] = useState('english');
    const [loading, setLoading] = useState(true);
    const [switchingFiscalYearId, setSwitchingFiscalYearId] = useState(null);
    const [error, setError] = useState(null);
    const [notification, setNotification] = useState({
        show: false,
        message: '',
        type: 'success',
        duration: 3000
    });

    useEffect(() => {
        fetchFiscalYears();
    }, []);

    const fetchFiscalYears = async () => {
        try {
            setLoading(true);
            const response = await api.get('/api/FiscalYears/switch-fiscal-year');
            
            if (response.data.success) {
                const { data } = response.data;
                setFiscalYears(data.fiscalYears || []);
                setCurrentFiscalYear(data.currentFiscalYear || '');
                setCurrentCompanyName(data.currentCompanyName || '');
                setCompanyDateFormat(data.company?.dateFormat?.toLowerCase() || 'english');
                setError(null);
            } else {
                throw new Error(response.data.error || 'Failed to fetch fiscal years');
            }
        } catch (err) {
            console.error('Fetch error:', err);
            const errorMsg = err.response?.data?.error || err.message || 'Failed to fetch fiscal years';
            setError(errorMsg);
            // Only show error notification if not already showing
            if (!notification.show) {
                setNotification({
                    show: true,
                    message: errorMsg,
                    type: 'error',
                    duration: 3000
                });
            }
            
            // Handle unauthorized - redirect to login
            if (err.response?.status === 401) {
                localStorage.removeItem('token');
                navigate('/login');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSwitchFiscalYear = async (fiscalYearId, fiscalYearName) => {
        if (switchingFiscalYearId) return;
        
        setSwitchingFiscalYearId(fiscalYearId);
        
        try {
            const response = await api.post('/api/FiscalYears/switch-fiscal-year', {
                fiscalYearId: fiscalYearId
            });

            if (response.data.success) {
                const { token: newToken, sessionData } = response.data.data;
                
                // CRITICAL: Store the new token
                if (newToken) {
                    console.log('Updating JWT token after fiscal year switch');
                    localStorage.setItem('token', newToken);
                    
                    // Update axios default headers for all future requests
                    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
                    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
                } else {
                    console.warn('No new token returned from fiscal year switch API');
                }
                
                // Update Redux store with new fiscal year and company data
                dispatch(setCurrentCompany({
                    company: sessionData.company,
                    fiscalYear: sessionData.fiscalYear
                }));
                
                // Store in localStorage for persistence
                const currentCompanyData = {
                    company: sessionData.company,
                    fiscalYear: sessionData.fiscalYear
                };
                localStorage.setItem('currentCompany', JSON.stringify(currentCompanyData));
                localStorage.setItem('currentCompanyId', sessionData.company.id);
                localStorage.setItem('currentFiscalYear', JSON.stringify(sessionData.fiscalYear));
                
                // Store in session storage for backward compatibility
                sessionStorage.setItem('currentCompany', JSON.stringify(sessionData.company));
                sessionStorage.setItem('currentFiscalYear', JSON.stringify(sessionData.fiscalYear));
                
                // Show success notification only once
                setNotification({
                    show: true,
                    message: `Successfully switched to ${fiscalYearName} fiscal year`,
                    type: 'success',
                    duration: 3000
                });
                
                // Update current fiscal year in state
                setCurrentFiscalYear(fiscalYearId);
                
                // Refresh the fiscal years list after a delay
                // Don't show any notifications from the refresh
                setTimeout(() => {
                    fetchFiscalYearsSilently();
                }, 1000);
            } else {
                throw new Error(response.data.message || 'Failed to change fiscal year');
            }
        } catch (err) {
            console.error('Switch error:', err);
            const errorMsg = err.response?.data?.message || err.message || 'Failed to change fiscal year';
            setNotification({
                show: true,
                message: errorMsg,
                type: 'error',
                duration: 3000
            });
            
            // Handle unauthorized
            if (err.response?.status === 401) {
                localStorage.removeItem('token');
                navigate('/login');
            }
        } finally {
            setSwitchingFiscalYearId(null);
        }
    };

    // New silent fetch function that doesn't show notifications
    const fetchFiscalYearsSilently = async () => {
        try {
            const response = await api.get('/api/FiscalYears/switch-fiscal-year');
            
            if (response.data.success) {
                const { data } = response.data;
                setFiscalYears(data.fiscalYears || []);
                setCurrentFiscalYear(data.currentFiscalYear || '');
                setCurrentCompanyName(data.currentCompanyName || '');
                setCompanyDateFormat(data.company?.dateFormat?.toLowerCase() || 'english');
                setError(null);
            }
        } catch (err) {
            console.error('Silent fetch error:', err);
            // Don't show notification for silent fetch
        }
    };

    const formatEnglishDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString();
        } catch {
            return dateString;
        }
    };

    const getStartDateDisplay = (fiscalYear) => {
        if (!fiscalYear) return 'N/A';
        const isNepaliFormat = companyDateFormat === 'nepali';
        
        if (isNepaliFormat && fiscalYear.startDateNepali) {
            return fiscalYear.startDateNepali;
        } else {
            return formatEnglishDate(fiscalYear.startDate);
        }
    };

    const getEndDateDisplay = (fiscalYear) => {
        if (!fiscalYear) return 'N/A';
        const isNepaliFormat = companyDateFormat === 'nepali';
        
        if (isNepaliFormat && fiscalYear.endDateNepali) {
            return fiscalYear.endDateNepali;
        } else {
            return formatEnglishDate(fiscalYear.endDate);
        }
    };

    if (loading) {
        return (
            <>
                <Header />
                <Loader />
            </>
        );
    }

    return (
        <div className="container-fluid">
            <Header />
            <div className="card mt-2 shadow-lg p-0 expanded-card ledger-card compact">
                <div className="card-header bg-white py-1">
                    <h1 className="h5 mb-0 text-center text-primary">
                        <FaCalendarAlt className="me-2" />
                        Fiscal Years Management
                    </h1>
                </div>
                <div className="card-body p-2 p-md-3">
                    {error && (
                        <div className="alert alert-danger text-center py-1 mb-2 small" style={{ fontSize: '0.75rem' }}>
                            {error}
                            <button type="button" className="btn-close btn-sm ms-2" onClick={() => setError(null)}></button>
                        </div>
                    )}

                    {/* Fiscal Years Table */}
                    <div className="table-responsive" style={{ maxHeight: '450px', overflow: 'auto' }}>
                        <table className="table table-sm table-hover mb-0" style={{ fontSize: '0.75rem' }}>
                            <thead className="table-light" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                                <tr>
                                    <th style={{ padding: '6px 8px', textAlign: 'center', width: '40px' }}>#</th>
                                    <th style={{ padding: '6px 8px' }}>Fiscal Year</th>
                                    <th style={{ padding: '6px 8px' }}>Start Date</th>
                                    <th style={{ padding: '6px 8px' }}>End Date</th>
                                    <th style={{ padding: '6px 8px', textAlign: 'center', width: '100px' }}>Status</th>
                                    <th style={{ padding: '6px 8px', textAlign: 'center', width: '100px' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {fiscalYears.length > 0 ? (
                                    fiscalYears.map((fiscalYear, index) => {
                                        const isActive = fiscalYear.id === currentFiscalYear;
                                        const isSwitching = switchingFiscalYearId === fiscalYear.id;
                                        
                                        return (
                                            <tr key={fiscalYear.id} className={isActive ? 'table-success' : ''}>
                                                <td style={{ padding: '4px 6px', textAlign: 'center' }}>{index + 1}</td>
                                                <td style={{ padding: '4px 6px' }}>
                                                    <strong>{fiscalYear.name}</strong>
                                                    {fiscalYear.dateFormat && (
                                                        <span className="text-muted ms-1" style={{ fontSize: '0.65rem' }}>
                                                            ({fiscalYear.dateFormat})
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '4px 6px' }}>{getStartDateDisplay(fiscalYear)}</td>
                                                <td style={{ padding: '4px 6px' }}>{getEndDateDisplay(fiscalYear)}</td>
                                                <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                                                    {isActive ? (
                                                        <span className="badge bg-success" style={{ fontSize: '0.7rem', padding: '3px 8px' }}>
                                                            <FaCheckCircle className="me-1" style={{ fontSize: '10px' }} />
                                                            Active
                                                        </span>
                                                    ) : (
                                                        <span className="badge bg-secondary" style={{ fontSize: '0.7rem', padding: '3px 8px' }}>
                                                            Inactive
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                                                    {!isActive && (
                                                        <button
                                                            className="btn btn-primary btn-sm"
                                                            onClick={() => handleSwitchFiscalYear(fiscalYear.id, fiscalYear.name)}
                                                            disabled={!!switchingFiscalYearId}
                                                            style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                                                        >
                                                            {isSwitching ? (
                                                                <>
                                                                    <span className="spinner-border spinner-border-sm me-1" style={{ width: '10px', height: '10px' }} />
                                                                    Switching...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <FaExchangeAlt className="me-1" style={{ fontSize: '10px' }} />
                                                                    Switch
                                                                </>
                                                            )}
                                                        </button>
                                                    )}
                                                    {isActive && (
                                                        <span className="text-muted small">Current</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="text-center py-3">
                                            <FaCalendarAlt className="text-muted mb-2" style={{ fontSize: '24px' }} />
                                            <p className="text-muted mb-0 small">No fiscal years found</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <NotificationToast
                show={notification.show} 
                message={notification.message} 
                type={notification.type} 
                duration={notification.duration} 
                onClose={() => setNotification({ ...notification, show: false })} 
            />
        </div>
    );
};

export default ExistingFiscalYears;