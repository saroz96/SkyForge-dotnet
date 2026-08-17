// import React, { useState, useEffect, useRef, useCallback } from 'react';
// import axios from 'axios';
// import NepaliDate from 'nepali-datetime';
// import { format } from 'date-fns';

// // Date conversion utilities
// const convertBsToAd = (bsDate) => {
//     if (!bsDate || !/^\d{4}-\d{2}-\d{2}$/.test(bsDate)) return null;
//     try {
//         const nepaliDate = new NepaliDate(bsDate);
//         if (!nepaliDate || typeof nepaliDate.getDateObject !== 'function') return null;
//         const jsDate = nepaliDate.getDateObject();
//         if (!jsDate || isNaN(jsDate.getTime())) return null;
//         const year = jsDate.getFullYear();
//         const month = String(jsDate.getMonth() + 1).padStart(2, '0');
//         const day = String(jsDate.getDate()).padStart(2, '0');
//         return `${year}-${month}-${day}`;
//     } catch (error) {
//         console.error('Error converting BS to AD:', error);
//         return null;
//     }
// };

// const convertAdToBs = (adDate) => {
//     if (!adDate) return null;
//     try {
//         let date;
//         if (typeof adDate === 'string') {
//             if (/^\d{4}-\d{2}-\d{2}$/.test(adDate)) {
//                 date = new Date(adDate + 'T00:00:00');
//             } else {
//                 date = new Date(adDate);
//             }
//         } else if (adDate instanceof Date) {
//             date = adDate;
//         } else {
//             return null;
//         }
//         if (isNaN(date.getTime())) return null;
//         const nepaliDate = new NepaliDate(date);
//         if (!nepaliDate || typeof nepaliDate.getYear !== 'function') return null;
//         const year = nepaliDate.getYear();
//         const month = nepaliDate.getMonth();
//         const day = nepaliDate.getDate();
//         if (!year || month === undefined || !day) return null;
//         return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
//     } catch (error) {
//         console.error('Error converting AD to BS:', error);
//         return null;
//     }
// };

// const isValidNepaliDate = (dateStr) => {
//     if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
//     try {
//         const [year, month, day] = dateStr.split('-').map(Number);
//         if (month < 1 || month > 12) return false;
//         if (day < 1 || day > 32) return false;
//         const nepaliDate = new NepaliDate(dateStr);
//         if (!nepaliDate || typeof nepaliDate.getYear !== 'function') return false;
//         const bsYear = nepaliDate.getYear();
//         const bsMonth = nepaliDate.getMonth() + 1;
//         const bsDay = nepaliDate.getDate();
//         return (bsYear === year && bsMonth === month && bsDay === day);
//     } catch (error) {
//         return false;
//     }
// };

// const getCurrentNepaliDate = () => {
//     try {
//         const now = new NepaliDate();
//         if (!now || typeof now.getYear !== 'function') return '2080-01-01';
//         const year = now.getYear();
//         const month = now.getMonth() + 1;
//         const day = now.getDate();
//         if (!year || !month || !day) return '2080-01-01';
//         return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
//     } catch (error) {
//         return '2080-01-01';
//     }
// };

// const DailyCashSummary = ({ show, onClose, companyId, accountId }) => {
//     const currentNepaliDate = getCurrentNepaliDate();
//     const currentEnglishDate = new Date().toISOString().split('T')[0];

//     const [dateRange, setDateRange] = useState({
//         fromDate: currentNepaliDate,
//         toDate: currentNepaliDate,
//         fromDateAd: currentEnglishDate,
//         toDateAd: currentEnglishDate
//     });

//     const [dateErrors, setDateErrors] = useState({
//         fromDate: '',
//         toDate: ''
//     });

//     const [loading, setLoading] = useState(false);
//     const [cashData, setCashData] = useState({
//         totalCashInflow: 0,
//         totalCashOutflow: 0,
//         netCash: 0,
//         transactions: []
//     });
//     const [notification, setNotification] = useState({
//         show: false,
//         message: '',
//         type: 'success'
//     });

//     // Pagination state
//     const [currentPage, setCurrentPage] = useState(1);
//     const [rowsPerPage, setRowsPerPage] = useState(5);

//     const [company] = useState({
//         dateFormat: 'nepali'
//     });

//     const api = axios.create({
//         baseURL: process.env.REACT_APP_API_BASE_URL,
//         withCredentials: true,
//     });

//     api.interceptors.request.use(
//         (config) => {
//             const token = localStorage.getItem('token');
//             if (token) {
//                 config.headers.Authorization = `Bearer ${token}`;
//             }
//             return config;
//         },
//         (error) => Promise.reject(error)
//     );

//     const formatCurrency = (num) => {
//         const number = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num) || 0;
//         return number.toLocaleString('en-IN', {
//             minimumFractionDigits: 2,
//             maximumFractionDigits: 2
//         });
//     };

//     const fetchCashData = async () => {
//         if (!companyId) {
//             setNotification({
//                 show: true,
//                 message: 'Company not selected',
//                 type: 'error'
//             });
//             return;
//         }

//         setLoading(true);
//         try {
//             const params = new URLSearchParams();
//             params.append('companyId', companyId);

//             const fromDate = dateRange.fromDateAd || convertBsToAd(dateRange.fromDate) || currentEnglishDate;
//             const toDate = dateRange.toDateAd || convertBsToAd(dateRange.toDate) || currentEnglishDate;

//             params.append('fromDate', fromDate);
//             params.append('toDate', toDate);

//             if (accountId) {
//                 params.append('accountId', accountId);
//             }

//             const response = await api.get(`/api/retailer/cash-transactions?${params.toString()}`);

//             if (response.data.success) {
//                 const data = response.data.data;
//                 setCashData({
//                     totalCashInflow: data.totalCashInflow || 0,
//                     totalCashOutflow: data.totalCashOutflow || 0,
//                     netCash: data.netCash || 0,
//                     transactions: data.transactions || []
//                 });
//                 // Reset to first page when new data is fetched
//                 setCurrentPage(1);
//             } else {
//                 setNotification({
//                     show: true,
//                     message: response.data.error || 'Failed to fetch cash data',
//                     type: 'error'
//                 });
//             }
//         } catch (error) {
//             console.error('Error fetching cash data:', error);
//             setNotification({
//                 show: true,
//                 message: error.response?.data?.error || 'Failed to fetch cash data',
//                 type: 'error'
//             });
//         } finally {
//             setLoading(false);
//         }
//     };

//     useEffect(() => {
//         if (show && companyId) {
//             fetchCashData();
//         }
//     }, [show, companyId]);

//     const handleGenerateReport = () => {
//         if (!dateRange.fromDate || !dateRange.toDate) {
//             setNotification({
//                 show: true,
//                 message: 'Please select both from and to dates',
//                 type: 'error'
//             });
//             return;
//         }
//         fetchCashData();
//     };

//     // Pagination calculations
//     const totalTransactions = cashData.transactions.length;
//     const totalPages = Math.ceil(totalTransactions / rowsPerPage);
//     const indexOfLastTransaction = currentPage * rowsPerPage;
//     const indexOfFirstTransaction = indexOfLastTransaction - rowsPerPage;
//     const currentTransactions = cashData.transactions.slice(indexOfFirstTransaction, indexOfLastTransaction);

//     const handlePageChange = (pageNumber) => {
//         setCurrentPage(pageNumber);
//     };

//     const handleRowsPerPageChange = (e) => {
//         setRowsPerPage(parseInt(e.target.value));
//         setCurrentPage(1);
//     };

//     const goToPreviousPage = () => {
//         if (currentPage > 1) {
//             setCurrentPage(currentPage - 1);
//         }
//     };

//     const goToNextPage = () => {
//         if (currentPage < totalPages) {
//             setCurrentPage(currentPage + 1);
//         }
//     };

//     // Get badge color based on transaction type
//     const getTransactionBadgeColor = (type) => {
//         const typeMap = {
//             'Sale': 'bg-success',
//             'Sale Return': 'bg-warning',
//             'Purchase': 'bg-info',
//             'Purchase Return': 'bg-primary',
//             'Payment': 'bg-danger',
//             'Receipt': 'bg-success',
//             'Journal': 'bg-secondary',
//             'Debit Note': 'bg-primary',
//             'Credit Note': 'bg-danger',
//             'Opening Balance': 'bg-dark',
//             'Cash Sale': 'bg-success',
//             'Cash Purchase': 'bg-info',
//             'Cash Payment': 'bg-danger',
//             'Cash Receipt': 'bg-success',
//             'Cash Return': 'bg-warning',
//             'Cash Journal': 'bg-secondary',
//             'Cash Debit Note': 'bg-primary',
//             'Cash Credit Note': 'bg-danger',
//             'Cash Opening Balance': 'bg-dark'
//         };
//         return typeMap[type] || 'bg-secondary';
//     };

//     if (!show) return null;

//     return (
//         <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
//             <div className="modal-dialog modal-xl modal-dialog-centered">
//                 <div className="modal-content">
//                     <div className="modal-header bg-primary text-white">
//                         <h5 className="modal-title">
//                             <i className="bi bi-cash-coin me-2"></i>
//                             Cash Transaction Details
//                         </h5>
//                         <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
//                     </div>

//                     <div className="modal-body">
//                         {/* Date Filters */}
//                         <div className="row g-1 mb-2">
//                             <div className="col-12 col-md-5">
//                                 <div className="position-relative">
//                                     <input
//                                         type="text"
//                                         className={`form-control form-control-sm no-date-icon ${dateErrors.fromDate ? 'is-invalid' : ''}`}
//                                         value={dateRange.fromDate}
//                                         onChange={(e) => {
//                                             const value = e.target.value;
//                                             const sanitizedValue = value.replace(/[^0-9/-]/g, '').slice(0, 10);
//                                             const adDate = convertBsToAd(sanitizedValue);
//                                             setDateRange(prev => ({
//                                                 ...prev,
//                                                 fromDate: sanitizedValue,
//                                                 fromDateAd: adDate || prev.fromDateAd
//                                             }));
//                                             setDateErrors(prev => ({ ...prev, fromDate: '' }));
//                                         }}
//                                         placeholder="YYYY-MM-DD"
//                                         style={{ height: '32px', fontSize: '0.875rem', paddingTop: '0.75rem' }}
//                                     />
//                                     <label className="position-absolute" style={{
//                                         top: '-0.5rem',
//                                         left: '0.75rem',
//                                         fontSize: '0.75rem',
//                                         backgroundColor: 'white',
//                                         padding: '0 0.25rem',
//                                         color: '#6c757d',
//                                         fontWeight: '500'
//                                     }}>
//                                         From (BS)
//                                     </label>
//                                 </div>
//                             </div>

//                             <div className="col-12 col-md-5">
//                                 <div className="position-relative">
//                                     <input
//                                         type="text"
//                                         className={`form-control form-control-sm no-date-icon ${dateErrors.toDate ? 'is-invalid' : ''}`}
//                                         value={dateRange.toDate}
//                                         onChange={(e) => {
//                                             const value = e.target.value;
//                                             const sanitizedValue = value.replace(/[^0-9/-]/g, '').slice(0, 10);
//                                             const adDate = convertBsToAd(sanitizedValue);
//                                             setDateRange(prev => ({
//                                                 ...prev,
//                                                 toDate: sanitizedValue,
//                                                 toDateAd: adDate || prev.toDateAd
//                                             }));
//                                             setDateErrors(prev => ({ ...prev, toDate: '' }));
//                                         }}
//                                         placeholder="YYYY-MM-DD"
//                                         style={{ height: '32px', fontSize: '0.875rem', paddingTop: '0.75rem' }}
//                                     />
//                                     <label className="position-absolute" style={{
//                                         top: '-0.5rem',
//                                         left: '0.75rem',
//                                         fontSize: '0.75rem',
//                                         backgroundColor: 'white',
//                                         padding: '0 0.25rem',
//                                         color: '#6c757d',
//                                         fontWeight: '500'
//                                     }}>
//                                         To (BS)
//                                     </label>
//                                 </div>
//                             </div>

//                             <div className="col-12 col-md-2">
//                                 <button
//                                     className="btn btn-primary btn-sm w-100"
//                                     onClick={handleGenerateReport}
//                                     style={{ height: '32px' }}
//                                 >
//                                     <i className="bi bi-search me-1"></i> Generate
//                                 </button>
//                             </div>
//                         </div>

//                         {/* Summary Cards - Updated for Inflow/Outflow */}
//                         <div className="row g-1 mb-2">
//                             <div className="col-12 col-md-4">
//                                 <div className="card border-start border-success border-3">
//                                     <div className="card-body py-2 px-3">
//                                         <h6 className="text-muted mb-0 small">Cash Inflow</h6>
//                                         <h5 className="mb-0 text-success">
//                                             Rs. {formatCurrency(cashData.totalCashInflow)}
//                                         </h5>
//                                     </div>
//                                 </div>
//                             </div>

//                             <div className="col-12 col-md-4">
//                                 <div className="card border-start border-danger border-3">
//                                     <div className="card-body py-2 px-3">
//                                         <h6 className="text-muted mb-0 small">Cash Outflow</h6>
//                                         <h5 className="mb-0 text-danger">
//                                             Rs. {formatCurrency(cashData.totalCashOutflow)}
//                                         </h5>
//                                     </div>
//                                 </div>
//                             </div>

//                             <div className="col-12 col-md-4">
//                                 <div className="card border-start border-primary border-3">
//                                     <div className="card-body py-2 px-3">
//                                         <h6 className="text-muted mb-0 small">Net Cash</h6>
//                                         <h5 className="mb-0 text-primary">
//                                             Rs. {formatCurrency(cashData.netCash)}
//                                         </h5>
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>

//                         {/* Transactions Table with Pagination */}
//                         {loading ? (
//                             <div className="text-center py-4">
//                                 <div className="spinner-border text-primary" role="status">
//                                     <span className="visually-hidden">Loading...</span>
//                                 </div>
//                             </div>
//                         ) : (
//                             <>
//                                 <div className="table-responsive" style={{ maxHeight: '200px', overflowY: 'auto' }}>
//                                     <table className="table table-sm table-hover table-bordered">
//                                         <thead className="table-light sticky-top">
//                                             <tr>
//                                                 <th style={{ fontSize: '0.75rem' }}>Date</th>
//                                                 <th style={{ fontSize: '0.75rem' }}>Inv. No</th>
//                                                 <th style={{ fontSize: '0.75rem' }}>Party/Account</th>
//                                                 <th style={{ fontSize: '0.75rem' }}>Type</th>
//                                                 <th style={{ fontSize: '0.75rem' }}>Description</th>
//                                                 <th style={{ fontSize: '0.75rem' }} className="text-end">Amount</th>
//                                             </tr>
//                                         </thead>
//                                         <tbody>
//                                             {currentTransactions.length > 0 ? (
//                                                 currentTransactions.map((transaction, index) => (
//                                                     <tr key={transaction.id || index}>
//                                                         <td style={{ fontSize: '0.75rem' }}>
//                                                             {transaction.nepaliDate ||
//                                                                 (transaction.date ? new Date(transaction.date).toLocaleDateString() : 'N/A')}
//                                                         </td>
//                                                         <td style={{ fontSize: '0.75rem' }}>
//                                                             {transaction.billNumber || 'N/A'}
//                                                         </td>
//                                                         <td style={{ fontSize: '0.75rem' }}>
//                                                             {transaction.accountName || 'N/A'}
//                                                         </td>
//                                                         <td style={{ fontSize: '0.75rem' }}>
//                                                             <span className={`badge ${getTransactionBadgeColor(transaction.type)}`}>
//                                                                 {transaction.type || 'N/A'}
//                                                             </span>
//                                                         </td>
//                                                         <td style={{ fontSize: '0.75rem' }}>
//                                                             {transaction.description || ''}
//                                                         </td>
//                                                         <td style={{ fontSize: '0.75rem' }} className="text-end">
//                                                             <span className={transaction.inflow ? 'text-success' : 'text-danger'}>
//                                                                 Rs. {formatCurrency(Math.abs(transaction.amount))}
//                                                             </span>
//                                                         </td>
//                                                     </tr>
//                                                 ))
//                                             ) : (
//                                                 <tr>
//                                                     <td colSpan="6" className="text-center text-muted py-3">
//                                                         <i className="bi bi-inbox me-1"></i>
//                                                         No cash transactions found
//                                                     </td>
//                                                 </tr>
//                                             )}
//                                         </tbody>
//                                     </table>
//                                 </div>

//                                 {/* Pagination Controls */}
//                                 {totalTransactions > 0 && (
//                                     <div className="d-flex justify-content-between align-items-center mt-1">                                        <div className="d-flex align-items-center">
//                                         <label className="mb-0 me-2" style={{ fontSize: '0.75rem' }}>
//                                             Rows per page:
//                                         </label>
//                                         <select
//                                             className="form-select form-select-sm"
//                                             value={rowsPerPage}
//                                             onChange={handleRowsPerPageChange}
//                                             style={{ width: '60px', fontSize: '0.75rem' }}
//                                         >
//                                             <option value={5}>5</option>
//                                             <option value={10}>10</option>
//                                             <option value={25}>25</option>
//                                             <option value={50}>50</option>
//                                         </select>
//                                         <span className="ms-2" style={{ fontSize: '0.75rem', color: '#6c757d' }}>
//                                             {indexOfFirstTransaction + 1} - {Math.min(indexOfLastTransaction, totalTransactions)} of {totalTransactions}
//                                         </span>
//                                     </div>

//                                         <div className="d-flex align-items-center gap-1">
//                                             <button
//                                                 className="btn btn-sm btn-outline-secondary"
//                                                 onClick={goToPreviousPage}
//                                                 disabled={currentPage === 1}
//                                                 style={{ padding: '0 8px', fontSize: '0.75rem' }}
//                                             >
//                                                 <i className="bi bi-chevron-left"></i>
//                                             </button>

//                                             {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
//                                                 let pageNumber;
//                                                 if (totalPages <= 5) {
//                                                     pageNumber = i + 1;
//                                                 } else if (currentPage <= 3) {
//                                                     pageNumber = i + 1;
//                                                 } else if (currentPage >= totalPages - 2) {
//                                                     pageNumber = totalPages - 4 + i;
//                                                 } else {
//                                                     pageNumber = currentPage - 2 + i;
//                                                 }

//                                                 return (
//                                                     <button
//                                                         key={i}
//                                                         className={`btn btn-sm ${currentPage === pageNumber ? 'btn-primary' : 'btn-outline-secondary'}`}
//                                                         onClick={() => handlePageChange(pageNumber)}
//                                                         style={{
//                                                             padding: '0 8px',
//                                                             fontSize: '0.75rem',
//                                                             minWidth: '30px'
//                                                         }}
//                                                     >
//                                                         {pageNumber}
//                                                     </button>
//                                                 );
//                                             })}

//                                             <button
//                                                 className="btn btn-sm btn-outline-secondary"
//                                                 onClick={goToNextPage}
//                                                 disabled={currentPage === totalPages}
//                                                 style={{ padding: '0 8px', fontSize: '0.75rem' }}
//                                             >
//                                                 <i className="bi bi-chevron-right"></i>
//                                             </button>
//                                         </div>
//                                     </div>
//                                 )}
//                             </>
//                         )}
//                     </div>

//                     <div className="modal-footer">
//                         <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
//                             <i className="bi bi-x-circle me-1"></i> Close
//                         </button>
//                     </div>
//                 </div>
//             </div>

//             <style>{`
//                 .sticky-top {
//                     position: sticky;
//                     top: 0;
//                     z-index: 10;
//                 }

//                 .modal-body .table-responsive {
//                     scrollbar-width: thin;
//                 }

//                 .modal-body .table-responsive::-webkit-scrollbar {
//                     width: 4px;
//                     height: 4px;
//                 }

//                 .modal-body .table-responsive::-webkit-scrollbar-thumb {
//                     background-color: #c1c7cd;
//                     border-radius: 4px;
//                 }

//                 .modal-body .table-responsive::-webkit-scrollbar-track {
//                     background-color: #f1f1f1;
//                 }

//                 .badge {
//                     font-size: 0.65rem;
//                     font-weight: 500;
//                 }
//             `}</style>
//         </div>
//     );
// };

// export default DailyCashSummary;

//--------------------------------------------------end1

import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import NepaliDate from 'nepali-datetime';
import './DailyCashSummary.css';

// Date conversion utilities
const convertBsToAd = (bsDate) => {
    if (!bsDate || !/^\d{4}-\d{2}-\d{2}$/.test(bsDate)) return null;
    try {
        const nepaliDate = new NepaliDate(bsDate);
        if (!nepaliDate || typeof nepaliDate.getDateObject !== 'function') return null;
        const jsDate = nepaliDate.getDateObject();
        if (!jsDate || isNaN(jsDate.getTime())) return null;
        const year = jsDate.getFullYear();
        const month = String(jsDate.getMonth() + 1).padStart(2, '0');
        const day = String(jsDate.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (error) {
        console.error('Error converting BS to AD:', error);
        return null;
    }
};

const convertAdToBs = (adDate) => {
    if (!adDate) return null;
    try {
        let date;
        if (typeof adDate === 'string') {
            if (/^\d{4}-\d{2}-\d{2}$/.test(adDate)) {
                date = new Date(adDate + 'T00:00:00');
            } else {
                date = new Date(adDate);
            }
        } else if (adDate instanceof Date) {
            date = adDate;
        } else {
            return null;
        }
        if (isNaN(date.getTime())) return null;
        const nepaliDate = new NepaliDate(date);
        if (!nepaliDate || typeof nepaliDate.getYear !== 'function') return null;
        const year = nepaliDate.getYear();
        const month = nepaliDate.getMonth();
        const day = nepaliDate.getDate();
        if (!year || month === undefined || !day) return null;
        return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    } catch (error) {
        console.error('Error converting AD to BS:', error);
        return null;
    }
};

const isValidNepaliDate = (dateStr) => {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
    try {
        const [year, month, day] = dateStr.split('-').map(Number);
        if (month < 1 || month > 12) return false;
        if (day < 1 || day > 32) return false;
        const nepaliDate = new NepaliDate(dateStr);
        if (!nepaliDate || typeof nepaliDate.getYear !== 'function') return false;
        const bsYear = nepaliDate.getYear();
        const bsMonth = nepaliDate.getMonth() + 1;
        const bsDay = nepaliDate.getDate();
        return (bsYear === year && bsMonth === month && bsDay === day);
    } catch (error) {
        return false;
    }
};

const getCurrentNepaliDate = () => {
    try {
        const now = new NepaliDate();
        if (!now || typeof now.getYear !== 'function') return '2080-01-01';
        const year = now.getYear();
        const month = now.getMonth() + 1;
        const day = now.getDate();
        if (!year || !month || !day) return '2080-01-01';
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    } catch (error) {
        return '2080-01-01';
    }
};

const DailyCashSummary = ({ show, onClose, companyId, accountId }) => {
    const currentNepaliDate = getCurrentNepaliDate();
    const currentEnglishDate = new Date().toISOString().split('T')[0];

    const [dateRange, setDateRange] = useState({
        fromDate: currentNepaliDate,
        toDate: currentNepaliDate,
        fromDateAd: currentEnglishDate,
        toDateAd: currentEnglishDate
    });

    const [dateErrors, setDateErrors] = useState({
        fromDate: '',
        toDate: ''
    });

    const [loading, setLoading] = useState(false);
    const [cashData, setCashData] = useState({
        totalCashInflow: 0,
        totalCashOutflow: 0,
        netCash: 0,
        transactions: []
    });
    const [notification, setNotification] = useState({
        show: false,
        message: '',
        type: 'success'
    });

    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(5);

    const [company] = useState({
        dateFormat: 'nepali'
    });

    const api = axios.create({
        baseURL: process.env.REACT_APP_API_BASE_URL,
        withCredentials: true,
    });

    api.interceptors.request.use(
        (config) => {
            const token = localStorage.getItem('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        },
        (error) => Promise.reject(error)
    );

    const formatCurrency = (num) => {
        const number = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num) || 0;
        return number.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    const formatNumber = (num) => {
        return Number(num || 0).toLocaleString('en-IN');
    };

    const fetchCashData = useCallback(async () => {
        if (!companyId) {
            setNotification({
                show: true,
                message: 'Company not selected',
                type: 'error'
            });
            return;
        }

        // setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('companyId', companyId);

            const fromDate = dateRange.fromDateAd || convertBsToAd(dateRange.fromDate) || currentEnglishDate;
            const toDate = dateRange.toDateAd || convertBsToAd(dateRange.toDate) || currentEnglishDate;

            params.append('fromDate', fromDate);
            params.append('toDate', toDate);

            if (accountId) {
                params.append('accountId', accountId);
            }

            const response = await api.get(`/api/retailer/cash-transactions?${params.toString()}`);

            if (response.data.success) {
                const data = response.data.data;
                setCashData({
                    totalCashInflow: data.totalCashInflow || 0,
                    totalCashOutflow: data.totalCashOutflow || 0,
                    netCash: data.netCash || 0,
                    transactions: data.transactions || []
                });
                setCurrentPage(1);
            } else {
                setNotification({
                    show: true,
                    message: response.data.error || 'Failed to fetch cash data',
                    type: 'error'
                });
            }
        } catch (error) {
            console.error('Error fetching cash data:', error);
            setNotification({
                show: true,
                message: error.response?.data?.error || 'Failed to fetch cash data',
                type: 'error'
            });
        } finally {
            // setLoading(false);
        }
    }, [companyId, dateRange.fromDateAd, dateRange.toDateAd, accountId]);

    useEffect(() => {
        if (show && companyId) {
            fetchCashData();
        }
    }, [show, companyId, fetchCashData]);

    const handleGenerateReport = () => {
        if (!dateRange.fromDate || !dateRange.toDate) {
            setNotification({
                show: true,
                message: 'Please select both from and to dates',
                type: 'error'
            });
            return;
        }
        fetchCashData();
    };

    const totalTransactions = cashData.transactions.length;
    const totalPages = Math.ceil(totalTransactions / rowsPerPage);
    const indexOfLastTransaction = currentPage * rowsPerPage;
    const indexOfFirstTransaction = indexOfLastTransaction - rowsPerPage;
    const currentTransactions = cashData.transactions.slice(indexOfFirstTransaction, indexOfLastTransaction);

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    const handleRowsPerPageChange = (e) => {
        setRowsPerPage(parseInt(e.target.value));
        setCurrentPage(1);
    };

    const goToPreviousPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    };

    const goToNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1);
        }
    };

    const getTransactionBadgeColor = (type) => {
        const typeMap = {
            'Sale': 'success',
            'Sale Return': 'warning',
            'Purchase': 'info',
            'Purchase Return': 'primary',
            'Payment': 'danger',
            'Receipt': 'success',
            'Journal': 'secondary',
            'Debit Note': 'primary',
            'Credit Note': 'danger',
            'Opening Balance': 'dark',
            'Cash Sale': 'success',
            'Cash Purchase': 'info',
            'Cash Payment': 'danger',
            'Cash Receipt': 'success',
            'Cash Return': 'warning',
            'Cash Journal': 'secondary',
            'Cash Debit Note': 'primary',
            'Cash Credit Note': 'danger',
            'Cash Opening Balance': 'dark'
        };
        return typeMap[type] || 'secondary';
    };

    const getPageNumbers = () => {
        const total = totalPages;
        const current = currentPage;
        const delta = 2;
        const range = [];
        const rangeWithDots = [];
        let l;

        for (let i = 1; i <= total; i++) {
            if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
                range.push(i);
            }
        }

        range.forEach((i) => {
            if (l) {
                if (i - l === 2) {
                    rangeWithDots.push(l + 1);
                } else if (i - l !== 1) {
                    rangeWithDots.push('...');
                }
            }
            rangeWithDots.push(i);
            l = i;
        });

        return rangeWithDots;
    };

    if (!show) return null;

    return (
        <>
            <div
                className="dcs-modal-overlay"
                onClick={(e) => {
                    if (e.target === e.currentTarget) onClose();
                }}
            >
                <div className="dcs-modal">
                    {/* Header */}
                    <div className="dcs-modal-header">
                        <div className="dcs-modal-header-left">
                            <div className="dcs-modal-header-icon">
                                <i className="bi bi-cash-coin"></i>
                            </div>
                            <div>
                                <h5 className="dcs-modal-title">Cash Transaction Details</h5>
                                <small className="dcs-modal-subtitle">
                                    {cashData.transactions.length} transactions found
                                </small>
                            </div>
                        </div>
                        <button
                            type="button"
                            className="dcs-modal-close"
                            onClick={onClose}
                        >
                            <i className="bi bi-x-lg"></i>
                        </button>
                    </div>

                    <div className="dcs-modal-body">
                        {/* Date Filters & Stats - Single Row */}
                        <div className="dcs-filters-stats-row">
                            {/* Date Filters */}
                            <div className="dcs-filters-group">
                                <div className="dcs-filter-item dcs-filter-item--date">
                                    <label className="dcs-filter-label">From (BS)</label>
                                    <input
                                        type="text"
                                        className={`dcs-filter-input ${dateErrors.fromDate ? 'dcs-filter-input--error' : ''}`}
                                        value={dateRange.fromDate}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            const sanitizedValue = value.replace(/[^0-9/-]/g, '').slice(0, 10);
                                            const adDate = convertBsToAd(sanitizedValue);
                                            setDateRange(prev => ({
                                                ...prev,
                                                fromDate: sanitizedValue,
                                                fromDateAd: adDate || prev.fromDateAd
                                            }));
                                            setDateErrors(prev => ({ ...prev, fromDate: '' }));
                                        }}
                                        placeholder="YYYY-MM-DD"
                                    />
                                </div>

                                <div className="dcs-filter-item dcs-filter-item--date">
                                    <label className="dcs-filter-label">To (BS)</label>
                                    <input
                                        type="text"
                                        className={`dcs-filter-input ${dateErrors.toDate ? 'dcs-filter-input--error' : ''}`}
                                        value={dateRange.toDate}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            const sanitizedValue = value.replace(/[^0-9/-]/g, '').slice(0, 10);
                                            const adDate = convertBsToAd(sanitizedValue);
                                            setDateRange(prev => ({
                                                ...prev,
                                                toDate: sanitizedValue,
                                                toDateAd: adDate || prev.toDateAd
                                            }));
                                            setDateErrors(prev => ({ ...prev, toDate: '' }));
                                        }}
                                        placeholder="YYYY-MM-DD"
                                    />
                                </div>

                                <button
                                    className="dcs-btn-primary dcs-btn-generate"
                                    onClick={handleGenerateReport}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <span className="dcs-spinner-small"></span>
                                    ) : (
                                        <>
                                            <i className="bi bi-search me-1"></i> Generate
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Stats Inline */}
                            <div className="dcs-stats-inline">
                                <div className="dcs-stat-inline dcs-stat-inline--success">
                                    <div className="dcs-stat-inline-icon">
                                        <i className="bi bi-arrow-down-circle"></i>
                                    </div>
                                    <div className="dcs-stat-inline-content">
                                        <small className="dcs-stat-inline-label">Inflow</small>
                                        <span className="dcs-stat-inline-value">
                                            <span className="dcs-rupee-symbol">Rs.</span> {formatCurrency(cashData.totalCashInflow)}
                                        </span>
                                    </div>
                                </div>

                                <div className="dcs-stat-inline dcs-stat-inline--danger">
                                    <div className="dcs-stat-inline-icon">
                                        <i className="bi bi-arrow-up-circle"></i>
                                    </div>
                                    <div className="dcs-stat-inline-content">
                                        <small className="dcs-stat-inline-label">Outflow</small>
                                        <span className="dcs-stat-inline-value">
                                            <span className="dcs-rupee-symbol">Rs.</span> {formatCurrency(cashData.totalCashOutflow)}
                                        </span>
                                    </div>
                                </div>

                                <div className="dcs-stat-inline dcs-stat-inline--primary">
                                    <div className="dcs-stat-inline-icon">
                                        <i className="bi bi-calculator"></i>
                                    </div>
                                    <div className="dcs-stat-inline-content">
                                        <small className="dcs-stat-inline-label">Net</small>
                                        <span className={`dcs-stat-inline-value ${cashData.netCash >= 0 ? 'dcs-stat-inline-value--positive' : 'dcs-stat-inline-value--negative'}`}>
                                            <span className="dcs-rupee-symbol">Rs.</span> {formatCurrency(cashData.netCash)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Transactions Table */}
                        <div className="dcs-table-card">
                            <div className="dcs-table-card-body">
                                {loading ? (
                                    <div className="dcs-loading">
                                        <div className="dcs-spinner"></div>
                                        <p className="dcs-loading-text">Loading cash transactions...</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="dcs-table-wrap">
                                            <table className="dcs-table">
                                                <thead className="dcs-table-header">
                                                    <tr>
                                                        <th style={{ width: '12%' }}>Date</th>
                                                        <th style={{ width: '12%' }}>Inv. No</th>
                                                        <th style={{ width: '18%' }}>Party/Account</th>
                                                        <th style={{ width: '12%' }}>Type</th>
                                                        <th style={{ width: '28%' }}>Description</th>
                                                        <th style={{ width: '15%', textAlign: 'right' }}>Amount</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {currentTransactions.length > 0 ? (
                                                        currentTransactions.map((transaction, index) => {
                                                            const isInflow = transaction.inflow || transaction.amount > 0;
                                                            const amount = Math.abs(transaction.amount || 0);
                                                            const badgeColor = getTransactionBadgeColor(transaction.type);

                                                            return (
                                                                <tr key={transaction.id || index} className="dcs-table-row">
                                                                    <td>
                                                                        {transaction.nepaliDate ||
                                                                            (transaction.date ? new Date(transaction.date).toLocaleDateString() : 'N/A')}
                                                                    </td>
                                                                    <td>
                                                                        <span className="dcs-badge-inv">
                                                                            {transaction.billNumber || 'N/A'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="dcs-party-name">
                                                                        {transaction.accountName || 'N/A'}
                                                                    </td>
                                                                    <td>
                                                                        <span className={`dcs-badge-transaction dcs-badge-transaction--${badgeColor}`}>
                                                                            {transaction.type || 'N/A'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="dcs-description">
                                                                        {transaction.description || ''}
                                                                    </td>
                                                                    <td style={{ textAlign: 'right' }}>
                                                                        <span className={isInflow ? 'dcs-amount-inflow' : 'dcs-amount-outflow'}>
                                                                            {isInflow ? '+' : '-'}
                                                                            <span className="dcs-rupee-symbol">Rs.</span> {formatCurrency(amount)}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
                                                    ) : (
                                                        <tr>
                                                            <td colSpan="6" className="dcs-empty-state">
                                                                <i className="bi bi-inbox dcs-empty-icon"></i>
                                                                <p className="dcs-empty-text">No cash transactions found</p>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Pagination */}
                                        {totalTransactions > 0 && (
                                            <div className="dcs-pagination">
                                                <div className="dcs-pagination-left">
                                                    <label className="dcs-pagination-label">Rows:</label>
                                                    <select
                                                        className="dcs-pagination-select"
                                                        value={rowsPerPage}
                                                        onChange={handleRowsPerPageChange}
                                                    >
                                                        <option value={5}>5</option>
                                                        <option value={10}>10</option>
                                                        <option value={25}>25</option>
                                                        <option value={50}>50</option>
                                                    </select>
                                                    <span className="dcs-pagination-info">
                                                        {indexOfFirstTransaction + 1} - {Math.min(indexOfLastTransaction, totalTransactions)} of {totalTransactions}
                                                    </span>
                                                </div>

                                                <div className="dcs-pagination-right">
                                                    <button
                                                        className={`dcs-pagination-btn ${currentPage === 1 ? 'dcs-pagination-btn--disabled' : ''}`}
                                                        onClick={goToPreviousPage}
                                                        disabled={currentPage === 1}
                                                    >
                                                        <i className="bi bi-chevron-left"></i>
                                                    </button>

                                                    {getPageNumbers().map((page, index) => (
                                                        typeof page === 'number' ? (
                                                            <button
                                                                key={index}
                                                                className={`dcs-pagination-btn ${currentPage === page ? 'dcs-pagination-btn--active' : ''}`}
                                                                onClick={() => handlePageChange(page)}
                                                            >
                                                                {page}
                                                            </button>
                                                        ) : (
                                                            <span key={index} className="dcs-pagination-ellipsis">
                                                                {page}
                                                            </span>
                                                        )
                                                    ))}

                                                    <button
                                                        className={`dcs-pagination-btn ${currentPage === totalPages ? 'dcs-pagination-btn--disabled' : ''}`}
                                                        onClick={goToNextPage}
                                                        disabled={currentPage === totalPages}
                                                    >
                                                        <i className="bi bi-chevron-right"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="dcs-modal-footer">
                        <button type="button" className="dcs-btn-secondary" onClick={onClose}>
                            <i className="bi bi-x-circle me-1"></i> Close
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default DailyCashSummary;