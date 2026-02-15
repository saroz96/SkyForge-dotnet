// import React, { useState, useEffect, useRef } from 'react';
// import { useNavigate } from 'react-router-dom';
// import axios from 'axios';
// import Header from '../Header';
// import NepaliDate from 'nepali-date-converter';
// import { usePageNotRefreshContext } from '../PageNotRefreshContext';
// import Loader from '../../Loader';
// import ProductModal from '../dashboard/modals/ProductModal';

// const ReceiptsList = () => {
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
//         if (draftSave && draftSave.receiptsData) {
//             return draftSave.receiptsData;
//         }
//         return {
//             company: null,
//             currentFiscalYear: null,
//             receipts: [],
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
//         if (draftSave && draftSave.receiptsSearch) {
//             return draftSave.receiptsSearch.searchQuery || '';
//         }
//         return '';
//     });

//     const [receiptAccountFilter, setReceiptAccountFilter] = useState(() => {
//         if (draftSave && draftSave.receiptsSearch) {
//             return draftSave.receiptsSearch.receiptAccountFilter || '';
//         }
//         return '';
//     });

//     const [selectedRowIndex, setSelectedRowIndex] = useState(() => {
//         if (draftSave && draftSave.receiptsSearch) {
//             return draftSave.receiptsSearch.selectedRowIndex || 0;
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
//                     const hasDraftDates = draftSave?.receiptsData?.fromDate && draftSave?.receiptsData?.toDate;

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

//     const [loading, setLoading] = useState(false);
//     const [error, setError] = useState(null);
//     const [totalCredit, setTotalCredit] = useState(0);
//     const [filteredReceipts, setFilteredReceipts] = useState([]);

//     const fromDateRef = useRef(null);
//     const toDateRef = useRef(null);
//     const searchInputRef = useRef(null);
//     const receiptAccountFilterRef = useRef(null);
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
//             receiptsData: data,
//             receiptsSearch: {
//                 searchQuery,
//                 receiptAccountFilter,
//                 selectedRowIndex,
//                 fromDate: data.fromDate,
//                 toDate: data.toDate
//             }
//         });
//     }, [data, searchQuery, receiptAccountFilter, selectedRowIndex, data.fromDate, data.toDate]);

//     // Fetch data when generate report is clicked
//     useEffect(() => {
//         const fetchData = async () => {
//             if (!shouldFetch) return;

//             try {
//                 setLoading(true);
//                 const params = new URLSearchParams();
//                 if (data.fromDate) params.append('fromDate', data.fromDate);
//                 if (data.toDate) params.append('toDate', data.toDate);

//                 const response = await api.get(`/api/retailer/receipts/register?${params.toString()}`);
//                 setData(response.data.data);
//                 setError(null);
//                 // Don't reset selection when new data loads if we have a saved position
//                 if (!draftSave?.receiptsSearch?.selectedRowIndex) {
//                     setSelectedRowIndex(0);
//                 }
//             } catch (err) {
//                 setError(err.response?.data?.error || 'Failed to fetch receipts');
//             } finally {
//                 setLoading(false);
//                 setShouldFetch(false);
//             }
//         };

//         fetchData();
//     }, [shouldFetch, data.fromDate, data.toDate]);

//     // Filter receipts based on search and receipt account
//     useEffect(() => {
//         const filtered = data.receipts.filter(receipt => {
//             const matchesSearch =
//                 receipt.billNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
//                 receipt.account?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
//                 receipt.user?.name?.toLowerCase().includes(searchQuery.toLowerCase());

//             const matchesReceiptAccount =
//                 receiptAccountFilter === '' ||
//                 (receipt.receiptAccount?.name?.toLowerCase() === receiptAccountFilter.toLowerCase());

//             return matchesSearch && matchesReceiptAccount;
//         });

//         setFilteredReceipts(filtered);

//         // Reset selected row when filters change, but only if we don't have a saved position
//         if (!draftSave?.receiptsSearch?.selectedRowIndex) {
//             setSelectedRowIndex(0);
//         }
//     }, [data.receipts, searchQuery, receiptAccountFilter]);

//     // Calculate totals when filtered receipts change
//     useEffect(() => {
//         if (filteredReceipts.length === 0) {
//             setTotalCredit(0);
//             return;
//         }

//         const newTotal = filteredReceipts.reduce((acc, receipt) => {
//             return receipt.isActive ? acc + (receipt.credit || 0) : acc;
//         }, 0);

//         setTotalCredit(newTotal);
//     }, [filteredReceipts]);

//     // Handle keyboard navigation
//     useEffect(() => {
//         const handleKeyDown = (e) => {
//             if (filteredReceipts.length === 0) return;

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
//                     setSelectedRowIndex(prev => Math.min(filteredReceipts.length - 1, prev + 1));
//                     break;
//                 default:
//                     break;
//             }
//         };

//         window.addEventListener('keydown', handleKeyDown);
//         return () => window.removeEventListener('keydown', handleKeyDown);
//     }, [filteredReceipts, selectedRowIndex, navigate]);

//     // Scroll to selected row
//     useEffect(() => {
//         if (tableBodyRef.current && filteredReceipts.length > 0) {
//             const rows = tableBodyRef.current.querySelectorAll('tr');
//             if (rows.length > selectedRowIndex) {
//                 rows[selectedRowIndex].scrollIntoView({
//                     behavior: 'smooth',
//                     block: 'nearest'
//                 });
//             }
//         }
//     }, [selectedRowIndex, filteredReceipts]);

//     const handleDateChange = (e) => {
//         const { name, value } = e.target;
//         setData(prev => ({ ...prev, [name]: value }));
//     };

//     const handleSearchChange = (e) => {
//         setSearchQuery(e.target.value);
//     };

//     const handleReceiptAccountFilterChange = (e) => {
//         setReceiptAccountFilter(e.target.value);
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
//             filteredReceipts :
//             data.receipts;

//         if (rowsToPrint.length === 0) {
//             alert("No receipts to print");
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
//         <h1 style="text-align:center;text-decoration:underline;">Receipt Voucher's Register</h1>
//         <table>
//             <thead>
//                 <tr>
//                     <th class="nowrap">Date</th>
//                     <th class="nowrap">Vch. No.</th>
//                     <th class="nowrap">Account</th>
//                     <th class="nowrap">Credit</th>
//                     <th class="nowrap">Receipt Account</th>
//                     <th class="nowrap">User</th>
//                 </tr>
//             </thead>
//             <tbody>
//         `;

//         let totalCredit = 0;

//         rowsToPrint.forEach(receipt => {
//             const isCanceled = !receipt.isActive;

//             tableContent += `
//             <tr>
//                 <td class="nowrap">${new NepaliDate(receipt.date).format('YYYY-MM-DD')}</td>
//                 <td class="nowrap">${receipt.billNumber}</td>
//                 <td class="nowrap">${isCanceled ? '<span class="text-danger">Canceled</span>' : (receipt.account?.name || 'N/A')}</td>
//                 <td class="nowrap">${isCanceled ? '<span class="text-danger">0.00</span>' : (receipt.credit?.toFixed(2) || '0.00')}</td>
//                 <td class="nowrap">${isCanceled ? '<span class="text-danger">Canceled</span>' : (receipt.receiptAccount?.name || 'N/A')}</td>
//                 <td class="nowrap">${receipt.user?.name || 'N/A'}</td>
//             </tr>
//             `;

//             if (!isCanceled) {
//                 totalCredit += parseFloat(receipt.credit || 0);
//             }
//         });

//         // Add totals row
//         tableContent += `
//             <tr style="font-weight:bold;">
//                 <td colspan="3">Total:</td>
//                 <td>${totalCredit.toFixed(2)}</td>
//                 <td colspan="2"></td>
//             </tr>
//             </tbody>
//         </table>
//         `;

//         printWindow.document.write(`
//         <html>
//             <head>
//                 <title>Receipt Voucher's Register</title>
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

//     const handleRowDoubleClick = (receiptId) => {
//         navigate(`/retailer/receipts/${filteredReceipts[selectedRowIndex]._id}/print`);
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

//     // Get unique receipt accounts for filter dropdown
//     const receiptAccounts = [...new Set(data.receipts
//         .map(receipt => receipt.receiptAccount?.name)
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
//                     <h1 className="h3 mb-0 text-center text-primary">Receipt Voucher's Register</h1>
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
//                                             disabled={data.receipts.length === 0}
//                                             autoComplete='off'
//                                         />
//                                         <button
//                                             className="btn btn-outline-secondary"
//                                             type="button"
//                                             onClick={() => setSearchQuery('')}
//                                             disabled={data.receipts.length === 0}
//                                         >
//                                             <i className="fas fa-times"></i>
//                                         </button>
//                                     </div>
//                                 </div>

//                                 {/* Receipt Account Filter Row */}
//                                 <div className="col-md-2">
//                                     <label htmlFor="receiptAccountFilter" className="form-label">Receipt Account</label>
//                                     <select
//                                         className="form-select"
//                                         id="receiptAccountFilter"
//                                         ref={receiptAccountFilterRef}
//                                         value={receiptAccountFilter}
//                                         onChange={handleReceiptAccountFilterChange}
//                                         disabled={data.receipts.length === 0}
//                                     >
//                                         <option value="">All</option>
//                                         {receiptAccounts.map(account => (
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
//                                 onClick={() => navigate('/retailer/receipts')}
//                             >
//                                 New Voucher
//                             </button>
//                             <button
//                                 className="btn btn-secondary"
//                                 onClick={() => handlePrint(false)}
//                                 disabled={data.receipts.length === 0}
//                             >
//                                 Print All
//                             </button>
//                             <button
//                                 className="btn btn-secondary"
//                                 onClick={() => handlePrint(true)}
//                                 disabled={data.receipts.length === 0}
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

//                     {data.receipts.length === 0 ? (
//                         <div className="alert alert-info text-center py-3">
//                             <i className="fas fa-info-circle me-2"></i>
//                             Please select date range and click "Generate Report" to view data
//                         </div>
//                     ) : (
//                         <>
//                             {/* Receipts Table */}
//                             <div className="table-responsive">
//                                 <table className="table table-hover">
//                                     <thead>
//                                         <tr>
//                                             <th>Date</th>
//                                             <th>Vch. No.</th>
//                                             <th>Account</th>
//                                             <th className="text-end">Credit</th>
//                                             <th>Receipt Account</th>
//                                             <th>User</th>
//                                             <th>Actions</th>
//                                         </tr>
//                                     </thead>
//                                     <tbody ref={tableBodyRef}>
//                                         {filteredReceipts.map((receipt, index) => (
//                                             <tr
//                                                 key={receipt._id}
//                                                 className={`receipt-row ${selectedRowIndex === index ? 'highlighted-row' : ''}`}
//                                                 onClick={() => handleRowClick(index)}
//                                                 onDoubleClick={() => handleRowDoubleClick(receipt._id)}
//                                                 style={{ cursor: 'pointer' }}
//                                             >
//                                                 <td>{new NepaliDate(receipt.date).format('YYYY-MM-DD')}</td>
//                                                 <td>{receipt.billNumber}</td>
//                                                 <td>
//                                                     {receipt.isActive ?
//                                                         (receipt.account?.name || 'N/A') :
//                                                         <span className="text-danger">Canceled</span>}
//                                                 </td>
//                                                 <td className="text-end">
//                                                     {receipt.isActive ?
//                                                         formatCurrency(receipt.credit) :
//                                                         <span className="text-danger">0.00</span>}
//                                                 </td>
//                                                 <td>
//                                                     {receipt.isActive ?
//                                                         (receipt.receiptAccount?.name || 'N/A') :
//                                                         <span className="text-danger">Canceled</span>}
//                                                 </td>
//                                                 <td>{receipt.user?.name || 'N/A'}</td>
//                                                 <td>
//                                                     <div className="d-flex gap-2">
//                                                         <button
//                                                             className="btn btn-sm btn-info"
//                                                             onClick={() => navigate(`/retailer/receipts/${receipt._id}/print`)}
//                                                         >
//                                                             <i className="fas fa-eye"></i>View
//                                                         </button>
//                                                         <button
//                                                             className="btn btn-sm btn-warning"
//                                                             onClick={() => navigate(`/retailer/receipts/${receipt._id}`)}
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
//                                             <td className="text-end">{formatCurrency(totalCredit)}</td>
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

// export default ReceiptsList;

//----------------------------------------------------------end

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../Header';
import NepaliDate from 'nepali-date-converter';
import { usePageNotRefreshContext } from '../PageNotRefreshContext';
import Loader from '../../Loader';
import ProductModal from '../dashboard/modals/ProductModal';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

const ReceiptsList = () => {
    const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
    const currentEnglishDate = new Date().toISOString().split('T')[0];

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
        fiscalYear: {}
    });

    const [showProductModal, setShowProductModal] = useState(false);

    const [data, setData] = useState(() => {
        if (draftSave && draftSave.receiptsData) {
            return draftSave.receiptsData;
        }
        return {
            company: null,
            currentFiscalYear: null,
            receipts: [],
            fromDate: '',
            toDate: ''
        };
    });

    const [searchQuery, setSearchQuery] = useState(() => {
        if (draftSave && draftSave.receiptsSearch) {
            return draftSave.receiptsSearch.searchQuery || '';
        }
        return '';
    });

    const [receiptAccountFilter, setReceiptAccountFilter] = useState(() => {
        if (draftSave && draftSave.receiptsSearch) {
            return draftSave.receiptsSearch.receiptAccountFilter || '';
        }
        return '';
    });

    const [selectedRowIndex, setSelectedRowIndex] = useState(() => {
        if (draftSave && draftSave.receiptsSearch) {
            return draftSave.receiptsSearch.selectedRowIndex || 0;
        }
        return 0;
    });

    // Add column resizing state
    const [columnWidths, setColumnWidths] = useState({
        date: 90,
        voucherNo: 120,
        account: 200,
        credit: 100,
        receiptAccount: 150,
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
                        isVatExempt: companyData.isVatExempt || false,
                        vatEnabled: companyData.vatEnabled !== false, // default true
                        fiscalYear: currentFiscalYear || {}
                    });

                    // Check if we have draft dates
                    const hasDraftDates = draftSave?.receiptsData?.fromDate && draftSave?.receiptsData?.toDate;

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
    const [totalCredit, setTotalCredit] = useState(0);
    const [filteredReceipts, setFilteredReceipts] = useState([]);

    const fromDateRef = useRef(null);
    const toDateRef = useRef(null);
    const searchInputRef = useRef(null);
    const receiptAccountFilterRef = useRef(null);
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
            receiptsData: data,
            receiptsSearch: {
                searchQuery,
                receiptAccountFilter,
                selectedRowIndex,
                fromDate: data.fromDate,
                toDate: data.toDate
            }
        });
    }, [data, searchQuery, receiptAccountFilter, selectedRowIndex, data.fromDate, data.toDate]);

    // Save/load column widths
    useEffect(() => {
        const savedWidths = localStorage.getItem('receiptsTableColumnWidths');
        if (savedWidths) {
            try {
                setColumnWidths(JSON.parse(savedWidths));
            } catch (e) {
                console.error('Failed to load column widths:', e);
            }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('receiptsTableColumnWidths', JSON.stringify(columnWidths));
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

                const response = await api.get(`/api/retailer/receipts/register?${params.toString()}`);
                setData(response.data.data);
                setError(null);
                // Don't reset selection when new data loads if we have a saved position
                if (!draftSave?.receiptsSearch?.selectedRowIndex) {
                    setSelectedRowIndex(0);
                }
            } catch (err) {
                setError(err.response?.data?.error || 'Failed to fetch receipts');
            } finally {
                setLoading(false);
                setShouldFetch(false);
            }
        };

        fetchData();
    }, [shouldFetch, data.fromDate, data.toDate]);

    // Filter receipts based on search and receipt account
    useEffect(() => {
        const filtered = data.receipts.filter(receipt => {
            const matchesSearch =
                receipt.billNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                receipt.account?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                receipt.user?.name?.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesReceiptAccount =
                receiptAccountFilter === '' ||
                (receipt.receiptAccount?.name?.toLowerCase() === receiptAccountFilter.toLowerCase());

            return matchesSearch && matchesReceiptAccount;
        });

        setFilteredReceipts(filtered);

        // Reset selected row when filters change, but only if we don't have a saved position
        if (!draftSave?.receiptsSearch?.selectedRowIndex) {
            setSelectedRowIndex(0);
        }
    }, [data.receipts, searchQuery, receiptAccountFilter]);

    // Calculate totals when filtered receipts change
    useEffect(() => {
        if (filteredReceipts.length === 0) {
            setTotalCredit(0);
            return;
        }

        const newTotal = filteredReceipts.reduce((acc, receipt) => {
            return receipt.isActive ? acc + (receipt.credit || 0) : acc;
        }, 0);

        setTotalCredit(newTotal);
    }, [filteredReceipts]);

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (filteredReceipts.length === 0) return;

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
                    setSelectedRowIndex(prev => Math.min(filteredReceipts.length - 1, prev + 1));
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [filteredReceipts, selectedRowIndex, navigate]);

    // Scroll to selected row
    useEffect(() => {
        if (tableBodyRef.current && filteredReceipts.length > 0) {
            const rows = tableBodyRef.current.querySelectorAll('tr');
            if (rows.length > selectedRowIndex) {
                rows[selectedRowIndex].scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest'
                });
            }
        }
    }, [selectedRowIndex, filteredReceipts]);

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

    const handleReceiptAccountFilterChange = (e) => {
        setReceiptAccountFilter(e.target.value);
    };

    const handleGenerateReport = () => {
        if (!data.fromDate || !data.toDate) {
            setError('Please select both from and to dates');
            return;
        }
        setShouldFetch(true);
    };

    const handlePrint = (filtered = false) => {
        const rowsToPrint = filtered ?
            filteredReceipts :
            data.receipts;

        if (rowsToPrint.length === 0) {
            alert("No receipts to print");
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
        <h1 style="text-align:center;text-decoration:underline;">Receipt Voucher's Register</h1>
        <table>
            <thead>
                <tr>
                    <th class="nowrap">Date</th>
                    <th class="nowrap">Vch. No.</th>
                    <th class="nowrap">Account</th>
                    <th class="nowrap">Credit</th>
                    <th class="nowrap">Receipt Account</th>
                    <th class="nowrap">User</th>
                </tr>
            </thead>
            <tbody>
        `;

        let totalCredit = 0;

        rowsToPrint.forEach(receipt => {
            const isCanceled = !receipt.isActive;

            tableContent += `
            <tr>
                <td class="nowrap">${new NepaliDate(receipt.date).format('YYYY-MM-DD')}</td>
                <td class="nowrap">${receipt.billNumber}</td>
                <td class="nowrap">${isCanceled ? '<span class="text-danger">Canceled</span>' : (receipt.account?.name || 'N/A')}</td>
                <td class="nowrap">${isCanceled ? '<span class="text-danger">0.00</span>' : (receipt.credit?.toFixed(2) || '0.00')}</td>
                <td class="nowrap">${isCanceled ? '<span class="text-danger">Canceled</span>' : (receipt.receiptAccount?.name || 'N/A')}</td>
                <td class="nowrap">${receipt.user?.name || 'N/A'}</td>
            </tr>
            `;

            if (!isCanceled) {
                totalCredit += parseFloat(receipt.credit || 0);
            }
        });

        // Add totals row
        tableContent += `
            <tr style="font-weight:bold;">
                <td colspan="3">Total:</td>
                <td>${totalCredit.toFixed(2)}</td>
                <td colspan="2"></td>
            </tr>
            </tbody>
        </table>
        `;

        printWindow.document.write(`
        <html>
            <head>
                <title>Receipt Voucher's Register</title>
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

    const handleRowDoubleClick = useCallback((receiptId) => {
        navigate(`/retailer/receipts/${filteredReceipts[selectedRowIndex]._id}/print`);
    }, [navigate, filteredReceipts, selectedRowIndex]);

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
            columnWidths.credit + columnWidths.receiptAccount + columnWidths.user + columnWidths.actions;

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

                {/* Credit */}
                <div
                    className="d-flex align-items-center justify-content-end px-1 border-end position-relative"
                    style={{
                        width: `${columnWidths.credit}px`,
                        flexShrink: 0,
                        minWidth: '80px'
                    }}
                >
                    <strong style={{ fontSize: '0.75rem' }}>Credit</strong>
                    <ResizeHandle
                        onResizeStart={handleResizeStart}
                        left={columnWidths.credit - 2}
                        columnName="credit"
                    />
                </div>

                {/* Receipt Account */}
                <div
                    className="d-flex align-items-center px-1 border-end position-relative"
                    style={{
                        width: `${columnWidths.receiptAccount}px`,
                        flexShrink: 0,
                        minWidth: '100px'
                    }}
                >
                    <strong style={{ fontSize: '0.75rem' }}>Receipt Account</strong>
                    <ResizeHandle
                        onResizeStart={handleResizeStart}
                        left={columnWidths.receiptAccount - 3}
                        columnName="receiptAccount"
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
        const { receipts, selectedRowIndex, formatCurrency, navigate } = rowData;
        const receipt = receipts[index];

        const handleRowClick = () => {
            rowData.handleRowClick(index);
        };

        const handleDoubleClick = () => {
            navigate(`/retailer/receipts/${receipt._id}/print`);
        };

        const handleViewClick = (e) => {
            e.stopPropagation();
            navigate(`/retailer/receipts/${receipt._id}/print`);
        };

        const handleEditClick = (e) => {
            e.stopPropagation();
            navigate(`/retailer/receipts/${receipt._id}`);
        };

        if (!receipt) return null;

        const isSelected = selectedRowIndex === index;
        const isCanceled = !receipt.isActive;

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
                        {new NepaliDate(receipt.date).format('YYYY-MM-DD')}
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
                        {receipt.billNumber}
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
                    title={receipt.account?.name || 'N/A'}
                >
                    <span style={{ 
                        fontSize: '0.75rem', 
                        whiteSpace: 'nowrap', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis',
                        color: isCanceled ? '#dc3545' : 'inherit'
                    }}>
                        {isCanceled ? 'Canceled' : (receipt.account?.name || 'N/A')}
                    </span>
                </div>

                {/* Credit */}
                <div
                    className="d-flex align-items-center justify-content-end px-1 border-end"
                    style={{
                        width: `${columnWidths.credit}px`,
                        flexShrink: 0,
                        height: '100%'
                    }}
                >
                    <span style={{ 
                        fontSize: '0.75rem',
                        color: isCanceled ? '#dc3545' : 'inherit'
                    }}>
                        {isCanceled ? '0.00' : formatCurrency(receipt.credit)}
                    </span>
                </div>

                {/* Receipt Account */}
                <div
                    className="d-flex align-items-center px-1 border-end"
                    style={{
                        width: `${columnWidths.receiptAccount}px`,
                        flexShrink: 0,
                        height: '100%',
                        overflow: 'hidden'
                    }}
                    title={receipt.receiptAccount?.name || 'N/A'}
                >
                    <span style={{ 
                        fontSize: '0.75rem', 
                        whiteSpace: 'nowrap', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis',
                        color: isCanceled ? '#dc3545' : 'inherit'
                    }}>
                        {isCanceled ? 'Canceled' : (receipt.receiptAccount?.name || 'N/A')}
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
                    title={receipt.user?.name || 'N/A'}
                >
                    <span style={{ fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {receipt.user?.name || 'N/A'}
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

        const prevReceipt = prevProps.data.receipts[prevProps.index];
        const nextReceipt = nextProps.data.receipts[nextProps.index];

        return (
            shallowEqual(prevReceipt, nextReceipt) &&
            prevProps.data.selectedRowIndex === nextProps.data.selectedRowIndex
        );
    });

    // Add reset function
    const resetColumnWidths = () => {
        setColumnWidths({
            date: 90,
            voucherNo: 120,
            account: 200,
            credit: 100,
            receiptAccount: 150,
            user: 120,
            actions: 140
        });
    };

    // Get unique receipt accounts for filter dropdown
    const receiptAccounts = useMemo(() => {
        return [...new Set(data.receipts
            .map(receipt => receipt.receiptAccount?.name)
            .filter(name => name !== undefined && name !== null))];
    }, [data.receipts]);

    if (loading) return <Loader />;

    if (error) {
        return <div className="alert alert-danger text-center py-5">{error}</div>;
    }

    return (
        <div className="container-fluid">
            <Header />
            <div className="card mt-2 shadow-lg p-0 animate__animated animate__fadeInUp expanded-card ledger-card compact">
                <div className="card-header bg-white py-0">
                    <h1 className="h4 mb-0 text-center text-primary">Receipt Voucher's Register</h1>
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
                                    className={`form-control form-control-sm ${dateErrors.fromDate ? 'is-invalid' : ''}`}
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
                                    className={`form-control form-control-sm ${dateErrors.toDate ? 'is-invalid' : ''}`}
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
                                        disabled={data.receipts.length === 0}
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

                        {/* Receipt Account Filter Row */}
                        <div className="col-12 col-md-2">
                            <div className="position-relative">
                                <select
                                    className="form-select form-select-sm"
                                    id="receiptAccountFilter"
                                    value={receiptAccountFilter}
                                    onChange={handleReceiptAccountFilterChange}
                                    disabled={data.receipts.length === 0}
                                    style={{
                                        height: '30px',
                                        fontSize: '0.875rem',
                                        paddingTop: '0.25rem',
                                        width: '100%'
                                    }}
                                >
                                    <option value="">All</option>
                                    {receiptAccounts.map(account => (
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
                                    Receipt Account
                                </label>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="col-12 col-md-auto d-flex align-items-end justify-content-end gap-2">
                            <button
                                className="btn btn-secondary btn-sm d-flex align-items-center"
                                onClick={() => navigate('/retailer/receipts')}
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
                                disabled={data.receipts.length === 0}
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
                                disabled={data.receipts.length === 0}
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

                    {data.receipts.length === 0 ? (
                        <div className="alert alert-info text-center py-3" style={{ fontSize: '0.875rem' }}>
                            <i className="fas fa-info-circle me-2"></i>
                            Please select date range and click "Generate Report" to view data
                        </div>
                    ) : (
                        <>
                            {/* Receipts Table */}
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
                                            Loading receipts...
                                        </p>
                                    </div>
                                ) : filteredReceipts.length === 0 ? (
                                    <div className="d-flex flex-column justify-content-center align-items-center h-100">
                                        <i className="bi bi-search text-muted" style={{ fontSize: '1.5rem' }}></i>
                                        <h6 className="mt-2 text-muted" style={{ fontSize: '0.9rem' }}>
                                            No receipts found
                                        </h6>
                                        <p className="text-muted small" style={{ fontSize: '0.75rem' }}>
                                            {searchQuery ? 'Try a different search term' : 'No data for the selected date range'}
                                        </p>
                                    </div>
                                ) : (
                                    <AutoSizer>
                                        {({ height, width }) => {
                                            const totalWidth = columnWidths.date + columnWidths.voucherNo + columnWidths.account +
                                                columnWidths.credit + columnWidths.receiptAccount + columnWidths.user + columnWidths.actions;

                                            return (
                                                <div style={{
                                                    position: 'relative',
                                                    height: height,
                                                    width: Math.max(width, totalWidth),
                                                }}>
                                                    <TableHeader />
                                                    <List
                                                        height={height - 28}
                                                        itemCount={filteredReceipts.length}
                                                        itemSize={28}
                                                        width={Math.max(width, totalWidth)}
                                                        itemData={{
                                                            receipts: filteredReceipts,
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
                                        width: `${columnWidths.credit}px`,
                                        flexShrink: 0,
                                        height: '100%'
                                    }}
                                >
                                    <strong style={{ fontSize: '0.75rem' }}>{formatCurrency(totalCredit)}</strong>
                                </div>

                                <div
                                    className="d-flex align-items-center px-1 border-start"
                                    style={{
                                        width: `${columnWidths.receiptAccount + columnWidths.user + columnWidths.actions}px`,
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

export default ReceiptsList;