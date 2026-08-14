// import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
// import { useLocation, useNavigate } from 'react-router-dom';
// import axios from 'axios';
// import NepaliDate from 'nepali-datetime';

// import {
//     Chart as ChartJS,
//     CategoryScale,
//     LinearScale,
//     PointElement,
//     LineElement,
//     BarElement,
//     ArcElement,
//     Title,
//     Tooltip,
//     Legend,
// } from 'chart.js';
// import { Line, Doughnut } from 'react-chartjs-2';
// import Header from '../Header';
// import NotificationToast from '../../NotificationToast';
// import * as XLSX from 'xlsx';

// // Helper functions for date conversion
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

// // Register ChartJS components
// ChartJS.register(
//     CategoryScale,
//     LinearScale,
//     PointElement,
//     LineElement,
//     BarElement,
//     ArcElement,
//     Title,
//     Tooltip,
//     Legend
// );

// const DailyProfitResult = () => {
//     const [results, setResults] = useState(null);
//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState(null);
//     const [filter, setFilter] = useState('');
//     const [searchQuery, setSearchQuery] = useState('');
//     const [currentPage, setCurrentPage] = useState(1);
//     const [itemsPerPage, setItemsPerPage] = useState(10);
//     const [showTotals, setShowTotals] = useState(true);
//     const [exporting, setExporting] = useState(false);
//     const [companyDateFormat, setCompanyDateFormat] = useState('english');
//     const [fromDateBs, setFromDateBs] = useState('');
//     const [toDateBs, setToDateBs] = useState('');
//     const location = useLocation();
//     const navigate = useNavigate();
//     const tableRef = useRef(null);

//     const [notification, setNotification] = useState({
//         show: false,
//         message: '',
//         type: 'success',
//         duration: 3000
//     });

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

//     // Function to format date based on company date format
//     const formatDate = useCallback((dateString, isBsDate = false) => {
//         if (!dateString) return '';

//         try {
//             if (companyDateFormat === 'nepali') {
//                 // If the date is already in BS format or we're passing a BS date
//                 if (isBsDate) {
//                     try {
//                         const nepaliDate = new NepaliDate(dateString);
//                         return nepaliDate.format('YYYY-MM-DD');
//                     } catch (error) {
//                         return dateString;
//                     }
//                 }
                
//                 // Try to parse as BS date directly first
//                 if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
//                     try {
//                         const testNepaliDate = new NepaliDate(dateString);
//                         // Check if it's a valid Nepali date (year between 2000-2090)
//                         const year = testNepaliDate.getYear();
//                         if (year >= 2000 && year <= 2090) {
//                             return testNepaliDate.format('YYYY-MM-DD');
//                         }
//                     } catch (error) {
//                         // Not a valid Nepali date, try converting from AD
//                     }
//                 }
                
//                 // Convert AD to BS for display
//                 const bsDate = convertAdToBs(dateString);
//                 if (bsDate) {
//                     try {
//                         const nepaliDate = new NepaliDate(bsDate);
//                         return nepaliDate.format('YYYY-MM-DD');
//                     } catch (error) {
//                         return bsDate;
//                     }
//                 }
//                 return dateString;
//             } else {
//                 // For English format, return as is (AD date)
//                 return dateString;
//             }
//         } catch (error) {
//             console.error('Error formatting date:', error);
//             return dateString;
//         }
//     }, [companyDateFormat]);

//     // Function to format Nepali date for display
//     const formatNepaliDate = useCallback((dateString) => {
//         if (!dateString) return '';
        
//         try {
//             // If it's already in YYYY-MM-DD format, try to create NepaliDate
//             if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
//                 const nepaliDate = new NepaliDate(dateString);
//                 return nepaliDate.format('YYYY-MM-DD');
//             }
//             return dateString;
//         } catch (error) {
//             console.error('Error formatting Nepali date:', error);
//             return dateString;
//         }
//     }, []);

//     useEffect(() => {
//         const fetchResults = async () => {
//             try {
//                 // Extract query parameters from URL
//                 const searchParams = new URLSearchParams(location.search);
//                 const fromDate = searchParams.get('fromDate');
//                 const toDate = searchParams.get('toDate');
//                 const fromDateAd = searchParams.get('fromDateAd');
//                 const toDateAd = searchParams.get('toDateAd');

//                 // Store BS dates for display (these are the Nepali dates from the form)
//                 if (fromDate) {
//                     setFromDateBs(formatNepaliDate(fromDate));
//                 } else if (fromDateAd) {
//                     // If only AD date is provided, convert to BS for display
//                     const bsDate = convertAdToBs(fromDateAd);
//                     if (bsDate) setFromDateBs(formatNepaliDate(bsDate));
//                 }
                
//                 if (toDate) {
//                     setToDateBs(formatNepaliDate(toDate));
//                 } else if (toDateAd) {
//                     const bsDate = convertAdToBs(toDateAd);
//                     if (bsDate) setToDateBs(formatNepaliDate(bsDate));
//                 }

//                 // Use AD dates for API call (prefer fromDateAd/toDateAd, fallback to fromDate/toDate)
//                 let apiFromDate = fromDateAd;
//                 let apiToDate = toDateAd;

//                 if (!apiFromDate && fromDate) {
//                     // Convert BS to AD for API call
//                     apiFromDate = convertBsToAd(fromDate);
//                     apiToDate = convertBsToAd(toDate);
//                 }

//                 if (!apiFromDate || !apiToDate) {
//                     setError('Date range parameters are required');
//                     setLoading(false);
//                     return;
//                 }

//                 const response = await api.post('/api/retailer/daily-profit/sales-analysis', {
//                     fromDate: apiFromDate,
//                     toDate: apiToDate
//                 });

//                 if (response.data.success) {
//                     const data = response.data.data;
//                     // Get company date format from response
//                     const dateFormat = data.companyDateFormat || 'english';
//                     setCompanyDateFormat(dateFormat);

//                     // Process daily profit data - format dates based on company format
//                     const processedDailyProfit = data.dailyProfit.map(day => {
//                         let formattedDate = day.date;
                        
//                         if (dateFormat === 'nepali') {
//                             // Convert AD date from API to BS date for display
//                             const bsDate = convertAdToBs(day.date);
//                             if (bsDate) {
//                                 try {
//                                     const nepaliDate = new NepaliDate(bsDate);
//                                     formattedDate = nepaliDate.format('YYYY-MM-DD');
//                                 } catch (error) {
//                                     formattedDate = bsDate;
//                                 }
//                             }
//                         } else {
//                             // For English format, use the AD date as is
//                             formattedDate = day.date;
//                         }
                        
//                         return {
//                             ...day,
//                             formattedDate: formattedDate
//                         };
//                     });

//                     setResults({
//                         ...data,
//                         dailyProfit: processedDailyProfit
//                     });
//                 } else {
//                     setError(response.data.error || response.data.message);
//                     setNotification({
//                         show: true,
//                         message: response.data.error || response.data.message || 'Failed to fetch profit analysis results',
//                         type: 'error',
//                         duration: 3000
//                     });
//                 }
//             } catch (err) {
//                 console.error('Error fetching results:', err);
//                 setError(err.response?.data?.error || err.response?.data?.message || 'Failed to fetch profit analysis results');
//                 setNotification({
//                     show: true,
//                     message: err.response?.data?.error || 'Failed to fetch profit analysis results',
//                     type: 'error',
//                     duration: 3000
//                 });
//             } finally {
//                 setLoading(false);
//             }
//         };

//         fetchResults();
//     }, [location.search, formatNepaliDate]);

//     // Filter and paginate data
//     const filteredData = useMemo(() => {
//         if (!results?.dailyProfit) return [];

//         return results.dailyProfit.filter(day => {
//             const matchesSearch = day.formattedDate.toLowerCase().includes(searchQuery.toLowerCase());
//             const matchesFilter = filter === '' ||
//                 (filter === 'profit' && day.netProfit >= 0) ||
//                 (filter === 'loss' && day.netProfit < 0);
//             return matchesSearch && matchesFilter;
//         });
//     }, [results, searchQuery, filter]);

//     // Pagination
//     const currentPageItems = useMemo(() => {
//         if (itemsPerPage === 'all') return filteredData;
//         const start = (currentPage - 1) * itemsPerPage;
//         const end = start + itemsPerPage;
//         return filteredData.slice(start, end);
//     }, [filteredData, itemsPerPage, currentPage]);

//     const totalPages = itemsPerPage === 'all' ? 1 : Math.ceil(filteredData.length / itemsPerPage);

//     const handlePageChange = useCallback((newPage) => {
//         if (itemsPerPage === 'all') return;
//         if (newPage >= 1 && newPage <= totalPages) {
//             setCurrentPage(newPage);
//             window.scrollTo({ top: 0, behavior: 'smooth' });
//         }
//     }, [itemsPerPage, totalPages]);

//     const handlePrint = () => {
//         if (!results || !filteredData.length) {
//             setNotification({ show: true, message: 'No data to print', type: 'warning', duration: 3000 });
//             return;
//         }

//         const printWindow = window.open('', '_blank');
        
//         printWindow.document.write(`
//             <!DOCTYPE html><html><head><title>Profit Analysis Report</title>
//             <style>@page{size:landscape;margin:10mm}body{font-family:Arial;font-size:10px;margin:0;padding:5mm}
//             .print-header{text-align:center;margin-bottom:20px}table{width:100%;border-collapse:collapse;font-size:12px}
//             th,td{border:1px solid #000;padding:4px;text-align:left}th{background:#f2f2f2}.text-end{text-align:right}
//             .profit-row{background:#e6f7ff}.loss-row{background:#fff7e6}.total-row{background:#e6e6e6;font-weight:bold}</style></head>
//             <body><div class="print-header"><h3>${results.currentCompanyName || 'Company Name'}</h3>
//             <h2>Profit Analysis Report</h2><p><strong>Date Range:</strong> ${fromDateBs || results.fromDate} to ${toDateBs || results.toDate}</p><hr></div>
//             <table><thead><tr><th>Date</th><th class="text-end">Gross Sales</th><th class="text-end">Sales Returns</th><th class="text-end">Net Sales</th>
//             <th class="text-end">Gross Purchases</th><th class="text-end">Purchase Returns</th><th class="text-end">Net Purchases</th>
//             <th class="text-end">Net Profit</th><th class="text-end">SP (%)</th><th class="text-end">CP (%)</th><th>Transactions</th></tr></thead>
//             <tbody>${filteredData.map(day => `<tr class="${day.netProfit >= 0 ? 'profit-row' : 'loss-row'}">
//                 <td>${day.formattedDate}</td><td class="text-end">${formatCurrency(day.grossSales)}</td>
//                 <td class="text-end">${formatCurrency(day.returns)}</td><td class="text-end">${formatCurrency(day.netSales)}</td>
//                 <td class="text-end">${formatCurrency(day.grossPurchases)}</td><td class="text-end">${formatCurrency(day.purchaseReturns)}</td>
//                 <td class="text-end">${formatCurrency(day.netPurchases)}</td><td class="text-end">${formatCurrency(day.netProfit)}</td>
//                 <td class="text-end">${formatPercentage(day.netProfit, day.netSales)}</td>
//                 <td class="text-end">${formatPercentage(day.netProfit, day.netCost)}</td>
//                 <td class="text-end">${(day.salesCount || 0) + (day.purchaseCount || 0) + (day.returnCount || 0)}</td>
//             </tr>`).join('')}</tbody>
//             ${showTotals ? `<tfoot><tr class="total-row"><td colspan="1">Totals</td>
//             <td class="text-end">${formatCurrency(results.summary.totalGrossSales)}</td>
//             <td class="text-end">${formatCurrency(results.summary.totalSalesReturns)}</td>
//             <td class="text-end">${formatCurrency(results.summary.totalNetSales)}</td>
//             <td class="text-end">${formatCurrency(results.summary.totalGrossPurchases)}</td>
//             <td class="text-end">${formatCurrency(results.summary.totalPurchaseReturns)}</td>
//             <td class="text-end">${formatCurrency(results.summary.totalNetPurchases)}</td>
//             <td class="text-end">${formatCurrency(results.summary.totalNetProfit)}</td>
//             <td class="text-end">${formatPercentage(results.summary.totalNetProfit, results.summary.totalNetSales)}</td>
//             <td class="text-end">${formatPercentage(results.summary.totalNetProfit, results.summary.totalNetPurchases)}</td>
//             <td class="text-end"></td>
//             <tr></tfoot>` : ''}
//         </table><div class="print-footer">Generated on ${new Date().toLocaleString()}</div>
//         <script>window.onload=function(){window.print();window.onafterprint=function(){window.close()}}<\/script></body></html>
//         `);
//         printWindow.document.close();
//     };

//     const exportToExcel = async () => {
//         if (!results || !filteredData.length) {
//             setNotification({ show: true, message: 'No data to export', type: 'warning', duration: 3000 });
//             return;
//         }
//         setExporting(true);
//         try {
//             const excelData = filteredData.map((day, i) => ({
//                 '#': i + 1,
//                 'Date': day.formattedDate,
//                 'Gross Sales': formatCurrency(day.grossSales),
//                 'Sales Returns': formatCurrency(day.returns),
//                 'Net Sales': formatCurrency(day.netSales),
//                 'Gross Purchases': formatCurrency(day.grossPurchases),
//                 'Purchase Returns': formatCurrency(day.purchaseReturns),
//                 'Net Purchases': formatCurrency(day.netPurchases),
//                 'Net Profit': formatCurrency(day.netProfit),
//                 'SP %': formatPercentage(day.netProfit, day.netSales),
//                 'CP %': formatPercentage(day.netProfit, day.netCost),
//                 'Transactions': (day.salesCount || 0) + (day.purchaseCount || 0) + (day.returnCount || 0)
//             }));

//             if (showTotals && results.summary) {
//                 excelData.push({});
//                 excelData.push({
//                     'Date': 'TOTALS',
//                     'Gross Sales': formatCurrency(results.summary.totalGrossSales),
//                     'Sales Returns': formatCurrency(results.summary.totalSalesReturns),
//                     'Net Sales': formatCurrency(results.summary.totalNetSales),
//                     'Gross Purchases': formatCurrency(results.summary.totalGrossPurchases),
//                     'Purchase Returns': formatCurrency(results.summary.totalPurchaseReturns),
//                     'Net Purchases': formatCurrency(results.summary.totalNetPurchases),
//                     'Net Profit': formatCurrency(results.summary.totalNetProfit),
//                     'SP %': formatPercentage(results.summary.totalNetProfit, results.summary.totalNetSales),
//                     'CP %': formatPercentage(results.summary.totalNetProfit, results.summary.totalNetPurchases)
//                 });
//             }

//             const ws = XLSX.utils.json_to_sheet(excelData);
//             const wb = XLSX.utils.book_new();
//             XLSX.utils.book_append_sheet(wb, ws, 'Profit Analysis');
//             XLSX.writeFile(wb, `Profit_Analysis_${fromDateBs || results.fromDate}_to_${toDateBs || results.toDate}.xlsx`);
//             setNotification({ show: true, message: 'Excel file exported successfully!', type: 'success', duration: 3000 });
//         } catch (err) {
//             setNotification({ show: true, message: 'Failed to export data', type: 'error', duration: 3000 });
//         } finally {
//             setExporting(false);
//         }
//     };

//     const formatCurrency = useCallback((amount) => {
//         const num = amount || 0;
//         return `Rs. ${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
//     }, []);

//     const formatPercentage = useCallback((value, total) => {
//         if (!total || total === 0) return '0.00%';
//         return `${((value / total) * 100).toFixed(2)}%`;
//     }, []);

//     if (loading) {
//         return (
//             <div className="container-fluid">
//                 <Header />
//                 <div className="container">
//                     <div className="text-center py-5">
//                         <div className="spinner-border text-primary" role="status">
//                             <span className="visually-hidden">Loading...</span>
//                         </div>
//                         <p className="mt-3">Loading profit analysis results...</p>
//                     </div>
//                 </div>
//             </div>
//         );
//     }

//     if (error) {
//         return (
//             <div className="container-fluid">
//                 <Header />
//                 <div className="container">
//                     <div className="alert alert-danger mt-4" role="alert">
//                         <i className="fas fa-exclamation-triangle me-2"></i>
//                         {error}
//                     </div>
//                     <button className="btn btn-secondary" onClick={() => navigate('/retailer/daily-profit/sales-analysis')}>
//                         <i className="fas fa-arrow-left me-2"></i> Back to Form
//                     </button>
//                 </div>
//             </div>
//         );
//     }

//     if (!results || !results.dailyProfit || results.dailyProfit.length === 0) {
//         return (
//             <div className="container-fluid">
//                 <Header />
//                 <div className="container">
//                     <div className="alert alert-warning mt-4" role="alert">
//                         <i className="fas fa-info-circle me-2"></i>
//                         No results found for the selected date range.
//                     </div>
//                     <button className="btn btn-secondary" onClick={() => navigate('/retailer/daily-profit/sales-analysis')}>
//                         <i className="fas fa-arrow-left me-2"></i> Back to Form
//                     </button>
//                 </div>
//             </div>
//         );
//     }

//     // Chart data - use formatted dates for labels
//     const chartLabels = filteredData.map(day => day.formattedDate);
//     const chartProfitData = filteredData.map(day => day.netProfit);

//     const chartData = {
//         labels: chartLabels,
//         datasets: [
//             {
//                 label: 'Net Profit',
//                 data: chartProfitData,
//                 borderColor: 'rgba(75, 192, 192, 1)',
//                 backgroundColor: 'rgba(75, 192, 192, 0.2)',
//                 borderWidth: 2,
//                 tension: 0.1,
//             },
//         ],
//     };

//     const revenueData = {
//         labels: ['Net Sales', 'Sales Returns'],
//         datasets: [
//             {
//                 data: [results.summary.totalNetSales, results.summary.totalSalesReturns],
//                 backgroundColor: ['rgba(40, 167, 69, 0.8)', 'rgba(220, 53, 69, 0.8)'],
//                 borderColor: ['rgba(40, 167, 69, 1)', 'rgba(220, 53, 69, 1)'],
//                 borderWidth: 1,
//             },
//         ],
//     };

//     const chartOptions = {
//         responsive: true,
//         maintainAspectRatio: false,
//         plugins: {
//             legend: {
//                 position: 'top',
//             },
//             tooltip: {
//                 callbacks: {
//                     label: (context) => {
//                         return `${context.dataset.label}: ${formatCurrency(context.raw)}`;
//                     },
//                 },
//             },
//         },
//         scales: {
//             y: {
//                 beginAtZero: false,
//                 ticks: {
//                     callback: (value) => formatCurrency(value),
//                 },
//             },
//         },
//     };

//     const revenueOptions = {
//         responsive: true,
//         maintainAspectRatio: false,
//         plugins: {
//             legend: {
//                 position: 'right',
//             },
//             tooltip: {
//                 callbacks: {
//                     label: (context) => {
//                         const label = context.label || '';
//                         const value = context.raw;
//                         const total = context.dataset.data.reduce((a, b) => a + b, 0);
//                         const percentage = ((value / total) * 100).toFixed(2);
//                         return `${label}: ${formatCurrency(value)} (${percentage}%)`;
//                     },
//                 },
//             },
//         },
//     };

//     // Get display dates for header
//     const getDisplayFromDate = () => {
//         if (companyDateFormat === 'nepali') {
//             if (fromDateBs) return fromDateBs;
//             if (results.fromDate) {
//                 const bsDate = convertAdToBs(results.fromDate);
//                 if (bsDate) return formatNepaliDate(bsDate);
//             }
//         }
//         return results.fromDate;
//     };

//     const getDisplayToDate = () => {
//         if (companyDateFormat === 'nepali') {
//             if (toDateBs) return toDateBs;
//             if (results.toDate) {
//                 const bsDate = convertAdToBs(results.toDate);
//                 if (bsDate) return formatNepaliDate(bsDate);
//             }
//         }
//         return results.toDate;
//     };

//     return (
//         <div className="container-fluid">
//             <Header />
//             <div className="card mt-2 shadow-lg p-0 expanded-card ledger-card compact">
//                 <div className="card-header bg-white py-1 position-relative">
//                     <h1 className="h5 mb-0 text-center text-primary">Profit Analysis Results</h1>
//                     <h5 className="mb-0 position-absolute" style={{
//                         fontSize: '0.8rem',
//                         fontWeight: 'normal',
//                         right: '1rem',
//                         top: '50%',
//                         transform: 'translateY(-50%)'
//                     }}>
//                         Date: {getDisplayFromDate()} to {getDisplayToDate()}
//                     </h5>
//                 </div>
//                 <div className="card-body p-2 p-md-3">
//                     {/* Summary Cards */}
//                     <div className="row g-2 mb-3">
//                         <div className="col-md-3 col-sm-6">
//                             <div className="card bg-light">
//                                 <div className="card-body p-2">
//                                     <div className="d-flex justify-content-between align-items-center">
//                                         <div>
//                                             <h6 className="text-uppercase text-muted mb-0" style={{ fontSize: '0.7rem' }}>Total Net Sales</h6>
//                                             <h5 className="mb-0 text-success" style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
//                                                 {formatCurrency(results.summary.totalNetSales)}
//                                             </h5>
//                                         </div>
//                                         <div className="summary-icon text-success">
//                                             <i className="fas fa-line-chart"></i>
//                                         </div>
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>

//                         <div className="col-md-3 col-sm-6">
//                             <div className="card bg-light">
//                                 <div className="card-body p-2">
//                                     <div className="d-flex justify-content-between align-items-center">
//                                         <div>
//                                             <h6 className="text-uppercase text-muted mb-0" style={{ fontSize: '0.7rem' }}>Total Net Purchases</h6>
//                                             <h5 className="mb-0 text-danger" style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
//                                                 {formatCurrency(results.summary.totalNetPurchases)}
//                                             </h5>
//                                         </div>
//                                         <div className="summary-icon text-danger">
//                                             <i className="fas fa-shopping-cart"></i>
//                                         </div>
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>

//                         <div className="col-md-3 col-sm-6">
//                             <div className="card bg-light">
//                                 <div className="card-body p-2">
//                                     <div className="d-flex justify-content-between align-items-center">
//                                         <div>
//                                             <h6 className="text-uppercase text-muted mb-0" style={{ fontSize: '0.7rem' }}>Total Net Profit</h6>
//                                             <h5 className={`mb-0 text-${results.summary.totalNetProfit >= 0 ? 'success' : 'danger'}`} style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
//                                                 {formatCurrency(results.summary.totalNetProfit)}
//                                             </h5>
//                                         </div>
//                                         <div className={`summary-icon text-${results.summary.totalNetProfit >= 0 ? 'success' : 'danger'}`}>
//                                             <i className="fas fa-money-bill-wave"></i>
//                                         </div>
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>

//                         <div className="col-md-3 col-sm-6">
//                             <div className="card bg-light">
//                                 <div className="card-body p-2">
//                                     <div className="d-flex justify-content-between align-items-center">
//                                         <div>
//                                             <h6 className="text-uppercase text-muted mb-0" style={{ fontSize: '0.7rem' }}>Profit/Loss Days</h6>
//                                             <h5 className="mb-0" style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
//                                                 <span className="text-success">{results.summary.daysWithProfit}</span> /{' '}
//                                                 <span className="text-danger">{results.summary.daysWithLoss}</span>
//                                             </h5>
//                                         </div>
//                                         <div className="summary-icon text-warning">
//                                             <i className="fas fa-calendar-alt"></i>
//                                         </div>
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>
//                     </div>

//                     {/* Charts Section */}
//                     {filteredData.length > 0 && (
//                         <div className="row g-2 mb-3 no-print">
//                             <div className="col-md-6">
//                                 <div className="card">
//                                     <div className="card-header bg-primary text-white py-1">
//                                         <h3 className="card-title h6 mb-0">Daily Profit Trend</h3>
//                                     </div>
//                                     <div className="card-body p-2">
//                                         <div style={{ height: '250px' }}>
//                                             <Line data={chartData} options={chartOptions} />
//                                         </div>
//                                     </div>
//                                 </div>
//                             </div>
//                             <div className="col-md-6">
//                                 <div className="card">
//                                     <div className="card-header bg-info text-white py-1">
//                                         <h3 className="card-title h6 mb-0">Revenue Composition</h3>
//                                     </div>
//                                     <div className="card-body p-2">
//                                         <div style={{ height: '250px' }}>
//                                             <Doughnut data={revenueData} options={revenueOptions} />
//                                         </div>
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>
//                     )}

//                     {/* Controls Row */}
//                     <div className="row g-2 mb-3">
//                         <div className="col-md-3">
//                             <div className="input-group input-group-sm">
//                                 <span className="input-group-text" style={{ height: '30px', padding: '0 8px' }}>
//                                     <i className="fas fa-search small" style={{ fontSize: '11px' }}></i>
//                                 </span>
//                                 <input
//                                     type="text"
//                                     className="form-control form-control-sm"
//                                     placeholder="Search by date..."
//                                     value={searchQuery}
//                                     onChange={(e) => setSearchQuery(e.target.value)}
//                                     style={{ height: '30px', fontSize: '0.75rem' }}
//                                 />
//                                 {searchQuery && (
//                                     <button className="btn btn-outline-secondary btn-sm" type="button" onClick={() => setSearchQuery('')} style={{ height: '30px' }}>
//                                         <i className="fas fa-times"></i>
//                                     </button>
//                                 )}
//                             </div>
//                         </div>
//                         <div className="col-md-2">
//                             <select className="form-select form-select-sm" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ height: '30px', fontSize: '0.75rem', width: '100%', padding: '0 20px 0 8px' }}>
//                                 <option value="">All Days</option>
//                                 <option value="profit">Profit Days Only</option>
//                                 <option value="loss">Loss Days Only</option>
//                             </select>
//                         </div>
//                         <div className="col-md-1">
//                             <select className="form-select form-select-sm" value={itemsPerPage} onChange={(e) => { setItemsPerPage(e.target.value === 'all' ? 'all' : parseInt(e.target.value)); setCurrentPage(1); }} style={{ height: '30px', fontSize: '0.75rem', width: '100%', padding: '0 20px 0 8px' }}>
//                                 <option value="10">10</option>
//                                 <option value="25">25</option>
//                                 <option value="50">50</option>
//                                 <option value="all">All</option>
//                             </select>
//                         </div>
//                         <div className="col-md-2 d-flex align-items-center">
//                             <div className="form-check form-switch">
//                                 <input className="form-check-input" type="checkbox" role="switch" id="showTotals" checked={showTotals} onChange={() => setShowTotals(!showTotals)} style={{ marginTop: '2px' }} />
//                                 <label className="form-check-label small" htmlFor="showTotals" style={{ fontSize: '0.75rem' }}>Show Totals</label>
//                             </div>
//                         </div>
//                         <div className="col-md-2">
//                             <button className="btn btn-secondary btn-sm w-100" onClick={() => navigate('/retailer/daily-profit/sales-analysis')} style={{ height: '30px', fontSize: '0.75rem', padding: '0 6px' }}>
//                                 <i className="fas fa-arrow-left me-1"></i>Back
//                             </button>
//                         </div>
//                         <div className="col-md-1">
//                             <button className="btn btn-primary btn-sm w-100" onClick={handlePrint} style={{ height: '30px', fontSize: '0.75rem', padding: '0 6px' }}>
//                                 <i className="fas fa-print me-1"></i>Print
//                             </button>
//                         </div>
//                         <div className="col-md-1">
//                             <button className="btn btn-success btn-sm w-100" onClick={exportToExcel} disabled={exporting} style={{ height: '30px', fontSize: '0.75rem', padding: '0 6px' }}>
//                                 <i className="fas fa-file-excel me-1"></i>{exporting ? '...' : 'Excel'}
//                             </button>
//                         </div>
//                     </div>

//                     {/* Daily Profit Table */}
//                     <div className="table-responsive" style={{ maxHeight: '400px', overflow: 'auto' }}>
//                         <table className="table table-sm table-hover mb-0" style={{ fontSize: '0.75rem' }} ref={tableRef}>
//                             <thead className="table-light" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
//                                 <tr>
//                                     <th style={{ padding: '6px 8px', textAlign: 'center', width: '50px' }}>S.N.</th>
//                                     <th style={{ padding: '6px 8px' }}>Date</th>
//                                     <th className="text-end" style={{ padding: '6px 8px' }}>Gross Sales</th>
//                                     <th className="text-end" style={{ padding: '6px 8px' }}>Sales Returns</th>
//                                     <th className="text-end" style={{ padding: '6px 8px' }}>Net Sales</th>
//                                     <th className="text-end" style={{ padding: '6px 8px' }}>Gross Purchases</th>
//                                     <th className="text-end" style={{ padding: '6px 8px' }}>Purchase Returns</th>
//                                     <th className="text-end" style={{ padding: '6px 8px' }}>Net Purchases</th>
//                                     <th className="text-end" style={{ padding: '6px 8px' }}>Net Profit</th>
//                                     <th className="text-end" style={{ padding: '6px 8px' }}>SP (%)</th>
//                                     <th className="text-end" style={{ padding: '6px 8px' }}>CP (%)</th>
//                                     <th style={{ padding: '6px 8px' }}>Transactions</th>
//                                 </tr>
//                             </thead>
//                             <tbody>
//                                 {currentPageItems.map((day, idx) => {
//                                     const serialNumber = itemsPerPage === 'all' 
//                                         ? idx + 1 
//                                         : (currentPage - 1) * itemsPerPage + idx + 1;
//                                     return (
//                                         <tr key={idx} className={day.netProfit >= 0 ? 'table-success' : 'table-danger'}>
//                                             <td style={{ padding: '4px 6px', textAlign: 'center' }}>{serialNumber}</td>
//                                             <td style={{ padding: '4px 6px' }}>{day.formattedDate}</td>
//                                             <td className="text-end" style={{ padding: '4px 6px' }}>{formatCurrency(day.grossSales)}</td>
//                                             <td className="text-end" style={{ padding: '4px 6px' }}>{formatCurrency(day.returns)}</td>
//                                             <td className="text-end fw-bold" style={{ padding: '4px 6px' }}>{formatCurrency(day.netSales)}</td>
//                                             <td className="text-end" style={{ padding: '4px 6px' }}>{formatCurrency(day.grossPurchases)}</td>
//                                             <td className="text-end" style={{ padding: '4px 6px' }}>{formatCurrency(day.purchaseReturns)}</td>
//                                             <td className="text-end" style={{ padding: '4px 6px' }}>{formatCurrency(day.netPurchases)}</td>
//                                             <td className={`text-end fw-bold ${day.netProfit >= 0 ? 'text-success' : 'text-danger'}`} style={{ padding: '4px 6px' }}>
//                                                 {formatCurrency(day.netProfit)}
//                                                 {day.netProfit >= 0 ? (
//                                                     <i className="fas fa-caret-up text-success ms-1"></i>
//                                                 ) : (
//                                                     <i className="fas fa-caret-down text-danger ms-1"></i>
//                                                 )}
//                                             </td>
//                                             <td className="text-end" style={{ padding: '4px 6px' }}>{formatPercentage(day.netProfit, day.netSales)}</td>
//                                             <td className="text-end" style={{ padding: '4px 6px' }}>{formatPercentage(day.netProfit, day.netCost)}</td>
//                                             <td style={{ padding: '4px 6px' }}>
//                                                 {(day.salesCount > 0 || day.purchaseCount > 0 || day.returnCount > 0) && (
//                                                     <span className="badge bg-secondary" style={{ fontSize: '0.65rem', padding: '3px 6px' }}>
//                                                         {(day.salesCount || 0) + (day.purchaseCount || 0) + (day.returnCount || 0)}
//                                                     </span>
//                                                 )}
//                                             </td>
//                                         </tr>
//                                     );
//                                 })}
//                             </tbody>
//                             {showTotals && results.summary && (
//                                 <tfoot className="table-group-divider">
//                                     <tr className="fw-bold table-secondary">
//                                         <td colSpan="2" style={{ padding: '6px 8px' }}>Totals</td>
//                                         <td className="text-end" style={{ padding: '6px 8px' }}>{formatCurrency(results.summary.totalGrossSales)}</td>
//                                         <td className="text-end" style={{ padding: '6px 8px' }}>{formatCurrency(results.summary.totalSalesReturns)}</td>
//                                         <td className="text-end" style={{ padding: '6px 8px' }}>{formatCurrency(results.summary.totalNetSales)}</td>
//                                         <td className="text-end" style={{ padding: '6px 8px' }}>{formatCurrency(results.summary.totalGrossPurchases)}</td>
//                                         <td className="text-end" style={{ padding: '6px 8px' }}>{formatCurrency(results.summary.totalPurchaseReturns)}</td>
//                                         <td className="text-end" style={{ padding: '6px 8px' }}>{formatCurrency(results.summary.totalNetPurchases)}</td>
//                                         <td className={`text-end ${results.summary.totalNetProfit >= 0 ? 'text-success' : 'text-danger'}`} style={{ padding: '6px 8px' }}>
//                                             {formatCurrency(results.summary.totalNetProfit)}
//                                         </td>
//                                         <td className="text-end" style={{ padding: '6px 8px' }}>{formatPercentage(results.summary.totalNetProfit, results.summary.totalNetSales)}</td>
//                                         <td className="text-end" style={{ padding: '6px 8px' }}>{formatPercentage(results.summary.totalNetProfit, results.summary.totalNetPurchases)}</td>
//                                         <td style={{ padding: '6px 8px' }}>
//                                             <span className="badge bg-secondary" style={{ fontSize: '0.65rem', padding: '3px 6px' }}>
//                                                 {results.dailyProfit.reduce((sum, day) => sum + (day.salesCount || 0) + (day.purchaseCount || 0) + (day.returnCount || 0), 0)}
//                                             </span>
//                                         </td>
//                                     </tr>
//                                 </tfoot>
//                             )}
//                         </table>
//                     </div>

//                     {/* Pagination Controls */}
//                     {itemsPerPage !== 'all' && totalPages > 1 && (
//                         <div className="row mt-2">
//                             <div className="col-12">
//                                 <nav>
//                                     <ul className="pagination justify-content-center pagination-sm" style={{ marginBottom: '0' }}>
//                                         <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
//                                             <button className="page-link" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => handlePageChange(currentPage - 1)}>Previous</button>
//                                         </li>
//                                         {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
//                                             let p = totalPages <= 5 ? i + 1 : (currentPage <= 3 ? i + 1 : (currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i));
//                                             return (
//                                                 <li key={p} className={`page-item ${currentPage === p ? 'active' : ''}`}>
//                                                     <button className="page-link" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => handlePageChange(p)}>{p}</button>
//                                                 </li>
//                                             );
//                                         })}
//                                         <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
//                                             <button className="page-link" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => handlePageChange(currentPage + 1)}>Next</button>
//                                         </li>
//                                     </ul>
//                                 </nav>
//                                 <div className="text-center text-muted small" style={{ fontSize: '0.7rem' }}>
//                                     Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length} entries
//                                 </div>
//                             </div>
//                         </div>
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

// export default DailyProfitResult;

//-----------------------------------------------------end

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import NepaliDate from 'nepali-datetime';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import Header from '../Header';
import NotificationToast from '../../NotificationToast';
import * as XLSX from 'xlsx';
import { FiCalendar, FiFileText, FiPrinter, FiDownload, FiArrowLeft, FiSearch } from 'react-icons/fi';
import './DailyProfitResult.css';

// Helper functions for date conversion
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
        return `${nepaliDate.getYear()}-${String(nepaliDate.getMonth() + 1).padStart(2, '0')}-${String(nepaliDate.getDate()).padStart(2, '0')}`;
    } catch { return null; }
};

const convertBsToAd = (bsDate) => {
    if (!bsDate || !/^\d{4}-\d{2}-\d{2}$/.test(bsDate)) return null;
    try {
        const nepaliDate = new NepaliDate(bsDate);
        const jsDate = nepaliDate?.getDateObject?.();
        if (!jsDate || isNaN(jsDate.getTime())) return null;
        return `${jsDate.getFullYear()}-${String(jsDate.getMonth() + 1).padStart(2, '0')}-${String(jsDate.getDate()).padStart(2, '0')}`;
    } catch { return null; }
};

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
);

const DailyProfitResult = () => {
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [showTotals, setShowTotals] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [companyDateFormat, setCompanyDateFormat] = useState('english');
    const [fromDateBs, setFromDateBs] = useState('');
    const [toDateBs, setToDateBs] = useState('');
    
    const location = useLocation();
    const navigate = useNavigate();
    const abortControllerRef = useRef(null);

    const [notification, setNotification] = useState({
        show: false, message: '', type: 'success', duration: 3000
    });

    const api = useMemo(() => {
        const instance = axios.create({
            baseURL: process.env.REACT_APP_API_BASE_URL,
            withCredentials: true,
        });
        instance.interceptors.request.use((config) => {
            const token = localStorage.getItem('token');
            if (token) config.headers.Authorization = `Bearer ${token}`;
            return config;
        });
        return instance;
    }, []);

    // Function to format date based on company date format
    const formatDate = useCallback((dateString, isBsDate = false) => {
        if (!dateString) return '';
        try {
            if (companyDateFormat === 'nepali') {
                if (isBsDate) {
                    try {
                        const nepaliDate = new NepaliDate(dateString);
                        return nepaliDate.format('YYYY-MM-DD');
                    } catch { return dateString; }
                }
                if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
                    try {
                        const testNepaliDate = new NepaliDate(dateString);
                        const year = testNepaliDate.getYear();
                        if (year >= 2000 && year <= 2090) return testNepaliDate.format('YYYY-MM-DD');
                    } catch {}
                }
                const bsDate = convertAdToBs(dateString);
                if (bsDate) {
                    try {
                        const nepaliDate = new NepaliDate(bsDate);
                        return nepaliDate.format('YYYY-MM-DD');
                    } catch { return bsDate; }
                }
                return dateString;
            } else {
                return dateString;
            }
        } catch { return dateString; }
    }, [companyDateFormat]);

    const formatNepaliDate = useCallback((dateString) => {
        if (!dateString) return '';
        try {
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
                const nepaliDate = new NepaliDate(dateString);
                return nepaliDate.format('YYYY-MM-DD');
            }
            return dateString;
        } catch { return dateString; }
    }, []);

    useEffect(() => {
        const fetchResults = async () => {
            abortControllerRef.current?.abort();
            abortControllerRef.current = new AbortController();
            try {
                const searchParams = new URLSearchParams(location.search);
                const fromDate = searchParams.get('fromDate');
                const toDate = searchParams.get('toDate');
                const fromDateAd = searchParams.get('fromDateAd');
                const toDateAd = searchParams.get('toDateAd');

                if (fromDate) {
                    setFromDateBs(formatNepaliDate(fromDate));
                } else if (fromDateAd) {
                    const bsDate = convertAdToBs(fromDateAd);
                    if (bsDate) setFromDateBs(formatNepaliDate(bsDate));
                }
                if (toDate) {
                    setToDateBs(formatNepaliDate(toDate));
                } else if (toDateAd) {
                    const bsDate = convertAdToBs(toDateAd);
                    if (bsDate) setToDateBs(formatNepaliDate(bsDate));
                }

                let apiFromDate = fromDateAd;
                let apiToDate = toDateAd;
                if (!apiFromDate && fromDate) {
                    apiFromDate = convertBsToAd(fromDate);
                    apiToDate = convertBsToAd(toDate);
                }

                if (!apiFromDate || !apiToDate) {
                    setError('Date range parameters are required');
                    setLoading(false);
                    return;
                }

                const response = await api.post('/api/retailer/daily-profit/sales-analysis', {
                    fromDate: apiFromDate,
                    toDate: apiToDate
                }, { signal: abortControllerRef.current.signal });

                if (response.data.success) {
                    const data = response.data.data;
                    const dateFormat = data.companyDateFormat || 'english';
                    setCompanyDateFormat(dateFormat);

                    const processedDailyProfit = data.dailyProfit.map(day => {
                        let formattedDate = day.date;
                        if (dateFormat === 'nepali') {
                            const bsDate = convertAdToBs(day.date);
                            if (bsDate) {
                                try {
                                    const nepaliDate = new NepaliDate(bsDate);
                                    formattedDate = nepaliDate.format('YYYY-MM-DD');
                                } catch { formattedDate = bsDate; }
                            }
                        } else {
                            formattedDate = day.date;
                        }
                        return { ...day, formattedDate };
                    });

                    setResults({ ...data, dailyProfit: processedDailyProfit });
                } else {
                    setError(response.data.error || response.data.message);
                    setNotification({ show: true, message: response.data.error || 'Failed to fetch results', type: 'error' });
                }
            } catch (err) {
                if (err.name === 'AbortError' || err.name === 'CanceledError') return;
                console.error('Error fetching results:', err);
                setError(err.response?.data?.error || 'Failed to fetch profit analysis results');
                setNotification({ show: true, message: err.response?.data?.error || 'Failed to fetch results', type: 'error' });
            } finally {
                setLoading(false);
            }
        };
        fetchResults();
    }, [location.search, formatNepaliDate]);

        const formatCurrency = useCallback((amount) => {
        const num = amount || 0;
        return `Rs. ${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, []);

        const formatPercentage = useCallback((value, total) => {
        if (!total || total === 0) return '0.00%';
        return `${((value / total) * 100).toFixed(2)}%`;
    }, []);

    // Filter and paginate data
    const filteredData = useMemo(() => {
        if (!results?.dailyProfit) return [];
        return results.dailyProfit.filter(day => {
            const matchesSearch = day.formattedDate.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesFilter = filter === '' ||
                (filter === 'profit' && day.netProfit >= 0) ||
                (filter === 'loss' && day.netProfit < 0);
            return matchesSearch && matchesFilter;
        });
    }, [results, searchQuery, filter]);

    const currentPageItems = useMemo(() => {
        if (itemsPerPage === 'all') return filteredData;
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        return filteredData.slice(start, end);
    }, [filteredData, itemsPerPage, currentPage]);

    const totalPages = itemsPerPage === 'all' ? 1 : Math.ceil(filteredData.length / itemsPerPage);

    const handlePageChange = useCallback((newPage) => {
        if (itemsPerPage === 'all') return;
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    }, [itemsPerPage, totalPages]);

    const handlePrint = useCallback(() => {
        if (!results || !filteredData.length) {
            setNotification({ show: true, message: 'No data to print', type: 'warning' });
            return;
        }
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html><html><head><title>Profit Analysis Report</title>
            <style>@page{size:landscape;margin:10mm}body{font-family:Arial;font-size:10px;margin:0;padding:5mm}
            .print-header{text-align:center;margin-bottom:20px}table{width:100%;border-collapse:collapse;font-size:12px}
            th,td{border:1px solid #000;padding:4px;text-align:left}th{background:#f2f2f2}.text-end{text-align:right}
            .profit-row{background:#e6f7ff}.loss-row{background:#fff7e6}.total-row{background:#e6e6e6;font-weight:bold}</style></head>
            <body><div class="print-header"><h3>${results.currentCompanyName || 'Company Name'}</h3>
            <h2>Profit Analysis Report</h2><p><strong>Date Range:</strong> ${fromDateBs || results.fromDate} to ${toDateBs || results.toDate}</p><hr></div>
            <table><thead><tr><th>Date</th><th class="text-end">Gross Sales</th><th class="text-end">Sales Returns</th><th class="text-end">Net Sales</th>
            <th class="text-end">Gross Purchases</th><th class="text-end">Purchase Returns</th><th class="text-end">Net Purchases</th>
            <th class="text-end">Net Profit</th><th class="text-end">SP (%)</th><th class="text-end">CP (%)</th><th>Transactions</th></tr></thead>
            <tbody>${filteredData.map(day => `<tr class="${day.netProfit >= 0 ? 'profit-row' : 'loss-row'}">
                <td>${day.formattedDate}</td><td class="text-end">${formatCurrency(day.grossSales)}</td>
                <td class="text-end">${formatCurrency(day.returns)}</td><td class="text-end">${formatCurrency(day.netSales)}</td>
                <td class="text-end">${formatCurrency(day.grossPurchases)}</td><td class="text-end">${formatCurrency(day.purchaseReturns)}</td>
                <td class="text-end">${formatCurrency(day.netPurchases)}</td><td class="text-end">${formatCurrency(day.netProfit)}</td>
                <td class="text-end">${formatPercentage(day.netProfit, day.netSales)}</td>
                <td class="text-end">${formatPercentage(day.netProfit, day.netCost)}</td>
                <td class="text-end">${(day.salesCount || 0) + (day.purchaseCount || 0) + (day.returnCount || 0)}</td>
            </tr>`).join('')}</tbody>
            ${showTotals ? `<tfoot><tr class="total-row"><td colspan="1">Totals</td>
            <td class="text-end">${formatCurrency(results.summary.totalGrossSales)}</td>
            <td class="text-end">${formatCurrency(results.summary.totalSalesReturns)}</td>
            <td class="text-end">${formatCurrency(results.summary.totalNetSales)}</td>
            <td class="text-end">${formatCurrency(results.summary.totalGrossPurchases)}</td>
            <td class="text-end">${formatCurrency(results.summary.totalPurchaseReturns)}</td>
            <td class="text-end">${formatCurrency(results.summary.totalNetPurchases)}</td>
            <td class="text-end">${formatCurrency(results.summary.totalNetProfit)}</td>
            <td class="text-end">${formatPercentage(results.summary.totalNetProfit, results.summary.totalNetSales)}</td>
            <td class="text-end">${formatPercentage(results.summary.totalNetProfit, results.summary.totalNetPurchases)}</td>
            <td class="text-end"></td>
            <tr></tfoot>` : ''}
        </table><div class="print-footer">Generated on ${new Date().toLocaleString()}</div>
        <script>window.onload=function(){window.print();window.onafterprint=function(){window.close()}}<\/script></body></html>
        `);
        printWindow.document.close();
    }, [results, filteredData, fromDateBs, toDateBs, showTotals, formatCurrency, formatPercentage]);

    const exportToExcel = useCallback(async () => {
        if (!results || !filteredData.length) {
            setNotification({ show: true, message: 'No data to export', type: 'warning' });
            return;
        }
        setExporting(true);
        try {
            const excelData = filteredData.map((day, i) => ({
                '#': i + 1,
                'Date': day.formattedDate,
                'Gross Sales': formatCurrency(day.grossSales),
                'Sales Returns': formatCurrency(day.returns),
                'Net Sales': formatCurrency(day.netSales),
                'Gross Purchases': formatCurrency(day.grossPurchases),
                'Purchase Returns': formatCurrency(day.purchaseReturns),
                'Net Purchases': formatCurrency(day.netPurchases),
                'Net Profit': formatCurrency(day.netProfit),
                'SP %': formatPercentage(day.netProfit, day.netSales),
                'CP %': formatPercentage(day.netProfit, day.netCost),
                'Transactions': (day.salesCount || 0) + (day.purchaseCount || 0) + (day.returnCount || 0)
            }));
            if (showTotals && results.summary) {
                excelData.push({});
                excelData.push({
                    'Date': 'TOTALS',
                    'Gross Sales': formatCurrency(results.summary.totalGrossSales),
                    'Sales Returns': formatCurrency(results.summary.totalSalesReturns),
                    'Net Sales': formatCurrency(results.summary.totalNetSales),
                    'Gross Purchases': formatCurrency(results.summary.totalGrossPurchases),
                    'Purchase Returns': formatCurrency(results.summary.totalPurchaseReturns),
                    'Net Purchases': formatCurrency(results.summary.totalNetPurchases),
                    'Net Profit': formatCurrency(results.summary.totalNetProfit),
                    'SP %': formatPercentage(results.summary.totalNetProfit, results.summary.totalNetSales),
                    'CP %': formatPercentage(results.summary.totalNetProfit, results.summary.totalNetPurchases)
                });
            }
            const ws = XLSX.utils.json_to_sheet(excelData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Profit Analysis');
            XLSX.writeFile(wb, `Profit_Analysis_${fromDateBs || results.fromDate}_to_${toDateBs || results.toDate}.xlsx`);
            setNotification({ show: true, message: 'Excel exported successfully!', type: 'success' });
        } catch (err) {
            setNotification({ show: true, message: 'Failed to export data', type: 'error' });
        } finally {
            setExporting(false);
        }
    }, [results, filteredData, fromDateBs, toDateBs, showTotals, formatCurrency, formatPercentage]);


    // Get display dates for header
    const getDisplayFromDate = useCallback(() => {
        if (companyDateFormat === 'nepali') {
            if (fromDateBs) return fromDateBs;
            if (results?.fromDate) {
                const bsDate = convertAdToBs(results.fromDate);
                if (bsDate) return formatNepaliDate(bsDate);
            }
        }
        return results?.fromDate || '';
    }, [companyDateFormat, fromDateBs, results, formatNepaliDate]);

    const getDisplayToDate = useCallback(() => {
        if (companyDateFormat === 'nepali') {
            if (toDateBs) return toDateBs;
            if (results?.toDate) {
                const bsDate = convertAdToBs(results.toDate);
                if (bsDate) return formatNepaliDate(bsDate);
            }
        }
        return results?.toDate || '';
    }, [companyDateFormat, toDateBs, results, formatNepaliDate]);

    if (loading) return (
        <div className="daily-profit-page"><Header /><div className="dp-shell"><div className="dp-state"><div className="spinner-border text-primary" /><p>Loading results...</p></div></div></div>
    );

    if (error || !results || !results.dailyProfit || results.dailyProfit.length === 0) {
        return (
            <div className="daily-profit-page">
                <Header />
                <div className="dp-shell">
                    <div className="dp-state">
                        <FiCalendar size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                        <h3>{error || 'No results found'}</h3>
                        <p>{error ? 'Error loading data' : 'No data for the selected date range.'}</p>
                        <button className="dp-btn-primary" onClick={() => navigate('/retailer/daily-profit/sales-analysis')} style={{ marginTop: '1rem' }}>
                            <FiArrowLeft /> Back to Form
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Chart data
    const chartLabels = filteredData.map(day => day.formattedDate);
    const chartProfitData = filteredData.map(day => day.netProfit);

    const chartData = {
        labels: chartLabels,
        datasets: [{
            label: 'Net Profit',
            data: chartProfitData,
            borderColor: 'rgba(75, 192, 192, 1)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderWidth: 2,
            tension: 0.1,
        }],
    };

    const revenueData = {
        labels: ['Net Sales', 'Sales Returns'],
        datasets: [{
            data: [results.summary.totalNetSales, results.summary.totalSalesReturns],
            backgroundColor: ['rgba(40, 167, 69, 0.8)', 'rgba(220, 53, 69, 0.8)'],
            borderColor: ['rgba(40, 167, 69, 1)', 'rgba(220, 53, 69, 1)'],
            borderWidth: 1,
        }],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'top' },
            tooltip: {
                callbacks: {
                    label: (context) => `${context.dataset.label}: ${formatCurrency(context.raw)}`,
                },
            },
        },
        scales: {
            y: {
                beginAtZero: false,
                ticks: { callback: (value) => formatCurrency(value) },
            },
        },
    };

    const revenueOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'right' },
            tooltip: {
                callbacks: {
                    label: (context) => {
                        const label = context.label || '';
                        const value = context.raw;
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        return `${label}: ${formatCurrency(value)} (${((value / total) * 100).toFixed(2)}%)`;
                    },
                },
            },
        },
    };

    return (
        <div className="daily-profit-page">
            <Header />

            <div className="dp-shell">
                {/* Compact top bar */}
                <div className="dp-topbar">
                    <div className="dp-topbar__left">
                        <div className="dp-topbar__icon"><FiFileText /></div>
                        <div>
                            <h1>Profit Analysis</h1>
                        </div>
                    </div>
                    <div className="dp-topbar__center">
                        <FiCalendar className="me-1" style={{ fontSize: '0.65rem' }} />
                        <span>{getDisplayFromDate()} — {getDisplayToDate()}</span>
                    </div>
                    <div className="dp-topbar__actions">
                        <button type="button" className="dp-btn-icon" onClick={handlePrint} disabled={!filteredData.length}>
                            <FiPrinter /> Print
                        </button>
                        <button type="button" className="dp-btn-icon" onClick={exportToExcel} disabled={!filteredData.length || exporting}>
                            <FiDownload /> {exporting ? '…' : 'Excel'}
                        </button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="dp-stats">
                    <div className="dp-stat-card">
                        <div className="dp-stat-card__icon dp-stat-card__icon--green"><i className="fas fa-line-chart" /></div>
                        <div>
                            <p className="dp-stat-card__label">Net Sales</p>
                            <p className="dp-stat-card__value">{formatCurrency(results.summary.totalNetSales)}</p>
                        </div>
                    </div>
                    <div className="dp-stat-card">
                        <div className="dp-stat-card__icon dp-stat-card__icon--red"><i className="fas fa-shopping-cart" /></div>
                        <div>
                            <p className="dp-stat-card__label">Net Purchases</p>
                            <p className="dp-stat-card__value">{formatCurrency(results.summary.totalNetPurchases)}</p>
                        </div>
                    </div>
                    <div className="dp-stat-card">
                        <div className={`dp-stat-card__icon ${results.summary.totalNetProfit >= 0 ? 'dp-stat-card__icon--green' : 'dp-stat-card__icon--red'}`}>
                            <i className="fas fa-money-bill-wave" />
                        </div>
                        <div>
                            <p className="dp-stat-card__label">Net Profit</p>
                            <p className={`dp-stat-card__value ${results.summary.totalNetProfit >= 0 ? 'dp-value--green' : 'dp-value--red'}`}>
                                {formatCurrency(results.summary.totalNetProfit)}
                            </p>
                        </div>
                    </div>
                    <div className="dp-stat-card">
                        <div className="dp-stat-card__icon dp-stat-card__icon--amber"><i className="fas fa-calendar-alt" /></div>
                        <div>
                            <p className="dp-stat-card__label">Profit / Loss Days</p>
                            <p className="dp-stat-card__value">
                                <span className="dp-value--green">{results.summary.daysWithProfit}</span> / <span className="dp-value--red">{results.summary.daysWithLoss}</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Single-row toolbar */}
                <div className="dp-toolbar">
                    <div className="dp-field dp-field--search">
                        <label>Search</label>
                        <div className="dp-search-wrap">
                            <FiSearch className="dp-search-icon" />
                            <input
                                type="text"
                                placeholder="Date..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && (
                                <button className="dp-search-clear" onClick={() => setSearchQuery('')}>×</button>
                            )}
                        </div>
                    </div>

                    <div className="dp-field dp-field--select">
                        <label>Filter</label>
                        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                            <option value="">All Days</option>
                            <option value="profit">Profit</option>
                            <option value="loss">Loss</option>
                        </select>
                    </div>

                    <div className="dp-field dp-field--select">
                        <label>Rows</label>
                        <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(e.target.value === 'all' ? 'all' : parseInt(e.target.value)); setCurrentPage(1); }}>
                            <option value="10">10</option>
                            <option value="25">25</option>
                            <option value="50">50</option>
                            <option value="all">All</option>
                        </select>
                    </div>

                    <div className="dp-toggle-item">
                        <span>Totals</span>
                        <input className="form-check-input" type="checkbox" role="switch" checked={showTotals} onChange={() => setShowTotals(!showTotals)} />
                    </div>

                    <div className="dp-toolbar-divider" />

                    <button className="dp-btn-secondary" onClick={() => navigate('/retailer/daily-profit/sales-analysis')}>
                        <FiArrowLeft /> Back
                    </button>
                </div>

                {error && (
                    <div className="dp-alert">
                        <i className="bi bi-exclamation-circle" />{error}
                        <button type="button" className="btn-close btn-sm ms-auto" onClick={() => setError(null)} />
                    </div>
                )}

                {/* Main content area */}
                <div className="dp-main">
                    {filteredData.length === 0 ? (
                        <div className="dp-state">
                            <FiSearch size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                            <h3>No matching results</h3>
                            <p>Try adjusting your search or filter.</p>
                        </div>
                    ) : (
                        <>
                            {/* Charts Section */}
                            <div className="dp-charts">
                                <div className="dp-chart-card">
                                    <div className="dp-chart-header">Daily Profit Trend</div>
                                    <div className="dp-chart-body">
                                        <Line data={chartData} options={chartOptions} />
                                    </div>
                                </div>
                                <div className="dp-chart-card">
                                    <div className="dp-chart-header">Revenue Composition</div>
                                    <div className="dp-chart-body">
                                        <Doughnut data={revenueData} options={revenueOptions} />
                                    </div>
                                </div>
                            </div>

                            <div className="dp-table-wrapper">
                                <div className="dp-table-scroll">
                                    <table className="dp-table">
                                        <thead>
                                            <tr>
                                                <th style={{ textAlign: 'center', width: 40 }}>#</th>
                                                <th>Date</th>
                                                <th className="num">Gross Sales</th>
                                                <th className="num">Returns</th>
                                                <th className="num">Net Sales</th>
                                                <th className="num">Gross Purchases</th>
                                                <th className="num">Purchase Returns</th>
                                                <th className="num">Net Purchases</th>
                                                <th className="num">Net Profit</th>
                                                <th className="num">SP %</th>
                                                <th className="num">CP %</th>
                                                <th style={{ textAlign: 'center' }}>Txn</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {currentPageItems.map((day, idx) => {
                                                const serialNumber = itemsPerPage === 'all' ? idx + 1 : (currentPage - 1) * itemsPerPage + idx + 1;
                                                return (
                                                    <tr key={idx} className={day.netProfit >= 0 ? 'dp-row-profit' : 'dp-row-loss'}>
                                                        <td style={{ textAlign: 'center' }}>{serialNumber}</td>
                                                        <td>{day.formattedDate}</td>
                                                        <td className="num">{formatCurrency(day.grossSales)}</td>
                                                        <td className="num">{formatCurrency(day.returns)}</td>
                                                        <td className="num fw-bold">{formatCurrency(day.netSales)}</td>
                                                        <td className="num">{formatCurrency(day.grossPurchases)}</td>
                                                        <td className="num">{formatCurrency(day.purchaseReturns)}</td>
                                                        <td className="num">{formatCurrency(day.netPurchases)}</td>
                                                        <td className={`num fw-bold ${day.netProfit >= 0 ? 'dp-value--green' : 'dp-value--red'}`}>
                                                            {formatCurrency(day.netProfit)}
                                                            {day.netProfit >= 0 ? <i className="fas fa-caret-up ms-1 dp-value--green" /> : <i className="fas fa-caret-down ms-1 dp-value--red" />}
                                                        </td>
                                                        <td className="num">{formatPercentage(day.netProfit, day.netSales)}</td>
                                                        <td className="num">{formatPercentage(day.netProfit, day.netCost)}</td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            {(day.salesCount > 0 || day.purchaseCount > 0 || day.returnCount > 0) && (
                                                                <span className="dp-badge">{(day.salesCount || 0) + (day.purchaseCount || 0) + (day.returnCount || 0)}</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        {showTotals && results.summary && (
                                            <tfoot>
                                                <tr className="dp-row-total">
                                                    <td colSpan="2">Totals</td>
                                                    <td className="num">{formatCurrency(results.summary.totalGrossSales)}</td>
                                                    <td className="num">{formatCurrency(results.summary.totalSalesReturns)}</td>
                                                    <td className="num">{formatCurrency(results.summary.totalNetSales)}</td>
                                                    <td className="num">{formatCurrency(results.summary.totalGrossPurchases)}</td>
                                                    <td className="num">{formatCurrency(results.summary.totalPurchaseReturns)}</td>
                                                    <td className="num">{formatCurrency(results.summary.totalNetPurchases)}</td>
                                                    <td className={`num ${results.summary.totalNetProfit >= 0 ? 'dp-value--green' : 'dp-value--red'}`}>
                                                        {formatCurrency(results.summary.totalNetProfit)}
                                                    </td>
                                                    <td className="num">{formatPercentage(results.summary.totalNetProfit, results.summary.totalNetSales)}</td>
                                                    <td className="num">{formatPercentage(results.summary.totalNetProfit, results.summary.totalNetPurchases)}</td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <span className="dp-badge">
                                                            {results.dailyProfit.reduce((sum, day) => sum + (day.salesCount || 0) + (day.purchaseCount || 0) + (day.returnCount || 0), 0)}
                                                        </span>
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        )}
                                    </table>
                                </div>
                            </div>

                            {/* Pagination */}
                            {itemsPerPage !== 'all' && totalPages > 1 && (
                                <div className="dp-pager">
                                    <span>
                                        {((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length}
                                    </span>
                                    <nav>
                                        <ul className="pagination pagination-sm mb-0">
                                            <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                                <button className="page-link" onClick={() => handlePageChange(currentPage - 1)}>‹</button>
                                            </li>
                                            {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                                                let p = totalPages <= 5 ? i + 1 : (currentPage <= 3 ? i + 1 : (currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i));
                                                return (
                                                    <li key={p} className={`page-item ${currentPage === p ? 'active' : ''}`}>
                                                        <button className="page-link" onClick={() => handlePageChange(p)}>{p}</button>
                                                    </li>
                                                );
                                            })}
                                            <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                                                <button className="page-link" onClick={() => handlePageChange(currentPage + 1)}>›</button>
                                            </li>
                                        </ul>
                                    </nav>
                                </div>
                            )}
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

export default DailyProfitResult;