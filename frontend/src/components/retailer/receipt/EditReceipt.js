// import React, { useState, useEffect, useRef } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import axios from 'axios';
// import NepaliDate from 'nepali-date-converter';
// import NotificationToast from '../../NotificationToast';
// import Header from '../Header';
// import AccountBalanceDisplay from '../payment/AccountBalanceDisplay';
// import ProductModal from '../dashboard/modals/ProductModal';
// import VirtualizedAccountList from '../../VirtualizedAccountList';

// const EditReceipt = () => {
//     const { id } = useParams();
//     const navigate = useNavigate();
//     const [isSaving, setIsSaving] = useState(false);
//     const [isInitialDataLoaded, setIsInitialDataLoaded] = useState(false);
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState(null);
//     const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
//     const [showProductModal, setShowProductModal] = useState(false);
//     const transactionDateRef = useRef(null);

//     const [company, setCompany] = useState({
//         dateFormat: 'nepali',
//         vatEnabled: true,
//         fiscalYear: {}
//     });

//     const [dateErrors, setDateErrors] = useState({
//         nepaliDate: ''
//     });

//     const [formData, setFormData] = useState({
//         nepaliDate: currentNepaliDate,
//         billDate: new Date().toISOString().split('T')[0],
//         billNumber: '',
//         receiptAccountId: '',
//         accountId: '',
//         accountName: '',
//         credit: '',
//         instType: 0, // N/A = 0
//         instNo: '',
//         bankAcc: '',
//         description: '',
//         status: 'Active'
//     });

//     const [notification, setNotification] = useState({
//         show: false,
//         message: '',
//         type: 'success'
//     });

//     // Account search states
//     const [isAccountSearching, setIsAccountSearching] = useState(false);
//     const [accounts, setAccounts] = useState([]);
//     const [accountSearchPage, setAccountSearchPage] = useState(1);
//     const [hasMoreAccountResults, setHasMoreAccountResults] = useState(false);
//     const [totalAccounts, setTotalAccounts] = useState(0);
//     const [accountSearchQuery, setAccountSearchQuery] = useState('');
//     const [accountLastSearchQuery, setAccountLastSearchQuery] = useState('');
//     const [accountShouldShowLastSearchResults, setAccountShouldShowLastSearchResults] = useState(false);

//     const accountSearchRef = useRef(null);
//     const [cashAccounts, setCashAccounts] = useState([]);
//     const [bankAccounts, setBankAccounts] = useState([]);
//     const [companyDateFormat, setCompanyDateFormat] = useState('nepali');
//     const [showBankDetails, setShowBankDetails] = useState(false);
//     const [showAccountModal, setShowAccountModal] = useState(false);
//     const [showAccountCreationModal, setShowAccountCreationModal] = useState(false);

//     // Print after save state
//     const [printAfterSave, setPrintAfterSave] = useState(
//         localStorage.getItem('printAfterSaveReceiptEdit') === 'true' || false
//     );

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

//     // Fetch accounts from backend
//     const fetchAccountsFromBackend = async (searchTerm = '', page = 1) => {
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
//                     setAccounts(response.data.accounts);
//                 } else {
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
//             setNotification({
//                 show: true,
//                 message: 'Error loading accounts',
//                 type: 'error'
//             });
//         } finally {
//             setIsAccountSearching(false);
//         }
//     };

//     // Fetch receipt data
//     useEffect(() => {
//         const fetchReceiptData = async () => {
//             try {
//                 setIsLoading(true);

//                 const response = await api.get(`/api/retailer/receipts/edit/${id}`);
//                 const { data } = response.data;

//                 setCompany({
//                     ...data.company,
//                     dateFormat: data.company.dateFormat || 'nepali'
//                 });

//                 setCashAccounts(data.cashAccounts || []);
//                 setBankAccounts(data.bankAccounts || []);
//                 setCompanyDateFormat(data.companyDateFormat || 'nepali');

//                 const receipt = data.receipt;

//                 // Format date properly
//                 const formatDate = (dateValue) => {
//                     if (!dateValue) return '';

//                     if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
//                         return dateValue;
//                     }

//                     try {
//                         const date = new Date(dateValue);
//                         if (isNaN(date.getTime())) return '';

//                         const year = date.getFullYear();
//                         const month = String(date.getMonth() + 1).padStart(2, '0');
//                         const day = String(date.getDate()).padStart(2, '0');

//                         return `${year}-${month}-${day}`;
//                     } catch (e) {
//                         console.error('Date formatting error:', e);
//                         return '';
//                     }
//                 };

//                 // Convert instrument type string to enum value
//                 const getInstrumentTypeValue = (type) => {
//                     if (typeof type === 'number') return type;

//                     switch (type?.toLowerCase()) {
//                         case 'rtgs': return 1;
//                         case 'fonepay': return 2;
//                         case 'cheque': return 3;
//                         case 'connectips': return 4;
//                         case 'connect-ips': return 4;
//                         case 'esewa': return 5;
//                         case 'khalti': return 6;
//                         case 'n/a':
//                         default: return 0;
//                     }
//                 };

//                 setFormData({
//                     nepaliDate: formatDate(receipt.nepaliDate) || currentNepaliDate,
//                     billDate: formatDate(receipt.date) || new Date().toISOString().split('T')[0],
//                     billNumber: receipt.billNumber || '',
//                     receiptAccountId: receipt.receiptAccountId || '',
//                     accountId: receipt.accountId || '',
//                     accountName: receipt.accountName || '',
//                     credit: receipt.credit || '',
//                     instType: getInstrumentTypeValue(receipt.instType),
//                     instNo: receipt.instNo || '',
//                     bankAcc: receipt.bankAcc || '',
//                     description: receipt.description || '',
//                     status: receipt.status || 'Active'
//                 });

//                 // Show bank details if receipt account is a bank account
//                 const isBankAccount = data.bankAccounts.some(
//                     acc => acc.id === receipt.receiptAccountId
//                 );
//                 setShowBankDetails(isBankAccount);

//                 setIsInitialDataLoaded(true);
//             } catch (error) {
//                 console.error('Error fetching receipt data:', error);
//                 setError(error.response?.data?.message || 'Failed to load receipt data');
//             } finally {
//                 setIsLoading(false);
//             }
//         };

//         if (id) {
//             fetchReceiptData();
//         }
//     }, [id]);

//     // Set focus on date input after initial load
//     useEffect(() => {
//         if (isInitialDataLoaded && transactionDateRef.current) {
//             const timer = setTimeout(() => {
//                 transactionDateRef.current.focus();
//             }, 50);

//             return () => clearTimeout(timer);
//         }
//     }, [isInitialDataLoaded, company.dateFormat]);

//     useEffect(() => {
//         // Add F9 key handler
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

//     useEffect(() => {
//         const handleEscapeKey = (e) => {
//             if (e.key === 'Escape' && showAccountModal) {
//                 e.preventDefault();
//                 handleAccountModalClose();
//             } else if (e.key === 'Escape' && showAccountCreationModal) {
//                 e.preventDefault();
//                 handleAccountCreationModalClose();
//             }
//         };

//         window.addEventListener('keydown', handleEscapeKey);

//         return () => {
//             window.removeEventListener('keydown', handleEscapeKey);
//         };
//     }, [showAccountModal, showAccountCreationModal]);

//     useEffect(() => {
//         const handleF6KeyForAccounts = (e) => {
//             if (e.key === 'F6' && showAccountModal) {
//                 e.preventDefault();
//                 setShowAccountCreationModal(true);
//                 setShowAccountModal(false);
//             }
//         };

//         window.addEventListener('keydown', handleF6KeyForAccounts);
//         return () => {
//             window.removeEventListener('keydown', handleF6KeyForAccounts);
//         };
//     }, [showAccountModal]);

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
//     }, [showAccountModal]);

//     // Print after save handler
//     const handlePrintAfterSaveChange = (e) => {
//         const isChecked = e.target.checked;
//         setPrintAfterSave(isChecked);
//         localStorage.setItem('printAfterSaveReceiptEdit', isChecked);
//     };

//     const handleInputChange = (e) => {
//         const { name, value } = e.target;
//         setFormData(prev => ({ ...prev, [name]: value }));
//     };

//     const handleReceiptAccountChange = (e) => {
//         const selectedValue = e.target.value;
//         const selectedOption = e.target.options[e.target.selectedIndex];
//         const isBankAccount = selectedOption.getAttribute('data-group') === 'bank';

//         setShowBankDetails(isBankAccount);
//         setFormData(prev => ({ ...prev, receiptAccountId: selectedValue }));
//     };

//     const handleSubmit = async (print = false) => {
//         setIsSaving(true);

//         try {
//             const payload = {
//                 accountId: formData.accountId,
//                 receiptAccountId: formData.receiptAccountId,
//                 credit: parseFloat(formData.credit) || 0,
//                 instType: parseInt(formData.instType) || 0,
//                 instNo: formData.instNo || '',
//                 bankAcc: formData.bankAcc || '',
//                 description: formData.description || '',
//                 paymentMode: 'receipt',
//                 nepaliDate: formData.nepaliDate,
//                 date: formData.billDate,
//                 print: print || printAfterSave
//             };

//             const response = await api.put(`/api/retailer/receipts/edit/${id}`, payload);

//             setNotification({
//                 show: true,
//                 message: 'Receipt updated successfully!',
//                 type: 'success'
//             });

//             // If print was requested, fetch print data and print
//             if ((print || printAfterSave) && response.data.data?.receipt?.id) {
//                 try {
//                     const printResponse = await api.get(`/api/retailer/receipts/${response.data.data.receipt.id}/print`);
//                     printVoucherImmediately(printResponse.data.data);
//                     setTimeout(() => handleBack(), 500);
//                 } catch (printError) {
//                     console.error('Error fetching print data:', printError);
//                     setNotification({
//                         show: true,
//                         message: 'Receipt updated but failed to load print data',
//                         type: 'warning'
//                     });
//                     setTimeout(() => handleBack(), 1000);
//                 }
//             } else {
//                 setTimeout(() => handleBack(), 500);
//             }
//         } catch (err) {
//             console.error('Error updating receipt:', err);
//             setNotification({
//                 show: true,
//                 message: err.response?.data?.error || 'Failed to update receipt. Please try again.',
//                 type: 'error'
//             });
//         } finally {
//             setIsSaving(false);
//         }
//     };

//     const handleCancelVoucher = async () => {
//         if (window.confirm("Are you sure you want to cancel this voucher?")) {
//             try {
//                 await api.post(`/api/retailer/receipts/cancel/${formData.billNumber}`);
//                 setNotification({
//                     show: true,
//                     message: 'Voucher canceled successfully!',
//                     type: 'success'
//                 });
//                 // Refresh receipt data
//                 setFormData(prev => ({
//                     ...prev,
//                     status: 'Canceled'
//                 }));
//             } catch (err) {
//                 setNotification({
//                     show: true,
//                     message: err.response?.data?.message || 'Failed to cancel voucher',
//                     type: 'error'
//                 });
//             }
//         }
//     };

//     const handleReactivateVoucher = async () => {
//         if (window.confirm("Are you sure you want to reactivate this voucher?")) {
//             try {
//                 await api.post(`/api/retailer/receipts/reactivate/${formData.billNumber}`);
//                 setNotification({
//                     show: true,
//                     message: 'Voucher reactivated successfully!',
//                     type: 'success'
//                 });
//                 // Refresh receipt data
//                 setFormData(prev => ({
//                     ...prev,
//                     status: 'Active'
//                 }));
//             } catch (err) {
//                 setNotification({
//                     show: true,
//                     message: err.response?.data?.message || 'Failed to reactivate voucher',
//                     type: 'error'
//                 });
//             }
//         }
//     };

//     const handleAccountSearch = (e) => {
//         const searchText = e.target.value;
//         setAccountSearchQuery(searchText);
//         setAccountSearchPage(1);

//         if (searchText.trim() !== '' && accountShouldShowLastSearchResults) {
//             setAccountShouldShowLastSearchResults(false);
//             setAccountLastSearchQuery('');
//         }

//         const timer = setTimeout(() => {
//             fetchAccountsFromBackend(searchText, 1);
//         }, 300);

//         return () => clearTimeout(timer);
//     };

//     const handleAccountModalClose = () => {
//         setShowAccountModal(false);
//     };

//     const handleAccountCreationModalClose = () => {
//         setShowAccountCreationModal(false);
//         setShowAccountModal(true);
//         fetchAccountsFromBackend('', 1);
//     };

//     const selectAccount = (account) => {
//         setFormData({
//             ...formData,
//             accountId: account.id,
//             accountName: `${account.uniqueNumber || ''} ${account.name}`.trim(),
//         });
//         setShowAccountModal(false);

//         // Focus on credit amount field after account selection
//         setTimeout(() => {
//             document.getElementById('credit')?.focus();
//         }, 50);
//     };

//     const handleBack = () => {
//         navigate(-1);
//     };

//     const handleKeyDown = (e, currentFieldId) => {
//         if (e.key === 'Enter') {
//             e.preventDefault();
//             const form = e.target.form;
//             const inputs = Array.from(form.querySelectorAll('input, select, textarea')).filter(
//                 el => !el.hidden && !el.disabled && el.offsetParent !== null
//             );
//             const currentIndex = inputs.findIndex(input => input.id === currentFieldId);

//             if (currentIndex > -1 && currentIndex < inputs.length - 1) {
//                 inputs[currentIndex + 1].focus();
//             }
//         }
//     };

//     const loadMoreAccounts = () => {
//         if (!isAccountSearching) {
//             fetchAccountsFromBackend(accountSearchQuery, accountSearchPage + 1);
//         }
//     };

//     const printVoucherImmediately = (printData) => {
//         // Create a temporary div to hold the print content
//         const tempDiv = document.createElement('div');
//         tempDiv.style.position = 'absolute';
//         tempDiv.style.left = '-9999px';
//         document.body.appendChild(tempDiv);

//         // Create the printable content
//         tempDiv.innerHTML = `
//         <div id="printableContent">
//             <div class="print-voucher-container">
//                 <div class="print-voucher-header">
//                     <div class="print-company-name">${printData.currentCompanyName}</div>
//                     <div class="print-company-details">
//                         ${printData.currentCompany?.address || ''}-${printData.currentCompany?.ward || ''}, ${printData.currentCompany?.city || ''}
//                         <br />
//                         Tel: ${printData.currentCompany?.phone || ''} | PAN: ${printData.currentCompany?.pan || 'N/A'}
//                     </div>
//                     <div class="print-voucher-title">RECEIPT VOUCHER</div>
//                 </div>

//                 <div class="print-voucher-details">
//                     <div>
//                         <div><strong>Vch. No:</strong> ${printData.receipt?.billNumber || ''}</div>
//                     </div>
//                     <div>
//                         <div><strong>Date:</strong> ${new Date(printData.receipt?.date).toLocaleDateString()}</div>
//                     </div>
//                 </div>

//                 <table class="print-voucher-table">
//                     <thead>
//                         <tr>
//                             <th>S.N</th>
//                             <th>Particular</th>
//                             <th>Debit Amount</th>
//                             <th>Credit Amount</th>
//                         </thead>
//                     <tbody>
//                         <tr>
//                             <td>1</td>
//                             <td>${printData.receipt?.receiptAccountName || 'N/A'}</td>
//                             <td>${(printData.receipt?.credit || 0).toFixed(2)}</td>
//                             <td>0.00</td>
//                         </tr>
//                         <tr>
//                             <td>2</td>
//                             <td>${printData.receipt?.accountName || 'N/A'}</td>
//                             <td>0.00</td>
//                             <td>${(printData.receipt?.credit || 0).toFixed(2)}</td>
//                         </tr>
//                     </tbody>
//                     <tfoot>
//                         <tr>
//                             <th colSpan="2">Total</th>
//                             <th>${(printData.receipt?.credit || 0).toFixed(2)}</th>
//                             <th>${(printData.receipt?.credit || 0).toFixed(2)}</th>
//                         </tr>
//                     </tfoot>
//                 </table>

//                 <div style={{ marginTop: '3mm' }}>
//                     <strong>Note:</strong> ${printData.receipt?.description || 'N/A'}
//                 </div>

//                 <div style={{ marginTop: '3mm' }}>
//                     <div><strong>Mode of Receipt:</strong> ${getInstrumentTypeName(printData.receipt?.instType) || 'N/A'}</div>
//                     <div><strong>Bank:</strong> ${printData.receipt?.bankAcc || 'N/A'}</div>
//                     <div><strong>Inst No:</strong> ${printData.receipt?.instNo || 'N/A'}</div>
//                 </div>

//                 <div class="print-signature-area">
//                     <div class="print-signature-box">
//                         <div style={{ marginBottom: '1mm' }}>
//                             <strong>${printData.receipt?.userName || 'N/A'}</strong>
//                         </div>
//                         Prepared By
//                     </div>
//                     <div class="print-signature-box">
//                         <div style={{ marginBottom: '1mm' }}>&nbsp;</div>
//                         Checked By
//                     </div>
//                     <div class="print-signature-box">
//                         <div style={{ marginBottom: '1mm' }}>&nbsp;</div>
//                         Approved By
//                     </div>
//                 </div>
//             </div>
//         </div>
//     `;

//         // Add print styles
//         const styles = `
//         @page {
//             size: A4;
//             margin: 5mm;
//         }
//         body {
//             font-family: 'Arial Narrow', Arial, sans-serif;
//             font-size: 9pt;
//             line-height: 1.2;
//             color: #000;
//             background: white;
//             margin: 0;
//             padding: 0;
//         }
//         .print-voucher-container {
//             width: 100%;
//             max-width: 210mm;
//             margin: 0 auto;
//             padding: 2mm;
//         }
//         .print-voucher-header {
//             text-align: center;
//             margin-bottom: 3mm;
//             border-bottom: 1px dashed #000;
//             padding-bottom: 2mm;
//         }
//         .print-voucher-title {
//             font-size: 12pt;
//             font-weight: bold;
//             margin: 2mm 0;
//             text-transform: uppercase;
//             text-decoration: underline;
//             letter-spacing: 1px;
//         }
//         .print-company-name {
//             font-size: 16pt;
//             font-weight: bold;
//         }
//         .print-company-details {
//             font-size: 8pt;
//             margin: 1mm 0;
//         }
//         .print-voucher-details {
//             display: flex;
//             justify-content: space-between;
//             margin: 2mm 0;
//             font-size: 8pt;
//         }
//         .print-voucher-table {
//             width: 100%;
//             border-collapse: collapse;
//             margin: 3mm 0;
//             font-size: 8pt;
//         }
//         .print-voucher-table thead {
//             border-top: 1px dashed #000;
//             border-bottom: 1px dashed #000;
//         }
//         .print-voucher-table th {
//             background-color: transparent;
//             border: 1px solid #000;
//             padding: 1mm;
//             text-align: left;
//             font-weight: bold;
//         }
//         .print-voucher-table td {
//             border: 1px solid #000;
//             padding: 1mm;
//         }
//         .print-text-right {
//             text-align: right;
//         }
//         .print-text-center {
//             text-align: center;
//         }
//         .print-signature-area {
//             display: flex;
//             justify-content: space-between;
//             margin-top: 5mm;
//             font-size: 8pt;
//         }
//         .print-signature-box {
//             text-align: center;
//             width: 30%;
//             border-top: 1px dashed #000;
//             padding-top: 1mm;
//             font-weight: bold;
//         }
//     `;

//         // Create print window
//         const printWindow = window.open('', '_blank');
//         printWindow.document.write(`
//         <html>
//             <head>
//                 <title>Receipt_Voucher_${printData.receipt?.billNumber}</title>
//                 <style>${styles}</style>
//             </head>
//             <body>
//                 ${tempDiv.innerHTML}
//                 <script>
//                     window.onload = function() {
//                         setTimeout(function() {
//                             window.print();
//                             window.close();
//                         }, 200);
//                     };
//                 <\/script>
//             </body>
//         </html>
//     `);
//         printWindow.document.close();

//         // Clean up
//         document.body.removeChild(tempDiv);
//     };

//     const getInstrumentTypeName = (type) => {
//         const numType = parseInt(type);
//         switch (numType) {
//             case 1: return 'RTGS';
//             case 2: return 'Fonepay';
//             case 3: return 'Cheque';
//             case 4: return 'Connect-Ips';
//             case 5: return 'Esewa';
//             case 6: return 'Khalti';
//             case 0:
//             default: return 'N/A';
//         }
//     };

//     if (isLoading) {
//         return (
//             <div className="container-fluid">
//                 <Header />
//                 <div className="text-center py-5">
//                     <div className="spinner-border" role="status">
//                         <span className="visually-hidden">Loading...</span>
//                     </div>
//                 </div>
//             </div>
//         );
//     }

//     if (error) return <div className="alert alert-danger mt-5">{error}</div>;

//     return (
//         <div className="container-fluid">
//             <Header />
//             <div className="container mt-4 wow-form">
//                 <div className="card mt-2 shadow-lg p-2 animate__animated animate__fadeInUp expanded-card ledger-card compact">
//                     <div className="card-header">
//                         <div className="d-flex justify-content-between align-items-center">
//                             <h2 className="card-title mb-0">
//                                 <i className="bi bi-file-text me-2"></i>
//                                 Edit Receipt
//                             </h2>
//                             <div className="d-flex align-items-center gap-2">
//                                 {formData.status === 'Canceled' && (
//                                     <span className="badge bg-danger" style={{ fontSize: '0.7rem' }}>
//                                         Voucher Canceled
//                                     </span>
//                                 )}
//                                 {formData.status === 'Active' ? (
//                                     <button
//                                         type="button"
//                                         className="btn btn-danger btn-sm d-flex align-items-center"
//                                         onClick={handleCancelVoucher}
//                                         style={{
//                                             height: '26px',
//                                             padding: '0 12px',
//                                             fontSize: '0.8rem',
//                                             fontWeight: '500'
//                                         }}
//                                     >
//                                         <i className="bi bi-x-circle me-1" style={{ fontSize: '0.9rem' }}></i> Cancel Voucher
//                                     </button>
//                                 ) : (
//                                     <button
//                                         type="button"
//                                         className="btn btn-success btn-sm d-flex align-items-center"
//                                         onClick={handleReactivateVoucher}
//                                         style={{
//                                             height: '26px',
//                                             padding: '0 12px',
//                                             fontSize: '0.8rem',
//                                             fontWeight: '500'
//                                         }}
//                                     >
//                                         <i className="bi bi-check-circle me-1" style={{ fontSize: '0.9rem' }}></i> Reactivate Voucher
//                                     </button>
//                                 )}
//                             </div>
//                         </div>
//                     </div>

//                     <div className="card-body p-2 p-md-3">
//                         <form className="wow-form" id='editReceiptForm' onSubmit={(e) => {
//                             e.preventDefault();
//                             handleSubmit(false);
//                         }}>
//                             {/* Date and Basic Info Row */}
//                             <div className="row g-2 mb-3">
//                                 {(company.dateFormat === 'nepali' || company.dateFormat === 'Nepali') ? (
//                                     <>
//                                         <div className="col-12 col-md-6 col-lg-2">
//                                             <div className="position-relative">
//                                                 <input
//                                                     type="text"
//                                                     name="nepaliDate"
//                                                     id="nepaliDate"
//                                                     ref={company.dateFormat === 'nepali' ? transactionDateRef : null}
//                                                     autoComplete='off'
//                                                     className={`form-control form-control-sm no-date-icon ${dateErrors.nepaliDate ? 'is-invalid' : ''}`}
//                                                     value={formData.nepaliDate}
//                                                     onChange={(e) => {
//                                                         const value = e.target.value;
//                                                         const sanitizedValue = value.replace(/[^0-9/-]/g, '');

//                                                         if (sanitizedValue.length <= 10) {
//                                                             setFormData({ ...formData, nepaliDate: sanitizedValue });
//                                                             setDateErrors(prev => ({ ...prev, nepaliDate: '' }));
//                                                         }
//                                                     }}
//                                                     onKeyDown={(e) => {
//                                                         const allowedKeys = [
//                                                             'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
//                                                             'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
//                                                             'Home', 'End'
//                                                         ];

//                                                         if (!allowedKeys.includes(e.key) &&
//                                                             !/^\d$/.test(e.key) &&
//                                                             e.key !== '/' &&
//                                                             e.key !== '-' &&
//                                                             !e.ctrlKey && !e.metaKey) {
//                                                             e.preventDefault();
//                                                         }

//                                                         if (e.key === 'Enter') {
//                                                             e.preventDefault();
//                                                             handleKeyDown(e, 'nepaliDate');
//                                                         }
//                                                     }}
//                                                     placeholder="YYYY-MM-DD"
//                                                     required
//                                                     disabled={formData.status === 'Canceled'}
//                                                     style={{
//                                                         height: '26px',
//                                                         fontSize: '0.875rem',
//                                                         paddingTop: '0.75rem',
//                                                         width: '100%',
//                                                         backgroundColor: formData.status === 'Canceled' ? '#e9ecef' : ''
//                                                     }}
//                                                 />
//                                                 <label
//                                                     className="position-absolute"
//                                                     style={{
//                                                         top: '-0.5rem',
//                                                         left: '0.75rem',
//                                                         fontSize: '0.75rem',
//                                                         backgroundColor: 'white',
//                                                         padding: '0 0.25rem',
//                                                         color: '#6c757d',
//                                                         fontWeight: '500'
//                                                     }}
//                                                 >
//                                                     Date: <span className="text-danger">*</span>
//                                                 </label>
//                                                 {dateErrors.nepaliDate && (
//                                                     <div className="invalid-feedback d-block" style={{ fontSize: '0.7rem' }}>
//                                                         {dateErrors.nepaliDate}
//                                                     </div>
//                                                 )}
//                                             </div>
//                                         </div>
//                                     </>
//                                 ) : (
//                                     <>
//                                         <div className="col-12 col-md-6 col-lg-2">
//                                             <div className="position-relative">
//                                                 <input
//                                                     type="date"
//                                                     name="billDate"
//                                                     id="billDate"
//                                                     className="form-control form-control-sm"
//                                                     ref={company.dateFormat === 'english' ? transactionDateRef : null}
//                                                     value={formData.billDate}
//                                                     onChange={(e) => {
//                                                         const value = e.target.value;
//                                                         const selectedDate = new Date(value);
//                                                         const today = new Date();
//                                                         today.setHours(0, 0, 0, 0);

//                                                         if (selectedDate > today) {
//                                                             const todayStr = today.toISOString().split('T')[0];
//                                                             setFormData({ ...formData, billDate: todayStr });

//                                                             setNotification({
//                                                                 show: true,
//                                                                 message: 'Future date not allowed. Auto-corrected to today.',
//                                                                 type: 'warning',
//                                                                 duration: 3000
//                                                             });
//                                                         } else {
//                                                             setFormData({ ...formData, billDate: value });
//                                                         }
//                                                     }}
//                                                     onKeyDown={(e) => {
//                                                         if (e.key === 'Enter') {
//                                                             e.preventDefault();
//                                                             handleKeyDown(e, 'billDate');
//                                                         }
//                                                     }}
//                                                     max={new Date().toISOString().split('T')[0]}
//                                                     required
//                                                     disabled={formData.status === 'Canceled'}
//                                                     style={{
//                                                         height: '26px',
//                                                         fontSize: '0.875rem',
//                                                         paddingTop: '0.75rem',
//                                                         width: '100%',
//                                                         backgroundColor: formData.status === 'Canceled' ? '#e9ecef' : ''
//                                                     }}
//                                                 />
//                                                 <label
//                                                     className="position-absolute"
//                                                     style={{
//                                                         top: '-0.5rem',
//                                                         left: '0.75rem',
//                                                         fontSize: '0.75rem',
//                                                         backgroundColor: 'white',
//                                                         padding: '0 0.25rem',
//                                                         color: '#6c757d',
//                                                         fontWeight: '500'
//                                                     }}
//                                                 >
//                                                     Date: <span className="text-danger">*</span>
//                                                 </label>
//                                             </div>
//                                         </div>
//                                     </>
//                                 )}

//                                 <div className="col-12 col-md-6 col-lg-2">
//                                     <div className="position-relative">
//                                         <input
//                                             type="text"
//                                             name="billNumber"
//                                             id="billNumber"
//                                             className="form-control form-control-sm"
//                                             value={formData.billNumber}
//                                             readOnly
//                                             style={{
//                                                 height: '26px',
//                                                 fontSize: '0.875rem',
//                                                 paddingTop: '0.75rem',
//                                                 width: '100%'
//                                             }}
//                                         />
//                                         <label
//                                             className="position-absolute"
//                                             style={{
//                                                 top: '-0.5rem',
//                                                 left: '0.75rem',
//                                                 fontSize: '0.75rem',
//                                                 backgroundColor: 'white',
//                                                 padding: '0 0.25rem',
//                                                 color: '#6c757d',
//                                                 fontWeight: '500'
//                                             }}
//                                         >
//                                             Vch. No:
//                                         </label>
//                                     </div>
//                                 </div>

//                                 <div className="col-12 col-md-6 col-lg-2">
//                                     <div className="position-relative">
//                                         <input
//                                             type="text"
//                                             name="accountType"
//                                             id="accountType"
//                                             className="form-control form-control-sm"
//                                             value="Receipt"
//                                             readOnly
//                                             style={{
//                                                 height: '26px',
//                                                 fontSize: '0.875rem',
//                                                 paddingTop: '0.75rem',
//                                                 width: '100%'
//                                             }}
//                                         />
//                                         <label
//                                             className="position-absolute"
//                                             style={{
//                                                 top: '-0.5rem',
//                                                 left: '0.75rem',
//                                                 fontSize: '0.75rem',
//                                                 backgroundColor: 'white',
//                                                 padding: '0 0.25rem',
//                                                 color: '#6c757d',
//                                                 fontWeight: '500'
//                                             }}
//                                         >
//                                             A/c Type:
//                                         </label>
//                                     </div>
//                                 </div>

//                                 <div className="col-12 col-md-6 col-lg-2">
//                                     <div className="position-relative">
//                                         <select
//                                             name="receiptAccountId"
//                                             id="receiptAccountId"
//                                             className="form-control form-control-sm"
//                                             required
//                                             value={formData.receiptAccountId}
//                                             onChange={handleReceiptAccountChange}
//                                             onKeyDown={(e) => {
//                                                 if (e.key === 'Enter') {
//                                                     handleKeyDown(e, 'receiptAccountId');
//                                                 }
//                                             }}
//                                             disabled={formData.status === 'Canceled'}
//                                             style={{
//                                                 height: '26px',
//                                                 fontSize: '0.875rem',
//                                                 paddingTop: '0.25rem',
//                                                 width: '100%',
//                                                 backgroundColor: formData.status === 'Canceled' ? '#e9ecef' : ''
//                                             }}
//                                         >
//                                             <option value="">Select Receipt Account</option>
//                                             {cashAccounts.length > 0 && (
//                                                 <optgroup label="Cash">
//                                                     {cashAccounts.map(cashAccount => (
//                                                         <option
//                                                             key={cashAccount.id}
//                                                             value={cashAccount.id}
//                                                             data-group="cash"
//                                                         >
//                                                             {cashAccount.name}
//                                                         </option>
//                                                     ))}
//                                                 </optgroup>
//                                             )}
//                                             {bankAccounts.length > 0 && (
//                                                 <optgroup label="Bank">
//                                                     {bankAccounts.map(bankAccount => (
//                                                         <option
//                                                             key={bankAccount.id}
//                                                             value={bankAccount.id}
//                                                             data-group="bank"
//                                                         >
//                                                             {bankAccount.name}
//                                                         </option>
//                                                     ))}
//                                                 </optgroup>
//                                             )}
//                                         </select>
//                                         <label
//                                             className="position-absolute"
//                                             style={{
//                                                 top: '-0.5rem',
//                                                 left: '0.75rem',
//                                                 fontSize: '0.75rem',
//                                                 backgroundColor: 'white',
//                                                 padding: '0 0.25rem',
//                                                 color: '#6c757d',
//                                                 fontWeight: '500'
//                                             }}
//                                         >
//                                             Receipt Account: <span className="text-danger">*</span>
//                                         </label>
//                                     </div>
//                                 </div>
//                             </div>

//                             {/* Party and Amount Row */}
//                             <div className="row g-2 mb-3 align-items-end">
//                                 {/* Party Name Field */}
//                                 <div className="col-12 col-md-5">
//                                     <div className="position-relative">
//                                         <input
//                                             type="text"
//                                             id="account"
//                                             name="account"
//                                             className="form-control form-control-sm"
//                                             autoComplete='off'
//                                             placeholder=""
//                                             value={formData.accountName || ''}
//                                             onFocus={() => {
//                                                 if (formData.status !== 'Canceled') {
//                                                     setShowAccountModal(true);
//                                                 }
//                                             }}
//                                             onKeyDown={(e) => {
//                                                 if (e.key === 'Enter') {
//                                                     handleKeyDown(e, 'account');
//                                                 }
//                                             }}
//                                             readOnly
//                                             required
//                                             disabled={formData.status === 'Canceled'}
//                                             style={{
//                                                 height: '26px',
//                                                 fontSize: '0.875rem',
//                                                 paddingTop: '0.75rem',
//                                                 width: '100%',
//                                                 backgroundColor: formData.status === 'Canceled' ? '#e9ecef' : ''
//                                             }}
//                                         />
//                                         <label
//                                             className="position-absolute"
//                                             style={{
//                                                 top: '-0.5rem',
//                                                 left: '0.75rem',
//                                                 fontSize: '0.75rem',
//                                                 backgroundColor: 'white',
//                                                 padding: '0 0.25rem',
//                                                 color: '#6c757d',
//                                                 fontWeight: '500'
//                                             }}
//                                         >
//                                             Party Name: <span className="text-danger">*</span>
//                                         </label>
//                                         <input type="hidden" id="accountId" name="accountId" value={formData.accountId} />
//                                     </div>
//                                 </div>

//                                 {/* Amount Input */}
//                                 <div className="col-12 col-md-2">
//                                     <div className="position-relative">
//                                         <input
//                                             type="number"
//                                             name="credit"
//                                             id="credit"
//                                             className="form-control form-control-sm"
//                                             placeholder="Credit Amount"
//                                             value={formData.credit}
//                                             onChange={handleInputChange}
//                                             onFocus={(e) => e.target.select()}
//                                             onKeyDown={(e) => {
//                                                 if (e.key === 'Enter') {
//                                                     e.preventDefault();
//                                                     if (showBankDetails) {
//                                                         document.getElementById('instType')?.focus();
//                                                     } else {
//                                                         document.getElementById('description')?.focus();
//                                                     }
//                                                 }
//                                             }}
//                                             required
//                                             min="0.01"
//                                             step="0.01"
//                                             disabled={formData.status === 'Canceled'}
//                                             style={{
//                                                 height: '26px',
//                                                 fontSize: '0.875rem',
//                                                 paddingTop: '0.75rem',
//                                                 width: '100%',
//                                                 backgroundColor: formData.status === 'Canceled' ? '#e9ecef' : ''
//                                             }}
//                                         />
//                                         <label
//                                             className="position-absolute"
//                                             style={{
//                                                 top: '-0.5rem',
//                                                 left: '0.75rem',
//                                                 fontSize: '0.75rem',
//                                                 backgroundColor: 'white',
//                                                 padding: '0 0.25rem',
//                                                 color: '#6c757d',
//                                                 fontWeight: '500'
//                                             }}
//                                         >
//                                             Amount: <span className="text-danger">*</span>
//                                         </label>
//                                     </div>
//                                 </div>

//                                 {/* Institution Type and Number */}
//                                 {showBankDetails && (
//                                     <div className="col-12 col-md-5">
//                                         <div className="row g-2">
//                                             <div className="col-4">
//                                                 <div className="position-relative">
//                                                     <select
//                                                         name="instType"
//                                                         id="instType"
//                                                         className="form-control form-control-sm"
//                                                         value={formData.instType}
//                                                         onChange={handleInputChange}
//                                                         onKeyDown={(e) => {
//                                                             if (e.key === 'Enter') {
//                                                                 e.preventDefault();
//                                                                 document.getElementById('instNo')?.focus();
//                                                             }
//                                                         }}
//                                                         disabled={formData.status === 'Canceled'}
//                                                         style={{
//                                                             height: '26px',
//                                                             fontSize: '0.875rem',
//                                                             paddingTop: '0.25rem',
//                                                             width: '100%',
//                                                             backgroundColor: formData.status === 'Canceled' ? '#e9ecef' : ''
//                                                         }}
//                                                     >
//                                                         <option value="0">N/A</option>
//                                                         <option value="1">RTGS</option>
//                                                         <option value="2">Fonepay</option>
//                                                         <option value="3">Cheque</option>
//                                                         <option value="4">Connect-Ips</option>
//                                                         <option value="5">Esewa</option>
//                                                         <option value="6">Khalti</option>
//                                                     </select>
//                                                     <label
//                                                         className="position-absolute"
//                                                         style={{
//                                                             top: '-0.5rem',
//                                                             left: '0.75rem',
//                                                             fontSize: '0.75rem',
//                                                             backgroundColor: 'white',
//                                                             padding: '0 0.25rem',
//                                                             color: '#6c757d',
//                                                             fontWeight: '500'
//                                                         }}
//                                                     >
//                                                         Inst. Type
//                                                     </label>
//                                                 </div>
//                                             </div>

//                                             <div className="col-4">
//                                                 <div className="position-relative">
//                                                     <select
//                                                         name="bankAcc"
//                                                         id="bankAcc"
//                                                         className="form-control form-control-sm"
//                                                         value={formData.bankAcc}
//                                                         onChange={handleInputChange}
//                                                         onKeyDown={(e) => {
//                                                             if (e.key === 'Enter') {
//                                                                 e.preventDefault();
//                                                                 document.getElementById('instNo')?.focus();
//                                                             }
//                                                         }}
//                                                         disabled={formData.status === 'Canceled'}
//                                                         style={{
//                                                             height: '26px',
//                                                             fontSize: '0.875rem',
//                                                             paddingTop: '0.25rem',
//                                                             width: '100%',
//                                                             backgroundColor: formData.status === 'Canceled' ? '#e9ecef' : ''
//                                                         }}
//                                                     >
//                                                         <option value="N/A">N/A</option>
//                                                         <option value="Agriculture Development Bank">Agriculture Development Bank</option>
//                                                         <option value="Nepal Bank">Nepal Bank</option>
//                                                         <option value="Rastriya Banijya Bank">Rastriya Banijya Bank</option>
//                                                         <option value="Citizens Bank International">Citizens Bank International</option>
//                                                         <option value="Nabil Bank">Nabil Bank</option>
//                                                         <option value="Himalayan Bank">Himalayan Bank</option>
//                                                         <option value="Laxmi Sunrise Bank">Laxmi Sunrise Bank</option>
//                                                         <option value="Nepal Investment Mega Bank">Nepal Investment Mega Bank</option>
//                                                         <option value="Kumari Bank">Kumari Bank</option>
//                                                         <option value="Global IME Bank Limited">Global IME Bank Limited</option>
//                                                         <option value="NIC Asia Bank">NIC Asia Bank</option>
//                                                         <option value="Machhapuchchhre Bank">Machhapuchchhre Bank</option>
//                                                         <option value="Nepal SBI Bank">Nepal SBI Bank</option>
//                                                         <option value="Everest Bank">Everest Bank</option>
//                                                         <option value="NMB Bank Nepal">NMB Bank Nepal</option>
//                                                         <option value="Prabhu Bank">Prabhu Bank</option>
//                                                         <option value="Prime Commercial Bank">Prime Commercial Bank</option>
//                                                         <option value="Sanima Bank">Sanima Bank</option>
//                                                         <option value="Siddhartha Bank">Siddhartha Bank</option>
//                                                         <option value="Standard Chartered Bank">Standard Chartered Bank</option>
//                                                     </select>
//                                                     <label
//                                                         className="position-absolute"
//                                                         style={{
//                                                             top: '-0.5rem',
//                                                             left: '0.75rem',
//                                                             fontSize: '0.75rem',
//                                                             backgroundColor: 'white',
//                                                             padding: '0 0.25rem',
//                                                             color: '#6c757d',
//                                                             fontWeight: '500'
//                                                         }}
//                                                     >
//                                                         Bank
//                                                     </label>
//                                                 </div>
//                                             </div>

//                                             <div className="col-4">
//                                                 <div className="position-relative">
//                                                     <input
//                                                         type="text"
//                                                         name="instNo"
//                                                         id="instNo"
//                                                         className="form-control form-control-sm"
//                                                         value={formData.instNo}
//                                                         onChange={handleInputChange}
//                                                         onKeyDown={(e) => {
//                                                             if (e.key === 'Enter') {
//                                                                 e.preventDefault();
//                                                                 document.getElementById('description')?.focus();
//                                                             }
//                                                         }}
//                                                         autoComplete='off'
//                                                         disabled={formData.status === 'Canceled'}
//                                                         style={{
//                                                             height: '26px',
//                                                             fontSize: '0.875rem',
//                                                             paddingTop: '0.75rem',
//                                                             width: '100%',
//                                                             backgroundColor: formData.status === 'Canceled' ? '#e9ecef' : ''
//                                                         }}
//                                                     />
//                                                     <label
//                                                         className="position-absolute"
//                                                         style={{
//                                                             top: '-0.5rem',
//                                                             left: '0.75rem',
//                                                             fontSize: '0.75rem',
//                                                             backgroundColor: 'white',
//                                                             padding: '0 0.25rem',
//                                                             color: '#6c757d',
//                                                             fontWeight: '500'
//                                                         }}
//                                                     >
//                                                         Inst. No.
//                                                     </label>
//                                                 </div>
//                                             </div>
//                                         </div>
//                                     </div>
//                                 )}
//                             </div>

//                             {/* Account Balance Display */}
//                             {formData.accountId && (
//                                 <div className="row g-2 mb-3">
//                                     <div className="col-12">
//                                         <div className="position-relative">
//                                             <div
//                                                 className="form-control form-control-sm"
//                                                 style={{
//                                                     height: '26px',
//                                                     fontSize: '0.875rem',
//                                                     paddingTop: '0.4rem',
//                                                     width: '100%',
//                                                     border: '1px solid #ced4da',
//                                                     borderRadius: '0.375rem',
//                                                     overflow: 'hidden',
//                                                     whiteSpace: 'nowrap',
//                                                     backgroundColor: '#f8f9fa'
//                                                 }}
//                                             >
//                                                 <AccountBalanceDisplay
//                                                     accountId={formData.accountId}
//                                                     api={api}
//                                                     newTransactionAmount={parseFloat(formData.credit) || 0}
//                                                     compact={true}
//                                                     transactionType="receipt"
//                                                     dateFormat={companyDateFormat}
//                                                     style={{
//                                                         fontSize: '0.875rem',
//                                                         lineHeight: '1',
//                                                         margin: '0',
//                                                         padding: '0',
//                                                         display: 'inline-block',
//                                                         verticalAlign: 'middle'
//                                                     }}
//                                                 />
//                                             </div>
//                                             <label
//                                                 className="position-absolute"
//                                                 style={{
//                                                     top: '-0.5rem',
//                                                     left: '0.75rem',
//                                                     fontSize: '0.75rem',
//                                                     backgroundColor: 'white',
//                                                     padding: '0 0.25rem',
//                                                     color: '#6c757d',
//                                                     fontWeight: '500'
//                                                 }}
//                                             >
//                                                 Account Balance:
//                                             </label>
//                                         </div>
//                                     </div>
//                                 </div>
//                             )}

//                             {/* Description and Action Buttons */}
//                             <div className="row g-2 mb-3 align-items-center">
//                                 <div className="col-12 col-md-8">
//                                     <div className="position-relative">
//                                         <input
//                                             type="text"
//                                             className="form-control form-control-sm"
//                                             name="description"
//                                             id="description"
//                                             placeholder="Description"
//                                             value={formData.description}
//                                             onChange={handleInputChange}
//                                             onKeyDown={(e) => {
//                                                 if (e.key === 'Enter') {
//                                                     e.preventDefault();
//                                                     document.getElementById('saveBill')?.focus();
//                                                 }
//                                             }}
//                                             autoComplete='off'
//                                             disabled={formData.status === 'Canceled'}
//                                             style={{
//                                                 height: '26px',
//                                                 fontSize: '0.875rem',
//                                                 paddingTop: '0.75rem',
//                                                 width: '100%',
//                                                 backgroundColor: formData.status === 'Canceled' ? '#e9ecef' : ''
//                                             }}
//                                         />
//                                         <label
//                                             className="position-absolute"
//                                             style={{
//                                                 top: '-0.5rem',
//                                                 left: '0.75rem',
//                                                 fontSize: '0.75rem',
//                                                 backgroundColor: 'white',
//                                                 padding: '0 0.25rem',
//                                                 color: '#6c757d',
//                                                 fontWeight: '500'
//                                             }}
//                                         >
//                                             Description:
//                                         </label>
//                                     </div>
//                                 </div>

//                                 <div className="col-12 col-md-4">
//                                     <div className="d-flex align-items-center justify-content-end gap-3">
//                                         {/* Print After Save Checkbox */}
//                                         <div className="form-check mb-0 d-flex align-items-center">
//                                             <input
//                                                 className="form-check-input mt-0"
//                                                 type="checkbox"
//                                                 id="printAfterSave"
//                                                 checked={printAfterSave}
//                                                 onChange={handlePrintAfterSaveChange}
//                                                 disabled={formData.status === 'Canceled'}
//                                                 style={{
//                                                     height: '14px',
//                                                     width: '14px'
//                                                 }}
//                                             />
//                                             <label
//                                                 className="form-check-label ms-2"
//                                                 htmlFor="printAfterSave"
//                                                 style={{
//                                                     fontSize: '0.8rem',
//                                                     marginBottom: '0'
//                                                 }}
//                                             >
//                                                 Print after update
//                                             </label>
//                                         </div>

//                                         {/* Action Buttons */}
//                                         <div className="d-flex gap-2">
//                                             <button
//                                                 type="button"
//                                                 className="btn btn-secondary btn-sm d-flex align-items-center"
//                                                 onClick={handleBack}
//                                                 disabled={isSaving}
//                                                 style={{
//                                                     height: '26px',
//                                                     padding: '0 12px',
//                                                     fontSize: '0.8rem',
//                                                     fontWeight: '500'
//                                                 }}
//                                             >
//                                                 <i className="bi bi-arrow-left me-1" style={{ fontSize: '0.9rem' }}></i> Back
//                                             </button>

//                                             <button
//                                                 type="submit"
//                                                 className="btn btn-primary btn-sm d-flex align-items-center"
//                                                 id="saveBill"
//                                                 disabled={isSaving || formData.status === 'Canceled'}
//                                                 style={{
//                                                     height: '26px',
//                                                     padding: '0 16px',
//                                                     fontSize: '0.8rem',
//                                                     fontWeight: '500',
//                                                     backgroundColor: formData.status === 'Canceled' ? '#6c757d' : ''
//                                                 }}
//                                             >
//                                                 {isSaving ? (
//                                                     <>
//                                                         <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" style={{ width: '10px', height: '10px' }}></span>
//                                                         Updating...
//                                                     </>
//                                                 ) : (
//                                                     <>
//                                                         <i className="bi bi-save me-1" style={{ fontSize: '0.9rem' }}></i> Update
//                                                     </>
//                                                 )}
//                                             </button>
//                                         </div>
//                                     </div>
//                                 </div>
//                             </div>
//                         </form>
//                     </div>
//                 </div>
//             </div>

//             {/* Account Modal */}
//             {showAccountModal && (
//                 <>
//                     <div className="modal-backdrop fade show" style={{ zIndex: 1040 }}></div>
//                     <div
//                         className="modal fade show"
//                         tabIndex="-1"
//                         style={{
//                             display: 'block',
//                             position: 'fixed',
//                             top: 0,
//                             left: 0,
//                             right: 0,
//                             bottom: 0,
//                             zIndex: 1050
//                         }}
//                         onKeyDown={(e) => {
//                             if (e.key === 'Escape') {
//                                 e.preventDefault();
//                                 handleAccountModalClose();
//                             }
//                         }}
//                     >
//                         <div className="modal-dialog modal-xl modal-dialog-centered" style={{ maxWidth: '70%' }}>
//                             <div className="modal-content" style={{ height: '400px' }}>
//                                 <div className="modal-header py-1">
//                                     <h5 className="modal-title" id="accountModalLabel" style={{ fontSize: '0.9rem' }}>
//                                         Select an Account
//                                     </h5>
//                                     <small className="ms-auto text-muted" style={{ fontSize: '0.7rem' }}>
//                                         {totalAccounts > 0 ? `${accounts.length} of ${totalAccounts} accounts shown` : 'Loading accounts...'}
//                                     </small>
//                                     <button type="button" className="btn-close" onClick={handleAccountModalClose}></button>
//                                 </div>
//                                 <div className="p-2 bg-white sticky-top">
//                                     <input
//                                         type="text"
//                                         id="searchAccount"
//                                         className="form-control form-control-sm"
//                                         placeholder="Search Account... (Press F6 to create new account)"
//                                         autoFocus
//                                         autoComplete='off'
//                                         value={accountSearchQuery}
//                                         onChange={handleAccountSearch}
//                                         onKeyDown={(e) => {
//                                             if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
//                                                 e.preventDefault();
//                                                 const firstAccountItem = document.querySelector('.account-item');
//                                                 if (firstAccountItem) {
//                                                     firstAccountItem.focus();
//                                                 }
//                                             } else if (e.key === 'Enter') {
//                                                 e.preventDefault();
//                                                 const firstAccountItem = document.querySelector('.account-item.active');
//                                                 if (firstAccountItem) {
//                                                     const accountId = firstAccountItem.getAttribute('data-account-id');
//                                                     const account = accounts.find(a => a.id === accountId);
//                                                     if (account) {
//                                                         selectAccount(account);
//                                                     }
//                                                 }
//                                             } else if (e.key === 'F6') {
//                                                 e.preventDefault();
//                                                 setShowAccountCreationModal(true);
//                                                 setShowAccountModal(false);
//                                             }
//                                         }}
//                                         ref={accountSearchRef}
//                                         style={{
//                                             height: '24px',
//                                             fontSize: '0.75rem',
//                                             padding: '0.25rem 0.5rem'
//                                         }}
//                                     />
//                                 </div>
//                                 <div className="modal-body p-0">
//                                     <div style={{ height: 'calc(400px - 120px)' }}>
//                                         <VirtualizedAccountList
//                                             accounts={accounts}
//                                             onAccountClick={(account) => {
//                                                 selectAccount(account);
//                                             }}
//                                             searchRef={accountSearchRef}
//                                             hasMore={hasMoreAccountResults}
//                                             isSearching={isAccountSearching}
//                                             onLoadMore={loadMoreAccounts}
//                                             totalAccounts={totalAccounts}
//                                             page={accountSearchPage}
//                                             searchQuery={accountShouldShowLastSearchResults ? accountLastSearchQuery : accountSearchQuery}
//                                         />
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>
//                     </div>
//                 </>
//             )}

//             {/* Account Creation Modal */}
//             {showAccountCreationModal && (
//                 <div className="modal fade show" tabIndex="-1" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.7)' }}>
//                     <div className="modal-dialog modal-fullscreen">
//                         <div className="modal-content" style={{ height: '95vh', margin: '2.5vh auto' }}>
//                             <div className="modal-header bg-primary text-white">
//                                 <h5 className="modal-title">Create New Account</h5>
//                                 <div className="d-flex align-items-center">
//                                     <button
//                                         type="button"
//                                         className="btn-close btn-close-white"
//                                         onClick={handleAccountCreationModalClose}
//                                     ></button>
//                                 </div>
//                             </div>
//                             <div className="modal-body p-0">
//                                 <iframe
//                                     src="/retailer/accounts"
//                                     title="Account Creation"
//                                     style={{ width: '100%', height: '100%', border: 'none' }}
//                                 />
//                             </div>
//                             <div className="modal-footer bg-light">
//                                 <button
//                                     type="button"
//                                     className="btn btn-secondary"
//                                     onClick={handleAccountCreationModalClose}
//                                 >
//                                     <i className="bi bi-arrow-left me-2"></i>Close
//                                 </button>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             )}

//             <NotificationToast
//                 show={notification.show}
//                 message={notification.message}
//                 type={notification.type}
//                 onClose={() => setNotification({ ...notification, show: false })}
//             />

//             {/* Product modal */}
//             {showProductModal && (
//                 <ProductModal onClose={() => setShowProductModal(false)} />
//             )}
//         </div>
//     );
// };

// export default EditReceipt;

//---------------------------------------------------------------------------------end

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import NepaliDate from 'nepali-date-converter';
import NotificationToast from '../../NotificationToast';
import Header from '../Header';
import AccountBalanceDisplay from '../payment/AccountBalanceDisplay';
import ProductModal from '../dashboard/modals/ProductModal';
import VirtualizedAccountList from '../../VirtualizedAccountList';

const EditReceipt = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [isSaving, setIsSaving] = useState(false);
    const [isInitialDataLoaded, setIsInitialDataLoaded] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
    const [showProductModal, setShowProductModal] = useState(false);
    const transactionDateRef = useRef(null);

    const [company, setCompany] = useState({
        dateFormat: 'nepali',
        vatEnabled: true,
        fiscalYear: {}
    });

    const [dateErrors, setDateErrors] = useState({
        nepaliDate: ''
    });

    // Form data - using entries structure
    const [formData, setFormData] = useState({
        nepaliDate: currentNepaliDate,
        billDate: new Date().toISOString().split('T')[0],
        billNumber: '',
        description: '',
        status: 'Active',
        totalAmount: 0,
        entries: [
            {
                id: null,
                entryType: 'Debit',
                accountId: '',
                accountName: '',
                amount: '',
                instType: 0,
                instNo: '',
                bankAcc: '',
                referenceNumber: ''
            },
            {
                id: null,
                entryType: 'Credit',
                accountId: '',
                accountName: '',
                amount: '',
                instType: null,
                instNo: '',
                bankAcc: '',
                referenceNumber: ''
            }
        ]
    });

    const [notification, setNotification] = useState({
        show: false,
        message: '',
        type: 'success'
    });

    // Account search states
    const [isAccountSearching, setIsAccountSearching] = useState(false);
    const [accounts, setAccounts] = useState([]);
    const [accountSearchPage, setAccountSearchPage] = useState(1);
    const [hasMoreAccountResults, setHasMoreAccountResults] = useState(false);
    const [totalAccounts, setTotalAccounts] = useState(0);
    const [accountSearchQuery, setAccountSearchQuery] = useState('');
    const [accountLastSearchQuery, setAccountLastSearchQuery] = useState('');
    const [accountShouldShowLastSearchResults, setAccountShouldShowLastSearchResults] = useState(false);
    const [currentEntryIndexForModal, setCurrentEntryIndexForModal] = useState(0);

    const accountSearchRef = useRef(null);
    const [cashAccounts, setCashAccounts] = useState([]);
    const [bankAccounts, setBankAccounts] = useState([]);
    const [companyDateFormat, setCompanyDateFormat] = useState('nepali');
    const [showBankDetails, setShowBankDetails] = useState(false);
    const [showAccountModal, setShowAccountModal] = useState(false);
    const [showAccountCreationModal, setShowAccountCreationModal] = useState(false);

    // Print after save state
    const [printAfterSave, setPrintAfterSave] = useState(
        localStorage.getItem('printAfterSaveReceiptEdit') === 'true' || false
    );

    const api = axios.create({
        baseURL: process.env.REACT_APP_API_BASE_URL,
        withCredentials: true,
    });

    // Add authorization header to all requests
    api.interceptors.request.use(
        (config) => {
            const token = localStorage.getItem('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        },
        (error) => {
            return Promise.reject(error);
        }
    );

    // Fetch accounts from backend
    const fetchAccountsFromBackend = async (searchTerm = '', page = 1) => {
        try {
            setIsAccountSearching(true);

            const response = await api.get('/api/retailer/all/accounts/search', {
                params: {
                    search: searchTerm,
                    page: page,
                    limit: searchTerm.trim() ? 15 : 25,
                }
            });

            if (response.data.success) {
                if (page === 1) {
                    setAccounts(response.data.accounts);
                } else {
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
            setNotification({
                show: true,
                message: 'Error loading accounts',
                type: 'error'
            });
        } finally {
            setIsAccountSearching(false);
        }
    };

    // Fetch receipt data
    // useEffect(() => {
    //     const fetchReceiptData = async () => {
    //         try {
    //             setIsLoading(true);

    //             const response = await api.get(`/api/retailer/receipts/edit/${id}`);
    //             const { data } = response.data;

    //             console.log('Fetched receipt data:', data); // Debug log

    //             setCompany({
    //                 ...data.company,
    //                 dateFormat: data.company.dateFormat || 'nepali'
    //             });

    //             setCashAccounts(data.cashAccounts || []);
    //             setBankAccounts(data.bankAccounts || []);
    //             setCompanyDateFormat(data.companyDateFormat || 'nepali');

    //             const receipt = data.receipt;
    //             const entries = data.entries || [];

    //             // Find debit and credit entries from the entries array
    //             const debitEntry = entries.find(e => e.entryType === 'Debit');
    //             const creditEntry = entries.find(e => e.entryType === 'Credit');

    //             console.log('Debit Entry:', debitEntry); // Debug log
    //             console.log('Credit Entry:', creditEntry); // Debug log

    //             // Format date properly
    //             const formatDate = (dateValue) => {
    //                 if (!dateValue) return '';
    //                 if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    //                     return dateValue;
    //                 }
    //                 try {
    //                     const date = new Date(dateValue);
    //                     if (isNaN(date.getTime())) return '';
    //                     const year = date.getFullYear();
    //                     const month = String(date.getMonth() + 1).padStart(2, '0');
    //                     const day = String(date.getDate()).padStart(2, '0');
    //                     return `${year}-${month}-${day}`;
    //                 } catch (e) {
    //                     console.error('Date formatting error:', e);
    //                     return '';
    //                 }
    //             };

    //             // Convert instrument type string to enum value
    //             const getInstrumentTypeValue = (type) => {
    //                 if (typeof type === 'number') return type;
    //                 if (!type) return 0;
    //                 const typeStr = type.toString().toLowerCase();
    //                 switch (typeStr) {
    //                     case 'rtgs': return 1;
    //                     case 'fonepay': return 2;
    //                     case 'cheque': return 3;
    //                     case 'connectips': return 4;
    //                     case 'connect-ips': return 4;
    //                     case 'esewa': return 5;
    //                     case 'khalti': return 6;
    //                     default: return 0;
    //                 }
    //             };

    //             // Convert instrument type number to string for display
    //             const getInstrumentTypeString = (typeValue) => {
    //                 const num = parseInt(typeValue);
    //                 switch (num) {
    //                     case 1: return 'RTGS';
    //                     case 2: return 'Fonepay';
    //                     case 3: return 'Cheque';
    //                     case 4: return 'Connect-Ips';
    //                     case 5: return 'Esewa';
    //                     case 6: return 'Khalti';
    //                     default: return 'N/A';
    //                 }
    //             };

    //             setFormData({
    //                 nepaliDate: formatDate(receipt.nepaliDate) || currentNepaliDate,
    //                 billDate: formatDate(receipt.date) || new Date().toISOString().split('T')[0],
    //                 billNumber: receipt.billNumber || '',
    //                 description: receipt.description || '',
    //                 status: receipt.status || 'Active',
    //                 totalAmount: receipt.totalAmount || 0,
    //                 entries: [
    //                     {
    //                         id: debitEntry?.id || null,
    //                         entryType: 'Debit',
    //                         accountId: debitEntry?.accountId || '',
    //                         accountName: debitEntry?.accountName || '',
    //                         amount: debitEntry?.amount?.toString() || '',
    //                         instType: getInstrumentTypeValue(debitEntry?.instType),
    //                         instNo: debitEntry?.instNo || '',
    //                         bankAcc: debitEntry?.bankAcc || '',
    //                         referenceNumber: debitEntry?.referenceNumber || ''
    //                     },
    //                     {
    //                         id: creditEntry?.id || null,
    //                         entryType: 'Credit',
    //                         accountId: creditEntry?.accountId || '',
    //                         accountName: creditEntry?.accountName || '',
    //                         amount: creditEntry?.amount?.toString() || '',
    //                         instType: null,
    //                         instNo: '',
    //                         bankAcc: '',
    //                         referenceNumber: creditEntry?.referenceNumber || ''
    //                     }
    //                 ]
    //             });

    //             // Show bank details if receipt account is a bank account
    //             const isBankAccount = data.bankAccounts?.some(
    //                 acc => acc.id === debitEntry?.accountId
    //             );
    //             setShowBankDetails(isBankAccount || false);

    //             setIsInitialDataLoaded(true);
    //         } catch (error) {
    //             console.error('Error fetching receipt data:', error);
    //             setError(error.response?.data?.message || 'Failed to load receipt data');
    //         } finally {
    //             setIsLoading(false);
    //         }
    //     };

    //     if (id) {
    //         fetchReceiptData();
    //     }
    // }, [id]);

    // Fetch receipt data
    useEffect(() => {
        const fetchReceiptData = async () => {
            try {
                setIsLoading(true);

                const response = await api.get(`/api/retailer/receipts/edit/${id}`);
                const { data } = response.data;

                console.log('Full response data:', data); // Debug log
                console.log('Entries from response:', data.entries); // Debug log

                setCompany({
                    ...data.company,
                    dateFormat: data.company.dateFormat || 'nepali'
                });

                setCashAccounts(data.cashAccounts || []);
                setBankAccounts(data.bankAccounts || []);
                setCompanyDateFormat(data.companyDateFormat || 'nepali');

                const receipt = data.receipt;
                const entries = data.entries || [];

                console.log('Receipt object:', receipt);
                console.log('Entries array:', entries);

                // Find debit and credit entries from the entries array
                const debitEntry = entries.find(e => e.entryType === 'Debit');
                const creditEntry = entries.find(e => e.entryType === 'Credit');

                console.log('Debit Entry:', debitEntry);
                console.log('Credit Entry:', creditEntry);

                // Format date properly
                const formatDate = (dateValue) => {
                    if (!dateValue) return '';
                    if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
                        return dateValue;
                    }
                    try {
                        const date = new Date(dateValue);
                        if (isNaN(date.getTime())) return '';
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        return `${year}-${month}-${day}`;
                    } catch (e) {
                        console.error('Date formatting error:', e);
                        return '';
                    }
                };

                // Convert instrument type string to enum value
                const getInstrumentTypeValue = (type) => {
                    if (typeof type === 'number') return type;
                    if (!type) return 0;
                    const typeStr = type.toString().toLowerCase();
                    switch (typeStr) {
                        case 'rtgs': return 1;
                        case 'fonepay': return 2;
                        case 'cheque': return 3;
                        case 'connectips': return 4;
                        case 'connect-ips': return 4;
                        case 'esewa': return 5;
                        case 'khalti': return 6;
                        default: return 0;
                    }
                };

                setFormData({
                    nepaliDate: formatDate(receipt.nepaliDate) || currentNepaliDate,
                    billDate: formatDate(receipt.date) || new Date().toISOString().split('T')[0],
                    billNumber: receipt.billNumber || '',
                    description: receipt.description || '',
                    status: receipt.status || 'Active',
                    totalAmount: receipt.totalAmount || 0,
                    entries: [
                        {
                            id: debitEntry?.id || null,
                            entryType: 'Debit',
                            accountId: debitEntry?.accountId || '',
                            accountName: debitEntry?.accountName || '',
                            amount: debitEntry?.amount?.toString() || '',
                            instType: getInstrumentTypeValue(debitEntry?.instType),
                            instNo: debitEntry?.instNo || '',
                            bankAcc: debitEntry?.bankAcc || '',
                            referenceNumber: debitEntry?.referenceNumber || ''
                        },
                        {
                            id: creditEntry?.id || null,
                            entryType: 'Credit',
                            accountId: creditEntry?.accountId || '',
                            accountName: creditEntry?.accountName || '',
                            amount: creditEntry?.amount?.toString() || '',
                            instType: null,
                            instNo: '',
                            bankAcc: '',
                            referenceNumber: creditEntry?.referenceNumber || ''
                        }
                    ]
                });

                // Show bank details if receipt account is a bank account
                const isBankAccount = data.bankAccounts?.some(
                    acc => acc.id === debitEntry?.accountId
                );
                setShowBankDetails(isBankAccount || false);

                setIsInitialDataLoaded(true);
            } catch (error) {
                console.error('Error fetching receipt data:', error);
                setError(error.response?.data?.message || 'Failed to load receipt data');
            } finally {
                setIsLoading(false);
            }
        };

        if (id) {
            fetchReceiptData();
        }
    }, [id]);

    // Set focus on date input after initial load
    useEffect(() => {
        if (isInitialDataLoaded && transactionDateRef.current) {
            const timer = setTimeout(() => {
                transactionDateRef.current.focus();
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [isInitialDataLoaded, company.dateFormat]);

    useEffect(() => {
        const handleF9KeyDown = (e) => {
            if (e.key === 'F9') {
                e.preventDefault();
                setShowProductModal(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleF9KeyDown);
        return () => {
            window.removeEventListener('keydown', handleF9KeyDown);
        };
    }, []);

    useEffect(() => {
        const handleEscapeKey = (e) => {
            if (e.key === 'Escape' && showAccountModal) {
                e.preventDefault();
                handleAccountModalClose();
            } else if (e.key === 'Escape' && showAccountCreationModal) {
                e.preventDefault();
                handleAccountCreationModalClose();
            }
        };

        window.addEventListener('keydown', handleEscapeKey);
        return () => {
            window.removeEventListener('keydown', handleEscapeKey);
        };
    }, [showAccountModal, showAccountCreationModal]);

    useEffect(() => {
        const handleF6KeyForAccounts = (e) => {
            if (e.key === 'F6' && showAccountModal) {
                e.preventDefault();
                setShowAccountCreationModal(true);
                setShowAccountModal(false);
            }
        };

        window.addEventListener('keydown', handleF6KeyForAccounts);
        return () => {
            window.removeEventListener('keydown', handleF6KeyForAccounts);
        };
    }, [showAccountModal]);

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
    }, [showAccountModal]);

    // Print after save handler
    const handlePrintAfterSaveChange = (e) => {
        const isChecked = e.target.checked;
        setPrintAfterSave(isChecked);
        localStorage.setItem('printAfterSaveReceiptEdit', isChecked);
    };

    const handleInputChange = (e, entryIndex, field) => {
        const { value } = e.target;
        setFormData(prev => {
            const newEntries = [...prev.entries];
            newEntries[entryIndex] = { ...newEntries[entryIndex], [field]: value };
            return { ...prev, entries: newEntries };
        });
    };

    const handleDescriptionChange = (e) => {
        setFormData(prev => ({ ...prev, description: e.target.value }));
    };

    const handleReceiptAccountChange = (e) => {
        const selectedValue = e.target.value;
        const selectedOption = e.target.options[e.target.selectedIndex];
        const isBankAccount = selectedOption.getAttribute('data-group') === 'bank';
        const selectedName = selectedOption.textContent;

        setShowBankDetails(isBankAccount);
        setFormData(prev => {
            const newEntries = [...prev.entries];
            newEntries[0] = { ...newEntries[0], accountId: selectedValue, accountName: selectedName };
            return { ...prev, entries: newEntries };
        });
    };

    const handleAmountChange = (value) => {
        const amount = parseFloat(value) || 0;
        setFormData(prev => {
            const newEntries = [...prev.entries];
            newEntries[0] = { ...newEntries[0], amount: value };
            newEntries[1] = { ...newEntries[1], amount: value };
            return { ...prev, entries: newEntries };
        });
    };

    const handleSubmit = async (print = false) => {
        setIsSaving(true);

        try {
            const debitEntry = formData.entries[0];
            const creditEntry = formData.entries[1];

            const amount = parseFloat(debitEntry.amount) || 0;

            if (amount <= 0) {
                throw new Error('Amount must be greater than 0');
            }

            if (!debitEntry.accountId) {
                throw new Error('Receipt account is required');
            }

            if (!creditEntry.accountId) {
                throw new Error('Party account is required');
            }

            // Prepare payload with entries structure matching backend
            const payload = {
                nepaliDate: formData.nepaliDate,
                date: formData.billDate,
                description: formData.description || '',
                entries: [
                    {
                        id: debitEntry.id,
                        accountId: debitEntry.accountId,
                        entryType: 'Debit',
                        amount: amount,
                        instType: showBankDetails ? parseInt(debitEntry.instType) : 0,
                        instNo: debitEntry.instNo || '',
                        bankAcc: debitEntry.bankAcc || '',
                        referenceNumber: debitEntry.referenceNumber || ''
                    },
                    {
                        id: creditEntry.id,
                        accountId: creditEntry.accountId,
                        entryType: 'Credit',
                        amount: amount,
                        instType: null,
                        instNo: '',
                        bankAcc: '',
                        referenceNumber: creditEntry.referenceNumber || ''
                    }
                ],
                print: print || printAfterSave
            };

            const response = await api.put(`/api/retailer/receipts/edit/${id}`, payload);

            setNotification({
                show: true,
                message: 'Receipt updated successfully!',
                type: 'success'
            });

            // If print was requested, fetch print data and print
            if ((print || printAfterSave) && response.data.data?.receipt?.id) {
                try {
                    const printResponse = await api.get(`/api/retailer/receipts/${response.data.data.receipt.id}/print`);
                    printVoucherImmediately(printResponse.data.data);
                    setTimeout(() => handleBack(), 500);
                } catch (printError) {
                    console.error('Error fetching print data:', printError);
                    setNotification({
                        show: true,
                        message: 'Receipt updated but failed to load print data',
                        type: 'warning'
                    });
                    setTimeout(() => handleBack(), 1000);
                }
            } else {
                setTimeout(() => handleBack(), 500);
            }
        } catch (err) {
            console.error('Error updating receipt:', err);
            setNotification({
                show: true,
                message: err.response?.data?.error || err.message || 'Failed to update receipt. Please try again.',
                type: 'error'
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancelVoucher = async () => {
        if (window.confirm("Are you sure you want to cancel this voucher?")) {
            try {
                await api.post(`/api/retailer/receipts/cancel/${formData.billNumber}`);
                setNotification({
                    show: true,
                    message: 'Voucher canceled successfully!',
                    type: 'success'
                });
                setFormData(prev => ({ ...prev, status: 'Canceled' }));
            } catch (err) {
                setNotification({
                    show: true,
                    message: err.response?.data?.message || 'Failed to cancel voucher',
                    type: 'error'
                });
            }
        }
    };

    const handleReactivateVoucher = async () => {
        if (window.confirm("Are you sure you want to reactivate this voucher?")) {
            try {
                await api.post(`/api/retailer/receipts/reactivate/${formData.billNumber}`);
                setNotification({
                    show: true,
                    message: 'Voucher reactivated successfully!',
                    type: 'success'
                });
                setFormData(prev => ({ ...prev, status: 'Active' }));
            } catch (err) {
                setNotification({
                    show: true,
                    message: err.response?.data?.message || 'Failed to reactivate voucher',
                    type: 'error'
                });
            }
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

    const handleAccountModalClose = () => {
        setShowAccountModal(false);
    };

    const handleAccountCreationModalClose = () => {
        setShowAccountCreationModal(false);
        setShowAccountModal(true);
        fetchAccountsFromBackend('', 1);
    };

    const selectAccount = (account) => {
        setFormData(prev => {
            const newEntries = [...prev.entries];
            newEntries[currentEntryIndexForModal] = {
                ...newEntries[currentEntryIndexForModal],
                accountId: account.id,
                accountName: `${account.uniqueNumber || ''} ${account.name}`.trim()
            };
            return { ...prev, entries: newEntries };
        });
        setShowAccountModal(false);

        // Focus on amount field after account selection
        setTimeout(() => {
            document.getElementById('amount')?.focus();
        }, 50);
    };

    const openAccountModal = (entryIndex) => {
        if (formData.status !== 'Canceled') {
            setCurrentEntryIndexForModal(entryIndex);
            setShowAccountModal(true);
        }
    };

    const handleBack = () => {
        navigate(-1);
    };

    const handleKeyDown = (e, currentFieldId) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const form = e.target.form;
            const inputs = Array.from(form.querySelectorAll('input, select, textarea')).filter(
                el => !el.hidden && !el.disabled && el.offsetParent !== null
            );
            const currentIndex = inputs.findIndex(input => input.id === currentFieldId);

            if (currentIndex > -1 && currentIndex < inputs.length - 1) {
                inputs[currentIndex + 1].focus();
            }
        }
    };

    const loadMoreAccounts = () => {
        if (!isAccountSearching) {
            fetchAccountsFromBackend(accountSearchQuery, accountSearchPage + 1);
        }
    };

    const printVoucherImmediately = (printData) => {
        const tempDiv = document.createElement('div');
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px';
        document.body.appendChild(tempDiv);

        const debitEntries = printData.debitEntries || [];
        const creditEntries = printData.creditEntries || [];

        let rows = '';
        let totalDebit = 0;
        let totalCredit = 0;
        let rowNumber = 1;

        debitEntries.forEach(entry => {
            rows += `
                <tr>
                    <td class="print-text-center">${rowNumber++}</td>
                    <td>
                        ${entry.accountName}
                        ${entry.instType !== 'NA' ? `<small class="d-block text-muted">${entry.instType} ${entry.instNo ? `- ${entry.instNo}` : ''}${entry.bankAcc ? ` (${entry.bankAcc})` : ''}</small>` : ''}
                        ${entry.referenceNumber ? `<small class="d-block text-muted">Ref: ${entry.referenceNumber}</small>` : ''}
                    </td>
                    <td class="print-text-right">${entry.amount.toFixed(2)}</td>
                    <td class="print-text-right">0.00</td>
                </tr>
            `;
            totalDebit += entry.amount;
        });

        creditEntries.forEach(entry => {
            rows += `
                <tr>
                    <td class="print-text-center">${rowNumber++}</td>
                    <td>
                        ${entry.accountName}
                        ${entry.referenceNumber ? `<small class="d-block text-muted">Ref: ${entry.referenceNumber}</small>` : ''}
                    </td>
                    <td class="print-text-right">0.00</td>
                    <td class="print-text-right">${entry.amount.toFixed(2)}</td>
                </tr>
            `;
            totalCredit += entry.amount;
        });

        tempDiv.innerHTML = `
            <div id="printableContent">
                <div class="print-voucher-container">
                    <div class="print-voucher-header">
                        <div class="print-company-name">${printData.currentCompanyName}</div>
                        <div class="print-company-details">
                            ${printData.currentCompany?.address || ''}, ${printData.currentCompany?.city || ''}
                            <br />
                            Tel: ${printData.currentCompany?.phone || ''} | PAN: ${printData.currentCompany?.pan || 'N/A'}
                        </div>
                        <div class="print-voucher-title">RECEIPT VOUCHER</div>
                    </div>

                    <div class="print-voucher-details">
                        <div><strong>Vch. No:</strong> ${printData.receipt?.billNumber || ''}</div>
                        <div><strong>Date:</strong> ${new Date(printData.receipt?.date).toLocaleDateString()}</div>
                    </div>

                    <table class="print-voucher-table">
                        <thead>
                            <tr>
                                <th>S.N</th>
                                <th>Particular</th>
                                <th>Debit Amount</th>
                                <th>Credit Amount</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                        <tfoot>
                            <tr>
                                <th colSpan="2">Total</th>
                                <th>${totalDebit.toFixed(2)}</th>
                                <th>${totalCredit.toFixed(2)}</th>
                            </tr>
                        </tfoot>
                    </table>

                    <div style="margin-top: 3mm;"><strong>Note:</strong> ${printData.receipt?.description || 'N/A'}</div>

                    <div class="print-signature-area">
                        <div class="print-signature-box">
                            <div><strong>${printData.receipt?.user?.name || 'N/A'}</strong></div>
                            Prepared By
                        </div>
                        <div class="print-signature-box">
                            <div>&nbsp;</div>
                            Checked By
                        </div>
                        <div class="print-signature-box">
                            <div>&nbsp;</div>
                            Approved By
                        </div>
                    </div>
                </div>
            </div>
        `;

        const styles = `
            @page { size: A4; margin: 5mm; }
            body { font-family: 'Arial Narrow', Arial, sans-serif; font-size: 9pt; line-height: 1.2; color: #000; background: white; margin: 0; padding: 0; }
            .print-voucher-container { width: 100%; max-width: 210mm; margin: 0 auto; padding: 2mm; }
            .print-voucher-header { text-align: center; margin-bottom: 3mm; border-bottom: 1px dashed #000; padding-bottom: 2mm; }
            .print-voucher-title { font-size: 12pt; font-weight: bold; margin: 2mm 0; text-transform: uppercase; text-decoration: underline; letter-spacing: 1px; }
            .print-company-name { font-size: 16pt; font-weight: bold; }
            .print-company-details { font-size: 8pt; margin: 1mm 0; }
            .print-voucher-details { display: flex; justify-content: space-between; margin: 2mm 0; font-size: 8pt; }
            .print-voucher-table { width: 100%; border-collapse: collapse; margin: 3mm 0; font-size: 8pt; }
            .print-voucher-table thead { border-top: 1px dashed #000; border-bottom: 1px dashed #000; }
            .print-voucher-table th, .print-voucher-table td { border: 1px solid #000; padding: 1mm; }
            .print-text-right { text-align: right; }
            .print-text-center { text-align: center; }
            .print-signature-area { display: flex; justify-content: space-between; margin-top: 5mm; font-size: 8pt; }
            .print-signature-box { text-align: center; width: 30%; border-top: 1px dashed #000; padding-top: 1mm; font-weight: bold; }
        `;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head><title>Receipt_Voucher_${printData.receipt?.billNumber}</title><style>${styles}</style></head>
                <body>${tempDiv.innerHTML}<script>window.onload = function() { setTimeout(function() { window.print(); window.close(); }, 200); };</script></body>
            </html>
        `);
        printWindow.document.close();
        document.body.removeChild(tempDiv);
    };

    if (isLoading) {
        return (
            <div className="container-fluid">
                <Header />
                <div className="text-center py-5">
                    <div className="spinner-border" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </div>
            </div>
        );
    }

    if (error) return <div className="alert alert-danger mt-5">{error}</div>;

    const debitEntry = formData.entries[0];
    const creditEntry = formData.entries[1];
    const amount = parseFloat(debitEntry.amount) || 0;

    return (
        <div className="container-fluid">
            <Header />
            <div className="container mt-4 wow-form">
                <div className="card mt-2 shadow-lg p-2 animate__animated animate__fadeInUp expanded-card ledger-card compact">
                    <div className="card-header">
                        <div className="d-flex justify-content-between align-items-center">
                            <h2 className="card-title mb-0">
                                <i className="bi bi-file-text me-2"></i>
                                Edit Receipt
                            </h2>
                            <div className="d-flex align-items-center gap-2">
                                {formData.status === 'Canceled' && (
                                    <span className="badge bg-danger" style={{ fontSize: '0.7rem' }}>Voucher Canceled</span>
                                )}
                                {formData.status === 'Active' ? (
                                    <button type="button" className="btn btn-danger btn-sm d-flex align-items-center" onClick={handleCancelVoucher} style={{ height: '26px', padding: '0 12px', fontSize: '0.8rem' }}>
                                        <i className="bi bi-x-circle me-1"></i> Cancel Voucher
                                    </button>
                                ) : (
                                    <button type="button" className="btn btn-success btn-sm d-flex align-items-center" onClick={handleReactivateVoucher} style={{ height: '26px', padding: '0 12px', fontSize: '0.8rem' }}>
                                        <i className="bi bi-check-circle me-1"></i> Reactivate Voucher
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="card-body p-2 p-md-3">
                        <form className="wow-form" id='editReceiptForm' onSubmit={(e) => { e.preventDefault(); handleSubmit(false); }}>
                            {/* Date and Basic Info Row */}
                            <div className="row g-2 mb-3">
                                {(company.dateFormat === 'nepali' || company.dateFormat === 'Nepali') ? (
                                    <div className="col-12 col-md-6 col-lg-2">
                                        <div className="position-relative">
                                            <input
                                                type="text"
                                                name="nepaliDate"
                                                id="nepaliDate"
                                                ref={transactionDateRef}
                                                className={`form-control form-control-sm no-date-icon ${dateErrors.nepaliDate ? 'is-invalid' : ''}`}
                                                value={formData.nepaliDate}
                                                onChange={(e) => {
                                                    const sanitizedValue = e.target.value.replace(/[^0-9/-]/g, '');
                                                    if (sanitizedValue.length <= 10) {
                                                        setFormData({ ...formData, nepaliDate: sanitizedValue });
                                                        setDateErrors(prev => ({ ...prev, nepaliDate: '' }));
                                                    }
                                                }}
                                                onKeyDown={(e) => handleKeyDown(e, 'nepaliDate')}
                                                placeholder="YYYY-MM-DD"
                                                required
                                                disabled={formData.status === 'Canceled'}
                                                style={{ height: '26px', fontSize: '0.875rem', paddingTop: '0.75rem', width: '100%', backgroundColor: formData.status === 'Canceled' ? '#e9ecef' : '' }}
                                            />
                                            <label className="position-absolute" style={{ top: '-0.5rem', left: '0.75rem', fontSize: '0.75rem', backgroundColor: 'white', padding: '0 0.25rem', color: '#6c757d', fontWeight: '500' }}>
                                                Date: <span className="text-danger">*</span>
                                            </label>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="col-12 col-md-6 col-lg-2">
                                        <div className="position-relative">
                                            <input
                                                type="date"
                                                name="billDate"
                                                id="billDate"
                                                className="form-control form-control-sm"
                                                ref={transactionDateRef}
                                                value={formData.billDate}
                                                onChange={(e) => {
                                                    const selectedDate = new Date(e.target.value);
                                                    const today = new Date();
                                                    today.setHours(0, 0, 0, 0);
                                                    if (selectedDate > today) {
                                                        setFormData({ ...formData, billDate: today.toISOString().split('T')[0] });
                                                        setNotification({ show: true, message: 'Future date not allowed. Auto-corrected to today.', type: 'warning', duration: 3000 });
                                                    } else {
                                                        setFormData({ ...formData, billDate: e.target.value });
                                                    }
                                                }}
                                                onKeyDown={(e) => handleKeyDown(e, 'billDate')}
                                                max={new Date().toISOString().split('T')[0]}
                                                required
                                                disabled={formData.status === 'Canceled'}
                                                style={{ height: '26px', fontSize: '0.875rem', paddingTop: '0.75rem', width: '100%', backgroundColor: formData.status === 'Canceled' ? '#e9ecef' : '' }}
                                            />
                                            <label className="position-absolute" style={{ top: '-0.5rem', left: '0.75rem', fontSize: '0.75rem', backgroundColor: 'white', padding: '0 0.25rem', color: '#6c757d', fontWeight: '500' }}>
                                                Date: <span className="text-danger">*</span>
                                            </label>
                                        </div>
                                    </div>
                                )}

                                <div className="col-12 col-md-6 col-lg-2">
                                    <div className="position-relative">
                                        <input type="text" name="billNumber" id="billNumber" className="form-control form-control-sm" value={formData.billNumber} readOnly style={{ height: '26px', fontSize: '0.875rem', paddingTop: '0.75rem', width: '100%' }} />
                                        <label className="position-absolute" style={{ top: '-0.5rem', left: '0.75rem', fontSize: '0.75rem', backgroundColor: 'white', padding: '0 0.25rem', color: '#6c757d', fontWeight: '500' }}>Vch. No:</label>
                                    </div>
                                </div>

                                <div className="col-12 col-md-6 col-lg-2">
                                    <div className="position-relative">
                                        <input type="text" name="accountType" id="accountType" className="form-control form-control-sm" value="Receipt" readOnly style={{ height: '26px', fontSize: '0.875rem', paddingTop: '0.75rem', width: '100%' }} />
                                        <label className="position-absolute" style={{ top: '-0.5rem', left: '0.75rem', fontSize: '0.75rem', backgroundColor: 'white', padding: '0 0.25rem', color: '#6c757d', fontWeight: '500' }}>A/c Type:</label>
                                    </div>
                                </div>

                                <div className="col-12 col-md-6 col-lg-2">
                                    <div className="position-relative">
                                        <select
                                            name="receiptAccountId"
                                            id="receiptAccountId"
                                            className="form-control form-control-sm"
                                            required
                                            value={debitEntry.accountId}
                                            onChange={handleReceiptAccountChange}
                                            onKeyDown={(e) => handleKeyDown(e, 'receiptAccountId')}
                                            disabled={formData.status === 'Canceled'}
                                            style={{ height: '26px', fontSize: '0.875rem', paddingTop: '0.25rem', width: '100%', backgroundColor: formData.status === 'Canceled' ? '#e9ecef' : '' }}
                                        >
                                            <optgroup label="Cash">
                                                {cashAccounts.map(cashAccount => (
                                                    <option key={cashAccount.id} value={cashAccount.id} data-group="cash">{cashAccount.name}</option>
                                                ))}
                                            </optgroup>
                                            <optgroup label="Bank">
                                                {bankAccounts.map(bankAccount => (
                                                    <option key={bankAccount.id} value={bankAccount.id} data-group="bank">{bankAccount.name}</option>
                                                ))}
                                            </optgroup>
                                        </select>
                                        <label className="position-absolute" style={{ top: '-0.5rem', left: '0.75rem', fontSize: '0.75rem', backgroundColor: 'white', padding: '0 0.25rem', color: '#6c757d', fontWeight: '500' }}>
                                            Receipt Account: <span className="text-danger">*</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Party and Amount Row */}
                            <div className="row g-2 mb-3 align-items-end">
                                <div className="col-12 col-md-5">
                                    <div className="position-relative">
                                        <input
                                            type="text"
                                            id="account"
                                            className="form-control form-control-sm"
                                            value={creditEntry.accountName || ''}
                                            onFocus={() => openAccountModal(1)}
                                            readOnly
                                            required
                                            disabled={formData.status === 'Canceled'}
                                            style={{ height: '26px', fontSize: '0.875rem', paddingTop: '0.75rem', width: '100%', backgroundColor: formData.status === 'Canceled' ? '#e9ecef' : '' }}
                                        />
                                        <label className="position-absolute" style={{ top: '-0.5rem', left: '0.75rem', fontSize: '0.75rem', backgroundColor: 'white', padding: '0 0.25rem', color: '#6c757d', fontWeight: '500' }}>
                                            Party Name: <span className="text-danger">*</span>
                                        </label>
                                        <input type="hidden" id="accountId" name="accountId" value={creditEntry.accountId} />
                                    </div>
                                </div>

                                <div className="col-12 col-md-2">
                                    <div className="position-relative">
                                        <input
                                            type="number"
                                            name="amount"
                                            id="amount"
                                            className="form-control form-control-sm"
                                            placeholder="Amount"
                                            value={debitEntry.amount}
                                            onChange={(e) => handleAmountChange(e.target.value)}
                                            onFocus={(e) => e.target.select()}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    if (showBankDetails) {
                                                        document.getElementById('instType')?.focus();
                                                    } else {
                                                        document.getElementById('description')?.focus();
                                                    }
                                                }
                                            }}
                                            required
                                            min="0.01"
                                            step="0.01"
                                            disabled={formData.status === 'Canceled'}
                                            style={{ height: '26px', fontSize: '0.875rem', paddingTop: '0.75rem', width: '100%', backgroundColor: formData.status === 'Canceled' ? '#e9ecef' : '' }}
                                        />
                                        <label className="position-absolute" style={{ top: '-0.5rem', left: '0.75rem', fontSize: '0.75rem', backgroundColor: 'white', padding: '0 0.25rem', color: '#6c757d', fontWeight: '500' }}>
                                            Amount: <span className="text-danger">*</span>
                                        </label>
                                    </div>
                                </div>

                                {showBankDetails && (
                                    <div className="col-12 col-md-5">
                                        <div className="row g-2">
                                            <div className="col-6">
                                                <div className="position-relative">
                                                    <select
                                                        name="instType"
                                                        id="instType"
                                                        className="form-control form-control-sm"
                                                        value={debitEntry.instType}
                                                        onChange={(e) => handleInputChange(e, 0, 'instType')}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                document.getElementById('instNo')?.focus();
                                                            }
                                                        }}
                                                        disabled={formData.status === 'Canceled'}
                                                        style={{ height: '26px', fontSize: '0.875rem', paddingTop: '0.25rem', width: '100%', backgroundColor: formData.status === 'Canceled' ? '#e9ecef' : '' }}
                                                    >
                                                        <option value="0">N/A</option>
                                                        <option value="1">RTGS</option>
                                                        <option value="2">Fonepay</option>
                                                        <option value="3">Cheque</option>
                                                        <option value="4">Connect-Ips</option>
                                                        <option value="5">Esewa</option>
                                                        <option value="6">Khalti</option>
                                                    </select>
                                                    <label className="position-absolute" style={{ top: '-0.5rem', left: '0.75rem', fontSize: '0.75rem', backgroundColor: 'white', padding: '0 0.25rem', color: '#6c757d', fontWeight: '500' }}>Inst. Type</label>
                                                </div>
                                            </div>
                                            <div className="col-6">
                                                <div className="position-relative">
                                                    <input
                                                        type="text"
                                                        name="instNo"
                                                        id="instNo"
                                                        className="form-control form-control-sm"
                                                        value={debitEntry.instNo}
                                                        onChange={(e) => handleInputChange(e, 0, 'instNo')}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                document.getElementById('description')?.focus();
                                                            }
                                                        }}
                                                        autoComplete='off'
                                                        disabled={formData.status === 'Canceled'}
                                                        style={{ height: '26px', fontSize: '0.875rem', paddingTop: '0.75rem', width: '100%', backgroundColor: formData.status === 'Canceled' ? '#e9ecef' : '' }}
                                                    />
                                                    <label className="position-absolute" style={{ top: '-0.5rem', left: '0.75rem', fontSize: '0.75rem', backgroundColor: 'white', padding: '0 0.25rem', color: '#6c757d', fontWeight: '500' }}>Inst. No.</label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Account Balance Display */}
                            {creditEntry.accountId && (
                                <div className="row g-2 mb-3">
                                    <div className="col-12">
                                        <div className="position-relative">
                                            <div className="form-control form-control-sm" style={{ height: '26px', fontSize: '0.875rem', paddingTop: '0.4rem', width: '100%', border: '1px solid #ced4da', borderRadius: '0.375rem', overflow: 'hidden', whiteSpace: 'nowrap', backgroundColor: '#f8f9fa' }}>
                                                <AccountBalanceDisplay
                                                    accountId={creditEntry.accountId}
                                                    api={api}
                                                    newTransactionAmount={amount}
                                                    compact={true}
                                                    transactionType="receipt"
                                                    dateFormat={companyDateFormat}
                                                    style={{ fontSize: '0.875rem', lineHeight: '1', margin: '0', padding: '0', display: 'inline-block', verticalAlign: 'middle' }}
                                                />
                                            </div>
                                            <label className="position-absolute" style={{ top: '-0.5rem', left: '0.75rem', fontSize: '0.75rem', backgroundColor: 'white', padding: '0 0.25rem', color: '#6c757d', fontWeight: '500' }}>Account Balance:</label>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Description and Action Buttons */}
                            <div className="row g-2 mb-3 align-items-center">
                                <div className="col-12 col-md-8">
                                    <div className="position-relative">
                                        <input
                                            type="text"
                                            className="form-control form-control-sm"
                                            name="description"
                                            id="description"
                                            placeholder="Description"
                                            value={formData.description}
                                            onChange={handleDescriptionChange}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    document.getElementById('saveBill')?.focus();
                                                }
                                            }}
                                            disabled={formData.status === 'Canceled'}
                                            style={{ height: '26px', fontSize: '0.875rem', paddingTop: '0.75rem', width: '100%', backgroundColor: formData.status === 'Canceled' ? '#e9ecef' : '' }}
                                        />
                                        <label className="position-absolute" style={{ top: '-0.5rem', left: '0.75rem', fontSize: '0.75rem', backgroundColor: 'white', padding: '0 0.25rem', color: '#6c757d', fontWeight: '500' }}>Description:</label>
                                    </div>
                                </div>

                                <div className="col-12 col-md-4">
                                    <div className="d-flex align-items-center justify-content-end gap-3">
                                        <div className="form-check mb-0 d-flex align-items-center">
                                            <input
                                                className="form-check-input mt-0"
                                                type="checkbox"
                                                id="printAfterSave"
                                                checked={printAfterSave}
                                                onChange={handlePrintAfterSaveChange}
                                                disabled={formData.status === 'Canceled'}
                                                style={{ height: '14px', width: '14px' }}
                                            />
                                            <label className="form-check-label ms-2" htmlFor="printAfterSave" style={{ fontSize: '0.8rem', marginBottom: '0' }}>Print after update</label>
                                        </div>

                                        <div className="d-flex gap-2">
                                            <button type="button" className="btn btn-secondary btn-sm d-flex align-items-center" onClick={handleBack} disabled={isSaving} style={{ height: '26px', padding: '0 12px', fontSize: '0.8rem' }}>
                                                <i className="bi bi-arrow-left me-1"></i> Back
                                            </button>
                                            <button type="submit" className="btn btn-primary btn-sm d-flex align-items-center" id="saveBill" disabled={isSaving || formData.status === 'Canceled'} style={{ height: '26px', padding: '0 16px', fontSize: '0.8rem' }}>
                                                {isSaving ? (
                                                    <><span className="spinner-border spinner-border-sm me-2" role="status"></span> Updating...</>
                                                ) : (
                                                    <><i className="bi bi-save me-1"></i> Update</>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* Account Modal */}
            {showAccountModal && (
                <>
                    <div className="modal-backdrop fade show" style={{ zIndex: 1040 }}></div>
                    <div className="modal fade show" tabIndex="-1" style={{ display: 'block', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1050 }}>
                        <div className="modal-dialog modal-xl modal-dialog-centered" style={{ maxWidth: '70%' }}>
                            <div className="modal-content" style={{ height: '400px' }}>
                                <div className="modal-header py-1">
                                    <h5 className="modal-title" style={{ fontSize: '0.9rem' }}>Select an Account</h5>
                                    <small className="ms-auto text-muted" style={{ fontSize: '0.7rem' }}>
                                        {totalAccounts > 0 ? `${accounts.length} of ${totalAccounts} accounts shown` : 'Loading accounts...'}
                                    </small>
                                    <button type="button" className="btn-close" onClick={handleAccountModalClose}></button>
                                </div>
                                <div className="p-2 bg-white sticky-top">
                                    <input
                                        type="text"
                                        id="searchAccount"
                                        className="form-control form-control-sm"
                                        placeholder="Search Account... (Press F6 to create new account)"
                                        autoFocus
                                        autoComplete='off'
                                        value={accountSearchQuery}
                                        onChange={handleAccountSearch}
                                        onKeyDown={(e) => {
                                            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                                                e.preventDefault();
                                                const firstAccountItem = document.querySelector('.account-item');
                                                if (firstAccountItem) firstAccountItem.focus();
                                            } else if (e.key === 'Enter') {
                                                e.preventDefault();
                                                const firstAccountItem = document.querySelector('.account-item.active');
                                                if (firstAccountItem) {
                                                    const accountId = firstAccountItem.getAttribute('data-account-id');
                                                    const account = accounts.find(a => a.id === accountId);
                                                    if (account) selectAccount(account);
                                                }
                                            } else if (e.key === 'F6') {
                                                e.preventDefault();
                                                setShowAccountCreationModal(true);
                                                setShowAccountModal(false);
                                            }
                                        }}
                                        ref={accountSearchRef}
                                        style={{ height: '24px', fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                    />
                                </div>
                                <div className="modal-body p-0">
                                    <div style={{ height: 'calc(400px - 120px)' }}>
                                        <VirtualizedAccountList
                                            accounts={accounts}
                                            onAccountClick={selectAccount}
                                            searchRef={accountSearchRef}
                                            hasMore={hasMoreAccountResults}
                                            isSearching={isAccountSearching}
                                            onLoadMore={loadMoreAccounts}
                                            totalAccounts={totalAccounts}
                                            page={accountSearchPage}
                                            searchQuery={accountShouldShowLastSearchResults ? accountLastSearchQuery : accountSearchQuery}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Account Creation Modal */}
            {showAccountCreationModal && (
                <div className="modal fade show" tabIndex="-1" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.7)' }}>
                    <div className="modal-dialog modal-fullscreen">
                        <div className="modal-content" style={{ height: '95vh', margin: '2.5vh auto' }}>
                            <div className="modal-header bg-primary text-white">
                                <h5 className="modal-title">Create New Account</h5>
                                <button type="button" className="btn-close btn-close-white" onClick={handleAccountCreationModalClose}></button>
                            </div>
                            <div className="modal-body p-0">
                                <iframe src="/retailer/accounts" title="Account Creation" style={{ width: '100%', height: '100%', border: 'none' }} />
                            </div>
                            <div className="modal-footer bg-light">
                                <button type="button" className="btn btn-secondary" onClick={handleAccountCreationModalClose}>
                                    <i className="bi bi-arrow-left me-2"></i>Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <NotificationToast show={notification.show} message={notification.message} type={notification.type} onClose={() => setNotification({ ...notification, show: false })} />
            {showProductModal && <ProductModal onClose={() => setShowProductModal(false)} />}
        </div>
    );
};

export default EditReceipt;