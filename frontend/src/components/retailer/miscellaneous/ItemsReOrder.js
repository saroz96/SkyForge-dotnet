import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../Header';
import Loader from '../../Loader';
import * as XLSX from 'xlsx';
import ProductModal from '../dashboard/modals/ProductModal';
import NotificationToast from '../../NotificationToast';
import { FiPrinter, FiFileText, FiInbox } from 'react-icons/fi';
import { FaSearch } from 'react-icons/fa';

const ItemsReOrderLevel = () => {
    // API instance with JWT token
    const api = useMemo(() => {
        const instance = axios.create({
            baseURL: process.env.REACT_APP_API_BASE_URL,
            withCredentials: true,
        });
        instance.interceptors.request.use(
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
        return instance;
    }, []);

    // State management
    const [stockData, setStockData] = useState({
        items: [],
        company: null,
        currentCompanyName: '',
        currentFiscalYear: null,
        isAdminOrSupervisor: false
    });

    const [showProductModal, setShowProductModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [initialLoading, setInitialLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filterType, setFilterType] = useState('reorderLevel');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentRowIndex, setCurrentRowIndex] = useState(-1);
    const [exporting, setExporting] = useState(false);
    const [notification, setNotification] = useState({
        show: false,
        message: '',
        type: 'success',
        duration: 3000
    });
    const [company, setCompany] = useState({
        dateFormat: 'english',
        currentCompanyName: '',
        fiscalYear: null
    });

    const tableRef = useRef(null);
    const navigate = useNavigate();
    const abortControllerRef = useRef(null);

    // Fetch reorder data
    const fetchReorderData = useCallback(async () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        try {
            setLoading(true);
            setError(null);

            const response = await api.get('/api/retailer/items/reorder', {
                signal: abortControllerRef.current.signal
            });

            if (response.data.success) {
                const responseData = response.data.data;
                
                // Process items to add status field
                const processedItems = (responseData.items || []).map(item => {
                    let status = 'Normal';
                    
                    // Check for understocked (current stock below reorder level)
                    if (item.currentStock < item.reorderLevel) {
                        status = 'Understocked';
                    } 
                    // Check for overstocked (current stock above max stock AND max stock > 0)
                    else if (item.maxStock > 0 && item.currentStock > item.maxStock) {
                        status = 'Overstocked';
                    }
                    
                    return {
                        ...item,
                        status,
                        code: item.code || item.barcodeNumber || '',
                        // Ensure overStock is only positive value
                        overStock: item.overStock > 0 ? item.overStock : 0,
                        neededStock: item.neededStock > 0 ? item.neededStock : 0
                    };
                });

                setStockData({
                    items: processedItems,
                    company: responseData.company,
                    currentCompanyName: responseData.currentCompanyName || responseData.company?.name || '',
                    currentFiscalYear: responseData.currentFiscalYear,
                    isAdminOrSupervisor: responseData.isAdminOrSupervisor || false
                });

                // Set company info for potential date formatting
                setCompany({
                    dateFormat: responseData.company?.dateFormat?.toLowerCase() || 'english',
                    currentCompanyName: responseData.currentCompanyName || responseData.company?.name || '',
                    fiscalYear: responseData.currentFiscalYear
                });

                setNotification({
                    show: true,
                    message: 'Reorder data loaded successfully!',
                    type: 'success',
                    duration: 3000
                });
            } else {
                setError(response.data.error || 'Failed to fetch reorder data');
                setNotification({
                    show: true,
                    message: response.data.error || 'Failed to fetch reorder data',
                    type: 'error',
                    duration: 3000
                });
            }
        } catch (err) {
            if (err.name === 'AbortError' || err.name === 'CanceledError') {
                return;
            }
            console.error('Fetch error:', err);
            const errorMsg = err.response?.data?.error || 'Failed to fetch reorder data';
            setError(errorMsg);
            setNotification({
                show: true,
                message: errorMsg,
                type: 'error',
                duration: 3000
            });
        } finally {
            setLoading(false);
            setInitialLoading(false);
        }
    }, [api]);

    // Initial fetch
    useEffect(() => {
        fetchReorderData();
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [fetchReorderData]);

    // Filtered items based on filter type and search term
    const filteredItems = useMemo(() => {
        if (!stockData.items || !Array.isArray(stockData.items)) {
            return [];
        }

        return stockData.items.filter(item => {
            // Apply filter type
            let matchesFilter = true;
            
            if (filterType === 'reorderLevel') {
                // Show only understocked items
                matchesFilter = item.status === 'Understocked';
            } else if (filterType === 'maxStock') {
                // Show only overstocked items
                matchesFilter = item.status === 'Overstocked';
            } else if (filterType === 'all') {
                // Show all items
                matchesFilter = true;
            }

            // Apply search term if exists
            const matchesSearch = !searchTerm ||
                item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.code && item.code.toString().toLowerCase().includes(searchTerm.toLowerCase()));

            return matchesFilter && matchesSearch;
        });
    }, [stockData.items, filterType, searchTerm]);

    // Summary statistics
    const summary = useMemo(() => {
        const items = stockData.items || [];
        return {
            reorderCount: items.filter(i => i.status === 'Understocked').length,
            overstockCount: items.filter(i => i.status === 'Overstocked').length,
            totalCount: items.length,
            totalNeeded: items
                .filter(i => i.status === 'Understocked')
                .reduce((sum, item) => sum + (item.neededStock || 0), 0),
            totalOverstock: items
                .filter(i => i.status === 'Overstocked')
                .reduce((sum, item) => sum + (item.overStock || 0), 0)
        };
    }, [stockData.items]);

    // Handle filter change
    const handleFilterChange = (e) => {
        setFilterType(e.target.value);
        setCurrentRowIndex(-1);
    };

    // Handle search change
    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        setCurrentRowIndex(-1);
    };

    // Keyboard navigation
    const handleKeyDown = (e) => {
        if (filteredItems.length === 0) return;

        switch (e.key) {
            case 'ArrowUp':
                e.preventDefault();
                if (currentRowIndex > 0) {
                    setCurrentRowIndex(currentRowIndex - 1);
                    scrollToRow(currentRowIndex - 1);
                }
                break;
            case 'ArrowDown':
                e.preventDefault();
                if (currentRowIndex < filteredItems.length - 1) {
                    setCurrentRowIndex(currentRowIndex + 1);
                    scrollToRow(currentRowIndex + 1);
                }
                break;
            case 'Home':
                e.preventDefault();
                setCurrentRowIndex(0);
                scrollToRow(0);
                break;
            case 'End':
                e.preventDefault();
                setCurrentRowIndex(filteredItems.length - 1);
                scrollToRow(filteredItems.length - 1);
                break;
            default:
                break;
        }
    };

    const scrollToRow = (index) => {
        if (tableRef.current) {
            const rows = tableRef.current.querySelectorAll('tbody tr');
            if (rows[index]) {
                rows[index].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    };

    // Format number
    const formatNumber = useCallback((num) => {
        if (num === undefined || num === null) return '0';
        const number = typeof num === 'string' ? parseFloat(num) : Number(num);
        if (isNaN(number)) return '0';
        return number.toLocaleString(company.dateFormat === 'nepali' ? 'en-IN' : 'en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }, [company.dateFormat]);

    // Print report
    const printItems = () => {
        if (!filteredItems.length) {
            setNotification({
                show: true,
                message: 'No data to print',
                type: 'warning',
                duration: 3000
            });
            return;
        }

        const printWindow = window.open('', '_blank');
        const title = filterType === 'maxStock' ? 'Overstock Items Report' :
            filterType === 'reorderLevel' ? 'Reorder Level Report' : 'Stock Report';
        const printDate = new Date().toLocaleString();
        const fiscalYearName = company.fiscalYear?.name || 'N/A';
        const companyName = company.currentCompanyName || stockData.currentCompanyName || 'N/A';

        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>${title}</title>
                <style>
                    body { font-family: Arial, sans-serif; font-size: 11px; margin: 0; padding: 10mm; }
                    .print-header { text-align: center; margin-bottom: 15px; }
                    .report-title { text-align: center; text-decoration: underline; margin-bottom: 10px; }
                    table { width: 100%; border-collapse: collapse; page-break-inside: auto; }
                    th, td { border: 1px solid #000; padding: 6px; text-align: left; }
                    th { background-color: #f2f2f2; font-weight: bold; }
                    .text-end { text-align: right; }
                    .text-danger { color: #e74c3c; }
                    .text-success { color: #2ecc71; }
                    @page { size: landscape; margin: 10mm; }
                    .print-footer { margin-top: 10px; font-size: 9px; text-align: right; }
                </style>
            </head>
            <body>
                <div class="print-header">
                    <h1>${companyName}</h1>
                    <h2 class="report-title">${title}</h2>
                    <hr>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                    <div><strong>Fiscal Year:</strong> ${fiscalYearName}</div>
                    <div><strong>Generated on:</strong> ${printDate}</div>
                </div>
                ${searchTerm ? `<div><strong>Search:</strong> "${searchTerm}"</div>` : ''}
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Item Name</th>
                            <th>Code</th>
                            <th>Unit</th>
                            <th class="text-end">Current Stock</th>
                            <th class="text-end">${filterType === 'maxStock' ? 'Max Stock' : 'Reorder Level'}</th>
                            <th class="text-end">${filterType === 'maxStock' ? 'Over Stock' : 'Needed Stock'}</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredItems.map((item, index) => `
                            <tr>
                                <td>${index + 1}</td>
                                <td>${item.name}</td>
                                <td>${item.code || '-'}</td>
                                <td>${item.unit}</td>
                                <td class="text-end">${formatNumber(item.currentStock)}</td>
                                <td class="text-end">${filterType === 'maxStock' ? formatNumber(item.maxStock) : formatNumber(item.reorderLevel)}</td>
                                <td class="text-end ${filterType === 'maxStock' ? (item.overStock > 0 ? 'text-danger' : '') : (item.neededStock > 0 ? 'text-danger' : 'text-success')}">
                                    ${filterType === 'maxStock' ? formatNumber(item.overStock) : formatNumber(item.neededStock)}
                                </td>
                                <td>
                                    ${item.status === 'Understocked' ? 'Reorder' : item.status === 'Overstocked' ? 'Overstock' : 'Normal'}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr style="font-weight:bold;">
                            <td colspan="6">Total</td>
                            <td class="text-end">
                                ${filterType === 'maxStock' ? formatNumber(summary.totalOverstock) : formatNumber(summary.totalNeeded)}
                            </td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
                <div class="print-footer">Printed from ${companyName} | ${printDate}</div>
                <script>
                    window.onload = function() { 
                        window.print(); 
                        window.onafterprint = function() { window.close(); };
                    }
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(printContent);
        printWindow.document.close();
    };

    // Export to Excel
    const exportToExcel = () => {
        if (!filteredItems.length) {
            setNotification({
                show: true,
                message: 'No data to export',
                type: 'warning',
                duration: 3000
            });
            return;
        }

        setExporting(true);
        try {
            const title = filterType === 'maxStock' ? 'Overstock_Items_Report' :
                filterType === 'reorderLevel' ? 'Reorder_Level_Report' : 'Stock_Report';

            const dataToExport = filteredItems.map((item, index) => ({
                '#': index + 1,
                'Item Name': item.name,
                'Code': item.code || '',
                'Unit': item.unit,
                'Current Stock': formatNumber(item.currentStock),
                [filterType === 'maxStock' ? 'Max Stock' : 'Reorder Level']: formatNumber(filterType === 'maxStock' ? item.maxStock : item.reorderLevel),
                [filterType === 'maxStock' ? 'Over Stock' : 'Needed Stock']: formatNumber(filterType === 'maxStock' ? item.overStock : item.neededStock),
                'Status': item.status === 'Understocked' ? 'Reorder' : item.status === 'Overstocked' ? 'Overstock' : 'Normal'
            }));

            // Add totals row
            const totalsRow = {
                '#': '',
                'Item Name': 'TOTALS',
                'Code': '',
                'Unit': '',
                'Current Stock': '',
                [filterType === 'maxStock' ? 'Max Stock' : 'Reorder Level']: '',
                [filterType === 'maxStock' ? 'Over Stock' : 'Needed Stock']: formatNumber(filterType === 'maxStock' ? summary.totalOverstock : summary.totalNeeded),
                'Status': ''
            };
            dataToExport.push(totalsRow);

            const ws = XLSX.utils.json_to_sheet(dataToExport);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, title);

            const date = new Date().toISOString().split('T')[0];
            XLSX.writeFile(wb, `${title}_${date}.xlsx`);
            
            setNotification({
                show: true,
                message: 'Excel file exported successfully!',
                type: 'success',
                duration: 3000
            });
        } catch (err) {
            setNotification({
                show: true,
                message: 'Failed to export data',
                type: 'error',
                duration: 3000
            });
        } finally {
            setExporting(false);
        }
    };

    // Handle F9 key for product modal
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'F9') {
                e.preventDefault();
                setShowProductModal(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    if (initialLoading) {
        return <Loader />;
    }

    if (error && !stockData.items.length) {
        return (
            <div className="container-fluid">
                <Header />
                <div className="card mt-4 shadow">
                    <div className="card-header bg-primary text-white">
                        <h2 className="mb-0">Stock Re-Order Level</h2>
                    </div>
                    <div className="card-body text-center py-5">
                        <div className="alert alert-danger">
                            <i className="fas fa-exclamation-circle me-2"></i>
                            {error}
                        </div>
                        <button className="btn btn-primary" onClick={() => fetchReorderData()}>
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container-fluid">
            <Header />
            <div className="card mt-2 shadow-lg p-0 expanded-card ledger-card compact">
                <div className="card-header bg-white py-1">
                    <h1 className="h5 mb-0 text-center text-primary">Stock Re-Order Level</h1>
                </div>
                <div className="card-body p-2 p-md-3">
                    {/* Status Summary Cards */}
                    {/* <div className="row g-2 mb-3">
                        <div className="col-md-4">
                            <div className="card shadow-sm border-top-danger">
                                <div className="card-body text-center py-2">
                                    <h6 className="text-muted mb-1">Items Need Reorder</h6>
                                    <div className="h4 text-danger mb-0">{summary.reorderCount}</div>
                              
                                </div>
                            </div>
                        </div>
                        <div className="col-md-4">
                            <div className="card shadow-sm border-top-warning">
                                <div className="card-body text-center py-2">
                                    <h6 className="text-muted mb-1">Overstock Items</h6>
                                    <div className="h4 text-warning mb-0">{summary.overstockCount}</div>
                               
                                </div>
                            </div>
                        </div>
                        <div className="col-md-4">
                            <div className="card shadow-sm border-top-primary">
                                <div className="card-body text-center py-2">
                                    <h6 className="text-muted mb-1">Total Items</h6>
                                    <div className="h4 text-primary mb-0">{summary.totalCount}</div>
                                </div>
                            </div>
                        </div>
                    </div> */}

                    {/* Filter and Controls Section */}
                    <div className="row g-2 mb-3">
                        <div className="col-12 col-md-3">
                            <div className="position-relative">
                                <select
                                    className="form-select form-select-sm"
                                    value={filterType}
                                    onChange={handleFilterChange}
                                    style={{ height: '30px', fontSize: '0.875rem', paddingTop: '0.25rem' }}
                                >
                                    <option value="reorderLevel">Items Need Reorder</option>
                                    <option value="maxStock">Overstock Items</option>
                                    <option value="all">All Items</option>
                                </select>
                                <label className="position-absolute" style={{ top: '-0.5rem', left: '0.75rem', fontSize: '0.75rem', backgroundColor: 'white', padding: '0 0.25rem', color: '#6c757d', fontWeight: '500' }}>
                                    Filter
                                </label>
                            </div>
                        </div>

                        <div className="col-12 col-md-3">
                            <div className="position-relative">
                                <div className="input-group input-group-sm">
                                    <span className="input-group-text" style={{ height: '30px', padding: '0 8px' }}>
                                        <FaSearch style={{ fontSize: '12px' }} />
                                    </span>
                                    <input
                                        type="text"
                                        className="form-control form-control-sm"
                                        placeholder=""
                                        value={searchTerm}
                                        onChange={handleSearchChange}
                                        autoComplete="off"
                                        style={{ height: '30px', fontSize: '0.875rem', paddingTop: '0.25rem' }}
                                    />
                                </div>
                                <label className="position-absolute" style={{ top: '-0.5rem', left: '0.75rem', fontSize: '0.75rem', backgroundColor: 'white', padding: '0 0.25rem', color: '#6c757d', fontWeight: '500' }}>
                                    Search
                                </label>
                            </div>
                        </div>

                        <div className="col-12 col-md-auto ms-auto">
                            <div className="d-flex gap-2">
                                <button
                                    className="btn btn-outline-success btn-sm d-flex align-items-center"
                                    onClick={exportToExcel}
                                    disabled={!filteredItems.length || exporting}
                                    style={{ height: '30px', padding: '0 12px', fontSize: '0.8rem' }}
                                    title="Export to Excel"
                                >
                                    <FiFileText className="me-1" />
                                    {exporting ? '...' : 'Export'}
                                </button>
                                <button
                                    className="btn btn-outline-primary btn-sm d-flex align-items-center"
                                    onClick={printItems}
                                    disabled={!filteredItems.length}
                                    style={{ height: '30px', padding: '0 12px', fontSize: '0.8rem' }}
                                    title="Print Report"
                                >
                                    <FiPrinter className="me-1" />
                                    Print
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Loading indicator */}
                    {loading && (
                        <div className="text-center py-3">
                            <div className="spinner-border spinner-border-sm text-primary" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                            <p className="mt-2 small text-muted" style={{ fontSize: '0.75rem' }}>Loading reorder data...</p>
                        </div>
                    )}

                    {/* Error message */}
                    {error && (
                        <div className="alert alert-danger text-center py-1 mb-2 small" style={{ fontSize: '0.75rem' }}>
                            {error}
                            <button type="button" className="btn-close btn-sm ms-2" style={{ fontSize: '10px' }} onClick={() => setError(null)}></button>
                        </div>
                    )}

                    {/* Table */}
                    {!loading && (
                        <>
                            {filteredItems.length === 0 ? (
                                <div className="alert alert-info text-center py-3" style={{ fontSize: '0.8rem' }}>
                                    <FiInbox size={32} className="text-muted mb-2" />
                                    <p className="mb-0">
                                        {stockData.items.length === 0 
                                            ? 'No items found. Please check your inventory.'
                                            : searchTerm 
                                                ? 'No items match your search criteria'
                                                : filterType === 'reorderLevel'
                                                    ? 'No items need reordering. All items have sufficient stock.'
                                                    : filterType === 'maxStock'
                                                        ? 'No overstock items found. All items are within maximum stock limits.'
                                                        : 'No items available'}
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div className="table-responsive" style={{ maxHeight: '500px', overflow: 'auto' }}>
                                        <table
                                            className="table table-sm table-hover mb-0"
                                            ref={tableRef}
                                            onKeyDown={handleKeyDown}
                                            style={{ fontSize: '0.75rem' }}
                                            tabIndex="0"
                                        >
                                            <thead className="table-light" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                                                <tr>
                                                    <th style={{ padding: '6px 8px', textAlign: 'center', width: '40px' }}>#</th>
                                                    <th style={{ padding: '6px 8px', width: '35%' }}>Item Name</th>
                                                    <th style={{ padding: '6px 8px', width: '10%' }}>Code</th>
                                                    <th style={{ padding: '6px 8px', width: '10%' }}>Unit</th>
                                                    <th style={{ padding: '6px 8px', textAlign: 'right', width: '12%' }}>Current Stock</th>
                                                    <th style={{ padding: '6px 8px', textAlign: 'right', width: '12%' }}>
                                                        {filterType === 'maxStock' ? 'Max Stock' : 'Reorder Level'}
                                                    </th>
                                                    <th style={{ padding: '6px 8px', textAlign: 'right', width: '12%' }}>
                                                        {filterType === 'maxStock' ? 'Over Stock' : 'Needed Stock'}
                                                    </th>
                                                    <th style={{ padding: '6px 8px', textAlign: 'center', width: '10%' }}>Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredItems.map((item, index) => (
                                                    <tr
                                                        key={index}
                                                        className={currentRowIndex === index ? 'table-active' : ''}
                                                        onClick={() => setCurrentRowIndex(index)}
                                                        style={{ cursor: 'pointer' }}
                                                    >
                                                        <td style={{ padding: '4px 6px', textAlign: 'center' }}>{index + 1}</td>
                                                        <td style={{ padding: '4px 6px' }}>
                                                            <div className="d-flex align-items-center">
                                                                {item.status === 'Understocked' && (
                                                                    <span className="badge bg-danger me-1" style={{ fontSize: '0.65rem', padding: '2px 4px' }}>LOW</span>
                                                                )}
                                                                {item.status === 'Overstocked' && (
                                                                    <span className="badge bg-warning me-1" style={{ fontSize: '0.65rem', padding: '2px 4px' }}>HIGH</span>
                                                                )}
                                                                <span className="text-truncate" style={{ maxWidth: '250px' }}>{item.name}</span>
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '4px 6px' }}>{item.code || '-'}</td>
                                                        <td style={{ padding: '4px 6px' }}>{item.unit}</td>
                                                        <td className="text-end" style={{ padding: '4px 6px' }}>{formatNumber(item.currentStock)}</td>
                                                        <td className="text-end" style={{ padding: '4px 6px' }}>
                                                            {filterType === 'maxStock' ? formatNumber(item.maxStock) : formatNumber(item.reorderLevel)}
                                                        </td>
                                                        <td className={`text-end ${filterType === 'maxStock' ? (item.overStock > 0 ? 'text-danger fw-bold' : '') : (item.neededStock > 0 ? 'text-danger fw-bold' : 'text-success')}`}>
                                                            {filterType === 'maxStock' ? formatNumber(item.overStock) : formatNumber(item.neededStock)}
                                                        </td>
                                                        <td className="text-center" style={{ padding: '4px 6px' }}>
                                                            {item.status === 'Understocked' ? (
                                                                <span className="badge bg-danger">Reorder</span>
                                                            ) : item.status === 'Overstocked' ? (
                                                                <span className="badge bg-warning">Overstock</span>
                                                            ) : (
                                                                <span className="badge bg-success">Normal</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot className="table-group-divider">
                                                <tr className="fw-bold table-secondary">
                                                    <td colSpan="6" style={{ padding: '6px 8px' }}>Total</td>
                                                    <td className="text-end" style={{ padding: '6px 8px' }}>
                                                        {filterType === 'maxStock' ? formatNumber(summary.totalOverstock) : formatNumber(summary.totalNeeded)}
                                                    </td>
                                                    <td></td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>

                                    {/* Summary footer */}
                                    <div className="row mt-2">
                                        <div className="col-12">
                                            <div className="text-muted small" style={{ fontSize: '0.7rem' }}>
                                                Showing {filteredItems.length} of {stockData.items.length} items
                                                {filterType === 'reorderLevel' && ` (${summary.reorderCount} items need reorder, total needed: ${formatNumber(summary.totalNeeded)})`}
                                                {filterType === 'maxStock' && ` (${summary.overstockCount} items overstocked, total overstock: ${formatNumber(summary.totalOverstock)})`}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Product Modal for F9 shortcut */}
            {showProductModal && (
                <ProductModal onClose={() => setShowProductModal(false)} />
            )}

            {/* Notification Toast */}
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

export default ItemsReOrderLevel;