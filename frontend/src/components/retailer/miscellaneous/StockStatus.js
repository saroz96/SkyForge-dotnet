// import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
// import { useNavigate } from 'react-router-dom';
// import axios from 'axios';
// import Header from '../Header';
// import Loader from '../../Loader';
// import { usePageNotRefreshContext } from '../PageNotRefreshContext';
// import * as XLSX from 'xlsx';
// import ProductModal from '../dashboard/modals/ProductModal';
// import NotificationToast from '../../NotificationToast';
// import NepaliDate from 'nepali-datetime';
// import './StockStatus.css';

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

// const getVatFilterLabel = (vatFilter) => {
//     switch (vatFilter) {
//         case '13':
//             return '13% VAT';
//         case 'vatExempt':
//             return 'VAT Exempt';
//         default:
//             return 'All Items';
//     }
// };

// const StockStatus = () => {
//     const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
//     const currentEnglishDate = new Date().toISOString().split('T')[0];

//     const { draftStockStatusSave, setDraftStockStatusSave } = usePageNotRefreshContext();
//     const [showProductModal, setShowProductModal] = useState(false);

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

//     const [dateRange, setDateRange] = useState(() => {
//         if (draftStockStatusSave?.stockStatusData) {
//             return {
//                 fromDate: draftStockStatusSave.stockStatusData.fromDate || '',
//                 toDate: draftStockStatusSave.stockStatusData.toDate || '',
//                 fromDateAd: draftStockStatusSave.stockStatusData.fromDateAd || '',
//                 toDateAd: draftStockStatusSave.stockStatusData.toDateAd || ''
//             };
//         }
//         return { fromDate: '', toDate: '', fromDateAd: '', toDateAd: '' };
//     });

//     const [data, setData] = useState(() => {
//         if (draftStockStatusSave?.stockStatusData) {
//             return {
//                 items: draftStockStatusSave.stockStatusData.items || [],
//                 pagination: draftStockStatusSave.stockStatusData.pagination || { current: 1, pages: 1, total: 0 },
//                 searchQuery: draftStockStatusSave.stockStatusData.searchQuery || '',
//                 currentPage: draftStockStatusSave.stockStatusData.currentPage || 1,
//                 itemsPerPage: draftStockStatusSave.stockStatusData.itemsPerPage || 10,
//                 displayOptions: draftStockStatusSave.stockStatusData.displayOptions || { showPurchaseValue: false, showSalesValue: false },
//                 sortConfig: draftStockStatusSave.stockStatusData.sortConfig || { key: 'name', direction: 'ascending' },
//                 isAdminOrSupervisor: draftStockStatusSave.stockStatusData.isAdminOrSupervisor || false,
//                 vatFilter: draftStockStatusSave.stockStatusData.vatFilter || 'all'
//             };
//         }
//         return {
//             items: [],
//             pagination: { current: 1, pages: 1, total: 0 },
//             searchQuery: '',
//             currentPage: 1,
//             itemsPerPage: 10,
//             displayOptions: { showPurchaseValue: false, showSalesValue: false },
//             sortConfig: { key: 'name', direction: 'ascending' },
//             isAdminOrSupervisor: false,
//             vatFilter: 'all'
//         };
//     });

//     const [dateErrors, setDateErrors] = useState({ fromDate: '', toDate: '' });
//     const [loading, setLoading] = useState(false);
//     const [initialLoading, setInitialLoading] = useState(true);
//     const [error, setError] = useState(null);
//     const [hasGenerated, setHasGenerated] = useState(false);
//     const [exporting, setExporting] = useState(false);
//     const [notification, setNotification] = useState({ show: false, message: '', type: 'success', duration: 3000 });
//     const [company, setCompany] = useState({
//         dateFormat: 'english',
//         isVatExempt: false,
//         vatEnabled: true,
//         fiscalYear: null,
//         currentCompanyName: '',
//         address: '',
//         city: '',
//         pan: ''
//     });

//     const navigate = useNavigate();
//     const searchInputRef = useRef(null);
//     const fromDateRef = useRef(null);
//     const toDateRef = useRef(null);
//     const fromDateAdRef = useRef(null);
//     const toDateAdRef = useRef(null);
//     const generateBtnRef = useRef(null);
//     const abortControllerRef = useRef(null);

//     useEffect(() => {
//         const fetchCompanyInfo = async () => {
//             try {
//                 setInitialLoading(true);
//                 const response = await api.get('/api/retailer/sales-register/entry-data');
//                 if (response.data.success) {
//                     const responseData = response.data.data;
//                     const dateFormat = responseData.company?.dateFormat?.toLowerCase() || 'english';
//                     const currentFiscalYear = responseData.currentFiscalYear;
//                     const isNepaliFormat = dateFormat === 'nepali';

//                     setCompany({
//                         dateFormat,
//                         isVatExempt: responseData.company?.isVatExempt || false,
//                         vatEnabled: responseData.company?.vatEnabled !== false,
//                         fiscalYear: currentFiscalYear || {},
//                         currentCompanyName: responseData.company?.name || '',
//                         address: responseData.company?.address || '',
//                         city: responseData.company?.city || '',
//                         pan: responseData.company?.pan || ''
//                     });

//                     const hasDraftDates = draftStockStatusSave?.stockStatusData?.fromDate && draftStockStatusSave?.stockStatusData?.toDate;

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

//                         setDateRange({ fromDate: fromDateFormatted, toDate: toDateFormatted, fromDateAd, toDateAd });
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
//                 }
//             } catch (err) {
//                 console.error('Error fetching company info:', err);
//                 setDateRange({
//                     fromDate: currentEnglishDate,
//                     toDate: currentEnglishDate,
//                     fromDateAd: currentEnglishDate,
//                     toDateAd: currentEnglishDate
//                 });
//             } finally {
//                 setInitialLoading(false);
//             }
//         };
//         fetchCompanyInfo();
//     }, []);

//     const validateDate = (dateStr) => {
//         if (!dateStr) return false;
//         if (company.dateFormat === 'nepali') {
//             const match = dateStr.match(/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/);
//             if (!match) return false;
//             const [year, month, day] = dateStr.replace(/-/g, '/').split('/').map(Number);
//             if (month < 1 || month > 12 || day < 1 || day > 32) return false;
//             try {
//                 const nepaliDate = new NepaliDate(year, month - 1, day);
//                 return nepaliDate.getYear() === year && nepaliDate.getMonth() + 1 === month && nepaliDate.getDate() === day;
//             } catch { return false; }
//         }
//         return /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(dateStr) && !isNaN(new Date(dateStr).getTime());
//     };

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
//             if (isValidNepaliDate(correctedDate)) return correctedDate;
//         }
//         return null;
//     };

//     const fetchStockItems = useCallback(async () => {
//         if (!dateRange.fromDate || !dateRange.toDate) {
//             setDateErrors({ fromDate: 'Please enter from date', toDate: 'Please enter to date' });
//             return;
//         }
//         if (company.dateFormat === 'nepali') {
//             if (!validateDate(dateRange.fromDate)) {
//                 setDateErrors(prev => ({ ...prev, fromDate: 'Invalid date format' }));
//                 fromDateRef.current?.focus();
//                 return;
//             }
//             if (!validateDate(dateRange.toDate)) {
//                 setDateErrors(prev => ({ ...prev, toDate: 'Invalid date format' }));
//                 toDateRef.current?.focus();
//                 return;
//             }
//         }

//         if (abortControllerRef.current) abortControllerRef.current.abort();
//         abortControllerRef.current = new AbortController();

//         try {
//             setLoading(true);
//             setError(null);

//             const params = new URLSearchParams();
//             params.append('page', data.currentPage);
//             params.append('limit', data.itemsPerPage === 'all' ? 10000 : data.itemsPerPage);
//             params.append('fromDate', dateRange.fromDateAd || dateRange.fromDate);
//             params.append('toDate', dateRange.toDateAd || dateRange.toDate);
//             if (data.searchQuery) params.append('search', data.searchQuery);
//             if (data.displayOptions.showPurchaseValue) params.append('showPurchaseValue', true);
//             if (data.displayOptions.showSalesValue) params.append('showSalesValue', true);
//             if (data.vatFilter && data.vatFilter !== 'all') params.append('vatFilter', data.vatFilter);

//             const response = await api.get(`/api/retailer/stock-status?${params.toString()}`, {
//                 signal: abortControllerRef.current.signal
//             });

//             if (response.data.success) {
//                 const responseData = response.data.data;
//                 setData(prev => ({
//                     ...prev,
//                     items: responseData.items || [],
//                     pagination: responseData.pagination || { current: 1, pages: 1, total: 0 },
//                     isAdminOrSupervisor: responseData.isAdminOrSupervisor || false
//                 }));
//                 setHasGenerated(true);
//                 setError(null);
//                 setNotification({ show: true, message: 'Stock status loaded successfully!', type: 'success', duration: 3000 });
//             }
//         } catch (err) {
//             if (err.name === 'AbortError' || err.name === 'CanceledError') return;
//             console.error('Fetch error:', err);
//             const errorMsg = err.response?.data?.error || 'Failed to fetch stock status';
//             setError(errorMsg);
//             setNotification({ show: true, message: errorMsg, type: 'error', duration: 3000 });
//         } finally {
//             setLoading(false);
//         }
//     }, [data.currentPage, data.itemsPerPage, data.searchQuery, data.displayOptions.showPurchaseValue, data.displayOptions.showSalesValue, data.vatFilter, dateRange.fromDateAd, dateRange.toDateAd, dateRange.fromDate, dateRange.toDate, company.dateFormat]);

//     const handleGenerateReport = () => {
//         if (!dateRange.fromDate) {
//             setDateErrors(prev => ({ ...prev, fromDate: 'Please enter from date' }));
//             fromDateRef.current?.focus();
//             return;
//         }
//         if (!dateRange.toDate) {
//             setDateErrors(prev => ({ ...prev, toDate: 'Please enter to date' }));
//             toDateRef.current?.focus();
//             return;
//         }
//         if (company.dateFormat === 'nepali') {
//             if (!validateDate(dateRange.fromDate)) {
//                 setDateErrors(prev => ({ ...prev, fromDate: 'Invalid date format' }));
//                 fromDateRef.current?.focus();
//                 return;
//             }
//             if (!validateDate(dateRange.toDate)) {
//                 setDateErrors(prev => ({ ...prev, toDate: 'Invalid date format' }));
//                 toDateRef.current?.focus();
//                 return;
//             }
//         }
//         fetchStockItems();
//     };

//     const handleVatFilterChange = (e) => {
//         const value = e.target.value;
//         setData(prev => ({ ...prev, vatFilter: value, currentPage: 1 }));
//         if (hasGenerated) fetchStockItems();
//     };

//     const handleFromDateChange = (e) => {
//         const sanitizedValue = e.target.value.replace(/[^0-9/-]/g, '').slice(0, 10);
//         const adDate = convertBsToAd(sanitizedValue);
//         setDateRange(prev => ({ ...prev, fromDate: sanitizedValue, fromDateAd: adDate || prev.fromDateAd }));
//         setDateErrors(prev => ({ ...prev, fromDate: '' }));
//     };

//     const handleToDateChange = (e) => {
//         const sanitizedValue = e.target.value.replace(/[^0-9/-]/g, '').slice(0, 10);
//         const adDate = convertBsToAd(sanitizedValue);
//         setDateRange(prev => ({ ...prev, toDate: sanitizedValue, toDateAd: adDate || prev.toDateAd }));
//         setDateErrors(prev => ({ ...prev, toDate: '' }));
//     };

//     const handleFromDateAdChange = (e) => {
//         const value = e.target.value;
//         const bsDate = convertAdToBs(value);
//         setDateRange(prev => ({ ...prev, fromDateAd: value, fromDate: bsDate || prev.fromDate }));
//         setDateErrors(prev => ({ ...prev, fromDate: '' }));
//     };

//     const handleToDateAdChange = (e) => {
//         const value = e.target.value;
//         const bsDate = convertAdToBs(value);
//         setDateRange(prev => ({ ...prev, toDateAd: value, toDate: bsDate || prev.toDate }));
//         setDateErrors(prev => ({ ...prev, toDate: '' }));
//     };

//     const handleFromDateBlur = () => {
//         const dateStr = dateRange.fromDate?.trim();
//         if (!dateStr || company.dateFormat !== 'nepali') return;
//         const correctedDate = validateAndCorrectNepaliDate(dateStr);
//         if (!correctedDate) {
//             const adDate = convertBsToAd(currentNepaliDate);
//             setDateRange(prev => ({ ...prev, fromDate: currentNepaliDate, fromDateAd: adDate }));
//             setNotification({ show: true, message: 'Invalid Nepali date. Auto-corrected to current date.', type: 'warning', duration: 3000 });
//         } else if (correctedDate !== dateStr) {
//             const adDate = convertBsToAd(correctedDate);
//             setDateRange(prev => ({ ...prev, fromDate: correctedDate, fromDateAd: adDate }));
//             setNotification({ show: true, message: 'Date auto-corrected to valid Nepali date.', type: 'warning', duration: 3000 });
//         }
//     };

//     const handleToDateBlur = () => {
//         const dateStr = dateRange.toDate?.trim();
//         if (!dateStr || company.dateFormat !== 'nepali') return;
//         const correctedDate = validateAndCorrectNepaliDate(dateStr);
//         if (!correctedDate) {
//             const adDate = convertBsToAd(currentNepaliDate);
//             setDateRange(prev => ({ ...prev, toDate: currentNepaliDate, toDateAd: adDate }));
//             setNotification({ show: true, message: 'Invalid Nepali date. Auto-corrected to current date.', type: 'warning', duration: 3000 });
//         } else if (correctedDate !== dateStr) {
//             const adDate = convertBsToAd(correctedDate);
//             setDateRange(prev => ({ ...prev, toDate: correctedDate, toDateAd: adDate }));
//             setNotification({ show: true, message: 'Date auto-corrected to valid Nepali date.', type: 'warning', duration: 3000 });
//         }
//     };

//     useEffect(() => {
//         if (!hasGenerated) return;
//         const debounceTimer = setTimeout(() => {
//             if (data.currentPage !== 1) {
//                 setData(prev => ({ ...prev, currentPage: 1 }));
//             } else {
//                 fetchStockItems();
//             }
//         }, 500);
//         return () => clearTimeout(debounceTimer);
//     }, [data.searchQuery]);

//     useEffect(() => {
//         if (hasGenerated) fetchStockItems();
//     }, [data.currentPage, data.itemsPerPage, data.displayOptions.showPurchaseValue, data.displayOptions.showSalesValue, data.vatFilter]);

//     useEffect(() => {
//         if (hasGenerated) {
//             setDraftStockStatusSave({
//                 ...draftStockStatusSave,
//                 stockStatusData: {
//                     ...data,
//                     fromDate: dateRange.fromDate,
//                     toDate: dateRange.toDate,
//                     fromDateAd: dateRange.fromDateAd,
//                     toDateAd: dateRange.toDateAd
//                 }
//             });
//         }
//     }, [data, dateRange]);

//     const sortItems = (key) => {
//         let direction = 'ascending';
//         if (data.sortConfig.key === key && data.sortConfig.direction === 'ascending') direction = 'descending';
//         setData(prev => ({ ...prev, sortConfig: { key, direction } }));
//     };

//     const getSortedItems = useCallback(() => {
//         if (!data.items || !Array.isArray(data.items)) return [];
//         const sorted = [...data.items];
//         const { key, direction } = data.sortConfig;

//         sorted.sort((a, b) => {
//             let aValue = a[key];
//             let bValue = b[key];
//             if (['code', 'category', 'unit'].includes(key)) {
//                 aValue = a[key] || '';
//                 bValue = b[key] || '';
//             } else if (typeof aValue === 'number' && typeof bValue === 'number') {
//                 return direction === 'ascending' ? aValue - bValue : bValue - aValue;
//             } else {
//                 aValue = (aValue || '').toString().toLowerCase();
//                 bValue = (bValue || '').toString().toLowerCase();
//             }
//             if (direction === 'ascending') return aValue > bValue ? 1 : -1;
//             return aValue < bValue ? 1 : -1;
//         });
//         return sorted;
//     }, [data.items, data.sortConfig]);

//     const sortedItems = getSortedItems();

//     const formatCurrency = useCallback((num) => {
//         if (num === undefined || num === null) return '0.00';
//         const number = Math.abs(typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num));
//         if (isNaN(number)) return '0.00';
//         return number.toLocaleString(company.dateFormat === 'nepali' ? 'en-IN' : 'en-US', {
//             minimumFractionDigits: 2,
//             maximumFractionDigits: 2
//         });
//     }, [company.dateFormat]);

//     const totals = useMemo(() => {
//         if (!sortedItems || !Array.isArray(sortedItems)) {
//             return { totalStock: 0, totalOpeningStock: 0, totalQtyIn: 0, totalQtyOut: 0, totalPurchaseValue: 0, totalSalesValue: 0 };
//         }
//         return sortedItems.reduce((acc, item) => {
//             acc.totalStock += item.stock || 0;
//             acc.totalOpeningStock += item.openingStock || 0;
//             acc.totalQtyIn += item.totalQtyIn || 0;
//             acc.totalQtyOut += item.totalQtyOut || 0;
//             if (data.displayOptions.showPurchaseValue) acc.totalPurchaseValue += item.totalStockValuePurchase || 0;
//             if (data.displayOptions.showSalesValue) acc.totalSalesValue += item.totalStockValueSales || 0;
//             return acc;
//         }, { totalStock: 0, totalOpeningStock: 0, totalQtyIn: 0, totalQtyOut: 0, totalPurchaseValue: 0, totalSalesValue: 0 });
//     }, [sortedItems, data.displayOptions]);

//     const summaryStats = useMemo(() => {
//         const lowStock = sortedItems.filter(item => item.stock <= (item.minStock || 0)).length;
//         const highStock = sortedItems.filter(item => item.stock >= (item.maxStock || Infinity)).length;
//         return { lowStock, highStock };
//     }, [sortedItems]);

//     const renderSortIcon = (key) => {
//         if (data.sortConfig.key !== key) return <i className="bi bi-arrow-down-up ms-1 opacity-50" style={{ fontSize: '0.6rem' }} />;
//         return data.sortConfig.direction === 'ascending'
//             ? <i className="bi bi-sort-down ms-1" style={{ fontSize: '0.65rem' }} />
//             : <i className="bi bi-sort-up ms-1" style={{ fontSize: '0.65rem' }} />;
//     };

//     const handleSearchChange = (e) => setData(prev => ({ ...prev, searchQuery: e.target.value }));

//     const handleItemsPerPageChange = (e) => {
//         const value = e.target.value;
//         setData(prev => ({ ...prev, itemsPerPage: value === 'all' ? 'all' : parseInt(value), currentPage: 1 }));
//     };

//     const handlePageChange = (newPage) => {
//         if (data.pagination && newPage >= 1 && newPage <= data.pagination.pages) {
//             setData(prev => ({ ...prev, currentPage: newPage }));
//             window.scrollTo(0, 0);
//         }
//     };

//     const handleCheckboxChange = (e) => {
//         const { name, checked } = e.target;
//         setData(prev => ({
//             ...prev,
//             displayOptions: { ...prev.displayOptions, [name]: checked },
//             currentPage: 1
//         }));
//     };

//     const handleKeyDown = (e, nextFieldId) => {
//         if (e.key === 'Enter') {
//             e.preventDefault();
//             if (nextFieldId) {
//                 document.getElementById(nextFieldId)?.focus();
//             } else {
//                 handleGenerateReport();
//             }
//         }
//     };

//     const exportToExcel = async () => {
//         if (!hasGenerated || !sortedItems.length) {
//             setNotification({ show: true, message: 'Please generate the report first', type: 'warning', duration: 3000 });
//             return;
//         }

//         setExporting(true);
//         try {
//             const headerInfo = [
//                 ['Stock Status Report'],
//                 [`Company: ${company.currentCompanyName || 'Company Name'}`],
//                 [`Address: ${company.address || ''}${company.city ? ', ' + company.city : ''}`],
//                 [`TPIN: ${company.pan || ''}`],
//                 [`Period: ${dateRange.fromDate} to ${dateRange.toDate} (BS)`],
//                 [`Fiscal Year: ${company.fiscalYear?.name || 'N/A'}`],
//                 [`VAT Status: ${getVatFilterLabel(data.vatFilter)}`],
//                 [`Total Items: ${sortedItems.length}${data.searchQuery ? ` | Search: "${data.searchQuery}"` : ''}`],
//                 [`Generated on: ${new Date().toLocaleString()}`],
//                 [],
//             ];

//             const dataToExport = sortedItems.map((item, index) => {
//                 const rowData = {
//                     '#': index + 1,
//                     'Code': item.code || '',
//                     'Item Name': item.name,
//                     'Category': item.category || '-',
//                     'Unit': item.unit || '-',
//                     'Stock': formatCurrency(item.stock),
//                     'Op. Stock': formatCurrency(item.openingStock),
//                     'Qty. In': formatCurrency(item.totalQtyIn),
//                     'Qty. Out': formatCurrency(item.totalQtyOut),
//                     'Min Stock': item.minStock || '-',
//                     'Max Stock': item.maxStock || '-',
//                     'C.P': formatCurrency(item.avgPuPrice),
//                     'S.P': formatCurrency(item.avgPrice)
//                 };
//                 if (data.displayOptions.showPurchaseValue) rowData['Stock Value (CP)'] = formatCurrency(item.totalStockValuePurchase);
//                 if (data.displayOptions.showSalesValue) rowData['Stock Value (SP)'] = formatCurrency(item.totalStockValueSales);
//                 return rowData;
//             });

//             const totalsRow = {
//                 '#': '', 'Code': '', 'Item Name': 'TOTALS', 'Category': '', 'Unit': '',
//                 'Stock': formatCurrency(totals.totalStock),
//                 'Op. Stock': formatCurrency(totals.totalOpeningStock),
//                 'Qty. In': formatCurrency(totals.totalQtyIn),
//                 'Qty. Out': formatCurrency(totals.totalQtyOut),
//                 'Min Stock': '', 'Max Stock': '', 'C.P': '', 'S.P': ''
//             };
//             if (data.displayOptions.showPurchaseValue) totalsRow['Stock Value (CP)'] = formatCurrency(totals.totalPurchaseValue);
//             if (data.displayOptions.showSalesValue) totalsRow['Stock Value (SP)'] = formatCurrency(totals.totalSalesValue);
//             dataToExport.push(totalsRow);

//             const ws = XLSX.utils.json_to_sheet(dataToExport);
//             const existingData = XLSX.utils.sheet_to_json(ws, { header: 1 });
//             const columns = existingData[0] ? existingData[0].length : Object.keys(dataToExport[0] || {}).length;
//             const headerRows = headerInfo.length;
//             const newData = [];

//             headerInfo.forEach(row => {
//                 const newRow = Array(columns).fill('');
//                 row.forEach((val, idx) => { if (idx < columns) newRow[idx] = val; });
//                 newData.push(newRow);
//             });
//             existingData.forEach(row => {
//                 const newRow = Array(columns).fill('');
//                 row.forEach((val, idx) => { if (idx < columns) newRow[idx] = val; });
//                 newData.push(newRow);
//             });

//             const newWs = XLSX.utils.aoa_to_sheet(newData);
//             newWs['!cols'] = [
//                 { wch: 6 }, { wch: 15 }, { wch: 30 }, { wch: 20 }, { wch: 10 },
//                 { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 },
//                 { wch: 10 }, { wch: 12 }, { wch: 12 }
//             ];

//             const wb = XLSX.utils.book_new();
//             XLSX.utils.book_append_sheet(wb, newWs, 'Stock Status');

//             const date = new Date().toISOString().split('T')[0];
//             let fileName = `Stock_Status_${date}`;
//             if (data.vatFilter && data.vatFilter !== 'all') fileName += `_${data.vatFilter}`;
//             XLSX.writeFile(wb, `${fileName}.xlsx`);
//             setNotification({ show: true, message: 'Excel file exported successfully!', type: 'success', duration: 3000 });
//         } catch (err) {
//             console.error('Export error:', err);
//             setNotification({ show: true, message: 'Failed to export data', type: 'error', duration: 3000 });
//         } finally {
//             setExporting(false);
//         }
//     };

//     const printStockStatus = () => {
//         if (!hasGenerated || !sortedItems.length) {
//             setNotification({ show: true, message: 'Please generate the report first', type: 'warning', duration: 3000 });
//             return;
//         }

//         const printWindow = window.open('', '_blank');
//         const fiscalYear = company.fiscalYear?.name || 'N/A';

//         const printContent = `
//     <!DOCTYPE html>
//     <html>
//     <head>
//         <title>Stock Status Report</title>
//         <style>
//             @page { size: A4 landscape; margin: 8mm; }
//             body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 8px; margin: 0; padding: 4mm; color: #0f172a; }
//             .print-header { text-align: center; margin-bottom: 12px; border-bottom: 2px solid #1e3a5f; padding-bottom: 8px; }
//             .company-name { font-size: 16px; font-weight: 700; color: #1e3a5f; }
//             .print-header p { font-size: 8px; margin: 4px 0; color: #64748b; }
//             .report-title { font-size: 12px; font-weight: 600; margin-top: 6px; }
//             table { width: 100%; border-collapse: collapse; font-size: 8px; }
//             th, td { border: 1px solid #cbd5e1; padding: 4px 5px; }
//             th { background: #f1f5f9; font-weight: 600; text-transform: uppercase; font-size: 7px; letter-spacing: 0.03em; }
//             .text-end { text-align: right; }
//             .filter-info { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 8px; background: #f8fafc; padding: 6px 8px; border-radius: 4px; }
//             .print-footer { margin-top: 8px; font-size: 7px; text-align: right; color: #64748b; }
//             tfoot tr { background: #f1f5f9; font-weight: 700; }
//         </style>
//     </head>
//     <body>
//         <div class="print-header">
//             <div class="company-name">${company.currentCompanyName || 'Company Name'}</div>
//             <p>${company.address || ''}${company.city ? ', ' + company.city : ''} | TPIN: ${company.pan || ''}</p>
//             <div class="report-title">Stock Status Report</div>
//         </div>
//         <div class="filter-info">
//             <div><strong>Period:</strong> ${dateRange.fromDate} — ${dateRange.toDate} (BS) | <strong>F.Y:</strong> ${fiscalYear}</div>
//             <div><strong>VAT:</strong> ${getVatFilterLabel(data.vatFilter)} | <strong>Items:</strong> ${sortedItems.length}</div>
//         </div>
//         <table>
//             <thead>
//                 <tr>
//                     <th style="text-align:center;">#</th><th>Code</th><th>Item Name</th><th>Category</th><th>Unit</th>
//                     <th class="text-end">Stock</th><th class="text-end">Op. Stock</th><th class="text-end">Qty In</th><th class="text-end">Qty Out</th>
//                     <th class="text-end">Min</th><th class="text-end">Max</th><th class="text-end">C.P</th><th class="text-end">S.P</th>
//                     ${data.displayOptions.showPurchaseValue ? '<th class="text-end">Val (CP)</th>' : ''}
//                     ${data.displayOptions.showSalesValue ? '<th class="text-end">Val (SP)</th>' : ''}
//                 </tr>
//             </thead>
//             <tbody>
//                 ${sortedItems.map((item, index) => `
//                     <tr>
//                         <td style="text-align:center;">${index + 1}</td>
//                         <td>${item.code || ''}</td><td>${item.name}</td><td>${item.category || '-'}</td><td>${item.unit || '-'}</td>
//                         <td class="text-end">${formatCurrency(item.stock)}</td><td class="text-end">${formatCurrency(item.openingStock)}</td>
//                         <td class="text-end">${formatCurrency(item.totalQtyIn)}</td><td class="text-end">${formatCurrency(item.totalQtyOut)}</td>
//                         <td class="text-end">${item.minStock || '-'}</td><td class="text-end">${item.maxStock || '-'}</td>
//                         <td class="text-end">${formatCurrency(item.avgPuPrice)}</td><td class="text-end">${formatCurrency(item.avgPrice)}</td>
//                         ${data.displayOptions.showPurchaseValue ? `<td class="text-end">${formatCurrency(item.totalStockValuePurchase)}</td>` : ''}
//                         ${data.displayOptions.showSalesValue ? `<td class="text-end">${formatCurrency(item.totalStockValueSales)}</td>` : ''}
//                     </tr>
//                 `).join('')}
//             </tbody>
//             <tfoot>
//                 <tr>
//                     <td colspan="5" style="text-align:right;">Totals</td>
//                     <td class="text-end">${formatCurrency(totals.totalStock)}</td>
//                     <td class="text-end">${formatCurrency(totals.totalOpeningStock)}</td>
//                     <td class="text-end">${formatCurrency(totals.totalQtyIn)}</td>
//                     <td class="text-end">${formatCurrency(totals.totalQtyOut)}</td>
//                     <td colspan="2"></td><td></td><td></td>
//                     ${data.displayOptions.showPurchaseValue ? `<td class="text-end">${formatCurrency(totals.totalPurchaseValue)}</td>` : ''}
//                     ${data.displayOptions.showSalesValue ? `<td class="text-end">${formatCurrency(totals.totalSalesValue)}</td>` : ''}
//                 </tr>
//             </tfoot>
//         </table>
//         <div class="print-footer">Printed on ${new Date().toLocaleString()}</div>
//         <script>window.onload=function(){window.print();window.onafterprint=function(){window.close();};}</script>
//     </body>
//     </html>`;

//         printWindow.document.write(printContent);
//         printWindow.document.close();
//     };

//     useEffect(() => {
//         const onKeyDown = (e) => {
//             if (e.key === 'F9') {
//                 e.preventDefault();
//                 setShowProductModal(prev => !prev);
//             }
//         };
//         window.addEventListener('keydown', onKeyDown);
//         return () => window.removeEventListener('keydown', onKeyDown);
//     }, []);

//     if (initialLoading) return <Loader />;

//     return (
//         <div className="stock-status-page">
//             <Header />

//             <div className="stock-status-container">
//                 {/* Page Header */}
//                 <div className="ss-page-header">
//                     <div className="ss-page-header__title">
//                         <div className="ss-page-header__icon">
//                             <i className="bi bi-box-seam" />
//                         </div>
//                         <div>
//                             <h1>Stock Status Report</h1>
//                             {/* <p className="ss-page-header__meta">
//                                 {company.currentCompanyName || 'Company'}
//                                 {company.fiscalYear?.name ? ` · FY ${company.fiscalYear.name}` : ''}
//                                 {company.pan ? ` · TPIN ${company.pan}` : ''}
//                             </p> */}
//                         </div>
//                     </div>
//                     <div className="ss-header-actions">
//                         <button
//                             type="button"
//                             className="ss-btn-ghost"
//                             onClick={exportToExcel}
//                             disabled={!hasGenerated || !sortedItems.length || exporting}
//                             title="Export to Excel"
//                         >
//                             <i className="bi bi-file-earmark-excel" />
//                             {exporting ? 'Exporting…' : 'Export'}
//                         </button>
//                         <button
//                             type="button"
//                             className="ss-btn-ghost"
//                             onClick={printStockStatus}
//                             disabled={!hasGenerated || !sortedItems.length}
//                             title="Print Report"
//                         >
//                             <i className="bi bi-printer" />
//                             Print
//                         </button>
//                     </div>
//                 </div>

//                 {/* Filter Panel */}
//                 <div className="ss-filter-card">
//                     {/* <div className="ss-filter-card__head">
//                         <i className="bi bi-funnel" />
//                         Report Filters
//                     </div> */}
//                     <div className="ss-filter-body">
//                         <div className="ss-filter-row">
//                             <div className="ss-field ss-field--date">
//                                 <label>From (BS) <span className="required">*</span></label>
//                                 <input
//                                     type="text"
//                                     id="fromDate"
//                                     ref={fromDateRef}
//                                     className={dateErrors.fromDate ? 'is-invalid' : ''}
//                                     value={dateRange.fromDate}
//                                     onChange={handleFromDateChange}
//                                     onBlur={handleFromDateBlur}
//                                     onKeyDown={(e) => handleKeyDown(e, 'fromDateAd')}
//                                     placeholder="YYYY-MM-DD"
//                                     autoComplete="off"
//                                     autoFocus
//                                 />
//                                 {dateErrors.fromDate && <div className="invalid-msg">{dateErrors.fromDate}</div>}
//                             </div>

//                             <div className="ss-field ss-field--date">
//                                 <label>From (AD)</label>
//                                 <input
//                                     type="date"
//                                     id="fromDateAd"
//                                     ref={fromDateAdRef}
//                                     value={dateRange.fromDateAd || ''}
//                                     onChange={handleFromDateAdChange}
//                                     onKeyDown={(e) => handleKeyDown(e, 'toDate')}
//                                 />
//                             </div>

//                             <div className="ss-field ss-field--date">
//                                 <label>To (BS) <span className="required">*</span></label>
//                                 <input
//                                     type="text"
//                                     id="toDate"
//                                     ref={toDateRef}
//                                     className={dateErrors.toDate ? 'is-invalid' : ''}
//                                     value={dateRange.toDate}
//                                     onChange={handleToDateChange}
//                                     onBlur={handleToDateBlur}
//                                     onKeyDown={(e) => handleKeyDown(e, 'toDateAd')}
//                                     placeholder="YYYY-MM-DD"
//                                     autoComplete="off"
//                                 />
//                                 {dateErrors.toDate && <div className="invalid-msg">{dateErrors.toDate}</div>}
//                             </div>

//                             <div className="ss-field ss-field--date">
//                                 <label>To (AD)</label>
//                                 <input
//                                     type="date"
//                                     id="toDateAd"
//                                     ref={toDateAdRef}
//                                     value={dateRange.toDateAd || ''}
//                                     onChange={handleToDateAdChange}
//                                     onKeyDown={(e) => handleKeyDown(e, 'generateReport')}
//                                 />
//                             </div>

//                             <button
//                                 type="button"
//                                 id="generateReport"
//                                 ref={generateBtnRef}
//                                 className="ss-btn-generate"
//                                 onClick={handleGenerateReport}
//                                 disabled={loading}
//                             >
//                                 {loading
//                                     ? <span className="spinner-border spinner-border-sm" style={{ width: '14px', height: '14px' }} />
//                                     : <><i className="bi bi-play-fill" /> Generate Report</>
//                                 }
//                             </button>
//                             <div className="ss-field ss-field--select">
//                                 <label>Per Page</label>
//                                 <select value={data.itemsPerPage} onChange={handleItemsPerPageChange} disabled={!hasGenerated}>
//                                     <option value="10">10</option>
//                                     <option value="25">25</option>
//                                     <option value="50">50</option>
//                                     <option value="all">All</option>
//                                 </select>
//                             </div>

//                             <div className="ss-field ss-field--select">
//                                 <label>VAT Status</label>
//                                 <select value={data.vatFilter || 'all'} onChange={handleVatFilterChange} disabled={!hasGenerated}>
//                                     <option value="all">All</option>
//                                     <option value="13">13%</option>
//                                     <option value="vatExempt">Exempt</option>
//                                 </select>
//                             </div>

//                             <div className="ss-toggle-group">
//                                 <div className="ss-toggle">
//                                     <span>Val (CP)</span>
//                                     <div className="form-check form-switch">
//                                         <input
//                                             className="form-check-input"
//                                             type="checkbox"
//                                             id="showPurchaseValue"
//                                             checked={data.displayOptions.showPurchaseValue}
//                                             onChange={handleCheckboxChange}
//                                             name="showPurchaseValue"
//                                             disabled={!hasGenerated}
//                                         />
//                                     </div>
//                                 </div>
//                                 <div className="ss-toggle">
//                                     <span>Val (SP)</span>
//                                     <div className="form-check form-switch">
//                                         <input
//                                             className="form-check-input"
//                                             type="checkbox"
//                                             id="showSalesValue"
//                                             checked={data.displayOptions.showSalesValue}
//                                             onChange={handleCheckboxChange}
//                                             name="showSalesValue"
//                                             disabled={!hasGenerated}
//                                         />
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>

//                         <div className="ss-filter-divider" />

//                         <div className="ss-filter-row">
//                             <div className="ss-field ss-field--search">
//                                 <label>Search Items</label>
//                                 <input
//                                     type="text"
//                                     id="searchInput"
//                                     ref={searchInputRef}
//                                     placeholder="Code, name, category…"
//                                     value={data.searchQuery}
//                                     onChange={handleSearchChange}
//                                     disabled={!hasGenerated}
//                                 />
//                             </div>
//                         </div>
//                     </div>
//                 </div>

//                 {error && (
//                     <div className="ss-alert ss-alert--error">
//                         <i className="bi bi-exclamation-circle" />
//                         {error}
//                         <button type="button" className="btn-close btn-sm ms-2" onClick={() => setError(null)} />
//                     </div>
//                 )}

//                 {/* Summary Stats */}
//                 {/* {hasGenerated && !loading && sortedItems.length > 0 && (
//                     <div className="ss-stats-grid">
//                         <div className="ss-stat-card">
//                             <div className="ss-stat-card__icon ss-stat-card__icon--blue">
//                                 <i className="bi bi-boxes" />
//                             </div>
//                             <div>
//                                 <p className="ss-stat-card__label">Total Items</p>
//                                 <p className="ss-stat-card__value">{data.pagination?.total || sortedItems.length}</p>
//                             </div>
//                         </div>
//                         <div className="ss-stat-card">
//                             <div className="ss-stat-card__icon ss-stat-card__icon--green">
//                                 <i className="bi bi-stack" />
//                             </div>
//                             <div>
//                                 <p className="ss-stat-card__label">Total Stock Qty</p>
//                                 <p className="ss-stat-card__value">{formatCurrency(totals.totalStock)}</p>
//                             </div>
//                         </div>
//                         {data.displayOptions.showPurchaseValue && (
//                             <div className="ss-stat-card">
//                                 <div className="ss-stat-card__icon ss-stat-card__icon--blue">
//                                     <i className="bi bi-currency-rupee" />
//                                 </div>
//                                 <div>
//                                     <p className="ss-stat-card__label">Stock Value (CP)</p>
//                                     <p className="ss-stat-card__value">{formatCurrency(totals.totalPurchaseValue)}</p>
//                                 </div>
//                             </div>
//                         )}
//                         {summaryStats.lowStock > 0 && (
//                             <div className="ss-stat-card">
//                                 <div className="ss-stat-card__icon ss-stat-card__icon--red">
//                                     <i className="bi bi-exclamation-triangle" />
//                                 </div>
//                                 <div>
//                                     <p className="ss-stat-card__label">Low Stock</p>
//                                     <p className="ss-stat-card__value">{summaryStats.lowStock}</p>
//                                 </div>
//                             </div>
//                         )}
//                         {summaryStats.highStock > 0 && (
//                             <div className="ss-stat-card">
//                                 <div className="ss-stat-card__icon ss-stat-card__icon--amber">
//                                     <i className="bi bi-arrow-up-circle" />
//                                 </div>
//                                 <div>
//                                     <p className="ss-stat-card__label">Over Stock</p>
//                                     <p className="ss-stat-card__value">{summaryStats.highStock}</p>
//                                 </div>
//                             </div>
//                         )}
//                     </div>
//                 )} */}

//                 {/* Loading */}
//                 {loading && (
//                     <div className="ss-loading">
//                         <div className="spinner-border text-primary" role="status">
//                             <span className="visually-hidden">Loading…</span>
//                         </div>
//                         <p>Loading stock data…</p>
//                     </div>
//                 )}

//                 {/* Table */}
//                 {hasGenerated && !loading && (
//                     <div className="ss-table-card">
//                         {sortedItems.length === 0 ? (
//                             <div className="ss-empty">
//                                 <div className="ss-empty__icon"><i className="bi bi-inbox" /></div>
//                                 <h3>No items found</h3>
//                                 <p>{data.searchQuery ? 'No items match your search criteria.' : 'No stock items found for the selected date range.'}</p>
//                             </div>
//                         ) : (
//                             <>
//                                 <div className="ss-table-card__toolbar">
//                                     <span>
//                                         Showing <strong>{sortedItems.length}</strong> items
//                                         {data.searchQuery && <> matching &ldquo;<strong>{data.searchQuery}</strong>&rdquo;</>}
//                                     </span>
//                                     <span>
//                                         {getVatFilterLabel(data.vatFilter)} · {dateRange.fromDate} — {dateRange.toDate}
//                                     </span>
//                                 </div>

//                                 <div className="ss-table-wrap">
//                                     <table className="ss-table">
//                                         <thead>
//                                             <tr>
//                                                 <th style={{ textAlign: 'center', width: 40 }}>#</th>
//                                                 <th className={`sortable ${data.sortConfig.key === 'code' ? 'sorted' : ''}`} onClick={() => sortItems('code')}>
//                                                     Code {renderSortIcon('code')}
//                                                 </th>
//                                                 <th className={`sortable ${data.sortConfig.key === 'name' ? 'sorted' : ''}`} onClick={() => sortItems('name')}>
//                                                     Item Name {renderSortIcon('name')}
//                                                 </th>
//                                                 <th className={`sortable ${data.sortConfig.key === 'category' ? 'sorted' : ''}`} onClick={() => sortItems('category')}>
//                                                     Category {renderSortIcon('category')}
//                                                 </th>
//                                                 <th className={`sortable ${data.sortConfig.key === 'unit' ? 'sorted' : ''}`} onClick={() => sortItems('unit')}>
//                                                     Unit {renderSortIcon('unit')}
//                                                 </th>
//                                                 <th className={`num sortable ${data.sortConfig.key === 'stock' ? 'sorted' : ''}`} onClick={() => sortItems('stock')}>
//                                                     Stock {renderSortIcon('stock')}
//                                                 </th>
//                                                 <th className={`num sortable ${data.sortConfig.key === 'openingStock' ? 'sorted' : ''}`} onClick={() => sortItems('openingStock')}>
//                                                     Op. Stock {renderSortIcon('openingStock')}
//                                                 </th>
//                                                 <th className={`num sortable ${data.sortConfig.key === 'totalQtyIn' ? 'sorted' : ''}`} onClick={() => sortItems('totalQtyIn')}>
//                                                     Qty In {renderSortIcon('totalQtyIn')}
//                                                 </th>
//                                                 <th className={`num sortable ${data.sortConfig.key === 'totalQtyOut' ? 'sorted' : ''}`} onClick={() => sortItems('totalQtyOut')}>
//                                                     Qty Out {renderSortIcon('totalQtyOut')}
//                                                 </th>
//                                                 <th className={`num sortable ${data.sortConfig.key === 'minStock' ? 'sorted' : ''}`} onClick={() => sortItems('minStock')}>
//                                                     Min {renderSortIcon('minStock')}
//                                                 </th>
//                                                 <th className={`num sortable ${data.sortConfig.key === 'maxStock' ? 'sorted' : ''}`} onClick={() => sortItems('maxStock')}>
//                                                     Max {renderSortIcon('maxStock')}
//                                                 </th>
//                                                 <th className={`num sortable ${data.sortConfig.key === 'avgPuPrice' ? 'sorted' : ''}`} onClick={() => sortItems('avgPuPrice')}>
//                                                     C.P {renderSortIcon('avgPuPrice')}
//                                                 </th>
//                                                 <th className={`num sortable ${data.sortConfig.key === 'avgPrice' ? 'sorted' : ''}`} onClick={() => sortItems('avgPrice')}>
//                                                     S.P {renderSortIcon('avgPrice')}
//                                                 </th>
//                                                 {data.displayOptions.showPurchaseValue && (
//                                                     <th className={`num sortable ${data.sortConfig.key === 'totalStockValuePurchase' ? 'sorted' : ''}`} onClick={() => sortItems('totalStockValuePurchase')}>
//                                                         Val (CP) {renderSortIcon('totalStockValuePurchase')}
//                                                     </th>
//                                                 )}
//                                                 {data.displayOptions.showSalesValue && (
//                                                     <th className={`num sortable ${data.sortConfig.key === 'totalStockValueSales' ? 'sorted' : ''}`} onClick={() => sortItems('totalStockValueSales')}>
//                                                         Val (SP) {renderSortIcon('totalStockValueSales')}
//                                                     </th>
//                                                 )}
//                                             </tr>
//                                         </thead>
//                                         <tbody>
//                                             {sortedItems.map((item, index) => (
//                                                 <tr key={item.id}>
//                                                     <td style={{ textAlign: 'center', color: 'var(--ss-muted)' }}>{index + 1}</td>
//                                                     <td><code style={{ fontSize: '0.72rem', color: 'var(--ss-primary-light)' }}>{item.code}</code></td>
//                                                     <td>
//                                                         <div className="d-flex align-items-center">
//                                                             {item.stock <= (item.minStock || 0) && (
//                                                                 <span className="ss-badge ss-badge--low">LOW</span>
//                                                             )}
//                                                             {item.stock >= (item.maxStock || Infinity) && (
//                                                                 <span className="ss-badge ss-badge--high">HIGH</span>
//                                                             )}
//                                                             <span className="ss-item-name">{item.name}</span>
//                                                         </div>
//                                                     </td>
//                                                     <td>{item.category || '—'}</td>
//                                                     <td>{item.unit || '—'}</td>
//                                                     <td className="num">{formatCurrency(item.stock)}</td>
//                                                     <td className="num">{formatCurrency(item.openingStock)}</td>
//                                                     <td className="num">{formatCurrency(item.totalQtyIn)}</td>
//                                                     <td className="num">{formatCurrency(item.totalQtyOut)}</td>
//                                                     <td className="num">{item.minStock ?? '—'}</td>
//                                                     <td className="num">{item.maxStock ?? '—'}</td>
//                                                     <td className="num">{formatCurrency(item.avgPuPrice)}</td>
//                                                     <td className="num">{formatCurrency(item.avgPrice)}</td>
//                                                     {data.displayOptions.showPurchaseValue && (
//                                                         <td className="num" style={{ fontWeight: 600 }}>{formatCurrency(item.totalStockValuePurchase)}</td>
//                                                     )}
//                                                     {data.displayOptions.showSalesValue && (
//                                                         <td className="num" style={{ fontWeight: 600 }}>{formatCurrency(item.totalStockValueSales)}</td>
//                                                     )}
//                                                 </tr>
//                                             ))}
//                                         </tbody>
//                                         <tfoot>
//                                             <tr>
//                                                 <td colSpan="5">Total</td>
//                                                 <td className="num">{formatCurrency(totals.totalStock)}</td>
//                                                 <td className="num">{formatCurrency(totals.totalOpeningStock)}</td>
//                                                 <td className="num">{formatCurrency(totals.totalQtyIn)}</td>
//                                                 <td className="num">{formatCurrency(totals.totalQtyOut)}</td>
//                                                 <td colSpan="2" />
//                                                 <td />
//                                                 <td />
//                                                 {data.displayOptions.showPurchaseValue && (
//                                                     <td className="num">{formatCurrency(totals.totalPurchaseValue)}</td>
//                                                 )}
//                                                 {data.displayOptions.showSalesValue && (
//                                                     <td className="num">{formatCurrency(totals.totalSalesValue)}</td>
//                                                 )}
//                                             </tr>
//                                         </tfoot>
//                                     </table>
//                                 </div>

//                                 {data.pagination && data.pagination.pages > 1 && (
//                                     <div className="ss-pagination">
//                                         <nav>
//                                             <ul className="pagination pagination-sm justify-content-center">
//                                                 <li className={`page-item ${data.currentPage === 1 ? 'disabled' : ''}`}>
//                                                     <button className="page-link" onClick={() => handlePageChange(data.currentPage - 1)}>Previous</button>
//                                                 </li>
//                                                 {Array.from({ length: Math.min(5, data.pagination.pages) }, (_, i) => {
//                                                     let pageNum;
//                                                     if (data.pagination.pages <= 5) pageNum = i + 1;
//                                                     else if (data.currentPage <= 3) pageNum = i + 1;
//                                                     else if (data.currentPage >= data.pagination.pages - 2) pageNum = data.pagination.pages - 4 + i;
//                                                     else pageNum = data.currentPage - 2 + i;
//                                                     return (
//                                                         <li key={pageNum} className={`page-item ${data.currentPage === pageNum ? 'active' : ''}`}>
//                                                             <button className="page-link" onClick={() => handlePageChange(pageNum)}>{pageNum}</button>
//                                                         </li>
//                                                     );
//                                                 })}
//                                                 <li className={`page-item ${data.currentPage === data.pagination.pages ? 'disabled' : ''}`}>
//                                                     <button className="page-link" onClick={() => handlePageChange(data.currentPage + 1)}>Next</button>
//                                                 </li>
//                                             </ul>
//                                         </nav>
//                                         <div className="ss-pagination-info">
//                                             Showing {((data.currentPage - 1) * (data.itemsPerPage === 'all' ? sortedItems.length : data.itemsPerPage)) + 1} to{' '}
//                                             {Math.min(data.currentPage * (data.itemsPerPage === 'all' ? sortedItems.length : data.itemsPerPage), data.pagination.total)} of {data.pagination.total} items
//                                         </div>
//                                     </div>
//                                 )}
//                             </>
//                         )}
//                     </div>
//                 )}

//                 {!hasGenerated && !loading && (
//                     <div className="ss-table-card">
//                         <div className="ss-empty">
//                             <div className="ss-empty__icon"><i className="bi bi-calendar-range" /></div>
//                             <h3>Generate your report</h3>
//                             <p>Select a date range above and click &ldquo;Generate Report&rdquo; to view stock status.</p>
//                         </div>
//                     </div>
//                 )}
//             </div>

//             {showProductModal && <ProductModal onClose={() => setShowProductModal(false)} />}

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

// export default StockStatus;


//--------------------------------------------------------------------end1

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import Header from '../Header';
import Loader from '../../Loader';
import { usePageNotRefreshContext } from '../PageNotRefreshContext';
import * as XLSX from 'xlsx';
import ProductModal from '../dashboard/modals/ProductModal';
import NotificationToast from '../../NotificationToast';
import NepaliDate from 'nepali-datetime';
import './StockStatus.css';

const convertBsToAd = (bsDate) => {
    if (!bsDate || !/^\d{4}-\d{2}-\d{2}$/.test(bsDate)) return null;
    try {
        const nepaliDate = new NepaliDate(bsDate);
        const jsDate = nepaliDate?.getDateObject?.();
        if (!jsDate || isNaN(jsDate.getTime())) return null;
        return `${jsDate.getFullYear()}-${String(jsDate.getMonth() + 1).padStart(2, '0')}-${String(jsDate.getDate()).padStart(2, '0')}`;
    } catch { return null; }
};

const convertAdToBs = (adDate) => {
    if (!adDate) return null;
    try {
        const date = typeof adDate === 'string'
            ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(adDate) ? adDate + 'T00:00:00' : adDate)
            : adDate instanceof Date ? adDate : null;
        if (!date || isNaN(date.getTime())) return null;
        const nepaliDate = new NepaliDate(date);
        return `${nepaliDate.getYear()}-${String(nepaliDate.getMonth() + 1).padStart(2, '0')}-${String(nepaliDate.getDate()).padStart(2, '0')}`;
    } catch { return null; }
};

const isValidNepaliDate = (dateStr) => {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
    try {
        const [year, month, day] = dateStr.split('-').map(Number);
        const nepaliDate = new NepaliDate(dateStr);
        return nepaliDate.getYear() === year && nepaliDate.getMonth() + 1 === month && nepaliDate.getDate() === day;
    } catch { return false; }
};

const getVatFilterLabel = (vatFilter) => {
    if (vatFilter === '13') return '13% VAT';
    if (vatFilter === 'vatExempt') return 'VAT Exempt';
    return 'All Items';
};

const StockStatus = () => {
    const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
    const currentEnglishDate = new Date().toISOString().split('T')[0];
    const { draftStockStatusSave, setDraftStockStatusSave } = usePageNotRefreshContext();
    const [showProductModal, setShowProductModal] = useState(false);

    const api = useMemo(() => {
        const instance = axios.create({
            baseURL: process.env.REACT_APP_API_BASE_URL,
            withCredentials: true,
        });
        instance.interceptors.request.use((config) => {
            const token = localStorage.getItem('token');
            if (token) config.headers.Authorization = `Bearer ${token}`;
            return config;
        });
        return instance;
    }, []);

    const [dateRange, setDateRange] = useState(() => {
        const d = draftStockStatusSave?.stockStatusData;
        return d ? {
            fromDate: d.fromDate || '', toDate: d.toDate || '',
            fromDateAd: d.fromDateAd || '', toDateAd: d.toDateAd || ''
        } : { fromDate: '', toDate: '', fromDateAd: '', toDateAd: '' };
    });

    const [data, setData] = useState(() => {
        const d = draftStockStatusSave?.stockStatusData;
        return d ? {
            items: d.items || [],
            pagination: d.pagination || { current: 1, pages: 1, total: 0 },
            searchQuery: d.searchQuery || '',
            currentPage: d.currentPage || 1,
            itemsPerPage: d.itemsPerPage || 10,
            displayOptions: d.displayOptions || { showPurchaseValue: false, showSalesValue: false },
            sortConfig: d.sortConfig || { key: 'name', direction: 'ascending' },
            isAdminOrSupervisor: d.isAdminOrSupervisor || false,
            vatFilter: d.vatFilter || 'all'
        } : {
            items: [], pagination: { current: 1, pages: 1, total: 0 },
            searchQuery: '', currentPage: 1, itemsPerPage: 10,
            displayOptions: { showPurchaseValue: false, showSalesValue: false },
            sortConfig: { key: 'name', direction: 'ascending' },
            isAdminOrSupervisor: false, vatFilter: 'all'
        };
    });

    const [dateErrors, setDateErrors] = useState({ fromDate: '', toDate: '' });
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [error, setError] = useState(null);
    const [hasGenerated, setHasGenerated] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [notification, setNotification] = useState({ show: false, message: '', type: 'success', duration: 3000 });
    const [company, setCompany] = useState({
        dateFormat: 'english', fiscalYear: null,
        currentCompanyName: '', address: '', city: '', pan: ''
    });

    const fromDateRef = useRef(null);
    const toDateRef = useRef(null);
    const abortControllerRef = useRef(null);

    useEffect(() => {
        const fetchCompanyInfo = async () => {
            try {
                setInitialLoading(true);
                const response = await api.get('/api/retailer/sales-register/entry-data');
                if (response.data.success) {
                    const rd = response.data.data;
                    const dateFormat = rd.company?.dateFormat?.toLowerCase() || 'english';
                    const fy = rd.currentFiscalYear;
                    setCompany({
                        dateFormat, fiscalYear: fy || {},
                        currentCompanyName: rd.company?.name || '',
                        address: rd.company?.address || '',
                        city: rd.company?.city || '',
                        pan: rd.company?.pan || ''
                    });
                    const hasDraft = draftStockStatusSave?.stockStatusData?.fromDate;
                    if (!hasDraft && fy) {
                        let from = '', to = '', fromAd = '', toAd = '';
                        if (dateFormat === 'nepali') {
                            from = fy.startDateNepali || currentNepaliDate;
                            to = currentNepaliDate;
                            fromAd = convertBsToAd(from);
                            toAd = convertBsToAd(to);
                        } else {
                            from = fy.startDate ? new Date(fy.startDate).toISOString().split('T')[0] : currentEnglishDate;
                            to = fy.endDate ? new Date(fy.endDate).toISOString().split('T')[0] : currentEnglishDate;
                            fromAd = from; toAd = to;
                        }
                        setDateRange({ fromDate: from, toDate: to, fromDateAd: fromAd, toDateAd: toAd });
                    }
                }
            } catch {
                setDateRange({ fromDate: currentEnglishDate, toDate: currentEnglishDate, fromDateAd: currentEnglishDate, toDateAd: currentEnglishDate });
            } finally {
                setInitialLoading(false);
            }
        };
        fetchCompanyInfo();
    }, []);

    const validateDate = (dateStr) => {
        if (!dateStr) return false;
        if (company.dateFormat === 'nepali') {
            const m = dateStr.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
            if (!m) return false;
            const [, y, mo, d] = m.map(Number);
            try {
                const nd = new NepaliDate(y, mo - 1, d);
                return nd.getYear() === y && nd.getMonth() + 1 === mo && nd.getDate() === d;
            } catch { return false; }
        }
        return /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(dateStr) && !isNaN(new Date(dateStr).getTime());
    };

    const validateAndCorrectNepaliDate = (dateStr) => {
        if (!dateStr) return null;
        if (isValidNepaliDate(dateStr)) return dateStr;
        const m = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        if (!m) return null;
        const corrected = `${m[1]}-${String(Math.min(12, Math.max(1, +m[2]))).padStart(2, '0')}-${String(Math.min(32, Math.max(1, +m[3]))).padStart(2, '0')}`;
        return isValidNepaliDate(corrected) ? corrected : null;
    };

    const fetchStockItems = useCallback(async () => {
        if (!dateRange.fromDate || !dateRange.toDate) {
            setDateErrors({ fromDate: 'Required', toDate: 'Required' });
            return;
        }
        if (company.dateFormat === 'nepali') {
            if (!validateDate(dateRange.fromDate)) { setDateErrors(p => ({ ...p, fromDate: 'Invalid' })); fromDateRef.current?.focus(); return; }
            if (!validateDate(dateRange.toDate)) { setDateErrors(p => ({ ...p, toDate: 'Invalid' })); toDateRef.current?.focus(); return; }
        }
        abortControllerRef.current?.abort();
        abortControllerRef.current = new AbortController();
        try {
            setLoading(true); setError(null);
            const params = new URLSearchParams();
            params.append('page', data.currentPage);
            params.append('limit', data.itemsPerPage === 'all' ? 10000 : data.itemsPerPage);
            params.append('fromDate', dateRange.fromDateAd || dateRange.fromDate);
            params.append('toDate', dateRange.toDateAd || dateRange.toDate);
            if (data.searchQuery) params.append('search', data.searchQuery);
            if (data.displayOptions.showPurchaseValue) params.append('showPurchaseValue', true);
            if (data.displayOptions.showSalesValue) params.append('showSalesValue', true);
            if (data.vatFilter !== 'all') params.append('vatFilter', data.vatFilter);

            const response = await api.get(`/api/retailer/stock-status?${params}`, { signal: abortControllerRef.current.signal });
            if (response.data.success) {
                const rd = response.data.data;
                setData(p => ({ ...p, items: rd.items || [], pagination: rd.pagination || p.pagination, isAdminOrSupervisor: rd.isAdminOrSupervisor || false }));
                setHasGenerated(true);
                setNotification({ show: true, message: 'Stock status loaded!', type: 'success', duration: 2000 });
            }
        } catch (err) {
            if (err.name === 'AbortError' || err.name === 'CanceledError') return;
            const msg = err.response?.data?.error || 'Failed to fetch stock status';
            setError(msg);
            setNotification({ show: true, message: msg, type: 'error', duration: 3000 });
        } finally { setLoading(false); }
    }, [data.currentPage, data.itemsPerPage, data.searchQuery, data.displayOptions, data.vatFilter, dateRange, company.dateFormat]);

    const handleGenerateReport = () => {
        setDateErrors({ fromDate: '', toDate: '' });
        if (!dateRange.fromDate) { setDateErrors(p => ({ ...p, fromDate: 'Required' })); return; }
        if (!dateRange.toDate) { setDateErrors(p => ({ ...p, toDate: 'Required' })); return; }
        fetchStockItems();
    };

    const handleFromDateChange = (e) => {
        const v = e.target.value.replace(/[^0-9/-]/g, '').slice(0, 10);
        setDateRange(p => ({ ...p, fromDate: v, fromDateAd: convertBsToAd(v) || p.fromDateAd }));
        setDateErrors(p => ({ ...p, fromDate: '' }));
    };
    const handleToDateChange = (e) => {
        const v = e.target.value.replace(/[^0-9/-]/g, '').slice(0, 10);
        setDateRange(p => ({ ...p, toDate: v, toDateAd: convertBsToAd(v) || p.toDateAd }));
        setDateErrors(p => ({ ...p, toDate: '' }));
    };
    const handleFromDateAdChange = (e) => {
        const v = e.target.value;
        setDateRange(p => ({ ...p, fromDateAd: v, fromDate: convertAdToBs(v) || p.fromDate }));
    };
    const handleToDateAdChange = (e) => {
        const v = e.target.value;
        setDateRange(p => ({ ...p, toDateAd: v, toDate: convertAdToBs(v) || p.toDate }));
    };

    const handleDateBlur = (field) => {
        const dateStr = dateRange[field]?.trim();
        if (!dateStr || company.dateFormat !== 'nepali') return;
        const corrected = validateAndCorrectNepaliDate(dateStr);
        const adField = field === 'fromDate' ? 'fromDateAd' : 'toDateAd';
        if (!corrected) {
            setDateRange(p => ({ ...p, [field]: currentNepaliDate, [adField]: convertBsToAd(currentNepaliDate) }));
        } else if (corrected !== dateStr) {
            setDateRange(p => ({ ...p, [field]: corrected, [adField]: convertBsToAd(corrected) }));
        }
    };

    useEffect(() => {
        if (!hasGenerated) return;
        const t = setTimeout(() => {
            if (data.currentPage !== 1) setData(p => ({ ...p, currentPage: 1 }));
            else fetchStockItems();
        }, 500);
        return () => clearTimeout(t);
    }, [data.searchQuery]);

    useEffect(() => { if (hasGenerated) fetchStockItems(); }, [data.currentPage, data.itemsPerPage, data.displayOptions.showPurchaseValue, data.displayOptions.showSalesValue, data.vatFilter]);

    useEffect(() => {
        if (hasGenerated) {
            setDraftStockStatusSave({ ...draftStockStatusSave, stockStatusData: { ...data, ...dateRange } });
        }
    }, [data, dateRange]);

    const sortItems = (key) => {
        setData(p => ({
            ...p,
            sortConfig: { key, direction: p.sortConfig.key === key && p.sortConfig.direction === 'ascending' ? 'descending' : 'ascending' }
        }));
    };

    const sortedItems = useMemo(() => {
        if (!Array.isArray(data.items)) return [];
        const { key, direction } = data.sortConfig;
        return [...data.items].sort((a, b) => {
            let av = a[key], bv = b[key];
            if (typeof av === 'number' && typeof bv === 'number') return direction === 'ascending' ? av - bv : bv - av;
            av = (av ?? '').toString().toLowerCase();
            bv = (bv ?? '').toString().toLowerCase();
            return direction === 'ascending' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
        });
    }, [data.items, data.sortConfig]);

    const formatCurrency = useCallback((num) => {
        if (num == null) return '0.00';
        const n = Math.abs(typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num));
        if (isNaN(n)) return '0.00';
        return n.toLocaleString(company.dateFormat === 'nepali' ? 'en-IN' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }, [company.dateFormat]);

    const totals = useMemo(() => sortedItems.reduce((a, i) => {
        a.totalStock += i.stock || 0; a.totalOpeningStock += i.openingStock || 0;
        a.totalQtyIn += i.totalQtyIn || 0; a.totalQtyOut += i.totalQtyOut || 0;
        if (data.displayOptions.showPurchaseValue) a.totalPurchaseValue += i.totalStockValuePurchase || 0;
        if (data.displayOptions.showSalesValue) a.totalSalesValue += i.totalStockValueSales || 0;
        return a;
    }, { totalStock: 0, totalOpeningStock: 0, totalQtyIn: 0, totalQtyOut: 0, totalPurchaseValue: 0, totalSalesValue: 0 }), [sortedItems, data.displayOptions]);

    const summaryStats = useMemo(() => ({
        lowStock: sortedItems.filter(i => i.stock <= (i.minStock || 0)).length,
        highStock: sortedItems.filter(i => i.stock >= (i.maxStock || Infinity)).length,
    }), [sortedItems]);

    const sortIcon = (key) => data.sortConfig.key !== key
        ? <i className="bi bi-arrow-down-up ms-1 opacity-25" style={{ fontSize: '0.55rem' }} />
        : <i className={`bi bi-sort-${data.sortConfig.direction === 'ascending' ? 'down' : 'up'} ms-1`} style={{ fontSize: '0.55rem' }} />;

    const handleKeyDown = (e, nextId) => {
        if (e.key === 'Enter') { e.preventDefault(); nextId ? document.getElementById(nextId)?.focus() : handleGenerateReport(); }
    };

    // const exportToExcel = async () => {
    //     if (!hasGenerated || !sortedItems.length) {
    //         setNotification({ show: true, message: 'Generate report first', type: 'warning', duration: 2000 });
    //         return;
    //     }
    //     setExporting(true);
    //     try {
    //         const rows = sortedItems.map((item, i) => ({
    //             '#': i + 1, Code: item.code || '', 'Item Name': item.name,
    //             Category: item.category || '-', Unit: item.unit || '-',
    //             Stock: formatCurrency(item.stock), 'Op. Stock': formatCurrency(item.openingStock),
    //             'Qty In': formatCurrency(item.totalQtyIn), 'Qty Out': formatCurrency(item.totalQtyOut),
    //             'C.P': formatCurrency(item.avgPuPrice), 'S.P': formatCurrency(item.avgPrice),
    //             ...(data.displayOptions.showPurchaseValue && { 'Val(CP)': formatCurrency(item.totalStockValuePurchase) }),
    //             ...(data.displayOptions.showSalesValue && { 'Val(SP)': formatCurrency(item.totalStockValueSales) }),
    //         }));
    //         const ws = XLSX.utils.json_to_sheet(rows);
    //         const wb = XLSX.utils.book_new();
    //         XLSX.utils.book_append_sheet(wb, ws, 'Stock Status');
    //         XLSX.writeFile(wb, `Stock_Status_${new Date().toISOString().split('T')[0]}.xlsx`);
    //         setNotification({ show: true, message: 'Exported!', type: 'success', duration: 2000 });
    //     } catch {
    //         setNotification({ show: true, message: 'Export failed', type: 'error', duration: 2000 });
    //     } finally { setExporting(false); }
    // };

    // const printStockStatus = () => {
    //     if (!hasGenerated || !sortedItems.length) {
    //         setNotification({ show: true, message: 'Generate report first', type: 'warning', duration: 2000 });
    //         return;
    //     }
    //     const w = window.open('', '_blank');
    //     w.document.write(`<!DOCTYPE html><html><head><title>Stock Status</title>
    //         <style>@page{size:A4 landscape;margin:8mm}body{font-family:Segoe UI,Arial;font-size:8px}
    //         table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:3px 4px}
    //         th{background:#f1f5f9}.text-end{text-align:right}h2{text-align:center;margin:0 0 8px}</style></head><body>
    //         <h2>${company.currentCompanyName} — Stock Status</h2>
    //         <p>${dateRange.fromDate} to ${dateRange.toDate} (BS) | ${getVatFilterLabel(data.vatFilter)}</p>
    //         <table><thead><tr><th>#</th><th>Code</th><th>Name</th><th>Category</th><th>Unit</th>
    //         <th class="text-end">Stock</th><th class="text-end">Op</th><th class="text-end">In</th><th class="text-end">Out</th>
    //         <th class="text-end">CP</th><th class="text-end">SP</th></tr></thead><tbody>
    //         ${sortedItems.map((item, i) => `<tr><td>${i+1}</td><td>${item.code||''}</td><td>${item.name}</td>
    //         <td>${item.category||'-'}</td><td>${item.unit||'-'}</td>
    //         <td class="text-end">${formatCurrency(item.stock)}</td><td class="text-end">${formatCurrency(item.openingStock)}</td>
    //         <td class="text-end">${formatCurrency(item.totalQtyIn)}</td><td class="text-end">${formatCurrency(item.totalQtyOut)}</td>
    //         <td class="text-end">${formatCurrency(item.avgPuPrice)}</td><td class="text-end">${formatCurrency(item.avgPrice)}</td></tr>`).join('')}
    //         </tbody></table><script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}</script></body></html>`);
    //     w.document.close();
    // };


    const exportToExcel = async () => {
        if (!hasGenerated || !sortedItems.length) {
            setNotification({ show: true, message: 'Please generate the report first', type: 'warning', duration: 3000 });
            return;
        }

        setExporting(true);
        try {
            const headerInfo = [
                ['Stock Status Report'],
                [`Company: ${company.currentCompanyName || 'Company Name'}`],
                [`Address: ${company.address || ''}${company.city ? ', ' + company.city : ''}`],
                [`TPIN: ${company.pan || ''}`],
                [`Period: ${dateRange.fromDate} to ${dateRange.toDate} (BS)`],
                [`Fiscal Year: ${company.fiscalYear?.name || 'N/A'}`],
                [`VAT Status: ${getVatFilterLabel(data.vatFilter)}`],
                [`Total Items: ${sortedItems.length}${data.searchQuery ? ` | Search: "${data.searchQuery}"` : ''}`],
                [`Generated on: ${new Date().toLocaleString()}`],
                [],
            ];

            const dataToExport = sortedItems.map((item, index) => {
                const rowData = {
                    '#': index + 1,
                    'Code': item.code || '',
                    'Item Name': item.name,
                    'Category': item.category || '-',
                    'Unit': item.unit || '-',
                    'Stock': formatCurrency(item.stock),
                    'Op. Stock': formatCurrency(item.openingStock),
                    'Qty. In': formatCurrency(item.totalQtyIn),
                    'Qty. Out': formatCurrency(item.totalQtyOut),
                    'Min Stock': item.minStock || '-',
                    'Max Stock': item.maxStock || '-',
                    'C.P': formatCurrency(item.avgPuPrice),
                    'S.P': formatCurrency(item.avgPrice)
                };
                if (data.displayOptions.showPurchaseValue) rowData['Stock Value (CP)'] = formatCurrency(item.totalStockValuePurchase);
                if (data.displayOptions.showSalesValue) rowData['Stock Value (SP)'] = formatCurrency(item.totalStockValueSales);
                return rowData;
            });

            const totalsRow = {
                '#': '', 'Code': '', 'Item Name': 'TOTALS', 'Category': '', 'Unit': '',
                'Stock': formatCurrency(totals.totalStock),
                'Op. Stock': formatCurrency(totals.totalOpeningStock),
                'Qty. In': formatCurrency(totals.totalQtyIn),
                'Qty. Out': formatCurrency(totals.totalQtyOut),
                'Min Stock': '', 'Max Stock': '', 'C.P': '', 'S.P': ''
            };
            if (data.displayOptions.showPurchaseValue) totalsRow['Stock Value (CP)'] = formatCurrency(totals.totalPurchaseValue);
            if (data.displayOptions.showSalesValue) totalsRow['Stock Value (SP)'] = formatCurrency(totals.totalSalesValue);
            dataToExport.push(totalsRow);

            const ws = XLSX.utils.json_to_sheet(dataToExport);
            const existingData = XLSX.utils.sheet_to_json(ws, { header: 1 });
            const columns = existingData[0] ? existingData[0].length : Object.keys(dataToExport[0] || {}).length;
            const headerRows = headerInfo.length;
            const newData = [];

            headerInfo.forEach(row => {
                const newRow = Array(columns).fill('');
                row.forEach((val, idx) => { if (idx < columns) newRow[idx] = val; });
                newData.push(newRow);
            });
            existingData.forEach(row => {
                const newRow = Array(columns).fill('');
                row.forEach((val, idx) => { if (idx < columns) newRow[idx] = val; });
                newData.push(newRow);
            });

            const newWs = XLSX.utils.aoa_to_sheet(newData);
            newWs['!cols'] = [
                { wch: 6 }, { wch: 15 }, { wch: 30 }, { wch: 20 }, { wch: 10 },
                { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 },
                { wch: 10 }, { wch: 12 }, { wch: 12 }
            ];

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, newWs, 'Stock Status');

            const date = new Date().toISOString().split('T')[0];
            let fileName = `Stock_Status_${date}`;
            if (data.vatFilter && data.vatFilter !== 'all') fileName += `_${data.vatFilter}`;
            XLSX.writeFile(wb, `${fileName}.xlsx`);
            setNotification({ show: true, message: 'Excel file exported successfully!', type: 'success', duration: 3000 });
        } catch (err) {
            console.error('Export error:', err);
            setNotification({ show: true, message: 'Failed to export data', type: 'error', duration: 3000 });
        } finally {
            setExporting(false);
        }
    };

    const printStockStatus = () => {
        if (!hasGenerated || !sortedItems.length) {
            setNotification({ show: true, message: 'Please generate the report first', type: 'warning', duration: 3000 });
            return;
        }

        const printWindow = window.open('', '_blank');
        const fiscalYear = company.fiscalYear?.name || 'N/A';

        const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Stock Status Report</title>
        <style>
            @page { size: A4 landscape; margin: 8mm; }
            body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 8px; margin: 0; padding: 4mm; color: #0f172a; }
            .print-header { text-align: center; margin-bottom: 12px; border-bottom: 2px solid #1e3a5f; padding-bottom: 8px; }
            .company-name { font-size: 16px; font-weight: 700; color: #1e3a5f; }
            .print-header p { font-size: 8px; margin: 4px 0; color: #64748b; }
            .report-title { font-size: 12px; font-weight: 600; margin-top: 6px; }
            table { width: 100%; border-collapse: collapse; font-size: 8px; }
            th, td { border: 1px solid #cbd5e1; padding: 4px 5px; }
            th { background: #f1f5f9; font-weight: 600; text-transform: uppercase; font-size: 7px; letter-spacing: 0.03em; }
            .text-end { text-align: right; }
            .filter-info { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 8px; background: #f8fafc; padding: 6px 8px; border-radius: 4px; }
            .print-footer { margin-top: 8px; font-size: 7px; text-align: right; color: #64748b; }
            tfoot tr { background: #f1f5f9; font-weight: 700; }
        </style>
    </head>
    <body>
        <div class="print-header">
            <div class="company-name">${company.currentCompanyName || 'Company Name'}</div>
            <p>${company.address || ''}${company.city ? ', ' + company.city : ''} | TPIN: ${company.pan || ''}</p>
            <div class="report-title">Stock Status Report</div>
        </div>
        <div class="filter-info">
            <div><strong>Period:</strong> ${dateRange.fromDate} — ${dateRange.toDate} (BS) | <strong>F.Y:</strong> ${fiscalYear}</div>
            <div><strong>VAT:</strong> ${getVatFilterLabel(data.vatFilter)} | <strong>Items:</strong> ${sortedItems.length}</div>
        </div>
        <table>
            <thead>
                <tr>
                    <th style="text-align:center;">#</th><th>Code</th><th>Item Name</th><th>Category</th><th>Unit</th>
                    <th class="text-end">Stock</th><th class="text-end">Op. Stock</th><th class="text-end">Qty In</th><th class="text-end">Qty Out</th>
                    <th class="text-end">Min</th><th class="text-end">Max</th><th class="text-end">C.P</th><th class="text-end">S.P</th>
                    ${data.displayOptions.showPurchaseValue ? '<th class="text-end">Val (CP)</th>' : ''}
                    ${data.displayOptions.showSalesValue ? '<th class="text-end">Val (SP)</th>' : ''}
                </tr>
            </thead>
            <tbody>
                ${sortedItems.map((item, index) => `
                    <tr>
                        <td style="text-align:center;">${index + 1}</td>
                        <td>${item.code || ''}</td><td>${item.name}</td><td>${item.category || '-'}</td><td>${item.unit || '-'}</td>
                        <td class="text-end">${formatCurrency(item.stock)}</td><td class="text-end">${formatCurrency(item.openingStock)}</td>
                        <td class="text-end">${formatCurrency(item.totalQtyIn)}</td><td class="text-end">${formatCurrency(item.totalQtyOut)}</td>
                        <td class="text-end">${item.minStock || '-'}</td><td class="text-end">${item.maxStock || '-'}</td>
                        <td class="text-end">${formatCurrency(item.avgPuPrice)}</td><td class="text-end">${formatCurrency(item.avgPrice)}</td>
                        ${data.displayOptions.showPurchaseValue ? `<td class="text-end">${formatCurrency(item.totalStockValuePurchase)}</td>` : ''}
                        ${data.displayOptions.showSalesValue ? `<td class="text-end">${formatCurrency(item.totalStockValueSales)}</td>` : ''}
                    </tr>
                `).join('')}
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="5" style="text-align:right;">Totals</td>
                    <td class="text-end">${formatCurrency(totals.totalStock)}</td>
                    <td class="text-end">${formatCurrency(totals.totalOpeningStock)}</td>
                    <td class="text-end">${formatCurrency(totals.totalQtyIn)}</td>
                    <td class="text-end">${formatCurrency(totals.totalQtyOut)}</td>
                    <td colspan="2"></td><td></td><td></td>
                    ${data.displayOptions.showPurchaseValue ? `<td class="text-end">${formatCurrency(totals.totalPurchaseValue)}</td>` : ''}
                    ${data.displayOptions.showSalesValue ? `<td class="text-end">${formatCurrency(totals.totalSalesValue)}</td>` : ''}
                </tr>
            </tfoot>
        </table>
        <div class="print-footer">Printed on ${new Date().toLocaleString()}</div>
        <script>window.onload=function(){window.print();window.onafterprint=function(){window.close();};}</script>
    </body>
    </html>`;

        printWindow.document.write(printContent);
        printWindow.document.close();
    };


    useEffect(() => {
        const fn = (e) => { if (e.key === 'F9') { e.preventDefault(); setShowProductModal(p => !p); } };
        window.addEventListener('keydown', fn);
        return () => window.removeEventListener('keydown', fn);
    }, []);

    if (initialLoading) return <Loader />;

    return (
        <div className="stock-status-page">
            <Header />

            <div className="ss-shell">
                {/* Compact header bar */}
                <div className="ss-topbar">
                    <div className="ss-topbar__left">
                        <div className="ss-topbar__icon"><i className="bi bi-box-seam" /></div>
                        <div>
                            <h1>Stock Status</h1>
                            {/* <p className="ss-topbar__meta">
                                {company.currentCompanyName}{company.fiscalYear?.name ? ` · FY ${company.fiscalYear.name}` : ''}{company.pan ? ` · ${company.pan}` : ''}
                            </p> */}
                        </div>
                    </div>
                    <div className="ss-topbar__actions">
                        <button type="button" className="ss-btn-icon" onClick={exportToExcel} disabled={!hasGenerated || !sortedItems.length || exporting}>
                            <i className="bi bi-file-earmark-excel" />{exporting ? '…' : 'Excel'}
                        </button>
                        <button type="button" className="ss-btn-icon" onClick={printStockStatus} disabled={!hasGenerated || !sortedItems.length}>
                            <i className="bi bi-printer" />Print
                        </button>
                    </div>
                </div>

                {/* Single-row toolbar — all controls on one line */}
                <div className="ss-toolbar">
                    <div className="ss-field ss-field--bs">
                        <label>From BS <span className="req">*</span></label>
                        <input ref={fromDateRef} id="fromDate" className={dateErrors.fromDate ? 'is-invalid' : ''}
                            value={dateRange.fromDate} onChange={handleFromDateChange} onBlur={() => handleDateBlur('fromDate')}
                            onKeyDown={(e) => handleKeyDown(e, 'fromDateAd')} placeholder="YYYY-MM-DD" autoFocus />
                    </div>
                    <div className="ss-field ss-field--ad">
                        <label>From AD</label>
                        <input type="date" id="fromDateAd" value={dateRange.fromDateAd || ''} onChange={handleFromDateAdChange} onKeyDown={(e) => handleKeyDown(e, 'toDate')} />
                    </div>
                    <div className="ss-field ss-field--bs">
                        <label>To BS <span className="req">*</span></label>
                        <input ref={toDateRef} id="toDate" className={dateErrors.toDate ? 'is-invalid' : ''}
                            value={dateRange.toDate} onChange={handleToDateChange} onBlur={() => handleDateBlur('toDate')}
                            onKeyDown={(e) => handleKeyDown(e, 'toDateAd')} placeholder="YYYY-MM-DD" />
                    </div>
                    <div className="ss-field ss-field--ad">
                        <label>To AD</label>
                        <input type="date" id="toDateAd" value={dateRange.toDateAd || ''} onChange={handleToDateAdChange} onKeyDown={(e) => handleKeyDown(e, 'generateReport')} />
                    </div>
                    <button type="button" id="generateReport" className="ss-btn-gen" onClick={handleGenerateReport} disabled={loading}>
                        {loading ? <span className="spinner-border spinner-border-sm" style={{ width: 12, height: 12 }} /> : <><i className="bi bi-play-fill" /> Generate</>}
                    </button>

                    <div className="ss-toolbar-divider" />

                    <div className="ss-field ss-field--search">
                        <label>Search</label>
                        <input id="searchInput" placeholder="Name, code…" value={data.searchQuery}
                            onChange={(e) => setData(p => ({ ...p, searchQuery: e.target.value }))} disabled={!hasGenerated} />
                    </div>
                    <div className="ss-field ss-field--select">
                        <label>Rows</label>
                        <select value={data.itemsPerPage} disabled={!hasGenerated}
                            onChange={(e) => setData(p => ({ ...p, itemsPerPage: e.target.value === 'all' ? 'all' : +e.target.value, currentPage: 1 }))}>
                            <option value="10">10</option><option value="25">25</option><option value="50">50</option><option value="all">All</option>
                        </select>
                    </div>
                    <div className="ss-field ss-field--vat">
                        <label>VAT</label>
                        <select value={data.vatFilter} disabled={!hasGenerated}
                            onChange={(e) => setData(p => ({ ...p, vatFilter: e.target.value, currentPage: 1 }))}>
                            <option value="all">All</option><option value="13">13%</option><option value="vatExempt">Exempt</option>
                        </select>
                    </div>

                    <div className="ss-toggles">
                        <div className="ss-toggle-item">
                            <span>CP</span>
                            <input className="form-check-input" type="checkbox" name="showPurchaseValue"
                                checked={data.displayOptions.showPurchaseValue} disabled={!hasGenerated}
                                onChange={(e) => setData(p => ({ ...p, displayOptions: { ...p.displayOptions, showPurchaseValue: e.target.checked }, currentPage: 1 }))} />
                        </div>
                        <div className="ss-toggle-item">
                            <span>SP</span>
                            <input className="form-check-input" type="checkbox" name="showSalesValue"
                                checked={data.displayOptions.showSalesValue} disabled={!hasGenerated}
                                onChange={(e) => setData(p => ({ ...p, displayOptions: { ...p.displayOptions, showSalesValue: e.target.checked }, currentPage: 1 }))} />
                        </div>
                    </div>

                    {/* Inline stats — no separate row */}
                    {hasGenerated && sortedItems.length > 0 && (
                        <>
                            <div className="ss-toolbar-divider" />
                            <div className="ss-chips">
                                {/* <span className="ss-chip ss-chip--blue"><span className="ss-chip__label">Items</span><span className="ss-chip__val">{data.pagination?.total || sortedItems.length}</span></span> */}
                                {/* <span className="ss-chip ss-chip--green"><span className="ss-chip__label">Stock</span><span className="ss-chip__val">{formatCurrency(totals.totalStock)}</span></span> */}
                                {summaryStats.lowStock > 0 && <span className="ss-chip ss-chip--red"><span className="ss-chip__label">Low</span><span className="ss-chip__val">{summaryStats.lowStock}</span></span>}
                                {summaryStats.highStock > 0 && <span className="ss-chip ss-chip--amber"><span className="ss-chip__label">Over</span><span className="ss-chip__val">{summaryStats.highStock}</span></span>}
                            </div>
                        </>
                    )}
                </div>

                {error && (
                    <div className="ss-alert">
                        <i className="bi bi-exclamation-circle" />{error}
                        <button type="button" className="btn-close btn-sm ms-auto" onClick={() => setError(null)} />
                    </div>
                )}

                {/* Main table area — fills all remaining viewport height */}
                <div className="ss-main">
                    {loading ? (
                        <div className="ss-state">
                            <div className="spinner-border spinner-border-sm text-primary" />
                            <p style={{ marginTop: '0.5rem' }}>Loading…</p>
                        </div>
                    ) : !hasGenerated ? (
                        <div className="ss-state">
                            <i className="bi bi-calendar-range" />
                            <h3>Select dates &amp; generate</h3>
                            <p>All controls are above — report fills this area.</p>
                        </div>
                    ) : sortedItems.length === 0 ? (
                        <div className="ss-state">
                            <i className="bi bi-inbox" />
                            <h3>No items found</h3>
                            <p>{data.searchQuery ? 'Try a different search.' : 'No stock for this date range.'}</p>
                        </div>
                    ) : (
                        <>
                            <div className="ss-main__bar">
                                <span><strong>{sortedItems.length}</strong> items · {getVatFilterLabel(data.vatFilter)}</span>
                                <span>{dateRange.fromDate} — {dateRange.toDate} (BS)</span>
                            </div>

                            <div className="ss-table-scroll">
                                <table className="ss-table">
                                    <thead>
                                        <tr>
                                            <th style={{ textAlign: 'center', width: 32 }}>#</th>
                                            <th className={`sortable ${data.sortConfig.key === 'code' ? 'sorted' : ''}`} onClick={() => sortItems('code')}>Code{sortIcon('code')}</th>
                                            <th className={`sortable ${data.sortConfig.key === 'name' ? 'sorted' : ''}`} onClick={() => sortItems('name')}>Item{sortIcon('name')}</th>
                                            <th className={`sortable ${data.sortConfig.key === 'category' ? 'sorted' : ''}`} onClick={() => sortItems('category')}>Category{sortIcon('category')}</th>
                                            <th className={`sortable ${data.sortConfig.key === 'unit' ? 'sorted' : ''}`} onClick={() => sortItems('unit')}>Unit{sortIcon('unit')}</th>
                                            <th className={`num sortable ${data.sortConfig.key === 'stock' ? 'sorted' : ''}`} onClick={() => sortItems('stock')}>Stock{sortIcon('stock')}</th>
                                            <th className={`num sortable ${data.sortConfig.key === 'openingStock' ? 'sorted' : ''}`} onClick={() => sortItems('openingStock')}>Op.{sortIcon('openingStock')}</th>
                                            <th className={`num sortable ${data.sortConfig.key === 'totalQtyIn' ? 'sorted' : ''}`} onClick={() => sortItems('totalQtyIn')}>In{sortIcon('totalQtyIn')}</th>
                                            <th className={`num sortable ${data.sortConfig.key === 'totalQtyOut' ? 'sorted' : ''}`} onClick={() => sortItems('totalQtyOut')}>Out{sortIcon('totalQtyOut')}</th>
                                            <th className={`num sortable ${data.sortConfig.key === 'minStock' ? 'sorted' : ''}`} onClick={() => sortItems('minStock')}>Min{sortIcon('minStock')}</th>
                                            <th className={`num sortable ${data.sortConfig.key === 'maxStock' ? 'sorted' : ''}`} onClick={() => sortItems('maxStock')}>Max{sortIcon('maxStock')}</th>
                                            <th className={`num sortable ${data.sortConfig.key === 'avgPuPrice' ? 'sorted' : ''}`} onClick={() => sortItems('avgPuPrice')}>CP{sortIcon('avgPuPrice')}</th>
                                            <th className={`num sortable ${data.sortConfig.key === 'avgPrice' ? 'sorted' : ''}`} onClick={() => sortItems('avgPrice')}>SP{sortIcon('avgPrice')}</th>
                                            {data.displayOptions.showPurchaseValue && (
                                                <th className={`num sortable ${data.sortConfig.key === 'totalStockValuePurchase' ? 'sorted' : ''}`} onClick={() => sortItems('totalStockValuePurchase')}>Val CP{sortIcon('totalStockValuePurchase')}</th>
                                            )}
                                            {data.displayOptions.showSalesValue && (
                                                <th className={`num sortable ${data.sortConfig.key === 'totalStockValueSales' ? 'sorted' : ''}`} onClick={() => sortItems('totalStockValueSales')}>Val SP{sortIcon('totalStockValueSales')}</th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedItems.map((item, index) => (
                                            <tr key={item.id}>
                                                <td style={{ textAlign: 'center', color: 'var(--ss-muted)' }}>{index + 1}</td>
                                                <td><span className="ss-code">{item.code}</span></td>
                                                <td>
                                                    {item.stock <= (item.minStock || 0) && <span className="ss-badge ss-badge--low">LOW</span>}
                                                    {item.stock >= (item.maxStock || Infinity) && <span className="ss-badge ss-badge--high">HI</span>}
                                                    <span className="ss-item-name">{item.name}</span>
                                                </td>
                                                <td>{item.category || '—'}</td>
                                                <td>{item.unit || '—'}</td>
                                                <td className="num">{formatCurrency(item.stock)}</td>
                                                <td className="num">{formatCurrency(item.openingStock)}</td>
                                                <td className="num">{formatCurrency(item.totalQtyIn)}</td>
                                                <td className="num">{formatCurrency(item.totalQtyOut)}</td>
                                                <td className="num">{item.minStock ?? '—'}</td>
                                                <td className="num">{item.maxStock ?? '—'}</td>
                                                <td className="num">{formatCurrency(item.avgPuPrice)}</td>
                                                <td className="num">{formatCurrency(item.avgPrice)}</td>
                                                {data.displayOptions.showPurchaseValue && <td className="num">{formatCurrency(item.totalStockValuePurchase)}</td>}
                                                {data.displayOptions.showSalesValue && <td className="num">{formatCurrency(item.totalStockValueSales)}</td>}
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td colSpan="5">Total</td>
                                            <td className="num">{formatCurrency(totals.totalStock)}</td>
                                            <td className="num">{formatCurrency(totals.totalOpeningStock)}</td>
                                            <td className="num">{formatCurrency(totals.totalQtyIn)}</td>
                                            <td className="num">{formatCurrency(totals.totalQtyOut)}</td>
                                            <td colSpan="2" />
                                            <td /><td />
                                            {data.displayOptions.showPurchaseValue && <td className="num">{formatCurrency(totals.totalPurchaseValue)}</td>}
                                            {data.displayOptions.showSalesValue && <td className="num">{formatCurrency(totals.totalSalesValue)}</td>}
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            {data.pagination?.pages > 1 && (
                                <div className="ss-pager">
                                    <span>
                                        {((data.currentPage - 1) * (data.itemsPerPage === 'all' ? sortedItems.length : data.itemsPerPage)) + 1}–
                                        {Math.min(data.currentPage * (data.itemsPerPage === 'all' ? sortedItems.length : data.itemsPerPage), data.pagination.total)} of {data.pagination.total}
                                    </span>
                                    <nav>
                                        <ul className="pagination pagination-sm mb-0">
                                            <li className={`page-item ${data.currentPage === 1 ? 'disabled' : ''}`}>
                                                <button className="page-link" onClick={() => setData(p => ({ ...p, currentPage: p.currentPage - 1 }))}>‹</button>
                                            </li>
                                            {Array.from({ length: Math.min(5, data.pagination.pages) }, (_, i) => {
                                                let pg;
                                                if (data.pagination.pages <= 5) pg = i + 1;
                                                else if (data.currentPage <= 3) pg = i + 1;
                                                else if (data.currentPage >= data.pagination.pages - 2) pg = data.pagination.pages - 4 + i;
                                                else pg = data.currentPage - 2 + i;
                                                return (
                                                    <li key={pg} className={`page-item ${data.currentPage === pg ? 'active' : ''}`}>
                                                        <button className="page-link" onClick={() => setData(p => ({ ...p, currentPage: pg }))}>{pg}</button>
                                                    </li>
                                                );
                                            })}
                                            <li className={`page-item ${data.currentPage === data.pagination.pages ? 'disabled' : ''}`}>
                                                <button className="page-link" onClick={() => setData(p => ({ ...p, currentPage: p.currentPage + 1 }))}>›</button>
                                            </li>
                                        </ul>
                                    </nav>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {showProductModal && <ProductModal onClose={() => setShowProductModal(false)} />}
            <NotificationToast show={notification.show} message={notification.message} type={notification.type}
                duration={notification.duration} onClose={() => setNotification(p => ({ ...p, show: false }))} />
        </div>
    );
};

export default StockStatus;
