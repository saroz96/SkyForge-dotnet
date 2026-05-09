
//-----------------------------------------------------------end

// import React, { useState, useEffect, useMemo } from 'react';
// import { useNavigate } from 'react-router-dom';
// import axios from 'axios';
// import {
//     Row,
//     Col,
//     Form,
//     Button,
//     Modal,
//     ProgressBar,
//     Alert,
//     Spinner,
//     Card
// } from 'react-bootstrap';
// import {
//     FaCalendarAlt,
//     FaCheck,
//     FaExclamationTriangle,
//     FaInfoCircle,
//     FaExchangeAlt,
//     FaClipboardList,
//     FaArrowRight
// } from 'react-icons/fa';
// import Header from '../retailer/Header';
// import Loader from '../Loader';
// import NotificationToast from '../NotificationToast';
// import NepaliDate from 'nepali-date-converter';

// const ChangeNewFiscalYear = () => {
//     const navigate = useNavigate();
//     const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
//     const currentEnglishDate = new Date().toISOString().split('T')[0];

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
//             (error) => Promise.reject(error)
//         );
//         return instance;
//     }, []);

//     const [fiscalData, setFiscalData] = useState(null);
//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState(null);
//     const [step, setStep] = useState(1); // 1: Create Fiscal Year, 2: Transfer Balances
//     const [newFiscalYear, setNewFiscalYear] = useState(null);
//     const [showConfirmModal, setShowConfirmModal] = useState(false);
//     const [showSuccessModal, setShowSuccessModal] = useState(false);
//     const [transferring, setTransferring] = useState(false);
//     const [progress, setProgress] = useState(0);
//     const [transferResult, setTransferResult] = useState(null);
//     const [notification, setNotification] = useState({
//         show: false,
//         message: '',
//         type: 'success',
//         duration: 3000
//     });
//     const [dateErrors, setDateErrors] = useState({
//         startDate: '',
//         endDate: ''
//     });

//     useEffect(() => {
//         fetchFiscalData();
//     }, []);

//     const fetchFiscalData = async () => {
//         try {
//             setLoading(true);
//             const response = await api.get('/api/FiscalYears/change-fiscal-year');

//             if (response.data.success) {
//                 const data = response.data.data;
//                 setFiscalData(data);
//                 setError(null);
//             } else {
//                 throw new Error(response.data.error || 'Failed to fetch fiscal data');
//             }
//         } catch (err) {
//             console.error('Fetch error:', err);
//             const errorMsg = err.response?.data?.error || err.message || 'Failed to fetch fiscal data';
//             setError(errorMsg);

//             if (err.response?.status === 401) {
//                 localStorage.removeItem('token');
//                 navigate('/login');
//             }
//         } finally {
//             setLoading(false);
//         }
//     };

//     const handleTransferBalances = async () => {
//         setTransferring(true);
//         setProgress(0);
//         setShowConfirmModal(false);

//         try {
//             const requestData = {
//                 sourceFiscalYearId: fiscalData?.currentFiscalYear?.id,
//                 targetFiscalYearId: newFiscalYear?.fiscalYear?.id,
//                 transferDate: fiscalData?.companyDateFormat === 'nepali' ? currentNepaliDate : currentEnglishDate,
//                 transferDateNepali: currentNepaliDate,
//                 transferItems: true,
//                 transferAccounts: true
//             };

//             // Simulate progress for better UX
//             const progressInterval = setInterval(() => {
//                 setProgress(prev => {
//                     if (prev >= 90) {
//                         clearInterval(progressInterval);
//                         return 90;
//                     }
//                     return prev + 10;
//                 });
//             }, 800);

//             const response = await api.post('/api/FiscalYears/transfer', requestData);

//             clearInterval(progressInterval);
//             setProgress(100);

//             if (response.data.success) {
//                 setTransferResult(response.data.data);
//                 setShowSuccessModal(true);
//                 setNotification({
//                     show: true,
//                     message: 'Balances transferred successfully!',
//                     type: 'success',
//                     duration: 5000
//                 });
//             } else {
//                 throw new Error(response.data.message || 'Transfer failed');
//             }
//         } catch (err) {
//             console.error('Transfer error:', err);
//             setNotification({
//                 show: true,
//                 message: err.response?.data?.message || err.message || 'Failed to transfer balances',
//                 type: 'error',
//                 duration: 5000
//             });
//         } finally {
//             setTransferring(false);
//             setTimeout(() => setProgress(0), 1000);
//         }
//     };

//     const formatDate = (dateString, dateFormat, nepaliDateString) => {
//         if (!dateString) return 'N/A';

//         if (dateFormat === 'nepali') {
//             if (nepaliDateString) {
//                 try {
//                     const nepaliDate = new NepaliDate(nepaliDateString);
//                     return nepaliDate.format('YYYY-MM-DD');
//                 } catch {
//                     return nepaliDateString;
//                 }
//             }
//             try {
//                 const nepaliDate = new NepaliDate(dateString);
//                 return nepaliDate.format('YYYY-MM-DD');
//             } catch {
//                 return dateString;
//             }
//         } else {
//             try {
//                 return new Date(dateString).toLocaleDateString();
//             } catch {
//                 return dateString;
//             }
//         }
//     };

//     const getNextFiscalYearDates = () => {
//         if (!fiscalData?.currentFiscalYear) return { start: 'N/A', end: 'N/A', startNepali: 'N/A', endNepali: 'N/A' };

//         const isNepaliFormat = fiscalData.companyDateFormat === 'nepali';

//         if (isNepaliFormat) {
//             // Handle Nepali date format - calculate using Nepali Date
//             const currentEndDateNepali = fiscalData.currentFiscalYear.endDateNepali;
//             if (currentEndDateNepali && currentEndDateNepali !== 'N/A') {
//                 try {
//                     const endNepaliDate = new NepaliDate(currentEndDateNepali);
//                     // Next fiscal year start = current end date + 1 day
//                     const startNepaliDate = new NepaliDate(
//                         endNepaliDate.getYear(),
//                         endNepaliDate.getMonth(),
//                         endNepaliDate.getDate() + 1
//                     );
//                     // Next fiscal year end = start date + 1 year - 1 day
//                     const endNepaliDateNew = new NepaliDate(
//                         startNepaliDate.getYear() + 1,
//                         startNepaliDate.getMonth(),
//                         startNepaliDate.getDate() - 1
//                     );

//                     return {
//                         start: startNepaliDate.format('YYYY-MM-DD'),
//                         end: endNepaliDateNew.format('YYYY-MM-DD'),
//                         startNepali: startNepaliDate.format('YYYY-MM-DD'),
//                         endNepali: endNepaliDateNew.format('YYYY-MM-DD')
//                     };
//                 } catch (e) {
//                     console.error('Error calculating Nepali dates:', e);
//                 }
//             }
//             return { start: 'N/A', end: 'N/A', startNepali: 'N/A', endNepali: 'N/A' };
//         } else {
//             // Handle English date format
//             const currentEndDate = fiscalData.currentFiscalYear.endDate;
//             if (currentEndDate) {
//                 const endDate = new Date(currentEndDate);
//                 const startDate = new Date(endDate);
//                 startDate.setDate(startDate.getDate() + 1);
//                 const nextEndDate = new Date(startDate);
//                 nextEndDate.setFullYear(nextEndDate.getFullYear() + 1);
//                 nextEndDate.setDate(nextEndDate.getDate() - 1);

//                 return {
//                     start: startDate.toISOString().split('T')[0],
//                     end: nextEndDate.toISOString().split('T')[0],
//                     startNepali: new NepaliDate(startDate).format('YYYY-MM-DD'),
//                     endNepali: new NepaliDate(nextEndDate).format('YYYY-MM-DD')
//                 };
//             }
//         }

//         return { start: 'N/A', end: 'N/A', startNepali: 'N/A', endNepali: 'N/A' };
//     };

//     const handleCreateFiscalYear = async () => {
//         setTransferring(true);
//         setProgress(0);

//         try {
//             const progressInterval = setInterval(() => {
//                 setProgress(prev => Math.min(prev + 20, 50));
//             }, 500);

//             const nextDates = getNextFiscalYearDates();

//             // Prepare request data based on date format
//             const requestData = {
//                 startDate: isNepaliFormat ? null : nextDates.start,
//                 endDate: isNepaliFormat ? null : nextDates.end,
//                 startDateNepali: isNepaliFormat ? nextDates.startNepali : null,
//                 endDateNepali: isNepaliFormat ? nextDates.endNepali : null
//             };

//             const response = await api.post('/api/FiscalYears/create-next', requestData);

//             clearInterval(progressInterval);
//             setProgress(100);

//             if (response.data.success) {
//                 setNewFiscalYear(response.data.data);
//                 setStep(2);
//                 setNotification({
//                     show: true,
//                     message: 'New fiscal year created successfully! Now transfer balances.',
//                     type: 'success',
//                     duration: 5000
//                 });
//             } else {
//                 throw new Error(response.data.error || 'Failed to create fiscal year');
//             }
//         } catch (err) {
//             console.error('Create fiscal year error:', err);
//             setNotification({
//                 show: true,
//                 message: err.response?.data?.error || err.message || 'Failed to create fiscal year',
//                 type: 'error',
//                 duration: 5000
//             });
//         } finally {
//             setTransferring(false);
//             setTimeout(() => setProgress(0), 500);
//         }
//     };

//     const validateNepaliDate = (dateStr) => {
//         if (!dateStr) return false;

//         const nepaliDateFormat = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/;
//         if (!nepaliDateFormat.test(dateStr)) return false;

//         const normalizedDateStr = dateStr.replace(/-/g, '/');
//         const [year, month, day] = normalizedDateStr.split('/').map(Number);

//         if (month < 1 || month > 12) return false;
//         if (day < 1 || day > 32) return false;

//         try {
//             const nepaliDate = new NepaliDate(year, month - 1, day);
//             return (nepaliDate.getYear() === year &&
//                 nepaliDate.getMonth() + 1 === month &&
//                 nepaliDate.getDate() === day);
//         } catch {
//             return false;
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

//     const nextDates = getNextFiscalYearDates();
//     const isNepaliFormat = fiscalData?.companyDateFormat === 'nepali';

//     return (
//         <div className="container-fluid">
//             <Header />

//             {/* Success Modal */}
//             <Modal show={showSuccessModal} onHide={() => setShowSuccessModal(false)} centered size="lg">
//                 <Modal.Header closeButton className="bg-success text-white border-0">
//                     <Modal.Title className="d-flex align-items-center">
//                         <FaCheck className="me-2" />
//                         Fiscal Year Transition Complete!
//                     </Modal.Title>
//                 </Modal.Header>
//                 <Modal.Body className="p-4">
//                     <div className="text-center mb-4">
//                         <FaCheck className="text-success mb-3" size={48} />
//                         <h5 className="text-success mb-3">Transition Completed Successfully!</h5>
//                         <p className="mb-3">
//                             New fiscal year <strong>{newFiscalYear?.fiscalYear?.name}</strong> is now active.
//                             All balances have been transferred from the previous fiscal year.
//                         </p>
//                     </div>

//                     {transferResult && (
//                         <Row className="mb-3">
//                             <Col md={6}>
//                                 <div className="bg-light p-3 rounded">
//                                     <h6 className="mb-2">📦 Items Summary</h6>
//                                     <p className="mb-1 small">Items with Stock: {transferResult.itemsSummary?.itemsWithStock || 0}</p>
//                                     <p className="mb-1 small">Total Stock Value: Rs. {(transferResult.itemsSummary?.totalClosingStockValue || 0).toLocaleString()}</p>
//                                 </div>
//                             </Col>
//                             <Col md={6}>
//                                 <div className="bg-light p-3 rounded">
//                                     <h6 className="mb-2">💰 Accounts Summary</h6>
//                                     <p className="mb-1 small">Accounts Processed: {transferResult.accountsSummary?.accountsProcessed || 0}</p>
//                                     <p className="mb-1 small">Total Balance: Rs. {(transferResult.accountsSummary?.totalDebitBalance || 0).toLocaleString()}</p>
//                                 </div>
//                             </Col>
//                         </Row>
//                     )}

//                     <div className="bg-info bg-opacity-10 p-2 rounded text-center">
//                         <small className="text-muted">
//                             Opening Balance Voucher: {transferResult?.openingBalanceVoucherNo || 'N/A'}
//                         </small>
//                     </div>
//                 </Modal.Body>
//                 <Modal.Footer className="border-0">
//                     <Button
//                         variant="success"
//                         onClick={() => {
//                             setShowSuccessModal(false);
//                             window.location.reload();
//                         }}
//                         className="px-4"
//                     >
//                         Go to Dashboard
//                     </Button>
//                 </Modal.Footer>
//             </Modal>

//             {/* Confirmation Modal for Transfer */}
//             <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)} centered size="lg">
//                 <Modal.Header closeButton className="bg-warning text-dark border-0">
//                     <Modal.Title className="d-flex align-items-center">
//                         <FaExclamationTriangle className="me-2" />
//                         Confirm Balance Transfer
//                     </Modal.Title>
//                 </Modal.Header>
//                 <Modal.Body className="p-4">
//                     <Alert variant="info" className="d-flex align-items-start">
//                         <FaInfoCircle className="me-2 mt-1 flex-shrink-0" />
//                         <div>
//                             <strong>This operation will:</strong>
//                             <ul className="mb-0 mt-2">
//                                 <li>Transfer all closing stock balances to new fiscal year</li>
//                                 <li>Transfer all account closing balances</li>
//                                 <li>Create opening balance transaction</li>
//                                 <li>Activate the new fiscal year</li>
//                                 <li>Deactivate the current fiscal year</li>
//                             </ul>
//                         </div>
//                     </Alert>
//                     <p className="mb-0">
//                         Are you sure you want to transfer balances from <strong>{fiscalData?.currentFiscalYear?.name}</strong> to <strong>{newFiscalYear?.fiscalYear?.name}</strong>?
//                     </p>
//                     <p className="text-muted small mt-2 mb-0">
//                         ⚠️ This action cannot be undone. Please ensure all transactions are completed.
//                     </p>
//                 </Modal.Body>
//                 <Modal.Footer className="border-0">
//                     <Button variant="outline-secondary" onClick={() => setShowConfirmModal(false)}>
//                         Cancel
//                     </Button>
//                     <Button variant="primary" onClick={handleTransferBalances} disabled={transferring}>
//                         {transferring ? <Spinner size="sm" className="me-2" /> : null}
//                         Confirm Transfer
//                     </Button>
//                 </Modal.Footer>
//             </Modal>

//             {/* Main Content */}
//             <div className="card mt-2 shadow-lg p-0 expanded-card ledger-card compact">
//                 <div className="card-header bg-white py-2">
//                     <h1 className="h5 mb-0 text-center text-primary">
//                         <FaCalendarAlt className="me-2" />
//                         Fiscal Year Transition
//                     </h1>
//                 </div>
//                 <div className="card-body p-3">

//                     {/* Company Info */}
//                     {fiscalData?.currentCompanyName && (
//                         <div className="alert alert-info text-center py-1 mb-3 small">
//                             <strong>{fiscalData.currentCompanyName}</strong>
//                             {fiscalData.companyDateFormat && (
//                                 <span className="ms-2">
//                                     (Date Format: {fiscalData.companyDateFormat === 'nepali' ? 'Nepali (BS)' : 'English (AD)'})
//                                 </span>
//                             )}
//                         </div>
//                     )}

//                     {/* Current Fiscal Year Info */}
//                     {fiscalData?.currentFiscalYear && (
//                         <div className="bg-light p-2 rounded mb-3">
//                             <div className="row text-center small">
//                                 <div className="col-md-4">
//                                     <strong>Current Fiscal Year:</strong> {fiscalData.currentFiscalYear.name}
//                                 </div>
//                                 <div className="col-md-4">
//                                     <strong>Start:</strong> {formatDate(fiscalData.currentFiscalYear.startDate, fiscalData.companyDateFormat, fiscalData.currentFiscalYear.startDateNepali)}
//                                 </div>
//                                 <div className="col-md-4">
//                                     <strong>End:</strong> {formatDate(fiscalData.currentFiscalYear.endDate, fiscalData.companyDateFormat, fiscalData.currentFiscalYear.endDateNepali)}
//                                 </div>
//                             </div>
//                         </div>
//                     )}

//                     {/* Step Progress Indicator */}
//                     <div className="d-flex justify-content-between mb-4">
//                         <div className={`text-center flex-grow-1 ${step >= 1 ? 'text-primary' : 'text-muted'}`}>
//                             <div className={`rounded-circle mx-auto mb-1 d-flex align-items-center justify-content-center ${step >= 1 ? 'bg-primary' : 'bg-secondary'} text-white`}
//                                 style={{ width: '30px', height: '30px' }}>
//                                 1
//                             </div>
//                             <small>Create Fiscal Year</small>
//                         </div>
//                         <div className="flex-grow-1 text-center">
//                             <FaArrowRight className="mt-2 text-muted" />
//                         </div>
//                         <div className={`text-center flex-grow-1 ${step >= 2 ? 'text-primary' : 'text-muted'}`}>
//                             <div className={`rounded-circle mx-auto mb-1 d-flex align-items-center justify-content-center ${step >= 2 ? 'bg-primary' : 'bg-secondary'} text-white`}
//                                 style={{ width: '30px', height: '30px' }}>
//                                 2
//                             </div>
//                             <small>Transfer Balances</small>
//                         </div>
//                     </div>

//                     {/* Error Alert */}
//                     {error && (
//                         <Alert variant="danger" className="mb-3 py-1 small" dismissible onClose={() => setError(null)}>
//                             <FaExclamationTriangle className="me-2" />
//                             {error}
//                         </Alert>
//                     )}

//                     {/* Progress Bar during operation */}
//                     {transferring && (
//                         <Card className="mb-3 border-0 bg-light">
//                             <Card.Body className="p-3">
//                                 <div className="mb-2">
//                                     <ProgressBar
//                                         now={progress}
//                                         label={`${progress}%`}
//                                         style={{ height: '20px' }}
//                                         variant={progress === 100 ? 'success' : 'primary'}
//                                         animated={progress < 100}
//                                     />
//                                 </div>
//                                 <p className="text-muted small mb-0 text-center">
//                                     {step === 1 && progress < 100 ? 'Creating new fiscal year...' :
//                                         step === 2 && progress < 100 ? 'Transferring balances...' :
//                                             'Complete!'}
//                                 </p>
//                             </Card.Body>
//                         </Card>
//                     )}

//                     {/* Step 1: Create Fiscal Year */}
//                     {step === 1 && !newFiscalYear && (
//                         <div className="border rounded p-3">
//                             <h6 className="mb-3">
//                                 📅 Next Fiscal Year Details
//                                 <small className="text-muted ms-2">
//                                     ({isNepaliFormat ? 'Nepali Calendar BS' : 'English Calendar AD'})
//                                 </small>
//                             </h6>

//                             {isNepaliFormat ? (
//                                 // Nepali Date Format Display
//                                 <>
//                                     <Row className="mb-3">
//                                         <Col md={6}>
//                                             <div className="bg-info bg-opacity-10 p-2 rounded">
//                                                 <small className="text-muted">Start Date (BS)</small>
//                                                 <p className="mb-0 fw-bold font-monospace">{nextDates.start}</p>
//                                             </div>
//                                         </Col>
//                                         <Col md={6}>
//                                             <div className="bg-info bg-opacity-10 p-2 rounded">
//                                                 <small className="text-muted">End Date (BS)</small>
//                                                 <p className="mb-0 fw-bold font-monospace">{nextDates.end}</p>
//                                             </div>
//                                         </Col>
//                                     </Row>

//                                     <div className="alert alert-secondary py-2 small">
//                                         <i className="fas fa-calendar-alt me-2"></i>
//                                         <strong>Fiscal Year Calculation:</strong>
//                                         The new fiscal year starts on {nextDates.start} BS and ends on {nextDates.end} BS.
//                                         This is calculated as 1 year from the current fiscal year end date.
//                                     </div>

//                                     <div className="alert alert-warning py-2 small">
//                                         <FaInfoCircle className="me-2" />
//                                         Nepali fiscal year typically runs from Shrawan 1 to Ashad 32.
//                                         The system will auto-calculate the correct dates.
//                                     </div>
//                                 </>
//                             ) : (
//                                 // English Date Format Display
//                                 <>
//                                     <Row className="mb-3">
//                                         <Col md={6}>
//                                             <div className="bg-info bg-opacity-10 p-2 rounded">
//                                                 <small className="text-muted">Start Date (AD)</small>
//                                                 <p className="mb-0 fw-bold">{nextDates.start}</p>
//                                                 <small className="text-muted">({nextDates.startNepali} BS)</small>
//                                             </div>
//                                         </Col>
//                                         <Col md={6}>
//                                             <div className="bg-info bg-opacity-10 p-2 rounded">
//                                                 <small className="text-muted">End Date (AD)</small>
//                                                 <p className="mb-0 fw-bold">{nextDates.end}</p>
//                                                 <small className="text-muted">({nextDates.endNepali} BS)</small>
//                                             </div>
//                                         </Col>
//                                     </Row>

//                                     <div className="alert alert-secondary py-2 small">
//                                         <i className="fas fa-calendar-alt me-2"></i>
//                                         <strong>Fiscal Year Calculation:</strong>
//                                         The new fiscal year starts on {nextDates.start} AD and ends on {nextDates.end} AD.
//                                         This is calculated as the day after current fiscal year ends, for a 365-day period.
//                                     </div>
//                                 </>
//                             )}

//                             <Button
//                                 variant="primary"
//                                 onClick={handleCreateFiscalYear}
//                                 disabled={transferring}
//                                 className="w-100"
//                             >
//                                 {transferring ? (
//                                     <>
//                                         <Spinner as="span" animation="border" size="sm" className="me-2" />
//                                         Creating Fiscal Year...
//                                     </>
//                                 ) : (
//                                     <>
//                                         <FaCalendarAlt className="me-2" />
//                                         Create New Fiscal Year
//                                     </>
//                                 )}
//                             </Button>
//                         </div>
//                     )}

//                     {/* Step 2: Transfer Balances */}
//                     {step === 2 && newFiscalYear && (
//                         <div>
//                             <div className="border rounded p-3 mb-3 bg-success bg-opacity-10">
//                                 <h6 className="mb-2 text-success">✓ New Fiscal Year Created</h6>
//                                 <Row className="small">
//                                     <Col md={4}>
//                                         <strong>Name:</strong> {newFiscalYear.fiscalYear?.name}
//                                     </Col>
//                                     <Col md={4}>
//                                         <strong>Start:</strong> {formatDate(newFiscalYear.fiscalYear?.startDate, fiscalData?.companyDateFormat, newFiscalYear.fiscalYear?.startDateNepali)}
//                                     </Col>
//                                     <Col md={4}>
//                                         <strong>End:</strong> {formatDate(newFiscalYear.fiscalYear?.endDate, fiscalData?.companyDateFormat, newFiscalYear.fiscalYear?.endDateNepali)}
//                                     </Col>
//                                 </Row>
//                             </div>

//                             <div className="border rounded p-3">
//                                 <h6 className="mb-3">🔄 Balance Transfer</h6>

//                                 <div className="d-flex justify-content-between align-items-center mb-3">
//                                     <div className="text-center flex-grow-1">
//                                         <div className="bg-secondary bg-opacity-10 p-2 rounded">
//                                             <small>Source</small>
//                                             <p className="mb-0 fw-bold">{fiscalData?.currentFiscalYear?.name}</p>
//                                             <small className="text-muted">
//                                                 ({formatDate(fiscalData?.currentFiscalYear?.startDate, fiscalData?.companyDateFormat, fiscalData?.currentFiscalYear?.startDateNepali)} - {formatDate(fiscalData?.currentFiscalYear?.endDate, fiscalData?.companyDateFormat, fiscalData?.currentFiscalYear?.endDateNepali)})
//                                             </small>
//                                         </div>
//                                     </div>
//                                     <FaArrowRight className="mx-2 text-primary" />
//                                     <div className="text-center flex-grow-1">
//                                         <div className="bg-success bg-opacity-10 p-2 rounded">
//                                             <small>Target</small>
//                                             <p className="mb-0 fw-bold">{newFiscalYear.fiscalYear?.name}</p>
//                                             <small className="text-muted">
//                                                 ({formatDate(newFiscalYear.fiscalYear?.startDate, fiscalData?.companyDateFormat, newFiscalYear.fiscalYear?.startDateNepali)} - {formatDate(newFiscalYear.fiscalYear?.endDate, fiscalData?.companyDateFormat, newFiscalYear.fiscalYear?.endDateNepali)})
//                                             </small>
//                                         </div>
//                                     </div>
//                                 </div>

//                                 <div className="alert alert-info py-2 small">
//                                     <FaClipboardList className="me-2" />
//                                     <strong>What will be transferred:</strong>
//                                     <ul className="mb-0 mt-1">
//                                         <li>Item stock balances (closing stock becomes opening stock)</li>
//                                         <li>Account balances (debit/credit balances)</li>
//                                         <li>Party outstanding balances</li>
//                                         <li>All opening balances will be recorded with date: {isNepaliFormat ? currentNepaliDate : currentEnglishDate} {isNepaliFormat ? '(BS)' : '(AD)'}</li>
//                                     </ul>
//                                 </div>

//                                 <div className="d-flex gap-2">
//                                     <Button
//                                         variant="outline-secondary"
//                                         onClick={() => {
//                                             setStep(1);
//                                             setNewFiscalYear(null);
//                                         }}
//                                         disabled={transferring}
//                                         className="flex-grow-1"
//                                     >
//                                         Back
//                                     </Button>
//                                     <Button
//                                         variant="success"
//                                         onClick={() => setShowConfirmModal(true)}
//                                         disabled={transferring}
//                                         className="flex-grow-1"
//                                     >
//                                         {transferring ? (
//                                             <>
//                                                 <Spinner as="span" animation="border" size="sm" className="me-2" />
//                                                 Transferring...
//                                             </>
//                                         ) : (
//                                             <>
//                                                 <FaExchangeAlt className="me-2" />
//                                                 Transfer Balances
//                                             </>
//                                         )}
//                                     </Button>
//                                 </div>
//                             </div>
//                         </div>
//                     )}

//                     {/* Transfer Result Summary (after transfer, before page reload) */}
//                     {transferResult && !transferring && !showSuccessModal && (
//                         <div className="mt-3 p-2 bg-success bg-opacity-10 rounded border border-success">
//                             <div className="d-flex align-items-center mb-2">
//                                 <FaCheck className="text-success me-2" />
//                                 <strong className="small">Transfer Complete!</strong>
//                             </div>
//                             <Row className="small">
//                                 <Col md={4}>
//                                     📦 Items: {transferResult.itemsSummary?.itemsWithStock || 0}
//                                 </Col>
//                                 <Col md={4}>
//                                     💰 Accounts: {transferResult.accountsSummary?.accountsProcessed || 0}
//                                 </Col>
//                                 <Col md={4}>
//                                     🧾 Voucher: {transferResult.openingBalanceVoucherNo}
//                                 </Col>
//                             </Row>
//                             <Button
//                                 variant="success"
//                                 size="sm"
//                                 className="mt-2 w-100"
//                                 onClick={() => window.location.reload()}
//                             >
//                                 Refresh Page
//                             </Button>
//                         </div>
//                     )}

//                     {/* Info Note */}
//                     <div className="alert alert-secondary mt-3 py-1 mb-0 small">
//                         <FaInfoCircle className="me-1" />
//                         <strong>Note:</strong> Fiscal year transition is a critical operation.
//                         Please ensure all transactions are completed before proceeding.
//                         {isNepaliFormat ? (
//                             <span className="ms-2">Dates are in Nepali format (BS YYYY-MM-DD).</span>
//                         ) : (
//                             <span className="ms-2">Dates are in English format (AD YYYY-MM-DD).</span>
//                         )}
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

// export default ChangeNewFiscalYear;

//------------------------------------------------------------end

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    Row,
    Col,
    Form,
    Button,
    Modal,
    ProgressBar,
    Alert,
    Spinner,
    Card
} from 'react-bootstrap';
import {
    FaCalendarAlt,
    FaCheck,
    FaExclamationTriangle,
    FaInfoCircle,
    FaExchangeAlt,
    FaClipboardList,
    FaArrowRight
} from 'react-icons/fa';
import Header from '../retailer/Header';
import Loader from '../Loader';
import NotificationToast from '../NotificationToast';
// import NepaliDate from 'nepali-date-converter';
import NepaliDate from 'nepali-datetime';

const ChangeNewFiscalYear = () => {
    const navigate = useNavigate();
    const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
    const currentEnglishDate = new Date().toISOString().split('T')[0];

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
            (error) => Promise.reject(error)
        );
        return instance;
    }, []);

    const [fiscalData, setFiscalData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [step, setStep] = useState(1);
    const [newFiscalYear, setNewFiscalYear] = useState(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [transferring, setTransferring] = useState(false);
    const [progress, setProgress] = useState(0);
    const [transferResult, setTransferResult] = useState(null);
    const [notification, setNotification] = useState({
        show: false,
        message: '',
        type: 'success',
        duration: 3000
    });

    useEffect(() => {
        fetchFiscalData();
    }, []);

    const fetchFiscalData = async () => {
        try {
            setLoading(true);
            const response = await api.get('/api/FiscalYears/change-fiscal-year');

            if (response.data.success) {
                const data = response.data.data;
                setFiscalData(data);
                setError(null);
            } else {
                throw new Error(response.data.error || 'Failed to fetch fiscal data');
            }
        } catch (err) {
            console.error('Fetch error:', err);
            const errorMsg = err.response?.data?.error || err.message || 'Failed to fetch fiscal data';
            setError(errorMsg);

            if (err.response?.status === 401) {
                localStorage.removeItem('token');
                navigate('/login');
            }
        } finally {
            setLoading(false);
        }
    };

    // Get days in a Nepali month (handles 32 days for Ashadh)
    const getNepaliDaysInMonth = (year, month) => {
        // Nepali months: Baisakh(1)=31, Jestha(2)=31, Ashadh(3)=32, Shrawan(4)=31, 
        // Bhadra(5)=31, Ashwin(6)=31, Kartik(7)=30, Mangsir(8)=30, 
        // Poush(9)=30, Magh(10)=30, Falgun(11)=30, Chaitra(12)=30
        // Note: Some years have variations (e.g., Ashadh can be 31 in some years)
        const monthDays = {
            1: 31,  // Baisakh
            2: 31,  // Jestha
            3: 32,  // Ashadh
            4: 31,  // Shrawan
            5: 31,  // Bhadra
            6: 31,  // Ashwin
            7: 30,  // Kartik
            8: 30,  // Mangsir
            9: 30,  // Poush
            10: 30, // Magh
            11: 30, // Falgun
            12: 30  // Chaitra
        };
        
        return monthDays[month] || 30;
    };

    // Add days to a Nepali date with proper month boundary handling
    const addDaysToNepaliDate = (year, month, day, daysToAdd) => {
        let newYear = year;
        let newMonth = month;
        let newDay = day + daysToAdd;
        
        while (newDay > getNepaliDaysInMonth(newYear, newMonth)) {
            newDay -= getNepaliDaysInMonth(newYear, newMonth);
            newMonth++;
            if (newMonth > 12) {
                newMonth = 1;
                newYear++;
            }
        }
        
        while (newDay < 1) {
            newMonth--;
            if (newMonth < 1) {
                newMonth = 12;
                newYear--;
            }
            newDay += getNepaliDaysInMonth(newYear, newMonth);
        }
        
        return { year: newYear, month: newMonth, day: newDay };
    };

    // Subtract days from a Nepali date
    const subtractDaysFromNepaliDate = (year, month, day, daysToSubtract) => {
        return addDaysToNepaliDate(year, month, day, -daysToSubtract);
    };

    // Format Nepali date to string
    const formatNepaliDateString = (year, month, day) => {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    };

    // Parse Nepali date string to components
    const parseNepaliDate = (dateString) => {
        if (!dateString) return null;
        const parts = dateString.split('-');
        if (parts.length === 3) {
            return {
                year: parseInt(parts[0]),
                month: parseInt(parts[1]),
                day: parseInt(parts[2])
            };
        }
        return null;
    };

    const formatDate = (dateString, dateFormat, nepaliDateString) => {
        if (!dateString) return 'N/A';

        if (dateFormat === 'nepali') {
            if (nepaliDateString) {
                try {
                    const nepaliDate = new NepaliDate(nepaliDateString);
                    return nepaliDate.format('YYYY-MM-DD');
                } catch {
                    return nepaliDateString;
                }
            }
            try {
                const nepaliDate = new NepaliDate(dateString);
                return nepaliDate.format('YYYY-MM-DD');
            } catch {
                return dateString;
            }
        } else {
            try {
                return new Date(dateString).toLocaleDateString();
            } catch {
                return dateString;
            }
        }
    };

    const getNextFiscalYearDates = () => {
        if (!fiscalData?.currentFiscalYear) {
            return { start: 'N/A', end: 'N/A', startNepali: 'N/A', endNepali: 'N/A', name: 'N/A' };
        }

        const isNepaliFormat = fiscalData.companyDateFormat === 'nepali';

        if (isNepaliFormat) {
            // Handle Nepali date format with proper 32-day month handling
            const currentEndDateNepali = fiscalData.currentFiscalYear.endDateNepali;
            if (currentEndDateNepali && currentEndDateNepali !== 'N/A') {
                try {
                    const endDate = parseNepaliDate(currentEndDateNepali);
                    if (endDate) {
                        // Next fiscal year start = current end date + 1 day
                        const startDate = addDaysToNepaliDate(endDate.year, endDate.month, endDate.day, 1);
                        
                        // Next fiscal year end = start date + 1 year - 1 day
                        // First add 1 year to start date
                        let endYearCalc = startDate.year + 1;
                        let endMonthCalc = startDate.month;
                        let endDayCalc = startDate.day;
                        
                        // Then subtract 1 day
                        const endDateResult = subtractDaysFromNepaliDate(endYearCalc, endMonthCalc, endDayCalc, 1);
                        
                        // Generate name for Nepali fiscal year (e.g., "2082/2083" or "2082/83")
                        const fiscalStartYear = startDate.year;
                        const fiscalEndYear = startDate.year + 1;
                        const fiscalYearName = `${fiscalStartYear}/${fiscalEndYear}`;
                        
                        return {
                            start: formatNepaliDateString(startDate.year, startDate.month, startDate.day),
                            end: formatNepaliDateString(endDateResult.year, endDateResult.month, endDateResult.day),
                            startNepali: formatNepaliDateString(startDate.year, startDate.month, startDate.day),
                            endNepali: formatNepaliDateString(endDateResult.year, endDateResult.month, endDateResult.day),
                            name: fiscalYearName
                        };
                    }
                } catch (e) {
                    console.error('Error calculating Nepali dates:', e);
                }
            }
            
            // Fallback: Use current date for calculation
            const currentDate = new NepaliDate();
            const startNepaliDate = new NepaliDate(currentDate.getYear() + 1, 1, 1);
            const endNepaliDate = new NepaliDate(startNepaliDate.getYear() + 1, startNepaliDate.getMonth(), startNepaliDate.getDate() - 1);
            
            return {
                start: startNepaliDate.format('YYYY-MM-DD'),
                end: endNepaliDate.format('YYYY-MM-DD'),
                startNepali: startNepaliDate.format('YYYY-MM-DD'),
                endNepali: endNepaliDate.format('YYYY-MM-DD'),
                name: `${startNepaliDate.getYear()}/${startNepaliDate.getYear() + 1}`
            };
        } else {
            // Handle English date format
            const currentEndDate = fiscalData.currentFiscalYear.endDate;
            if (currentEndDate) {
                const endDate = new Date(currentEndDate);
                const startDate = new Date(endDate);
                startDate.setDate(startDate.getDate() + 1);
                const nextEndDate = new Date(startDate);
                nextEndDate.setFullYear(nextEndDate.getFullYear() + 1);
                nextEndDate.setDate(nextEndDate.getDate() - 1);
                
                // Generate name for English fiscal year (e.g., "2024/2025" or "2024/25")
                const fiscalYearName = `${startDate.getFullYear()}/${startDate.getFullYear() + 1}`;
                
                return {
                    start: startDate.toISOString().split('T')[0],
                    end: nextEndDate.toISOString().split('T')[0],
                    startNepali: new NepaliDate(startDate).format('YYYY-MM-DD'),
                    endNepali: new NepaliDate(nextEndDate).format('YYYY-MM-DD'),
                    name: fiscalYearName
                };
            }
        }

        return { start: 'N/A', end: 'N/A', startNepali: 'N/A', endNepali: 'N/A', name: 'N/A' };
    };

    const handleCreateFiscalYear = async () => {
        setTransferring(true);
        setProgress(0);

        try {
            const progressInterval = setInterval(() => {
                setProgress(prev => Math.min(prev + 20, 50));
            }, 500);

            const nextDates = getNextFiscalYearDates();
            const isNepaliFormat = fiscalData?.companyDateFormat === 'nepali';

            // Prepare request data based on date format
            const requestData = {};
            
            if (isNepaliFormat) {
                requestData.startDateNepali = nextDates.startNepali;
                requestData.endDateNepali = nextDates.endNepali;
                requestData.startDate = null;
                requestData.endDate = null;
            } else {
                requestData.startDate = nextDates.start;
                requestData.endDate = nextDates.end;
                requestData.startDateNepali = nextDates.startNepali;
                requestData.endDateNepali = nextDates.endNepali;
            }

            console.log('Creating fiscal year with data:', requestData);

            const response = await api.post('/api/FiscalYears/create-next', requestData);

            clearInterval(progressInterval);
            setProgress(100);

            if (response.data.success) {
                setNewFiscalYear(response.data.data);
                setStep(2);
                setNotification({
                    show: true,
                    message: `New fiscal year ${nextDates.name} created successfully! Now transfer balances.`,
                    type: 'success',
                    duration: 5000
                });
            } else {
                throw new Error(response.data.error || 'Failed to create fiscal year');
            }
        } catch (err) {
            console.error('Create fiscal year error:', err);
            setNotification({
                show: true,
                message: err.response?.data?.error || err.message || 'Failed to create fiscal year',
                type: 'error',
                duration: 5000
            });
        } finally {
            setTransferring(false);
            setTimeout(() => setProgress(0), 500);
        }
    };

    const handleTransferBalances = async () => {
        setTransferring(true);
        setProgress(0);
        setShowConfirmModal(false);

        try {
            const isNepaliFormat = fiscalData?.companyDateFormat === 'nepali';
            
            const requestData = {
                sourceFiscalYearId: fiscalData?.currentFiscalYear?.id,
                targetFiscalYearId: newFiscalYear?.fiscalYear?.id,
                transferDate: isNepaliFormat ? currentNepaliDate : currentEnglishDate,
                transferDateNepali: currentNepaliDate,
                transferItems: true,
                transferAccounts: true
            };

            // Simulate progress for better UX
            const progressInterval = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 90) {
                        clearInterval(progressInterval);
                        return 90;
                    }
                    return prev + 10;
                });
            }, 800);

            const response = await api.post('/api/FiscalYears/transfer', requestData);

            clearInterval(progressInterval);
            setProgress(100);

            if (response.data.success) {
                setTransferResult(response.data.data);
                setShowSuccessModal(true);
                setNotification({
                    show: true,
                    message: 'Balances transferred successfully!',
                    type: 'success',
                    duration: 5000
                });
            } else {
                throw new Error(response.data.message || 'Transfer failed');
            }
        } catch (err) {
            console.error('Transfer error:', err);
            setNotification({
                show: true,
                message: err.response?.data?.message || err.message || 'Failed to transfer balances',
                type: 'error',
                duration: 5000
            });
        } finally {
            setTransferring(false);
            setTimeout(() => setProgress(0), 1000);
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

    const nextDates = getNextFiscalYearDates();
    const isNepaliFormat = fiscalData?.companyDateFormat === 'nepali';

    return (
        <div className="container-fluid">
            <Header />

            {/* Success Modal */}
            <Modal show={showSuccessModal} onHide={() => setShowSuccessModal(false)} centered size="lg">
                <Modal.Header closeButton className="bg-success text-white border-0">
                    <Modal.Title className="d-flex align-items-center">
                        <FaCheck className="me-2" />
                        Fiscal Year Transition Complete!
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    <div className="text-center mb-4">
                        <FaCheck className="text-success mb-3" size={48} />
                        <h5 className="text-success mb-3">Transition Completed Successfully!</h5>
                        <p className="mb-3">
                            New fiscal year <strong>{newFiscalYear?.fiscalYear?.name}</strong> is now active.
                            All balances have been transferred from the previous fiscal year.
                        </p>
                    </div>

                    {transferResult && (
                        <Row className="mb-3">
                            <Col md={6}>
                                <div className="bg-light p-3 rounded">
                                    <h6 className="mb-2">📦 Items Summary</h6>
                                    <p className="mb-1 small">Items with Stock: {transferResult.itemsSummary?.itemsWithStock || 0}</p>
                                    <p className="mb-1 small">Total Stock Value: Rs. {(transferResult.itemsSummary?.totalClosingStockValue || 0).toLocaleString()}</p>
                                </div>
                            </Col>
                            <Col md={6}>
                                <div className="bg-light p-3 rounded">
                                    <h6 className="mb-2">💰 Accounts Summary</h6>
                                    <p className="mb-1 small">Accounts Processed: {transferResult.accountsSummary?.accountsProcessed || 0}</p>
                                    <p className="mb-1 small">Total Balance: Rs. {(transferResult.accountsSummary?.totalDebitBalance || 0).toLocaleString()}</p>
                                </div>
                            </Col>
                        </Row>
                    )}

                    <div className="bg-info bg-opacity-10 p-2 rounded text-center">
                        <small className="text-muted">
                            Opening Balance Voucher: {transferResult?.openingBalanceVoucherNo || 'N/A'}
                        </small>
                    </div>
                </Modal.Body>
                <Modal.Footer className="border-0">
                    <Button
                        variant="success"
                        onClick={() => {
                            setShowSuccessModal(false);
                            window.location.reload();
                        }}
                        className="px-4"
                    >
                        Go to Dashboard
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Confirmation Modal for Transfer */}
            <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)} centered size="lg">
                <Modal.Header closeButton className="bg-warning text-dark border-0">
                    <Modal.Title className="d-flex align-items-center">
                        <FaExclamationTriangle className="me-2" />
                        Confirm Balance Transfer
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    <Alert variant="info" className="d-flex align-items-start">
                        <FaInfoCircle className="me-2 mt-1 flex-shrink-0" />
                        <div>
                            <strong>This operation will:</strong>
                            <ul className="mb-0 mt-2">
                                <li>Transfer all closing stock balances to new fiscal year</li>
                                <li>Transfer all account closing balances</li>
                                <li>Create opening balance transaction</li>
                                <li>Activate the new fiscal year</li>
                                <li>Deactivate the current fiscal year</li>
                            </ul>
                        </div>
                    </Alert>
                    <p className="mb-0">
                        Are you sure you want to transfer balances from <strong>{fiscalData?.currentFiscalYear?.name}</strong> to <strong>{newFiscalYear?.fiscalYear?.name}</strong>?
                    </p>
                    <p className="text-muted small mt-2 mb-0">
                        ⚠️ This action cannot be undone. Please ensure all transactions are completed.
                    </p>
                </Modal.Body>
                <Modal.Footer className="border-0">
                    <Button variant="outline-secondary" onClick={() => setShowConfirmModal(false)}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={handleTransferBalances} disabled={transferring}>
                        {transferring ? <Spinner size="sm" className="me-2" /> : null}
                        Confirm Transfer
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Main Content */}
            <div className="card mt-2 shadow-lg p-0 expanded-card ledger-card compact">
                <div className="card-header bg-white py-2">
                    <h1 className="h5 mb-0 text-center text-primary">
                        <FaCalendarAlt className="me-2" />
                        Fiscal Year Transition
                    </h1>
                </div>
                <div className="card-body p-3">

                    {/* Company Info */}
                    {fiscalData?.currentCompanyName && (
                        <div className="alert alert-info text-center py-1 mb-3 small">
                            <strong>{fiscalData.currentCompanyName}</strong>
                            {fiscalData.companyDateFormat && (
                                <span className="ms-2">
                                    (Date Format: {fiscalData.companyDateFormat === 'nepali' ? 'Nepali (BS)' : 'English (AD)'})
                                </span>
                            )}
                        </div>
                    )}

                    {/* Current Fiscal Year Info */}
                    {fiscalData?.currentFiscalYear && (
                        <div className="bg-light p-2 rounded mb-3">
                            <div className="row text-center small">
                                <div className="col-md-4">
                                    <strong>Current Fiscal Year:</strong> {fiscalData.currentFiscalYear.name}
                                </div>
                                <div className="col-md-4">
                                    <strong>Start:</strong> {formatDate(fiscalData.currentFiscalYear.startDate, fiscalData.companyDateFormat, fiscalData.currentFiscalYear.startDateNepali)}
                                </div>
                                <div className="col-md-4">
                                    <strong>End:</strong> {formatDate(fiscalData.currentFiscalYear.endDate, fiscalData.companyDateFormat, fiscalData.currentFiscalYear.endDateNepali)}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step Progress Indicator */}
                    <div className="d-flex justify-content-between mb-4">
                        <div className={`text-center flex-grow-1 ${step >= 1 ? 'text-primary' : 'text-muted'}`}>
                            <div className={`rounded-circle mx-auto mb-1 d-flex align-items-center justify-content-center ${step >= 1 ? 'bg-primary' : 'bg-secondary'} text-white`}
                                style={{ width: '30px', height: '30px' }}>
                                1
                            </div>
                            <small>Create Fiscal Year</small>
                        </div>
                        <div className="flex-grow-1 text-center">
                            <FaArrowRight className="mt-2 text-muted" />
                        </div>
                        <div className={`text-center flex-grow-1 ${step >= 2 ? 'text-primary' : 'text-muted'}`}>
                            <div className={`rounded-circle mx-auto mb-1 d-flex align-items-center justify-content-center ${step >= 2 ? 'bg-primary' : 'bg-secondary'} text-white`}
                                style={{ width: '30px', height: '30px' }}>
                                2
                            </div>
                            <small>Transfer Balances</small>
                        </div>
                    </div>

                    {/* Error Alert */}
                    {error && (
                        <Alert variant="danger" className="mb-3 py-1 small" dismissible onClose={() => setError(null)}>
                            <FaExclamationTriangle className="me-2" />
                            {error}
                        </Alert>
                    )}

                    {/* Progress Bar during operation */}
                    {transferring && (
                        <Card className="mb-3 border-0 bg-light">
                            <Card.Body className="p-3">
                                <div className="mb-2">
                                    <ProgressBar
                                        now={progress}
                                        label={`${progress}%`}
                                        style={{ height: '20px' }}
                                        variant={progress === 100 ? 'success' : 'primary'}
                                        animated={progress < 100}
                                    />
                                </div>
                                <p className="text-muted small mb-0 text-center">
                                    {step === 1 && progress < 100 ? 'Creating new fiscal year...' :
                                        step === 2 && progress < 100 ? 'Transferring balances...' :
                                            'Complete!'}
                                </p>
                            </Card.Body>
                        </Card>
                    )}

                    {/* Step 1: Create Fiscal Year */}
                    {step === 1 && !newFiscalYear && (
                        <div className="border rounded p-3">
                            <h6 className="mb-3">
                                📅 Next Fiscal Year Details
                                <small className="text-muted ms-2">
                                    ({isNepaliFormat ? 'Nepali Calendar BS' : 'English Calendar AD'})
                                </small>
                            </h6>

                            {isNepaliFormat ? (
                                <>
                                    <Row className="mb-3">
                                        <Col md={6}>
                                            <div className="bg-info bg-opacity-10 p-2 rounded">
                                                <small className="text-muted">Start Date (BS)</small>
                                                <p className="mb-0 fw-bold font-monospace">{nextDates.start}</p>
                                            </div>
                                        </Col>
                                        <Col md={6}>
                                            <div className="bg-info bg-opacity-10 p-2 rounded">
                                                <small className="text-muted">End Date (BS)</small>
                                                <p className="mb-0 fw-bold font-monospace">{nextDates.end}</p>
                                            </div>
                                        </Col>
                                    </Row>
                                    
                                    <div className="alert alert-secondary py-2 small">
                                        <i className="fas fa-calendar-alt me-2"></i>
                                        <strong>New Fiscal Year Name:</strong> {nextDates.name}
                                    </div>

                                    <div className="alert alert-warning py-2 small">
                                        <FaInfoCircle className="me-2" />
                                        <strong>Nepali Calendar Note:</strong> 
                                        The Nepali fiscal year ends in Ashadh (month 3) which has 32 days. 
                                        The new fiscal year starts the day after Ashadh 32, which is Shrawan 1.
                                    </div>
                                </>
                            ) : (
                                <>
                                    <Row className="mb-3">
                                        <Col md={6}>
                                            <div className="bg-info bg-opacity-10 p-2 rounded">
                                                <small className="text-muted">Start Date (AD)</small>
                                                <p className="mb-0 fw-bold">{nextDates.start}</p>
                                                <small className="text-muted">({nextDates.startNepali} BS)</small>
                                            </div>
                                        </Col>
                                        <Col md={6}>
                                            <div className="bg-info bg-opacity-10 p-2 rounded">
                                                <small className="text-muted">End Date (AD)</small>
                                                <p className="mb-0 fw-bold">{nextDates.end}</p>
                                                <small className="text-muted">({nextDates.endNepali} BS)</small>
                                            </div>
                                        </Col>
                                    </Row>
                                    
                                    <div className="alert alert-secondary py-2 small">
                                        <i className="fas fa-calendar-alt me-2"></i>
                                        <strong>New Fiscal Year Name:</strong> {nextDates.name}
                                    </div>

                                    <div className="alert alert-info py-2 small">
                                        <FaInfoCircle className="me-2" />
                                        The new fiscal year starts the day after the current fiscal year ends.
                                    </div>
                                </>
                            )}

                            <Button
                                variant="primary"
                                onClick={handleCreateFiscalYear}
                                disabled={transferring}
                                className="w-100"
                            >
                                {transferring ? (
                                    <>
                                        <Spinner as="span" animation="border" size="sm" className="me-2" />
                                        Creating Fiscal Year...
                                    </>
                                ) : (
                                    <>
                                        <FaCalendarAlt className="me-2" />
                                        Create New Fiscal Year - {nextDates.name}
                                    </>
                                )}
                            </Button>
                        </div>
                    )}

                    {/* Step 2: Transfer Balances */}
                    {step === 2 && newFiscalYear && (
                        <div>
                            <div className="border rounded p-3 mb-3 bg-success bg-opacity-10">
                                <h6 className="mb-2 text-success">✓ New Fiscal Year Created</h6>
                                <Row className="small">
                                    <Col md={4}>
                                        <strong>Name:</strong> {newFiscalYear.fiscalYear?.name}
                                    </Col>
                                    <Col md={4}>
                                        <strong>Start:</strong> {formatDate(newFiscalYear.fiscalYear?.startDate, fiscalData?.companyDateFormat, newFiscalYear.fiscalYear?.startDateNepali)}
                                    </Col>
                                    <Col md={4}>
                                        <strong>End:</strong> {formatDate(newFiscalYear.fiscalYear?.endDate, fiscalData?.companyDateFormat, newFiscalYear.fiscalYear?.endDateNepali)}
                                    </Col>
                                </Row>
                            </div>

                            <div className="border rounded p-3">
                                <h6 className="mb-3">🔄 Balance Transfer</h6>

                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <div className="text-center flex-grow-1">
                                        <div className="bg-secondary bg-opacity-10 p-2 rounded">
                                            <small>Source</small>
                                            <p className="mb-0 fw-bold">{fiscalData?.currentFiscalYear?.name}</p>
                                            <small className="text-muted">
                                                ({formatDate(fiscalData?.currentFiscalYear?.startDate, fiscalData?.companyDateFormat, fiscalData?.currentFiscalYear?.startDateNepali)} - {formatDate(fiscalData?.currentFiscalYear?.endDate, fiscalData?.companyDateFormat, fiscalData?.currentFiscalYear?.endDateNepali)})
                                            </small>
                                        </div>
                                    </div>
                                    <FaArrowRight className="mx-2 text-primary" />
                                    <div className="text-center flex-grow-1">
                                        <div className="bg-success bg-opacity-10 p-2 rounded">
                                            <small>Target</small>
                                            <p className="mb-0 fw-bold">{newFiscalYear.fiscalYear?.name}</p>
                                            <small className="text-muted">
                                                ({formatDate(newFiscalYear.fiscalYear?.startDate, fiscalData?.companyDateFormat, newFiscalYear.fiscalYear?.startDateNepali)} - {formatDate(newFiscalYear.fiscalYear?.endDate, fiscalData?.companyDateFormat, newFiscalYear.fiscalYear?.endDateNepali)})
                                            </small>
                                        </div>
                                    </div>
                                </div>

                                <div className="alert alert-info py-2 small">
                                    <FaClipboardList className="me-2" />
                                    <strong>What will be transferred:</strong>
                                    <ul className="mb-0 mt-1">
                                        <li>Item stock balances (closing stock becomes opening stock)</li>
                                        <li>Account balances (debit/credit balances)</li>
                                        <li>Party outstanding balances</li>
                                        <li>All opening balances will be recorded with date: {isNepaliFormat ? currentNepaliDate : currentEnglishDate} {isNepaliFormat ? '(BS)' : '(AD)'}</li>
                                    </ul>
                                </div>

                                <div className="d-flex gap-2">
                                    <Button
                                        variant="outline-secondary"
                                        onClick={() => {
                                            setStep(1);
                                            setNewFiscalYear(null);
                                        }}
                                        disabled={transferring}
                                        className="flex-grow-1"
                                    >
                                        Back
                                    </Button>
                                    <Button
                                        variant="success"
                                        onClick={() => setShowConfirmModal(true)}
                                        disabled={transferring}
                                        className="flex-grow-1"
                                    >
                                        {transferring ? (
                                            <>
                                                <Spinner as="span" animation="border" size="sm" className="me-2" />
                                                Transferring...
                                            </>
                                        ) : (
                                            <>
                                                <FaExchangeAlt className="me-2" />
                                                Transfer Balances
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Transfer Result Summary */}
                    {transferResult && !transferring && !showSuccessModal && (
                        <div className="mt-3 p-2 bg-success bg-opacity-10 rounded border border-success">
                            <div className="d-flex align-items-center mb-2">
                                <FaCheck className="text-success me-2" />
                                <strong className="small">Transfer Complete!</strong>
                            </div>
                            <Row className="small">
                                <Col md={4}>
                                    📦 Items: {transferResult.itemsSummary?.itemsWithStock || 0}
                                </Col>
                                <Col md={4}>
                                    💰 Accounts: {transferResult.accountsSummary?.accountsProcessed || 0}
                                </Col>
                                <Col md={4}>
                                    🧾 Voucher: {transferResult.openingBalanceVoucherNo}
                                </Col>
                            </Row>
                            <Button
                                variant="success"
                                size="sm"
                                className="mt-2 w-100"
                                onClick={() => window.location.reload()}
                            >
                                Refresh Page
                            </Button>
                        </div>
                    )}

                    {/* Info Note */}
                    <div className="alert alert-secondary mt-3 py-1 mb-0 small">
                        <FaInfoCircle className="me-1" />
                        <strong>Note:</strong> Fiscal year transition is a critical operation.
                        Please ensure all transactions are completed before proceeding.
                        {isNepaliFormat ? (
                            <span className="ms-2">Dates are in Nepali format (BS YYYY-MM-DD). The Nepali month Ashadh has 32 days.</span>
                        ) : (
                            <span className="ms-2">Dates are in English format (AD YYYY-MM-DD).</span>
                        )}
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

export default ChangeNewFiscalYear;