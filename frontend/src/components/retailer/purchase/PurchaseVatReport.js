// import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
// import { useNavigate } from 'react-router-dom';
// import Header from '../Header';
// import NepaliDate from 'nepali-datetime';
// import Loader from '../../Loader';
// import * as XLSX from 'xlsx';
// import NotificationToast from '../../NotificationToast';
// import { FixedSizeList as List } from 'react-window';
// import AutoSizer from 'react-virtualized-auto-sizer';
// import api from '../../services/api';
// import { FiFileText, FiPrinter, FiDownload, FiSearch, FiRefreshCw, FiCalendar, FiX } from 'react-icons/fi';
// import './PurchaseVatReport.css';

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

// const PurchaseVatReport = () => {
//     const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
//     const currentEnglishDate = new Date().toISOString().split('T')[0];
//     const [exporting, setExporting] = useState(false);

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

//     const [company, setCompany] = useState({
//         dateFormat: 'english',
//         vatEnabled: true,
//         fiscalYear: {}
//     });

//     // SPLIT STATE: Separate date range from report data
//     const [dateRange, setDateRange] = useState({
//         fromDate: '',
//         toDate: '',
//         fromDateAd: '',
//         toDateAd: ''
//     });

//     const [data, setData] = useState({
//         company: null,
//         currentFiscalYear: null,
//         purchaseVatReport: [],
//         companyDateFormat: 'english',
//         nepaliDate: '',
//         currentCompanyName: '',
//         user: null
//     });

//     const [loading, setLoading] = useState(false);
//     const [error, setError] = useState(null);
//     const [searchQuery, setSearchQuery] = useState('');
//     const [selectedRowIndex, setSelectedRowIndex] = useState(0);
//     const [filteredReports, setFilteredReports] = useState([]);

//     // Column resizing state
//     const [columnWidths, setColumnWidths] = useState({
//         bsDate: 80,
//         adDate: 80,
//         voucherNo: 100,
//         supplierBillNo: 100,
//         supplierName: 200,
//         panNumber: 100,
//         totalAmount: 100,
//         discount: 80,
//         nonVatPurchase: 120,
//         taxableAmount: 100,
//         vatAmount: 80
//     });

//     const [isResizing, setIsResizing] = useState(false);
//     const [resizingColumn, setResizingColumn] = useState(null);
//     const [startX, setStartX] = useState(0);
//     const [startWidth, setStartWidth] = useState(0);

//     const fromDateRef = useRef(null);
//     const toDateRef = useRef(null);
//     const searchInputRef = useRef(null);
//     const generateReportRef = useRef(null);
//     const tableBodyRef = useRef(null);
//     const [shouldFetch, setShouldFetch] = useState(false);
//     const navigate = useNavigate();

//     // Fetch initial data - RUNS ONLY ONCE on mount
//     useEffect(() => {
//         const fetchInitialData = async () => {
//             try {
//                 setLoading(true);
//                 const response = await api.get('/api/retailer/purchase-vat-report');

//                 if (response.data.success) {
//                     const responseData = response.data.data;
//                     const dateFormat = responseData.company?.dateFormat?.toLowerCase() || 'english';

//                     setCompany({
//                         dateFormat: dateFormat,
//                         vatEnabled: responseData.company?.vatEnabled !== false,
//                         fiscalYear: responseData.currentFiscalYear || {}
//                     });

//                     const currentFiscalYear = responseData.currentFiscalYear;
//                     if (currentFiscalYear) {
//                         let fromDateFormatted = '';
//                         let toDateFormatted = '';
//                         let fromDateAd = '';
//                         let toDateAd = '';

//                         if (dateFormat === 'nepali') {
//                             fromDateFormatted = currentFiscalYear.startDateNepali || currentNepaliDate;
//                             toDateFormatted = currentNepaliDate;
//                             fromDateAd = convertBsToAd(fromDateFormatted);
//                             toDateAd = convertBsToAd(toDateFormatted);
//                         } else {
//                             fromDateFormatted = currentFiscalYear.startDate
//                                 ? new Date(currentFiscalYear.startDate).toISOString().split('T')[0]
//                                 : currentEnglishDate;
//                             toDateFormatted = currentEnglishDate;
//                             fromDateAd = fromDateFormatted;
//                             toDateAd = toDateFormatted;
//                         }

//                         setDateRange({
//                             fromDate: fromDateFormatted,
//                             toDate: toDateFormatted,
//                             fromDateAd: fromDateAd,
//                             toDateAd: toDateAd
//                         });
//                     }

//                     setData(prev => ({
//                         ...prev,
//                         company: responseData.company,
//                         currentFiscalYear: currentFiscalYear,
//                         companyDateFormat: responseData.companyDateFormat,
//                         nepaliDate: responseData.nepaliDate,
//                         currentCompanyName: responseData.currentCompanyName,
//                         user: responseData.user
//                     }));
//                 }
//             } catch (err) {
//                 console.error('Error fetching initial data:', err);
//                 setNotification({
//                     show: true,
//                     message: 'Error loading data',
//                     type: 'error'
//                 });
//             } finally {
//                 setLoading(false);
//             }
//         };

//         fetchInitialData();
//     }, []);

//     // Fetch VAT report data when generate is clicked
//     useEffect(() => {
//         const fetchVatReportData = async () => {
//             if (!shouldFetch) return;

//             try {
//                 setLoading(true);
//                 const params = new URLSearchParams();
//                 if (dateRange.fromDateAd) params.append('fromDate', dateRange.fromDateAd);
//                 if (dateRange.toDateAd) params.append('toDate', dateRange.toDateAd);
//                 params.append('dateFormat', company.dateFormat);

//                 const response = await api.get(`/api/retailer/purchase-vat-report?${params.toString()}`);

//                 if (response.data.success) {
//                     const responseData = response.data.data;
//                     setData(prev => ({
//                         ...prev,
//                         purchaseVatReport: responseData.purchaseVatReport || [],
//                         company: responseData.company || prev.company,
//                         currentFiscalYear: responseData.currentFiscalYear || prev.currentFiscalYear,
//                         companyDateFormat: responseData.companyDateFormat || prev.companyDateFormat,
//                         nepaliDate: responseData.nepaliDate || prev.nepaliDate,
//                         currentCompanyName: responseData.currentCompanyName || prev.currentCompanyName,
//                         user: responseData.user || prev.user
//                     }));
//                     setError(null);
//                     setSelectedRowIndex(0);
//                 } else {
//                     const errorMsg = response.data.error || 'Failed to fetch purchase VAT report';
//                     setError(errorMsg);
//                     setNotification({
//                         show: true,
//                         message: errorMsg,
//                         type: 'error'
//                     });
//                 }
//             } catch (err) {
//                 console.error('Fetch error:', err);
//                 const errorMsg = err.response?.data?.error || 'Failed to fetch purchase VAT report';
//                 setError(errorMsg);
//                 setNotification({
//                     show: true,
//                     message: errorMsg,
//                     type: 'error'
//                 });
//             } finally {
//                 setLoading(false);
//                 setShouldFetch(false);
//             }
//         };

//         fetchVatReportData();

//         return () => {
//             setShouldFetch(false);
//         };
//     }, [shouldFetch, company.dateFormat, dateRange.fromDateAd, dateRange.toDateAd]);

//     // Filter reports based on search
//     useEffect(() => {
//         const filtered = data.purchaseVatReport.filter(report => {
//             const billNumber = report.billNumber ? report.billNumber.toString().toLowerCase() : '';
//             const partyBillNumber = report.partyBillNumber ? report.partyBillNumber.toString().toLowerCase() : '';
//             const accountName = report.accountName ? report.accountName.toString().toLowerCase() : '';
//             const panNumber = report.panNumber ? report.panNumber.toString().toLowerCase() : '';

//             return (
//                 billNumber.includes(searchQuery.toLowerCase()) ||
//                 partyBillNumber.includes(searchQuery.toLowerCase()) ||
//                 accountName.includes(searchQuery.toLowerCase()) ||
//                 panNumber.includes(searchQuery.toLowerCase())
//             );
//         });

//         setFilteredReports(filtered);
//         if (selectedRowIndex >= filtered.length && filtered.length > 0) {
//             setSelectedRowIndex(0);
//         }
//     }, [data.purchaseVatReport, searchQuery, selectedRowIndex]);

//     // Calculate totals
//     const totals = useMemo(() => {
//         return filteredReports.reduce((acc, report) => ({
//             totalAmount: acc.totalAmount + (report.totalAmount || 0),
//             discountAmount: acc.discountAmount + (report.discountAmount || 0),
//             nonVatPurchase: acc.nonVatPurchase + (report.nonVatPurchase || 0),
//             taxableAmount: acc.taxableAmount + (report.taxableAmount || 0),
//             vatAmount: acc.vatAmount + (report.vatAmount || 0)
//         }), {
//             totalAmount: 0,
//             discountAmount: 0,
//             nonVatPurchase: 0,
//             taxableAmount: 0,
//             vatAmount: 0
//         });
//     }, [filteredReports]);

//     // Save/load column widths
//     useEffect(() => {
//         const savedWidths = localStorage.getItem('purchaseVatTableColumnWidths');
//         if (savedWidths) {
//             try {
//                 setColumnWidths(JSON.parse(savedWidths));
//             } catch (e) {
//                 console.error('Failed to load column widths:', e);
//             }
//         }
//     }, []);

//     useEffect(() => {
//         localStorage.setItem('purchaseVatTableColumnWidths', JSON.stringify(columnWidths));
//     }, [columnWidths]);

//     // Keyboard navigation
//     useEffect(() => {
//         const handleKeyDown = (e) => {
//             if (filteredReports.length === 0) return;

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
//                     setSelectedRowIndex(prev => Math.min(filteredReports.length - 1, prev + 1));
//                     break;
//                 default:
//                     break;
//             }
//         };

//         window.addEventListener('keydown', handleKeyDown);
//         return () => window.removeEventListener('keydown', handleKeyDown);
//     }, [filteredReports]);

//     const handleGenerateReport = () => {
//         if (!dateRange.fromDate || !dateRange.toDate) {
//             setError('Please select both from and to dates');
//             setNotification({
//                 show: true,
//                 message: 'Please select both from and to dates',
//                 type: 'warning'
//             });
//             return;
//         }
//         setShouldFetch(true);
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

//     const formatCurrency = useCallback((num) => {
//         const number = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num) || 0;
//         return number.toLocaleString('en-IN', {
//             minimumFractionDigits: 2,
//             maximumFractionDigits: 2
//         });
//     }, []);

//     const formatCurrencyForExport = (num) => {
//         const number = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num) || 0;
//         return number.toFixed(2);
//     };

//     const handleExportExcel = async () => {
//         if (!data.purchaseVatReport || data.purchaseVatReport.length === 0) {
//             setNotification({
//                 show: true,
//                 message: 'No data available to export. Please generate a report first.',
//                 type: 'warning'
//             });
//             return;
//         }

//         setExporting(true);
//         try {
//             const currentDate = new Date().toISOString().split('T')[0];
//             const excelData = [];

//             // Header information
//             excelData.push(['Purchase VAT Report']);
//             excelData.push(['Company:', data.currentCompanyName || 'N/A']);
//             excelData.push(['Address:', data.company?.address || '', data.company?.city ? ', ' + data.company?.city : '']);
//             excelData.push(['PAN:', data.company?.pan || '']);
//             excelData.push(['From Date (BS):', dateRange.fromDate]);
//             excelData.push(['To Date (BS):', dateRange.toDate]);
//             excelData.push(['From Date (AD):', dateRange.fromDateAd]);
//             excelData.push(['To Date (AD):', dateRange.toDateAd]);
//             excelData.push(['Total Bills:', filteredReports.length]);
//             if (searchQuery) excelData.push(['Search:', searchQuery]);
//             excelData.push(['Export Date:', new Date().toLocaleString()]);
//             excelData.push([]);

//             const headers = [
//                 'S.No', 'Miti', 'Date (AD)', 'Vch. No.', 'Invoice No.',
//                 'Supplier\'s Name', 'Supplier\'s PAN', 'Total Amount',
//                 'Discount', 'Non-VAT Purchase', 'Taxable Amt.', 'VAT'
//             ];
//             excelData.push(headers);

//             let totalTotalAmount = 0;
//             let totalDiscount = 0;
//             let totalNonVatPurchase = 0;
//             let totalTaxable = 0;
//             let totalVat = 0;

//             filteredReports.forEach((report, index) => {
//                 excelData.push([
//                     index + 1,
//                     report.nepaliDate || '',
//                     report.date ? new Date(report.date).toLocaleDateString('en-CA') : '',
//                     report.billNumber || '',
//                     report.partyBillNumber || '-',
//                     report.accountName || '',
//                     report.panNumber || '',
//                     formatCurrencyForExport(report.totalAmount),
//                     formatCurrencyForExport(report.discountAmount),
//                     formatCurrencyForExport(report.nonVatPurchase),
//                     formatCurrencyForExport(report.taxableAmount),
//                     formatCurrencyForExport(report.vatAmount)
//                 ]);

//                 totalTotalAmount += parseFloat(report.totalAmount || 0);
//                 totalDiscount += parseFloat(report.discountAmount || 0);
//                 totalNonVatPurchase += parseFloat(report.nonVatPurchase || 0);
//                 totalTaxable += parseFloat(report.taxableAmount || 0);
//                 totalVat += parseFloat(report.vatAmount || 0);
//             });

//             excelData.push([]);
//             excelData.push([
//                 '', '', '', '', '', 'GRAND TOTALS',
//                 '', formatCurrencyForExport(totalTotalAmount),
//                 formatCurrencyForExport(totalDiscount),
//                 formatCurrencyForExport(totalNonVatPurchase),
//                 formatCurrencyForExport(totalTaxable),
//                 formatCurrencyForExport(totalVat)
//             ]);

//             const ws = XLSX.utils.aoa_to_sheet(excelData);
//             ws['!cols'] = [
//                 { wch: 6 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
//                 { wch: 25 }, { wch: 14 }, { wch: 15 }, { wch: 12 },
//                 { wch: 15 }, { wch: 15 }, { wch: 12 }
//             ];

//             const wb = XLSX.utils.book_new();
//             XLSX.utils.book_append_sheet(wb, ws, 'Purchase VAT Report');

//             const fileName = `Purchase_VAT_Report_${dateRange.fromDate}_to_${dateRange.toDate}_${currentDate}.xlsx`;
//             XLSX.writeFile(wb, fileName);

//             setNotification({
//                 show: true,
//                 message: 'Excel file exported successfully!',
//                 type: 'success'
//             });
//         } catch (err) {
//             console.error('Error exporting to Excel:', err);
//             setNotification({
//                 show: true,
//                 message: 'Failed to export Excel file: ' + err.message,
//                 type: 'error'
//             });
//         } finally {
//             setExporting(false);
//         }
//     };

//     const handlePrint = () => {
//         if (filteredReports.length === 0) {
//             setNotification({
//                 show: true,
//                 message: 'No data to print. Please generate a report first.',
//                 type: 'warning'
//             });
//             return;
//         }

//         const printWindow = window.open("", "_blank");

//         if (!printWindow) {
//             setNotification({
//                 show: true,
//                 message: 'Popup blocked. Please allow popups for this site.',
//                 type: 'error'
//             });
//             return;
//         }

//         let tableContent = generatePrintContent();

//         printWindow.document.write(`
//             <html>
//                 <head>
//                     <title>Purchase VAT Report</title>
//                     <meta charset="UTF-8">
//                     <style>
//                         @page { margin: 5mm; }
//                         body { 
//                             font-family: 'Segoe UI', Arial, sans-serif; 
//                             font-size: 10px; 
//                             margin: 0;
//                             padding: 5mm;
//                             background: #fff;
//                             color: #000;
//                         }
//                         table { 
//                             width: 100%; 
//                             border-collapse: collapse; 
//                             page-break-inside: auto;
//                             font-size: 10px;
//                         }
//                         tr { page-break-inside: avoid; page-break-after: auto; }
//                         th, td { 
//                             border: 1px solid #333; 
//                             padding: 4px 6px; 
//                             text-align: left; 
//                             white-space: nowrap;
//                         }
//                         th { 
//                             background-color: #e8e8e8 !important; 
//                             -webkit-print-color-adjust: exact; 
//                             print-color-adjust: exact;
//                             font-size: 11px;
//                             font-weight: 700;
//                             color: #1a1a1a;
//                         }
//                         td { font-size: 10px; padding: 4px 6px; }
//                         .print-header { text-align: center; margin-bottom: 10px; }
//                         .text-end { text-align: right; }
//                         .nowrap { white-space: nowrap; }
//                         .report-title {
//                             text-align: center;
//                             text-decoration: underline;
//                             font-size: 14px;
//                             font-weight: 700;
//                             margin: 6px 0;
//                             color: #1a1a1a;
//                             letter-spacing: 0.5px;
//                         }
//                         .grand-total-row td {
//                             font-weight: 700;
//                             border-top: 3px double #000;
//                             background-color: #f5f5f5 !important;
//                             -webkit-print-color-adjust: exact;
//                             print-color-adjust: exact;
//                         }
//                         .company-name {
//                             font-size: 18px;
//                             font-weight: 700;
//                             margin: 0;
//                             padding: 0;
//                             color: #1a1a1a;
//                             letter-spacing: 1px;
//                         }
//                         .company-details {
//                             font-size: 10px;
//                             margin: 4px 0;
//                             color: #333;
//                             line-height: 1.4;
//                         }
//                         .footer {
//                             margin-top: 15px;
//                             font-size: 9px;
//                             text-align: center;
//                             border-top: 1px solid #ccc;
//                             padding-top: 8px;
//                             color: #666;
//                         }
//                         .total-label { font-size: 11px; font-weight: 600; }
//                         @media print {
//                             body { padding: 10px; }
//                             th, td { padding: 3px 5px; }
//                         }
//                     </style>
//                 </head>
//                 <body>
//                     ${tableContent}
//                     <script>
//                         window.onload = function() {
//                             setTimeout(function() { 
//                                 window.print();
//                                 setTimeout(function() {
//                                     window.close();
//                                 }, 500);
//                             }, 300);
//                         };
//                     <\/script>
//                 </body>
//             </html>
//         `);
//         printWindow.document.close();
//     };

//     const generatePrintContent = () => {
//         let tableContent = `
//             <div class="print-header">
//                 <div class="company-name">${data.currentCompanyName || 'Company Name'}</div>
//                 <div class="company-details">
//                     ${data.company?.address || ''}${data.company?.city ? ', ' + data.company?.city : ''}<br>
//                     PAN: ${data.company?.pan || ''} | Phone: ${data.company?.phone || ''}
//                 </div>
//                 <hr style="margin:6px 0; border: 1px solid #ccc;">
//                 <div class="report-title">Purchase VAT Report</div>
//                 <div class="statement-info">
//                     <strong>From (BS):</strong> ${dateRange.fromDate} &nbsp;|&nbsp;
//                     <strong>To (BS):</strong> ${dateRange.toDate} &nbsp;|&nbsp;
//                     <strong>From (AD):</strong> ${dateRange.fromDateAd} &nbsp;|&nbsp;
//                     <strong>To (AD):</strong> ${dateRange.toDateAd} &nbsp;|&nbsp;
//                     <strong>Total Bills:</strong> ${filteredReports.length}
//                 </div>
//             </div>
//             <table cellspacing="0">
//                 <thead>
//                     <tr>
//                         <th class="nowrap">Miti</th>
//                         <th class="nowrap">Date</th>
//                         <th class="nowrap">Vch. No.</th>
//                         <th class="nowrap">Invoice No.</th>
//                         <th class="nowrap">Supplier's Name</th>
//                         <th class="nowrap">Supplier's PAN</th>
//                         <th class="nowrap text-end">Total Amount</th>
//                         <th class="nowrap text-end">Discount</th>
//                         <th class="nowrap text-end">Non-VAT Purchase</th>
//                         <th class="nowrap text-end">Taxable Amt.</th>
//                         <th class="nowrap text-end">VAT</th>
//                     </tr>
//                 </thead>
//                 <tbody>
//         `;

//         let printTotals = {
//             totalAmount: 0,
//             discountAmount: 0,
//             nonVatPurchase: 0,
//             taxableAmount: 0,
//             vatAmount: 0
//         };

//         filteredReports.forEach((report) => {
//             tableContent += `
//                 <tr>
//                     <td class="nowrap">${report.nepaliDate || ''}</td>
//                     <td class="nowrap">${report.date ? new Date(report.date).toLocaleDateString() : ''}</td>
//                     <td class="nowrap">${report.billNumber || ''}</td>
//                     <td class="nowrap">${report.partyBillNumber || '-'}</td>
//                     <td style="white-space: normal; word-wrap: break-word; max-width: 150px;">${report.accountName || ''}</td>
//                     <td class="nowrap">${report.panNumber || ''}</td>
//                     <td class="text-end">${(report.totalAmount || 0).toFixed(2)}</td>
//                     <td class="text-end">${(report.discountAmount || 0).toFixed(2)}</td>
//                     <td class="text-end">${(report.nonVatPurchase || 0).toFixed(2)}</td>
//                     <td class="text-end">${(report.taxableAmount || 0).toFixed(2)}</td>
//                     <td class="text-end">${(report.vatAmount || 0).toFixed(2)}</td>
//                 </tr>
//             `;

//             printTotals.totalAmount += parseFloat(report.totalAmount || 0);
//             printTotals.discountAmount += parseFloat(report.discountAmount || 0);
//             printTotals.nonVatPurchase += parseFloat(report.nonVatPurchase || 0);
//             printTotals.taxableAmount += parseFloat(report.taxableAmount || 0);
//             printTotals.vatAmount += parseFloat(report.vatAmount || 0);
//         });

//         tableContent += `
//                 <tr class="grand-total-row">
//                     <td colspan="6" class="text-end total-label">GRAND TOTALS</td>
//                     <td class="text-end total-label">${printTotals.totalAmount.toFixed(2)}</td>
//                     <td class="text-end total-label">${printTotals.discountAmount.toFixed(2)}</td>
//                     <td class="text-end total-label">${printTotals.nonVatPurchase.toFixed(2)}</td>
//                     <td class="text-end total-label">${printTotals.taxableAmount.toFixed(2)}</td>
//                     <td class="text-end total-label">${printTotals.vatAmount.toFixed(2)}</td>
//                 </tr>
//                 </tbody>
//             </table>
//         `;

//         return tableContent;
//     };

//     const resetColumnWidths = () => {
//         setColumnWidths({
//             bsDate: 80,
//             adDate: 80,
//             voucherNo: 100,
//             supplierBillNo: 100,
//             supplierName: 200,
//             panNumber: 100,
//             totalAmount: 100,
//             discount: 80,
//             nonVatPurchase: 120,
//             taxableAmount: 100,
//             vatAmount: 80
//         });
//         setNotification({
//             show: true,
//             message: 'Column widths reset',
//             type: 'success',
//             duration: 2000
//         });
//     };

//     // Resize Handle Component
//     const ResizeHandle = React.memo(({ onResizeStart, left, columnName }) => {
//         return (
//             <div
//                 className="pv-resize-handle"
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

//     // Table Header Component
//     const TableHeader = React.memo(() => {
//         const totalWidth = columnWidths.bsDate + columnWidths.adDate + columnWidths.voucherNo +
//             columnWidths.supplierBillNo + columnWidths.supplierName + columnWidths.panNumber +
//             columnWidths.totalAmount + columnWidths.discount + columnWidths.nonVatPurchase +
//             columnWidths.taxableAmount + columnWidths.vatAmount;

//         const handleResizeStart = (e, columnName) => {
//             setIsResizing(true);
//             setResizingColumn(columnName);
//             setStartX(e.clientX);
//             setStartWidth(columnWidths[columnName]);
//             e.preventDefault();
//         };

//         return (
//             <div
//                 className="pv-header"
//                 style={{
//                     minWidth: `${totalWidth}px`,
//                     zIndex: 2,
//                     height: '28px'
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
//                 <div className="pv-header-cell pv-header-cell--center" style={{ width: `${columnWidths.bsDate}px`, flexShrink: 0, minWidth: '80px' }}>
//                     <strong>Miti</strong>
//                     <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.bsDate - 2} columnName="bsDate" />
//                 </div>

//                 {/* AD Date */}
//                 <div className="pv-header-cell pv-header-cell--center" style={{ width: `${columnWidths.adDate}px`, flexShrink: 0, minWidth: '80px' }}>
//                     <strong>Date</strong>
//                     <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.adDate - 2} columnName="adDate" />
//                 </div>

//                 {/* Vch. No. */}
//                 <div className="pv-header-cell" style={{ width: `${columnWidths.voucherNo}px`, flexShrink: 0, minWidth: '60px' }}>
//                     <strong>Vch. No.</strong>
//                     <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.voucherNo - 3} columnName="voucherNo" />
//                 </div>

//                 {/* Invoice No. */}
//                 <div className="pv-header-cell" style={{ width: `${columnWidths.supplierBillNo}px`, flexShrink: 0, minWidth: '60px' }}>
//                     <strong>Invoice No.</strong>
//                     <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.supplierBillNo - 3} columnName="supplierBillNo" />
//                 </div>

//                 {/* Supplier's Name */}
//                 <div className="pv-header-cell" style={{ width: `${columnWidths.supplierName}px`, flexShrink: 0, minWidth: '100px' }}>
//                     <strong>Supplier's Name</strong>
//                     <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.supplierName - 3} columnName="supplierName" />
//                 </div>

//                 {/* Supplier's PAN */}
//                 <div className="pv-header-cell" style={{ width: `${columnWidths.panNumber}px`, flexShrink: 0, minWidth: '80px' }}>
//                     <strong>Supplier's PAN</strong>
//                     <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.panNumber - 3} columnName="panNumber" />
//                 </div>

//                 {/* Total Amount */}
//                 <div className="pv-header-cell pv-header-cell--end" style={{ width: `${columnWidths.totalAmount}px`, flexShrink: 0, minWidth: '80px' }}>
//                     <strong>Total Amount</strong>
//                     <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.totalAmount - 2} columnName="totalAmount" />
//                 </div>

//                 {/* Discount */}
//                 <div className="pv-header-cell pv-header-cell--end" style={{ width: `${columnWidths.discount}px`, flexShrink: 0, minWidth: '80px' }}>
//                     <strong>Discount</strong>
//                     <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.discount - 2} columnName="discount" />
//                 </div>

//                 {/* Non-VAT Purchase */}
//                 <div className="pv-header-cell pv-header-cell--end" style={{ width: `${columnWidths.nonVatPurchase}px`, flexShrink: 0, minWidth: '80px' }}>
//                     <strong>Non-VAT Purchase</strong>
//                     <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.nonVatPurchase - 2} columnName="nonVatPurchase" />
//                 </div>

//                 {/* Taxable Amt. */}
//                 <div className="pv-header-cell pv-header-cell--end" style={{ width: `${columnWidths.taxableAmount}px`, flexShrink: 0, minWidth: '80px' }}>
//                     <strong>Taxable Amt.</strong>
//                     <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.taxableAmount - 2} columnName="taxableAmount" />
//                 </div>

//                 {/* VAT */}
//                 <div className="pv-header-cell pv-header-cell--end" style={{ width: `${columnWidths.vatAmount}px`, flexShrink: 0, minWidth: '80px' }}>
//                     <strong>VAT</strong>
//                     <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.vatAmount - 2} columnName="vatAmount" />
//                 </div>

//                 {isResizing && (
//                     <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, cursor: 'col-resize' }} />
//                 )}
//             </div>
//         );
//     });

//     // Table Row Component
//     const TableRow = React.memo(({ index, style, data: rowData }) => {
//         const { reports, selectedRowIndex, formatCurrency, handleRowClick } = rowData;
//         const report = reports[index];

//         if (!report) return null;

//         const isSelected = selectedRowIndex === index;

//         return (
//             <div
//                 style={{
//                     ...style,
//                     display: 'flex',
//                     alignItems: 'center',
//                     height: '28px',
//                     minHeight: '28px',
//                     padding: '0',
//                     borderBottom: '1px solid #e2e8f0',
//                     cursor: 'pointer',
//                     backgroundColor: isSelected ? '#eff6ff' : (index % 2 === 0 ? '#f8fafc' : 'white')
//                 }}
//                 className="pv-row"
//                 onClick={() => handleRowClick(index)}
//             >
//                 {/* BS Date */}
//                 <div className="pv-cell pv-cell--center" style={{ width: `${columnWidths.bsDate}px`, flexShrink: 0, height: '100%' }}>
//                     <span>{report.nepaliDate || ''}</span>
//                 </div>

//                 {/* AD Date */}
//                 <div className="pv-cell pv-cell--center" style={{ width: `${columnWidths.adDate}px`, flexShrink: 0, height: '100%' }}>
//                     <span>{report.date ? new Date(report.date).toLocaleDateString() : ''}</span>
//                 </div>

//                 {/* Vch. No. */}
//                 <div className="pv-cell" style={{ width: `${columnWidths.voucherNo}px`, flexShrink: 0, height: '100%', overflow: 'hidden' }}>
//                     <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{report.billNumber || ''}</span>
//                 </div>

//                 {/* Invoice No. */}
//                 <div className="pv-cell" style={{ width: `${columnWidths.supplierBillNo}px`, flexShrink: 0, height: '100%', overflow: 'hidden' }}>
//                     <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{report.partyBillNumber || '-'}</span>
//                 </div>

//                 {/* Supplier's Name */}
//                 <div className="pv-cell" style={{ width: `${columnWidths.supplierName}px`, flexShrink: 0, height: '100%', overflow: 'hidden' }} title={report.accountName || ''}>
//                     <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{report.accountName || ''}</span>
//                 </div>

//                 {/* Supplier's PAN */}
//                 <div className="pv-cell" style={{ width: `${columnWidths.panNumber}px`, flexShrink: 0, height: '100%', overflow: 'hidden' }}>
//                     <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{report.panNumber || ''}</span>
//                 </div>

//                 {/* Total Amount */}
//                 <div className="pv-cell pv-cell--end" style={{ width: `${columnWidths.totalAmount}px`, flexShrink: 0, height: '100%' }}>
//                     <span>{formatCurrency(report.totalAmount)}</span>
//                 </div>

//                 {/* Discount */}
//                 <div className="pv-cell pv-cell--end" style={{ width: `${columnWidths.discount}px`, flexShrink: 0, height: '100%' }}>
//                     <span>{formatCurrency(report.discountAmount)}</span>
//                 </div>

//                 {/* Non-VAT Purchase */}
//                 <div className="pv-cell pv-cell--end" style={{ width: `${columnWidths.nonVatPurchase}px`, flexShrink: 0, height: '100%' }}>
//                     <span>{formatCurrency(report.nonVatPurchase)}</span>
//                 </div>

//                 {/* Taxable Amt. */}
//                 <div className="pv-cell pv-cell--end" style={{ width: `${columnWidths.taxableAmount}px`, flexShrink: 0, height: '100%' }}>
//                     <span>{formatCurrency(report.taxableAmount)}</span>
//                 </div>

//                 {/* VAT */}
//                 <div className="pv-cell pv-cell--end" style={{ width: `${columnWidths.vatAmount}px`, flexShrink: 0, height: '100%' }}>
//                     <span>{formatCurrency(report.vatAmount)}</span>
//                 </div>
//             </div>
//         );
//     }, (prevProps, nextProps) => {
//         if (prevProps.index !== nextProps.index) return false;
//         if (prevProps.style !== nextProps.style) return false;
//         const prevReport = prevProps.data.reports[prevProps.index];
//         const nextReport = nextProps.data.reports[nextProps.index];
//         return prevReport === nextReport && prevProps.data.selectedRowIndex === nextProps.data.selectedRowIndex;
//     });

//     if (loading && data.purchaseVatReport.length === 0) return <Loader />;

//     if (error && data.purchaseVatReport.length === 0) {
//         return (
//             <div className="pv-page">
//                 <Header />
//                 <div className="pv-shell">
//                     <div className="pv-state">
//                         <h3>Error</h3>
//                         <p>{error}</p>
//                     </div>
//                 </div>
//             </div>
//         );
//     }

//     return (
//         <div className="pv-page">
//             <Header />

//             <div className="pv-shell">
//                 {/* Top Bar */}
//                 <div className="pv-topbar">
//                     <div className="pv-topbar__left">
//                         <div className="pv-topbar__icon"><FiFileText /></div>
//                         <div><h1>Purchase VAT Report</h1></div>
//                     </div>
//                     <div className="pv-topbar__actions">
//                         <button className="pv-btn-icon" onClick={handleExportExcel} disabled={data.purchaseVatReport.length === 0 || exporting}>
//                             <FiDownload /> {exporting ? '…' : 'Excel'}
//                         </button>
//                         <button className="pv-btn-icon" onClick={handlePrint} disabled={filteredReports.length === 0}>
//                             <FiPrinter /> Print
//                         </button>
//                         <button className="pv-btn-icon" onClick={resetColumnWidths} title="Reset columns">
//                             <FiRefreshCw /> Reset
//                         </button>
//                     </div>
//                 </div>

//                 {/* Toolbar */}
//                 <div className="pv-toolbar">
//                     <div className="pv-field pv-field--date">
//                         <label>From (BS) <span className="req">*</span></label>
//                         <input
//                             type="text"
//                             id="fromDate"
//                             ref={fromDateRef}
//                             className={dateErrors.fromDate ? 'is-invalid' : ''}
//                             value={dateRange.fromDate || ''}
//                             onChange={(e) => {
//                                 const value = e.target.value.replace(/[^0-9/-]/g, '').slice(0, 10);
//                                 const adDate = convertBsToAd(value);
//                                 setDateRange(prev => ({
//                                     ...prev,
//                                     fromDate: value,
//                                     fromDateAd: adDate || prev.fromDateAd
//                                 }));
//                                 setDateErrors(prev => ({ ...prev, fromDate: '' }));
//                             }}
//                             onKeyDown={(e) => handleKeyDown(e, 'fromDateAd')}
//                             onBlur={(e) => {
//                                 const dateStr = e.target.value.trim();
//                                 if (!dateStr) return;
//                                 const correctedDate = validateAndCorrectNepaliDate(dateStr);
//                                 if (!correctedDate) {
//                                     const fallbackDate = currentNepaliDate;
//                                     const adDate = convertBsToAd(fallbackDate);
//                                     setDateRange(prev => ({ ...prev, fromDate: fallbackDate, fromDateAd: adDate }));
//                                     setNotification({ show: true, message: 'Invalid Nepali date. Auto-corrected.', type: 'warning' });
//                                 }
//                             }}
//                             placeholder="YYYY-MM-DD"
//                             autoFocus
//                             autoComplete="off"
//                         />
//                         {dateErrors.fromDate && <div className="pv-field-error">{dateErrors.fromDate}</div>}
//                     </div>

//                     <div className="pv-field pv-field--date">
//                         <label>From (AD)</label>
//                         <input
//                             type="date"
//                             id="fromDateAd"
//                             value={dateRange.fromDateAd || ''}
//                             onChange={(e) => {
//                                 const value = e.target.value;
//                                 const bsDate = convertAdToBs(value);
//                                 setDateRange(prev => ({
//                                     ...prev,
//                                     fromDateAd: value,
//                                     fromDate: bsDate || prev.fromDate
//                                 }));
//                             }}
//                             onKeyDown={(e) => handleKeyDown(e, 'toDate')}
//                         />
//                     </div>

//                     <div className="pv-field pv-field--date">
//                         <label>To (BS) <span className="req">*</span></label>
//                         <input
//                             type="text"
//                             id="toDate"
//                             ref={toDateRef}
//                             className={dateErrors.toDate ? 'is-invalid' : ''}
//                             value={dateRange.toDate || ''}
//                             onChange={(e) => {
//                                 const value = e.target.value.replace(/[^0-9/-]/g, '').slice(0, 10);
//                                 const adDate = convertBsToAd(value);
//                                 setDateRange(prev => ({
//                                     ...prev,
//                                     toDate: value,
//                                     toDateAd: adDate || prev.toDateAd
//                                 }));
//                                 setDateErrors(prev => ({ ...prev, toDate: '' }));
//                             }}
//                             onKeyDown={(e) => handleKeyDown(e, 'toDateAd')}
//                             onBlur={(e) => {
//                                 const dateStr = e.target.value.trim();
//                                 if (!dateStr) return;
//                                 const correctedDate = validateAndCorrectNepaliDate(dateStr);
//                                 if (!correctedDate) {
//                                     const fallbackDate = currentNepaliDate;
//                                     const adDate = convertBsToAd(fallbackDate);
//                                     setDateRange(prev => ({ ...prev, toDate: fallbackDate, toDateAd: adDate }));
//                                     setNotification({ show: true, message: 'Invalid Nepali date. Auto-corrected.', type: 'warning' });
//                                 }
//                             }}
//                             placeholder="YYYY-MM-DD"
//                             autoComplete="off"
//                         />
//                         {dateErrors.toDate && <div className="pv-field-error">{dateErrors.toDate}</div>}
//                     </div>

//                     <div className="pv-field pv-field--date">
//                         <label>To (AD)</label>
//                         <input
//                             type="date"
//                             id="toDateAd"
//                             value={dateRange.toDateAd || ''}
//                             onChange={(e) => {
//                                 const value = e.target.value;
//                                 const bsDate = convertAdToBs(value);
//                                 setDateRange(prev => ({
//                                     ...prev,
//                                     toDateAd: value,
//                                     toDate: bsDate || prev.toDate
//                                 }));
//                             }}
//                             onKeyDown={(e) => handleKeyDown(e, 'generateReport')}
//                         />
//                     </div>

//                     <button type="button" id="generateReport" ref={generateReportRef} className="pv-btn-gen" onClick={handleGenerateReport} disabled={loading}>
//                         {loading ? <span className="spinner-border spinner-border-sm" style={{ width: 12, height: 12 }} /> : <><FiSearch className="me-1" /> Generate</>}
//                     </button>

//                     <div className="pv-toolbar-divider" />

//                     <div className="pv-field pv-field--search">
//                         <label>Search</label>
//                         <div className="pv-search-wrap">
//                             <FiSearch className="pv-search-icon" />
//                             <input
//                                 type="text"
//                                 id="searchInput"
//                                 ref={searchInputRef}
//                                 value={searchQuery}
//                                 onChange={(e) => setSearchQuery(e.target.value)}
//                                 disabled={data.purchaseVatReport.length === 0}
//                                 autoComplete="off"
//                             />
//                             {searchQuery && <button className="pv-search-clear" onClick={() => setSearchQuery('')}>×</button>}
//                         </div>
//                     </div>
//                 </div>

//                 {error && (
//                     <div className="pv-alert">
//                         <FiX /> {error}
//                         <button type="button" className="btn-close btn-sm ms-auto" onClick={() => setError(null)} />
//                     </div>
//                 )}

//                 {/* Main Content */}
//                 <div className="pv-main">
//                     {data.purchaseVatReport.length === 0 && !loading ? (
//                         <div className="pv-state">
//                             <FiCalendar size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
//                             <h3>Select date range & generate</h3>
//                             <p>Choose a date range, then click Generate.</p>
//                         </div>
//                     ) : loading ? (
//                         <div className="pv-state"><div className="spinner-border text-primary" /><p>Loading data...</p></div>
//                     ) : filteredReports.length === 0 ? (
//                         <div className="pv-state">
//                             <FiSearch size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
//                             <h3>No records found</h3>
//                             <p>{searchQuery ? 'Try a different search term' : 'No data for the selected date range'}</p>
//                         </div>
//                     ) : (
//                         <>
//                             <div className="pv-main__bar">
//                                 <span><strong>{filteredReports.length}</strong> bills</span>
//                                 <span>{dateRange.fromDate} — {dateRange.toDate}</span>
//                             </div>
//                             <div className="pv-table-wrap" ref={tableBodyRef}>
//                                 <AutoSizer>
//                                     {({ height, width }) => {
//                                         const totalWidth = columnWidths.bsDate + columnWidths.adDate +
//                                             columnWidths.voucherNo + columnWidths.supplierBillNo +
//                                             columnWidths.supplierName + columnWidths.panNumber +
//                                             columnWidths.totalAmount + columnWidths.discount +
//                                             columnWidths.nonVatPurchase + columnWidths.taxableAmount +
//                                             columnWidths.vatAmount;

//                                         return (
//                                             <div style={{ position: 'relative', height: height, width: Math.max(width, totalWidth) }}>
//                                                 <TableHeader />
//                                                 <List
//                                                     height={height - 28}
//                                                     itemCount={filteredReports.length}
//                                                     itemSize={28}
//                                                     width={Math.max(width, totalWidth)}
//                                                     itemData={{
//                                                         reports: filteredReports,
//                                                         selectedRowIndex,
//                                                         formatCurrency,
//                                                         handleRowClick: (index) => setSelectedRowIndex(index)
//                                                     }}
//                                                 >
//                                                     {TableRow}
//                                                 </List>
//                                             </div>
//                                         );
//                                     }}
//                                 </AutoSizer>
//                             </div>
//                             <div className="pv-footer">
//                                 <div className="pv-footer-cell" style={{ width: `${columnWidths.bsDate + columnWidths.adDate + columnWidths.voucherNo + columnWidths.supplierBillNo + columnWidths.supplierName + columnWidths.panNumber}px`, flexShrink: 0 }}>
//                                     <strong>Grand Totals:</strong>
//                                 </div>
//                                 <div className="pv-footer-cell pv-footer-cell--end" style={{ width: `${columnWidths.totalAmount}px`, flexShrink: 0 }}>
//                                     <strong>{formatCurrency(totals.totalAmount)}</strong>
//                                 </div>
//                                 <div className="pv-footer-cell pv-footer-cell--end" style={{ width: `${columnWidths.discount}px`, flexShrink: 0 }}>
//                                     <strong>{formatCurrency(totals.discountAmount)}</strong>
//                                 </div>
//                                 <div className="pv-footer-cell pv-footer-cell--end" style={{ width: `${columnWidths.nonVatPurchase}px`, flexShrink: 0 }}>
//                                     <strong>{formatCurrency(totals.nonVatPurchase)}</strong>
//                                 </div>
//                                 <div className="pv-footer-cell pv-footer-cell--end" style={{ width: `${columnWidths.taxableAmount}px`, flexShrink: 0 }}>
//                                     <strong>{formatCurrency(totals.taxableAmount)}</strong>
//                                 </div>
//                                 <div className="pv-footer-cell pv-footer-cell--end" style={{ width: `${columnWidths.vatAmount}px`, flexShrink: 0 }}>
//                                     <strong>{formatCurrency(totals.vatAmount)}</strong>
//                                 </div>
//                             </div>
//                         </>
//                     )}
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

// export default PurchaseVatReport;

//----------------------------------------------------end1

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../Header';
import NepaliDate from 'nepali-datetime';
import Loader from '../../Loader';
import * as XLSX from 'xlsx';
import NotificationToast from '../../NotificationToast';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import api from '../../services/api';
import { FiFileText, FiPrinter, FiDownload, FiSearch, FiRefreshCw, FiCalendar, FiX, FiGrid, FiList } from 'react-icons/fi';
import './PurchaseVatReport.css';

// ============================================================
// Helpers
// ============================================================
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
        console.error('Error converting BS to AD:', error.message, 'Date:', bsDate);
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
        console.error('Error converting AD to BS:', error.message, 'Date:', adDate);
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
        console.warn('Invalid Nepali date:', dateStr, error.message);
        return false;
    }
};

/**
 * Build IRD Annex-5 style rows for Purchase (खरिद खाता).
 * Columns per PDF:
 *  - मिति
 *  - बीजक नं.
 *  - प्रज्ञापनपत्र नं.  (uses partyBillNumber)
 *  - आपूर्तिकर्ताको नाम
 *  - जम्मा खरिद मूल्य (रु)
 *  - कर छूट हुने वस्तु वा सेवाको खरिद / पैठारी मूल्य (रु)  → nonVatPurchase
 *  - करयोग्य खरिद (पूंजीगत बाहेक): मूल्य + कर  → taxableAmount + vatAmount
 *  - करयोग्य पैठारी (पूंजीगत बाहेक): मूल्य + कर  → 0 (not tracked)
 *  - पूंजीगत करयोग्य खरिद / पैठारी: मूल्य + कर  → 0 (not tracked)
 */
const buildIrdRows = (reports = []) => {
    return reports.map((r) => {
        const totalPurchase = Number(r.totalAmount || 0);
        const nonVatPurchase = Number(r.nonVatPurchase || 0);
        const taxableAmount = Number(r.taxableAmount || 0);
        const vatAmount = Number(r.vatAmount || 0);

        return {
            date: r.nepaliDate || '',
            invoiceNo: r.billNumber || '',
            parjapatraNo: r.partyBillNumber || '',
            supplierName: r.accountName || '',
            supplierPan: r.panNumber || '',
            totalPurchase: totalPurchase,
            taxExemptPurchase: nonVatPurchase,
            // करयोग्य खरिद (पूंजीगत बाहेक)
            taxablePurchaseValue: taxableAmount,
            taxablePurchaseVat: vatAmount,
            // करयोग्य पैठारी (पूंजीगत बाहेक) — no data → 0
            taxableImportValue: 0,
            taxableImportVat: 0,
            // पूंजीगत करयोग्य खरिद / पैठारी — no data → 0
            capitalTaxableValue: 0,
            capitalTaxableVat: 0
        };
    });
};

// ============================================================
// Component
// ============================================================
const PurchaseVatReport = () => {
    const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
    const currentEnglishDate = new Date().toISOString().split('T')[0];
    const [exporting, setExporting] = useState(false);

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

    const [company, setCompany] = useState({
        dateFormat: 'english',
        vatEnabled: true,
        fiscalYear: {}
    });

    // View mode: 'table' | 'ird'
    const [viewMode, setViewMode] = useState('table');

    const [dateRange, setDateRange] = useState({
        fromDate: '',
        toDate: '',
        fromDateAd: '',
        toDateAd: ''
    });

    const [data, setData] = useState({
        company: null,
        currentFiscalYear: null,
        purchaseVatReport: [],
        // Debit Note rows (returned separately by backend if available)
        debitNoteReport: [],
        companyDateFormat: 'english',
        nepaliDate: '',
        currentCompanyName: '',
        user: null
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRowIndex, setSelectedRowIndex] = useState(0);
    const [filteredReports, setFilteredReports] = useState([]);
    const [filteredDebitNotes, setFilteredDebitNotes] = useState([]);

    const [columnWidths, setColumnWidths] = useState({
        bsDate: 80,
        adDate: 80,
        voucherNo: 100,
        supplierBillNo: 100,
        supplierName: 200,
        panNumber: 100,
        totalAmount: 100,
        discount: 80,
        nonVatPurchase: 120,
        taxableAmount: 100,
        vatAmount: 80
    });

    const [isResizing, setIsResizing] = useState(false);
    const [resizingColumn, setResizingColumn] = useState(null);
    const [startX, setStartX] = useState(0);
    const [startWidth, setStartWidth] = useState(0);

    const fromDateRef = useRef(null);
    const toDateRef = useRef(null);
    const searchInputRef = useRef(null);
    const generateReportRef = useRef(null);
    const tableBodyRef = useRef(null);
    const [shouldFetch, setShouldFetch] = useState(false);
    const navigate = useNavigate();

    // Fetch initial data
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                setLoading(true);
                const response = await api.get('/api/retailer/purchase-vat-report');

                if (response.data.success) {
                    const responseData = response.data.data;
                    const dateFormat = responseData.company?.dateFormat?.toLowerCase() || 'english';

                    setCompany({
                        dateFormat: dateFormat,
                        vatEnabled: responseData.company?.vatEnabled !== false,
                        fiscalYear: responseData.currentFiscalYear || {}
                    });

                    const currentFiscalYear = responseData.currentFiscalYear;
                    if (currentFiscalYear) {
                        let fromDateFormatted = '';
                        let toDateFormatted = '';
                        let fromDateAd = '';
                        let toDateAd = '';

                        if (dateFormat === 'nepali') {
                            fromDateFormatted = currentFiscalYear.startDateNepali || currentNepaliDate;
                            toDateFormatted = currentNepaliDate;
                            fromDateAd = convertBsToAd(fromDateFormatted);
                            toDateAd = convertBsToAd(toDateFormatted);
                        } else {
                            fromDateFormatted = currentFiscalYear.startDate
                                ? new Date(currentFiscalYear.startDate).toISOString().split('T')[0]
                                : currentEnglishDate;
                            toDateFormatted = currentEnglishDate;
                            fromDateAd = fromDateFormatted;
                            toDateAd = toDateFormatted;
                        }

                        setDateRange({
                            fromDate: fromDateFormatted,
                            toDate: toDateFormatted,
                            fromDateAd: fromDateAd,
                            toDateAd: toDateAd
                        });
                    }

                    setData(prev => ({
                        ...prev,
                        company: responseData.company,
                        currentFiscalYear: currentFiscalYear,
                        companyDateFormat: responseData.companyDateFormat,
                        nepaliDate: responseData.nepaliDate,
                        currentCompanyName: responseData.currentCompanyName,
                        user: responseData.user
                    }));
                }
            } catch (err) {
                console.error('Error fetching initial data:', err);
                setNotification({ show: true, message: 'Error loading data', type: 'error' });
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();
    }, []);

    // Fetch report on generate
    useEffect(() => {
        const fetchVatReportData = async () => {
            if (!shouldFetch) return;
            try {
                setLoading(true);
                const params = new URLSearchParams();
                if (dateRange.fromDateAd) params.append('fromDate', dateRange.fromDateAd);
                if (dateRange.toDateAd) params.append('toDate', dateRange.toDateAd);
                params.append('dateFormat', company.dateFormat);

                const response = await api.get(`/api/retailer/purchase-vat-report?${params.toString()}`);

                if (response.data.success) {
                    const responseData = response.data.data;
                    setData(prev => ({
                        ...prev,
                        purchaseVatReport: responseData.purchaseVatReport || [],
                        debitNoteReport: responseData.debitNoteReport || [], // optional
                        company: responseData.company || prev.company,
                        currentFiscalYear: responseData.currentFiscalYear || prev.currentFiscalYear,
                        companyDateFormat: responseData.companyDateFormat || prev.companyDateFormat,
                        nepaliDate: responseData.nepaliDate || prev.nepaliDate,
                        currentCompanyName: responseData.currentCompanyName || prev.currentCompanyName,
                        user: responseData.user || prev.user
                    }));
                    setError(null);
                    setSelectedRowIndex(0);
                } else {
                    const errorMsg = response.data.error || 'Failed to fetch purchase VAT report';
                    setError(errorMsg);
                    setNotification({ show: true, message: errorMsg, type: 'error' });
                }
            } catch (err) {
                console.error('Fetch error:', err);
                const errorMsg = err.response?.data?.error || 'Failed to fetch purchase VAT report';
                setError(errorMsg);
                setNotification({ show: true, message: errorMsg, type: 'error' });
            } finally {
                setLoading(false);
                setShouldFetch(false);
            }
        };

        fetchVatReportData();

        return () => {
            setShouldFetch(false);
        };
    }, [shouldFetch, company.dateFormat, dateRange.fromDateAd, dateRange.toDateAd]);

    // Filter
    useEffect(() => {
        const filtered = data.purchaseVatReport.filter(report => {
            const billNumber = report.billNumber ? report.billNumber.toString().toLowerCase() : '';
            const partyBillNumber = report.partyBillNumber ? report.partyBillNumber.toString().toLowerCase() : '';
            const accountName = report.accountName ? report.accountName.toString().toLowerCase() : '';
            const panNumber = report.panNumber ? report.panNumber.toString().toLowerCase() : '';
            return (
                billNumber.includes(searchQuery.toLowerCase()) ||
                partyBillNumber.includes(searchQuery.toLowerCase()) ||
                accountName.includes(searchQuery.toLowerCase()) ||
                panNumber.includes(searchQuery.toLowerCase())
            );
        });
        setFilteredReports(filtered);
        if (selectedRowIndex >= filtered.length && filtered.length > 0) {
            setSelectedRowIndex(0);
        }
    }, [data.purchaseVatReport, searchQuery, selectedRowIndex]);

    // Filter debit notes
    useEffect(() => {
        const filtered = (data.debitNoteReport || []).filter(report => {
            const billNumber = report.billNumber ? report.billNumber.toString().toLowerCase() : '';
            const accountName = report.accountName ? report.accountName.toString().toLowerCase() : '';
            const panNumber = report.panNumber ? report.panNumber.toString().toLowerCase() : '';
            return (
                billNumber.includes(searchQuery.toLowerCase()) ||
                accountName.includes(searchQuery.toLowerCase()) ||
                panNumber.includes(searchQuery.toLowerCase())
            );
        });
        setFilteredDebitNotes(filtered);
    }, [data.debitNoteReport, searchQuery]);

    // Table totals
    const totals = useMemo(() => {
        return filteredReports.reduce((acc, report) => ({
            totalAmount: acc.totalAmount + (report.totalAmount || 0),
            discountAmount: acc.discountAmount + (report.discountAmount || 0),
            nonVatPurchase: acc.nonVatPurchase + (report.nonVatPurchase || 0),
            taxableAmount: acc.taxableAmount + (report.taxableAmount || 0),
            vatAmount: acc.vatAmount + (report.vatAmount || 0)
        }), {
            totalAmount: 0,
            discountAmount: 0,
            nonVatPurchase: 0,
            taxableAmount: 0,
            vatAmount: 0
        });
    }, [filteredReports]);

    // IRD rows + totals
    const irdRows = useMemo(() => buildIrdRows(filteredReports), [filteredReports]);

    const irdTotals = useMemo(() => {
        return irdRows.reduce((acc, r) => ({
            totalPurchase: acc.totalPurchase + (r.totalPurchase || 0),
            taxExemptPurchase: acc.taxExemptPurchase + (r.taxExemptPurchase || 0),
            taxablePurchaseValue: acc.taxablePurchaseValue + (r.taxablePurchaseValue || 0),
            taxablePurchaseVat: acc.taxablePurchaseVat + (r.taxablePurchaseVat || 0),
            taxableImportValue: acc.taxableImportValue + (r.taxableImportValue || 0),
            taxableImportVat: acc.taxableImportVat + (r.taxableImportVat || 0),
            capitalTaxableValue: acc.capitalTaxableValue + (r.capitalTaxableValue || 0),
            capitalTaxableVat: acc.capitalTaxableVat + (r.capitalTaxableVat || 0)
        }), {
            totalPurchase: 0,
            taxExemptPurchase: 0,
            taxablePurchaseValue: 0,
            taxablePurchaseVat: 0,
            taxableImportValue: 0,
            taxableImportVat: 0,
            capitalTaxableValue: 0,
            capitalTaxableVat: 0
        });
    }, [irdRows]);

    // Debit note IRD rows (for the section below the main table)
    const debitNoteIrdRows = useMemo(() => {
        return filteredDebitNotes.map((r) => ({
            date: r.nepaliDate || '',
            invoiceNo: r.billNumber || '',
            parjapatraNo: r.partyBillNumber || '',
            supplierName: r.accountName || '',
            supplierPan: r.panNumber || '',
            totalPurchase: Number(r.totalAmount || 0),
            taxExemptPurchase: Number(r.nonVatPurchase || 0),
            taxablePurchaseValue: Number(r.taxableAmount || 0),
            taxablePurchaseVat: Number(r.vatAmount || 0),
            taxableImportValue: 0,
            taxableImportVat: 0,
            capitalTaxableValue: 0,
            capitalTaxableVat: 0
        }));
    }, [filteredDebitNotes]);

    const debitNoteTotals = useMemo(() => {
        return debitNoteIrdRows.reduce((acc, r) => ({
            totalPurchase: acc.totalPurchase + (r.totalPurchase || 0),
            taxExemptPurchase: acc.taxExemptPurchase + (r.taxExemptPurchase || 0),
            taxablePurchaseValue: acc.taxablePurchaseValue + (r.taxablePurchaseValue || 0),
            taxablePurchaseVat: acc.taxablePurchaseVat + (r.taxablePurchaseVat || 0)
        }), { totalPurchase: 0, taxExemptPurchase: 0, taxablePurchaseValue: 0, taxablePurchaseVat: 0 });
    }, [debitNoteIrdRows]);

    // Column widths persistence
    useEffect(() => {
        const savedWidths = localStorage.getItem('purchaseVatTableColumnWidths');
        if (savedWidths) {
            try { setColumnWidths(JSON.parse(savedWidths)); } catch (e) { /* ignore */ }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('purchaseVatTableColumnWidths', JSON.stringify(columnWidths));
    }, [columnWidths]);

    // Keyboard nav (table only)
    useEffect(() => {
        const handleKeyDownNav = (e) => {
            if (viewMode !== 'table') return;
            if (filteredReports.length === 0) return;
            const activeElement = document.activeElement;
            if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'SELECT') return;

            switch (e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    setSelectedRowIndex(prev => Math.max(0, prev - 1));
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    setSelectedRowIndex(prev => Math.min(filteredReports.length - 1, prev + 1));
                    break;
                default:
                    break;
            }
        };
        window.addEventListener('keydown', handleKeyDownNav);
        return () => window.removeEventListener('keydown', handleKeyDownNav);
    }, [filteredReports, viewMode]);

    const handleGenerateReport = () => {
        if (!dateRange.fromDate || !dateRange.toDate) {
            setError('Please select both from and to dates');
            setNotification({ show: true, message: 'Please select both from and to dates', type: 'warning' });
            return;
        }
        setShouldFetch(true);
    };

    const handleKeyDown = (e, nextFieldId) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (nextFieldId) {
                const nextField = document.getElementById(nextFieldId);
                if (nextField) nextField.focus();
            } else {
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
            if (isValidNepaliDate(correctedDate)) return correctedDate;
        }
        return null;
    };

    const formatCurrency = useCallback((num) => {
        const number = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num) || 0;
        return number.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }, []);

    const formatCurrencyForExport = (num) => {
        const number = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num) || 0;
        return number.toFixed(2);
    };

    // ============================================================
    // EXCEL EXPORT
    // ============================================================
    const handleExportExcel = async () => {
        if (!data.purchaseVatReport || data.purchaseVatReport.length === 0) {
            setNotification({ show: true, message: 'No data available to export. Please generate a report first.', type: 'warning' });
            return;
        }

        setExporting(true);
        try {
            const currentDate = new Date().toISOString().split('T')[0];
            const excelData = [];

            excelData.push([viewMode === 'ird' ? 'खरिद खाता (Purchase VAT Return)' : 'Purchase VAT Report']);
            excelData.push(['Company:', data.currentCompanyName || 'N/A']);
            excelData.push(['Address:', data.company?.address || '', data.company?.city ? ', ' + data.company.city : '']);
            excelData.push(['PAN:', data.company?.pan || '']);
            excelData.push(['From Date (BS):', dateRange.fromDate]);
            excelData.push(['To Date (BS):', dateRange.toDate]);
            excelData.push(['From Date (AD):', dateRange.fromDateAd]);
            excelData.push(['To Date (AD):', dateRange.toDateAd]);
            excelData.push(['Total Bills:', filteredReports.length]);
            if (searchQuery) excelData.push(['Search:', searchQuery]);
            excelData.push(['Export Date:', new Date().toLocaleString()]);
            excelData.push([]);

            if (viewMode === 'ird') {
                excelData.push([
                    'मिति', 'बीजक नं.', 'प्रज्ञापनपत्र नं.', 'आपूर्तिकर्ताको नाम',
                    'जम्मा खरिद मूल्य (रु)',
                    'कर छूट हुने वस्तु वा सेवाको खरिद / पैठारी मूल्य (रु)',
                    'करयोग्य खरिद (पूंजीगत बाहेक) मूल्य (रु)',
                    'करयोग्य खरिद (पूंजीगत बाहेक) कर (रु)',
                    'करयोग्य पैठारी (पूंजीगत बाहेक) मूल्य (रु)',
                    'करयोग्य पैठारी (पूंजीगत बाहेक) कर (रु)',
                    'पूंजीगत करयोग्य खरिद / पैठारी मूल्य (रु)',
                    'पूंजीगत करयोग्य खरिद / पैठारी कर (रु)'
                ]);
                irdRows.forEach(r => {
                    excelData.push([
                        r.date, r.invoiceNo, r.parjapatraNo, r.supplierName,
                        formatCurrencyForExport(r.totalPurchase),
                        formatCurrencyForExport(r.taxExemptPurchase),
                        formatCurrencyForExport(r.taxablePurchaseValue),
                        formatCurrencyForExport(r.taxablePurchaseVat),
                        formatCurrencyForExport(r.taxableImportValue),
                        formatCurrencyForExport(r.taxableImportVat),
                        formatCurrencyForExport(r.capitalTaxableValue),
                        formatCurrencyForExport(r.capitalTaxableVat)
                    ]);
                });
                excelData.push([]);
                excelData.push([
                    'Total Bill:', irdRows.length, '', '',
                    formatCurrencyForExport(irdTotals.totalPurchase),
                    formatCurrencyForExport(irdTotals.taxExemptPurchase),
                    formatCurrencyForExport(irdTotals.taxablePurchaseValue),
                    formatCurrencyForExport(irdTotals.taxablePurchaseVat),
                    formatCurrencyForExport(irdTotals.taxableImportValue),
                    formatCurrencyForExport(irdTotals.taxableImportVat),
                    formatCurrencyForExport(irdTotals.capitalTaxableValue),
                    formatCurrencyForExport(irdTotals.capitalTaxableVat)
                ]);

                if (debitNoteIrdRows.length > 0) {
                    excelData.push([]);
                    excelData.push(['Purchase Return / Debit Note']);
                    debitNoteIrdRows.forEach(r => {
                        excelData.push([
                            r.date, r.invoiceNo, r.parjapatraNo, r.supplierName,
                            formatCurrencyForExport(r.totalPurchase),
                            formatCurrencyForExport(r.taxExemptPurchase),
                            formatCurrencyForExport(r.taxablePurchaseValue),
                            formatCurrencyForExport(r.taxablePurchaseVat),
                            '', '', '', ''
                        ]);
                    });
                    excelData.push([
                        'Total Bill:', debitNoteIrdRows.length, '', '',
                        formatCurrencyForExport(debitNoteTotals.totalPurchase),
                        formatCurrencyForExport(debitNoteTotals.taxExemptPurchase),
                        formatCurrencyForExport(debitNoteTotals.taxablePurchaseValue),
                        formatCurrencyForExport(debitNoteTotals.taxablePurchaseVat),
                        '', '', '', ''
                    ]);
                }
            } else {
                excelData.push([
                    'S.No', 'Miti', 'Date (AD)', 'Vch. No.', 'Invoice No.',
                    "Supplier's Name", "Supplier's PAN", 'Total Amount',
                    'Discount', 'Non-VAT Purchase', 'Taxable Amt.', 'VAT'
                ]);

                filteredReports.forEach((report, index) => {
                    excelData.push([
                        index + 1,
                        report.nepaliDate || '',
                        report.date ? new Date(report.date).toLocaleDateString('en-CA') : '',
                        report.billNumber || '',
                        report.partyBillNumber || '-',
                        report.accountName || '',
                        report.panNumber || '',
                        formatCurrencyForExport(report.totalAmount),
                        formatCurrencyForExport(report.discountAmount),
                        formatCurrencyForExport(report.nonVatPurchase),
                        formatCurrencyForExport(report.taxableAmount),
                        formatCurrencyForExport(report.vatAmount)
                    ]);
                });

                excelData.push([]);
                excelData.push([
                    '', '', '', '', '', 'GRAND TOTALS', '',
                    formatCurrencyForExport(totals.totalAmount),
                    formatCurrencyForExport(totals.discountAmount),
                    formatCurrencyForExport(totals.nonVatPurchase),
                    formatCurrencyForExport(totals.taxableAmount),
                    formatCurrencyForExport(totals.vatAmount)
                ]);
            }

            const ws = XLSX.utils.aoa_to_sheet(excelData);
            ws['!cols'] = viewMode === 'ird'
                ? [{ wch: 14 }, { wch: 16 }, { wch: 18 }, { wch: 28 },
                   { wch: 18 }, { wch: 28 },
                   { wch: 22 }, { wch: 18 },
                   { wch: 22 }, { wch: 18 },
                   { wch: 22 }, { wch: 18 }]
                : [{ wch: 6 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
                   { wch: 25 }, { wch: 14 }, { wch: 15 }, { wch: 12 },
                   { wch: 15 }, { wch: 15 }, { wch: 12 }];

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, viewMode === 'ird' ? 'खरिद खाता' : 'Purchase VAT Report');

            const fileName = viewMode === 'ird'
                ? `Purchase_VAT_Return_${dateRange.fromDate}_to_${dateRange.toDate}_${currentDate}.xlsx`
                : `Purchase_VAT_Report_${dateRange.fromDate}_to_${dateRange.toDate}_${currentDate}.xlsx`;

            XLSX.writeFile(wb, fileName);

            setNotification({ show: true, message: 'Excel file exported successfully!', type: 'success' });
        } catch (err) {
            console.error('Error exporting to Excel:', err);
            setNotification({ show: true, message: 'Failed to export Excel file: ' + err.message, type: 'error' });
        } finally {
            setExporting(false);
        }
    };

    // ============================================================
    // PRINT
    // ============================================================
    const handlePrint = () => {
        if (filteredReports.length === 0) {
            setNotification({ show: true, message: 'No data to print. Please generate a report first.', type: 'warning' });
            return;
        }

        const printWindow = window.open("", "_blank");
        if (!printWindow) {
            setNotification({ show: true, message: 'Popup blocked. Please allow popups for this site.', type: 'error' });
            return;
        }

        const tableContent = viewMode === 'ird' ? generateIrdPrintContent() : generateTablePrintContent();

        printWindow.document.write(`
            <html>
                <head>
                    <title>${viewMode === 'ird' ? 'Purchase VAT Return' : 'Purchase VAT Report'}</title>
                    <meta charset="UTF-8">
                    <style>
                        @page { margin: 5mm; size: A4 landscape; }
                        body {
                            font-family: 'Segoe UI', Arial, sans-serif;
                            font-size: 10px;
                            margin: 0;
                            padding: 5mm;
                            background: #fff;
                            color: #000;
                        }
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            page-break-inside: auto;
                            font-size: 10px;
                        }
                        tr { page-break-inside: avoid; page-break-after: auto; }
                        th, td {
                            border: 1px solid #333;
                            padding: 4px 6px;
                            text-align: left;
                            white-space: nowrap;
                        }
                        th {
                            background-color: #e8e8e8 !important;
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                            font-size: 11px;
                            font-weight: 700;
                            color: #1a1a1a;
                            text-align: center;
                        }
                        td { font-size: 10px; padding: 4px 6px; }
                        .print-header { text-align: center; margin-bottom: 10px; }
                        .text-end { text-align: right; }
                        .text-center { text-align: center; }
                        .nowrap { white-space: nowrap; }
                        .report-title {
                            text-align: center;
                            text-decoration: underline;
                            font-size: 14px;
                            font-weight: 700;
                            margin: 6px 0;
                            color: #1a1a1a;
                            letter-spacing: 0.5px;
                        }
                        .grand-total-row td {
                            font-weight: 700;
                            border-top: 3px double #000;
                            background-color: #f5f5f5 !important;
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                        .company-name {
                            font-size: 18px;
                            font-weight: 700;
                            margin: 0;
                            padding: 0;
                            color: #1a1a1a;
                            letter-spacing: 1px;
                        }
                        .company-details {
                            font-size: 10px;
                            margin: 4px 0;
                            color: #333;
                            line-height: 1.4;
                        }
                        .footer {
                            margin-top: 15px;
                            font-size: 9px;
                            text-align: center;
                            border-top: 1px solid #ccc;
                            padding-top: 8px;
                            color: #666;
                        }
                        .total-label { font-size: 11px; font-weight: 600; }
                        .section-title-row td {
                            background: #dde4ec !important;
                            font-weight: 700;
                            text-align: center;
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                        @media print {
                            body { padding: 10px; }
                            th, td { padding: 3px 5px; }
                        }
                    </style>
                </head>
                <body>
                    ${tableContent}
                    <script>
                        window.onload = function() {
                            setTimeout(function() {
                                window.print();
                                setTimeout(function() {
                                    window.close();
                                }, 500);
                            }, 300);
                        };
                    <\/script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    // -------- Table print (existing) --------
    const generateTablePrintContent = () => {
        let html = `
            <div class="print-header">
                <div class="company-name">${data.currentCompanyName || 'Company Name'}</div>
                <div class="company-details">
                    ${data.company?.address || ''}${data.company?.city ? ', ' + data.company.city : ''}<br>
                    PAN: ${data.company?.pan || ''} | Phone: ${data.company?.phone || ''}
                </div>
                <hr style="margin:6px 0; border: 1px solid #ccc;">
                <div class="report-title">Purchase VAT Report</div>
                <div class="statement-info">
                    <strong>From (BS):</strong> ${dateRange.fromDate} &nbsp;|&nbsp;
                    <strong>To (BS):</strong> ${dateRange.toDate} &nbsp;|&nbsp;
                    <strong>From (AD):</strong> ${dateRange.fromDateAd} &nbsp;|&nbsp;
                    <strong>To (AD):</strong> ${dateRange.toDateAd} &nbsp;|&nbsp;
                    <strong>Total Bills:</strong> ${filteredReports.length}
                </div>
            </div>
            <table cellspacing="0">
                <thead>
                    <tr>
                        <th class="nowrap">Miti</th>
                        <th class="nowrap">Date</th>
                        <th class="nowrap">Vch. No.</th>
                        <th class="nowrap">Invoice No.</th>
                        <th class="nowrap">Supplier's Name</th>
                        <th class="nowrap">Supplier's PAN</th>
                        <th class="nowrap text-end">Total Amount</th>
                        <th class="nowrap text-end">Discount</th>
                        <th class="nowrap text-end">Non-VAT Purchase</th>
                        <th class="nowrap text-end">Taxable Amt.</th>
                        <th class="nowrap text-end">VAT</th>
                    </tr>
                </thead>
                <tbody>
        `;

        let printTotals = {
            totalAmount: 0, discountAmount: 0, nonVatPurchase: 0, taxableAmount: 0, vatAmount: 0
        };

        filteredReports.forEach((report) => {
            html += `
                <tr>
                    <td class="nowrap">${report.nepaliDate || ''}</td>
                    <td class="nowrap">${report.date ? new Date(report.date).toLocaleDateString() : ''}</td>
                    <td class="nowrap">${report.billNumber || ''}</td>
                    <td class="nowrap">${report.partyBillNumber || '-'}</td>
                    <td style="white-space: normal; word-wrap: break-word; max-width: 150px;">${report.accountName || ''}</td>
                    <td class="nowrap">${report.panNumber || ''}</td>
                    <td class="text-end">${formatCurrency(report.totalAmount)}</td>
                    <td class="text-end">${formatCurrency(report.discountAmount)}</td>
                    <td class="text-end">${formatCurrency(report.nonVatPurchase)}</td>
                    <td class="text-end">${formatCurrency(report.taxableAmount)}</td>
                    <td class="text-end">${formatCurrency(report.vatAmount)}</td>
                </tr>
            `;
            printTotals.totalAmount += parseFloat(report.totalAmount || 0);
            printTotals.discountAmount += parseFloat(report.discountAmount || 0);
            printTotals.nonVatPurchase += parseFloat(report.nonVatPurchase || 0);
            printTotals.taxableAmount += parseFloat(report.taxableAmount || 0);
            printTotals.vatAmount += parseFloat(report.vatAmount || 0);
        });

        html += `
                <tr class="grand-total-row">
                    <td colspan="6" class="text-end total-label">GRAND TOTALS</td>
                    <td class="text-end total-label">${formatCurrency(printTotals.totalAmount)}</td>
                    <td class="text-end total-label">${formatCurrency(printTotals.discountAmount)}</td>
                    <td class="text-end total-label">${formatCurrency(printTotals.nonVatPurchase)}</td>
                    <td class="text-end total-label">${formatCurrency(printTotals.taxableAmount)}</td>
                    <td class="text-end total-label">${formatCurrency(printTotals.vatAmount)}</td>
                </tr>
                </tbody>
            </table>
        `;

        return html;
    };

    // -------- IRD print (खरिद खाता) --------
    const generateIrdPrintContent = () => {
        const t = irdTotals;

        let html = `
            <div class="print-header" style="text-align:center;">
                <div style="font-size:16px;font-weight:700;">खरिद खाता</div>
                <div style="font-size:10px;margin-top:2px;">(नियम २३ को उपनियम (१) को खण्ड (छ) संग सम्बन्धित)</div>
                <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:10px;">
                    <div><strong>करदाता दर्ता नं:</strong> ${data.company?.pan || ''}</div>
                    <div><strong>करदाताको नाम:</strong> ${data.currentCompanyName || ''}</div>
                    <div><strong>कर अवधि:</strong> ${dateRange.fromDate} देखि ${dateRange.toDate} सम्म</div>
                </div>
                <hr style="margin:6px 0; border: 1px solid #ccc;">
            </div>
            <table cellspacing="0" style="font-size:9px;">
                <thead>
                    <tr>
                        <th rowspan="2" class="nowrap">मिति</th>
                        <th rowspan="2" class="nowrap">बीजक नं.</th>
                        <th rowspan="2" class="nowrap">प्रज्ञापनपत्र नं.</th>
                        <th rowspan="2" class="nowrap">आपूर्तिकर्ताको नाम</th>
                        <th rowspan="2" class="nowrap text-end">जम्मा खरिद मूल्य (रु)</th>
                        <th rowspan="2" class="nowrap text-end">कर छूट हुने वस्तु वा सेवाको खरिद / पैठारी मूल्य (रु)</th>
                        <th colspan="2" class="nowrap text-center">करयोग्य खरिद (पूंजीगत बाहेक)</th>
                        <th colspan="2" class="nowrap text-center">करयोग्य पैठारी (पूंजीगत बाहेक)</th>
                        <th colspan="2" class="nowrap text-center">पूंजीगत करयोग्य खरिद / पैठारी</th>
                    </tr>
                    <tr>
                        <th class="nowrap text-end">मूल्य (रु)</th>
                        <th class="nowrap text-end">कर (रु)</th>
                        <th class="nowrap text-end">मूल्य (रु)</th>
                        <th class="nowrap text-end">कर (रु)</th>
                        <th class="nowrap text-end">मूल्य (रु)</th>
                        <th class="nowrap text-end">कर (रु)</th>
                    </tr>
                </thead>
                <tbody>
        `;

        irdRows.forEach((r) => {
            html += `
                <tr>
                    <td class="nowrap">${r.date}</td>
                    <td class="nowrap">${r.invoiceNo}</td>
                    <td class="nowrap">${r.parjapatraNo}</td>
                    <td style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px;" title="${r.supplierName}">${r.supplierName}</td>
                    <td class="text-end">${formatCurrency(r.totalPurchase)}</td>
                    <td class="text-end">${formatCurrency(r.taxExemptPurchase)}</td>
                    <td class="text-end">${formatCurrency(r.taxablePurchaseValue)}</td>
                    <td class="text-end">${formatCurrency(r.taxablePurchaseVat)}</td>
                    <td class="text-end">${formatCurrency(r.taxableImportValue)}</td>
                    <td class="text-end">${formatCurrency(r.taxableImportVat)}</td>
                    <td class="text-end">${formatCurrency(r.capitalTaxableValue)}</td>
                    <td class="text-end">${formatCurrency(r.capitalTaxableVat)}</td>
                </tr>
            `;
        });

        html += `
                <tr class="grand-total-row">
                    <td colspan="4" class="text-end total-label">Total Bill: ${irdRows.length} &nbsp; Total</td>
                    <td class="text-end total-label">${formatCurrency(t.totalPurchase)}</td>
                    <td class="text-end total-label">${formatCurrency(t.taxExemptPurchase)}</td>
                    <td class="text-end total-label">${formatCurrency(t.taxablePurchaseValue)}</td>
                    <td class="text-end total-label">${formatCurrency(t.taxablePurchaseVat)}</td>
                    <td class="text-end total-label">${formatCurrency(t.taxableImportValue)}</td>
                    <td class="text-end total-label">${formatCurrency(t.taxableImportVat)}</td>
                    <td class="text-end total-label">${formatCurrency(t.capitalTaxableValue)}</td>
                    <td class="text-end total-label">${formatCurrency(t.capitalTaxableVat)}</td>
                </tr>
                </tbody>
            </table>
        `;

        // Debit Note section
        if (debitNoteIrdRows.length > 0) {
            html += `
                <table cellspacing="0" style="font-size:9px; margin-top:10px;">
                    <tbody>
                        <tr class="section-title-row">
                            <td colspan="12">Purchase Return / Debit Note</td>
                        </tr>
                        ${debitNoteIrdRows.map(r => `
                            <tr>
                                <td class="nowrap">${r.date}</td>
                                <td class="nowrap">${r.invoiceNo}</td>
                                <td class="nowrap">${r.parjapatraNo}</td>
                                <td style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px;" title="${r.supplierName}">${r.supplierName}</td>
                                <td class="text-end">${formatCurrency(r.totalPurchase)}</td>
                                <td class="text-end">${formatCurrency(r.taxExemptPurchase)}</td>
                                <td class="text-end">${formatCurrency(r.taxablePurchaseValue)}</td>
                                <td class="text-end">${formatCurrency(r.taxablePurchaseVat)}</td>
                                <td></td><td></td><td></td><td></td>
                            </tr>
                        `).join('')}
                        <tr class="grand-total-row">
                            <td colspan="4" class="text-end total-label">Total Bill: ${debitNoteIrdRows.length} &nbsp; Dr. Note Total</td>
                            <td class="text-end total-label">${formatCurrency(debitNoteTotals.totalPurchase)}</td>
                            <td class="text-end total-label">${formatCurrency(debitNoteTotals.taxExemptPurchase)}</td>
                            <td class="text-end total-label">${formatCurrency(debitNoteTotals.taxablePurchaseValue)}</td>
                            <td class="text-end total-label">${formatCurrency(debitNoteTotals.taxablePurchaseVat)}</td>
                            <td></td><td></td><td></td><td></td>
                        </tr>
                    </tbody>
                </table>
            `;
        }

        html += `
            <div class="footer">
                Generated on ${new Date().toLocaleString()}
            </div>
        `;

        return html;
    };

    const resetColumnWidths = () => {
        setColumnWidths({
            bsDate: 80, adDate: 80, voucherNo: 100, supplierBillNo: 100,
            supplierName: 200, panNumber: 100, totalAmount: 100, discount: 80,
            nonVatPurchase: 120, taxableAmount: 100, vatAmount: 80
        });
        setNotification({ show: true, message: 'Column widths reset', type: 'success', duration: 2000 });
    };

    // ============================================================
    // Small components for table view
    // ============================================================
    const ResizeHandle = React.memo(({ onResizeStart, left, columnName }) => {
        return (
            <div
                className="pv-resize-handle"
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
                onMouseDown={(e) => { e.preventDefault(); onResizeStart(e, columnName); }}
            />
        );
    });

    const TableHeader = React.memo(() => {
        const totalWidth = columnWidths.bsDate + columnWidths.adDate + columnWidths.voucherNo +
            columnWidths.supplierBillNo + columnWidths.supplierName + columnWidths.panNumber +
            columnWidths.totalAmount + columnWidths.discount + columnWidths.nonVatPurchase +
            columnWidths.taxableAmount + columnWidths.vatAmount;

        const handleResizeStart = (e, columnName) => {
            setIsResizing(true);
            setResizingColumn(columnName);
            setStartX(e.clientX);
            setStartWidth(columnWidths[columnName]);
            e.preventDefault();
        };

        return (
            <div
                className="pv-header"
                style={{ minWidth: `${totalWidth}px`, zIndex: 2, height: '28px' }}
                onMouseMove={(e) => {
                    if (isResizing && resizingColumn) {
                        const diff = e.clientX - startX;
                        const newWidth = Math.max(60, startWidth + diff);
                        setColumnWidths(prev => ({ ...prev, [resizingColumn]: newWidth }));
                    }
                }}
                onMouseUp={() => { if (isResizing) { setIsResizing(false); setResizingColumn(null); } }}
                onMouseLeave={() => { if (isResizing) { setIsResizing(false); setResizingColumn(null); } }}
            >
                <div className="pv-header-cell pv-header-cell--center" style={{ width: `${columnWidths.bsDate}px`, flexShrink: 0, minWidth: '80px' }}>
                    <strong>Miti</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.bsDate - 2} columnName="bsDate" />
                </div>
                <div className="pv-header-cell pv-header-cell--center" style={{ width: `${columnWidths.adDate}px`, flexShrink: 0, minWidth: '80px' }}>
                    <strong>Date</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.adDate - 2} columnName="adDate" />
                </div>
                <div className="pv-header-cell" style={{ width: `${columnWidths.voucherNo}px`, flexShrink: 0, minWidth: '60px' }}>
                    <strong>Vch. No.</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.voucherNo - 3} columnName="voucherNo" />
                </div>
                <div className="pv-header-cell" style={{ width: `${columnWidths.supplierBillNo}px`, flexShrink: 0, minWidth: '60px' }}>
                    <strong>Invoice No.</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.supplierBillNo - 3} columnName="supplierBillNo" />
                </div>
                <div className="pv-header-cell" style={{ width: `${columnWidths.supplierName}px`, flexShrink: 0, minWidth: '100px' }}>
                    <strong>Supplier's Name</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.supplierName - 3} columnName="supplierName" />
                </div>
                <div className="pv-header-cell" style={{ width: `${columnWidths.panNumber}px`, flexShrink: 0, minWidth: '80px' }}>
                    <strong>Supplier's PAN</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.panNumber - 3} columnName="panNumber" />
                </div>
                <div className="pv-header-cell pv-header-cell--end" style={{ width: `${columnWidths.totalAmount}px`, flexShrink: 0, minWidth: '80px' }}>
                    <strong>Total Amount</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.totalAmount - 2} columnName="totalAmount" />
                </div>
                <div className="pv-header-cell pv-header-cell--end" style={{ width: `${columnWidths.discount}px`, flexShrink: 0, minWidth: '80px' }}>
                    <strong>Discount</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.discount - 2} columnName="discount" />
                </div>
                <div className="pv-header-cell pv-header-cell--end" style={{ width: `${columnWidths.nonVatPurchase}px`, flexShrink: 0, minWidth: '80px' }}>
                    <strong>Non-VAT Purchase</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.nonVatPurchase - 2} columnName="nonVatPurchase" />
                </div>
                <div className="pv-header-cell pv-header-cell--end" style={{ width: `${columnWidths.taxableAmount}px`, flexShrink: 0, minWidth: '80px' }}>
                    <strong>Taxable Amt.</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.taxableAmount - 2} columnName="taxableAmount" />
                </div>
                <div className="pv-header-cell pv-header-cell--end" style={{ width: `${columnWidths.vatAmount}px`, flexShrink: 0, minWidth: '80px' }}>
                    <strong>VAT</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.vatAmount - 2} columnName="vatAmount" />
                </div>
                {isResizing && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, cursor: 'col-resize' }} />
                )}
            </div>
        );
    });

    const TableRow = React.memo(({ index, style, data: rowData }) => {
        const { reports, selectedRowIndex, formatCurrency, handleRowClick } = rowData;
        const report = reports[index];
        if (!report) return null;
        const isSelected = selectedRowIndex === index;

        return (
            <div
                style={{
                    ...style,
                    display: 'flex',
                    alignItems: 'center',
                    height: '28px',
                    minHeight: '28px',
                    padding: '0',
                    borderBottom: '1px solid #e2e8f0',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? '#eff6ff' : (index % 2 === 0 ? '#f8fafc' : 'white')
                }}
                className="pv-row"
                onClick={() => handleRowClick(index)}
            >
                <div className="pv-cell pv-cell--center" style={{ width: `${columnWidths.bsDate}px`, flexShrink: 0, height: '100%' }}>
                    <span>{report.nepaliDate || ''}</span>
                </div>
                <div className="pv-cell pv-cell--center" style={{ width: `${columnWidths.adDate}px`, flexShrink: 0, height: '100%' }}>
                    <span>{report.date ? new Date(report.date).toLocaleDateString() : ''}</span>
                </div>
                <div className="pv-cell" style={{ width: `${columnWidths.voucherNo}px`, flexShrink: 0, height: '100%', overflow: 'hidden' }}>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{report.billNumber || ''}</span>
                </div>
                <div className="pv-cell" style={{ width: `${columnWidths.supplierBillNo}px`, flexShrink: 0, height: '100%', overflow: 'hidden' }}>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{report.partyBillNumber || '-'}</span>
                </div>
                <div className="pv-cell" style={{ width: `${columnWidths.supplierName}px`, flexShrink: 0, height: '100%', overflow: 'hidden' }} title={report.accountName || ''}>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{report.accountName || ''}</span>
                </div>
                <div className="pv-cell" style={{ width: `${columnWidths.panNumber}px`, flexShrink: 0, height: '100%', overflow: 'hidden' }}>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{report.panNumber || ''}</span>
                </div>
                <div className="pv-cell pv-cell--end" style={{ width: `${columnWidths.totalAmount}px`, flexShrink: 0, height: '100%' }}>
                    <span>{formatCurrency(report.totalAmount)}</span>
                </div>
                <div className="pv-cell pv-cell--end" style={{ width: `${columnWidths.discount}px`, flexShrink: 0, height: '100%' }}>
                    <span>{formatCurrency(report.discountAmount)}</span>
                </div>
                <div className="pv-cell pv-cell--end" style={{ width: `${columnWidths.nonVatPurchase}px`, flexShrink: 0, height: '100%' }}>
                    <span>{formatCurrency(report.nonVatPurchase)}</span>
                </div>
                <div className="pv-cell pv-cell--end" style={{ width: `${columnWidths.taxableAmount}px`, flexShrink: 0, height: '100%' }}>
                    <span>{formatCurrency(report.taxableAmount)}</span>
                </div>
                <div className="pv-cell pv-cell--end" style={{ width: `${columnWidths.vatAmount}px`, flexShrink: 0, height: '100%' }}>
                    <span>{formatCurrency(report.vatAmount)}</span>
                </div>
            </div>
        );
    }, (prevProps, nextProps) => {
        if (prevProps.index !== nextProps.index) return false;
        if (prevProps.style !== nextProps.style) return false;
        const prevReport = prevProps.data.reports[prevProps.index];
        const nextReport = nextProps.data.reports[nextProps.index];
        return prevReport === nextReport && prevProps.data.selectedRowIndex === nextProps.data.selectedRowIndex;
    });

    // ============================================================
    // IRD view (in-app)
    // ============================================================
    const IrdReturnView = () => {
        return (
            <div className="pv-ird-wrap">
                <div className="pv-ird-header">
                    <div className="pv-ird-title">खरिद खाता</div>
                    <div className="pv-ird-subtitle">(नियम २३ को उपनियम (१) को खण्ड (छ) संग सम्बन्धित)</div>
                    <div className="pv-ird-meta">
                        <div><strong>करदाता दर्ता नं:</strong> {data.company?.pan || '-'}</div>
                        <div><strong>करदाताको नाम:</strong> {data.currentCompanyName || '-'}</div>
                        <div><strong>कर अवधि:</strong> {dateRange.fromDate} देखि {dateRange.toDate} सम्म</div>
                    </div>
                </div>

                <div className="pv-ird-table-scroll">
                    <table className="pv-ird-table">
                        <thead>
                            <tr>
                                <th rowSpan="2">मिति</th>
                                <th rowSpan="2">बीजक नं.</th>
                                <th rowSpan="2">प्रज्ञापनपत्र नं.</th>
                                <th rowSpan="2">आपूर्तिकर्ताको नाम</th>
                                <th rowSpan="2" className="text-end">जम्मा खरिद मूल्य (रु)</th>
                                <th rowSpan="2" className="text-end">कर छूट हुने वस्तु वा सेवाको खरिद / पैठारी मूल्य (रु)</th>
                                <th colSpan="2" className="text-center">करयोग्य खरिद (पूंजीगत बाहेक)</th>
                                <th colSpan="2" className="text-center">करयोग्य पैठारी (पूंजीगत बाहेक)</th>
                                <th colSpan="2" className="text-center">पूंजीगत करयोग्य खरिद / पैठारी</th>
                            </tr>
                            <tr>
                                <th className="text-end">मूल्य (रु)</th>
                                <th className="text-end">कर (रु)</th>
                                <th className="text-end">मूल्य (रु)</th>
                                <th className="text-end">कर (रु)</th>
                                <th className="text-end">मूल्य (रु)</th>
                                <th className="text-end">कर (रु)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {irdRows.length === 0 ? (
                                <tr>
                                    <td colSpan="12" className="text-center" style={{ padding: '20px', color: '#888' }}>
                                        No data
                                    </td>
                                </tr>
                            ) : (
                                irdRows.map((r, idx) => (
                                    <tr key={idx} className={idx % 2 === 0 ? 'odd' : ''}>
                                        <td>{r.date}</td>
                                        <td>{r.invoiceNo}</td>
                                        <td>{r.parjapatraNo}</td>
                                        <td className="pv-ird-name" title={r.supplierName}>
                                            {r.supplierName}
                                        </td>
                                        <td className="text-end">{formatCurrency(r.totalPurchase)}</td>
                                        <td className="text-end">{formatCurrency(r.taxExemptPurchase)}</td>
                                        <td className="text-end">{formatCurrency(r.taxablePurchaseValue)}</td>
                                        <td className="text-end">{formatCurrency(r.taxablePurchaseVat)}</td>
                                        <td className="text-end">{formatCurrency(r.taxableImportValue)}</td>
                                        <td className="text-end">{formatCurrency(r.taxableImportVat)}</td>
                                        <td className="text-end">{formatCurrency(r.capitalTaxableValue)}</td>
                                        <td className="text-end">{formatCurrency(r.capitalTaxableVat)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        {irdRows.length > 0 && (
                            <tfoot>
                                <tr className="pv-ird-total-row">
                                    <td colSpan="4" className="text-end">
                                        <strong>Total Bill: {irdRows.length} &nbsp; Total</strong>
                                    </td>
                                    <td className="text-end"><strong>{formatCurrency(irdTotals.totalPurchase)}</strong></td>
                                    <td className="text-end"><strong>{formatCurrency(irdTotals.taxExemptPurchase)}</strong></td>
                                    <td className="text-end"><strong>{formatCurrency(irdTotals.taxablePurchaseValue)}</strong></td>
                                    <td className="text-end"><strong>{formatCurrency(irdTotals.taxablePurchaseVat)}</strong></td>
                                    <td className="text-end"><strong>{formatCurrency(irdTotals.taxableImportValue)}</strong></td>
                                    <td className="text-end"><strong>{formatCurrency(irdTotals.taxableImportVat)}</strong></td>
                                    <td className="text-end"><strong>{formatCurrency(irdTotals.capitalTaxableValue)}</strong></td>
                                    <td className="text-end"><strong>{formatCurrency(irdTotals.capitalTaxableVat)}</strong></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>

                    {/* Debit Note sub-section */}
                    {debitNoteIrdRows.length > 0 && (
                        <div className="pv-ird-dn-section">
                            <div className="pv-ird-dn-title">Purchase Return / Debit Note</div>
                            <table className="pv-ird-table pv-ird-table--dn">
                                <tbody>
                                    {debitNoteIrdRows.map((r, idx) => (
                                        <tr key={idx} className={idx % 2 === 0 ? 'odd' : ''}>
                                            <td>{r.date}</td>
                                            <td>{r.invoiceNo}</td>
                                            <td>{r.parjapatraNo}</td>
                                            <td className="pv-ird-name" title={r.supplierName}>{r.supplierName}</td>
                                            <td className="text-end">{formatCurrency(r.totalPurchase)}</td>
                                            <td className="text-end">{formatCurrency(r.taxExemptPurchase)}</td>
                                            <td className="text-end">{formatCurrency(r.taxablePurchaseValue)}</td>
                                            <td className="text-end">{formatCurrency(r.taxablePurchaseVat)}</td>
                                        </tr>
                                    ))}
                                    <tr className="pv-ird-total-row">
                                        <td colSpan="4" className="text-end">
                                            <strong>Total Bill: {debitNoteIrdRows.length} &nbsp; Dr. Note Total</strong>
                                        </td>
                                        <td className="text-end"><strong>{formatCurrency(debitNoteTotals.totalPurchase)}</strong></td>
                                        <td className="text-end"><strong>{formatCurrency(debitNoteTotals.taxExemptPurchase)}</strong></td>
                                        <td className="text-end"><strong>{formatCurrency(debitNoteTotals.taxablePurchaseValue)}</strong></td>
                                        <td className="text-end"><strong>{formatCurrency(debitNoteTotals.taxablePurchaseVat)}</strong></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    if (loading && data.purchaseVatReport.length === 0) return <Loader />;

    if (error && data.purchaseVatReport.length === 0) {
        return (
            <div className="pv-page">
                <Header />
                <div className="pv-shell">
                    <div className="pv-state">
                        <h3>Error</h3>
                        <p>{error}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="pv-page">
            <Header />

            <div className="pv-shell">
                {/* Top Bar */}
                <div className="pv-topbar">
                    <div className="pv-topbar__left">
                        <div className="pv-topbar__icon"><FiFileText /></div>
                        <div><h1>Purchase VAT Report</h1></div>
                    </div>
                    <div className="pv-topbar__actions">
                        {/* View toggle */}
                        <div className="pv-view-toggle" role="group" aria-label="View mode">
                            <button
                                type="button"
                                className={`pv-view-btn ${viewMode === 'table' ? 'active' : ''}`}
                                onClick={() => setViewMode('table')}
                                title="Table view"
                            >
                                <FiGrid /> Table
                            </button>
                            <button
                                type="button"
                                className={`pv-view-btn ${viewMode === 'ird' ? 'active' : ''}`}
                                onClick={() => setViewMode('ird')}
                                title="IRD VAT Return format"
                            >
                                <FiList /> IRD
                            </button>
                        </div>
                        <button className="pv-btn-icon" onClick={handleExportExcel} disabled={data.purchaseVatReport.length === 0 || exporting}>
                            <FiDownload /> {exporting ? '…' : 'Excel'}
                        </button>
                        <button className="pv-btn-icon" onClick={handlePrint} disabled={filteredReports.length === 0}>
                            <FiPrinter /> Print
                        </button>
                        {viewMode === 'table' && (
                            <button className="pv-btn-icon" onClick={resetColumnWidths} title="Reset columns">
                                <FiRefreshCw /> Reset
                            </button>
                        )}
                    </div>
                </div>

                {/* Toolbar */}
                <div className="pv-toolbar">
                    <div className="pv-field pv-field--date">
                        <label>From (BS) <span className="req">*</span></label>
                        <input
                            type="text"
                            id="fromDate"
                            ref={fromDateRef}
                            className={dateErrors.fromDate ? 'is-invalid' : ''}
                            value={dateRange.fromDate || ''}
                            onChange={(e) => {
                                const value = e.target.value.replace(/[^0-9/-]/g, '').slice(0, 10);
                                const adDate = convertBsToAd(value);
                                setDateRange(prev => ({
                                    ...prev,
                                    fromDate: value,
                                    fromDateAd: adDate || prev.fromDateAd
                                }));
                                setDateErrors(prev => ({ ...prev, fromDate: '' }));
                            }}
                            onKeyDown={(e) => handleKeyDown(e, 'fromDateAd')}
                            onBlur={(e) => {
                                const dateStr = e.target.value.trim();
                                if (!dateStr) return;
                                const correctedDate = validateAndCorrectNepaliDate(dateStr);
                                if (!correctedDate) {
                                    const fallbackDate = currentNepaliDate;
                                    const adDate = convertBsToAd(fallbackDate);
                                    setDateRange(prev => ({ ...prev, fromDate: fallbackDate, fromDateAd: adDate }));
                                    setNotification({ show: true, message: 'Invalid Nepali date. Auto-corrected.', type: 'warning' });
                                }
                            }}
                            placeholder="YYYY-MM-DD"
                            autoFocus
                            autoComplete="off"
                        />
                        {dateErrors.fromDate && <div className="pv-field-error">{dateErrors.fromDate}</div>}
                    </div>

                    <div className="pv-field pv-field--date">
                        <label>From (AD)</label>
                        <input
                            type="date"
                            id="fromDateAd"
                            value={dateRange.fromDateAd || ''}
                            onChange={(e) => {
                                const value = e.target.value;
                                const bsDate = convertAdToBs(value);
                                setDateRange(prev => ({
                                    ...prev,
                                    fromDateAd: value,
                                    fromDate: bsDate || prev.fromDate
                                }));
                            }}
                            onKeyDown={(e) => handleKeyDown(e, 'toDate')}
                        />
                    </div>

                    <div className="pv-field pv-field--date">
                        <label>To (BS) <span className="req">*</span></label>
                        <input
                            type="text"
                            id="toDate"
                            ref={toDateRef}
                            className={dateErrors.toDate ? 'is-invalid' : ''}
                            value={dateRange.toDate || ''}
                            onChange={(e) => {
                                const value = e.target.value.replace(/[^0-9/-]/g, '').slice(0, 10);
                                const adDate = convertBsToAd(value);
                                setDateRange(prev => ({
                                    ...prev,
                                    toDate: value,
                                    toDateAd: adDate || prev.toDateAd
                                }));
                                setDateErrors(prev => ({ ...prev, toDate: '' }));
                            }}
                            onKeyDown={(e) => handleKeyDown(e, 'toDateAd')}
                            onBlur={(e) => {
                                const dateStr = e.target.value.trim();
                                if (!dateStr) return;
                                const correctedDate = validateAndCorrectNepaliDate(dateStr);
                                if (!correctedDate) {
                                    const fallbackDate = currentNepaliDate;
                                    const adDate = convertBsToAd(fallbackDate);
                                    setDateRange(prev => ({ ...prev, toDate: fallbackDate, toDateAd: adDate }));
                                    setNotification({ show: true, message: 'Invalid Nepali date. Auto-corrected.', type: 'warning' });
                                }
                            }}
                            placeholder="YYYY-MM-DD"
                            autoComplete="off"
                        />
                        {dateErrors.toDate && <div className="pv-field-error">{dateErrors.toDate}</div>}
                    </div>

                    <div className="pv-field pv-field--date">
                        <label>To (AD)</label>
                        <input
                            type="date"
                            id="toDateAd"
                            value={dateRange.toDateAd || ''}
                            onChange={(e) => {
                                const value = e.target.value;
                                const bsDate = convertAdToBs(value);
                                setDateRange(prev => ({
                                    ...prev,
                                    toDateAd: value,
                                    toDate: bsDate || prev.toDate
                                }));
                            }}
                            onKeyDown={(e) => handleKeyDown(e, 'generateReport')}
                        />
                    </div>

                    <button type="button" id="generateReport" ref={generateReportRef} className="pv-btn-gen" onClick={handleGenerateReport} disabled={loading}>
                        {loading ? <span className="spinner-border spinner-border-sm" style={{ width: 12, height: 12 }} /> : <><FiSearch className="me-1" /> Generate</>}
                    </button>

                    <div className="pv-toolbar-divider" />

                    <div className="pv-field pv-field--search">
                        <label>Search</label>
                        <div className="pv-search-wrap">
                            <FiSearch className="pv-search-icon" />
                            <input
                                type="text"
                                id="searchInput"
                                ref={searchInputRef}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                disabled={data.purchaseVatReport.length === 0}
                                autoComplete="off"
                            />
                            {searchQuery && <button className="pv-search-clear" onClick={() => setSearchQuery('')}>×</button>}
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="pv-alert">
                        <FiX /> {error}
                        <button type="button" className="btn-close btn-sm ms-auto" onClick={() => setError(null)} />
                    </div>
                )}

                {/* Main content */}
                <div className="pv-main">
                    {data.purchaseVatReport.length === 0 && !loading ? (
                        <div className="pv-state">
                            <FiCalendar size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                            <h3>Select date range & generate</h3>
                            <p>Choose a date range, then click Generate.</p>
                        </div>
                    ) : loading ? (
                        <div className="pv-state">
                            <div className="spinner-border text-primary" />
                            <p>Loading data...</p>
                        </div>
                    ) : filteredReports.length === 0 ? (
                        <div className="pv-state">
                            <FiSearch size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                            <h3>No records found</h3>
                            <p>{searchQuery ? 'Try a different search term' : 'No data for the selected date range'}</p>
                        </div>
                    ) : viewMode === 'ird' ? (
                        <>
                            <div className="pv-main__bar">
                                <span><strong>{filteredReports.length}</strong> bills</span>
                                <span>{dateRange.fromDate} — {dateRange.toDate}</span>
                            </div>
                            <IrdReturnView />
                        </>
                    ) : (
                        <>
                            <div className="pv-main__bar">
                                <span><strong>{filteredReports.length}</strong> bills</span>
                                <span>{dateRange.fromDate} — {dateRange.toDate}</span>
                            </div>
                            <div className="pv-table-wrap" ref={tableBodyRef}>
                                <AutoSizer>
                                    {({ height, width }) => {
                                        const totalWidth = columnWidths.bsDate + columnWidths.adDate +
                                            columnWidths.voucherNo + columnWidths.supplierBillNo +
                                            columnWidths.supplierName + columnWidths.panNumber +
                                            columnWidths.totalAmount + columnWidths.discount +
                                            columnWidths.nonVatPurchase + columnWidths.taxableAmount +
                                            columnWidths.vatAmount;

                                        return (
                                            <div style={{ position: 'relative', height: height, width: Math.max(width, totalWidth) }}>
                                                <TableHeader />
                                                <List
                                                    height={height - 28}
                                                    itemCount={filteredReports.length}
                                                    itemSize={28}
                                                    width={Math.max(width, totalWidth)}
                                                    itemData={{
                                                        reports: filteredReports,
                                                        selectedRowIndex,
                                                        formatCurrency,
                                                        handleRowClick: (index) => setSelectedRowIndex(index)
                                                    }}
                                                >
                                                    {TableRow}
                                                </List>
                                            </div>
                                        );
                                    }}
                                </AutoSizer>
                            </div>
                            <div className="pv-footer">
                                <div className="pv-footer-cell" style={{ width: `${columnWidths.bsDate + columnWidths.adDate + columnWidths.voucherNo + columnWidths.supplierBillNo + columnWidths.supplierName + columnWidths.panNumber}px`, flexShrink: 0 }}>
                                    <strong>Grand Totals:</strong>
                                </div>
                                <div className="pv-footer-cell pv-footer-cell--end" style={{ width: `${columnWidths.totalAmount}px`, flexShrink: 0 }}>
                                    <strong>{formatCurrency(totals.totalAmount)}</strong>
                                </div>
                                <div className="pv-footer-cell pv-footer-cell--end" style={{ width: `${columnWidths.discount}px`, flexShrink: 0 }}>
                                    <strong>{formatCurrency(totals.discountAmount)}</strong>
                                </div>
                                <div className="pv-footer-cell pv-footer-cell--end" style={{ width: `${columnWidths.nonVatPurchase}px`, flexShrink: 0 }}>
                                    <strong>{formatCurrency(totals.nonVatPurchase)}</strong>
                                </div>
                                <div className="pv-footer-cell pv-footer-cell--end" style={{ width: `${columnWidths.taxableAmount}px`, flexShrink: 0 }}>
                                    <strong>{formatCurrency(totals.taxableAmount)}</strong>
                                </div>
                                <div className="pv-footer-cell pv-footer-cell--end" style={{ width: `${columnWidths.vatAmount}px`, flexShrink: 0 }}>
                                    <strong>{formatCurrency(totals.vatAmount)}</strong>
                                </div>
                            </div>
                        </>
                    )}
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

export default PurchaseVatReport;