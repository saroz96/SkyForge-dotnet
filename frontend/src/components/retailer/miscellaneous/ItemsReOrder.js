import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../Header';
import Loader from '../../Loader';
import * as XLSX from 'xlsx';
import ProductModal from '../dashboard/modals/ProductModal';
import NotificationToast from '../../NotificationToast';
import { FiPrinter, FiFileText, FiSearch, FiAlertCircle, FiCheck } from 'react-icons/fi';
import './ItemsReOrderLevel.css';
import api, { refreshToken } from '../../services/api';

const ItemsReOrderLevel = () => {
    // API instance
    // const api = useMemo(() => {
    //     const instance = axios.create({
    //         baseURL: process.env.REACT_APP_API_BASE_URL,
    //         withCredentials: true,
    //     });
    //     instance.interceptors.request.use(
    //         (config) => {
    //             const token = localStorage.getItem('token');
    //             if (token) config.headers.Authorization = `Bearer ${token}`;
    //             return config;
    //         },
    //         (error) => Promise.reject(error)
    //     );
    //     return instance;
    // }, []);

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
        show: false, message: '', type: 'success', duration: 3000
    });
    const [company, setCompany] = useState({
        dateFormat: 'english',
        currentCompanyName: '',
        fiscalYear: null
    });

    const tableRef = useRef(null);
    const searchInputRef = useRef(null);
    const navigate = useNavigate();
    const abortControllerRef = useRef(null);

    // Fetch reorder data
    const fetchReorderData = useCallback(async () => {
        if (abortControllerRef.current) abortControllerRef.current.abort();
        abortControllerRef.current = new AbortController();

        try {
            setLoading(true);
            setError(null);
            const response = await api.get('/api/retailer/items/reorder', {
                signal: abortControllerRef.current.signal
            });

            if (response.data.success) {
                const responseData = response.data.data;
                const processedItems = (responseData.items || []).map(item => {
                    let status = 'Normal';
                    if (item.currentStock < item.reorderLevel) status = 'Understocked';
                    else if (item.maxStock > 0 && item.currentStock > item.maxStock) status = 'Overstocked';
                    return {
                        ...item,
                        status,
                        code: item.code || item.barcodeNumber || '',
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

                setCompany({
                    dateFormat: responseData.company?.dateFormat?.toLowerCase() || 'english',
                    currentCompanyName: responseData.currentCompanyName || responseData.company?.name || '',
                    fiscalYear: responseData.currentFiscalYear
                });

                setNotification({ show: true, message: 'Data loaded successfully!', type: 'success', duration: 3000 });
            } else {
                setError(response.data.error || 'Failed to fetch reorder data');
                setNotification({ show: true, message: response.data.error || 'Failed to fetch reorder data', type: 'error', duration: 3000 });
            }
        } catch (err) {
            if (err.name === 'AbortError' || err.name === 'CanceledError') return;
            console.error('Fetch error:', err);
            const errorMsg = err.response?.data?.error || 'Failed to fetch reorder data';
            setError(errorMsg);
            setNotification({ show: true, message: errorMsg, type: 'error', duration: 3000 });
        } finally {
            setLoading(false);
            setInitialLoading(false);
        }
    }, [api]);

    // Initial fetch
    useEffect(() => {
        fetchReorderData();
        return () => { if (abortControllerRef.current) abortControllerRef.current.abort(); };
    }, [fetchReorderData]);

    // Filtered items
    const filteredItems = useMemo(() => {
        if (!stockData.items || !Array.isArray(stockData.items)) return [];
        return stockData.items.filter(item => {
            let matchesFilter = true;
            if (filterType === 'reorderLevel') matchesFilter = item.status === 'Understocked';
            else if (filterType === 'maxStock') matchesFilter = item.status === 'Overstocked';
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
            totalNeeded: items.filter(i => i.status === 'Understocked').reduce((sum, item) => sum + (item.neededStock || 0), 0),
            totalOverstock: items.filter(i => i.status === 'Overstocked').reduce((sum, item) => sum + (item.overStock || 0), 0)
        };
    }, [stockData.items]);

    const handleFilterChange = (e) => { setFilterType(e.target.value); setCurrentRowIndex(-1); };
    const handleSearchChange = (e) => { setSearchTerm(e.target.value); setCurrentRowIndex(-1); };

    // Keyboard navigation
    const handleKeyDown = (e) => {
        if (filteredItems.length === 0 || (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
        switch (e.key) {
            case 'ArrowUp': e.preventDefault(); if (currentRowIndex > 0) { setCurrentRowIndex(currentRowIndex - 1); scrollToRow(currentRowIndex - 1); } break;
            case 'ArrowDown': e.preventDefault(); if (currentRowIndex < filteredItems.length - 1) { setCurrentRowIndex(currentRowIndex + 1); scrollToRow(currentRowIndex + 1); } break;
            case 'Home': e.preventDefault(); setCurrentRowIndex(0); scrollToRow(0); break;
            case 'End': e.preventDefault(); setCurrentRowIndex(filteredItems.length - 1); scrollToRow(filteredItems.length - 1); break;
            default: break;
        }
    };

    const scrollToRow = (index) => {
        if (tableRef.current) {
            const rows = tableRef.current.querySelectorAll('tbody tr');
            if (rows[index]) rows[index].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    };

    const formatNumber = useCallback((num) => {
        if (num === undefined || num === null) return '0';
        const number = typeof num === 'string' ? parseFloat(num) : Number(num);
        if (isNaN(number)) return '0';
        return number.toLocaleString(company.dateFormat === 'nepali' ? 'en-IN' : 'en-US', {
            minimumFractionDigits: 2, maximumFractionDigits: 2
        });
    }, [company.dateFormat]);

    const printItems = () => {
        if (!filteredItems.length) {
            setNotification({ show: true, message: 'No data to print', type: 'warning', duration: 3000 });
            return;
        }
        const printWindow = window.open('', '_blank');
        const title = filterType === 'maxStock' ? 'Overstock Items Report' :
            filterType === 'reorderLevel' ? 'Reorder Level Report' : 'Stock Report';
        const printDate = new Date().toLocaleString();
        const fiscalYearName = company.fiscalYear?.name || 'N/A';
        const companyName = company.currentCompanyName || stockData.currentCompanyName || 'N/A';

        const printContent = `
            <!DOCTYPE html><html><head><title>${title}</title>
            <style>
                body { font-family: Arial, sans-serif; font-size: 11px; margin: 0; padding: 10mm; }
                .print-header { text-align: center; margin-bottom: 15px; }
                .report-title { text-align: center; text-decoration: underline; margin-bottom: 10px; }
                table { width: 100%; border-collapse: collapse; page-break-inside: auto; }
                th, td { border: 1px solid #000; padding: 6px; text-align: left; }
                th { background-color: #f2f2f2; font-weight: bold; }
                .text-end { text-align: right; }
                .text-danger { color: #e74c3c; } .text-success { color: #2ecc71; }
                @page { size: landscape; margin: 10mm; }
                .print-footer { margin-top: 10px; font-size: 9px; text-align: right; }
            </style></head>
            <body>
                <div class="print-header"><h1>${companyName}</h1><h2 class="report-title">${title}</h2><hr></div>
                <div style="display:flex;justify-content:space-between;margin-bottom:15px;">
                    <div><strong>Fiscal Year:</strong> ${fiscalYearName}</div>
                    <div><strong>Generated on:</strong> ${printDate}</div>
                </div>
                ${searchTerm ? `<div><strong>Search:</strong> "${searchTerm}"</div>` : ''}
                <table><thead><tr>
                    <th>#</th><th>Item Name</th><th>Code</th><th>Unit</th>
                    <th class="text-end">Current Stock</th>
                    <th class="text-end">${filterType === 'maxStock' ? 'Max Stock' : 'Reorder Level'}</th>
                    <th class="text-end">${filterType === 'maxStock' ? 'Over Stock' : 'Needed Stock'}</th>
                    <th>Status</th>
                </tr></thead>
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
                            <td>${item.status === 'Understocked' ? 'Reorder' : item.status === 'Overstocked' ? 'Overstock' : 'Normal'}</td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot><tr style="font-weight:bold;">
                    <td colspan="6">Total</td>
                    <td class="text-end">${filterType === 'maxStock' ? formatNumber(summary.totalOverstock) : formatNumber(summary.totalNeeded)}</td>
                    <td></td>
                </tr></tfoot></table>
                <div class="print-footer">Printed from ${companyName} | ${printDate}</div>
                <script>window.onload=function(){window.print();window.onafterprint=function(){window.close();}}</script>
            </body></html>
        `;
        printWindow.document.write(printContent);
        printWindow.document.close();
    };

    const exportToExcel = () => {
        if (!filteredItems.length) {
            setNotification({ show: true, message: 'No data to export', type: 'warning', duration: 3000 });
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
            const totalsRow = {
                '#': '', 'Item Name': 'TOTALS', 'Code': '', 'Unit': '',
                'Current Stock': '',
                [filterType === 'maxStock' ? 'Max Stock' : 'Reorder Level']: '',
                [filterType === 'maxStock' ? 'Over Stock' : 'Needed Stock']: formatNumber(filterType === 'maxStock' ? summary.totalOverstock : summary.totalNeeded),
                'Status': ''
            };
            dataToExport.push(totalsRow);
            const ws = XLSX.utils.json_to_sheet(dataToExport);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, title);
            XLSX.writeFile(wb, `${title}_${new Date().toISOString().split('T')[0]}.xlsx`);
            setNotification({ show: true, message: 'Excel exported successfully!', type: 'success', duration: 3000 });
        } catch (err) { setNotification({ show: true, message: 'Failed to export data', type: 'error', duration: 3000 });
        } finally { setExporting(false); }
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'F9') { e.preventDefault(); setShowProductModal(prev => !prev); }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    if (initialLoading) return <Loader />;

    if (error && !stockData.items.length) {
        return (
            <div className="rl-page">
                <Header />
                <div className="rl-shell">
                    <div className="rl-state">
                        <FiAlertCircle size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                        <h3>Error loading data</h3>
                        <p>{error}</p>
                        <button className="rl-btn-primary" onClick={fetchReorderData} style={{ marginTop: '1rem' }}>Retry</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="rl-page">
            <Header />

            <div className="rl-shell">
                {/* Top Bar */}
                <div className="rl-topbar">
                    <div className="rl-topbar__left">
                        <div className="rl-topbar__icon"><FiFileText /></div>
                        <div><h1>Stock Re-Order Level</h1></div>
                    </div>
                    <div className="rl-topbar__actions">
                        <button className="rl-btn-icon" onClick={exportToExcel} disabled={!filteredItems.length || exporting}>
                            <FiFileText /> {exporting ? '…' : 'Export'}
                        </button>
                        <button className="rl-btn-icon" onClick={printItems} disabled={!filteredItems.length}>
                            <FiPrinter /> Print
                        </button>
                    </div>
                </div>

                {/* Single-Row Toolbar */}
                <div className="rl-toolbar">
                    <div className="rl-field rl-field--filter">
                        <label>Filter</label>
                        <select value={filterType} onChange={handleFilterChange}>
                            <option value="reorderLevel">Need Reorder</option>
                            <option value="maxStock">Overstock</option>
                            <option value="all">All Items</option>
                        </select>
                    </div>

                    <div className="rl-field rl-field--search">
                        <label>Search</label>
                        <div className="rl-search-wrap">
                            <FiSearch className="rl-search-icon" />
                            <input type="text" ref={searchInputRef} placeholder="Name, code..." value={searchTerm} onChange={handleSearchChange} autoComplete="off" />
                            {searchTerm && <button className="rl-search-clear" onClick={() => setSearchTerm('')}>×</button>}
                        </div>
                    </div>

                    <div className="rl-toolbar-divider" />

                    {/* Summary Chips - Inline with toolbar */}
                    <div className="rl-chips">
                        <div className="rl-chip rl-chip--danger">
                            <span className="rl-chip__label">Need Reorder</span>
                            <span className="rl-chip__val">{summary.reorderCount}</span>
                        </div>
                        <div className="rl-chip rl-chip--warning">
                            <span className="rl-chip__label">Overstock</span>
                            <span className="rl-chip__val">{summary.overstockCount}</span>
                        </div>
                        <div className="rl-chip rl-chip--primary">
                            <span className="rl-chip__label">Total Items</span>
                            <span className="rl-chip__val">{summary.totalCount}</span>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="rl-alert">
                        <FiAlertCircle className="me-1" />{error}
                        <button type="button" className="btn-close btn-sm ms-auto" onClick={() => setError(null)} />
                    </div>
                )}

                {/* Main Content */}
                <div className="rl-main">
                    {loading ? (
                        <div className="rl-state"><div className="spinner-border text-primary" /><p>Loading data...</p></div>
                    ) : filteredItems.length === 0 ? (
                        <div className="rl-state">
                            <FiCheck size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                            <h3>No items found</h3>
                            <p>
                                {stockData.items.length === 0 ? 'No items in inventory.'
                                    : searchTerm ? 'No items match your search criteria.'
                                    : filterType === 'reorderLevel' ? 'All items have sufficient stock.'
                                    : filterType === 'maxStock' ? 'All items are within maximum stock limits.'
                                    : 'No items available'}
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="rl-main__bar">
                                <span><strong>{filteredItems.length}</strong> of <strong>{stockData.items.length}</strong> items</span>
                                <span>{filterType === 'reorderLevel' ? `Need Reorder: ${formatNumber(summary.totalNeeded)}` : filterType === 'maxStock' ? `Overstock: ${formatNumber(summary.totalOverstock)}` : ''}</span>
                            </div>

                            <div className="rl-table-scroll">
                                <table className="rl-table" ref={tableRef} onKeyDown={handleKeyDown} tabIndex="0">
                                    <thead>
                                        <tr>
                                            <th className="text-center" style={{ width: 40 }}>#</th>
                                            <th>Item Name</th>
                                            <th>Code</th>
                                            <th>Unit</th>
                                            <th className="num">Current Stock</th>
                                            <th className="num">{filterType === 'maxStock' ? 'Max Stock' : 'Reorder Level'}</th>
                                            <th className="num">{filterType === 'maxStock' ? 'Over Stock' : 'Needed Stock'}</th>
                                            <th className="text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredItems.map((item, index) => (
                                            <tr key={index} className={currentRowIndex === index ? 'rl-row-selected' : ''} onClick={() => setCurrentRowIndex(index)}>
                                                <td className="text-center">{index + 1}</td>
                                                <td>
                                                    {item.status === 'Understocked' && <span className="rl-badge rl-badge--danger">LOW</span>}
                                                    {item.status === 'Overstocked' && <span className="rl-badge rl-badge--warning">HIGH</span>}
                                                    <span className="rl-item-name">{item.name}</span>
                                                </td>
                                                <td>{item.code || '-'}</td>
                                                <td>{item.unit}</td>
                                                <td className="num">{formatNumber(item.currentStock)}</td>
                                                <td className="num">{filterType === 'maxStock' ? formatNumber(item.maxStock) : formatNumber(item.reorderLevel)}</td>
                                                <td className={`num ${filterType === 'maxStock' ? (item.overStock > 0 ? 'rl-text-danger fw-bold' : '') : (item.neededStock > 0 ? 'rl-text-danger fw-bold' : 'rl-text-success')}`}>
                                                    {filterType === 'maxStock' ? formatNumber(item.overStock) : formatNumber(item.neededStock)}
                                                </td>
                                                <td className="text-center">
                                                    <span className={`rl-status rl-status--${item.status === 'Understocked' ? 'danger' : item.status === 'Overstocked' ? 'warning' : 'success'}`}>
                                                        {item.status === 'Understocked' ? 'Reorder' : item.status === 'Overstocked' ? 'Overstock' : 'Normal'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* CRITICAL FIX: Sticky Footer outside the scrollable table */}
                            <div className="rl-footer">
                                <div className="rl-footer-cell" style={{ flex: 1 }}>Total</div>
                                <div className="rl-footer-cell rl-cell--num">
                                    {filterType === 'maxStock' ? formatNumber(summary.totalOverstock) : formatNumber(summary.totalNeeded)}
                                </div>
                                <div className="rl-footer-cell" style={{ width: '80px', flexShrink: 0 }}></div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {showProductModal && <ProductModal onClose={() => setShowProductModal(false)} />}
            <NotificationToast show={notification.show} message={notification.message} type={notification.type} duration={notification.duration} onClose={() => setNotification({ ...notification, show: false })} />
        </div>
    );
};

export default ItemsReOrderLevel;