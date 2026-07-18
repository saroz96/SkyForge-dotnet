// import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
// import { useNavigate } from 'react-router-dom';
// import axios from 'axios';
// import NepaliDate from 'nepali-datetime';
// import { usePageNotRefreshContext } from '../PageNotRefreshContext';
// import Header from '../Header';
// import Loader from '../../Loader';
// import * as XLSX from 'xlsx';
// import ProductModal from '../dashboard/modals/ProductModal';
// import NotificationToast from '../../NotificationToast';

// // Date conversion utilities
// const convertBsToAd = (bsDate) => {
//     if (!bsDate || !/^\d{4}-\d{2}-\d{2}$/.test(bsDate)) return null;
//     try {
//         const nepaliDate = new NepaliDate(bsDate);
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
//         const date = new Date(adDate + 'T00:00:00');
//         if (isNaN(date.getTime())) return null;
//         const nepaliDate = new NepaliDate(date);
//         const year = nepaliDate.getYear();
//         const month = nepaliDate.getMonth();
//         const day = nepaliDate.getDate();
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
//         const bsYear = nepaliDate.getYear();
//         const bsMonth = nepaliDate.getMonth() + 1;
//         const bsDay = nepaliDate.getDate();
//         return (bsYear === year && bsMonth === month && bsDay === day);
//     } catch (error) {
//         return false;
//     }
// };

// const validateAndCorrectNepaliDate = (dateStr) => {
//     if (!dateStr) return null;
//     if (isValidNepaliDate(dateStr)) return dateStr;

//     const match = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
//     if (match) {
//         let [_, year, month, day] = match;
//         month = parseInt(month, 10);
//         day = parseInt(day, 10);

//         if (month < 1) month = 1;
//         if (month > 12) month = 12;
//         if (day < 1) day = 1;
//         if (day > 32) day = 32;

//         const correctedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
//         if (isValidNepaliDate(correctedDate)) {
//             return correctedDate;
//         }
//     }
//     return null;
// };

// const PartyTurnover = () => {
//     const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
//     const currentEnglishDate = new Date().toISOString().split('T')[0];

//     const { draftSave, setDraftSave } = usePageNotRefreshContext();
//     const [showProductModal, setShowProductModal] = useState(false);
//     const navigate = useNavigate();

//     // Company state - similar to PurchaseBillsList
//     const [company, setCompany] = useState({
//         dateFormat: 'english',
//         vatEnabled: true,
//         fiscalYear: {}
//     });

//     // Date range state - similar to PurchaseBillsList
//     const [dateRange, setDateRange] = useState(() => {
//         if (draftSave?.partyTurnoverData) {
//             return {
//                 fromDate: draftSave.partyTurnoverData.fromDate || '',
//                 toDate: draftSave.partyTurnoverData.toDate || '',
//                 fromDateAd: draftSave.partyTurnoverData.fromDateAd || '',
//                 toDateAd: draftSave.partyTurnoverData.toDateAd || ''
//             };
//         }
//         return {
//             fromDate: '',
//             toDate: '',
//             fromDateAd: '',
//             toDateAd: ''
//         };
//     });

//     // Form state - without dates
//     const [formData, setFormData] = useState(() => {
//         if (draftSave?.partyTurnoverData) {
//             return {
//                 amount: draftSave.partyTurnoverData.amount || '',
//                 transactionType: draftSave.partyTurnoverData.transactionType || 'Sales',
//                 paymentMode: draftSave.partyTurnoverData.paymentMode || 'all'
//             };
//         }
//         return {
//             amount: '',
//             transactionType: 'Sales',
//             paymentMode: 'all'
//         };
//     });

//     // Results state
//     const [data, setData] = useState(() => {
//         if (draftSave?.partyTurnoverResults) {
//             return draftSave.partyTurnoverResults;
//         }
//         return {
//             thresholdAmount: 0,
//             transactionType: 'Sales',
//             parties: [],
//             summary: {
//                 totalParties: 0,
//                 totalTransactions: 0,
//                 totalAmount: 0,
//                 totalVatAmount: 0,
//                 averageTransactionAmount: 0,
//                 minTransactionAmount: 0,
//                 maxTransactionAmount: 0,
//                 firstTransactionDate: null,
//                 lastTransactionDate: null
//             },
//             generatedDate: null,
//             generatedDateNepali: null
//         };
//     });

//     // UI state
//     const [loading, setLoading] = useState(false);
//     const [initialLoading, setInitialLoading] = useState(true);
//     const [error, setError] = useState(null);
//     const [hasGenerated, setHasGenerated] = useState(false);
//     const [exporting, setExporting] = useState(false);
//     const [dateError, setDateError] = useState('');
//     const [currentPage, setCurrentPage] = useState(1);
//     const [itemsPerPage, setItemsPerPage] = useState(10);
//     const [sortConfig, setSortConfig] = useState({ key: 'totalAmount', direction: 'descending' });
//     const [searchQuery, setSearchQuery] = useState('');
//     const [expandedParties, setExpandedParties] = useState({});
//     const [isNavigating, setIsNavigating] = useState(false);

//     // Refs
//     const amountRef = useRef(null);
//     const fromDateRef = useRef(null);
//     const toDateRef = useRef(null);
//     const fromDateAdRef = useRef(null);
//     const toDateAdRef = useRef(null);
//     const generateBtnRef = useRef(null);
//     const abortControllerRef = useRef(null);
//     const isFirstRender = useRef(true);

//     // Notification state
//     const [notification, setNotification] = useState({
//         show: false,
//         message: '',
//         type: 'success',
//         duration: 3000
//     });

//     // API instance - same as PurchaseBillsList
//     const api = useMemo(() => {
//         const instance = axios.create({
//             baseURL: process.env.REACT_APP_API_BASE_URL,
//             withCredentials: true,
//         });
//         instance.interceptors.request.use(
//             (config) => {
//                 const token = localStorage.getItem('token');
//                 if (token) config.headers.Authorization = `Bearer ${token}`;
//                 return config;
//             },
//             (error) => Promise.reject(error)
//         );
//         return instance;
//     }, []);

//     // Fetch company and fiscal year info - USING THE SAME API AS PURCHASEBILLSLIST
//     useEffect(() => {
//         const fetchInitialData = async () => {
//             try {
//                 setInitialLoading(true);
//                 // Use the same API endpoint as PurchaseBillsList
//                 const response = await api.get('/api/retailer/purchase/entry-data');

//                 if (response.data.success) {
//                     const responseData = response.data.data;

//                     const dateFormat = responseData.company.dateFormat?.toLowerCase() || 'english';
//                     const isNepaliFormat = dateFormat === 'nepali';

//                     setCompany({
//                         ...responseData.company,
//                         dateFormat: dateFormat,
//                         vatEnabled: responseData.company.vatEnabled || true,
//                         isVatExempt: responseData.company.isVatExempt || false,
//                         fiscalYear: responseData.currentFiscalYear || {}
//                     });

//                     const currentFiscalYear = responseData.currentFiscalYear;
//                     const hasDraftDates = draftSave?.partyTurnoverData?.fromDate &&
//                         draftSave?.partyTurnoverData?.toDate;

//                     // Set default dates using fiscal year - same logic as PurchaseBillsList
//                     if (!hasDraftDates && currentFiscalYear) {
//                         let fromDateFormatted = '';
//                         let toDateFormatted = '';
//                         let fromDateAd = '';
//                         let toDateAd = '';

//                         if (isNepaliFormat) {
//                             // Use fiscal year start date for from date in Nepali format
//                             fromDateFormatted = currentFiscalYear.startDateNepali || currentNepaliDate;
//                             toDateFormatted = currentNepaliDate;
//                             fromDateAd = convertBsToAd(fromDateFormatted);
//                             toDateAd = convertBsToAd(toDateFormatted);
//                         } else {
//                             // Use fiscal year start date for from date in English format
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
//                             fromDate: fromDateFormatted,    // Will be Nepali date like "2081-04-01"
//                             toDate: toDateFormatted,        // Will be Nepali date like current date
//                             fromDateAd: fromDateAd,         // Will be English date like "2024-07-16"
//                             toDateAd: toDateAd              // Will be English date like "2025-01-28"
//                         });
//                     } else if (hasDraftDates) {
//                         // If draft exists, ensure AD dates are set correctly
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
//                 }
//             } catch (err) {
//                 console.error('Error fetching initial data:', err);
//                 // Fallback - use current dates
//                 setDateRange({
//                     fromDate: currentNepaliDate,
//                     toDate: currentNepaliDate,
//                     fromDateAd: currentEnglishDate,
//                     toDateAd: currentEnglishDate
//                 });
//                 setNotification({
//                     show: true,
//                     message: 'Error loading company data. Using default dates.',
//                     type: 'error',
//                     duration: 3000
//                 });
//             } finally {
//                 setInitialLoading(false);
//             }
//         };

//         fetchInitialData();
//     }, []);

//     // Handle form input changes
//     const handleInputChange = (e) => {
//         const { name, value } = e.target;
//         setFormData(prev => ({ ...prev, [name]: value }));
//     };

//     // Handle amount change with validation
//     const handleAmountChange = (e) => {
//         const value = e.target.value;
//         if (value === '' || /^\d*\.?\d*$/.test(value)) {
//             setFormData(prev => ({ ...prev, amount: value }));
//         }
//     };

//     // Handle BS date changes - same as PurchaseBillsList
//     const handleBsDateChange = (field, value) => {
//         const adDate = convertBsToAd(value);
//         setDateRange(prev => ({
//             ...prev,
//             [field]: value,
//             [`${field}Ad`]: adDate || prev[`${field}Ad`]
//         }));
//         setDateError('');
//     };

//     // Handle AD date changes - same as PurchaseBillsList
//     const handleAdDateChange = (field, value) => {
//         const bsDate = convertAdToBs(value);
//         setDateRange(prev => ({
//             ...prev,
//             [field]: bsDate || prev[field],
//             [`${field}Ad`]: value
//         }));
//         setDateError('');
//     };

//     // Validate BS date on blur - same as PurchaseBillsList
//     const handleBsDateBlur = (field) => {
//         const dateStr = dateRange[field]?.trim();
//         if (!dateStr) return;
//         if (company.dateFormat === 'nepali') {
//             const correctedDate = validateAndCorrectNepaliDate(dateStr);
//             if (!correctedDate) {
//                 const fallbackDate = currentNepaliDate;
//                 const adDate = convertBsToAd(fallbackDate) || currentEnglishDate;
//                 setDateRange(prev => ({
//                     ...prev,
//                     [field]: fallbackDate,
//                     [`${field}Ad`]: adDate
//                 }));
//                 setNotification({
//                     show: true,
//                     message: 'Invalid Nepali date. Auto-corrected to current date.',
//                     type: 'warning',
//                     duration: 3000
//                 });
//             } else if (correctedDate !== dateStr) {
//                 const adDate = convertBsToAd(correctedDate) || currentEnglishDate;
//                 setDateRange(prev => ({
//                     ...prev,
//                     [field]: correctedDate,
//                     [`${field}Ad`]: adDate
//                 }));
//                 setNotification({
//                     show: true,
//                     message: 'Date auto-corrected to valid Nepali date.',
//                     type: 'warning',
//                     duration: 3000
//                 });
//             }
//         }
//     };

//     // Handle Enter key navigation - same as PurchaseBillsList
//     const handleKeyDown = (e, nextField) => {
//         if (e.key === 'Enter') {
//             e.preventDefault();
//             if (nextField === 'generate') {
//                 handleGenerateReport();
//             } else if (nextField) {
//                 const nextElement = document.getElementById(nextField);
//                 if (nextElement) {
//                     nextElement.focus();
//                 }
//             }
//         }
//     };

//     // Toggle party expansion
//     const togglePartyExpansion = (partyId) => {
//         setExpandedParties(prev => ({
//             ...prev,
//             [partyId]: !prev[partyId]
//         }));
//     };

//     // Generate report
//     const handleGenerateReport = useCallback(async () => {
//         // Validate required fields
//         if (!formData.amount || parseFloat(formData.amount) <= 0) {
//             setNotification({
//                 show: true,
//                 message: 'Please enter a valid amount (greater than 0)',
//                 type: 'warning',
//                 duration: 3000
//             });
//             amountRef.current?.focus();
//             return;
//         }

//         // Validate dates
//         if (!dateRange.fromDate || !dateRange.toDate) {
//             setNotification({
//                 show: true,
//                 message: 'Please select both from and to dates',
//                 type: 'warning',
//                 duration: 3000
//             });
//             fromDateRef.current?.focus();
//             return;
//         }

//         if (company.dateFormat === 'nepali') {
//             if (!isValidNepaliDate(dateRange.fromDate) || !isValidNepaliDate(dateRange.toDate)) {
//                 setNotification({
//                     show: true,
//                     message: 'Invalid Nepali date format',
//                     type: 'warning',
//                     duration: 3000
//                 });
//                 return;
//             }
//         }

//         // Prepare request params - use AD dates for API
//         const params = new URLSearchParams({
//             amount: formData.amount,
//             transactionType: formData.transactionType,
//             paymentMode: formData.paymentMode || 'all'
//         });

//         // Add date filters using AD dates
//         if (dateRange.fromDateAd) {
//             params.append('fromDate', dateRange.fromDateAd);
//         }
//         if (dateRange.toDateAd) {
//             params.append('toDate', dateRange.toDateAd);
//         }

//         // Cancel previous request if any
//         if (abortControllerRef.current) {
//             abortControllerRef.current.abort();
//         }
//         abortControllerRef.current = new AbortController();

//         try {
//             setLoading(true);
//             setError(null);

//             const url = `/api/retailer/party-turnover?${params.toString()}`;
//             const response = await api.get(url, {
//                 signal: abortControllerRef.current.signal
//             });

//             if (response.data.success) {
//                 const responseData = response.data.data;
//                 setData({
//                     thresholdAmount: responseData.thresholdAmount || 0,
//                     transactionType: responseData.transactionType || 'Sales',
//                     parties: responseData.parties || [],
//                     summary: responseData.summary || {
//                         totalParties: 0,
//                         totalTransactions: 0,
//                         totalAmount: 0,
//                         totalVatAmount: 0,
//                         averageTransactionAmount: 0,
//                         minTransactionAmount: 0,
//                         maxTransactionAmount: 0,
//                         firstTransactionDate: null,
//                         lastTransactionDate: null
//                     },
//                     generatedDate: responseData.generatedDate || null,
//                     generatedDateNepali: responseData.generatedDateNepali || null
//                 });
//                 setHasGenerated(true);
//                 setCurrentPage(1);
//                 setExpandedParties({});
//                 setNotification({
//                     show: true,
//                     message: `Found ${responseData.parties?.length || 0} parties with turnover >= ${formData.amount}`,
//                     type: 'success',
//                     duration: 3000
//                 });
//             } else {
//                 setNotification({
//                     show: true,
//                     message: response.data.error || 'Failed to generate report',
//                     type: 'error',
//                     duration: 3000
//                 });
//             }
//         } catch (err) {
//             if (err.name !== 'AbortError' && err.name !== 'CanceledError') {
//                 const errorMsg = err.response?.data?.error || 'Failed to fetch party turnover data';
//                 setError(errorMsg);
//                 setNotification({
//                     show: true,
//                     message: errorMsg,
//                     type: 'error',
//                     duration: 3000
//                 });
//             }
//         } finally {
//             setLoading(false);
//         }
//     }, [api, formData, dateRange, company.dateFormat]);

//     // Save draft - same as PurchaseBillsList
//     useEffect(() => {
//         if (isFirstRender.current) {
//             isFirstRender.current = false;
//             return;
//         }

//         if (hasGenerated && !isNavigating) {
//             setDraftSave({
//                 ...draftSave,
//                 partyTurnoverData: {
//                     ...formData,
//                     ...dateRange
//                 },
//                 partyTurnoverResults: data
//             });
//         }
//     }, [formData, dateRange, data, hasGenerated, isNavigating]);

//     // Cleanup on unmount
//     useEffect(() => {
//         return () => {
//             if (abortControllerRef.current) {
//                 abortControllerRef.current.abort();
//             }
//         };
//     }, []);

//     // Filter and sort parties
//     const filteredParties = useMemo(() => {
//         if (!data.parties || !data.parties.length) return [];

//         let filtered = data.parties;

//         if (searchQuery.trim()) {
//             const searchLower = searchQuery.toLowerCase();
//             filtered = filtered.filter(party =>
//                 party.partyName?.toLowerCase().includes(searchLower) ||
//                 party.pan?.toLowerCase().includes(searchLower) ||
//                 party.phone?.toLowerCase().includes(searchLower)
//             );
//         }

//         filtered = [...filtered].sort((a, b) => {
//             let aVal, bVal;
//             switch (sortConfig.key) {
//                 case 'partyName':
//                     aVal = a.partyName || '';
//                     bVal = b.partyName || '';
//                     break;
//                 case 'totalAmount':
//                     aVal = a.totalAmount || 0;
//                     bVal = b.totalAmount || 0;
//                     break;
//                 case 'transactionCount':
//                     aVal = a.transactionCount || 0;
//                     bVal = b.transactionCount || 0;
//                     break;
//                 case 'averageAmount':
//                     aVal = a.averageAmount || 0;
//                     bVal = b.averageAmount || 0;
//                     break;
//                 default:
//                     aVal = a[sortConfig.key] || '';
//                     bVal = b[sortConfig.key] || '';
//             }
//             if (sortConfig.direction === 'ascending') {
//                 return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
//             } else {
//                 return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
//             }
//         });

//         return filtered;
//     }, [data.parties, searchQuery, sortConfig]);

//     // Pagination
//     const paginatedParties = useMemo(() => {
//         if (itemsPerPage === 'all') return filteredParties;
//         const start = (currentPage - 1) * itemsPerPage;
//         const end = start + itemsPerPage;
//         return filteredParties.slice(start, end);
//     }, [filteredParties, currentPage, itemsPerPage]);

//     const totalPages = Math.ceil(filteredParties.length / (itemsPerPage === 'all' ? 1 : itemsPerPage));

//     // Format currency
//     const formatCurrency = useCallback((num) => {
//         if (num === undefined || num === null) return '0.00';
//         const number = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num);
//         if (isNaN(number)) return '0.00';
//         return number.toLocaleString('en-IN', {
//             minimumFractionDigits: 2,
//             maximumFractionDigits: 2
//         });
//     }, []);

//     // Format date
//     const formatDate = useCallback((dateStr) => {
//         if (!dateStr) return '-';
//         try {
//             const date = new Date(dateStr);
//             if (isNaN(date.getTime())) return dateStr;
//             return date.toLocaleDateString('en-US', {
//                 year: 'numeric',
//                 month: 'short',
//                 day: 'numeric'
//             });
//         } catch {
//             return dateStr;
//         }
//     }, []);

//     // Export to Excel
//     const exportToExcel = async () => {
//         if (!hasGenerated || !data.parties?.length) {
//             setNotification({
//                 show: true,
//                 message: 'Please generate the report first',
//                 type: 'warning',
//                 duration: 3000
//             });
//             return;
//         }

//         setExporting(true);
//         try {
//             const excelData = [];

//             excelData.push({
//                 'Party Name': 'PARTY TURNOVER REPORT',
//                 'Transaction Count': '',
//                 'Total Amount': '',
//                 'Average Amount': '',
//                 'Min Amount': '',
//                 'Max Amount': '',
//                 'Threshold': formatCurrency(data.thresholdAmount),
//                 'Type': data.transactionType
//             });
//             excelData.push({});

//             excelData.push({
//                 'Party Name': 'Party Name',
//                 'Transaction Count': 'Transactions',
//                 'Total Amount': 'Total Amount',
//                 'Average Amount': 'Avg Amount',
//                 'Min Amount': 'Min Amount',
//                 'Max Amount': 'Max Amount',
//                 'PAN': 'PAN',
//                 'Phone': 'Phone'
//             });

//             filteredParties.forEach(party => {
//                 excelData.push({
//                     'Party Name': party.partyName || '-',
//                     'Transaction Count': party.transactionCount || 0,
//                     'Total Amount': formatCurrency(party.totalAmount),
//                     'Average Amount': formatCurrency(party.averageAmount),
//                     'Min Amount': formatCurrency(party.minAmount),
//                     'Max Amount': formatCurrency(party.maxAmount),
//                     'PAN': party.pan || '-',
//                     'Phone': party.phone || '-'
//                 });
//             });

//             excelData.push({});
//             excelData.push({
//                 'Party Name': 'SUMMARY',
//                 'Transaction Count': data.summary.totalTransactions,
//                 'Total Amount': formatCurrency(data.summary.totalAmount),
//                 'Average Amount': formatCurrency(data.summary.averageTransactionAmount),
//                 'PAN': `Total Parties: ${data.summary.totalParties}`
//             });

//             const ws = XLSX.utils.json_to_sheet(excelData);
//             const wb = XLSX.utils.book_new();
//             XLSX.utils.book_append_sheet(wb, ws, 'Party Turnover');
//             XLSX.writeFile(wb, `Party_Turnover_Report_${new Date().toISOString().split('T')[0]}.xlsx`);

//             setNotification({
//                 show: true,
//                 message: 'Excel file exported successfully!',
//                 type: 'success',
//                 duration: 3000
//             });
//         } catch (err) {
//             setNotification({
//                 show: true,
//                 message: 'Failed to export data',
//                 type: 'error',
//                 duration: 3000
//             });
//         } finally {
//             setExporting(false);
//         }
//     };

//     // Print report
//     const printReport = () => {
//         if (!hasGenerated || !data.parties?.length) {
//             setNotification({
//                 show: true,
//                 message: 'Please generate the report first',
//                 type: 'warning',
//                 duration: 3000
//             });
//             return;
//         }

//         const printWindow = window.open('', '_blank');
//         if (!printWindow) {
//             setNotification({
//                 show: true,
//                 message: 'Popup blocked. Please allow popups for this site.',
//                 type: 'error',
//                 duration: 3000
//             });
//             return;
//         }

//         const partyRows = filteredParties.map((party, idx) => `
//             <tr>
//                 <td class="text-center">${idx + 1}</td>
//                 <td><strong>${party.partyName || '-'}</strong></td>
//                 <td class="text-center">${party.transactionCount || 0}</td>
//                 <td class="text-end">${formatCurrency(party.totalAmount)}</td>
//                 <td class="text-end">${formatCurrency(party.averageAmount)}</td>
//                 <td class="text-end">${formatCurrency(party.minAmount)}</td>
//                 <td class="text-end">${formatCurrency(party.maxAmount)}</td>
//                 <td>${party.pan || '-'}</td>
//                 <td>${party.phone || '-'}</td>
//             </tr>
//         `).join('');

//         const printContent = `
//         <!DOCTYPE html>
//         <html>
//         <head>
//             <title>Party Turnover Report</title>
//             <meta charset="UTF-8">
//             <style>
//                 @page { margin: 10mm; size: A4 landscape; }
//                 * { margin: 0; padding: 0; box-sizing: border-box; }
//                 body { font-family: Arial, sans-serif; font-size: 9px; padding: 5mm; }
//                 .header { text-align: center; margin-bottom: 10px; }
//                 .header h1 { font-size: 14px; margin: 0; }
//                 .header p { font-size: 9px; margin: 2px 0; }
//                 .header hr { margin: 5px 0; }
//                 .report-title { text-align: center; font-size: 12px; font-weight: bold; margin: 5px 0; }
//                 .summary-box { 
//                     display: flex; 
//                     flex-wrap: wrap;
//                     justify-content: space-between; 
//                     margin: 8px 0; 
//                     padding: 5px; 
//                     background: #f5f5f5; 
//                     border: 1px solid #ddd;
//                     font-size: 8px;
//                 }
//                 .summary-box .item { 
//                     text-align: center; 
//                     padding: 2px 10px;
//                 }
//                 .summary-box .label { font-weight: bold; display: block; }
//                 .summary-box .value { font-size: 10px; color: #333; }
//                 table { width: 100%; border-collapse: collapse; font-size: 8px; }
//                 th, td { border: 1px solid #000; padding: 3px 5px; text-align: left; }
//                 th { background: #e6e6e6; font-weight: bold; }
//                 .text-center { text-align: center; }
//                 .text-end { text-align: right; }
//                 .footer { margin-top: 10px; font-size: 7px; text-align: center; border-top: 1px solid #ccc; padding-top: 5px; }
//             </style>
//         </head>
//         <body>
//             <div class="header">
//                 <h1>Party Turnover Report</h1>
//                 <p>Generated on ${new Date().toLocaleString()}</p>
//                 <hr>
//             </div>

//             <div class="summary-box">
//                 <div class="item">
//                     <span class="label">Threshold Amount</span>
//                     <span class="value">${formatCurrency(data.thresholdAmount)}</span>
//                 </div>
//                 <div class="item">
//                     <span class="label">Transaction Type</span>
//                     <span class="value">${data.transactionType}</span>
//                 </div>
//                 <div class="item">
//                     <span class="label">Total Parties</span>
//                     <span class="value">${data.summary.totalParties}</span>
//                 </div>
//                 <div class="item">
//                     <span class="label">Total Transactions</span>
//                     <span class="value">${data.summary.totalTransactions}</span>
//                 </div>
//                 <div class="item">
//                     <span class="label">Total Amount</span>
//                     <span class="value">${formatCurrency(data.summary.totalAmount)}</span>
//                 </div>
//             </div>

//             <table>
//                 <thead>
//                     <tr>
//                         <th class="text-center">#</th>
//                         <th>Party Name</th>
//                         <th class="text-center">Transactions</th>
//                         <th class="text-end">Total Amount</th>
//                         <th class="text-end">Average</th>
//                         <th class="text-end">Min</th>
//                         <th class="text-end">Max</th>
//                         <th>PAN</th>
//                         <th>Phone</th>
//                     </tr>
//                 </thead>
//                 <tbody>${partyRows}</tbody>
//                 <tfoot>
//                     <tr style="font-weight: bold; background: #e6e6e6;">
//                         <td colspan="2" class="text-end">TOTAL</td>
//                         <td class="text-center">${data.summary.totalTransactions}</td>
//                         <td class="text-end">${formatCurrency(data.summary.totalAmount)}</td>
//                         <td class="text-end">${formatCurrency(data.summary.averageTransactionAmount)}</td>
//                         <td colspan="4"></td>
//                     </tr>
//                 </tfoot>
//             </table>

//             <div class="footer">
//                 Generated on ${new Date().toLocaleString()} | Page 1 of 1
//             </div>

//             <script>
//                 window.onload = function() {
//                     setTimeout(function() {
//                         window.print();
//                         setTimeout(function() { window.close(); }, 500);
//                     }, 200);
//                 };
//             <\/script>
//         </body>
//         </html>
//         `;

//         printWindow.document.write(printContent);
//         printWindow.document.close();
//     };

//     // Sort function
//     const sortItems = (key) => {
//         setSortConfig(prev => ({
//             key,
//             direction: prev.key === key && prev.direction === 'ascending' ? 'descending' : 'ascending'
//         }));
//     };

//     const getSortIndicator = (key) => {
//         return sortConfig.key === key ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : '';
//     };

//     // Page change handler
//     const handlePageChange = (newPage) => {
//         if (newPage >= 1 && newPage <= totalPages) {
//             setCurrentPage(newPage);
//             window.scrollTo({ top: 0, behavior: 'smooth' });
//         }
//     };

//     // F9 key for product modal
//     useEffect(() => {
//         const handleKeyDown = (e) => {
//             if (e.key === 'F9') {
//                 e.preventDefault();
//                 setShowProductModal(prev => !prev);
//             }
//         };
//         window.addEventListener('keydown', handleKeyDown);
//         return () => window.removeEventListener('keydown', handleKeyDown);
//     }, []);

//     if (initialLoading) return <Loader />;

//     return (
//         <div className="container-fluid party-turnover-container">
//             <Header />

//             <div className="card mt-2 shadow-lg p-0 animate__animated animate__fadeInUp expanded-card ledger-card compact">
//                 <div className="card-header bg-white py-0">
//                     <h1 className="h4 mb-0 text-center text-white">Party Turnover Report</h1>
//                 </div>

//                 <div className="card-body p-2 p-md-3">
//                     {/* Filter Section */}
//                     <div className="row g-2 mb-3">
//                         {/* Transaction Type */}
//                         <div className="col-12" style={{ flex: '0 0 auto', width: '10%' }}>
//                             <div className="position-relative">
//                                 <select
//                                     id="transactionType"
//                                     name="transactionType"
//                                     className="form-select form-select-sm"
//                                     value={formData.transactionType}
//                                     onChange={handleInputChange}
//                                     style={{ paddingTop: '0.25rem', height: '30px', fontSize: '0.875rem' }}
//                                 >
//                                     <option value="Sales">Sales</option>
//                                     <option value="Purchase">Purchase</option>
//                                 </select>
//                                 <label className="position-absolute" style={{
//                                     top: '-0.5rem',
//                                     left: '0.75rem',
//                                     fontSize: '0.75rem',
//                                     backgroundColor: 'white',
//                                     padding: '0 0.25rem',
//                                     color: '#6c757d',
//                                     fontWeight: '500'
//                                 }}>
//                                     Type
//                                 </label>
//                             </div>
//                         </div>

//                         {/* Amount */}
//                         <div className="col-12" style={{ flex: '0 0 auto', width: '10%' }}>
//                             <div className="position-relative">
//                                 <input
//                                     type="text"
//                                     id="amount"
//                                     ref={amountRef}
//                                     name="amount"
//                                     className="form-control form-control-sm"
//                                     value={formData.amount}
//                                     onChange={handleAmountChange}
//                                     onKeyDown={(e) => handleKeyDown(e, 'fromDate')}
//                                     placeholder="0.00"
//                                     autoComplete="off"
//                                     style={{ paddingTop: '0.75rem', height: '26px', fontSize: '0.875rem' }}
//                                 />
//                                 <label className="position-absolute" style={{
//                                     top: '-0.5rem',
//                                     left: '0.75rem',
//                                     fontSize: '0.75rem',
//                                     backgroundColor: 'white',
//                                     padding: '0 0.25rem',
//                                     color: '#6c757d',
//                                     fontWeight: '500'
//                                 }}>
//                                     Amount (≥) <span className="text-danger">*</span>
//                                 </label>
//                             </div>
//                         </div>

//                         {/* From Date (BS) - UPDATED to display Nepali date */}
//                         <div className="col-12" style={{ flex: '0 0 auto', width: '10%' }}>
//                             <div className="position-relative">
//                                 <input
//                                     type="text"
//                                     id="fromDate"
//                                     name="fromDate"
//                                     ref={fromDateRef}
//                                     className={`form-control form-control-sm ${dateError ? 'is-invalid' : ''}`}
//                                     value={dateRange.fromDate || ''}
//                                     onChange={(e) => {
//                                         const value = e.target.value;
//                                         const sanitizedValue = value.replace(/[^0-9/-]/g, '').slice(0, 10);
//                                         handleBsDateChange('fromDate', sanitizedValue);
//                                     }}
//                                     onBlur={() => handleBsDateBlur('fromDate')}
//                                     onKeyDown={(e) => {
//                                         if (e.key === 'Enter') {
//                                             e.preventDefault();
//                                             const dateStr = e.target.value.trim();
//                                             if (!dateStr) {
//                                                 const fallbackDate = company.dateFormat === 'nepali' ? currentNepaliDate : currentEnglishDate;
//                                                 const adDate = convertBsToAd(fallbackDate) || currentEnglishDate;
//                                                 setDateRange(prev => ({
//                                                     ...prev,
//                                                     fromDate: fallbackDate,
//                                                     fromDateAd: adDate
//                                                 }));
//                                                 setNotification({
//                                                     show: true,
//                                                     message: 'Date required. Auto-corrected to current date.',
//                                                     type: 'warning',
//                                                     duration: 3000
//                                                 });
//                                                 handleKeyDown(e, 'fromDateAd');
//                                             } else if (dateError) {
//                                                 e.target.focus();
//                                             } else {
//                                                 handleKeyDown(e, 'fromDateAd');
//                                             }
//                                         }
//                                     }}
//                                     placeholder="YYYY-MM-DD (BS)"
//                                     autoComplete="off"
//                                     style={{ paddingTop: '0.75rem', height: '26px', fontSize: '0.875rem' }}
//                                 />
//                                 <label className="position-absolute" style={{
//                                     top: '-0.5rem',
//                                     left: '0.75rem',
//                                     fontSize: '0.75rem',
//                                     backgroundColor: 'white',
//                                     padding: '0 0.25rem',
//                                     color: '#6c757d',
//                                     fontWeight: '500'
//                                 }}>
//                                     From (BS): <span className="text-danger">*</span>
//                                 </label>
//                             </div>
//                         </div>

//                         {/* From Date (AD) */}
//                         <div className="col-12" style={{ flex: '0 0 auto', width: '10%' }}>
//                             <div className="position-relative">
//                                 <input
//                                     type="date"
//                                     id="fromDateAd"
//                                     name="fromDateAd"
//                                     ref={fromDateAdRef}
//                                     className="form-control form-control-sm"
//                                     value={dateRange.fromDateAd || ''}
//                                     onChange={(e) => handleAdDateChange('fromDate', e.target.value)}
//                                     onKeyDown={(e) => { if (e.key === 'Enter') handleKeyDown(e, 'toDate'); }}
//                                     style={{ paddingTop: '0.75rem', height: '26px', fontSize: '0.875rem' }}
//                                 />
//                                 <label className="position-absolute" style={{
//                                     top: '-0.5rem',
//                                     left: '0.75rem',
//                                     fontSize: '0.75rem',
//                                     backgroundColor: 'white',
//                                     padding: '0 0.25rem',
//                                     color: '#6c757d',
//                                     fontWeight: '500'
//                                 }}>
//                                     From (AD):
//                                 </label>
//                             </div>
//                         </div>

//                         {/* To Date (BS) - UPDATED to display Nepali date */}
//                         <div className="col-12" style={{ flex: '0 0 auto', width: '10%' }}>
//                             <div className="position-relative">
//                                 <input
//                                     type="text"
//                                     id="toDate"
//                                     name="toDate"
//                                     ref={toDateRef}
//                                     className="form-control form-control-sm"
//                                     value={dateRange.toDate || ''}
//                                     onChange={(e) => {
//                                         const value = e.target.value;
//                                         const sanitizedValue = value.replace(/[^0-9/-]/g, '').slice(0, 10);
//                                         handleBsDateChange('toDate', sanitizedValue);
//                                     }}
//                                     onBlur={() => handleBsDateBlur('toDate')}
//                                     onKeyDown={(e) => {
//                                         if (e.key === 'Enter') {
//                                             e.preventDefault();
//                                             const dateStr = e.target.value.trim();
//                                             if (!dateStr) {
//                                                 const fallbackDate = company.dateFormat === 'nepali' ? currentNepaliDate : currentEnglishDate;
//                                                 const adDate = convertBsToAd(fallbackDate) || currentEnglishDate;
//                                                 setDateRange(prev => ({
//                                                     ...prev,
//                                                     toDate: fallbackDate,
//                                                     toDateAd: adDate
//                                                 }));
//                                                 setNotification({
//                                                     show: true,
//                                                     message: 'Date required. Auto-corrected to current date.',
//                                                     type: 'warning',
//                                                     duration: 3000
//                                                 });
//                                                 handleKeyDown(e, 'toDateAd');
//                                             } else {
//                                                 handleKeyDown(e, 'toDateAd');
//                                             }
//                                         }
//                                     }}
//                                     placeholder="YYYY-MM-DD (BS)"
//                                     autoComplete="off"
//                                     style={{ paddingTop: '0.75rem', height: '26px', fontSize: '0.875rem' }}
//                                 />
//                                 <label className="position-absolute" style={{
//                                     top: '-0.5rem',
//                                     left: '0.75rem',
//                                     fontSize: '0.75rem',
//                                     backgroundColor: 'white',
//                                     padding: '0 0.25rem',
//                                     color: '#6c757d',
//                                     fontWeight: '500'
//                                 }}>
//                                     To (BS): <span className="text-danger">*</span>
//                                 </label>
//                             </div>
//                         </div>

//                         {/* To Date (AD) */}
//                         <div className="col-12" style={{ flex: '0 0 auto', width: '10%' }}>
//                             <div className="position-relative">
//                                 <input
//                                     type="date"
//                                     id="toDateAd"
//                                     name="toDateAd"
//                                     ref={toDateAdRef}
//                                     className="form-control form-control-sm"
//                                     value={dateRange.toDateAd || ''}
//                                     onChange={(e) => handleAdDateChange('toDate', e.target.value)}
//                                     onKeyDown={(e) => { if (e.key === 'Enter') handleKeyDown(e, 'paymentMode'); }}
//                                     style={{ paddingTop: '0.75rem', height: '26px', fontSize: '0.875rem' }}
//                                 />
//                                 <label className="position-absolute" style={{
//                                     top: '-0.5rem',
//                                     left: '0.75rem',
//                                     fontSize: '0.75rem',
//                                     backgroundColor: 'white',
//                                     padding: '0 0.25rem',
//                                     color: '#6c757d',
//                                     fontWeight: '500'
//                                 }}>
//                                     To (AD):
//                                 </label>
//                             </div>
//                         </div>

//                         {/* Payment Mode */}
//                         <div className="col-12" style={{ flex: '0 0 auto', width: '10%' }}>
//                             <div className="position-relative">
//                                 <select
//                                     id="paymentMode"
//                                     name="paymentMode"
//                                     className="form-select form-select-sm"
//                                     value={formData.paymentMode}
//                                     onChange={handleInputChange}
//                                     onKeyDown={(e) => {
//                                         if (e.key === 'Enter') {
//                                             e.preventDefault();
//                                             handleGenerateReport();
//                                         }
//                                     }}
//                                     style={{ paddingTop: '0.25rem', height: '30px', fontSize: '0.875rem' }}
//                                 >
//                                     <option value="all">All</option>
//                                     <option value="cash">Cash</option>
//                                     <option value="credit">Credit</option>
//                                     <option value="payment">Payment</option>
//                                     <option value="receipt">Receipt</option>
//                                     <option value="journal">Journal</option>
//                                     <option value="exclude-cash">Exclude Cash</option>
//                                 </select>
//                                 <label className="position-absolute" style={{
//                                     top: '-0.5rem',
//                                     left: '0.75rem',
//                                     fontSize: '0.75rem',
//                                     backgroundColor: 'white',
//                                     padding: '0 0.25rem',
//                                     color: '#6c757d',
//                                     fontWeight: '500'
//                                 }}>
//                                     Payment Mode
//                                 </label>
//                             </div>
//                         </div>

//                         {/* Generate Button */}
//                         <div className="col-12" style={{ flex: '0 0 auto', width: '10%' }}>
//                             <button
//                                 type="button"
//                                 id="generateBtn"
//                                 ref={generateBtnRef}
//                                 className="btn btn-primary btn-sm w-100"
//                                 onClick={handleGenerateReport}
//                                 disabled={loading}
//                                 style={{ height: '30px', fontSize: '0.8rem', fontWeight: '500' }}
//                             >
//                                 {loading ? (
//                                     <span className="spinner-border spinner-border-sm" style={{ width: '14px', height: '14px' }} />
//                                 ) : (
//                                     <><i className="bi bi-search me-1"></i> Generate</>
//                                 )}
//                             </button>
//                         </div>

//                         {/* Action Buttons */}
//                         <div className="col-12" style={{ flex: '0 0 auto', width: '10%' }}>
//                             <button
//                                 className="btn btn-outline-success btn-sm d-flex align-items-center"
//                                 onClick={exportToExcel}
//                                 disabled={exporting}
//                             >
//                                 <i className="bi bi-file-earmark-excel-fill me-1"></i>
//                                 {exporting ? 'Exporting...' : 'Excel'}
//                             </button>
//                         </div>
//                         <div className="col-12" style={{ flex: '0 0 auto', width: '10%' }}>

//                             <button
//                                 className="btn btn-outline-primary btn-sm d-flex align-items-center"
//                                 onClick={printReport}
//                             >
//                                 <i className="bi bi-printer me-1"></i>
//                                 Print
//                             </button>
//                         </div>
//                     </div>

//                     {/* Error Display */}
//                     {error && (
//                         <div className="alert alert-danger text-center py-1 mb-2 small">
//                             {error}
//                             <button className="btn-close btn-sm ms-2" onClick={() => setError(null)}></button>
//                         </div>
//                     )}

//                     {/* Results Section */}
//                     {hasGenerated && data.parties && (
//                         <>
//                             {/* Summary Stats */}
//                             <div className="row g-2 mb-3">
//                                 <div className="col-6 col-md-2">
//                                     <div className="stat-box p-2 bg-light rounded">
//                                         <div className="stat-label small text-muted">Total Parties</div>
//                                         <div className="stat-value h5 mb-0">{data.summary.totalParties}</div>
//                                     </div>
//                                 </div>
//                                 <div className="col-6 col-md-2">
//                                     <div className="stat-box p-2 bg-success bg-opacity-10 rounded">
//                                         <div className="stat-label small text-muted">Total Amount</div>
//                                         <div className="stat-value h5 mb-0 text-success">{formatCurrency(data.summary.totalAmount)}</div>
//                                     </div>
//                                 </div>
//                                 <div className="col-6 col-md-2">
//                                     <div className="stat-box p-2 bg-info bg-opacity-10 rounded">
//                                         <div className="stat-label small text-muted">Total VAT</div>
//                                         <div className="stat-value h5 mb-0 text-info">{formatCurrency(data.summary.totalVatAmount)}</div>
//                                     </div>
//                                 </div>
//                                 <div className="col-6 col-md-2">
//                                     <div className="stat-box p-2 bg-warning bg-opacity-10 rounded">
//                                         <div className="stat-label small text-muted">Avg Amount</div>
//                                         <div className="stat-value h5 mb-0 text-warning">{formatCurrency(data.summary.averageTransactionAmount)}</div>
//                                     </div>
//                                 </div>
//                                 <div className="col-6 col-md-2">
//                                     <div className="stat-box p-2 bg-primary bg-opacity-10 rounded">
//                                         <div className="stat-label small text-muted">Threshold</div>
//                                         <div className="stat-value h5 mb-0 text-primary">{formatCurrency(data.thresholdAmount)}</div>
//                                     </div>
//                                 </div>
//                                 <div className="col-6 col-md-2">
//                                     <div className="stat-box p-2 bg-secondary bg-opacity-10 rounded">
//                                         <div className="stat-label small text-muted">Type</div>
//                                         <div className="stat-value h5 mb-0">{data.transactionType}</div>
//                                     </div>
//                                 </div>
//                             </div>

//                             {/* Search Bar */}
//                             {data.parties.length > 0 && (
//                                 <div className="row mb-2">
//                                     <div className="col-12 col-md-4">
//                                         <div className="position-relative">
//                                             <input
//                                                 type="text"
//                                                 className="form-control form-control-sm"
//                                                 placeholder="Search parties..."
//                                                 value={searchQuery}
//                                                 onChange={(e) => setSearchQuery(e.target.value)}
//                                                 style={{ height: '30px', fontSize: '0.875rem' }}
//                                             />
//                                             <i className="bi bi-search position-absolute" style={{
//                                                 right: '10px',
//                                                 top: '50%',
//                                                 transform: 'translateY(-50%)',
//                                                 color: '#6c757d'
//                                             }}></i>
//                                         </div>
//                                     </div>
//                                     <div className="col-12 col-md-auto">
//                                         <select
//                                             className="form-select form-select-sm"
//                                             value={itemsPerPage}
//                                             onChange={(e) => {
//                                                 setItemsPerPage(e.target.value === 'all' ? 'all' : parseInt(e.target.value));
//                                                 setCurrentPage(1);
//                                             }}
//                                             style={{ height: '30px', fontSize: '0.875rem' }}
//                                         >
//                                             <option value="10">10 per page</option>
//                                             <option value="25">25 per page</option>
//                                             <option value="50">50 per page</option>
//                                             <option value="all">Show all</option>
//                                         </select>
//                                     </div>
//                                 </div>
//                             )}

//                             {/* Parties Table */}
//                             {data.parties.length > 0 ? (
//                                 <>
//                                     <div className="table-responsive" style={{ maxHeight: '500px', overflow: 'auto' }}>
//                                         <table className="table table-sm table-hover mb-0">
//                                             <thead className="table-light sticky-top">
//                                                 <tr>
//                                                     <th style={{ width: '50px' }}>#</th>
//                                                     <th className="sortable" onClick={() => sortItems('partyName')}>
//                                                         Party Name {getSortIndicator('partyName')}
//                                                     </th>
//                                                     <th className="sortable text-center" onClick={() => sortItems('transactionCount')}>
//                                                         Transactions {getSortIndicator('transactionCount')}
//                                                     </th>
//                                                     <th className="sortable text-end" onClick={() => sortItems('totalAmount')}>
//                                                         Total Amount {getSortIndicator('totalAmount')}
//                                                     </th>
//                                                     <th className="sortable text-end" onClick={() => sortItems('averageAmount')}>
//                                                         Average {getSortIndicator('averageAmount')}
//                                                     </th>
//                                                     <th className="text-end">Min</th>
//                                                     <th className="text-end">Max</th>
//                                                     <th>PAN</th>
//                                                     <th>Phone</th>
//                                                 </tr>
//                                             </thead>
//                                             <tbody>
//                                                 {paginatedParties.map((party, idx) => (
//                                                     <React.Fragment key={party.partyId || idx}>
//                                                         <tr
//                                                             className="party-row"
//                                                             onClick={() => togglePartyExpansion(party.partyId || idx)}
//                                                             style={{ cursor: 'pointer' }}
//                                                         >
//                                                             <td className="text-center">
//                                                                 {(currentPage - 1) * (itemsPerPage === 'all' ? 1 : itemsPerPage) + idx + 1}
//                                                             </td>
//                                                             <td>
//                                                                 <strong>{party.partyName || '-'}</strong>
//                                                                 {party.transactions?.length > 0 && (
//                                                                     <span className="badge bg-info ms-2" style={{ fontSize: '0.6rem' }}>
//                                                                         <i className="bi bi-chevron-down"></i>
//                                                                     </span>
//                                                                 )}
//                                                             </td>
//                                                             <td className="text-center">
//                                                                 <span className="badge bg-secondary">{party.transactionCount || 0}</span>
//                                                             </td>
//                                                             <td className="text-end fw-bold text-primary">
//                                                                 {formatCurrency(party.totalAmount)}
//                                                             </td>
//                                                             <td className="text-end">
//                                                                 {formatCurrency(party.averageAmount)}
//                                                             </td>
//                                                             <td className="text-end text-danger">
//                                                                 {formatCurrency(party.minAmount)}
//                                                             </td>
//                                                             <td className="text-end text-success">
//                                                                 {formatCurrency(party.maxAmount)}
//                                                             </td>
//                                                             <td>{party.pan || '-'}</td>
//                                                             <td>{party.phone || '-'}</td>
//                                                         </tr>

//                                                         {/* Expanded transactions */}
//                                                         {expandedParties[party.partyId || idx] && party.transactions?.length > 0 && (
//                                                             <tr>
//                                                                 <td colSpan="9" style={{ padding: 0 }}>
//                                                                     <div className="p-2" style={{ backgroundColor: '#f8f9fa' }}>
//                                                                         <table className="table table-sm table-borderless mb-0" style={{ fontSize: '0.75rem' }}>
//                                                                             <thead>
//                                                                                 <tr className="text-muted">
//                                                                                     <th style={{ width: '30px' }}></th>
//                                                                                     <th>Date</th>
//                                                                                     <th>Bill No.</th>
//                                                                                     <th>Amount</th>
//                                                                                     <th>Payment Mode</th>
//                                                                                     <th>Items</th>
//                                                                                 </tr>
//                                                                             </thead>
//                                                                             <tbody>
//                                                                                 {party.transactions.map((tx, txIdx) => (
//                                                                                     <tr key={tx.id || txIdx}>
//                                                                                         <td className="text-muted">{txIdx + 1}</td>
//                                                                                         <td>{formatDate(tx.date)}</td>
//                                                                                         <td>{tx.billNumber || '-'}</td>
//                                                                                         <td className="fw-bold">{formatCurrency(tx.totalAmount)}</td>
//                                                                                         <td>{tx.paymentMode || '-'}</td>
//                                                                                         <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
//                                                                                             {tx.items?.map(item => item.itemName).filter(Boolean).join(', ') || '-'}
//                                                                                         </td>
//                                                                                     </tr>
//                                                                                 ))}
//                                                                             </tbody>
//                                                                         </table>
//                                                                     </div>
//                                                                 </td>
//                                                             </tr>
//                                                         )}
//                                                     </React.Fragment>
//                                                 ))}
//                                             </tbody>
//                                             <tfoot className="table-group-divider">
//                                                 <tr className="fw-bold table-secondary">
//                                                     <td colSpan="2" className="text-end">TOTAL</td>
//                                                     <td className="text-center">{data.summary.totalTransactions}</td>
//                                                     <td className="text-end">{formatCurrency(data.summary.totalAmount)}</td>
//                                                     <td className="text-end">{formatCurrency(data.summary.averageTransactionAmount)}</td>
//                                                     <td colSpan="4"></td>
//                                                 </tr>
//                                             </tfoot>
//                                         </table>
//                                     </div>

//                                     {/* Pagination */}
//                                     {itemsPerPage !== 'all' && totalPages > 1 && (
//                                         <div className="row mt-2">
//                                             <div className="col-12">
//                                                 <nav>
//                                                     <ul className="pagination justify-content-center pagination-sm">
//                                                         <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
//                                                             <button className="page-link" onClick={() => handlePageChange(currentPage - 1)}>
//                                                                 Previous
//                                                             </button>
//                                                         </li>
//                                                         {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
//                                                             let p = totalPages <= 5 ? i + 1 :
//                                                                 (currentPage <= 3 ? i + 1 :
//                                                                     (currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i));
//                                                             return (
//                                                                 <li key={p} className={`page-item ${currentPage === p ? 'active' : ''}`}>
//                                                                     <button className="page-link" onClick={() => handlePageChange(p)}>
//                                                                         {p}
//                                                                     </button>
//                                                                 </li>
//                                                             );
//                                                         })}
//                                                         <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
//                                                             <button className="page-link" onClick={() => handlePageChange(currentPage + 1)}>
//                                                                 Next
//                                                             </button>
//                                                         </li>
//                                                     </ul>
//                                                 </nav>
//                                                 <div className="text-center text-muted small">
//                                                     Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredParties.length)} of {filteredParties.length} parties
//                                                 </div>
//                                             </div>
//                                         </div>
//                                     )}
//                                 </>
//                             ) : (
//                                 <div className="alert alert-warning text-center py-3">
//                                     <i className="fas fa-exclamation-triangle me-2"></i>
//                                     No parties found with {data.transactionType?.toLowerCase() || 'sales'} transactions meeting the threshold of {formatCurrency(data.thresholdAmount)}.
//                                 </div>
//                             )}
//                         </>
//                     )}

//                     {!hasGenerated && !loading && (
//                         <div className="alert alert-info text-center py-3">
//                             <i className="fas fa-info-circle me-2"></i>
//                             Enter the amount threshold, select transaction type, and click Generate to view all parties with turnover exceeding the threshold.
//                         </div>
//                     )}
//                 </div>
//             </div>

//             {showProductModal && (
//                 <ProductModal onClose={() => setShowProductModal(false)} />
//             )}

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

// export default PartyTurnover;

//--------------------------------------------------------------end

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import NepaliDate from 'nepali-datetime';
import { usePageNotRefreshContext } from '../PageNotRefreshContext';
import Header from '../Header';
import Loader from '../../Loader';
import * as XLSX from 'xlsx';
import ProductModal from '../dashboard/modals/ProductModal';
import NotificationToast from '../../NotificationToast';

// Date conversion utilities
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
        const date = new Date(adDate + 'T00:00:00');
        if (isNaN(date.getTime())) return null;
        const nepaliDate = new NepaliDate(date);
        const year = nepaliDate.getYear();
        const month = nepaliDate.getMonth();
        const day = nepaliDate.getDate();
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
        const bsYear = nepaliDate.getYear();
        const bsMonth = nepaliDate.getMonth() + 1;
        const bsDay = nepaliDate.getDate();
        return (bsYear === year && bsMonth === month && bsDay === day);
    } catch (error) {
        return false;
    }
};

const validateAndCorrectNepaliDate = (dateStr) => {
    if (!dateStr) return null;
    if (isValidNepaliDate(dateStr)) return dateStr;

    const match = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (match) {
        let [_, year, month, day] = match;
        month = parseInt(month, 10);
        day = parseInt(day, 10);

        if (month < 1) month = 1;
        if (month > 12) month = 12;
        if (day < 1) day = 1;
        if (day > 32) day = 32;

        const correctedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        if (isValidNepaliDate(correctedDate)) {
            return correctedDate;
        }
    }
    return null;
};

const PartyTurnover = () => {
    const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
    const currentEnglishDate = new Date().toISOString().split('T')[0];

    const { draftSave, setDraftSave } = usePageNotRefreshContext();
    const [showProductModal, setShowProductModal] = useState(false);
    const navigate = useNavigate();

    // Company state - similar to PurchaseBillsList
    const [company, setCompany] = useState({
        dateFormat: 'english',
        vatEnabled: true,
        fiscalYear: {}
    });

    // Date range state - similar to PurchaseBillsList
    const [dateRange, setDateRange] = useState(() => {
        if (draftSave?.partyTurnoverData) {
            return {
                fromDate: draftSave.partyTurnoverData.fromDate || '',
                toDate: draftSave.partyTurnoverData.toDate || '',
                fromDateAd: draftSave.partyTurnoverData.fromDateAd || '',
                toDateAd: draftSave.partyTurnoverData.toDateAd || ''
            };
        }
        return {
            fromDate: '',
            toDate: '',
            fromDateAd: '',
            toDateAd: ''
        };
    });

    // Form state - without dates
    const [formData, setFormData] = useState(() => {
        if (draftSave?.partyTurnoverData) {
            return {
                amount: draftSave.partyTurnoverData.amount || '',
                transactionType: draftSave.partyTurnoverData.transactionType || 'Sales',
                paymentMode: draftSave.partyTurnoverData.paymentMode || 'all'
            };
        }
        return {
            amount: '',
            transactionType: 'Sales',
            paymentMode: 'all'
        };
    });

    // Results state
    const [data, setData] = useState(() => {
        if (draftSave?.partyTurnoverResults) {
            return draftSave.partyTurnoverResults;
        }
        return {
            thresholdAmount: 0,
            transactionType: 'Sales',
            parties: [],
            summary: {
                totalParties: 0,
                totalTransactions: 0,
                totalAmount: 0,
                totalVatAmount: 0,
                averageTransactionAmount: 0,
                minTransactionAmount: 0,
                maxTransactionAmount: 0,
                firstTransactionDate: null,
                lastTransactionDate: null
            },
            generatedDate: null,
            generatedDateNepali: null
        };
    });

    // UI state
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [error, setError] = useState(null);
    const [hasGenerated, setHasGenerated] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [dateError, setDateError] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [sortConfig, setSortConfig] = useState({ key: 'totalAmount', direction: 'descending' });
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedParties, setExpandedParties] = useState({});
    const [isNavigating, setIsNavigating] = useState(false);

    // Refs
    const amountRef = useRef(null);
    const fromDateRef = useRef(null);
    const toDateRef = useRef(null);
    const fromDateAdRef = useRef(null);
    const toDateAdRef = useRef(null);
    const generateBtnRef = useRef(null);
    const abortControllerRef = useRef(null);
    const isFirstRender = useRef(true);

    // Notification state
    const [notification, setNotification] = useState({
        show: false,
        message: '',
        type: 'success',
        duration: 3000
    });

    // API instance - same as PurchaseBillsList
    const api = useMemo(() => {
        const instance = axios.create({
            baseURL: process.env.REACT_APP_API_BASE_URL,
            withCredentials: true,
        });
        instance.interceptors.request.use(
            (config) => {
                const token = localStorage.getItem('token');
                if (token) config.headers.Authorization = `Bearer ${token}`;
                return config;
            },
            (error) => Promise.reject(error)
        );
        return instance;
    }, []);

    // Fetch company and fiscal year info - USING THE SAME API AS PURCHASEBILLSLIST
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                setInitialLoading(true);
                // Use the same API endpoint as PurchaseBillsList
                const response = await api.get('/api/retailer/purchase/entry-data');

                if (response.data.success) {
                    const responseData = response.data.data;

                    const dateFormat = responseData.company.dateFormat?.toLowerCase() || 'english';
                    const isNepaliFormat = dateFormat === 'nepali';

                    setCompany({
                        ...responseData.company,
                        dateFormat: dateFormat,
                        vatEnabled: responseData.company.vatEnabled || true,
                        isVatExempt: responseData.company.isVatExempt || false,
                        fiscalYear: responseData.currentFiscalYear || {}
                    });

                    const currentFiscalYear = responseData.currentFiscalYear;
                    const hasDraftDates = draftSave?.partyTurnoverData?.fromDate &&
                        draftSave?.partyTurnoverData?.toDate;

                    // Set default dates using fiscal year - same logic as PurchaseBillsList
                    if (!hasDraftDates && currentFiscalYear) {
                        let fromDateFormatted = '';
                        let toDateFormatted = '';
                        let fromDateAd = '';
                        let toDateAd = '';

                        if (isNepaliFormat) {
                            // Use fiscal year start date for from date in Nepali format
                            fromDateFormatted = currentFiscalYear.startDateNepali || currentNepaliDate;
                            toDateFormatted = currentNepaliDate;
                            fromDateAd = convertBsToAd(fromDateFormatted);
                            toDateAd = convertBsToAd(toDateFormatted);
                        } else {
                            // Use fiscal year start date for from date in English format
                            fromDateFormatted = currentFiscalYear.startDate
                                ? new Date(currentFiscalYear.startDate).toISOString().split('T')[0]
                                : currentEnglishDate;
                            toDateFormatted = currentFiscalYear.endDate
                                ? new Date(currentFiscalYear.endDate).toISOString().split('T')[0]
                                : currentEnglishDate;
                            fromDateAd = fromDateFormatted;
                            toDateAd = toDateFormatted;
                        }

                        setDateRange({
                            fromDate: fromDateFormatted,    // Will be Nepali date like "2081-04-01"
                            toDate: toDateFormatted,        // Will be Nepali date like current date
                            fromDateAd: fromDateAd,         // Will be English date like "2024-07-16"
                            toDateAd: toDateAd              // Will be English date like "2025-01-28"
                        });
                    } else if (hasDraftDates) {
                        // If draft exists, ensure AD dates are set correctly
                        let fromDateAd = dateRange.fromDate;
                        let toDateAd = dateRange.toDate;
                        if (isNepaliFormat && dateRange.fromDate) {
                            fromDateAd = convertBsToAd(dateRange.fromDate);
                            toDateAd = convertBsToAd(dateRange.toDate);
                        }
                        setDateRange(prev => ({
                            ...prev,
                            fromDateAd: fromDateAd || prev.fromDateAd,
                            toDateAd: toDateAd || prev.toDateAd
                        }));
                    }
                }
            } catch (err) {
                console.error('Error fetching initial data:', err);
                // Fallback - use current dates
                setDateRange({
                    fromDate: currentNepaliDate,
                    toDate: currentNepaliDate,
                    fromDateAd: currentEnglishDate,
                    toDateAd: currentEnglishDate
                });
                setNotification({
                    show: true,
                    message: 'Error loading company data. Using default dates.',
                    type: 'error',
                    duration: 3000
                });
            } finally {
                setInitialLoading(false);
            }
        };

        fetchInitialData();
    }, []);

    // Handle form input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Handle amount change with validation
    const handleAmountChange = (e) => {
        const value = e.target.value;
        if (value === '' || /^\d*\.?\d*$/.test(value)) {
            setFormData(prev => ({ ...prev, amount: value }));
        }
    };

    // Handle BS date changes - same as PurchaseBillsList
    const handleBsDateChange = (field, value) => {
        const adDate = convertBsToAd(value);
        setDateRange(prev => ({
            ...prev,
            [field]: value,
            [`${field}Ad`]: adDate || prev[`${field}Ad`]
        }));
        setDateError('');
    };

    // Handle AD date changes - same as PurchaseBillsList
    const handleAdDateChange = (field, value) => {
        const bsDate = convertAdToBs(value);
        setDateRange(prev => ({
            ...prev,
            [field]: bsDate || prev[field],
            [`${field}Ad`]: value
        }));
        setDateError('');
    };

    // Validate BS date on blur - same as PurchaseBillsList
    const handleBsDateBlur = (field) => {
        const dateStr = dateRange[field]?.trim();
        if (!dateStr) return;
        if (company.dateFormat === 'nepali') {
            const correctedDate = validateAndCorrectNepaliDate(dateStr);
            if (!correctedDate) {
                const fallbackDate = currentNepaliDate;
                const adDate = convertBsToAd(fallbackDate) || currentEnglishDate;
                setDateRange(prev => ({
                    ...prev,
                    [field]: fallbackDate,
                    [`${field}Ad`]: adDate
                }));
                setNotification({
                    show: true,
                    message: 'Invalid Nepali date. Auto-corrected to current date.',
                    type: 'warning',
                    duration: 3000
                });
            } else if (correctedDate !== dateStr) {
                const adDate = convertBsToAd(correctedDate) || currentEnglishDate;
                setDateRange(prev => ({
                    ...prev,
                    [field]: correctedDate,
                    [`${field}Ad`]: adDate
                }));
                setNotification({
                    show: true,
                    message: 'Date auto-corrected to valid Nepali date.',
                    type: 'warning',
                    duration: 3000
                });
            }
        }
    };

    // Handle Enter key navigation - same as PurchaseBillsList
    const handleKeyDown = (e, nextField) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (nextField === 'generate') {
                handleGenerateReport();
            } else if (nextField) {
                const nextElement = document.getElementById(nextField);
                if (nextElement) {
                    nextElement.focus();
                }
            }
        }
    };

    // Toggle party expansion
    const togglePartyExpansion = (partyId) => {
        setExpandedParties(prev => ({
            ...prev,
            [partyId]: !prev[partyId]
        }));
    };

    // Generate report
    const handleGenerateReport = useCallback(async () => {
        // Validate required fields
        if (!formData.amount || parseFloat(formData.amount) <= 0) {
            setNotification({
                show: true,
                message: 'Please enter a valid amount (greater than 0)',
                type: 'warning',
                duration: 3000
            });
            amountRef.current?.focus();
            return;
        }

        // Validate dates
        if (!dateRange.fromDate || !dateRange.toDate) {
            setNotification({
                show: true,
                message: 'Please select both from and to dates',
                type: 'warning',
                duration: 3000
            });
            fromDateRef.current?.focus();
            return;
        }

        if (company.dateFormat === 'nepali') {
            if (!isValidNepaliDate(dateRange.fromDate) || !isValidNepaliDate(dateRange.toDate)) {
                setNotification({
                    show: true,
                    message: 'Invalid Nepali date format',
                    type: 'warning',
                    duration: 3000
                });
                return;
            }
        }

        // Prepare request params - use AD dates for API
        const params = new URLSearchParams({
            amount: formData.amount,
            transactionType: formData.transactionType,
            paymentMode: formData.paymentMode || 'all'
        });

        // Add date filters using AD dates
        if (dateRange.fromDateAd) {
            params.append('fromDate', dateRange.fromDateAd);
        }
        if (dateRange.toDateAd) {
            params.append('toDate', dateRange.toDateAd);
        }

        // Cancel previous request if any
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        try {
            setLoading(true);
            setError(null);

            const url = `/api/retailer/party-turnover?${params.toString()}`;
            const response = await api.get(url, {
                signal: abortControllerRef.current.signal
            });

            if (response.data.success) {
                const responseData = response.data.data;
                setData({
                    thresholdAmount: responseData.thresholdAmount || 0,
                    transactionType: responseData.transactionType || 'Sales',
                    parties: responseData.parties || [],
                    summary: responseData.summary || {
                        totalParties: 0,
                        totalTransactions: 0,
                        totalAmount: 0,
                        totalVatAmount: 0,
                        averageTransactionAmount: 0,
                        minTransactionAmount: 0,
                        maxTransactionAmount: 0,
                        firstTransactionDate: null,
                        lastTransactionDate: null
                    },
                    generatedDate: responseData.generatedDate || null,
                    generatedDateNepali: responseData.generatedDateNepali || null
                });
                setHasGenerated(true);
                setCurrentPage(1);
                setExpandedParties({});
                setNotification({
                    show: true,
                    message: `Found ${responseData.parties?.length || 0} parties with turnover >= ${formData.amount}`,
                    type: 'success',
                    duration: 3000
                });
            } else {
                setNotification({
                    show: true,
                    message: response.data.error || 'Failed to generate report',
                    type: 'error',
                    duration: 3000
                });
            }
        } catch (err) {
            if (err.name !== 'AbortError' && err.name !== 'CanceledError') {
                const errorMsg = err.response?.data?.error || 'Failed to fetch party turnover data';
                setError(errorMsg);
                setNotification({
                    show: true,
                    message: errorMsg,
                    type: 'error',
                    duration: 3000
                });
            }
        } finally {
            setLoading(false);
        }
    }, [api, formData, dateRange, company.dateFormat]);

    // Save draft - same as PurchaseBillsList
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        if (hasGenerated && !isNavigating) {
            setDraftSave({
                ...draftSave,
                partyTurnoverData: {
                    ...formData,
                    ...dateRange
                },
                partyTurnoverResults: data
            });
        }
    }, [formData, dateRange, data, hasGenerated, isNavigating]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    // Filter and sort parties
    const filteredParties = useMemo(() => {
        if (!data.parties || !data.parties.length) return [];

        let filtered = data.parties;

        if (searchQuery.trim()) {
            const searchLower = searchQuery.toLowerCase();
            filtered = filtered.filter(party =>
                party.partyName?.toLowerCase().includes(searchLower) ||
                party.pan?.toLowerCase().includes(searchLower) ||
                party.phone?.toLowerCase().includes(searchLower)
            );
        }

        filtered = [...filtered].sort((a, b) => {
            let aVal, bVal;
            switch (sortConfig.key) {
                case 'partyName':
                    aVal = a.partyName || '';
                    bVal = b.partyName || '';
                    break;
                case 'totalAmount':
                    aVal = a.totalAmount || 0;
                    bVal = b.totalAmount || 0;
                    break;
                case 'transactionCount':
                    aVal = a.transactionCount || 0;
                    bVal = b.transactionCount || 0;
                    break;
                case 'averageAmount':
                    aVal = a.averageAmount || 0;
                    bVal = b.averageAmount || 0;
                    break;
                default:
                    aVal = a[sortConfig.key] || '';
                    bVal = b[sortConfig.key] || '';
            }
            if (sortConfig.direction === 'ascending') {
                return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            } else {
                return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
            }
        });

        return filtered;
    }, [data.parties, searchQuery, sortConfig]);

    // Pagination
    const paginatedParties = useMemo(() => {
        if (itemsPerPage === 'all') return filteredParties;
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        return filteredParties.slice(start, end);
    }, [filteredParties, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(filteredParties.length / (itemsPerPage === 'all' ? 1 : itemsPerPage));

    // Format currency
    const formatCurrency = useCallback((num) => {
        if (num === undefined || num === null) return '0.00';
        const number = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num);
        if (isNaN(number)) return '0.00';
        return number.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }, []);

    // Format date
    const formatDate = useCallback((dateStr) => {
        if (!dateStr) return '-';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr;
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch {
            return dateStr;
        }
    }, []);

    // Export to Excel
    const exportToExcel = async () => {
        if (!hasGenerated || !data.parties?.length) {
            setNotification({
                show: true,
                message: 'Please generate the report first',
                type: 'warning',
                duration: 3000
            });
            return;
        }

        setExporting(true);
        try {
            const excelData = [];

            excelData.push({
                'Party Name': 'PARTY TURNOVER REPORT',
                'Transaction Count': '',
                'Total Amount': '',
                'Average Amount': '',
                'Min Amount': '',
                'Max Amount': '',
                'Threshold': formatCurrency(data.thresholdAmount),
                'Type': data.transactionType
            });
            excelData.push({});

            excelData.push({
                'Party Name': 'Party Name',
                'Transaction Count': 'Transactions',
                'Total Amount': 'Total Amount',
                'Average Amount': 'Avg Amount',
                'Min Amount': 'Min Amount',
                'Max Amount': 'Max Amount',
                'PAN': 'PAN',
                'Phone': 'Phone'
            });

            filteredParties.forEach(party => {
                excelData.push({
                    'Party Name': party.partyName || '-',
                    'Transaction Count': party.transactionCount || 0,
                    'Total Amount': formatCurrency(party.totalAmount),
                    'Average Amount': formatCurrency(party.averageAmount),
                    'Min Amount': formatCurrency(party.minAmount),
                    'Max Amount': formatCurrency(party.maxAmount),
                    'PAN': party.pan || '-',
                    'Phone': party.phone || '-'
                });
            });

            excelData.push({});
            excelData.push({
                'Party Name': 'SUMMARY',
                'Transaction Count': data.summary.totalTransactions,
                'Total Amount': formatCurrency(data.summary.totalAmount),
                'Average Amount': formatCurrency(data.summary.averageTransactionAmount),
                'PAN': `Total Parties: ${data.summary.totalParties}`
            });

            const ws = XLSX.utils.json_to_sheet(excelData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Party Turnover');
            XLSX.writeFile(wb, `Party_Turnover_Report_${new Date().toISOString().split('T')[0]}.xlsx`);

            setNotification({
                show: true,
                message: 'Excel file exported successfully!',
                type: 'success',
                duration: 3000
            });
        } catch (err) {
            setNotification({
                show: true,
                message: 'Failed to export data',
                type: 'error',
                duration: 3000
            });
        } finally {
            setExporting(false);
        }
    };

    // Print report
    const printReport = () => {
        if (!hasGenerated || !data.parties?.length) {
            setNotification({
                show: true,
                message: 'Please generate the report first',
                type: 'warning',
                duration: 3000
            });
            return;
        }

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            setNotification({
                show: true,
                message: 'Popup blocked. Please allow popups for this site.',
                type: 'error',
                duration: 3000
            });
            return;
        }

        const partyRows = filteredParties.map((party, idx) => `
            <tr>
                <td class="text-center">${idx + 1}</td>
                <td><strong>${party.partyName || '-'}</strong></td>
                <td class="text-center">${party.transactionCount || 0}</td>
                <td class="text-end">${formatCurrency(party.totalAmount)}</td>
                <td class="text-end">${formatCurrency(party.averageAmount)}</td>
                <td class="text-end">${formatCurrency(party.minAmount)}</td>
                <td class="text-end">${formatCurrency(party.maxAmount)}</td>
                <td>${party.pan || '-'}</td>
                <td>${party.phone || '-'}</td>
            </tr>
        `).join('');

        const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Party Turnover Report</title>
            <meta charset="UTF-8">
            <style>
                @page { margin: 10mm; size: A4 landscape; }
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: Arial, sans-serif; font-size: 9px; padding: 5mm; }
                .header { text-align: center; margin-bottom: 10px; }
                .header h1 { font-size: 14px; margin: 0; }
                .header p { font-size: 9px; margin: 2px 0; }
                .header hr { margin: 5px 0; }
                .report-title { text-align: center; font-size: 12px; font-weight: bold; margin: 5px 0; }
                .summary-box { 
                    display: flex; 
                    flex-wrap: wrap;
                    justify-content: space-between; 
                    margin: 8px 0; 
                    padding: 5px; 
                    background: #f5f5f5; 
                    border: 1px solid #ddd;
                    font-size: 8px;
                }
                .summary-box .item { 
                    text-align: center; 
                    padding: 2px 10px;
                }
                .summary-box .label { font-weight: bold; display: block; }
                .summary-box .value { font-size: 10px; color: #333; }
                table { width: 100%; border-collapse: collapse; font-size: 8px; }
                th, td { border: 1px solid #000; padding: 3px 5px; text-align: left; }
                th { background: #e6e6e6; font-weight: bold; }
                .text-center { text-align: center; }
                .text-end { text-align: right; }
                .footer { margin-top: 10px; font-size: 7px; text-align: center; border-top: 1px solid #ccc; padding-top: 5px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Party Turnover Report</h1>
                <p>Generated on ${new Date().toLocaleString()}</p>
                <hr>
            </div>
            
            <div class="summary-box">
                <div class="item">
                    <span class="label">Threshold Amount</span>
                    <span class="value">${formatCurrency(data.thresholdAmount)}</span>
                </div>
                <div class="item">
                    <span class="label">Transaction Type</span>
                    <span class="value">${data.transactionType}</span>
                </div>
                <div class="item">
                    <span class="label">Total Parties</span>
                    <span class="value">${data.summary.totalParties}</span>
                </div>
                <div class="item">
                    <span class="label">Total Transactions</span>
                    <span class="value">${data.summary.totalTransactions}</span>
                </div>
                <div class="item">
                    <span class="label">Total Amount</span>
                    <span class="value">${formatCurrency(data.summary.totalAmount)}</span>
                </div>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th class="text-center">#</th>
                        <th>Party Name</th>
                        <th class="text-center">Transactions</th>
                        <th class="text-end">Total Amount</th>
                        <th class="text-end">Average</th>
                        <th class="text-end">Min</th>
                        <th class="text-end">Max</th>
                        <th>PAN</th>
                        <th>Phone</th>
                    </tr>
                </thead>
                <tbody>${partyRows}</tbody>
                <tfoot>
                    <tr style="font-weight: bold; background: #e6e6e6;">
                        <td colspan="2" class="text-end">TOTAL</td>
                        <td class="text-center">${data.summary.totalTransactions}</td>
                        <td class="text-end">${formatCurrency(data.summary.totalAmount)}</td>
                        <td class="text-end">${formatCurrency(data.summary.averageTransactionAmount)}</td>
                        <td colspan="4"></td>
                    </tr>
                </tfoot>
            </table>
            
            <div class="footer">
                Generated on ${new Date().toLocaleString()} | Page 1 of 1
            </div>
            
            <script>
                window.onload = function() {
                    setTimeout(function() {
                        window.print();
                        setTimeout(function() { window.close(); }, 500);
                    }, 200);
                };
            <\/script>
        </body>
        </html>
        `;

        printWindow.document.write(printContent);
        printWindow.document.close();
    };

    // Sort function
    const sortItems = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'ascending' ? 'descending' : 'ascending'
        }));
    };

    const getSortIndicator = (key) => {
        return sortConfig.key === key ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : '';
    };

    // Page change handler
    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    // F9 key for product modal
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'F9') {
                e.preventDefault();
                setShowProductModal(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    if (initialLoading) return <Loader />;

    return (
        <div className="container-fluid party-turnover-container">
            <Header />

            <div className="card mt-2 shadow-lg p-0 animate__animated animate__fadeInUp expanded-card ledger-card compact">
                <div className="card-header bg-white py-0">
                    <h1 className="h4 mb-0 text-center text-primary">Party Turnover Report</h1>
                </div>

                <div className="card-body p-2 p-md-3">
                    {/* Filter Section - Updated with consistent sizing */}
                    <div className="row g-2 mb-3">
                        {/* Transaction Type */}
                        <div className="col-12" style={{ flex: '0 0 auto', width: '10%' }}>
                            <div className="position-relative">
                                <select
                                    id="transactionType"
                                    name="transactionType"
                                    className="form-select form-select-sm"
                                    value={formData.transactionType}
                                    onChange={handleInputChange}
                                    style={{ height: '30px', fontSize: '0.875rem', paddingTop: '0.25rem', width: '100%' }}
                                >
                                    <option value="Sales">Sales</option>
                                    <option value="Purchase">Purchase</option>
                                </select>
                                <label className="position-absolute" style={{
                                    top: '-0.5rem',
                                    left: '0.75rem',
                                    fontSize: '0.75rem',
                                    backgroundColor: 'white',
                                    padding: '0 0.25rem',
                                    color: '#6c757d',
                                    fontWeight: '500'
                                }}>
                                    Type
                                </label>
                            </div>
                        </div>

                        {/* Amount */}
                        <div className="col-12" style={{ flex: '0 0 auto', width: '10%' }}>
                            <div className="position-relative">
                                <input
                                    type="text"
                                    id="amount"
                                    ref={amountRef}
                                    name="amount"
                                    className="form-control form-control-sm"
                                    value={formData.amount}
                                    onChange={handleAmountChange}
                                    onKeyDown={(e) => handleKeyDown(e, 'fromDate')}
                                    placeholder=""
                                    autoComplete="off"
                                    style={{ height: '26px', fontSize: '0.875rem', paddingTop: '0.75rem', width: '100%' }}
                                />
                                <label className="position-absolute" style={{
                                    top: '-0.5rem',
                                    left: '0.75rem',
                                    fontSize: '0.75rem',
                                    backgroundColor: 'white',
                                    padding: '0 0.25rem',
                                    color: '#6c757d',
                                    fontWeight: '500'
                                }}>
                                    Amount (≥) <span className="text-danger">*</span>
                                </label>
                            </div>
                        </div>

                        {/* From Date (BS) */}
                        <div className="col-12" style={{ flex: '0 0 auto', width: '10%' }}>
                            <div className="position-relative">
                                <input
                                    type="text"
                                    id="fromDate"
                                    name="fromDate"
                                    ref={fromDateRef}
                                    className={`form-control form-control-sm ${dateError ? 'is-invalid' : ''}`}
                                    value={dateRange.fromDate || ''}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        const sanitizedValue = value.replace(/[^0-9/-]/g, '').slice(0, 10);
                                        handleBsDateChange('fromDate', sanitizedValue);
                                    }}
                                    onBlur={() => handleBsDateBlur('fromDate')}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            const dateStr = e.target.value.trim();
                                            if (!dateStr) {
                                                const fallbackDate = company.dateFormat === 'nepali' ? currentNepaliDate : currentEnglishDate;
                                                const adDate = convertBsToAd(fallbackDate) || currentEnglishDate;
                                                setDateRange(prev => ({
                                                    ...prev,
                                                    fromDate: fallbackDate,
                                                    fromDateAd: adDate
                                                }));
                                                setNotification({
                                                    show: true,
                                                    message: 'Date required. Auto-corrected to current date.',
                                                    type: 'warning',
                                                    duration: 3000
                                                });
                                                handleKeyDown(e, 'fromDateAd');
                                            } else if (dateError) {
                                                e.target.focus();
                                            } else {
                                                handleKeyDown(e, 'fromDateAd');
                                            }
                                        }
                                    }}
                                    placeholder="YYYY-MM-DD (BS)"
                                    autoComplete="off"
                                    style={{ height: '26px', fontSize: '0.875rem', paddingTop: '0.75rem', width: '100%' }}
                                />
                                <label className="position-absolute" style={{
                                    top: '-0.5rem',
                                    left: '0.75rem',
                                    fontSize: '0.75rem',
                                    backgroundColor: 'white',
                                    padding: '0 0.25rem',
                                    color: '#6c757d',
                                    fontWeight: '500'
                                }}>
                                    From (BS): <span className="text-danger">*</span>
                                </label>
                            </div>
                        </div>

                        {/* From Date (AD) */}
                        <div className="col-12" style={{ flex: '0 0 auto', width: '11%' }}>
                            <div className="position-relative">
                                <input
                                    type="date"
                                    id="fromDateAd"
                                    name="fromDateAd"
                                    ref={fromDateAdRef}
                                    className="form-control form-control-sm"
                                    value={dateRange.fromDateAd || ''}
                                    onChange={(e) => handleAdDateChange('fromDate', e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleKeyDown(e, 'toDate'); }}
                                    style={{ height: '26px', fontSize: '0.875rem', paddingTop: '0.75rem', width: '100%' }}
                                />
                                <label className="position-absolute" style={{
                                    top: '-0.5rem',
                                    left: '0.75rem',
                                    fontSize: '0.75rem',
                                    backgroundColor: 'white',
                                    padding: '0 0.25rem',
                                    color: '#6c757d',
                                    fontWeight: '500'
                                }}>
                                    From (AD):
                                </label>
                            </div>
                        </div>

                        {/* To Date (BS) */}
                        <div className="col-12" style={{ flex: '0 0 auto', width: '10%' }}>
                            <div className="position-relative">
                                <input
                                    type="text"
                                    id="toDate"
                                    name="toDate"
                                    ref={toDateRef}
                                    className="form-control form-control-sm"
                                    value={dateRange.toDate || ''}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        const sanitizedValue = value.replace(/[^0-9/-]/g, '').slice(0, 10);
                                        handleBsDateChange('toDate', sanitizedValue);
                                    }}
                                    onBlur={() => handleBsDateBlur('toDate')}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            const dateStr = e.target.value.trim();
                                            if (!dateStr) {
                                                const fallbackDate = company.dateFormat === 'nepali' ? currentNepaliDate : currentEnglishDate;
                                                const adDate = convertBsToAd(fallbackDate) || currentEnglishDate;
                                                setDateRange(prev => ({
                                                    ...prev,
                                                    toDate: fallbackDate,
                                                    toDateAd: adDate
                                                }));
                                                setNotification({
                                                    show: true,
                                                    message: 'Date required. Auto-corrected to current date.',
                                                    type: 'warning',
                                                    duration: 3000
                                                });
                                                handleKeyDown(e, 'toDateAd');
                                            } else {
                                                handleKeyDown(e, 'toDateAd');
                                            }
                                        }
                                    }}
                                    placeholder="YYYY-MM-DD (BS)"
                                    autoComplete="off"
                                    style={{ height: '26px', fontSize: '0.875rem', paddingTop: '0.75rem', width: '100%' }}
                                />
                                <label className="position-absolute" style={{
                                    top: '-0.5rem',
                                    left: '0.75rem',
                                    fontSize: '0.75rem',
                                    backgroundColor: 'white',
                                    padding: '0 0.25rem',
                                    color: '#6c757d',
                                    fontWeight: '500'
                                }}>
                                    To (BS): <span className="text-danger">*</span>
                                </label>
                            </div>
                        </div>

                        {/* To Date (AD) */}
                        <div className="col-12" style={{ flex: '0 0 auto', width: '11%' }}>
                            <div className="position-relative">
                                <input
                                    type="date"
                                    id="toDateAd"
                                    name="toDateAd"
                                    ref={toDateAdRef}
                                    className="form-control form-control-sm"
                                    value={dateRange.toDateAd || ''}
                                    onChange={(e) => handleAdDateChange('toDate', e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleKeyDown(e, 'paymentMode'); }}
                                    style={{ height: '26px', fontSize: '0.875rem', paddingTop: '0.75rem', width: '100%' }}
                                />
                                <label className="position-absolute" style={{
                                    top: '-0.5rem',
                                    left: '0.75rem',
                                    fontSize: '0.75rem',
                                    backgroundColor: 'white',
                                    padding: '0 0.25rem',
                                    color: '#6c757d',
                                    fontWeight: '500'
                                }}>
                                    To (AD):
                                </label>
                            </div>
                        </div>

                        {/* Payment Mode */}
                        {/* <div className="col-12" style={{ flex: '0 0 auto', width: '10%' }}>
                            <div className="position-relative">
                                <select
                                    id="paymentMode"
                                    name="paymentMode"
                                    className="form-select form-select-sm"
                                    value={formData.paymentMode}
                                    onChange={handleInputChange}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleGenerateReport();
                                        }
                                    }}
                                    style={{ height: '30px', fontSize: '0.875rem', paddingTop: '0.25rem', width: '100%' }}
                                >
                                    <option value="all">All</option>
                                    <option value="cash">Cash</option>
                                    <option value="credit">Credit</option>
                                    <option value="payment">Payment</option>
                                    <option value="receipt">Receipt</option>
                                    <option value="journal">Journal</option>
                                    <option value="exclude-cash">Exclude Cash</option>
                                </select>
                                <label className="position-absolute" style={{
                                    top: '-0.5rem',
                                    left: '0.75rem',
                                    fontSize: '0.75rem',
                                    backgroundColor: 'white',
                                    padding: '0 0.25rem',
                                    color: '#6c757d',
                                    fontWeight: '500'
                                }}>
                                    Payment Mode
                                </label>
                            </div>
                        </div> */}

                        {/* Generate Button */}
                        <div className="col-12" style={{ flex: '0 0 auto', width: '8%' }}>
                            <button
                                type="button"
                                id="generateBtn"
                                ref={generateBtnRef}
                                className="btn btn-primary btn-sm w-100"
                                onClick={handleGenerateReport}
                                disabled={loading}
                                style={{ height: '30px', fontSize: '0.8rem', fontWeight: '500', padding: '0 12px', whiteSpace: 'nowrap' }}
                            >
                                {loading ? (
                                    <span className="spinner-border spinner-border-sm" style={{ width: '14px', height: '14px' }} />
                                ) : (
                                    <><i className="bi bi-search me-1"></i> Generate</>
                                )}
                            </button>
                        </div>
                        <div className="col-12" style={{ flex: '0 0 auto', width: '12%' }}>
                            <div className="position-relative">
                                <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    placeholder=""
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{ height: '26px', fontSize: '0.875rem', paddingTop: '0.75rem', width: '100%' }}
                                />
                                <label className="position-absolute" style={{
                                    top: '-0.5rem',
                                    left: '0.75rem',
                                    fontSize: '0.75rem',
                                    backgroundColor: 'white',
                                    padding: '0 0.25rem',
                                    color: '#6c757d',
                                    fontWeight: '500'
                                }}>
                                    Search
                                </label>
                                <i className="bi bi-search position-absolute" style={{
                                    right: '10px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: '#6c757d',
                                    fontSize: '0.75rem'
                                }}></i>
                            </div>
                        </div>
                        <div className="col-12" style={{ flex: '0 0 auto', width: '6%' }}>
                            <div className="position-relative">
                                <select
                                    className="form-select form-select-sm"
                                    value={itemsPerPage}
                                    onChange={(e) => {
                                        setItemsPerPage(e.target.value === 'all' ? 'all' : parseInt(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                    style={{ height: '30px', fontSize: '0.875rem', paddingTop: '0.25rem', width: '100%' }}
                                >
                                    <option value="10">10</option>
                                    <option value="25">25</option>
                                    <option value="50">50</option>
                                    <option value="all">All</option>
                                </select>
                                <label className="position-absolute" style={{
                                    top: '-0.5rem',
                                    left: '0.75rem',
                                    fontSize: '0.75rem',
                                    backgroundColor: 'white',
                                    padding: '0 0.25rem',
                                    color: '#6c757d',
                                    fontWeight: '500'
                                }}>
                                    Items
                                </label>
                            </div>
                        </div>
                        {/* Action Buttons */}
                        <div className="col-12 col-md-auto d-flex align-items-end justify-content-end gap-2">
                            <button
                                className="btn btn-outline-success btn-sm d-flex align-items-center"
                                onClick={exportToExcel}
                                disabled={exporting || !hasGenerated}
                                style={{ height: '30px', padding: '0 12px', fontSize: '0.8rem', fontWeight: '500', whiteSpace: 'nowrap' }}
                            >
                                <i className="bi bi-file-earmark-excel-fill me-1"></i>
                                {exporting ? '...' : ''}
                            </button>
                            <button
                                className="btn btn-outline-primary btn-sm d-flex align-items-center"
                                onClick={printReport}
                                disabled={!hasGenerated}
                                style={{ height: '30px', padding: '0 12px', fontSize: '0.8rem', fontWeight: '500', whiteSpace: 'nowrap' }}
                            >
                                <i className="bi bi-printer me-1"></i>
                            </button>
                        </div>
                    </div>

                    {/* Error Display */}
                    {error && (
                        <div className="alert alert-danger text-center py-1 mb-2 small" style={{ fontSize: '0.75rem' }}>
                            {error}
                            <button className="btn-close btn-sm ms-2" style={{ fontSize: '10px' }} onClick={() => setError(null)}></button>
                        </div>
                    )}

                    {/* Results Section */}
                    {hasGenerated && data.parties && (
                        <>
                            {/* Summary Stats */}
                            {/* <div className="row g-2 mb-3">
                                <div className="col-6 col-md-2">
                                    <div className="stat-box p-2 bg-light rounded">
                                        <div className="stat-label small text-muted">Total Parties</div>
                                        <div className="stat-value h5 mb-0">{data.summary.totalParties}</div>
                                    </div>
                                </div>
                                <div className="col-6 col-md-2">
                                    <div className="stat-box p-2 bg-success bg-opacity-10 rounded">
                                        <div className="stat-label small text-muted">Total Amount</div>
                                        <div className="stat-value h5 mb-0 text-success">{formatCurrency(data.summary.totalAmount)}</div>
                                    </div>
                                </div>
                                <div className="col-6 col-md-2">
                                    <div className="stat-box p-2 bg-info bg-opacity-10 rounded">
                                        <div className="stat-label small text-muted">Total VAT</div>
                                        <div className="stat-value h5 mb-0 text-info">{formatCurrency(data.summary.totalVatAmount)}</div>
                                    </div>
                                </div>
                                <div className="col-6 col-md-2">
                                    <div className="stat-box p-2 bg-warning bg-opacity-10 rounded">
                                        <div className="stat-label small text-muted">Avg Amount</div>
                                        <div className="stat-value h5 mb-0 text-warning">{formatCurrency(data.summary.averageTransactionAmount)}</div>
                                    </div>
                                </div>
                                <div className="col-6 col-md-2">
                                    <div className="stat-box p-2 bg-primary bg-opacity-10 rounded">
                                        <div className="stat-label small text-muted">Threshold</div>
                                        <div className="stat-value h5 mb-0 text-primary">{formatCurrency(data.thresholdAmount)}</div>
                                    </div>
                                </div>
                                <div className="col-6 col-md-2">
                                    <div className="stat-box p-2 bg-secondary bg-opacity-10 rounded">
                                        <div className="stat-label small text-muted">Type</div>
                                        <div className="stat-value h5 mb-0">{data.transactionType}</div>
                                    </div>
                                </div>
                            </div> */}

                            {/* Search and Items Per Page */}
                            {/* {data.parties.length > 0 && (
                                <div className="row g-2 mb-2 align-items-end">
                                    <div className="col-12" style={{ flex: '0 0 auto', width: '15%' }}>
                                        <div className="position-relative">
                                            <input
                                                type="text"
                                                className="form-control form-control-sm"
                                                placeholder=""
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                style={{ height: '26px', fontSize: '0.875rem', paddingTop: '0.75rem', width: '100%' }}
                                            />
                                            <label className="position-absolute" style={{
                                                top: '-0.5rem',
                                                left: '0.75rem',
                                                fontSize: '0.75rem',
                                                backgroundColor: 'white',
                                                padding: '0 0.25rem',
                                                color: '#6c757d',
                                                fontWeight: '500'
                                            }}>
                                                Search
                                            </label>
                                            <i className="bi bi-search position-absolute" style={{
                                                right: '10px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                color: '#6c757d',
                                                fontSize: '0.75rem'
                                            }}></i>
                                        </div>
                                    </div>
                                    <div className="col-12" style={{ flex: '0 0 auto', width: '8%' }}>
                                        <div className="position-relative">
                                            <select
                                                className="form-select form-select-sm"
                                                value={itemsPerPage}
                                                onChange={(e) => {
                                                    setItemsPerPage(e.target.value === 'all' ? 'all' : parseInt(e.target.value));
                                                    setCurrentPage(1);
                                                }}
                                                style={{ height: '30px', fontSize: '0.875rem', paddingTop: '0.25rem', width: '100%' }}
                                            >
                                                <option value="10">10</option>
                                                <option value="25">25</option>
                                                <option value="50">50</option>
                                                <option value="all">All</option>
                                            </select>
                                            <label className="position-absolute" style={{
                                                top: '-0.5rem',
                                                left: '0.75rem',
                                                fontSize: '0.75rem',
                                                backgroundColor: 'white',
                                                padding: '0 0.25rem',
                                                color: '#6c757d',
                                                fontWeight: '500'
                                            }}>
                                                Items
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            )} */}

                            {/* Parties Table */}
                            {data.parties.length > 0 ? (
                                <>
                                    <div className="table-responsive" style={{ maxHeight: '400px', overflow: 'auto' }}>
                                        <table className="table table-sm table-hover mb-0" style={{ fontSize: '0.75rem' }}>
                                            <thead className="table-light" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                                                <tr>
                                                    <th style={{ width: '50px', padding: '6px 8px', textAlign: 'center' }}>#</th>
                                                    <th className="sortable" onClick={() => sortItems('partyName')} style={{ cursor: 'pointer', padding: '6px 8px' }}>
                                                        Party Name {getSortIndicator('partyName')}
                                                    </th>
                                                    <th className="sortable text-center" onClick={() => sortItems('transactionCount')} style={{ cursor: 'pointer', padding: '6px 8px' }}>
                                                        Transactions {getSortIndicator('transactionCount')}
                                                    </th>
                                                    <th className="sortable text-end" onClick={() => sortItems('totalAmount')} style={{ cursor: 'pointer', padding: '6px 8px' }}>
                                                        Total Amount {getSortIndicator('totalAmount')}
                                                    </th>
                                                    <th className="sortable text-end" onClick={() => sortItems('averageAmount')} style={{ cursor: 'pointer', padding: '6px 8px' }}>
                                                        Average {getSortIndicator('averageAmount')}
                                                    </th>
                                                    <th className="text-end" style={{ padding: '6px 8px' }}>Min</th>
                                                    <th className="text-end" style={{ padding: '6px 8px' }}>Max</th>
                                                    <th style={{ padding: '6px 8px' }}>PAN</th>
                                                    <th style={{ padding: '6px 8px' }}>Phone</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {paginatedParties.map((party, idx) => (
                                                    <React.Fragment key={party.partyId || idx}>
                                                        <tr
                                                            className="party-row"
                                                            onClick={() => togglePartyExpansion(party.partyId || idx)}
                                                            style={{ cursor: 'pointer' }}
                                                        >
                                                            <td className="text-center" style={{ padding: '4px 6px' }}>
                                                                {(currentPage - 1) * (itemsPerPage === 'all' ? 1 : itemsPerPage) + idx + 1}
                                                            </td>
                                                            <td style={{ padding: '4px 6px' }}>
                                                                <strong>{party.partyName || '-'}</strong>
                                                                {party.transactions?.length > 0 && (
                                                                    <span className="badge bg-info ms-2" style={{ fontSize: '0.6rem' }}>
                                                                        <i className="bi bi-chevron-down"></i>
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="text-center" style={{ padding: '4px 6px' }}>
                                                                <span className="badge bg-secondary">{party.transactionCount || 0}</span>
                                                            </td>
                                                            <td className="text-end fw-bold text-primary" style={{ padding: '4px 6px' }}>
                                                                {formatCurrency(party.totalAmount)}
                                                            </td>
                                                            <td className="text-end" style={{ padding: '4px 6px' }}>
                                                                {formatCurrency(party.averageAmount)}
                                                            </td>
                                                            <td className="text-end text-danger" style={{ padding: '4px 6px' }}>
                                                                {formatCurrency(party.minAmount)}
                                                            </td>
                                                            <td className="text-end text-success" style={{ padding: '4px 6px' }}>
                                                                {formatCurrency(party.maxAmount)}
                                                            </td>
                                                            <td style={{ padding: '4px 6px' }}>{party.pan || '-'}</td>
                                                            <td style={{ padding: '4px 6px' }}>{party.phone || '-'}</td>
                                                        </tr>

                                                        {/* Expanded transactions */}
                                                        {expandedParties[party.partyId || idx] && party.transactions?.length > 0 && (
                                                            <tr>
                                                                <td colSpan="9" style={{ padding: 0 }}>
                                                                    <div className="p-2" style={{ backgroundColor: '#f8f9fa' }}>
                                                                        <table className="table table-sm table-borderless mb-0" style={{ fontSize: '0.75rem' }}>
                                                                            <thead>
                                                                                <tr className="text-muted">
                                                                                    <th style={{ width: '30px' }}></th>
                                                                                    <th>Date</th>
                                                                                    <th>Bill No.</th>
                                                                                    <th>Amount</th>
                                                                                    <th>Payment Mode</th>
                                                                                    <th>Items</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody>
                                                                                {party.transactions.map((tx, txIdx) => (
                                                                                    <tr key={tx.id || txIdx}>
                                                                                        <td className="text-muted">{txIdx + 1}</td>
                                                                                        <td>{formatDate(tx.date)}</td>
                                                                                        <td>{tx.billNumber || '-'}</td>
                                                                                        <td className="fw-bold">{formatCurrency(tx.totalAmount)}</td>
                                                                                        <td>{tx.paymentMode || '-'}</td>
                                                                                        <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                                            {tx.items?.map(item => item.itemName).filter(Boolean).join(', ') || '-'}
                                                                                        </td>
                                                                                    </tr>
                                                                                ))}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </React.Fragment>
                                                ))}
                                            </tbody>
                                            {filteredParties.length > 0 && (
                                                <tfoot className="table-group-divider">
                                                    <tr className="fw-bold table-secondary">
                                                        <td colSpan="2" className="text-end" style={{ padding: '6px 8px' }}>TOTAL</td>
                                                        <td className="text-center" style={{ padding: '6px 8px' }}>{data.summary.totalTransactions}</td>
                                                        <td className="text-end" style={{ padding: '6px 8px' }}>{formatCurrency(data.summary.totalAmount)}</td>
                                                        <td className="text-end" style={{ padding: '6px 8px' }}>{formatCurrency(data.summary.averageTransactionAmount)}</td>
                                                        <td colSpan="4" style={{ padding: '6px 8px' }}></td>
                                                    </tr>
                                                </tfoot>
                                            )}
                                        </table>
                                    </div>

                                    {/* Pagination */}
                                    {itemsPerPage !== 'all' && totalPages > 1 && (
                                        <div className="row mt-2">
                                            <div className="col-12">
                                                <nav>
                                                    <ul className="pagination justify-content-center pagination-sm" style={{ marginBottom: '0' }}>
                                                        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                                            <button className="page-link" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => handlePageChange(currentPage - 1)}>
                                                                Previous
                                                            </button>
                                                        </li>
                                                        {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                                                            let p = totalPages <= 5 ? i + 1 :
                                                                (currentPage <= 3 ? i + 1 :
                                                                    (currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i));
                                                            return (
                                                                <li key={p} className={`page-item ${currentPage === p ? 'active' : ''}`}>
                                                                    <button className="page-link" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => handlePageChange(p)}>
                                                                        {p}
                                                                    </button>
                                                                </li>
                                                            );
                                                        })}
                                                        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                                                            <button className="page-link" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => handlePageChange(currentPage + 1)}>
                                                                Next
                                                            </button>
                                                        </li>
                                                    </ul>
                                                </nav>
                                                <div className="text-center text-muted small" style={{ fontSize: '0.7rem' }}>
                                                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredParties.length)} of {filteredParties.length} parties
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="alert alert-warning text-center py-3" style={{ fontSize: '0.8rem' }}>
                                    <i className="fas fa-exclamation-triangle me-2"></i>
                                    No parties found with {data.transactionType?.toLowerCase() || 'sales'} transactions meeting the threshold of {formatCurrency(data.thresholdAmount)}.
                                </div>
                            )}
                        </>
                    )}

                    {!hasGenerated && !loading && (
                        <div className="alert alert-info text-center py-3" style={{ fontSize: '0.8rem' }}>
                            <i className="fas fa-info-circle me-2"></i>
                            Enter the amount threshold, select transaction type, and click Generate to view all parties with turnover exceeding the threshold.
                        </div>
                    )}
                </div>
            </div>

            {showProductModal && (
                <ProductModal onClose={() => setShowProductModal(false)} />
            )}

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

export default PartyTurnover;