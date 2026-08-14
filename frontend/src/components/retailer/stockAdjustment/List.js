// import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
// import { useNavigate } from 'react-router-dom';
// import axios from 'axios';
// import '../../../stylesheet/retailer/salesReturn/List.css';
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

// const StockAdjustmentsList = () => {
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
//         isVatExempt: false,
//         vatEnabled: true,
//         fiscalYear: {}
//     });

//     // SPLIT STATE: Separate date range from adjustments and company info
//     const [dateRange, setDateRange] = useState(() => {
//         if (draftSave && draftSave.stockAdjustmentsData) {
//             return {
//                 fromDate: draftSave.stockAdjustmentsData.fromDate || '',
//                 toDate: draftSave.stockAdjustmentsData.toDate || '',
//                 fromDateAd: draftSave.stockAdjustmentsData.fromDateAd || '',
//                 toDateAd: draftSave.stockAdjustmentsData.toDateAd || ''
//             };
//         }
//         return {
//             fromDate: '',
//             toDate: '',
//             fromDateAd: '',
//             toDateAd: ''
//         };
//     });

//     const [adjustments, setAdjustments] = useState(() => {
//         if (draftSave && draftSave.stockAdjustmentsData) {
//             return draftSave.stockAdjustmentsData.stockAdjustments || [];
//         }
//         return [];
//     });

//     const [companyInfo, setCompanyInfo] = useState(() => {
//         if (draftSave && draftSave.stockAdjustmentsData) {
//             return {
//                 company: draftSave.stockAdjustmentsData.company,
//                 currentFiscalYear: draftSave.stockAdjustmentsData.currentFiscalYear,
//                 currentCompanyName: draftSave.stockAdjustmentsData.currentCompanyName || '',
//                 companyDateFormat: draftSave.stockAdjustmentsData.companyDateFormat || 'english',
//                 vatEnabled: draftSave.stockAdjustmentsData.vatEnabled !== undefined ? draftSave.stockAdjustmentsData.vatEnabled : true,
//                 isVatExempt: draftSave.stockAdjustmentsData.isVatExempt || false,
//                 isAdminOrSupervisor: draftSave.stockAdjustmentsData.isAdminOrSupervisor || false
//             };
//         }
//         return {
//             company: null,
//             currentFiscalYear: null,
//             currentCompanyName: '',
//             companyDateFormat: 'english',
//             vatEnabled: true,
//             isVatExempt: false,
//             isAdminOrSupervisor: false
//         };
//     });

//     const [searchQuery, setSearchQuery] = useState(() => {
//         if (draftSave && draftSave.stockAdjustmentsSearch) {
//             return draftSave.stockAdjustmentsSearch.searchQuery || '';
//         }
//         return '';
//     });

//     const [adjustmentTypeFilter, setAdjustmentTypeFilter] = useState(() => {
//         if (draftSave && draftSave.stockAdjustmentsSearch) {
//             return draftSave.stockAdjustmentsSearch.adjustmentTypeFilter || '';
//         }
//         return '';
//     });

//     const [selectedRowIndex, setSelectedRowIndex] = useState(() => {
//         if (draftSave && draftSave.stockAdjustmentsSearch) {
//             return draftSave.stockAdjustmentsSearch.selectedRowIndex || 0;
//         }
//         return 0;
//     });

//     // Column resizing state - Updated with BS and AD date columns
//     const [columnWidths, setColumnWidths] = useState({
//         bsDate: 80,
//         adDate: 80,
//         vchNo: 100,
//         itemDescription: 180,
//         quantity: 70,
//         unit: 60,
//         rate: 70,
//         type: 80,
//         reason: 130,
//         user: 100,
//         actions: 120
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
//                 const response = await api.get('/api/retailer/stock-adjustments/register/entry-data');

//                 if (response.data.success) {
//                     const responseData = response.data.data;

//                     const dateFormat = responseData.company.dateFormat?.toLowerCase() || 'english';
//                     const isNepaliFormat = dateFormat === 'nepali';

//                     setCompany({
//                         ...responseData.company,
//                         dateFormat: dateFormat,
//                         vatEnabled: responseData.company.vatEnabled || true,
//                         isVatExempt: responseData.company.isVatExempt || false
//                     });

//                     const currentFiscalYear = responseData.currentFiscalYear;
//                     const hasDraftDates = draftSave?.stockAdjustmentsData?.fromDate &&
//                         draftSave?.stockAdjustmentsData?.toDate;

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
//                         isVatExempt: responseData.company.isVatExempt || false,
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
//     const [totalQuantity, setTotalQuantity] = useState(0);
//     const [filteredAdjustments, setFilteredAdjustments] = useState([]);

//     const fromDateRef = useRef(null);
//     const toDateRef = useRef(null);
//     const searchInputRef = useRef(null);
//     const adjustmentTypeFilterRef = useRef(null);
//     const generateReportRef = useRef(null);
//     const tableBodyRef = useRef(null);
//     const [shouldFetch, setShouldFetch] = useState(false);
//     const navigate = useNavigate();

//     // Save data and search state to draft context
//     useEffect(() => {
//         setDraftSave({
//             ...draftSave,
//             stockAdjustmentsData: {
//                 ...companyInfo,
//                 stockAdjustments: adjustments,
//                 fromDate: dateRange.fromDate,
//                 toDate: dateRange.toDate,
//                 fromDateAd: dateRange.fromDateAd,
//                 toDateAd: dateRange.toDateAd
//             },
//             stockAdjustmentsSearch: {
//                 searchQuery,
//                 adjustmentTypeFilter,
//                 selectedRowIndex,
//                 fromDate: dateRange.fromDate,
//                 toDate: dateRange.toDate
//             }
//         });
//     }, [adjustments, searchQuery, adjustmentTypeFilter, selectedRowIndex, dateRange.fromDate, dateRange.toDate, dateRange.fromDateAd, dateRange.toDateAd, companyInfo]);

//     // Save/load column widths
//     useEffect(() => {
//         const savedWidths = localStorage.getItem('stockAdjustmentsTableColumnWidths');
//         if (savedWidths) {
//             try {
//                 setColumnWidths(JSON.parse(savedWidths));
//             } catch (e) {
//                 console.error('Failed to load column widths:', e);
//             }
//         }
//     }, []);

//     useEffect(() => {
//         localStorage.setItem('stockAdjustmentsTableColumnWidths', JSON.stringify(columnWidths));
//     }, [columnWidths]);

//     // Fetch data when generate report is clicked - ONLY UPDATES ADJUSTMENTS, NOT INPUT FIELDS
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

//                 const response = await api.get(`/api/retailer/stock-adjustments/register?${params.toString()}`, {
//                     signal: abortController.signal
//                 });

//                 if (response.data.success) {
//                     // ONLY update adjustments - keep everything else unchanged
//                     setAdjustments(response.data.data.stockAdjustments || []);
//                     // Update company info only if needed
//                     if (response.data.data.vatEnabled !== undefined) {
//                         setCompanyInfo(prev => ({
//                             ...prev,
//                             vatEnabled: response.data.data.vatEnabled,
//                             isVatExempt: response.data.data.isVatExempt || false
//                         }));
//                     }
//                     setError(null);
//                 } else {
//                     setError(response.data.error || 'Failed to fetch stock adjustments');
//                 }

//                 if (!draftSave?.stockAdjustmentsSearch?.selectedRowIndex) {
//                     setSelectedRowIndex(0);
//                 }
//             } catch (err) {
//                 if (err.name !== 'AbortError') {
//                     console.error('Fetch error:', err);
//                     setError(err.response?.data?.error || 'Failed to fetch stock adjustments');
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

//     // Filter adjustments based on search and adjustment type
//     useEffect(() => {
//         const adjustmentsArray = Array.isArray(adjustments) ? adjustments : [];

//         const filtered = adjustmentsArray.filter(adjustment => {
//             const matchesSearch =
//                 (adjustment.itemName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
//                 (adjustment.reason?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
//                 (adjustment.userName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
//                 (adjustment.billNumber?.toLowerCase() || '').includes(searchQuery.toLowerCase());

//             const matchesAdjustmentType =
//                 adjustmentTypeFilter === '' ||
//                 (adjustment.adjustmentType?.toLowerCase() || '') === adjustmentTypeFilter.toLowerCase();

//             return matchesSearch && matchesAdjustmentType;
//         });

//         setFilteredAdjustments(filtered);

//         if (selectedRowIndex >= filtered.length && filtered.length > 0) {
//             setSelectedRowIndex(0);
//         }
//     }, [adjustments, searchQuery, adjustmentTypeFilter]);

//     // Calculate total quantity when filtered adjustments change
//     useEffect(() => {
//         if (filteredAdjustments.length === 0) {
//             setTotalQuantity(0);
//             return;
//         }

//         const newTotalQuantity = filteredAdjustments.reduce((acc, adjustment) => {
//             return acc + (adjustment.quantity || 0);
//         }, 0);

//         setTotalQuantity(newTotalQuantity);
//     }, [filteredAdjustments]);

//     // Handle keyboard navigation
//     useEffect(() => {
//         const handleKeyDown = (e) => {
//             if (filteredAdjustments.length === 0) return;

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
//                     setSelectedRowIndex(prev => Math.min(filteredAdjustments.length - 1, prev + 1));
//                     break;
//                 default:
//                     break;
//             }
//         };

//         window.addEventListener('keydown', handleKeyDown);
//         return () => window.removeEventListener('keydown', handleKeyDown);
//     }, [filteredAdjustments]);

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
//         const rowsToPrint = filtered ? filteredAdjustments : (Array.isArray(adjustments) ? adjustments : []);

//         if (rowsToPrint.length === 0) {
//             alert("No adjustments to print");
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
//         .badge-xcess {
//             background-color: #1cc88a;
//             color: white;
//             padding: 2px 5px;
//             border-radius: 3px;
//             display: inline-block;
//         }
//         .badge-short {
//             background-color: #e74a3b;
//             color: white;
//             padding: 2px 5px;
//             border-radius: 3px;
//             display: inline-block;
//         }
//     </style>
//     ${printHeader}
//     <div class="report-title">Stock Adjustments Register</div>
//     <table>
//         <thead>
//             <tr>
//                 <th class="nowrap">Miti</th>
//                 <th class="nowrap">Date</th>
//                 <th class="nowrap">Vch. No.</th>
//                 <th class="nowrap">Item Description</th>
//                 <th class="nowrap">Qty</th>
//                 <th class="nowrap">Unit</th>
//                 <th class="nowrap">Rate</th>
//                 <th class="nowrap">Type</th>
//                 <th class="nowrap">Reason</th>
//                 <th class="nowrap">User</th>
//             </tr>
//         </thead>
//         <tbody>
//     `;

//         let printTotalQty = 0;

//         rowsToPrint.forEach(adjustment => {
//             tableContent += `
//         <tr>
//             <td class="nowrap">${adjustment.nepaliDate || ''}</td>
//             <td class="nowrap">${adjustment.date ? new Date(adjustment.date).toLocaleDateString() : ''}</td>
//             <td class="nowrap">${adjustment.billNumber || ''}</td>
//             <td class="nowrap">
//                 ${adjustment.itemName || ''}
//                 ${adjustment.vatStatus === 'vatExempt' ? '*' : ''}
//             </td>
//             <td class="nowrap" style="text-align: right;">${(adjustment.quantity || 0).toFixed(2)}</td>
//             <td class="nowrap">${adjustment.unitName || ''}</td>
//             <td class="nowrap" style="text-align: right;">${(adjustment.puPrice || 0).toFixed(2)}</td>
//             <td class="nowrap">
//                 ${adjustment.adjustmentType === 'xcess' ? 'xcess' : 'short'}
//             </td>
//             <td class="nowrap">${adjustment.reason || ''}</td>
//             <td class="nowrap">${adjustment.userName || ''}</td>
//         </tr>
//         `;

//             printTotalQty += parseFloat(adjustment.quantity || 0);
//         });

//         tableContent += `
//         <tr class="grand-total-row" style="font-weight:bold;">
//             <td colspan="4" style="font-weight: bold;">Total Quantity</td>
//             <td style="text-align: right; font-weight: bold;">${printTotalQty.toFixed(2)}</td>
//             <td colspan="5"></td>
//         </tr>
//         </tbody>
//     </table>
//     <p style="font-size: 7px;">* Items marked with asterisk are VAT exempt.</p>
//     `;

//         printWindow.document.write(`
//     <!DOCTYPE html>
//     <html>
//         <head>
//             <title>Stock Adjustments Register</title>
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

//     const handleRowDoubleClick = useCallback((adjustmentId) => {
//         if (filteredAdjustments[selectedRowIndex]) {
//             navigate(`/retailer/stock-adjustments/${filteredAdjustments[selectedRowIndex].adjustmentId}/print`);
//         }
//     }, [navigate, filteredAdjustments, selectedRowIndex]);

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
//         const totalWidth = columnWidths.bsDate + columnWidths.adDate + columnWidths.vchNo +
//             columnWidths.itemDescription + columnWidths.quantity + columnWidths.unit +
//             columnWidths.rate + columnWidths.type + columnWidths.reason + columnWidths.user + columnWidths.actions;

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

//                 {/* Vch. No. */}
//                 <div className="d-flex align-items-center px-1 border-end position-relative" style={{ width: `${columnWidths.vchNo}px`, flexShrink: 0, minWidth: '60px' }}>
//                     <strong style={{ fontSize: '0.75rem' }}>Vch. No.</strong>
//                     <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.vchNo - 3} columnName="vchNo" />
//                 </div>

//                 {/* Item Description */}
//                 <div className="d-flex align-items-center px-1 border-end position-relative" style={{ width: `${columnWidths.itemDescription}px`, flexShrink: 0, minWidth: '100px' }}>
//                     <strong style={{ fontSize: '0.75rem' }}>Item Description</strong>
//                     <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.itemDescription - 3} columnName="itemDescription" />
//                 </div>

//                 {/* Quantity */}
//                 <div className="d-flex align-items-center justify-content-end px-1 border-end position-relative" style={{ width: `${columnWidths.quantity}px`, flexShrink: 0, minWidth: '60px' }}>
//                     <strong style={{ fontSize: '0.75rem' }}>Qty</strong>
//                     <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.quantity - 2} columnName="quantity" />
//                 </div>

//                 {/* Unit */}
//                 <div className="d-flex align-items-center px-1 border-end position-relative" style={{ width: `${columnWidths.unit}px`, flexShrink: 0, minWidth: '50px' }}>
//                     <strong style={{ fontSize: '0.75rem' }}>Unit</strong>
//                     <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.unit - 2} columnName="unit" />
//                 </div>

//                 {/* Rate */}
//                 <div className="d-flex align-items-center justify-content-end px-1 border-end position-relative" style={{ width: `${columnWidths.rate}px`, flexShrink: 0, minWidth: '60px' }}>
//                     <strong style={{ fontSize: '0.75rem' }}>Rate</strong>
//                     <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.rate - 2} columnName="rate" />
//                 </div>

//                 {/* Type */}
//                 <div className="d-flex align-items-center px-1 border-end position-relative" style={{ width: `${columnWidths.type}px`, flexShrink: 0, minWidth: '60px' }}>
//                     <strong style={{ fontSize: '0.75rem' }}>Type</strong>
//                     <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.type - 2} columnName="type" />
//                 </div>

//                 {/* Reason */}
//                 <div className="d-flex align-items-center px-1 border-end position-relative" style={{ width: `${columnWidths.reason}px`, flexShrink: 0, minWidth: '80px' }}>
//                     <strong style={{ fontSize: '0.75rem' }}>Reason</strong>
//                     <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.reason - 2} columnName="reason" />
//                 </div>

//                 {/* User */}
//                 <div className="d-flex align-items-center px-1 border-end position-relative" style={{ width: `${columnWidths.user}px`, flexShrink: 0, minWidth: '80px' }}>
//                     <strong style={{ fontSize: '0.75rem' }}>User</strong>
//                     <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.user - 2} columnName="user" />
//                 </div>

//                 {/* Actions */}
//                 <div className="d-flex align-items-center px-1 position-relative" style={{ width: `${columnWidths.actions}px`, flexShrink: 0, minWidth: '100px' }}>
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
//         const { adjustments: rowAdjustments, selectedRowIndex, formatCurrency, navigate } = rowData;
//         const adjustment = rowAdjustments[index];

//         const handleRowClick = () => {
//             rowData.handleRowClick(index);
//         };

//         const handleDoubleClick = () => {
//             if (adjustment && adjustment.adjustmentId) {
//                 navigate(`/retailer/stockAdjustments/${adjustment.adjustmentId}/print`);
//             }
//         };

//         const handleViewClick = (e) => {
//             e.stopPropagation();
//             if (adjustment && adjustment.adjustmentId) {
//                 navigate(`/retailer/stockAdjustments/${adjustment.adjustmentId}/print`);
//             }
//         };

//         const handleEditClick = (e) => {
//             e.stopPropagation();
//             if (adjustment && adjustment.adjustmentId) {
//                 navigate(`/retailer/stock-adjustments/edit/${adjustment.adjustmentId}`);
//             }
//         };

//         if (!adjustment) return null;

//         const isSelected = selectedRowIndex === index;
//         // const canEdit = companyInfo.isAdminOrSupervisor;

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
//                     <span style={{ fontSize: '0.75rem' }}>{adjustment.nepaliDate || ''}</span>
//                 </div>

//                 {/* AD Date */}
//                 <div className="d-flex align-items-center justify-content-center px-1 border-end" style={{ width: `${columnWidths.adDate}px`, flexShrink: 0, height: '100%' }}>
//                     <span style={{ fontSize: '0.75rem' }}>{adjustment.date ? new Date(adjustment.date).toLocaleDateString() : ''}</span>
//                 </div>

//                 {/* Vch. No. */}
//                 <div className="d-flex align-items-center px-1 border-end" style={{ width: `${columnWidths.vchNo}px`, flexShrink: 0, height: '100%', overflow: 'hidden' }}>
//                     <span style={{ fontSize: '0.75rem' }}>{adjustment.billNumber || ''}</span>
//                 </div>

//                 {/* Item Description */}
//                 <div className="d-flex align-items-center px-1 border-end" style={{ width: `${columnWidths.itemDescription}px`, flexShrink: 0, height: '100%', overflow: 'hidden' }} title={adjustment.itemName}>
//                     <span style={{ fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
//                         {adjustment.itemName || ''}
//                         {adjustment.vatStatus === 'vatExempt' && '*'}
//                     </span>
//                 </div>

//                 {/* Quantity */}
//                 <div className="d-flex align-items-center justify-content-end px-1 border-end" style={{ width: `${columnWidths.quantity}px`, flexShrink: 0, height: '100%' }}>
//                     <span style={{ fontSize: '0.75rem' }}>{formatCurrency(adjustment.quantity)}</span>
//                 </div>

//                 {/* Unit */}
//                 <div className="d-flex align-items-center px-1 border-end" style={{ width: `${columnWidths.unit}px`, flexShrink: 0, height: '100%' }}>
//                     <span style={{ fontSize: '0.75rem' }}>{adjustment.unitName || ''}</span>
//                 </div>

//                 {/* Rate */}
//                 <div className="d-flex align-items-center justify-content-end px-1 border-end" style={{ width: `${columnWidths.rate}px`, flexShrink: 0, height: '100%' }}>
//                     <span style={{ fontSize: '0.75rem' }}>{formatCurrency(adjustment.puPrice)}</span>
//                 </div>

//                 {/* Type */}
//                 <div className="d-flex align-items-center px-1 border-end" style={{ width: `${columnWidths.type}px`, flexShrink: 0, height: '100%' }}>
//                     <span className={`badge ${adjustment.adjustmentType === 'xcess' ? 'bg-success' : 'bg-danger'}`} style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '3px' }}>
//                         {adjustment.adjustmentType || ''}
//                     </span>
//                 </div>

//                 {/* Reason */}
//                 <div className="d-flex align-items-center px-1 border-end" style={{ width: `${columnWidths.reason}px`, flexShrink: 0, height: '100%', overflow: 'hidden' }} title={adjustment.reason}>
//                     <span style={{ fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{adjustment.reason || ''}</span>
//                 </div>

//                 {/* User */}
//                 <div className="d-flex align-items-center px-1 border-end" style={{ width: `${columnWidths.user}px`, flexShrink: 0, height: '100%', overflow: 'hidden' }} title={adjustment.userName}>
//                     <span style={{ fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{adjustment.userName || ''}</span>
//                 </div>

//                 {/* Actions */}
//                 <div className="d-flex align-items-center justify-content-center px-1 gap-1" style={{ width: `${columnWidths.actions}px`, flexShrink: 0, height: '100%' }}>
//                     <button className="btn btn-sm btn-info py-0 px-1 d-flex align-items-center" onClick={handleViewClick} style={{ height: '20px', fontSize: '0.7rem', fontWeight: 'bold' }}>
//                         <i className="bi bi-eye"></i>
//                     </button>
//                     {/* {canEdit && (
//                         <button className="btn btn-sm btn-warning py-0 px-1 d-flex align-items-center" onClick={handleEditClick} style={{ height: '20px', fontSize: '0.7rem', fontWeight: 'bold' }}>
//                             <i className="bi bi-pencil-square"></i>
//                         </button>
//                     )} */}
//                 </div>
//             </div>
//         );
//     }, (prevProps, nextProps) => {
//         if (prevProps.index !== nextProps.index) return false;
//         if (prevProps.style !== nextProps.style) return false;
//         const prevAdjustment = prevProps.data.adjustments[prevProps.index];
//         const nextAdjustment = nextProps.data.adjustments[nextProps.index];
//         return shallowEqual(prevAdjustment, nextAdjustment) && prevProps.data.selectedRowIndex === nextProps.data.selectedRowIndex;
//     });

//     const resetColumnWidths = () => {
//         setColumnWidths({
//             bsDate: 80,
//             adDate: 80,
//             vchNo: 100,
//             itemDescription: 180,
//             quantity: 70,
//             unit: 60,
//             rate: 70,
//             type: 80,
//             reason: 130,
//             user: 100,
//             actions: 120
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
//     if (loading && adjustments.length === 0) return <Loader />;

//     if (error) {
//         return <div className="alert alert-danger text-center py-5">{error}</div>;
//     }

//     const adjustmentsArray = Array.isArray(adjustments) ? adjustments : [];

//     return (
//         <div className="container-fluid">
//             <Header />
//             <div className="card mt-2 shadow-lg p-0 animate__animated animate__fadeInUp expanded-card ledger-card compact">
//                 <div className="card-header bg-white py-0">
//                     <h1 className="h4 mb-0 text-center text-primary">Stock Adjustments Register</h1>
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
//                                         disabled={adjustmentsArray.length === 0}
//                                         autoComplete='off'
//                                         style={{ height: '26px', fontSize: '0.875rem', paddingTop: '0.75rem', width: '100%' }}
//                                     />
//                                 </div>
//                                 <label className="position-absolute" style={{ top: '-0.5rem', left: '0.75rem', fontSize: '0.75rem', backgroundColor: 'white', padding: '0 0.25rem', color: '#6c757d', fontWeight: '500' }}>
//                                     Search
//                                 </label>
//                             </div>
//                         </div>

//                         {/* Adjustment Type Filter */}
//                         <div className="col-12 col-md-1">
//                             <div className="position-relative">
//                                 <select
//                                     className="form-select form-select-sm"
//                                     id="adjustmentTypeFilter"
//                                     ref={adjustmentTypeFilterRef}
//                                     value={adjustmentTypeFilter}
//                                     onChange={(e) => setAdjustmentTypeFilter(e.target.value)}
//                                     disabled={adjustmentsArray.length === 0}
//                                     style={{ height: '30px', fontSize: '0.875rem', paddingTop: '0.25rem', width: '100%' }}
//                                 >
//                                     <option value="">All</option>
//                                     <option value="xcess">Xcess</option>
//                                     <option value="short">Short</option>
//                                 </select>
//                                 <label className="position-absolute" style={{ top: '-0.5rem', left: '0.75rem', fontSize: '0.75rem', backgroundColor: 'white', padding: '0 0.25rem', color: '#6c757d', fontWeight: '500' }}>
//                                     Type
//                                 </label>
//                             </div>
//                         </div>

//                         <div className="col-12 col-md-auto d-flex align-items-end justify-content-end gap-2">
//                             <button className="btn btn-primary btn-sm d-flex align-items-center"
//                                 onClick={() => navigate('/retailer/stock-adjustments/new')}
//                                 style={{ height: '30px', padding: '0 12px', fontSize: '0.8rem', fontWeight: '500', whiteSpace: 'nowrap' }}>
//                                 <i className="bi bi-plus-circle"></i>
//                             </button>
//                             <button className="btn btn-secondary btn-sm d-flex align-items-center"
//                                 onClick={() => handlePrint(true)} disabled={adjustmentsArray.length === 0}
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

//                     {adjustmentsArray.length === 0 && !loading ? (
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
//                                             Loading stock adjustments...
//                                         </p>
//                                     </div>
//                                 ) : filteredAdjustments.length === 0 ? (
//                                     <div className="d-flex flex-column justify-content-center align-items-center h-100">
//                                         <i className="bi bi-search text-muted" style={{ fontSize: '1.5rem' }}></i>
//                                         <h6 className="mt-2 text-muted" style={{ fontSize: '0.9rem' }}>
//                                             No stock adjustments found
//                                         </h6>
//                                         <p className="text-muted small" style={{ fontSize: '0.75rem' }}>
//                                             {searchQuery ? 'Try a different search term' : 'No data for the selected date range'}
//                                         </p>
//                                     </div>
//                                 ) : (
//                                     <AutoSizer>
//                                         {({ height, width }) => {
//                                             const totalWidth = columnWidths.bsDate + columnWidths.adDate +
//                                                 columnWidths.vchNo + columnWidths.itemDescription +
//                                                 columnWidths.quantity + columnWidths.unit + columnWidths.rate +
//                                                 columnWidths.type + columnWidths.reason + columnWidths.user + columnWidths.actions;

//                                             return (
//                                                 <div style={{ position: 'relative', height: height, width: Math.max(width, totalWidth) }}>
//                                                     <TableHeader />
//                                                     <List
//                                                         height={height - 28}
//                                                         itemCount={filteredAdjustments.length}
//                                                         itemSize={28}
//                                                         width={Math.max(width, totalWidth)}
//                                                         itemData={{
//                                                             adjustments: filteredAdjustments,
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
//                                     style={{ width: `${columnWidths.bsDate + columnWidths.adDate + columnWidths.vchNo + columnWidths.itemDescription}px`, flexShrink: 0, height: '100%' }}
//                                 >
//                                     <strong style={{ fontSize: '0.75rem' }}>Total:</strong>
//                                 </div>
//                                 <div className="d-flex align-items-center justify-content-end px-1 border-start" style={{ width: `${columnWidths.quantity}px`, flexShrink: 0, height: '100%' }}>
//                                     <strong style={{ fontSize: '0.75rem' }}>{formatCurrency(totalQuantity)}</strong>
//                                 </div>
//                                 <div className="d-flex align-items-center px-1 border-start" style={{ flex: 1, height: '100%', minWidth: `${columnWidths.unit + columnWidths.rate + columnWidths.type + columnWidths.reason + columnWidths.user + columnWidths.actions}px` }}></div>
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

// export default StockAdjustmentsList;

//---------------------------------------------------------end1

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
import './StockAdjustmentsList.css';

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

const StockAdjustmentsList = () => {
    const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
    const currentEnglishDate = new Date().toISOString().split('T')[0];

    const [dateErrors, setDateErrors] = useState({ fromDate: '', toDate: '' });
    const [notification, setNotification] = useState({
        show: false, message: '', type: 'success', duration: 3000
    });

    const { draftSave, setDraftSave } = usePageNotRefreshContext();
    const [showProductModal, setShowProductModal] = useState(false);

    const [company, setCompany] = useState({ dateFormat: 'english', isVatExempt: false, vatEnabled: true, fiscalYear: {} });

    const [dateRange, setDateRange] = useState(() => {
        if (draftSave?.stockAdjustmentsData) {
            return { fromDate: draftSave.stockAdjustmentsData.fromDate || '', toDate: draftSave.stockAdjustmentsData.toDate || '', fromDateAd: draftSave.stockAdjustmentsData.fromDateAd || '', toDateAd: draftSave.stockAdjustmentsData.toDateAd || '' };
        }
        return { fromDate: '', toDate: '', fromDateAd: '', toDateAd: '' };
    });

    const [adjustments, setAdjustments] = useState(() => draftSave?.stockAdjustmentsData?.stockAdjustments || []);
    const [companyInfo, setCompanyInfo] = useState(() => {
        if (draftSave?.stockAdjustmentsData) {
            return {
                company: draftSave.stockAdjustmentsData.company, currentFiscalYear: draftSave.stockAdjustmentsData.currentFiscalYear,
                currentCompanyName: draftSave.stockAdjustmentsData.currentCompanyName || '', companyDateFormat: draftSave.stockAdjustmentsData.companyDateFormat || 'english',
                vatEnabled: draftSave.stockAdjustmentsData.vatEnabled !== undefined ? draftSave.stockAdjustmentsData.vatEnabled : true,
                isVatExempt: draftSave.stockAdjustmentsData.isVatExempt || false,
                isAdminOrSupervisor: draftSave.stockAdjustmentsData.isAdminOrSupervisor || false
            };
        }
        return { company: null, currentFiscalYear: null, currentCompanyName: '', companyDateFormat: 'english', vatEnabled: true, isVatExempt: false, isAdminOrSupervisor: false };
    });

    const [searchQuery, setSearchQuery] = useState(() => draftSave?.stockAdjustmentsSearch?.searchQuery || '');
    const [adjustmentTypeFilter, setAdjustmentTypeFilter] = useState(() => draftSave?.stockAdjustmentsSearch?.adjustmentTypeFilter || '');
    const [selectedRowIndex, setSelectedRowIndex] = useState(() => draftSave?.stockAdjustmentsSearch?.selectedRowIndex || 0);

    const [columnWidths, setColumnWidths] = useState({
        bsDate: 80, adDate: 80, vchNo: 100, itemDescription: 180, quantity: 70, unit: 60, rate: 70, type: 80, reason: 130, user: 100, actions: 120
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
    const [totalQuantity, setTotalQuantity] = useState(0);
    const [filteredAdjustments, setFilteredAdjustments] = useState([]);

    const fromDateRef = useRef(null);
    const toDateRef = useRef(null);
    const searchInputRef = useRef(null);
    const adjustmentTypeFilterRef = useRef(null);
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
                const response = await api.get('/api/retailer/stock-adjustments/register/entry-data');
                if (response.data.success) {
                    const responseData = response.data.data;
                    const dateFormat = responseData.company.dateFormat?.toLowerCase() || 'english';
                    const isNepaliFormat = dateFormat === 'nepali';
                    setCompany({ ...responseData.company, dateFormat: dateFormat, vatEnabled: responseData.company.vatEnabled || true, isVatExempt: responseData.company.isVatExempt || false });

                    const currentFiscalYear = responseData.currentFiscalYear;
                    const hasDraftDates = draftSave?.stockAdjustmentsData?.fromDate && draftSave?.stockAdjustmentsData?.toDate;

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
                        vatEnabled: responseData.company.vatEnabled, isVatExempt: responseData.company.isVatExempt || false,
                        isAdminOrSupervisor: responseData.permissions?.isAdminOrSupervisor || false
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
            stockAdjustmentsData: { ...companyInfo, stockAdjustments: adjustments, fromDate: dateRange.fromDate, toDate: dateRange.toDate, fromDateAd: dateRange.fromDateAd, toDateAd: dateRange.toDateAd },
            stockAdjustmentsSearch: { searchQuery, adjustmentTypeFilter, selectedRowIndex, fromDate: dateRange.fromDate, toDate: dateRange.toDate }
        });
    }, [adjustments, searchQuery, adjustmentTypeFilter, selectedRowIndex, dateRange, companyInfo]);

    // Save/load column widths
    useEffect(() => {
        const savedWidths = localStorage.getItem('stockAdjustmentsTableColumnWidths');
        if (savedWidths) try { setColumnWidths(JSON.parse(savedWidths)); } catch (e) {}
    }, []);
    useEffect(() => localStorage.setItem('stockAdjustmentsTableColumnWidths', JSON.stringify(columnWidths)), [columnWidths]);

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

                const response = await api.get(`/api/retailer/stock-adjustments/register?${params.toString()}`, { signal: abortController.signal });

                if (response.data.success) {
                    setAdjustments(response.data.data.stockAdjustments || []);
                    if (response.data.data.vatEnabled !== undefined) setCompanyInfo(prev => ({ ...prev, vatEnabled: response.data.data.vatEnabled, isVatExempt: response.data.data.isVatExempt || false }));
                    setError(null);
                } else {
                    setError(response.data.error || 'Failed to fetch stock adjustments');
                }
                if (!draftSave?.stockAdjustmentsSearch?.selectedRowIndex) setSelectedRowIndex(0);
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error('Fetch error:', err);
                    setError(err.response?.data?.error || 'Failed to fetch stock adjustments');
                }
            } finally {
                setLoading(false);
                setShouldFetch(false);
            }
        };
        fetchData();
        return () => abortController.abort();
    }, [shouldFetch, dateRange.fromDateAd, dateRange.toDateAd]);

    // Filter adjustments
    useEffect(() => {
        const adjustmentsArray = Array.isArray(adjustments) ? adjustments : [];
        const filtered = adjustmentsArray.filter(adjustment => {
            const matchesSearch = (adjustment.itemName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                (adjustment.reason?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                (adjustment.userName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                (adjustment.billNumber?.toLowerCase() || '').includes(searchQuery.toLowerCase());
            const matchesAdjustmentType = adjustmentTypeFilter === '' || (adjustment.adjustmentType?.toLowerCase() || '') === adjustmentTypeFilter.toLowerCase();
            return matchesSearch && matchesAdjustmentType;
        });
        setFilteredAdjustments(filtered);
        if (selectedRowIndex >= filtered.length && filtered.length > 0) setSelectedRowIndex(0);
    }, [adjustments, searchQuery, adjustmentTypeFilter]);

    // Calculate totals
    useEffect(() => {
        if (filteredAdjustments.length === 0) { setTotalQuantity(0); return; }
        const newTotalQuantity = filteredAdjustments.reduce((acc, adj) => acc + (adj.quantity || 0), 0);
        setTotalQuantity(newTotalQuantity);
    }, [filteredAdjustments]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (filteredAdjustments.length === 0) return;
            if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT') return;
            switch (e.key) {
                case 'ArrowUp': e.preventDefault(); setSelectedRowIndex(prev => Math.max(0, prev - 1)); break;
                case 'ArrowDown': e.preventDefault(); setSelectedRowIndex(prev => Math.min(filteredAdjustments.length - 1, prev + 1)); break;
                default: break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [filteredAdjustments]);

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
        const rowsToPrint = filtered ? filteredAdjustments : (Array.isArray(adjustments) ? adjustments : []);
        if (rowsToPrint.length === 0) { setNotification({ show: true, message: 'No adjustments to print', type: 'warning' }); return; }

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
                .badge-xcess { background-color: #1cc88a; color: white; padding: 2px 5px; border-radius: 3px; display: inline-block; }
                .badge-short { background-color: #e74a3b; color: white; padding: 2px 5px; border-radius: 3px; display: inline-block; }
            </style>
            <div class="print-header"><h1>${companyInfo.currentCompanyName || 'Company Name'}</h1><p>${companyInfo.company?.address || ''}${companyInfo.company?.city ? ', ' + companyInfo.company.city : ''}, PAN: ${companyInfo.company?.pan || ''}</p><hr></div>
            <div class="report-title">Stock Adjustments Register</div>
            <table><thead><tr><th>Miti</th><th>Date</th><th>Vch. No.</th><th>Item Description</th><th class="text-end">Qty</th><th>Unit</th><th class="text-end">Rate</th><th>Type</th><th>Reason</th><th>User</th></tr></thead><tbody>
        `;
        let printTotalQty = 0;
        rowsToPrint.forEach(adj => {
            tableContent += `<tr><td>${adj.nepaliDate || ''}</td><td>${adj.date ? new Date(adj.date).toLocaleDateString() : ''}</td><td>${adj.billNumber || ''}</td><td>${adj.itemName || ''}${adj.vatStatus === 'vatExempt' ? '*' : ''}</td><td class="text-end">${(adj.quantity || 0).toFixed(2)}</td><td>${adj.unitName || ''}</td><td class="text-end">${(adj.puPrice || 0).toFixed(2)}</td><td>${adj.adjustmentType === 'xcess' ? 'xcess' : 'short'}</td><td>${adj.reason || ''}</td><td>${adj.userName || ''}</td></tr>`;
            printTotalQty += parseFloat(adj.quantity || 0);
        });
        tableContent += `<tr class="grand-total-row"><td colspan="4">Total Quantity</td><td class="text-end">${printTotalQty.toFixed(2)}</td><td colspan="5"></td></tr></tbody></table>
            <p style="font-size:7px;">* Items marked with asterisk are VAT exempt.</p>
            <script>window.onload=function(){window.print();window.onafterprint=function(){window.close()}}<\/script>
        `;
        printWindow.document.write(`<!DOCTYPE html><html><head><title>Stock Adjustments Register</title></head><body>${tableContent}</body></html>`);
        printWindow.document.close();
    };

    const formatCurrency = useCallback((num) => {
        const number = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num) || 0;
        return number.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }, []);

    const handleRowClick = useCallback((index) => setSelectedRowIndex(index), []);

    const handleRowDoubleClick = useCallback(() => {
        if (filteredAdjustments[selectedRowIndex]) navigate(`/retailer/stock-adjustments/${filteredAdjustments[selectedRowIndex].adjustmentId}/print`);
    }, [navigate, filteredAdjustments, selectedRowIndex]);

    const handleKeyDown = (e, nextFieldId) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (nextFieldId) document.getElementById(nextFieldId)?.focus();
        }
    };

    const ResizeHandle = React.memo(({ onResizeStart, left, columnName }) => (
        <div className="sa-resize-handle" style={{ position: 'absolute', top: 0, left: `${left}px`, width: '5px', height: '100%', cursor: 'col-resize', zIndex: 10 }} onMouseDown={(e) => { e.preventDefault(); onResizeStart(e, columnName); }} />
    ));

    const TableHeader = React.memo(() => {
        const totalWidth = Object.values(columnWidths).reduce((a, b) => a + b, 0);
        const handleResizeStart = (e, columnName) => {
            setIsResizing(true); setResizingColumn(columnName); setStartX(e.clientX); setStartWidth(columnWidths[columnName]); e.preventDefault();
        };
        return (
            <div className="sa-header" style={{ minWidth: `${totalWidth}px` }}
                onMouseMove={(e) => { if (isResizing && resizingColumn) setColumnWidths(prev => ({ ...prev, [resizingColumn]: Math.max(60, startWidth + e.clientX - startX) })); }}
                onMouseUp={() => { setIsResizing(false); setResizingColumn(null); }}
                onMouseLeave={() => { setIsResizing(false); setResizingColumn(null); }}
            >
                <div className="sa-header-cell sa-cell--center" style={{ width: `${columnWidths.bsDate}px`, flexShrink: 0 }}>Miti<ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.bsDate - 2} columnName="bsDate" /></div>
                <div className="sa-header-cell sa-cell--center" style={{ width: `${columnWidths.adDate}px`, flexShrink: 0 }}>Date<ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.adDate - 2} columnName="adDate" /></div>
                <div className="sa-header-cell" style={{ width: `${columnWidths.vchNo}px`, flexShrink: 0 }}>Vch No.<ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.vchNo - 2} columnName="vchNo" /></div>
                <div className="sa-header-cell" style={{ width: `${columnWidths.itemDescription}px`, flexShrink: 0 }}>Item<ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.itemDescription - 2} columnName="itemDescription" /></div>
                <div className="sa-header-cell sa-cell--end" style={{ width: `${columnWidths.quantity}px`, flexShrink: 0 }}>Qty<ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.quantity - 2} columnName="quantity" /></div>
                <div className="sa-header-cell" style={{ width: `${columnWidths.unit}px`, flexShrink: 0 }}>Unit<ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.unit - 2} columnName="unit" /></div>
                <div className="sa-header-cell sa-cell--end" style={{ width: `${columnWidths.rate}px`, flexShrink: 0 }}>Rate<ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.rate - 2} columnName="rate" /></div>
                <div className="sa-header-cell" style={{ width: `${columnWidths.type}px`, flexShrink: 0 }}>Type<ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.type - 2} columnName="type" /></div>
                <div className="sa-header-cell" style={{ width: `${columnWidths.reason}px`, flexShrink: 0 }}>Reason<ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.reason - 2} columnName="reason" /></div>
                <div className="sa-header-cell" style={{ width: `${columnWidths.user}px`, flexShrink: 0 }}>User<ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.user - 2} columnName="user" /></div>
                <div className="sa-header-cell" style={{ width: `${columnWidths.actions}px`, flexShrink: 0 }}>Actions<ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.actions - 2} columnName="actions" /></div>
                {isResizing && <div style={{ position: 'fixed', inset: 0, zIndex: 1000, cursor: 'col-resize' }} />}
            </div>
        );
    });

    const TableRow = React.memo(({ index, style, data }) => {
        const { adjustments: rowAdjustments, selectedRowIndex, formatCurrency, navigate, handleRowClick } = data;
        const adjustment = rowAdjustments[index];
        if (!adjustment) return null;
        const isSelected = selectedRowIndex === index;

        return (
            <div style={{ ...style, display: 'flex', alignItems: 'center', height: '28px', borderBottom: '1px solid #e2e8f0', cursor: 'pointer', backgroundColor: isSelected ? '#eff6ff' : (index % 2 === 0 ? '#f8fafc' : 'white') }} className="sa-row" onClick={() => handleRowClick(index)} onDoubleClick={() => { if (adjustment && adjustment.adjustmentId) navigate(`/retailer/stock-adjustments/${adjustment.adjustmentId}/print`); }}>
                <div className="sa-cell sa-cell--center" style={{ width: `${columnWidths.bsDate}px`, flexShrink: 0 }}><span>{adjustment.nepaliDate || ''}</span></div>
                <div className="sa-cell sa-cell--center" style={{ width: `${columnWidths.adDate}px`, flexShrink: 0 }}><span>{adjustment.date ? new Date(adjustment.date).toLocaleDateString() : ''}</span></div>
                <div className="sa-cell" style={{ width: `${columnWidths.vchNo}px`, flexShrink: 0 }}><span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{adjustment.billNumber || ''}</span></div>
                <div className="sa-cell" style={{ width: `${columnWidths.itemDescription}px`, flexShrink: 0 }} title={adjustment.itemName}><span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{adjustment.itemName || ''}{adjustment.vatStatus === 'vatExempt' && '*'}</span></div>
                <div className="sa-cell sa-cell--end" style={{ width: `${columnWidths.quantity}px`, flexShrink: 0 }}><span>{formatCurrency(adjustment.quantity)}</span></div>
                <div className="sa-cell" style={{ width: `${columnWidths.unit}px`, flexShrink: 0 }}><span>{adjustment.unitName || ''}</span></div>
                <div className="sa-cell sa-cell--end" style={{ width: `${columnWidths.rate}px`, flexShrink: 0 }}><span>{formatCurrency(adjustment.puPrice)}</span></div>
                <div className="sa-cell" style={{ width: `${columnWidths.type}px`, flexShrink: 0 }}><span className={`sa-badge ${adjustment.adjustmentType === 'xcess' ? 'sa-badge--success' : 'sa-badge--danger'}`}>{adjustment.adjustmentType || ''}</span></div>
                <div className="sa-cell" style={{ width: `${columnWidths.reason}px`, flexShrink: 0 }} title={adjustment.reason}><span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{adjustment.reason || ''}</span></div>
                <div className="sa-cell" style={{ width: `${columnWidths.user}px`, flexShrink: 0 }} title={adjustment.userName}><span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{adjustment.userName || ''}</span></div>
                <div className="sa-cell sa-cell--center gap-1" style={{ width: `${columnWidths.actions}px`, flexShrink: 0 }}>
                    <button className="sa-btn-action sa-btn-action--info" onClick={(e) => { e.stopPropagation(); if (adjustment && adjustment.adjustmentId) navigate(`/retailer/stock-adjustments/${adjustment.adjustmentId}/print`); }} title="View"><i className="bi bi-eye" /></button>
                </div>
            </div>
        );
    }, (prevProps, nextProps) => {
        if (prevProps.index !== nextProps.index) return false;
        if (prevProps.style !== nextProps.style) return false;
        const prevAdj = prevProps.data.adjustments[prevProps.index];
        const nextAdj = nextProps.data.adjustments[nextProps.index];
        return shallowEqual(prevAdj, nextAdj) && prevProps.data.selectedRowIndex === nextProps.data.selectedRowIndex;
    });

    const resetColumnWidths = () => {
        setColumnWidths({ bsDate: 80, adDate: 80, vchNo: 100, itemDescription: 180, quantity: 70, unit: 60, rate: 70, type: 80, reason: 130, user: 100, actions: 120 });
        setNotification({ show: true, message: 'Column widths reset', type: 'success', duration: 2000 });
    };

    if (loading && adjustments.length === 0) return <Loader />;
    if (error) return <div className="sa-page"><Header /><div className="sa-shell"><div className="sa-state"><h3>Error</h3><p>{error}</p></div></div></div>;

    const adjustmentsArray = Array.isArray(adjustments) ? adjustments : [];

    return (
        <div className="sa-page">
            <Header />

            <div className="sa-shell">
                {/* Top Bar */}
                <div className="sa-topbar">
                    <div className="sa-topbar__left">
                        <div className="sa-topbar__icon"><FiFileText /></div>
                        <div><h1>Stock Adjustments</h1></div>
                    </div>
                    <div className="sa-topbar__actions">
                        <button className="sa-btn-icon" onClick={() => navigate('/retailer/stock-adjustments/new')} title="Add Adjustment"><FiPlus /> Add</button>
                        <button className="sa-btn-icon" onClick={() => handlePrint(true)} disabled={adjustmentsArray.length === 0}><FiPrinter /> Print</button>
                        <button className="sa-btn-icon" onClick={resetColumnWidths} title="Reset columns"><FiRefreshCw /> Reset</button>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="sa-toolbar">
                    <div className="sa-field sa-field--date">
                        <label>From (BS) <span className="req">*</span></label>
                        <input type="text" id="fromDate" ref={fromDateRef} className={dateErrors.fromDate ? 'is-invalid' : ''} value={dateRange.fromDate || ''} onChange={(e) => { const v = e.target.value.replace(/[^0-9/-]/g, '').slice(0, 10); setDateRange(p => ({ ...p, fromDate: v, fromDateAd: convertBsToAd(v) || p.fromDateAd })); setDateErrors(p => ({ ...p, fromDate: '' })); }} onKeyDown={(e) => handleKeyDown(e, 'fromDateAd')} onBlur={(e) => { const d = e.target.value.trim(); if (!d) return; const c = validateAndCorrectNepaliDate(d); if (!c) { const ad = convertBsToAd(currentNepaliDate); setDateRange(p => ({ ...p, fromDate: currentNepaliDate, fromDateAd: ad })); setNotification({ show: true, message: 'Invalid Nepali date. Auto-corrected.', type: 'warning' }); } }} placeholder="YYYY-MM-DD" autoComplete="off" autoFocus />
                        {dateErrors.fromDate && <div className="sa-field-error">{dateErrors.fromDate}</div>}
                    </div>
                    <div className="sa-field sa-field--date">
                        <label>From (AD)</label>
                        <input type="date" id="fromDateAd" value={dateRange.fromDateAd || ''} onChange={(e) => { const v = e.target.value; setDateRange(p => ({ ...p, fromDateAd: v, fromDate: convertAdToBs(v) || p.fromDate })); }} onKeyDown={(e) => handleKeyDown(e, 'toDate')} />
                    </div>
                    <div className="sa-field sa-field--date">
                        <label>To (BS) <span className="req">*</span></label>
                        <input type="text" id="toDate" ref={toDateRef} className={dateErrors.toDate ? 'is-invalid' : ''} value={dateRange.toDate || ''} onChange={(e) => { const v = e.target.value.replace(/[^0-9/-]/g, '').slice(0, 10); setDateRange(p => ({ ...p, toDate: v, toDateAd: convertBsToAd(v) || p.toDateAd })); setDateErrors(p => ({ ...p, toDate: '' })); }} onKeyDown={(e) => handleKeyDown(e, 'toDateAd')} onBlur={(e) => { const d = e.target.value.trim(); if (!d) return; const c = validateAndCorrectNepaliDate(d); if (!c) { const ad = convertBsToAd(currentNepaliDate); setDateRange(p => ({ ...p, toDate: currentNepaliDate, toDateAd: ad })); setNotification({ show: true, message: 'Invalid Nepali date. Auto-corrected.', type: 'warning' }); } }} placeholder="YYYY-MM-DD" autoComplete="off" />
                        {dateErrors.toDate && <div className="sa-field-error">{dateErrors.toDate}</div>}
                    </div>
                    <div className="sa-field sa-field--date">
                        <label>To (AD)</label>
                        <input type="date" id="toDateAd" value={dateRange.toDateAd || ''} onChange={(e) => { const v = e.target.value; setDateRange(p => ({ ...p, toDateAd: v, toDate: convertAdToBs(v) || p.toDate })); }} onKeyDown={(e) => handleKeyDown(e, 'generateReport')} />
                    </div>

                    <button type="button" id="generateReport" ref={generateReportRef} className="sa-btn-gen" onClick={handleGenerateReport} disabled={loading}>
                        {loading ? <span className="spinner-border spinner-border-sm" style={{ width: 12, height: 12 }} /> : <><FiSearch className="me-1" /> Generate</>}
                    </button>

                    <div className="sa-toolbar-divider" />

                    <div className="sa-field sa-field--search">
                        <label>Search</label>
                        <div className="sa-search-wrap">
                            <FiSearch className="sa-search-icon" />
                            <input type="text" id="searchInput" ref={searchInputRef} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} disabled={adjustmentsArray.length === 0} autoComplete="off" />
                            {searchQuery && <button className="sa-search-clear" onClick={() => setSearchQuery('')}>×</button>}
                        </div>
                    </div>

                    <div className="sa-field sa-field--select">
                        <label>Type</label>
                        <select id="adjustmentTypeFilter" ref={adjustmentTypeFilterRef} value={adjustmentTypeFilter} onChange={(e) => setAdjustmentTypeFilter(e.target.value)} disabled={adjustmentsArray.length === 0}>
                            <option value="">All</option>
                            <option value="xcess">Xcess</option>
                            <option value="short">Short</option>
                        </select>
                    </div>
                </div>

                {error && (
                    <div className="sa-alert">
                        <i className="bi bi-exclamation-circle" />{error}
                        <button type="button" className="btn-close btn-sm ms-auto" onClick={() => setError(null)} />
                    </div>
                )}

                {/* Main Content */}
                <div className="sa-main">
                    {adjustmentsArray.length === 0 && !loading ? (
                        <div className="sa-state">
                            <FiCalendar size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                            <h3>Select date range & generate</h3>
                            <p>Choose a date range and click Generate.</p>
                        </div>
                    ) : loading ? (
                        <div className="sa-state"><div className="spinner-border text-primary" /><p>Loading adjustments...</p></div>
                    ) : filteredAdjustments.length === 0 ? (
                        <div className="sa-state"><FiSearch size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} /><h3>No adjustments found</h3><p>{searchQuery ? 'Try a different search term' : 'No data for the selected date range'}</p></div>
                    ) : (
                        <>
                            <div className="sa-main__bar">
                                <span><strong>{filteredAdjustments.length}</strong> adjustments</span>
                                <span>{dateRange.fromDate} — {dateRange.toDate}</span>
                            </div>

                            <div className="sa-table-wrap" ref={tableBodyRef}>
                                <AutoSizer>
                                    {({ height, width }) => {
                                        const totalWidth = Object.values(columnWidths).reduce((a, b) => a + b, 0);
                                        return (
                                            <div style={{ position: 'relative', height: height, width: Math.max(width, totalWidth) }}>
                                                <TableHeader />
                                                <List height={height - 28} itemCount={filteredAdjustments.length} itemSize={28} width={Math.max(width, totalWidth)} itemData={{ adjustments: filteredAdjustments, selectedRowIndex, formatCurrency, navigate, handleRowClick }}>{TableRow}</List>
                                            </div>
                                        );
                                    }}
                                </AutoSizer>
                            </div>

                            {/* Sticky Footer with Totals */}
                            <div className="sa-footer">
                                <div className="sa-footer-cell" style={{ width: `${columnWidths.bsDate + columnWidths.adDate + columnWidths.vchNo + columnWidths.itemDescription}px`, flexShrink: 0 }}><strong>Total:</strong></div>
                                <div className="sa-footer-cell sa-cell--end" style={{ width: `${columnWidths.quantity}px`, flexShrink: 0 }}><strong>{formatCurrency(totalQuantity)}</strong></div>
                                <div className="sa-footer-cell" style={{ flex: 1, minWidth: `${columnWidths.unit + columnWidths.rate + columnWidths.type + columnWidths.reason + columnWidths.user + columnWidths.actions}px` }}></div>
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

export default StockAdjustmentsList;