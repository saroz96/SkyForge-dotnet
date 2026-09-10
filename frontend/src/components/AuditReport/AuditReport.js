// // components/AuditReport/AuditReport.jsx
// import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
// import { useNavigate } from 'react-router-dom';
// import NepaliDate from 'nepali-datetime';
// import api from '../../components/services/api';
// import Header from '../retailer/Header';
// import NotificationToast from '../NotificationToast';
// import Loader from '../Loader';
// import { FixedSizeList as List } from 'react-window';
// import AutoSizer from 'react-virtualized-auto-sizer';
// import { FiFileText, FiPrinter, FiSearch, FiRefreshCw, FiCalendar, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
// import './AuditReport.css';
// import ProductModal from '../retailer/dashboard/modals/ProductModal';

// // Helper functions
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
//         let date;
//         if (typeof adDate === 'string') {
//             if (/^\d{4}-\d{2}-\d{2}$/.test(adDate)) {
//                 date = new Date(adDate + 'T00:00:00');
//             } else {
//                 date = new Date(adDate);
//             }
//         } else if (adDate instanceof Date) {
//             date = adDate;
//         } else { return null; }
//         if (isNaN(date.getTime())) return null;
//         const nepaliDate = new NepaliDate(date);
//         return `${nepaliDate.getYear()}-${String(nepaliDate.getMonth() + 1).padStart(2, '0')}-${String(nepaliDate.getDate()).padStart(2, '0')}`;
//     } catch (error) {
//         console.error('Error converting AD to BS:', error);
//         return null;
//     }
// };

// const formatCurrency = (num) => {
//     const number = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num) || 0;
//     return number.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// };

// const formatDateDisplay = (date, format) => {
//     if (!date) return '';
//     if (format === 'nepali') return date;
//     try {
//         const d = new Date(date);
//         return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: '2-digit' });
//     } catch {
//         return date;
//     }
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
//         const correctedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
//         return isValidNepaliDate(correctedDate) ? correctedDate : null;
//     }
//     return null;
// };

// const AuditReport = () => {
//     const navigate = useNavigate();
//     const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
//     const currentEnglishDate = new Date().toISOString().split('T')[0];

//     const [loading, setLoading] = useState(false);
//     const [reportData, setReportData] = useState(null);
//     const [activeTab, setActiveTab] = useState('openingTrialBalance');
//     const [error, setError] = useState(null);
//     const [companyDateFormat, setCompanyDateFormat] = useState('english');
//     const [asOnDate, setAsOnDate] = useState(currentNepaliDate);
//     const [asOnDateAd, setAsOnDateAd] = useState(currentEnglishDate);
//     const [dateErrors, setDateErrors] = useState({ asOnDate: '' });
//     const [notification, setNotification] = useState({
//         show: false,
//         message: '',
//         type: 'success',
//         duration: 3000
//     });
//     const [isPrinting, setIsPrinting] = useState(false);
//     const [showProductModal, setShowProductModal] = useState(false);
//     const [columnWidths, setColumnWidths] = useState({
//         accountName: 200,
//         accountGroup: 150,
//         debit: 100,
//         credit: 100,
//         balance: 100,
//         type: 60
//     });

//     const [isResizing, setIsResizing] = useState(false);
//     const [resizingColumn, setResizingColumn] = useState(null);
//     const [startX, setStartX] = useState(0);
//     const [startWidth, setStartWidth] = useState(0);

//     const asOnDateRef = useRef(null);
//     const generateReportRef = useRef(null);
//     const tableBodyRef = useRef(null);

//     // Report tabs configuration
//     const reportTabs = [
//         { id: 'openingTrialBalance', label: 'Opening Trial Balance', icon: 'bi-journal-text' },
//         { id: 'closingTrialBalance', label: 'Closing Trial Balance', icon: 'bi-journal-check' },
//         { id: 'profitAndLoss', label: 'Profit & Loss Account', icon: 'bi-graph-up' },
//         { id: 'balanceSheet', label: 'Balance Sheet', icon: 'bi-building' },
//         { id: 'comprehensive', label: 'Comprehensive Report', icon: 'bi-file-earmark-text' }
//     ];

//     // Fetch initial data
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

//     // Generate report on tab change or date change
//     useEffect(() => {
//         if (asOnDate) {
//             const timer = setTimeout(() => {
//                 generateReport();
//             }, 300);
//             return () => clearTimeout(timer);
//         }
//     }, [activeTab, asOnDate]);

//     // Save/load column widths
//     useEffect(() => {
//         const savedWidths = localStorage.getItem('auditReportColumnWidths');
//         if (savedWidths) try { setColumnWidths(JSON.parse(savedWidths)); } catch (e) {}
//     }, []);
//     useEffect(() => localStorage.setItem('auditReportColumnWidths', JSON.stringify(columnWidths)), [columnWidths]);

//     const generateReport = async () => {
//         try {
//             setLoading(true);
//             setError(null);

//             let endpoint = '';
//             const asOnDateParam = companyDateFormat === 'nepali' ? asOnDateAd : asOnDate;

//             switch (activeTab) {
//                 case 'openingTrialBalance':
//                     endpoint = '/api/audit/opening-trial-balance';
//                     break;
//                 case 'closingTrialBalance':
//                     endpoint = '/api/audit/closing-trial-balance';
//                     break;
//                 case 'profitAndLoss':
//                     endpoint = '/api/audit/profit-and-loss';
//                     break;
//                 case 'balanceSheet':
//                     endpoint = '/api/audit/balance-sheet';
//                     break;
//                 case 'comprehensive':
//                     endpoint = '/api/audit/comprehensive';
//                     break;
//                 default:
//                     endpoint = '/api/audit/opening-trial-balance';
//             }

//             const params = new URLSearchParams();
//             if (asOnDateParam) {
//                 params.append('asOnDate', asOnDateParam);
//             }

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
//             if (adDate) {
//                 setAsOnDateAd(adDate);
//             }
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
//         if (bsDate) {
//             setAsOnDate(bsDate);
//         }
//     };

//     const handleKeyDown = (e, nextFieldId) => {
//         if (e.key === 'Enter') {
//             e.preventDefault();
//             if (nextFieldId) document.getElementById(nextFieldId)?.focus();
//         }
//     };

//     const handlePrint = () => {
//         if (!reportData) return;
//         setIsPrinting(true);

//         const printWindow = window.open('', '_blank');
//         const content = generatePrintContent(reportData);

//         printWindow.document.write(content);
//         printWindow.document.close();

//         setTimeout(() => {
//             printWindow.print();
//             setIsPrinting(false);
//         }, 500);
//     };

//     const handleTabChange = (tabId) => {
//         setActiveTab(tabId);
//     };

//     const resetColumnWidths = () => {
//         setColumnWidths({
//             accountName: 200,
//             accountGroup: 150,
//             debit: 100,
//             credit: 100,
//             balance: 100,
//             type: 60
//         });
//         setNotification({
//             show: true,
//             message: 'Column widths reset',
//             type: 'success',
//             duration: 2000
//         });
//     };

//     const generatePrintContent = (data) => {
//         const companyName = data.company?.name || 'Company Name';
//         const companyAddress = data.company?.address || '';
//         const companyCity = data.company?.city || '';
//         const companyPan = data.company?.pan || '';
//         const companyPhone = data.company?.phone || '';
//         const reportName = data.reportName || 'Audit Report';
//         const asOnDateDisplay = data.isNepaliFormat ? data.asOnDateNepali : formatDateDisplay(data.asOnDate, 'english');
//         const generatedDate = data.isNepaliFormat ? data.generatedDateNepali : new Date().toLocaleDateString('en-IN');

//         let tableRows = '';
//         let totalDebit = 0;
//         let totalCredit = 0;

//         if (data.accountDetails && data.accountDetails.length > 0) {
//             data.accountDetails.forEach((account, index) => {
//                 const isBalanceSheet = data.reportType === 'BalanceSheet';
//                 const isPAndL = data.reportType === 'ProfitAndLoss';

//                 let debit = account.debit || 0;
//                 let credit = account.credit || 0;

//                 if (isBalanceSheet) {
//                     if (account.balanceType === 'Dr') {
//                         debit = account.closingBalance;
//                     } else {
//                         credit = account.closingBalance;
//                     }
//                 }

//                 if (isPAndL) {
//                     if (account.accountType === 'Income') {
//                         credit = account.closingBalance;
//                     } else if (account.accountType === 'Expense') {
//                         debit = account.closingBalance;
//                     }
//                 }

//                 totalDebit += debit || 0;
//                 totalCredit += credit || 0;

//                 const isBold = index === 0 || account.accountGroupName?.includes('Total');

//                 tableRows += `
//                     <tr${isBold ? ' style="font-weight:bold"' : ''}>
//                         <td>${account.accountName || 'N/A'}</td>
//                         <td>${account.accountGroupName || 'N/A'}</td>
//                         <td class="text-end">${(debit || 0).toFixed(2)}</td>
//                         <td class="text-end">${(credit || 0).toFixed(2)}</td>
//                         <td class="text-end">${(account.closingBalance || 0).toFixed(2)}</td>
//                         <td class="text-center">${account.balanceType || 'Cr'}</td>
//                     </tr>
//                 `;
//             });
//         }

//         return `
//             <!DOCTYPE html>
//             <html>
//             <head>
//                 <title>${reportName}</title>
//                 <style>
//                     @page { margin: 8mm; size: A4 landscape; }
//                     body { 
//                         font-family: 'Arial Narrow', Arial, sans-serif;
//                         font-size: 8pt;
//                         line-height: 1.3;
//                         color: #000;
//                         background: white;
//                         margin: 0;
//                         padding: 0;
//                     }
//                     .print-container {
//                         width: 100%;
//                         max-width: 297mm;
//                         margin: 0 auto;
//                         padding: 3mm;
//                     }
//                     .print-header {
//                         text-align: center;
//                         border-bottom: 2px solid #000;
//                         padding-bottom: 3mm;
//                         margin-bottom: 4mm;
//                     }
//                     .print-company-name {
//                         font-size: 16pt;
//                         font-weight: bold;
//                         letter-spacing: 1px;
//                     }
//                     .print-company-details {
//                         font-size: 8pt;
//                         margin: 1mm 0;
//                     }
//                     .print-report-title {
//                         font-size: 12pt;
//                         font-weight: bold;
//                         text-decoration: underline;
//                         text-transform: uppercase;
//                         letter-spacing: 1px;
//                         margin: 2mm 0;
//                     }
//                     .print-report-details {
//                         display: flex;
//                         justify-content: space-between;
//                         font-size: 8pt;
//                         margin: 2mm 0;
//                     }
//                     .print-table {
//                         width: 100%;
//                         border-collapse: collapse;
//                         margin: 3mm 0;
//                         font-size: 7pt;
//                     }
//                     .print-table thead tr {
//                         border-top: 1px solid #000;
//                         border-bottom: 1px solid #000;
//                     }
//                     .print-table th {
//                         background-color: #f0f0f0;
//                         border: 1px solid #000;
//                         padding: 1mm 2mm;
//                         text-align: left;
//                         font-weight: bold;
//                         font-size: 7pt;
//                     }
//                     .print-table td {
//                         border: 1px solid #000;
//                         padding: 1mm 2mm;
//                     }
//                     .text-end { text-align: right; }
//                     .text-center { text-align: center; }
//                     .print-summary {
//                         display: flex;
//                         justify-content: space-between;
//                         border-top: 2px solid #000;
//                         padding-top: 2mm;
//                         margin-top: 3mm;
//                         font-size: 8pt;
//                     }
//                     .print-summary-item {
//                         padding: 1mm 2mm;
//                     }
//                     .print-signature-area {
//                         display: flex;
//                         justify-content: space-between;
//                         margin-top: 6mm;
//                         font-size: 8pt;
//                     }
//                     .print-signature-box {
//                         text-align: center;
//                         width: 25%;
//                         border-top: 1px dashed #000;
//                         padding-top: 1mm;
//                     }
//                     .print-footer {
//                         text-align: center;
//                         font-size: 7pt;
//                         margin-top: 4mm;
//                         border-top: 1px solid #ccc;
//                         padding-top: 2mm;
//                     }
//                 </style>
//             </head>
//             <body>
//                 <div class="print-container">
//                     <div class="print-header">
//                         <div class="print-company-name">${companyName}</div>
//                         <div class="print-company-details">
//                             ${companyAddress}${companyCity ? ', ' + companyCity : ''}
//                             ${companyPhone ? '<br />Tel: ' + companyPhone : ''}
//                             ${companyPan ? ' | PAN: ' + companyPan : ''}
//                         </div>
//                         <div class="print-report-title">${reportName}</div>
//                     </div>

//                     <div class="print-report-details">
//                         <div><strong>Fiscal Year:</strong> ${data.fiscalYear?.name || 'N/A'}</div>
//                         <div><strong>As On Date:</strong> ${asOnDateDisplay}</div>
//                         <div><strong>Generated:</strong> ${generatedDate}</div>
//                     </div>

//                     <table class="print-table">
//                         <thead>
//                             <tr>
//                                 <th style="width:35%">Account Name</th>
//                                 <th style="width:20%">Account Group</th>
//                                 <th style="width:15%" class="text-end">Debit</th>
//                                 <th style="width:15%" class="text-end">Credit</th>
//                                 <th style="width:15%" class="text-end">Balance</th>
//                                 <th style="width:5%" class="text-center">Type</th>
//                             </tr>
//                         </thead>
//                         <tbody>
//                             ${tableRows || '<tr><td colspan="6" class="text-center">No data available</td></tr>'}
//                         </tbody>
//                         <tfoot>
//                             <tr style="font-weight:bold;border-top:2px solid #000">
//                                 <td colspan="2">Grand Total</td>
//                                 <td class="text-end">${totalDebit.toFixed(2)}</td>
//                                 <td class="text-end">${totalCredit.toFixed(2)}</td>
//                                 <td class="text-end">${Math.abs(totalDebit - totalCredit).toFixed(2)}</td>
//                                 <td class="text-center">${totalDebit >= totalCredit ? 'Dr' : 'Cr'}</td>
//                             </tr>
//                         </tfoot>
//                     </table>

//                     <div class="print-summary">
//                         <div class="print-summary-item">
//                             <strong>Total Debit:</strong> ${totalDebit.toFixed(2)}
//                         </div>
//                         <div class="print-summary-item">
//                             <strong>Total Credit:</strong> ${totalCredit.toFixed(2)}
//                         </div>
//                         <div class="print-summary-item">
//                             <strong>Difference:</strong> ${Math.abs(totalDebit - totalCredit).toFixed(2)}
//                         </div>
//                         <div class="print-summary-item">
//                             <strong>Status:</strong> ${data.summary?.isBalanced ? '✅ Balanced' : '⚠️ Unbalanced'}
//                         </div>
//                         ${data.summary?.netProfit !== undefined ? `
//                             <div class="print-summary-item">
//                                 <strong>Net Profit/Loss:</strong> ${formatCurrency(data.summary.netProfit)}
//                             </div>
//                         ` : ''}
//                     </div>

//                     <div class="print-signature-area">
//                         <div class="print-signature-box">
//                             <div style="margin-bottom:1mm;">${reportData?.payment?.user?.name || '_________________'}</div>
//                             Prepared By
//                         </div>
//                         <div class="print-signature-box">
//                             <div style="margin-bottom:1mm;">&nbsp;</div>
//                             Checked By
//                         </div>
//                         <div class="print-signature-box">
//                             <div style="margin-bottom:1mm;">&nbsp;</div>
//                             Approved By
//                         </div>
//                     </div>

//                     <div class="print-footer">
//                         This is a system-generated report. | Generated on ${new Date().toLocaleString()}
//                     </div>
//                 </div>
//             </body>
//             </html>
//         `;
//     };

//     const renderAccountTypeBadge = (type) => {
//         const colors = {
//             'Asset': 'primary',
//             'Liability': 'warning',
//             'Equity': 'success',
//             'Income': 'info',
//             'Expense': 'danger',
//             'Other': 'secondary'
//         };
//         return <span className={`badge bg-${colors[type] || 'secondary'}`}>{type || 'N/A'}</span>;
//     };

//     // Resize handle component
//     const ResizeHandle = React.memo(({ onResizeStart, left, columnName }) => (
//         <div 
//             className="ar-resize-handle" 
//             style={{ 
//                 position: 'absolute', 
//                 top: 0, 
//                 left: `${left}px`, 
//                 width: '5px', 
//                 height: '100%', 
//                 cursor: 'col-resize', 
//                 zIndex: 10 
//             }} 
//             onMouseDown={(e) => { 
//                 e.preventDefault(); 
//                 onResizeStart(e, columnName); 
//             }} 
//         />
//     ));

//     // Table Header
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

//     // Table Row
//     const TableRow = React.memo(({ index, style, data }) => {
//         const { accounts, formatCurrency, renderAccountTypeBadge, isBalanceSheet, isPAndL } = data;
//         const account = accounts[index];
//         if (!account) return null;

//         let debit = account.debit || 0;
//         let credit = account.credit || 0;

//         if (isBalanceSheet) {
//             if (account.balanceType === 'Dr') {
//                 debit = account.closingBalance;
//             } else {
//                 credit = account.closingBalance;
//             }
//         }

//         if (isPAndL) {
//             if (account.accountType === 'Income') {
//                 credit = account.closingBalance;
//                 debit = 0;
//             } else if (account.accountType === 'Expense') {
//                 debit = account.closingBalance;
//                 credit = 0;
//             }
//         }

//         const isSectionHeader = account.accountName?.toUpperCase().includes('TOTAL') || 
//                                account.accountName?.includes('===');

//         return (
//             <div 
//                 style={{ 
//                     ...style, 
//                     display: 'flex', 
//                     alignItems: 'center', 
//                     height: '28px', 
//                     borderBottom: '1px solid #e2e8f0',
//                     backgroundColor: index % 2 === 0 ? '#f8fafc' : 'white',
//                     fontWeight: isSectionHeader ? '600' : 'normal'
//                 }} 
//                 className="ar-row"
//             >
//                 <div className="ar-cell" style={{ width: `${columnWidths.accountName}px`, flexShrink: 0 }} title={account.accountName}>
//                     <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
//                         {account.accountName}
//                         {account.accountType && !isBalanceSheet && !isPAndL && (
//                             <span className="ar-account-type-badge ms-2">
//                                 {renderAccountTypeBadge(account.accountType)}
//                             </span>
//                         )}
//                     </span>
//                 </div>
//                 <div className="ar-cell" style={{ width: `${columnWidths.accountGroup}px`, flexShrink: 0 }} title={account.accountGroupName}>
//                     <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
//                         {account.accountGroupName || 'N/A'}
//                     </span>
//                 </div>
//                 <div className="ar-cell ar-cell--end" style={{ width: `${columnWidths.debit}px`, flexShrink: 0 }}>
//                     <span style={{ color: debit > 0 ? '#dc2626' : 'inherit' }}>
//                         {formatCurrency(debit)}
//                     </span>
//                 </div>
//                 <div className="ar-cell ar-cell--end" style={{ width: `${columnWidths.credit}px`, flexShrink: 0 }}>
//                     <span style={{ color: credit > 0 ? '#16a34a' : 'inherit' }}>
//                         {formatCurrency(credit)}
//                     </span>
//                 </div>
//                 <div className="ar-cell ar-cell--end" style={{ width: `${columnWidths.balance}px`, flexShrink: 0 }}>
//                     <span>{formatCurrency(account.closingBalance || 0)}</span>
//                 </div>
//                 <div className="ar-cell ar-cell--center" style={{ width: `${columnWidths.type}px`, flexShrink: 0 }}>
//                     <span className={`ar-balance-badge ar-balance-${account.balanceType?.toLowerCase() || 'cr'}`}>
//                         {account.balanceType || 'Cr'}
//                     </span>
//                 </div>
//             </div>
//         );
//     });

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

//         const { accountDetails, summary } = reportData;
//         const isBalanceSheet = reportData.reportType === 'BalanceSheet';
//         const isPAndL = reportData.reportType === 'ProfitAndLoss';

//         let totalDebit = 0;
//         let totalCredit = 0;

//         const accountsWithCalculations = accountDetails?.map(account => {
//             let debit = account.debit || 0;
//             let credit = account.credit || 0;

//             if (isBalanceSheet) {
//                 if (account.balanceType === 'Dr') {
//                     debit = account.closingBalance;
//                 } else {
//                     credit = account.closingBalance;
//                 }
//             }

//             if (isPAndL) {
//                 if (account.accountType === 'Income') {
//                     credit = account.closingBalance;
//                     debit = 0;
//                 } else if (account.accountType === 'Expense') {
//                     debit = account.closingBalance;
//                     credit = 0;
//                 }
//             }

//             totalDebit += debit || 0;
//             totalCredit += credit || 0;

//             return { ...account, calculatedDebit: debit, calculatedCredit: credit };
//         });

//         const totalWidth = Object.values(columnWidths).reduce((a, b) => a + b, 0);

//         return (
//             <div className="ar-report-container">
//                 {/* Report Header */}
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
//                     <div className="ar-report-actions">
//                         <button className="ar-btn-icon" onClick={generateReport} disabled={loading}>
//                             <FiRefreshCw size={14} /> Refresh
//                         </button>
//                         <button className="ar-btn-icon" onClick={handlePrint} disabled={isPrinting}>
//                             <FiPrinter size={14} /> {isPrinting ? 'Printing...' : 'Print'}
//                         </button>
//                         <button className="ar-btn-icon" onClick={resetColumnWidths}>
//                             <FiRefreshCw size={14} /> Reset
//                         </button>
//                     </div>
//                 </div>

//                 {/* Report Table */}
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
//                                         isPAndL
//                                     }}
//                                 >
//                                     {TableRow}
//                                 </List>
//                             </div>
//                         )}
//                     </AutoSizer>
//                 </div>

//                 {/* Summary Cards */}
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

//     return (
//         <div className="ar-page">
//             <Header />

//             <div className="ar-shell">
//                 {/* Top Bar */}
//                 <div className="ar-topbar">
//                     <div className="ar-topbar-left">
//                         <div className="ar-topbar-icon">
//                             <FiFileText />
//                         </div>
//                         <div>
//                             <h1>Audit Reports</h1>
//                             <span className="ar-subtitle">Financial statements and trial balances</span>
//                         </div>
//                     </div>
//                     <div className="ar-topbar-right">
//                         <button 
//                             className="ar-btn-icon" 
//                             onClick={() => navigate('/')}
//                         >
//                             <i className="bi bi-house me-1" /> Dashboard
//                         </button>
//                     </div>
//                 </div>

//                 {/* Tabs */}
//                 <div className="ar-tabs">
//                     {reportTabs.map(tab => (
//                         <button
//                             key={tab.id}
//                             className={`ar-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
//                             onClick={() => handleTabChange(tab.id)}
//                         >
//                             <i className={`${tab.icon} me-2`} />
//                             {tab.label}
//                         </button>
//                     ))}
//                 </div>

//                 {/* Controls */}
//                 <div className="ar-controls">
//                     <div className="ar-control-group">
//                         <label className="ar-control-label">
//                             <FiCalendar className="me-1" />
//                             As On Date
//                         </label>
//                         <div className="ar-date-inputs">
//                             {companyDateFormat === 'nepali' ? (
//                                 <>
//                                     <input
//                                         type="text"
//                                         id="asOnDate"
//                                         ref={asOnDateRef}
//                                         className={`ar-date-input ${dateErrors.asOnDate ? 'is-invalid' : ''}`}
//                                         value={asOnDate}
//                                         onChange={handleDateChange}
//                                         onKeyDown={(e) => handleKeyDown(e, 'asOnDateAd')}
//                                         onBlur={(e) => {
//                                             const d = e.target.value.trim();
//                                             if (!d) return;
//                                             const c = validateAndCorrectNepaliDate(d);
//                                             if (!c) {
//                                                 const ad = convertBsToAd(currentNepaliDate);
//                                                 setAsOnDate(currentNepaliDate);
//                                                 setAsOnDateAd(ad);
//                                                 setNotification({
//                                                     show: true,
//                                                     message: 'Invalid Nepali date. Auto-corrected.',
//                                                     type: 'warning',
//                                                     duration: 3000
//                                                 });
//                                             }
//                                         }}
//                                         placeholder="YYYY-MM-DD"
//                                         autoComplete="off"
//                                         autoFocus
//                                     />
//                                     {dateErrors.asOnDate && <div className="ar-field-error">{dateErrors.asOnDate}</div>}
//                                     <input
//                                         type="date"
//                                         id="asOnDateAd"
//                                         className="ar-date-input ar-date-input-ad"
//                                         value={asOnDateAd}
//                                         onChange={handleDateAdChange}
//                                         onKeyDown={(e) => handleKeyDown(e, 'generateReport')}
//                                     />
//                                 </>
//                             ) : (
//                                 <input
//                                     type="date"
//                                     id="asOnDate"
//                                     ref={asOnDateRef}
//                                     className="ar-date-input"
//                                     value={asOnDate}
//                                     onChange={handleDateChange}
//                                     onKeyDown={(e) => handleKeyDown(e, 'generateReport')}
//                                     autoFocus
//                                 />
//                             )}
//                         </div>
//                     </div>
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

//------------------------------------------------end1

// components/AuditReport/AuditReport.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import NepaliDate from 'nepali-datetime';
import api from '../../components/services/api';
import Header from '../retailer/Header';
import NotificationToast from '../NotificationToast';
import Loader from '../Loader';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { FiFileText, FiPrinter, FiSearch, FiRefreshCw, FiCalendar, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import './AuditReport.css';
import ProductModal from '../retailer/dashboard/modals/ProductModal';

// Helper functions
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

const formatCurrency = (num) => {
    const number = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num) || 0;
    return number.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatDateDisplay = (date, format) => {
    if (!date) return '';
    if (format === 'nepali') return date;
    try {
        const d = new Date(date);
        return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: '2-digit' });
    } catch {
        return date;
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

// Report name mapping for display
const getReportDisplayName = (tabId) => {
    const map = {
        'openingTrialBalance': 'Opening Trial Balance',
        'closingTrialBalance': 'Closing Trial Balance',
        'profitAndLoss': 'Profit & Loss Account',
        'balanceSheet': 'Balance Sheet',
        'comprehensive': 'Comprehensive Report'
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
    const [error, setError] = useState(null);
    const [companyDateFormat, setCompanyDateFormat] = useState('english');
    const [asOnDate, setAsOnDate] = useState(currentNepaliDate);
    const [asOnDateAd, setAsOnDateAd] = useState(currentEnglishDate);
    const [dateErrors, setDateErrors] = useState({ asOnDate: '' });
    const [notification, setNotification] = useState({
        show: false,
        message: '',
        type: 'success',
        duration: 3000
    });
    const [isPrinting, setIsPrinting] = useState(false);
    const [showProductModal, setShowProductModal] = useState(false);
    const [columnWidths, setColumnWidths] = useState({
        accountName: 200,
        accountGroup: 150,
        debit: 100,
        credit: 100,
        balance: 100,
        type: 60
    });

    const [isResizing, setIsResizing] = useState(false);
    const [resizingColumn, setResizingColumn] = useState(null);
    const [startX, setStartX] = useState(0);
    const [startWidth, setStartWidth] = useState(0);

    const asOnDateRef = useRef(null);
    const generateReportRef = useRef(null);
    const tableBodyRef = useRef(null);

    // Report tabs configuration
    const reportTabs = [
        { id: 'openingTrialBalance', label: 'Opening Trial Balance', icon: 'bi-journal-text' },
        { id: 'closingTrialBalance', label: 'Closing Trial Balance', icon: 'bi-journal-check' },
        { id: 'profitAndLoss', label: 'Profit & Loss Account', icon: 'bi-graph-up' },
        { id: 'balanceSheet', label: 'Balance Sheet', icon: 'bi-building' },
        { id: 'comprehensive', label: 'Comprehensive Report', icon: 'bi-file-earmark-text' }
    ];

    // Fetch initial data
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

    // Generate report on tab change or date change
    useEffect(() => {
        if (asOnDate) {
            const timer = setTimeout(() => {
                generateReport();
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [activeTab, asOnDate]);

    // Save/load column widths
    useEffect(() => {
        const savedWidths = localStorage.getItem('auditReportColumnWidths');
        if (savedWidths) try { setColumnWidths(JSON.parse(savedWidths)); } catch (e) { }
    }, []);
    useEffect(() => localStorage.setItem('auditReportColumnWidths', JSON.stringify(columnWidths)), [columnWidths]);

    const generateReport = async () => {
        try {
            setLoading(true);
            setError(null);

            let endpoint = '';
            const asOnDateParam = companyDateFormat === 'nepali' ? asOnDateAd : asOnDate;

            switch (activeTab) {
                case 'openingTrialBalance':
                    endpoint = '/api/audit/opening-trial-balance';
                    break;
                case 'closingTrialBalance':
                    endpoint = '/api/audit/closing-trial-balance';
                    break;
                case 'profitAndLoss':
                    endpoint = '/api/audit/profit-and-loss';
                    break;
                case 'balanceSheet':
                    endpoint = '/api/audit/balance-sheet';
                    break;
                case 'comprehensive':
                    endpoint = '/api/audit/comprehensive';
                    break;
                default:
                    endpoint = '/api/audit/opening-trial-balance';
            }

            const params = new URLSearchParams();
            if (asOnDateParam) {
                params.append('asOnDate', asOnDateParam);
            }

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
            if (adDate) {
                setAsOnDateAd(adDate);
            }
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
        if (bsDate) {
            setAsOnDate(bsDate);
        }
    };

    const handleKeyDown = (e, nextFieldId) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (nextFieldId) document.getElementById(nextFieldId)?.focus();
        }
    };

    // SIMPLE PRINT FUNCTION - Like your PaymentsList
    const handlePrint = () => {
        if (!reportData) {
            setNotification({
                show: true,
                message: 'Please generate a report first',
                type: 'warning'
            });
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

        let tableRows = '';
        let totalDebit = 0;
        let totalCredit = 0;

        if (data.accountDetails && data.accountDetails.length > 0) {
            data.accountDetails.forEach((account, index) => {
                let debit = account.debit || 0;
                let credit = account.credit || 0;
                let balance = account.closingBalance || 0;

                if (isBalanceSheet) {
                    if (account.balanceType === 'Dr') {
                        debit = account.closingBalance || 0;
                        credit = 0;
                    } else {
                        credit = account.closingBalance || 0;
                        debit = 0;
                    }
                    balance = account.closingBalance || 0;
                } else if (isPAndL) {
                    if (account.accountType === 'Income') {
                        credit = account.closingBalance || 0;
                        debit = 0;
                    } else if (account.accountType === 'Expense') {
                        debit = account.closingBalance || 0;
                        credit = 0;
                    }
                    balance = account.closingBalance || 0;
                }

                totalDebit += debit || 0;
                totalCredit += credit || 0;

                const isBold = index === 0 || account.accountGroupName?.includes('Total') ||
                    account.accountName?.toUpperCase().includes('TOTAL') ||
                    account.accountName?.includes('===');

                const bgColor = index % 2 === 0 ? '#ffffff' : '#f8f9fa';

                tableRows += `
                    <tr${isBold ? ' style="font-weight:bold;background-color:#f0f0f0;"' : ` style="background-color:${bgColor};"`}>
                        <td style="padding:2px 4px;border:1px solid #ddd;${isBold ? 'font-weight:bold;' : ''}">${account.accountName || 'N/A'}</td>
                        <td style="padding:2px 4px;border:1px solid #ddd;${isBold ? 'font-weight:bold;' : ''}">${account.accountGroupName || 'N/A'}</td>
                        <td style="padding:2px 4px;border:1px solid #ddd;text-align:right;${isBold ? 'font-weight:bold;' : ''}">${formatCurrency(debit)}</td>
                        <td style="padding:2px 4px;border:1px solid #ddd;text-align:right;${isBold ? 'font-weight:bold;' : ''}">${formatCurrency(credit)}</td>
                        <td style="padding:2px 4px;border:1px solid #ddd;text-align:right;${isBold ? 'font-weight:bold;' : ''}">${formatCurrency(balance)}</td>
                        <td style="padding:2px 4px;border:1px solid #ddd;text-align:center;${isBold ? 'font-weight:bold;' : ''}">${account.balanceType || 'Cr'}</td>
                    </tr>
                `;
            });
        }

        const isBalanced = data.summary?.isBalanced !== undefined ? data.summary.isBalanced : Math.abs(totalDebit - totalCredit) < 0.01;

        const printWindow = window.open('', '_blank');

        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>${reportName}</title>
                <style>
                    @page { margin: 5mm; }
                    body { 
                        font-family: 'Arial Narrow', Arial, sans-serif; 
                        font-size: 7px; 
                        margin: 0; 
                        padding: 3mm; 
                        background: white;
                    }
                    .print-header {
                        text-align: center;
                        border-bottom: 2px solid #000;
                        padding-bottom: 3mm;
                        margin-bottom: 4mm;
                    }
                    .print-company-name {
                        font-size: 14pt;
                        font-weight: bold;
                        letter-spacing: 1px;
                        text-transform: uppercase;
                    }
                    .print-company-details {
                        font-size: 7px;
                        margin: 1mm 0;
                    }
                    .print-report-title {
                        text-align: center;
                        text-decoration: underline;
                        font-size: 11px;
                        font-weight: bold;
                        margin: 2mm 0;
                    }
                    .print-report-details {
                        display: flex;
                        justify-content: space-between;
                        font-size: 7px;
                        margin: 2mm 0;
                        padding: 1mm 0;
                    }
                    .print-table {
                        width: 100%;
                        border-collapse: collapse;
                        font-size: 6.5px;
                    }
                    .print-table thead tr {
                        background-color: #f2f2f2 !important;
                        -webkit-print-color-adjust: exact;
                    }
                    .print-table th {
                        border: 1px solid #000;
                        padding: 2px 3px;
                        text-align: left;
                        font-weight: bold;
                        font-size: 7px;
                    }
                    .print-table th.text-end {
                        text-align: right;
                    }
                    .print-table th.text-center {
                        text-align: center;
                    }
                    .print-table td {
                        border: 1px solid #ddd;
                        padding: 2px 3px;
                    }
                    .text-end { text-align: right; }
                    .text-center { text-align: center; }
                    
                    .print-summary {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                        gap: 2mm;
                        border-top: 2px solid #000;
                        padding-top: 3mm;
                        margin-top: 4mm;
                    }
                    .print-summary-item {
                        padding: 1mm 2mm;
                        background: #f8f9fa;
                        border-radius: 2px;
                        text-align: center;
                        -webkit-print-color-adjust: exact;
                    }
                    .print-summary-item .label {
                        font-size: 5.5px;
                        text-transform: uppercase;
                        color: #666;
                        display: block;
                    }
                    .print-summary-item .value {
                        font-size: 8px;
                        font-weight: bold;
                    }
                    
                    .print-signature-area {
                        display: grid;
                        grid-template-columns: repeat(4, 1fr);
                        gap: 4mm;
                        margin-top: 6mm;
                        padding-top: 2mm;
                        border-top: 1px solid #ccc;
                    }
                    .print-signature-box {
                        text-align: center;
                    }
                    .print-signature-box .sig-line {
                        border-top: 1px solid #000;
                        padding-top: 1mm;
                        margin-top: 6mm;
                    }
                    .print-signature-box .sig-label {
                        font-size: 6px;
                        font-weight: 600;
                    }
                    
                    .print-footer {
                        text-align: center;
                        font-size: 5.5px;
                        margin-top: 4mm;
                        border-top: 1px solid #ddd;
                        padding-top: 2mm;
                        color: #666;
                    }
                    .grand-total-row td {
                        font-weight: bold;
                        border-top: 2px solid #000;
                        background-color: #e9ecef !important;
                        -webkit-print-color-adjust: exact;
                    }
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
                    <span><strong>Status:</strong> ${isBalanced ? '✅ Balanced' : '⚠️ Unbalanced'}</span>
                </div>
                
                <table class="print-table">
                    <thead>
                        <tr>
                            <th style="width:30%">Account Name</th>
                            <th style="width:20%">Account Group</th>
                            <th style="width:16%" class="text-end">Debit</th>
                            <th style="width:16%" class="text-end">Credit</th>
                            <th style="width:16%" class="text-end">Balance</th>
                            <th style="width:6%" class="text-center">Type</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows || '<tr><td colspan="6" style="text-align:center;padding:10px;color:#999;">No data available</td></tr>'}
                    </tbody>
                    <tfoot>
                        <tr class="grand-total-row">
                            <td colspan="2">Grand Total</td>
                            <td class="text-end">${formatCurrency(totalDebit)}</td>
                            <td class="text-end">${formatCurrency(totalCredit)}</td>
                            <td class="text-end">${formatCurrency(Math.abs(totalDebit - totalCredit))}</td>
                            <td class="text-center">${totalDebit >= totalCredit ? 'Dr' : 'Cr'}</td>
                        </tr>
                    </tfoot>
                </table>
                
                <div class="print-summary">
                    <div class="print-summary-item">
                        <span class="label">Total Debit</span>
                        <span class="value" style="color:#dc2626;">${formatCurrency(totalDebit)}</span>
                    </div>
                    <div class="print-summary-item">
                        <span class="label">Total Credit</span>
                        <span class="value" style="color:#16a34a;">${formatCurrency(totalCredit)}</span>
                    </div>
                    <div class="print-summary-item">
                        <span class="label">Difference</span>
                        <span class="value">${formatCurrency(Math.abs(totalDebit - totalCredit))}</span>
                    </div>
                    <div class="print-summary-item">
                        <span class="label">Status</span>
                        <span class="value" style="color:${isBalanced ? '#059669' : '#dc2626'};">${isBalanced ? '✅ Balanced' : '⚠️ Unbalanced'}</span>
                    </div>
                    ${data.summary?.netProfit !== undefined ? `
                    <div class="print-summary-item">
                        <span class="label">Net Profit/Loss</span>
                        <span class="value" style="color:${data.summary.netProfit >= 0 ? '#059669' : '#dc2626'};">${formatCurrency(data.summary.netProfit)}</span>
                    </div>
                    ` : ''}
                    ${data.summary?.totalAssets !== undefined ? `
                    <div class="print-summary-item">
                        <span class="label">Total Assets</span>
                        <span class="value" style="color:#2563eb;">${formatCurrency(data.summary.totalAssets)}</span>
                    </div>
                    ` : ''}
                    ${data.summary?.totalLiabilities !== undefined ? `
                    <div class="print-summary-item">
                        <span class="label">Total Liabilities</span>
                        <span class="value" style="color:#7c3aed;">${formatCurrency(data.summary.totalLiabilities)}</span>
                    </div>
                    ` : ''}
                    ${data.summary?.totalEquity !== undefined ? `
                    <div class="print-summary-item">
                        <span class="label">Total Equity</span>
                        <span class="value" style="color:#059669;">${formatCurrency(data.summary.totalEquity)}</span>
                    </div>
                    ` : ''}
                </div>
                
                <div class="print-signature-area">
                    <div class="print-signature-box">
                        <div class="sig-line">_________________</div>
                        <div class="sig-label">Prepared By</div>
                        <div style="font-size:5.5px;color:#666;">${data.payment?.user?.name || ''}</div>
                    </div>
                    <div class="print-signature-box">
                        <div class="sig-line">_________________</div>
                        <div class="sig-label">Checked By</div>
                    </div>
                    <div class="print-signature-box">
                        <div class="sig-line">_________________</div>
                        <div class="sig-label">Approved By</div>
                    </div>
                    <div class="print-signature-box">
                        <div class="sig-line">_________________</div>
                        <div class="sig-label">Authorized Signatory</div>
                    </div>
                </div>
                
                <div class="print-footer">
                    This is a system-generated report. | Generated on ${new Date().toLocaleString()}
                </div>
                
                <script>
                    window.onload = function() {
                        window.print();
                        window.onafterprint = function() {
                            window.close();
                        };
                    };
                <\/script>
            </body>
            </html>
        `;

        printWindow.document.write(printContent);
        printWindow.document.close();
    };

    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
    };

    const resetColumnWidths = () => {
        setColumnWidths({
            accountName: 200,
            accountGroup: 150,
            debit: 100,
            credit: 100,
            balance: 100,
            type: 60
        });
        setNotification({
            show: true,
            message: 'Column widths reset',
            type: 'success',
            duration: 2000
        });
    };

    const renderAccountTypeBadge = (type) => {
        const colors = {
            'Asset': 'primary',
            'Liability': 'warning',
            'Equity': 'success',
            'Income': 'info',
            'Expense': 'danger',
            'Other': 'secondary'
        };
        return <span className={`badge bg-${colors[type] || 'secondary'}`}>{type || 'N/A'}</span>;
    };

    // Resize handle component
    const ResizeHandle = React.memo(({ onResizeStart, left, columnName }) => (
        <div
            className="ar-resize-handle"
            style={{
                position: 'absolute',
                top: 0,
                left: `${left}px`,
                width: '5px',
                height: '100%',
                cursor: 'col-resize',
                zIndex: 10
            }}
            onMouseDown={(e) => {
                e.preventDefault();
                onResizeStart(e, columnName);
            }}
        />
    ));

    // Table Header
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

    // Table Row
    const TableRow = React.memo(({ index, style, data }) => {
        const { accounts, formatCurrency, renderAccountTypeBadge, isBalanceSheet, isPAndL } = data;
        const account = accounts[index];
        if (!account) return null;

        let debit = account.debit || 0;
        let credit = account.credit || 0;

        if (isBalanceSheet) {
            if (account.balanceType === 'Dr') {
                debit = account.closingBalance;
            } else {
                credit = account.closingBalance;
            }
        }

        if (isPAndL) {
            if (account.accountType === 'Income') {
                credit = account.closingBalance;
                debit = 0;
            } else if (account.accountType === 'Expense') {
                debit = account.closingBalance;
                credit = 0;
            }
        }

        const isSectionHeader = account.accountName?.toUpperCase().includes('TOTAL') ||
            account.accountName?.includes('===');

        return (
            <div
                style={{
                    ...style,
                    display: 'flex',
                    alignItems: 'center',
                    height: '28px',
                    borderBottom: '1px solid #e2e8f0',
                    backgroundColor: index % 2 === 0 ? '#f8fafc' : 'white',
                    fontWeight: isSectionHeader ? '600' : 'normal'
                }}
                className="ar-row"
            >
                <div className="ar-cell" style={{ width: `${columnWidths.accountName}px`, flexShrink: 0 }} title={account.accountName}>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {account.accountName}
                        {account.accountType && !isBalanceSheet && !isPAndL && (
                            <span className="ar-account-type-badge ms-2">
                                {renderAccountTypeBadge(account.accountType)}
                            </span>
                        )}
                    </span>
                </div>
                <div className="ar-cell" style={{ width: `${columnWidths.accountGroup}px`, flexShrink: 0 }} title={account.accountGroupName}>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {account.accountGroupName || 'N/A'}
                    </span>
                </div>
                <div className="ar-cell ar-cell--end" style={{ width: `${columnWidths.debit}px`, flexShrink: 0 }}>
                    <span style={{ color: debit > 0 ? '#dc2626' : 'inherit' }}>
                        {formatCurrency(debit)}
                    </span>
                </div>
                <div className="ar-cell ar-cell--end" style={{ width: `${columnWidths.credit}px`, flexShrink: 0 }}>
                    <span style={{ color: credit > 0 ? '#16a34a' : 'inherit' }}>
                        {formatCurrency(credit)}
                    </span>
                </div>
                <div className="ar-cell ar-cell--end" style={{ width: `${columnWidths.balance}px`, flexShrink: 0 }}>
                    <span>{formatCurrency(account.closingBalance || 0)}</span>
                </div>
                <div className="ar-cell ar-cell--center" style={{ width: `${columnWidths.type}px`, flexShrink: 0 }}>
                    <span className={`ar-balance-badge ar-balance-${account.balanceType?.toLowerCase() || 'cr'}`}>
                        {account.balanceType || 'Cr'}
                    </span>
                </div>
            </div>
        );
    });

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

        const { accountDetails, summary } = reportData;
        const isBalanceSheet = reportData.reportType === 'BalanceSheet';
        const isPAndL = reportData.reportType === 'ProfitAndLoss';

        let totalDebit = 0;
        let totalCredit = 0;

        const accountsWithCalculations = accountDetails?.map(account => {
            let debit = account.debit || 0;
            let credit = account.credit || 0;

            if (isBalanceSheet) {
                if (account.balanceType === 'Dr') {
                    debit = account.closingBalance;
                } else {
                    credit = account.closingBalance;
                }
            }

            if (isPAndL) {
                if (account.accountType === 'Income') {
                    credit = account.closingBalance;
                    debit = 0;
                } else if (account.accountType === 'Expense') {
                    debit = account.closingBalance;
                    credit = 0;
                }
            }

            totalDebit += debit || 0;
            totalCredit += credit || 0;

            return { ...account, calculatedDebit: debit, calculatedCredit: credit };
        });

        const totalWidth = Object.values(columnWidths).reduce((a, b) => a + b, 0);

        return (
            <div className="ar-report-container">
                {/* Report Header */}
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
                </div>

                {/* Report Table */}
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
                                        isPAndL
                                    }}
                                >
                                    {TableRow}
                                </List>
                            </div>
                        )}
                    </AutoSizer>
                </div>

                {/* Summary Cards */}
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

    return (
        <div className="ar-page">
            <Header />

            <div className="ar-shell">
                {/* Top Bar */}
                <div className="ar-topbar">
                    <div className="ar-topbar-left">
                        <div className="ar-topbar-icon">
                            <FiFileText />
                        </div>
                        <div>
                            <h1>Audit Reports</h1>
                            <span className="ar-subtitle">Financial statements and trial balances</span>
                        </div>
                    </div>
                    <div className="ar-topbar-right">
                        <button
                            className="ar-btn-icon"
                            onClick={() => navigate('/')}
                        >
                            <i className="bi bi-house me-1" /> Dashboard
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="ar-tabs">
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

                {/* Controls */}
                <div className="ar-controls">
                    <div className="ar-control-group">
                        <label className="ar-control-label">
                            <FiCalendar className="me-1" />
                            As On Date
                        </label>
                        <div className="ar-date-inputs">
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
                                    {dateErrors.asOnDate && <div className="ar-field-error">{dateErrors.asOnDate}</div>}
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
                    </div>
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

                    <button className="ar-btn-gen" onClick={generateReport} disabled={loading}>
                        Refresh
                    </button>
                    <button className="ar-btn-gen" onClick={handlePrint} disabled={!reportData}>
                        <FiPrinter size={14} /> Print
                    </button>
                    <button className="ar-btn-gen" onClick={resetColumnWidths}>
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