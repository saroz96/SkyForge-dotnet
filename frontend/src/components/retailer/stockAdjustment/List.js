// import React, { useState, useEffect, useRef } from 'react';
// import { useNavigate } from 'react-router-dom';
// import axios from 'axios';
// import Header from '../Header';
// import { usePageNotRefreshContext } from '../PageNotRefreshContext';
// import Loader from '../../Loader';
// import ProductModal from '../dashboard/modals/ProductModal';
// import NepaliDate from 'nepali-date-converter';

// const StockAdjustmentsList = () => {
//     const { draftSave, setDraftSave, clearDraft } = usePageNotRefreshContext();
//     const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
//     const currentEnglishDate = new Date().toISOString().split('T')[0];
//     const [showProductModal, setShowProductModal] = useState(false);

//     const [company, setCompany] = useState({
//         dateFormat: 'nepali',
//         vatEnabled: true,
//         fiscalYear: {}
//     });

//     const [data, setData] = useState(() => {
//         if (draftSave && draftSave.stockAdjustmentsData) {
//             return draftSave.stockAdjustmentsData;
//         }
//         return {
//             company: null,
//             currentFiscalYear: null,
//             stockAdjustments: [],
//             items: [],
//             user: null,
//             isAdminOrSupervisor: false,
//             fromDate: '',
//             toDate: ''
//         };
//     });

//     const [loading, setLoading] = useState(false);
//     const [error, setError] = useState(null);
//     const [searchQuery, setSearchQuery] = useState(() => {
//         if (draftSave && draftSave.stockAdjustmentsSearch) {
//             return draftSave.stockAdjustmentsSearch.searchQuery || '';
//         }
//         return '';
//     });
//     const [adjustmentTypeFilter, setAdjustmentTypeFilter] = useState(() => {
//         if (draftSave && draftSave.stockAdjustmentsSearch) {
//             return draftSave.stockAdjustmentsSearch.adjustmentTypeFilter || '';
//         }
//         return '';
//     });
//     const [totalQuantity, setTotalQuantity] = useState(0);
//     const [selectedRowIndex, setSelectedRowIndex] = useState(() => {
//         if (draftSave && draftSave.stockAdjustmentsSearch) {
//             return draftSave.stockAdjustmentsSearch.selectedRowIndex || 0;
//         }
//         return 0;
//     });
//     const [filteredAdjustments, setFilteredAdjustments] = useState([]);
//     const [shouldFetch, setShouldFetch] = useState(false);

//     const fromDateRef = useRef(null);
//     const toDateRef = useRef(null);
//     const searchInputRef = useRef(null);
//     const adjustmentTypeFilterRef = useRef(null);
//     const generateReportRef = useRef(null);
//     const tableBodyRef = useRef(null);
//     const navigate = useNavigate();

//     const api = axios.create({
//         baseURL: process.env.REACT_APP_API_BASE_URL,
//         withCredentials: true,
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
//                         vatEnabled: companyData.vatEnabled !== false,
//                         fiscalYear: currentFiscalYear || {}
//                     });

//                     // Check if we have draft dates
//                     const hasDraftDates = draftSave?.stockAdjustmentsData?.fromDate && draftSave?.stockAdjustmentsData?.toDate;

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

//     // Save data and search state to draft context
//     useEffect(() => {
//         setDraftSave({
//             ...draftSave,
//             stockAdjustmentsData: data,
//             stockAdjustmentsSearch: {
//                 searchQuery,
//                 adjustmentTypeFilter,
//                 selectedRowIndex,
//                 fromDate: data.fromDate,
//                 toDate: data.toDate
//             }
//         });
//     }, [data, searchQuery, adjustmentTypeFilter, selectedRowIndex, data.fromDate, data.toDate]);

//     // Fetch data when generate report is clicked
//     useEffect(() => {
//         const fetchData = async () => {
//             if (!shouldFetch) return;

//             try {
//                 setLoading(true);
//                 const params = new URLSearchParams();
//                 if (data.fromDate) params.append('fromDate', data.fromDate);
//                 if (data.toDate) params.append('toDate', data.toDate);

//                 const response = await api.get(`/api/retailer/stockAdjustments/register?${params.toString()}`);
//                 setData(response.data.data);
//                 setError(null);
//                 // Don't reset selection when new data loads if we have a saved position
//                 if (!draftSave?.stockAdjustmentsSearch?.selectedRowIndex) {
//                     setSelectedRowIndex(0);
//                 }
//             } catch (err) {
//                 setError(err.response?.data?.error || 'Failed to fetch stock adjustments');
//             } finally {
//                 setLoading(false);
//                 setShouldFetch(false);
//             }
//         };

//         fetchData();
//     }, [shouldFetch, data.fromDate, data.toDate]);

//     // Filter adjustments based on search, adjustment type and date range
//     useEffect(() => {
//         const filtered = data.stockAdjustments.filter(adjustment => {
//             const matchesSearch =
//                 adjustment.itemName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
//                 adjustment.reason?.toLowerCase().includes(searchQuery.toLowerCase()) ||
//                 adjustment.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
//                 adjustment.billNumber?.toLowerCase().includes(searchQuery.toLowerCase());

//             const matchesAdjustmentType =
//                 adjustmentTypeFilter === '' ||
//                 adjustment.adjustmentType?.toLowerCase() === adjustmentTypeFilter.toLowerCase();

//             return matchesSearch && matchesAdjustmentType;
//         });

//         setFilteredAdjustments(filtered);
//         // Reset selected row when filters change, but only if we don't have a saved position
//         if (!draftSave?.stockAdjustmentsSearch?.selectedRowIndex) {
//             setSelectedRowIndex(0);
//         }
//     }, [data.stockAdjustments, searchQuery, adjustmentTypeFilter]);

//     // Calculate total quantity when filtered adjustments change
//     useEffect(() => {
//         if (filteredAdjustments.length === 0) {
//             setTotalQuantity(0);
//             return;
//         }

//         const newTotalQuantity = filteredAdjustments.reduce((acc, adjustment) => {
//             return acc + (adjustment.quantity || 0);
//         }, 0);

//         setTotalQuantity(newTotalQuantity);
//     }, [filteredAdjustments]);

//     // Handle keyboard navigation
//     useEffect(() => {
//         const handleKeyDown = (e) => {
//             if (filteredAdjustments.length === 0) return;

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
//                     setSelectedRowIndex(prev => Math.min(filteredAdjustments.length - 1, prev + 1));
//                     break;
//                 // case 'Enter':
//                 //     if (selectedRowIndex >= 0 && selectedRowIndex < filteredAdjustments.length) {
//                 //         navigate(`/stockAdjustments/${filteredAdjustments[selectedRowIndex].adjustmentId}/print`);
//                 //     }
//                 //     break;
//                 default:
//                     break;
//             }
//         };

//         window.addEventListener('keydown', handleKeyDown);
//         return () => window.removeEventListener('keydown', handleKeyDown);
//     }, [filteredAdjustments, selectedRowIndex, navigate]);

//     // Scroll to selected row
//     useEffect(() => {
//         if (tableBodyRef.current && filteredAdjustments.length > 0) {
//             const rows = tableBodyRef.current.querySelectorAll('tr');
//             if (rows.length > selectedRowIndex) {
//                 rows[selectedRowIndex].scrollIntoView({
//                     behavior: 'smooth',
//                     block: 'nearest'
//                 });
//             }
//         }
//     }, [selectedRowIndex, filteredAdjustments]);

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

//     const handleDateChange = (e) => {
//         const { name, value } = e.target;
//         setData(prev => ({ ...prev, [name]: value }));
//     };

//     const handleSearchChange = (e) => {
//         setSearchQuery(e.target.value);
//     };

//     const handleAdjustmentTypeFilterChange = (e) => {
//         setAdjustmentTypeFilter(e.target.value);
//     };

//     const handleGenerateReport = () => {
//         if (!data.fromDate || !data.toDate) {
//             setError('Please select both from and to dates');
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

//     const formatCurrency = (amount) => {
//         return parseFloat(amount || 0).toFixed(2);
//     };

//     const handleRowClick = (index) => {
//         setSelectedRowIndex(index);
//     };

//     const handleRowDoubleClick = (adjustmentId) => {
//         navigate(`/stockAdjustments/${adjustmentId}/print`);
//     };

//     const handlePrint = (filtered = false) => {
//         const rowsToPrint = filtered ? filteredAdjustments : data.stockAdjustments;

//         if (rowsToPrint.length === 0) {
//             alert("No adjustments to print");
//             return;
//         }

//         const printWindow = window.open("", "_blank");
//         const printHeader = `
//             <div class="print-header">
//                 <h1>${data.company?.name || 'Company Name'}</h1>
//                 <p>
//                     ${data.company?.address || ''}-${data.company?.ward || ''}, ${data.company?.city || ''},
//                     ${data.company?.country || ''}<br>
//                     Tel.: ${data.company?.phone || ''}, Email: ${data.company?.email || ''}<br>
//                     VAT NO.: ${data.company?.pan || ''}
//                 </p>
//                 <hr>
//                 <h1 style="text-align:center;">Stock Adjustments</h1>
//             </div>
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
//             .badge-xcess {
//                 background-color: #1cc88a;
//                 color: white;
//                 padding: 2px 5px;
//                 border-radius: 3px;
//             }
//             .badge-short {
//                 background-color: #e74a3b;
//                 color: white;
//                 padding: 2px 5px;
//                 border-radius: 3px;
//             }
//         </style>
//         ${printHeader}
//         <table>
//             <thead>
//                 <tr>
//                     <th class="nowrap">Date</th>
//                     <th class="nowrap">Vch. No.</th>
//                     <th class="nowrap">Item Description</th>
//                     <th class="nowrap">Qty</th>
//                     <th class="nowrap">Unit</th>
//                     <th class="nowrap">Rate</th>
//                     <th class="nowrap">Type</th>
//                     <th class="nowrap">Reason</th>
//                     <th class="nowrap">User</th>
//                 </tr>
//             </thead>
//             <tbody>
//         `;

//         let totalQty = 0;

//         rowsToPrint.forEach(adjustment => {
//             tableContent += `
//             <tr>
//                 <td class="nowrap">${new Date(adjustment.date).toLocaleDateString()}</td>
//                 <td class="nowrap">${adjustment.billNumber}</td>
//                 <td class="nowrap">
//                     ${adjustment.itemName}
//                     ${adjustment.vatStatus === 'vatExempt' ? '*' : ''}
//                 </td>
//                 <td class="nowrap">${formatCurrency(adjustment.quantity)}</td>
//                 <td class="nowrap">${adjustment.unitName}</td>
//                 <td class="nowrap">${formatCurrency(adjustment.puPrice)}</td>
//                 <td class="nowrap">
//                     <span class="badge-${adjustment.adjustmentType}">
//                         ${adjustment.adjustmentType}
//                     </span>
//                 </td>
//                 <td class="nowrap">${adjustment.reason}</td>
//                 <td class="nowrap">${adjustment.userName}</td>
//             </tr>
//             `;

//             totalQty += parseFloat(adjustment.quantity || 0);
//         });

//         // Add final totals row
//         tableContent += `
//             <tr style="font-weight:bold; border-top: 2px solid #000;">
//                 <td colspan="3">Total Quantity</td>
//                 <td>${formatCurrency(totalQty)}</td>
//                 <td colspan="5"></td>
//             </tr>
//             </tbody>
//         </table>
//         <p>* Items marked with asterisk are VAT exempt.</p>
//         `;

//         printWindow.document.write(`
//         <html>
//             <head>
//                 <title>Stock Adjustments</title>
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

//     if (loading) return <Loader />;

//     if (error) {
//         return <div className="alert alert-danger text-center py-5">{error}</div>;
//     }

//     return (
//         <div className="container-fluid">
//             <Header />
//             <div className="card shadow">
//                 <div className="card-header bg-white py-3">
//                     <h1 className="h3 mb-0 text-center text-primary">Stock Adjustments</h1>
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
//                                         className="form-control"
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
//                                         className="form-control"
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
//                                         <i className="fas fa-chart-line me-2"></i>Generate
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
//                                             placeholder="Search by item, reason or user..."
//                                             value={searchQuery}
//                                             onChange={handleSearchChange}
//                                             disabled={data.stockAdjustments.length === 0}
//                                             autoComplete='off'
//                                         />
//                                     </div>
//                                 </div>

//                                 {/* Adjustment Type Filter Row */}
//                                 <div className="col-md-2">
//                                     <label htmlFor="adjustmentTypeFilter" className="form-label">Adjustment Type</label>
//                                     <select
//                                         className="form-select"
//                                         id="adjustmentTypeFilter"
//                                         ref={adjustmentTypeFilterRef}
//                                         value={adjustmentTypeFilter}
//                                         onChange={handleAdjustmentTypeFilterChange}
//                                         disabled={data.stockAdjustments.length === 0}
//                                     >
//                                         <option value="">All</option>
//                                         <option value="xcess">Xcess</option>
//                                         <option value="short">Short</option>
//                                     </select>
//                                 </div>
//                             </div>
//                         </div>

//                         {/* Action Buttons */}
//                         <div className="col-md-4 d-flex align-items-end justify-content-end gap-2">
//                             <button
//                                 className="btn btn-primary"
//                                 onClick={() => navigate('/retailer/stockAdjustments/new')}
//                             >
//                                 <i className="fas fa-plus me-2"></i>New
//                             </button>
//                             <button
//                                 className="btn btn-secondary"
//                                 onClick={() => handlePrint(false)}
//                                 disabled={data.stockAdjustments.length === 0}
//                             >
//                                 Print All
//                             </button>
//                             <button
//                                 className="btn btn-secondary"
//                                 onClick={() => handlePrint(true)}
//                                 disabled={data.stockAdjustments.length === 0}
//                             >
//                                 Print Filtered
//                             </button>
//                             <button
//                                 type="button"
//                                 className="btn btn-secondary"
//                                 onClick={() => window.location.reload()}
//                             >
//                                 Refresh
//                             </button>
//                         </div>
//                     </div>

//                     {data.stockAdjustments.length === 0 ? (
//                         <div className="alert alert-info text-center py-3">
//                             <i className="fas fa-info-circle me-2"></i>
//                             Please select date range and click "Generate Report" to view data
//                         </div>
//                     ) : (
//                         <>
//                             {/* Adjustments Table */}
//                             <div className="table-responsive">
//                                 <table className="table table-hover">
//                                     <thead>
//                                         <tr>
//                                             <th>Date</th>
//                                             <th>Vch. No.</th>
//                                             <th>Item Description</th>
//                                             <th className="text-end">Qty</th>
//                                             <th>Unit</th>
//                                             <th className="text-end">Rate</th>
//                                             <th>Type</th>
//                                             <th>Reason</th>
//                                             <th>User</th>
//                                             <th>Actions</th>
//                                         </tr>
//                                     </thead>
//                                     <tbody ref={tableBodyRef}>
//                                         {filteredAdjustments.map((adjustment, index) => (
//                                             <tr
//                                                 key={`${adjustment.adjustmentId}-${adjustment.itemId}`}
//                                                 className={`adjustment-row ${selectedRowIndex === index ? 'highlighted-row' : ''}`}
//                                                 onClick={() => handleRowClick(index)}
//                                                 onDoubleClick={() => handleRowDoubleClick(adjustment.adjustmentId)}
//                                                 style={{ cursor: 'pointer' }}
//                                             >
//                                                 <td className="compact-cell">{new Date(adjustment.date).toLocaleDateString()}</td>
//                                                 <td className="compact-cell">{adjustment.billNumber}</td>
//                                                 <td className="compact-cell">
//                                                     {adjustment.itemName}
//                                                     {adjustment.vatStatus === 'vatExempt' && '*'}
//                                                 </td>
//                                                 <td className="compact-cell text-end">{formatCurrency(adjustment.quantity)}</td>
//                                                 <td className="compact-cell">{adjustment.unitName}</td>
//                                                 <td className="compact-cell text-end">{formatCurrency(adjustment.puPrice)}</td>
//                                                 <td className="compact-cell">
//                                                     <span className={`badge ${adjustment.adjustmentType === 'xcess' ? 'bg-success' : 'bg-danger'}`}>
//                                                         {adjustment.adjustmentType}
//                                                     </span>
//                                                 </td>
//                                                 <td className="compact-cell">{adjustment.reason}</td>
//                                                 <td className="compact-cell">{adjustment.userName}</td>
//                                                 <td className='compact-cell'>
//                                                     <div className="d-flex gap-2">
//                                                         <button
//                                                             className="btn btn-sm btn-info"
//                                                             onClick={() => navigate(`/retailer/stockAdjustments/${adjustment.adjustmentId}/print`)}
//                                                         >
//                                                             <i className="fas fa-eye"></i>View
//                                                         </button>
//                                                         <button
//                                                             className="btn btn-sm btn-warning"
//                                                             onClick={() => navigate(`/stockAdjustments/edit/${adjustment.adjustmentId}`)}
//                                                             disabled={!data.isAdminOrSupervisor}
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
//                                             <td colSpan="3">Total Quantity:</td>
//                                             <td className="text-end">{formatCurrency(totalQuantity)}</td>
//                                             <td colSpan="6"></td>
//                                         </tr>
//                                     </tfoot>
//                                 </table>
//                             </div>
//                             <p className="text-muted small mt-2">* Items marked with asterisk are VAT exempt.</p>
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

// export default StockAdjustmentsList;

//-------------------------------------------------end

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../../../stylesheet/retailer/sales/List.css';
import Header from '../Header';
import { usePageNotRefreshContext } from '../PageNotRefreshContext';
import Loader from '../../Loader';
import ProductModal from '../dashboard/modals/ProductModal';
import NepaliDate from 'nepali-date-converter';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

const StockAdjustmentsList = () => {
    const { draftSave, setDraftSave, clearDraft } = usePageNotRefreshContext();
    const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
    const currentEnglishDate = new Date().toISOString().split('T')[0];
    
    // State for date validation errors
    const [dateErrors, setDateErrors] = useState({
        fromDate: '',
        toDate: ''
    });

    // State for notifications
    const [notification, setNotification] = useState({
        show: false,
        message: '',
        type: 'success',
        duration: 3000
    });

    // Company state
    const [company, setCompany] = useState({
        dateFormat: 'nepali',
        vatEnabled: true,
        fiscalYear: {}
    });

    // Data state with draft support
    const [data, setData] = useState(() => {
        if (draftSave && draftSave.stockAdjustmentsData) {
            return draftSave.stockAdjustmentsData;
        }
        return {
            company: null,
            currentFiscalYear: null,
            stockAdjustments: [],
            items: [],
            user: null,
            isAdminOrSupervisor: false,
            fromDate: '',
            toDate: ''
        };
    });

    // UI state
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showProductModal, setShowProductModal] = useState(false);
    
    // Search and filter state with draft support
    const [searchQuery, setSearchQuery] = useState(() => {
        if (draftSave && draftSave.stockAdjustmentsSearch) {
            return draftSave.stockAdjustmentsSearch.searchQuery || '';
        }
        return '';
    });
    
    const [adjustmentTypeFilter, setAdjustmentTypeFilter] = useState(() => {
        if (draftSave && draftSave.stockAdjustmentsSearch) {
            return draftSave.stockAdjustmentsSearch.adjustmentTypeFilter || '';
        }
        return '';
    });
    
    const [selectedRowIndex, setSelectedRowIndex] = useState(() => {
        if (draftSave && draftSave.stockAdjustmentsSearch) {
            return draftSave.stockAdjustmentsSearch.selectedRowIndex || 0;
        }
        return 0;
    });

    // Column resizing state
    const [columnWidths, setColumnWidths] = useState({
        date: 90,
        vchNo: 100,
        itemDescription: 200,
        quantity: 80,
        unit: 70,
        rate: 80,
        type: 90,
        reason: 150,
        user: 120,
        actions: 140
    });

    const [isResizing, setIsResizing] = useState(false);
    const [resizingColumn, setResizingColumn] = useState(null);
    const [startX, setStartX] = useState(0);
    const [startWidth, setStartWidth] = useState(0);

    // Data state
    const [totalQuantity, setTotalQuantity] = useState(0);
    const [filteredAdjustments, setFilteredAdjustments] = useState([]);
    const [shouldFetch, setShouldFetch] = useState(false);

    // Refs
    const fromDateRef = useRef(null);
    const toDateRef = useRef(null);
    const searchInputRef = useRef(null);
    const adjustmentTypeFilterRef = useRef(null);
    const generateReportRef = useRef(null);
    const tableBodyRef = useRef(null);
    const navigate = useNavigate();

    const api = axios.create({
        baseURL: process.env.REACT_APP_API_BASE_URL,
        withCredentials: true,
    });

    // Fetch company and fiscal year info when component mounts
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const response = await api.get('/api/my-company');
                if (response.data.success) {
                    const { company: companyData, currentFiscalYear } = response.data;

                    // Set company info
                    const dateFormat = companyData.dateFormat || 'english';
                    setCompany({
                        dateFormat,
                        vatEnabled: companyData.vatEnabled !== false,
                        fiscalYear: currentFiscalYear || {}
                    });

                    // Check if we have draft dates
                    const hasDraftDates = draftSave?.stockAdjustmentsData?.fromDate && draftSave?.stockAdjustmentsData?.toDate;

                    if (!hasDraftDates && currentFiscalYear?.startDate) {
                        // Only set default dates if we don't have draft dates
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
                        // If we have draft data, ensure company info is updated
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

    // Save data and search state to draft context
    useEffect(() => {
        setDraftSave({
            ...draftSave,
            stockAdjustmentsData: data,
            stockAdjustmentsSearch: {
                searchQuery,
                adjustmentTypeFilter,
                selectedRowIndex,
                fromDate: data.fromDate,
                toDate: data.toDate
            }
        });
    }, [data, searchQuery, adjustmentTypeFilter, selectedRowIndex, data.fromDate, data.toDate]);

    // Save/load column widths
    useEffect(() => {
        const savedWidths = localStorage.getItem('stockAdjustmentsTableColumnWidths');
        if (savedWidths) {
            try {
                setColumnWidths(JSON.parse(savedWidths));
            } catch (e) {
                console.error('Failed to load column widths:', e);
            }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('stockAdjustmentsTableColumnWidths', JSON.stringify(columnWidths));
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

                const response = await api.get(`/api/retailer/stockAdjustments/register?${params.toString()}`);
                setData(response.data.data);
                setError(null);
                // Don't reset selection when new data loads if we have a saved position
                if (!draftSave?.stockAdjustmentsSearch?.selectedRowIndex) {
                    setSelectedRowIndex(0);
                }
            } catch (err) {
                setError(err.response?.data?.error || 'Failed to fetch stock adjustments');
            } finally {
                setLoading(false);
                setShouldFetch(false);
            }
        };

        fetchData();
    }, [shouldFetch, data.fromDate, data.toDate]);

    // Filter adjustments based on search, adjustment type and date range
    useEffect(() => {
        const filtered = data.stockAdjustments.filter(adjustment => {
            const matchesSearch =
                adjustment.itemName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                adjustment.reason?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                adjustment.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                adjustment.billNumber?.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesAdjustmentType =
                adjustmentTypeFilter === '' ||
                adjustment.adjustmentType?.toLowerCase() === adjustmentTypeFilter.toLowerCase();

            return matchesSearch && matchesAdjustmentType;
        });

        setFilteredAdjustments(filtered);
        // Reset selected row when filters change, but only if we don't have a saved position
        if (!draftSave?.stockAdjustmentsSearch?.selectedRowIndex) {
            setSelectedRowIndex(0);
        }
    }, [data.stockAdjustments, searchQuery, adjustmentTypeFilter]);

    // Calculate total quantity when filtered adjustments change
    useEffect(() => {
        if (filteredAdjustments.length === 0) {
            setTotalQuantity(0);
            return;
        }

        const newTotalQuantity = filteredAdjustments.reduce((acc, adjustment) => {
            return acc + (adjustment.quantity || 0);
        }, 0);

        setTotalQuantity(newTotalQuantity);
    }, [filteredAdjustments]);

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (filteredAdjustments.length === 0) return;

            // Check if focus is inside an input or select element
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
                    setSelectedRowIndex(prev => Math.min(filteredAdjustments.length - 1, prev + 1));
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [filteredAdjustments, selectedRowIndex, navigate]);

    // F9 key handler for product modal
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

    // Event handlers
    const handleDateChange = (e) => {
        const { name, value } = e.target;
        setData(prev => ({ ...prev, [name]: value }));
    };

    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value);
    };

    const handleAdjustmentTypeFilterChange = (e) => {
        setAdjustmentTypeFilter(e.target.value);
    };

    const handleGenerateReport = () => {
        if (!data.fromDate || !data.toDate) {
            setError('Please select both from and to dates');
            return;
        }
        setShouldFetch(true);
    };

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

    const formatCurrency = useCallback((amount) => {
        const number = parseFloat(amount || 0);
        return number.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }, []);

    const handleRowClick = useCallback((index) => {
        setSelectedRowIndex(index);
    }, []);

    const handleRowDoubleClick = useCallback((adjustmentId) => {
        navigate(`/stockAdjustments/${adjustmentId}/print`);
    }, [navigate]);

    const handlePrint = (filtered = false) => {
        const rowsToPrint = filtered ? filteredAdjustments : data.stockAdjustments;

        if (rowsToPrint.length === 0) {
            alert("No adjustments to print");
            return;
        }

        const printWindow = window.open("", "_blank");
        const printHeader = `
            <div class="print-header">
                <h1>${data.company?.name || 'Company Name'}</h1>
                <p>
                    ${data.company?.address || ''}-${data.company?.ward || ''}, ${data.company?.city || ''},
                    ${data.company?.country || ''}<br>
                    Tel.: ${data.company?.phone || ''}, Email: ${data.company?.email || ''}<br>
                    VAT NO.: ${data.company?.pan || ''}
                </p>
                <hr>
                <h1 style="text-align:center;">Stock Adjustments</h1>
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
            .badge-xcess {
                background-color: #1cc88a;
                color: white;
                padding: 2px 5px;
                border-radius: 3px;
            }
            .badge-short {
                background-color: #e74a3b;
                color: white;
                padding: 2px 5px;
                border-radius: 3px;
            }
        </style>
        ${printHeader}
        <table>
            <thead>
                <tr>
                    <th class="nowrap">Date</th>
                    <th class="nowrap">Vch. No.</th>
                    <th class="nowrap">Item Description</th>
                    <th class="nowrap">Qty</th>
                    <th class="nowrap">Unit</th>
                    <th class="nowrap">Rate</th>
                    <th class="nowrap">Type</th>
                    <th class="nowrap">Reason</th>
                    <th class="nowrap">User</th>
                </tr>
            </thead>
            <tbody>
        `;

        let totalQty = 0;

        rowsToPrint.forEach(adjustment => {
            tableContent += `
            <tr>
                <td class="nowrap">${new Date(adjustment.date).toLocaleDateString()}</td>
                <td class="nowrap">${adjustment.billNumber}</td>
                <td class="nowrap">
                    ${adjustment.itemName}
                    ${adjustment.vatStatus === 'vatExempt' ? '*' : ''}
                </td>
                <td class="nowrap">${formatCurrency(adjustment.quantity)}</td>
                <td class="nowrap">${adjustment.unitName}</td>
                <td class="nowrap">${formatCurrency(adjustment.puPrice)}</td>
                <td class="nowrap">
                    <span class="badge-${adjustment.adjustmentType}">
                        ${adjustment.adjustmentType}
                    </span>
                </td>
                <td class="nowrap">${adjustment.reason}</td>
                <td class="nowrap">${adjustment.userName}</td>
            </tr>
            `;

            totalQty += parseFloat(adjustment.quantity || 0);
        });

        // Add final totals row
        tableContent += `
            <tr style="font-weight:bold; border-top: 2px solid #000;">
                <td colspan="3">Total Quantity</td>
                <td>${formatCurrency(totalQty)}</td>
                <td colspan="5"></td>
            </tr>
            </tbody>
        </table>
        <p>* Items marked with asterisk are VAT exempt.</p>
        `;

        printWindow.document.write(`
        <html>
            <head>
                <title>Stock Adjustments</title>
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
        const totalWidth = columnWidths.date + columnWidths.vchNo + columnWidths.itemDescription +
            columnWidths.quantity + columnWidths.unit + columnWidths.rate +
            columnWidths.type + columnWidths.reason + columnWidths.user + columnWidths.actions;

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

                {/* Vch. No. */}
                <div
                    className="d-flex align-items-center px-1 border-end position-relative"
                    style={{
                        width: `${columnWidths.vchNo}px`,
                        flexShrink: 0,
                        minWidth: '60px'
                    }}
                >
                    <strong style={{ fontSize: '0.75rem' }}>Vch. No.</strong>
                    <ResizeHandle
                        onResizeStart={handleResizeStart}
                        left={columnWidths.vchNo - 3}
                        columnName="vchNo"
                    />
                </div>

                {/* Item Description */}
                <div
                    className="d-flex align-items-center px-1 border-end position-relative"
                    style={{
                        width: `${columnWidths.itemDescription}px`,
                        flexShrink: 0,
                        minWidth: '100px'
                    }}
                >
                    <strong style={{ fontSize: '0.75rem' }}>Item Description</strong>
                    <ResizeHandle
                        onResizeStart={handleResizeStart}
                        left={columnWidths.itemDescription - 3}
                        columnName="itemDescription"
                    />
                </div>

                {/* Quantity */}
                <div
                    className="d-flex align-items-center justify-content-end px-1 border-end position-relative"
                    style={{
                        width: `${columnWidths.quantity}px`,
                        flexShrink: 0,
                        minWidth: '60px'
                    }}
                >
                    <strong style={{ fontSize: '0.75rem' }}>Qty</strong>
                    <ResizeHandle
                        onResizeStart={handleResizeStart}
                        left={columnWidths.quantity - 2}
                        columnName="quantity"
                    />
                </div>

                {/* Unit */}
                <div
                    className="d-flex align-items-center px-1 border-end position-relative"
                    style={{
                        width: `${columnWidths.unit}px`,
                        flexShrink: 0,
                        minWidth: '60px'
                    }}
                >
                    <strong style={{ fontSize: '0.75rem' }}>Unit</strong>
                    <ResizeHandle
                        onResizeStart={handleResizeStart}
                        left={columnWidths.unit - 2}
                        columnName="unit"
                    />
                </div>

                {/* Rate */}
                <div
                    className="d-flex align-items-center justify-content-end px-1 border-end position-relative"
                    style={{
                        width: `${columnWidths.rate}px`,
                        flexShrink: 0,
                        minWidth: '60px'
                    }}
                >
                    <strong style={{ fontSize: '0.75rem' }}>Rate</strong>
                    <ResizeHandle
                        onResizeStart={handleResizeStart}
                        left={columnWidths.rate - 2}
                        columnName="rate"
                    />
                </div>

                {/* Type */}
                <div
                    className="d-flex align-items-center px-1 border-end position-relative"
                    style={{
                        width: `${columnWidths.type}px`,
                        flexShrink: 0,
                        minWidth: '60px'
                    }}
                >
                    <strong style={{ fontSize: '0.75rem' }}>Type</strong>
                    <ResizeHandle
                        onResizeStart={handleResizeStart}
                        left={columnWidths.type - 2}
                        columnName="type"
                    />
                </div>

                {/* Reason */}
                <div
                    className="d-flex align-items-center px-1 border-end position-relative"
                    style={{
                        width: `${columnWidths.reason}px`,
                        flexShrink: 0,
                        minWidth: '80px'
                    }}
                >
                    <strong style={{ fontSize: '0.75rem' }}>Reason</strong>
                    <ResizeHandle
                        onResizeStart={handleResizeStart}
                        left={columnWidths.reason - 2}
                        columnName="reason"
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
        const { adjustments, selectedRowIndex, formatCurrency, navigate } = rowData;
        const adjustment = adjustments[index];

        const handleRowClick = () => {
            rowData.handleRowClick(index);
        };

        const handleDoubleClick = () => {
            navigate(`/stockAdjustments/${adjustment.adjustmentId}/print`);
        };

        const handleViewClick = (e) => {
            e.stopPropagation();
            navigate(`/retailer/stockAdjustments/${adjustment.adjustmentId}/print`);
        };

        const handleEditClick = (e) => {
            e.stopPropagation();
            navigate(`/stockAdjustments/edit/${adjustment.adjustmentId}`);
        };

        if (!adjustment) return null;

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
                        {new Date(adjustment.date).toLocaleDateString()}
                    </span>
                </div>

                {/* Vch. No. */}
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
                        {adjustment.billNumber}
                    </span>
                </div>

                {/* Item Description */}
                <div
                    className="d-flex align-items-center px-1 border-end"
                    style={{
                        width: `${columnWidths.itemDescription}px`,
                        flexShrink: 0,
                        height: '100%',
                        overflow: 'hidden'
                    }}
                    title={adjustment.itemName}
                >
                    <span style={{ fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {adjustment.itemName}
                        {adjustment.vatStatus === 'vatExempt' && '*'}
                    </span>
                </div>

                {/* Quantity */}
                <div
                    className="d-flex align-items-center justify-content-end px-1 border-end"
                    style={{
                        width: `${columnWidths.quantity}px`,
                        flexShrink: 0,
                        height: '100%'
                    }}
                >
                    <span style={{ fontSize: '0.75rem' }}>
                        {formatCurrency(adjustment.quantity)}
                    </span>
                </div>

                {/* Unit */}
                <div
                    className="d-flex align-items-center px-1 border-end"
                    style={{
                        width: `${columnWidths.unit}px`,
                        flexShrink: 0,
                        height: '100%'
                    }}
                >
                    <span style={{ fontSize: '0.75rem' }}>
                        {adjustment.unitName}
                    </span>
                </div>

                {/* Rate */}
                <div
                    className="d-flex align-items-center justify-content-end px-1 border-end"
                    style={{
                        width: `${columnWidths.rate}px`,
                        flexShrink: 0,
                        height: '100%'
                    }}
                >
                    <span style={{ fontSize: '0.75rem' }}>
                        {formatCurrency(adjustment.puPrice)}
                    </span>
                </div>

                {/* Type */}
                <div
                    className="d-flex align-items-center px-1 border-end"
                    style={{
                        width: `${columnWidths.type}px`,
                        flexShrink: 0,
                        height: '100%'
                    }}
                >
                    <span className={`badge ${adjustment.adjustmentType === 'xcess' ? 'bg-success' : 'bg-danger'}`} style={{ fontSize: '0.7rem' }}>
                        {adjustment.adjustmentType}
                    </span>
                </div>

                {/* Reason */}
                <div
                    className="d-flex align-items-center px-1 border-end"
                    style={{
                        width: `${columnWidths.reason}px`,
                        flexShrink: 0,
                        height: '100%',
                        overflow: 'hidden'
                    }}
                    title={adjustment.reason}
                >
                    <span style={{ fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {adjustment.reason}
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
                    title={adjustment.userName}
                >
                    <span style={{ fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {adjustment.userName}
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
                        disabled={!data.isAdminOrSupervisor}
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

        const prevAdjustment = prevProps.data.adjustments[prevProps.index];
        const nextAdjustment = nextProps.data.adjustments[nextProps.index];

        return (
            shallowEqual(prevAdjustment, nextAdjustment) &&
            prevProps.data.selectedRowIndex === nextProps.data.selectedRowIndex
        );
    });

    // Reset column widths function
    const resetColumnWidths = () => {
        setColumnWidths({
            date: 90,
            vchNo: 100,
            itemDescription: 200,
            quantity: 80,
            unit: 70,
            rate: 80,
            type: 90,
            reason: 150,
            user: 120,
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
                    <h1 className="h4 mb-0 text-center text-primary">Stock Adjustments Register</h1>
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
                                        disabled={data.stockAdjustments.length === 0}
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

                        {/* Adjustment Type Filter Row */}
                        <div className="col-12 col-md-2">
                            <div className="position-relative">
                                <select
                                    className="form-select form-select-sm"
                                    id="adjustmentTypeFilter"
                                    value={adjustmentTypeFilter}
                                    onChange={handleAdjustmentTypeFilterChange}
                                    disabled={data.stockAdjustments.length === 0}
                                    style={{
                                        height: '30px',
                                        fontSize: '0.875rem',
                                        paddingTop: '0.25rem',
                                        width: '100%'
                                    }}
                                >
                                    <option value="">All</option>
                                    <option value="xcess">Xcess</option>
                                    <option value="short">Short</option>
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
                                    Adjustment Type
                                </label>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="col-12 col-md-auto d-flex align-items-end justify-content-end gap-2">
                            <button
                                className="btn btn-secondary btn-sm d-flex align-items-center"
                                onClick={() => navigate('/retailer/stockAdjustments/new')}
                                style={{
                                    height: '30px',
                                    padding: '0 12px',
                                    fontSize: '0.8rem',
                                    fontWeight: '500',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                <i className="fas fa-plus me-1"></i>New
                            </button>
                            <button
                                className="btn btn-secondary btn-sm d-flex align-items-center"
                                onClick={() => handlePrint(false)}
                                disabled={data.stockAdjustments.length === 0}
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
                                disabled={data.stockAdjustments.length === 0}
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
                            <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => window.location.reload()}
                                style={{
                                    height: '30px',
                                    padding: '0 12px',
                                    fontSize: '0.8rem',
                                    fontWeight: '500'
                                }}
                            >
                                Refresh
                            </button>
                        </div>
                    </div>

                    {data.stockAdjustments.length === 0 ? (
                        <div className="alert alert-info text-center py-3" style={{ fontSize: '0.875rem' }}>
                            <i className="fas fa-info-circle me-2"></i>
                            Please select date range and click "Generate Report" to view data
                        </div>
                    ) : (
                        <>
                            {/* Adjustments Table */}
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
                                            Loading adjustments...
                                        </p>
                                    </div>
                                ) : filteredAdjustments.length === 0 ? (
                                    <div className="d-flex flex-column justify-content-center align-items-center h-100">
                                        <i className="bi bi-search text-muted" style={{ fontSize: '1.5rem' }}></i>
                                        <h6 className="mt-2 text-muted" style={{ fontSize: '0.9rem' }}>
                                            No adjustments found
                                        </h6>
                                        <p className="text-muted small" style={{ fontSize: '0.75rem' }}>
                                            {searchQuery ? 'Try a different search term' : 'No data for the selected date range'}
                                        </p>
                                    </div>
                                ) : (
                                    <AutoSizer>
                                        {({ height, width }) => {
                                            const totalWidth = columnWidths.date + columnWidths.vchNo + columnWidths.itemDescription +
                                                columnWidths.quantity + columnWidths.unit + columnWidths.rate +
                                                columnWidths.type + columnWidths.reason + columnWidths.user + columnWidths.actions;

                                            return (
                                                <div style={{
                                                    position: 'relative',
                                                    height: height,
                                                    width: Math.max(width, totalWidth),
                                                }}>
                                                    <TableHeader />
                                                    <List
                                                        height={height - 28}
                                                        itemCount={filteredAdjustments.length}
                                                        itemSize={28}
                                                        width={Math.max(width, totalWidth)}
                                                        itemData={{
                                                            adjustments: filteredAdjustments,
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
                                        width: `${columnWidths.date + columnWidths.vchNo + columnWidths.itemDescription}px`,
                                        flexShrink: 0,
                                        height: '100%'
                                    }}
                                >
                                    <strong style={{ fontSize: '0.75rem' }}>Total Quantity:</strong>
                                </div>

                                <div
                                    className="d-flex align-items-center justify-content-end px-1 border-start"
                                    style={{
                                        width: `${columnWidths.quantity}px`,
                                        flexShrink: 0,
                                        height: '100%'
                                    }}
                                >
                                    <strong style={{ fontSize: '0.75rem' }}>{formatCurrency(totalQuantity)}</strong>
                                </div>

                                <div
                                    className="d-flex align-items-center px-1 border-start"
                                    style={{
                                        width: `${columnWidths.unit + columnWidths.rate + columnWidths.type + columnWidths.reason + columnWidths.user + columnWidths.actions}px`,
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

export default StockAdjustmentsList;