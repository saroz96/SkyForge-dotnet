// // components/AuditReport/AuditReport.jsx
// import React, { useState, useEffect, useRef } from 'react';
// import { useNavigate } from 'react-router-dom';
// import NepaliDate from 'nepali-datetime';
// import api from '../../components/services/api';
// import Header from '../retailer/Header';
// import NotificationToast from '../NotificationToast';
// import { FixedSizeList as List } from 'react-window';
// import AutoSizer from 'react-virtualized-auto-sizer';
// import { FiFileText, FiPrinter, FiSearch, FiRefreshCw, FiCalendar } from 'react-icons/fi';
// import './AuditReport.css';
// import ProductModal from '../retailer/dashboard/modals/ProductModal';

// // ---------- Helpers ----------
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
//     } catch { return null; }
// };

// const convertAdToBs = (adDate) => {
//     if (!adDate) return null;
//     try {
//         let date;
//         if (typeof adDate === 'string') {
//             date = /^\d{4}-\d{2}-\d{2}$/.test(adDate)
//                 ? new Date(adDate + 'T00:00:00')
//                 : new Date(adDate);
//         } else if (adDate instanceof Date) {
//             date = adDate;
//         } else return null;
//         if (isNaN(date.getTime())) return null;
//         const nepaliDate = new NepaliDate(date);
//         return `${nepaliDate.getYear()}-${String(nepaliDate.getMonth() + 1).padStart(2, '0')}-${String(nepaliDate.getDate()).padStart(2, '0')}`;
//     } catch { return null; }
// };

// const formatCurrency = (num) => {
//     const number = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num) || 0;
//     return number.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// };

// const formatDateDisplay = (date, format) => {
//     if (!date) return '';
//     if (format === 'nepali') return date;
//     try {
//         return new Date(date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: '2-digit' });
//     } catch { return date; }
// };

// const isValidNepaliDate = (dateStr) => {
//     if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
//     try {
//         const [year, month, day] = dateStr.split('-').map(Number);
//         if (month < 1 || month > 12) return false;
//         if (day < 1 || day > 32) return false;
//         const nepaliDate = new NepaliDate(dateStr);
//         return nepaliDate.getYear() === year && nepaliDate.getMonth() + 1 === month && nepaliDate.getDate() === day;
//     } catch { return false; }
// };

// const validateAndCorrectNepaliDate = (dateStr) => {
//     if (!dateStr) return null;
//     if (isValidNepaliDate(dateStr)) return dateStr;
//     const match = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
//     if (match) {
//         let [_, year, month, day] = match;
//         month = Math.min(12, Math.max(1, parseInt(month, 10)));
//         day = Math.min(32, Math.max(1, parseInt(day, 10)));
//         const corrected = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
//         return isValidNepaliDate(corrected) ? corrected : null;
//     }
//     return null;
// };

// const getReportDisplayName = (tabId) => {
//     const map = {
//         openingTrialBalance: 'Opening Trial Balance',
//         closingTrialBalance: 'Pre-Closing Trial Balance',
//         profitAndLoss: 'Profit & Loss Account',
//         balanceSheet: 'Balance Sheet',
//         cogs: 'Cost of Goods Sold',
//         comprehensive: 'Comprehensive Report'
//     };
//     return map[tabId] || tabId;
// };

// const AuditReport = () => {
//     const navigate = useNavigate();
//     const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
//     const currentEnglishDate = new Date().toISOString().split('T')[0];

//     const [loading, setLoading] = useState(false);
//     const [reportData, setReportData] = useState(null);
//     const [activeTab, setActiveTab] = useState('openingTrialBalance');
//     const [closingTbView, setClosingTbView] = useState('summary'); // ✅ 'summary' | 'detailed'
//     const [error, setError] = useState(null);
//     const [companyDateFormat, setCompanyDateFormat] = useState('english');
//     const [asOnDate, setAsOnDate] = useState(currentNepaliDate);
//     const [asOnDateAd, setAsOnDateAd] = useState(currentEnglishDate);
//     const [dateErrors, setDateErrors] = useState({ asOnDate: '' });
//     const [notification, setNotification] = useState({
//         show: false, message: '', type: 'success', duration: 3000
//     });
//     const [isPrinting, setIsPrinting] = useState(false);
//     const [showProductModal, setShowProductModal] = useState(false);
//     const [columnWidths, setColumnWidths] = useState({
//         accountName: 200, accountGroup: 150, debit: 100, credit: 100, balance: 100, type: 60
//     });

//     const [isResizing, setIsResizing] = useState(false);
//     const [resizingColumn, setResizingColumn] = useState(null);
//     const [startX, setStartX] = useState(0);
//     const [startWidth, setStartWidth] = useState(0);

//     const asOnDateRef = useRef(null);
//     const generateReportRef = useRef(null);
//     const tableBodyRef = useRef(null);

//     const reportTabs = [
//         { id: 'openingTrialBalance', label: 'Opening TB', icon: 'bi-journal-text' },
//         { id: 'closingTrialBalance', label: 'Pre-Closing TB', icon: 'bi-journal-check' },
//         { id: 'profitAndLoss', label: 'P&L', icon: 'bi-graph-up' },
//         { id: 'balanceSheet', label: 'Balance Sheet', icon: 'bi-building' },
//         { id: 'cogs', label: 'COGS', icon: 'bi-calculator' },
//         { id: 'comprehensive', label: 'Comprehensive', icon: 'bi-file-earmark-text' }
//     ];

//     useEffect(() => {
//         const fetchInitialData = async () => {
//             try {
//                 const response = await api.get('/api/audit/date-format');
//                 if (response.data.success) {
//                     setCompanyDateFormat(response.data.data.dateFormat || 'english');
//                 }
//             } catch (err) {
//                 console.error('Error fetching date format:', err);
//             }
//         };
//         fetchInitialData();
//     }, []);

//     useEffect(() => {
//         if (asOnDate) {
//             const timer = setTimeout(() => { generateReport(); }, 300);
//             return () => clearTimeout(timer);
//         }
//     }, [activeTab, asOnDate]);

//     useEffect(() => {
//         const savedWidths = localStorage.getItem('auditReportColumnWidths');
//         if (savedWidths) try { setColumnWidths(JSON.parse(savedWidths)); } catch { }
//     }, []);
//     useEffect(() => localStorage.setItem('auditReportColumnWidths', JSON.stringify(columnWidths)), [columnWidths]);

//     const generateReport = async () => {
//         try {
//             setLoading(true);
//             setError(null);

//             let endpoint = '';
//             const asOnDateParam = companyDateFormat === 'nepali' ? asOnDateAd : asOnDate;

//             switch (activeTab) {
//                 case 'openingTrialBalance': endpoint = '/api/audit/opening-trial-balance'; break;
//                 case 'closingTrialBalance': endpoint = '/api/audit/pre-closing-trial-balance'; break;
//                 case 'profitAndLoss': endpoint = '/api/audit/profit-and-loss'; break;
//                 case 'balanceSheet': endpoint = '/api/audit/balance-sheet'; break;
//                 case 'cogs': endpoint = '/api/audit/cogs-periodic'; break;
//                 case 'comprehensive': endpoint = '/api/audit/comprehensive'; break;
//                 default: endpoint = '/api/audit/opening-trial-balance';
//             }

//             const params = new URLSearchParams();
//             if (asOnDateParam) params.append('asOnDate', asOnDateParam);

//             const response = await api.get(`${endpoint}?${params.toString()}`);

//             if (response.data.success) {
//                 setReportData(response.data.data);
//                 setNotification({
//                     show: true,
//                     message: `${response.data.data.reportName} generated successfully`,
//                     type: 'success',
//                     duration: 3000
//                 });
//             } else {
//                 setError(response.data.message || 'Failed to generate report');
//                 setNotification({
//                     show: true,
//                     message: response.data.message || 'Failed to generate report',
//                     type: 'error',
//                     duration: 5000
//                 });
//             }
//         } catch (err) {
//             console.error('Error generating report:', err);
//             setError(err.response?.data?.message || 'Error generating report');
//             setNotification({
//                 show: true,
//                 message: err.response?.data?.message || 'Error generating report',
//                 type: 'error',
//                 duration: 5000
//             });
//         } finally {
//             setLoading(false);
//         }
//     };

//     const handleDateChange = (e) => {
//         const value = e.target.value;
//         if (companyDateFormat === 'nepali') {
//             setAsOnDate(value);
//             const adDate = convertBsToAd(value);
//             if (adDate) setAsOnDateAd(adDate);
//             setDateErrors({ asOnDate: '' });
//         } else {
//             setAsOnDate(value);
//             setAsOnDateAd(value);
//         }
//     };

//     const handleDateAdChange = (e) => {
//         const value = e.target.value;
//         setAsOnDateAd(value);
//         const bsDate = convertAdToBs(value);
//         if (bsDate) setAsOnDate(bsDate);
//     };

//     const handleKeyDown = (e, nextFieldId) => {
//         if (e.key === 'Enter') {
//             e.preventDefault();
//             if (nextFieldId) document.getElementById(nextFieldId)?.focus();
//         }
//     };

//     const handleTabChange = (tabId) => {
//         setActiveTab(tabId);
//         setReportData(null);
//         if (tabId !== 'closingTrialBalance') {
//             setClosingTbView('summary');
//         }
//     };

//     const resetColumnWidths = () => {
//         setColumnWidths({ accountName: 200, accountGroup: 150, debit: 100, credit: 100, balance: 100, type: 60 });
//         setNotification({ show: true, message: 'Column widths reset', type: 'success', duration: 2000 });
//     };

//     const renderAccountTypeBadge = (type) => {
//         const colors = {
//             Asset: 'primary', Liability: 'warning', Equity: 'success',
//             Income: 'info', Expense: 'danger', Other: 'secondary'
//         };
//         return <span className={`badge bg-${colors[type] || 'secondary'}`}>{type || 'N/A'}</span>;
//     };

//     // ============================================================
//     // PRINT
//     // ============================================================
//     const handlePrint = () => {
//         if (!reportData) {
//             setNotification({ show: true, message: 'Please generate a report first', type: 'warning' });
//             return;
//         }

//         const data = reportData;
//         const companyName = data.company?.name || 'Company Name';
//         const companyAddress = data.company?.address || '';
//         const companyCity = data.company?.city || '';
//         const companyPan = data.company?.pan || '';
//         const companyPhone = data.company?.phone || '';
//         const reportName = data.reportName || getReportDisplayName(activeTab);
//         const asOnDateDisplay = data.isNepaliFormat ? data.asOnDateNepali : formatDateDisplay(data.asOnDate, 'english');
//         const generatedDate = data.isNepaliFormat ? data.generatedDateNepali : new Date().toLocaleDateString('en-IN');
//         const reportType = data.reportType || activeTab;

//         const isBalanceSheet = reportType === 'BalanceSheet' || activeTab === 'balanceSheet';
//         const isPAndL = reportType === 'ProfitAndLoss' || activeTab === 'profitAndLoss';
//         const isCogs = reportType === 'CogsPeriodic' || activeTab === 'cogs';
//         const isClosingTbDetailed = activeTab === 'closingTrialBalance' && closingTbView === 'detailed';

//         let tableRows = '';
//         let totalDebit = 0;
//         let totalCredit = 0;

//         // COGS: use periodicCogsDetails
//         if (isCogs && data.periodicCogsDetails) {
//             const p = data.periodicCogsDetails;
//             tableRows = `
//                 <tr><td>Opening Stock</td><td class="text-end">${formatCurrency(p.openingStock)}</td></tr>
//                 <tr><td>Add: Purchases</td><td class="text-end">${formatCurrency(p.purchases)}</td></tr>
//                 <tr><td>Add: Direct Expenses</td><td class="text-end">${formatCurrency(p.directExpenses)}</td></tr>
//                 <tr><td>Less: Closing Stock</td><td class="text-end">(${formatCurrency(p.closingStock)})</td></tr>
//                 <tr class="grand-total-row"><td>Total COGS</td><td class="text-end">${formatCurrency(p.totalCogs)}</td></tr>
//             `;
//         }
//         // Closing TB Detailed
//         else if (isClosingTbDetailed && data.accountDetails) {
//             data.accountDetails.forEach((account, index) => {
//                 const bg = index % 2 === 0 ? '#ffffff' : '#f8f9fa';
//                 tableRows += `
//                     <tr style="background-color:${bg};">
//                         <td>${account.accountName || 'N/A'}</td>
//                         <td>${account.accountGroupName || 'N/A'}</td>
//                         <td class="text-end">${formatCurrency(account.openingBalance || 0)} ${account.openingBalanceType || ''}</td>
//                         <td class="text-end">${account.detailDebit > 0 ? formatCurrency(account.detailDebit) : ''}</td>
//                         <td class="text-end">${account.detailCredit > 0 ? formatCurrency(account.detailCredit) : ''}</td>
//                         <td class="text-end">${formatCurrency(account.closingBalance || 0)} ${account.balanceType || ''}</td>
//                     </tr>
//                 `;
//             });
//         }
//         // Standard account-based reports
//         else if (data.accountDetails && data.accountDetails.length > 0) {
//             data.accountDetails.forEach((account, index) => {
//                 let debit = account.debit || 0;
//                 let credit = account.credit || 0;
//                 let balance = account.closingBalance || 0;

//                 if (isBalanceSheet) {
//                     if (account.balanceType === 'Dr') { debit = account.closingBalance || 0; credit = 0; }
//                     else { credit = account.closingBalance || 0; debit = 0; }
//                     balance = account.closingBalance || 0;
//                 } else if (isPAndL) {
//                     if (account.accountType === 'Income') { credit = account.closingBalance || 0; debit = 0; }
//                     else if (account.accountType === 'Expense') { debit = account.closingBalance || 0; credit = 0; }
//                     balance = account.closingBalance || 0;
//                 }

//                 totalDebit += debit || 0;
//                 totalCredit += credit || 0;

//                 const isHeader = account.accountType === 'SECTION_HEADER';
//                 const isSubtotal = account.accountType === 'SUBTOTAL';
//                 const isSectionTotal = account.accountType === 'SECTION_TOTAL';
//                 const isGrossProfit = account.accountType === 'GROSS_PROFIT';
//                 const isNetProfit = account.accountType === 'NET_PROFIT';

//                 let bg = index % 2 === 0 ? '#ffffff' : '#f8f9fa';
//                 let fontWeight = 'normal';
//                 if (isHeader) { bg = '#dbeafe'; fontWeight = '700'; }
//                 else if (isSubtotal) { bg = '#f1f5f9'; fontWeight = '600'; }
//                 else if (isSectionTotal) { bg = '#dbeafe'; fontWeight = '700'; }
//                 else if (isGrossProfit) { bg = '#dcfce7'; fontWeight = '700'; }
//                 else if (isNetProfit) { bg = account.balanceType === 'Cr' ? '#dcfce7' : '#fee2e2'; fontWeight = '700'; }

//                 tableRows += `
//                     <tr style="background-color:${bg};font-weight:${fontWeight};">
//                         <td>${account.accountName || 'N/A'}</td>
//                         <td>${account.accountGroupName || ''}</td>
//                         <td class="text-end">${!isHeader && debit > 0 ? formatCurrency(debit) : ''}</td>
//                         <td class="text-end">${!isHeader && credit > 0 ? formatCurrency(credit) : ''}</td>
//                         <td class="text-end">${!isHeader ? formatCurrency(account.closingBalance || 0) : ''}</td>
//                         <td class="text-center">${!isHeader ? (account.balanceType || '') : ''}</td>
//                     </tr>
//                 `;
//             });
//         }

//         const isBalanced = data.summary?.isBalanced !== undefined ? data.summary.isBalanced : Math.abs(totalDebit - totalCredit) < 0.01;

//         // Column headers depend on report type
//         let theadHtml;
//         if (isCogs) {
//             theadHtml = `<tr><th>Particulars</th><th class="text-end">Amount</th></tr>`;
//         } else if (isClosingTbDetailed) {
//             theadHtml = `<tr>
//                 <th>Account Name</th>
//                 <th>Account Group</th>
//                 <th class="text-end">Opening</th>
//                 <th class="text-end">Debit</th>
//                 <th class="text-end">Credit</th>
//                 <th class="text-end">Closing</th>
//             </tr>`;
//         } else {
//             theadHtml = `<tr>
//                 <th style="width:30%">Account Name</th>
//                 <th style="width:20%">Account Group</th>
//                 <th style="width:16%" class="text-end">Debit</th>
//                 <th style="width:16%" class="text-end">Credit</th>
//                 <th style="width:16%" class="text-end">Balance</th>
//                 <th style="width:6%" class="text-center">Type</th>
//             </tr>`;
//         }

//         const printWindow = window.open('', '_blank');

//         const printContent = `
//             <!DOCTYPE html>
//             <html>
//             <head>
//                 <meta charset="UTF-8">
//                 <title>${reportName}</title>
//                 <style>
//                     @page { margin: 5mm; }
//                     body { font-family: 'Arial Narrow', Arial, sans-serif; font-size: 7px; margin: 0; padding: 3mm; background: white; }
//                     .print-header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 3mm; margin-bottom: 4mm; }
//                     .print-company-name { font-size: 14pt; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; }
//                     .print-company-details { font-size: 7px; margin: 1mm 0; }
//                     .print-report-title { text-align: center; text-decoration: underline; font-size: 11px; font-weight: bold; margin: 2mm 0; }
//                     .print-report-details { display: flex; justify-content: space-between; font-size: 7px; margin: 2mm 0; padding: 1mm 0; }
//                     .print-table { width: 100%; border-collapse: collapse; font-size: 6.5px; }
//                     .print-table thead tr { background-color: #f2f2f2 !important; -webkit-print-color-adjust: exact; }
//                     .print-table th { border: 1px solid #000; padding: 2px 3px; text-align: left; font-weight: bold; font-size: 7px; }
//                     .print-table th.text-end { text-align: right; }
//                     .print-table th.text-center { text-align: center; }
//                     .print-table td { border: 1px solid #ddd; padding: 2px 3px; }
//                     .text-end { text-align: right; }
//                     .text-center { text-align: center; }
//                     .print-summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 2mm; border-top: 2px solid #000; padding-top: 3mm; margin-top: 4mm; }
//                     .print-summary-item { padding: 1mm 2mm; background: #f8f9fa; border-radius: 2px; text-align: center; -webkit-print-color-adjust: exact; }
//                     .print-summary-item .label { font-size: 5.5px; text-transform: uppercase; color: #666; display: block; }
//                     .print-summary-item .value { font-size: 8px; font-weight: bold; }
//                     .print-signature-area { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4mm; margin-top: 6mm; padding-top: 2mm; border-top: 1px solid #ccc; }
//                     .print-signature-box { text-align: center; }
//                     .print-signature-box .sig-line { border-top: 1px solid #000; padding-top: 1mm; margin-top: 6mm; }
//                     .print-signature-box .sig-label { font-size: 6px; font-weight: 600; }
//                     .print-footer { text-align: center; font-size: 5.5px; margin-top: 4mm; border-top: 1px solid #ddd; padding-top: 2mm; color: #666; }
//                     .grand-total-row td { font-weight: bold; border-top: 2px solid #000; background-color: #e9ecef !important; -webkit-print-color-adjust: exact; }
//                 </style>
//             </head>
//             <body>
//                 <div class="print-header">
//                     <div class="print-company-name">${companyName}</div>
//                     <div class="print-company-details">
//                         ${companyAddress}${companyCity ? ', ' + companyCity : ''}
//                         ${companyPhone ? '<br />Tel: ' + companyPhone : ''}
//                         ${companyPan ? ' | PAN: ' + companyPan : ''}
//                     </div>
//                     <div class="print-report-title">${reportName}</div>
//                 </div>

//                 <div class="print-report-details">
//                     <span><strong>Fiscal Year:</strong> ${data.fiscalYear?.name || 'N/A'}</span>
//                     <span><strong>As On Date:</strong> ${asOnDateDisplay}</span>
//                     <span><strong>Generated:</strong> ${generatedDate}</span>
//                 </div>

//                 <table class="print-table">
//                     <thead>${theadHtml}</thead>
//                     <tbody>${tableRows || '<tr><td colspan="7" style="text-align:center;padding:10px;color:#999;">No data available</td></tr>'}</tbody>
//                 </table>

//                 <div class="print-summary">
//                     ${isCogs && data.periodicCogsDetails ? `
//                         <div class="print-summary-item"><span class="label">Opening Stock</span><span class="value">${formatCurrency(data.periodicCogsDetails.openingStock)}</span></div>
//                         <div class="print-summary-item"><span class="label">Purchases</span><span class="value">${formatCurrency(data.periodicCogsDetails.purchases)}</span></div>
//                         <div class="print-summary-item"><span class="label">Direct Expenses</span><span class="value">${formatCurrency(data.periodicCogsDetails.directExpenses)}</span></div>
//                         <div class="print-summary-item"><span class="label">Closing Stock</span><span class="value">(${formatCurrency(data.periodicCogsDetails.closingStock)})</span></div>
//                         <div class="print-summary-item"><span class="label">COGS</span><span class="value" style="color:#dc2626;">${formatCurrency(data.periodicCogsDetails.totalCogs)}</span></div>
//                     ` : ''}
//                     ${!isCogs && !isClosingTbDetailed ? `
//                         <div class="print-summary-item"><span class="label">Total Debit</span><span class="value" style="color:#dc2626;">${formatCurrency(totalDebit)}</span></div>
//                         <div class="print-summary-item"><span class="label">Total Credit</span><span class="value" style="color:#16a34a;">${formatCurrency(totalCredit)}</span></div>
//                         <div class="print-summary-item"><span class="label">Status</span><span class="value" style="color:${isBalanced ? '#059669' : '#dc2626'};">${isBalanced ? '✅ Balanced' : '⚠️ Unbalanced'}</span></div>
//                     ` : ''}
//                     ${data.summary?.netProfit !== undefined ? `
//                         <div class="print-summary-item"><span class="label">Net Profit/Loss</span><span class="value" style="color:${data.summary.netProfit >= 0 ? '#059669' : '#dc2626'};">${formatCurrency(data.summary.netProfit)}</span></div>
//                     ` : ''}
//                     ${data.summary?.totalAssets !== undefined ? `
//                         <div class="print-summary-item"><span class="label">Total Assets</span><span class="value" style="color:#2563eb;">${formatCurrency(data.summary.totalAssets)}</span></div>
//                     ` : ''}
//                     ${data.summary?.totalLiabilities !== undefined ? `
//                         <div class="print-summary-item"><span class="label">Total Liabilities</span><span class="value" style="color:#7c3aed;">${formatCurrency(data.summary.totalLiabilities)}</span></div>
//                     ` : ''}
//                     ${data.summary?.totalEquity !== undefined ? `
//                         <div class="print-summary-item"><span class="label">Total Equity</span><span class="value" style="color:#059669;">${formatCurrency(data.summary.totalEquity)}</span></div>
//                     ` : ''}
//                 </div>

//                 <div class="print-signature-area">
//                     <div class="print-signature-box"><div class="sig-line">_________________</div><div class="sig-label">Prepared By</div></div>
//                     <div class="print-signature-box"><div class="sig-line">_________________</div><div class="sig-label">Checked By</div></div>
//                     <div class="print-signature-box"><div class="sig-line">_________________</div><div class="sig-label">Approved By</div></div>
//                     <div class="print-signature-box"><div class="sig-line">_________________</div><div class="sig-label">Authorized Signatory</div></div>
//                 </div>

//                 <div class="print-footer">
//                     This is a system-generated report. | Generated on ${new Date().toLocaleString()}
//                 </div>

//                 <script>
//                     window.onload = function() {
//                         window.print();
//                         window.onafterprint = function() { window.close(); };
//                     };
//                 <\/script>
//             </body>
//             </html>
//         `;

//         printWindow.document.write(printContent);
//         printWindow.document.close();
//     };

//     // ============================================================
//     // Resizable table components
//     // ============================================================
//     const ResizeHandle = React.memo(({ onResizeStart, left, columnName }) => (
//         <div
//             className="ar-resize-handle"
//             style={{ position: 'absolute', top: 0, left: `${left}px`, width: '5px', height: '100%', cursor: 'col-resize', zIndex: 10 }}
//             onMouseDown={(e) => { e.preventDefault(); onResizeStart(e, columnName); }}
//         />
//     ));

//     const TableHeader = React.memo(() => {
//         const totalWidth = Object.values(columnWidths).reduce((a, b) => a + b, 0);
//         const handleResizeStart = (e, columnName) => {
//             setIsResizing(true);
//             setResizingColumn(columnName);
//             setStartX(e.clientX);
//             setStartWidth(columnWidths[columnName]);
//             e.preventDefault();
//         };
//         return (
//             <div
//                 className="ar-header"
//                 style={{ minWidth: `${totalWidth}px` }}
//                 onMouseMove={(e) => {
//                     if (isResizing && resizingColumn) {
//                         setColumnWidths(prev => ({
//                             ...prev,
//                             [resizingColumn]: Math.max(60, startWidth + e.clientX - startX)
//                         }));
//                     }
//                 }}
//                 onMouseUp={() => { setIsResizing(false); setResizingColumn(null); }}
//                 onMouseLeave={() => { setIsResizing(false); setResizingColumn(null); }}
//             >
//                 <div className="ar-header-cell" style={{ width: `${columnWidths.accountName}px`, flexShrink: 0 }}>
//                     Account Name
//                     <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.accountName - 2} columnName="accountName" />
//                 </div>
//                 <div className="ar-header-cell" style={{ width: `${columnWidths.accountGroup}px`, flexShrink: 0 }}>
//                     Account Group
//                     <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.accountGroup - 2} columnName="accountGroup" />
//                 </div>
//                 <div className="ar-header-cell ar-cell--end" style={{ width: `${columnWidths.debit}px`, flexShrink: 0 }}>
//                     Debit
//                     <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.debit - 2} columnName="debit" />
//                 </div>
//                 <div className="ar-header-cell ar-cell--end" style={{ width: `${columnWidths.credit}px`, flexShrink: 0 }}>
//                     Credit
//                     <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.credit - 2} columnName="credit" />
//                 </div>
//                 <div className="ar-header-cell ar-cell--end" style={{ width: `${columnWidths.balance}px`, flexShrink: 0 }}>
//                     Balance
//                     <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.balance - 2} columnName="balance" />
//                 </div>
//                 <div className="ar-header-cell ar-cell--center" style={{ width: `${columnWidths.type}px`, flexShrink: 0 }}>
//                     Type
//                     <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.type - 2} columnName="type" />
//                 </div>
//                 {isResizing && <div style={{ position: 'fixed', inset: 0, zIndex: 1000, cursor: 'col-resize' }} />}
//             </div>
//         );
//     });

//     const TableRow = React.memo(({ index, style, data }) => {
//         const { accounts, formatCurrency, renderAccountTypeBadge, isBalanceSheet, isPAndL, onCogsClick } = data;
//         const account = accounts[index];
//         if (!account) return null;

//         const isCogsRow = account.accountType === 'COGS';
//         const isHeader = account.accountType === 'SECTION_HEADER';
//         const isSubtotal = account.accountType === 'SUBTOTAL';
//         const isSectionTotal = account.accountType === 'SECTION_TOTAL';
//         const isGrossProfit = account.accountType === 'GROSS_PROFIT';
//         const isNetProfit = account.accountType === 'NET_PROFIT';

//         let debit = account.debit || 0;
//         let credit = account.credit || 0;

//         if (isBalanceSheet) {
//             if (account.balanceType === 'Dr') debit = account.closingBalance;
//             else credit = account.closingBalance;
//         }

//         if (isPAndL) {
//             if (account.accountType === 'Income') { credit = account.closingBalance; debit = 0; }
//             else if (account.accountType === 'Expense') { debit = account.closingBalance; credit = 0; }
//         }

//         let bg = index % 2 === 0 ? '#f8fafc' : 'white';
//         let fontWeight = 'normal';
//         let cursor = 'default';
//         let textColor = 'inherit';

//         if (isHeader) {
//             bg = '#dbeafe';
//             fontWeight = '700';
//             textColor = '#1e40af';
//         } else if (isSubtotal) {
//             bg = '#f1f5f9';
//             fontWeight = '600';
//         } else if (isSectionTotal) {
//             bg = '#dbeafe';
//             fontWeight = '700';
//         } else if (isGrossProfit) {
//             bg = '#dcfce7';
//             fontWeight = '700';
//         } else if (isNetProfit) {
//             bg = (account.balanceType === 'Cr') ? '#dcfce7' : '#fee2e2';
//             fontWeight = '700';
//         } else if (isCogsRow) {
//             bg = '#fef2f2';
//             fontWeight = '600';
//             cursor = 'pointer';
//             textColor = '#dc2626';
//         }

//         return (
//             <div
//                 style={{
//                     ...style,
//                     display: 'flex',
//                     alignItems: 'center',
//                     height: '28px',
//                     borderBottom: '1px solid #e2e8f0',
//                     backgroundColor: bg,
//                     fontWeight: fontWeight,
//                     cursor: cursor
//                 }}
//                 className="ar-row"
//                 onClick={isCogsRow ? onCogsClick : undefined}
//                 title={isCogsRow ? 'Click to view COGS breakdown' : undefined}
//             >
//                 <div className="ar-cell" style={{ width: `${columnWidths.accountName}px`, flexShrink: 0 }} title={account.accountName}>
//                     <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: textColor }}>
//                         {account.accountName}
//                         {isCogsRow && (
//                             <i className="bi bi-box-arrow-up-right ms-2" style={{ fontSize: '0.7rem', opacity: 0.6 }} />
//                         )}
//                     </span>
//                 </div>
//                 <div className="ar-cell" style={{ width: `${columnWidths.accountGroup}px`, flexShrink: 0 }} title={account.accountGroupName}>
//                     <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: textColor }}>
//                         {account.accountGroupName || ''}
//                     </span>
//                 </div>
//                 <div className="ar-cell ar-cell--end" style={{ width: `${columnWidths.debit}px`, flexShrink: 0 }}>
//                     {!isHeader && (
//                         <span style={{ color: isCogsRow ? '#dc2626' : (debit > 0 ? '#dc2626' : 'inherit') }}>
//                             {debit > 0 ? formatCurrency(debit) : ''}
//                         </span>
//                     )}
//                 </div>
//                 <div className="ar-cell ar-cell--end" style={{ width: `${columnWidths.credit}px`, flexShrink: 0 }}>
//                     {!isHeader && (
//                         <span style={{ color: credit > 0 ? '#16a34a' : 'inherit' }}>
//                             {credit > 0 ? formatCurrency(credit) : ''}
//                         </span>
//                     )}
//                 </div>
//                 <div className="ar-cell ar-cell--end" style={{ width: `${columnWidths.balance}px`, flexShrink: 0 }}>
//                     {!isHeader && (
//                         <span style={{ color: isCogsRow ? '#dc2626' : textColor }}>
//                             {formatCurrency(account.closingBalance || 0)}
//                         </span>
//                     )}
//                 </div>
//                 <div className="ar-cell ar-cell--center" style={{ width: `${columnWidths.type}px`, flexShrink: 0 }}>
//                     {!isHeader && account.balanceType && (
//                         <span className={`ar-balance-badge ar-balance-${account.balanceType?.toLowerCase() || 'cr'}`}>
//                             {account.balanceType}
//                         </span>
//                     )}
//                 </div>
//             </div>
//         );
//     });

//     // ============================================================
//     // COGS Render
//     // ============================================================
//     const renderCogs = () => {
//         const p = reportData.periodicCogsDetails;
//         if (!p) {
//             return <div className="ar-state"><h3>No COGS data available</h3></div>;
//         }

//         return (
//             <div className="ar-report-container">
//                 <div className="ar-report-header">
//                     <div className="ar-report-title-section">
//                         <h3>{reportData.reportName || 'Cost of Goods Sold'}</h3>
//                         <div className="ar-report-meta">
//                             <span className="ar-meta-item">
//                                 <i className="bi bi-calendar3 me-1" />
//                                 As On: {reportData.isNepaliFormat ? reportData.asOnDateNepali : formatDateDisplay(reportData.asOnDate, 'english')}
//                             </span>
//                             <span className="ar-meta-item">
//                                 <i className="bi bi-building me-1" />
//                                 {reportData.fiscalYear?.name || 'N/A'}
//                             </span>
//                         </div>
//                     </div>
//                 </div>

//                 <div style={{ padding: '0 12px 12px', overflow: 'auto', flex: 1 }}>
//                     <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
//                         <thead>
//                             <tr style={{ background: '#f1f5f9' }}>
//                                 <th style={{ border: '1px solid #cbd5e1', padding: '6px 8px', textAlign: 'left' }}>Particulars</th>
//                                 <th style={{ border: '1px solid #cbd5e1', padding: '6px 8px', textAlign: 'right', width: 180 }}>Amount</th>
//                             </tr>
//                         </thead>
//                         <tbody>
//                             <tr>
//                                 <td style={{ border: '1px solid #e2e8f0', padding: '6px 8px' }}>Opening Stock</td>
//                                 <td style={{ border: '1px solid #e2e8f0', padding: '6px 8px', textAlign: 'right' }}>{formatCurrency(p.openingStock)}</td>
//                             </tr>
//                             <tr>
//                                 <td style={{ border: '1px solid #e2e8f0', padding: '6px 8px' }}>Add: Purchases</td>
//                                 <td style={{ border: '1px solid #e2e8f0', padding: '6px 8px', textAlign: 'right' }}>{formatCurrency(p.purchases)}</td>
//                             </tr>
//                             <tr>
//                                 <td style={{ border: '1px solid #e2e8f0', padding: '6px 8px' }}>Add: Direct Expenses</td>
//                                 <td style={{ border: '1px solid #e2e8f0', padding: '6px 8px', textAlign: 'right' }}>{formatCurrency(p.directExpenses)}</td>
//                             </tr>
//                             <tr>
//                                 <td style={{ border: '1px solid #e2e8f0', padding: '6px 8px' }}>Less: Closing Stock</td>
//                                 <td style={{ border: '1px solid #e2e8f0', padding: '6px 8px', textAlign: 'right', color: '#dc2626' }}>
//                                     ({formatCurrency(p.closingStock)})
//                                 </td>
//                             </tr>
//                             <tr style={{ background: '#e9ecef', fontWeight: 700 }}>
//                                 <td style={{ border: '1px solid #94a3b8', padding: '8px' }}>Total COGS</td>
//                                 <td style={{ border: '1px solid #94a3b8', padding: '8px', textAlign: 'right', color: '#dc2626' }}>
//                                     {formatCurrency(p.totalCogs)}
//                                 </td>
//                             </tr>
//                         </tbody>
//                     </table>
//                 </div>

//                 <div className="ar-summary-cards">
//                     <div className="ar-summary-card">
//                         <div className="ar-summary-label">Opening Stock</div>
//                         <div className="ar-summary-value">{formatCurrency(p.openingStock)}</div>
//                     </div>
//                     <div className="ar-summary-card">
//                         <div className="ar-summary-label">Purchases</div>
//                         <div className="ar-summary-value">{formatCurrency(p.purchases)}</div>
//                     </div>
//                     <div className="ar-summary-card">
//                         <div className="ar-summary-label">Direct Expenses</div>
//                         <div className="ar-summary-value">{formatCurrency(p.directExpenses)}</div>
//                     </div>
//                     <div className="ar-summary-card">
//                         <div className="ar-summary-label">Closing Stock</div>
//                         <div className="ar-summary-value ar-text-dr">{formatCurrency(p.closingStock)}</div>
//                     </div>
//                     <div className="ar-summary-card" style={{ background: '#fef2f2', borderColor: '#fecaca' }}>
//                         <div className="ar-summary-label">COGS</div>
//                         <div className="ar-summary-value ar-text-dr" style={{ fontWeight: 700 }}>{formatCurrency(p.totalCogs)}</div>
//                     </div>
//                 </div>
//             </div>
//         );
//     };

//     const renderClosingTbDetailed = () => {
//         const { accountDetails } = reportData;
//         if (!accountDetails || accountDetails.length === 0) {
//             return <div className="ar-state"><h3>No data</h3></div>;
//         }

//         // ✅ Compute NET totals
//         let openingDr = 0, openingCr = 0;
//         let detailDr = 0, detailCr = 0;
//         let closingDr = 0, closingCr = 0;

//         accountDetails.forEach(a => {
//             const opType = a.openingBalanceType || a.balanceType || 'Cr';
//             if (opType === 'Dr') openingDr += a.openingBalance || 0;
//             else openingCr += a.openingBalance || 0;

//             detailDr += a.detailDebit || 0;
//             detailCr += a.detailCredit || 0;

//             if (a.balanceType === 'Dr') closingDr += a.closingBalance || 0;
//             else closingCr += a.closingBalance || 0;
//         });

//         const openingNet = openingDr - openingCr;
//         const openingDrNet = openingNet > 0 ? openingNet : 0;
//         const openingCrNet = openingNet < 0 ? Math.abs(openingNet) : 0;

//         const detailNet = detailDr - detailCr;
//         const detailDrNet = detailNet > 0 ? detailNet : 0;
//         const detailCrNet = detailNet < 0 ? Math.abs(detailNet) : 0;

//         const closingNet = closingDr - closingCr;
//         const closingDrNet = closingNet > 0 ? closingNet : 0;
//         const closingCrNet = closingNet < 0 ? Math.abs(closingNet) : 0;

//         // Column widths — must match the table columns exactly
//         const colWidths = {
//             accountName: '30%',
//             group: '20%',
//             opening: '14%',
//             debit: '12%',
//             credit: '12%',
//             closing: '12%'
//         };

//         return (
//             <div className="ar-report-container">
//                 <div className="ar-report-header">
//                     <div className="ar-report-title-section">
//                         <h3>{reportData.reportName} — Detailed</h3>
//                         <div className="ar-report-meta">
//                             <span className="ar-meta-item">
//                                 <i className="bi bi-calendar3 me-1" />
//                                 As On: {reportData.isNepaliFormat ? reportData.asOnDateNepali : formatDateDisplay(reportData.asOnDate, 'english')}
//                             </span>
//                             <span className="ar-meta-item">
//                                 <i className="bi bi-building me-1" />
//                                 {reportData.fiscalYear?.name || 'N/A'}
//                             </span>
//                         </div>
//                     </div>
//                     <div className="ar-report-actions">
//                         <button
//                             className="ar-btn-icon"
//                             onClick={() => setClosingTbView('summary')}
//                             style={{
//                                 background: '#2563eb',
//                                 color: '#fff',
//                                 border: '1px solid #cbd5e1'
//                             }}
//                         >
//                             <i className="bi bi-arrow-left me-1" /> Summary
//                         </button>
//                     </div>
//                 </div>

//                 {/* ✅ Fixed header - matching standard report styling */}
//                 <div style={{
//                     display: 'flex',
//                     alignItems: 'center',
//                     height: '28px',
//                     background: '#f1f5f9',
//                     borderBottom: '2px solid var(--ar-border-strong)',
//                     userSelect: 'none',
//                     flexShrink: 0
//                 }}>
//                     <div style={{ width: colWidths.accountName, padding: '0 4px', borderRight: '1px solid var(--ar-border)', fontSize: '0.65rem', color: 'var(--ar-muted)', textTransform: 'uppercase', letterSpacing: '0.03em', fontWeight: 600, display: 'flex', alignItems: 'center', height: '100%' }}>Account Name</div>
//                     <div style={{ width: colWidths.group, padding: '0 4px', borderRight: '1px solid var(--ar-border)', fontSize: '0.65rem', color: 'var(--ar-muted)', textTransform: 'uppercase', letterSpacing: '0.03em', fontWeight: 600, display: 'flex', alignItems: 'center', height: '100%' }}>Group</div>
//                     <div style={{ width: colWidths.opening, padding: '0 4px', borderRight: '1px solid var(--ar-border)', fontSize: '0.65rem', color: 'var(--ar-muted)', textTransform: 'uppercase', letterSpacing: '0.03em', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>Opening</div>
//                     <div style={{ width: colWidths.debit, padding: '0 4px', borderRight: '1px solid var(--ar-border)', fontSize: '0.65rem', color: 'var(--ar-muted)', textTransform: 'uppercase', letterSpacing: '0.03em', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>Debit</div>
//                     <div style={{ width: colWidths.credit, padding: '0 4px', borderRight: '1px solid var(--ar-border)', fontSize: '0.65rem', color: 'var(--ar-muted)', textTransform: 'uppercase', letterSpacing: '0.03em', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>Credit</div>
//                     <div style={{ width: colWidths.closing, padding: '0 4px', fontSize: '0.65rem', color: 'var(--ar-muted)', textTransform: 'uppercase', letterSpacing: '0.03em', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>Closing</div>
//                 </div>

//                 {/* ✅ Scrollable body */}
//                 <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0 }}>
//                     {accountDetails.map((a, i) => (
//                         <div
//                             key={a.accountId || i}
//                             className="ar-row"
//                             style={{
//                                 display: 'flex',
//                                 alignItems: 'center',
//                                 height: '28px',
//                                 background: i % 2 === 0 ? '#f8fafc' : 'white',
//                                 borderBottom: '1px solid #e2e8f0'
//                             }}
//                         >
//                             <div style={{ width: colWidths.accountName, padding: '0 4px', borderRight: '1px solid var(--ar-border)', fontSize: '0.7rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', height: '100%' }} title={a.accountName}>
//                                 {a.accountName}
//                             </div>
//                             <div style={{ width: colWidths.group, padding: '0 4px', borderRight: '1px solid var(--ar-border)', fontSize: '0.7rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', height: '100%' }} title={a.accountGroupName}>
//                                 {a.accountGroupName}
//                             </div>
//                             <div style={{ width: colWidths.opening, padding: '0 4px', borderRight: '1px solid var(--ar-border)', fontSize: '0.7rem', textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
//                                 {formatCurrency(a.openingBalance || 0)}
//                                 <span style={{ color: '#94a3b8', marginLeft: 4 }}>
//                                     {a.openingBalanceType || a.balanceType}
//                                 </span>
//                             </div>
//                             <div style={{ width: colWidths.debit, padding: '0 4px', borderRight: '1px solid var(--ar-border)', fontSize: '0.7rem', textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
//                                 {a.detailDebit > 0 ? formatCurrency(a.detailDebit) : ''}
//                             </div>
//                             <div style={{ width: colWidths.credit, padding: '0 4px', borderRight: '1px solid var(--ar-border)', fontSize: '0.7rem', textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
//                                 {a.detailCredit > 0 ? formatCurrency(a.detailCredit) : ''}
//                             </div>
//                             <div style={{ width: colWidths.closing, padding: '0 4px', fontSize: '0.7rem', textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
//                                 {formatCurrency(a.closingBalance || 0)}
//                                 <span style={{ color: '#94a3b8', marginLeft: 4 }}>{a.balanceType}</span>
//                             </div>
//                         </div>
//                     ))}
//                 </div>

//                 {/* ✅ Fixed footer — always visible at bottom */}
//                 <div style={{
//                     display: 'flex',
//                     alignItems: 'center',
//                     height: '32px',
//                     background: '#e9ecef',
//                     borderTop: '2px solid #94a3b8',
//                     fontWeight: 700,
//                     flexShrink: 0
//                 }}>
//                     <div style={{ width: `calc(${colWidths.accountName} + ${colWidths.group})`, padding: '0 4px', borderRight: '1px solid #94a3b8', fontSize: '0.7rem', display: 'flex', alignItems: 'center', height: '100%' }}>
//                         Total
//                     </div>
//                     <div style={{ width: colWidths.opening, padding: '0 4px', borderRight: '1px solid #94a3b8', fontSize: '0.7rem', textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
//                         {openingDrNet > 0 && <>{formatCurrency(openingDrNet)} <span style={{ color: '#64748b' }}>Dr</span></>}
//                         {openingCrNet > 0 && <>{formatCurrency(openingCrNet)} <span style={{ color: '#64748b' }}>Cr</span></>}
//                         {openingDrNet === 0 && openingCrNet === 0 && '0.00'}
//                     </div>
//                     {/* ✅ Use raw sums, NOT netted values */}
//                     <div style={{ width: colWidths.debit, padding: '0 4px', borderRight: '1px solid #94a3b8', fontSize: '0.7rem', textAlign: 'right', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
//                         {detailDr > 0 ? formatCurrency(detailDr) : ''}
//                     </div>
//                     <div style={{ width: colWidths.credit, padding: '0 4px', borderRight: '1px solid #94a3b8', fontSize: '0.7rem', textAlign: 'right', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
//                         {detailCr > 0 ? formatCurrency(detailCr) : ''}
//                     </div>
//                     <div style={{ width: colWidths.closing, padding: '0 4px', fontSize: '0.7rem', textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
//                         {closingDrNet > 0 && <>{formatCurrency(closingDrNet)} <span style={{ color: '#64748b' }}>Dr</span></>}
//                         {closingCrNet > 0 && <>{formatCurrency(closingCrNet)} <span style={{ color: '#64748b' }}>Cr</span></>}
//                         {closingDrNet === 0 && closingCrNet === 0 && '0.00'}
//                     </div>
//                 </div>
//             </div>
//         );
//     };

//     // ============================================================
//     // Standard render (TB / P&L / Balance Sheet)
//     // ============================================================
//     const renderStandardReport = () => {
//         const { accountDetails, summary } = reportData;
//         const isBalanceSheet = reportData.reportType === 'BalanceSheet';
//         const isPAndL = reportData.reportType === 'ProfitAndLoss';
//         const isClosingTb = activeTab === 'closingTrialBalance';

//         let totalDebit = 0;
//         let totalCredit = 0;

//         const accountsWithCalculations = accountDetails?.map(account => {
//             let debit = account.debit || 0;
//             let credit = account.credit || 0;

//             if (isBalanceSheet) {
//                 if (account.balanceType === 'Dr') debit = account.closingBalance;
//                 else credit = account.closingBalance;
//             }

//             if (isPAndL) {
//                 if (account.accountType === 'Income') { credit = account.closingBalance; debit = 0; }
//                 else if (account.accountType === 'Expense') { debit = account.closingBalance; credit = 0; }
//             }

//             totalDebit += debit || 0;
//             totalCredit += credit || 0;
//             return { ...account, calculatedDebit: debit, calculatedCredit: credit };
//         });

//         const totalWidth = Object.values(columnWidths).reduce((a, b) => a + b, 0);

//         return (
//             <div className="ar-report-container">
//                 <div className="ar-report-header">
//                     <div className="ar-report-title-section">
//                         <h3>{reportData.reportName}</h3>
//                         <div className="ar-report-meta">
//                             <span className="ar-meta-item">
//                                 <i className="bi bi-calendar3 me-1" />
//                                 As On: {reportData.isNepaliFormat ? reportData.asOnDateNepali : formatDateDisplay(reportData.asOnDate, 'english')}
//                             </span>
//                             <span className="ar-meta-item">
//                                 <i className="bi bi-clock me-1" />
//                                 Generated: {reportData.isNepaliFormat ? reportData.generatedDateNepali : new Date(reportData.generatedDate).toLocaleDateString('en-IN')}
//                             </span>
//                             <span className="ar-meta-item">
//                                 <i className="bi bi-building me-1" />
//                                 {reportData.fiscalYear?.name || 'N/A'}
//                             </span>
//                             <span className={`ar-meta-item ar-status-${reportData.summary?.isBalanced ? 'balanced' : 'unbalanced'}`}>
//                                 {reportData.summary?.isBalanced ? '✅ Balanced' : '⚠️ Unbalanced'}
//                             </span>
//                         </div>
//                     </div>
//                     {/* ✅ Closing TB - Summary / Detailed toggle */}
//                     {isClosingTb && (
//                         <div className="ar-report-actions" style={{ display: 'flex', gap: 4 }}>
//                             <button
//                                 className="ar-btn-icon"
//                                 onClick={() => setClosingTbView('summary')}
//                                 style={{
//                                     background: closingTbView === 'summary' ? '#2563eb' : '#fff',
//                                     color: closingTbView === 'summary' ? '#fff' : '#475569',
//                                     border: '1px solid #cbd5e1'
//                                 }}
//                             >
//                                 Summary
//                             </button>
//                             <button
//                                 className="ar-btn-icon"
//                                 onClick={() => setClosingTbView('detailed')}
//                                 style={{
//                                     background: closingTbView === 'detailed' ? '#2563eb' : '#fff',
//                                     color: closingTbView === 'detailed' ? '#fff' : '#475569',
//                                     border: '1px solid #cbd5e1'
//                                 }}
//                             >
//                                 Detailed
//                             </button>
//                         </div>
//                     )}
//                 </div>

//                 <div className="ar-table-wrap" ref={tableBodyRef}>
//                     <AutoSizer>
//                         {({ height, width }) => (
//                             <div style={{ position: 'relative', height: height, width: Math.max(width, totalWidth) }}>
//                                 <TableHeader />
//                                 <List
//                                     height={height - 28}
//                                     itemCount={accountsWithCalculations?.length || 0}
//                                     itemSize={28}
//                                     width={Math.max(width, totalWidth)}
//                                     itemData={{
//                                         accounts: accountsWithCalculations || [],
//                                         formatCurrency,
//                                         renderAccountTypeBadge,
//                                         isBalanceSheet,
//                                         isPAndL,
//                                         onCogsClick: () => {
//                                             setActiveTab('cogs');
//                                             setReportData(null);
//                                         }
//                                     }}
//                                 >
//                                     {TableRow}
//                                 </List>
//                             </div>
//                         )}
//                     </AutoSizer>
//                 </div>

//                 {summary && (
//                     <div className="ar-summary-cards">
//                         <div className="ar-summary-card">
//                             <div className="ar-summary-label">Total Debit</div>
//                             <div className="ar-summary-value ar-text-dr">{formatCurrency(summary.totalDebit || 0)}</div>
//                         </div>
//                         <div className="ar-summary-card">
//                             <div className="ar-summary-label">Total Credit</div>
//                             <div className="ar-summary-value ar-text-cr">{formatCurrency(summary.totalCredit || 0)}</div>
//                         </div>
//                         {summary.netProfit !== undefined && (
//                             <div className="ar-summary-card">
//                                 <div className="ar-summary-label">Net Profit/Loss</div>
//                                 <div className={`ar-summary-value ${summary.netProfit >= 0 ? 'ar-text-cr' : 'ar-text-dr'}`}>
//                                     {formatCurrency(summary.netProfit)}
//                                 </div>
//                             </div>
//                         )}
//                         {summary.totalAssets !== undefined && (
//                             <div className="ar-summary-card">
//                                 <div className="ar-summary-label">Total Assets</div>
//                                 <div className="ar-summary-value ar-text-dr">{formatCurrency(summary.totalAssets || 0)}</div>
//                             </div>
//                         )}
//                         {summary.totalLiabilities !== undefined && (
//                             <div className="ar-summary-card">
//                                 <div className="ar-summary-label">Total Liabilities</div>
//                                 <div className="ar-summary-value ar-text-cr">{formatCurrency(summary.totalLiabilities || 0)}</div>
//                             </div>
//                         )}
//                         {summary.totalEquity !== undefined && (
//                             <div className="ar-summary-card">
//                                 <div className="ar-summary-label">Total Equity</div>
//                                 <div className="ar-summary-value ar-text-cr">{formatCurrency(summary.totalEquity || 0)}</div>
//                             </div>
//                         )}
//                         <div className="ar-summary-card">
//                             <div className="ar-summary-label">Status</div>
//                             <div className={`ar-summary-value ${summary.isBalanced ? 'ar-text-success' : 'ar-text-danger'}`}>
//                                 {summary.isBalanced ? '✅ Balanced' : '⚠️ Unbalanced'}
//                             </div>
//                         </div>
//                     </div>
//                 )}
//             </div>
//         );
//     };

//     const renderReportContent = () => {
//         if (loading) {
//             return (
//                 <div className="ar-state">
//                     <div className="spinner-border text-primary" />
//                     <p>Generating report...</p>
//                 </div>
//             );
//         }

//         if (error) {
//             return (
//                 <div className="ar-state">
//                     <i className="bi bi-exclamation-triangle" style={{ fontSize: '2rem', color: '#dc3545' }} />
//                     <h3>Error</h3>
//                     <p>{error}</p>
//                     <button className="btn btn-primary btn-sm" onClick={generateReport}>
//                         <i className="bi bi-arrow-clockwise me-2" />Retry
//                     </button>
//                 </div>
//             );
//         }

//         if (!reportData) {
//             return (
//                 <div className="ar-state">
//                     <FiCalendar size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
//                     <h3>No Report Generated</h3>
//                     <p>Select a date and click Generate to view the report</p>
//                 </div>
//             );
//         }

//         if (activeTab === 'cogs') return renderCogs();
//         if (activeTab === 'closingTrialBalance' && closingTbView === 'detailed') return renderClosingTbDetailed();
//         return renderStandardReport();
//     };

//     return (
//         <div className="ar-page">
//             <Header />

//             <div className="ar-shell">
//                 {/* Top Bar */}
//                 <div className="ar-topbar">
//                     <div className="ar-topbar-left">
//                         <div className="ar-topbar-icon"><FiFileText /></div>
//                         <div>
//                             <h1>Audit Reports</h1>
//                             <span className="ar-subtitle">Financial statements and trial balances</span>
//                         </div>
//                     </div>
//                 </div>

//                 {/* Tabs + Controls on the SAME ROW */}
//                 <div
//                     style={{
//                         display: 'flex',
//                         alignItems: 'center',
//                         gap: '0.5rem',
//                         flexWrap: 'nowrap',
//                         overflowX: 'auto',
//                         background: 'var(--ar-card)',
//                         border: '1px solid var(--ar-border)',
//                         borderRadius: 'var(--ar-radius)',
//                         padding: '0.25rem 0.4rem',
//                         flexShrink: 0
//                     }}
//                 >
//                     {/* Tabs */}
//                     <div
//                         className="ar-tabs"
//                         style={{
//                             display: 'flex',
//                             gap: '0.25rem',
//                             flex: 1,
//                             minWidth: 0,
//                             border: 'none',
//                             background: 'transparent',
//                             padding: 0,
//                             overflowX: 'auto'
//                         }}
//                     >
//                         {reportTabs.map(tab => (
//                             <button
//                                 key={tab.id}
//                                 className={`ar-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
//                                 onClick={() => handleTabChange(tab.id)}
//                             >
//                                 <i className={`${tab.icon} me-2`} />
//                                 {tab.label}
//                             </button>
//                         ))}
//                     </div>

//                     {/* Divider */}
//                     <div style={{ width: 1, height: 24, background: 'var(--ar-border-strong)', flexShrink: 0 }} />

//                     {/* As On Date */}
//                     <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
//                         <label
//                             style={{
//                                 fontSize: '0.68rem',
//                                 fontWeight: 600,
//                                 color: 'var(--ar-muted)',
//                                 textTransform: 'uppercase',
//                                 letterSpacing: '0.03em',
//                                 margin: 0,
//                                 whiteSpace: 'nowrap'
//                             }}
//                         >
//                             <FiCalendar className="me-1" style={{ marginRight: 4 }} />
//                             As On
//                         </label>

//                         {companyDateFormat === 'nepali' ? (
//                             <>
//                                 <input
//                                     type="text"
//                                     id="asOnDate"
//                                     ref={asOnDateRef}
//                                     className={`ar-date-input ${dateErrors.asOnDate ? 'is-invalid' : ''}`}
//                                     value={asOnDate}
//                                     onChange={handleDateChange}
//                                     onKeyDown={(e) => handleKeyDown(e, 'asOnDateAd')}
//                                     onBlur={(e) => {
//                                         const d = e.target.value.trim();
//                                         if (!d) return;
//                                         const c = validateAndCorrectNepaliDate(d);
//                                         if (!c) {
//                                             const ad = convertBsToAd(currentNepaliDate);
//                                             setAsOnDate(currentNepaliDate);
//                                             setAsOnDateAd(ad);
//                                             setNotification({
//                                                 show: true,
//                                                 message: 'Invalid Nepali date. Auto-corrected.',
//                                                 type: 'warning',
//                                                 duration: 3000
//                                             });
//                                         }
//                                     }}
//                                     placeholder="YYYY-MM-DD"
//                                     autoComplete="off"
//                                     autoFocus
//                                 />
//                                 <input
//                                     type="date"
//                                     id="asOnDateAd"
//                                     className="ar-date-input ar-date-input-ad"
//                                     value={asOnDateAd}
//                                     onChange={handleDateAdChange}
//                                     onKeyDown={(e) => handleKeyDown(e, 'generateReport')}
//                                 />
//                             </>
//                         ) : (
//                             <input
//                                 type="date"
//                                 id="asOnDate"
//                                 ref={asOnDateRef}
//                                 className="ar-date-input"
//                                 value={asOnDate}
//                                 onChange={handleDateChange}
//                                 onKeyDown={(e) => handleKeyDown(e, 'generateReport')}
//                                 autoFocus
//                             />
//                         )}
//                     </div>

//                     {/* Generate */}
//                     <button
//                         id="generateReport"
//                         ref={generateReportRef}
//                         className="ar-btn-gen"
//                         onClick={generateReport}
//                         disabled={loading}
//                     >
//                         {loading ? (
//                             <><span className="spinner-border spinner-border-sm me-2" style={{ width: 12, height: 12 }} /> Generating...</>
//                         ) : (
//                             <><FiSearch className="me-1" /> Generate</>
//                         )}
//                     </button>

//                     {/* Print */}
//                     <button className="ar-btn-gen" onClick={handlePrint} disabled={!reportData}>
//                         <FiPrinter size={14} /> Print
//                     </button>

//                     {/* Reset columns */}
//                     <button className="ar-btn-gen" onClick={resetColumnWidths} title="Reset column widths">
//                         <FiRefreshCw size={14} />
//                     </button>
//                 </div>

//                 {/* Report Content */}
//                 <div className="ar-main">
//                     {renderReportContent()}
//                 </div>
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

// export default AuditReport;

//-------------------------------------------end1

// components/AuditReport/AuditReport.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import NepaliDate from 'nepali-datetime';
import api from '../../components/services/api';
import Header from '../retailer/Header';
import NotificationToast from '../NotificationToast';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { FiFileText, FiPrinter, FiSearch, FiRefreshCw, FiCalendar } from 'react-icons/fi';
import './AuditReport.css';
import ProductModal from '../retailer/dashboard/modals/ProductModal';

// ---------- Helpers ----------
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
    } catch { return null; }
};

const convertAdToBs = (adDate) => {
    if (!adDate) return null;
    try {
        let date;
        if (typeof adDate === 'string') {
            date = /^\d{4}-\d{2}-\d{2}$/.test(adDate)
                ? new Date(adDate + 'T00:00:00')
                : new Date(adDate);
        } else if (adDate instanceof Date) {
            date = adDate;
        } else return null;
        if (isNaN(date.getTime())) return null;
        const nepaliDate = new NepaliDate(date);
        return `${nepaliDate.getYear()}-${String(nepaliDate.getMonth() + 1).padStart(2, '0')}-${String(nepaliDate.getDate()).padStart(2, '0')}`;
    } catch { return null; }
};

const formatCurrency = (num) => {
    const number = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num) || 0;
    return number.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatDateDisplay = (date, format) => {
    if (!date) return '';
    if (format === 'nepali') return date;
    try {
        return new Date(date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: '2-digit' });
    } catch { return date; }
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

const validateAndCorrectNepaliDate = (dateStr) => {
    if (!dateStr) return null;
    if (isValidNepaliDate(dateStr)) return dateStr;
    const match = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (match) {
        let [_, year, month, day] = match;
        month = Math.min(12, Math.max(1, parseInt(month, 10)));
        day = Math.min(32, Math.max(1, parseInt(day, 10)));
        const corrected = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return isValidNepaliDate(corrected) ? corrected : null;
    }
    return null;
};

const getReportDisplayName = (tabId) => {
    const map = {
        openingTrialBalance: 'Opening Trial Balance',
        closingTrialBalance: 'Closing Trial Balance',
        profitAndLoss: 'Profit & Loss Account',
        balanceSheet: 'Balance Sheet',
        cogs: 'Cost of Goods Sold',
        comprehensive: 'Comprehensive Report'
    };
    return map[tabId] || tabId;
};

const AuditReport = () => {
    const navigate = useNavigate();
    const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
    const currentEnglishDate = new Date().toISOString().split('T')[0];

    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState(null);
    const [activeTab, setActiveTab] = useState('openingTrialBalance');

    // ✅ Trial Balance view mode: 'pre-closing' | 'post-closing'
    const [tbMode, setTbMode] = useState('pre-closing');
    // ✅ Trial Balance display: 'summary' | 'detailed'
    const [closingTbView, setClosingTbView] = useState('summary');

    const [error, setError] = useState(null);
    const [companyDateFormat, setCompanyDateFormat] = useState('english');
    const [asOnDate, setAsOnDate] = useState(currentNepaliDate);
    const [asOnDateAd, setAsOnDateAd] = useState(currentEnglishDate);
    const [dateErrors, setDateErrors] = useState({ asOnDate: '' });
    const [notification, setNotification] = useState({
        show: false, message: '', type: 'success', duration: 3000
    });
    const [isPrinting, setIsPrinting] = useState(false);
    const [showProductModal, setShowProductModal] = useState(false);
    const [columnWidths, setColumnWidths] = useState({
        accountName: 200, accountGroup: 150, debit: 100, credit: 100, balance: 100, type: 60
    });

    const [isResizing, setIsResizing] = useState(false);
    const [resizingColumn, setResizingColumn] = useState(null);
    const [startX, setStartX] = useState(0);
    const [startWidth, setStartWidth] = useState(0);

    const asOnDateRef = useRef(null);
    const generateReportRef = useRef(null);
    const tableBodyRef = useRef(null);

    const reportTabs = [
        { id: 'openingTrialBalance', label: 'Opening TB', icon: 'bi-journal-text' },
        { id: 'closingTrialBalance', label: 'Closing TB', icon: 'bi-journal-check' },
        { id: 'profitAndLoss', label: 'P&L', icon: 'bi-graph-up' },
        { id: 'balanceSheet', label: 'Balance Sheet', icon: 'bi-building' },
        { id: 'cogs', label: 'COGS', icon: 'bi-calculator' },
        { id: 'comprehensive', label: 'Comprehensive', icon: 'bi-file-earmark-text' }
    ];

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const response = await api.get('/api/audit/date-format');
                if (response.data.success) {
                    setCompanyDateFormat(response.data.data.dateFormat || 'english');
                }
            } catch (err) {
                console.error('Error fetching date format:', err);
            }
        };
        fetchInitialData();
    }, []);

    // ✅ Refetch whenever tab, date, OR tbMode changes
    useEffect(() => {
        if (asOnDate) {
            const timer = setTimeout(() => { generateReport(); }, 300);
            return () => clearTimeout(timer);
        }
    }, [activeTab, asOnDate, tbMode]);

    useEffect(() => {
        const savedWidths = localStorage.getItem('auditReportColumnWidths');
        if (savedWidths) try { setColumnWidths(JSON.parse(savedWidths)); } catch { }
    }, []);
    useEffect(() => localStorage.setItem('auditReportColumnWidths', JSON.stringify(columnWidths)), [columnWidths]);

    const generateReport = async () => {
        try {
            setLoading(true);
            setError(null);

            let endpoint = '';
            const asOnDateParam = companyDateFormat === 'nepali' ? asOnDateAd : asOnDate;

            switch (activeTab) {
                case 'openingTrialBalance': endpoint = '/api/audit/opening-trial-balance'; break;
                case 'closingTrialBalance':
                    endpoint = tbMode === 'post-closing'
                        ? '/api/audit/post-closing-trial-balance'
                        : '/api/audit/pre-closing-trial-balance';
                    break;
                case 'profitAndLoss': endpoint = '/api/audit/profit-and-loss'; break;
                case 'balanceSheet': endpoint = '/api/audit/balance-sheet'; break;
                case 'cogs': endpoint = '/api/audit/cogs-periodic'; break;
                case 'comprehensive': endpoint = '/api/audit/comprehensive'; break;
                default: endpoint = '/api/audit/opening-trial-balance';
            }

            const params = new URLSearchParams();
            if (asOnDateParam) params.append('asOnDate', asOnDateParam);

            const response = await api.get(`${endpoint}?${params.toString()}`);

            if (response.data.success) {
                setReportData(response.data.data);
                setNotification({
                    show: true,
                    message: `${response.data.data.reportName} generated successfully`,
                    type: 'success',
                    duration: 3000
                });
            } else {
                setError(response.data.message || 'Failed to generate report');
                setNotification({
                    show: true,
                    message: response.data.message || 'Failed to generate report',
                    type: 'error',
                    duration: 5000
                });
            }
        } catch (err) {
            console.error('Error generating report:', err);
            setError(err.response?.data?.message || 'Error generating report');
            setNotification({
                show: true,
                message: err.response?.data?.message || 'Error generating report',
                type: 'error',
                duration: 5000
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDateChange = (e) => {
        const value = e.target.value;
        if (companyDateFormat === 'nepali') {
            setAsOnDate(value);
            const adDate = convertBsToAd(value);
            if (adDate) setAsOnDateAd(adDate);
            setDateErrors({ asOnDate: '' });
        } else {
            setAsOnDate(value);
            setAsOnDateAd(value);
        }
    };

    const handleDateAdChange = (e) => {
        const value = e.target.value;
        setAsOnDateAd(value);
        const bsDate = convertAdToBs(value);
        if (bsDate) setAsOnDate(bsDate);
    };

    const handleKeyDown = (e, nextFieldId) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (nextFieldId) document.getElementById(nextFieldId)?.focus();
        }
    };

    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        setReportData(null);
        if (tabId !== 'closingTrialBalance') {
            setClosingTbView('summary');
            setTbMode('pre-closing');
        }
    };

    // ✅ Toggle between pre-closing and post-closing TB
    const handleTbModeChange = (mode) => {
        setTbMode(mode);
        setReportData(null);
    };

    const resetColumnWidths = () => {
        setColumnWidths({ accountName: 200, accountGroup: 150, debit: 100, credit: 100, balance: 100, type: 60 });
        setNotification({ show: true, message: 'Column widths reset', type: 'success', duration: 2000 });
    };

    const renderAccountTypeBadge = (type) => {
        const colors = {
            Asset: 'primary', Liability: 'warning', Equity: 'success',
            Income: 'info', Expense: 'danger', Other: 'secondary'
        };
        return <span className={`badge bg-${colors[type] || 'secondary'}`}>{type || 'N/A'}</span>;
    };

    // ============================================================
    // PRINT
    // ============================================================
    const handlePrint = () => {
        if (!reportData) {
            setNotification({ show: true, message: 'Please generate a report first', type: 'warning' });
            return;
        }

        const data = reportData;
        const companyName = data.company?.name || 'Company Name';
        const companyAddress = data.company?.address || '';
        const companyCity = data.company?.city || '';
        const companyPan = data.company?.pan || '';
        const companyPhone = data.company?.phone || '';
        const reportName = data.reportName || getReportDisplayName(activeTab);
        const asOnDateDisplay = data.isNepaliFormat ? data.asOnDateNepali : formatDateDisplay(data.asOnDate, 'english');
        const generatedDate = data.isNepaliFormat ? data.generatedDateNepali : new Date().toLocaleDateString('en-IN');
        const reportType = data.reportType || activeTab;

        const isBalanceSheet = reportType === 'BalanceSheet' || activeTab === 'balanceSheet';
        const isPAndL = reportType === 'ProfitAndLoss' || activeTab === 'profitAndLoss';
        const isCogs = reportType === 'CogsPeriodic' || activeTab === 'cogs';
        const isClosingTbDetailed = activeTab === 'closingTrialBalance' && closingTbView === 'detailed';

        let tableRows = '';
        let totalDebit = 0;
        let totalCredit = 0;

        if (isCogs && data.periodicCogsDetails) {
            const p = data.periodicCogsDetails;
            tableRows = `
                <tr><td>Opening Stock</td><td class="text-end">${formatCurrency(p.openingStock)}</td></tr>
                <tr><td>Add: Purchases</td><td class="text-end">${formatCurrency(p.purchases)}</td></tr>
                <tr><td>Add: Direct Expenses</td><td class="text-end">${formatCurrency(p.directExpenses)}</td></tr>
                <tr><td>Less: Closing Stock</td><td class="text-end">(${formatCurrency(p.closingStock)})</td></tr>
                <tr class="grand-total-row"><td>Total COGS</td><td class="text-end">${formatCurrency(p.totalCogs)}</td></tr>
            `;
        }
        else if (isClosingTbDetailed && data.accountDetails) {
            data.accountDetails.forEach((account, index) => {
                const bg = index % 2 === 0 ? '#ffffff' : '#f8f9fa';
                tableRows += `
                    <tr style="background-color:${bg};">
                        <td>${account.accountName || 'N/A'}</td>
                        <td>${account.accountGroupName || 'N/A'}</td>
                        <td class="text-end">${formatCurrency(account.openingBalance || 0)} ${account.openingBalanceType || ''}</td>
                        <td class="text-end">${account.detailDebit > 0 ? formatCurrency(account.detailDebit) : ''}</td>
                        <td class="text-end">${account.detailCredit > 0 ? formatCurrency(account.detailCredit) : ''}</td>
                        <td class="text-end">${formatCurrency(account.closingBalance || 0)} ${account.balanceType || ''}</td>
                    </tr>
                `;
            });
        }
        else if (data.accountDetails && data.accountDetails.length > 0) {
            data.accountDetails.forEach((account, index) => {
                let debit = account.debit || 0;
                let credit = account.credit || 0;
                let balance = account.closingBalance || 0;

                if (isBalanceSheet) {
                    if (account.balanceType === 'Dr') { debit = account.closingBalance || 0; credit = 0; }
                    else { credit = account.closingBalance || 0; debit = 0; }
                    balance = account.closingBalance || 0;
                } else if (isPAndL) {
                    if (account.accountType === 'Income') { credit = account.closingBalance || 0; debit = 0; }
                    else if (account.accountType === 'Expense') { debit = account.closingBalance || 0; credit = 0; }
                    balance = account.closingBalance || 0;
                }

                totalDebit += debit || 0;
                totalCredit += credit || 0;

                const isHeader = account.accountType === 'SECTION_HEADER';
                const isSubtotal = account.accountType === 'SUBTOTAL';
                const isSectionTotal = account.accountType === 'SECTION_TOTAL';
                const isGrossProfit = account.accountType === 'GROSS_PROFIT';
                const isNetProfit = account.accountType === 'NET_PROFIT';

                let bg = index % 2 === 0 ? '#ffffff' : '#f8f9fa';
                let fontWeight = 'normal';
                if (isHeader) { bg = '#dbeafe'; fontWeight = '700'; }
                else if (isSubtotal) { bg = '#f1f5f9'; fontWeight = '600'; }
                else if (isSectionTotal) { bg = '#dbeafe'; fontWeight = '700'; }
                else if (isGrossProfit) { bg = '#dcfce7'; fontWeight = '700'; }
                else if (isNetProfit) { bg = account.balanceType === 'Cr' ? '#dcfce7' : '#fee2e2'; fontWeight = '700'; }

                tableRows += `
                    <tr style="background-color:${bg};font-weight:${fontWeight};">
                        <td>${account.accountName || 'N/A'}</td>
                        <td>${account.accountGroupName || ''}</td>
                        <td class="text-end">${!isHeader && debit > 0 ? formatCurrency(debit) : ''}</td>
                        <td class="text-end">${!isHeader && credit > 0 ? formatCurrency(credit) : ''}</td>
                        <td class="text-end">${!isHeader ? formatCurrency(account.closingBalance || 0) : ''}</td>
                        <td class="text-center">${!isHeader ? (account.balanceType || '') : ''}</td>
                    </tr>
                `;
            });
        }

        const isBalanced = data.summary?.isBalanced !== undefined ? data.summary.isBalanced : Math.abs(totalDebit - totalCredit) < 0.01;

        let theadHtml;
        if (isCogs) {
            theadHtml = `<tr><th>Particulars</th><th class="text-end">Amount</th></tr>`;
        } else if (isClosingTbDetailed) {
            theadHtml = `<tr>
                <th>Account Name</th>
                <th>Account Group</th>
                <th class="text-end">Opening</th>
                <th class="text-end">Debit</th>
                <th class="text-end">Credit</th>
                <th class="text-end">Closing</th>
            </tr>`;
        } else {
            theadHtml = `<tr>
                <th style="width:30%">Account Name</th>
                <th style="width:20%">Account Group</th>
                <th style="width:16%" class="text-end">Debit</th>
                <th style="width:16%" class="text-end">Credit</th>
                <th style="width:16%" class="text-end">Balance</th>
                <th style="width:6%" class="text-center">Type</th>
            </tr>`;
        }

        const printWindow = window.open('', '_blank');

        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>${reportName}</title>
                <style>
                    @page { margin: 5mm; }
                    body { font-family: 'Arial Narrow', Arial, sans-serif; font-size: 7px; margin: 0; padding: 3mm; background: white; }
                    .print-header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 3mm; margin-bottom: 4mm; }
                    .print-company-name { font-size: 14pt; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; }
                    .print-company-details { font-size: 7px; margin: 1mm 0; }
                    .print-report-title { text-align: center; text-decoration: underline; font-size: 11px; font-weight: bold; margin: 2mm 0; }
                    .print-report-details { display: flex; justify-content: space-between; font-size: 7px; margin: 2mm 0; padding: 1mm 0; }
                    .print-table { width: 100%; border-collapse: collapse; font-size: 6.5px; }
                    .print-table thead tr { background-color: #f2f2f2 !important; -webkit-print-color-adjust: exact; }
                    .print-table th { border: 1px solid #000; padding: 2px 3px; text-align: left; font-weight: bold; font-size: 7px; }
                    .print-table th.text-end { text-align: right; }
                    .print-table th.text-center { text-align: center; }
                    .print-table td { border: 1px solid #ddd; padding: 2px 3px; }
                    .text-end { text-align: right; }
                    .text-center { text-align: center; }
                    .print-summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 2mm; border-top: 2px solid #000; padding-top: 3mm; margin-top: 4mm; }
                    .print-summary-item { padding: 1mm 2mm; background: #f8f9fa; border-radius: 2px; text-align: center; -webkit-print-color-adjust: exact; }
                    .print-summary-item .label { font-size: 5.5px; text-transform: uppercase; color: #666; display: block; }
                    .print-summary-item .value { font-size: 8px; font-weight: bold; }
                    .print-signature-area { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4mm; margin-top: 6mm; padding-top: 2mm; border-top: 1px solid #ccc; }
                    .print-signature-box { text-align: center; }
                    .print-signature-box .sig-line { border-top: 1px solid #000; padding-top: 1mm; margin-top: 6mm; }
                    .print-signature-box .sig-label { font-size: 6px; font-weight: 600; }
                    .print-footer { text-align: center; font-size: 5.5px; margin-top: 4mm; border-top: 1px solid #ddd; padding-top: 2mm; color: #666; }
                    .grand-total-row td { font-weight: bold; border-top: 2px solid #000; background-color: #e9ecef !important; -webkit-print-color-adjust: exact; }
                </style>
            </head>
            <body>
                <div class="print-header">
                    <div class="print-company-name">${companyName}</div>
                    <div class="print-company-details">
                        ${companyAddress}${companyCity ? ', ' + companyCity : ''}
                        ${companyPhone ? '<br />Tel: ' + companyPhone : ''}
                        ${companyPan ? ' | PAN: ' + companyPan : ''}
                    </div>
                    <div class="print-report-title">${reportName}</div>
                </div>

                <div class="print-report-details">
                    <span><strong>Fiscal Year:</strong> ${data.fiscalYear?.name || 'N/A'}</span>
                    <span><strong>As On Date:</strong> ${asOnDateDisplay}</span>
                    <span><strong>Generated:</strong> ${generatedDate}</span>
                </div>

                <table class="print-table">
                    <thead>${theadHtml}</thead>
                    <tbody>${tableRows || '<tr><td colspan="7" style="text-align:center;padding:10px;color:#999;">No data available</td></tr>'}</tbody>
                </table>

                <div class="print-summary">
                    ${isCogs && data.periodicCogsDetails ? `
                        <div class="print-summary-item"><span class="label">Opening Stock</span><span class="value">${formatCurrency(data.periodicCogsDetails.openingStock)}</span></div>
                        <div class="print-summary-item"><span class="label">Purchases</span><span class="value">${formatCurrency(data.periodicCogsDetails.purchases)}</span></div>
                        <div class="print-summary-item"><span class="label">Direct Expenses</span><span class="value">${formatCurrency(data.periodicCogsDetails.directExpenses)}</span></div>
                        <div class="print-summary-item"><span class="label">Closing Stock</span><span class="value">(${formatCurrency(data.periodicCogsDetails.closingStock)})</span></div>
                        <div class="print-summary-item"><span class="label">COGS</span><span class="value" style="color:#dc2626;">${formatCurrency(data.periodicCogsDetails.totalCogs)}</span></div>
                    ` : ''}
                    ${!isCogs && !isClosingTbDetailed ? `
                        <div class="print-summary-item"><span class="label">Total Debit</span><span class="value" style="color:#dc2626;">${formatCurrency(totalDebit)}</span></div>
                        <div class="print-summary-item"><span class="label">Total Credit</span><span class="value" style="color:#16a34a;">${formatCurrency(totalCredit)}</span></div>
                        <div class="print-summary-item"><span class="label">Status</span><span class="value" style="color:${isBalanced ? '#059669' : '#dc2626'};">${isBalanced ? '✅ Balanced' : '⚠️ Unbalanced'}</span></div>
                    ` : ''}
                    ${data.summary?.netProfit !== undefined ? `
                        <div class="print-summary-item"><span class="label">Net Profit/Loss</span><span class="value" style="color:${data.summary.netProfit >= 0 ? '#059669' : '#dc2626'};">${formatCurrency(data.summary.netProfit)}</span></div>
                    ` : ''}
                    ${data.summary?.totalAssets !== undefined ? `
                        <div class="print-summary-item"><span class="label">Total Assets</span><span class="value" style="color:#2563eb;">${formatCurrency(data.summary.totalAssets)}</span></div>
                    ` : ''}
                    ${data.summary?.totalLiabilities !== undefined ? `
                        <div class="print-summary-item"><span class="label">Total Liabilities</span><span class="value" style="color:#7c3aed;">${formatCurrency(data.summary.totalLiabilities)}</span></div>
                    ` : ''}
                    ${data.summary?.totalEquity !== undefined ? `
                        <div class="print-summary-item"><span class="label">Total Equity</span><span class="value" style="color:#059669;">${formatCurrency(data.summary.totalEquity)}</span></div>
                    ` : ''}
                </div>

                <div class="print-signature-area">
                    <div class="print-signature-box"><div class="sig-line">_________________</div><div class="sig-label">Prepared By</div></div>
                    <div class="print-signature-box"><div class="sig-line">_________________</div><div class="sig-label">Checked By</div></div>
                    <div class="print-signature-box"><div class="sig-line">_________________</div><div class="sig-label">Approved By</div></div>
                    <div class="print-signature-box"><div class="sig-line">_________________</div><div class="sig-label">Authorized Signatory</div></div>
                </div>

                <div class="print-footer">
                    This is a system-generated report. | Generated on ${new Date().toLocaleString()}
                </div>

                <script>
                    window.onload = function() {
                        window.print();
                        window.onafterprint = function() { window.close(); };
                    };
                <\/script>
            </body>
            </html>
        `;

        printWindow.document.write(printContent);
        printWindow.document.close();
    };

    // ============================================================
    // Resizable table components
    // ============================================================
    const ResizeHandle = React.memo(({ onResizeStart, left, columnName }) => (
        <div
            className="ar-resize-handle"
            style={{ position: 'absolute', top: 0, left: `${left}px`, width: '5px', height: '100%', cursor: 'col-resize', zIndex: 10 }}
            onMouseDown={(e) => { e.preventDefault(); onResizeStart(e, columnName); }}
        />
    ));

    const TableHeader = React.memo(() => {
        const totalWidth = Object.values(columnWidths).reduce((a, b) => a + b, 0);
        const handleResizeStart = (e, columnName) => {
            setIsResizing(true);
            setResizingColumn(columnName);
            setStartX(e.clientX);
            setStartWidth(columnWidths[columnName]);
            e.preventDefault();
        };
        return (
            <div
                className="ar-header"
                style={{ minWidth: `${totalWidth}px` }}
                onMouseMove={(e) => {
                    if (isResizing && resizingColumn) {
                        setColumnWidths(prev => ({
                            ...prev,
                            [resizingColumn]: Math.max(60, startWidth + e.clientX - startX)
                        }));
                    }
                }}
                onMouseUp={() => { setIsResizing(false); setResizingColumn(null); }}
                onMouseLeave={() => { setIsResizing(false); setResizingColumn(null); }}
            >
                <div className="ar-header-cell" style={{ width: `${columnWidths.accountName}px`, flexShrink: 0 }}>
                    Account Name
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.accountName - 2} columnName="accountName" />
                </div>
                <div className="ar-header-cell" style={{ width: `${columnWidths.accountGroup}px`, flexShrink: 0 }}>
                    Account Group
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.accountGroup - 2} columnName="accountGroup" />
                </div>
                <div className="ar-header-cell ar-cell--end" style={{ width: `${columnWidths.debit}px`, flexShrink: 0 }}>
                    Debit
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.debit - 2} columnName="debit" />
                </div>
                <div className="ar-header-cell ar-cell--end" style={{ width: `${columnWidths.credit}px`, flexShrink: 0 }}>
                    Credit
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.credit - 2} columnName="credit" />
                </div>
                <div className="ar-header-cell ar-cell--end" style={{ width: `${columnWidths.balance}px`, flexShrink: 0 }}>
                    Balance
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.balance - 2} columnName="balance" />
                </div>
                <div className="ar-header-cell ar-cell--center" style={{ width: `${columnWidths.type}px`, flexShrink: 0 }}>
                    Type
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.type - 2} columnName="type" />
                </div>
                {isResizing && <div style={{ position: 'fixed', inset: 0, zIndex: 1000, cursor: 'col-resize' }} />}
            </div>
        );
    });

    const TableRow = React.memo(({ index, style, data }) => {
        const { accounts, formatCurrency, renderAccountTypeBadge, isBalanceSheet, isPAndL, onCogsClick } = data;
        const account = accounts[index];
        if (!account) return null;

        const isCogsRow = account.accountType === 'COGS';
        const isHeader = account.accountType === 'SECTION_HEADER';
        const isSubtotal = account.accountType === 'SUBTOTAL';
        const isSectionTotal = account.accountType === 'SECTION_TOTAL';
        const isGrossProfit = account.accountType === 'GROSS_PROFIT';
        const isNetProfit = account.accountType === 'NET_PROFIT';

        let debit = account.debit || 0;
        let credit = account.credit || 0;

        if (isBalanceSheet) {
            if (account.balanceType === 'Dr') debit = account.closingBalance;
            else credit = account.closingBalance;
        }

        if (isPAndL) {
            if (account.accountType === 'Income') { credit = account.closingBalance; debit = 0; }
            else if (account.accountType === 'Expense') { debit = account.closingBalance; credit = 0; }
        }

        let bg = index % 2 === 0 ? '#f8fafc' : 'white';
        let fontWeight = 'normal';
        let cursor = 'default';
        let textColor = 'inherit';

        if (isHeader) {
            bg = '#dbeafe';
            fontWeight = '700';
            textColor = '#1e40af';
        } else if (isSubtotal) {
            bg = '#f1f5f9';
            fontWeight = '600';
        } else if (isSectionTotal) {
            bg = '#dbeafe';
            fontWeight = '700';
        } else if (isGrossProfit) {
            bg = '#dcfce7';
            fontWeight = '700';
        } else if (isNetProfit) {
            bg = (account.balanceType === 'Cr') ? '#dcfce7' : '#fee2e2';
            fontWeight = '700';
        } else if (isCogsRow) {
            bg = '#fef2f2';
            fontWeight = '600';
            cursor = 'pointer';
            textColor = '#dc2626';
        }

        return (
            <div
                style={{
                    ...style,
                    display: 'flex',
                    alignItems: 'center',
                    height: '28px',
                    borderBottom: '1px solid #e2e8f0',
                    backgroundColor: bg,
                    fontWeight: fontWeight,
                    cursor: cursor
                }}
                className="ar-row"
                onClick={isCogsRow ? onCogsClick : undefined}
                title={isCogsRow ? 'Click to view COGS breakdown' : undefined}
            >
                <div className="ar-cell" style={{ width: `${columnWidths.accountName}px`, flexShrink: 0 }} title={account.accountName}>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: textColor }}>
                        {account.accountName}
                        {isCogsRow && (
                            <i className="bi bi-box-arrow-up-right ms-2" style={{ fontSize: '0.7rem', opacity: 0.6 }} />
                        )}
                    </span>
                </div>
                <div className="ar-cell" style={{ width: `${columnWidths.accountGroup}px`, flexShrink: 0 }} title={account.accountGroupName}>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: textColor }}>
                        {account.accountGroupName || ''}
                    </span>
                </div>
                <div className="ar-cell ar-cell--end" style={{ width: `${columnWidths.debit}px`, flexShrink: 0 }}>
                    {!isHeader && (
                        <span style={{ color: isCogsRow ? '#dc2626' : (debit > 0 ? '#dc2626' : 'inherit') }}>
                            {debit > 0 ? formatCurrency(debit) : ''}
                        </span>
                    )}
                </div>
                <div className="ar-cell ar-cell--end" style={{ width: `${columnWidths.credit}px`, flexShrink: 0 }}>
                    {!isHeader && (
                        <span style={{ color: credit > 0 ? '#16a34a' : 'inherit' }}>
                            {credit > 0 ? formatCurrency(credit) : ''}
                        </span>
                    )}
                </div>
                <div className="ar-cell ar-cell--end" style={{ width: `${columnWidths.balance}px`, flexShrink: 0 }}>
                    {!isHeader && (
                        <span style={{ color: isCogsRow ? '#dc2626' : textColor }}>
                            {formatCurrency(account.closingBalance || 0)}
                        </span>
                    )}
                </div>
                <div className="ar-cell ar-cell--center" style={{ width: `${columnWidths.type}px`, flexShrink: 0 }}>
                    {!isHeader && account.balanceType && (
                        <span className={`ar-balance-badge ar-balance-${account.balanceType?.toLowerCase() || 'cr'}`}>
                            {account.balanceType}
                        </span>
                    )}
                </div>
            </div>
        );
    });

    // ============================================================
    // COGS Render
    // ============================================================
    const renderCogs = () => {
        const p = reportData.periodicCogsDetails;
        if (!p) {
            return <div className="ar-state"><h3>No COGS data available</h3></div>;
        }

        return (
            <div className="ar-report-container">
                <div className="ar-report-header">
                    <div className="ar-report-title-section">
                        <h3>{reportData.reportName || 'Cost of Goods Sold'}</h3>
                        <div className="ar-report-meta">
                            <span className="ar-meta-item">
                                <i className="bi bi-calendar3 me-1" />
                                As On: {reportData.isNepaliFormat ? reportData.asOnDateNepali : formatDateDisplay(reportData.asOnDate, 'english')}
                            </span>
                            <span className="ar-meta-item">
                                <i className="bi bi-building me-1" />
                                {reportData.fiscalYear?.name || 'N/A'}
                            </span>
                        </div>
                    </div>
                </div>

                <div style={{ padding: '0 12px 12px', overflow: 'auto', flex: 1 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                            <tr style={{ background: '#f1f5f9' }}>
                                <th style={{ border: '1px solid #cbd5e1', padding: '6px 8px', textAlign: 'left' }}>Particulars</th>
                                <th style={{ border: '1px solid #cbd5e1', padding: '6px 8px', textAlign: 'right', width: 180 }}>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style={{ border: '1px solid #e2e8f0', padding: '6px 8px' }}>Opening Stock</td>
                                <td style={{ border: '1px solid #e2e8f0', padding: '6px 8px', textAlign: 'right' }}>{formatCurrency(p.openingStock)}</td>
                            </tr>
                            <tr>
                                <td style={{ border: '1px solid #e2e8f0', padding: '6px 8px' }}>Add: Purchases</td>
                                <td style={{ border: '1px solid #e2e8f0', padding: '6px 8px', textAlign: 'right' }}>{formatCurrency(p.purchases)}</td>
                            </tr>
                            <tr>
                                <td style={{ border: '1px solid #e2e8f0', padding: '6px 8px' }}>Add: Direct Expenses</td>
                                <td style={{ border: '1px solid #e2e8f0', padding: '6px 8px', textAlign: 'right' }}>{formatCurrency(p.directExpenses)}</td>
                            </tr>
                            <tr>
                                <td style={{ border: '1px solid #e2e8f0', padding: '6px 8px' }}>Less: Closing Stock</td>
                                <td style={{ border: '1px solid #e2e8f0', padding: '6px 8px', textAlign: 'right', color: '#dc2626' }}>
                                    ({formatCurrency(p.closingStock)})
                                </td>
                            </tr>
                            <tr style={{ background: '#e9ecef', fontWeight: 700 }}>
                                <td style={{ border: '1px solid #94a3b8', padding: '8px' }}>Total COGS</td>
                                <td style={{ border: '1px solid #94a3b8', padding: '8px', textAlign: 'right', color: '#dc2626' }}>
                                    {formatCurrency(p.totalCogs)}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className="ar-summary-cards">
                    <div className="ar-summary-card">
                        <div className="ar-summary-label">Opening Stock</div>
                        <div className="ar-summary-value">{formatCurrency(p.openingStock)}</div>
                    </div>
                    <div className="ar-summary-card">
                        <div className="ar-summary-label">Purchases</div>
                        <div className="ar-summary-value">{formatCurrency(p.purchases)}</div>
                    </div>
                    <div className="ar-summary-card">
                        <div className="ar-summary-label">Direct Expenses</div>
                        <div className="ar-summary-value">{formatCurrency(p.directExpenses)}</div>
                    </div>
                    <div className="ar-summary-card">
                        <div className="ar-summary-label">Closing Stock</div>
                        <div className="ar-summary-value ar-text-dr">{formatCurrency(p.closingStock)}</div>
                    </div>
                    <div className="ar-summary-card" style={{ background: '#fef2f2', borderColor: '#fecaca' }}>
                        <div className="ar-summary-label">COGS</div>
                        <div className="ar-summary-value ar-text-dr" style={{ fontWeight: 700 }}>{formatCurrency(p.totalCogs)}</div>
                    </div>
                </div>
            </div>
        );
    };

    const renderClosingTbDetailed = () => {
        const { accountDetails } = reportData;
        // if (!accountDetails || accountDetails.length === 0) {
        //     return <div className="ar-state"><h3>No data</h3></div>;
        // }

        let openingDr = 0, openingCr = 0;
        let detailDr = 0, detailCr = 0;
        let closingDr = 0, closingCr = 0;

        accountDetails.forEach(a => {
            const opType = a.openingBalanceType || a.balanceType || 'Cr';
            if (opType === 'Dr') openingDr += a.openingBalance || 0;
            else openingCr += a.openingBalance || 0;

            detailDr += a.detailDebit || 0;
            detailCr += a.detailCredit || 0;

            if (a.balanceType === 'Dr') closingDr += a.closingBalance || 0;
            else closingCr += a.closingBalance || 0;
        });

        const openingNet = openingDr - openingCr;
        const openingDrNet = openingNet > 0 ? openingNet : 0;
        const openingCrNet = openingNet < 0 ? Math.abs(openingNet) : 0;

        const detailNet = detailDr - detailCr;
        const detailDrNet = detailNet > 0 ? detailNet : 0;
        const detailCrNet = detailNet < 0 ? Math.abs(detailNet) : 0;

        const closingNet = closingDr - closingCr;
        const closingDrNet = closingNet > 0 ? closingNet : 0;
        const closingCrNet = closingNet < 0 ? Math.abs(closingNet) : 0;

        const colWidths = {
            accountName: '30%',
            group: '20%',
            opening: '14%',
            debit: '12%',
            credit: '12%',
            closing: '12%'
        };

        return (
            <div className="ar-report-container">
                <div className="ar-report-header">
                    <div className="ar-report-title-section">
                        <h3>{reportData.reportName} — Detailed</h3>
                        <div className="ar-report-meta">
                            <span className="ar-meta-item">
                                <i className="bi bi-calendar3 me-1" />
                                As On: {reportData.isNepaliFormat ? reportData.asOnDateNepali : formatDateDisplay(reportData.asOnDate, 'english')}
                            </span>
                            <span className="ar-meta-item">
                                <i className="bi bi-building me-1" />
                                {reportData.fiscalYear?.name || 'N/A'}
                            </span>
                        </div>
                    </div>
                    <div className="ar-report-actions">
                        <button
                            className="ar-btn-icon"
                            onClick={() => setClosingTbView('summary')}
                            style={{
                                background: '#2563eb',
                                color: '#fff',
                                border: '1px solid #cbd5e1'
                            }}
                        >
                            <i className="bi bi-arrow-left me-1" /> Summary
                        </button>
                    </div>
                </div>

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    height: '28px',
                    background: '#f1f5f9',
                    borderBottom: '2px solid var(--ar-border-strong)',
                    userSelect: 'none',
                    flexShrink: 0
                }}>
                    <div style={{ width: colWidths.accountName, padding: '0 4px', borderRight: '1px solid var(--ar-border)', fontSize: '0.65rem', color: 'var(--ar-muted)', textTransform: 'uppercase', letterSpacing: '0.03em', fontWeight: 600, display: 'flex', alignItems: 'center', height: '100%' }}>Account Name</div>
                    <div style={{ width: colWidths.group, padding: '0 4px', borderRight: '1px solid var(--ar-border)', fontSize: '0.65rem', color: 'var(--ar-muted)', textTransform: 'uppercase', letterSpacing: '0.03em', fontWeight: 600, display: 'flex', alignItems: 'center', height: '100%' }}>Group</div>
                    <div style={{ width: colWidths.opening, padding: '0 4px', borderRight: '1px solid var(--ar-border)', fontSize: '0.65rem', color: 'var(--ar-muted)', textTransform: 'uppercase', letterSpacing: '0.03em', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>Opening</div>
                    <div style={{ width: colWidths.debit, padding: '0 4px', borderRight: '1px solid var(--ar-border)', fontSize: '0.65rem', color: 'var(--ar-muted)', textTransform: 'uppercase', letterSpacing: '0.03em', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>Debit</div>
                    <div style={{ width: colWidths.credit, padding: '0 4px', borderRight: '1px solid var(--ar-border)', fontSize: '0.65rem', color: 'var(--ar-muted)', textTransform: 'uppercase', letterSpacing: '0.03em', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>Credit</div>
                    <div style={{ width: colWidths.closing, padding: '0 4px', fontSize: '0.65rem', color: 'var(--ar-muted)', textTransform: 'uppercase', letterSpacing: '0.03em', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>Closing</div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0 }}>
                    {accountDetails.map((a, i) => (
                        <div
                            key={a.accountId || i}
                            className="ar-row"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                height: '28px',
                                background: i % 2 === 0 ? '#f8fafc' : 'white',
                                borderBottom: '1px solid #e2e8f0'
                            }}
                        >
                            <div style={{ width: colWidths.accountName, padding: '0 4px', borderRight: '1px solid var(--ar-border)', fontSize: '0.7rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', height: '100%' }} title={a.accountName}>
                                {a.accountName}
                            </div>
                            <div style={{ width: colWidths.group, padding: '0 4px', borderRight: '1px solid var(--ar-border)', fontSize: '0.7rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', height: '100%' }} title={a.accountGroupName}>
                                {a.accountGroupName}
                            </div>
                            <div style={{ width: colWidths.opening, padding: '0 4px', borderRight: '1px solid var(--ar-border)', fontSize: '0.7rem', textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                                {formatCurrency(a.openingBalance || 0)}
                                <span style={{ color: '#94a3b8', marginLeft: 4 }}>
                                    {a.openingBalanceType || a.balanceType}
                                </span>
                            </div>
                            <div style={{ width: colWidths.debit, padding: '0 4px', borderRight: '1px solid var(--ar-border)', fontSize: '0.7rem', textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                                {a.detailDebit > 0 ? formatCurrency(a.detailDebit) : ''}
                            </div>
                            <div style={{ width: colWidths.credit, padding: '0 4px', borderRight: '1px solid var(--ar-border)', fontSize: '0.7rem', textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                                {a.detailCredit > 0 ? formatCurrency(a.detailCredit) : ''}
                            </div>
                            <div style={{ width: colWidths.closing, padding: '0 4px', fontSize: '0.7rem', textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                                {formatCurrency(a.closingBalance || 0)}
                                <span style={{ color: '#94a3b8', marginLeft: 4 }}>{a.balanceType}</span>
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    height: '32px',
                    background: '#e9ecef',
                    borderTop: '2px solid #94a3b8',
                    fontWeight: 700,
                    flexShrink: 0
                }}>
                    <div style={{ width: `calc(${colWidths.accountName} + ${colWidths.group})`, padding: '0 4px', borderRight: '1px solid #94a3b8', fontSize: '0.7rem', display: 'flex', alignItems: 'center', height: '100%' }}>
                        Total
                    </div>
                    <div style={{ width: colWidths.opening, padding: '0 4px', borderRight: '1px solid #94a3b8', fontSize: '0.7rem', textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                        {openingDrNet > 0 && <>{formatCurrency(openingDrNet)} <span style={{ color: '#64748b' }}>Dr</span></>}
                        {openingCrNet > 0 && <>{formatCurrency(openingCrNet)} <span style={{ color: '#64748b' }}>Cr</span></>}
                        {openingDrNet === 0 && openingCrNet === 0 && '0.00'}
                    </div>
                    <div style={{ width: colWidths.debit, padding: '0 4px', borderRight: '1px solid #94a3b8', fontSize: '0.7rem', textAlign: 'right', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                        {detailDr > 0 ? formatCurrency(detailDr) : ''}
                    </div>
                    <div style={{ width: colWidths.credit, padding: '0 4px', borderRight: '1px solid #94a3b8', fontSize: '0.7rem', textAlign: 'right', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                        {detailCr > 0 ? formatCurrency(detailCr) : ''}
                    </div>
                    <div style={{ width: colWidths.closing, padding: '0 4px', fontSize: '0.7rem', textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                        {closingDrNet > 0 && <>{formatCurrency(closingDrNet)} <span style={{ color: '#64748b' }}>Dr</span></>}
                        {closingCrNet > 0 && <>{formatCurrency(closingCrNet)} <span style={{ color: '#64748b' }}>Cr</span></>}
                        {closingDrNet === 0 && closingCrNet === 0 && '0.00'}
                    </div>
                </div>
            </div>
        );
    };

    // ============================================================
    // Standard render (TB / P&L / Balance Sheet)
    // ============================================================
    const renderStandardReport = () => {
        const { accountDetails, summary } = reportData;
        const isBalanceSheet = reportData.reportType === 'BalanceSheet';
        const isPAndL = reportData.reportType === 'ProfitAndLoss';
        const isTbTab = activeTab === 'closingTrialBalance';

        let totalDebit = 0;
        let totalCredit = 0;

        const accountsWithCalculations = accountDetails?.map(account => {
            let debit = account.debit || 0;
            let credit = account.credit || 0;

            if (isBalanceSheet) {
                if (account.balanceType === 'Dr') debit = account.closingBalance;
                else credit = account.closingBalance;
            }

            if (isPAndL) {
                if (account.accountType === 'Income') { credit = account.closingBalance; debit = 0; }
                else if (account.accountType === 'Expense') { debit = account.closingBalance; credit = 0; }
            }

            totalDebit += debit || 0;
            totalCredit += credit || 0;
            return { ...account, calculatedDebit: debit, calculatedCredit: credit };
        });

        const totalWidth = Object.values(columnWidths).reduce((a, b) => a + b, 0);

        return (
            <div className="ar-report-container">
                <div className="ar-report-header">
                    <div className="ar-report-title-section">
                        <h3>{reportData.reportName}</h3>
                        <div className="ar-report-meta">
                            <span className="ar-meta-item">
                                <i className="bi bi-calendar3 me-1" />
                                As On: {reportData.isNepaliFormat ? reportData.asOnDateNepali : formatDateDisplay(reportData.asOnDate, 'english')}
                            </span>
                            <span className="ar-meta-item">
                                <i className="bi bi-clock me-1" />
                                Generated: {reportData.isNepaliFormat ? reportData.generatedDateNepali : new Date(reportData.generatedDate).toLocaleDateString('en-IN')}
                            </span>
                            <span className="ar-meta-item">
                                <i className="bi bi-building me-1" />
                                {reportData.fiscalYear?.name || 'N/A'}
                            </span>
                            <span className={`ar-meta-item ar-status-${reportData.summary?.isBalanced ? 'balanced' : 'unbalanced'}`}>
                                {reportData.summary?.isBalanced ? '✅ Balanced' : '⚠️ Unbalanced'}
                            </span>
                        </div>
                    </div>

                    {/* ✅ Trial Balance controls: Pre/Post-Closing + Summary/Detailed */}
                    {isTbTab && (
                        <div className="ar-report-actions" style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {/* Pre/Post-Closing toggle */}
                            <div style={{ display: 'flex', gap: 4, paddingRight: 8, borderRight: '1px solid var(--ar-border)' }}>
                                <button
                                    className="ar-btn-icon"
                                    onClick={() => handleTbModeChange('pre-closing')}
                                    style={{
                                        background: tbMode === 'pre-closing' ? '#2563eb' : '#fff',
                                        color: tbMode === 'pre-closing' ? '#fff' : '#475569',
                                        border: '1px solid #cbd5e1'
                                    }}
                                >
                                    Pre-Closing
                                </button>
                                <button
                                    className="ar-btn-icon"
                                    onClick={() => handleTbModeChange('post-closing')}
                                    style={{
                                        background: tbMode === 'post-closing' ? '#2563eb' : '#fff',
                                        color: tbMode === 'post-closing' ? '#fff' : '#475569',
                                        border: '1px solid #cbd5e1'
                                    }}
                                >
                                    Post-Closing
                                </button>
                            </div>

                            {/* Summary/Detailed toggle */}
                            <button
                                className="ar-btn-icon"
                                onClick={() => setClosingTbView('summary')}
                                style={{
                                    background: closingTbView === 'summary' ? '#2563eb' : '#fff',
                                    color: closingTbView === 'summary' ? '#fff' : '#475569',
                                    border: '1px solid #cbd5e1'
                                }}
                            >
                                Summary
                            </button>
                            <button
                                className="ar-btn-icon"
                                onClick={() => setClosingTbView('detailed')}
                                style={{
                                    background: closingTbView === 'detailed' ? '#2563eb' : '#fff',
                                    color: closingTbView === 'detailed' ? '#fff' : '#475569',
                                    border: '1px solid #cbd5e1'
                                }}
                            >
                                Detailed
                            </button>
                        </div>
                    )}
                </div>

                <div className="ar-table-wrap" ref={tableBodyRef}>
                    <AutoSizer>
                        {({ height, width }) => (
                            <div style={{ position: 'relative', height: height, width: Math.max(width, totalWidth) }}>
                                <TableHeader />
                                <List
                                    height={height - 28}
                                    itemCount={accountsWithCalculations?.length || 0}
                                    itemSize={28}
                                    width={Math.max(width, totalWidth)}
                                    itemData={{
                                        accounts: accountsWithCalculations || [],
                                        formatCurrency,
                                        renderAccountTypeBadge,
                                        isBalanceSheet,
                                        isPAndL,
                                        onCogsClick: () => {
                                            setActiveTab('cogs');
                                            setReportData(null);
                                        }
                                    }}
                                >
                                    {TableRow}
                                </List>
                            </div>
                        )}
                    </AutoSizer>
                </div>

                {summary && (
                    <div className="ar-summary-cards">
                        <div className="ar-summary-card">
                            <div className="ar-summary-label">Total Debit</div>
                            <div className="ar-summary-value ar-text-dr">{formatCurrency(summary.totalDebit || 0)}</div>
                        </div>
                        <div className="ar-summary-card">
                            <div className="ar-summary-label">Total Credit</div>
                            <div className="ar-summary-value ar-text-cr">{formatCurrency(summary.totalCredit || 0)}</div>
                        </div>
                        {summary.netProfit !== undefined && (
                            <div className="ar-summary-card">
                                <div className="ar-summary-label">Net Profit/Loss</div>
                                <div className={`ar-summary-value ${summary.netProfit >= 0 ? 'ar-text-cr' : 'ar-text-dr'}`}>
                                    {formatCurrency(summary.netProfit)}
                                </div>
                            </div>
                        )}
                        {summary.totalAssets !== undefined && (
                            <div className="ar-summary-card">
                                <div className="ar-summary-label">Total Assets</div>
                                <div className="ar-summary-value ar-text-dr">{formatCurrency(summary.totalAssets || 0)}</div>
                            </div>
                        )}
                        {summary.totalLiabilities !== undefined && (
                            <div className="ar-summary-card">
                                <div className="ar-summary-label">Total Liabilities</div>
                                <div className="ar-summary-value ar-text-cr">{formatCurrency(summary.totalLiabilities || 0)}</div>
                            </div>
                        )}
                        {summary.totalEquity !== undefined && (
                            <div className="ar-summary-card">
                                <div className="ar-summary-label">Total Equity</div>
                                <div className="ar-summary-value ar-text-cr">{formatCurrency(summary.totalEquity || 0)}</div>
                            </div>
                        )}
                        <div className="ar-summary-card">
                            <div className="ar-summary-label">Status</div>
                            <div className={`ar-summary-value ${summary.isBalanced ? 'ar-text-success' : 'ar-text-danger'}`}>
                                {summary.isBalanced ? '✅ Balanced' : '⚠️ Unbalanced'}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderReportContent = () => {
        if (loading) {
            return (
                <div className="ar-state">
                    <div className="spinner-border text-primary" />
                    <p>Generating report...</p>
                </div>
            );
        }

        if (error) {
            return (
                <div className="ar-state">
                    <i className="bi bi-exclamation-triangle" style={{ fontSize: '2rem', color: '#dc3545' }} />
                    <h3>Error</h3>
                    <p>{error}</p>
                    <button className="btn btn-primary btn-sm" onClick={generateReport}>
                        <i className="bi bi-arrow-clockwise me-2" />Retry
                    </button>
                </div>
            );
        }

        if (!reportData) {
            return (
                <div className="ar-state">
                    <FiCalendar size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                    <h3>No Report Generated</h3>
                    <p>Select a date and click Generate to view the report</p>
                </div>
            );
        }

        if (activeTab === 'cogs') return renderCogs();
        if (activeTab === 'closingTrialBalance' && closingTbView === 'detailed') return renderClosingTbDetailed();
        return renderStandardReport();
    };

    return (
        <div className="ar-page">
            <Header />

            <div className="ar-shell">
                {/* Top Bar */}
                <div className="ar-topbar">
                    <div className="ar-topbar-left">
                        <div className="ar-topbar-icon"><FiFileText /></div>
                        <div>
                            <h1>Audit Reports</h1>
                            <span className="ar-subtitle">Financial statements and trial balances</span>
                        </div>
                    </div>
                </div>

                {/* Tabs + Controls on the SAME ROW */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        flexWrap: 'nowrap',
                        overflowX: 'auto',
                        background: 'var(--ar-card)',
                        border: '1px solid var(--ar-border)',
                        borderRadius: 'var(--ar-radius)',
                        padding: '0.25rem 0.4rem',
                        flexShrink: 0
                    }}
                >
                    {/* Tabs */}
                    <div
                        className="ar-tabs"
                        style={{
                            display: 'flex',
                            gap: '0.25rem',
                            flex: 1,
                            minWidth: 0,
                            border: 'none',
                            background: 'transparent',
                            padding: 0,
                            overflowX: 'auto'
                        }}
                    >
                        {reportTabs.map(tab => (
                            <button
                                key={tab.id}
                                className={`ar-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                                onClick={() => handleTabChange(tab.id)}
                            >
                                <i className={`${tab.icon} me-2`} />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div style={{ width: 1, height: 24, background: 'var(--ar-border-strong)', flexShrink: 0 }} />

                    {/* As On Date */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                        <label
                            style={{
                                fontSize: '0.68rem',
                                fontWeight: 600,
                                color: 'var(--ar-muted)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.03em',
                                margin: 0,
                                whiteSpace: 'nowrap'
                            }}
                        >
                            <FiCalendar className="me-1" style={{ marginRight: 4 }} />
                            As On
                        </label>

                        {companyDateFormat === 'nepali' ? (
                            <>
                                <input
                                    type="text"
                                    id="asOnDate"
                                    ref={asOnDateRef}
                                    className={`ar-date-input ${dateErrors.asOnDate ? 'is-invalid' : ''}`}
                                    value={asOnDate}
                                    onChange={handleDateChange}
                                    onKeyDown={(e) => handleKeyDown(e, 'asOnDateAd')}
                                    onBlur={(e) => {
                                        const d = e.target.value.trim();
                                        if (!d) return;
                                        const c = validateAndCorrectNepaliDate(d);
                                        if (!c) {
                                            const ad = convertBsToAd(currentNepaliDate);
                                            setAsOnDate(currentNepaliDate);
                                            setAsOnDateAd(ad);
                                            setNotification({
                                                show: true,
                                                message: 'Invalid Nepali date. Auto-corrected.',
                                                type: 'warning',
                                                duration: 3000
                                            });
                                        }
                                    }}
                                    placeholder="YYYY-MM-DD"
                                    autoComplete="off"
                                    autoFocus
                                />
                                <input
                                    type="date"
                                    id="asOnDateAd"
                                    className="ar-date-input ar-date-input-ad"
                                    value={asOnDateAd}
                                    onChange={handleDateAdChange}
                                    onKeyDown={(e) => handleKeyDown(e, 'generateReport')}
                                />
                            </>
                        ) : (
                            <input
                                type="date"
                                id="asOnDate"
                                ref={asOnDateRef}
                                className="ar-date-input"
                                value={asOnDate}
                                onChange={handleDateChange}
                                onKeyDown={(e) => handleKeyDown(e, 'generateReport')}
                                autoFocus
                            />
                        )}
                    </div>

                    {/* Generate */}
                    <button
                        id="generateReport"
                        ref={generateReportRef}
                        className="ar-btn-gen"
                        onClick={generateReport}
                        disabled={loading}
                    >
                        {loading ? (
                            <><span className="spinner-border spinner-border-sm me-2" style={{ width: 12, height: 12 }} /> Generating...</>
                        ) : (
                            <><FiSearch className="me-1" /> Generate</>
                        )}
                    </button>

                    {/* Print */}
                    <button className="ar-btn-gen" onClick={handlePrint} disabled={!reportData}>
                        <FiPrinter size={14} /> Print
                    </button>

                    {/* Reset columns */}
                    <button className="ar-btn-gen" onClick={resetColumnWidths} title="Reset column widths">
                        <FiRefreshCw size={14} />
                    </button>
                </div>

                {/* Report Content */}
                <div className="ar-main">
                    {renderReportContent()}
                </div>
            </div>

            {showProductModal && <ProductModal onClose={() => setShowProductModal(false)} />}
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

export default AuditReport;