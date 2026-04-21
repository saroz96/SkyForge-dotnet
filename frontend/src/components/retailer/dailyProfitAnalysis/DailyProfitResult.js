import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import NepaliDate from 'nepali-date-converter';
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
    const location = useLocation();
    const navigate = useNavigate();
    const tableRef = useRef(null);

    const [notification, setNotification] = useState({
        show: false,
        message: '',
        type: 'success',
        duration: 3000
    });

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

    // Function to format date based on company date format
    const formatDate = useCallback((dateString) => {
        if (!dateString) return '';

        try {
            // Parse the date string (expected format: YYYY-MM-DD)
            const parts = dateString.split('-');
            if (parts.length !== 3) return dateString;

            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10);
            const day = parseInt(parts[2], 10);

            if (isNaN(year) || isNaN(month) || isNaN(day)) return dateString;

            if (companyDateFormat === 'nepali') {
                // For Nepali format, create NepaliDate and format
                // Note: month is 1-12, NepaliDate expects 0-11
                const nepaliDate = new NepaliDate(year, month - 1, day);
                return nepaliDate.format('YYYY-MM-DD');
            } else {
                // For English format, return as is
                return dateString;
            }
        } catch (error) {
            console.error('Error formatting date:', error);
            return dateString;
        }
    }, [companyDateFormat]);

    useEffect(() => {
        const fetchResults = async () => {
            try {
                // Extract query parameters from URL
                const searchParams = new URLSearchParams(location.search);
                const fromDate = searchParams.get('fromDate');
                const toDate = searchParams.get('toDate');

                if (!fromDate || !toDate) {
                    setError('Date range parameters are required');
                    setLoading(false);
                    return;
                }

                const response = await api.post('/api/retailer/daily-profit/sales-analysis', {
                    fromDate,
                    toDate
                });

                if (response.data.success) {
                    const data = response.data.data;
                    // Get company date format from response
                    const dateFormat = data.companyDateFormat || 'english';
                    setCompanyDateFormat(dateFormat);

                    // Process daily profit data - format dates
                    const processedDailyProfit = data.dailyProfit.map(day => ({
                        ...day,
                        formattedDate: formatDate(day.date)
                    }));

                    setResults({
                        ...data,
                        dailyProfit: processedDailyProfit
                    });
                } else {
                    setError(response.data.error || response.data.message);
                }
            } catch (err) {
                console.error('Error fetching results:', err);
                setError(err.response?.data?.error || err.response?.data?.message || 'Failed to fetch profit analysis results');
                setNotification({
                    show: true,
                    message: err.response?.data?.error || 'Failed to fetch profit analysis results',
                    type: 'error',
                    duration: 3000
                });
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    }, [location.search, formatDate]);

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

    // Pagination
    const currentPageItems = useMemo(() => {
        if (itemsPerPage === 'all') return filteredData;
        return filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    }, [filteredData, itemsPerPage, currentPage]);

    const totalPages = Math.ceil(filteredData.length / (itemsPerPage === 'all' ? 1 : itemsPerPage));

    const handlePageChange = useCallback((newPage) => {
        if (itemsPerPage === 'all') return;
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [itemsPerPage, totalPages]);

    const handlePrint = () => {
        if (!results || !filteredData.length) {
            setNotification({ show: true, message: 'No data to print', type: 'warning', duration: 3000 });
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
            <h2>Profit Analysis Report</h2><p><strong>Date Range:</strong> ${results.fromDate} to ${results.toDate}</p><hr></div>
            <table><thead><tr><th>Date</th><th class="text-end">Gross Sales</th><th class="text-end">Sales Returns</th><th class="text-end">Net Sales</th>
            <th class="text-end">Gross Purchases</th><th class="text-end">Purchase Returns</th><th class="text-end">Net Purchases</th>
            <th class="text-end">Net Profit</th><th class="text-end">SP (%)</th><th class="text-end">CP (%)</th><th>Transactions</th></tr></thead>
            <tbody>${filteredData.map(day => `<tr class="${day.netProfit >= 0 ? 'profit-row' : 'loss-row'}">
                <td>${day.formattedDate}</td><td class="text-end">${formatCurrency(day.grossSales)}</td><td class="text-end">${formatCurrency(day.returns)}</td>
                <td class="text-end">${formatCurrency(day.netSales)}</td><td class="text-end">${formatCurrency(day.grossPurchases)}</td>
                <td class="text-end">${formatCurrency(day.purchaseReturns)}</td><td class="text-end">${formatCurrency(day.netPurchases)}</td>
                <td class="text-end">${formatCurrency(day.netProfit)}</td><td class="text-end">${formatPercentage(day.netProfit, day.netSales)}</td>
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
            </tr></tfoot>` : ''}
        </table><div class="print-footer">Generated on ${new Date().toLocaleString()}</div>
        <script>window.onload=function(){window.print();window.onafterprint=function(){window.close()}}<\/script></body></html>
        `);
        printWindow.document.close();
    };

    const exportToExcel = async () => {
        if (!results || !filteredData.length) {
            setNotification({ show: true, message: 'No data to export', type: 'warning', duration: 3000 });
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
            XLSX.writeFile(wb, `Profit_Analysis_${results.fromDate}_to_${results.toDate}.xlsx`);
            setNotification({ show: true, message: 'Excel file exported successfully!', type: 'success', duration: 3000 });
        } catch (err) {
            setNotification({ show: true, message: 'Failed to export data', type: 'error', duration: 3000 });
        } finally {
            setExporting(false);
        }
    };

    const formatCurrency = useCallback((amount) => {
        const num = amount || 0;
        if (companyDateFormat === 'nepali') {
            return `Rs. ${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        return `Rs. ${num.toFixed(2)}`;
    }, [companyDateFormat]);

    const formatPercentage = useCallback((value, total) => {
        if (!total || total === 0) return '0.00%';
        return `${((value / total) * 100).toFixed(2)}%`;
    }, []);

    if (loading) {
        return (
            <div className="container-fluid">
                <Header />
                <div className="container">
                    <div className="text-center py-5">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                        <p className="mt-3">Loading profit analysis results...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container-fluid">
                <Header />
                <div className="container">
                    <div className="alert alert-danger mt-4" role="alert">
                        <i className="fas fa-exclamation-triangle me-2"></i>
                        {error}
                    </div>
                    <button className="btn btn-secondary" onClick={() => navigate('/retailer/daily-profit/sales-analysis')}>
                        <i className="fas fa-arrow-left me-2"></i> Back to Form
                    </button>
                </div>
            </div>
        );
    }

    if (!results) {
        return (
            <div className="container-fluid">
                <Header />
                <div className="container">
                    <div className="alert alert-warning" role="alert">
                        No results found for the selected date range.
                    </div>
                    <button className="btn btn-secondary" onClick={() => navigate('/retailer/daily-profit/sales-analysis')}>
                        <i className="fas fa-arrow-left me-2"></i> Back to Form
                    </button>
                </div>
            </div>
        );
    }

    // Chart data - use formatted dates for labels
    const chartLabels = filteredData.map(day => day.formattedDate);
    const chartProfitData = filteredData.map(day => day.netProfit);

    const chartData = {
        labels: chartLabels,
        datasets: [
            {
                label: 'Net Profit',
                data: chartProfitData,
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderWidth: 2,
                tension: 0.1,
            },
        ],
    };

    const revenueData = {
        labels: ['Net Sales', 'Sales Returns'],
        datasets: [
            {
                data: [results.summary.totalNetSales, results.summary.totalSalesReturns],
                backgroundColor: ['rgba(40, 167, 69, 0.8)', 'rgba(220, 53, 69, 0.8)'],
                borderColor: ['rgba(40, 167, 69, 1)', 'rgba(220, 53, 69, 1)'],
                borderWidth: 1,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
            },
            tooltip: {
                callbacks: {
                    label: (context) => {
                        return `${context.dataset.label}: ${formatCurrency(context.raw)}`;
                    },
                },
            },
        },
        scales: {
            y: {
                beginAtZero: false,
                ticks: {
                    callback: (value) => formatCurrency(value),
                },
            },
        },
    };

    const revenueOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'right',
            },
            tooltip: {
                callbacks: {
                    label: (context) => {
                        const label = context.label || '';
                        const value = context.raw;
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = ((value / total) * 100).toFixed(2);
                        return `${label}: ${formatCurrency(value)} (${percentage}%)`;
                    },
                },
            },
        },
    };

    return (
        <div className="container-fluid">
            <Header />
            <div className="card mt-2 shadow-lg p-0 expanded-card ledger-card compact">
                <div className="card-header bg-white py-1 position-relative">
                    <h1 className="h5 mb-0 text-center text-primary">Profit Analysis Results</h1>
                    <h5 className="mb-0 position-absolute" style={{
                        fontSize: '0.8rem',
                        fontWeight: 'normal',
                        right: '1rem',
                        top: '50%',
                        transform: 'translateY(-50%)'
                    }}>
                        Date: {formatDate(results.fromDate)} to {formatDate(results.toDate)}
                    </h5>
                </div>
                <div className="card-body p-2 p-md-3">
                    {/* Summary Cards */}
                    <div className="row">
                        <div className="col-md-3 col-sm-6 mb-0">
                            <div className="card bg-light">
                                <div className="card-body p-2">
                                    <div className="d-flex justify-content-between align-items-center">
                                        <div>
                                            <h6 className="text-uppercase text-muted mb-0" style={{ fontSize: '0.7rem' }}>Total Net Sales</h6>
                                            <h5 className="mb-0 text-success" style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
                                                {formatCurrency(results.summary.totalNetSales)}
                                            </h5>
                                        </div>
                                        <div className="summary-icon text-success">
                                            <i className="fas fa-line-chart"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="col-md-3 col-sm-6 mb-0">
                            <div className="card bg-light">
                                <div className="card-body p-2">
                                    <div className="d-flex justify-content-between align-items-center">
                                        <div>
                                            <h6 className="text-uppercase text-muted mb-0" style={{ fontSize: '0.7rem' }}>Total Net Purchases</h6>
                                            <h5 className="mb-0 text-danger" style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
                                                {formatCurrency(results.summary.totalNetPurchases)}
                                            </h5>
                                        </div>
                                        <div className="summary-icon text-danger">
                                            <i className="fas fa-shopping-cart"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="col-md-3 col-sm-6 mb-0">
                            <div className="card bg-light">
                                <div className="card-body p-2">
                                    <div className="d-flex justify-content-between align-items-center">
                                        <div>
                                            <h6 className="text-uppercase text-muted mb-0" style={{ fontSize: '0.7rem' }}>Total Net Profit</h6>
                                            <h5 className={`mb-0 text-${results.summary.totalNetProfit >= 0 ? 'success' : 'danger'}`} style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
                                                {formatCurrency(results.summary.totalNetProfit)}
                                            </h5>
                                        </div>
                                        <div className={`summary-icon text-${results.summary.totalNetProfit >= 0 ? 'success' : 'danger'}`}>
                                            <i className="fas fa-money-bill-wave"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="col-md-3 col-sm-6 mb-0">
                            <div className="card bg-light">
                                <div className="card-body p-2">
                                    <div className="d-flex justify-content-between align-items-center">
                                        <div>
                                            <h6 className="text-uppercase text-muted mb-0" style={{ fontSize: '0.7rem' }}>Profit/Loss Days</h6>
                                            <h5 className="mb-0" style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
                                                <span className="text-success">{results.summary.daysWithProfit}</span> /{' '}
                                                <span className="text-danger">{results.summary.daysWithLoss}</span>
                                            </h5>
                                        </div>
                                        <div className="summary-icon text-warning">
                                            <i className="fas fa-calendar-alt"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Charts Section */}
                    <div className="row no-print">
                        <div className="col-md-6 mb-0">
                            <div className="card">
                                <div className="card-header bg-primary text-white py-1">
                                    <h3 className="card-title h6 mb-0">Daily Profit Trend</h3>
                                </div>
                                <div className="card-body p-2">
                                    <div style={{ height: '250px' }}>
                                        <Line data={chartData} options={chartOptions} />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-6 mb-0">
                            <div className="card">
                                <div className="card-header bg-info text-white py-1">
                                    <h3 className="card-title h6 mb-0">Revenue Composition</h3>
                                </div>
                                <div className="card-body p-2">
                                    <div style={{ height: '250px' }}>
                                        <Doughnut data={revenueData} options={revenueOptions} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Controls Row */}
                    <div className="row g-2 mb-3">
                        <div className="col-md-3">
                            <div className="input-group input-group-sm">
                                <span className="input-group-text" style={{ height: '30px', padding: '0 8px' }}>
                                    <i className="fas fa-search small" style={{ fontSize: '11px' }}></i>
                                </span>
                                <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    placeholder="Search by date..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{ height: '30px', fontSize: '0.75rem' }}
                                />
                                {searchQuery && (
                                    <button className="btn btn-outline-secondary btn-sm" type="button" onClick={() => setSearchQuery('')} style={{ height: '30px' }}>
                                        <i className="fas fa-times"></i>
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="col-md-2">
                            <select className="form-select form-select-sm" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ height: '30px', fontSize: '0.75rem', width: '100%', padding: '0 20px 0 8px' }}>
                                <option value="">All Days</option>
                                <option value="profit">Profit Days Only</option>
                                <option value="loss">Loss Days Only</option>
                            </select>
                        </div>
                        <div className="col-md-1">
                            <select className="form-select form-select-sm" value={itemsPerPage} onChange={(e) => { setItemsPerPage(e.target.value === 'all' ? 'all' : parseInt(e.target.value)); setCurrentPage(1); }} style={{ height: '30px', fontSize: '0.75rem', width: '100%', padding: '0 20px 0 8px' }}>
                                <option value="10">10</option>
                                <option value="25">25</option>
                                <option value="50">50</option>
                                <option value="all">All</option>
                            </select>
                        </div>
                        <div className="col-md-1">
                            <div className="form-check form-switch mt-2">
                                <input className="form-check-input" type="checkbox" role="switch" id="showTotals" checked={showTotals} onChange={() => setShowTotals(!showTotals)} style={{ marginTop: '2px' }} />
                                <label className="form-check-label small" htmlFor="showTotals" style={{ fontSize: '0.75rem' }}>Totals</label>
                            </div>
                        </div>
                        <div className="col-md-2">
                            <button className="btn btn-secondary btn-sm w-100" onClick={() => navigate('/retailer/daily-profit/sales-analysis')} style={{ height: '30px', fontSize: '0.75rem', padding: '0 6px' }}>
                                <i className="fas fa-arrow-left me-1"></i>Back
                            </button>
                        </div>
                        <div className="col-md-1">
                            <button className="btn btn-primary btn-sm w-100" onClick={handlePrint} style={{ height: '30px', fontSize: '0.75rem', padding: '0 6px' }}>
                                <i className="fas fa-print me-1"></i>Print
                            </button>
                        </div>
                        <div className="col-md-1">
                            <button className="btn btn-success btn-sm w-100" onClick={exportToExcel} disabled={exporting} style={{ height: '30px', fontSize: '0.75rem', padding: '0 6px' }}>
                                <i className="fas fa-file-excel me-1"></i>{exporting ? '...' : 'Excel'}
                            </button>
                        </div>
                    </div>

                    {/* Daily Profit Table */}
                    <div className="table-responsive" style={{ maxHeight: '400px', overflow: 'auto' }}>
                        <table className="table table-sm table-hover mb-0" style={{ fontSize: '0.75rem' }} ref={tableRef}>
                            <thead className="table-light" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                                <tr>
                                    <th style={{ padding: '6px 8px', textAlign: 'center', width: '50px' }}>S.N.</th>
                                    <th style={{ padding: '6px 8px' }}>Date</th>
                                    <th className="text-end" style={{ padding: '6px 8px' }}>Gross Sales</th>
                                    <th className="text-end" style={{ padding: '6px 8px' }}>Sales Returns</th>
                                    <th className="text-end" style={{ padding: '6px 8px' }}>Net Sales</th>
                                    <th className="text-end" style={{ padding: '6px 8px' }}>Gross Purchases</th>
                                    <th className="text-end" style={{ padding: '6px 8px' }}>Purchase Returns</th>
                                    <th className="text-end" style={{ padding: '6px 8px' }}>Net Purchases</th>
                                    <th className="text-end" style={{ padding: '6px 8px' }}>Net Profit</th>
                                    <th className="text-end" style={{ padding: '6px 8px' }}>SP (%)</th>
                                    <th className="text-end" style={{ padding: '6px 8px' }}>CP (%)</th>
                                    <th style={{ padding: '6px 8px' }}>Transactions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentPageItems.map((day, idx) => (
                                    <tr key={idx} className={day.netProfit >= 0 ? 'table-success' : 'table-danger'}>
                                        <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                                            {(currentPage === 'all' ? idx : (currentPage - 1) * (itemsPerPage === 'all' ? 1 : itemsPerPage)) + idx + 1}
                                        </td>
                                        <td style={{ padding: '4px 6px' }}>{day.formattedDate}</td>
                                        <td className="text-end" style={{ padding: '4px 6px' }}>{formatCurrency(day.grossSales)}</td>
                                        <td className="text-end" style={{ padding: '4px 6px' }}>{formatCurrency(day.returns)}</td>
                                        <td className="text-end fw-bold" style={{ padding: '4px 6px' }}>{formatCurrency(day.netSales)}</td>
                                        <td className="text-end" style={{ padding: '4px 6px' }}>{formatCurrency(day.grossPurchases)}</td>
                                        <td className="text-end" style={{ padding: '4px 6px' }}>{formatCurrency(day.purchaseReturns)}</td>
                                        <td className="text-end" style={{ padding: '4px 6px' }}>{formatCurrency(day.netPurchases)}</td>
                                        <td className={`text-end fw-bold ${day.netProfit >= 0 ? 'text-success' : 'text-danger'}`} style={{ padding: '4px 6px' }}>
                                            {formatCurrency(day.netProfit)}
                                            {day.netProfit >= 0 ? (
                                                <i className="fas fa-caret-up text-success ms-1"></i>
                                            ) : (
                                                <i className="fas fa-caret-down text-danger ms-1"></i>
                                            )}
                                        </td>
                                        <td className="text-end" style={{ padding: '4px 6px' }}>{formatPercentage(day.netProfit, day.netSales)}</td>
                                        <td className="text-end" style={{ padding: '4px 6px' }}>{formatPercentage(day.netProfit, day.netCost)}</td>
                                        <td style={{ padding: '4px 6px' }}>
                                            {(day.salesCount > 0 || day.purchaseCount > 0 || day.returnCount > 0) && (
                                                <span className="badge bg-secondary" style={{ fontSize: '0.65rem', padding: '3px 6px' }}>
                                                    {(day.salesCount || 0) + (day.purchaseCount || 0) + (day.returnCount || 0)}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            {showTotals && currentPageItems.length > 0 && (
                                <tfoot className="table-group-divider">
                                    <tr className="fw-bold table-secondary">
                                        <td colSpan="2" style={{ padding: '6px 8px' }}>Totals</td>
                                        <td className="text-end" style={{ padding: '6px 8px' }}>{formatCurrency(results.summary.totalGrossSales)}</td>
                                        <td className="text-end" style={{ padding: '6px 8px' }}>{formatCurrency(results.summary.totalSalesReturns)}</td>
                                        <td className="text-end" style={{ padding: '6px 8px' }}>{formatCurrency(results.summary.totalNetSales)}</td>
                                        <td className="text-end" style={{ padding: '6px 8px' }}>{formatCurrency(results.summary.totalGrossPurchases)}</td>
                                        <td className="text-end" style={{ padding: '6px 8px' }}>{formatCurrency(results.summary.totalPurchaseReturns)}</td>
                                        <td className="text-end" style={{ padding: '6px 8px' }}>{formatCurrency(results.summary.totalNetPurchases)}</td>
                                        <td className={`text-end ${results.summary.totalNetProfit >= 0 ? 'text-success' : 'text-danger'}`} style={{ padding: '6px 8px' }}>
                                            {formatCurrency(results.summary.totalNetProfit)}
                                        </td>
                                        <td className="text-end" style={{ padding: '6px 8px' }}>{formatPercentage(results.summary.totalNetProfit, results.summary.totalNetSales)}</td>
                                        <td className="text-end" style={{ padding: '6px 8px' }}>{formatPercentage(results.summary.totalNetProfit, results.summary.totalNetPurchases)}</td>
                                        <td style={{ padding: '6px 8px' }}>
                                            <span className="badge bg-secondary" style={{ fontSize: '0.65rem', padding: '3px 6px' }}>
                                                {results.dailyProfit.reduce((sum, day) => sum + (day.salesCount || 0) + (day.purchaseCount || 0) + (day.returnCount || 0), 0)}
                                            </span>
                                        </td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    {itemsPerPage !== 'all' && totalPages > 1 && (
                        <div className="row mt-2">
                            <div className="col-12">
                                <nav>
                                    <ul className="pagination justify-content-center pagination-sm" style={{ marginBottom: '0' }}>
                                        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                            <button className="page-link" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => handlePageChange(currentPage - 1)}>Previous</button>
                                        </li>
                                        {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                                            let p = totalPages <= 5 ? i + 1 : (currentPage <= 3 ? i + 1 : (currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i));
                                            return (
                                                <li key={p} className={`page-item ${currentPage === p ? 'active' : ''}`}>
                                                    <button className="page-link" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => handlePageChange(p)}>{p}</button>
                                                </li>
                                            );
                                        })}
                                        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                                            <button className="page-link" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => handlePageChange(currentPage + 1)}>Next</button>
                                        </li>
                                    </ul>
                                </nav>
                                <div className="text-center text-muted small" style={{ fontSize: '0.7rem' }}>
                                    Showing {((currentPage - 1) * (itemsPerPage === 'all' ? 1 : itemsPerPage)) + 1} to {Math.min(currentPage * (itemsPerPage === 'all' ? filteredData.length : itemsPerPage), filteredData.length)} of {filteredData.length} entries
                                </div>
                            </div>
                        </div>
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