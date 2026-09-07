// // VATConfirmationLetter.jsx
// import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
// import { useNavigate } from 'react-router-dom';
// import axios from 'axios';
// import { FiUser, FiCalendar, FiFileText, FiPrinter } from 'react-icons/fi';
// import Header from './retailer/Header';
// import Loader from './Loader';
// import NotificationToast from './NotificationToast';
// import VirtualizedAccountList from './VirtualizedAccountList';
// import NepaliDate from 'nepali-datetime';
// import './VATConfirmationLetter.css';
// import api, { refreshToken } from '../components/services/api';

// // Helper functions for date conversion
// const convertBsToAd = (bsDate) => {
//     if (!bsDate || !/^\d{4}-\d{2}-\d{2}$/.test(bsDate)) return null;
//     try {
//         const nepaliDate = new NepaliDate(bsDate);
//         const jsDate = nepaliDate?.getDateObject?.();
//         if (!jsDate || isNaN(jsDate.getTime())) return null;
//         return `${jsDate.getFullYear()}-${String(jsDate.getMonth() + 1).padStart(2, '0')}-${String(jsDate.getDate()).padStart(2, '0')}`;
//     } catch { return null; }
// };

// const convertAdToBs = (adDate) => {
//     if (!adDate) return null;
//     try {
//         const date = typeof adDate === 'string'
//             ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(adDate) ? adDate + 'T00:00:00' : adDate)
//             : adDate instanceof Date ? adDate : null;
//         if (!date || isNaN(date.getTime())) return null;
//         const nepaliDate = new NepaliDate(date);
//         return `${nepaliDate.getYear()}-${String(nepaliDate.getMonth() + 1).padStart(2, '0')}-${String(nepaliDate.getDate()).padStart(2, '0')}`;
//     } catch { return null; }
// };

// // Helper function to get last day of Nepali month
// const getLastDayOfNepaliMonth = (year, month) => {
//     const nepaliMonthDays = [31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30, 30];
//     const leapYears = [2072, 2076, 2080, 2084, 2088, 2092, 2096, 2100, 2104, 2108];
//     if (month === 11 && leapYears.includes(year)) return 31;
//     return nepaliMonthDays[month - 1];
// };

// const getAdDateRangeForNepaliMonth = (year, month) => {
//     try {
//         const firstDayNepali = new NepaliDate(year, month - 1, 1);
//         const lastDayNum = getLastDayOfNepaliMonth(year, month);
//         const lastDayNepali = new NepaliDate(year, month - 1, lastDayNum);
//         return {
//             fromDateAd: convertBsToAd(firstDayNepali.format('YYYY-MM-DD')),
//             toDateAd: convertBsToAd(lastDayNepali.format('YYYY-MM-DD'))
//         };
//     } catch { return { fromDateAd: null, toDateAd: null }; }
// };

// const VATConfirmationLetter = () => {
//     const [notification, setNotification] = useState({
//         show: false, message: '', type: 'success', duration: 3000
//     });

//     // Account search states
//     const [accounts, setAccounts] = useState([]);
//     const [isAccountSearching, setIsAccountSearching] = useState(false);
//     const [accountSearchResults, setAccountSearchResults] = useState([]);
//     const [accountSearchPage, setAccountSearchPage] = useState(1);
//     const [hasMoreAccountResults, setHasMoreAccountResults] = useState(false);
//     const [totalAccounts, setTotalAccounts] = useState(0);
//     const [accountSearchQuery, setAccountSearchQuery] = useState('');
//     const [accountLastSearchQuery, setAccountLastSearchQuery] = useState('');
//     const [accountShouldShowLastSearchResults, setAccountShouldShowLastSearchResults] = useState(false);
//     const [showAccountModal, setShowAccountModal] = useState(false);

//     const [selectedParty, setSelectedParty] = useState(null);
//     const [summary, setSummary] = useState(null);
//     const [loading, setLoading] = useState(false);
//     const [error, setError] = useState('');
//     const [showPreview, setShowPreview] = useState(false);
//     const [startMonth, setStartMonth] = useState('');
//     const [endMonth, setEndMonth] = useState('');
//     const [fiscalYear, setFiscalYear] = useState('');
//     const [companyDateFormat, setCompanyDateFormat] = useState('nepali');
//     const [isInitialized, setIsInitialized] = useState(false);
//     const [fromDateAd, setFromDateAd] = useState('');
//     const [toDateAd, setToDateAd] = useState('');

//     const navigate = useNavigate();
//     const startMonthRef = useRef(null);
//     const endMonthRef = useRef(null);
//     const accountSearchRef = useRef(null);
//     const generateBtnRef = useRef(null);
//     const abortControllerRef = useRef(null);

//     // Nepali months
//     const nepaliMonths = [
//         { value: 1, name: "Baisakh" }, { value: 2, name: "Jestha" },
//         { value: 3, name: "Ashad" }, { value: 4, name: "Shrawan" },
//         { value: 5, name: "Bhadra" }, { value: 6, name: "Ashoj" },
//         { value: 7, name: "Kartik" }, { value: 8, name: "Mangsir" },
//         { value: 9, name: "Poush" }, { value: 10, name: "Magh" },
//         { value: 11, name: "Falgun" }, { value: 12, name: "Chaitra" }
//     ];

//     const nepaliMonthsNames = {
//         1: "बैशाख", 2: "जेठ", 3: "असार", 4: "साउन",
//         5: "भदौ", 6: "असोज", 7: "कात्तिक", 8: "मंसिर",
//         9: "पौष", 10: "माघ", 11: "फागुन", 12: "चैत्र"
//     };

//     const parseFiscalYear = (fiscalYearStr) => {
//         if (!fiscalYearStr) return { startYear: null, endYear: null };
//         if (fiscalYearStr.includes('/')) {
//             const parts = fiscalYearStr.split('/');
//             const startYear = parseInt(parts[0]);
//             let endYear = parts[1].length === 2
//                 ? Math.floor(startYear / 100) * 100 + parseInt(parts[1])
//                 : parseInt(parts[1]);
//             return { startYear, endYear };
//         }
//         return { startYear: parseInt(fiscalYearStr), endYear: parseInt(fiscalYearStr) + 1 };
//     };

//     const getYearForMonth = (monthValue) => {
//         if (!fiscalYear) return null;
//         const { startYear, endYear } = parseFiscalYear(fiscalYear);
//         if (!startYear || !endYear) return null;
//         const monthNum = parseInt(monthValue);
//         return monthNum <= 3 ? endYear : startYear;
//     };

//     const getMonthName = (monthValue) => {
//         return nepaliMonths.find(m => m.value === parseInt(monthValue))?.name || '';
//     };

//     const getMonthYearDisplay = (monthValue) => {
//         if (!monthValue || !fiscalYear) return '';
//         const monthName = getMonthName(monthValue);
//         const year = getYearForMonth(monthValue);
//         return `${monthName} ${year}`;
//     };

//     // Update AD date range when start/end month changes
//     useEffect(() => {
//         if (startMonth && fiscalYear) {
//             const startYear = getYearForMonth(startMonth);
//             if (startYear) {
//                 const { fromDateAd } = getAdDateRangeForNepaliMonth(startYear, parseInt(startMonth));
//                 setFromDateAd(fromDateAd || '');
//             }
//         }
//     }, [startMonth, fiscalYear]);

//     useEffect(() => {
//         if (endMonth && fiscalYear) {
//             const endYear = getYearForMonth(endMonth);
//             if (endYear) {
//                 const { toDateAd } = getAdDateRangeForNepaliMonth(endYear, parseInt(endMonth));
//                 setToDateAd(toDateAd || '');
//             }
//         }
//     }, [endMonth, fiscalYear]);

//     // Fetch accounts
//     const fetchAccountsFromBackend = useCallback(async (searchTerm = '', page = 1) => {
//         try {
//             setIsAccountSearching(true);
//             const response = await api.get('/api/retailer/all/accounts/search', {
//                 params: {
//                     search: searchTerm,
//                     page: page,
//                     limit: searchTerm.trim() ? 15 : 25,
//                 }
//             });
//             if (response.data.success) {
//                 if (page === 1) {
//                     setAccountSearchResults(response.data.accounts);
//                     setAccounts(response.data.accounts);
//                 } else {
//                     setAccountSearchResults(prev => [...prev, ...response.data.accounts]);
//                     setAccounts(prev => [...prev, ...response.data.accounts]);
//                 }
//                 setHasMoreAccountResults(response.data.pagination.hasNextPage);
//                 setTotalAccounts(response.data.pagination.totalAccounts);
//                 setAccountSearchPage(page);
//                 if (searchTerm.trim() !== '') {
//                     setAccountLastSearchQuery(searchTerm);
//                     setAccountShouldShowLastSearchResults(true);
//                 }
//             }
//         } catch (error) {
//             console.error('Error fetching accounts:', error);
//             setNotification({ show: true, message: 'Error loading accounts', type: 'error' });
//         } finally {
//             setIsAccountSearching(false);
//         }
//     }, [api]);

//     // Load accounts when modal opens
//     useEffect(() => {
//         if (showAccountModal) {
//             setAccountSearchQuery('');
//             setAccountSearchPage(1);
//             if (accountShouldShowLastSearchResults && accountLastSearchQuery.trim() !== '') {
//                 fetchAccountsFromBackend(accountLastSearchQuery, 1);
//             } else {
//                 fetchAccountsFromBackend('', 1);
//             }
//         }
//     }, [showAccountModal, fetchAccountsFromBackend]);

//     const loadMoreAccounts = useCallback(() => {
//         if (!isAccountSearching && hasMoreAccountResults) {
//             const searchTermVal = accountShouldShowLastSearchResults ? accountLastSearchQuery : accountSearchQuery;
//             fetchAccountsFromBackend(searchTermVal, accountSearchPage + 1);
//         }
//     }, [isAccountSearching, hasMoreAccountResults, accountShouldShowLastSearchResults, accountLastSearchQuery, accountSearchQuery, accountSearchPage, fetchAccountsFromBackend]);

//     const handleAccountSearch = useCallback((e) => {
//         const searchText = e.target.value;
//         setAccountSearchQuery(searchText);
//         setAccountSearchPage(1);
//         if (searchText.trim() !== '' && accountShouldShowLastSearchResults) {
//             setAccountShouldShowLastSearchResults(false);
//             setAccountLastSearchQuery('');
//         }
//         const timer = setTimeout(() => fetchAccountsFromBackend(searchText, 1), 300);
//         return () => clearTimeout(timer);
//     }, [accountShouldShowLastSearchResults, fetchAccountsFromBackend]);

//     // Fetch initial data
//     const fetchInitialData = useCallback(async () => {
//         try {
//             const response = await api.get('/api/retailer/party-summary-entry-data');
//             if (response.data.success) {
//                 setFiscalYear(response.data.data.fiscalYearName);
//                 setCompanyDateFormat(response.data.data.dateFormat);
//                 setIsInitialized(true);
//             }
//         } catch {
//             setFiscalYear('2082/83');
//             setCompanyDateFormat('nepali');
//             setIsInitialized(true);
//         }
//     }, [api]);

//     useEffect(() => {
//         fetchInitialData();
//     }, [fetchInitialData]);

//     useEffect(() => {
//         const timer = setTimeout(() => setShowAccountModal(true), 100);
//         return () => clearTimeout(timer);
//     }, []);

//     // Load party summary
//     const loadPartySummaryByMonthRange = useCallback(async (accountId, startYear, startMonth, endYear, endMonth, fromDateAd, toDateAd) => {
//         abortControllerRef.current?.abort();
//         abortControllerRef.current = new AbortController();
//         try {
//             setLoading(true);
//             setError('');
//             const response = await api.get(`/api/retailer/party-summary-by-month-range/${accountId}`, {
//                 params: { startYear, startMonth, endYear, endMonth, fromDate: fromDateAd, toDate: toDateAd },
//                 signal: abortControllerRef.current.signal
//             });
//             if (response.data.success) {
//                 setSummary(response.data.data);
//                 if (response.data.data?.fiscalYear) setFiscalYear(response.data.data.fiscalYear);
//             } else {
//                 setError(response.data.error || 'Failed to load party summary');
//                 setNotification({ show: true, message: response.data.error || 'Failed to load party summary', type: 'error' });
//             }
//         } catch (err) {
//             if (err.name === 'AbortError' || err.name === 'CanceledError') return;
//             console.error('Error loading summary:', err);
//             const msg = err.response?.data?.error || 'Failed to load party summary';
//             setError(msg);
//             setNotification({ show: true, message: msg, type: 'error' });
//         } finally {
//             setLoading(false);
//         }
//     }, [api]);

//     const selectAccount = useCallback((account) => {
//         setSelectedParty(account);
//         setShowAccountModal(false);
//         setAccountSearchQuery('');
//         setTimeout(() => startMonthRef.current?.focus(), 100);
//     }, []);

//     const handleGenerateReport = useCallback(() => {
//         if (!selectedParty) {
//             setNotification({ show: true, message: 'Please select a party first', type: 'warning' });
//             return;
//         }
//         if (!startMonth || !endMonth) {
//             setNotification({ show: true, message: 'Please select start and end month', type: 'warning' });
//             return;
//         }
//         if (!fiscalYear) {
//             setNotification({ show: true, message: 'Fiscal year not loaded', type: 'warning' });
//             return;
//         }

//         const startMonthNum = parseInt(startMonth);
//         const endMonthNum = parseInt(endMonth);
//         const startYear = getYearForMonth(startMonth);
//         const endYear = getYearForMonth(endMonth);

//         if (!startYear || !endYear) {
//             setNotification({ show: true, message: 'Invalid year calculation', type: 'warning' });
//             return;
//         }

//         let isValid = false;
//         if (startYear === endYear) {
//             isValid = startMonthNum <= endMonthNum;
//         } else if (startYear < endYear) {
//             isValid = true;
//         }

//         if (!isValid) {
//             setNotification({ show: true, message: 'Invalid date range', type: 'warning' });
//             return;
//         }

//         if (!fromDateAd || !toDateAd) {
//             setNotification({ show: true, message: 'Unable to calculate date range', type: 'warning' });
//             return;
//         }

//         loadPartySummaryByMonthRange(selectedParty.id, startYear, startMonthNum, endYear, endMonthNum, fromDateAd, toDateAd);
//     }, [selectedParty, startMonth, endMonth, fiscalYear, fromDateAd, toDateAd, loadPartySummaryByMonthRange]);

//     const formatCurrency = useCallback((amount) => {
//         if (amount == null) return '0.00';
//         return parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
//     }, []);

//     const formatDate = useCallback((date) => {
//         if (!date) return '';
//         return new Date(date).toLocaleDateString('en-NP');
//     }, []);

//     const handleKeyDown = useCallback((e, nextId) => {
//         if (e.key === 'Enter') {
//             e.preventDefault();
//             if (nextId) {
//                 document.getElementById(nextId)?.focus();
//             } else {
//                 handleGenerateReport();
//             }
//         }
//     }, [handleGenerateReport]);

//     const getFocusTargetOnModalClose = useCallback(() => {
//         return startMonthRef.current ? 'startMonth' : 'startMonth';
//     }, []);


//     const handlePrint = () => {
//         if (!summary) {
//             setNotification({ show: true, message: 'No data to print', type: 'warning' });
//             return;
//         }

//         const printWindow = window.open("", "_blank");
//         if (!printWindow) {
//             setNotification({ show: true, message: 'Popup blocked', type: 'error' });
//             return;
//         }

//         const summaryData = summary.summary;
//         const company = summary.company;
//         const party = summary.party;
//         const currentFiscalYear = summary.fiscalYear || fiscalYear;

//         const printContent = `
//         <!DOCTYPE html>
//         <html>
//         <head>
//             <title>VAT and Balance Confirmation Letter</title>
//             <style>
//                 * { -webkit-print-color-adjust: exact; print-color-adjust: exact; box-sizing: border-box; margin: 0; padding: 0; }
//                 @media print { @page { size: A4; margin: 10mm 15mm; } body { font-family: "Times New Roman", Times, serif; font-size: 11pt; } }
//                 body { font-family: "Times New Roman", Times, serif; margin: 0; padding: 15px; font-size: 11pt; }
//                 .document-title { text-align: center; margin: 12px 0; padding: 6px; background: #f5f5f5; border: 1px solid #000; }
//                 .document-title h1 { margin: 0; font-size: 14pt; }
//                 .details-container { display: flex; gap: 15px; margin-bottom: 12px; }
//                 .company-info, .party-info { border: 1px solid #000; padding: 8px; flex: 1; }
//                 .info-header { background: #000; color: white; padding: 4px 8px; margin: -8px -8px 6px -8px; }
//                 .info-content p { margin: 1px 0; font-size: 9pt; }
//                 .meta-info { display: flex; justify-content: space-between; margin-bottom: 10px; padding: 6px; background: #f8f9fa; }
//                 .transaction-table { width: 100%; border-collapse: collapse; margin: 12px 0; border: 1px solid #000; }
//                 .transaction-table th, .transaction-table td { border: 1px solid #000; padding: 4px 5px; }
//                 .transaction-table th { background: #000; color: white; text-align: center; }
//                 .text-end { text-align: right; }
//                 .section-header { background: #d3d3d3; font-weight: bold; }
//                 .total-row { background: #e8f5e8; font-weight: bold; }
//                 .balance-row { background: #fffacd; font-weight: bold; }
//                 .content-section { margin: 10px 0; }
//                 .signature-container { display: flex; gap: 20px; margin-top: 25px; }
//                 .signature-box { flex: 1; text-align: center; }
//                 .signature-line { border-top: 1px solid #000; margin: 30px 0 4px 0; }
//                 .footer { margin-top: 12px; text-align: center; font-size: 7pt; border-top: 1px solid #ccc; padding-top: 5px; }
//             </style>
//         </head>
//         <body>
//             <div class="document-title"><h1>VAT AND BALANCE CONFIRMATION LETTER</h1><p>Fiscal Year: ${currentFiscalYear || ''} | Generated on: ${formatDate(new Date())}</p></div>
//             <div class="details-container">
//                 <div class="company-info"><div class="info-header">FROM</div><div class="info-content"><p><strong>${company.name || ''}</strong></p><p>Address: ${company.address || ''}</p><p>Phone: ${company.phone || ''}</p><p>PAN: ${company.pan || ''}</p></div></div>
//                 <div class="party-info"><div class="info-header">TO</div><div class="info-content"><p><strong>${party.name || ''}</strong></p><p>Address: ${party.address || ''}</p><p>Phone: ${party.phone || ''}</p><p>PAN: ${party.pan || ''}</p></div></div>
//             </div>
//             <div class="meta-info"><div><strong>Reference No:</strong><br>CONF${(currentFiscalYear || '').replace('/', '')}/${Date.now().toString().slice(-4)}</div><div><strong>Period:</strong><br>${getMonthYearDisplay(startMonth)} to ${getMonthYearDisplay(endMonth)}</div><div><strong>Page:</strong><br>1 of 1</div></div>
//             <div class="content-section"><p>Dear Sir/Madam,</p><p>In accordance with standard accounting practices, we hereby submit the transaction summary for the fiscal year <strong>${currentFiscalYear || ''}</strong>.</p><p>Please find below the detailed transaction summary for the period <strong>${getMonthYearDisplay(startMonth)} to ${getMonthYearDisplay(endMonth)}</strong>:</p></div>
//             <table class="transaction-table">
//                 <thead><tr><th>Particulars</th><th class="text-end">Amount (Rs.)</th><th class="text-end">VAT Amount (Rs.)</th><th>Remarks</th></tr></thead>
//                 <tbody>
//                     <tr class="section-header"><td colspan="4"><strong>SALES TRANSACTIONS</strong></td></tr>
//                     <tr><td style="padding-left: 10px;">Taxable Sales</td><td class="text-end">${formatCurrency(summaryData?.taxableSales)}</td><td class="text-end">${formatCurrency(summaryData?.taxableSalesVAT)}</td><td class="text-center">-</td></tr>
//                     <tr><td style="padding-left: 10px;">Non-Taxable Sales</td><td class="text-end">${formatCurrency(summaryData?.nonTaxableSales)}</td><td class="text-end">-</td><td class="text-center">Exempt</td></tr>
//                     <tr><td style="padding-left: 10px;">Sales Return</td><td class="text-end">(${formatCurrency(summaryData?.salesReturn)})</td><td class="text-end">(${formatCurrency(summaryData?.salesReturnVAT)})</td><td class="text-center">Credit Note</td></tr>
//                     <tr class="total-row"><td><strong>NET SALES</strong></td><td class="text-end"><strong>${formatCurrency(summaryData?.netSales)}</strong></td><td class="text-end"><strong>${formatCurrency(summaryData?.netSalesVAT)}</strong></td><td class="text-center">-</td></tr>
//                     <tr class="section-header"><td colspan="4"><strong>PURCHASE TRANSACTIONS</strong></td></tr>
//                     <tr><td style="padding-left: 10px;">Taxable Purchases</td><td class="text-end">${formatCurrency(summaryData?.taxablePurchase)}</td><td class="text-end">${formatCurrency(summaryData?.taxablePurchaseVAT)}</td><td class="text-center">-</td></tr>
//                     <tr><td style="padding-left: 10px;">Non-Taxable Purchase</td><td class="text-end">${formatCurrency(summaryData?.nonTaxablePurchase)}</td><td class="text-end">-</td><td class="text-center">Exempt</td></tr>
//                     <tr><td style="padding-left: 10px;">Purchase Return</td><td class="text-end">(${formatCurrency(summaryData?.purchaseReturn)})</td><td class="text-end">(${formatCurrency(summaryData?.purchaseReturnVAT)})</td><td class="text-center">Debit Note</td></tr>
//                     <tr class="total-row"><td><strong>NET PURCHASES</strong></td><td class="text-end"><strong>${formatCurrency(summaryData?.netPurchase)}</strong></td><td class="text-end"><strong>${formatCurrency(summaryData?.netPurchaseVAT)}</strong></td><td class="text-center">-</td></tr>
//                     <tr class="section-header"><td colspan="4"><strong>ACCOUNT BALANCES</strong></td></tr>
//                     <tr class="balance-row"><td>Opening Balance as on ${getMonthYearDisplay(startMonth)} 1st</td><td class="text-end"><strong>${formatCurrency(Math.abs(summaryData?.openingBalance || 0))} ${summaryData?.openingBalance > 0 ? 'Cr' : (summaryData?.openingBalance < 0 ? 'Dr' : '')}</strong></td><td class="text-end">-</td><td class="text-center">B/F</td></tr>
//                     <tr class="balance-row"><td>Closing Balance as on ${getMonthYearDisplay(endMonth)} End</td><td class="text-end"><strong>${formatCurrency(Math.abs(summaryData?.closingBalance || 0))} ${summaryData?.closingBalance > 0 ? 'Cr' : (summaryData?.closingBalance < 0 ? 'Dr' : '')}</strong></td><td class="text-end">-</td><td class="text-center">C/F</td></tr>
//                 </tbody>
//             </table>
//             <div class="content-section">
//                 <p>
//                     Kindly verify the above transactions and account balances. If the details are correct, 
//                     please sign and return the duplicate copy of this letter within <strong>15 days</strong>. 
//                     Any discrepancies should be communicated to us in writing within the same period.
//                 </p>
//                 <p>
//                     If no communication is received within the stipulated time, the balances will be 
//                     considered as confirmed and correct for all purposes.
//                 </p>            </div>
//             <div class="signature-section"><div class="signature-container"><div class="signature-box"><div class="signature-line"></div><div class="signature-label">For ${company.name || 'Company'}</div></div><div class="signature-box"><div class="signature-line"></div><div class="signature-label">For ${party.name || 'Party'}</div></div></div></div>
//             <div class="footer"><p>Document ID: VAT-CONF-${Date.now()} | Printed on: ${new Date().toLocaleDateString()}</p></div>
//             <script>window.onload = function() { setTimeout(function() { window.print(); setTimeout(function() { window.close(); }, 500); }, 300); };</script>
//         </body>
//         </html>`;

//         printWindow.document.write(printContent);
//         printWindow.document.close();
//     };

//     const handlePrintNepali = () => {
//         if (!summary) {
//             setNotification({ show: true, message: 'कृपया पहिले रिपोर्ट जेनरेट गर्नुहोस्', type: 'warning' });
//             return;
//         }

//         const printWindow = window.open("", "_blank");
//         if (!printWindow) {
//             setNotification({ show: true, message: 'पपअप ब्लक गरिएको छ। कृपया यो साइटको लागि पपअप अनुमति दिनुहोस्।', type: 'error' });
//             return;
//         }

//         const summaryData = summary.summary;
//         const company = summary.company;
//         const party = summary.party;
//         const currentFiscalYear = summary.fiscalYear || fiscalYear;

//         // Get month names in Nepali
//         const startMonthNum = parseInt(startMonth);
//         const endMonthNum = parseInt(endMonth);
//         const startMonthNameNepali = nepaliMonthsNames[startMonthNum] || '';
//         const endMonthNameNepali = nepaliMonthsNames[endMonthNum] || '';
//         const startYear = getYearForMonth(startMonth);
//         const endYear = getYearForMonth(endMonth);

//         const printContent = `
//     <!DOCTYPE html>
//     <html>
//     <head>
//         <meta charset="UTF-8">
//         <title>भ्याट तथा बाँकी सुनिश्चितता पत्र - ${party.name || ''}</title>
//         <style>
//             * {
//                 -webkit-print-color-adjust: exact !important;
//                 print-color-adjust: exact !important;
//                 box-sizing: border-box;
//                 margin: 0;
//                 padding: 0;
//             }

//             @media print {
//                 @page {
//                     size: A4;
//                     margin: 10mm 15mm;
//                 }
//                 body {
//                     font-family: 'Mangal', 'Nirmala UI', 'Preeti', 'Times New Roman', Times, serif !important;
//                     line-height: 1.2;
//                     color: #000000 !important;
//                     background: white !important;
//                     font-size: 11pt;
//                 }
//             }

//             body {
//                 font-family: 'Mangal', 'Nirmala UI', 'Preeti', 'Times New Roman', Times, serif;
//                 margin: 0;
//                 padding: 15px;
//                 font-size: 11pt;
//                 line-height: 1.2;
//                 color: #000000;
//                 background: white;
//             }

//             .print-container {
//                 max-width: 100%;
//                 margin: 0 auto;
//             }

//             .document-title {
//                 text-align: center;
//                 margin: 12px 0;
//                 padding: 6px;
//                 background: #f5f5f5 !important;
//                 border: 1px solid #000000;
//             }

//             .document-title h1 {
//                 margin: 0;
//                 font-size: 14pt;
//                 font-weight: bold;
//             }

//             .details-container {
//                 display: flex;
//                 gap: 15px;
//                 margin-bottom: 12px;
//             }

//             .company-info, .party-info {
//                 border: 1px solid #000000;
//                 padding: 8px;
//                 flex: 1;
//             }

//             .info-header {
//                 background: #000000 !important;
//                 color: white !important;
//                 padding: 4px 8px;
//                 margin: -8px -8px 6px -8px;
//                 font-size: 10pt;
//                 font-weight: bold;
//             }

//             .info-content p {
//                 margin: 1px 0;
//                 font-size: 9pt;
//             }

//             .meta-info {
//                 display: flex;
//                 justify-content: space-between;
//                 margin-bottom: 10px;
//                 padding: 6px;
//                 background: #f8f9fa !important;
//                 font-size: 9pt;
//             }

//             .transaction-table {
//                 width: 100%;
//                 border-collapse: collapse;
//                 margin: 12px 0;
//                 font-size: 9pt;
//                 border: 1px solid #000000;
//             }

//             .transaction-table th {
//                 background: #000000 !important;
//                 color: white !important;
//                 border: 1px solid #000000;
//                 padding: 5px 6px;
//                 text-align: center;
//                 font-weight: bold;
//             }

//             .transaction-table td {
//                 border: 1px solid #000000;
//                 padding: 4px 5px;
//                 text-align: left;
//             }

//             .transaction-table .text-end {
//                 text-align: right;
//             }

//             .transaction-table .text-center {
//                 text-align: center;
//             }

//             .section-header {
//                 background: #d3d3d3 !important;
//                 font-weight: bold;
//             }

//             .total-row {
//                 background: #e8f5e8 !important;
//                 font-weight: bold;
//             }

//             .balance-row {
//                 background: #fffacd !important;
//                 font-weight: bold;
//             }

//             .content-section {
//                 margin: 10px 0;
//                 line-height: 1.2;
//                 font-size: 10pt;
//             }

//             .content-section p {
//                 margin: 4px 0;
//             }

//             .signature-section {
//                 margin-top: 15px;
//             }

//             .signature-container {
//                 display: flex;
//                 gap: 20px;
//                 margin-top: 25px;
//             }

//             .signature-box {
//                 flex: 1;
//                 text-align: center;
//             }

//             .signature-line {
//                 border-top: 1px solid #000000;
//                 margin: 30px 0 4px 0;
//             }

//             .signature-label {
//                 font-weight: bold;
//                 margin: 4px 0;
//                 font-size: 10pt;
//             }

//             .footer {
//                 margin-top: 12px;
//                 text-align: center;
//                 font-size: 7pt;
//                 border-top: 1px solid #ccc;
//                 padding-top: 5px;
//             }

//             .negative-amount {
//                 font-style: italic;
//             }

//             .text-success {
//                 color: #28a745 !important;
//             }
//             .text-danger {
//                 color: #dc3545 !important;
//             }
//         </style>
//     </head>
//     <body>
//         <div class="print-container">
//             <div class="document-title">
//                 <h1>भ्याट तथा बाँकी सुनिश्चितता पत्र</h1>
//                 <p style="margin: 1px 0; font-size: 9pt;">
//                     आर्थिक वर्ष: ${currentFiscalYear || ''} | जारी मिति: ${formatDate(new Date())}
//                 </p>
//             </div>

//             <div class="details-container">
//                 <div class="company-info">
//                     <div class="info-header">बाट</div>
//                     <div class="info-content">
//                         <p style="font-weight: bold; margin-bottom: 3px;">${company.name || ''}</p>
//                         <p>ठेगाना: ${company.address || ''}</p>
//                         <p>फोन: ${company.phone || ''}</p>
//                         <p>प्यान: ${company.pan || ''}</p>
//                     </div>
//                 </div>

//                 <div class="party-info">
//                     <div class="info-header">लाई</div>
//                     <div class="info-content">
//                         <p style="font-weight: bold; margin-bottom: 3px;">${party.name || ''}</p>
//                         <p>ठेगाना: ${party.address || ''}</p>
//                         <p>फोन: ${party.phone || ''}</p>
//                         <p>प्यान: ${party.pan || ''}</p>
//                     </div>
//                 </div>
//             </div>

//             <div class="meta-info">
//                 <div style="flex: 1; text-align: left;">
//                     <strong>सन्दर्भ नम्बर:</strong><br>
//                     CONF${(currentFiscalYear || '').replace('/', '')}/${Date.now().toString().slice(-4)}
//                 </div>
//                 <div style="flex: 1; text-align: center;">
//                     <strong>अवधि:</strong><br>
//                     ${startMonthNameNepali} ${startYear} देखि ${endMonthNameNepali} ${endYear}
//                 </div>
//                 <div style="flex: 1; text-align: right;">
//                     <strong>पृष्ठ:</strong><br>
//                     १/१
//                 </div>
//             </div>

//             <div class="content-section">
//                 <p>प्रिय महोदय/महोदया,</p>
//                 <p>
//                     प्रचलित लेखा मान्यता र नियामक आवश्यकताहरू अनुसार, हामी तपाईंको पुनरावलोकन र सुनिश्चितताको लागि आर्थिक वर्ष 
//                     <strong>${currentFiscalYear || ''}</strong> को निम्नलिखित कारोबार सारांश र बाँकी सुनिश्चितता पेश गर्दछौं।
//                 </p>
//                 <p>
//                     कृपया तल विस्तृत कारोबार सारांश र मिति समाप्त हुँदाको बाँकी रकम हेर्नुहोस्:
//                 </p>
//             </div>

//             <table class="transaction-table">
//                 <thead>
//                     <tr>
//                         <th style="width: 45%;">विवरण</th>
//                         <th style="width: 25%;">रकम (रु.)</th>
//                         <th style="width: 20%;">भ्याट रकम (रु.)</th>
//                         <th style="width: 10%;">टिप्पणी</th>
//                     </tr>
//                 </thead>
//                 <tbody>
//                     <tr class="section-header">
//                         <td colspan="4"><strong>बिक्री कारोबारहरू</strong></strong></td>
//                     </tr>
//                     <tr>
//                         <td style="padding-left: 10px;">कर योग्य बिक्री</td>
//                         <td class="text-end">${formatCurrency(summaryData?.taxableSales)}</td>
//                         <td class="text-end">${formatCurrency(summaryData?.taxableSalesVAT)}</td>
//                         <td class="text-center">-</td>
//                     </tr>
//                     <tr>
//                         <td style="padding-left: 10px;">कर छुटको बिक्री</td>
//                         <td class="text-end">${formatCurrency(summaryData?.nonTaxableSales)}</td>
//                         <td class="text-end">-</td>
//                         <td class="text-center">छुट</td>
//                     </tr>
//                     <tr>
//                         <td style="padding-left: 10px;">बिक्री फिर्ता</td>
//                         <td class="text-end">(${formatCurrency(summaryData?.salesReturn)})</td>
//                         <td class="text-end">(${formatCurrency(summaryData?.salesReturnVAT)})</td>
//                         <td class="text-center">क्रेडिट नोट</td>
//                     </tr>
//                     <tr class="total-row">
//                         <td><strong>कुल बिक्री</strong></td>
//                         <td class="text-end"><strong>${formatCurrency(summaryData?.netSales)}</strong></td>
//                         <td class="text-end"><strong>${formatCurrency(summaryData?.netSalesVAT)}</strong></td>
//                         <td class="text-center">-</td>
//                     </tr>

//                     <tr class="section-header">
//                         <td colspan="4"><strong>खरिद कारोबारहरू</strong></td>
//                     </tr>
//                     <tr>
//                         <td style="padding-left: 10px;">कर योग्य खरिद</td>
//                         <td class="text-end">${formatCurrency(summaryData?.taxablePurchase)}</td>
//                         <td class="text-end">${formatCurrency(summaryData?.taxablePurchaseVAT)}</td>
//                         <td class="text-center">-</td>
//                     </tr>
//                     <tr>
//                         <td style="padding-left: 10px;">कर छुटको खरिद</td>
//                         <td class="text-end">${formatCurrency(summaryData?.nonTaxablePurchase)}</td>
//                         <td class="text-end">-</td>
//                         <td class="text-center">छुट</td>
//                     </tr>
//                     <tr>
//                         <td style="padding-left: 10px;">खरिद फिर्ता</td>
//                         <td class="text-end">(${formatCurrency(summaryData?.purchaseReturn)})</td>
//                         <td class="text-end">(${formatCurrency(summaryData?.purchaseReturnVAT)})</td>
//                         <td class="text-center">डेबिट नोट</td>
//                     </tr>
//                     <tr class="total-row">
//                         <td><strong>कुल खरिद</strong></td>
//                         <td class="text-end"><strong>${formatCurrency(summaryData?.netPurchase)}</strong></td>
//                         <td class="text-end"><strong>${formatCurrency(summaryData?.netPurchaseVAT)}</strong></td>
//                         <td class="text-center">-</td>
//                     </tr>

//                     <tr class="section-header">
//                         <td colspan="4"><strong>खाता बाँकीहरू</strong></td>
//                     </tr>
//                     <tr class="balance-row">
//                         <td>${startMonthNameNepali} ${startYear} १ गतेको प्रारम्भिक बाँकी</td>
//                         <td class="text-end"><strong>${formatCurrency(Math.abs(summaryData?.openingBalance || 0))} ${summaryData?.openingBalance > 0 ? 'Cr' : (summaryData?.openingBalance < 0 ? 'Dr' : '')}</strong></td>
//                         <td class="text-end">-</td>
//                         <td class="text-center">B/F</td>
//                     </tr>
//                     <tr class="balance-row">
//                         <td>${endMonthNameNepali} ${endYear} को अन्तिम बाँकी</td>
//                         <td class="text-end"><strong>${formatCurrency(Math.abs(summaryData?.closingBalance || 0))} ${summaryData?.closingBalance > 0 ? 'Cr' : (summaryData?.closingBalance < 0 ? 'Dr' : '')}</strong></td>
//                         <td class="text-end">-</td>
//                         <td class="text-center">C/F</td>
//                     </tr>
//                 </tbody>
//             </table>

//             <div class="content-section">
//                 <p>
//                     कृपया माथिको कारोबार र खाता बाँकीहरू सुनिश्चित गर्नुहोस्। यदि विवरणहरू सही छन् भने, 
//                     कृपया यो पत्रको प्रतिलिपि हस्ताक्षर गरी <strong>१५ दिन</strong> भित्र फिर्ता पठाउनुहोस्। 
//                     कुनै पनि विसंगति उही अवधि भित्र हामीलाई लिखित रूपमा सूचित गर्नुहोस्।
//                 </p>
//                 <p>
//                     यदि निर्धारित समय भित्र कुनै सञ्चार प्राप्त भएन भने, बाँकी रकमहरू सबै उद्देश्यका लागि 
//                     पुष्टि र सही मानिनेछ।
//                 </p>
//             </div>

//             <div class="signature-section">
//                 <div class="signature-container">
//                     <div class="signature-box">
//                         <div class="signature-line"></div>
//                         <div class="signature-label">${company.name || 'कम्पनी'} को लागि</div>
//                         <div class="signature-details">
//                             अधिकृत हस्ताक्षरकर्ता<br>
//                             नाम: ________________<br>
//                             पद: ________________<br>
//                             मिति: ________________
//                         </div>
//                     </div>

//                     <div class="signature-box">
//                         <div class="signature-line"></div>
//                         <div class="signature-label">${party.name || 'पार्टी'} को लागि</div>
//                         <div class="signature-details">
//                             अधिकृत हस्ताक्षरकर्ता<br>
//                             नाम: ________________<br>
//                             पद: ________________<br>
//                             मिति: ________________
//                         </div>
//                     </div>
//                 </div>
//             </div>

//             <div class="footer">
//                 <p>
//                     <strong>गोपनीयता सूचना:</strong> यो कागजात प्राप्तकर्ताको लागि मात्र गोप्य जानकारी समावेश गर्दछ। 
//                     कुनै पनि अनाधिकृत प्रयोग, खुलासा, वा वितरण कडा रूपमा निषेधित छ।
//                 </p>
//                 <p>कागजात आइडी: VAT-CONF-${Date.now()} | छापिएको मिति: ${new Date().toLocaleDateString('ne-NP')}</p>
//             </div>
//         </div>
//         <script>
//             window.onload = function() {
//                 setTimeout(function() {
//                     window.print();
//                     setTimeout(function() {
//                         window.close();
//                     }, 500);
//                 }, 300);
//             };
//         <\/script>
//     </body>
//     </html>`;

//         printWindow.document.write(printContent);
//         printWindow.document.close();
//     };

//     if (!isInitialized) return <Loader />;

//     const selectedPartyDisplay = selectedParty
//         ? `${selectedParty.uniqueNumber || ''} ${selectedParty.name}`.trim()
//         : '';

//     return (
//         <div className="vat-confirmation-page">
//             <Header />

//             <div className="vc-shell">
//                 {/* Compact top bar */}
//                 <div className="vc-topbar">
//                     <div className="vc-topbar__left">
//                         <div className="vc-topbar__icon"><FiFileText /></div>
//                         <div>
//                             <h1>VAT Confirmation</h1>
//                         </div>
//                     </div>
//                     <div className="vc-topbar__actions">
//                         <button
//                             type="button"
//                             className="vc-btn-icon"
//                             onClick={handlePrint}
//                             disabled={!summary}
//                         >
//                             <FiPrinter /> Print (EN)
//                         </button>
//                         <button
//                             type="button"
//                             className="vc-btn-icon"
//                             onClick={handlePrintNepali}
//                             disabled={!summary}
//                         >
//                             <FiPrinter /> Print (नेपाली)
//                         </button>
//                     </div>
//                 </div>

//                 {/* Single-row toolbar */}
//                 <div className="vc-toolbar">
//                     <div className="vc-field vc-field--party">
//                         <label>Party <span className="req">*</span></label>
//                         <input
//                             type="text"
//                             id="account"
//                             className={selectedParty ? '' : 'is-empty'}
//                             value={selectedPartyDisplay}
//                             onClick={() => setShowAccountModal(true)}
//                             readOnly
//                             placeholder="Click to select"
//                         />
//                     </div>

//                     <div className="vc-field vc-field--month">
//                         <label>From <span className="req">*</span></label>
//                         <select
//                             id="startMonth"
//                             ref={startMonthRef}
//                             value={startMonth}
//                             onChange={(e) => setStartMonth(e.target.value)}
//                             onKeyDown={(e) => handleKeyDown(e, 'endMonth')}
//                         >
//                             <option value="">Select</option>
//                             {nepaliMonths.map(month => (
//                                 <option key={month.value} value={month.value}>
//                                     {month.name}
//                                 </option>
//                             ))}
//                         </select>
//                     </div>

//                     <div className="vc-field vc-field--month">
//                         <label>To <span className="req">*</span></label>
//                         <select
//                             id="endMonth"
//                             ref={endMonthRef}
//                             value={endMonth}
//                             onChange={(e) => setEndMonth(e.target.value)}
//                             onKeyDown={(e) => handleKeyDown(e, 'generateReport')}
//                         >
//                             <option value="">Select</option>
//                             {nepaliMonths.map(month => (
//                                 <option key={month.value} value={month.value}>
//                                     {month.name}
//                                 </option>
//                             ))}
//                         </select>
//                     </div>

//                     <button
//                         type="button"
//                         id="generateReport"
//                         ref={generateBtnRef}
//                         className="vc-btn-gen"
//                         onClick={handleGenerateReport}
//                         disabled={!selectedParty || !startMonth || !endMonth || !fiscalYear || loading}
//                     >
//                         {loading
//                             ? <span className="spinner-border spinner-border-sm" style={{ width: 12, height: 12 }} />
//                             : <><i className="bi bi-play-fill" /> Generate</>
//                         }
//                     </button>

//                     <div className="vc-toolbar-divider" />

//                     {/* Period display */}
//                     {startMonth && endMonth && fiscalYear && (
//                         <div className="vc-period">
//                             <FiCalendar className="me-1" style={{ fontSize: '0.65rem' }} />
//                             <span>{getMonthYearDisplay(startMonth)} — {getMonthYearDisplay(endMonth)}</span>
//                         </div>
//                     )}
//                 </div>

//                 {error && (
//                     <div className="vc-alert">
//                         <i className="bi bi-exclamation-circle" />{error}
//                         <button type="button" className="btn-close btn-sm ms-auto" onClick={() => setError('')} />
//                     </div>
//                 )}

//                 {/* Main content area */}
//                 <div className="vc-main">
//                     {loading ? (
//                         <div className="vc-state">
//                             <div className="spinner-border spinner-border-sm text-primary" />
//                             <p style={{ marginTop: '0.5rem' }}>Loading…</p>
//                         </div>
//                     ) : !summary ? (
//                         <div className="vc-state">
//                             <FiUser size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
//                             <h3>No party selected</h3>
//                             <p>Select a party and date range, then click Generate.</p>
//                         </div>
//                     ) : (
//                         <>
//                             <div className="vc-main__bar">
//                                 <span><strong>{summary.party?.name}</strong> · PAN: {summary.party?.pan || '—'}</span>
//                                 <span>{getMonthYearDisplay(startMonth)} — {getMonthYearDisplay(endMonth)}</span>
//                             </div>

//                             <div className="vc-summary-grid">
//                                 <div className="vc-summary-card">
//                                     <div className="vc-summary-card__label">Net Sales</div>
//                                     <div className="vc-summary-card__value vc-value--green">
//                                         Rs. {formatCurrency(summary.summary?.netSales)}
//                                     </div>
//                                 </div>
//                                 <div className="vc-summary-card">
//                                     <div className="vc-summary-card__label">Net VAT</div>
//                                     <div className="vc-summary-card__value vc-value--blue">
//                                         Rs. {formatCurrency(summary.summary?.netSalesVAT)}
//                                     </div>
//                                 </div>
//                                 <div className="vc-summary-card">
//                                     <div className="vc-summary-card__label">Opening Balance</div>
//                                     <div className={`vc-summary-card__value ${summary.summary?.openingBalance > 0 ? 'vc-value--green' : 'vc-value--red'}`}>
//                                         Rs. {formatCurrency(Math.abs(summary.summary?.openingBalance || 0))}
//                                         {' '}{summary.summary?.openingBalance > 0 ? 'Cr' : (summary.summary?.openingBalance < 0 ? 'Dr' : '')}
//                                     </div>
//                                 </div>
//                                 <div className="vc-summary-card">
//                                     <div className="vc-summary-card__label">Closing Balance</div>
//                                     <div className={`vc-summary-card__value ${summary.summary?.closingBalance > 0 ? 'vc-value--green' : 'vc-value--red'}`}>
//                                         Rs. {formatCurrency(Math.abs(summary.summary?.closingBalance || 0))}
//                                         {' '}{summary.summary?.closingBalance > 0 ? 'Cr' : (summary.summary?.closingBalance < 0 ? 'Dr' : '')}
//                                     </div>
//                                 </div>
//                             </div>

//                             <div className="vc-table-scroll">
//                                 <table className="vc-table">
//                                     <thead>
//                                         <tr>
//                                             <th>Particulars</th>
//                                             <th className="num">Amount (Rs.)</th>
//                                             <th className="num">VAT (Rs.)</th>
//                                             <th>Remarks</th>
//                                         </tr>
//                                     </thead>
//                                     <tbody>
//                                         <tr className="vc-section-header"><td colSpan="4"><strong>Sales Transactions</strong></td></tr>
//                                         <tr><td style={{ paddingLeft: '10px' }}>Taxable Sales</td><td className="num">{formatCurrency(summary.summary?.taxableSales)}</td><td className="num">{formatCurrency(summary.summary?.taxableSalesVAT)}</td><td>—</td></tr>
//                                         <tr><td style={{ paddingLeft: '10px' }}>Non-Taxable Sales</td><td className="num">{formatCurrency(summary.summary?.nonTaxableSales)}</td><td className="num">—</td><td>Exempt</td></tr>
//                                         <tr><td style={{ paddingLeft: '10px' }}>Sales Return</td><td className="num">({formatCurrency(summary.summary?.taxableSalesReturn+summary.summary?.nonTaxableSalesReturn)})</td><td className="num">({formatCurrency(summary.summary?.taxableSalesReturnVAT)})</td><td>Credit Note</td></tr>
//                                         <tr className="vc-total-row"><td><strong>Net Sales</strong></td><td className="num"><strong>{formatCurrency(summary.summary?.netSales)}</strong></td><td className="num"><strong>{formatCurrency(summary.summary?.netSalesVAT)}</strong></td><td>—</td></tr>
//                                         <tr className="vc-spacer"><td colSpan="4">&nbsp;</td></tr>
//                                         <tr className="vc-section-header"><td colSpan="4"><strong>Purchase Transactions</strong></td></tr>
//                                         <tr><td style={{ paddingLeft: '10px' }}>Taxable Purchases</td><td className="num">{formatCurrency(summary.summary?.taxablePurchase)}</td><td className="num">{formatCurrency(summary.summary?.taxablePurchaseVAT)}</td><td>—</td></tr>
//                                         <tr><td style={{ paddingLeft: '10px' }}>Non-Taxable Purchase</td><td className="num">{formatCurrency(summary.summary?.nonTaxablePurchase)}</td><td className="num">—</td><td>Exempt</td></tr>
//                                         <tr><td style={{ paddingLeft: '10px' }}>Purchase Return</td><td className="num">({formatCurrency(summary.summary?.taxablePurchaseReturn+summary.summary?.nonTaxablePurchaseReturn)})</td><td className="num">({formatCurrency(summary.summary?.taxablePurchaseReturnVAT)})</td><td>Debit Note</td></tr>
//                                         <tr className="vc-total-row"><td><strong>Net Purchases</strong></td><td className="num"><strong>{formatCurrency(summary.summary?.netPurchase)}</strong></td><td className="num"><strong>{formatCurrency(summary.summary?.netPurchaseVAT)}</strong></td><td>—</td></tr>
//                                         <tr className="vc-spacer"><td colSpan="4">&nbsp;</td></tr>
//                                         <tr className="vc-section-header"><td colSpan="4"><strong>Account Balances</strong></td></tr>
//                                         <tr className="vc-balance-row"><td>Opening Balance</td><td className="num"><strong>{formatCurrency(Math.abs(summary.summary?.openingBalance || 0))} {summary.summary?.openingBalance > 0 ? 'Cr' : (summary.summary?.openingBalance < 0 ? 'Dr' : '')}</strong></td><td className="num">—</td><td>B/F</td></tr>
//                                         <tr className="vc-balance-row"><td>Closing Balance</td><td className="num"><strong>{formatCurrency(Math.abs(summary.summary?.closingBalance || 0))} {summary.summary?.closingBalance > 0 ? 'Cr' : (summary.summary?.closingBalance < 0 ? 'Dr' : '')}</strong></td><td className="num">—</td><td>C/F</td></tr>
//                                     </tbody>
//                                 </table>
//                             </div>

//                             <div className="vc-main__footer">
//                                 <button
//                                     className="vc-btn-primary"
//                                     onClick={() => setShowPreview(true)}
//                                 >
//                                     <FiFileText className="me-1" style={{ fontSize: '12px' }} />
//                                     Generate Confirmation Letter
//                                 </button>
//                             </div>
//                         </>
//                     )}
//                 </div>
//             </div>

//             {/* Preview Modal */}
//             {showPreview && (
//                 <div className="vc-modal-overlay" onClick={() => setShowPreview(false)}>
//                     <div className="vc-modal" onClick={e => e.stopPropagation()}>
//                         <div className="vc-modal-header">
//                             <h5>VAT Confirmation Letter Preview</h5>
//                             <button type="button" className="btn-close" onClick={() => setShowPreview(false)} />
//                         </div>
//                         <div className="vc-modal-body">
//                             {summary && (
//                                 <table className="vc-table vc-table--preview">
//                                     <thead>
//                                         <tr>
//                                             <th>Particulars</th>
//                                             <th className="num">Amount (Rs.)</th>
//                                             <th className="num">VAT (Rs.)</th>
//                                             <th>Remarks</th>
//                                         </tr>
//                                     </thead>
//                                     <tbody>
//                                         <tr><td><strong>Taxable Sales</strong></td><td className="num">{formatCurrency(summary.summary?.taxableSales)}</td><td className="num">{formatCurrency(summary.summary?.taxableSalesVAT)}</td><td>—</td></tr>
//                                         <tr><td><strong>Non-Taxable Sales</strong></td><td className="num">{formatCurrency(summary.summary?.nonTaxableSales)}</td><td className="num">—</td><td>Exempt</td></tr>
//                                         <tr><td><strong>Less: Sales Return</strong></td><td className="num">({formatCurrency(summary.summary?.salesReturn)})</td><td className="num">({formatCurrency(summary.summary?.salesReturnVAT)})</td><td>Credit Note</td></tr>
//                                         <tr className="vc-total-row"><td><strong>Net Sales</strong></td><td className="num"><strong>{formatCurrency(summary.summary?.netSales)}</strong></td><td className="num"><strong>{formatCurrency(summary.summary?.netSalesVAT)}</strong></td><td>—</td></tr>
//                                         <tr className="vc-spacer"><td colSpan="4">&nbsp;</td></tr>
//                                         <tr><td><strong>Taxable Purchases</strong></td><td className="num">{formatCurrency(summary.summary?.taxablePurchase)}</td><td className="num">{formatCurrency(summary.summary?.taxablePurchaseVAT)}</td><td>—</td></tr>
//                                         <tr><td><strong>Non-Taxable Purchase</strong></td><td className="num">{formatCurrency(summary.summary?.nonTaxablePurchase)}</td><td className="num">—</td><td>Exempt</td></tr>
//                                         <tr><td><strong>Less: Purchase Return</strong></td><td className="num">({formatCurrency(summary.summary?.purchaseReturn)})</td><td className="num">({formatCurrency(summary.summary?.purchaseReturnVAT)})</td><td>Debit Note</td></tr>
//                                         <tr className="vc-total-row"><td><strong>Net Purchases</strong></td><td className="num"><strong>{formatCurrency(summary.summary?.netPurchase)}</strong></td><td className="num"><strong>{formatCurrency(summary.summary?.netPurchaseVAT)}</strong></td><td>—</td></tr>
//                                         <tr className="vc-spacer"><td colSpan="4">&nbsp;</td></tr>
//                                         <tr><td><strong>Opening Balance</strong></td><td className="num">{formatCurrency(Math.abs(summary.summary?.openingBalance || 0))} {summary.summary?.openingBalance > 0 ? 'Cr' : (summary.summary?.openingBalance < 0 ? 'Dr' : '')}</td><td className="num">—</td><td>B/F</td></tr>
//                                         <tr><td><strong>Closing Balance</strong></td><td className="num">{formatCurrency(Math.abs(summary.summary?.closingBalance || 0))} {summary.summary?.closingBalance > 0 ? 'Cr' : (summary.summary?.closingBalance < 0 ? 'Dr' : '')}</td><td className="num">—</td><td>C/F</td></tr>
//                                     </tbody>
//                                 </table>
//                             )}
//                         </div>
//                         <div className="vc-modal-footer">
//                             <button className="vc-btn-secondary" onClick={() => setShowPreview(false)}>Close</button>
//                             <button className="vc-btn-primary" onClick={handlePrint}><FiPrinter className="me-1" /> Print (EN)</button>
//                             <button className="vc-btn-primary" onClick={handlePrintNepali}><FiPrinter className="me-1" /> Print (नेपाली)</button>
//                         </div>
//                     </div>
//                 </div>
//             )}

//             {/* Account Selection Modal */}
//             {showAccountModal && (
//                 <div className="vc-modal-overlay" onClick={() => setShowAccountModal(false)}>
//                     <div className="vc-modal vc-modal--xl" onClick={e => e.stopPropagation()}>
//                         <div className="vc-modal-header">
//                             <h5>Select Account</h5>
//                             <small className="ms-auto text-muted" style={{ fontSize: '0.65rem' }}>
//                                 {totalAccounts > 0 ? `${accounts.length} of ${totalAccounts}` : 'Loading…'}
//                             </small>
//                             <button type="button" className="btn-close" onClick={() => {
//                                 setShowAccountModal(false);
//                                 setTimeout(() => {
//                                     const targetId = getFocusTargetOnModalClose();
//                                     document.getElementById(targetId)?.focus();
//                                 }, 50);
//                             }} />
//                         </div>
//                         <div className="vc-modal-body" style={{ padding: '0.5rem' }}>
//                             <input
//                                 type="text"
//                                 id="searchAccount"
//                                 className="vc-search-input"
//                                 placeholder="Search account..."
//                                 autoFocus
//                                 autoComplete="off"
//                                 value={accountSearchQuery}
//                                 onChange={handleAccountSearch}
//                                 ref={accountSearchRef}
//                             />
//                             <div style={{ height: '300px', marginTop: '0.5rem' }}>
//                                 <VirtualizedAccountList
//                                     accounts={accounts}
//                                     onAccountClick={selectAccount}
//                                     searchRef={accountSearchRef}
//                                     hasMore={hasMoreAccountResults}
//                                     isSearching={isAccountSearching}
//                                     onLoadMore={loadMoreAccounts}
//                                     totalAccounts={totalAccounts}
//                                     page={accountSearchPage}
//                                     searchQuery={accountShouldShowLastSearchResults ? accountLastSearchQuery : accountSearchQuery}
//                                 />
//                             </div>
//                         </div>
//                     </div>
//                 </div>
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

// export default VATConfirmationLetter;

//-------------------------------------------------------------end1

// VATConfirmationLetter.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiUser, FiCalendar, FiFileText, FiPrinter } from 'react-icons/fi';
import Header from './retailer/Header';
import Loader from './Loader';
import NotificationToast from './NotificationToast';
import VirtualizedAccountList from './VirtualizedAccountList';
import AccountModalForPaymentReceipt from '../components/retailer/payment/AccountModalForPaymentReceipt';
import NepaliDate from 'nepali-datetime';
import './VATConfirmationLetter.css';
import api, { refreshToken } from '../components/services/api';

// Helper functions for date conversion
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

// Helper function to get last day of Nepali month
const getLastDayOfNepaliMonth = (year, month) => {
    const nepaliMonthDays = [31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30, 30];
    const leapYears = [2072, 2076, 2080, 2084, 2088, 2092, 2096, 2100, 2104, 2108];
    if (month === 11 && leapYears.includes(year)) return 31;
    return nepaliMonthDays[month - 1];
};

const getAdDateRangeForNepaliMonth = (year, month) => {
    try {
        const firstDayNepali = new NepaliDate(year, month - 1, 1);
        const lastDayNum = getLastDayOfNepaliMonth(year, month);
        const lastDayNepali = new NepaliDate(year, month - 1, lastDayNum);
        return {
            fromDateAd: convertBsToAd(firstDayNepali.format('YYYY-MM-DD')),
            toDateAd: convertBsToAd(lastDayNepali.format('YYYY-MM-DD'))
        };
    } catch { return { fromDateAd: null, toDateAd: null }; }
};

const VATConfirmationLetter = () => {
    const [notification, setNotification] = useState({
        show: false, message: '', type: 'success', duration: 3000
    });

    // Account search states - SAME as AddPayment
    const [accounts, setAccounts] = useState([]);
    const [isAccountSearching, setIsAccountSearching] = useState(false);
    const [accountSearchResults, setAccountSearchResults] = useState([]);
    const [accountSearchPage, setAccountSearchPage] = useState(1);
    const [hasMoreAccountResults, setHasMoreAccountResults] = useState(false);
    const [totalAccounts, setTotalAccounts] = useState(0);
    const [accountSearchQuery, setAccountSearchQuery] = useState('');
    const [accountLastSearchQuery, setAccountLastSearchQuery] = useState('');
    const [accountShouldShowLastSearchResults, setAccountShouldShowLastSearchResults] = useState(false);
    const [showAccountModal, setShowAccountModal] = useState(false);
    const [showAccountCreationModal, setShowAccountCreationModal] = useState(false);
    const [selectedAccountId, setSelectedAccountId] = useState('');

    const [selectedParty, setSelectedParty] = useState(null);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPreview, setShowPreview] = useState(false);
    const [startMonth, setStartMonth] = useState('');
    const [endMonth, setEndMonth] = useState('');
    const [fiscalYear, setFiscalYear] = useState('');
    const [companyDateFormat, setCompanyDateFormat] = useState('nepali');
    const [isInitialized, setIsInitialized] = useState(false);
    const [fromDateAd, setFromDateAd] = useState('');
    const [toDateAd, setToDateAd] = useState('');

    const navigate = useNavigate();
    const startMonthRef = useRef(null);
    const endMonthRef = useRef(null);
    const accountSearchRef = useRef(null);
    const generateBtnRef = useRef(null);
    const abortControllerRef = useRef(null);

    // Nepali months
    const nepaliMonths = [
        { value: 1, name: "Baisakh" }, { value: 2, name: "Jestha" },
        { value: 3, name: "Ashad" }, { value: 4, name: "Shrawan" },
        { value: 5, name: "Bhadra" }, { value: 6, name: "Ashoj" },
        { value: 7, name: "Kartik" }, { value: 8, name: "Mangsir" },
        { value: 9, name: "Poush" }, { value: 10, name: "Magh" },
        { value: 11, name: "Falgun" }, { value: 12, name: "Chaitra" }
    ];

    const nepaliMonthsNames = {
        1: "बैशाख", 2: "जेठ", 3: "असार", 4: "साउन",
        5: "भदौ", 6: "असोज", 7: "कात्तिक", 8: "मंसिर",
        9: "पौष", 10: "माघ", 11: "फागुन", 12: "चैत्र"
    };

    const parseFiscalYear = (fiscalYearStr) => {
        if (!fiscalYearStr) return { startYear: null, endYear: null };
        if (fiscalYearStr.includes('/')) {
            const parts = fiscalYearStr.split('/');
            const startYear = parseInt(parts[0]);
            let endYear = parts[1].length === 2
                ? Math.floor(startYear / 100) * 100 + parseInt(parts[1])
                : parseInt(parts[1]);
            return { startYear, endYear };
        }
        return { startYear: parseInt(fiscalYearStr), endYear: parseInt(fiscalYearStr) + 1 };
    };

    const getYearForMonth = (monthValue) => {
        if (!fiscalYear) return null;
        const { startYear, endYear } = parseFiscalYear(fiscalYear);
        if (!startYear || !endYear) return null;
        const monthNum = parseInt(monthValue);
        return monthNum <= 3 ? endYear : startYear;
    };

    const getMonthName = (monthValue) => {
        return nepaliMonths.find(m => m.value === parseInt(monthValue))?.name || '';
    };

    const getMonthYearDisplay = (monthValue) => {
        if (!monthValue || !fiscalYear) return '';
        const monthName = getMonthName(monthValue);
        const year = getYearForMonth(monthValue);
        return `${monthName} ${year}`;
    };

    // Update AD date range when start/end month changes
    useEffect(() => {
        if (startMonth && fiscalYear) {
            const startYear = getYearForMonth(startMonth);
            if (startYear) {
                const { fromDateAd } = getAdDateRangeForNepaliMonth(startYear, parseInt(startMonth));
                setFromDateAd(fromDateAd || '');
            }
        }
    }, [startMonth, fiscalYear]);

    useEffect(() => {
        if (endMonth && fiscalYear) {
            const endYear = getYearForMonth(endMonth);
            if (endYear) {
                const { toDateAd } = getAdDateRangeForNepaliMonth(endYear, parseInt(endMonth));
                setToDateAd(toDateAd || '');
            }
        }
    }, [endMonth, fiscalYear]);

    const fetchAccountsFromBackend = useCallback(async (searchTerm = '', page = 1) => {
        try {
            setIsAccountSearching(true);
            const response = await api.get('/api/retailer/accounts/search', {
                params: {
                    search: searchTerm,
                    page: page,
                    limit: searchTerm.trim() ? 15 : 25,
                }
            });
            if (response.data.success) {
                if (page === 1) {
                    setAccountSearchResults(response.data.accounts);
                    setAccounts(response.data.accounts);
                } else {
                    setAccountSearchResults(prev => [...prev, ...response.data.accounts]);
                    setAccounts(prev => [...prev, ...response.data.accounts]);
                }
                setHasMoreAccountResults(response.data.pagination.hasNextPage);
                setTotalAccounts(response.data.pagination.totalAccounts);
                setAccountSearchPage(page);
                if (searchTerm.trim() !== '') {
                    setAccountLastSearchQuery(searchTerm);
                    setAccountShouldShowLastSearchResults(true);
                }
            }
        } catch (error) {
            console.error('Error fetching accounts:', error);
            setNotification({ show: true, message: 'Error loading accounts', type: 'error' });
        } finally {
            setIsAccountSearching(false);
        }
    }, [api]);


    // Load accounts when modal opens
    useEffect(() => {
        if (showAccountModal) {
            setAccountSearchQuery('');
            setAccountSearchPage(1);
            if (accountShouldShowLastSearchResults && accountLastSearchQuery.trim() !== '') {
                fetchAccountsFromBackend(accountLastSearchQuery, 1);
            } else {
                fetchAccountsFromBackend('', 1);
            }
        }
    }, [showAccountModal, fetchAccountsFromBackend]);

    const loadMoreAccounts = () => {
        if (!isAccountSearching && hasMoreAccountResults) {
            const nextPage = accountSearchPage + 1;
            fetchAccountsFromBackend(accountSearchQuery, nextPage, true);
        }
    };

    const handleAccountSearch = (e) => {
        const searchText = e.target.value;
        setAccountSearchQuery(searchText);
        setAccountSearchPage(1);
        if (searchText.trim() !== '' && accountShouldShowLastSearchResults) {
            setAccountShouldShowLastSearchResults(false);
            setAccountLastSearchQuery('');
        }
        const timer = setTimeout(() => {
            fetchAccountsFromBackend(searchText, 1);
        }, 300);
        return () => clearTimeout(timer);
    };

    // Account modal handlers - SAME as AddPayment
    const handleAccountModalClose = () => {
        setShowAccountModal(false);
    };

    const handleAccountCreationModalClose = () => {
        setShowAccountCreationModal(false);
        setShowAccountModal(true);
        fetchAccountsFromBackend('', 1);
    };

    const selectAccount = (account) => {
        setSelectedParty(account);
        setSelectedAccountId(account.id);
        setShowAccountModal(false);
        setAccountSearchQuery('');
        setTimeout(() => startMonthRef.current?.focus(), 100);
    };

    // Fetch initial data
    const fetchInitialData = useCallback(async () => {
        try {
            const response = await api.get('/api/retailer/party-summary-entry-data');
            if (response.data.success) {
                setFiscalYear(response.data.data.fiscalYearName);
                setCompanyDateFormat(response.data.data.dateFormat);
                setIsInitialized(true);
            }
        } catch {
            setFiscalYear('2082/83');
            setCompanyDateFormat('nepali');
            setIsInitialized(true);
        }
    }, [api]);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    useEffect(() => {
        const timer = setTimeout(() => setShowAccountModal(true), 100);
        return () => clearTimeout(timer);
    }, []);

    // Load party summary
    const loadPartySummaryByMonthRange = useCallback(async (accountId, startYear, startMonth, endYear, endMonth, fromDateAd, toDateAd) => {
        abortControllerRef.current?.abort();
        abortControllerRef.current = new AbortController();
        try {
            setLoading(true);
            setError('');
            const response = await api.get(`/api/retailer/party-summary-by-month-range/${accountId}`, {
                params: { startYear, startMonth, endYear, endMonth, fromDate: fromDateAd, toDate: toDateAd },
                signal: abortControllerRef.current.signal
            });
            if (response.data.success) {
                setSummary(response.data.data);
                if (response.data.data?.fiscalYear) setFiscalYear(response.data.data.fiscalYear);
            } else {
                setError(response.data.error || 'Failed to load party summary');
                setNotification({ show: true, message: response.data.error || 'Failed to load party summary', type: 'error' });
            }
        } catch (err) {
            if (err.name === 'AbortError' || err.name === 'CanceledError') return;
            console.error('Error loading summary:', err);
            const msg = err.response?.data?.error || 'Failed to load party summary';
            setError(msg);
            setNotification({ show: true, message: msg, type: 'error' });
        } finally {
            setLoading(false);
        }
    }, [api]);

    const handleGenerateReport = useCallback(() => {
        if (!selectedParty) {
            setNotification({ show: true, message: 'Please select a party first', type: 'warning' });
            return;
        }
        if (!startMonth || !endMonth) {
            setNotification({ show: true, message: 'Please select start and end month', type: 'warning' });
            return;
        }
        if (!fiscalYear) {
            setNotification({ show: true, message: 'Fiscal year not loaded', type: 'warning' });
            return;
        }

        const startMonthNum = parseInt(startMonth);
        const endMonthNum = parseInt(endMonth);
        const startYear = getYearForMonth(startMonth);
        const endYear = getYearForMonth(endMonth);

        if (!startYear || !endYear) {
            setNotification({ show: true, message: 'Invalid year calculation', type: 'warning' });
            return;
        }

        let isValid = false;
        if (startYear === endYear) {
            isValid = startMonthNum <= endMonthNum;
        } else if (startYear < endYear) {
            isValid = true;
        }

        if (!isValid) {
            setNotification({ show: true, message: 'Invalid date range', type: 'warning' });
            return;
        }

        if (!fromDateAd || !toDateAd) {
            setNotification({ show: true, message: 'Unable to calculate date range', type: 'warning' });
            return;
        }

        loadPartySummaryByMonthRange(selectedParty.id, startYear, startMonthNum, endYear, endMonthNum, fromDateAd, toDateAd);
    }, [selectedParty, startMonth, endMonth, fiscalYear, fromDateAd, toDateAd, loadPartySummaryByMonthRange]);

    const formatCurrency = useCallback((amount) => {
        if (amount == null) return '0.00';
        return parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }, []);

    const formatDate = useCallback((date) => {
        if (!date) return '';
        return new Date(date).toLocaleDateString('en-NP');
    }, []);

    const handleKeyDown = useCallback((e, nextId) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (nextId) {
                document.getElementById(nextId)?.focus();
            } else {
                handleGenerateReport();
            }
        }
    }, [handleGenerateReport]);

    const getFocusTargetOnModalClose = useCallback(() => {
        return startMonthRef.current ? 'startMonth' : 'startMonth';
    }, []);

    const handlePrint = () => {
        if (!summary) {
            setNotification({ show: true, message: 'No data to print', type: 'warning' });
            return;
        }

        const printWindow = window.open("", "_blank");
        if (!printWindow) {
            setNotification({ show: true, message: 'Popup blocked', type: 'error' });
            return;
        }

        const summaryData = summary.summary;
        const company = summary.company;
        const party = summary.party;
        const currentFiscalYear = summary.fiscalYear || fiscalYear;

        const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>VAT and Balance Confirmation Letter</title>
            <style>
                * { -webkit-print-color-adjust: exact; print-color-adjust: exact; box-sizing: border-box; margin: 0; padding: 0; }
                @media print { @page { size: A4; margin: 10mm 15mm; } body { font-family: "Times New Roman", Times, serif; font-size: 11pt; } }
                body { font-family: "Times New Roman", Times, serif; margin: 0; padding: 15px; font-size: 11pt; }
                .document-title { text-align: center; margin: 12px 0; padding: 6px; background: #f5f5f5; border: 1px solid #000; }
                .document-title h1 { margin: 0; font-size: 14pt; }
                .details-container { display: flex; gap: 15px; margin-bottom: 12px; }
                .company-info, .party-info { border: 1px solid #000; padding: 8px; flex: 1; }
                .info-header { background: #000; color: white; padding: 4px 8px; margin: -8px -8px 6px -8px; }
                .info-content p { margin: 1px 0; font-size: 9pt; }
                .meta-info { display: flex; justify-content: space-between; margin-bottom: 10px; padding: 6px; background: #f8f9fa; }
                .transaction-table { width: 100%; border-collapse: collapse; margin: 12px 0; border: 1px solid #000; }
                .transaction-table th, .transaction-table td { border: 1px solid #000; padding: 4px 5px; }
                .transaction-table th { background: #000; color: white; text-align: center; }
                .text-end { text-align: right; }
                .section-header { background: #d3d3d3; font-weight: bold; }
                .total-row { background: #e8f5e8; font-weight: bold; }
                .balance-row { background: #fffacd; font-weight: bold; }
                .content-section { margin: 10px 0; }
                .signature-container { display: flex; gap: 20px; margin-top: 25px; }
                .signature-box { flex: 1; text-align: center; }
                .signature-line { border-top: 1px solid #000; margin: 30px 0 4px 0; }
                .footer { margin-top: 12px; text-align: center; font-size: 7pt; border-top: 1px solid #ccc; padding-top: 5px; }
            </style>
        </head>
        <body>
            <div class="document-title"><h1>VAT AND BALANCE CONFIRMATION LETTER</h1><p>Fiscal Year: ${currentFiscalYear || ''} | Generated on: ${formatDate(new Date())}</p></div>
            <div class="details-container">
                <div class="company-info"><div class="info-header">FROM</div><div class="info-content"><p><strong>${company.name || ''}</strong></p><p>Address: ${company.address || ''}</p><p>Phone: ${company.phone || ''}</p><p>PAN: ${company.pan || ''}</p></div></div>
                <div class="party-info"><div class="info-header">TO</div><div class="info-content"><p><strong>${party.name || ''}</strong></p><p>Address: ${party.address || ''}</p><p>Phone: ${party.phone || ''}</p><p>PAN: ${party.pan || ''}</p></div></div>
            </div>
            <div class="meta-info"><div><strong>Reference No:</strong><br>CONF${(currentFiscalYear || '').replace('/', '')}/${Date.now().toString().slice(-4)}</div><div><strong>Period:</strong><br>${getMonthYearDisplay(startMonth)} to ${getMonthYearDisplay(endMonth)}</div><div><strong>Page:</strong><br>1 of 1</div></div>
            <div class="content-section"><p>Dear Sir/Madam,</p><p>In accordance with standard accounting practices, we hereby submit the transaction summary for the fiscal year <strong>${currentFiscalYear || ''}</strong>.</p><p>Please find below the detailed transaction summary for the period <strong>${getMonthYearDisplay(startMonth)} to ${getMonthYearDisplay(endMonth)}</strong>:</p></div>
            <table class="transaction-table">
                <thead><tr><th>Particulars</th><th class="text-end">Amount (Rs.)</th><th class="text-end">VAT Amount (Rs.)</th><th>Remarks</th></tr></thead>
                <tbody>
                    <tr class="section-header"><td colspan="4"><strong>SALES TRANSACTIONS</strong></td></tr>
                    <tr><td style="padding-left: 10px;">Taxable Sales</td><td class="text-end">${formatCurrency(summaryData?.taxableSales)}</td><td class="text-end">${formatCurrency(summaryData?.taxableSalesVAT)}</td><td class="text-center">-</td></tr>
                    <tr><td style="padding-left: 10px;">Non-Taxable Sales</td><td class="text-end">${formatCurrency(summaryData?.nonTaxableSales)}</td><td class="text-end">-</td><td class="text-center">Exempt</td></tr>
                    <tr><td style="padding-left: 10px;">Sales Return</td><td class="text-end">(${formatCurrency(summaryData?.salesReturn)})</td><td class="text-end">(${formatCurrency(summaryData?.salesReturnVAT)})</td><td class="text-center">Credit Note</td></tr>
                    <tr class="total-row"><td><strong>NET SALES</strong></td><td class="text-end"><strong>${formatCurrency(summaryData?.netSales)}</strong></td><td class="text-end"><strong>${formatCurrency(summaryData?.netSalesVAT)}</strong></td><td class="text-center">-</td></tr>
                    <tr class="section-header"><td colspan="4"><strong>PURCHASE TRANSACTIONS</strong></td></tr>
                    <tr><td style="padding-left: 10px;">Taxable Purchases</td><td class="text-end">${formatCurrency(summaryData?.taxablePurchase)}</td><td class="text-end">${formatCurrency(summaryData?.taxablePurchaseVAT)}</td><td class="text-center">-</td></tr>
                    <tr><td style="padding-left: 10px;">Non-Taxable Purchase</td><td class="text-end">${formatCurrency(summaryData?.nonTaxablePurchase)}</td><td class="text-end">-</td><td class="text-center">Exempt</td></tr>
                    <tr><td style="padding-left: 10px;">Purchase Return</td><td class="text-end">(${formatCurrency(summaryData?.purchaseReturn)})</td><td class="text-end">(${formatCurrency(summaryData?.purchaseReturnVAT)})</td><td class="text-center">Debit Note</td></tr>
                    <tr class="total-row"><td><strong>NET PURCHASES</strong></td><td class="text-end"><strong>${formatCurrency(summaryData?.netPurchase)}</strong></td><td class="text-end"><strong>${formatCurrency(summaryData?.netPurchaseVAT)}</strong></td><td class="text-center">-</td></tr>
                    <tr class="section-header"><td colspan="4"><strong>ACCOUNT BALANCES</strong></td></tr>
                    <tr class="balance-row"><td>Opening Balance as on ${getMonthYearDisplay(startMonth)} 1st</td><td class="text-end"><strong>${formatCurrency(Math.abs(summaryData?.openingBalance || 0))} ${summaryData?.openingBalance > 0 ? 'Cr' : (summaryData?.openingBalance < 0 ? 'Dr' : '')}</strong></td><td class="text-end">-</td><td class="text-center">B/F</td></tr>
                    <tr class="balance-row"><td>Closing Balance as on ${getMonthYearDisplay(endMonth)} End</td><td class="text-end"><strong>${formatCurrency(Math.abs(summaryData?.closingBalance || 0))} ${summaryData?.closingBalance > 0 ? 'Cr' : (summaryData?.closingBalance < 0 ? 'Dr' : '')}</strong></td><td class="text-end">-</td><td class="text-center">C/F</td></tr>
                </tbody>
            </table>
            <div class="content-section">
                <p>
                    Kindly verify the above transactions and account balances. If the details are correct, 
                    please sign and return the duplicate copy of this letter within <strong>15 days</strong>. 
                    Any discrepancies should be communicated to us in writing within the same period.
                </p>
                <p>
                    If no communication is received within the stipulated time, the balances will be 
                    considered as confirmed and correct for all purposes.
                </p>            </div>
            <div class="signature-section"><div class="signature-container"><div class="signature-box"><div class="signature-line"></div><div class="signature-label">For ${company.name || 'Company'}</div></div><div class="signature-box"><div class="signature-line"></div><div class="signature-label">For ${party.name || 'Party'}</div></div></div></div>
            <div class="footer"><p>Document ID: VAT-CONF-${Date.now()} | Printed on: ${new Date().toLocaleDateString()}</p></div>
            <script>window.onload = function() { setTimeout(function() { window.print(); setTimeout(function() { window.close(); }, 500); }, 300); };</script>
        </body>
        </html>`;

        printWindow.document.write(printContent);
        printWindow.document.close();
    };

    const handlePrintNepali = () => {
        if (!summary) {
            setNotification({ show: true, message: 'कृपया पहिले रिपोर्ट जेनरेट गर्नुहोस्', type: 'warning' });
            return;
        }

        const printWindow = window.open("", "_blank");
        if (!printWindow) {
            setNotification({ show: true, message: 'पपअप ब्लक गरिएको छ। कृपया यो साइटको लागि पपअप अनुमति दिनुहोस्।', type: 'error' });
            return;
        }

        const summaryData = summary.summary;
        const company = summary.company;
        const party = summary.party;
        const currentFiscalYear = summary.fiscalYear || fiscalYear;

        // Get month names in Nepali
        const startMonthNum = parseInt(startMonth);
        const endMonthNum = parseInt(endMonth);
        const startMonthNameNepali = nepaliMonthsNames[startMonthNum] || '';
        const endMonthNameNepali = nepaliMonthsNames[endMonthNum] || '';
        const startYear = getYearForMonth(startMonth);
        const endYear = getYearForMonth(endMonth);

        const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>भ्याट तथा बाँकी सुनिश्चितता पत्र - ${party.name || ''}</title>
        <style>
            * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                box-sizing: border-box;
                margin: 0;
                padding: 0;
            }

            @media print {
                @page {
                    size: A4;
                    margin: 10mm 15mm;
                }
                body {
                    font-family: 'Mangal', 'Nirmala UI', 'Preeti', 'Times New Roman', Times, serif !important;
                    line-height: 1.2;
                    color: #000000 !important;
                    background: white !important;
                    font-size: 11pt;
                }
            }

            body {
                font-family: 'Mangal', 'Nirmala UI', 'Preeti', 'Times New Roman', Times, serif;
                margin: 0;
                padding: 15px;
                font-size: 11pt;
                line-height: 1.2;
                color: #000000;
                background: white;
            }

            .print-container {
                max-width: 100%;
                margin: 0 auto;
            }

            .document-title {
                text-align: center;
                margin: 12px 0;
                padding: 6px;
                background: #f5f5f5 !important;
                border: 1px solid #000000;
            }

            .document-title h1 {
                margin: 0;
                font-size: 14pt;
                font-weight: bold;
            }

            .details-container {
                display: flex;
                gap: 15px;
                margin-bottom: 12px;
            }

            .company-info, .party-info {
                border: 1px solid #000000;
                padding: 8px;
                flex: 1;
            }

            .info-header {
                background: #000000 !important;
                color: white !important;
                padding: 4px 8px;
                margin: -8px -8px 6px -8px;
                font-size: 10pt;
                font-weight: bold;
            }

            .info-content p {
                margin: 1px 0;
                font-size: 9pt;
            }

            .meta-info {
                display: flex;
                justify-content: space-between;
                margin-bottom: 10px;
                padding: 6px;
                background: #f8f9fa !important;
                font-size: 9pt;
            }

            .transaction-table {
                width: 100%;
                border-collapse: collapse;
                margin: 12px 0;
                font-size: 9pt;
                border: 1px solid #000000;
            }

            .transaction-table th {
                background: #000000 !important;
                color: white !important;
                border: 1px solid #000000;
                padding: 5px 6px;
                text-align: center;
                font-weight: bold;
            }

            .transaction-table td {
                border: 1px solid #000000;
                padding: 4px 5px;
                text-align: left;
            }

            .transaction-table .text-end {
                text-align: right;
            }

            .transaction-table .text-center {
                text-align: center;
            }

            .section-header {
                background: #d3d3d3 !important;
                font-weight: bold;
            }

            .total-row {
                background: #e8f5e8 !important;
                font-weight: bold;
            }

            .balance-row {
                background: #fffacd !important;
                font-weight: bold;
            }

            .content-section {
                margin: 10px 0;
                line-height: 1.2;
                font-size: 10pt;
            }

            .content-section p {
                margin: 4px 0;
            }

            .signature-section {
                margin-top: 15px;
            }

            .signature-container {
                display: flex;
                gap: 20px;
                margin-top: 25px;
            }

            .signature-box {
                flex: 1;
                text-align: center;
            }

            .signature-line {
                border-top: 1px solid #000000;
                margin: 30px 0 4px 0;
            }

            .signature-label {
                font-weight: bold;
                margin: 4px 0;
                font-size: 10pt;
            }

            .footer {
                margin-top: 12px;
                text-align: center;
                font-size: 7pt;
                border-top: 1px solid #ccc;
                padding-top: 5px;
            }

            .negative-amount {
                font-style: italic;
            }

            .text-success {
                color: #28a745 !important;
            }
            .text-danger {
                color: #dc3545 !important;
            }
        </style>
    </head>
    <body>
        <div class="print-container">
            <div class="document-title">
                <h1>भ्याट तथा बाँकी सुनिश्चितता पत्र</h1>
                <p style="margin: 1px 0; font-size: 9pt;">
                    आर्थिक वर्ष: ${currentFiscalYear || ''} | जारी मिति: ${formatDate(new Date())}
                </p>
            </div>

            <div class="details-container">
                <div class="company-info">
                    <div class="info-header">बाट</div>
                    <div class="info-content">
                        <p style="font-weight: bold; margin-bottom: 3px;">${company.name || ''}</p>
                        <p>ठेगाना: ${company.address || ''}</p>
                        <p>फोन: ${company.phone || ''}</p>
                        <p>प्यान: ${company.pan || ''}</p>
                    </div>
                </div>

                <div class="party-info">
                    <div class="info-header">लाई</div>
                    <div class="info-content">
                        <p style="font-weight: bold; margin-bottom: 3px;">${party.name || ''}</p>
                        <p>ठेगाना: ${party.address || ''}</p>
                        <p>फोन: ${party.phone || ''}</p>
                        <p>प्यान: ${party.pan || ''}</p>
                    </div>
                </div>
            </div>

            <div class="meta-info">
                <div style="flex: 1; text-align: left;">
                    <strong>सन्दर्भ नम्बर:</strong><br>
                    CONF${(currentFiscalYear || '').replace('/', '')}/${Date.now().toString().slice(-4)}
                </div>
                <div style="flex: 1; text-align: center;">
                    <strong>अवधि:</strong><br>
                    ${startMonthNameNepali} ${startYear} देखि ${endMonthNameNepali} ${endYear}
                </div>
                <div style="flex: 1; text-align: right;">
                    <strong>पृष्ठ:</strong><br>
                    १/१
                </div>
            </div>

            <div class="content-section">
                <p>प्रिय महोदय/महोदया,</p>
                <p>
                    प्रचलित लेखा मान्यता र नियामक आवश्यकताहरू अनुसार, हामी तपाईंको पुनरावलोकन र सुनिश्चितताको लागि आर्थिक वर्ष 
                    <strong>${currentFiscalYear || ''}</strong> को निम्नलिखित कारोबार सारांश र बाँकी सुनिश्चितता पेश गर्दछौं।
                </p>
                <p>
                    कृपया तल विस्तृत कारोबार सारांश र मिति समाप्त हुँदाको बाँकी रकम हेर्नुहोस्:
                </p>
            </div>

            <table class="transaction-table">
                <thead>
                    <tr>
                        <th style="width: 45%;">विवरण</th>
                        <th style="width: 25%;">रकम (रु.)</th>
                        <th style="width: 20%;">भ्याट रकम (रु.)</th>
                        <th style="width: 10%;">टिप्पणी</th>
                    </tr>
                </thead>
                <tbody>
                    <tr class="section-header">
                        <td colspan="4"><strong>बिक्री कारोबारहरू</strong></td>
                    </tr>
                    <tr>
                        <td style="padding-left: 10px;">कर योग्य बिक्री</td>
                        <td class="text-end">${formatCurrency(summaryData?.taxableSales)}</td>
                        <td class="text-end">${formatCurrency(summaryData?.taxableSalesVAT)}</td>
                        <td class="text-center">-</td>
                    </tr>
                    <tr>
                        <td style="padding-left: 10px;">कर छुटको बिक्री</td>
                        <td class="text-end">${formatCurrency(summaryData?.nonTaxableSales)}</td>
                        <td class="text-end">-</td>
                        <td class="text-center">छुट</td>
                    </tr>
                    <tr>
                        <td style="padding-left: 10px;">बिक्री फिर्ता</td>
                        <td class="text-end">(${formatCurrency(summaryData?.salesReturn)})</td>
                        <td class="text-end">(${formatCurrency(summaryData?.salesReturnVAT)})</td>
                        <td class="text-center">क्रेडिट नोट</td>
                    </tr>
                    <tr class="total-row">
                        <td><strong>कुल बिक्री</strong></td>
                        <td class="text-end"><strong>${formatCurrency(summaryData?.netSales)}</strong></td>
                        <td class="text-end"><strong>${formatCurrency(summaryData?.netSalesVAT)}</strong></td>
                        <td class="text-center">-</td>
                    </tr>

                    <tr class="section-header">
                        <td colspan="4"><strong>खरिद कारोबारहरू</strong></td>
                    </tr>
                    <tr>
                        <td style="padding-left: 10px;">कर योग्य खरिद</td>
                        <td class="text-end">${formatCurrency(summaryData?.taxablePurchase)}</td>
                        <td class="text-end">${formatCurrency(summaryData?.taxablePurchaseVAT)}</td>
                        <td class="text-center">-</td>
                    </tr>
                    <tr>
                        <td style="padding-left: 10px;">कर छुटको खरिद</td>
                        <td class="text-end">${formatCurrency(summaryData?.nonTaxablePurchase)}</td>
                        <td class="text-end">-</td>
                        <td class="text-center">छुट</td>
                    </tr>
                    <tr>
                        <td style="padding-left: 10px;">खरिद फिर्ता</td>
                        <td class="text-end">(${formatCurrency(summaryData?.purchaseReturn)})</td>
                        <td class="text-end">(${formatCurrency(summaryData?.purchaseReturnVAT)})</td>
                        <td class="text-center">डेबिट नोट</td>
                    </tr>
                    <tr class="total-row">
                        <td><strong>कुल खरिद</strong></td>
                        <td class="text-end"><strong>${formatCurrency(summaryData?.netPurchase)}</strong></td>
                        <td class="text-end"><strong>${formatCurrency(summaryData?.netPurchaseVAT)}</strong></td>
                        <td class="text-center">-</td>
                    </tr>

                    <tr class="section-header">
                        <td colspan="4"><strong>खाता बाँकीहरू</strong></td>
                    </tr>
                    <tr class="balance-row">
                        <td>${startMonthNameNepali} ${startYear} १ गतेको प्रारम्भिक बाँकी</td>
                        <td class="text-end"><strong>${formatCurrency(Math.abs(summaryData?.openingBalance || 0))} ${summaryData?.openingBalance > 0 ? 'Cr' : (summaryData?.openingBalance < 0 ? 'Dr' : '')}</strong></td>
                        <td class="text-end">-</td>
                        <td class="text-center">B/F</td>
                    </tr>
                    <tr class="balance-row">
                        <td>${endMonthNameNepali} ${endYear} को अन्तिम बाँकी</td>
                        <td class="text-end"><strong>${formatCurrency(Math.abs(summaryData?.closingBalance || 0))} ${summaryData?.closingBalance > 0 ? 'Cr' : (summaryData?.closingBalance < 0 ? 'Dr' : '')}</strong></td>
                        <td class="text-end">-</td>
                        <td class="text-center">C/F</td>
                    </tr>
                </tbody>
            </table>

            <div class="content-section">
                <p>
                    कृपया माथिको कारोबार र खाता बाँकीहरू सुनिश्चित गर्नुहोस्। यदि विवरणहरू सही छन् भने, 
                    कृपया यो पत्रको प्रतिलिपि हस्ताक्षर गरी <strong>१५ दिन</strong> भित्र फिर्ता पठाउनुहोस्। 
                    कुनै पनि विसंगति उही अवधि भित्र हामीलाई लिखित रूपमा सूचित गर्नुहोस्।
                </p>
                <p>
                    यदि निर्धारित समय भित्र कुनै सञ्चार प्राप्त भएन भने, बाँकी रकमहरू सबै उद्देश्यका लागि 
                    पुष्टि र सही मानिनेछ।
                </p>
            </div>

            <div class="signature-section">
                <div class="signature-container">
                    <div class="signature-box">
                        <div class="signature-line"></div>
                        <div class="signature-label">${company.name || 'कम्पनी'} को लागि</div>
                        <div class="signature-details">
                            अधिकृत हस्ताक्षरकर्ता<br>
                            नाम: ________________<br>
                            पद: ________________<br>
                            मिति: ________________
                        </div>
                    </div>

                    <div class="signature-box">
                        <div class="signature-line"></div>
                        <div class="signature-label">${party.name || 'पार्टी'} को लागि</div>
                        <div class="signature-details">
                            अधिकृत हस्ताक्षरकर्ता<br>
                            नाम: ________________<br>
                            पद: ________________<br>
                            मिति: ________________
                        </div>
                    </div>
                </div>
            </div>

            <div class="footer">
                <p>
                    <strong>गोपनीयता सूचना:</strong> यो कागजात प्राप्तकर्ताको लागि मात्र गोप्य जानकारी समावेश गर्दछ। 
                    कुनै पनि अनाधिकृत प्रयोग, खुलासा, वा वितरण कडा रूपमा निषेधित छ।
                </p>
                <p>कागजात आइडी: VAT-CONF-${Date.now()} | छापिएको मिति: ${new Date().toLocaleDateString('ne-NP')}</p>
            </div>
        </div>
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
    </html>`;

        printWindow.document.write(printContent);
        printWindow.document.close();
    };

    if (!isInitialized) return <Loader />;

    const selectedPartyDisplay = selectedParty
        ? `${selectedParty.uniqueNumber || ''} ${selectedParty.name}`.trim()
        : '';

    return (
        <div className="vat-confirmation-page">
            <Header />

            <div className="vc-shell">
                {/* Compact top bar */}
                <div className="vc-topbar">
                    <div className="vc-topbar__left">
                        <div className="vc-topbar__icon"><FiFileText /></div>
                        <div>
                            <h1>VAT Confirmation</h1>
                        </div>
                    </div>
                    <div className="vc-topbar__actions">
                        <button
                            type="button"
                            className="vc-btn-icon"
                            onClick={handlePrint}
                            disabled={!summary}
                        >
                            <FiPrinter /> Print (EN)
                        </button>
                        <button
                            type="button"
                            className="vc-btn-icon"
                            onClick={handlePrintNepali}
                            disabled={!summary}
                        >
                            <FiPrinter /> Print (नेपाली)
                        </button>
                    </div>
                </div>

                {/* Single-row toolbar */}
                <div className="vc-toolbar">
                    <div className="vc-field vc-field--party">
                        <label>Party <span className="req">*</span></label>
                        <input
                            type="text"
                            id="account"
                            className={selectedParty ? '' : 'is-empty'}
                            value={selectedPartyDisplay}
                            onClick={() => setShowAccountModal(true)}
                            readOnly
                            placeholder="Click to select"
                        />
                    </div>

                    <div className="vc-field vc-field--month">
                        <label>From <span className="req">*</span></label>
                        <select
                            id="startMonth"
                            ref={startMonthRef}
                            value={startMonth}
                            onChange={(e) => setStartMonth(e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, 'endMonth')}
                        >
                            <option value="">Select</option>
                            {nepaliMonths.map(month => (
                                <option key={month.value} value={month.value}>
                                    {month.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="vc-field vc-field--month">
                        <label>To <span className="req">*</span></label>
                        <select
                            id="endMonth"
                            ref={endMonthRef}
                            value={endMonth}
                            onChange={(e) => setEndMonth(e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, 'generateReport')}
                        >
                            <option value="">Select</option>
                            {nepaliMonths.map(month => (
                                <option key={month.value} value={month.value}>
                                    {month.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        type="button"
                        id="generateReport"
                        ref={generateBtnRef}
                        className="vc-btn-gen"
                        onClick={handleGenerateReport}
                        disabled={!selectedParty || !startMonth || !endMonth || !fiscalYear || loading}
                    >
                        {loading
                            ? <span className="spinner-border spinner-border-sm" style={{ width: 12, height: 12 }} />
                            : <><i className="bi bi-play-fill" /> Generate</>
                        }
                    </button>

                    <div className="vc-toolbar-divider" />

                    {/* Period display */}
                    {startMonth && endMonth && fiscalYear && (
                        <div className="vc-period">
                            <FiCalendar className="me-1" style={{ fontSize: '0.65rem' }} />
                            <span>{getMonthYearDisplay(startMonth)} — {getMonthYearDisplay(endMonth)}</span>
                        </div>
                    )}
                </div>

                {error && (
                    <div className="vc-alert">
                        <i className="bi bi-exclamation-circle" />{error}
                        <button type="button" className="btn-close btn-sm ms-auto" onClick={() => setError('')} />
                    </div>
                )}

                {/* Main content area */}
                <div className="vc-main">
                    {loading ? (
                        <div className="vc-state">
                            <div className="spinner-border spinner-border-sm text-primary" />
                            <p style={{ marginTop: '0.5rem' }}>Loading…</p>
                        </div>
                    ) : !summary ? (
                        <div className="vc-state">
                            <FiUser size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                            <h3>No party selected</h3>
                            <p>Select a party and date range, then click Generate.</p>
                        </div>
                    ) : (
                        <>
                            <div className="vc-main__bar">
                                <span><strong>{summary.party?.name}</strong> · PAN: {summary.party?.pan || '—'}</span>
                                <span>{getMonthYearDisplay(startMonth)} — {getMonthYearDisplay(endMonth)}</span>
                            </div>

                            <div className="vc-summary-grid">
                                <div className="vc-summary-card">
                                    <div className="vc-summary-card__label">Net Sales</div>
                                    <div className="vc-summary-card__value vc-value--green">
                                        Rs. {formatCurrency(summary.summary?.netSales)}
                                    </div>
                                </div>
                                <div className="vc-summary-card">
                                    <div className="vc-summary-card__label">Net VAT</div>
                                    <div className="vc-summary-card__value vc-value--blue">
                                        Rs. {formatCurrency(summary.summary?.netSalesVAT)}
                                    </div>
                                </div>
                                <div className="vc-summary-card">
                                    <div className="vc-summary-card__label">Opening Balance</div>
                                    <div className={`vc-summary-card__value ${summary.summary?.openingBalance > 0 ? 'vc-value--green' : 'vc-value--red'}`}>
                                        Rs. {formatCurrency(Math.abs(summary.summary?.openingBalance || 0))}
                                        {' '}{summary.summary?.openingBalance > 0 ? 'Cr' : (summary.summary?.openingBalance < 0 ? 'Dr' : '')}
                                    </div>
                                </div>
                                <div className="vc-summary-card">
                                    <div className="vc-summary-card__label">Closing Balance</div>
                                    <div className={`vc-summary-card__value ${summary.summary?.closingBalance > 0 ? 'vc-value--green' : 'vc-value--red'}`}>
                                        Rs. {formatCurrency(Math.abs(summary.summary?.closingBalance || 0))}
                                        {' '}{summary.summary?.closingBalance > 0 ? 'Cr' : (summary.summary?.closingBalance < 0 ? 'Dr' : '')}
                                    </div>
                                </div>
                            </div>

                            <div className="vc-table-scroll">
                                <table className="vc-table">
                                    <thead>
                                        <tr>
                                            <th>Particulars</th>
                                            <th className="num">Amount (Rs.)</th>
                                            <th className="num">VAT (Rs.)</th>
                                            <th>Remarks</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="vc-section-header"><td colSpan="4"><strong>Sales Transactions</strong></td></tr>
                                        <tr><td style={{ paddingLeft: '10px' }}>Taxable Sales</td><td className="num">{formatCurrency(summary.summary?.taxableSales)}</td><td className="num">{formatCurrency(summary.summary?.taxableSalesVAT)}</td><td>—</td></tr>
                                        <tr><td style={{ paddingLeft: '10px' }}>Non-Taxable Sales</td><td className="num">{formatCurrency(summary.summary?.nonTaxableSales)}</td><td className="num">—</td><td>Exempt</td></tr>
                                        <tr><td style={{ paddingLeft: '10px' }}>Sales Return</td><td className="num">({formatCurrency(summary.summary?.taxableSalesReturn+summary.summary?.nonTaxableSalesReturn)})</td><td className="num">({formatCurrency(summary.summary?.taxableSalesReturnVAT)})</td><td>Credit Note</td></tr>
                                        <tr className="vc-total-row"><td><strong>Net Sales</strong></td><td className="num"><strong>{formatCurrency(summary.summary?.netSales)}</strong></td><td className="num"><strong>{formatCurrency(summary.summary?.netSalesVAT)}</strong></td><td>—</td></tr>
                                        <tr className="vc-spacer"><td colSpan="4">&nbsp;</td></tr>
                                        <tr className="vc-section-header"><td colSpan="4"><strong>Purchase Transactions</strong></td></tr>
                                        <tr><td style={{ paddingLeft: '10px' }}>Taxable Purchases</td><td className="num">{formatCurrency(summary.summary?.taxablePurchase)}</td><td className="num">{formatCurrency(summary.summary?.taxablePurchaseVAT)}</td><td>—</td></tr>
                                        <tr><td style={{ paddingLeft: '10px' }}>Non-Taxable Purchase</td><td className="num">{formatCurrency(summary.summary?.nonTaxablePurchase)}</td><td className="num">—</td><td>Exempt</td></tr>
                                        <tr><td style={{ paddingLeft: '10px' }}>Purchase Return</td><td className="num">({formatCurrency(summary.summary?.taxablePurchaseReturn+summary.summary?.nonTaxablePurchaseReturn)})</td><td className="num">({formatCurrency(summary.summary?.taxablePurchaseReturnVAT)})</td><td>Debit Note</td></tr>
                                        <tr className="vc-total-row"><td><strong>Net Purchases</strong></td><td className="num"><strong>{formatCurrency(summary.summary?.netPurchase)}</strong></td><td className="num"><strong>{formatCurrency(summary.summary?.netPurchaseVAT)}</strong></td><td>—</td></tr>
                                        <tr className="vc-spacer"><td colSpan="4">&nbsp;</td></tr>
                                        <tr className="vc-section-header"><td colSpan="4"><strong>Account Balances</strong></td></tr>
                                        <tr className="vc-balance-row"><td>Opening Balance</td><td className="num"><strong>{formatCurrency(Math.abs(summary.summary?.openingBalance || 0))} {summary.summary?.openingBalance > 0 ? 'Cr' : (summary.summary?.openingBalance < 0 ? 'Dr' : '')}</strong></td><td className="num">—</td><td>B/F</td></tr>
                                        <tr className="vc-balance-row"><td>Closing Balance</td><td className="num"><strong>{formatCurrency(Math.abs(summary.summary?.closingBalance || 0))} {summary.summary?.closingBalance > 0 ? 'Cr' : (summary.summary?.closingBalance < 0 ? 'Dr' : '')}</strong></td><td className="num">—</td><td>C/F</td></tr>
                                    </tbody>
                                </table>
                            </div>

                            <div className="vc-main__footer">
                                <button
                                    className="vc-btn-primary"
                                    onClick={() => setShowPreview(true)}
                                >
                                    <FiFileText className="me-1" style={{ fontSize: '12px' }} />
                                    Generate Confirmation Letter
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Preview Modal */}
            {showPreview && (
                <div className="vc-modal-overlay" onClick={() => setShowPreview(false)}>
                    <div className="vc-modal" onClick={e => e.stopPropagation()}>
                        <div className="vc-modal-header">
                            <h5>VAT Confirmation Letter Preview</h5>
                            <button type="button" className="btn-close" onClick={() => setShowPreview(false)} />
                        </div>
                        <div className="vc-modal-body">
                            {summary && (
                                <table className="vc-table vc-table--preview">
                                    <thead>
                                        <tr>
                                            <th>Particulars</th>
                                            <th className="num">Amount (Rs.)</th>
                                            <th className="num">VAT (Rs.)</th>
                                            <th>Remarks</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr><td><strong>Taxable Sales</strong></td><td className="num">{formatCurrency(summary.summary?.taxableSales)}</td><td className="num">{formatCurrency(summary.summary?.taxableSalesVAT)}</td><td>—</td></tr>
                                        <tr><td><strong>Non-Taxable Sales</strong></td><td className="num">{formatCurrency(summary.summary?.nonTaxableSales)}</td><td className="num">—</td><td>Exempt</td></tr>
                                        <tr><td><strong>Less: Sales Return</strong></td><td className="num">({formatCurrency(summary.summary?.salesReturn)})</td><td className="num">({formatCurrency(summary.summary?.salesReturnVAT)})</td><td>Credit Note</td></tr>
                                        <tr className="vc-total-row"><td><strong>Net Sales</strong></td><td className="num"><strong>{formatCurrency(summary.summary?.netSales)}</strong></td><td className="num"><strong>{formatCurrency(summary.summary?.netSalesVAT)}</strong></td><td>—</td></tr>
                                        <tr className="vc-spacer"><td colSpan="4">&nbsp;</td></tr>
                                        <tr><td><strong>Taxable Purchases</strong></td><td className="num">{formatCurrency(summary.summary?.taxablePurchase)}</td><td className="num">{formatCurrency(summary.summary?.taxablePurchaseVAT)}</td><td>—</td></tr>
                                        <tr><td><strong>Non-Taxable Purchase</strong></td><td className="num">{formatCurrency(summary.summary?.nonTaxablePurchase)}</td><td className="num">—</td><td>Exempt</td></tr>
                                        <tr><td><strong>Less: Purchase Return</strong></td><td className="num">({formatCurrency(summary.summary?.purchaseReturn)})</td><td className="num">({formatCurrency(summary.summary?.purchaseReturnVAT)})</td><td>Debit Note</td></tr>
                                        <tr className="vc-total-row"><td><strong>Net Purchases</strong></td><td className="num"><strong>{formatCurrency(summary.summary?.netPurchase)}</strong></td><td className="num"><strong>{formatCurrency(summary.summary?.netPurchaseVAT)}</strong></td><td>—</td></tr>
                                        <tr className="vc-spacer"><td colSpan="4">&nbsp;</td></tr>
                                        <tr><td><strong>Opening Balance</strong></td><td className="num">{formatCurrency(Math.abs(summary.summary?.openingBalance || 0))} {summary.summary?.openingBalance > 0 ? 'Cr' : (summary.summary?.openingBalance < 0 ? 'Dr' : '')}</td><td className="num">—</td><td>B/F</td></tr>
                                        <tr><td><strong>Closing Balance</strong></td><td className="num">{formatCurrency(Math.abs(summary.summary?.closingBalance || 0))} {summary.summary?.closingBalance > 0 ? 'Cr' : (summary.summary?.closingBalance < 0 ? 'Dr' : '')}</td><td className="num">—</td><td>C/F</td></tr>
                                    </tbody>
                                </table>
                            )}
                        </div>
                        <div className="vc-modal-footer">
                            <button className="vc-btn-secondary" onClick={() => setShowPreview(false)}>Close</button>
                            <button className="vc-btn-primary" onClick={handlePrint}><FiPrinter className="me-1" /> Print (EN)</button>
                            <button className="vc-btn-primary" onClick={handlePrintNepali}><FiPrinter className="me-1" /> Print (नेपाली)</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Account Selection Modal - Using AccountModalForPaymentReceipt like AddPayment */}
            {showAccountModal && (
                <AccountModalForPaymentReceipt
                    show={showAccountModal}
                    onClose={handleAccountModalClose}
                    onSelectAccount={selectAccount}
                    accounts={accounts}
                    totalAccounts={totalAccounts}
                    isSearching={isAccountSearching}
                    hasMore={hasMoreAccountResults}
                    searchQuery={accountSearchQuery}
                    onSearch={(query) => {
                        setAccountSearchQuery(query);
                        setAccountSearchPage(1);
                        if (query.trim() !== '' && accountShouldShowLastSearchResults) {
                            setAccountShouldShowLastSearchResults(false);
                            setAccountLastSearchQuery('');
                        }
                        const timer = setTimeout(() => {
                            fetchAccountsFromBackend(query, 1);
                        }, 300);
                        return () => clearTimeout(timer);
                    }}
                    onLoadMore={loadMoreAccounts}
                    page={accountSearchPage}
                    onCreateAccount={() => {
                        setShowAccountCreationModal(true);
                        setShowAccountModal(false);
                    }}
                    selectedAccountId={selectedAccountId}
                />
            )}

            {/* Account Creation Modal */}
            {showAccountCreationModal && (
                <div className="modal fade show" tabIndex="-1" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.7)' }}>
                    <div className="modal-dialog modal-fullscreen">
                        <div className="modal-content" style={{ height: '95vh', margin: '2.5vh auto' }}>
                            <div className="modal-header bg-primary text-white">
                                <h5 className="modal-title">Create New Account</h5>
                                <div className="d-flex align-items-center">
                                    <button
                                        type="button"
                                        className="btn-close btn-close-white"
                                        onClick={handleAccountCreationModalClose}
                                    ></button>
                                </div>
                            </div>
                            <div className="modal-body p-0">
                                <iframe
                                    src="/retailer/accounts"
                                    title="Account Creation"
                                    style={{ width: '100%', height: '100%', border: 'none' }}
                                />
                            </div>
                            <div className="modal-footer bg-light">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={handleAccountCreationModalClose}
                                >
                                    <i className="bi bi-arrow-left me-2"></i>Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
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

export default VATConfirmationLetter;