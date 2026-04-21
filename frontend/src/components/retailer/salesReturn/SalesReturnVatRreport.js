// import React, { useState, useEffect, useRef } from 'react';
// import { useNavigate } from 'react-router-dom';
// import axios from 'axios';
// import Header from '../Header';
// import NepaliDate from 'nepali-date-converter';
// import { usePageNotRefreshContext } from '../PageNotRefreshContext';
// import '../../../stylesheet/noDateIcon.css'
// import Loader from '../../Loader';

// const SalesReturnVatReport = () => {
//     const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
//     const currentEnglishDate = new Date().toISOString().split('T')[0];
//     const { draftSave, setDraftSave } = usePageNotRefreshContext();

//     const [company, setCompany] = useState({
//         dateFormat: 'nepali',
//         vatEnabled: true,
//         fiscalYear: {}
//     });

//     const [data, setData] = useState(() => {
//         if (draftSave && draftSave.salesReturnVatData) {
//             return draftSave.salesReturnVatData;
//         }
//         return {
//             company: null,
//             currentFiscalYear: null,
//             salesReturnVatReport: [],
//             fromDate: '',
//             toDate: company.dateFormat === 'nepali' ? currentNepaliDate : currentEnglishDate,
//             companyDateFormat: 'english'
//         };
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

//                     // Set dates based on fiscal year
//                     if (currentFiscalYear?.startDate) {
//                         setData(prev => ({
//                             ...prev,
//                             fromDate: dateFormat === 'nepali'
//                                 ? new NepaliDate(currentFiscalYear.startDate).format('YYYY-MM-DD')
//                                 : new NepaliDate(currentFiscalYear.startDate).format('YYYY-MM-DD'),
//                             toDate: dateFormat === 'nepali' ? currentNepaliDate : currentEnglishDate,
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
//     const [searchQuery, setSearchQuery] = useState('');
//     const [totals, setTotals] = useState({
//         totalAmount: 0,
//         discountAmount: 0,
//         nonVatSales: 0,
//         taxableAmount: 0,
//         vatAmount: 0
//     });

//     const [selectedRowIndex, setSelectedRowIndex] = useState(0);
//     const [filteredReports, setFilteredReports] = useState([]);

//     const fromDateRef = useRef(null);
//     const toDateRef = useRef(null);
//     const searchInputRef = useRef(null);
//     const generateReportRef = useRef(null);
//     const tableBodyRef = useRef(null);
//     const [shouldFetch, setShouldFetch] = useState(false);
//     const navigate = useNavigate();

//     const api = axios.create({
//         baseURL: process.env.REACT_APP_API_BASE_URL,
//         withCredentials: true,
//     });

//     // Save draft data
//     useEffect(() => {
//         if (data.salesReturnVatReport.length > 0 || data.fromDate || data.toDate) {
//             setDraftSave({
//                 ...draftSave,
//                 salesReturnVatData: data
//             });
//         }
//     }, [data]);

//     // Fetch VAT report data
//     useEffect(() => {
//         const fetchData = async () => {
//             if (!shouldFetch) return;

//             try {
//                 setLoading(true);
//                 const params = new URLSearchParams();
//                 if (data.fromDate) params.append('fromDate', data.fromDate);
//                 if (data.toDate) params.append('toDate', data.toDate);

//                 const response = await api.get('/api/retailer/salesReturn-vat-report', { params });
//                 setData({
//                     ...response.data.data,
//                     fromDate: data.fromDate,
//                     toDate: data.toDate
//                 });
//                 setError(null);
//                 setSelectedRowIndex(0);
//             } catch (err) {
//                 setError(err.response?.data?.message || 'Failed to fetch sales return VAT report');
//             } finally {
//                 setLoading(false);
//                 setShouldFetch(false);
//             }
//         };

//         fetchData();
//     }, [shouldFetch]);

//     useEffect(() => {
//         const filtered = data.salesReturnVatReport.filter(report => {
//             const billNumber = report.billNumber ? report.billNumber.toString().toLowerCase() : '';
//             const accountName = report.accountName ? report.accountName.toString().toLowerCase() : '';
//             const panNumber = report.panNumber ? report.panNumber.toString().toLowerCase() : '';

//             return (
//                 billNumber.includes(searchQuery.toLowerCase()) ||
//                 accountName.includes(searchQuery.toLowerCase()) ||
//                 panNumber.includes(searchQuery.toLowerCase())
//             );
//         });

//         setFilteredReports(filtered);
//         setSelectedRowIndex(0);
//     }, [data.salesReturnVatReport, searchQuery]);

//     // Calculate totals
//     useEffect(() => {
//         const newTotals = filteredReports.reduce((acc, report) => {
//             return {
//                 totalAmount: acc.totalAmount + (report.totalAmount || 0),
//                 discountAmount: acc.discountAmount + (report.discountAmount || 0),
//                 nonVatSales: acc.nonVatSales + (report.nonVatSales || 0),
//                 taxableAmount: acc.taxableAmount + (report.taxableAmount || 0),
//                 vatAmount: acc.vatAmount + (report.vatAmount || 0)
//             };
//         }, {
//             totalAmount: 0,
//             discountAmount: 0,
//             nonVatSales: 0,
//             taxableAmount: 0,
//             vatAmount: 0
//         });

//         setTotals(newTotals);
//     }, [filteredReports]);

//     // Keyboard navigation
//     useEffect(() => {
//         const handleKeyDown = (e) => {
//             if (filteredReports.length === 0) return;

//             const activeElement = document.activeElement;
//             if (['INPUT', 'SELECT', 'TEXTAREA'].includes(activeElement.tagName)) return;

//             switch (e.key) {
//                 case 'ArrowUp':
//                     e.preventDefault();
//                     setSelectedRowIndex(prev => Math.max(0, prev - 1));
//                     break;
//                 case 'ArrowDown':
//                     e.preventDefault();
//                     setSelectedRowIndex(prev => Math.min(filteredReports.length - 1, prev + 1));
//                     break;
//                 case 'Enter':
//                     if (filteredReports[selectedRowIndex]) {
//                         // Handle view action if needed
//                     }
//                     break;
//                 default:
//                     break;
//             }
//         };

//         window.addEventListener('keydown', handleKeyDown);
//         return () => window.removeEventListener('keydown', handleKeyDown);
//     }, [filteredReports, selectedRowIndex]);

//     // Scroll to selected row
//     useEffect(() => {
//         if (tableBodyRef.current && filteredReports.length > 0) {
//             const rows = tableBodyRef.current.querySelectorAll('tr');
//             if (rows.length > selectedRowIndex) {
//                 rows[selectedRowIndex].scrollIntoView({
//                     behavior: 'smooth',
//                     block: 'nearest'
//                 });
//             }
//         }
//     }, [selectedRowIndex, filteredReports]);

//     const handleDateChange = (e) => {
//         const { name, value } = e.target;
//         setData(prev => ({ ...prev, [name]: value }));
//     };

//     const handleGenerateReport = () => {
//         if (!data.fromDate || !data.toDate) {
//             setError('Please select both from and to dates');
//             return;
//         }
//         setShouldFetch(true);
//     };

//     const handlePrint = () => {
//         if (filteredReports.length === 0) {
//             alert("No data to print");
//             return;
//         }

//         const printWindow = window.open("", "_blank");

//         // Helper functions for date formatting
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

//         const formatDisplayDate = (dateString) => {
//             if (!dateString) return '';
//             const date = new Date(dateString);
//             if (data.companyDateFormat === 'nepali') {
//                 return `${date.getDate()} ${getMonthName(dateString, data.companyDateFormat)} ${date.getFullYear()}`;
//             }
//             return date.toLocaleDateString('en-US', {
//                 year: 'numeric',
//                 month: 'short',
//                 day: 'numeric'
//             });
//         };

//         const printHeader = `
//        <div class="print-header">
//             <h1>${data.currentCompanyName || 'Company Name'}</h1>
//             <p>
//                 ${data.currentCompany?.address || ''}-${data.currentCompany?.ward || ''}, ${data.currentCompany?.city || ''},
//                 TPIN: ${data.currentCompany?.pan || ''}<br>
//                 <h2 class="report-title">Sales Return Register</h2>
//             </p>
//             <hr>
//         </div>
//     `;

//         let tableContent = `
//     <style>
//         @page { 
//             size: A4 landscape; 
//             margin: 10mm; 
//         }
//         body { 
//             font-family: Arial, sans-serif; 
//             font-size: 10px; 
//             margin: 0; 
//             padding: 5mm; 
//         }
//         table { 
//             width: 100%; 
//             border-collapse: collapse; 
//             page-break-inside: auto;
//             font-size: 12px 
//         }
//         th, td { 
//             border: 1px solid #000; 
//             padding: 0px; 
//             text-align: left; 
//         }
//         th { 
//             background-color: #f2f2f2; 
//         }
//         .print-header { 
//             text-align: center; 
//             margin-bottom: 15px; 
//         }
//         .text-end { 
//             text-align: right; 
//         }
//         .nowrap { 
//             white-space: nowrap; 
//         }
//         .report-period {
//             display: flex;
//             justify-content: space-between;
//             margin-bottom: 15px;
//         }
//         .report-title {
//             text-align: center;
//             text-decoration: underline;
//             margin-bottom: 10px;
//         }
//         .print-footer {
//             margin-top: 10px;
//             font-size: 9px;
//             text-align: right;
//         }
//         .month-year {
//             font-weight: bold;
//         }
//     </style>
//     ${printHeader}

//     <div class="report-period">
//         <div>
//             <strong>Report Period:</strong> 
//             <span class="month-year">${getMonthName(data.fromDate, data.companyDateFormat)} ${getYear(data.fromDate)}</span>
//         </div>
//           <div>
//             <strong>From:</strong> ${formatDisplayDate(data.fromDate)} 
//             <strong>To:</strong> ${formatDisplayDate(data.toDate)}
//         </div>
//         <div>
//             <strong>Printed:</strong> ${new Date().toLocaleString()}
//         </div>
//     </div>

//     <table>
//         <thead>
//             <tr>
//                 <th>Date</th>
//                 <th>Vch. No.</th>
//                 <th>Buyer's Name</th>
//                 <th>Buyer's PAN</th>
//                 <th class="text-end">Total Amount</th>
//                 <th class="text-end">Discount</th>
//                 <th class="text-end">Non-VAT Return</th>
//                 <th class="text-end">Taxable Amount</th>
//                 <th class="text-end">VAT</th>
//             </tr>
//         </thead>
//         <tbody>
//     `;

//         filteredReports.forEach(report => {
//             tableContent += `
//         <tr>
//             <td>${new Date(report.date).toISOString().split('T')[0]}</td>
//             <td>${report.billNumber}</td>
//             <td>${report.accountName}</td>
//             <td>${report.panNumber}</td>
//             <td class="text-end">${parseFloat(report.totalAmount || 0).toFixed(2)}</td>
//             <td class="text-end">${parseFloat(report.discountAmount || 0).toFixed(2)}</td>
//             <td class="text-end">${parseFloat(report.nonVatSales || 0).toFixed(2)}</td>
//             <td class="text-end">${parseFloat(report.taxableAmount || 0).toFixed(2)}</td>
//             <td class="text-end">${parseFloat(report.vatAmount || 0).toFixed(2)}</td>
//         </tr>
//         `;
//         });

//         // Add totals row
//         tableContent += `
//         <tr style="font-weight:bold;">
//             <td colspan="4">Grand Totals</td>
//             <td class="text-end">${totals.totalAmount.toFixed(2)}</td>
//             <td class="text-end">${totals.discountAmount.toFixed(2)}</td>
//             <td class="text-end">${totals.nonVatSales.toFixed(2)}</td>
//             <td class="text-end">${totals.taxableAmount.toFixed(2)}</td>
//             <td class="text-end">${totals.vatAmount.toFixed(2)}</td>
//         </tr>
//         </tbody>
//     </table>

//     <div class="print-footer">
//         Printed from ${data.currentCompanyName || 'Company Name'} | Page 1 of 1
//     </div>
//     `;

//         printWindow.document.write(`
//     <html>
//         <head>
//             <title>Sales Return VAT Report - ${getMonthName(data.fromDate, data.companyDateFormat)} ${getYear(data.fromDate)} - ${data.currentCompanyName || 'Company Name'}</title>
//         </head>
//         <body>
//             ${tableContent}
//             <script>
//                 window.onload = function() {
//                     window.print();
//                     window.onafterprint = function() {
//                         window.close();
//                     };
//                 }
//             </script>
//         </body>
//     </html>
//     `);
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

//     const handleKeyDown = (e, nextFieldId) => {
//         if (e.key === 'Enter') {
//             e.preventDefault();
//             if (nextFieldId) {
//                 document.getElementById(nextFieldId)?.focus();
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
//                     <h1 className="h3 mb-0 text-center text-primary">Sales Return VAT Report</h1>
//                 </div>

//                 <div className="card-body">
//                     {/* Date Range Filter */}
//                     <div className="row mb-4">
//                         <div className="col-md-8">
//                             <div className="row g-3 align-items-end">
//                                 <div className="col-md-3">
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
//                                 <div className="col-md-3">
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
//                                 <div className="col-md-3">
//                                     <button
//                                         id="generateReport"
//                                         className="btn btn-primary w-100"
//                                         onClick={handleGenerateReport}
//                                     >
//                                         <i className="fas fa-chart-line me-2"></i>Generate Report
//                                     </button>
//                                 </div>
//                                 <div className="col-md-3">
//                                     <div className="input-group">
//                                         <input
//                                             type="text"
//                                             className="form-control"
//                                             placeholder="Search..."
//                                             value={searchQuery}
//                                             onChange={(e) => setSearchQuery(e.target.value)}
//                                             disabled={data.salesReturnVatReport.length === 0}
//                                         />
//                                         <button
//                                             className="btn btn-outline-secondary"
//                                             type="button"
//                                             onClick={() => setSearchQuery('')}
//                                             disabled={data.salesReturnVatReport.length === 0}
//                                         >
//                                             <i className="fas fa-times"></i>
//                                         </button>
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>

//                         <div className="col-md-4 d-flex align-items-end justify-content-end">
//                             <button
//                                 className="btn btn-danger"
//                                 onClick={handlePrint}
//                                 disabled={data.salesReturnVatReport.length === 0}
//                             >
//                                 <i className="fas fa-print me-2"></i>Print Report
//                             </button>
//                         </div>
//                     </div>

//                     {data.salesReturnVatReport.length === 0 ? (
//                         <div className="alert alert-info text-center py-3">
//                             <i className="fas fa-info-circle me-2"></i>
//                             Select date range and generate report to view sales return VAT data
//                         </div>
//                     ) : (
//                         <>
//                             <div className="table-responsive">
//                                 <table className="table table-hover">
//                                     <thead className="table-light">
//                                         <tr>
//                                             <th>Date</th>
//                                             <th>Vch. No.</th>
//                                             <th>Buyer's Name</th>
//                                             <th>Buyer's PAN</th>
//                                             <th class="text-end">Total Amount</th>
//                                             <th class="text-end">Discount</th>
//                                             <th class="text-end">Non-VAT Return</th>
//                                             <th class="text-end">Taxable Amount</th>
//                                             <th class="text-end">VAT</th>
//                                         </tr>
//                                     </thead>
//                                     <tbody ref={tableBodyRef} className="table-data-rows">
//                                         {filteredReports.map((report, index) => (
//                                             <tr
//                                                 key={index}
//                                                 className={`${selectedRowIndex === index ? 'highlighted-row' : ''}`}
//                                                 onClick={() => handleRowClick(index)}
//                                             >
//                                                 <td>{new Date(report.date).toISOString().split('T')[0]}</td>
//                                                 <td>{report.billNumber}</td>
//                                                 <td>{report.accountName || 'Cash Return'}</td>
//                                                 <td>{report.panNumber}</td>
//                                                 <td className="text-end">{formatCurrency(report.totalAmount)}</td>
//                                                 <td className="text-end">{formatCurrency(report.discountAmount)}</td>
//                                                 <td className="text-end">{formatCurrency(report.nonVatSales)}</td>
//                                                 <td className="text-end">{formatCurrency(report.taxableAmount)}</td>
//                                                 <td className="text-end">{formatCurrency(report.vatAmount)}</td>
//                                             </tr>
//                                         ))}
//                                     </tbody>
//                                     <tfoot>
//                                         <tr className="table-active fw-bold">
//                                             <td colSpan="4">Totals:</td>
//                                             <td className="text-end">{formatCurrency(totals.totalAmount)}</td>
//                                             <td className="text-end">{formatCurrency(totals.discountAmount)}</td>
//                                             <td className="text-end">{formatCurrency(totals.nonVatSales)}</td>
//                                             <td className="text-end">{formatCurrency(totals.taxableAmount)}</td>
//                                             <td className="text-end">{formatCurrency(totals.vatAmount)}</td>
//                                         </tr>
//                                     </tfoot>
//                                 </table>
//                             </div>

//                             <div className="mt-3 text-end">
//                                 <small className="text-muted">
//                                     Showing {filteredReports.length} of {data.salesReturnVatReport.length} records
//                                 </small>
//                             </div>
//                         </>
//                     )}
//                 </div>
//             </div>
//         </div>
//     );
// };

// <style>{`
//     .table-data-rows tr {
//         height: 36px;
//     }
//     .table-data-rows td {
//         padding: 8px !important;
//         vertical-align: middle !important;
//     }
//     .highlighted-row {
//         background-color: #e6f7ff !important;
//     }
// `}</style>

// export default SalesReturnVatReport;

//-------------------------------------------------------------end

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../Header';
import NepaliDate from 'nepali-date-converter';
import '../../../stylesheet/noDateIcon.css';
import Loader from '../../Loader';
import * as XLSX from 'xlsx';
import NotificationToast from '../../NotificationToast';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

const SalesReturnVatReport = () => {
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

    const [company, setCompany] = useState({
        dateFormat: 'english',
        vatEnabled: true,
        fiscalYear: {}
    });

    const [data, setData] = useState({
        company: null,
        currentFiscalYear: null,
        salesReturnVatReport: [],
        fromDate: '',
        toDate: '',
        companyDateFormat: 'english',
        nepaliDate: '',
        currentCompanyName: '',
        user: null
    });

    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRowIndex, setSelectedRowIndex] = useState(0);
    const [filteredReports, setFilteredReports] = useState([]);

    // Column resizing state
    const [columnWidths, setColumnWidths] = useState({
        date: 90,
        voucherNo: 100,
        buyerName: 200,
        panNumber: 100,
        totalAmount: 100,
        discount: 100,
        nonVatReturn: 120,
        taxableAmount: 100,
        vatAmount: 100
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

    // API instance with JWT token
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

    // Helper function to check if date format is Nepali
    const isNepaliDateFormat = useCallback(() => {
        return company.dateFormat && company.dateFormat.toLowerCase() === 'nepali';
    }, [company.dateFormat]);

    // Fetch initial data
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                setLoading(true);
                const response = await api.get('/api/retailer/salesReturn-vat-report');

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

                        if (dateFormat === 'nepali') {
                            fromDateFormatted = currentFiscalYear.startDateNepali || currentNepaliDate;
                            toDateFormatted = currentNepaliDate;
                        } else {
                            fromDateFormatted = currentFiscalYear.startDate
                                ? new Date(currentFiscalYear.startDate).toISOString().split('T')[0]
                                : currentEnglishDate;
                            toDateFormatted = currentEnglishDate;
                        }

                        setData(prev => ({
                            ...prev,
                            company: responseData.company,
                            currentFiscalYear: currentFiscalYear,
                            companyDateFormat: responseData.companyDateFormat,
                            nepaliDate: responseData.nepaliDate,
                            currentCompanyName: responseData.currentCompanyName,
                            user: responseData.user,
                            fromDate: fromDateFormatted,
                            toDate: toDateFormatted
                        }));
                    } else {
                        setData(prev => ({
                            ...prev,
                            company: responseData.company,
                            currentFiscalYear: responseData.currentFiscalYear,
                            companyDateFormat: responseData.companyDateFormat,
                            nepaliDate: responseData.nepaliDate,
                            currentCompanyName: responseData.currentCompanyName,
                            user: responseData.user
                        }));
                    }
                }
            } catch (err) {
                console.error('Error fetching initial data:', err);
                setNotification({
                    show: true,
                    message: 'Error loading data',
                    type: 'error'
                });
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();
    }, []);

    // Fetch VAT report data when generate is clicked
    useEffect(() => {
        const fetchVatReportData = async () => {
            if (!shouldFetch) return;

            try {
                setLoading(true);
                const params = new URLSearchParams();
                params.append('dateFormat', company.dateFormat);
                if (data.fromDate) params.append('fromDate', data.fromDate);
                if (data.toDate) params.append('toDate', data.toDate);

                const response = await api.get(`/api/retailer/salesReturn-vat-report?${params.toString()}`);

                if (response.data.success) {
                    const responseData = response.data.data;
                    setData(prev => ({
                        ...prev,
                        salesReturnVatReport: responseData.salesReturnVatReport || [],
                        company: responseData.company || prev.company,
                        currentFiscalYear: responseData.currentFiscalYear || prev.currentFiscalYear,
                        companyDateFormat: responseData.companyDateFormat || prev.companyDateFormat,
                        nepaliDate: responseData.nepaliDate || prev.nepaliDate,
                        currentCompanyName: responseData.currentCompanyName || prev.currentCompanyName,
                        user: responseData.user || prev.user,
                        fromDate: data.fromDate,
                        toDate: data.toDate
                    }));
                    setError(null);
                    setSelectedRowIndex(0);
                } else {
                    const errorMsg = response.data.error || 'Failed to fetch sales return VAT report';
                    setError(errorMsg);
                    setNotification({
                        show: true,
                        message: errorMsg,
                        type: 'error'
                    });
                }
            } catch (err) {
                console.error('Fetch error:', err);
                const errorMsg = err.response?.data?.error || 'Failed to fetch sales return VAT report';
                setError(errorMsg);
                setNotification({
                    show: true,
                    message: errorMsg,
                    type: 'error'
                });
            } finally {
                setLoading(false);
                setShouldFetch(false);
            }
        };

        fetchVatReportData();

        // Cleanup function to reset shouldFetch when component unmounts
        return () => {
            setShouldFetch(false);
        };
    }, [shouldFetch, company.dateFormat, data.fromDate, data.toDate]);

    // Filter reports based on search
    useEffect(() => {
        const filtered = data.salesReturnVatReport.filter(report => {
            const billNumber = report.billNumber ? report.billNumber.toString().toLowerCase() : '';
            const accountName = report.accountName ? report.accountName.toString().toLowerCase() : '';
            const panNumber = report.panNumber ? report.panNumber.toString().toLowerCase() : '';

            return (
                billNumber.includes(searchQuery.toLowerCase()) ||
                accountName.includes(searchQuery.toLowerCase()) ||
                panNumber.includes(searchQuery.toLowerCase())
            );
        });

        setFilteredReports(filtered);
        setSelectedRowIndex(0);
    }, [data.salesReturnVatReport, searchQuery]);

    // Calculate totals
    const totals = useMemo(() => {
        return filteredReports.reduce((acc, report) => ({
            totalAmount: acc.totalAmount + (report.totalAmount || 0),
            discountAmount: acc.discountAmount + (report.discountAmount || 0),
            nonVatReturn: acc.nonVatReturn + (report.nonVatSalesReturn || 0),
            taxableAmount: acc.taxableAmount + (report.taxableAmount || 0),
            vatAmount: acc.vatAmount + (report.vatAmount || 0)
        }), {
            totalAmount: 0,
            discountAmount: 0,
            nonVatReturn: 0,
            taxableAmount: 0,
            vatAmount: 0
        });
    }, [filteredReports]);

    // Save/load column widths
    useEffect(() => {
        const savedWidths = localStorage.getItem('salesReturnVatTableColumnWidths');
        if (savedWidths) {
            try {
                setColumnWidths(JSON.parse(savedWidths));
            } catch (e) {
                console.error('Failed to load column widths:', e);
            }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('salesReturnVatTableColumnWidths', JSON.stringify(columnWidths));
    }, [columnWidths]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (filteredReports.length === 0) return;

            const activeElement = document.activeElement;
            if (['INPUT', 'SELECT', 'TEXTAREA'].includes(activeElement.tagName)) return;

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

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [filteredReports]);

    // Scroll to selected row
    useEffect(() => {
        if (tableBodyRef.current && filteredReports.length > 0) {
            const rows = tableBodyRef.current.querySelectorAll('tr');
            if (rows.length > selectedRowIndex) {
                rows[selectedRowIndex].scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest'
                });
            }
        }
    }, [selectedRowIndex, filteredReports]);

    const handleDateChange = (e) => {
        const { name, value } = e.target;
        setData(prev => ({ ...prev, [name]: value }));
    };

    const handleGenerateReport = () => {
        if (!data.fromDate || !data.toDate) {
            setError('Please select both from and to dates');
            setNotification({
                show: true,
                message: 'Please select both from and to dates',
                type: 'warning'
            });
            return;
        }
        setShouldFetch(true);
    };

    const handleRowClick = (index) => {
        setSelectedRowIndex(index);
    };

    const handleKeyDown = (e, nextFieldId) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (nextFieldId) {
                const nextField = document.getElementById(nextFieldId);
                if (nextField) {
                    nextField.focus();
                }
            }
        }
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

    const formatDate = useCallback((dateString) => {
        if (!dateString) return '';
        if (company.dateFormat === 'nepali') {
            try {
                return new NepaliDate(dateString).format('YYYY-MM-DD');
            } catch (error) {
                return dateString;
            }
        }
        return new Date(dateString).toISOString().split('T')[0];
    }, [company.dateFormat]);

    const exportToExcel = async () => {
        if (!data.salesReturnVatReport || data.salesReturnVatReport.length === 0) {
            setNotification({
                show: true,
                message: 'No data available to export. Please generate a report first.',
                type: 'warning'
            });
            return;
        }

        setExporting(true);
        try {
            const excelData = [];
            const currentDate = new Date().toISOString().split('T')[0];

            excelData.push(['Company Name:', data.currentCompanyName || '']);
            excelData.push(['Report Type:', 'Sales Return VAT Report']);
            excelData.push(['From Date:', data.fromDate]);
            excelData.push(['To Date:', data.toDate]);
            excelData.push(['Export Date:', currentDate]);
            excelData.push([]);

            const headers = [
                'Date', 'Vch. No.', 'Buyer\'s Name', 'Buyer\'s PAN',
                'Total Amount', 'Discount', 'Non-VAT Return', 'Taxable Amt.', 'VAT'
            ];
            excelData.push(headers);

            filteredReports.forEach((report) => {
                excelData.push([
                    formatDate(report.nepaliDate || report.date),
                    report.billNumber,
                    report.accountName,
                    report.panNumber,
                    formatCurrency(report.totalAmount),
                    formatCurrency(report.discountAmount),
                    formatCurrency(report.nonVatSalesReturn),
                    formatCurrency(report.taxableAmount),
                    formatCurrency(report.vatAmount)
                ]);
            });

            excelData.push([]);
            excelData.push([
                'TOTALS', '', '', '',
                formatCurrency(totals.totalAmount),
                formatCurrency(totals.discountAmount),
                formatCurrency(totals.nonVatReturn),
                formatCurrency(totals.taxableAmount),
                formatCurrency(totals.vatAmount)
            ]);

            const ws = XLSX.utils.aoa_to_sheet(excelData);
            ws['!cols'] = [
                { wch: 12 }, { wch: 14 }, { wch: 25 }, { wch: 12 },
                { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 12 }
            ];

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Sales Return VAT Report');

            const fileName = `Sales_Return_VAT_Report_${data.fromDate}_to_${data.toDate}.xlsx`;
            XLSX.writeFile(wb, fileName);

            setNotification({
                show: true,
                message: 'Excel file exported successfully!',
                type: 'success'
            });
        } catch (err) {
            console.error('Error exporting to Excel:', err);
            setNotification({
                show: true,
                message: 'Failed to export Excel file: ' + err.message,
                type: 'error'
            });
        } finally {
            setExporting(false);
        }
    };

    const handlePrint = () => {
        if (filteredReports.length === 0) {
            setNotification({
                show: true,
                message: 'No data to print. Please generate a report first.',
                type: 'warning'
            });
            return;
        }

        const printWindow = window.open("", "_blank");

        if (!printWindow) {
            setNotification({
                show: true,
                message: 'Popup blocked. Please allow popups for this site.',
                type: 'error'
            });
            return;
        }

        const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Sales Return VAT Report - ${data.currentCompanyName || 'Company Name'}</title>
            <style>
                @page { 
                    margin: 5mm;
                }
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                body { 
                    font-family: Arial, Helvetica, sans-serif;
                    font-size: 9px;
                    margin: 0;
                    padding: 5mm;
                }
                .print-header { 
                    text-align: center; 
                    margin-bottom: 8px;
                }
                .print-header h2 {
                    font-size: 14px;
                    margin: 2px 0;
                }
                .print-header h3 {
                    font-size: 12px;
                    margin: 2px 0;
                    text-decoration: underline;
                }
                .print-header p {
                    font-size: 8px;
                    margin: 2px 0;
                }
                .print-header hr {
                    margin: 4px 0;
                }
                .report-info {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 8px;
                    font-size: 8px;
                }
                table { 
                    width: 100%;
                    border-collapse: collapse;
                    page-break-inside: auto;
                    font-size: 8px;
                }
                tr { 
                    page-break-inside: avoid;
                    page-break-after: auto;
                }
                th, td { 
                    border: 1px solid #000;
                    padding: 3px 4px;
                    text-align: left;
                }
                th { 
                    background-color: #f2f2f2 !important;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                    font-weight: bold;
                    font-size: 8px;
                }
                .text-end { 
                    text-align: right;
                }
                .nowrap {
                    white-space: nowrap;
                }
                .total-row {
                    background-color: #e6e6e6;
                    font-weight: bold;
                }
                .print-footer {
                    margin-top: 8px;
                    font-size: 7px;
                    text-align: center;
                    border-top: 1px solid #ccc;
                    padding-top: 4px;
                }
            </style>
        </head>
        <body>
            <div class="print-header">
                <h2>${data.currentCompanyName || 'Company Name'}</h2>
                <p>
                    ${data.company?.address || ''}${data.company?.city ? ', ' + data.company.city : ''}<br>
                    PAN: ${data.company?.pan || ''} | Phone: ${data.company?.phone || ''}
                </p>
                <hr>
                <h3>Sales Return VAT Report</h3>
                <div class="report-info">
                    <div><strong>From Date:</strong> ${data.fromDate}</div>
                    <div><strong>To Date:</strong> ${data.toDate}</div>
                    <div><strong>Printed:</strong> ${new Date().toLocaleString()}</div>
                </div>
            </div>
            <table cellspacing="0">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Vch. No.</th>
                        <th>Buyer's Name</th>
                        <th>Buyer's PAN</th>
                        <th class="text-end">Total Amount</th>
                        <th class="text-end">Discount</th>
                        <th class="text-end">Non-VAT Return</th>
                        <th class="text-end">Taxable Amt.</th>
                        <th class="text-end">VAT</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredReports.map((report, index) => `
                        <tr style="${index % 2 === 0 ? 'background-color: #f9f9f9;' : ''}">
                            <td class="nowrap">${formatDate(report.nepaliDate || report.date)}</td>
                            <td class="nowrap">${report.billNumber}</td>
                            <td class="nowrap">${report.accountName || 'Cash Return'}</td>
                            <td class="nowrap">${report.panNumber}</td>
                            <td class="text-end">${formatCurrency(report.totalAmount)}</td>
                            <td class="text-end">${formatCurrency(report.discountAmount)}</td>
                            <td class="text-end">${formatCurrency(report.nonVatSalesReturn)}</td>
                            <td class="text-end">${formatCurrency(report.taxableAmount)}</td>
                            <td class="text-end">${formatCurrency(report.vatAmount)}</td>
                        </td>
                    `).join('')}
                </tbody>
                <tfoot>
                    <tr class="total-row">
                        <td colspan="4"><strong>Grand Totals</strong></td>
                        <td class="text-end"><strong>${formatCurrency(totals.totalAmount)}</strong></td>
                        <td class="text-end"><strong>${formatCurrency(totals.discountAmount)}</strong></td>
                        <td class="text-end"><strong>${formatCurrency(totals.nonVatReturn)}</strong></td>
                        <td class="text-end"><strong>${formatCurrency(totals.taxableAmount)}</strong></td>
                        <td class="text-end"><strong>${formatCurrency(totals.vatAmount)}</strong></td>
                    </tr>
                </tfoot>
            </table>
            <div class="print-footer">
                Printed from ${data.currentCompanyName || 'Company Name'} | ${new Date().toLocaleString()}
            </div>
            <script>
                window.onload = function() {
                    setTimeout(function() { 
                        window.print();
                        setTimeout(function() {
                            window.close();
                        }, 500);
                    }, 200);
                };
            <\/script>
        </body>
        </html>
    `;

        printWindow.document.write(printContent);
        printWindow.document.close();
    };

    const resetColumnWidths = () => {
        setColumnWidths({
            date: 90,
            voucherNo: 100,
            buyerName: 200,
            panNumber: 100,
            totalAmount: 100,
            discount: 100,
            nonVatReturn: 120,
            taxableAmount: 100,
            vatAmount: 100
        });
    };

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
        const totalWidth = columnWidths.date + columnWidths.voucherNo + columnWidths.buyerName +
            columnWidths.panNumber + columnWidths.totalAmount + columnWidths.discount +
            columnWidths.nonVatReturn + columnWidths.taxableAmount + columnWidths.vatAmount;

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
                <div className="d-flex align-items-center justify-content-center px-1 border-end position-relative" style={{ width: `${columnWidths.date}px`, flexShrink: 0, minWidth: '60px' }}>
                    <strong style={{ fontSize: '0.75rem' }}>Date</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.date - 2} columnName="date" />
                </div>
                <div className="d-flex align-items-center px-1 border-end position-relative" style={{ width: `${columnWidths.voucherNo}px`, flexShrink: 0, minWidth: '60px' }}>
                    <strong style={{ fontSize: '0.75rem' }}>Vch. No.</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.voucherNo - 2} columnName="voucherNo" />
                </div>
                <div className="d-flex align-items-center px-1 border-end position-relative" style={{ width: `${columnWidths.buyerName}px`, flexShrink: 0, minWidth: '100px' }}>
                    <strong style={{ fontSize: '0.75rem' }}>Buyer's Name</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.buyerName - 2} columnName="buyerName" />
                </div>
                <div className="d-flex align-items-center px-1 border-end position-relative" style={{ width: `${columnWidths.panNumber}px`, flexShrink: 0, minWidth: '80px' }}>
                    <strong style={{ fontSize: '0.75rem' }}>Buyer's PAN</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.panNumber - 2} columnName="panNumber" />
                </div>
                <div className="d-flex align-items-center justify-content-end px-1 border-end position-relative" style={{ width: `${columnWidths.totalAmount}px`, flexShrink: 0, minWidth: '80px' }}>
                    <strong style={{ fontSize: '0.75rem' }}>Total Amount</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.totalAmount - 2} columnName="totalAmount" />
                </div>
                <div className="d-flex align-items-center justify-content-end px-1 border-end position-relative" style={{ width: `${columnWidths.discount}px`, flexShrink: 0, minWidth: '80px' }}>
                    <strong style={{ fontSize: '0.75rem' }}>Discount</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.discount - 2} columnName="discount" />
                </div>
                <div className="d-flex align-items-center justify-content-end px-1 border-end position-relative" style={{ width: `${columnWidths.nonVatReturn}px`, flexShrink: 0, minWidth: '80px' }}>
                    <strong style={{ fontSize: '0.75rem' }}>Non-VAT Return</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.nonVatReturn - 2} columnName="nonVatReturn" />
                </div>
                <div className="d-flex align-items-center justify-content-end px-1 border-end position-relative" style={{ width: `${columnWidths.taxableAmount}px`, flexShrink: 0, minWidth: '80px' }}>
                    <strong style={{ fontSize: '0.75rem' }}>Taxable Amt.</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.taxableAmount - 2} columnName="taxableAmount" />
                </div>
                <div className="d-flex align-items-center justify-content-end px-1 position-relative" style={{ width: `${columnWidths.vatAmount}px`, flexShrink: 0, minWidth: '80px' }}>
                    <strong style={{ fontSize: '0.75rem' }}>VAT</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.vatAmount - 2} columnName="vatAmount" />
                </div>

                {isResizing && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, cursor: 'col-resize' }} />
                )}
            </div>
        );
    });

    // Table Row Component
    const TableRow = React.memo(({ index, style, data: rowData }) => {
        const { reports, selectedRowIndex, formatCurrency, formatDate, handleRowClick } = rowData;
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
                    borderBottom: '1px solid #dee2e6',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? '#e7f3ff' : (index % 2 === 0 ? '#f8f9fa' : 'white')
                }}
                onClick={() => handleRowClick(index)}
            >
                <div className="d-flex align-items-center justify-content-center px-1 border-end" style={{ width: `${columnWidths.date}px`, flexShrink: 0, height: '100%' }}>
                    <span style={{ fontSize: '0.75rem' }}>{formatDate(report.nepaliDate || report.date)}</span>
                </div>
                <div className="d-flex align-items-center px-1 border-end" style={{ width: `${columnWidths.voucherNo}px`, flexShrink: 0, height: '100%', overflow: 'hidden' }}>
                    <span style={{ fontSize: '0.75rem' }}>{report.billNumber}</span>
                </div>
                <div className="d-flex align-items-center px-1 border-end" style={{ width: `${columnWidths.buyerName}px`, flexShrink: 0, height: '100%', overflow: 'hidden' }} title={report.accountName}>
                    <span style={{ fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {report.accountName || 'Cash Return'}
                    </span>
                </div>
                <div className="d-flex align-items-center px-1 border-end" style={{ width: `${columnWidths.panNumber}px`, flexShrink: 0, height: '100%', overflow: 'hidden' }}>
                    <span style={{ fontSize: '0.75rem' }}>{report.panNumber}</span>
                </div>
                <div className="d-flex align-items-center justify-content-end px-1 border-end" style={{ width: `${columnWidths.totalAmount}px`, flexShrink: 0, height: '100%' }}>
                    <span style={{ fontSize: '0.75rem' }}>{formatCurrency(report.totalAmount)}</span>
                </div>
                <div className="d-flex align-items-center justify-content-end px-1 border-end" style={{ width: `${columnWidths.discount}px`, flexShrink: 0, height: '100%' }}>
                    <span style={{ fontSize: '0.75rem' }}>{formatCurrency(report.discountAmount)}</span>
                </div>
                <div className="d-flex align-items-center justify-content-end px-1 border-end" style={{ width: `${columnWidths.nonVatReturn}px`, flexShrink: 0, height: '100%' }}>
                    <span style={{ fontSize: '0.75rem' }}>{formatCurrency(report.nonVatSalesReturn)}</span>
                </div>
                <div className="d-flex align-items-center justify-content-end px-1 border-end" style={{ width: `${columnWidths.taxableAmount}px`, flexShrink: 0, height: '100%' }}>
                    <span style={{ fontSize: '0.75rem' }}>{formatCurrency(report.taxableAmount)}</span>
                </div>
                <div className="d-flex align-items-center justify-content-end px-1" style={{ width: `${columnWidths.vatAmount}px`, flexShrink: 0, height: '100%' }}>
                    <span style={{ fontSize: '0.75rem' }}>{formatCurrency(report.vatAmount)}</span>
                </div>
            </div>
        );
    });

    // Reset component state when unmounting to prevent navigation issues
    useEffect(() => {
        return () => {
            setShouldFetch(false);
            setLoading(false);
            setError(null);
        };
    }, []);

    if (loading && !data.salesReturnVatReport.length) return <Loader />;

    return (
        <div className="container-fluid">
            <Header />
            <div className="card mt-2 shadow-lg p-0 animate__animated animate__fadeInUp expanded-card ledger-card compact">
                <div className="card-header bg-white py-0">
                    <h1 className="h4 mb-0 text-center text-primary">Sales Return VAT Report</h1>
                </div>

                <div className="card-body p-2 p-md-3">
                    {/* Filter Row */}
                    <div className="row g-2 mb-3">
                        {/* From Date */}
                        <div className="col-12 col-md-2">
                            <div className="position-relative">
                                <input
                                    type="text"
                                    name="fromDate"
                                    id="fromDate"
                                    ref={fromDateRef}
                                    className={`form-control form-control-sm no-date-icon ${dateErrors.fromDate ? 'is-invalid' : ''}`}
                                    autoFocus
                                    value={data.fromDate}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        const sanitizedValue = value.replace(/[^0-9/-]/g, '');
                                        if (sanitizedValue.length <= 10) {
                                            setData(prev => ({ ...prev, fromDate: sanitizedValue }));
                                            setDateErrors(prev => ({ ...prev, fromDate: '' }));
                                        }
                                    }}
                                    onKeyDown={(e) => handleKeyDown(e, 'toDate')}
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
                                        // Date validation logic
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

                        {/* To Date */}
                        <div className="col-12 col-md-2">
                            <div className="position-relative">
                                <input
                                    type="text"
                                    name="toDate"
                                    id="toDate"
                                    ref={toDateRef}
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
                                    onKeyDown={(e) => handleKeyDown(e, 'generateReport')}
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
                                        // Similar validation as fromDate
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

                        {/* Generate Button */}
                        <div className="col-12 col-md-1">
                            <button
                                type="button"
                                id="generateReport"
                                ref={generateReportRef}
                                className="btn btn-primary btn-sm w-100"
                                onClick={handleGenerateReport}
                                style={{ height: '30px', fontSize: '0.8rem', padding: '0 12px', fontWeight: '500', whiteSpace: 'nowrap' }}
                            >
                                <i className="fas fa-chart-line me-1"></i>Generate
                            </button>
                        </div>

                        {/* Search */}
                        <div className="col-12 col-md-2">
                            <div className="position-relative">
                                <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    id="searchInput"
                                    ref={searchInputRef}
                                    placeholder=""
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    disabled={data.salesReturnVatReport.length === 0}
                                    autoComplete="off"
                                    style={{ height: '30px', fontSize: '0.875rem', paddingTop: '0.25rem', width: '100%' }}
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
                                    Search
                                </label>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="col-12 col-md-auto d-flex align-items-end justify-content-end gap-2">
                            <button
                                className="btn btn-success btn-sm"
                                onClick={exportToExcel}
                                disabled={data.salesReturnVatReport.length === 0 || exporting}
                                style={{ height: '30px', fontSize: '0.8rem', padding: '0 12px', fontWeight: '500', whiteSpace: 'nowrap' }}
                            >
                                {exporting ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="fas fa-file-excel me-1"></i>}
                                Excel
                            </button>
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={handlePrint}
                                disabled={filteredReports.length === 0}
                                style={{ height: '30px', fontSize: '0.8rem', padding: '0 12px', fontWeight: '500', whiteSpace: 'nowrap' }}
                            >
                                <i className="fas fa-print me-1"></i>Print
                            </button>
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={resetColumnWidths}
                                title="Reset column widths"
                                style={{ height: '30px', fontSize: '0.8rem', padding: '0 12px', fontWeight: '500' }}
                            >
                                <i className="fas fa-redo me-1"></i>Reset
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="alert alert-danger text-center py-1 mb-2 small" style={{ fontSize: '0.75rem' }}>
                            {error}
                            <button type="button" className="btn-close btn-sm ms-2" style={{ fontSize: '10px' }} onClick={() => setError(null)}></button>
                        </div>
                    )}

                    {data.salesReturnVatReport.length === 0 ? (
                        <div className="alert alert-info text-center py-3" style={{ fontSize: '0.875rem' }}>
                            <i className="fas fa-info-circle me-2"></i>
                            Please select date range and click "Generate Report" to view sales return VAT report
                        </div>
                    ) : (
                        <>
                            <div style={{ height: "450px", border: '1px solid #dee2e6', backgroundColor: '#fff', position: 'relative' }} ref={tableBodyRef}>
                                {loading ? (
                                    <div className="d-flex flex-column justify-content-center align-items-center h-100">
                                        <div className="spinner-border spinner-border-sm text-primary" role="status">
                                            <span className="visually-hidden">Loading...</span>
                                        </div>
                                        <p className="mt-2 small text-muted">Loading VAT report...</p>
                                    </div>
                                ) : filteredReports.length === 0 ? (
                                    <div className="d-flex flex-column justify-content-center align-items-center h-100">
                                        <i className="bi bi-search text-muted" style={{ fontSize: '1.5rem' }}></i>
                                        <h6 className="mt-2 text-muted">No records found</h6>
                                        <p className="text-muted small">{searchQuery ? 'Try a different search term' : 'No data for the selected criteria'}</p>
                                    </div>
                                ) : (
                                    <AutoSizer>
                                        {({ height, width }) => {
                                            const totalWidth = columnWidths.date + columnWidths.voucherNo + columnWidths.buyerName +
                                                columnWidths.panNumber + columnWidths.totalAmount + columnWidths.discount +
                                                columnWidths.nonVatReturn + columnWidths.taxableAmount + columnWidths.vatAmount;

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
                                                            formatDate,
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
                            {filteredReports.length > 0 && (
                                <div className="d-flex bg-light border-top sticky-bottom" style={{ zIndex: 2, height: '28px', borderTop: '2px solid #dee2e6' }}>
                                    <div className="d-flex align-items-center px-1" style={{ width: `${columnWidths.date + columnWidths.voucherNo + columnWidths.buyerName + columnWidths.panNumber}px`, flexShrink: 0, height: '100%' }}>
                                        <strong style={{ fontSize: '0.75rem' }}>Totals:</strong>
                                    </div>
                                    <div className="d-flex align-items-center justify-content-end px-1 border-start" style={{ width: `${columnWidths.totalAmount}px`, flexShrink: 0, height: '100%' }}>
                                        <strong style={{ fontSize: '0.75rem' }}>{formatCurrency(totals.totalAmount)}</strong>
                                    </div>
                                    <div className="d-flex align-items-center justify-content-end px-1 border-start" style={{ width: `${columnWidths.discount}px`, flexShrink: 0, height: '100%' }}>
                                        <strong style={{ fontSize: '0.75rem' }}>{formatCurrency(totals.discountAmount)}</strong>
                                    </div>
                                    <div className="d-flex align-items-center justify-content-end px-1 border-start" style={{ width: `${columnWidths.nonVatReturn}px`, flexShrink: 0, height: '100%' }}>
                                        <strong style={{ fontSize: '0.75rem' }}>{formatCurrency(totals.nonVatReturn)}</strong>
                                    </div>
                                    <div className="d-flex align-items-center justify-content-end px-1 border-start" style={{ width: `${columnWidths.taxableAmount}px`, flexShrink: 0, height: '100%' }}>
                                        <strong style={{ fontSize: '0.75rem' }}>{formatCurrency(totals.taxableAmount)}</strong>
                                    </div>
                                    <div className="d-flex align-items-center justify-content-end px-1 border-start" style={{ width: `${columnWidths.vatAmount}px`, flexShrink: 0, height: '100%' }}>
                                        <strong style={{ fontSize: '0.75rem' }}>{formatCurrency(totals.vatAmount)}</strong>
                                    </div>

                                    <div className="text-muted small">
                                        <i className="fas fa-list me-4"></i>
                                        Showing {filteredReports.length} {filteredReports.length === 1 ? 'record' : 'records'}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Notification Toast */}
            <NotificationToast
                show={notification.show}
                message={notification.message}
                type={notification.type}
                onClose={() => setNotification({ ...notification, show: false })}
            />
        </div>
    );
};

export default SalesReturnVatReport;