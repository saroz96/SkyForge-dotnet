// import React, { useState, useEffect, useRef } from 'react';
// import { useNavigate } from 'react-router-dom';
// import axios from 'axios';
// import '../../../stylesheet/retailer/purchase/List.css';
// import Header from '../Header';
// import NepaliDate from 'nepali-date-converter';
// import { usePageNotRefreshContext } from '../PageNotRefreshContext';
// import '../../../stylesheet/noDateIcon.css'
// import Loader from '../../Loader';
// import ProductModal from '../dashboard/modals/ProductModal';

// const PurchaseReturnList = () => {
//     const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
//     const currentEnglishDate = new Date().toISOString().split('T')[0];
//     const { draftSave, setDraftSave, clearDraft } = usePageNotRefreshContext();
//     const [showProductModal, setShowProductModal] = useState(false);

//     const [company, setCompany] = useState({
//         dateFormat: 'nepali',
//         vatEnabled: true,
//         fiscalYear: {}
//     });

//     const [data, setData] = useState(() => {
//         if (draftSave && draftSave.purchaseReturnData) {
//             return draftSave.purchaseReturnData;
//         }
//         return {
//             company: null,
//             currentFiscalYear: null,
//             bills: [],
//             fromDate: '',
//             toDate: '',
//             currentCompanyName: ''
//         };
//     });

//     const [searchQuery, setSearchQuery] = useState(() => {
//         if (draftSave && draftSave.purchaseReturnSearch) {
//             return draftSave.purchaseReturnSearch.searchQuery || '';
//         }
//         return '';
//     });

//     const [paymentModeFilter, setPaymentModeFilter] = useState(() => {
//         if (draftSave && draftSave.purchaseReturnSearch) {
//             return draftSave.purchaseReturnSearch.paymentModeFilter || '';
//         }
//         return '';
//     });

//     const [selectedRowIndex, setSelectedRowIndex] = useState(() => {
//         if (draftSave && draftSave.purchaseReturnSearch) {
//             return draftSave.purchaseReturnSearch.selectedRowIndex || 0;
//         }
//         return 0;
//     });

//     // Fetch company and fiscal year info when component mounts
//     useEffect(() => {
//         const fetchInitialData = async () => {
//             try {
//                 const response = await api.get('/api/my-company');
//                 if (response.data.success) {
//                     const { company: companyData, currentFiscalYear } = response.data;

//                     // Set company info
//                     const dateFormat = companyData.dateFormat || 'english';
//                     setCompany({
//                         dateFormat,
//                         isVatExempt: companyData.isVatExempt || false,
//                         vatEnabled: companyData.vatEnabled !== false, // default true
//                         fiscalYear: currentFiscalYear || {}
//                     });

//                     // Check if we have draft dates
//                     const hasDraftDates = draftSave?.purchaseReturnData?.fromDate && draftSave?.purchaseReturnData?.toDate;

//                     if (!hasDraftDates && currentFiscalYear?.startDate) {
//                         // Only set default dates if we don't have draft dates
//                         setData(prev => ({
//                             ...prev,
//                             fromDate: dateFormat === 'nepali'
//                                 ? new NepaliDate(currentFiscalYear.startDate).format('YYYY-MM-DD')
//                                 : new NepaliDate(currentFiscalYear.startDate).format('YYYY-MM-DD'),
//                             toDate: dateFormat === 'nepali' ? currentNepaliDate : currentEnglishDate,
//                             company: companyData,
//                             currentFiscalYear
//                         }));
//                     } else {
//                         // If we have draft data, ensure company info is updated
//                         setData(prev => ({
//                             ...prev,
//                             company: companyData,
//                             currentFiscalYear
//                         }));
//                     }
//                 }
//             } catch (err) {
//                 console.error('Error fetching initial data:', err);
//             }
//         };

//         fetchInitialData();
//     }, []);

//     const [loading, setLoading] = useState(false);
//     const [error, setError] = useState(null);
//     const [totals, setTotals] = useState({
//         subTotal: 0,
//         discount: 0,
//         taxable: 0,
//         vat: 0,
//         roundOff: 0,
//         amount: 0
//     });
//     const [filteredBills, setFilteredBills] = useState([]);

//     const fromDateRef = useRef(null);
//     const toDateRef = useRef(null);
//     const searchInputRef = useRef(null);
//     const paymentModeFilterRef = useRef(null);
//     const generateReportRef = useRef(null);
//     const tableBodyRef = useRef(null);
//     const [shouldFetch, setShouldFetch] = useState(false);
//     const navigate = useNavigate();

//     const api = axios.create({
//         baseURL: process.env.REACT_APP_API_BASE_URL,
//         withCredentials: true,
//     });

//     // Save data and search state to draft context
//     useEffect(() => {
//         setDraftSave({
//             ...draftSave,
//             purchaseReturnData: data,
//             purchaseReturnSearch: {
//                 searchQuery,
//                 paymentModeFilter,
//                 selectedRowIndex,
//                 fromDate: data.fromDate,
//                 toDate: data.toDate
//             }
//         });
//     }, [data, searchQuery, paymentModeFilter, selectedRowIndex, data.fromDate, data.toDate]);

//     // Fetch data when generate report is clicked
//     useEffect(() => {
//         const fetchData = async () => {
//             if (!shouldFetch) return;

//             try {
//                 setLoading(true);
//                 const params = new URLSearchParams();
//                 if (data.fromDate) params.append('fromDate', data.fromDate);
//                 if (data.toDate) params.append('toDate', data.toDate);

//                 const response = await api.get(`/api/retailer/purchase-return/register?${params.toString()}`);
//                 setData(response.data.data);
//                 setError(null);
//                 // Don't reset selection when new data loads if we have a saved position
//                 if (!draftSave?.purchaseReturnSearch?.selectedRowIndex) {
//                     setSelectedRowIndex(0);
//                 }
//             } catch (err) {
//                 setError(err.response?.data?.error || 'Failed to fetch purchase returns');
//             } finally {
//                 setLoading(false);
//                 setShouldFetch(false);
//             }
//         };

//         fetchData();
//     }, [shouldFetch, data.fromDate, data.toDate]);

//     // Filter bills based on search and payment mode
//     useEffect(() => {
//         const filtered = data.bills.filter(bill => {
//             const matchesSearch =
//                 bill.billNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
//                 bill.account?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
//                 bill.user?.name?.toLowerCase().includes(searchQuery.toLowerCase());

//             const matchesPaymentMode =
//                 paymentModeFilter === '' ||
//                 bill.paymentMode?.toLowerCase() === paymentModeFilter.toLowerCase();

//             return matchesSearch && matchesPaymentMode;
//         });

//         setFilteredBills(filtered);

//         // Reset selected row when filters change, but only if we don't have a saved position
//         if (!draftSave?.purchaseReturnSearch?.selectedRowIndex) {
//             setSelectedRowIndex(0);
//         }
//     }, [data.bills, searchQuery, paymentModeFilter]);


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

//     // Calculate totals when filtered bills change
//     useEffect(() => {
//         if (filteredBills.length === 0) {
//             setTotals({
//                 subTotal: 0,
//                 discount: 0,
//                 taxable: 0,
//                 vat: 0,
//                 roundOff: 0,
//                 amount: 0
//             });
//             return;
//         }

//         const newTotals = filteredBills.reduce((acc, bill) => {
//             return {
//                 subTotal: acc.subTotal + (bill.subTotal || 0),
//                 discount: acc.discount + (bill.discountAmount || 0),
//                 taxable: acc.taxable + (bill.taxableAmount || 0),
//                 vat: acc.vat + (bill.vatAmount || 0),
//                 roundOff: acc.roundOff + (bill.roundOffAmount || 0),
//                 amount: acc.amount + (bill.totalAmount || 0)
//             };
//         }, {
//             subTotal: 0,
//             discount: 0,
//             taxable: 0,
//             vat: 0,
//             roundOff: 0,
//             amount: 0
//         });

//         setTotals(newTotals);
//     }, [filteredBills]);

//     // Handle keyboard navigation
//     useEffect(() => {
//         const handleKeyDown = (e) => {
//             if (filteredBills.length === 0) return;

//             // Check if focus is inside an input or select element
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
//                     setSelectedRowIndex(prev => Math.min(filteredBills.length - 1, prev + 1));
//                     break;
//                 default:
//                     break;
//             }
//         };

//         window.addEventListener('keydown', handleKeyDown);
//         return () => window.removeEventListener('keydown', handleKeyDown);
//     }, [filteredBills, selectedRowIndex, navigate]);

//     // Scroll to selected row
//     useEffect(() => {
//         if (tableBodyRef.current && filteredBills.length > 0) {
//             const rows = tableBodyRef.current.querySelectorAll('tr');
//             if (rows.length > selectedRowIndex) {
//                 rows[selectedRowIndex].scrollIntoView({
//                     behavior: 'smooth',
//                     block: 'nearest'
//                 });
//             }
//         }
//     }, [selectedRowIndex, filteredBills]);

//     const handleDateChange = (e) => {
//         const { name, value } = e.target;
//         setData(prev => ({ ...prev, [name]: value }));
//     };

//     const handleSearchChange = (e) => {
//         setSearchQuery(e.target.value);
//     };

//     const handlePaymentModeFilterChange = (e) => {
//         setPaymentModeFilter(e.target.value);
//     };

//     const handleGenerateReport = () => {
//         if (!data.fromDate || !data.toDate) {
//             setError('Please select both from and to dates');
//             return;
//         }
//         setShouldFetch(true);
//     };

//     const handlePrint = (filtered = false) => {
//         const rowsToPrint = filtered ? filteredBills : data.bills;
//         const vatEnabled = data.company?.vatEnabled || false;
//         const isVatExempt = data.company?.isVatExempt || false;
//         const showVatColumns = vatEnabled && !isVatExempt;

//         if (rowsToPrint.length === 0) {
//             alert("No voucher to print");
//             return;
//         }

//         const printWindow = window.open("", "_blank");
//         const printHeader = `
//               <div class="print-header">
//             <h1>${data.currentCompanyName || 'Company Name'}</h1>
//             <p>
//                 ${data.currentCompany?.address || ''}-${data.currentCompany?.ward || ''}, ${data.currentCompany?.city || ''},
//                 TPIN: ${data.currentCompany?.pan || ''}<br>
//             </p>
//             <hr>
//         </div>
//         `;

//         let tableContent = `
//         <style>
//             @page {
//                 size: A4 landscape;
//                 margin: 10mm;
//             }
//             body { 
//                 font-family: Arial, sans-serif; 
//                 font-size: 10px; 
//                 margin: 0;
//                 padding: 10mm;
//             }
//             table { 
//                 width: 100%; 
//                 border-collapse: collapse; 
//                 page-break-inside: auto;
//             }
//             tr { 
//                 page-break-inside: avoid; 
//                 page-break-after: auto; 
//             }
//             th, td { 
//                 border: 1px solid #000; 
//                 padding: 4px; 
//                 text-align: left; 
//                 white-space: nowrap;
//             }
//             th { 
//                 background-color: #f2f2f2 !important; 
//                 -webkit-print-color-adjust: exact; 
//             }
//             .print-header { 
//                 text-align: center; 
//                 margin-bottom: 15px; 
//             }
//             .nowrap {
//                 white-space: nowrap;
//             }
//         </style>
//         ${printHeader}
//         <h1 style="text-align:center;text-decoration:underline;">Purchase Return's Register</h1>
//         <table>
//             <thead>
//                 <tr>
//                     <th class="nowrap">Date</th>
//                     <th class="nowrap">Vch No.</th>
//                     <th class="nowrap">Suppliers Name</th>
//                     <th class="nowrap">Pay Mode</th>
//                     <th class="nowrap">Sub Total</th>
//                     <th class="nowrap">Discount</th>
//                     ${showVatColumns ? `
//                     <th class="nowrap">Taxable</th>
//                     <th class="nowrap">VAT</th>
//                     ` : ''}
//                     <th class="nowrap">Off(-/+)</th>
//                     <th class="nowrap">Total</th>
//                     <th class="nowrap">User</th>
//                 </tr>
//             </thead>
//             <tbody>
//         `;

//         let totals = {
//             subTotal: 0,
//             discount: 0,
//             taxable: 0,
//             vat: 0,
//             roundOff: 0,
//             amount: 0
//         };

//         const billsToPrint = filtered ? filteredBills : data.bills;

//         billsToPrint.forEach(bill => {
//             tableContent += `
//             <tr>
//                 <td class="nowrap">${new Date(bill.date).toLocaleDateString()}</td>
//                 <td class="nowrap">${bill.billNumber}</td>
//                 <td class="nowrap">${bill.account?.name || 'N/A'}</td>
//                 <td class="nowrap">${bill.paymentMode}</td>
//                 <td class="nowrap">${bill.subTotal?.toFixed(2)}</td>
//                 <td class="nowrap">${bill.discountPercentage?.toFixed(2)}% - ${bill.discountAmount?.toFixed(2)}</td>
//                 ${showVatColumns ? `
//                 <td class="nowrap">${bill.taxableAmount?.toFixed(2)}</td>
//                 <td class="nowrap">${bill.vatAmount?.toFixed(2)}</td>
//                 ` : ''}
//                 <td class="nowrap">${bill.roundOffAmount?.toFixed(2)}</td>
//                 <td class="nowrap">${bill.totalAmount?.toFixed(2)}</td>
//                 <td class="nowrap">${bill.user?.name || 'N/A'}</td>
//             </tr>
//             `;

//             totals.subTotal += parseFloat(bill.subTotal || 0);
//             totals.discount += parseFloat(bill.discountAmount || 0);
//             totals.taxable += parseFloat(bill.taxableAmount || 0);
//             totals.vat += parseFloat(bill.vatAmount || 0);
//             totals.roundOff += parseFloat(bill.roundOffAmount || 0);
//             totals.amount += parseFloat(bill.totalAmount || 0);
//         });

//         // Add final totals row
//         tableContent += `
//             <tr style="font-weight:bold; border-top: 2px solid #000;">
//                 <td colspan="4">Grand Totals</td>
//                 <td>${totals.subTotal.toFixed(2)}</td>
//                 <td>${totals.discount.toFixed(2)}</td>
//                 ${showVatColumns ? `
//                 <td>${totals.taxable.toFixed(2)}</td>
//                 <td>${totals.vat.toFixed(2)}</td>
//                 ` : ''}
//                 <td>${totals.roundOff.toFixed(2)}</td>
//                 <td>${totals.amount.toFixed(2)}</td>
//                 <td></td>
//             </tr>
//             </tbody>
//         </table>
//         `;

//         printWindow.document.write(`
//         <html>
//             <head>
//                 <title>Purchase Return's Register</title>
//             </head>
//             <body>
//                 ${tableContent}
//                 <script>
//                     window.onload = function() {
//                         setTimeout(function() {
//                             window.print();
//                         }, 200);
//                     };
//                 <\/script>
//             </body>
//         </html>
//         `);
//         printWindow.document.close();
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

//     const handleRowClick = (index) => {
//         setSelectedRowIndex(index);
//     };

//     const handleRowDoubleClick = (billId) => {
//         navigate(`/retailer/purchase-return/${filteredBills[selectedRowIndex]._id}/print`);
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
//                 // If no nextFieldId provided, try to find the next focusable element
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

//     if (loading) return <Loader />;

//     if (error) {
//         return <div className="alert alert-danger text-center py-5">{error}</div>;
//     }

//     return (
//         <div className="container-fluid">
//             <Header />
//             <div className="card shadow">
//                 <div className="card-header bg-white py-3">
//                     <h1 className="h3 mb-0 text-center text-primary">Purchase Return's Register</h1>
//                 </div>

//                 <div className="card-body">
//                     {/* Search and Filter Section */}
//                     <div className="row mb-4">
//                         <div className="col-md-8">
//                             <div className="row g-3">
//                                 {/* Date Range Row */}
//                                 <div className="col">
//                                     <label htmlFor="fromDate" className="form-label">From Date</label>
//                                     <input
//                                         type="text"
//                                         name="fromDate"
//                                         id="fromDate"
//                                         ref={company.dateFormat === 'nepali' ? fromDateRef : null}
//                                         className="form-control no-date-icon"
//                                         value={data.fromDate}
//                                         onChange={handleDateChange}
//                                         required
//                                         autoComplete='off'
//                                         onKeyDown={(e) => handleKeyDown(e, 'toDate')}
//                                     />
//                                 </div>
//                                 <div className="col">
//                                     <label htmlFor="toDate" className="form-label">To Date</label>
//                                     <input
//                                         type="text"
//                                         name="toDate"
//                                         id="toDate"
//                                         ref={toDateRef}
//                                         className="form-control no-date-icon"
//                                         value={data.toDate}
//                                         onChange={handleDateChange}
//                                         required
//                                         autoComplete='off'
//                                         onKeyDown={(e) => handleKeyDown(e, 'generateReport')}
//                                     />
//                                 </div>
//                                 <div className="col-md-2 d-flex align-items-end">
//                                     <button
//                                         type="button"
//                                         id="generateReport"
//                                         ref={generateReportRef}
//                                         className="btn btn-primary w-100"
//                                         onClick={handleGenerateReport}
//                                     >
//                                         <i className="fas fa-chart-line me-2" id='generateReport'></i>Generate
//                                     </button>
//                                 </div>

//                                 {/* Search Row */}
//                                 <div className="col-md-4">
//                                     <label htmlFor="searchInput" className="form-label">Search</label>
//                                     <div className="input-group">
//                                         <input
//                                             type="text"
//                                             className="form-control"
//                                             id="searchInput"
//                                             ref={searchInputRef}
//                                             placeholder="Search bills..."
//                                             value={searchQuery}
//                                             onChange={handleSearchChange}
//                                             disabled={data.bills.length === 0}
//                                             autoComplete='off'
//                                         />
//                                         <button
//                                             className="btn btn-outline-secondary"
//                                             type="button"
//                                             onClick={() => setSearchQuery('')}
//                                             disabled={data.bills.length === 0}
//                                         >
//                                             <i className="fas fa-times"></i>
//                                         </button>
//                                     </div>
//                                 </div>

//                                 {/* Payment Mode Filter Row */}
//                                 <div className="col">
//                                     <label htmlFor="paymentModeFilter" className="form-label">Payment Mode</label>
//                                     <select
//                                         className="form-select"
//                                         id="paymentModeFilter"
//                                         ref={paymentModeFilterRef}
//                                         value={paymentModeFilter}
//                                         onChange={handlePaymentModeFilterChange}
//                                         disabled={data.bills.length === 0}
//                                     >
//                                         <option value="">All</option>
//                                         <option value="cash">Cash</option>
//                                         <option value="credit">Credit</option>
//                                     </select>
//                                 </div>
//                             </div>
//                         </div>

//                         {/* Action Buttons */}
//                         <div className="col-md-4 d-flex align-items-end justify-content-end gap-2">
//                             <button
//                                 className="btn btn-primary"
//                                 onClick={() => navigate('/retailer/purchase-return')}
//                             >
//                                 <i className="fas fa-receipt me-2"></i>New Voucher
//                             </button>
//                             <button
//                                 className="btn btn-secondary"
//                                 onClick={() => handlePrint(false)}
//                                 disabled={data.bills.length === 0}
//                             >
//                                 <i className="fas fa-print"></i>Print All
//                             </button>
//                             <button
//                                 className="btn btn-secondary"
//                                 onClick={() => handlePrint(true)}
//                                 disabled={data.bills.length === 0}
//                             >
//                                 <i className="fas fa-filter"></i>Print Filtered
//                             </button>
//                         </div>
//                     </div>

//                     {data.bills.length === 0 ? (
//                         <div className="alert alert-info text-center py-3">
//                             <i className="fas fa-info-circle me-2"></i>
//                             Please select date range and click "Generate Report" to view data
//                         </div>
//                     ) : (
//                         <>
//                             {/* Bills Table */}
//                             <div className="table-responsive">
//                                 <table className="table table-hover">
//                                     <thead>
//                                         <tr>
//                                             <th>Date</th>
//                                             <th>Vch. No.</th>
//                                             <th>Suppliers Name</th>
//                                             <th>Pay Mode</th>
//                                             <th className="text-end">Sub Total</th>
//                                             <th className="text-end">Discount</th>
//                                             {data.company.vatEnabled && !data.company.isVatExempt && (
//                                                 <>
//                                                     <th className="text-end">Taxable</th>
//                                                     <th className="text-end">VAT</th>
//                                                 </>
//                                             )}
//                                             <th className="text-end">Off(-/+)</th>
//                                             <th className="text-end">Total</th>
//                                             <th>User</th>
//                                             <th>Actions</th>
//                                         </tr>
//                                     </thead>
//                                     <tbody ref={tableBodyRef}>
//                                         {filteredBills.map((bill, index) => (
//                                             <tr
//                                                 key={bill._id}
//                                                 className={`bill-row ${selectedRowIndex === index ? 'highlighted-row' : ''}`}
//                                                 onClick={() => handleRowClick(index)}
//                                                 onDoubleClick={() => handleRowDoubleClick(bill._id)}
//                                                 style={{ cursor: 'pointer' }}
//                                             >
//                                                 <td className="compact-cell">{new NepaliDate(bill.date).format('YYYY-MM-DD')}</td>
//                                                 <td className="compact-cell">{bill.billNumber}</td>
//                                                 <td className="compact-cell">{bill.account?.name || 'N/A'}</td>
//                                                 <td className="compact-cell">{bill.paymentMode}</td>
//                                                 <td className="compact-cell text-end">{formatCurrency(bill.subTotal)}</td>
//                                                 <td className="compact-cell text-end">
//                                                     {formatCurrency(bill.discountPercentage)}% - {formatCurrency(bill.discountAmount)}
//                                                 </td>
//                                                 {data.company.vatEnabled && !data.company.isVatExempt && (
//                                                     <>
//                                                         <td className="compact-cell text-end">{formatCurrency(bill.taxableAmount)}</td>
//                                                         <td className="compact-cell text-end">
//                                                             {formatCurrency(bill.vatAmount)}
//                                                         </td>
//                                                     </>
//                                                 )}
//                                                 <td className="compact-cell text-end">{formatCurrency(bill.roundOffAmount)}</td>
//                                                 <td className="compact-cell text-end">{formatCurrency(bill.totalAmount)}</td>
//                                                 <td>{bill.user?.name || 'User Not Found'}</td>
//                                                 <td className='compact-cell'>
//                                                     <div className="d-flex gap-2">
//                                                         <button
//                                                             className="btn btn-sm btn-info"
//                                                             onClick={() => navigate(`/retailer/purchase-return/${bill._id}/print`)}
//                                                         >
//                                                             <i className="fas fa-eye"></i>View
//                                                         </button>
//                                                         <button
//                                                             className="btn btn-sm btn-warning"
//                                                             onClick={() => navigate(`/retailer/purchase-return/edit/${bill._id}`)}
//                                                         >
//                                                             <i className="fas fa-edit"></i>Edit
//                                                         </button>
//                                                     </div>
//                                                 </td>
//                                             </tr>
//                                         ))}
//                                     </tbody>
//                                     <tfoot>
//                                         <tr className="fw-bold">
//                                             <td colSpan="4">Total:</td>
//                                             <td className="text-end">{formatCurrency(totals.subTotal)}</td>
//                                             <td className="text-end">{formatCurrency(totals.discount)}</td>
//                                             {data.company.vatEnabled && !data.company.isVatExempt && (
//                                                 <>
//                                                     <td className="text-end">{formatCurrency(totals.taxable)}</td>
//                                                     <td className="text-end">{formatCurrency(totals.vat)}</td>
//                                                 </>
//                                             )}
//                                             <td className="text-end">{formatCurrency(totals.roundOff)}</td>
//                                             <td className="text-end">{formatCurrency(totals.amount)}</td>
//                                             <td colSpan="2"></td>
//                                         </tr>
//                                     </tfoot>
//                                 </table>
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

// export default PurchaseReturnList;


//-----------------------------------------------------------------end

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../../../stylesheet/retailer/purchase/List.css';
import Header from '../Header';
import NepaliDate from 'nepali-date-converter';
import { usePageNotRefreshContext } from '../PageNotRefreshContext';
import '../../../stylesheet/noDateIcon.css';
import Loader from '../../Loader';
import ProductModal from '../dashboard/modals/ProductModal';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

const PurchaseReturnList = () => {
    const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
    const currentEnglishDate = new Date().toISOString().split('T')[0];

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

    const { draftSave, setDraftSave, clearDraft } = usePageNotRefreshContext();
    const [showProductModal, setShowProductModal] = useState(false);

    const [company, setCompany] = useState({
        dateFormat: 'nepali',
        isVatExempt: false,
        vatEnabled: true,
        fiscalYear: {}
    });

    const [data, setData] = useState(() => {
        if (draftSave && draftSave.purchaseReturnData) {
            return draftSave.purchaseReturnData;
        }
        return {
            company: null,
            currentFiscalYear: null,
            bills: [],
            fromDate: '',
            toDate: '',
            currentCompanyName: ''
        };
    });

    const [searchQuery, setSearchQuery] = useState(() => {
        if (draftSave && draftSave.purchaseReturnSearch) {
            return draftSave.purchaseReturnSearch.searchQuery || '';
        }
        return '';
    });

    const [paymentModeFilter, setPaymentModeFilter] = useState(() => {
        if (draftSave && draftSave.purchaseReturnSearch) {
            return draftSave.purchaseReturnSearch.paymentModeFilter || '';
        }
        return '';
    });

    const [selectedRowIndex, setSelectedRowIndex] = useState(() => {
        if (draftSave && draftSave.purchaseReturnSearch) {
            return draftSave.purchaseReturnSearch.selectedRowIndex || 0;
        }
        return 0;
    });

    // Column resizing state
    const [columnWidths, setColumnWidths] = useState({
        date: 90,
        vchNo: 120,
        supplierName: 180,
        payMode: 80,
        subTotal: 80,
        discount: 120,
        taxable: 70,
        vat: 70,
        roundOff: 90,
        total: 100,
        user: 100,
        actions: 140
    });

    const [isResizing, setIsResizing] = useState(false);
    const [resizingColumn, setResizingColumn] = useState(null);
    const [startX, setStartX] = useState(0);
    const [startWidth, setStartWidth] = useState(0);

    // Fetch company and fiscal year info when component mounts
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const response = await api.get('/api/my-company');
                if (response.data.success) {
                    const { company: companyData, currentFiscalYear } = response.data;

                    const dateFormat = companyData.dateFormat || 'english';
                    setCompany({
                        dateFormat,
                        isVatExempt: companyData.isVatExempt || false,
                        vatEnabled: companyData.vatEnabled !== false,
                        fiscalYear: currentFiscalYear || {}
                    });

                    const hasDraftDates = draftSave?.purchaseReturnData?.fromDate && draftSave?.purchaseReturnData?.toDate;

                    if (!hasDraftDates && currentFiscalYear?.startDate) {
                        setData(prev => ({
                            ...prev,
                            fromDate: dateFormat === 'nepali'
                                ? new NepaliDate(currentFiscalYear.startDate).format('YYYY-MM-DD')
                                : new NepaliDate(currentFiscalYear.startDate).format('YYYY-MM-DD'),
                            toDate: dateFormat === 'nepali' ? currentNepaliDate : currentEnglishDate,
                            company: companyData,
                            currentFiscalYear
                        }));
                    } else {
                        setData(prev => ({
                            ...prev,
                            company: companyData,
                            currentFiscalYear
                        }));
                    }
                }
            } catch (err) {
                console.error('Error fetching initial data:', err);
            }
        };

        fetchInitialData();
    }, []);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [totals, setTotals] = useState({
        subTotal: 0,
        discount: 0,
        taxable: 0,
        vat: 0,
        roundOff: 0,
        amount: 0
    });
    const [filteredBills, setFilteredBills] = useState([]);

    const fromDateRef = useRef(null);
    const toDateRef = useRef(null);
    const searchInputRef = useRef(null);
    const paymentModeFilterRef = useRef(null);
    const generateReportRef = useRef(null);
    const tableBodyRef = useRef(null);
    const [shouldFetch, setShouldFetch] = useState(false);
    const navigate = useNavigate();

    const api = axios.create({
        baseURL: process.env.REACT_APP_API_BASE_URL,
        withCredentials: true,
    });

    // Save data and search state to draft context
    useEffect(() => {
        setDraftSave({
            ...draftSave,
            purchaseReturnData: data,
            purchaseReturnSearch: {
                searchQuery,
                paymentModeFilter,
                selectedRowIndex,
                fromDate: data.fromDate,
                toDate: data.toDate
            }
        });
    }, [data, searchQuery, paymentModeFilter, selectedRowIndex, data.fromDate, data.toDate]);

    // Save/load column widths
    useEffect(() => {
        const savedWidths = localStorage.getItem('purchaseReturnTableColumnWidths');
        if (savedWidths) {
            try {
                setColumnWidths(JSON.parse(savedWidths));
            } catch (e) {
                console.error('Failed to load column widths:', e);
            }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('purchaseReturnTableColumnWidths', JSON.stringify(columnWidths));
    }, [columnWidths]);

    // Fetch data when generate report is clicked
    useEffect(() => {
        const fetchData = async () => {
            if (!shouldFetch) return;

            try {
                setLoading(true);
                const params = new URLSearchParams();
                if (data.fromDate) params.append('fromDate', data.fromDate);
                if (data.toDate) params.append('toDate', data.toDate);

                const response = await api.get(`/api/retailer/purchase-return/register?${params.toString()}`);
                setData(response.data.data);
                setError(null);
                if (!draftSave?.purchaseReturnSearch?.selectedRowIndex) {
                    setSelectedRowIndex(0);
                }
            } catch (err) {
                setError(err.response?.data?.error || 'Failed to fetch purchase returns');
            } finally {
                setLoading(false);
                setShouldFetch(false);
            }
        };

        fetchData();
    }, [shouldFetch, data.fromDate, data.toDate]);

    // Filter bills based on search and payment mode
    useEffect(() => {
        const filtered = data.bills.filter(bill => {
            const matchesSearch =
                bill.billNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                bill.account?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                bill.user?.name?.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesPaymentMode =
                paymentModeFilter === '' ||
                bill.paymentMode?.toLowerCase() === paymentModeFilter.toLowerCase();

            return matchesSearch && matchesPaymentMode;
        });

        setFilteredBills(filtered);

        if (!draftSave?.purchaseReturnSearch?.selectedRowIndex) {
            setSelectedRowIndex(0);
        }
    }, [data.bills, searchQuery, paymentModeFilter]);

    useEffect(() => {
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

    // Calculate totals when filtered bills change
    useEffect(() => {
        if (filteredBills.length === 0) {
            setTotals({
                subTotal: 0,
                discount: 0,
                taxable: 0,
                vat: 0,
                roundOff: 0,
                amount: 0
            });
            return;
        }

        const newTotals = filteredBills.reduce((acc, bill) => {
            return {
                subTotal: acc.subTotal + (bill.subTotal || 0),
                discount: acc.discount + (bill.discountAmount || 0),
                taxable: acc.taxable + (bill.taxableAmount || 0),
                vat: acc.vat + (bill.vatAmount || 0),
                roundOff: acc.roundOff + (bill.roundOffAmount || 0),
                amount: acc.amount + (bill.totalAmount || 0)
            };
        }, {
            subTotal: 0,
            discount: 0,
            taxable: 0,
            vat: 0,
            roundOff: 0,
            amount: 0
        });

        setTotals(newTotals);
    }, [filteredBills]);

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (filteredBills.length === 0) return;

            const activeElement = document.activeElement;
            if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'SELECT') {
                return;
            }

            switch (e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    setSelectedRowIndex(prev => Math.max(0, prev - 1));
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    setSelectedRowIndex(prev => Math.min(filteredBills.length - 1, prev + 1));
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [filteredBills, selectedRowIndex, navigate]);

    const handleDateChange = (e) => {
        const { name, value } = e.target;
        setData(prev => ({ ...prev, [name]: value }));
    };

    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value);
    };

    const handlePaymentModeFilterChange = (e) => {
        setPaymentModeFilter(e.target.value);
    };

    const handleGenerateReport = () => {
        if (!data.fromDate || !data.toDate) {
            setError('Please select both from and to dates');
            return;
        }
        setShouldFetch(true);
    };

    const handlePrint = (filtered = false) => {
        const rowsToPrint = filtered ? filteredBills : data.bills;
        const vatEnabled = data.company?.vatEnabled || false;
        const isVatExempt = data.company?.isVatExempt || false;
        const showVatColumns = vatEnabled && !isVatExempt;

        if (rowsToPrint.length === 0) {
            alert("No voucher to print");
            return;
        }

        const printWindow = window.open("", "_blank");
        const printHeader = `
              <div class="print-header">
            <h1>${data.currentCompanyName || 'Company Name'}</h1>
            <p>
                ${data.currentCompany?.address || ''}-${data.currentCompany?.ward || ''}, ${data.currentCompany?.city || ''},
                TPIN: ${data.currentCompany?.pan || ''}<br>
            </p>
            <hr>
        </div>
        `;

        let tableContent = `
        <style>
            @page {
                size: A4 landscape;
                margin: 10mm;
            }
            body { 
                font-family: Arial, sans-serif; 
                font-size: 10px; 
                margin: 0;
                padding: 10mm;
            }
            table { 
                width: 100%; 
                border-collapse: collapse; 
                page-break-inside: auto;
            }
            tr { 
                page-break-inside: avoid; 
                page-break-after: auto; 
            }
            th, td { 
                border: 1px solid #000; 
                padding: 4px; 
                text-align: left; 
                white-space: nowrap;
            }
            th { 
                background-color: #f2f2f2 !important; 
                -webkit-print-color-adjust: exact; 
            }
            .print-header { 
                text-align: center; 
                margin-bottom: 15px; 
            }
            .nowrap {
                white-space: nowrap;
            }
        </style>
        ${printHeader}
        <h1 style="text-align:center;text-decoration:underline;">Purchase Return's Register</h1>
        <table>
            <thead>
                <tr>
                    <th class="nowrap">Date</th>
                    <th class="nowrap">Vch No.</th>
                    <th class="nowrap">Suppliers Name</th>
                    <th class="nowrap">Pay Mode</th>
                    <th class="nowrap">Sub Total</th>
                    <th class="nowrap">Discount</th>
                    ${showVatColumns ? `
                    <th class="nowrap">Taxable</th>
                    <th class="nowrap">VAT</th>
                    ` : ''}
                    <th class="nowrap">Off(-/+)</th>
                    <th class="nowrap">Total</th>
                    <th class="nowrap">User</th>
                </tr>
            </thead>
            <tbody>
        `;

        let totals = {
            subTotal: 0,
            discount: 0,
            taxable: 0,
            vat: 0,
            roundOff: 0,
            amount: 0
        };

        const billsToPrint = filtered ? filteredBills : data.bills;

        billsToPrint.forEach(bill => {
            tableContent += `
            <tr>
                <td class="nowrap">${new Date(bill.date).toLocaleDateString()}</td>
                <td class="nowrap">${bill.billNumber}</td>
                <td class="nowrap">${bill.account?.name || 'N/A'}</td>
                <td class="nowrap">${bill.paymentMode}</td>
                <td class="nowrap">${bill.subTotal?.toFixed(2)}</td>
                <td class="nowrap">${bill.discountPercentage?.toFixed(2)}% - ${bill.discountAmount?.toFixed(2)}</td>
                ${showVatColumns ? `
                <td class="nowrap">${bill.taxableAmount?.toFixed(2)}</td>
                <td class="nowrap">${bill.vatAmount?.toFixed(2)}</td>
                ` : ''}
                <td class="nowrap">${bill.roundOffAmount?.toFixed(2)}</td>
                <td class="nowrap">${bill.totalAmount?.toFixed(2)}</td>
                <td class="nowrap">${bill.user?.name || 'N/A'}</td>
            </tr>
            `;

            totals.subTotal += parseFloat(bill.subTotal || 0);
            totals.discount += parseFloat(bill.discountAmount || 0);
            totals.taxable += parseFloat(bill.taxableAmount || 0);
            totals.vat += parseFloat(bill.vatAmount || 0);
            totals.roundOff += parseFloat(bill.roundOffAmount || 0);
            totals.amount += parseFloat(bill.totalAmount || 0);
        });

        tableContent += `
            <tr style="font-weight:bold; border-top: 2px solid #000;">
                <td colspan="4">Grand Totals</td>
                <td>${totals.subTotal.toFixed(2)}</td>
                <td>${totals.discount.toFixed(2)}</td>
                ${showVatColumns ? `
                <td>${totals.taxable.toFixed(2)}</td>
                <td>${totals.vat.toFixed(2)}</td>
                ` : ''}
                <td>${totals.roundOff.toFixed(2)}</td>
                <td>${totals.amount.toFixed(2)}</td>
                <td></td>
            </tr>
            </tbody>
        </table>
        `;

        printWindow.document.write(`
        <html>
            <head>
                <title>Purchase Return's Register</title>
            </head>
            <body>
                ${tableContent}
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                        }, 200);
                    };
                <\/script>
            </body>
        </html>
        `);
        printWindow.document.close();
    };

    const formatCurrency = useCallback((num) => {
        const number = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num) || 0;
        if (company.dateFormat === 'nepali') {
            return number.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        }
        return number.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }, [company.dateFormat]);

    const handleRowClick = useCallback((index) => {
        setSelectedRowIndex(index);
    }, []);

    const handleRowDoubleClick = useCallback((billId) => {
        navigate(`/retailer/purchase-return/${filteredBills[selectedRowIndex]._id}/print`);
    }, [navigate, filteredBills, selectedRowIndex]);

    const handleKeyDown = (e, nextFieldId) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (nextFieldId) {
                const nextField = document.getElementById(nextFieldId);
                if (nextField) {
                    nextField.focus();
                }
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

    // Shallow equal function for memoization
    function shallowEqual(objA, objB) {
        if (objA === objB) return true;

        if (typeof objA !== 'object' || objA === null ||
            typeof objB !== 'object' || objB === null) {
            return false;
        }

        const keysA = Object.keys(objA);
        const keysB = Object.keys(objB);

        if (keysA.length !== keysB.length) return false;

        for (let i = 0; i < keysA.length; i++) {
            if (!objB.hasOwnProperty(keysA[i]) || objA[keysA[i]] !== objB[keysA[i]]) {
                return false;
            }
        }

        return true;
    }

    // Resize Handle Component
    const ResizeHandle = React.memo(({ onResizeStart, left, columnName }) => {
        return (
            <div
                className="resize-handle"
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
                onMouseDown={(e) => {
                    e.preventDefault();
                    onResizeStart(e, columnName);
                }}
            />
        );
    });

    // Table Header Component
    const TableHeader = React.memo(() => {
        const showVatColumns = data.company?.vatEnabled && !data.company?.isVatExempt;

        const totalWidth = columnWidths.date + columnWidths.vchNo + columnWidths.supplierName +
            columnWidths.payMode + columnWidths.subTotal + columnWidths.discount +
            columnWidths.roundOff + columnWidths.total + columnWidths.user +
            columnWidths.actions + (showVatColumns ? (columnWidths.taxable + columnWidths.vat) : 0);

        const handleResizeStart = (e, columnName) => {
            setIsResizing(true);
            setResizingColumn(columnName);
            setStartX(e.clientX);
            setStartWidth(columnWidths[columnName]);
            e.preventDefault();
        };

        return (
            <div
                className="d-flex bg-light border-bottom sticky-top"
                style={{
                    zIndex: 2,
                    height: '28px',
                    minWidth: `${totalWidth}px`,
                    userSelect: isResizing ? 'none' : 'auto'
                }}
                onMouseMove={(e) => {
                    if (isResizing && resizingColumn) {
                        const diff = e.clientX - startX;
                        const newWidth = Math.max(60, startWidth + diff);
                        setColumnWidths(prev => ({
                            ...prev,
                            [resizingColumn]: newWidth
                        }));
                    }
                }}
                onMouseUp={() => {
                    if (isResizing) {
                        setIsResizing(false);
                        setResizingColumn(null);
                    }
                }}
                onMouseLeave={() => {
                    if (isResizing) {
                        setIsResizing(false);
                        setResizingColumn(null);
                    }
                }}
            >
                {/* Date */}
                <div
                    className="d-flex align-items-center justify-content-center px-1 border-end position-relative"
                    style={{
                        width: `${columnWidths.date}px`,
                        flexShrink: 0,
                        minWidth: '60px'
                    }}
                >
                    <strong style={{ fontSize: '0.75rem' }}>Date</strong>
                    <ResizeHandle
                        onResizeStart={handleResizeStart}
                        left={columnWidths.date - 2}
                        columnName="date"
                    />
                </div>

                {/* Vch No. */}
                <div
                    className="d-flex align-items-center px-1 border-end position-relative"
                    style={{
                        width: `${columnWidths.vchNo}px`,
                        flexShrink: 0,
                        minWidth: '60px'
                    }}
                >
                    <strong style={{ fontSize: '0.75rem' }}>Vch No.</strong>
                    <ResizeHandle
                        onResizeStart={handleResizeStart}
                        left={columnWidths.vchNo - 3}
                        columnName="vchNo"
                    />
                </div>

                {/* Supplier Name */}
                <div
                    className="d-flex align-items-center px-1 border-end position-relative"
                    style={{
                        width: `${columnWidths.supplierName}px`,
                        flexShrink: 0,
                        minWidth: '100px'
                    }}
                >
                    <strong style={{ fontSize: '0.75rem' }}>Supplier Name</strong>
                    <ResizeHandle
                        onResizeStart={handleResizeStart}
                        left={columnWidths.supplierName - 3}
                        columnName="supplierName"
                    />
                </div>

                {/* Pay Mode */}
                <div
                    className="d-flex align-items-center px-1 border-end position-relative"
                    style={{
                        width: `${columnWidths.payMode}px`,
                        flexShrink: 0,
                        minWidth: '60px'
                    }}
                >
                    <strong style={{ fontSize: '0.75rem' }}>Pay Mode</strong>
                    <ResizeHandle
                        onResizeStart={handleResizeStart}
                        left={columnWidths.payMode - 2}
                        columnName="payMode"
                    />
                </div>

                {/* Sub Total */}
                <div
                    className="d-flex align-items-center justify-content-end px-1 border-end position-relative"
                    style={{
                        width: `${columnWidths.subTotal}px`,
                        flexShrink: 0,
                        minWidth: '80px'
                    }}
                >
                    <strong style={{ fontSize: '0.75rem' }}>Sub Total</strong>
                    <ResizeHandle
                        onResizeStart={handleResizeStart}
                        left={columnWidths.subTotal - 2}
                        columnName="subTotal"
                    />
                </div>

                {/* Discount */}
                <div
                    className="d-flex align-items-center justify-content-end px-1 border-end position-relative"
                    style={{
                        width: `${columnWidths.discount}px`,
                        flexShrink: 0,
                        minWidth: '80px'
                    }}
                >
                    <strong style={{ fontSize: '0.75rem' }}>Discount</strong>
                    <ResizeHandle
                        onResizeStart={handleResizeStart}
                        left={columnWidths.discount - 2}
                        columnName="discount"
                    />
                </div>

                {/* VAT Columns - Conditionally rendered */}
                {showVatColumns && (
                    <>
                        <div
                            className="d-flex align-items-center justify-content-end px-1 border-end position-relative"
                            style={{
                                width: `${columnWidths.taxable}px`,
                                flexShrink: 0,
                                minWidth: '50px'
                            }}
                        >
                            <strong style={{ fontSize: '0.75rem' }}>Taxable</strong>
                            <ResizeHandle
                                onResizeStart={handleResizeStart}
                                left={columnWidths.taxable - 1}
                                columnName="taxable"
                            />
                        </div>

                        <div
                            className="d-flex align-items-center justify-content-end px-1 border-end position-relative"
                            style={{
                                width: `${columnWidths.vat}px`,
                                flexShrink: 0,
                                minWidth: '60px'
                            }}
                        >
                            <strong style={{ fontSize: '0.75rem' }}>VAT</strong>
                            <ResizeHandle
                                onResizeStart={handleResizeStart}
                                left={columnWidths.vat - 1}
                                columnName="vat"
                            />
                        </div>
                    </>
                )}

                {/* Round Off */}
                <div
                    className="d-flex align-items-center justify-content-end px-1 border-end position-relative"
                    style={{
                        width: `${columnWidths.roundOff}px`,
                        flexShrink: 0,
                        minWidth: '80px'
                    }}
                >
                    <strong style={{ fontSize: '0.75rem' }}>Off(-/+)</strong>
                    <ResizeHandle
                        onResizeStart={handleResizeStart}
                        left={columnWidths.roundOff - 2}
                        columnName="roundOff"
                    />
                </div>

                {/* Total */}
                <div
                    className="d-flex align-items-center justify-content-end px-1 border-end position-relative"
                    style={{
                        width: `${columnWidths.total}px`,
                        flexShrink: 0,
                        minWidth: '80px'
                    }}
                >
                    <strong style={{ fontSize: '0.75rem' }}>Total</strong>
                    <ResizeHandle
                        onResizeStart={handleResizeStart}
                        left={columnWidths.total - 2}
                        columnName="total"
                    />
                </div>

                {/* User */}
                <div
                    className="d-flex align-items-center px-1 border-end position-relative"
                    style={{
                        width: `${columnWidths.user}px`,
                        flexShrink: 0,
                        minWidth: '80px'
                    }}
                >
                    <strong style={{ fontSize: '0.75rem' }}>User</strong>
                    <ResizeHandle
                        onResizeStart={handleResizeStart}
                        left={columnWidths.user - 2}
                        columnName="user"
                    />
                </div>

                {/* Actions */}
                <div
                    className="d-flex align-items-center px-1 position-relative"
                    style={{
                        width: `${columnWidths.actions}px`,
                        flexShrink: 0,
                        minWidth: '100px'
                    }}
                >
                    <strong style={{ fontSize: '0.75rem' }}>Actions</strong>
                    <ResizeHandle
                        onResizeStart={handleResizeStart}
                        left={columnWidths.actions - 2}
                        columnName="actions"
                    />
                </div>

                {/* Resizing indicator overlay */}
                {isResizing && (
                    <div
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 1000,
                            cursor: 'col-resize'
                        }}
                    />
                )}
            </div>
        );
    });

    // Table Row Component
    const TableRow = React.memo(({ index, style, data: rowData }) => {
        const { bills, selectedRowIndex, formatCurrency, navigate } = rowData;
        const bill = bills[index];

        const handleRowClick = () => {
            rowData.handleRowClick(index);
        };

        const handleDoubleClick = () => {
            navigate(`/retailer/purchase-return/${bill._id}/print`);
        };

        const handleViewClick = (e) => {
            e.stopPropagation();
            navigate(`/retailer/purchase-return/${bill._id}/print`);
        };

        const handleEditClick = (e) => {
            e.stopPropagation();
            navigate(`/retailer/purchase-return/edit/${bill._id}`);
        };

        if (!bill) return null;

        const isSelected = selectedRowIndex === index;
        const showVatColumns = data.company?.vatEnabled && !data.company?.isVatExempt;

        return (
            <div
                style={{
                    ...style,
                    display: 'flex',
                    alignItems: 'center',
                    height: '28px',
                    minHeight: '28px',
                    padding: '0',
                    borderBottom: '1px solid #dee2e6',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? '#e7f3ff' : (index % 2 === 0 ? '#f8f9fa' : 'white')
                }}
                onClick={handleRowClick}
                onDoubleClick={handleDoubleClick}
            >
                {/* Date */}
                <div
                    className="d-flex align-items-center justify-content-center px-1 border-end"
                    style={{
                        width: `${columnWidths.date}px`,
                        flexShrink: 0,
                        height: '100%'
                    }}
                >
                    <span style={{ fontSize: '0.75rem' }}>
                        {new NepaliDate(bill.date).format('YYYY-MM-DD')}
                    </span>
                </div>

                {/* Vch No. */}
                <div
                    className="d-flex align-items-center px-1 border-end"
                    style={{
                        width: `${columnWidths.vchNo}px`,
                        flexShrink: 0,
                        height: '100%',
                        overflow: 'hidden'
                    }}
                >
                    <span style={{ fontSize: '0.75rem' }}>
                        {bill.billNumber}
                    </span>
                </div>

                {/* Supplier Name */}
                <div
                    className="d-flex align-items-center px-1 border-end"
                    style={{
                        width: `${columnWidths.supplierName}px`,
                        flexShrink: 0,
                        height: '100%',
                        overflow: 'hidden'
                    }}
                    title={bill.account?.name || 'N/A'}
                >
                    <span style={{ fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {bill.account?.name || 'N/A'}
                    </span>
                </div>

                {/* Pay Mode */}
                <div
                    className="d-flex align-items-center px-1 border-end"
                    style={{
                        width: `${columnWidths.payMode}px`,
                        flexShrink: 0,
                        height: '100%'
                    }}
                >
                    <span style={{ fontSize: '0.75rem' }}>
                        {bill.paymentMode}
                    </span>
                </div>

                {/* Sub Total */}
                <div
                    className="d-flex align-items-center justify-content-end px-1 border-end"
                    style={{
                        width: `${columnWidths.subTotal}px`,
                        flexShrink: 0,
                        height: '100%'
                    }}
                >
                    <span style={{ fontSize: '0.75rem' }}>
                        {formatCurrency(bill.subTotal)}
                    </span>
                </div>

                {/* Discount */}
                <div
                    className="d-flex align-items-center justify-content-end px-1 border-end"
                    style={{
                        width: `${columnWidths.discount}px`,
                        flexShrink: 0,
                        height: '100%'
                    }}
                >
                    <span style={{ fontSize: '0.75rem' }}>
                        {formatCurrency(bill.discountPercentage)}% - {formatCurrency(bill.discountAmount)}
                    </span>
                </div>

                {/* VAT Columns - Conditionally rendered */}
                {showVatColumns && (
                    <>
                        <div
                            className="d-flex align-items-center justify-content-end px-1 border-end"
                            style={{
                                width: `${columnWidths.taxable}px`,
                                flexShrink: 0,
                                height: '100%'
                            }}
                        >
                            <span style={{ fontSize: '0.75rem' }}>
                                {formatCurrency(bill.taxableAmount)}
                            </span>
                        </div>

                        <div
                            className="d-flex align-items-center justify-content-end px-1 border-end"
                            style={{
                                width: `${columnWidths.vat}px`,
                                flexShrink: 0,
                                height: '100%'
                            }}
                        >
                            <span style={{ fontSize: '0.75rem' }}>
                                {formatCurrency(bill.vatAmount)}
                            </span>
                        </div>
                    </>
                )}

                {/* Round Off */}
                <div
                    className="d-flex align-items-center justify-content-end px-1 border-end"
                    style={{
                        width: `${columnWidths.roundOff}px`,
                        flexShrink: 0,
                        height: '100%'
                    }}
                >
                    <span style={{ fontSize: '0.75rem' }}>
                        {formatCurrency(bill.roundOffAmount)}
                    </span>
                </div>

                {/* Total */}
                <div
                    className="d-flex align-items-center justify-content-end px-1 border-end"
                    style={{
                        width: `${columnWidths.total}px`,
                        flexShrink: 0,
                        height: '100%'
                    }}
                >
                    <span style={{ fontSize: '0.75rem' }}>
                        {formatCurrency(bill.totalAmount)}
                    </span>
                </div>

                {/* User */}
                <div
                    className="d-flex align-items-center px-1 border-end"
                    style={{
                        width: `${columnWidths.user}px`,
                        flexShrink: 0,
                        height: '100%',
                        overflow: 'hidden'
                    }}
                    title={bill.user?.name || 'N/A'}
                >
                    <span style={{ fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {bill.user?.name || 'N/A'}
                    </span>
                </div>

                {/* Actions */}
                <div
                    className="d-flex align-items-center justify-content-center px-1 gap-1"
                    style={{
                        width: `${columnWidths.actions}px`,
                        flexShrink: 0,
                        height: '100%'
                    }}
                >
                    <button
                        className="btn btn-sm btn-info py-0 px-1 d-flex align-items-center"
                        onClick={handleViewClick}
                        style={{
                            height: '20px',
                            fontSize: '0.7rem',
                            fontWeight: 'bold'
                        }}
                    >
                        <i className="fas fa-eye me-1" style={{ fontSize: '0.6rem' }}></i>View
                    </button>
                    <button
                        className="btn btn-sm btn-warning py-0 px-1 d-flex align-items-center"
                        onClick={handleEditClick}
                        style={{
                            height: '20px',
                            fontSize: '0.7rem',
                            fontWeight: 'bold'
                        }}
                    >
                        <i className="fas fa-edit me-1" style={{ fontSize: '0.6rem' }}></i>Edit
                    </button>
                </div>
            </div>
        );
    }, (prevProps, nextProps) => {
        if (prevProps.index !== nextProps.index) return false;
        if (prevProps.style !== nextProps.style) return false;

        const prevBill = prevProps.data.bills[prevProps.index];
        const nextBill = nextProps.data.bills[nextProps.index];

        return (
            shallowEqual(prevBill, nextBill) &&
            prevProps.data.selectedRowIndex === nextProps.data.selectedRowIndex
        );
    });

    // Reset column widths function
    const resetColumnWidths = () => {
        setColumnWidths({
            date: 90,
            vchNo: 120,
            supplierName: 180,
            payMode: 80,
            subTotal: 80,
            discount: 120,
            taxable: 70,
            vat: 70,
            roundOff: 90,
            total: 100,
            user: 100,
            actions: 140
        });
    };

    if (loading) return <Loader />;

    if (error) {
        return <div className="alert alert-danger text-center py-5">{error}</div>;
    }

    return (
        <div className="container-fluid">
            <Header />
            <div className="card mt-2 shadow-lg p-0 animate__animated animate__fadeInUp expanded-card ledger-card compact">
                <div className="card-header bg-white py-0">
                    <h1 className="h4 mb-0 text-center text-primary">Purchase Return's Register</h1>
                </div>

                <div className="card-body p-2 p-md-3">
                    <div className="row g-2 mb-3">
                        {/* Date Range Row */}
                        <div className="col-12 col-md-1">
                            <div className="position-relative">
                                <input
                                    type="text"
                                    name="fromDate"
                                    id="fromDate"
                                    className={`form-control form-control-sm no-date-icon ${dateErrors.fromDate ? 'is-invalid' : ''}`}
                                    value={data.fromDate}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        const sanitizedValue = value.replace(/[^0-9/-]/g, '');
                                        if (sanitizedValue.length <= 10) {
                                            setData(prev => ({ ...prev, fromDate: sanitizedValue }));
                                            setDateErrors(prev => ({ ...prev, fromDate: '' }));
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
                                                const currentDate = company.dateFormat === 'nepali' ? new NepaliDate() : new Date();
                                                const correctedDate = company.dateFormat === 'nepali'
                                                    ? currentDate.format('YYYY-MM-DD')
                                                    : currentDate.toISOString().split('T')[0];

                                                setData(prev => ({ ...prev, fromDate: correctedDate }));
                                                setDateErrors(prev => ({ ...prev, fromDate: '' }));

                                                setNotification({
                                                    show: true,
                                                    message: 'Date required. Auto-corrected to current date.',
                                                    type: 'warning',
                                                    duration: 3000
                                                });

                                                handleKeyDown(e, 'toDate');
                                            } else if (dateErrors.fromDate) {
                                                e.target.focus();
                                            } else {
                                                handleKeyDown(e, 'toDate');
                                            }
                                        }
                                    }}
                                    onPaste={(e) => {
                                        e.preventDefault();
                                        const pastedData = e.clipboardData.getData('text');
                                        const cleanedData = pastedData.replace(/[^0-9/-]/g, '');
                                        const newValue = data.fromDate + cleanedData;
                                        if (newValue.length <= 10) {
                                            setData(prev => ({ ...prev, fromDate: newValue }));
                                        }
                                    }}
                                    onBlur={(e) => {
                                        try {
                                            const dateStr = e.target.value.trim();
                                            if (!dateStr) {
                                                setDateErrors(prev => ({ ...prev, fromDate: '' }));
                                                return;
                                            }

                                            if (company.dateFormat === 'nepali') {
                                                const nepaliDateFormat = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/;
                                                if (!nepaliDateFormat.test(dateStr)) {
                                                    const currentDate = new NepaliDate();
                                                    const correctedDate = currentDate.format('YYYY-MM-DD');
                                                    setData(prev => ({ ...prev, fromDate: correctedDate }));
                                                    setDateErrors(prev => ({ ...prev, fromDate: '' }));

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
                                                    setData(prev => ({ ...prev, fromDate: correctedDate }));
                                                    setDateErrors(prev => ({ ...prev, fromDate: '' }));

                                                    setNotification({
                                                        show: true,
                                                        message: 'Invalid Nepali date. Auto-corrected to current date.',
                                                        type: 'warning',
                                                        duration: 3000
                                                    });
                                                } else {
                                                    setData(prev => ({
                                                        ...prev,
                                                        fromDate: nepaliDate.format('YYYY-MM-DD')
                                                    }));
                                                    setDateErrors(prev => ({ ...prev, fromDate: '' }));
                                                }
                                            } else {
                                                const englishDateFormat = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/;
                                                if (!englishDateFormat.test(dateStr)) {
                                                    const currentDate = new Date();
                                                    const correctedDate = currentDate.toISOString().split('T')[0];
                                                    setData(prev => ({ ...prev, fromDate: correctedDate }));
                                                    setDateErrors(prev => ({ ...prev, fromDate: '' }));

                                                    setNotification({
                                                        show: true,
                                                        message: 'Invalid date format. Auto-corrected to current date.',
                                                        type: 'warning',
                                                        duration: 3000
                                                    });
                                                    return;
                                                }

                                                const dateObj = new Date(dateStr);
                                                if (isNaN(dateObj.getTime())) {
                                                    throw new Error("Invalid English date");
                                                }

                                                setData(prev => ({
                                                    ...prev,
                                                    fromDate: dateObj.toISOString().split('T')[0]
                                                }));
                                                setDateErrors(prev => ({ ...prev, fromDate: '' }));
                                            }
                                        } catch (error) {
                                            const currentDate = company.dateFormat === 'nepali' ? new NepaliDate() : new Date();
                                            const correctedDate = company.dateFormat === 'nepali'
                                                ? currentDate.format('YYYY-MM-DD')
                                                : currentDate.toISOString().split('T')[0];

                                            setData(prev => ({ ...prev, fromDate: correctedDate }));
                                            setDateErrors(prev => ({ ...prev, fromDate: '' }));

                                            setNotification({
                                                show: true,
                                                message: error.message ? `${error.message}. Auto-corrected to current date.` : 'Invalid date. Auto-corrected to current date.',
                                                type: 'warning',
                                                duration: 3000
                                            });
                                        }
                                    }}
                                    placeholder={company.dateFormat === 'nepali' ? "YYYY-MM-DD" : "YYYY-MM-DD"}
                                    required
                                    autoComplete="off"
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
                                    From Date: <span className="text-danger">*</span>
                                </label>
                                {dateErrors.fromDate && (
                                    <div className="invalid-feedback d-block" style={{ fontSize: '0.7rem' }}>
                                        {dateErrors.fromDate}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-12 col-md-1">
                            <div className="position-relative">
                                <input
                                    type="text"
                                    name="toDate"
                                    id="toDate"
                                    className={`form-control form-control-sm no-date-icon ${dateErrors.toDate ? 'is-invalid' : ''}`}
                                    value={data.toDate}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        const sanitizedValue = value.replace(/[^0-9/-]/g, '');
                                        if (sanitizedValue.length <= 10) {
                                            setData(prev => ({ ...prev, toDate: sanitizedValue }));
                                            setDateErrors(prev => ({ ...prev, toDate: '' }));
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
                                                const currentDate = company.dateFormat === 'nepali' ? new NepaliDate() : new Date();
                                                const correctedDate = company.dateFormat === 'nepali'
                                                    ? currentDate.format('YYYY-MM-DD')
                                                    : currentDate.toISOString().split('T')[0];

                                                setData(prev => ({ ...prev, toDate: correctedDate }));
                                                setDateErrors(prev => ({ ...prev, toDate: '' }));

                                                setNotification({
                                                    show: true,
                                                    message: 'Date required. Auto-corrected to current date.',
                                                    type: 'warning',
                                                    duration: 3000
                                                });

                                                document.getElementById('generateReport').focus();
                                            } else if (dateErrors.toDate) {
                                                e.target.focus();
                                            } else {
                                                document.getElementById('generateReport').focus();
                                            }
                                        }
                                    }}
                                    onPaste={(e) => {
                                        e.preventDefault();
                                        const pastedData = e.clipboardData.getData('text');
                                        const cleanedData = pastedData.replace(/[^0-9/-]/g, '');
                                        const newValue = data.toDate + cleanedData;
                                        if (newValue.length <= 10) {
                                            setData(prev => ({ ...prev, toDate: newValue }));
                                        }
                                    }}
                                    onBlur={(e) => {
                                        try {
                                            const dateStr = e.target.value.trim();
                                            if (!dateStr) {
                                                setDateErrors(prev => ({ ...prev, toDate: '' }));
                                                return;
                                            }

                                            if (company.dateFormat === 'nepali') {
                                                const nepaliDateFormat = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/;
                                                if (!nepaliDateFormat.test(dateStr)) {
                                                    const currentDate = new NepaliDate();
                                                    const correctedDate = currentDate.format('YYYY-MM-DD');
                                                    setData(prev => ({ ...prev, toDate: correctedDate }));
                                                    setDateErrors(prev => ({ ...prev, toDate: '' }));

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
                                                    setData(prev => ({ ...prev, toDate: correctedDate }));
                                                    setDateErrors(prev => ({ ...prev, toDate: '' }));

                                                    setNotification({
                                                        show: true,
                                                        message: 'Invalid Nepali date. Auto-corrected to current date.',
                                                        type: 'warning',
                                                        duration: 3000
                                                    });
                                                } else {
                                                    setData(prev => ({
                                                        ...prev,
                                                        toDate: nepaliDate.format('YYYY-MM-DD')
                                                    }));
                                                    setDateErrors(prev => ({ ...prev, toDate: '' }));
                                                }
                                            } else {
                                                const englishDateFormat = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/;
                                                if (!englishDateFormat.test(dateStr)) {
                                                    const currentDate = new Date();
                                                    const correctedDate = currentDate.toISOString().split('T')[0];
                                                    setData(prev => ({ ...prev, toDate: correctedDate }));
                                                    setDateErrors(prev => ({ ...prev, toDate: '' }));

                                                    setNotification({
                                                        show: true,
                                                        message: 'Invalid date format. Auto-corrected to current date.',
                                                        type: 'warning',
                                                        duration: 3000
                                                    });
                                                    return;
                                                }

                                                const dateObj = new Date(dateStr);
                                                if (isNaN(dateObj.getTime())) {
                                                    throw new Error("Invalid English date");
                                                }

                                                setData(prev => ({
                                                    ...prev,
                                                    toDate: dateObj.toISOString().split('T')[0]
                                                }));
                                                setDateErrors(prev => ({ ...prev, toDate: '' }));
                                            }
                                        } catch (error) {
                                            const currentDate = company.dateFormat === 'nepali' ? new NepaliDate() : new Date();
                                            const correctedDate = company.dateFormat === 'nepali'
                                                ? currentDate.format('YYYY-MM-DD')
                                                : currentDate.toISOString().split('T')[0];

                                            setData(prev => ({ ...prev, toDate: correctedDate }));
                                            setDateErrors(prev => ({ ...prev, toDate: '' }));

                                            setNotification({
                                                show: true,
                                                message: error.message ? `${error.message}. Auto-corrected to current date.` : 'Invalid date. Auto-corrected to current date.',
                                                type: 'warning',
                                                duration: 3000
                                            });
                                        }
                                    }}
                                    placeholder={company.dateFormat === 'nepali' ? "YYYY-MM-DD" : "YYYY-MM-DD"}
                                    required
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
                                    To Date: <span className="text-danger">*</span>
                                </label>
                                {dateErrors.toDate && (
                                    <div className="invalid-feedback d-block" style={{ fontSize: '0.7rem' }}>
                                        {dateErrors.toDate}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Generate Report Button */}
                        <div className="col-12 col-md-1">
                            <button
                                type="button"
                                id="generateReport"
                                className="btn btn-primary btn-sm"
                                onClick={handleGenerateReport}
                                style={{
                                    height: '30px',
                                    fontSize: '0.8rem',
                                    padding: '0 12px',
                                    fontWeight: '500',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                <i className="fas fa-chart-line me-1"></i>Generate
                            </button>
                        </div>

                        {/* Search Row */}
                        <div className="col-12 col-md-2">
                            <div className="position-relative">
                                <div className="input-group input-group-sm">
                                    <input
                                        type="text"
                                        className="form-control form-control-sm"
                                        id="searchInput"
                                        placeholder="Search..."
                                        value={searchQuery}
                                        onChange={handleSearchChange}
                                        disabled={data.bills.length === 0}
                                        autoComplete='off'
                                        style={{
                                            height: '26px',
                                            fontSize: '0.875rem',
                                            paddingTop: '0.75rem',
                                            width: '100%'
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
                                    Search
                                </label>
                            </div>
                        </div>

                        {/* Payment Mode Filter Row */}
                        <div className="col-12 col-md-2">
                            <div className="position-relative">
                                <select
                                    className="form-select form-select-sm"
                                    id="paymentModeFilter"
                                    value={paymentModeFilter}
                                    onChange={handlePaymentModeFilterChange}
                                    disabled={data.bills.length === 0}
                                    style={{
                                        height: '30px',
                                        fontSize: '0.875rem',
                                        paddingTop: '0.25rem',
                                        width: '100%'
                                    }}
                                >
                                    <option value="">All</option>
                                    <option value="cash">Cash</option>
                                    <option value="credit">Credit</option>
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
                                    Payment Mode
                                </label>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="col-12 col-md-auto d-flex align-items-end justify-content-end gap-2">
                            <button
                                className="btn btn-primary btn-sm d-flex align-items-center"
                                onClick={() => navigate('/retailer/purchase-return')}
                                style={{
                                    height: '30px',
                                    padding: '0 12px',
                                    fontSize: '0.8rem',
                                    fontWeight: '500',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                <i className="fas fa-receipt me-1"></i>New Voucher
                            </button>
                            <button
                                className="btn btn-secondary btn-sm d-flex align-items-center"
                                onClick={() => handlePrint(false)}
                                disabled={data.bills.length === 0}
                                style={{
                                    height: '30px',
                                    padding: '0 12px',
                                    fontSize: '0.8rem',
                                    fontWeight: '500',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                <i className="fas fa-print me-1"></i>Print All
                            </button>
                            <button
                                className="btn btn-secondary btn-sm d-flex align-items-center"
                                onClick={() => handlePrint(true)}
                                disabled={data.bills.length === 0}
                                style={{
                                    height: '30px',
                                    padding: '0 12px',
                                    fontSize: '0.8rem',
                                    fontWeight: '500',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                <i className="fas fa-filter me-1"></i>Print Filtered
                            </button>
                            <button
                                className="btn btn-secondary btn-sm d-flex align-items-center"
                                onClick={resetColumnWidths}
                                title="Reset column widths to default"
                                style={{
                                    height: '30px',
                                    padding: '0 12px',
                                    fontSize: '0.8rem',
                                    fontWeight: '500'
                                }}
                            >
                                <i className="fas fa-redo me-1" style={{ fontSize: '0.6rem' }}></i>Reset
                            </button>
                        </div>
                    </div>

                    {data.bills.length === 0 ? (
                        <div className="alert alert-info text-center py-3" style={{ fontSize: '0.875rem' }}>
                            <i className="fas fa-info-circle me-2"></i>
                            Please select date range and click "Generate Report" to view data
                        </div>
                    ) : (
                        <>
                            {/* Bills Table */}
                            <div
                                style={{
                                    height: "400px",
                                    border: '1px solid #dee2e6',
                                    backgroundColor: '#fff',
                                    position: 'relative'
                                }}
                                ref={tableBodyRef}
                            >
                                {loading ? (
                                    <div className="d-flex flex-column justify-content-center align-items-center h-100">
                                        <div className="spinner-border spinner-border-sm text-primary" role="status">
                                            <span className="visually-hidden">Loading...</span>
                                        </div>
                                        <p className="mt-2 small text-muted" style={{ fontSize: '0.8rem' }}>
                                            Loading purchase returns...
                                        </p>
                                    </div>
                                ) : filteredBills.length === 0 ? (
                                    <div className="d-flex flex-column justify-content-center align-items-center h-100">
                                        <i className="bi bi-search text-muted" style={{ fontSize: '1.5rem' }}></i>
                                        <h6 className="mt-2 text-muted" style={{ fontSize: '0.9rem' }}>
                                            No purchase returns found
                                        </h6>
                                        <p className="text-muted small" style={{ fontSize: '0.75rem' }}>
                                            {searchQuery ? 'Try a different search term' : 'No data for the selected date range'}
                                        </p>
                                    </div>
                                ) : (
                                    <AutoSizer>
                                        {({ height, width }) => {
                                            const showVatColumns = data.company?.vatEnabled && !data.company?.isVatExempt;
                                            const totalWidth = columnWidths.date + columnWidths.vchNo + columnWidths.supplierName +
                                                columnWidths.payMode + columnWidths.subTotal + columnWidths.discount +
                                                columnWidths.roundOff + columnWidths.total + columnWidths.user +
                                                columnWidths.actions + (showVatColumns ? (columnWidths.taxable + columnWidths.vat) : 0);

                                            return (
                                                <div style={{
                                                    position: 'relative',
                                                    height: height,
                                                    width: Math.max(width, totalWidth),
                                                }}>
                                                    <TableHeader />
                                                    <List
                                                        height={height - 28}
                                                        itemCount={filteredBills.length}
                                                        itemSize={28}
                                                        width={Math.max(width, totalWidth)}
                                                        itemData={{
                                                            bills: filteredBills,
                                                            selectedRowIndex,
                                                            formatCurrency,
                                                            navigate,
                                                            handleRowClick
                                                        }}
                                                    >
                                                        {TableRow}
                                                    </List>
                                                </div>
                                            );
                                        }}
                                    </AutoSizer>
                                )}
                            </div>

                            {/* Footer with totals */}
                            <div
                                className="d-flex bg-light border-top sticky-bottom"
                                style={{
                                    zIndex: 2,
                                    height: '10px',
                                    borderTop: '2px solid #dee2e6'
                                }}
                            >
                                <div
                                    className="d-flex align-items-center px-1"
                                    style={{
                                        width: `${columnWidths.date + columnWidths.vchNo + columnWidths.supplierName + columnWidths.payMode}px`,
                                        flexShrink: 0,
                                        height: '100%'
                                    }}
                                >
                                    <strong style={{ fontSize: '0.75rem' }}>Total:</strong>
                                </div>

                                <div
                                    className="d-flex align-items-center justify-content-end px-1 border-start"
                                    style={{
                                        width: `${columnWidths.subTotal}px`,
                                        flexShrink: 0,
                                        height: '100%'
                                    }}
                                >
                                    <strong style={{ fontSize: '0.75rem' }}>{formatCurrency(totals.subTotal)}</strong>
                                </div>

                                <div
                                    className="d-flex align-items-center justify-content-end px-1 border-start"
                                    style={{
                                        width: `${columnWidths.discount}px`,
                                        flexShrink: 0,
                                        height: '100%'
                                    }}
                                >
                                    <strong style={{ fontSize: '0.75rem' }}>{formatCurrency(totals.discount)}</strong>
                                </div>

                                {data.company?.vatEnabled && !data.company?.isVatExempt && (
                                    <>
                                        <div
                                            className="d-flex align-items-center justify-content-end px-1 border-start"
                                            style={{
                                                width: `${columnWidths.taxable}px`,
                                                flexShrink: 0,
                                                height: '100%'
                                            }}
                                        >
                                            <strong style={{ fontSize: '0.75rem' }}>{formatCurrency(totals.taxable)}</strong>
                                        </div>

                                        <div
                                            className="d-flex align-items-center justify-content-end px-1 border-start"
                                            style={{
                                                width: `${columnWidths.vat}px`,
                                                flexShrink: 0,
                                                height: '100%'
                                            }}
                                        >
                                            <strong style={{ fontSize: '0.75rem' }}>{formatCurrency(totals.vat)}</strong>
                                        </div>
                                    </>
                                )}

                                <div
                                    className="d-flex align-items-center justify-content-end px-1 border-start"
                                    style={{
                                        width: `${columnWidths.roundOff}px`,
                                        flexShrink: 0,
                                        height: '100%'
                                    }}
                                >
                                    <strong style={{ fontSize: '0.75rem' }}>{formatCurrency(totals.roundOff)}</strong>
                                </div>

                                <div
                                    className="d-flex align-items-center justify-content-end px-1 border-start"
                                    style={{
                                        width: `${columnWidths.total}px`,
                                        flexShrink: 0,
                                        height: '100%'
                                    }}
                                >
                                    <strong style={{ fontSize: '0.75rem' }}>{formatCurrency(totals.amount)}</strong>
                                </div>

                                <div
                                    className="d-flex align-items-center px-1 border-start"
                                    style={{
                                        width: `${columnWidths.user + columnWidths.actions}px`,
                                        flexShrink: 0,
                                        height: '100%'
                                    }}
                                >
                                    {/* Empty space */}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Product modal */}
            {showProductModal && (
                <ProductModal onClose={() => setShowProductModal(false)} />
            )}
        </div>
    );
};

export default PurchaseReturnList;