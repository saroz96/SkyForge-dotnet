// import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
// import { useNavigate } from 'react-router-dom';
// import axios from 'axios';
// import Header from '../Header';
// import NepaliDate from 'nepali-datetime';
// import { usePageNotRefreshContext } from '../PageNotRefreshContext';
// import '../../../stylesheet/noDateIcon.css';
// import Loader from '../../Loader';
// import ProductModal from '../dashboard/modals/ProductModal';
// import { FixedSizeList as List } from 'react-window';
// import AutoSizer from 'react-virtualized-auto-sizer';

// // Helper functions for date conversion
// const convertBsToAd = (bsDate) => {
//     if (!bsDate || !/^\d{4}-\d{2}-\d{2}$/.test(bsDate)) return null;

//     try {
//         const nepaliDate = new NepaliDate(bsDate);
//         if (!nepaliDate || typeof nepaliDate.getDateObject !== 'function') {
//             console.error('Invalid NepaliDate object or missing getDateObject method');
//             return null;
//         }

//         const jsDate = nepaliDate.getDateObject();
//         if (!jsDate || isNaN(jsDate.getTime())) {
//             console.error('Invalid AD date generated from BS date:', bsDate);
//             return null;
//         }

//         const year = jsDate.getFullYear();
//         const month = String(jsDate.getMonth() + 1).padStart(2, '0');
//         const day = String(jsDate.getDate()).padStart(2, '0');

//         return `${year}-${month}-${day}`;
//     } catch (error) {
//         console.error('Error converting BS to AD:', error.message, 'Date:', bsDate);
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

//         if (isNaN(date.getTime())) {
//             console.error('Invalid AD date:', adDate);
//             return null;
//         }

//         const nepaliDate = new NepaliDate(date);
//         if (!nepaliDate || typeof nepaliDate.getYear !== 'function') {
//             console.error('Invalid NepaliDate object');
//             return null;
//         }

//         const year = nepaliDate.getYear();
//         const month = nepaliDate.getMonth();
//         const day = nepaliDate.getDate();

//         if (!year || month === undefined || !day) {
//             console.error('Invalid BS components generated');
//             return null;
//         }

//         return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
//     } catch (error) {
//         console.error('Error converting AD to BS:', error.message, 'Date:', adDate);
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
//         if (!nepaliDate || typeof nepaliDate.getYear !== 'function') {
//             return false;
//         }

//         const bsYear = nepaliDate.getYear();
//         const bsMonth = nepaliDate.getMonth() + 1;
//         const bsDay = nepaliDate.getDate();

//         return (bsYear === year && bsMonth === month && bsDay === day);
//     } catch (error) {
//         console.warn('Invalid Nepali date:', dateStr, error.message);
//         return false;
//     }
// };

// const DebitNoteRegister = () => {
//     const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
//     const currentEnglishDate = new Date().toISOString().split('T')[0];

//     const [dateErrors, setDateErrors] = useState({
//         fromDate: '',
//         toDate: ''
//     });

//     const [notification, setNotification] = useState({
//         show: false,
//         message: '',
//         type: 'success',
//         duration: 3000
//     });

//     const { draftSave, setDraftSave } = usePageNotRefreshContext();
//     const [showProductModal, setShowProductModal] = useState(false);

//     const [company, setCompany] = useState({
//         dateFormat: 'english',
//         vatEnabled: true,
//         fiscalYear: {}
//     });

//     // SPLIT STATE: Separate date range from debit notes and company info
//     const [dateRange, setDateRange] = useState(() => {
//         if (draftSave && draftSave.debitNoteData) {
//             return {
//                 fromDate: draftSave.debitNoteData.fromDate || '',
//                 toDate: draftSave.debitNoteData.toDate || '',
//                 fromDateAd: draftSave.debitNoteData.fromDateAd || '',
//                 toDateAd: draftSave.debitNoteData.toDateAd || ''
//             };
//         }
//         return {
//             fromDate: '',
//             toDate: '',
//             fromDateAd: '',
//             toDateAd: ''
//         };
//     });

//     const [debitNotes, setDebitNotes] = useState(() => {
//         if (draftSave && draftSave.debitNoteData) {
//             return draftSave.debitNoteData.debitNotes || [];
//         }
//         return [];
//     });

//     const [companyInfo, setCompanyInfo] = useState(() => {
//         if (draftSave && draftSave.debitNoteData) {
//             return {
//                 company: draftSave.debitNoteData.company,
//                 currentFiscalYear: draftSave.debitNoteData.currentFiscalYear,
//                 currentCompanyName: draftSave.debitNoteData.currentCompanyName || '',
//                 companyDateFormat: draftSave.debitNoteData.companyDateFormat || 'english',
//                 vatEnabled: draftSave.debitNoteData.vatEnabled !== undefined ? draftSave.debitNoteData.vatEnabled : true,
//                 isAdminOrSupervisor: draftSave.debitNoteData.isAdminOrSupervisor || false
//             };
//         }
//         return {
//             company: null,
//             currentFiscalYear: null,
//             currentCompanyName: '',
//             companyDateFormat: 'english',
//             vatEnabled: true,
//             isAdminOrSupervisor: false
//         };
//     });

//     const [searchQuery, setSearchQuery] = useState(() => {
//         if (draftSave && draftSave.debitNoteSearch) {
//             return draftSave.debitNoteSearch.searchQuery || '';
//         }
//         return '';
//     });

//     const [selectedRowIndex, setSelectedRowIndex] = useState(() => {
//         if (draftSave && draftSave.debitNoteSearch) {
//             return draftSave.debitNoteSearch.selectedRowIndex || 0;
//         }
//         return 0;
//     });

//     // Column resizing state - Updated with BS and AD date columns
//     const [columnWidths, setColumnWidths] = useState({
//         bsDate: 80,
//         adDate: 80,
//         voucherNo: 100,
//         debitAccounts: 150,
//         debit: 80,
//         creditAccounts: 150,
//         credit: 80,
//         description: 130,
//         actions: 100
//     });

//     const [isResizing, setIsResizing] = useState(false);
//     const [resizingColumn, setResizingColumn] = useState(null);
//     const [startX, setStartX] = useState(0);
//     const [startWidth, setStartWidth] = useState(0);

//     // API instance with JWT token
//     const api = axios.create({
//         baseURL: process.env.REACT_APP_API_BASE_URL,
//         withCredentials: true,
//     });

//     // Add authorization header to all requests
//     api.interceptors.request.use(
//         (config) => {
//             const token = localStorage.getItem('token');
//             if (token) {
//                 config.headers.Authorization = `Bearer ${token}`;
//             }
//             return config;
//         },
//         (error) => {
//             return Promise.reject(error);
//         }
//     );

//     // Fetch company and fiscal year info - RUNS ONLY ONCE on mount
//     useEffect(() => {
//         const fetchInitialData = async () => {
//             try {
//                 const response = await api.get('/api/retailer/debit-note/entry-data');

//                 if (response.data.success) {
//                     const responseData = response.data.data;

//                     const dateFormat = responseData.company.dateFormat?.toLowerCase() || 'english';
//                     const isNepaliFormat = dateFormat === 'nepali';

//                     setCompany({
//                         ...responseData.company,
//                         dateFormat: dateFormat,
//                         vatEnabled: responseData.company.vatEnabled || true
//                     });

//                     const currentFiscalYear = responseData.currentFiscalYear;
//                     const hasDraftDates = draftSave?.debitNoteData?.fromDate &&
//                         draftSave?.debitNoteData?.toDate;

//                     if (!hasDraftDates && currentFiscalYear) {
//                         let fromDateFormatted = '';
//                         let toDateFormatted = '';
//                         let fromDateAd = '';
//                         let toDateAd = '';

//                         if (isNepaliFormat) {
//                             fromDateFormatted = currentFiscalYear.startDateNepali || currentNepaliDate;
//                             toDateFormatted = currentNepaliDate;
//                             fromDateAd = convertBsToAd(fromDateFormatted);
//                             toDateAd = convertBsToAd(toDateFormatted);
//                         } else {
//                             fromDateFormatted = currentFiscalYear.startDate
//                                 ? new Date(currentFiscalYear.startDate).toISOString().split('T')[0]
//                                 : currentEnglishDate;
//                             toDateFormatted = currentFiscalYear.endDate
//                                 ? new Date(currentFiscalYear.endDate).toISOString().split('T')[0]
//                                 : currentEnglishDate;
//                             fromDateAd = fromDateFormatted;
//                             toDateAd = toDateFormatted;
//                         }

//                         setDateRange({
//                             fromDate: fromDateFormatted,
//                             toDate: toDateFormatted,
//                             fromDateAd: fromDateAd,
//                             toDateAd: toDateAd
//                         });
//                     } else if (hasDraftDates) {
//                         let fromDateAd = dateRange.fromDate;
//                         let toDateAd = dateRange.toDate;
//                         if (isNepaliFormat && dateRange.fromDate) {
//                             fromDateAd = convertBsToAd(dateRange.fromDate);
//                             toDateAd = convertBsToAd(dateRange.toDate);
//                         }
//                         setDateRange(prev => ({
//                             ...prev,
//                             fromDateAd: fromDateAd || prev.fromDateAd,
//                             toDateAd: toDateAd || prev.toDateAd
//                         }));
//                     }

//                     setCompanyInfo({
//                         company: responseData.company,
//                         currentFiscalYear: currentFiscalYear,
//                         currentCompanyName: responseData.company.name,
//                         companyDateFormat: responseData.company.dateFormat,
//                         vatEnabled: responseData.company.vatEnabled,
//                         isAdminOrSupervisor: responseData.permissions?.isAdminOrSupervisor || false
//                     });
//                 }
//             } catch (err) {
//                 console.error('Error fetching initial data:', err);
//                 setNotification({
//                     show: true,
//                     message: 'Error loading company data',
//                     type: 'error'
//                 });
//             }
//         };

//         fetchInitialData();
//     }, []);

//     const [loading, setLoading] = useState(false);
//     const [error, setError] = useState(null);
//     const [totalDebit, setTotalDebit] = useState(0);
//     const [totalCredit, setTotalCredit] = useState(0);
//     const [filteredDebitNotes, setFilteredDebitNotes] = useState([]);

//     const fromDateRef = useRef(null);
//     const toDateRef = useRef(null);
//     const searchInputRef = useRef(null);
//     const generateReportRef = useRef(null);
//     const tableBodyRef = useRef(null);
//     const [shouldFetch, setShouldFetch] = useState(false);
//     const navigate = useNavigate();

//     // Save data and search state to draft context
//     useEffect(() => {
//         setDraftSave({
//             ...draftSave,
//             debitNoteData: {
//                 ...companyInfo,
//                 debitNotes: debitNotes,
//                 fromDate: dateRange.fromDate,
//                 toDate: dateRange.toDate,
//                 fromDateAd: dateRange.fromDateAd,
//                 toDateAd: dateRange.toDateAd
//             },
//             debitNoteSearch: {
//                 searchQuery,
//                 selectedRowIndex,
//                 fromDate: dateRange.fromDate,
//                 toDate: dateRange.toDate
//             }
//         });
//     }, [debitNotes, searchQuery, selectedRowIndex, dateRange.fromDate, dateRange.toDate, dateRange.fromDateAd, dateRange.toDateAd, companyInfo]);

//     // Save/load column widths
//     useEffect(() => {
//         const savedWidths = localStorage.getItem('debitNoteTableColumnWidths');
//         if (savedWidths) {
//             try {
//                 setColumnWidths(JSON.parse(savedWidths));
//             } catch (e) {
//                 console.error('Failed to load column widths:', e);
//             }
//         }
//     }, []);

//     useEffect(() => {
//         localStorage.setItem('debitNoteTableColumnWidths', JSON.stringify(columnWidths));
//     }, [columnWidths]);

//     // Fetch data when generate report is clicked - ONLY UPDATES DEBIT NOTES, NOT INPUT FIELDS
//     useEffect(() => {
//         const abortController = new AbortController();

//         const fetchData = async () => {
//             if (!shouldFetch) return;

//             try {
//                 setLoading(true);
//                 const params = new URLSearchParams();
//                 // Use AD dates for API call
//                 if (dateRange.fromDateAd) params.append('fromDate', dateRange.fromDateAd);
//                 if (dateRange.toDateAd) params.append('toDate', dateRange.toDateAd);

//                 const response = await api.get(`/api/retailer/debit-note/register?${params.toString()}`, {
//                     signal: abortController.signal
//                 });

//                 if (response.data.success) {
//                     // ONLY update debit notes - keep everything else unchanged
//                     setDebitNotes(response.data.data.debitNotes || []);
//                     // Update company info only if needed
//                     if (response.data.data.vatEnabled !== undefined) {
//                         setCompanyInfo(prev => ({
//                             ...prev,
//                             vatEnabled: response.data.data.vatEnabled
//                         }));
//                     }
//                     setError(null);
//                 } else {
//                     setError(response.data.error || 'Failed to fetch debit notes');
//                 }

//                 if (!draftSave?.debitNoteSearch?.selectedRowIndex) {
//                     setSelectedRowIndex(0);
//                 }
//             } catch (err) {
//                 if (err.name !== 'AbortError') {
//                     console.error('Fetch error:', err);
//                     setError(err.response?.data?.error || 'Failed to fetch debit notes');
//                 }
//             } finally {
//                 setLoading(false);
//                 setShouldFetch(false);
//             }
//         };

//         fetchData();

//         return () => {
//             abortController.abort();
//         };
//     }, [shouldFetch, dateRange.fromDateAd, dateRange.toDateAd]);

//     // Filter debit notes based on search query
//     useEffect(() => {
//         const debitNotesArray = Array.isArray(debitNotes) ? debitNotes : [];

//         const filtered = debitNotesArray.filter(debitNote => {
//             const matchesSearch =
//                 (debitNote.billNumber?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
//                 (debitNote.description?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
//                 (debitNote.debitAccountNames?.some(name => name?.toLowerCase().includes(searchQuery.toLowerCase())) || false) ||
//                 (debitNote.creditAccountNames?.some(name => name?.toLowerCase().includes(searchQuery.toLowerCase())) || false) ||
//                 (debitNote.userName?.toLowerCase() || '').includes(searchQuery.toLowerCase());

//             return matchesSearch;
//         });

//         setFilteredDebitNotes(filtered);

//         if (selectedRowIndex >= filtered.length && filtered.length > 0) {
//             setSelectedRowIndex(0);
//         }
//     }, [debitNotes, searchQuery]);

//     // Calculate totals when filtered debit notes change
//     useEffect(() => {
//         if (filteredDebitNotes.length === 0) {
//             setTotalDebit(0);
//             setTotalCredit(0);
//             return;
//         }

//         const newTotalDebit = filteredDebitNotes.reduce((acc, debitNote) => {
//             if (debitNote.status !== 'Active') return acc;
//             const total = debitNote.debitAmounts?.reduce((sum, amt) => sum + (amt || 0), 0) || 0;
//             return acc + total;
//         }, 0);

//         const newTotalCredit = filteredDebitNotes.reduce((acc, debitNote) => {
//             if (debitNote.status !== 'Active') return acc;
//             const total = debitNote.creditAmounts?.reduce((sum, amt) => sum + (amt || 0), 0) || 0;
//             return acc + total;
//         }, 0);

//         setTotalDebit(newTotalDebit);
//         setTotalCredit(newTotalCredit);
//     }, [filteredDebitNotes]);

//     // Handle keyboard navigation
//     useEffect(() => {
//         const handleKeyDown = (e) => {
//             if (filteredDebitNotes.length === 0) return;

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
//                     setSelectedRowIndex(prev => Math.min(filteredDebitNotes.length - 1, prev + 1));
//                     break;
//                 default:
//                     break;
//             }
//         };

//         window.addEventListener('keydown', handleKeyDown);
//         return () => window.removeEventListener('keydown', handleKeyDown);
//     }, [filteredDebitNotes]);

//     // F9 key handler for product modal
//     useEffect(() => {
//         const handleF9KeyDown = (e) => {
//             if (e.key === 'F9') {
//                 e.preventDefault();
//                 setShowProductModal(prev => !prev);
//             }
//         };
//         window.addEventListener('keydown', handleF9KeyDown);
//         return () => {
//             window.removeEventListener('keydown', handleF9KeyDown);
//         };
//     }, []);

//     // Shallow equal function for memoization
//     function shallowEqual(objA, objB) {
//         if (objA === objB) return true;

//         if (typeof objA !== 'object' || objA === null ||
//             typeof objB !== 'object' || objB === null) {
//             return false;
//         }

//         const keysA = Object.keys(objA);
//         const keysB = Object.keys(objB);

//         if (keysA.length !== keysB.length) return false;

//         for (let i = 0; i < keysA.length; i++) {
//             if (!objB.hasOwnProperty(keysA[i]) || objA[keysA[i]] !== objB[keysA[i]]) {
//                 return false;
//             }
//         }

//         return true;
//     }

//     const handleGenerateReport = () => {
//         if (!dateRange.fromDate || !dateRange.toDate) {
//             setError('Please select both from and to dates');
//             return;
//         }
//         setShouldFetch(true);
//     };

//     const handlePrint = (filtered = false) => {
//         const rowsToPrint = filtered ? filteredDebitNotes : (Array.isArray(debitNotes) ? debitNotes : []);

//         if (rowsToPrint.length === 0) {
//             alert("No debit notes to print");
//             return;
//         }

//         const printWindow = window.open("", "_blank");
//         const printHeader = `
//     <div class="print-header">
//         <h1 style="font-size: 14px; margin: 0;">${companyInfo.currentCompanyName || 'Company Name'}</h1>
//         <p style="font-size: 8px; margin: 2px 0;">
//             ${companyInfo.company?.address || ''}${companyInfo.company?.city ? ', ' + companyInfo.company.city : ''},
//             PAN: ${companyInfo.company?.pan || ''}<br>
//         </p>
//         <hr style="margin: 2px 0;">
//     </div>
//     `;

//         let tableContent = `
//     <style>
//         @page {
//             margin: 3mm;
//         }
//         body { 
//             font-family: Arial, sans-serif; 
//             font-size: 7px; 
//             margin: 0;
//             padding: 2mm;
//         }
//         table { 
//             width: 100%; 
//             border-collapse: collapse; 
//             page-break-inside: auto;
//             font-size: 6px;
//         }
//         tr { 
//             page-break-inside: avoid; 
//             page-break-after: auto; 
//         }
//         th, td { 
//             border: 1px solid #000; 
//             padding: 2px 3px; 
//             text-align: left; 
//             white-space: nowrap;
//         }
//         th { 
//             background-color: #f2f2f2 !important; 
//             -webkit-print-color-adjust: exact;
//             font-size: 10px;
//             font-weight: bold;
//             padding: 3px 3px;
//         }
//         td {
//             font-size: 8px;
//             padding: 2px 3px;
//         }
//         .print-header { 
//             text-align: center; 
//             margin-bottom: 5px; 
//         }
//         .nowrap {
//             white-space: nowrap;
//         }
//         h1 {
//             font-size: 14px;
//             margin: 0;
//         }
//         .report-title {
//             text-align: center;
//             text-decoration: underline;
//             font-size: 11px;
//             font-weight: bold;
//             margin: 3px 0;
//         }
//         .grand-total-row td {
//             font-weight: bold;
//             border-top: 2px solid #000;
//             font-size: 7px;
//         }
//         .text-danger {
//             color: #dc3545 !important;
//         }
//     </style>
//     ${printHeader}
//     <div class="report-title">Debit Note Register</div>
//     <table>
//         <thead>
//             <tr>
//                 <th class="nowrap">Miti</th>
//                 <th class="nowrap">Date</th>
//                 <th class="nowrap">Vch No.</th>
//                 <th class="nowrap">Debit Accounts</th>
//                 <th class="nowrap">Debit</th>
//                 <th class="nowrap">Credit Accounts</th>
//                 <th class="nowrap">Credit</th>
//                 <th class="nowrap">Description</th>
//             </tr>
//         </thead>
//         <tbody>
//     `;

//         let printTotalDebit = 0;
//         let printTotalCredit = 0;

//         rowsToPrint.forEach(debitNote => {
//             const isCanceled = debitNote.status !== 'Active';

//             // Format debit accounts and amounts
//             const debitAccountsDisplay = isCanceled ? 'Canceled' : (debitNote.debitAccountNames?.join(', ') || 'N/A');
//             const debitAmountsDisplay = isCanceled ? '0.00' : (debitNote.debitAmounts?.map(amt => amt?.toFixed(2)).join(', ') || '0.00');
            
//             // Format credit accounts and amounts
//             const creditAccountsDisplay = isCanceled ? 'Canceled' : (debitNote.creditAccountNames?.join(', ') || 'N/A');
//             const creditAmountsDisplay = isCanceled ? '0.00' : (debitNote.creditAmounts?.map(amt => amt?.toFixed(2)).join(', ') || '0.00');

//             tableContent += `
//             <tr>
//                 <td class="nowrap">${debitNote.nepaliDate || ''}</td>
//                 <td class="nowrap">${debitNote.date ? new Date(debitNote.date).toLocaleDateString() : ''}</td>
//                 <td class="nowrap">${debitNote.billNumber || ''}</td>
//                 <td class="nowrap">${isCanceled ? '<span class="text-danger">Canceled</span>' : debitAccountsDisplay}</td>
//                 <td class="nowrap" style="text-align: right;">${isCanceled ? '<span class="text-danger">0.00</span>' : debitAmountsDisplay}</td>
//                 <td class="nowrap">${isCanceled ? '<span class="text-danger">Canceled</span>' : creditAccountsDisplay}</td>
//                 <td class="nowrap" style="text-align: right;">${isCanceled ? '<span class="text-danger">0.00</span>' : creditAmountsDisplay}</td>
//                 <td class="nowrap">${debitNote.description || ''}</td>
//             </tr>
//             `;

//             if (!isCanceled) {
//                 printTotalDebit += debitNote.debitAmounts?.reduce((sum, amt) => sum + (amt || 0), 0) || 0;
//                 printTotalCredit += debitNote.creditAmounts?.reduce((sum, amt) => sum + (amt || 0), 0) || 0;
//             }
//         });

//         tableContent += `
//         <tr class="grand-total-row" style="font-weight:bold;">
//             <td colspan="4" style="font-weight: bold;">Grand Totals</td>
//             <td style="text-align: right; font-weight: bold;">${printTotalDebit.toFixed(2)}</td>
//             <td></td>
//             <td style="text-align: right; font-weight: bold;">${printTotalCredit.toFixed(2)}</td>
//             <td></td>
//         </tr>
//         </tbody>
//     </table>
//     `;

//         printWindow.document.write(`
//     <!DOCTYPE html>
//     <html>
//         <head>
//             <title>Debit Note Register</title>
//             <meta charset="UTF-8">
//         </head>
//         <body>
//             ${tableContent}
//             <script>
//                 window.onload = function() {
//                     setTimeout(function() {
//                         window.print();
//                         window.close();
//                     }, 200);
//                 };
//             <\/script>
//         </body>
//     </html>
//     `);
//         printWindow.document.close();
//     };

//     const formatCurrency = useCallback((num) => {
//         const number = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num) || 0;
//         return number.toLocaleString('en-IN', {
//             minimumFractionDigits: 2,
//             maximumFractionDigits: 2
//         });
//     }, []);

//     const handleRowClick = useCallback((index) => {
//         setSelectedRowIndex(index);
//     }, []);

//     const handleRowDoubleClick = useCallback((debitNoteId) => {
//         if (filteredDebitNotes[selectedRowIndex]) {
//             navigate(`/retailer/debit-note/${filteredDebitNotes[selectedRowIndex].id}/print`);
//         }
//     }, [navigate, filteredDebitNotes, selectedRowIndex]);

//     const handleKeyDown = (e, nextFieldId) => {
//         if (e.key === 'Enter') {
//             e.preventDefault();
//             if (nextFieldId) {
//                 const nextField = document.getElementById(nextFieldId);
//                 if (nextField) {
//                     nextField.focus();
//                 }
//             } else {
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

//     // Resize Handle Component
//     const ResizeHandle = React.memo(({ onResizeStart, left, columnName }) => {
//         return (
//             <div
//                 className="resize-handle"
//                 style={{
//                     position: 'absolute',
//                     top: 0,
//                     left: `${left}px`,
//                     width: '5px',
//                     height: '100%',
//                     cursor: 'col-resize',
//                     backgroundColor: 'transparent',
//                     zIndex: 10,
//                     userSelect: 'none'
//                 }}
//                 onMouseDown={(e) => {
//                     e.preventDefault();
//                     onResizeStart(e, columnName);
//                 }}
//             />
//         );
//     });

//     // Table Header Component - Updated with BS Date and AD Date columns
//     const TableHeader = React.memo(() => {
//         const totalWidth = columnWidths.bsDate + columnWidths.adDate + columnWidths.voucherNo +
//             columnWidths.debitAccounts + columnWidths.debit + columnWidths.creditAccounts +
//             columnWidths.credit + columnWidths.description + columnWidths.actions;

//         const handleResizeStart = (e, columnName) => {
//             setIsResizing(true);
//             setResizingColumn(columnName);
//             setStartX(e.clientX);
//             setStartWidth(columnWidths[columnName]);
//             e.preventDefault();
//         };

//         return (
//             <div
//                 className="d-flex bg-light border-bottom sticky-top"
//                 style={{
//                     zIndex: 2,
//                     height: '28px',
//                     minWidth: `${totalWidth}px`,
//                     userSelect: isResizing ? 'none' : 'auto'
//                 }}
//                 onMouseMove={(e) => {
//                     if (isResizing && resizingColumn) {
//                         const diff = e.clientX - startX;
//                         const newWidth = Math.max(60, startWidth + diff);
//                         setColumnWidths(prev => ({
//                             ...prev,
//                             [resizingColumn]: newWidth
//                         }));
//                     }
//                 }}
//                 onMouseUp={() => {
//                     if (isResizing) {
//                         setIsResizing(false);
//                         setResizingColumn(null);
//                     }
//                 }}
//                 onMouseLeave={() => {
//                     if (isResizing) {
//                         setIsResizing(false);
//                         setResizingColumn(null);
//                     }
//                 }}
//             >
//                 {/* BS Date */}
//                 <div className="d-flex align-items-center justify-content-center px-1 border-end position-relative" style={{ width: `${columnWidths.bsDate}px`, flexShrink: 0, minWidth: '80px' }}>
//                     <strong style={{ fontSize: '0.75rem' }}>Miti</strong>
//                     <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.bsDate - 2} columnName="bsDate" />
//                 </div>

//                 {/* AD Date */}
//                 <div className="d-flex align-items-center justify-content-center px-1 border-end position-relative" style={{ width: `${columnWidths.adDate}px`, flexShrink: 0, minWidth: '80px' }}>
//                     <strong style={{ fontSize: '0.75rem' }}>Date</strong>
//                     <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.adDate - 2} columnName="adDate" />
//                 </div>

//                 {/* Vch No. */}
//                 <div className="d-flex align-items-center px-1 border-end position-relative" style={{ width: `${columnWidths.voucherNo}px`, flexShrink: 0, minWidth: '60px' }}>
//                     <strong style={{ fontSize: '0.75rem' }}>Vch No.</strong>
//                     <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.voucherNo - 3} columnName="voucherNo" />
//                 </div>

//                 {/* Debit Accounts */}
//                 <div className="d-flex align-items-center px-1 border-end position-relative" style={{ width: `${columnWidths.debitAccounts}px`, flexShrink: 0, minWidth: '100px' }}>
//                     <strong style={{ fontSize: '0.75rem' }}>Debit Accounts</strong>
//                     <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.debitAccounts - 3} columnName="debitAccounts" />
//                 </div>

//                 {/* Debit */}
//                 <div className="d-flex align-items-center justify-content-end px-1 border-end position-relative" style={{ width: `${columnWidths.debit}px`, flexShrink: 0, minWidth: '70px' }}>
//                     <strong style={{ fontSize: '0.75rem' }}>Debit</strong>
//                     <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.debit - 2} columnName="debit" />
//                 </div>

//                 {/* Credit Accounts */}
//                 <div className="d-flex align-items-center px-1 border-end position-relative" style={{ width: `${columnWidths.creditAccounts}px`, flexShrink: 0, minWidth: '100px' }}>
//                     <strong style={{ fontSize: '0.75rem' }}>Credit Accounts</strong>
//                     <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.creditAccounts - 3} columnName="creditAccounts" />
//                 </div>

//                 {/* Credit */}
//                 <div className="d-flex align-items-center justify-content-end px-1 border-end position-relative" style={{ width: `${columnWidths.credit}px`, flexShrink: 0, minWidth: '70px' }}>
//                     <strong style={{ fontSize: '0.75rem' }}>Credit</strong>
//                     <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.credit - 2} columnName="credit" />
//                 </div>

//                 {/* Description */}
//                 <div className="d-flex align-items-center px-1 border-end position-relative" style={{ width: `${columnWidths.description}px`, flexShrink: 0, minWidth: '100px' }}>
//                     <strong style={{ fontSize: '0.75rem' }}>Description</strong>
//                     <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.description - 3} columnName="description" />
//                 </div>

//                 {/* Actions */}
//                 <div className="d-flex align-items-center px-1 position-relative" style={{ width: `${columnWidths.actions}px`, flexShrink: 0, minWidth: '85px' }}>
//                     <strong style={{ fontSize: '0.75rem' }}>Actions</strong>
//                     <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.actions - 2} columnName="actions" />
//                 </div>

//                 {isResizing && (
//                     <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, cursor: 'col-resize' }} />
//                 )}
//             </div>
//         );
//     });

//     // Table Row Component - Updated with BS Date and AD Date columns
//     const TableRow = React.memo(({ index, style, data: rowData }) => {
//         const { debitNotes, selectedRowIndex, formatCurrency, navigate } = rowData;
//         const debitNote = debitNotes[index];

//         const handleRowClick = () => {
//             rowData.handleRowClick(index);
//         };

//         const handleDoubleClick = () => {
//             if (debitNote && debitNote.id) {
//                 navigate(`/retailer/debit-note/${debitNote.id}/print`);
//             }
//         };

//         const handleViewClick = (e) => {
//             e.stopPropagation();
//             if (debitNote && debitNote.id) {
//                 navigate(`/retailer/debit-note/${debitNote.id}/print`);
//             }
//         };

//         const handleEditClick = (e) => {
//             e.stopPropagation();
//             if (debitNote && debitNote.id) {
//                 navigate(`/retailer/debit-note/edit/${debitNote.id}`);
//             }
//         };

//         if (!debitNote) return null;

//         const isSelected = selectedRowIndex === index;
//         const isCanceled = debitNote.status !== 'Active';
//         const canEdit = companyInfo.isAdminOrSupervisor;

//         // Format debit accounts and amounts
//         const debitAccountsDisplay = debitNote.debitAccountNames?.join(', ') || 'N/A';
//         const debitAmountsDisplay = debitNote.debitAmounts?.map(amt => formatCurrency(amt)).join(', ') || '0.00';
        
//         // Format credit accounts and amounts
//         const creditAccountsDisplay = debitNote.creditAccountNames?.join(', ') || 'N/A';
//         const creditAmountsDisplay = debitNote.creditAmounts?.map(amt => formatCurrency(amt)).join(', ') || '0.00';

//         return (
//             <div
//                 style={{
//                     ...style,
//                     display: 'flex',
//                     alignItems: 'center',
//                     height: '28px',
//                     minHeight: '28px',
//                     padding: '0',
//                     borderBottom: '1px solid #dee2e6',
//                     cursor: 'pointer',
//                     backgroundColor: isSelected ? '#e7f3ff' : (index % 2 === 0 ? '#f8f9fa' : 'white')
//                 }}
//                 onClick={handleRowClick}
//                 onDoubleClick={handleDoubleClick}
//             >
//                 {/* BS Date */}
//                 <div className="d-flex align-items-center justify-content-center px-1 border-end" style={{ width: `${columnWidths.bsDate}px`, flexShrink: 0, height: '100%' }}>
//                     <span style={{ fontSize: '0.75rem' }}>{debitNote.nepaliDate || ''}</span>
//                 </div>

//                 {/* AD Date */}
//                 <div className="d-flex align-items-center justify-content-center px-1 border-end" style={{ width: `${columnWidths.adDate}px`, flexShrink: 0, height: '100%' }}>
//                     <span style={{ fontSize: '0.75rem' }}>{debitNote.date ? new Date(debitNote.date).toLocaleDateString() : ''}</span>
//                 </div>

//                 {/* Vch No. */}
//                 <div className="d-flex align-items-center px-1 border-end" style={{ width: `${columnWidths.voucherNo}px`, flexShrink: 0, height: '100%', overflow: 'hidden' }}>
//                     <span style={{ fontSize: '0.75rem' }}>{debitNote.billNumber || ''}</span>
//                 </div>

//                 {/* Debit Accounts */}
//                 <div className="d-flex align-items-center px-1 border-end" style={{ width: `${columnWidths.debitAccounts}px`, flexShrink: 0, height: '100%', overflow: 'hidden' }} title={debitAccountsDisplay}>
//                     <span style={{
//                         fontSize: '0.75rem',
//                         whiteSpace: 'nowrap',
//                         overflow: 'hidden',
//                         textOverflow: 'ellipsis',
//                         color: isCanceled ? '#dc3545' : 'inherit'
//                     }}>
//                         {isCanceled ? 'Canceled' : debitAccountsDisplay}
//                     </span>
//                 </div>

//                 {/* Debit */}
//                 <div className="d-flex align-items-center justify-content-end px-1 border-end" style={{ width: `${columnWidths.debit}px`, flexShrink: 0, height: '100%' }} title={debitAmountsDisplay}>
//                     <span style={{
//                         fontSize: '0.75rem',
//                         color: isCanceled ? '#dc3545' : 'inherit'
//                     }}>
//                         {isCanceled ? '0.00' : debitAmountsDisplay}
//                     </span>
//                 </div>

//                 {/* Credit Accounts */}
//                 <div className="d-flex align-items-center px-1 border-end" style={{ width: `${columnWidths.creditAccounts}px`, flexShrink: 0, height: '100%', overflow: 'hidden' }} title={creditAccountsDisplay}>
//                     <span style={{
//                         fontSize: '0.75rem',
//                         whiteSpace: 'nowrap',
//                         overflow: 'hidden',
//                         textOverflow: 'ellipsis',
//                         color: isCanceled ? '#dc3545' : 'inherit'
//                     }}>
//                         {isCanceled ? 'Canceled' : creditAccountsDisplay}
//                     </span>
//                 </div>

//                 {/* Credit */}
//                 <div className="d-flex align-items-center justify-content-end px-1 border-end" style={{ width: `${columnWidths.credit}px`, flexShrink: 0, height: '100%' }} title={creditAmountsDisplay}>
//                     <span style={{
//                         fontSize: '0.75rem',
//                         color: isCanceled ? '#dc3545' : 'inherit'
//                     }}>
//                         {isCanceled ? '0.00' : creditAmountsDisplay}
//                     </span>
//                 </div>

//                 {/* Description */}
//                 <div className="d-flex align-items-center px-1 border-end" style={{ width: `${columnWidths.description}px`, flexShrink: 0, height: '100%', overflow: 'hidden' }} title={debitNote.description || ''}>
//                     <span style={{
//                         fontSize: '0.75rem',
//                         whiteSpace: 'nowrap',
//                         overflow: 'hidden',
//                         textOverflow: 'ellipsis'
//                     }}>
//                         {debitNote.description || ''}
//                     </span>
//                 </div>

//                 {/* Actions - Compact buttons */}
//                 <div className="d-flex align-items-center justify-content-center px-1 gap-1" style={{ width: `${columnWidths.actions}px`, flexShrink: 0, height: '100%' }}>
//                     <button className="btn btn-sm btn-info py-0 px-1 d-flex align-items-center" onClick={handleViewClick} style={{ height: '20px', fontSize: '0.7rem', fontWeight: 'bold' }} title="View">
//                         <i className="bi bi-eye"></i>
//                     </button>
//                     {canEdit && !isCanceled && (
//                         <button className="btn btn-sm btn-warning py-0 px-1 d-flex align-items-center" onClick={handleEditClick} style={{ height: '20px', fontSize: '0.7rem', fontWeight: 'bold' }} title="Edit">
//                             <i className="bi bi-pencil-square"></i>
//                         </button>
//                     )}
//                 </div>
//             </div>
//         );
//     }, (prevProps, nextProps) => {
//         if (prevProps.index !== nextProps.index) return false;
//         if (prevProps.style !== nextProps.style) return false;
//         const prevDebitNote = prevProps.data.debitNotes[prevProps.index];
//         const nextDebitNote = nextProps.data.debitNotes[nextProps.index];
//         return shallowEqual(prevDebitNote, nextDebitNote) && prevProps.data.selectedRowIndex === nextProps.data.selectedRowIndex;
//     });

//     const resetColumnWidths = () => {
//         setColumnWidths({
//             bsDate: 80,
//             adDate: 80,
//             voucherNo: 100,
//             debitAccounts: 150,
//             debit: 80,
//             creditAccounts: 150,
//             credit: 80,
//             description: 130,
//             actions: 100
//         });
//     };

//     // Validate and auto-correct Nepali date
//     const validateAndCorrectNepaliDate = (dateStr) => {
//         if (!dateStr) return null;
//         if (isValidNepaliDate(dateStr)) return dateStr;

//         const match = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
//         if (match) {
//             let [_, year, month, day] = match;
//             month = parseInt(month, 10);
//             day = parseInt(day, 10);

//             if (month < 1) month = 1;
//             if (month > 12) month = 12;
//             if (day < 1) day = 1;
//             if (day > 32) day = 32;

//             const correctedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
//             if (isValidNepaliDate(correctedDate)) {
//                 return correctedDate;
//             }
//         }
//         return null;
//     };

//     // Safe check for loading and error states
//     if (loading && debitNotes.length === 0) return <Loader />;

//     if (error) {
//         return <div className="alert alert-danger text-center py-5">{error}</div>;
//     }

//     const debitNotesArray = Array.isArray(debitNotes) ? debitNotes : [];

//     return (
//         <div className="container-fluid">
//             <Header />
//             <div className="card mt-2 shadow-lg p-0 animate__animated animate__fadeInUp expanded-card ledger-card compact">
//                 <div className="card-header bg-white py-0">
//                     <h1 className="h4 mb-0 text-center text-primary">Debit Note Register</h1>
//                 </div>

//                 <div className="card-body p-2 p-md-3">
//                     <div className="row g-2 mb-3">
//                         {/* From Date BS Field */}
//                         <div className="col-12" style={{ flex: '0 0 auto', width: '12%' }}>
//                             <div className="position-relative">
//                                 <input
//                                     type="text"
//                                     name="fromDate"
//                                     id="fromDate"
//                                     ref={fromDateRef}
//                                     className={`form-control form-control-sm no-date-icon ${dateErrors.fromDate ? 'is-invalid' : ''}`}
//                                     value={dateRange.fromDate || ''}
//                                     onChange={(e) => {
//                                         const value = e.target.value;
//                                         const sanitizedValue = value.replace(/[^0-9/-]/g, '').slice(0, 10);
//                                         const adDate = convertBsToAd(sanitizedValue);
//                                         setDateRange(prev => ({
//                                             ...prev,
//                                             fromDate: sanitizedValue,
//                                             fromDateAd: adDate || prev.fromDateAd
//                                         }));
//                                         setDateErrors(prev => ({ ...prev, fromDate: '' }));
//                                     }}
//                                     onKeyDown={(e) => {
//                                         const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
//                                         if (!allowedKeys.includes(e.key) && !/^\d$/.test(e.key) && e.key !== '/' && e.key !== '-' && !e.ctrlKey && !e.metaKey) {
//                                             e.preventDefault();
//                                         }
//                                         if (e.key === 'Enter') {
//                                             e.preventDefault();
//                                             const dateStr = e.target.value.trim();
//                                             if (!dateStr) {
//                                                 const currentDate = company.dateFormat === 'nepali' ? new NepaliDate() : new Date();
//                                                 const correctedDate = company.dateFormat === 'nepali' ? currentDate.format('YYYY-MM-DD') : currentDate.toISOString().split('T')[0];
//                                                 setDateRange(prev => ({ ...prev, fromDate: correctedDate }));
//                                                 setDateErrors(prev => ({ ...prev, fromDate: '' }));
//                                                 setNotification({ show: true, message: 'Date required. Auto-corrected to current date.', type: 'warning', duration: 3000 });
//                                                 handleKeyDown(e, 'fromDateAd');
//                                             } else if (dateErrors.fromDate) {
//                                                 e.target.focus();
//                                             } else {
//                                                 handleKeyDown(e, 'fromDateAd');
//                                             }
//                                         }
//                                     }}
//                                     onBlur={(e) => {
//                                         const dateStr = e.target.value.trim();
//                                         if (!dateStr) return;
//                                         const correctedDate = validateAndCorrectNepaliDate(dateStr);
//                                         if (!correctedDate) {
//                                             const fallbackDate = currentNepaliDate;
//                                             const adDate = convertBsToAd(fallbackDate);
//                                             setDateRange(prev => ({ ...prev, fromDate: fallbackDate, fromDateAd: adDate }));
//                                             setNotification({ show: true, message: 'Invalid Nepali date. Auto-corrected to current date.', type: 'warning', duration: 3000 });
//                                         }
//                                     }}
//                                     placeholder="YYYY-MM-DD (BS)"
//                                     required
//                                     autoFocus
//                                     autoComplete="off"
//                                     style={{ height: '26px', fontSize: '0.875rem', paddingTop: '0.75rem', width: '100%' }}
//                                 />
//                                 <label className="position-absolute" style={{ top: '-0.5rem', left: '0.75rem', fontSize: '0.75rem', backgroundColor: 'white', padding: '0 0.25rem', color: '#6c757d', fontWeight: '500' }}>
//                                     From (BS): <span className="text-danger">*</span>
//                                 </label>
//                             </div>
//                         </div>

//                         {/* From Date AD Field */}
//                         <div className="col-12" style={{ flex: '0 0 auto', width: '12%' }}>
//                             <div className="position-relative">
//                                 <input
//                                     type="date"
//                                     name="fromDateAd"
//                                     id="fromDateAd"
//                                     className="form-control form-control-sm"
//                                     value={dateRange.fromDateAd || ''}
//                                     onChange={(e) => {
//                                         const value = e.target.value;
//                                         const bsDate = convertAdToBs(value);
//                                         setDateRange(prev => ({
//                                             ...prev,
//                                             fromDateAd: value,
//                                             fromDate: bsDate || prev.fromDate
//                                         }));
//                                     }}
//                                     onKeyDown={(e) => { if (e.key === 'Enter') handleKeyDown(e, 'toDate'); }}
//                                     style={{ height: '26px', fontSize: '0.875rem', paddingTop: '0.75rem', width: '100%' }}
//                                 />
//                                 <label className="position-absolute" style={{ top: '-0.5rem', left: '0.75rem', fontSize: '0.75rem', backgroundColor: 'white', padding: '0 0.25rem', color: '#6c757d', fontWeight: '500' }}>
//                                     From (AD):
//                                 </label>
//                             </div>
//                         </div>

//                         {/* To Date BS Field */}
//                         <div className="col-12" style={{ flex: '0 0 auto', width: '12%' }}>
//                             <div className="position-relative">
//                                 <input
//                                     type="text"
//                                     name="toDate"
//                                     id="toDate"
//                                     ref={toDateRef}
//                                     className={`form-control form-control-sm no-date-icon ${dateErrors.toDate ? 'is-invalid' : ''}`}
//                                     value={dateRange.toDate || ''}
//                                     onChange={(e) => {
//                                         const value = e.target.value;
//                                         const sanitizedValue = value.replace(/[^0-9/-]/g, '').slice(0, 10);
//                                         const adDate = convertBsToAd(sanitizedValue);
//                                         setDateRange(prev => ({
//                                             ...prev,
//                                             toDate: sanitizedValue,
//                                             toDateAd: adDate || prev.toDateAd
//                                         }));
//                                         setDateErrors(prev => ({ ...prev, toDate: '' }));
//                                     }}
//                                     onKeyDown={(e) => {
//                                         const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
//                                         if (!allowedKeys.includes(e.key) && !/^\d$/.test(e.key) && e.key !== '/' && e.key !== '-' && !e.ctrlKey && !e.metaKey) {
//                                             e.preventDefault();
//                                         }
//                                         if (e.key === 'Enter') {
//                                             e.preventDefault();
//                                             const dateStr = e.target.value.trim();
//                                             if (!dateStr) {
//                                                 const currentDate = company.dateFormat === 'nepali' ? new NepaliDate() : new Date();
//                                                 const correctedDate = company.dateFormat === 'nepali' ? currentDate.format('YYYY-MM-DD') : currentDate.toISOString().split('T')[0];
//                                                 setDateRange(prev => ({ ...prev, toDate: correctedDate }));
//                                                 setDateErrors(prev => ({ ...prev, toDate: '' }));
//                                                 setNotification({ show: true, message: 'Date required. Auto-corrected to current date.', type: 'warning', duration: 3000 });
//                                                 handleKeyDown(e, 'toDateAd');
//                                             } else if (dateErrors.toDate) {
//                                                 e.target.focus();
//                                             } else {
//                                                 handleKeyDown(e, 'toDateAd');
//                                             }
//                                         }
//                                     }}
//                                     onBlur={(e) => {
//                                         const dateStr = e.target.value.trim();
//                                         if (!dateStr) return;
//                                         const correctedDate = validateAndCorrectNepaliDate(dateStr);
//                                         if (!correctedDate) {
//                                             const fallbackDate = currentNepaliDate;
//                                             const adDate = convertBsToAd(fallbackDate);
//                                             setDateRange(prev => ({ ...prev, toDate: fallbackDate, toDateAd: adDate }));
//                                             setNotification({ show: true, message: 'Invalid Nepali date. Auto-corrected to current date.', type: 'warning', duration: 3000 });
//                                         }
//                                     }}
//                                     placeholder="YYYY-MM-DD (BS)"
//                                     required
//                                     autoComplete="off"
//                                     style={{ height: '26px', fontSize: '0.875rem', paddingTop: '0.75rem', width: '100%' }}
//                                 />
//                                 <label className="position-absolute" style={{ top: '-0.5rem', left: '0.75rem', fontSize: '0.75rem', backgroundColor: 'white', padding: '0 0.25rem', color: '#6c757d', fontWeight: '500' }}>
//                                     To (BS): <span className="text-danger">*</span>
//                                 </label>
//                             </div>
//                         </div>

//                         {/* To Date AD Field */}
//                         <div className="col-12" style={{ flex: '0 0 auto', width: '12%' }}>
//                             <div className="position-relative">
//                                 <input
//                                     type="date"
//                                     name="toDateAd"
//                                     id="toDateAd"
//                                     className="form-control form-control-sm"
//                                     value={dateRange.toDateAd || ''}
//                                     onChange={(e) => {
//                                         const value = e.target.value;
//                                         const bsDate = convertAdToBs(value);
//                                         setDateRange(prev => ({
//                                             ...prev,
//                                             toDateAd: value,
//                                             toDate: bsDate || prev.toDate
//                                         }));
//                                     }}
//                                     onKeyDown={(e) => { if (e.key === 'Enter') handleKeyDown(e, 'generateReport'); }}
//                                     style={{ height: '26px', fontSize: '0.875rem', paddingTop: '0.75rem', width: '100%' }}
//                                 />
//                                 <label className="position-absolute" style={{ top: '-0.5rem', left: '0.75rem', fontSize: '0.75rem', backgroundColor: 'white', padding: '0 0.25rem', color: '#6c757d', fontWeight: '500' }}>
//                                     To (AD):
//                                 </label>
//                             </div>
//                         </div>

//                         {/* Generate Report Button */}
//                         <div className="col-12 col-md-1">
//                             <button type="button" id="generateReport" ref={generateReportRef}
//                                 className="btn btn-primary btn-sm" onClick={handleGenerateReport}
//                                 style={{ height: '30px', fontSize: '0.8rem', padding: '0 12px', fontWeight: '500', whiteSpace: 'nowrap' }}>
//                                 <i className="bi bi-search"></i>Generate
//                             </button>
//                         </div>

//                         {/* Search Row */}
//                         <div className="col-12" style={{ flex: '0 0 auto', width: '12%' }}>
//                             <div className="position-relative">
//                                 <div className="input-group input-group-sm">
//                                     <input
//                                         type="text"
//                                         className="form-control form-control-sm"
//                                         id="searchInput"
//                                         ref={searchInputRef}
//                                         placeholder=""
//                                         value={searchQuery}
//                                         onChange={(e) => setSearchQuery(e.target.value)}
//                                         disabled={debitNotesArray.length === 0}
//                                         autoComplete='off'
//                                         style={{ height: '26px', fontSize: '0.875rem', paddingTop: '0.75rem', width: '100%' }}
//                                     />
//                                 </div>
//                                 <label className="position-absolute" style={{ top: '-0.5rem', left: '0.75rem', fontSize: '0.75rem', backgroundColor: 'white', padding: '0 0.25rem', color: '#6c757d', fontWeight: '500' }}>
//                                     Search
//                                 </label>
//                             </div>
//                         </div>

//                         <div className="col-12 col-md-auto d-flex align-items-end justify-content-end gap-2">
//                             <button className="btn btn-primary btn-sm d-flex align-items-center"
//                                 onClick={() => navigate('/retailer/debit-note')}
//                                 style={{ height: '30px', padding: '0 12px', fontSize: '0.8rem', fontWeight: '500', whiteSpace: 'nowrap' }}>
//                                 <i className="bi bi-plus-circle"></i>
//                             </button>
//                             <button className="btn btn-secondary btn-sm d-flex align-items-center"
//                                 onClick={() => handlePrint(true)} disabled={debitNotesArray.length === 0}
//                                 style={{ height: '30px', padding: '0 12px', fontSize: '0.8rem', fontWeight: '500', whiteSpace: 'nowrap' }}>
//                                 <i className="bi bi-printer"></i>
//                             </button>
//                             <button className="btn btn-secondary btn-sm d-flex align-items-center"
//                                 onClick={resetColumnWidths} title="Reset column widths to default"
//                                 style={{ height: '30px', padding: '0 12px', fontSize: '0.8rem', fontWeight: '500' }}>
//                                 <i className="bi bi-x-circle"></i>
//                             </button>
//                         </div>
//                     </div>

//                     {debitNotesArray.length === 0 && !loading ? (
//                         <div className="alert alert-info text-center py-3" style={{ fontSize: '0.875rem' }}>
//                             <i className="fas fa-info-circle me-2"></i>
//                             Please select date range and click "Generate Report" to view data
//                         </div>
//                     ) : (
//                         <>
//                             <div
//                                 style={{
//                                     height: "400px",
//                                     border: '1px solid #dee2e6',
//                                     backgroundColor: '#fff',
//                                     position: 'relative'
//                                 }}
//                                 ref={tableBodyRef}
//                             >
//                                 {loading ? (
//                                     <div className="d-flex flex-column justify-content-center align-items-center h-100">
//                                         <div className="spinner-border spinner-border-sm text-primary" role="status">
//                                             <span className="visually-hidden">Loading...</span>
//                                         </div>
//                                         <p className="mt-2 small text-muted" style={{ fontSize: '0.8rem' }}>
//                                             Loading debit notes...
//                                         </p>
//                                     </div>
//                                 ) : filteredDebitNotes.length === 0 ? (
//                                     <div className="d-flex flex-column justify-content-center align-items-center h-100">
//                                         <i className="bi bi-search text-muted" style={{ fontSize: '1.5rem' }}></i>
//                                         <h6 className="mt-2 text-muted" style={{ fontSize: '0.9rem' }}>
//                                             No debit notes found
//                                         </h6>
//                                         <p className="text-muted small" style={{ fontSize: '0.75rem' }}>
//                                             {searchQuery ? 'Try a different search term' : 'No data for the selected date range'}
//                                         </p>
//                                     </div>
//                                 ) : (
//                                     <AutoSizer>
//                                         {({ height, width }) => {
//                                             const totalWidth = columnWidths.bsDate + columnWidths.adDate +
//                                                 columnWidths.voucherNo + columnWidths.debitAccounts +
//                                                 columnWidths.debit + columnWidths.creditAccounts +
//                                                 columnWidths.credit + columnWidths.description + columnWidths.actions;

//                                             return (
//                                                 <div style={{ position: 'relative', height: height, width: Math.max(width, totalWidth) }}>
//                                                     <TableHeader />
//                                                     <List
//                                                         height={height - 28}
//                                                         itemCount={filteredDebitNotes.length}
//                                                         itemSize={28}
//                                                         width={Math.max(width, totalWidth)}
//                                                         itemData={{
//                                                             debitNotes: filteredDebitNotes,
//                                                             selectedRowIndex,
//                                                             formatCurrency,
//                                                             navigate,
//                                                             handleRowClick
//                                                         }}
//                                                     >
//                                                         {TableRow}
//                                                     </List>
//                                                 </div>
//                                             );
//                                         }}
//                                     </AutoSizer>
//                                 )}
//                             </div>

//                             {/* Footer with totals */}
//                             <div
//                                 className="d-flex bg-light border-top sticky-bottom"
//                                 style={{ zIndex: 2, height: '28px', borderTop: '2px solid #dee2e6' }}
//                             >
//                                 <div
//                                     className="d-flex align-items-center px-1"
//                                     style={{ width: `${columnWidths.bsDate + columnWidths.adDate + columnWidths.voucherNo + columnWidths.debitAccounts}px`, flexShrink: 0, height: '100%' }}
//                                 >
//                                     <strong style={{ fontSize: '0.75rem' }}>Total:</strong>
//                                 </div>
//                                 <div className="d-flex align-items-center justify-content-end px-1 border-start" style={{ width: `${columnWidths.debit}px`, flexShrink: 0, height: '100%' }}>
//                                     <strong style={{ fontSize: '0.75rem' }}>{formatCurrency(totalDebit)}</strong>
//                                 </div>
//                                 <div className="d-flex align-items-center px-1 border-start" style={{ width: `${columnWidths.creditAccounts + columnWidths.credit + columnWidths.description + columnWidths.actions}px`, flexShrink: 0, height: '100%' }}>
//                                     <strong style={{ fontSize: '0.75rem' }}>{formatCurrency(totalCredit)}</strong>
//                                 </div>
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

// export default DebitNoteRegister;

//-----------------------------------------------end1

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../Header';
import NepaliDate from 'nepali-datetime';
import { usePageNotRefreshContext } from '../PageNotRefreshContext';
import Loader from '../../Loader';
import ProductModal from '../dashboard/modals/ProductModal';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import NotificationToast from '../../NotificationToast';
import { FiFileText, FiPrinter, FiSearch, FiPlus, FiRefreshCw, FiCalendar } from 'react-icons/fi';
import './DebitNoteRegister.css';

// Helper functions for date conversion
const convertBsToAd = (bsDate) => {
    if (!bsDate || !/^\d{4}-\d{2}-\d{2}$/.test(bsDate)) return null;
    try {
        const nepaliDate = new NepaliDate(bsDate);
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
        } else { return null; }
        if (isNaN(date.getTime())) return null;
        const nepaliDate = new NepaliDate(date);
        return `${nepaliDate.getYear()}-${String(nepaliDate.getMonth() + 1).padStart(2, '0')}-${String(nepaliDate.getDate()).padStart(2, '0')}`;
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
        return nepaliDate.getYear() === year && nepaliDate.getMonth() + 1 === month && nepaliDate.getDate() === day;
    } catch { return false; }
};

const DebitNoteRegister = () => {
    const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
    const currentEnglishDate = new Date().toISOString().split('T')[0];

    const [dateErrors, setDateErrors] = useState({ fromDate: '', toDate: '' });
    const [notification, setNotification] = useState({
        show: false, message: '', type: 'success', duration: 3000
    });

    const { draftSave, setDraftSave } = usePageNotRefreshContext();
    const [showProductModal, setShowProductModal] = useState(false);

    const [company, setCompany] = useState({ dateFormat: 'english', vatEnabled: true, fiscalYear: {} });

    const [dateRange, setDateRange] = useState(() => {
        if (draftSave?.debitNoteData) {
            return { fromDate: draftSave.debitNoteData.fromDate || '', toDate: draftSave.debitNoteData.toDate || '', fromDateAd: draftSave.debitNoteData.fromDateAd || '', toDateAd: draftSave.debitNoteData.toDateAd || '' };
        }
        return { fromDate: '', toDate: '', fromDateAd: '', toDateAd: '' };
    });

    const [debitNotes, setDebitNotes] = useState(() => draftSave?.debitNoteData?.debitNotes || []);
    const [companyInfo, setCompanyInfo] = useState(() => {
        if (draftSave?.debitNoteData) {
            return {
                company: draftSave.debitNoteData.company, currentFiscalYear: draftSave.debitNoteData.currentFiscalYear,
                currentCompanyName: draftSave.debitNoteData.currentCompanyName || '', companyDateFormat: draftSave.debitNoteData.companyDateFormat || 'english',
                vatEnabled: draftSave.debitNoteData.vatEnabled !== undefined ? draftSave.debitNoteData.vatEnabled : true,
                isAdminOrSupervisor: draftSave.debitNoteData.isAdminOrSupervisor || false
            };
        }
        return { company: null, currentFiscalYear: null, currentCompanyName: '', companyDateFormat: 'english', vatEnabled: true, isAdminOrSupervisor: false };
    });

    const [searchQuery, setSearchQuery] = useState(() => draftSave?.debitNoteSearch?.searchQuery || '');
    const [selectedRowIndex, setSelectedRowIndex] = useState(() => draftSave?.debitNoteSearch?.selectedRowIndex || 0);

    const [columnWidths, setColumnWidths] = useState({
        bsDate: 80, adDate: 80, voucherNo: 100, debitAccounts: 150, debit: 80, creditAccounts: 150, credit: 80, description: 130, actions: 100
    });

    const [isResizing, setIsResizing] = useState(false);
    const [resizingColumn, setResizingColumn] = useState(null);
    const [startX, setStartX] = useState(0);
    const [startWidth, setStartWidth] = useState(0);

    const api = axios.create({
        baseURL: process.env.REACT_APP_API_BASE_URL,
        withCredentials: true,
    });
    api.interceptors.request.use((config) => {
        const token = localStorage.getItem('token');
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [totalDebit, setTotalDebit] = useState(0);
    const [totalCredit, setTotalCredit] = useState(0);
    const [filteredDebitNotes, setFilteredDebitNotes] = useState([]);

    const fromDateRef = useRef(null);
    const toDateRef = useRef(null);
    const searchInputRef = useRef(null);
    const generateReportRef = useRef(null);
    const tableBodyRef = useRef(null);
    const [shouldFetch, setShouldFetch] = useState(false);
    const navigate = useNavigate();

    const validateAndCorrectNepaliDate = (dateStr) => {
        if (!dateStr) return null;
        if (isValidNepaliDate(dateStr)) return dateStr;
        const match = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        if (match) {
            let [_, year, month, day] = match;
            month = Math.min(12, Math.max(1, parseInt(month, 10)));
            day = Math.min(32, Math.max(1, parseInt(day, 10)));
            const correctedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            return isValidNepaliDate(correctedDate) ? correctedDate : null;
        }
        return null;
    };

    // Fetch company and fiscal year info
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const response = await api.get('/api/retailer/debit-note/entry-data');
                if (response.data.success) {
                    const responseData = response.data.data;
                    const dateFormat = responseData.company.dateFormat?.toLowerCase() || 'english';
                    const isNepaliFormat = dateFormat === 'nepali';
                    setCompany({ ...responseData.company, dateFormat: dateFormat, vatEnabled: responseData.company.vatEnabled || true });

                    const currentFiscalYear = responseData.currentFiscalYear;
                    const hasDraftDates = draftSave?.debitNoteData?.fromDate && draftSave?.debitNoteData?.toDate;

                    if (!hasDraftDates && currentFiscalYear) {
                        let fromDateFormatted = '', toDateFormatted = '', fromDateAd = '', toDateAd = '';
                        if (isNepaliFormat) {
                            fromDateFormatted = currentFiscalYear.startDateNepali || currentNepaliDate;
                            toDateFormatted = currentNepaliDate;
                            fromDateAd = convertBsToAd(fromDateFormatted);
                            toDateAd = convertBsToAd(toDateFormatted);
                        } else {
                            fromDateFormatted = currentFiscalYear.startDate ? new Date(currentFiscalYear.startDate).toISOString().split('T')[0] : currentEnglishDate;
                            toDateFormatted = currentFiscalYear.endDate ? new Date(currentFiscalYear.endDate).toISOString().split('T')[0] : currentEnglishDate;
                            fromDateAd = fromDateFormatted; toDateAd = toDateFormatted;
                        }
                        setDateRange({ fromDate: fromDateFormatted, toDate: toDateFormatted, fromDateAd, toDateAd });
                    } else if (hasDraftDates) {
                        let fromDateAd = dateRange.fromDate;
                        let toDateAd = dateRange.toDate;
                        if (isNepaliFormat && dateRange.fromDate) {
                            fromDateAd = convertBsToAd(dateRange.fromDate);
                            toDateAd = convertBsToAd(dateRange.toDate);
                        }
                        setDateRange(prev => ({ ...prev, fromDateAd: fromDateAd || prev.fromDateAd, toDateAd: toDateAd || prev.toDateAd }));
                    }

                    setCompanyInfo({
                        company: responseData.company, currentFiscalYear: currentFiscalYear,
                        currentCompanyName: responseData.company.name, companyDateFormat: responseData.company.dateFormat,
                        vatEnabled: responseData.company.vatEnabled, isAdminOrSupervisor: responseData.permissions?.isAdminOrSupervisor || false
                    });
                }
            } catch (err) {
                setNotification({ show: true, message: 'Error loading company data', type: 'error' });
            }
        };
        fetchInitialData();
    }, []);

    // Save data and search state to draft context
    useEffect(() => {
        setDraftSave({
            ...draftSave,
            debitNoteData: { ...companyInfo, debitNotes: debitNotes, fromDate: dateRange.fromDate, toDate: dateRange.toDate, fromDateAd: dateRange.fromDateAd, toDateAd: dateRange.toDateAd },
            debitNoteSearch: { searchQuery, selectedRowIndex, fromDate: dateRange.fromDate, toDate: dateRange.toDate }
        });
    }, [debitNotes, searchQuery, selectedRowIndex, dateRange, companyInfo]);

    // Save/load column widths
    useEffect(() => {
        const savedWidths = localStorage.getItem('debitNoteTableColumnWidths');
        if (savedWidths) try { setColumnWidths(JSON.parse(savedWidths)); } catch (e) {}
    }, []);
    useEffect(() => localStorage.setItem('debitNoteTableColumnWidths', JSON.stringify(columnWidths)), [columnWidths]);

    // Fetch data when generate report is clicked
    useEffect(() => {
        const abortController = new AbortController();
        const fetchData = async () => {
            if (!shouldFetch) return;
            try {
                setLoading(true);
                const params = new URLSearchParams();
                if (dateRange.fromDateAd) params.append('fromDate', dateRange.fromDateAd);
                if (dateRange.toDateAd) params.append('toDate', dateRange.toDateAd);

                const response = await api.get(`/api/retailer/debit-note/register?${params.toString()}`, { signal: abortController.signal });

                if (response.data.success) {
                    setDebitNotes(response.data.data.debitNotes || []);
                    if (response.data.data.vatEnabled !== undefined) setCompanyInfo(prev => ({ ...prev, vatEnabled: response.data.data.vatEnabled }));
                    setError(null);
                } else {
                    setError(response.data.error || 'Failed to fetch debit notes');
                }
                if (!draftSave?.debitNoteSearch?.selectedRowIndex) setSelectedRowIndex(0);
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error('Fetch error:', err);
                    setError(err.response?.data?.error || 'Failed to fetch debit notes');
                }
            } finally {
                setLoading(false);
                setShouldFetch(false);
            }
        };
        fetchData();
        return () => abortController.abort();
    }, [shouldFetch, dateRange.fromDateAd, dateRange.toDateAd]);

    // Filter debit notes based on search query
    useEffect(() => {
        const debitNotesArray = Array.isArray(debitNotes) ? debitNotes : [];
        const filtered = debitNotesArray.filter(debitNote => {
            const matchesSearch = (debitNote.billNumber?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                (debitNote.description?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                (debitNote.debitAccountNames?.some(name => name?.toLowerCase().includes(searchQuery.toLowerCase())) || false) ||
                (debitNote.creditAccountNames?.some(name => name?.toLowerCase().includes(searchQuery.toLowerCase())) || false) ||
                (debitNote.userName?.toLowerCase() || '').includes(searchQuery.toLowerCase());
            return matchesSearch;
        });
        setFilteredDebitNotes(filtered);
        if (selectedRowIndex >= filtered.length && filtered.length > 0) setSelectedRowIndex(0);
    }, [debitNotes, searchQuery]);

    // Calculate totals
    useEffect(() => {
        if (filteredDebitNotes.length === 0) { setTotalDebit(0); setTotalCredit(0); return; }
        const newTotalDebit = filteredDebitNotes.reduce((acc, debitNote) => {
            if (debitNote.status !== 'Active') return acc;
            return acc + (debitNote.debitAmounts?.reduce((sum, amt) => sum + (amt || 0), 0) || 0);
        }, 0);
        const newTotalCredit = filteredDebitNotes.reduce((acc, debitNote) => {
            if (debitNote.status !== 'Active') return acc;
            return acc + (debitNote.creditAmounts?.reduce((sum, amt) => sum + (amt || 0), 0) || 0);
        }, 0);
        setTotalDebit(newTotalDebit);
        setTotalCredit(newTotalCredit);
    }, [filteredDebitNotes]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (filteredDebitNotes.length === 0) return;
            if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT') return;
            switch (e.key) {
                case 'ArrowUp': e.preventDefault(); setSelectedRowIndex(prev => Math.max(0, prev - 1)); break;
                case 'ArrowDown': e.preventDefault(); setSelectedRowIndex(prev => Math.min(filteredDebitNotes.length - 1, prev + 1)); break;
                default: break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [filteredDebitNotes]);

    useEffect(() => {
        const handleF9KeyDown = (e) => { if (e.key === 'F9') { e.preventDefault(); setShowProductModal(prev => !prev); } };
        window.addEventListener('keydown', handleF9KeyDown);
        return () => window.removeEventListener('keydown', handleF9KeyDown);
    }, []);

    function shallowEqual(objA, objB) {
        if (objA === objB) return true;
        if (typeof objA !== 'object' || objA === null || typeof objB !== 'object' || objB === null) return false;
        const keysA = Object.keys(objA); const keysB = Object.keys(objB);
        if (keysA.length !== keysB.length) return false;
        for (let i = 0; i < keysA.length; i++) {
            if (!objB.hasOwnProperty(keysA[i]) || objA[keysA[i]] !== objB[keysA[i]]) return false;
        }
        return true;
    }

    const handleGenerateReport = () => {
        if (!dateRange.fromDate || !dateRange.toDate) { setError('Please select both from and to dates'); return; }
        setShouldFetch(true);
    };

    const handlePrint = (filtered = false) => {
        const rowsToPrint = filtered ? filteredDebitNotes : (Array.isArray(debitNotes) ? debitNotes : []);
        if (rowsToPrint.length === 0) { setNotification({ show: true, message: 'No debit notes to print', type: 'warning' }); return; }

        const printWindow = window.open('', '_blank');
        let tableContent = `
            <style>
                @page { margin: 3mm; } body { font-family: Arial, sans-serif; font-size: 7px; margin: 0; padding: 2mm; }
                table { width: 100%; border-collapse: collapse; page-break-inside: auto; font-size: 6px; }
                th, td { border: 1px solid #000; padding: 2px 3px; text-align: left; white-space: nowrap; }
                th { background-color: #f2f2f2 !important; -webkit-print-color-adjust: exact; font-size: 10px; font-weight: bold; }
                .print-header { text-align: center; margin-bottom: 5px; }
                .report-title { text-align: center; text-decoration: underline; font-size: 11px; font-weight: bold; margin: 3px 0; }
                .grand-total-row td { font-weight: bold; border-top: 2px solid #000; font-size: 7px; }
                .text-danger { color: #dc3545 !important; }
            </style>
            <div class="print-header"><h1>${companyInfo.currentCompanyName || 'Company Name'}</h1><p>${companyInfo.company?.address || ''}${companyInfo.company?.city ? ', ' + companyInfo.company.city : ''}, PAN: ${companyInfo.company?.pan || ''}</p><hr></div>
            <div class="report-title">Debit Note Register</div>
            <table><thead><tr><th>Miti</th><th>Date</th><th>Vch No.</th><th>Debit Accounts</th><th>Debit</th><th>Credit Accounts</th><th>Credit</th><th>Description</th></tr></thead><tbody>
        `;
        let printTotalDebit = 0;
        let printTotalCredit = 0;
        rowsToPrint.forEach(debitNote => {
            const isCanceled = debitNote.status !== 'Active';
            const debitAccountsDisplay = isCanceled ? 'Canceled' : (debitNote.debitAccountNames?.join(', ') || 'N/A');
            const debitAmountsDisplay = isCanceled ? '0.00' : (debitNote.debitAmounts?.map(amt => amt?.toFixed(2)).join(', ') || '0.00');
            const creditAccountsDisplay = isCanceled ? 'Canceled' : (debitNote.creditAccountNames?.join(', ') || 'N/A');
            const creditAmountsDisplay = isCanceled ? '0.00' : (debitNote.creditAmounts?.map(amt => amt?.toFixed(2)).join(', ') || '0.00');
            tableContent += `<tr><td>${debitNote.nepaliDate || ''}</td><td>${debitNote.date ? new Date(debitNote.date).toLocaleDateString() : ''}</td><td>${debitNote.billNumber || ''}</td><td>${isCanceled ? '<span class="text-danger">Canceled</span>' : debitAccountsDisplay}</td><td class="text-end">${isCanceled ? '<span class="text-danger">0.00</span>' : debitAmountsDisplay}</td><td>${isCanceled ? '<span class="text-danger">Canceled</span>' : creditAccountsDisplay}</td><td class="text-end">${isCanceled ? '<span class="text-danger">0.00</span>' : creditAmountsDisplay}</td><td>${debitNote.description || ''}</td></tr>`;
            if (!isCanceled) {
                printTotalDebit += debitNote.debitAmounts?.reduce((sum, amt) => sum + (amt || 0), 0) || 0;
                printTotalCredit += debitNote.creditAmounts?.reduce((sum, amt) => sum + (amt || 0), 0) || 0;
            }
        });
        tableContent += `<tr class="grand-total-row"><td colspan="4">Grand Totals</td><td class="text-end">${printTotalDebit.toFixed(2)}</td><td></td><td class="text-end">${printTotalCredit.toFixed(2)}</td><td></td></tr></tbody></table>
            <script>window.onload=function(){window.print();window.onafterprint=function(){window.close()}}<\/script>
        `;
        printWindow.document.write(`<!DOCTYPE html><html><head><title>Debit Note Register</title></head><body>${tableContent}</body></html>`);
        printWindow.document.close();
    };

    const formatCurrency = useCallback((num) => {
        const number = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num) || 0;
        return number.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }, []);

    const handleRowClick = useCallback((index) => setSelectedRowIndex(index), []);

    const handleRowDoubleClick = useCallback(() => {
        if (filteredDebitNotes[selectedRowIndex]) navigate(`/retailer/debit-note/${filteredDebitNotes[selectedRowIndex].id}/print`);
    }, [navigate, filteredDebitNotes, selectedRowIndex]);

    const handleKeyDown = (e, nextFieldId) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (nextFieldId) document.getElementById(nextFieldId)?.focus();
        }
    };

    const ResizeHandle = React.memo(({ onResizeStart, left, columnName }) => (
        <div className="dn-resize-handle" style={{ position: 'absolute', top: 0, left: `${left}px`, width: '5px', height: '100%', cursor: 'col-resize', zIndex: 10 }} onMouseDown={(e) => { e.preventDefault(); onResizeStart(e, columnName); }} />
    ));

    const TableHeader = React.memo(() => {
        const totalWidth = Object.values(columnWidths).reduce((a, b) => a + b, 0);
        const handleResizeStart = (e, columnName) => {
            setIsResizing(true); setResizingColumn(columnName); setStartX(e.clientX); setStartWidth(columnWidths[columnName]); e.preventDefault();
        };
        return (
            <div className="dn-header" style={{ minWidth: `${totalWidth}px` }}
                onMouseMove={(e) => { if (isResizing && resizingColumn) setColumnWidths(prev => ({ ...prev, [resizingColumn]: Math.max(60, startWidth + e.clientX - startX) })); }}
                onMouseUp={() => { setIsResizing(false); setResizingColumn(null); }}
                onMouseLeave={() => { setIsResizing(false); setResizingColumn(null); }}
            >
                <div className="dn-header-cell dn-cell--center" style={{ width: `${columnWidths.bsDate}px`, flexShrink: 0 }}>Miti<ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.bsDate - 2} columnName="bsDate" /></div>
                <div className="dn-header-cell dn-cell--center" style={{ width: `${columnWidths.adDate}px`, flexShrink: 0 }}>Date<ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.adDate - 2} columnName="adDate" /></div>
                <div className="dn-header-cell" style={{ width: `${columnWidths.voucherNo}px`, flexShrink: 0 }}>Vch No.<ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.voucherNo - 2} columnName="voucherNo" /></div>
                <div className="dn-header-cell" style={{ width: `${columnWidths.debitAccounts}px`, flexShrink: 0 }}>Debit A/cs<ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.debitAccounts - 2} columnName="debitAccounts" /></div>
                <div className="dn-header-cell dn-cell--end" style={{ width: `${columnWidths.debit}px`, flexShrink: 0 }}>Debit<ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.debit - 2} columnName="debit" /></div>
                <div className="dn-header-cell" style={{ width: `${columnWidths.creditAccounts}px`, flexShrink: 0 }}>Credit A/cs<ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.creditAccounts - 2} columnName="creditAccounts" /></div>
                <div className="dn-header-cell dn-cell--end" style={{ width: `${columnWidths.credit}px`, flexShrink: 0 }}>Credit<ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.credit - 2} columnName="credit" /></div>
                <div className="dn-header-cell" style={{ width: `${columnWidths.description}px`, flexShrink: 0 }}>Description<ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.description - 2} columnName="description" /></div>
                <div className="dn-header-cell" style={{ width: `${columnWidths.actions}px`, flexShrink: 0 }}>Actions<ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.actions - 2} columnName="actions" /></div>
                {isResizing && <div style={{ position: 'fixed', inset: 0, zIndex: 1000, cursor: 'col-resize' }} />}
            </div>
        );
    });

    const TableRow = React.memo(({ index, style, data }) => {
        const { debitNotes, selectedRowIndex, formatCurrency, navigate, handleRowClick } = data;
        const debitNote = debitNotes[index];
        if (!debitNote) return null;
        const isSelected = selectedRowIndex === index;
        const isCanceled = debitNote.status !== 'Active';
        const canEdit = companyInfo.isAdminOrSupervisor;

        const debitAccountsDisplay = debitNote.debitAccountNames?.join(', ') || 'N/A';
        const debitAmountsDisplay = debitNote.debitAmounts?.map(amt => formatCurrency(amt)).join(', ') || '0.00';
        const creditAccountsDisplay = debitNote.creditAccountNames?.join(', ') || 'N/A';
        const creditAmountsDisplay = debitNote.creditAmounts?.map(amt => formatCurrency(amt)).join(', ') || '0.00';

        return (
            <div style={{ ...style, display: 'flex', alignItems: 'center', height: '28px', borderBottom: '1px solid #e2e8f0', cursor: 'pointer', backgroundColor: isSelected ? '#eff6ff' : (index % 2 === 0 ? '#f8fafc' : 'white') }} className="dn-row" onClick={() => handleRowClick(index)} onDoubleClick={() => { if (debitNote && debitNote.id) navigate(`/retailer/debit-note/${debitNote.id}/print`); }}>
                <div className="dn-cell dn-cell--center" style={{ width: `${columnWidths.bsDate}px`, flexShrink: 0 }}><span>{debitNote.nepaliDate || ''}</span></div>
                <div className="dn-cell dn-cell--center" style={{ width: `${columnWidths.adDate}px`, flexShrink: 0 }}><span>{debitNote.date ? new Date(debitNote.date).toLocaleDateString() : ''}</span></div>
                <div className="dn-cell" style={{ width: `${columnWidths.voucherNo}px`, flexShrink: 0 }}><span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{debitNote.billNumber || ''}</span></div>
                <div className="dn-cell" style={{ width: `${columnWidths.debitAccounts}px`, flexShrink: 0 }} title={debitAccountsDisplay}><span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: isCanceled ? '#dc2626' : 'inherit' }}>{isCanceled ? 'Canceled' : debitAccountsDisplay}</span></div>
                <div className="dn-cell dn-cell--end" style={{ width: `${columnWidths.debit}px`, flexShrink: 0 }} title={debitAmountsDisplay}><span style={{ color: isCanceled ? '#dc2626' : 'inherit' }}>{isCanceled ? '0.00' : debitAmountsDisplay}</span></div>
                <div className="dn-cell" style={{ width: `${columnWidths.creditAccounts}px`, flexShrink: 0 }} title={creditAccountsDisplay}><span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: isCanceled ? '#dc2626' : 'inherit' }}>{isCanceled ? 'Canceled' : creditAccountsDisplay}</span></div>
                <div className="dn-cell dn-cell--end" style={{ width: `${columnWidths.credit}px`, flexShrink: 0 }} title={creditAmountsDisplay}><span style={{ color: isCanceled ? '#dc2626' : 'inherit' }}>{isCanceled ? '0.00' : creditAmountsDisplay}</span></div>
                <div className="dn-cell" style={{ width: `${columnWidths.description}px`, flexShrink: 0 }} title={debitNote.description || ''}><span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{debitNote.description || ''}</span></div>
                <div className="dn-cell dn-cell--center gap-1" style={{ width: `${columnWidths.actions}px`, flexShrink: 0 }}>
                    <button className="dn-btn-action dn-btn-action--info" onClick={(e) => { e.stopPropagation(); if (debitNote && debitNote.id) navigate(`/retailer/debit-note/${debitNote.id}/print`); }} title="View"><i className="bi bi-eye" /></button>
                    {canEdit && !isCanceled && (
                        <button className="dn-btn-action dn-btn-action--warning" onClick={(e) => { e.stopPropagation(); if (debitNote && debitNote.id) navigate(`/retailer/debit-note/edit/${debitNote.id}`); }} title="Edit"><i className="bi bi-pencil-square" /></button>
                    )}
                </div>
            </div>
        );
    }, (prevProps, nextProps) => {
        if (prevProps.index !== nextProps.index) return false;
        if (prevProps.style !== nextProps.style) return false;
        const prevDebitNote = prevProps.data.debitNotes[prevProps.index];
        const nextDebitNote = nextProps.data.debitNotes[nextProps.index];
        return shallowEqual(prevDebitNote, nextDebitNote) && prevProps.data.selectedRowIndex === nextProps.data.selectedRowIndex;
    });

    const resetColumnWidths = () => {
        setColumnWidths({ bsDate: 80, adDate: 80, voucherNo: 100, debitAccounts: 150, debit: 80, creditAccounts: 150, credit: 80, description: 130, actions: 100 });
        setNotification({ show: true, message: 'Column widths reset', type: 'success', duration: 2000 });
    };

    if (loading && debitNotes.length === 0) return <Loader />;
    if (error) return <div className="dn-page"><Header /><div className="dn-shell"><div className="dn-state"><h3>Error</h3><p>{error}</p></div></div></div>;

    const debitNotesArray = Array.isArray(debitNotes) ? debitNotes : [];

    return (
        <div className="dn-page">
            <Header />

            <div className="dn-shell">
                {/* Top Bar */}
                <div className="dn-topbar">
                    <div className="dn-topbar__left">
                        <div className="dn-topbar__icon"><FiFileText /></div>
                        <div><h1>Debit Note Register</h1></div>
                    </div>
                    <div className="dn-topbar__actions">
                        <button className="dn-btn-icon" onClick={() => navigate('/retailer/debit-note')} title="Add Debit Note"><FiPlus /> Add</button>
                        <button className="dn-btn-icon" onClick={() => handlePrint(true)} disabled={debitNotesArray.length === 0}><FiPrinter /> Print</button>
                        <button className="dn-btn-icon" onClick={resetColumnWidths} title="Reset columns"><FiRefreshCw /> Reset</button>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="dn-toolbar">
                    <div className="dn-field dn-field--date">
                        <label>From (BS) <span className="req">*</span></label>
                        <input type="text" id="fromDate" ref={fromDateRef} className={dateErrors.fromDate ? 'is-invalid' : ''} value={dateRange.fromDate || ''} onChange={(e) => { const v = e.target.value.replace(/[^0-9/-]/g, '').slice(0, 10); setDateRange(p => ({ ...p, fromDate: v, fromDateAd: convertBsToAd(v) || p.fromDateAd })); setDateErrors(p => ({ ...p, fromDate: '' })); }} onKeyDown={(e) => handleKeyDown(e, 'fromDateAd')} onBlur={(e) => { const d = e.target.value.trim(); if (!d) return; const c = validateAndCorrectNepaliDate(d); if (!c) { const ad = convertBsToAd(currentNepaliDate); setDateRange(p => ({ ...p, fromDate: currentNepaliDate, fromDateAd: ad })); setNotification({ show: true, message: 'Invalid Nepali date. Auto-corrected.', type: 'warning' }); } }} placeholder="YYYY-MM-DD" autoComplete="off" autoFocus />
                        {dateErrors.fromDate && <div className="dn-field-error">{dateErrors.fromDate}</div>}
                    </div>
                    <div className="dn-field dn-field--date">
                        <label>From (AD)</label>
                        <input type="date" id="fromDateAd" value={dateRange.fromDateAd || ''} onChange={(e) => { const v = e.target.value; setDateRange(p => ({ ...p, fromDateAd: v, fromDate: convertAdToBs(v) || p.fromDate })); }} onKeyDown={(e) => handleKeyDown(e, 'toDate')} />
                    </div>
                    <div className="dn-field dn-field--date">
                        <label>To (BS) <span className="req">*</span></label>
                        <input type="text" id="toDate" ref={toDateRef} className={dateErrors.toDate ? 'is-invalid' : ''} value={dateRange.toDate || ''} onChange={(e) => { const v = e.target.value.replace(/[^0-9/-]/g, '').slice(0, 10); setDateRange(p => ({ ...p, toDate: v, toDateAd: convertBsToAd(v) || p.toDateAd })); setDateErrors(p => ({ ...p, toDate: '' })); }} onKeyDown={(e) => handleKeyDown(e, 'toDateAd')} onBlur={(e) => { const d = e.target.value.trim(); if (!d) return; const c = validateAndCorrectNepaliDate(d); if (!c) { const ad = convertBsToAd(currentNepaliDate); setDateRange(p => ({ ...p, toDate: currentNepaliDate, toDateAd: ad })); setNotification({ show: true, message: 'Invalid Nepali date. Auto-corrected.', type: 'warning' }); } }} placeholder="YYYY-MM-DD" autoComplete="off" />
                        {dateErrors.toDate && <div className="dn-field-error">{dateErrors.toDate}</div>}
                    </div>
                    <div className="dn-field dn-field--date">
                        <label>To (AD)</label>
                        <input type="date" id="toDateAd" value={dateRange.toDateAd || ''} onChange={(e) => { const v = e.target.value; setDateRange(p => ({ ...p, toDateAd: v, toDate: convertAdToBs(v) || p.toDate })); }} onKeyDown={(e) => handleKeyDown(e, 'generateReport')} />
                    </div>

                    <button type="button" id="generateReport" ref={generateReportRef} className="dn-btn-gen" onClick={handleGenerateReport} disabled={loading}>
                        {loading ? <span className="spinner-border spinner-border-sm" style={{ width: 12, height: 12 }} /> : <><FiSearch className="me-1" /> Generate</>}
                    </button>

                    <div className="dn-toolbar-divider" />

                    <div className="dn-field dn-field--search">
                        <label>Search</label>
                        <div className="dn-search-wrap">
                            <FiSearch className="dn-search-icon" />
                            <input type="text" id="searchInput" ref={searchInputRef} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} disabled={debitNotesArray.length === 0} autoComplete="off" />
                            {searchQuery && <button className="dn-search-clear" onClick={() => setSearchQuery('')}>×</button>}
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="dn-alert">
                        <i className="bi bi-exclamation-circle" />{error}
                        <button type="button" className="btn-close btn-sm ms-auto" onClick={() => setError(null)} />
                    </div>
                )}

                {/* Main Content */}
                <div className="dn-main">
                    {debitNotesArray.length === 0 && !loading ? (
                        <div className="dn-state">
                            <FiCalendar size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                            <h3>Select date range & generate</h3>
                            <p>Choose a date range and click Generate.</p>
                        </div>
                    ) : loading ? (
                        <div className="dn-state"><div className="spinner-border text-primary" /><p>Loading debit notes...</p></div>
                    ) : filteredDebitNotes.length === 0 ? (
                        <div className="dn-state"><FiSearch size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} /><h3>No debit notes found</h3><p>{searchQuery ? 'Try a different search term' : 'No data for the selected date range'}</p></div>
                    ) : (
                        <>
                            <div className="dn-main__bar">
                                <span><strong>{filteredDebitNotes.length}</strong> debit notes</span>
                                <span>{dateRange.fromDate} — {dateRange.toDate}</span>
                            </div>

                            <div className="dn-table-wrap" ref={tableBodyRef}>
                                <AutoSizer>
                                    {({ height, width }) => {
                                        const totalWidth = Object.values(columnWidths).reduce((a, b) => a + b, 0);
                                        return (
                                            <div style={{ position: 'relative', height: height, width: Math.max(width, totalWidth) }}>
                                                <TableHeader />
                                                <List height={height - 28} itemCount={filteredDebitNotes.length} itemSize={28} width={Math.max(width, totalWidth)} itemData={{ debitNotes: filteredDebitNotes, selectedRowIndex, formatCurrency, navigate, handleRowClick }}>{TableRow}</List>
                                            </div>
                                        );
                                    }}
                                </AutoSizer>
                            </div>

                            {/* ✅ FIXED FOOTER: Aligns Debit and Credit in a single row correctly */}
                            <div className="dn-footer">
                                <div className="dn-footer-cell" style={{ width: `${columnWidths.bsDate + columnWidths.adDate + columnWidths.voucherNo + columnWidths.debitAccounts}px`, flexShrink: 0 }}>
                                    <strong>Total:</strong>
                                </div>
                                <div className="dn-footer-cell dn-cell--end" style={{ width: `${columnWidths.debit}px`, flexShrink: 0 }}>
                                    <strong>{formatCurrency(totalDebit)}</strong>
                                </div>
                                <div className="dn-footer-cell" style={{ width: `${columnWidths.creditAccounts}px`, flexShrink: 0, borderRight: '1px solid var(--dn-border)' }}>
                                    {/* Empty spacer for Credit Accounts column */}
                                </div>
                                <div className="dn-footer-cell dn-cell--end" style={{ width: `${columnWidths.credit}px`, flexShrink: 0 }}>
                                    <strong>{formatCurrency(totalCredit)}</strong>
                                </div>
                                <div className="dn-footer-cell" style={{ flex: 1, minWidth: `${columnWidths.description + columnWidths.actions}px` }}>
                                    {/* Empty spacer for Description and Actions columns */}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {showProductModal && <ProductModal onClose={() => setShowProductModal(false)} />}
            <NotificationToast show={notification.show} message={notification.message} type={notification.type} duration={notification.duration} onClose={() => setNotification({ ...notification, show: false })} />
        </div>
    );
};

export default DebitNoteRegister;