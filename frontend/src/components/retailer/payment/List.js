// import React, { useState, useEffect, useRef } from 'react';
// import { useNavigate } from 'react-router-dom';
// import axios from 'axios';
// import Header from '../Header';
// import NepaliDate from 'nepali-date-converter';
// import { usePageNotRefreshContext } from '../PageNotRefreshContext';
// import Loader from '../../Loader';
// import ProductModal from '../dashboard/modals/ProductModal';

// const PaymentsList = () => {
//     const { draftSave, setDraftSave, clearDraft } = usePageNotRefreshContext();
//     const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
//     const currentEnglishDate = new Date().toISOString().split('T')[0];
//     const [showProductModal, setShowProductModal] = useState(false);

//     const [company, setCompany] = useState({
//         dateFormat: 'nepali',
//         vatEnabled: true,
//         fiscalYear: {}
//     });

//     const [data, setData] = useState(() => {
//         if (draftSave && draftSave.paymentsData) {
//             return draftSave.paymentsData;
//         }
//         return {
//             company: null,
//             currentFiscalYear: null,
//             payments: [],
//             fromDate: '',
//             toDate: '',
//             userPreferences: {
//                 theme: 'light'
//             },
//             userRoles: {
//                 isAdminOrSupervisor: false
//             }
//         };
//     });

//     const [searchQuery, setSearchQuery] = useState(() => {
//         if (draftSave && draftSave.paymentsSearch) {
//             return draftSave.paymentsSearch.searchQuery || '';
//         }
//         return '';
//     });

//     const [paymentAccountFilter, setPaymentAccountFilter] = useState(() => {
//         if (draftSave && draftSave.paymentsSearch) {
//             return draftSave.paymentsSearch.paymentAccountFilter || '';
//         }
//         return '';
//     });

//     const [selectedRowIndex, setSelectedRowIndex] = useState(() => {
//         if (draftSave && draftSave.paymentsSearch) {
//             return draftSave.paymentsSearch.selectedRowIndex || 0;
//         }
//         return 0;
//     });
//     // Fetch company and fiscal year info when component mounts
//     useEffect(() => {
//         const fetchInitialData = async () => {
//             try {
//                 const response = await api.get('/api/my-company');
//                 if (response.data.success) {
//                     const { company: companyData, currentFiscalYear } = response.data;

//                     // Set company info
//                     const dateFormat = companyData.dateFormat || 'english';
//                     setCompany({
//                         dateFormat,
//                         isVatExempt: companyData.isVatExempt || false,
//                         vatEnabled: companyData.vatEnabled !== false, // default true
//                         fiscalYear: currentFiscalYear || {}
//                     });

//                     // Check if we have draft dates
//                     const hasDraftDates = draftSave?.paymentsData?.fromDate && draftSave?.paymentsData?.toDate;

//                     if (!hasDraftDates && currentFiscalYear?.startDate) {
//                         // Only set default dates if we don't have draft dates
//                         setData(prev => ({
//                             ...prev,
//                             fromDate: dateFormat === 'nepali'
//                                 ? new NepaliDate(currentFiscalYear.startDate).format('YYYY-MM-DD')
//                                 : new NepaliDate(currentFiscalYear.startDate).format('YYYY-MM-DD'),
//                             toDate: dateFormat === 'nepali' ? currentNepaliDate : currentEnglishDate,
//                             company: companyData,
//                             currentFiscalYear
//                         }));
//                     } else {
//                         // If we have draft data, ensure company info is updated
//                         setData(prev => ({
//                             ...prev,
//                             company: companyData,
//                             currentFiscalYear
//                         }));
//                     }
//                 }
//             } catch (err) {
//                 console.error('Error fetching initial data:', err);
//             }
//         };

//         fetchInitialData();
//     }, []);

//     const [loading, setLoading] = useState(false);
//     const [error, setError] = useState(null);
//     const [totalDebit, setTotalDebit] = useState(0);
//     const [filteredPayments, setFilteredPayments] = useState([]);

//     const fromDateRef = useRef(null);
//     const toDateRef = useRef(null);
//     const searchInputRef = useRef(null);
//     const paymentAccountFilterRef = useRef(null);
//     const generateReportRef = useRef(null);
//     const tableBodyRef = useRef(null);
//     const [shouldFetch, setShouldFetch] = useState(false);
//     const navigate = useNavigate();

//     const api = axios.create({
//         baseURL: process.env.REACT_APP_API_BASE_URL,
//         withCredentials: true,
//     });

//     // Save data and search state to draft context
//     useEffect(() => {
//         setDraftSave({
//             ...draftSave,
//             paymentsData: data,
//             paymentsSearch: {
//                 searchQuery,
//                 paymentAccountFilter,
//                 selectedRowIndex,
//                 // Include date filters in search state for easy access
//                 fromDate: data.fromDate,
//                 toDate: data.toDate
//             }
//         });
//     }, [data, searchQuery, paymentAccountFilter, selectedRowIndex, data.fromDate, data.toDate]);

//     // Fetch data when generate report is clicked
//     useEffect(() => {
//         const fetchData = async () => {
//             if (!shouldFetch) return;

//             try {
//                 setLoading(true);
//                 const params = new URLSearchParams();
//                 if (data.fromDate) params.append('fromDate', data.fromDate);
//                 if (data.toDate) params.append('toDate', data.toDate);

//                 const response = await api.get(`/api/retailer/payments/register?${params.toString()}`);
//                 setData(response.data.data);
//                 setError(null);
//                 // Don't reset selection when new data loads if we have a saved position
//                 if (!draftSave?.paymentsSearch?.selectedRowIndex) {
//                     setSelectedRowIndex(0);
//                 }
//             } catch (err) {
//                 setError(err.response?.data?.error || 'Failed to fetch payments');
//             } finally {
//                 setLoading(false);
//                 setShouldFetch(false);
//             }
//         };

//         fetchData();
//     }, [shouldFetch, data.fromDate, data.toDate]);

//     // Filter payments based on search and payment account
//     useEffect(() => {
//         const filtered = data.payments.filter(payment => {
//             const matchesSearch =
//                 payment.billNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
//                 payment.account?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
//                 payment.user?.name?.toLowerCase().includes(searchQuery.toLowerCase());

//             const matchesPaymentAccount =
//                 paymentAccountFilter === '' ||
//                 (payment.paymentAccount?.name?.toLowerCase() === paymentAccountFilter.toLowerCase());

//             return matchesSearch && matchesPaymentAccount;
//         });

//         setFilteredPayments(filtered);

//         // Reset selected row when filters change, but only if we don't have a saved position
//         if (!draftSave?.paymentsSearch?.selectedRowIndex) {
//             setSelectedRowIndex(0);
//         }
//     }, [data.payments, searchQuery, paymentAccountFilter]);

//     // Calculate totals when filtered payments change
//     useEffect(() => {
//         if (filteredPayments.length === 0) {
//             setTotalDebit(0);
//             return;
//         }

//         const newTotal = filteredPayments.reduce((acc, payment) => {
//             return payment.isActive ? acc + (payment.debit || 0) : acc;
//         }, 0);

//         setTotalDebit(newTotal);
//     }, [filteredPayments]);

//     // Handle keyboard navigation
//     useEffect(() => {
//         const handleKeyDown = (e) => {
//             if (filteredPayments.length === 0) return;

//             // Check if focus is inside an input or select element
//             const activeElement = document.activeElement;
//             if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'SELECT') {
//                 return;
//             }

//             switch (e.key) {
//                 case 'ArrowUp':
//                     e.preventDefault();
//                     setSelectedRowIndex(prev => Math.max(0, prev - 1));
//                     break;
//                 case 'ArrowDown':
//                     e.preventDefault();
//                     setSelectedRowIndex(prev => Math.min(filteredPayments.length - 1, prev + 1));
//                     break;
//                 default:
//                     break;
//             }
//         };

//         window.addEventListener('keydown', handleKeyDown);
//         return () => window.removeEventListener('keydown', handleKeyDown);
//     }, [filteredPayments, selectedRowIndex, navigate]);

//     // Scroll to selected row
//     useEffect(() => {
//         if (tableBodyRef.current && filteredPayments.length > 0) {
//             const rows = tableBodyRef.current.querySelectorAll('tr');
//             if (rows.length > selectedRowIndex) {
//                 rows[selectedRowIndex].scrollIntoView({
//                     behavior: 'smooth',
//                     block: 'nearest'
//                 });
//             }
//         }
//     }, [selectedRowIndex, filteredPayments]);

//     useEffect(() => {
//         // Add F9 key handler here
//         const handF9leKeyDown = (e) => {
//             if (e.key === 'F9') {
//                 e.preventDefault();
//                 setShowProductModal(prev => !prev); // Toggle modal visibility
//             }
//         };
//         window.addEventListener('keydown', handF9leKeyDown);
//         return () => {
//             window.removeEventListener('keydown', handF9leKeyDown);
//         };
//     }, []);

//     const handleDateChange = (e) => {
//         const { name, value } = e.target;
//         setData(prev => ({ ...prev, [name]: value }));
//     };

//     const handleSearchChange = (e) => {
//         setSearchQuery(e.target.value);
//     };

//     const handlePaymentAccountFilterChange = (e) => {
//         setPaymentAccountFilter(e.target.value);
//     };

//     const handleGenerateReport = () => {
//         if (!data.fromDate || !data.toDate) {
//             setError('Please select both from and to dates');
//             return;
//         }
//         setShouldFetch(true);
//     };

//     const handlePrint = (filtered = false) => {
//         const rowsToPrint = filtered ?
//             filteredPayments :
//             data.payments;

//         if (rowsToPrint.length === 0) {
//             alert("No payments to print");
//             return;
//         }

//         const printWindow = window.open("", "_blank");
//         const printHeader = `
//             <div class="print-header">
//                 <h1>${data.currentCompanyName || 'Company Name'}</h1>
//                 <p>
//                     ${data.currentCompany?.address || ''}-${data.currentCompany?.ward || ''}, ${data.currentCompany?.city || ''},
//                     ${data.currentCompany?.country || ''}<br>
//                     TPIN: ${data.currentCompany?.pan || ''}
//                 </p>
//                 <hr>
//             </div>
//         `;

//         let tableContent = `
//         <style>
//             @page {
//                 size: A4 landscape;
//                 margin: 10mm;
//             }
//             body { 
//                 font-family: Arial, sans-serif; 
//                 font-size: 10px; 
//                 margin: 0;
//                 padding: 10mm;
//             }
//             table { 
//                 width: 100%; 
//                 border-collapse: collapse; 
//                 page-break-inside: auto;
//             }
//             tr { 
//                 page-break-inside: avoid; 
//                 page-break-after: auto; 
//             }
//             th, td { 
//                 border: 1px solid #000; 
//                 padding: 2px; 
//                 font-size: 2px
//                 text-align: left; 
//                 white-space: nowrap;
//             }
//             th { 
//                 background-color: #f2f2f2 !important; 
//                 -webkit-print-color-adjust: exact; 
//             }
//             .print-header { 
//                 text-align: center; 
//                 margin-bottom: 15px; 
//             }
//             .nowrap {
//                 white-space: nowrap;
//             }
//             .text-danger {
//                 color: #dc3545 !important;
//             }
//         </style>
//         ${printHeader}
//         <h1 style="text-align:center;text-decoration:underline;">Payment Voucher's Register</h1>
//         <table>
//             <thead>
//                 <tr>
//                     <th class="nowrap">Date</th>
//                     <th class="nowrap">Vch. No.</th>
//                     <th class="nowrap">Account</th>
//                     <th class="nowrap">Debit</th>
//                     <th class="nowrap">Payment Account</th>
//                     <th class="nowrap">User</th>
//                 </tr>
//             </thead>
//             <tbody>
//         `;

//         let totalDebit = 0;

//         rowsToPrint.forEach(payment => {
//             const isCanceled = !payment.isActive;

//             tableContent += `
//             <tr>
//                 <td class="nowrap">${new NepaliDate(payment.date).format('YYYY-MM-DD')}</td>
//                 <td class="nowrap">${payment.billNumber}</td>
//                 <td class="nowrap">${isCanceled ? '<span class="text-danger">Canceled</span>' : (payment.account?.name || 'N/A')}</td>
//                 <td class="nowrap">${isCanceled ? '<span class="text-danger">0.00</span>' : (payment.debit?.toFixed(2) || '0.00')}</td>
//                 <td class="nowrap">${isCanceled ? '<span class="text-danger">Canceled</span>' : (payment.paymentAccount?.name || 'N/A')}</td>
//                 <td class="nowrap">${payment.user?.name || 'N/A'}</td>
//             </tr>
//             `;

//             if (!isCanceled) {
//                 totalDebit += parseFloat(payment.debit || 0);
//             }
//         });

//         // Add totals row
//         tableContent += `
//             <tr style="font-weight:bold;">
//                 <td colspan="3">Total:</td>
//                 <td>${totalDebit.toFixed(2)}</td>
//                 <td colspan="2"></td>
//             </tr>
//             </tbody>
//         </table>
//         `;

//         printWindow.document.write(`
//         <html>
//             <head>
//                 <title>Payment Voucher's Register</title>
//             </head>
//             <body>
//                 ${tableContent}
//                 <script>
//                     window.onload = function() {
//                         setTimeout(function() {
//                             window.print();
//                         }, 200);
//                     };
//                 <\/script>
//             </body>
//         </html>
//         `);
//         printWindow.document.close();
//     };

//     const formatCurrency = (num) => {
//         const number = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num) || 0;
//         if (company.dateFormat === 'nepali') {
//             // Indian grouping, two decimals, English digits
//             return number.toLocaleString('en-IN', {
//                 minimumFractionDigits: 2,
//                 maximumFractionDigits: 2
//             });
//         }
//         // English (US) grouping by default
//         return number.toLocaleString('en-US', {
//             minimumFractionDigits: 2,
//             maximumFractionDigits: 2
//         });
//     };


//     const handleRowClick = (index) => {
//         setSelectedRowIndex(index);
//     };

//     const handleRowDoubleClick = (paymentId) => {
//         navigate(`/retailer/payments/${filteredPayments[selectedRowIndex]._id}/print`);
//     };

//     const handleKeyDown = (e, nextFieldId) => {
//         if (e.key === 'Enter') {
//             e.preventDefault();
//             if (nextFieldId) {
//                 const nextField = document.getElementById(nextFieldId);
//                 if (nextField) {
//                     nextField.focus();
//                 }
//             } else {
//                 // If no nextFieldId provided, try to find the next focusable element
//                 const focusableElements = Array.from(
//                     document.querySelectorAll('input, select, button, [tabindex]:not([tabindex="-1"])')
//                 ).filter(el => !el.disabled && el.offsetParent !== null);

//                 const currentIndex = focusableElements.findIndex(el => el === e.target);

//                 if (currentIndex > -1 && currentIndex < focusableElements.length - 1) {
//                     focusableElements[currentIndex + 1].focus();
//                 }
//             }
//         }
//     };

//     // Get unique payment accounts for filter dropdown
//     const paymentAccounts = [...new Set(data.payments
//         .map(payment => payment.paymentAccount?.name)
//         .filter(name => name !== undefined && name !== null))];

//     if (loading) return <Loader />;

//     if (error) {
//         return <div className="alert alert-danger text-center py-5">{error}</div>;
//     }

//     return (
//         <div className='container-fluid'>
//             <Header />
//             <div className="card shadow">
//                 <div className="card-header bg-white py-3">
//                     <h1 className="h3 mb-0 text-center text-primary">Payment Voucher's Register</h1>
//                 </div>

//                 <div className="card-body">
//                     {/* Search and Filter Section */}
//                     <div className="row mb-4">
//                         <div className="col-md-8">
//                             <div className="row g-3">
//                                 {/* Date Range Row */}
//                                 <div className="col">
//                                     <label htmlFor="fromDate" className="form-label">From Date</label>
//                                     <input
//                                         type="text"
//                                         name="fromDate"
//                                         id="fromDate"
//                                         ref={company.dateFormat === 'nepali' ? fromDateRef : null}
//                                         className="form-control"
//                                         value={data.fromDate}
//                                         onChange={handleDateChange}
//                                         required
//                                         autoComplete='off'
//                                         onKeyDown={(e) => handleKeyDown(e, 'toDate')}
//                                     />
//                                 </div>
//                                 <div className="col">
//                                     <label htmlFor="toDate" className="form-label">To Date</label>
//                                     <input
//                                         type="text"
//                                         name="toDate"
//                                         id="toDate"
//                                         ref={toDateRef}
//                                         className="form-control"
//                                         value={data.toDate}
//                                         onChange={handleDateChange}
//                                         required
//                                         autoComplete='off'
//                                         onKeyDown={(e) => handleKeyDown(e, 'generateReport')}
//                                     />
//                                 </div>
//                                 <div className="col-md-2 d-flex align-items-end">
//                                     <button
//                                         type="button"
//                                         id="generateReport"
//                                         ref={generateReportRef}
//                                         className="btn btn-primary w-100"
//                                         onClick={handleGenerateReport}
//                                     >
//                                         <i className="fas fa-chart-line me-2"></i>Generate
//                                     </button>
//                                 </div>

//                                 {/* Search Row */}
//                                 <div className="col-md-4">
//                                     <label htmlFor="searchInput" className="form-label">Search</label>
//                                     <div className="input-group">
//                                         <input
//                                             type="text"
//                                             className="form-control"
//                                             id="searchInput"
//                                             ref={searchInputRef}
//                                             placeholder="Search by voucher number, account or user..."
//                                             value={searchQuery}
//                                             onChange={handleSearchChange}
//                                             disabled={data.payments.length === 0}
//                                             autoComplete='off'
//                                         />
//                                         <button
//                                             className="btn btn-outline-secondary"
//                                             type="button"
//                                             onClick={() => setSearchQuery('')}
//                                             disabled={data.payments.length === 0}
//                                         >
//                                             <i className="fas fa-times"></i>
//                                         </button>
//                                     </div>
//                                 </div>

//                                 {/* Payment Account Filter Row */}
//                                 <div className="col-md-2">
//                                     <label htmlFor="paymentAccountFilter" className="form-label">Payment Account</label>
//                                     <select
//                                         className="form-select"
//                                         id="paymentAccountFilter"
//                                         ref={paymentAccountFilterRef}
//                                         value={paymentAccountFilter}
//                                         onChange={handlePaymentAccountFilterChange}
//                                         disabled={data.payments.length === 0}
//                                     >
//                                         <option value="">All</option>
//                                         {paymentAccounts.map(account => (
//                                             <option key={account} value={account}>{account}</option>
//                                         ))}
//                                     </select>
//                                 </div>
//                             </div>
//                         </div>

//                         {/* Action Buttons */}
//                         <div className="col-md-4 d-flex align-items-end justify-content-end gap-2">
//                             <button
//                                 className="btn btn-primary"
//                                 onClick={() => navigate('/retailer/payments')}
//                             >
//                                 New Voucher
//                             </button>
//                             <button
//                                 className="btn btn-secondary"
//                                 onClick={() => handlePrint(false)}
//                                 disabled={data.payments.length === 0}
//                             >
//                                 Print All
//                             </button>
//                             <button
//                                 className="btn btn-secondary"
//                                 onClick={() => handlePrint(true)}
//                                 disabled={data.payments.length === 0}
//                             >
//                                 Print Filtered
//                             </button>
//                             <button
//                                 type="button"
//                                 className="btn btn-secondary"
//                                 onClick={() => window.location.reload()}
//                             >
//                                 Refresh
//                             </button>
//                         </div>
//                     </div>

//                     {data.payments.length === 0 ? (
//                         <div className="alert alert-info text-center py-3">
//                             <i className="fas fa-info-circle me-2"></i>
//                             Please select date range and click "Generate Report" to view data
//                         </div>
//                     ) : (
//                         <>
//                             {/* Payments Table */}
//                             <div className="table-responsive">
//                                 <table className="table table-hover">
//                                     <thead>
//                                         <tr>
//                                             <th>Date</th>
//                                             <th>Vch. No.</th>
//                                             <th>Account</th>
//                                             <th className="text-end">Debit</th>
//                                             <th>Payment Account</th>
//                                             <th>User</th>
//                                             <th>Actions</th>
//                                         </tr>
//                                     </thead>
//                                     <tbody ref={tableBodyRef}>
//                                         {filteredPayments.map((payment, index) => (
//                                             <tr
//                                                 key={payment._id}
//                                                 className={`payment-row ${selectedRowIndex === index ? 'highlighted-row' : ''}`}
//                                                 onClick={() => handleRowClick(index)}
//                                                 onDoubleClick={() => handleRowDoubleClick(payment._id)}
//                                                 style={{ cursor: 'pointer' }}
//                                             >
//                                                 <td>{new NepaliDate(payment.date).format('YYYY-MM-DD')}</td>
//                                                 <td>{payment.billNumber}</td>
//                                                 <td>
//                                                     {payment.isActive ?
//                                                         (payment.account?.name || 'N/A') :
//                                                         <span className="text-danger">Canceled</span>}
//                                                 </td>
//                                                 <td className="text-end">
//                                                     {payment.isActive ?
//                                                         formatCurrency(payment.debit) :
//                                                         <span className="text-danger">0.00</span>}
//                                                 </td>
//                                                 <td>
//                                                     {payment.isActive ?
//                                                         (payment.paymentAccount?.name || 'N/A') :
//                                                         <span className="text-danger">Canceled</span>}
//                                                 </td>
//                                                 <td>{payment.user?.name || 'N/A'}</td>
//                                                 <td>
//                                                     <div className="d-flex gap-2">
//                                                         <button
//                                                             className="btn btn-sm btn-info"
//                                                             onClick={() => navigate(`/retailer/payments/${payment._id}/print`)}
//                                                         >
//                                                             <i className="fas fa-eye"></i>View
//                                                         </button>
//                                                         <button
//                                                             className="btn btn-sm btn-warning"
//                                                             onClick={() => navigate(`/retailer/payments/${payment._id}`)}
//                                                         >
//                                                             <i className="fas fa-edit"></i>Edit
//                                                         </button>
//                                                     </div>
//                                                 </td>
//                                             </tr>
//                                         ))}
//                                     </tbody>
//                                     <tfoot>
//                                         <tr className="fw-bold">
//                                             <td colSpan="3">Total:</td>
//                                             <td className="text-end">{formatCurrency(totalDebit)}</td>
//                                             <td colSpan="3"></td>
//                                         </tr>
//                                     </tfoot>
//                                 </table>
//                             </div>
//                         </>
//                     )}
//                 </div>
//             </div>

//             {/* Product modal */}
//             {showProductModal && (
//                 <ProductModal onClose={() => setShowProductModal(false)} />
//             )}
//         </div>
//     );
// };

// export default PaymentsList;

//------------------------------------------------------------------END

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../Header';
import NepaliDate from 'nepali-date-converter';
import { usePageNotRefreshContext } from '../PageNotRefreshContext';
import '../../../stylesheet/noDateIcon.css'
import Loader from '../../Loader';
import ProductModal from '../dashboard/modals/ProductModal';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

const PaymentsList = () => {
    const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
    const currentEnglishDate = new Date().toISOString().split('T')[0];

    // Add to your existing state declarations
    const [dateErrors, setDateErrors] = useState({
        fromDate: '',
        toDate: ''
    });

    const [notification, setNotification] = useState({
        show: false,
        message: '',
        type: 'success',
        duration: 3000
    });

    const { draftSave, setDraftSave, clearDraft } = usePageNotRefreshContext();

    const [company, setCompany] = useState({
        dateFormat: 'nepali',
        vatEnabled: true,
        fiscalYear: {},
    });

    const [data, setData] = useState(() => {
        if (draftSave && draftSave.paymentsData) {
            return draftSave.paymentsData;
        }
        return {
            company: null,
            currentFiscalYear: null,
            payments: [],
            fromDate: '',
            toDate: ''
        };
    });

    const [searchQuery, setSearchQuery] = useState(() => {
        if (draftSave && draftSave.paymentsSearch) {
            return draftSave.paymentsSearch.searchQuery || '';
        }
        return '';
    });

    const [paymentAccountFilter, setPaymentAccountFilter] = useState(() => {
        if (draftSave && draftSave.paymentsSearch) {
            return draftSave.paymentsSearch.paymentAccountFilter || '';
        }
        return '';
    });

    const [selectedRowIndex, setSelectedRowIndex] = useState(() => {
        if (draftSave && draftSave.paymentsSearch) {
            return draftSave.paymentsSearch.selectedRowIndex || 0;
        }
        return 0;
    });

    const [showProductModal, setShowProductModal] = useState(false);

    // Add column resizing state
    const [columnWidths, setColumnWidths] = useState({
        date: 90,
        voucherNo: 120,
        account: 200,
        debit: 100,
        paymentAccount: 150,
        user: 120,
        actions: 140
    });

    const [isResizing, setIsResizing] = useState(false);
    const [resizingColumn, setResizingColumn] = useState(null);
    const [startX, setStartX] = useState(0);
    const [startWidth, setStartWidth] = useState(0);

    // Fetch company and fiscal year info when component mounts
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const response = await api.get('/api/my-company');
                if (response.data.success) {
                    const { company: companyData, currentFiscalYear } = response.data;

                    // Set company info
                    const dateFormat = companyData.dateFormat || 'english';
                    setCompany({
                        dateFormat,
                        vatEnabled: companyData.vatEnabled !== false, // default true
                        fiscalYear: currentFiscalYear || {}
                    });

                    // Check if we have draft dates
                    const hasDraftDates = draftSave?.paymentsData?.fromDate && draftSave?.paymentsData?.toDate;

                    if (!hasDraftDates && currentFiscalYear?.startDate) {
                        // Only set default dates if we don't have draft dates
                        setData(prev => ({
                            ...prev,
                            fromDate: dateFormat === 'nepali'
                                ? new NepaliDate(currentFiscalYear.startDate).format('YYYY-MM-DD')
                                : new NepaliDate(currentFiscalYear.startDate).format('YYYY-MM-DD'),
                            toDate: dateFormat === 'nepali' ? currentNepaliDate : currentEnglishDate,
                            company: companyData,
                            currentFiscalYear
                        }));
                    } else {
                        // If we have draft data, ensure company info is updated
                        setData(prev => ({
                            ...prev,
                            company: companyData,
                            currentFiscalYear
                        }));
                    }
                }
            } catch (err) {
                console.error('Error fetching initial data:', err);
            }
        };

        fetchInitialData();
    }, []);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [totalDebit, setTotalDebit] = useState(0);
    const [filteredPayments, setFilteredPayments] = useState([]);

    const fromDateRef = useRef(null);
    const toDateRef = useRef(null);
    const searchInputRef = useRef(null);
    const paymentAccountFilterRef = useRef(null);
    const generateReportRef = useRef(null);
    const tableBodyRef = useRef(null);
    const [shouldFetch, setShouldFetch] = useState(false);
    const navigate = useNavigate();

    const api = axios.create({
        baseURL: process.env.REACT_APP_API_BASE_URL,
        withCredentials: true,
    });

    // Save data and search state to draft context
    useEffect(() => {
        setDraftSave({
            ...draftSave,
            paymentsData: data,
            paymentsSearch: {
                searchQuery,
                paymentAccountFilter,
                selectedRowIndex,
                fromDate: data.fromDate,
                toDate: data.toDate
            }
        });
    }, [data, searchQuery, paymentAccountFilter, selectedRowIndex, data.fromDate, data.toDate]);

    // Save/load column widths
    useEffect(() => {
        const savedWidths = localStorage.getItem('paymentsTableColumnWidths');
        if (savedWidths) {
            try {
                setColumnWidths(JSON.parse(savedWidths));
            } catch (e) {
                console.error('Failed to load column widths:', e);
            }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('paymentsTableColumnWidths', JSON.stringify(columnWidths));
    }, [columnWidths]);

    // Fetch data when generate report is clicked
    useEffect(() => {
        const fetchData = async () => {
            if (!shouldFetch) return;

            try {
                setLoading(true);
                const params = new URLSearchParams();
                if (data.fromDate) params.append('fromDate', data.fromDate);
                if (data.toDate) params.append('toDate', data.toDate);

                const response = await api.get(`/api/retailer/payments/register?${params.toString()}`);
                setData(response.data.data);
                setError(null);
                // Don't reset selection when new data loads if we have a saved position
                if (!draftSave?.paymentsSearch?.selectedRowIndex) {
                    setSelectedRowIndex(0);
                }
            } catch (err) {
                setError(err.response?.data?.error || 'Failed to fetch payments');
            } finally {
                setLoading(false);
                setShouldFetch(false);
            }
        };

        fetchData();
    }, [shouldFetch, data.fromDate, data.toDate]);

    // Filter payments based on search and payment account
    useEffect(() => {
        const filtered = data.payments.filter(payment => {
            const matchesSearch =
                payment.billNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                payment.account?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                payment.user?.name?.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesPaymentAccount =
                paymentAccountFilter === '' ||
                (payment.paymentAccount?.name?.toLowerCase() === paymentAccountFilter.toLowerCase());

            return matchesSearch && matchesPaymentAccount;
        });

        setFilteredPayments(filtered);

        // Reset selected row when filters change, but only if we don't have a saved position
        if (!draftSave?.paymentsSearch?.selectedRowIndex) {
            setSelectedRowIndex(0);
        }
    }, [data.payments, searchQuery, paymentAccountFilter]);

    // Calculate totals when filtered payments change
    useEffect(() => {
        if (filteredPayments.length === 0) {
            setTotalDebit(0);
            return;
        }

        const newTotal = filteredPayments.reduce((acc, payment) => {
            return payment.isActive ? acc + (payment.debit || 0) : acc;
        }, 0);

        setTotalDebit(newTotal);
    }, [filteredPayments]);

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (filteredPayments.length === 0) return;

            // Check if focus is inside an input or select element
            const activeElement = document.activeElement;
            if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'SELECT') {
                return;
            }

            switch (e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    setSelectedRowIndex(prev => Math.max(0, prev - 1));
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    setSelectedRowIndex(prev => Math.min(filteredPayments.length - 1, prev + 1));
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [filteredPayments, selectedRowIndex, navigate]);

    // Scroll to selected row
    useEffect(() => {
        if (tableBodyRef.current && filteredPayments.length > 0) {
            const rows = tableBodyRef.current.querySelectorAll('tr');
            if (rows.length > selectedRowIndex) {
                rows[selectedRowIndex].scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest'
                });
            }
        }
    }, [selectedRowIndex, filteredPayments]);

    useEffect(() => {
        // Add F9 key handler here
        const handF9leKeyDown = (e) => {
            if (e.key === 'F9') {
                e.preventDefault();
                setShowProductModal(prev => !prev); // Toggle modal visibility
            }
        };
        window.addEventListener('keydown', handF9leKeyDown);
        return () => {
            window.removeEventListener('keydown', handF9leKeyDown);
        };
    }, []);

    const handleDateChange = (e) => {
        const { name, value } = e.target;
        setData(prev => ({ ...prev, [name]: value }));
    };

    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value);
    };

    const handlePaymentAccountFilterChange = (e) => {
        setPaymentAccountFilter(e.target.value);
    };

    const handleGenerateReport = () => {
        if (!data.fromDate || !data.toDate) {
            setError('Please select both from and to dates');
            return;
        }
        setShouldFetch(true);
    };

    // const handlePrint = (filtered = false) => {
    //     const rowsToPrint = filtered ? filteredPayments : data.payments;

    //     if (rowsToPrint.length === 0) {
    //         alert("No payments to print");
    //         return;
    //     }

    //     const printWindow = window.open("", "_blank");
    //     const printHeader = `
    //         <div class="print-header">
    //             <h1>${data.currentCompanyName || 'Company Name'}</h1>
    //             <p>
    //                 ${data.currentCompany?.address || ''}, ${data.currentCompany?.city || ''}<br>
    //                 TPIN: ${data.currentCompany?.pan || ''}
    //             </p>
    //             <hr>
    //         </div>
    //     `;

    //     let tableContent = `
    //     <style>
    //         @page {
    //             size: A4 landscape;
    //             margin: 10mm;
    //         }
    //         body { 
    //             font-family: Arial, sans-serif; 
    //             font-size: 10px; 
    //             margin: 0;
    //             padding: 10mm;
    //         }
    //         table { 
    //             width: 100%; 
    //             border-collapse: collapse; 
    //             page-break-inside: auto;
    //         }
    //         tr { 
    //             page-break-inside: avoid; 
    //             page-break-after: auto; 
    //         }
    //         th, td { 
    //             border: 1px solid #000; 
    //             padding: 2px; 
    //             font-size: 2px;
    //             text-align: left; 
    //             white-space: nowrap;
    //         }
    //         th { 
    //             background-color: #f2f2f2 !important; 
    //             -webkit-print-color-adjust: exact; 
    //         }
    //         .print-header { 
    //             text-align: center; 
    //             margin-bottom: 15px; 
    //         }
    //         .nowrap {
    //             white-space: nowrap;
    //         }
    //         .text-danger {
    //             color: #dc3545 !important;
    //         }
    //     </style>
    //     ${printHeader}
    //     <h1 style="text-align:center;text-decoration:underline;">Payment Voucher's Register</h1>
    //     <table>
    //         <thead>
    //             <tr>
    //                 <th class="nowrap">Date</th>
    //                 <th class="nowrap">Vch. No.</th>
    //                 <th class="nowrap">Account</th>
    //                 <th class="nowrap">Debit</th>
    //                 <th class="nowrap">Payment Account</th>
    //                 <th class="nowrap">User</th>
    //             </tr>
    //         </thead>
    //         <tbody>
    //     `;

    //     let totalDebit = 0;

    //     rowsToPrint.forEach(payment => {
    //         const isCanceled = !payment.isActive;

    //         tableContent += `
    //         <tr>
    //             <td class="nowrap">${new NepaliDate(payment.date).format('YYYY-MM-DD')}</td>
    //             <td class="nowrap">${payment.billNumber}</td>
    //             <td class="nowrap">${isCanceled ? '<span class="text-danger">Canceled</span>' : (payment.account?.name || 'N/A')}</td>
    //             <td class="nowrap">${isCanceled ? '<span class="text-danger">0.00</span>' : (payment.debit?.toFixed(2) || '0.00')}</td>
    //             <td class="nowrap">${isCanceled ? '<span class="text-danger">Canceled</span>' : (payment.paymentAccount?.name || 'N/A')}</td>
    //             <td class="nowrap">${payment.user?.name || 'N/A'}</td>
    //         </tr>
    //         `;

    //         if (!isCanceled) {
    //             totalDebit += parseFloat(payment.debit || 0);
    //         }
    //     });

    //     // Add totals row
    //     tableContent += `
    //         <tr style="font-weight:bold;">
    //             <td colspan="3">Total:</td>
    //             <td>${totalDebit.toFixed(2)}</td>
    //             <td colspan="2"></td>
    //         </tr>
    //         </tbody>
    //     </table>
    //     `;

    //     printWindow.document.write(`
    //     <html>
    //         <head>
    //             <title>Payment Voucher's Register</title>
    //         </head>
    //         <body>
    //             ${tableContent}
    //             <script>
    //                 window.onload = function() {
    //                     setTimeout(function() {
    //                         window.print();
    //                     }, 200);
    //                 };
    //             <\/script>
    //         </body>
    //     </html>
    //     `);
    //     printWindow.document.close();
    // };

    const handlePrint = (filtered = false) => {
        const rowsToPrint = filtered ?
            filteredPayments :
            data.payments;

        if (rowsToPrint.length === 0) {
            alert("No payments to print");
            return;
        }

        const printWindow = window.open("", "_blank");
        const printHeader = `
            <div class="print-header">
                <h1>${data.currentCompanyName || 'Company Name'}</h1>
                <p>
                    ${data.currentCompany?.address || ''}-${data.currentCompany?.ward || ''}, ${data.currentCompany?.city || ''},
                    ${data.currentCompany?.country || ''}<br>
                    TPIN: ${data.currentCompany?.pan || ''}
                </p>
                <hr>
            </div>
        `;

        let tableContent = `
        <style>
            @page {
                size: A4 landscape;
                margin: 10mm;
            }
            body { 
                font-family: Arial, sans-serif; 
                font-size: 10px; 
                margin: 0;
                padding: 10mm;
            }
            table { 
                width: 100%; 
                border-collapse: collapse; 
                page-break-inside: auto;
            }
            tr { 
                page-break-inside: avoid; 
                page-break-after: auto; 
            }
            th, td { 
                border: 1px solid #000; 
                padding: 2px; 
                font-size: 2px
                text-align: left; 
                white-space: nowrap;
            }
            th { 
                background-color: #f2f2f2 !important; 
                -webkit-print-color-adjust: exact; 
            }
            .print-header { 
                text-align: center; 
                margin-bottom: 15px; 
            }
            .nowrap {
                white-space: nowrap;
            }
            .text-danger {
                color: #dc3545 !important;
            }
        </style>
        ${printHeader}
        <h1 style="text-align:center;text-decoration:underline;">Payment Voucher's Register</h1>
        <table>
            <thead>
                <tr>
                    <th class="nowrap">Date</th>
                    <th class="nowrap">Vch. No.</th>
                    <th class="nowrap">Account</th>
                    <th class="nowrap">Debit</th>
                    <th class="nowrap">Payment Account</th>
                    <th class="nowrap">User</th>
                </tr>
            </thead>
            <tbody>
        `;

        let totalDebit = 0;

        rowsToPrint.forEach(payment => {
            const isCanceled = !payment.isActive;

            tableContent += `
            <tr>
                <td class="nowrap">${new NepaliDate(payment.date).format('YYYY-MM-DD')}</td>
                <td class="nowrap">${payment.billNumber}</td>
                <td class="nowrap">${isCanceled ? '<span class="text-danger">Canceled</span>' : (payment.account?.name || 'N/A')}</td>
                <td class="nowrap">${isCanceled ? '<span class="text-danger">0.00</span>' : (payment.debit?.toFixed(2) || '0.00')}</td>
                <td class="nowrap">${isCanceled ? '<span class="text-danger">Canceled</span>' : (payment.paymentAccount?.name || 'N/A')}</td>
                <td class="nowrap">${payment.user?.name || 'N/A'}</td>
            </tr>
            `;

            if (!isCanceled) {
                totalDebit += parseFloat(payment.debit || 0);
            }
        });

        // Add totals row
        tableContent += `
            <tr style="font-weight:bold;">
                <td colspan="3">Total:</td>
                <td>${totalDebit.toFixed(2)}</td>
                <td colspan="2"></td>
            </tr>
            </tbody>
        </table>
        `;

        printWindow.document.write(`
        <html>
            <head>
                <title>Payment Voucher's Register</title>
            </head>
            <body>
                ${tableContent}
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                        }, 200);
                    };
                <\/script>
            </body>
        </html>
        `);
        printWindow.document.close();
    };


    const formatCurrency = useCallback((num) => {
        const number = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num) || 0;
        if (company.dateFormat === 'nepali') {
            // Indian grouping, two decimals, English digits
            return number.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        }
        // English (US) grouping by default
        return number.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }, [company.dateFormat]);

    const handleRowClick = useCallback((index) => {
        setSelectedRowIndex(index);
    }, []);

    const handleRowDoubleClick = useCallback((paymentId) => {
        navigate(`/retailer/payments/${filteredPayments[selectedRowIndex]._id}/print`);
    }, [navigate, filteredPayments, selectedRowIndex]);

    const handleKeyDown = (e, nextFieldId) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (nextFieldId) {
                const nextField = document.getElementById(nextFieldId);
                if (nextField) {
                    nextField.focus();
                }
            } else {
                // If no nextFieldId provided, try to find the next focusable element
                const focusableElements = Array.from(
                    document.querySelectorAll('input, select, button, [tabindex]:not([tabindex="-1"])')
                ).filter(el => !el.disabled && el.offsetParent !== null);

                const currentIndex = focusableElements.findIndex(el => el === e.target);

                if (currentIndex > -1 && currentIndex < focusableElements.length - 1) {
                    focusableElements[currentIndex + 1].focus();
                }
            }
        }
    };

    // Shallow equal function for memoization
    function shallowEqual(objA, objB) {
        if (objA === objB) return true;

        if (typeof objA !== 'object' || objA === null ||
            typeof objB !== 'object' || objB === null) {
            return false;
        }

        const keysA = Object.keys(objA);
        const keysB = Object.keys(objB);

        if (keysA.length !== keysB.length) return false;

        for (let i = 0; i < keysA.length; i++) {
            if (!objB.hasOwnProperty(keysA[i]) || objA[keysA[i]] !== objB[keysA[i]]) {
                return false;
            }
        }

        return true;
    }

    // Resize Handle Component
    const ResizeHandle = React.memo(({ onResizeStart, left, columnName }) => {
        return (
            <div
                className="resize-handle"
                style={{
                    position: 'absolute',
                    top: 0,
                    left: `${left}px`,
                    width: '5px',
                    height: '100%',
                    cursor: 'col-resize',
                    backgroundColor: 'transparent',
                    zIndex: 10,
                    userSelect: 'none'
                }}
                onMouseDown={(e) => {
                    e.preventDefault();
                    onResizeStart(e, columnName);
                }}
            />
        );
    });

    // Table Header Component
    const TableHeader = React.memo(() => {
        const totalWidth = columnWidths.date + columnWidths.voucherNo + columnWidths.account +
            columnWidths.debit + columnWidths.paymentAccount + columnWidths.user + columnWidths.actions;

        const handleResizeStart = (e, columnName) => {
            setIsResizing(true);
            setResizingColumn(columnName);
            setStartX(e.clientX);
            setStartWidth(columnWidths[columnName]);
            e.preventDefault();
        };

        return (
            <div
                className="d-flex bg-light border-bottom sticky-top"
                style={{
                    zIndex: 2,
                    height: '28px',
                    minWidth: `${totalWidth}px`,
                    userSelect: isResizing ? 'none' : 'auto'
                }}
                onMouseMove={(e) => {
                    if (isResizing && resizingColumn) {
                        const diff = e.clientX - startX;
                        const newWidth = Math.max(60, startWidth + diff);
                        setColumnWidths(prev => ({
                            ...prev,
                            [resizingColumn]: newWidth
                        }));
                    }
                }}
                onMouseUp={() => {
                    if (isResizing) {
                        setIsResizing(false);
                        setResizingColumn(null);
                    }
                }}
                onMouseLeave={() => {
                    if (isResizing) {
                        setIsResizing(false);
                        setResizingColumn(null);
                    }
                }}
            >
                {/* Date */}
                <div
                    className="d-flex align-items-center justify-content-center px-1 border-end position-relative"
                    style={{
                        width: `${columnWidths.date}px`,
                        flexShrink: 0,
                        minWidth: '60px'
                    }}
                >
                    <strong style={{ fontSize: '0.75rem' }}>Date</strong>
                    <ResizeHandle
                        onResizeStart={handleResizeStart}
                        left={columnWidths.date - 2}
                        columnName="date"
                    />
                </div>

                {/* Vch No. */}
                <div
                    className="d-flex align-items-center px-1 border-end position-relative"
                    style={{
                        width: `${columnWidths.voucherNo}px`,
                        flexShrink: 0,
                        minWidth: '60px'
                    }}
                >
                    <strong style={{ fontSize: '0.75rem' }}>Vch No.</strong>
                    <ResizeHandle
                        onResizeStart={handleResizeStart}
                        left={columnWidths.voucherNo - 3}
                        columnName="voucherNo"
                    />
                </div>

                {/* Account */}
                <div
                    className="d-flex align-items-center px-1 border-end position-relative"
                    style={{
                        width: `${columnWidths.account}px`,
                        flexShrink: 0,
                        minWidth: '100px'
                    }}
                >
                    <strong style={{ fontSize: '0.75rem' }}>Account</strong>
                    <ResizeHandle
                        onResizeStart={handleResizeStart}
                        left={columnWidths.account - 3}
                        columnName="account"
                    />
                </div>

                {/* Debit */}
                <div
                    className="d-flex align-items-center justify-content-end px-1 border-end position-relative"
                    style={{
                        width: `${columnWidths.debit}px`,
                        flexShrink: 0,
                        minWidth: '80px'
                    }}
                >
                    <strong style={{ fontSize: '0.75rem' }}>Debit</strong>
                    <ResizeHandle
                        onResizeStart={handleResizeStart}
                        left={columnWidths.debit - 2}
                        columnName="debit"
                    />
                </div>

                {/* Payment Account */}
                <div
                    className="d-flex align-items-center px-1 border-end position-relative"
                    style={{
                        width: `${columnWidths.paymentAccount}px`,
                        flexShrink: 0,
                        minWidth: '100px'
                    }}
                >
                    <strong style={{ fontSize: '0.75rem' }}>Payment Account</strong>
                    <ResizeHandle
                        onResizeStart={handleResizeStart}
                        left={columnWidths.paymentAccount - 3}
                        columnName="paymentAccount"
                    />
                </div>

                {/* User */}
                <div
                    className="d-flex align-items-center px-1 border-end position-relative"
                    style={{
                        width: `${columnWidths.user}px`,
                        flexShrink: 0,
                        minWidth: '80px'
                    }}
                >
                    <strong style={{ fontSize: '0.75rem' }}>User</strong>
                    <ResizeHandle
                        onResizeStart={handleResizeStart}
                        left={columnWidths.user - 2}
                        columnName="user"
                    />
                </div>

                {/* Actions */}
                <div
                    className="d-flex align-items-center px-1 position-relative"
                    style={{
                        width: `${columnWidths.actions}px`,
                        flexShrink: 0,
                        minWidth: '100px'
                    }}
                >
                    <strong style={{ fontSize: '0.75rem' }}>Actions</strong>
                    <ResizeHandle
                        onResizeStart={handleResizeStart}
                        left={columnWidths.actions - 2}
                        columnName="actions"
                    />
                </div>

                {/* Resizing indicator overlay */}
                {isResizing && (
                    <div
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 1000,
                            cursor: 'col-resize'
                        }}
                    />
                )}
            </div>
        );
    });

    // Table Row Component
    const TableRow = React.memo(({ index, style, data: rowData }) => {
        const { payments, selectedRowIndex, formatCurrency, navigate } = rowData;
        const payment = payments[index];

        const handleRowClick = () => {
            rowData.handleRowClick(index);
        };

        const handleDoubleClick = () => {
            navigate(`/retailer/payments/${payment._id}/print`);
        };

        const handleViewClick = (e) => {
            e.stopPropagation();
            navigate(`/retailer/payments/${payment._id}/print`);
        };

        const handleEditClick = (e) => {
            e.stopPropagation();
            navigate(`/retailer/payments/${payment._id}`);
        };

        if (!payment) return null;

        const isSelected = selectedRowIndex === index;
        const isCanceled = !payment.isActive;

        return (
            <div
                style={{
                    ...style,
                    display: 'flex',
                    alignItems: 'center',
                    height: '28px',
                    minHeight: '28px',
                    padding: '0',
                    borderBottom: '1px solid #dee2e6',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? '#e7f3ff' : (index % 2 === 0 ? '#f8f9fa' : 'white')
                }}
                onClick={handleRowClick}
                onDoubleClick={handleDoubleClick}
            >
                {/* Date */}
                <div
                    className="d-flex align-items-center justify-content-center px-1 border-end"
                    style={{
                        width: `${columnWidths.date}px`,
                        flexShrink: 0,
                        height: '100%'
                    }}
                >
                    <span style={{ fontSize: '0.75rem' }}>
                        {new NepaliDate(payment.date).format('YYYY-MM-DD')}
                    </span>
                </div>

                {/* Vch No. */}
                <div
                    className="d-flex align-items-center px-1 border-end"
                    style={{
                        width: `${columnWidths.voucherNo}px`,
                        flexShrink: 0,
                        height: '100%',
                        overflow: 'hidden'
                    }}
                >
                    <span style={{ fontSize: '0.75rem' }}>
                        {payment.billNumber}
                    </span>
                </div>

                {/* Account */}
                <div
                    className="d-flex align-items-center px-1 border-end"
                    style={{
                        width: `${columnWidths.account}px`,
                        flexShrink: 0,
                        height: '100%',
                        overflow: 'hidden'
                    }}
                    title={payment.account?.name || 'N/A'}
                >
                    <span style={{
                        fontSize: '0.75rem',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        color: isCanceled ? '#dc3545' : 'inherit'
                    }}>
                        {isCanceled ? 'Canceled' : (payment.account?.name || 'N/A')}
                    </span>
                </div>

                {/* Debit */}
                <div
                    className="d-flex align-items-center justify-content-end px-1 border-end"
                    style={{
                        width: `${columnWidths.debit}px`,
                        flexShrink: 0,
                        height: '100%'
                    }}
                >
                    <span style={{
                        fontSize: '0.75rem',
                        color: isCanceled ? '#dc3545' : 'inherit'
                    }}>
                        {isCanceled ? '0.00' : formatCurrency(payment.debit)}
                    </span>
                </div>

                {/* Payment Account */}
                <div
                    className="d-flex align-items-center px-1 border-end"
                    style={{
                        width: `${columnWidths.paymentAccount}px`,
                        flexShrink: 0,
                        height: '100%',
                        overflow: 'hidden'
                    }}
                    title={payment.paymentAccount?.name || 'N/A'}
                >
                    <span style={{
                        fontSize: '0.75rem',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        color: isCanceled ? '#dc3545' : 'inherit'
                    }}>
                        {isCanceled ? 'Canceled' : (payment.paymentAccount?.name || 'N/A')}
                    </span>
                </div>

                {/* User */}
                <div
                    className="d-flex align-items-center px-1 border-end"
                    style={{
                        width: `${columnWidths.user}px`,
                        flexShrink: 0,
                        height: '100%',
                        overflow: 'hidden'
                    }}
                    title={payment.user?.name || 'N/A'}
                >
                    <span style={{ fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {payment.user?.name || 'N/A'}
                    </span>
                </div>

                {/* Actions */}
                <div
                    className="d-flex align-items-center justify-content-center px-1 gap-1"
                    style={{
                        width: `${columnWidths.actions}px`,
                        flexShrink: 0,
                        height: '100%'
                    }}
                >
                    <button
                        className="btn btn-sm btn-info py-0 px-1 d-flex align-items-center"
                        onClick={handleViewClick}
                        style={{
                            height: '20px',
                            fontSize: '0.7rem',
                            fontWeight: 'bold'
                        }}
                    >
                        <i className="fas fa-eye me-1" style={{ fontSize: '0.6rem' }}></i>View
                    </button>
                    <button
                        className="btn btn-sm btn-warning py-0 px-1 d-flex align-items-center"
                        onClick={handleEditClick}
                        disabled={isCanceled}
                        style={{
                            height: '20px',
                            fontSize: '0.7rem',
                            fontWeight: 'bold',
                            opacity: isCanceled ? 0.5 : 1,
                            cursor: isCanceled ? 'not-allowed' : 'pointer'
                        }}
                    >
                        <i className="fas fa-edit me-1" style={{ fontSize: '0.6rem' }}></i>Edit
                    </button>
                </div>
            </div>
        );
    }, (prevProps, nextProps) => {
        if (prevProps.index !== nextProps.index) return false;
        if (prevProps.style !== nextProps.style) return false;

        const prevPayment = prevProps.data.payments[prevProps.index];
        const nextPayment = nextProps.data.payments[nextProps.index];

        return (
            shallowEqual(prevPayment, nextPayment) &&
            prevProps.data.selectedRowIndex === nextProps.data.selectedRowIndex
        );
    });

    // Add reset function
    const resetColumnWidths = () => {
        setColumnWidths({
            date: 90,
            voucherNo: 120,
            account: 200,
            debit: 100,
            paymentAccount: 150,
            user: 120,
            actions: 140
        });
    };

    // Get unique payment accounts for filter dropdown
    const paymentAccounts = useMemo(() => {
        return [...new Set(data.payments
            .map(payment => payment.paymentAccount?.name)
            .filter(name => name !== undefined && name !== null))];
    }, [data.payments]);

    if (loading) return <Loader />;

    if (error) {
        return <div className="alert alert-danger text-center py-5">{error}</div>;
    }

    return (
        <div className="container-fluid">
            <Header />
            <div className="card mt-2 shadow-lg p-0 animate__animated animate__fadeInUp expanded-card ledger-card compact">
                <div className="card-header bg-white py-0">
                    <h1 className="h4 mb-0 text-center text-primary">Payment Voucher's Register</h1>
                </div>

                <div className="card-body p-2 p-md-3">
                    <div className="row g-2 mb-3">
                        {/* Date Range Row */}
                        <div className="col-12 col-md-1">
                            <div className="position-relative">
                                <input
                                    type="text"
                                    name="fromDate"
                                    id="fromDate"
                                    className={`form-control form-control-sm no-date-icon ${dateErrors.fromDate ? 'is-invalid' : ''}`}
                                    value={data.fromDate}
                                    onChange={(e) => {
                                        // Allow only numbers and allowed separators (/, -)
                                        const value = e.target.value;
                                        const sanitizedValue = value.replace(/[^0-9/-]/g, '');

                                        // Limit to typical date format length
                                        if (sanitizedValue.length <= 10) {
                                            setData(prev => ({ ...prev, fromDate: sanitizedValue }));
                                            setDateErrors(prev => ({ ...prev, fromDate: '' }));
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        // Prevent typing letters
                                        const allowedKeys = [
                                            'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
                                            'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
                                            'Home', 'End'
                                        ];

                                        // Allow numbers (0-9) and separators (/, -)
                                        if (!allowedKeys.includes(e.key) &&
                                            !/^\d$/.test(e.key) &&
                                            e.key !== '/' &&
                                            e.key !== '-' &&
                                            !e.ctrlKey && !e.metaKey) {
                                            e.preventDefault();
                                        }

                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            const dateStr = e.target.value.trim();

                                            if (!dateStr) {
                                                // Auto-correct to current date if blank on Enter
                                                const currentDate = company.dateFormat === 'nepali' ? new NepaliDate() : new Date();
                                                const correctedDate = company.dateFormat === 'nepali'
                                                    ? currentDate.format('YYYY-MM-DD')
                                                    : currentDate.toISOString().split('T')[0];

                                                setData(prev => ({ ...prev, fromDate: correctedDate }));
                                                setDateErrors(prev => ({ ...prev, fromDate: '' }));

                                                // Show notification
                                                setNotification({
                                                    show: true,
                                                    message: 'Date required. Auto-corrected to current date.',
                                                    type: 'warning',
                                                    duration: 3000
                                                });

                                                // Move to next field after auto-correction
                                                handleKeyDown(e, 'toDate');
                                            } else if (dateErrors.fromDate) {
                                                e.target.focus();
                                            } else {
                                                handleKeyDown(e, 'toDate');
                                            }
                                        }
                                    }}
                                    onPaste={(e) => {
                                        e.preventDefault();
                                        const pastedData = e.clipboardData.getData('text');
                                        // Clean pasted data - keep only numbers and separators
                                        const cleanedData = pastedData.replace(/[^0-9/-]/g, '');
                                        const newValue = data.fromDate + cleanedData;
                                        if (newValue.length <= 10) {
                                            setData(prev => ({ ...prev, fromDate: newValue }));
                                        }
                                    }}
                                    onBlur={(e) => {
                                        try {
                                            const dateStr = e.target.value.trim();
                                            if (!dateStr) {
                                                setDateErrors(prev => ({ ...prev, fromDate: '' }));
                                                return;
                                            }

                                            if (company.dateFormat === 'nepali') {
                                                // Check if it matches Nepali date format (YYYY/MM/DD or YYYY-MM-DD)
                                                const nepaliDateFormat = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/;
                                                if (!nepaliDateFormat.test(dateStr)) {
                                                    // Auto-correct to current date
                                                    const currentDate = new NepaliDate();
                                                    const correctedDate = currentDate.format('YYYY-MM-DD');
                                                    setData(prev => ({ ...prev, fromDate: correctedDate }));
                                                    setDateErrors(prev => ({ ...prev, fromDate: '' }));

                                                    // Show notification
                                                    setNotification({
                                                        show: true,
                                                        message: 'Invalid date format. Auto-corrected to current date.',
                                                        type: 'warning',
                                                        duration: 3000
                                                    });
                                                    return;
                                                }

                                                // Normalize separators to forward slash
                                                const normalizedDateStr = dateStr.replace(/-/g, '/');
                                                const [year, month, day] = normalizedDateStr.split('/').map(Number);

                                                // Validate month and day ranges
                                                if (month < 1 || month > 12) {
                                                    throw new Error("Month must be between 1-12");
                                                }
                                                if (day < 1 || day > 32) {
                                                    throw new Error("Day must be between 1-32");
                                                }

                                                // Try to create Nepali date
                                                const nepaliDate = new NepaliDate(year, month - 1, day);

                                                // Validate if date is valid
                                                if (
                                                    nepaliDate.getYear() !== year ||
                                                    nepaliDate.getMonth() + 1 !== month ||
                                                    nepaliDate.getDate() !== day
                                                ) {
                                                    // Auto-correct to current date if invalid
                                                    const currentDate = new NepaliDate();
                                                    const correctedDate = currentDate.format('YYYY-MM-DD');
                                                    setData(prev => ({ ...prev, fromDate: correctedDate }));
                                                    setDateErrors(prev => ({ ...prev, fromDate: '' }));

                                                    setNotification({
                                                        show: true,
                                                        message: 'Invalid Nepali date. Auto-corrected to current date.',
                                                        type: 'warning',
                                                        duration: 3000
                                                    });
                                                } else {
                                                    // Valid date - format it consistently
                                                    setData(prev => ({
                                                        ...prev,
                                                        fromDate: nepaliDate.format('YYYY-MM-DD')
                                                    }));
                                                    setDateErrors(prev => ({ ...prev, fromDate: '' }));
                                                }
                                            } else {
                                                // English date validation
                                                const englishDateFormat = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/;
                                                if (!englishDateFormat.test(dateStr)) {
                                                    // Auto-correct to current date
                                                    const currentDate = new Date();
                                                    const correctedDate = currentDate.toISOString().split('T')[0];
                                                    setData(prev => ({ ...prev, fromDate: correctedDate }));
                                                    setDateErrors(prev => ({ ...prev, fromDate: '' }));

                                                    setNotification({
                                                        show: true,
                                                        message: 'Invalid date format. Auto-corrected to current date.',
                                                        type: 'warning',
                                                        duration: 3000
                                                    });
                                                    return;
                                                }

                                                // Try to parse English date
                                                const dateObj = new Date(dateStr);
                                                if (isNaN(dateObj.getTime())) {
                                                    throw new Error("Invalid English date");
                                                }

                                                // Valid date - format it consistently
                                                setData(prev => ({
                                                    ...prev,
                                                    fromDate: dateObj.toISOString().split('T')[0]
                                                }));
                                                setDateErrors(prev => ({ ...prev, fromDate: '' }));
                                            }
                                        } catch (error) {
                                            // Auto-correct to current date on any error
                                            const currentDate = company.dateFormat === 'nepali' ? new NepaliDate() : new Date();
                                            const correctedDate = company.dateFormat === 'nepali'
                                                ? currentDate.format('YYYY-MM-DD')
                                                : currentDate.toISOString().split('T')[0];

                                            setData(prev => ({ ...prev, fromDate: correctedDate }));
                                            setDateErrors(prev => ({ ...prev, fromDate: '' }));

                                            setNotification({
                                                show: true,
                                                message: error.message ? `${error.message}. Auto-corrected to current date.` : 'Invalid date. Auto-corrected to current date.',
                                                type: 'warning',
                                                duration: 3000
                                            });
                                        }
                                    }}
                                    placeholder={company.dateFormat === 'nepali' ? "YYYY-MM-DD" : "YYYY-MM-DD"}
                                    required
                                    autoComplete="off"
                                    style={{
                                        height: '26px',
                                        fontSize: '0.875rem',
                                        paddingTop: '0.75rem',
                                        width: '100%'
                                    }}
                                />
                                <label
                                    className="position-absolute"
                                    style={{
                                        top: '-0.5rem',
                                        left: '0.75rem',
                                        fontSize: '0.75rem',
                                        backgroundColor: 'white',
                                        padding: '0 0.25rem',
                                        color: '#6c757d',
                                        fontWeight: '500'
                                    }}
                                >
                                    From Date: <span className="text-danger">*</span>
                                </label>
                                {dateErrors.fromDate && (
                                    <div className="invalid-feedback d-block" style={{ fontSize: '0.7rem' }}>
                                        {dateErrors.fromDate}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-12 col-md-1">
                            <div className="position-relative">
                                <input
                                    type="text"
                                    name="toDate"
                                    id="toDate"
                                    className={`form-control form-control-sm no-date-icon ${dateErrors.toDate ? 'is-invalid' : ''}`}
                                    value={data.toDate}
                                    onChange={(e) => {
                                        // Allow only numbers and allowed separators (/, -)
                                        const value = e.target.value;
                                        const sanitizedValue = value.replace(/[^0-9/-]/g, '');

                                        // Limit to typical date format length
                                        if (sanitizedValue.length <= 10) {
                                            setData(prev => ({ ...prev, toDate: sanitizedValue }));
                                            setDateErrors(prev => ({ ...prev, toDate: '' }));
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        // Prevent typing letters
                                        const allowedKeys = [
                                            'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
                                            'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
                                            'Home', 'End'
                                        ];

                                        // Allow numbers (0-9) and separators (/, -)
                                        if (!allowedKeys.includes(e.key) &&
                                            !/^\d$/.test(e.key) &&
                                            e.key !== '/' &&
                                            e.key !== '-' &&
                                            !e.ctrlKey && !e.metaKey) {
                                            e.preventDefault();
                                        }

                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            const dateStr = e.target.value.trim();

                                            if (!dateStr) {
                                                // Auto-correct to current date if blank on Enter
                                                const currentDate = company.dateFormat === 'nepali' ? new NepaliDate() : new Date();
                                                const correctedDate = company.dateFormat === 'nepali'
                                                    ? currentDate.format('YYYY-MM-DD')
                                                    : currentDate.toISOString().split('T')[0];

                                                setData(prev => ({ ...prev, toDate: correctedDate }));
                                                setDateErrors(prev => ({ ...prev, toDate: '' }));

                                                // Show notification
                                                setNotification({
                                                    show: true,
                                                    message: 'Date required. Auto-corrected to current date.',
                                                    type: 'warning',
                                                    duration: 3000
                                                });

                                                // Move to next field after auto-correction
                                                document.getElementById('generateReport').focus();
                                            } else if (dateErrors.toDate) {
                                                e.target.focus();
                                            } else {
                                                document.getElementById('generateReport').focus();
                                            }
                                        }
                                    }}
                                    onPaste={(e) => {
                                        e.preventDefault();
                                        const pastedData = e.clipboardData.getData('text');
                                        // Clean pasted data - keep only numbers and separators
                                        const cleanedData = pastedData.replace(/[^0-9/-]/g, '');
                                        const newValue = data.toDate + cleanedData;
                                        if (newValue.length <= 10) {
                                            setData(prev => ({ ...prev, toDate: newValue }));
                                        }
                                    }}
                                    onBlur={(e) => {
                                        try {
                                            const dateStr = e.target.value.trim();
                                            if (!dateStr) {
                                                setDateErrors(prev => ({ ...prev, toDate: '' }));
                                                return;
                                            }

                                            if (company.dateFormat === 'nepali') {
                                                // Check if it matches Nepali date format (YYYY/MM/DD or YYYY-MM-DD)
                                                const nepaliDateFormat = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/;
                                                if (!nepaliDateFormat.test(dateStr)) {
                                                    // Auto-correct to current date
                                                    const currentDate = new NepaliDate();
                                                    const correctedDate = currentDate.format('YYYY-MM-DD');
                                                    setData(prev => ({ ...prev, toDate: correctedDate }));
                                                    setDateErrors(prev => ({ ...prev, toDate: '' }));

                                                    // Show notification
                                                    setNotification({
                                                        show: true,
                                                        message: 'Invalid date format. Auto-corrected to current date.',
                                                        type: 'warning',
                                                        duration: 3000
                                                    });
                                                    return;
                                                }

                                                // Normalize separators to forward slash
                                                const normalizedDateStr = dateStr.replace(/-/g, '/');
                                                const [year, month, day] = normalizedDateStr.split('/').map(Number);

                                                // Validate month and day ranges
                                                if (month < 1 || month > 12) {
                                                    throw new Error("Month must be between 1-12");
                                                }
                                                if (day < 1 || day > 32) {
                                                    throw new Error("Day must be between 1-32");
                                                }

                                                // Try to create Nepali date
                                                const nepaliDate = new NepaliDate(year, month - 1, day);

                                                // Validate if date is valid
                                                if (
                                                    nepaliDate.getYear() !== year ||
                                                    nepaliDate.getMonth() + 1 !== month ||
                                                    nepaliDate.getDate() !== day
                                                ) {
                                                    // Auto-correct to current date if invalid
                                                    const currentDate = new NepaliDate();
                                                    const correctedDate = currentDate.format('YYYY-MM-DD');
                                                    setData(prev => ({ ...prev, toDate: correctedDate }));
                                                    setDateErrors(prev => ({ ...prev, toDate: '' }));

                                                    setNotification({
                                                        show: true,
                                                        message: 'Invalid Nepali date. Auto-corrected to current date.',
                                                        type: 'warning',
                                                        duration: 3000
                                                    });
                                                } else {
                                                    // Valid date - format it consistently
                                                    setData(prev => ({
                                                        ...prev,
                                                        toDate: nepaliDate.format('YYYY-MM-DD')
                                                    }));
                                                    setDateErrors(prev => ({ ...prev, toDate: '' }));
                                                }
                                            } else {
                                                // English date validation
                                                const englishDateFormat = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/;
                                                if (!englishDateFormat.test(dateStr)) {
                                                    // Auto-correct to current date
                                                    const currentDate = new Date();
                                                    const correctedDate = currentDate.toISOString().split('T')[0];
                                                    setData(prev => ({ ...prev, toDate: correctedDate }));
                                                    setDateErrors(prev => ({ ...prev, toDate: '' }));

                                                    setNotification({
                                                        show: true,
                                                        message: 'Invalid date format. Auto-corrected to current date.',
                                                        type: 'warning',
                                                        duration: 3000
                                                    });
                                                    return;
                                                }

                                                // Try to parse English date
                                                const dateObj = new Date(dateStr);
                                                if (isNaN(dateObj.getTime())) {
                                                    throw new Error("Invalid English date");
                                                }

                                                // Valid date - format it consistently
                                                setData(prev => ({
                                                    ...prev,
                                                    toDate: dateObj.toISOString().split('T')[0]
                                                }));
                                                setDateErrors(prev => ({ ...prev, toDate: '' }));
                                            }
                                        } catch (error) {
                                            // Auto-correct to current date on any error
                                            const currentDate = company.dateFormat === 'nepali' ? new NepaliDate() : new Date();
                                            const correctedDate = company.dateFormat === 'nepali'
                                                ? currentDate.format('YYYY-MM-DD')
                                                : currentDate.toISOString().split('T')[0];

                                            setData(prev => ({ ...prev, toDate: correctedDate }));
                                            setDateErrors(prev => ({ ...prev, toDate: '' }));

                                            setNotification({
                                                show: true,
                                                message: error.message ? `${error.message}. Auto-corrected to current date.` : 'Invalid date. Auto-corrected to current date.',
                                                type: 'warning',
                                                duration: 3000
                                            });
                                        }
                                    }}
                                    placeholder={company.dateFormat === 'nepali' ? "YYYY-MM-DD" : "YYYY-MM-DD"}
                                    required
                                    autoComplete='off'
                                    style={{
                                        height: '26px',
                                        fontSize: '0.875rem',
                                        paddingTop: '0.75rem',
                                        width: '100%'
                                    }}
                                />
                                <label
                                    className="position-absolute"
                                    style={{
                                        top: '-0.5rem',
                                        left: '0.75rem',
                                        fontSize: '0.75rem',
                                        backgroundColor: 'white',
                                        padding: '0 0.25rem',
                                        color: '#6c757d',
                                        fontWeight: '500'
                                    }}
                                >
                                    To Date: <span className="text-danger">*</span>
                                </label>
                                {dateErrors.toDate && (
                                    <div className="invalid-feedback d-block" style={{ fontSize: '0.7rem' }}>
                                        {dateErrors.toDate}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Generate Report Button */}
                        <div className="col-12 col-md-1">
                            <button
                                type="button"
                                id="generateReport"
                                className="btn btn-primary btn-sm"
                                onClick={handleGenerateReport}
                                style={{
                                    height: '30px',
                                    fontSize: '0.8rem',
                                    padding: '0 12px',
                                    fontWeight: '500',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                <i className="fas fa-chart-line me-1"></i>Generate
                            </button>
                        </div>

                        {/* Search Row */}
                        <div className="col-12 col-md-2">
                            <div className="position-relative">
                                <div className="input-group input-group-sm">
                                    <input
                                        type="text"
                                        className="form-control form-control-sm"
                                        id="searchInput"
                                        placeholder="Search..."
                                        value={searchQuery}
                                        onChange={handleSearchChange}
                                        disabled={data.payments.length === 0}
                                        autoComplete='off'
                                        style={{
                                            height: '26px',
                                            fontSize: '0.875rem',
                                            paddingTop: '0.75rem',
                                            width: '100%'
                                        }}
                                    />
                                </div>
                                <label
                                    className="position-absolute"
                                    style={{
                                        top: '-0.5rem',
                                        left: '0.75rem',
                                        fontSize: '0.75rem',
                                        backgroundColor: 'white',
                                        padding: '0 0.25rem',
                                        color: '#6c757d',
                                        fontWeight: '500'
                                    }}
                                >
                                    Search
                                </label>
                            </div>
                        </div>

                        {/* Payment Account Filter Row */}
                        <div className="col-12 col-md-2">
                            <div className="position-relative">
                                <select
                                    className="form-select form-select-sm"
                                    id="paymentAccountFilter"
                                    value={paymentAccountFilter}
                                    onChange={handlePaymentAccountFilterChange}
                                    disabled={data.payments.length === 0}
                                    style={{
                                        height: '30px',
                                        fontSize: '0.875rem',
                                        paddingTop: '0.25rem',
                                        width: '100%'
                                    }}
                                >
                                    <option value="">All</option>
                                    {paymentAccounts.map(account => (
                                        <option key={account} value={account}>{account}</option>
                                    ))}
                                </select>
                                <label
                                    className="position-absolute"
                                    style={{
                                        top: '-0.5rem',
                                        left: '0.75rem',
                                        fontSize: '0.75rem',
                                        backgroundColor: 'white',
                                        padding: '0 0.25rem',
                                        color: '#6c757d',
                                        fontWeight: '500'
                                    }}
                                >
                                    Payment Account
                                </label>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="col-12 col-md-auto d-flex align-items-end justify-content-end gap-2">
                            <button
                                className="btn btn-secondary btn-sm d-flex align-items-center"
                                onClick={() => navigate('/retailer/payments')}
                                style={{
                                    height: '30px',
                                    padding: '0 12px',
                                    fontSize: '0.8rem',
                                    fontWeight: '500',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                <i className="fas fa-plus me-1"></i>New Voucher
                            </button>
                            <button
                                className="btn btn-secondary btn-sm d-flex align-items-center"
                                onClick={() => handlePrint(false)}
                                disabled={data.payments.length === 0}
                                style={{
                                    height: '30px',
                                    padding: '0 12px',
                                    fontSize: '0.8rem',
                                    fontWeight: '500',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                <i className="fas fa-print me-1"></i>Print All
                            </button>
                            <button
                                className="btn btn-secondary btn-sm d-flex align-items-center"
                                onClick={() => handlePrint(true)}
                                disabled={data.payments.length === 0}
                                style={{
                                    height: '30px',
                                    padding: '0 12px',
                                    fontSize: '0.8rem',
                                    fontWeight: '500',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                <i className="fas fa-filter me-1"></i>Print Filtered
                            </button>
                            <button
                                className="btn btn-secondary btn-sm d-flex align-items-center"
                                onClick={resetColumnWidths}
                                title="Reset column widths to default"
                                style={{
                                    height: '30px',
                                    padding: '0 12px',
                                    fontSize: '0.8rem',
                                    fontWeight: '500'
                                }}
                            >
                                <i className="fas fa-redo me-1" style={{ fontSize: '0.6rem' }}></i>Reset
                            </button>
                        </div>
                    </div>

                    {data.payments.length === 0 ? (
                        <div className="alert alert-info text-center py-3" style={{ fontSize: '0.875rem' }}>
                            <i className="fas fa-info-circle me-2"></i>
                            Please select date range and click "Generate Report" to view data
                        </div>
                    ) : (
                        <>
                            {/* Payments Table */}
                            <div
                                style={{
                                    height: "400px",
                                    border: '1px solid #dee2e6',
                                    backgroundColor: '#fff',
                                    position: 'relative'
                                }}
                                ref={tableBodyRef}
                            >
                                {loading ? (
                                    <div className="d-flex flex-column justify-content-center align-items-center h-100">
                                        <div className="spinner-border spinner-border-sm text-primary" role="status">
                                            <span className="visually-hidden">Loading...</span>
                                        </div>
                                        <p className="mt-2 small text-muted" style={{ fontSize: '0.8rem' }}>
                                            Loading payments...
                                        </p>
                                    </div>
                                ) : filteredPayments.length === 0 ? (
                                    <div className="d-flex flex-column justify-content-center align-items-center h-100">
                                        <i className="bi bi-search text-muted" style={{ fontSize: '1.5rem' }}></i>
                                        <h6 className="mt-2 text-muted" style={{ fontSize: '0.9rem' }}>
                                            No payments found
                                        </h6>
                                        <p className="text-muted small" style={{ fontSize: '0.75rem' }}>
                                            {searchQuery ? 'Try a different search term' : 'No data for the selected date range'}
                                        </p>
                                    </div>
                                ) : (
                                    <AutoSizer>
                                        {({ height, width }) => {
                                            const totalWidth = columnWidths.date + columnWidths.voucherNo + columnWidths.account +
                                                columnWidths.debit + columnWidths.paymentAccount + columnWidths.user + columnWidths.actions;

                                            return (
                                                <div style={{
                                                    position: 'relative',
                                                    height: height,
                                                    width: Math.max(width, totalWidth),
                                                }}>
                                                    <TableHeader />
                                                    <List
                                                        height={height - 28}
                                                        itemCount={filteredPayments.length}
                                                        itemSize={28}
                                                        width={Math.max(width, totalWidth)}
                                                        itemData={{
                                                            payments: filteredPayments,
                                                            selectedRowIndex,
                                                            formatCurrency,
                                                            navigate,
                                                            handleRowClick
                                                        }}
                                                    >
                                                        {TableRow}
                                                    </List>
                                                </div>
                                            );
                                        }}
                                    </AutoSizer>
                                )}
                            </div>

                            {/* Footer with totals */}
                            <div
                                className="d-flex bg-light border-top sticky-bottom"
                                style={{
                                    zIndex: 2,
                                    height: '10px',
                                    borderTop: '2px solid #dee2e6'
                                }}
                            >
                                <div
                                    className="d-flex align-items-center px-1"
                                    style={{
                                        width: `${columnWidths.date + columnWidths.voucherNo + columnWidths.account}px`,
                                        flexShrink: 0,
                                        height: '100%'
                                    }}
                                >
                                    <strong style={{ fontSize: '0.75rem' }}>Total:</strong>
                                </div>

                                <div
                                    className="d-flex align-items-center justify-content-end px-1 border-start"
                                    style={{
                                        width: `${columnWidths.debit}px`,
                                        flexShrink: 0,
                                        height: '100%'
                                    }}
                                >
                                    <strong style={{ fontSize: '0.75rem' }}>{formatCurrency(totalDebit)}</strong>
                                </div>

                                <div
                                    className="d-flex align-items-center px-1 border-start"
                                    style={{
                                        width: `${columnWidths.paymentAccount + columnWidths.user + columnWidths.actions}px`,
                                        flexShrink: 0,
                                        height: '100%'
                                    }}
                                >
                                    {/* Empty space */}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Product modal */}
            {showProductModal && (
                <ProductModal onClose={() => setShowProductModal(false)} />
            )}
        </div>
    );
};

export default PaymentsList;