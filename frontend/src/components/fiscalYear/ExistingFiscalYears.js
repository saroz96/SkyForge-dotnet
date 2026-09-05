// import React, { useState, useEffect, useMemo } from 'react';
// import { useNavigate } from 'react-router-dom';
// import axios from 'axios';
// import { FaCalendarAlt, FaCheckCircle, FaExchangeAlt, FaSyncAlt, FaBuilding } from 'react-icons/fa';
// import Header from '../retailer/Header';
// import Loader from '../Loader';
// import NotificationToast from '../NotificationToast';
// import { useDispatch } from 'react-redux';
// import { setCurrentCompany } from '../../auth/authSlice';
// import api, { refreshToken } from '../services/api';

// const ExistingFiscalYears = () => {
//     const navigate = useNavigate();
//     const dispatch = useDispatch();

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
//             // Only show error notification if not already showing
//             if (!notification.show) {
//                 setNotification({
//                     show: true,
//                     message: errorMsg,
//                     type: 'error',
//                     duration: 3000
//                 });
//             }

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

//                 // Show success notification only once
//                 setNotification({
//                     show: true,
//                     message: `Successfully switched to ${fiscalYearName} fiscal year`,
//                     type: 'success',
//                     duration: 3000
//                 });

//                 // Update current fiscal year in state
//                 setCurrentFiscalYear(fiscalYearId);

//                 // Refresh the fiscal years list after a delay
//                 // Don't show any notifications from the refresh
//                 setTimeout(() => {
//                     fetchFiscalYearsSilently();
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

//     // New silent fetch function that doesn't show notifications
//     const fetchFiscalYearsSilently = async () => {
//         try {
//             const response = await api.get('/api/FiscalYears/switch-fiscal-year');

//             if (response.data.success) {
//                 const { data } = response.data;
//                 setFiscalYears(data.fiscalYears || []);
//                 setCurrentFiscalYear(data.currentFiscalYear || '');
//                 setCurrentCompanyName(data.currentCompanyName || '');
//                 setCompanyDateFormat(data.company?.dateFormat?.toLowerCase() || 'english');
//                 setError(null);
//             }
//         } catch (err) {
//             console.error('Silent fetch error:', err);
//             // Don't show notification for silent fetch
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

//--------------------------------------------end1


import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCalendarAlt, FaCheckCircle, FaExchangeAlt, FaQuestionCircle, FaExclamationTriangle } from 'react-icons/fa';
import { Modal, Button, Alert, Spinner } from 'react-bootstrap';
import Header from '../retailer/Header';
import Loader from '../Loader';
import NotificationToast from '../NotificationToast';
import { useDispatch } from 'react-redux';
import { setCurrentCompany } from '../../auth/authSlice';
import api from '../services/api';

const ExistingFiscalYears = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();

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

    // Carry Forward Modal States
    const [showCarryModal, setShowCarryModal] = useState(false);
    const [showOptionsModal, setShowOptionsModal] = useState(false);
    const [selectedFiscalYear, setSelectedFiscalYear] = useState(null);
    const [carryInfo, setCarryInfo] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [carrySelection, setCarrySelection] = useState('All');

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
            if (!notification.show) {
                setNotification({
                    show: true,
                    message: errorMsg,
                    type: 'error',
                    duration: 3000
                });
            }
            if (err.response?.status === 401) {
                localStorage.removeItem('token');
                navigate('/login');
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchFiscalYearsSilently = async () => {
        try {
            const response = await api.get('/api/FiscalYears/switch-fiscal-year');
            if (response.data.success) {
                const { data } = response.data;
                setFiscalYears(data.fiscalYears || []);
                setCurrentFiscalYear(data.currentFiscalYear || '');
                setCurrentCompanyName(data.currentCompanyName || '');
                setCompanyDateFormat(data.company?.dateFormat?.toLowerCase() || 'english');
            }
        } catch (err) {
            console.error('Silent fetch error:', err);
        }
    };

    const handleSwitchClick = async (fiscalYearId, fiscalYearName) => {
        if (switchingFiscalYearId) return;

        // Get current active fiscal year
        const currentFY = fiscalYears.find(fy => fy.id === currentFiscalYear);
        const targetFY = fiscalYears.find(fy => fy.id === fiscalYearId);

        if (!currentFY || !targetFY) {
            setNotification({
                show: true,
                message: 'Fiscal year data not found',
                type: 'error',
                duration: 3000
            });
            return;
        }

        // Check if this is a forward switch (going to newer fiscal year)
        const isForwardSwitch = currentFY.startDate < targetFY.startDate;

        if (isForwardSwitch) {
            // Show carry forward confirmation
            try {
                const response = await api.get('/api/FiscalYears/check-carry-forward', {
                    params: {
                        sourceFiscalYearId: currentFY.id,
                        targetFiscalYearId: fiscalYearId
                    }
                });

                if (response.data.success && response.data.needCarryForward) {
                    setSelectedFiscalYear({ id: fiscalYearId, name: fiscalYearName });
                    setCarryInfo(response.data.data);
                    setShowCarryModal(true);
                    return;
                }
            } catch (err) {
                console.error('Error checking carry forward:', err);
            }
        }

        // Direct switch if no carry forward needed
        await performSwitch(fiscalYearId, fiscalYearName, false, 'None');
    };

    const performSwitch = async (fiscalYearId, fiscalYearName, carryBalances, carryType) => {
        setSwitchingFiscalYearId(fiscalYearId);
        setIsProcessing(true);

        try {
            let switchResponse;

            if (carryBalances) {
                // Perform carry forward
                const carryResponse = await api.post('/api/FiscalYears/carry-forward', {
                    sourceFiscalYearId: currentFiscalYear,
                    targetFiscalYearId: fiscalYearId,
                    carryBalances: true,
                    carryType: carryType,
                    transferDate: new Date().toISOString().split('T')[0],
                    transferDateNepali: new Date().toLocaleDateString('ne-NP')
                });

                if (!carryResponse.data.success) {
                    throw new Error(carryResponse.data.message || 'Failed to carry forward balances');
                }

                // After carry forward, perform the switch
                switchResponse = await api.post('/api/FiscalYears/switch-fiscal-year', {
                    fiscalYearId: fiscalYearId
                });
            } else {
                // Just switch without carrying forward
                switchResponse = await api.post('/api/FiscalYears/switch-fiscal-year', {
                    fiscalYearId: fiscalYearId
                });
            }

            if (switchResponse.data.success) {
                const { token: newToken, sessionData } = switchResponse.data.data;

                if (newToken) {
                    localStorage.setItem('token', newToken);
                    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
                }

                dispatch(setCurrentCompany({
                    company: sessionData.company,
                    fiscalYear: sessionData.fiscalYear
                }));

                const currentCompanyData = {
                    company: sessionData.company,
                    fiscalYear: sessionData.fiscalYear
                };
                localStorage.setItem('currentCompany', JSON.stringify(currentCompanyData));
                localStorage.setItem('currentCompanyId', sessionData.company.id);
                localStorage.setItem('currentFiscalYear', JSON.stringify(sessionData.fiscalYear));

                setCurrentFiscalYear(fiscalYearId);

                let successMessage = `Successfully switched to ${fiscalYearName}`;
                if (carryBalances) {
                    successMessage += ` with ${carryType === 'All' ? 'all' : 'new and changed'} balances carried forward`;
                }

                setNotification({
                    show: true,
                    message: successMessage,
                    type: 'success',
                    duration: 4000
                });

                // Close modals
                setShowCarryModal(false);
                setShowOptionsModal(false);

                // Refresh data
                setTimeout(() => {
                    fetchFiscalYearsSilently();
                }, 1000);
            } else {
                throw new Error(switchResponse.data.message || 'Failed to switch fiscal year');
            }
        } catch (err) {
            console.error('Switch error:', err);
            const errorMsg = err.response?.data?.message || err.message || 'Failed to switch fiscal year';
            setNotification({
                show: true,
                message: errorMsg,
                type: 'error',
                duration: 3000
            });
            setShowCarryModal(false);
            setShowOptionsModal(false);

            if (err.response?.status === 401) {
                localStorage.removeItem('token');
                navigate('/login');
            }
        } finally {
            setSwitchingFiscalYearId(null);
            setIsProcessing(false);
        }
    };

    const handleCarryNo = () => {
        // Close modal and switch without carrying
        setShowCarryModal(false);
        if (selectedFiscalYear) {
            performSwitch(selectedFiscalYear.id, selectedFiscalYear.name, false, 'None');
        }
    };

    const handleCarryYes = () => {
        setShowCarryModal(false);
        setShowOptionsModal(true);
    };

    const handleOptionsSelect = (option) => {
        setCarrySelection(option);
    };

    const handleOptionsConfirm = () => {
        setShowOptionsModal(false);
        if (selectedFiscalYear) {
            navigate('/update-balances', {
                state: {
                    sourceFiscalYearId: currentFiscalYear,
                    targetFiscalYearId: selectedFiscalYear.id,
                    carryType: carrySelection
                }
            });
        }
    };

    const handleOptionsCancel = () => {
        setShowOptionsModal(false);
        setSelectedFiscalYear(null);
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
        }
        return formatEnglishDate(fiscalYear.startDate);
    };

    const getEndDateDisplay = (fiscalYear) => {
        if (!fiscalYear) return 'N/A';
        const isNepaliFormat = companyDateFormat === 'nepali';
        if (isNepaliFormat && fiscalYear.endDateNepali) {
            return fiscalYear.endDateNepali;
        }
        return formatEnglishDate(fiscalYear.endDate);
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

            {/* Carry Forward Modal - First Dialog */}
            <Modal
                show={showCarryModal}
                onHide={handleCarryNo}
                centered
                backdrop="static"
                keyboard={false}
            >
                <Modal.Header className="bg-warning border-0">
                    <Modal.Title className="d-flex align-items-center">
                        <FaQuestionCircle className="me-2" />
                        Carry Balances?
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="py-3">
                    <p className="mb-2">
                        You are going to change to F.Y. starting from{' '}
                        <strong>
                            {companyDateFormat === 'nepali'
                                ? carryInfo?.targetStartDateNepali
                                : formatEnglishDate(carryInfo?.targetStartDate)}
                        </strong>
                        . Do you want to carry forward the balances?
                    </p>
                    <Alert variant="info" className="mt-2 py-1 small">
                        <FaExclamationTriangle className="me-1" />
                        From: <strong>{carryInfo?.sourceFiscalYearName}</strong>
                        {' → '}
                        To: <strong>{carryInfo?.targetFiscalYearName}</strong>
                    </Alert>
                </Modal.Body>
                <Modal.Footer className="border-0">
                    <Button
                        variant="secondary"
                        onClick={handleCarryNo}
                        disabled={isProcessing}
                    >
                        No
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleCarryYes}
                        disabled={isProcessing}
                    >
                        Yes
                    </Button>
                    <Button
                        variant="outline-secondary"
                        onClick={handleCarryNo}
                        disabled={isProcessing}
                    >
                        Cancel
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Carry Options Modal - Second Dialog */}
            <Modal
                show={showOptionsModal}
                onHide={handleOptionsCancel}
                centered
                backdrop="static"
                keyboard={false}
            >
                <Modal.Header className="bg-info text-white border-0">
                    <Modal.Title className="d-flex align-items-center">
                        <FaExchangeAlt className="me-2" />
                        Carry Balances!
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="py-3">
                    <p className="mb-2">Balances to be carried for</p>
                    <div className="mb-3">
                        <div className="form-check mb-2">
                            <input
                                className="form-check-input"
                                type="radio"
                                name="carryOption"
                                id="optionAll"
                                value="All"
                                checked={carrySelection === 'All'}
                                onChange={() => handleOptionsSelect('All')}
                            />
                            <label className="form-check-label" htmlFor="optionAll">
                                <strong>All Masters</strong>
                            </label>
                            <div className="ms-4 small text-muted">
                                All accounts and items will be carried forward
                            </div>
                        </div>
                        <div className="form-check">
                            <input
                                className="form-check-input"
                                type="radio"
                                name="carryOption"
                                id="optionNewChanged"
                                value="NewAndChanged"
                                checked={carrySelection === 'NewAndChanged'}
                                onChange={() => handleOptionsSelect('NewAndChanged')}
                            />
                            <label className="form-check-label" htmlFor="optionNewChanged">
                                <strong>New & Changed Masters</strong>
                            </label>
                            <div className="ms-4 small text-muted">
                                Only accounts and items that are new or have changes
                            </div>
                        </div>
                    </div>
                    <Alert variant="warning" className="py-1 small">
                        <FaExclamationTriangle className="me-1" />
                        This will create opening balances in the new fiscal year
                    </Alert>
                </Modal.Body>
                <Modal.Footer className="border-0">
                    <Button
                        variant="secondary"
                        onClick={handleOptionsCancel}
                        disabled={isProcessing}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleOptionsConfirm}
                        disabled={isProcessing}
                    >
                        {isProcessing ? (
                            <>
                                <Spinner size="sm" className="me-2" />
                                Processing...
                            </>
                        ) : (
                            'Confirm'
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Main Content */}
            <div className="card mt-2 shadow-lg p-0 expanded-card ledger-card compact">
                <div className="card-header bg-white py-1">
                    <h1 className="h5 mb-0 text-center text-primary">
                        <FaCalendarAlt className="me-2" />
                        Fiscal Years Management
                    </h1>
                </div>
                <div className="card-body p-2 p-md-3">
                    {error && (
                        <div className="alert alert-danger text-center py-1 mb-2 small">
                            {error}
                            <button type="button" className="btn-close btn-sm ms-2" onClick={() => setError(null)}></button>
                        </div>
                    )}

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
                                                            onClick={() => handleSwitchClick(fiscalYear.id, fiscalYear.name)}
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
