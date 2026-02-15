// import React, { useState, useEffect, useRef } from 'react';
// import { useNavigate } from 'react-router-dom';
// import axios from 'axios';
// import NepaliDate from 'nepali-date-converter';
// import NotificationToast from '../../NotificationToast';
// import Header from '../Header';
// import AccountBalanceDisplay from '../payment/AccountBalanceDisplay';
// import ProductModal from '../dashboard/modals/ProductModal';

// const AddReceipt = () => {
//     const navigate = useNavigate();
//     const [isSaving, setIsSaving] = useState(false);
//     const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
//     const [printData, setPrintData] = useState(null);
//     const printableRef = useRef();
//     const [showProductModal, setShowProductModal] = useState(false);

//     const [printAfterSave, setPrintAfterSave] = useState(
//         localStorage.getItem('printAfterSaveReceipt') === 'true' || false
//     );
//     const [dateErrors, setDateErrors] = useState({
//         transactionDateNepali: '',
//         nepaliDate: ''
//     });

//     const [formData, setFormData] = useState({
//         billDate: new Date().toISOString().split('T')[0],
//         nepaliDate: currentNepaliDate,
//         receiptAccount: '',
//         accountId: '',
//         credit: '',
//         InstType: 'N/A',
//         bankAcc: 'N/A',
//         InstNo: '',
//         description: ''
//     });

//     const [notification, setNotification] = useState({
//         show: false,
//         message: '',
//         type: 'success'
//     });
//     const [selectedAccountId, setSelectedAccountId] = useState('');

//     const [selectedAccountIndex, setSelectedAccountIndex] = useState(0);

//     const [accounts, setAccounts] = useState([]);
//     const [cashAccounts, setCashAccounts] = useState([]);
//     const [bankAccounts, setBankAccounts] = useState([]);
//     const [nextBillNumber, setNextBillNumber] = useState('');
//     const [companyDateFormat, setCompanyDateFormat] = useState('nepali');
//     const [showBankDetails, setShowBankDetails] = useState(false);
//     const [error, setError] = useState(null);
//     const [showAccountModal, setShowAccountModal] = useState(false);
//     const [filteredAccounts, setFilteredAccounts] = useState([]);
//     const accountSearchRef = useRef(null);
//     const accountListRef = useRef(null);
//     const searchRef = useRef(null);

//     const api = axios.create({
//         baseURL: process.env.REACT_APP_API_BASE_URL,
//         withCredentials: true,
//     });

//     useEffect(() => {
//         const fetchReceiptFormData = async () => {
//             try {
//                 const response = await api.get('/api/retailer/receipts');
//                 const { data } = response;

//                 setAccounts(data.data.accounts);
//                 setCashAccounts(data.data.cashAccounts);
//                 setBankAccounts(data.data.bankAccounts);
//                 setNextBillNumber(data.data.nextBillNumber);
//                 setCompanyDateFormat(data.data.companyDateFormat);
//                 setFormData(prev => ({
//                     ...prev,
//                     receiptAccount: data.data.cashAccounts[0]?._id || '',
//                     billNumber: data.data.nextBillNumber
//                 }));
//             } catch (err) {
//                 setError(err.response?.data?.message || 'Failed to load receipt form');
//             }
//         };

//         fetchReceiptFormData();
//     }, []);

//     useEffect(() => {
//         // Add F9 key handler here
//         const handF9leKeyDown = (e) => {
//             if (e.key === 'F9') {
//                 e.preventDefault();
//                 setShowProductModal(prev => !prev); // Toggle modal visibility
//             }
//         };
//         window.addEventListener('keydown', handF9leKeyDown);
//         return () => {
//             window.removeEventListener('keydown', handF9leKeyDown);
//         };
//     }, []);

//     const handleInputChange = (e) => {
//         const { name, value } = e.target;
//         setFormData(prev => ({ ...prev, [name]: value }));
//     };

//     const handleReceiptAccountChange = (e) => {
//         const selectedValue = e.target.value;
//         const selectedOption = e.target.options[e.target.selectedIndex];
//         const isBankAccount = selectedOption.getAttribute('data-group') === 'bank';

//         setShowBankDetails(isBankAccount);
//         setFormData(prev => ({ ...prev, receiptAccount: selectedValue }));
//     };

//     const resetForm = () => {
//         const currentDate = new Date().toISOString().split('T')[0];
//         // const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');

//         setFormData({
//             billDate: currentDate,
//             nepaliDate: currentNepaliDate,
//             receiptAccount: cashAccounts[0]?._id || '',
//             accountId: '',
//             accountName: '',
//             credit: '',
//             InstType: 'N/A',
//             bankAcc: 'N/A',
//             InstNo: '',
//             description: '',
//             billNumber: nextBillNumber
//         });

//         setShowBankDetails(false);
//     };

//     const handleSubmit = async (print = false) => {
//         setIsSaving(true);

//         try {
//             const payload = {
//                 ...formData,
//                 print: print || printAfterSave // Use the parameter or the saved preference
//             };

//             const response = await api.post('/api/retailer/receipts', payload);

//             setNotification({
//                 show: true,
//                 message: 'Receipt saved successfully!',
//                 type: 'success'
//             });

//             try {
//                 const formDataResponse = await api.get('/api/retailer/receipts');
//                 const { data } = formDataResponse;

//                 setNextBillNumber(data.data.nextBillNumber);
//                 const currentDate = new Date().toISOString().split('T')[0];

//                 // Check if the selected receipt account is a bank account
//                 const isBankAccount = data.data.bankAccounts.some(
//                     account => account._id === formData.receiptAccount
//                 );

//                 setFormData(prev => ({
//                     ...prev,
//                     billDate: currentDate,
//                     nepaliDate: currentNepaliDate,
//                     billNumber: data.data.nextBillNumber,
//                     accountId: '',
//                     accountName: '',
//                     credit: '',
//                     InstType: 'N/A',
//                     bankAcc: 'N/A',
//                     InstNo: '',
//                     description: ''
//                 }));

//                 // Set showBankDetails based on receipt account type
//                 setShowBankDetails(isBankAccount);

//                 // If print was requested (either explicitly or via printAfterSave), fetch print data and print immediately
//                 if ((print || printAfterSave) && response.data.data?.receipt?._id) {
//                     try {
//                         const printResponse = await api.get(`/api/retailer/receipts/${response.data.data.receipt._id}/print`);
//                         printVoucherImmediately(printResponse.data.data);
//                     } catch (printError) {
//                         console.error('Error fetching print data:', printError);
//                         setNotification({
//                             show: true,
//                             message: 'Receipt saved but failed to load print data',
//                             type: 'warning'
//                         });
//                     }
//                 } else {
//                     setTimeout(() => {
//                         const dateInputId = companyDateFormat === 'nepali' ? 'nepaliDate' : 'billDate';
//                         document.getElementById(dateInputId)?.focus();
//                     }, 0);
//                 }
//             } catch (err) {
//                 console.error('Error refetching form data:', err);
//                 resetForm();
//             }
//         } catch (err) {
//             setNotification({
//                 show: true,
//                 message: err.response?.data?.message || 'Failed to save receipt',
//                 type: 'error'
//             });
//         } finally {
//             setIsSaving(false);
//         }
//     };

//     const handlePrintAfterSaveChange = (e) => {
//         const isChecked = e.target.checked;
//         setPrintAfterSave(isChecked);
//         localStorage.setItem('printAfterSaveReceipt', isChecked);
//     };

//     const openAccountModal = () => {
//         setShowAccountModal(true);
//         setFilteredAccounts(accounts);
//         setTimeout(() => accountSearchRef.current?.focus(), 100);
//     };

//     const handleAccountSearch = (e) => {
//         const searchText = e.target.value.toLowerCase();
//         const filtered = accounts.filter(account =>
//             account.name.toLowerCase().includes(searchText) ||
//             (account.uniqueNumber && account.uniqueNumber.toString().toLowerCase().includes(searchText))
//         );
//         setFilteredAccounts(filtered);
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

//     const selectAccount = (account) => {
//         setFormData(prev => ({
//             ...prev,
//             accountId: account._id,
//             accountName: `${account.uniqueNumber || ''} ${account.name}`.trim(),
//         }));
//         setSelectedAccountId(account._id);
//         setShowAccountModal(false);
//         document.getElementById('credit')?.focus();
//     };

//     const printVoucherImmediately = (printData) => {
//         const tempDiv = document.createElement('div');
//         tempDiv.style.position = 'absolute';
//         tempDiv.style.left = '-9999px';
//         document.body.appendChild(tempDiv);

//         tempDiv.innerHTML = `
//             <div id="printableContent">
//                 <div class="print-voucher-container">
//                     <div class="print-voucher-header">
//                         <div class="print-company-name">${printData.currentCompanyName}</div>
//                         <div class="print-company-details">
//                             ${printData.currentCompany.address}-${printData.currentCompany.ward}, ${printData.currentCompany.city}
//                             <br />
//                             Tel: ${printData.currentCompany.phone} | PAN: ${printData.currentCompany.pan || 'N/A'}
//                         </div>
//                         <div class="print-voucher-title">RECEIPT VOUCHER</div>
//                     </div>

//                     <div class="print-voucher-details">
//                         <div>
//                             <div><strong>Vch. No:</strong> ${printData.receipt.billNumber}</div>
//                         </div>
//                         <div>
//                             <div><strong>Date:</strong> ${new Date(printData.receipt.date).toLocaleDateString()}</div>
//                         </div>
//                     </div>

//                     <table class="print-voucher-table">
//                         <thead>
//                             <tr>
//                                 <th>S.N</th>
//                                 <th>Particular</th>
//                                 <th>Debit Amount</th>
//                                 <th>Credit Amount</th>
//                             </tr>
//                         </thead>
//                         <tbody>
//                             <tr>
//                                 <td>1</td>
//                                 <td>${printData.receipt.receiptAccount?.name || 'N/A'}</td>
//                                 <td>${printData.receipt.credit?.toFixed(2)}</td>
//                                 <td>0.00</td>
//                             </tr>
//                             <tr>
//                                 <td>2</td>
//                                 <td>${printData.receipt.account?.name || 'N/A'}</td>
//                                 <td>0.00</td>
//                                 <td>${printData.receipt.credit?.toFixed(2)}</td>
//                             </tr>
//                         </tbody>
//                         <tfoot>
//                             <tr>
//                                 <th colSpan="2">Total</th>
//                                 <th>${printData.receipt.credit?.toFixed(2)}</th>
//                                 <th>${printData.receipt.credit?.toFixed(2)}</th>
//                             </tr>
//                         </tfoot>
//                     </table>

//                     <div style="margin-top: 3mm;">
//                         <strong>Note:</strong> ${printData.receipt.description || 'N/A'}
//                     </div>

//                     <div style="margin-top: 3mm;">
//                         <div><strong>Mode of Receipt:</strong> ${printData.receipt.InstType || 'N/A'}</div>
//                         <div><strong>Inst No:</strong> ${printData.receipt.InstNo || 'N/A'}</div>
//                     </div>

//                     <div class="print-signature-area">
//                         <div class="print-signature-box">
//                             <div style="margin-bottom: 1mm;">
//                                 <strong>${printData.receipt.user?.name || 'N/A'}</strong>
//                             </div>
//                             Prepared By
//                         </div>
//                         <div class="print-signature-box">
//                             <div style="margin-bottom: 1mm;">&nbsp;</div>
//                             Checked By
//                         </div>
//                         <div class="print-signature-box">
//                             <div style="margin-bottom: 1mm;">&nbsp;</div>
//                             Approved By
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         `;

//         const styles = `
//             @page {
//                 size: A4;
//                 margin: 5mm;
//             }
//             body {
//                 font-family: 'Arial Narrow', Arial, sans-serif;
//                 font-size: 9pt;
//                 line-height: 1.2;
//                 color: #000;
//                 background: white;
//                 margin: 0;
//                 padding: 0;
//             }
//             .print-voucher-container {
//                 width: 100%;
//                 max-width: 210mm;
//                 margin: 0 auto;
//                 padding: 2mm;
//             }
//             .print-voucher-header {
//                 text-align: center;
//                 margin-bottom: 3mm;
//                 border-bottom: 1px dashed #000;
//                 padding-bottom: 2mm;
//             }
//             .print-voucher-title {
//                 font-size: 12pt;
//                 font-weight: bold;
//                 margin: 2mm 0;
//                 text-transform: uppercase;
//                 text-decoration: underline;
//                 letter-spacing: 1px;
//             }
//             .print-company-name {
//                 font-size: 16pt;
//                 font-weight: bold;
//             }
//             .print-company-details {
//                 font-size: 8pt;
//                 margin: 1mm 0;
//             }
//             .print-voucher-details {
//                 display: flex;
//                 justify-content: space-between;
//                 margin: 2mm 0;
//                 font-size: 8pt;
//             }
//             .print-voucher-table {
//                 width: 100%;
//                 border-collapse: collapse;
//                 margin: 3mm 0;
//                 font-size: 8pt;
//             }
//             .print-voucher-table thead {
//                 border-top: 1px dashed #000;
//                 border-bottom: 1px dashed #000;
//             }
//             .print-voucher-table th {
//                 background-color: transparent;
//                 border: 1px solid #000;
//                 padding: 1mm;
//                 text-align: left;
//                 font-weight: bold;
//             }
//             .print-voucher-table td {
//                 border: 1px solid #000;
//                 padding: 1mm;
//             }
//             .print-text-right {
//                 text-align: right;
//             }
//             .print-text-center {
//                 text-align: center;
//             }
//             .print-signature-area {
//                 display: flex;
//                 justify-content: space-between;
//                 margin-top: 5mm;
//                 font-size: 8pt;
//             }
//             .print-signature-box {
//                 text-align: center;
//                 width: 30%;
//                 border-top: 1px dashed #000;
//                 padding-top: 1mm;
//                 font-weight: bold;
//             }
//         `;

//         const printWindow = window.open('', '_blank');
//         printWindow.document.write(`
//             <html>
//                 <head>
//                     <title>Receipt_Voucher_${printData.receipt.billNumber}</title>
//                     <style>${styles}</style>
//                 </head>
//                 <body>
//                     ${tempDiv.innerHTML}
//                     <script>
//                         window.onload = function() {
//                             setTimeout(function() {
//                                 window.print();
//                                 window.close();
//                             }, 200);
//                         };
//                     </script>
//                 </body>
//             </html>
//         `);
//         printWindow.document.close();
//         document.body.removeChild(tempDiv);
//     };

//     if (error) return <div className="alert alert-danger mt-5">{error}</div>;

//     return (
//         <div className='Container-fluid'>
//             <Header />
//             <div className="container mt-4 wow-form">
//                 <div className="card shadow-lg p-4 animate__animated animate__fadeInUp">
//                     <div className="card-header">
//                         <h5 className="card-title">Receipt Entry</h5>
//                     </div>
//                     <div className="card-body">
//                         <form className="wow-form" id='receiptForm' onSubmit={(e) => {
//                             e.preventDefault();
//                             handleSubmit(false);
//                         }}>
//                             {/* Date Input */}
//                             <div className="form-group row mb-3">
//                                 {companyDateFormat === 'nepali' ? (
//                                     <div className="col">
//                                         <label htmlFor="nepaliDate">Date:</label>
//                                         <input
//                                             type="text"
//                                             name="nepaliDate"
//                                             id="nepaliDate"
//                                             className="form-control"
//                                             required
//                                             value={formData.nepaliDate}
//                                             onChange={handleInputChange}
//                                             autoFocus
//                                             autoComplete='off'
//                                             onKeyDown={(e) => handleKeyDown(e, 'nepaliDate')}
//                                         />
//                                     </div>
//                                 ) : (
//                                     <div className="col">
//                                         <label htmlFor="billDate">Date:</label>
//                                         <input
//                                             type="date"
//                                             name="billDate"
//                                             id="billDate"
//                                             className="form-control"
//                                             value={formData.billDate}
//                                             onChange={handleInputChange}
//                                             autoFocus
//                                             onKeyDown={(e) => handleKeyDown(e, 'billDate')}
//                                         />
//                                     </div>
//                                 )}

//                                 <div className="col">
//                                     <label htmlFor="billNumber">Vch. No:</label>
//                                     <input
//                                         type="text"
//                                         name="billNumber"
//                                         id="billNumber"
//                                         className="form-control"
//                                         value={nextBillNumber}
//                                         onKeyDown={(e) => handleKeyDown(e, 'billNumber')}
//                                         readOnly
//                                     />
//                                 </div>

//                                 <div className="col">
//                                     <label htmlFor="accountType">A/c Type:</label>
//                                     <input
//                                         type="text"
//                                         name="accountType"
//                                         id="accountType"
//                                         className="form-control"
//                                         value="Receipt"
//                                         onKeyDown={(e) => handleKeyDown(e, 'accountType')}
//                                         readOnly
//                                     />
//                                 </div>
//                             </div>

//                             {/* Receipt Mode Selector */}
//                             <div className="form-group mb-3">
//                                 <label htmlFor="receiptAccount">Receipt Mode:</label>
//                                 <select
//                                     name="receiptAccount"
//                                     id="receiptAccount"
//                                     className="form-control"
//                                     required
//                                     value={formData.receiptAccount}
//                                     onChange={handleReceiptAccountChange}
//                                     onKeyDown={(e) => handleKeyDown(e, 'receiptAccount')}
//                                 >
//                                     <optgroup label="Cash">
//                                         {cashAccounts.map(cashAccount => (
//                                             <option
//                                                 key={cashAccount._id}
//                                                 value={cashAccount._id}
//                                                 data-group="cash"
//                                             >
//                                                 {cashAccount.name}
//                                             </option>
//                                         ))}
//                                     </optgroup>
//                                     <optgroup label="Bank">
//                                         {bankAccounts.map(bankAccount => (
//                                             <option
//                                                 key={bankAccount._id}
//                                                 value={bankAccount._id}
//                                                 data-group="bank"
//                                             >
//                                                 {bankAccount.name}
//                                             </option>
//                                         ))}
//                                     </optgroup>
//                                 </select>
//                             </div>

//                             {/* Dynamic Rows for Account and Amount */}
//                             <div id="rowsContainer" className="mb-3">
//                                 <div className="row receipt-row g-2 align-items-end">
//                                     {/* Account Selection Input */}
//                                     <div className="col-md-5 col-12">
//                                         <label htmlFor="account" className="form-label">Party Name:</label>
//                                         <input
//                                             type="text"
//                                             id="account"
//                                             name="account"
//                                             className="form-control"
//                                             placeholder=""
//                                             value={formData.accountName || ''}
//                                             onFocus={openAccountModal}
//                                             onKeyDown={(e) => handleKeyDown(e, 'account')}
//                                             readOnly
//                                         />
//                                         <input
//                                             type="hidden"
//                                             id="accountId"
//                                             name="accountId"
//                                             value={formData.accountId}
//                                         />
//                                     </div>

//                                     {/* Amount Input */}
//                                     <div className="col-md-2 col-6">
//                                         <label htmlFor="credit" className="form-label">Amount:</label>
//                                         <input
//                                             type="number"
//                                             name="credit"
//                                             id="credit"
//                                             className="form-control"
//                                             placeholder="Credit Amount"
//                                             value={formData.credit}
//                                             onChange={handleInputChange}
//                                             onKeyDown={(e) => handleKeyDown(e, 'credit')}
//                                             required
//                                         />
//                                     </div>

//                                     {/* Institution Type and Number */}
//                                     {showBankDetails && (
//                                         <div className="bank-details col-md-5 col-12">
//                                             <div className="row g-2">
//                                                 <div className="col-md-3 col-6">
//                                                     <label htmlFor="InstType" className="form-label">Inst. Type</label>
//                                                     <select
//                                                         name="InstType"
//                                                         id="InstType"
//                                                         className="form-control"
//                                                         value={formData.InstType}
//                                                         onChange={handleInputChange}
//                                                         onKeyDown={(e) => handleKeyDown(e, 'InstType')}
//                                                     >
//                                                         <option value="N/A">N/A</option>
//                                                         <option value="RTGS">RTGS</option>
//                                                         <option value="Fonepay">Fonepay</option>
//                                                         <option value="Cheque">Cheque</option>
//                                                         <option value="Connect-Ips">Connect-Ips</option>
//                                                     </select>
//                                                 </div>

//                                                 <div className="col-md-5 col-6">
//                                                     <label htmlFor="bankAcc" className="form-label">Bank</label>
//                                                     <select
//                                                         name="bankAcc"
//                                                         id="bankAcc"
//                                                         className="form-control"
//                                                         value={formData.bankAcc}
//                                                         onChange={handleInputChange}
//                                                         onKeyDown={(e) => handleKeyDown(e, 'bankAcc')}
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
//                                                 </div>

//                                                 <div className="col-md-4 col-6">
//                                                     <label htmlFor="InstNo" className="form-label">Inst. No.</label>
//                                                     <input
//                                                         type="text"
//                                                         name="InstNo"
//                                                         id="InstNo"
//                                                         className="form-control"
//                                                         value={formData.InstNo}
//                                                         onChange={handleInputChange}
//                                                         onKeyDown={(e) => handleKeyDown(e, 'InstNo')}
//                                                         autoComplete='off'
//                                                     />
//                                                 </div>
//                                             </div>
//                                         </div>
//                                     )}
//                                 </div>
//                             </div>

//                             {formData.accountId && (
//                                 <span className="input-group-text bg-light">
//                                     <AccountBalanceDisplay
//                                         accountId={formData.accountId}
//                                         api={api}
//                                         newTransactionAmount={parseFloat(formData.credit) || 0}
//                                         compact={true}
//                                         transactionType="receipt" // Add this prop
//                                         dateFormat={companyDateFormat}
//                                     />
//                                 </span>
//                             )}
//                             <br />

//                             <br />
//                             <div className="d-flex justify-content-between align-items-center">
//                                 <div className="col-md-8 col-12">
//                                     <input
//                                         type="text"
//                                         className="form-control"
//                                         name="description"
//                                         id="description"
//                                         placeholder="Description"
//                                         value={formData.description}
//                                         onChange={handleInputChange}
//                                         onKeyDown={(e) => {
//                                             if (e.key === 'Enter') {
//                                                 e.preventDefault();
//                                                 document.getElementById('saveBill')?.focus();
//                                             }
//                                         }}
//                                         autoComplete='off'
//                                     />
//                                 </div>

//                                 <div className="d-flex align-items-center gap-3">
//                                     {/* Print After Save Checkbox */}
//                                     <div className="form-check mb-0">
//                                         <input
//                                             className="form-check-input"
//                                             type="checkbox"
//                                             id="printAfterSave"
//                                             checked={printAfterSave}
//                                             onChange={handlePrintAfterSaveChange}
//                                         />
//                                         <label className="form-check-label" htmlFor="printAfterSave">
//                                             Print after save
//                                         </label>
//                                     </div>

//                                     {/* Action Buttons */}
//                                     <div className="d-flex gap-2">
//                                         <button
//                                             type="button"
//                                             className="btn btn-secondary btn-sm"
//                                             onClick={resetForm}
//                                             disabled={isSaving}
//                                         >
//                                             <i className="bi bi-arrow-counterclockwise me-1"></i> Reset
//                                         </button>

//                                         <button
//                                             type="submit"
//                                             className="btn btn-primary btn-sm"
//                                             id="saveBill"
//                                             onClick={(e) => {
//                                                 e.preventDefault();
//                                                 handleSubmit(false); // Regular save, printAfterSave will be used automatically
//                                             }}
//                                             disabled={isSaving}
//                                         >
//                                             {isSaving ? (
//                                                 <>
//                                                     <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
//                                                     Saving...
//                                                 </>
//                                             ) : (
//                                                 <>
//                                                     <i className="bi bi-save me-1"></i> Save
//                                                 </>
//                                             )}
//                                         </button>
//                                     </div>
//                                 </div>
//                             </div>
//                         </form>
//                     </div>
//                 </div>
//             </div>

//             {/* Account Modal */}
//             {showAccountModal && (
//                 <div className="modal fade show" id="accountModal" tabIndex="-1" style={{ display: 'block' }}>
//                     <div className="modal-dialog modal-xl modal-dialog-centered">
//                         <div className="modal-content" style={{ height: '400px' }}>
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
//                                     autoFocus
//                                     autoComplete='off'
//                                     onChange={handleAccountSearch}
//                                     onKeyDown={(e) => {
//                                         if (e.key === 'ArrowDown') {
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
//                                                     : accounts.find(a => a._id === accountId);
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
//                                     <ul id="accountList" className="list-group" ref={accountListRef}>
//                                         {filteredAccounts.length > 0 ? (
//                                             filteredAccounts
//                                                 .sort((a, b) => a.name.localeCompare(b.name))
//                                                 .map((account, index) => (
//                                                     <li
//                                                         key={account._id}
//                                                         data-account-id={account._id}
//                                                         className={`list-group-item account-item py-2 ${index === 0 ? 'active' : ''}`}
//                                                         onClick={() => selectAccount(account)}
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
//                                         ) : (
//                                             accountSearchRef.current?.value ? (
//                                                 <li className="list-group-item text-center text-muted small py-2">No accounts found</li>
//                                             ) : (
//                                                 accounts
//                                                     .sort((a, b) => a.name.localeCompare(b.name))
//                                                     .map((account, index) => (
//                                                         <li
//                                                             key={account._id}
//                                                             data-account-id={account._id}
//                                                             className={`list-group-item account-item py-2 ${index === 0 ? 'active' : ''}`}
//                                                             onClick={() => selectAccount(account)}
//                                                             style={{ cursor: 'pointer' }}
//                                                             tabIndex={0}
//                                                             onKeyDown={(e) => {
//                                                                 if (e.key === 'ArrowDown') {
//                                                                     e.preventDefault();
//                                                                     const nextItem = e.target.nextElementSibling;
//                                                                     if (nextItem) {
//                                                                         e.target.classList.remove('active');
//                                                                         nextItem.classList.add('active');
//                                                                         nextItem.focus();
//                                                                     }
//                                                                 } else if (e.key === 'ArrowUp') {
//                                                                     e.preventDefault();
//                                                                     const prevItem = e.target.previousElementSibling;
//                                                                     if (prevItem) {
//                                                                         e.target.classList.remove('active');
//                                                                         prevItem.classList.add('active');
//                                                                         prevItem.focus();
//                                                                     } else {
//                                                                         accountSearchRef.current.focus();
//                                                                     }
//                                                                 } else if (e.key === 'Enter') {
//                                                                     e.preventDefault();
//                                                                     selectAccount(account);
//                                                                 }
//                                                             }}
//                                                             onFocus={(e) => {
//                                                                 document.querySelectorAll('.account-item').forEach(item => {
//                                                                     item.classList.remove('active');
//                                                                 });
//                                                                 e.target.classList.add('active');
//                                                             }}
//                                                         >
//                                                             <div className="d-flex justify-content-between small">
//                                                                 <strong>{account.uniqueNumber || 'N/A'} {account.name}</strong>
//                                                                 <span>📍 {account.address || 'N/A'} | 🆔 PAN: {account.pan || 'N/A'}</span>
//                                                             </div>
//                                                         </li>
//                                                     ))
//                                             )
//                                         )}
//                                     </ul>
//                                 </div>
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

// export default AddReceipt;

//----------------------------------------------------------------end

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import NepaliDate from 'nepali-date-converter';
import NotificationToast from '../../NotificationToast';
import Header from '../Header';
import AccountBalanceDisplay from '../payment/AccountBalanceDisplay';
import ProductModal from '../dashboard/modals/ProductModal';
import NewVirtualizedAccountList from '../../NewVirtualizedAccountList';

const AddReceipt = () => {
    const navigate = useNavigate();
    const [isSaving, setIsSaving] = useState(false);
    const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
    const [printData, setPrintData] = useState(null);
    const printableRef = useRef();
    const [showProductModal, setShowProductModal] = useState(false);
    const [company, setCompany] = useState({
        dateFormat: 'nepali',
        vatEnabled: true,
        fiscalYear: {}
    });

    const [printAfterSave, setPrintAfterSave] = useState(
        localStorage.getItem('printAfterSaveReceipt') === 'true' || false
    );
    const [dateErrors, setDateErrors] = useState({
        transactionDateNepali: '',
        nepaliDate: ''
    });

    const [formData, setFormData] = useState({
        billDate: new Date().toISOString().split('T')[0],
        nepaliDate: currentNepaliDate,
        receiptAccount: '',
        accountId: '',
        credit: '',
        InstType: 'N/A',
        bankAcc: 'N/A',
        InstNo: '',
        description: ''
    });

    const [notification, setNotification] = useState({
        show: false,
        message: '',
        type: 'success'
    });
    const [selectedAccountId, setSelectedAccountId] = useState('');

    // Account search states
    const [isAccountSearching, setIsAccountSearching] = useState(false);
    const [accounts, setAccounts] = useState([]);
    const [accountSearchPage, setAccountSearchPage] = useState(1);
    const [hasMoreAccountResults, setHasMoreAccountResults] = useState(false);
    const [totalAccounts, setTotalAccounts] = useState(0);
    const [accountSearchQuery, setAccountSearchQuery] = useState('');
    const [accountLastSearchQuery, setAccountLastSearchQuery] = useState('');
    const [accountShouldShowLastSearchResults, setAccountShouldShowLastSearchResults] = useState(false);

    const accountSearchRef = useRef(null);
    const [cashAccounts, setCashAccounts] = useState([]);
    const [bankAccounts, setBankAccounts] = useState([]);
    const [nextBillNumber, setNextBillNumber] = useState('');
    const [companyDateFormat, setCompanyDateFormat] = useState('nepali');
    const [showBankDetails, setShowBankDetails] = useState(false);
    const [error, setError] = useState(null);
    const [showAccountModal, setShowAccountModal] = useState(false);
    const transactionDateRef = useRef(null);

    const api = axios.create({
        baseURL: process.env.REACT_APP_API_BASE_URL,
        withCredentials: true,
    });

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

    useEffect(() => {
        const fetchReceiptFormData = async () => {
            try {
                const response = await api.get('/api/retailer/receipts');
                const { data } = response;

                setCashAccounts(data.data.cashAccounts);
                setBankAccounts(data.data.bankAccounts);
                setNextBillNumber(data.data.nextBillNumber);
                setCompanyDateFormat(data.data.companyDateFormat);
                setFormData(prev => ({
                    ...prev,
                    receiptAccount: data.data.cashAccounts[0]?._id || '',
                    billNumber: data.data.nextBillNumber
                }));

                // Fetch accounts initially
                fetchAccountsFromBackend('', 1);
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to load receipt form');
            }
        };

        fetchReceiptFormData();
    }, []);

    useEffect(() => {
        // Add F9 key handler here
        const handleKeyDown = (e) => {
            if (e.key === 'F9') {
                e.preventDefault();
                setShowProductModal(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    useEffect(() => {
        const handleEscapeKey = (e) => {
            if (e.key === 'Escape' && showAccountModal) {
                e.preventDefault();
                handleAccountModalClose();
            }
        };

        window.addEventListener('keydown', handleEscapeKey);

        return () => {
            window.removeEventListener('keydown', handleEscapeKey);
        };
    }, [showAccountModal]);

    // Add print after save handler
    const handlePrintAfterSaveChange = (e) => {
        const isChecked = e.target.checked;
        setPrintAfterSave(isChecked);
        localStorage.setItem('printAfterSaveReceipt', isChecked);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleReceiptAccountChange = (e) => {
        const selectedValue = e.target.value;
        const selectedOption = e.target.options[e.target.selectedIndex];
        const isBankAccount = selectedOption.getAttribute('data-group') === 'bank';

        setShowBankDetails(isBankAccount);
        setFormData(prev => ({ ...prev, receiptAccount: selectedValue }));
    };

    const resetForm = () => {
        const currentDate = new Date().toISOString().split('T')[0];

        setFormData({
            billDate: currentDate,
            nepaliDate: currentNepaliDate,
            receiptAccount: cashAccounts[0]?._id || '',
            accountId: '',
            accountName: '',
            credit: '',
            InstType: 'N/A',
            bankAcc: 'N/A',
            InstNo: '',
            description: '',
            billNumber: nextBillNumber
        });

        setShowBankDetails(false);
    };

    const handleSubmit = async (print = false) => {
        setIsSaving(true);

        try {
            const payload = {
                ...formData,
                print: print || printAfterSave // Use the parameter or the saved preference
            };

            const response = await api.post('/api/retailer/receipts', payload);

            setNotification({
                show: true,
                message: 'Receipt saved successfully!',
                type: 'success'
            });

            // After successful save, refetch the initial form data
            try {
                const formDataResponse = await api.get('/api/retailer/receipts');
                const { data } = formDataResponse;

                setNextBillNumber(data.data.nextBillNumber);
                const currentDate = new Date().toISOString().split('T')[0];

                // Check if the selected receipt account is a bank account
                const isBankAccount = data.data.bankAccounts.some(
                    account => account._id === formData.receiptAccount
                );

                setFormData(prev => ({
                    ...prev,
                    billDate: currentDate,
                    nepaliDate: currentNepaliDate,
                    billNumber: data.data.nextBillNumber,
                    accountId: '',
                    accountName: '',
                    credit: '',
                    InstType: 'N/A',
                    bankAcc: 'N/A',
                    InstNo: '',
                    description: ''
                }));

                // Set showBankDetails based on receipt account type
                setShowBankDetails(isBankAccount);

                // If print was requested (either explicitly or via printAfterSave), fetch print data and print immediately
                if ((print || printAfterSave) && response.data.data?.receipt?._id) {
                    try {
                        const printResponse = await api.get(`/api/retailer/receipts/${response.data.data.receipt._id}/print`);
                        printVoucherImmediately(printResponse.data.data);
                    } catch (printError) {
                        console.error('Error fetching print data:', printError);
                        setNotification({
                            show: true,
                            message: 'Receipt saved but failed to load print data',
                            type: 'warning'
                        });
                    }
                } else {
                    // Move focus to date input field
                    setTimeout(() => {
                        const dateInputId = companyDateFormat === 'nepali' ? 'nepaliDate' : 'billDate';
                        document.getElementById(dateInputId)?.focus();
                    }, 0);
                }
            } catch (err) {
                console.error('Error refetching form data:', err);
                resetForm();
            }
        } catch (err) {
            setNotification({
                show: true,
                message: err.response?.data?.message || 'Failed to save receipt',
                type: 'error'
            });
        } finally {
            setIsSaving(false);
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

    const handleAccountModalClose = () => {
        setShowAccountModal(false);
    };

    const selectAccount = (account) => {
        setFormData({
            ...formData,
            accountId: account._id,
            accountName: `${account.uniqueNumber || ''} ${account.name}`.trim(),
        });
        setSelectedAccountId(account._id);
        setShowAccountModal(false);
        document.getElementById('credit')?.focus();
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

    const printVoucherImmediately = (printData) => {
        const tempDiv = document.createElement('div');
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px';
        document.body.appendChild(tempDiv);

        tempDiv.innerHTML = `
            <div id="printableContent">
                <div class="print-voucher-container">
                    <div class="print-voucher-header">
                        <div class="print-company-name">${printData.currentCompanyName}</div>
                        <div class="print-company-details">
                            ${printData.currentCompany.address}-${printData.currentCompany.ward}, ${printData.currentCompany.city}
                            <br />
                            Tel: ${printData.currentCompany.phone} | PAN: ${printData.currentCompany.pan || 'N/A'}
                        </div>
                        <div class="print-voucher-title">RECEIPT VOUCHER</div>
                    </div>

                    <div class="print-voucher-details">
                        <div>
                            <div><strong>Vch. No:</strong> ${printData.receipt.billNumber}</div>
                        </div>
                        <div>
                            <div><strong>Date:</strong> ${new Date(printData.receipt.date).toLocaleDateString()}</div>
                        </div>
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
                        <tbody>
                            <tr>
                                <td>1</td>
                                <td>${printData.receipt.receiptAccount?.name || 'N/A'}</td>
                                <td>${printData.receipt.credit?.toFixed(2)}</td>
                                <td>0.00</td>
                            </tr>
                            <tr>
                                <td>2</td>
                                <td>${printData.receipt.account?.name || 'N/A'}</td>
                                <td>0.00</td>
                                <td>${printData.receipt.credit?.toFixed(2)}</td>
                            </tr>
                        </tbody>
                        <tfoot>
                            <tr>
                                <th colSpan="2">Total</th>
                                <th>${printData.receipt.credit?.toFixed(2)}</th>
                                <th>${printData.receipt.credit?.toFixed(2)}</th>
                            </tr>
                        </tfoot>
                    </table>

                    <div style="margin-top: 3mm;">
                        <strong>Note:</strong> ${printData.receipt.description || 'N/A'}
                    </div>

                    <div style="margin-top: 3mm;">
                        <div><strong>Mode of Receipt:</strong> ${printData.receipt.InstType || 'N/A'}</div>
                        <div><strong>Inst No:</strong> ${printData.receipt.InstNo || 'N/A'}</div>
                    </div>

                    <div class="print-signature-area">
                        <div class="print-signature-box">
                            <div style="margin-bottom: 1mm;">
                                <strong>${printData.receipt.user?.name || 'N/A'}</strong>
                            </div>
                            Prepared By
                        </div>
                        <div class="print-signature-box">
                            <div style="margin-bottom: 1mm;">&nbsp;</div>
                            Checked By
                        </div>
                        <div class="print-signature-box">
                            <div style="margin-bottom: 1mm;">&nbsp;</div>
                            Approved By
                        </div>
                    </div>
                </div>
            </div>
        `;

        const styles = `
            @page {
                size: A4;
                margin: 5mm;
            }
            body {
                font-family: 'Arial Narrow', Arial, sans-serif;
                font-size: 9pt;
                line-height: 1.2;
                color: #000;
                background: white;
                margin: 0;
                padding: 0;
            }
            .print-voucher-container {
                width: 100%;
                max-width: 210mm;
                margin: 0 auto;
                padding: 2mm;
            }
            .print-voucher-header {
                text-align: center;
                margin-bottom: 3mm;
                border-bottom: 1px dashed #000;
                padding-bottom: 2mm;
            }
            .print-voucher-title {
                font-size: 12pt;
                font-weight: bold;
                margin: 2mm 0;
                text-transform: uppercase;
                text-decoration: underline;
                letter-spacing: 1px;
            }
            .print-company-name {
                font-size: 16pt;
                font-weight: bold;
            }
            .print-company-details {
                font-size: 8pt;
                margin: 1mm 0;
            }
            .print-voucher-details {
                display: flex;
                justify-content: space-between;
                margin: 2mm 0;
                font-size: 8pt;
            }
            .print-voucher-table {
                width: 100%;
                border-collapse: collapse;
                margin: 3mm 0;
                font-size: 8pt;
            }
            .print-voucher-table thead {
                border-top: 1px dashed #000;
                border-bottom: 1px dashed #000;
            }
            .print-voucher-table th {
                background-color: transparent;
                border: 1px solid #000;
                padding: 1mm;
                text-align: left;
                font-weight: bold;
            }
            .print-voucher-table td {
                border: 1px solid #000;
                padding: 1mm;
            }
            .print-text-right {
                text-align: right;
            }
            .print-text-center {
                text-align: center;
            }
            .print-signature-area {
                display: flex;
                justify-content: space-between;
                margin-top: 5mm;
                font-size: 8pt;
            }
            .print-signature-box {
                text-align: center;
                width: 30%;
                border-top: 1px dashed #000;
                padding-top: 1mm;
                font-weight: bold;
            }
        `;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Receipt_Voucher_${printData.receipt.billNumber}</title>
                    <style>${styles}</style>
                </head>
                <body>
                    ${tempDiv.innerHTML}
                    <script>
                        window.onload = function() {
                            setTimeout(function() {
                                window.print();
                                window.close();
                            }, 200);
                        };
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
        document.body.removeChild(tempDiv);
    };

    const loadMoreAccounts = () => {
        if (!isAccountSearching) {
            fetchAccountsFromBackend(accountSearchQuery, accountSearchPage + 1);
        }
    };

    if (error) return <div className="alert alert-danger mt-5">{error}</div>;

    return (
        <div className="container-fluid">
            <Header />
            <div className="container mt-4 wow-form">
                <div className="card mt-2 shadow-lg p-2 animate__animated animate__fadeInUp expanded-card ledger-card compact">
                    <div className="card-header">
                        <div className="d-flex justify-content-between align-items-center">
                            <h2 className="card-title mb-0">
                                <i className="bi bi-file-text me-2"></i>
                                Receipt Entry
                            </h2>
                        </div>
                    </div>

                    <div className="card-body p-2 p-md-3">
                        <form className="wow-form" id='receiptForm' onSubmit={(e) => {
                            e.preventDefault();
                            handleSubmit(false);
                        }}>
                            {/* Date and Basic Info Row */}
                            <div className="row g-2 mb-3">
                                {companyDateFormat === 'nepali' ? (
                                    <>
                                        <div className="col-12 col-md-6 col-lg-2">
                                            <div className="position-relative">
                                                <input
                                                    type="text"
                                                    name="nepaliDate"
                                                    id="nepaliDate"
                                                    ref={company.dateFormat === 'nepali' ? transactionDateRef : null}
                                                    autoComplete='off'
                                                    className={`form-control form-control-sm no-date-icon ${dateErrors.nepaliDate ? 'is-invalid' : ''}`}
                                                    value={formData.nepaliDate}
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        const sanitizedValue = value.replace(/[^0-9/-]/g, '');

                                                        if (sanitizedValue.length <= 10) {
                                                            setFormData({ ...formData, nepaliDate: sanitizedValue });
                                                            setDateErrors(prev => ({ ...prev, nepaliDate: '' }));
                                                        }
                                                    }}
                                                    onKeyDown={(e) => {
                                                        const allowedKeys = [
                                                            'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
                                                            'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
                                                            'Home', 'End'
                                                        ];

                                                        if (!allowedKeys.includes(e.key) &&
                                                            !/^\d$/.test(e.key) &&
                                                            e.key !== '/' &&
                                                            e.key !== '-' &&
                                                            !e.ctrlKey && !e.metaKey) {
                                                            e.preventDefault();
                                                        }

                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            const dateStr = e.target.value.trim();

                                                            if (!dateStr) {
                                                                const currentDate = new NepaliDate();
                                                                const correctedDate = currentDate.format('YYYY-MM-DD');
                                                                setFormData({
                                                                    ...formData,
                                                                    nepaliDate: correctedDate
                                                                });
                                                                setDateErrors(prev => ({ ...prev, nepaliDate: '' }));

                                                                setNotification({
                                                                    show: true,
                                                                    message: 'Date required. Auto-corrected to current date.',
                                                                    type: 'warning',
                                                                    duration: 3000
                                                                });

                                                                handleKeyDown(e, 'nepaliDate');
                                                            } else if (dateErrors.nepaliDate) {
                                                                e.target.focus();
                                                            } else {
                                                                handleKeyDown(e, 'nepaliDate');
                                                            }
                                                        }
                                                    }}
                                                    onPaste={(e) => {
                                                        e.preventDefault();
                                                        const pastedData = e.clipboardData.getData('text');
                                                        const cleanedData = pastedData.replace(/[^0-9/-]/g, '');
                                                        const newValue = formData.nepaliDate + cleanedData;
                                                        if (newValue.length <= 10) {
                                                            setFormData({ ...formData, nepaliDate: newValue });
                                                        }
                                                    }}
                                                    onBlur={(e) => {
                                                        try {
                                                            const dateStr = e.target.value.trim();
                                                            if (!dateStr) {
                                                                setDateErrors(prev => ({ ...prev, nepaliDate: '' }));
                                                                return;
                                                            }

                                                            const nepaliDateFormat = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/;
                                                            if (!nepaliDateFormat.test(dateStr)) {
                                                                const currentDate = new NepaliDate();
                                                                const correctedDate = currentDate.format('YYYY-MM-DD');
                                                                setFormData({
                                                                    ...formData,
                                                                    nepaliDate: correctedDate
                                                                });
                                                                setDateErrors(prev => ({ ...prev, nepaliDate: '' }));

                                                                setNotification({
                                                                    show: true,
                                                                    message: 'Invalid date format. Auto-corrected to current date.',
                                                                    type: 'warning',
                                                                    duration: 3000
                                                                });
                                                                return;
                                                            }

                                                            const normalizedDateStr = dateStr.replace(/-/g, '/');
                                                            const [year, month, day] = normalizedDateStr.split('/').map(Number);

                                                            if (month < 1 || month > 12) {
                                                                throw new Error("Month must be between 1-12");
                                                            }
                                                            if (day < 1 || day > 32) {
                                                                throw new Error("Day must be between 1-32");
                                                            }

                                                            const nepaliDate = new NepaliDate(year, month - 1, day);

                                                            if (
                                                                nepaliDate.getYear() !== year ||
                                                                nepaliDate.getMonth() + 1 !== month ||
                                                                nepaliDate.getDate() !== day
                                                            ) {
                                                                const currentDate = new NepaliDate();
                                                                const correctedDate = currentDate.format('YYYY-MM-DD');
                                                                setFormData({
                                                                    ...formData,
                                                                    nepaliDate: correctedDate
                                                                });
                                                                setDateErrors(prev => ({ ...prev, nepaliDate: '' }));

                                                                setNotification({
                                                                    show: true,
                                                                    message: 'Invalid Nepali date. Auto-corrected to current date.',
                                                                    type: 'warning',
                                                                    duration: 3000
                                                                });
                                                            } else {
                                                                setFormData({
                                                                    ...formData,
                                                                    nepaliDate: nepaliDate.format('YYYY-MM-DD')
                                                                });
                                                                setDateErrors(prev => ({ ...prev, nepaliDate: '' }));
                                                            }
                                                        } catch (error) {
                                                            const currentDate = new NepaliDate();
                                                            const correctedDate = currentDate.format('YYYY-MM-DD');
                                                            setFormData({
                                                                ...formData,
                                                                nepaliDate: correctedDate
                                                            });
                                                            setDateErrors(prev => ({ ...prev, nepaliDate: '' }));

                                                            setNotification({
                                                                show: true,
                                                                message: error.message ? `${error.message}. Auto-corrected to current date.` : 'Invalid date. Auto-corrected to current date.',
                                                                type: 'warning',
                                                                duration: 3000
                                                            });
                                                        }
                                                    }}
                                                    placeholder="YYYY-MM-DD"
                                                    required
                                                    style={{
                                                        height: '26px',
                                                        fontSize: '0.875rem',
                                                        paddingTop: '0.75rem',
                                                        width: '100%'
                                                    }}
                                                />
                                                <label
                                                    className="position-absolute"
                                                    style={{
                                                        top: '-0.5rem',
                                                        left: '0.75rem',
                                                        fontSize: '0.75rem',
                                                        backgroundColor: 'white',
                                                        padding: '0 0.25rem',
                                                        color: '#6c757d',
                                                        fontWeight: '500'
                                                    }}
                                                >
                                                    Date: <span className="text-danger">*</span>
                                                </label>
                                                {dateErrors.nepaliDate && (
                                                    <div className="invalid-feedback d-block" style={{ fontSize: '0.7rem' }}>
                                                        {dateErrors.nepaliDate}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="col-12 col-md-6 col-lg-2">
                                            <div className="position-relative">
                                                <input
                                                    type="date"
                                                    name="billDate"
                                                    id="billDate"
                                                    className="form-control form-control-sm"
                                                    ref={company.dateFormat === 'roman' ? transactionDateRef : null}
                                                    value={formData.billDate}
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        const selectedDate = new Date(value);
                                                        const today = new Date();
                                                        today.setHours(0, 0, 0, 0);

                                                        if (selectedDate > today) {
                                                            const todayStr = today.toISOString().split('T')[0];
                                                            setFormData({ ...formData, billDate: todayStr });

                                                            setNotification({
                                                                show: true,
                                                                message: 'Future date not allowed. Auto-corrected to today.',
                                                                type: 'warning',
                                                                duration: 3000
                                                            });
                                                        } else {
                                                            setFormData({ ...formData, billDate: value });
                                                        }
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            const value = e.target.value;

                                                            if (!value) {
                                                                const today = new Date();
                                                                const todayStr = today.toISOString().split('T')[0];
                                                                setFormData({ ...formData, billDate: todayStr });

                                                                setNotification({
                                                                    show: true,
                                                                    message: 'Date required. Auto-corrected to today.',
                                                                    type: 'warning',
                                                                    duration: 3000
                                                                });
                                                            }

                                                            handleKeyDown(e, 'billDate');
                                                        }
                                                    }}
                                                    onBlur={(e) => {
                                                        const value = e.target.value;
                                                        if (!value) {
                                                            const today = new Date();
                                                            const todayStr = today.toISOString().split('T')[0];
                                                            setFormData({ ...formData, billDate: todayStr });

                                                            setNotification({
                                                                show: true,
                                                                message: 'Date required. Auto-corrected to today.',
                                                                type: 'warning',
                                                                duration: 3000
                                                            });
                                                        }
                                                    }}
                                                    max={new Date().toISOString().split('T')[0]}
                                                    required
                                                    style={{
                                                        height: '26px',
                                                        fontSize: '0.875rem',
                                                        paddingTop: '0.75rem',
                                                        width: '100%'
                                                    }}
                                                />
                                                <label
                                                    className="position-absolute"
                                                    style={{
                                                        top: '-0.5rem',
                                                        left: '0.75rem',
                                                        fontSize: '0.75rem',
                                                        backgroundColor: 'white',
                                                        padding: '0 0.25rem',
                                                        color: '#6c757d',
                                                        fontWeight: '500'
                                                    }}
                                                >
                                                    Date: <span className="text-danger">*</span>
                                                </label>
                                            </div>
                                        </div>
                                    </>
                                )}

                                <div className="col-12 col-md-6 col-lg-2">
                                    <div className="position-relative">
                                        <input
                                            type="text"
                                            name="billNumber"
                                            id="billNumber"
                                            className="form-control form-control-sm"
                                            value={nextBillNumber}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    handleKeyDown(e, 'billNumber');
                                                }
                                            }}
                                            readOnly
                                            style={{
                                                height: '26px',
                                                fontSize: '0.875rem',
                                                paddingTop: '0.75rem',
                                                width: '100%'
                                            }}
                                        />
                                        <label
                                            className="position-absolute"
                                            style={{
                                                top: '-0.5rem',
                                                left: '0.75rem',
                                                fontSize: '0.75rem',
                                                backgroundColor: 'white',
                                                padding: '0 0.25rem',
                                                color: '#6c757d',
                                                fontWeight: '500'
                                            }}
                                        >
                                            Vch. No:
                                        </label>
                                    </div>
                                </div>

                                <div className="col-12 col-md-6 col-lg-2">
                                    <div className="position-relative">
                                        <input
                                            type="text"
                                            name="accountType"
                                            id="accountType"
                                            className="form-control form-control-sm"
                                            value="Receipt"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    handleKeyDown(e, 'accountType');
                                                }
                                            }}
                                            readOnly
                                            style={{
                                                height: '26px',
                                                fontSize: '0.875rem',
                                                paddingTop: '0.75rem',
                                                width: '100%'
                                            }}
                                        />
                                        <label
                                            className="position-absolute"
                                            style={{
                                                top: '-0.5rem',
                                                left: '0.75rem',
                                                fontSize: '0.75rem',
                                                backgroundColor: 'white',
                                                padding: '0 0.25rem',
                                                color: '#6c757d',
                                                fontWeight: '500'
                                            }}
                                        >
                                            A/c Type:
                                        </label>
                                    </div>
                                </div>

                                <div className="col-12 col-md-6 col-lg-5">
                                    <div className="position-relative">
                                        <select
                                            name="receiptAccount"
                                            id="receiptAccount"
                                            className="form-control form-control-sm"
                                            required
                                            value={formData.receiptAccount}
                                            onChange={handleReceiptAccountChange}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    handleKeyDown(e, 'receiptAccount');
                                                }
                                            }}
                                            style={{
                                                height: '26px',
                                                fontSize: '0.875rem',
                                                paddingTop: '0.25rem',
                                                width: '100%'
                                            }}
                                        >
                                            <optgroup label="Cash">
                                                {cashAccounts.map(cashAccount => (
                                                    <option
                                                        key={cashAccount._id}
                                                        value={cashAccount._id}
                                                        data-group="cash"
                                                    >
                                                        {cashAccount.name}
                                                    </option>
                                                ))}
                                            </optgroup>
                                            <optgroup label="Bank">
                                                {bankAccounts.map(bankAccount => (
                                                    <option
                                                        key={bankAccount._id}
                                                        value={bankAccount._id}
                                                        data-group="bank"
                                                    >
                                                        {bankAccount.name}
                                                    </option>
                                                ))}
                                            </optgroup>
                                        </select>
                                        <label
                                            className="position-absolute"
                                            style={{
                                                top: '-0.5rem',
                                                left: '0.75rem',
                                                fontSize: '0.75rem',
                                                backgroundColor: 'white',
                                                padding: '0 0.25rem',
                                                color: '#6c757d',
                                                fontWeight: '500'
                                            }}
                                        >
                                            Receipt Mode:
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Party and Amount Row */}
                            <div className="row g-2 mb-3 align-items-end">
                                {/* Party Name Field */}
                                <div className="col-12 col-md-5">
                                    <div className="position-relative">
                                        <input
                                            type="text"
                                            id="account"
                                            name="account"
                                            className="form-control form-control-sm"
                                            autoComplete='off'
                                            placeholder=""
                                            value={formData.accountName || ''}
                                            onFocus={() => setShowAccountModal(true)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    handleKeyDown(e, 'account');
                                                }
                                            }}
                                            readOnly
                                            style={{
                                                height: '26px',
                                                fontSize: '0.875rem',
                                                paddingTop: '0.75rem',
                                                width: '100%'
                                            }}
                                        />
                                        <label
                                            className="position-absolute"
                                            style={{
                                                top: '-0.5rem',
                                                left: '0.75rem',
                                                fontSize: '0.75rem',
                                                backgroundColor: 'white',
                                                padding: '0 0.25rem',
                                                color: '#6c757d',
                                                fontWeight: '500'
                                            }}
                                        >
                                            Party Name: <span className="text-danger">*</span>
                                        </label>
                                        <input type="hidden" id="accountId" name="accountId" value={formData.accountId} />
                                    </div>
                                </div>

                                {/* Amount Input */}
                                <div className="col-12 col-md-2">
                                    <div className="position-relative">
                                        <input
                                            type="number"
                                            name="credit"
                                            id="credit"
                                            className="form-control form-control-sm"
                                            placeholder="Credit Amount"
                                            value={formData.credit}
                                            onChange={handleInputChange}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    handleKeyDown(e, 'credit');
                                                }
                                            }}
                                            required
                                            style={{
                                                height: '26px',
                                                fontSize: '0.875rem',
                                                paddingTop: '0.75rem',
                                                width: '100%'
                                            }}
                                        />
                                        <label
                                            className="position-absolute"
                                            style={{
                                                top: '-0.5rem',
                                                left: '0.75rem',
                                                fontSize: '0.75rem',
                                                backgroundColor: 'white',
                                                padding: '0 0.25rem',
                                                color: '#6c757d',
                                                fontWeight: '500'
                                            }}
                                        >
                                            Amount:
                                        </label>
                                    </div>
                                </div>

                                {/* Institution Type and Number */}
                                {showBankDetails && (
                                    <div className="col-12 col-md-5">
                                        <div className="row g-2">
                                            <div className="col-4">
                                                <div className="position-relative">
                                                    <select
                                                        name="InstType"
                                                        id="InstType"
                                                        className="form-control form-control-sm"
                                                        value={formData.InstType}
                                                        onChange={handleInputChange}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                handleKeyDown(e, 'InstType');
                                                            }
                                                        }}
                                                        style={{
                                                            height: '26px',
                                                            fontSize: '0.875rem',
                                                            paddingTop: '0.25rem',
                                                            width: '100%'
                                                        }}
                                                    >
                                                        <option value="N/A">N/A</option>
                                                        <option value="RTGS">RTGS</option>
                                                        <option value="Fonepay">Fonepay</option>
                                                        <option value="Cheque">Cheque</option>
                                                        <option value="Connect-Ips">Connect-Ips</option>
                                                        <option value="Esewa">Esewa</option>
                                                        <option value="Khalti">Khalti</option>
                                                    </select>
                                                    <label
                                                        className="position-absolute"
                                                        style={{
                                                            top: '-0.5rem',
                                                            left: '0.75rem',
                                                            fontSize: '0.75rem',
                                                            backgroundColor: 'white',
                                                            padding: '0 0.25rem',
                                                            color: '#6c757d',
                                                            fontWeight: '500'
                                                        }}
                                                    >
                                                        Inst. Type
                                                    </label>
                                                </div>
                                            </div>

                                            <div className="col-4">
                                                <div className="position-relative">
                                                    <select
                                                        name="bankAcc"
                                                        id="bankAcc"
                                                        className="form-control form-control-sm"
                                                        value={formData.bankAcc}
                                                        onChange={handleInputChange}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                handleKeyDown(e, 'bankAcc');
                                                            }
                                                        }}
                                                        style={{
                                                            height: '26px',
                                                            fontSize: '0.875rem',
                                                            paddingTop: '0.25rem',
                                                            width: '100%'
                                                        }}
                                                    >
                                                        <option value="N/A">N/A</option>
                                                        <option value="Agriculture Development Bank">Agriculture Development Bank</option>
                                                        <option value="Nepal Bank">Nepal Bank</option>
                                                        <option value="Rastriya Banijya Bank">Rastriya Banijya Bank</option>
                                                        <option value="Citizens Bank International">Citizens Bank International</option>
                                                        <option value="Nabil Bank">Nabil Bank</option>
                                                        <option value="Himalayan Bank">Himalayan Bank</option>
                                                        <option value="Laxmi Sunrise Bank">Laxmi Sunrise Bank</option>
                                                        <option value="Nepal Investment Mega Bank">Nepal Investment Mega Bank</option>
                                                        <option value="Kumari Bank">Kumari Bank</option>
                                                        <option value="Global IME Bank Limited">Global IME Bank Limited</option>
                                                        <option value="NIC Asia Bank">NIC Asia Bank</option>
                                                        <option value="Machhapuchchhre Bank">Machhapuchchhre Bank</option>
                                                        <option value="Nepal SBI Bank">Nepal SBI Bank</option>
                                                        <option value="Everest Bank">Everest Bank</option>
                                                        <option value="NMB Bank Nepal">NMB Bank Nepal</option>
                                                        <option value="Prabhu Bank">Prabhu Bank</option>
                                                        <option value="Prime Commercial Bank">Prime Commercial Bank</option>
                                                        <option value="Sanima Bank">Sanima Bank</option>
                                                        <option value="Siddhartha Bank">Siddhartha Bank</option>
                                                        <option value="Standard Chartered Bank">Standard Chartered Bank</option>
                                                    </select>
                                                    <label
                                                        className="position-absolute"
                                                        style={{
                                                            top: '-0.5rem',
                                                            left: '0.75rem',
                                                            fontSize: '0.75rem',
                                                            backgroundColor: 'white',
                                                            padding: '0 0.25rem',
                                                            color: '#6c757d',
                                                            fontWeight: '500'
                                                        }}
                                                    >
                                                        Bank
                                                    </label>
                                                </div>
                                            </div>

                                            <div className="col-4">
                                                <div className="position-relative">
                                                    <input
                                                        type="text"
                                                        name="InstNo"
                                                        id="InstNo"
                                                        className="form-control form-control-sm"
                                                        value={formData.InstNo}
                                                        onChange={handleInputChange}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                handleKeyDown(e, 'InstNo');
                                                            }
                                                        }}
                                                        autoComplete='off'
                                                        style={{
                                                            height: '26px',
                                                            fontSize: '0.875rem',
                                                            paddingTop: '0.75rem',
                                                            width: '100%'
                                                        }}
                                                    />
                                                    <label
                                                        className="position-absolute"
                                                        style={{
                                                            top: '-0.5rem',
                                                            left: '0.75rem',
                                                            fontSize: '0.75rem',
                                                            backgroundColor: 'white',
                                                            padding: '0 0.25rem',
                                                            color: '#6c757d',
                                                            fontWeight: '500'
                                                        }}
                                                    >
                                                        Inst. No.
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Account Balance Display */}
                            {formData.accountId && (
                                <div className="row g-2 mb-3">
                                    <div className="col-12">
                                        <div className="position-relative">
                                            <div
                                                className="form-control form-control-sm"
                                                style={{
                                                    height: '26px',
                                                    fontSize: '0.875rem',
                                                    paddingTop: '0.4rem',
                                                    width: '100%',
                                                    border: '1px solid #ced4da',
                                                    borderRadius: '0.375rem',
                                                    overflow: 'hidden',
                                                    whiteSpace: 'nowrap',
                                                    backgroundColor: '#f8f9fa'
                                                }}
                                            >
                                                <AccountBalanceDisplay
                                                    accountId={formData.accountId}
                                                    api={api}
                                                    newTransactionAmount={parseFloat(formData.credit) || 0}
                                                    compact={true}
                                                    transactionType="receipt"
                                                    dateFormat={companyDateFormat}
                                                    style={{
                                                        fontSize: '0.875rem',
                                                        lineHeight: '1',
                                                        margin: '0',
                                                        padding: '0',
                                                        display: 'inline-block',
                                                        verticalAlign: 'middle'
                                                    }}
                                                />
                                            </div>
                                            <label
                                                className="position-absolute"
                                                style={{
                                                    top: '-0.5rem',
                                                    left: '0.75rem',
                                                    fontSize: '0.75rem',
                                                    backgroundColor: 'white',
                                                    padding: '0 0.25rem',
                                                    color: '#6c757d',
                                                    fontWeight: '500'
                                                }}
                                            >
                                                Account Balance:
                                            </label>
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
                                            onChange={handleInputChange}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    document.getElementById('saveBill')?.focus();
                                                }
                                            }}
                                            autoComplete='off'
                                            style={{
                                                height: '26px',
                                                fontSize: '0.875rem',
                                                paddingTop: '0.75rem',
                                                width: '100%'
                                            }}
                                        />
                                        <label
                                            className="position-absolute"
                                            style={{
                                                top: '-0.5rem',
                                                left: '0.75rem',
                                                fontSize: '0.75rem',
                                                backgroundColor: 'white',
                                                padding: '0 0.25rem',
                                                color: '#6c757d',
                                                fontWeight: '500'
                                            }}
                                        >
                                            Description:
                                        </label>
                                    </div>
                                </div>

                                <div className="col-12 col-md-4">
                                    <div className="d-flex align-items-center justify-content-end gap-3">
                                        {/* Print After Save Checkbox */}
                                        <div className="form-check mb-0 d-flex align-items-center">
                                            <input
                                                className="form-check-input mt-0"
                                                type="checkbox"
                                                id="printAfterSave"
                                                checked={printAfterSave}
                                                onChange={handlePrintAfterSaveChange}
                                                style={{
                                                    height: '14px',
                                                    width: '14px'
                                                }}
                                            />
                                            <label
                                                className="form-check-label ms-2"
                                                htmlFor="printAfterSave"
                                                style={{
                                                    fontSize: '0.8rem',
                                                    marginBottom: '0'
                                                }}
                                            >
                                                Print after save
                                            </label>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="d-flex gap-2">
                                            <button
                                                type="button"
                                                className="btn btn-secondary btn-sm d-flex align-items-center"
                                                onClick={resetForm}
                                                disabled={isSaving}
                                                style={{
                                                    height: '26px',
                                                    padding: '0 12px',
                                                    fontSize: '0.8rem',
                                                    fontWeight: '500'
                                                }}
                                            >
                                                <i className="bi bi-arrow-counterclockwise me-1" style={{ fontSize: '0.9rem' }}></i> Reset
                                            </button>

                                            <button
                                                type="submit"
                                                className="btn btn-primary btn-sm d-flex align-items-center"
                                                id="saveBill"
                                                onClick={(e) => handleSubmit(e, printAfterSave)}
                                                disabled={isSaving}
                                                style={{
                                                    height: '26px',
                                                    padding: '0 16px',
                                                    fontSize: '0.8rem',
                                                    fontWeight: '500'
                                                }}
                                            >
                                                {isSaving ? (
                                                    <>
                                                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" style={{ width: '10px', height: '10px' }}></span>
                                                        Saving...
                                                    </>
                                                ) : (
                                                    <>
                                                        <i className="bi bi-save me-1" style={{ fontSize: '0.9rem' }}></i> Save
                                                    </>
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
                    <div
                        className="modal fade show"
                        tabIndex="-1"
                        style={{
                            display: 'block',
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 1050
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                                e.preventDefault();
                                handleAccountModalClose();
                            }
                        }}
                    >
                        <div className="modal-dialog modal-xl modal-dialog-centered" style={{ maxWidth: '70%' }}>
                            <div className="modal-content" style={{ height: '400px' }}>
                                <div className="modal-header py-1">
                                    <h5 className="modal-title" id="accountModalLabel" style={{ fontSize: '0.9rem' }}>
                                        Select an Account
                                    </h5>
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
                                                if (firstAccountItem) {
                                                    firstAccountItem.focus();
                                                }
                                            } else if (e.key === 'Enter') {
                                                e.preventDefault();
                                                const firstAccountItem = document.querySelector('.account-item.active');
                                                if (firstAccountItem) {
                                                    const accountId = firstAccountItem.getAttribute('data-account-id');
                                                    const account = accounts.find(a => a._id === accountId);
                                                    if (account) {
                                                        selectAccount(account);
                                                    }
                                                }
                                            } else if (e.key === 'F6') {
                                                e.preventDefault();
                                                // You can add account creation modal here if needed
                                            }
                                        }}
                                        ref={accountSearchRef}
                                        style={{
                                            height: '24px',
                                            fontSize: '0.75rem',
                                            padding: '0.25rem 0.5rem'
                                        }}
                                    />
                                </div>
                                <div className="modal-body p-0">
                                    <div style={{ height: 'calc(400px - 120px)' }}>
                                        <NewVirtualizedAccountList
                                            accounts={accounts}
                                            onAccountClick={(account) => {
                                                selectAccount(account);
                                            }}
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

            <NotificationToast
                show={notification.show}
                message={notification.message}
                type={notification.type}
                onClose={() => setNotification({ ...notification, show: false })}
            />

            {/* Product modal */}
            {showProductModal && (
                <ProductModal onClose={() => setShowProductModal(false)} />
            )}
        </div>
    );
};

export default AddReceipt;