// import React, { useState, useEffect, useRef, useCallback } from 'react';
// import axios from 'axios';
// import NepaliDate from 'nepali-datetime';
// import './DailySalesSummary.css';

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

// const DailySalesSummary = ({ show, onClose, companyId, accountId }) => {
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
//     const [salesData, setSalesData] = useState({
//         totalCashSales: 0,
//         totalCreditSales: 0,
//         totalSales: 0,
//         totalSalesReturns: 0,
//         netSales: 0,
//         transactions: []
//     });
//     const [notification, setNotification] = useState({
//         show: false,
//         message: '',
//         type: 'success'
//     });

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

//     const formatNumber = (num) => {
//         return Number(num || 0).toLocaleString('en-IN');
//     };

//     const fetchSalesData = useCallback(async () => {
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

//             const response = await api.get(`/api/retailer/daily/sales-transactions?${params.toString()}`);

//             if (response.data.success) {
//                 const data = response.data.data;
//                 setSalesData({
//                     totalCashSales: data.totalCashSales || 0,
//                     totalCreditSales: data.totalCreditSales || 0,
//                     totalSales: data.totalSales || 0,
//                     totalSalesReturns: data.totalSalesReturns || 0,
//                     netSales: data.netSales || 0,
//                     transactions: data.transactions || []
//                 });
//                 setCurrentPage(1);
//             } else {
//                 setNotification({
//                     show: true,
//                     message: response.data.error || 'Failed to fetch sales data',
//                     type: 'error'
//                 });
//             }
//         } catch (error) {
//             console.error('Error fetching sales data:', error);
//             setNotification({
//                 show: true,
//                 message: error.response?.data?.error || 'Failed to fetch sales data',
//                 type: 'error'
//             });
//         } finally {
//             setLoading(false);
//         }
//     }, [companyId, dateRange.fromDateAd, dateRange.toDateAd, accountId]);

//     useEffect(() => {
//         if (show && companyId) {
//             fetchSalesData();
//         }
//     }, [show, companyId, fetchSalesData]);

//     const handleGenerateReport = () => {
//         if (!dateRange.fromDate || !dateRange.toDate) {
//             setNotification({
//                 show: true,
//                 message: 'Please select both from and to dates',
//                 type: 'error'
//             });
//             return;
//         }
//         fetchSalesData();
//     };

//     const totalTransactions = salesData.transactions.length;
//     const totalPages = Math.ceil(totalTransactions / rowsPerPage);
//     const indexOfLastTransaction = currentPage * rowsPerPage;
//     const indexOfFirstTransaction = indexOfLastTransaction - rowsPerPage;
//     const currentTransactions = salesData.transactions.slice(indexOfFirstTransaction, indexOfLastTransaction);

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

//     const getTransactionBadgeColor = (type) => {
//         const typeMap = {
//             'Cash Sale': 'success',
//             'Credit Sale': 'primary',
//             'Sales Return': 'danger',
//             'Sale': 'success',
//             'cash': 'success',
//             'credit': 'primary'
//         };
//         return typeMap[type] || 'secondary';
//     };

//     const getPageNumbers = () => {
//         const total = totalPages;
//         const current = currentPage;
//         const delta = 2;
//         const range = [];
//         const rangeWithDots = [];
//         let l;

//         for (let i = 1; i <= total; i++) {
//             if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
//                 range.push(i);
//             }
//         }

//         range.forEach((i) => {
//             if (l) {
//                 if (i - l === 2) {
//                     rangeWithDots.push(l + 1);
//                 } else if (i - l !== 1) {
//                     rangeWithDots.push('...');
//                 }
//             }
//             rangeWithDots.push(i);
//             l = i;
//         });

//         return rangeWithDots;
//     };

//     if (!show) return null;

//     return (
//         <>
//             <div
//                 className="dss-modal-overlay"
//                 onClick={(e) => {
//                     if (e.target === e.currentTarget) onClose();
//                 }}
//             >
//                 <div className="dss-modal">
//                     {/* Header */}
//                     <div className="dss-modal-header">
//                         <div className="dss-modal-header-left">
//                             <div className="dss-modal-header-icon">
//                                 <i className="bi bi-graph-up-arrow"></i>
//                             </div>
//                             <div>
//                                 <h5 className="dss-modal-title">Sales Transaction Details</h5>
//                                 <small className="dss-modal-subtitle">
//                                     {salesData.transactions.length} transactions found
//                                 </small>
//                             </div>
//                         </div>
//                         <button
//                             type="button"
//                             className="dss-modal-close"
//                             onClick={onClose}
//                         >
//                             <i className="bi bi-x-lg"></i>
//                         </button>
//                     </div>

//                     <div className="dss-modal-body">
//                         {/* Date Filters & Stats - Single Row */}
//                         <div className="dss-filters-stats-row">
//                             {/* Date Filters */}
//                             <div className="dss-filters-group">
//                                 <div className="dss-filter-item dss-filter-item--date">
//                                     <label className="dss-filter-label">From (BS)</label>
//                                     <input
//                                         type="text"
//                                         className={`dss-filter-input ${dateErrors.fromDate ? 'dss-filter-input--error' : ''}`}
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
//                                     />
//                                 </div>

//                                 <div className="dss-filter-item dss-filter-item--date">
//                                     <label className="dss-filter-label">To (BS)</label>
//                                     <input
//                                         type="text"
//                                         className={`dss-filter-input ${dateErrors.toDate ? 'dss-filter-input--error' : ''}`}
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
//                                     />
//                                 </div>

//                                 <button
//                                     className="dss-btn-primary dss-btn-generate"
//                                     onClick={handleGenerateReport}
//                                     disabled={loading}
//                                 >
//                                     {loading ? (
//                                         <span className="dss-spinner-small"></span>
//                                     ) : (
//                                         <>
//                                             <i className="bi bi-search me-1"></i> Generate
//                                         </>
//                                     )}
//                                 </button>
//                             </div>

//                             {/* Stats Inline */}
//                             <div className="dss-stats-inline">
//                                 <div className="dss-stat-inline dss-stat-inline--success">
//                                     <div className="dss-stat-inline-icon">
//                                         <i className="bi bi-cash"></i>
//                                     </div>
//                                     <div className="dss-stat-inline-content">
//                                         <small className="dss-stat-inline-label">Cash</small>
//                                         <span className="dss-stat-inline-value">
//                                             <span className="dss-rupee-symbol">Rs.</span> {formatCurrency(salesData.totalCashSales)}
//                                         </span>
//                                     </div>
//                                 </div>

//                                 <div className="dss-stat-inline dss-stat-inline--primary">
//                                     <div className="dss-stat-inline-icon">
//                                         <i className="bi bi-credit-card"></i>
//                                     </div>
//                                     <div className="dss-stat-inline-content">
//                                         <small className="dss-stat-inline-label">Credit</small>
//                                         <span className="dss-stat-inline-value">
//                                             <span className="dss-rupee-symbol">Rs.</span> {formatCurrency(salesData.totalCreditSales)}
//                                         </span>
//                                     </div>
//                                 </div>

//                                 <div className="dss-stat-inline dss-stat-inline--danger">
//                                     <div className="dss-stat-inline-icon">
//                                         <i className="bi bi-arrow-return-left"></i>
//                                     </div>
//                                     <div className="dss-stat-inline-content">
//                                         <small className="dss-stat-inline-label">Returns</small>
//                                         <span className="dss-stat-inline-value">
//                                             <span className="dss-rupee-symbol">Rs.</span> {formatCurrency(salesData.totalSalesReturns)}
//                                         </span>
//                                     </div>
//                                 </div>

//                                 <div className="dss-stat-inline dss-stat-inline--info">
//                                     <div className="dss-stat-inline-icon">
//                                         <i className="bi bi-calculator"></i>
//                                     </div>
//                                     <div className="dss-stat-inline-content">
//                                         <small className="dss-stat-inline-label">Net</small>
//                                         <span className="dss-stat-inline-value dss-stat-inline-value--positive">
//                                             <span className="dss-rupee-symbol">Rs.</span> {formatCurrency(salesData.netSales)}
//                                         </span>
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>

//                         {/* Transactions Table */}
//                         <div className="dss-table-card">
//                             <div className="dss-table-card-body">
//                                 {loading ? (
//                                     <div className="dss-loading">
//                                         <div className="dss-spinner"></div>
//                                         <p className="dss-loading-text">Loading sales transactions...</p>
//                                     </div>
//                                 ) : (
//                                     <>
//                                         <div className="dss-table-wrap">
//                                             <table className="dss-table">
//                                                 <thead className="dss-table-header">
//                                                     <tr>
//                                                         <th style={{ width: '12%' }}>Date</th>
//                                                         <th style={{ width: '12%' }}>Inv. No</th>
//                                                         <th style={{ width: '20%' }}>Party</th>
//                                                         <th style={{ width: '12%' }}>Type</th>
//                                                         <th style={{ width: '12%' }}>Payment Mode</th>
//                                                         <th style={{ width: '15%', textAlign: 'right' }}>Amount</th>
//                                                     </tr>
//                                                 </thead>
//                                                 <tbody>
//                                                     {currentTransactions.length > 0 ? (
//                                                         currentTransactions.map((transaction, index) => {
//                                                             const badgeColor = getTransactionBadgeColor(transaction.type || transaction.paymentMode);
//                                                             const isReturn = transaction.isReturn || transaction.type === 'Sales Return';
//                                                             const amount = Math.abs(transaction.amount || 0);

//                                                             return (
//                                                                 <tr key={transaction.id || index} className="dss-table-row">
//                                                                     <td>
//                                                                         {transaction.nepaliDate || transaction.date?.split('T')[0] || 'N/A'}
//                                                                     </td>
//                                                                     <td>
//                                                                         <span className="dss-badge-inv">
//                                                                             {transaction.billNumber || 'N/A'}
//                                                                         </span>
//                                                                     </td>
//                                                                     <td className="dss-party-name">
//                                                                         {transaction.accountName || 'N/A'}
//                                                                     </td>
//                                                                     <td>
//                                                                         <span className={`dss-badge-transaction dss-badge-transaction--${badgeColor}`}>
//                                                                             {transaction.type || 'N/A'}
//                                                                         </span>
//                                                                     </td>
//                                                                     <td>
//                                                                         <span className={`dss-badge-payment ${transaction.paymentMode === 'Cash' ? 'dss-badge-payment--cash' : 'dss-badge-payment--credit'}`}>
//                                                                             {transaction.paymentMode || 'N/A'}
//                                                                         </span>
//                                                                     </td>
//                                                                     <td style={{ textAlign: 'right' }}>
//                                                                         <span className={isReturn ? 'dss-amount-return' : 'dss-amount-sale'}>
//                                                                             <span className="dss-rupee-symbol">Rs.</span> {formatCurrency(amount)}
//                                                                             {isReturn && ' (Return)'}
//                                                                         </span>
//                                                                     </td>
//                                                                 </tr>
//                                                             );
//                                                         })
//                                                     ) : (
//                                                         <tr>
//                                                             <td colSpan="6" className="dss-empty-state">
//                                                                 <i className="bi bi-inbox dss-empty-icon"></i>
//                                                                 <p className="dss-empty-text">No sales transactions found</p>
//                                                             </td>
//                                                         </tr>
//                                                     )}
//                                                 </tbody>
//                                             </table>
//                                         </div>

//                                         {/* Pagination */}
//                                         {totalTransactions > 0 && (
//                                             <div className="dss-pagination">
//                                                 <div className="dss-pagination-left">
//                                                     <label className="dss-pagination-label">Rows:</label>
//                                                     <select
//                                                         className="dss-pagination-select"
//                                                         value={rowsPerPage}
//                                                         onChange={handleRowsPerPageChange}
//                                                     >
//                                                         <option value={5}>5</option>
//                                                         <option value={10}>10</option>
//                                                         <option value={25}>25</option>
//                                                         <option value={50}>50</option>
//                                                     </select>
//                                                     <span className="dss-pagination-info">
//                                                         {indexOfFirstTransaction + 1} - {Math.min(indexOfLastTransaction, totalTransactions)} of {totalTransactions}
//                                                     </span>
//                                                 </div>

//                                                 <div className="dss-pagination-right">
//                                                     <button
//                                                         className={`dss-pagination-btn ${currentPage === 1 ? 'dss-pagination-btn--disabled' : ''}`}
//                                                         onClick={goToPreviousPage}
//                                                         disabled={currentPage === 1}
//                                                     >
//                                                         <i className="bi bi-chevron-left"></i>
//                                                     </button>

//                                                     {getPageNumbers().map((page, index) => (
//                                                         typeof page === 'number' ? (
//                                                             <button
//                                                                 key={index}
//                                                                 className={`dss-pagination-btn ${currentPage === page ? 'dss-pagination-btn--active' : ''}`}
//                                                                 onClick={() => handlePageChange(page)}
//                                                             >
//                                                                 {page}
//                                                             </button>
//                                                         ) : (
//                                                             <span key={index} className="dss-pagination-ellipsis">
//                                                                 {page}
//                                                             </span>
//                                                         )
//                                                     ))}

//                                                     <button
//                                                         className={`dss-pagination-btn ${currentPage === totalPages ? 'dss-pagination-btn--disabled' : ''}`}
//                                                         onClick={goToNextPage}
//                                                         disabled={currentPage === totalPages}
//                                                     >
//                                                         <i className="bi bi-chevron-right"></i>
//                                                     </button>
//                                                 </div>
//                                             </div>
//                                         )}
//                                     </>
//                                 )}
//                             </div>
//                         </div>
//                     </div>

//                     {/* Footer */}
//                     <div className="dss-modal-footer">
//                         <button type="button" className="dss-btn-secondary" onClick={onClose}>
//                             <i className="bi bi-x-circle me-1"></i> Close
//                         </button>
//                     </div>
//                 </div>
//             </div>
//         </>
//     );
// };

// export default DailySalesSummary;

//-------------------------------------------------end1

import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import NepaliDate from 'nepali-datetime';
import './DailySalesSummary.css';

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

const DailySalesSummary = ({ show, onClose, companyId, accountId }) => {
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
    const [salesData, setSalesData] = useState({
        totalCashSales: 0,
        totalCreditSales: 0,
        totalSales: 0,
        totalSalesReturns: 0,
        netSales: 0,
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

    const fetchSalesData = useCallback(async () => {
        if (!companyId) {
            setNotification({
                show: true,
                message: 'Company not selected',
                type: 'error'
            });
            return;
        }

        setLoading(true);
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

            const response = await api.get(`/api/retailer/daily/sales-transactions?${params.toString()}`);

            if (response.data.success) {
                const data = response.data.data;
                setSalesData({
                    totalCashSales: data.totalCashSales || 0,
                    totalCreditSales: data.totalCreditSales || 0,
                    totalSales: data.totalSales || 0,
                    totalSalesReturns: data.totalSalesReturns || 0,
                    netSales: data.netSales || 0,
                    transactions: data.transactions || []
                });
                setCurrentPage(1);
            } else {
                setNotification({
                    show: true,
                    message: response.data.error || 'Failed to fetch sales data',
                    type: 'error'
                });
            }
        } catch (error) {
            console.error('Error fetching sales data:', error);
            setNotification({
                show: true,
                message: error.response?.data?.error || 'Failed to fetch sales data',
                type: 'error'
            });
        } finally {
            setLoading(false);
        }
    }, [companyId, dateRange.fromDateAd, dateRange.toDateAd, accountId]);

    useEffect(() => {
        if (show && companyId) {
            fetchSalesData();
        }
    }, [show, companyId, fetchSalesData]);

    // FIX: Add Escape key handler to close modal
    useEffect(() => {
        const handleEscapeKey = (e) => {
            if (e.key === 'Escape' && show) {
                e.preventDefault();
                onClose();
            }
        };

        window.addEventListener('keydown', handleEscapeKey);

        return () => {
            window.removeEventListener('keydown', handleEscapeKey);
        };
    }, [show, onClose]);

    const handleGenerateReport = () => {
        if (!dateRange.fromDate || !dateRange.toDate) {
            setNotification({
                show: true,
                message: 'Please select both from and to dates',
                type: 'error'
            });
            return;
        }
        fetchSalesData();
    };

    const totalTransactions = salesData.transactions.length;
    const totalPages = Math.ceil(totalTransactions / rowsPerPage);
    const indexOfLastTransaction = currentPage * rowsPerPage;
    const indexOfFirstTransaction = indexOfLastTransaction - rowsPerPage;
    const currentTransactions = salesData.transactions.slice(indexOfFirstTransaction, indexOfLastTransaction);

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
            'Cash Sale': 'success',
            'Credit Sale': 'primary',
            'Sales Return': 'danger',
            'Sale': 'success',
            'cash': 'success',
            'credit': 'primary'
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
                className="dss-modal-overlay"
                onClick={(e) => {
                    if (e.target === e.currentTarget) onClose();
                }}
            >
                <div className="dss-modal">
                    {/* Header */}
                    <div className="dss-modal-header">
                        <div className="dss-modal-header-left">
                            <div className="dss-modal-header-icon">
                                <i className="bi bi-graph-up-arrow"></i>
                            </div>
                            <div>
                                <h5 className="dss-modal-title">Sales Transaction Details</h5>
                                <small className="dss-modal-subtitle">
                                    {salesData.transactions.length} transactions found
                                </small>
                            </div>
                        </div>
                        <button
                            type="button"
                            className="dss-modal-close"
                            onClick={onClose}
                        >
                            <i className="bi bi-x-lg"></i>
                        </button>
                    </div>

                    <div className="dss-modal-body">
                        {/* Date Filters & Stats - Single Row */}
                        <div className="dss-filters-stats-row">
                            {/* Date Filters */}
                            <div className="dss-filters-group">
                                <div className="dss-filter-item dss-filter-item--date">
                                    <label className="dss-filter-label">From (BS)</label>
                                    <input
                                        type="text"
                                        className={`dss-filter-input ${dateErrors.fromDate ? 'dss-filter-input--error' : ''}`}
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

                                <div className="dss-filter-item dss-filter-item--date">
                                    <label className="dss-filter-label">To (BS)</label>
                                    <input
                                        type="text"
                                        className={`dss-filter-input ${dateErrors.toDate ? 'dss-filter-input--error' : ''}`}
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
                                    className="dss-btn-primary dss-btn-generate"
                                    onClick={handleGenerateReport}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <span className="dss-spinner-small"></span>
                                    ) : (
                                        <>
                                            <i className="bi bi-search me-1"></i> Generate
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Stats Inline */}
                            <div className="dss-stats-inline">
                                <div className="dss-stat-inline dss-stat-inline--success">
                                    <div className="dss-stat-inline-icon">
                                        <i className="bi bi-cash"></i>
                                    </div>
                                    <div className="dss-stat-inline-content">
                                        <small className="dss-stat-inline-label">Cash</small>
                                        <span className="dss-stat-inline-value">
                                            <span className="dss-rupee-symbol">Rs.</span> {formatCurrency(salesData.totalCashSales)}
                                        </span>
                                    </div>
                                </div>

                                <div className="dss-stat-inline dss-stat-inline--primary">
                                    <div className="dss-stat-inline-icon">
                                        <i className="bi bi-credit-card"></i>
                                    </div>
                                    <div className="dss-stat-inline-content">
                                        <small className="dss-stat-inline-label">Credit</small>
                                        <span className="dss-stat-inline-value">
                                            <span className="dss-rupee-symbol">Rs.</span> {formatCurrency(salesData.totalCreditSales)}
                                        </span>
                                    </div>
                                </div>

                                <div className="dss-stat-inline dss-stat-inline--danger">
                                    <div className="dss-stat-inline-icon">
                                        <i className="bi bi-arrow-return-left"></i>
                                    </div>
                                    <div className="dss-stat-inline-content">
                                        <small className="dss-stat-inline-label">Returns</small>
                                        <span className="dss-stat-inline-value">
                                            <span className="dss-rupee-symbol">Rs.</span> {formatCurrency(salesData.totalSalesReturns)}
                                        </span>
                                    </div>
                                </div>

                                <div className="dss-stat-inline dss-stat-inline--info">
                                    <div className="dss-stat-inline-icon">
                                        <i className="bi bi-calculator"></i>
                                    </div>
                                    <div className="dss-stat-inline-content">
                                        <small className="dss-stat-inline-label">Net</small>
                                        <span className="dss-stat-inline-value dss-stat-inline-value--positive">
                                            <span className="dss-rupee-symbol">Rs.</span> {formatCurrency(salesData.netSales)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Transactions Table */}
                        <div className="dss-table-card">
                            <div className="dss-table-card-body">
                                {loading ? (
                                    <div className="dss-loading">
                                        <div className="dss-spinner"></div>
                                        <p className="dss-loading-text">Loading sales transactions...</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="dss-table-wrap">
                                            <table className="dss-table">
                                                <thead className="dss-table-header">
                                                    <tr>
                                                        <th style={{ width: '12%' }}>Date</th>
                                                        <th style={{ width: '12%' }}>Inv. No</th>
                                                        <th style={{ width: '20%' }}>Party</th>
                                                        <th style={{ width: '12%' }}>Type</th>
                                                        <th style={{ width: '12%' }}>Payment Mode</th>
                                                        <th style={{ width: '15%', textAlign: 'right' }}>Amount</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {currentTransactions.length > 0 ? (
                                                        currentTransactions.map((transaction, index) => {
                                                            const badgeColor = getTransactionBadgeColor(transaction.type || transaction.paymentMode);
                                                            const isReturn = transaction.isReturn || transaction.type === 'Sales Return';
                                                            const amount = Math.abs(transaction.amount || 0);

                                                            return (
                                                                <tr key={transaction.id || index} className="dss-table-row">
                                                                    <td>
                                                                        {transaction.nepaliDate || transaction.date?.split('T')[0] || 'N/A'}
                                                                    </td>
                                                                    <td>
                                                                        <span className="dss-badge-inv">
                                                                            {transaction.billNumber || 'N/A'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="dss-party-name">
                                                                        {transaction.accountName || 'N/A'}
                                                                    </td>
                                                                    <td>
                                                                        <span className={`dss-badge-transaction dss-badge-transaction--${badgeColor}`}>
                                                                            {transaction.type || 'N/A'}
                                                                        </span>
                                                                    </td>
                                                                    <td>
                                                                        <span className={`dss-badge-payment ${transaction.paymentMode === 'Cash' ? 'dss-badge-payment--cash' : 'dss-badge-payment--credit'}`}>
                                                                            {transaction.paymentMode || 'N/A'}
                                                                        </span>
                                                                    </td>
                                                                    <td style={{ textAlign: 'right' }}>
                                                                        <span className={isReturn ? 'dss-amount-return' : 'dss-amount-sale'}>
                                                                            <span className="dss-rupee-symbol">Rs.</span> {formatCurrency(amount)}
                                                                            {isReturn && ' (Return)'}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
                                                    ) : (
                                                        <tr>
                                                            <td colSpan="6" className="dss-empty-state">
                                                                <i className="bi bi-inbox dss-empty-icon"></i>
                                                                <p className="dss-empty-text">No sales transactions found</p>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Pagination */}
                                        {totalTransactions > 0 && (
                                            <div className="dss-pagination">
                                                <div className="dss-pagination-left">
                                                    <label className="dss-pagination-label">Rows:</label>
                                                    <select
                                                        className="dss-pagination-select"
                                                        value={rowsPerPage}
                                                        onChange={handleRowsPerPageChange}
                                                    >
                                                        <option value={5}>5</option>
                                                        <option value={10}>10</option>
                                                        <option value={25}>25</option>
                                                        <option value={50}>50</option>
                                                    </select>
                                                    <span className="dss-pagination-info">
                                                        {indexOfFirstTransaction + 1} - {Math.min(indexOfLastTransaction, totalTransactions)} of {totalTransactions}
                                                    </span>
                                                </div>

                                                <div className="dss-pagination-right">
                                                    <button
                                                        className={`dss-pagination-btn ${currentPage === 1 ? 'dss-pagination-btn--disabled' : ''}`}
                                                        onClick={goToPreviousPage}
                                                        disabled={currentPage === 1}
                                                    >
                                                        <i className="bi bi-chevron-left"></i>
                                                    </button>

                                                    {getPageNumbers().map((page, index) => (
                                                        typeof page === 'number' ? (
                                                            <button
                                                                key={index}
                                                                className={`dss-pagination-btn ${currentPage === page ? 'dss-pagination-btn--active' : ''}`}
                                                                onClick={() => handlePageChange(page)}
                                                            >
                                                                {page}
                                                            </button>
                                                        ) : (
                                                            <span key={index} className="dss-pagination-ellipsis">
                                                                {page}
                                                            </span>
                                                        )
                                                    ))}

                                                    <button
                                                        className={`dss-pagination-btn ${currentPage === totalPages ? 'dss-pagination-btn--disabled' : ''}`}
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
                    <div className="dss-modal-footer">
                        <button type="button" className="dss-btn-secondary" onClick={onClose}>
                            <i className="bi bi-x-circle me-1"></i> Close
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default DailySalesSummary;