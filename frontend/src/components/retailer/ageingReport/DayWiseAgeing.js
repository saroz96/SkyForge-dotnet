
// import React, { useState, useEffect, useRef } from 'react';
// import axios from 'axios';
// import Select from 'react-select';
// import Header from '../Header';
// import NepaliDate from 'nepali-date-converter';
// import Loader from '../../Loader';
// import { usePageNotRefreshContext } from '../PageNotRefreshContext';

// const DayWiseAgeing = () => {
//     const [loading, setLoading] = useState(false);
//     const [data, setData] = useState(null);
//     const [error, setError] = useState('');
//     const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
//     const currentEnglishDate = new Date().toISOString().split('T')[0];
//     const { draftSave, setDraftSave } = usePageNotRefreshContext();

//     const [company, setCompany] = useState({
//         dateFormat: 'nepali',
//         fiscalYear: {}
//     });

//     const [formData, setFormData] = useState(() => {
//         if (draftSave && draftSave.dayWiseAgeingData) {
//             return draftSave.dayWiseAgeingData;
//         }
//         return {
//             accountId: '',
//             accountName: '',
//             fromDate: '',
//             toDate: '',
//             companyDateFormat: 'english'
//         };
//     });

//     const [selectedRowIndex, setSelectedRowIndex] = useState(0);
//     const tableBodyRef = useRef(null);
//     const [showAccountModal, setShowAccountModal] = useState(false);
//     const [filteredAccounts, setFilteredAccounts] = useState([]);
//     const accountSearchRef = useRef(null);

//     const fromDateRef = useRef(null);
//     const toDateRef = useRef(null);

//     // Fetch company and fiscal year info when component mounts
//     useEffect(() => {
//         const fetchInitialData = async () => {
//             try {
//                 const response = await axios.get('/api/my-company');
//                 if (response.data.success) {
//                     const { company: companyData, currentFiscalYear } = response.data;

//                     // Set company info
//                     const dateFormat = companyData.dateFormat || 'english';
//                     setCompany({
//                         dateFormat,
//                         fiscalYear: currentFiscalYear || {}
//                     });

//                     // Set dates based on fiscal year
//                     if (currentFiscalYear?.startDate) {
//                         setFormData(prev => ({
//                             ...prev,
//                             fromDate: dateFormat === 'nepali'
//                                 ? new NepaliDate(currentFiscalYear.startDate).format('YYYY-MM-DD')
//                                 : new NepaliDate(currentFiscalYear.startDate).format('YYYY-MM-DD'),
//                             toDate: dateFormat === 'nepali' ? currentNepaliDate : currentEnglishDate,
//                             companyDateFormat: dateFormat
//                         }));
//                     }
//                 }
//             } catch (err) {
//                 console.error('Error fetching initial data:', err);
//             }
//         };

//         fetchInitialData();
//     }, []);

//     // Save draft data
//     useEffect(() => {
//         if (formData.accountId || formData.fromDate || formData.toDate) {
//             setDraftSave({
//                 ...draftSave,
//                 dayWiseAgeingData: formData
//             });
//         }
//     }, [formData]);

//     const formatDisplayDate = (dateString) => {
//         if (!dateString) return '';

//         if (company.dateFormat === 'nepali') {
//             // Custom formatting for Nepali date display
//             return dateString; // or format as needed
//         }

//         return new Date(dateString).toLocaleDateString('en-US', {
//             year: 'numeric',
//             month: 'short',
//             day: 'numeric'
//         });
//     };

//     // Fetch accounts on component mount
//     useEffect(() => {
//         fetchAccounts();
//     }, []);

//     const fetchAccounts = async () => {
//         try {
//             setLoading(true);
//             const response = await axios.get('/api/retailer/day-count-aging');
//             if (response.data.success) {
//                 setData(response.data.data);
//                 // Initialize filtered accounts with all accounts
//                 if (response.data.data.accounts) {
//                     setFilteredAccounts(response.data.data.accounts);
//                 }
//             }
//         } catch (err) {
//             setError('Failed to fetch accounts');
//             console.error('Error fetching accounts:', err);
//         } finally {
//             setLoading(false);
//         }
//     };

//     const handleAccountSearch = (e) => {
//         const searchText = e.target.value.toLowerCase();
//         if (!data?.accounts) return;

//         const filtered = data.accounts.filter(account =>
//             account.name.toLowerCase().includes(searchText) ||
//             (account.uniqueNumber && account.uniqueNumber.toString().toLowerCase().includes(searchText))
//         ).sort((a, b) => a.name.localeCompare(b.name));

//         setFilteredAccounts(filtered);
//     };

//     // const selectAccount = (account) => {
//     //     setFormData({
//     //         ...formData,
//     //         accountId: account._id,
//     //         accountName: `${account.uniqueNumber || ''} ${account.name}`.trim()
//     //     });
//     //     setShowAccountModal(false);
//     // };

//     const selectAccount = (account) => {
//         setFormData({
//             ...formData,
//             accountId: account._id,
//             accountName: `${account.uniqueNumber || ''} ${account.name}`.trim()
//         });
//         setShowAccountModal(false);

//         // Focus on From Date input after a small delay to ensure modal is closed
//         setTimeout(() => {
//             if (fromDateRef.current) {
//                 fromDateRef.current.focus();
//             }
//         }, 100);
//     };

//     const handleSubmit = async (e) => {
//         e.preventDefault();
//         if (!formData.accountId || !formData.fromDate || !formData.toDate) {
//             setError('Please fill all required fields');
//             return;
//         }

//         try {
//             setLoading(true);
//             setError('');
//             const response = await axios.get('/api/retailer/day-count-aging', {
//                 params: formData
//             });

//             if (response.data.success) {
//                 setData(response.data.data);
//                 setSelectedRowIndex(0);
//             } else {
//                 setError(response.data.error || 'Failed to generate report');
//             }
//         } catch (err) {
//             setError(err.response?.data?.error || 'Failed to generate report');
//             console.error('Error generating report:', err);
//         } finally {
//             setLoading(false);
//         }
//     };

//     const handleInputChange = (field, value) => {
//         setFormData(prev => ({
//             ...prev,
//             [field]: value
//         }));
//     };

//     // Keyboard navigation
//     useEffect(() => {
//         const handleKeyDown = (e) => {
//             if (!data?.agingData?.transactions?.length) return;

//             const activeElement = document.activeElement;
//             if (['INPUT', 'SELECT', 'TEXTAREA'].includes(activeElement.tagName)) return;

//             switch (e.key) {
//                 case 'ArrowUp':
//                     e.preventDefault();
//                     setSelectedRowIndex(prev => Math.max(0, prev - 1));
//                     break;
//                 case 'ArrowDown':
//                     e.preventDefault();
//                     setSelectedRowIndex(prev => Math.min(data.agingData.transactions.length - 1, prev + 1));
//                     break;
//                 case 'Enter':
//                     // Handle enter action if needed
//                     break;
//                 default:
//                     break;
//             }
//         };

//         window.addEventListener('keydown', handleKeyDown);
//         return () => window.removeEventListener('keydown', handleKeyDown);
//     }, [data?.agingData?.transactions]);

//     // Scroll to selected row
//     useEffect(() => {
//         if (tableBodyRef.current && data?.agingData?.transactions?.length > 0) {
//             const rows = tableBodyRef.current.querySelectorAll('tr');
//             if (rows.length > selectedRowIndex) {
//                 rows[selectedRowIndex].scrollIntoView({
//                     behavior: 'smooth',
//                     block: 'nearest'
//                 });
//             }
//         }
//     }, [selectedRowIndex, data?.agingData?.transactions]);

//     const printReport = () => {
//         if (!data?.agingData?.transactions?.length) {
//             alert('No data available to print');
//             return;
//         }

//         const printWindow = window.open("", "_blank");

//         const getMonthName = (dateString, dateFormat) => {
//             if (!dateString) return '';
//             const date = new Date(dateString);
//             const month = date.getMonth();

//             const englishMonths = ["January", "February", "March", "April", "May", "June",
//                 "July", "August", "September", "October", "November", "December"];

//             const nepaliMonths = ["Baishakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashwin",
//                 "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"];

//             return dateFormat === "nepali" ? nepaliMonths[month] : englishMonths[month];
//         };

//         const getYear = (dateString) => {
//             if (!dateString) return '';
//             const date = new Date(dateString);
//             return date.getFullYear();
//         };

//         const getOpeningBalance = () => {
//             const openingBalance = data?.account?.initialOpeningBalance?.amount || data?.agingData?.openingBalance;
//             const balanceType = data?.account?.initialOpeningBalance?.type || data?.agingData?.openingBalanceType;

//             if (openingBalance === undefined || openingBalance === null) return 'N/A';

//             const formattedAmount = formatCurrency(Math.abs(openingBalance));
//             return balanceType === 'credit' || openingBalance >= 0
//                 ? `${formattedAmount} Cr`
//                 : `${formattedAmount} Dr`;
//         };

//         const printContent = `
//         <style>
//             @page { 
//                 margin: 10mm; 
//             }
//             body { 
//                 font-family: Arial, sans-serif; 
//                 font-size: 10px; 
//                 margin: 0; 
//                 padding: 5mm; 
//             }
//             table { 
//                 width: 100%; 
//                 border-collapse: collapse; 
//                 page-break-inside: auto;
//                 font-size: 12px 
//             }
//             th, td { 
//                 border: 1px solid #000; 
//                 padding: 4px; 
//                 text-align: left; 
//             }
//             th { 
//                 background-color: #f2f2f2; 
//             }
//             .print-header { 
//                 text-align: center; 
//                 margin-bottom: 15px; 
//             }
//             .text-end { 
//                 text-align: right; 
//             }
//             .report-period {
//                 display: flex;
//                 justify-content: space-between;
//                 margin-bottom: 15px;
//             }
//             .report-title {
//                 text-align: center;
//                 text-decoration: underline;
//                 margin-bottom: 10px;
//             }
//         </style>

//         <div class="print-header">
//             <h1>${data.currentCompanyName}</h1>
//             <h2 class="report-title">Ageing Report</h2>
//             <div class="report-period">
//                 <div><strong>Account:</strong> ${data.account.name}
//             </div>
//             <div>
//                     <strong>From:</strong> ${formatDisplayDate(formData.fromDate)} 
//                     <strong>To:</strong> ${formatDisplayDate(formData.toDate)}
//             </div>
//             <div>
//                     <strong>Printed:</strong> ${new Date().toLocaleString()}
//             </div>
//         </div>
//                 <div class="text-end"><strong>Opening:</strong> ${getOpeningBalance()}</div>        
//         <table>
//             <thead>
//                 <tr>
//                     <th>Date</th>
//                     <th>Age (Days)</th>
//                     <th>Vch. No.</th>
//                     <th>Particulars</th>
//                     <th class="text-end">Debit</th>
//                     <th class="text-end">Credit</th>
//                     <th class="text-end">Balance</th>
//                 </tr>
//             </thead>
//             <tbody>
//                 ${data.agingData.transactions.map(transaction => `
//                     <tr>
//                         <td>${formatDate(transaction.date)}</td>
//                         <td>${transaction.age} days</td>
//                         <td>${transaction.referenceNumber}</td>
//                         <td>${getTransactionTypeLabel(transaction.type)}</td>
//                         <td class="text-end">${formatCurrency(transaction.debit)}</td>
//                         <td class="text-end">${formatCurrency(transaction.credit)}</td>
//                         <td class="text-end">${formatBalance(transaction.balance)}</td>
//                     </tr>
//                 `).join('')}
//             </tbody>
//         </table>
//     `;

//         printWindow.document.write(`
//         <html>
//             <head>
//                 <title>Ageing Report - ${data.account.name}</title>
//             </head>
//             <body>
//                 ${printContent}
//                 <script>
//                     window.onload = function() {
//                         window.print();
//                         window.onafterprint = function() {
//                             window.close();
//                         };
//                     }
//                 </script>
//             </body>
//         </html>
//     `);
//         printWindow.document.close();
//     };

//     const exportToExcel = () => {
//         alert('Excel export functionality');
//     };

//     const exportToPDF = () => {
//         alert('PDF export functionality');
//     };

//     const exportToCSV = () => {
//         alert('CSV export functionality');
//     };

//     const getTransactionIcon = (type) => {
//         const icons = {
//             sales: 'fas fa-file-invoice-dollar text-primary',
//             purchase: 'fas fa-shopping-cart text-info',
//             purchase_return: 'fas fa-undo text-warning',
//             sales_return: 'fas fa-exchange-alt text-danger',
//             payment: 'fas fa-money-bill-wave text-success',
//             receipt: 'fas fa-hand-holding-usd text-success',
//             debit_note: 'fas fa-file-alt text-danger',
//             credit_note: 'fas fa-file-alt text-success',
//             journal: 'fas fa-book text-secondary'
//         };
//         return icons[type] || 'fas fa-file-alt text-secondary';
//     };

//     const getTransactionTypeLabel = (type) => {
//         const labels = {
//             sales: 'Sale',
//             purchase: 'Purchase',
//             purchase_return: 'Purchase Return',
//             sales_return: 'Sales Return',
//             payment: 'Payment',
//             receipt: 'Receipt',
//             debit_note: 'Debit Note',
//             credit_note: 'Credit Note',
//             journal: 'Journal'
//         };
//         return labels[type] || 'Transaction';
//     };

//     const formatDate = (dateString) => {
//         if (!dateString) return '';

//         if (company.dateFormat === 'nepali') {
//             try {
//                 // For Nepali dates, you might want to convert or display differently
//                 // This is a simple implementation
//                 return new NepaliDate(dateString).format('YYYY-MM-DD');
//             } catch (error) {
//                 return dateString;
//             }
//         }

//         // For English dates
//         return new Date(dateString).toISOString().split('T')[0];
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

//     const formatBalance = (balance) => {
//         const formattedBalance = formatCurrency(Math.abs(balance));
//         return balance >= 0
//             ? `${formattedBalance} Cr`
//             : `${formattedBalance} Dr`;
//     };

//     // Calculate aging summary
//     const getAgingSummary = () => {
//         if (!data?.agingData?.transactions) return [];

//         const transactions = data.agingData.transactions;
//         return [
//             {
//                 range: '0-30 days',
//                 count: transactions.filter(t => t.age <= 30).length,
//                 variant: 'primary'
//             },
//             {
//                 range: '31-60 days',
//                 count: transactions.filter(t => t.age > 30 && t.age <= 60).length,
//                 variant: 'info'
//             },
//             {
//                 range: '61-90 days',
//                 count: transactions.filter(t => t.age > 60 && t.age <= 90).length,
//                 variant: 'warning'
//             },
//             {
//                 range: '90+ days',
//                 count: transactions.filter(t => t.age > 90).length,
//                 variant: 'danger'
//             }
//         ];
//     };

//     const handleRowClick = (index) => {
//         setSelectedRowIndex(index);
//     };

//     const handleKeyDown = (e, nextFieldId) => {
//         if (e.key === 'Enter') {
//             e.preventDefault();
//             if (nextFieldId) {
//                 document.getElementById(nextFieldId)?.focus();
//             }
//         }
//     };

//     if (loading) return <Loader />;

//     return (
//         <div className="container-fluid">
//             <Header />
//             <div className="card shadow">
//                 <div className="card-header bg-white py-3">
//                     <h1 className="h3 mb-0 text-center text-primary">Ageing Receivables/Payables</h1>
//                 </div>
//                 <div className="card shadow-lg">
//                     <div className="card-body">
//                         <form onSubmit={handleSubmit} className="mb-4 p-3 bg-light rounded">
//                             <div className="row">
//                                 {/* Account Selection - Updated to use modal */}
//                                 <div className="col-md-3">
//                                     <div className="form-group">
//                                         <label className="form-label">Account:</label>
//                                         <input
//                                             type="text"
//                                             className="form-control"
//                                             value={formData.accountName}
//                                             onClick={() => setShowAccountModal(true)}
//                                             onFocus={() => setShowAccountModal(true)}
//                                             readOnly
//                                             placeholder="Select Account"
//                                             required
//                                             onKeyDown={(e) => {
//                                                 if (e.key === 'Enter') {
//                                                     handleKeyDown(e, 'fromDate');
//                                                 }
//                                             }}
//                                         />
//                                         <input type="hidden" id="accountId" value={formData.accountId} />
//                                     </div>
//                                 </div>

//                                 {/* Date Range */}
//                                 {/* <div className="col-md-2">
//                                     <div className="form-group">
//                                         <label className="form-label">From Date:</label>
//                                         <input
//                                             type="text"
//                                             id="fromDate"
//                                             className="form-control no-date-icon"
//                                             value={formData.fromDate}
//                                             onChange={(e) => handleInputChange('fromDate', e.target.value)}
//                                             onKeyDown={(e) => handleKeyDown(e, 'toDate')}
//                                             ref={company.dateFormat === 'nepali' ? fromDateRef : null}
//                                             required
//                                             autoComplete='off'
//                                         />
//                                     </div>
//                                 </div> */}

//                                 <div className="col-md-2">
//                                     <div className="form-group">
//                                         <label className="form-label">From Date:</label>
//                                         <input
//                                             type="text"
//                                             id="fromDate"
//                                             className="form-control no-date-icon"
//                                             value={formData.fromDate}
//                                             onChange={(e) => handleInputChange('fromDate', e.target.value)}
//                                             onKeyDown={(e) => handleKeyDown(e, 'toDate')}
//                                             ref={fromDateRef} // This is important - attach the ref here
//                                             required
//                                             autoComplete='off'
//                                         />
//                                     </div>
//                                 </div>

//                                 <div className="col-md-2">
//                                     <div className="form-group">
//                                         <label className="form-label">To Date:</label>
//                                         <input
//                                             type="text"
//                                             id="toDate"
//                                             className="form-control no-date-icon"
//                                             value={formData.toDate}
//                                             onChange={(e) => handleInputChange('toDate', e.target.value)}
//                                             onKeyDown={(e) => handleKeyDown(e, 'generateReport')}
//                                             ref={toDateRef}
//                                             required
//                                             autoComplete='off'
//                                         />
//                                     </div>
//                                 </div>

//                                 <div className="col-md-2">
//                                     <div className="form-group" style={{ marginTop: '25px' }}>
//                                         <button
//                                             id="generateReport"
//                                             type="submit"
//                                             className="btn btn-primary w-100"
//                                             disabled={loading}
//                                         >
//                                             {loading ? (
//                                                 <>
//                                                     <span className="spinner-border spinner-border-sm me-2" />
//                                                     Generating...
//                                                 </>
//                                             ) : (
//                                                 <>
//                                                     <i className="fas fa-chart-line me-2" />
//                                                     Generate Report
//                                                 </>
//                                             )}
//                                         </button>
//                                     </div>
//                                 </div>

//                                 <div className="col-md-2">
//                                     <div className="form-group" style={{ marginTop: '25px' }}>
//                                         <button
//                                             type="button"
//                                             className="btn btn-info w-100"
//                                             onClick={printReport}
//                                             disabled={!data?.agingData?.transactions?.length}
//                                         >
//                                             <i className="fas fa-print me-2" /> Print Report
//                                         </button>
//                                     </div>
//                                 </div>
//                             </div>
//                         </form>

//                         {error && (
//                             <div className="alert alert-danger text-center">
//                                 <i className="fas fa-exclamation-circle me-2" /> {error}
//                             </div>
//                         )}

//                         {!formData.accountId && (
//                             <div className="alert alert-info text-center">
//                                 <i className="fas fa-info-circle me-2" /> Please select an account and date range to generate report
//                             </div>
//                         )}

//                         {formData.accountId && (!formData.fromDate || !formData.toDate) && (
//                             <div className="alert alert-info text-center">
//                                 <i className="fas fa-info-circle me-2" /> Please select date range to generate report
//                             </div>
//                         )}

//                         {data?.agingData?.transactions?.length === 0 && formData.fromDate && formData.toDate && (
//                             <div className="alert alert-warning text-center">
//                                 <i className="fas fa-exclamation-circle me-2" /> No transactions found for the selected account and date range
//                             </div>
//                         )}

//                         {data?.agingData?.transactions?.length > 0 && (
//                             <div id="printableContent">

//                                 {/* Account Info */}
//                                 <div className="mb-4">
//                                     <h4 className="text-primary no-print">
//                                         <i className="fas fa-user-circle me-2" /> Account: {data.account.name}
//                                     </h4>
//                                     <div className="d-flex justify-content-between no-print">
//                                         <div>
//                                             <strong>Report Period:</strong>{' '}
//                                             {formatDate(data.fromDate)} to {formatDate(data.toDate)}
//                                         </div>
//                                         <div>
//                                             <strong>Opening:</strong>{' '}
//                                             <span className="font-weight-bold">
//                                                 {data?.account?.initialOpeningBalance?.amount?.toFixed(2) || data?.agingData?.openingBalance?.toFixed(2)}
//                                                 {' '}
//                                                 {data?.account?.initialOpeningBalance?.type || data?.agingData?.openingBalanceType}
//                                             </span>
//                                         </div>
//                                     </div>
//                                 </div>

//                                 {/* Transactions Table */}
//                                 <div className="table-responsive">
//                                     <table className="table table-striped table-hover">
//                                         <thead className="table-light">
//                                             <tr>
//                                                 <th>Date</th>
//                                                 <th>Age (Days)</th>
//                                                 <th>Vch. No.</th>
//                                                 <th>Particulars</th>
//                                                 <th className="text-end">Debit</th>
//                                                 <th className="text-end">Credit</th>
//                                                 <th className="text-end">Balance</th>
//                                             </tr>
//                                         </thead>
//                                         <tbody ref={tableBodyRef}>
//                                             {data.agingData.transactions.map((transaction, index) => (
//                                                 <tr
//                                                     key={transaction._id}
//                                                     className={selectedRowIndex === index ? 'highlighted-row' : ''}
//                                                     onClick={() => handleRowClick(index)}
//                                                 >
//                                                     <td>{formatDate(transaction.date)}</td>
//                                                     <td>{transaction.age} days</td>
//                                                     <td>{transaction.referenceNumber}</td>
//                                                     <td>
//                                                         <i className={getTransactionIcon(transaction.type)} />{' '}
//                                                         {getTransactionTypeLabel(transaction.type)}
//                                                         {transaction.referenceNumber !== 'N/A'}
//                                                     </td>
//                                                     <td className="text-end text-danger">
//                                                         {formatCurrency(transaction.debit)}
//                                                     </td>
//                                                     <td className="text-end text-success">
//                                                         {formatCurrency(transaction.credit)}
//                                                     </td>
//                                                     <td className="text-end font-weight-bold">
//                                                         {formatBalance(transaction.balance)}
//                                                     </td>
//                                                 </tr>
//                                             ))}
//                                         </tbody>
//                                     </table>
//                                 </div>

//                                 {/* Summary and Export Options */}
//                                 <div className="mt-4 no-print">
//                                     <div className="row">
//                                         <div className="col-md-4">
//                                             <div className="card bg-light">
//                                                 <div className="card-body">
//                                                     <h5 className="card-title">Aging Summary</h5>
//                                                     <div className="list-group list-group-flush">
//                                                         {getAgingSummary().map((item, index) => (
//                                                             <div
//                                                                 key={index}
//                                                                 className="list-group-item d-flex justify-content-between align-items-center"
//                                                             >
//                                                                 {item.range}
//                                                                 <span className={`badge bg-${item.variant} rounded-pill`}>
//                                                                     {item.count}
//                                                                 </span>
//                                                             </div>
//                                                         ))}
//                                                     </div>
//                                                 </div>
//                                             </div>
//                                         </div>
//                                     </div>
//                                 </div>
//                             </div>
//                         )}
//                     </div>
//                 </div>
//             </div>

//             {/* Account Modal */}
//             {showAccountModal && (
//                 <div className="modal fade show" id="accountModal" tabIndex="-1" style={{ display: 'block' }}>
//                     <div className="modal-dialog modal-xl modal-dialog-centered">
//                         <div className="modal-content" style={{ height: '500px' }}>
//                             <div className="modal-header">
//                                 <h5 className="modal-title" id="accountModalLabel">Select an Account</h5>
//                                 <button type="button" className="btn-close" onClick={() => setShowAccountModal(false)}></button>
//                             </div>
//                             <div className="p-3 bg-white sticky-top">
//                                 <input
//                                     type="text"
//                                     id="searchAccount"
//                                     className="form-control form-control-sm"
//                                     placeholder="Search Account"
//                                     autoComplete='off'
//                                     autoFocus
//                                     onChange={handleAccountSearch}
//                                     onKeyDown={(e) => {
//                                         if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
//                                             e.preventDefault();
//                                             const firstAccountItem = document.querySelector('.account-item');
//                                             if (firstAccountItem) {
//                                                 firstAccountItem.focus();
//                                             }
//                                         } else if (e.key === 'Enter') {
//                                             e.preventDefault();
//                                             const firstAccountItem = document.querySelector('.account-item.active');
//                                             if (firstAccountItem) {
//                                                 const accountId = firstAccountItem.getAttribute('data-account-id');
//                                                 const account = filteredAccounts.length > 0
//                                                     ? filteredAccounts.find(a => a._id === accountId)
//                                                     : data?.accounts?.find(a => a._id === accountId);
//                                                 if (account) {
//                                                     selectAccount(account);
//                                                 }
//                                             }
//                                         }
//                                     }}
//                                     ref={accountSearchRef}
//                                 />
//                             </div>
//                             <div className="modal-body p-0">
//                                 <div className="overflow-auto" style={{ height: 'calc(400px - 120px)' }}>
//                                     <ul id="accountList" className="list-group">
//                                         {filteredAccounts.length > 0 ? (
//                                             filteredAccounts.map((account, index) => (
//                                                 <li
//                                                     key={account._id}
//                                                     data-account-id={account._id}
//                                                     className={`list-group-item account-item py-2 ${index === 0 ? 'active' : ''}`}
//                                                     onClick={() => {
//                                                         selectAccount(account);
//                                                     }}
//                                                     style={{ cursor: 'pointer' }}
//                                                     tabIndex={0}
//                                                     onKeyDown={(e) => {
//                                                         if (e.key === 'ArrowDown') {
//                                                             e.preventDefault();
//                                                             const nextItem = e.target.nextElementSibling;
//                                                             if (nextItem) {
//                                                                 e.target.classList.remove('active');
//                                                                 nextItem.classList.add('active');
//                                                                 nextItem.focus();
//                                                             }
//                                                         } else if (e.key === 'ArrowUp') {
//                                                             e.preventDefault();
//                                                             const prevItem = e.target.previousElementSibling;
//                                                             if (prevItem) {
//                                                                 e.target.classList.remove('active');
//                                                                 prevItem.classList.add('active');
//                                                                 prevItem.focus();
//                                                             } else {
//                                                                 accountSearchRef.current.focus();
//                                                             }
//                                                         } else if (e.key === 'Enter') {
//                                                             e.preventDefault();
//                                                             selectAccount(account);
//                                                         }
//                                                     }}
//                                                     onFocus={(e) => {
//                                                         document.querySelectorAll('.account-item').forEach(item => {
//                                                             item.classList.remove('active');
//                                                         });
//                                                         e.target.classList.add('active');
//                                                     }}
//                                                 >
//                                                     <div className="d-flex justify-content-between small">
//                                                         <strong>{account.uniqueNumber || 'N/A'} {account.name}</strong>
//                                                         <span>📍 {account.address || 'N/A'} | 🆔 PAN: {account.pan || 'N/A'}</span>
//                                                     </div>
//                                                 </li>
//                                             ))
//                                         ) : (
//                                             accountSearchRef.current?.value ? (
//                                                 <li className="list-group-item text-center text-muted small py-2">No accounts found</li>
//                                             ) : (
//                                                 data?.accounts?.map((account, index) => (
//                                                     <li
//                                                         key={account._id}
//                                                         data-account-id={account._id}
//                                                         className={`list-group-item account-item py-2 ${index === 0 ? 'active' : ''}`}
//                                                         onClick={() => {
//                                                             selectAccount(account);
//                                                         }}
//                                                         style={{ cursor: 'pointer' }}
//                                                         tabIndex={0}
//                                                         onKeyDown={(e) => {
//                                                             if (e.key === 'ArrowDown') {
//                                                                 e.preventDefault();
//                                                                 const nextItem = e.target.nextElementSibling;
//                                                                 if (nextItem) {
//                                                                     e.target.classList.remove('active');
//                                                                     nextItem.classList.add('active');
//                                                                     nextItem.focus();
//                                                                 }
//                                                             } else if (e.key === 'ArrowUp') {
//                                                                 e.preventDefault();
//                                                                 const prevItem = e.target.previousElementSibling;
//                                                                 if (prevItem) {
//                                                                     e.target.classList.remove('active');
//                                                                     prevItem.classList.add('active');
//                                                                     prevItem.focus();
//                                                                 } else {
//                                                                     accountSearchRef.current.focus();
//                                                                 }
//                                                             } else if (e.key === 'Enter') {
//                                                                 e.preventDefault();
//                                                                 selectAccount(account);
//                                                             }
//                                                         }}
//                                                         onFocus={(e) => {
//                                                             document.querySelectorAll('.account-item').forEach(item => {
//                                                                 item.classList.remove('active');
//                                                             });
//                                                             e.target.classList.add('active');
//                                                         }}
//                                                     >
//                                                         <div className="d-flex justify-content-between small">
//                                                             <strong>{account.uniqueNumber || 'N/A'} {account.name}</strong>
//                                                             <span>📍 {account.address || 'N/A'} | 🆔 PAN: {account.pan || 'N/A'}</span>
//                                                         </div>
//                                                     </li>
//                                                 ))
//                                             )
//                                         )}
//                                     </ul>
//                                 </div>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// };

// export default DayWiseAgeing;

//-----------------------------------------------------------------------------------------------------------

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Select from 'react-select';
import Header from '../Header';
import NepaliDate from 'nepali-date-converter';
import Loader from '../../Loader';
import { usePageNotRefreshContext } from '../PageNotRefreshContext';
import * as XLSX from 'xlsx';
import NotificationToast from '../../NotificationToast';

const DayWiseAgeing = () => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
    const currentEnglishDate = new Date().toISOString().split('T')[0];
    const { draftSave, setDraftSave } = usePageNotRefreshContext();
    const [exporting, setExporting] = useState(false);
    const [notification, setNotification] = useState({
        show: false,
        message: '',
        type: 'success'
    });
    const [company, setCompany] = useState({
        dateFormat: 'nepali',
        fiscalYear: {}
    });

    const [formData, setFormData] = useState(() => {
        if (draftSave && draftSave.dayWiseAgeingData) {
            return draftSave.dayWiseAgeingData;
        }
        return {
            accountId: '',
            accountName: '',
            fromDate: '',
            toDate: '',
            companyDateFormat: 'english'
        };
    });

    const [selectedRowIndex, setSelectedRowIndex] = useState(0);
    const tableBodyRef = useRef(null);
    const [showAccountModal, setShowAccountModal] = useState(false);
    const [filteredAccounts, setFilteredAccounts] = useState([]);
    const accountSearchRef = useRef(null);

    const fromDateRef = useRef(null);
    const toDateRef = useRef(null);

    // Fetch company and fiscal year info when component mounts
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const response = await axios.get('/api/my-company');
                if (response.data.success) {
                    const { company: companyData, currentFiscalYear } = response.data;

                    // Set company info
                    const dateFormat = companyData.dateFormat || 'english';
                    setCompany({
                        dateFormat,
                        fiscalYear: currentFiscalYear || {}
                    });

                    // Set dates based on fiscal year
                    if (currentFiscalYear?.startDate) {
                        setFormData(prev => ({
                            ...prev,
                            fromDate: dateFormat === 'nepali'
                                ? new NepaliDate(currentFiscalYear.startDate).format('YYYY-MM-DD')
                                : new NepaliDate(currentFiscalYear.startDate).format('YYYY-MM-DD'),
                            toDate: dateFormat === 'nepali' ? currentNepaliDate : currentEnglishDate,
                            companyDateFormat: dateFormat
                        }));
                    }
                }
            } catch (err) {
                console.error('Error fetching initial data:', err);
            }
        };

        fetchInitialData();
    }, []);

    // Save draft data
    useEffect(() => {
        if (formData.accountId || formData.fromDate || formData.toDate) {
            setDraftSave({
                ...draftSave,
                dayWiseAgeingData: formData
            });
        }
    }, [formData]);

    const formatDisplayDate = (dateString) => {
        if (!dateString) return '';

        if (company.dateFormat === 'nepali') {
            // Custom formatting for Nepali date display
            return dateString; // or format as needed
        }

        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    // Fetch accounts on component mount
    useEffect(() => {
        fetchAccounts();
    }, []);

    const fetchAccounts = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/retailer/day-count-aging');
            if (response.data.success) {
                setData(response.data.data);
                // Initialize filtered accounts with all accounts
                if (response.data.data.accounts) {
                    setFilteredAccounts(response.data.data.accounts);
                }
            }
        } catch (err) {
            setError('Failed to fetch accounts');
            console.error('Error fetching accounts:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAccountSearch = (e) => {
        const searchText = e.target.value.toLowerCase();
        if (!data?.accounts) return;

        const filtered = data.accounts.filter(account =>
            account.name.toLowerCase().includes(searchText) ||
            (account.uniqueNumber && account.uniqueNumber.toString().toLowerCase().includes(searchText))
        ).sort((a, b) => a.name.localeCompare(b.name));

        setFilteredAccounts(filtered);
    };

    const selectAccount = (account) => {
        setFormData({
            ...formData,
            accountId: account._id,
            accountName: `${account.uniqueNumber || ''} ${account.name}`.trim()
        });
        setShowAccountModal(false);

        // Focus on From Date input after a small delay to ensure modal is closed
        setTimeout(() => {
            if (fromDateRef.current) {
                fromDateRef.current.focus();
            }
        }, 100);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.accountId || !formData.fromDate || !formData.toDate) {
            setError('Please fill all required fields');
            return;
        }

        try {
            setLoading(true);
            setError('');
            const response = await axios.get('/api/retailer/day-count-aging', {
                params: formData
            });

            if (response.data.success) {
                setData(response.data.data);
                setSelectedRowIndex(0);
            } else {
                setError(response.data.error || 'Failed to generate report');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to generate report');
            console.error('Error generating report:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Excel Export Function
    const handleExportExcel = async () => {
        // Check if there's any data to export
        if (!data?.agingData?.transactions?.length) {
            alert('No data available to export. Please generate a report first.');
            return;
        }

        setExporting(true);
        try {
            let excelData = [];
            const currentDate = new Date().toISOString().split('T')[0];

            // Add company header information
            excelData.push(['Company Name:', data.currentCompanyName || 'N/A']);
            excelData.push(['Report Type:', 'Ageing Report']);
            excelData.push(['Account:', data.account.name || 'N/A']);
            excelData.push(['From Date:', formatDisplayDate(formData.fromDate)]);
            excelData.push(['To Date:', formatDisplayDate(formData.toDate)]);
            excelData.push(['Export Date:', currentDate]);
            excelData.push([]); // Empty row for spacing

            // Add opening balance information
            const openingBalance = data?.account?.initialOpeningBalance?.amount || data?.agingData?.openingBalance;
            const balanceType = data?.account?.initialOpeningBalance?.type || data?.agingData?.openingBalanceType;
            const formattedOpeningBalance = openingBalance !== undefined && openingBalance !== null
                ? `${formatCurrency(Math.abs(openingBalance))} ${balanceType === 'credit' || openingBalance >= 0 ? 'Cr' : 'Dr'}`
                : 'N/A';

            excelData.push(['Opening Balance:', formattedOpeningBalance]);
            excelData.push([]); // Empty row for spacing

            // Main table headers
            const headers = [
                'Date',
                'Age (Days)',
                'Voucher No.',
                'Particulars',
                'Debit Amount',
                'Credit Amount',
                'Balance'
            ];

            // Add headers row
            excelData.push(headers);

            // Add transaction data
            data.agingData.transactions.forEach((transaction) => {
                const rowData = [
                    formatDate(transaction.date),
                    transaction.age + ' days',
                    transaction.referenceNumber,
                    getTransactionTypeLabel(transaction.type),
                    formatCurrency(transaction.debit),
                    formatCurrency(transaction.credit),
                    formatBalanceForExport(transaction.balance)
                ];
                excelData.push(rowData);
            });

            // Add summary section
            excelData.push([]); // Empty row
            excelData.push(['AGING SUMMARY', '']);
            excelData.push(['Age Range', 'Count']);

            const agingSummary = getAgingSummary();
            agingSummary.forEach(item => {
                excelData.push([item.range, item.count]);
            });

            // Create worksheet using array format
            const ws = XLSX.utils.aoa_to_sheet(excelData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Ageing Report');

            // Set column widths for better formatting
            const colWidths = [
                { wch: 15 }, // Date
                { wch: 12 }, // Age
                { wch: 15 }, // Voucher No.
                { wch: 20 }, // Particulars
                { wch: 15 }, // Debit
                { wch: 15 }, // Credit
                { wch: 20 }  // Balance
            ];
            ws['!cols'] = colWidths;

            // Generate filename
            const fileName = `Ageing_Report_${data.account.name}_${formData.fromDate}_to_${formData.toDate}.xlsx`;

            // Export to Excel
            XLSX.writeFile(wb, fileName);

            // Show success message
            setNotification({
                show: true,
                message: 'Excel file exported successfully!',
                type: 'success'
            });

        } catch (err) {
            console.error('Error exporting to Excel:', err);
            alert('Failed to export Excel file: ' + err.message);
        } finally {
            setExporting(false);
        }
    };

    // Helper function for Excel export balance formatting
    const formatBalanceForExport = (balance) => {
        const formattedBalance = formatCurrency(Math.abs(balance));
        return balance >= 0
            ? `${formattedBalance} Cr`
            : `${formattedBalance} Dr`;
    };

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!data?.agingData?.transactions?.length) return;

            const activeElement = document.activeElement;
            if (['INPUT', 'SELECT', 'TEXTAREA'].includes(activeElement.tagName)) return;

            switch (e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    setSelectedRowIndex(prev => Math.max(0, prev - 1));
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    setSelectedRowIndex(prev => Math.min(data.agingData.transactions.length - 1, prev + 1));
                    break;
                case 'Enter':
                    // Handle enter action if needed
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [data?.agingData?.transactions]);

    // Scroll to selected row
    useEffect(() => {
        if (tableBodyRef.current && data?.agingData?.transactions?.length > 0) {
            const rows = tableBodyRef.current.querySelectorAll('tr');
            if (rows.length > selectedRowIndex) {
                rows[selectedRowIndex].scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest'
                });
            }
        }
    }, [selectedRowIndex, data?.agingData?.transactions]);

    const printReport = () => {
        if (!data?.agingData?.transactions?.length) {
            alert('No data available to print');
            return;
        }

        const printWindow = window.open("", "_blank");

        const getMonthName = (dateString, dateFormat) => {
            if (!dateString) return '';
            const date = new Date(dateString);
            const month = date.getMonth();

            const englishMonths = ["January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"];

            const nepaliMonths = ["Baishakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashwin",
                "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"];

            return dateFormat === "nepali" ? nepaliMonths[month] : englishMonths[month];
        };

        const getYear = (dateString) => {
            if (!dateString) return '';
            const date = new Date(dateString);
            return date.getFullYear();
        };

        const getOpeningBalance = () => {
            const openingBalance = data?.account?.initialOpeningBalance?.amount || data?.agingData?.openingBalance;
            const balanceType = data?.account?.initialOpeningBalance?.type || data?.agingData?.openingBalanceType;

            if (openingBalance === undefined || openingBalance === null) return 'N/A';

            const formattedAmount = formatCurrency(Math.abs(openingBalance));
            return balanceType === 'credit' || openingBalance >= 0
                ? `${formattedAmount} Cr`
                : `${formattedAmount} Dr`;
        };

        const printContent = `
        <style>
            @page { 
                margin: 10mm; 
            }
            body { 
                font-family: Arial, sans-serif; 
                font-size: 10px; 
                margin: 0; 
                padding: 5mm; 
            }
            table { 
                width: 100%; 
                border-collapse: collapse; 
                page-break-inside: auto;
                font-size: 12px 
            }
            th, td { 
                border: 1px solid #000; 
                padding: 4px; 
                text-align: left; 
            }
            th { 
                background-color: #f2f2f2; 
            }
            .print-header { 
                text-align: center; 
                margin-bottom: 15px; 
            }
            .text-end { 
                text-align: right; 
            }
            .report-period {
                display: flex;
                justify-content: space-between;
                margin-bottom: 15px;
            }
            .report-title {
                text-align: center;
                text-decoration: underline;
                margin-bottom: 10px;
            }
        </style>
        
        <div class="print-header">
            <h1>${data.currentCompanyName}</h1>
            <h2 class="report-title">Ageing Report</h2>
            <div class="report-period">
                <div><strong>Account:</strong> ${data.account.name}
            </div>
            <div>
                    <strong>From:</strong> ${formatDisplayDate(formData.fromDate)} 
                    <strong>To:</strong> ${formatDisplayDate(formData.toDate)}
            </div>
            <div>
                    <strong>Printed:</strong> ${new Date().toLocaleString()}
            </div>
        </div>
                <div class="text-end"><strong>Opening:</strong> ${getOpeningBalance()}</div>        
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Age (Days)</th>
                    <th>Vch. No.</th>
                    <th>Particulars</th>
                    <th class="text-end">Debit</th>
                    <th class="text-end">Credit</th>
                    <th class="text-end">Balance</th>
                </tr>
            </thead>
            <tbody>
                ${data.agingData.transactions.map(transaction => `
                    <tr>
                        <td>${formatDate(transaction.date)}</td>
                        <td>${transaction.age} days</td>
                        <td>${transaction.referenceNumber}</td>
                        <td>${getTransactionTypeLabel(transaction.type)}</td>
                        <td class="text-end">${formatCurrency(transaction.debit)}</td>
                        <td class="text-end">${formatCurrency(transaction.credit)}</td>
                        <td class="text-end">${formatBalance(transaction.balance)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

        printWindow.document.write(`
        <html>
            <head>
                <title>Ageing Report - ${data.account.name}</title>
            </head>
            <body>
                ${printContent}
                <script>
                    window.onload = function() {
                        window.print();
                        window.onafterprint = function() {
                            window.close();
                        };
                    }
                </script>
            </body>
        </html>
    `);
        printWindow.document.close();
    };

    const exportToPDF = () => {
        alert('PDF export functionality');
    };

    const exportToCSV = () => {
        alert('CSV export functionality');
    };

    const getTransactionIcon = (type) => {
        const icons = {
            sales: 'fas fa-file-invoice-dollar text-primary',
            purchase: 'fas fa-shopping-cart text-info',
            purchase_return: 'fas fa-undo text-warning',
            sales_return: 'fas fa-exchange-alt text-danger',
            payment: 'fas fa-money-bill-wave text-success',
            receipt: 'fas fa-hand-holding-usd text-success',
            debit_note: 'fas fa-file-alt text-danger',
            credit_note: 'fas fa-file-alt text-success',
            journal: 'fas fa-book text-secondary'
        };
        return icons[type] || 'fas fa-file-alt text-secondary';
    };

    const getTransactionTypeLabel = (type) => {
        const labels = {
            sales: 'Sale',
            purchase: 'Purchase',
            purchase_return: 'Purchase Return',
            sales_return: 'Sales Return',
            payment: 'Payment',
            receipt: 'Receipt',
            debit_note: 'Debit Note',
            credit_note: 'Credit Note',
            journal: 'Journal'
        };
        return labels[type] || 'Transaction';
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';

        if (company.dateFormat === 'nepali') {
            try {
                // For Nepali dates, you might want to convert or display differently
                // This is a simple implementation
                return new NepaliDate(dateString).format('YYYY-MM-DD');
            } catch (error) {
                return dateString;
            }
        }

        // For English dates
        return new Date(dateString).toISOString().split('T')[0];
    };

    const formatCurrency = (num) => {
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
    };

    const formatBalance = (balance) => {
        const formattedBalance = formatCurrency(Math.abs(balance));
        return balance >= 0
            ? `${formattedBalance} Cr`
            : `${formattedBalance} Dr`;
    };

    // Calculate aging summary
    const getAgingSummary = () => {
        if (!data?.agingData?.transactions) return [];

        const transactions = data.agingData.transactions;
        return [
            {
                range: '0-30 days',
                count: transactions.filter(t => t.age <= 30).length,
                variant: 'primary'
            },
            {
                range: '31-60 days',
                count: transactions.filter(t => t.age > 30 && t.age <= 60).length,
                variant: 'info'
            },
            {
                range: '61-90 days',
                count: transactions.filter(t => t.age > 60 && t.age <= 90).length,
                variant: 'warning'
            },
            {
                range: '90+ days',
                count: transactions.filter(t => t.age > 90).length,
                variant: 'danger'
            }
        ];
    };

    const handleRowClick = (index) => {
        setSelectedRowIndex(index);
    };

    const handleKeyDown = (e, nextFieldId) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (nextFieldId) {
                document.getElementById(nextFieldId)?.focus();
            }
        }
    };

    if (loading) return <Loader />;

    return (
        <div className="container-fluid">
            <Header />
            <div className="card shadow">
                <div className="card-header bg-white py-3">
                    <h1 className="h3 mb-0 text-center text-primary">Ageing Receivables/Payables</h1>
                </div>
                <div className="card shadow-lg">
                    <div className="card-body">
                        <form onSubmit={handleSubmit} className="mb-4 p-3 bg-light rounded">
                            <div className="row">
                                {/* Account Selection - Updated to use modal */}
                                <div className="col-md-3">
                                    <div className="form-group">
                                        <label className="form-label">Account:</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={formData.accountName}
                                            onClick={() => setShowAccountModal(true)}
                                            onFocus={() => setShowAccountModal(true)}
                                            readOnly
                                            placeholder="Select Account"
                                            required
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    handleKeyDown(e, 'fromDate');
                                                }
                                            }}
                                        />
                                        <input type="hidden" id="accountId" value={formData.accountId} />
                                    </div>
                                </div>

                                <div className="col">
                                    <div className="form-group">
                                        <label className="form-label">From Date:</label>
                                        <input
                                            type="text"
                                            id="fromDate"
                                            className="form-control no-date-icon"
                                            value={formData.fromDate}
                                            onChange={(e) => handleInputChange('fromDate', e.target.value)}
                                            onKeyDown={(e) => handleKeyDown(e, 'toDate')}
                                            ref={fromDateRef} // This is important - attach the ref here
                                            required
                                            autoComplete='off'
                                        />
                                    </div>
                                </div>

                                <div className="col">
                                    <div className="form-group">
                                        <label className="form-label">To Date:</label>
                                        <input
                                            type="text"
                                            id="toDate"
                                            className="form-control no-date-icon"
                                            value={formData.toDate}
                                            onChange={(e) => handleInputChange('toDate', e.target.value)}
                                            onKeyDown={(e) => handleKeyDown(e, 'generateReport')}
                                            ref={toDateRef}
                                            required
                                            autoComplete='off'
                                        />
                                    </div>
                                </div>

                                <div className="col">
                                    <div className="form-group" style={{ marginTop: '25px' }}>
                                        <button
                                            id="generateReport"
                                            type="submit"
                                            className="btn btn-primary w-100"
                                            disabled={loading}
                                        >
                                            {loading ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2" />
                                                    Generating...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="fas fa-chart-line me-2" />
                                                    Generate Report
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <div className="col">
                                    <div className="form-group" style={{ marginTop: '25px' }}>
                                        <button
                                            type="button"
                                            className="btn btn-info w-100"
                                            onClick={printReport}
                                            disabled={!data?.agingData?.transactions?.length}
                                        >
                                            <i className="fas fa-print me-2" /> Print Report
                                        </button>
                                    </div>
                                </div>

                                {/* Excel Export Button */}
                                <div className="col">
                                    <div className="form-group" style={{ marginTop: '25px' }}>
                                        <button
                                            type="button"
                                            className="btn btn-success w-100"
                                            onClick={handleExportExcel}
                                            disabled={!data?.agingData?.transactions?.length || exporting}
                                        >
                                            {exporting ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2" />
                                                    Exporting...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="fas fa-file-excel me-2" /> Export to Excel
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </form>

                        {error && (
                            <div className="alert alert-danger text-center">
                                <i className="fas fa-exclamation-circle me-2" /> {error}
                            </div>
                        )}

                        {!formData.accountId && (
                            <div className="alert alert-info text-center">
                                <i className="fas fa-info-circle me-2" /> Please select an account and date range to generate report
                            </div>
                        )}

                        {formData.accountId && (!formData.fromDate || !formData.toDate) && (
                            <div className="alert alert-info text-center">
                                <i className="fas fa-info-circle me-2" /> Please select date range to generate report
                            </div>
                        )}

                        {data?.agingData?.transactions?.length === 0 && formData.fromDate && formData.toDate && (
                            <div className="alert alert-warning text-center">
                                <i className="fas fa-exclamation-circle me-2" /> No transactions found for the selected account and date range
                            </div>
                        )}

                        {data?.agingData?.transactions?.length > 0 && (
                            <div id="printableContent">

                                {/* Account Info */}
                                <div className="mb-4">
                                    <h4 className="text-primary no-print">
                                        <i className="fas fa-user-circle me-2" /> Account: {data.account.name}
                                    </h4>
                                    <div className="d-flex justify-content-between no-print">
                                        <div>
                                            <strong>Report Period:</strong>{' '}
                                            {formatDate(data.fromDate)} to {formatDate(data.toDate)}
                                        </div>
                                        <div>
                                            <strong>Opening:</strong>{' '}
                                            <span className="font-weight-bold">
                                                {data?.account?.initialOpeningBalance?.amount?.toFixed(2) || data?.agingData?.openingBalance?.toFixed(2)}
                                                {' '}
                                                {data?.account?.initialOpeningBalance?.type || data?.agingData?.openingBalanceType}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Transactions Table */}
                                <div className="table-responsive">
                                    <table className="table table-striped table-hover">
                                        <thead className="table-light">
                                            <tr>
                                                <th>Date</th>
                                                <th>Age (Days)</th>
                                                <th>Vch. No.</th>
                                                <th>Particulars</th>
                                                <th className="text-end">Debit</th>
                                                <th className="text-end">Credit</th>
                                                <th className="text-end">Balance</th>
                                            </tr>
                                        </thead>
                                        <tbody ref={tableBodyRef}>
                                            {data.agingData.transactions.map((transaction, index) => (
                                                <tr
                                                    key={transaction._id}
                                                    className={selectedRowIndex === index ? 'highlighted-row' : ''}
                                                    onClick={() => handleRowClick(index)}
                                                >
                                                    <td>{formatDate(transaction.date)}</td>
                                                    <td>{transaction.age} days</td>
                                                    <td>{transaction.referenceNumber}</td>
                                                    <td>
                                                        <i className={getTransactionIcon(transaction.type)} />{' '}
                                                        {getTransactionTypeLabel(transaction.type)}
                                                        {transaction.referenceNumber !== 'N/A'}
                                                    </td>
                                                    <td className="text-end text-danger">
                                                        {formatCurrency(transaction.debit)}
                                                    </td>
                                                    <td className="text-end text-success">
                                                        {formatCurrency(transaction.credit)}
                                                    </td>
                                                    <td className="text-end font-weight-bold">
                                                        {formatBalance(transaction.balance)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Summary and Export Options */}
                                <div className="mt-4 no-print">
                                    <div className="row">
                                        <div className="col-md-4">
                                            <div className="card bg-light">
                                                <div className="card-body">
                                                    <h5 className="card-title">Aging Summary</h5>
                                                    <div className="list-group list-group-flush">
                                                        {getAgingSummary().map((item, index) => (
                                                            <div
                                                                key={index}
                                                                className="list-group-item d-flex justify-content-between align-items-center"
                                                            >
                                                                {item.range}
                                                                <span className={`badge bg-${item.variant} rounded-pill`}>
                                                                    {item.count}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Account Modal */}
            {showAccountModal && (
                <div className="modal fade show" id="accountModal" tabIndex="-1" style={{ display: 'block' }}>
                    <div className="modal-dialog modal-xl modal-dialog-centered">
                        <div className="modal-content" style={{ height: '500px' }}>
                            <div className="modal-header">
                                <h5 className="modal-title" id="accountModalLabel">Select an Account</h5>
                                <button type="button" className="btn-close" onClick={() => setShowAccountModal(false)}></button>
                            </div>
                            <div className="p-3 bg-white sticky-top">
                                <input
                                    type="text"
                                    id="searchAccount"
                                    className="form-control form-control-sm"
                                    placeholder="Search Account"
                                    autoComplete='off'
                                    autoFocus
                                    onChange={handleAccountSearch}
                                    onKeyDown={(e) => {
                                        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                                            e.preventDefault();
                                            const firstAccountItem = document.querySelector('.account-item');
                                            if (firstAccountItem) {
                                                firstAccountItem.focus();
                                            }
                                        } else if (e.key === 'Enter') {
                                            e.preventDefault();
                                            const firstAccountItem = document.querySelector('.account-item.active');
                                            if (firstAccountItem) {
                                                const accountId = firstAccountItem.getAttribute('data-account-id');
                                                const account = filteredAccounts.length > 0
                                                    ? filteredAccounts.find(a => a._id === accountId)
                                                    : data?.accounts?.find(a => a._id === accountId);
                                                if (account) {
                                                    selectAccount(account);
                                                }
                                            }
                                        }
                                    }}
                                    ref={accountSearchRef}
                                />
                            </div>
                            <div className="modal-body p-0">
                                <div className="overflow-auto" style={{ height: 'calc(400px - 120px)' }}>
                                    <ul id="accountList" className="list-group">
                                        {filteredAccounts.length > 0 ? (
                                            filteredAccounts.map((account, index) => (
                                                <li
                                                    key={account._id}
                                                    data-account-id={account._id}
                                                    className={`list-group-item account-item py-2 ${index === 0 ? 'active' : ''}`}
                                                    onClick={() => {
                                                        selectAccount(account);
                                                    }}
                                                    style={{ cursor: 'pointer' }}
                                                    tabIndex={0}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'ArrowDown') {
                                                            e.preventDefault();
                                                            const nextItem = e.target.nextElementSibling;
                                                            if (nextItem) {
                                                                e.target.classList.remove('active');
                                                                nextItem.classList.add('active');
                                                                nextItem.focus();
                                                            }
                                                        } else if (e.key === 'ArrowUp') {
                                                            e.preventDefault();
                                                            const prevItem = e.target.previousElementSibling;
                                                            if (prevItem) {
                                                                e.target.classList.remove('active');
                                                                prevItem.classList.add('active');
                                                                prevItem.focus();
                                                            } else {
                                                                accountSearchRef.current.focus();
                                                            }
                                                        } else if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            selectAccount(account);
                                                        }
                                                    }}
                                                    onFocus={(e) => {
                                                        document.querySelectorAll('.account-item').forEach(item => {
                                                            item.classList.remove('active');
                                                        });
                                                        e.target.classList.add('active');
                                                    }}
                                                >
                                                    <div className="d-flex justify-content-between small">
                                                        <strong>{account.uniqueNumber || 'N/A'} {account.name}</strong>
                                                        <span>📍 {account.address || 'N/A'} | 🆔 PAN: {account.pan || 'N/A'}</span>
                                                    </div>
                                                </li>
                                            ))
                                        ) : (
                                            accountSearchRef.current?.value ? (
                                                <li className="list-group-item text-center text-muted small py-2">No accounts found</li>
                                            ) : (
                                                data?.accounts?.map((account, index) => (
                                                    <li
                                                        key={account._id}
                                                        data-account-id={account._id}
                                                        className={`list-group-item account-item py-2 ${index === 0 ? 'active' : ''}`}
                                                        onClick={() => {
                                                            selectAccount(account);
                                                        }}
                                                        style={{ cursor: 'pointer' }}
                                                        tabIndex={0}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'ArrowDown') {
                                                                e.preventDefault();
                                                                const nextItem = e.target.nextElementSibling;
                                                                if (nextItem) {
                                                                    e.target.classList.remove('active');
                                                                    nextItem.classList.add('active');
                                                                    nextItem.focus();
                                                                }
                                                            } else if (e.key === 'ArrowUp') {
                                                                e.preventDefault();
                                                                const prevItem = e.target.previousElementSibling;
                                                                if (prevItem) {
                                                                    e.target.classList.remove('active');
                                                                    prevItem.classList.add('active');
                                                                    prevItem.focus();
                                                                } else {
                                                                    accountSearchRef.current.focus();
                                                                }
                                                            } else if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                selectAccount(account);
                                                            }
                                                        }}
                                                        onFocus={(e) => {
                                                            document.querySelectorAll('.account-item').forEach(item => {
                                                                item.classList.remove('active');
                                                            });
                                                            e.target.classList.add('active');
                                                        }}
                                                    >
                                                        <div className="d-flex justify-content-between small">
                                                            <strong>{account.uniqueNumber || 'N/A'} {account.name}</strong>
                                                            <span>📍 {account.address || 'N/A'} | 🆔 PAN: {account.pan || 'N/A'}</span>
                                                        </div>
                                                    </li>
                                                ))
                                            )
                                        )}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <NotificationToast
                show={notification.show}
                message={notification.message}
                type={notification.type}
                onClose={() => setNotification({ ...notification, show: false })}
            />
        </div>
    );
};

export default DayWiseAgeing;
