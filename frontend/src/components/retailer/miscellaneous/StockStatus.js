import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../Header';
import Loader from '../../Loader';
import { usePageNotRefreshContext } from '../PageNotRefreshContext';
import * as XLSX from 'xlsx';
import ProductModal from '../dashboard/modals/ProductModal';
import NotificationToast from '../../NotificationToast';
import NepaliDate from 'nepali-date-converter';

const StockStatus = () => {
    const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
    const currentEnglishDate = new Date().toISOString().split('T')[0];

    const { draftStockStatusSave, setDraftStockStatusSave } = usePageNotRefreshContext();
    const [showProductModal, setShowProductModal] = useState(false);

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
    const [company, setCompany] = useState({
        dateFormat: 'english',
        isVatExempt: false,
        vatEnabled: true,
        fiscalYear: null,
        currentCompanyName: '',
        address: '',
        city: '',
        pan: ''
    });

    const [data, setData] = useState(() => {
        if (draftStockStatusSave?.stockStatusData) {
            return draftStockStatusSave.stockStatusData;
        }
        return {
            items: [],
            pagination: {
                current: 1,
                pages: 1,
                total: 0
            },
            fromDate: '',
            toDate: '',
            searchQuery: '',
            currentPage: 1,
            itemsPerPage: 10,
            displayOptions: {
                showPurchaseValue: false,
                showSalesValue: false
            },
            sortConfig: {
                key: 'name',
                direction: 'ascending'
            },
            isAdminOrSupervisor: false
        };
    });

    const [dateErrors, setDateErrors] = useState({
        fromDate: '',
        toDate: ''
    });

    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [error, setError] = useState(null);
    const [hasGenerated, setHasGenerated] = useState(false);
    const [exporting, setExporting] = useState(false);

    const [notification, setNotification] = useState({
        show: false,
        message: '',
        type: 'success',
        duration: 3000
    });

    const navigate = useNavigate();
    const searchInputRef = useRef(null);
    const fromDateRef = useRef(null);
    const toDateRef = useRef(null);
    const generateBtnRef = useRef(null);
    const abortControllerRef = useRef(null);

    // Fetch company info
    useEffect(() => {
        const fetchCompanyInfo = async () => {
            try {
                setInitialLoading(true);
                const response = await api.get('/api/retailer/sales-register/entry-data');
                if (response.data.success) {
                    const responseData = response.data.data;
                    const dateFormat = responseData.company?.dateFormat?.toLowerCase() || 'english';
                    const currentFiscalYear = responseData.currentFiscalYear;
                    const isNepaliFormat = dateFormat === 'nepali';

                    setCompany({
                        dateFormat: dateFormat,
                        isVatExempt: responseData.company?.isVatExempt || false,
                        vatEnabled: responseData.company?.vatEnabled !== false,
                        fiscalYear: currentFiscalYear || {},
                        currentCompanyName: responseData.company?.name || '',
                        address: responseData.company?.address || '',
                        city: responseData.company?.city || '',
                        pan: responseData.company?.pan || ''
                    });

                    // Set default dates based on fiscal year
                    const hasDraftDates = draftStockStatusSave?.stockStatusData?.fromDate && draftStockStatusSave?.stockStatusData?.toDate;

                    if (!hasDraftDates && currentFiscalYear) {
                        let fromDateFormatted = '';
                        let toDateFormatted = '';

                        if (isNepaliFormat) {
                            fromDateFormatted = currentFiscalYear.startDateNepali || currentNepaliDate;
                            toDateFormatted = currentNepaliDate;
                        } else {
                            fromDateFormatted = currentFiscalYear.startDate
                                ? new Date(currentFiscalYear.startDate).toISOString().split('T')[0]
                                : currentEnglishDate;
                            toDateFormatted = currentFiscalYear.endDate
                                ? new Date(currentFiscalYear.endDate).toISOString().split('T')[0]
                                : currentEnglishDate;
                        }

                        setData(prev => ({
                            ...prev,
                            fromDate: fromDateFormatted,
                            toDate: toDateFormatted
                        }));
                    }
                }
            } catch (err) {
                console.error('Error fetching company info:', err);
                setData(prev => ({
                    ...prev,
                    fromDate: currentEnglishDate,
                    toDate: currentEnglishDate
                }));
            } finally {
                setInitialLoading(false);
            }
        };
        fetchCompanyInfo();
    }, []);

    // Validate date
    const validateDate = (dateStr) => {
        if (!dateStr) return false;
        if (company.dateFormat === 'nepali') {
            const match = dateStr.match(/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/);
            if (!match) return false;
            const [year, month, day] = dateStr.replace(/-/g, '/').split('/').map(Number);
            if (month < 1 || month > 12 || day < 1 || day > 32) return false;
            try {
                const nepaliDate = new NepaliDate(year, month - 1, day);
                return nepaliDate.getYear() === year && nepaliDate.getMonth() + 1 === month && nepaliDate.getDate() === day;
            } catch { return false; }
        } else {
            return /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(dateStr) && !isNaN(new Date(dateStr).getTime());
        }
    };

    // Fetch stock items
    const fetchStockItems = useCallback(async () => {
        if (!data.fromDate || !data.toDate) {
            setDateErrors({ fromDate: 'Please enter from date', toDate: 'Please enter to date' });
            return;
        }
        if (!validateDate(data.fromDate)) {
            setDateErrors(prev => ({ ...prev, fromDate: 'Invalid date format' }));
            fromDateRef.current?.focus();
            return;
        }
        if (!validateDate(data.toDate)) {
            setDateErrors(prev => ({ ...prev, toDate: 'Invalid date format' }));
            toDateRef.current?.focus();
            return;
        }

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        try {
            setLoading(true);
            setError(null);
            
            const params = new URLSearchParams();
            params.append('page', data.currentPage);
            params.append('limit', data.itemsPerPage === 'all' ? 10000 : data.itemsPerPage);
            params.append('fromDate', data.fromDate);
            params.append('toDate', data.toDate);
            if (data.searchQuery) params.append('search', data.searchQuery);
            if (data.displayOptions.showPurchaseValue) params.append('showPurchaseValue', true);
            if (data.displayOptions.showSalesValue) params.append('showSalesValue', true);

            const response = await api.get(`/api/retailer/stock-status?${params.toString()}`, {
                signal: abortControllerRef.current.signal
            });

            if (response.data.success) {
                const responseData = response.data.data;
                setData(prev => ({
                    ...prev,
                    items: responseData.items || [],
                    pagination: responseData.pagination || { current: 1, pages: 1, total: 0 },
                    isAdminOrSupervisor: responseData.isAdminOrSupervisor || false
                }));
                setHasGenerated(true);
                setError(null);
                setNotification({ show: true, message: 'Stock status loaded successfully!', type: 'success', duration: 3000 });
            }
        } catch (err) {
            if (err.name === 'AbortError' || err.name === 'CanceledError') {
                return;
            }
            console.error('Fetch error:', err);
            const errorMsg = err.response?.data?.error || 'Failed to fetch stock status';
            setError(errorMsg);
            setNotification({ show: true, message: errorMsg, type: 'error', duration: 3000 });
        } finally {
            setLoading(false);
        }
    }, [data.currentPage, data.itemsPerPage, data.searchQuery, data.displayOptions.showPurchaseValue, data.displayOptions.showSalesValue, data.fromDate, data.toDate]);

    const handleGenerateReport = () => {
        if (!data.fromDate) {
            setDateErrors(prev => ({ ...prev, fromDate: 'Please enter from date' }));
            fromDateRef.current?.focus();
            return;
        }
        if (!data.toDate) {
            setDateErrors(prev => ({ ...prev, toDate: 'Please enter to date' }));
            toDateRef.current?.focus();
            return;
        }
        if (!validateDate(data.fromDate)) {
            setDateErrors(prev => ({ ...prev, fromDate: 'Invalid date format' }));
            fromDateRef.current?.focus();
            return;
        }
        if (!validateDate(data.toDate)) {
            setDateErrors(prev => ({ ...prev, toDate: 'Invalid date format' }));
            toDateRef.current?.focus();
            return;
        }
        fetchStockItems();
    };

    const handleDateChange = (e) => {
        const { name, value } = e.target;
        const sanitizedValue = value.replace(/[^0-9/-]/g, '');
        if (sanitizedValue.length <= 10) {
            setData(prev => ({ ...prev, [name]: sanitizedValue }));
            setDateErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    // Debounced search
    useEffect(() => {
        if (!hasGenerated) return;
        const debounceTimer = setTimeout(() => {
            if (data.currentPage !== 1) {
                setData(prev => ({ ...prev, currentPage: 1 }));
            } else {
                fetchStockItems();
            }
        }, 500);
        return () => clearTimeout(debounceTimer);
    }, [data.searchQuery]);

    // Trigger fetch when pagination or display options change
    useEffect(() => {
        if (hasGenerated) {
            fetchStockItems();
        }
    }, [data.currentPage, data.itemsPerPage, data.displayOptions.showPurchaseValue, data.displayOptions.showSalesValue]);

    // Save to draft
    useEffect(() => {
        if (hasGenerated) {
            setDraftStockStatusSave({
                ...draftStockStatusSave,
                stockStatusData: data
            });
        }
    }, [data]);

    // Sort items
    const sortItems = (key) => {
        let direction = 'ascending';
        if (data.sortConfig.key === key && data.sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setData(prev => ({
            ...prev,
            sortConfig: { key, direction }
        }));
    };

    // Get sorted items
    const getSortedItems = useCallback(() => {
        if (!data.items || !Array.isArray(data.items)) {
            return [];
        }
        
        const sorted = [...data.items];
        const { key, direction } = data.sortConfig;
        
        sorted.sort((a, b) => {
            let aValue = a[key];
            let bValue = b[key];
            
            if (key === 'code') {
                aValue = a.code || '';
                bValue = b.code || '';
            } else if (key === 'category') {
                aValue = a.category || '';
                bValue = b.category || '';
            } else if (key === 'unit') {
                aValue = a.unit || '';
                bValue = b.unit || '';
            } else if (typeof aValue === 'number' && typeof bValue === 'number') {
                return direction === 'ascending' ? aValue - bValue : bValue - aValue;
            } else {
                aValue = (aValue || '').toString().toLowerCase();
                bValue = (bValue || '').toString().toLowerCase();
            }
            
            if (direction === 'ascending') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });
        
        return sorted;
    }, [data.items, data.sortConfig]);

    const sortedItems = getSortedItems();

    // Format currency
    const formatCurrency = useCallback((num) => {
        if (num === undefined || num === null) return '0.00';
        const number = Math.abs(typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num));
        if (isNaN(number)) return '0.00';
        return number.toLocaleString(company.dateFormat === 'nepali' ? 'en-IN' : 'en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }, [company.dateFormat]);

    // Calculate totals for current page
    const totals = useMemo(() => {
        if (!sortedItems || !Array.isArray(sortedItems)) {
            return {
                totalStock: 0,
                totalOpeningStock: 0,
                totalQtyIn: 0,
                totalQtyOut: 0,
                totalPurchaseValue: 0,
                totalSalesValue: 0
            };
        }
        
        return sortedItems.reduce((acc, item) => {
            acc.totalStock += item.stock || 0;
            acc.totalOpeningStock += item.openingStock || 0;
            acc.totalQtyIn += item.totalQtyIn || 0;
            acc.totalQtyOut += item.totalQtyOut || 0;
            if (data.displayOptions.showPurchaseValue) {
                acc.totalPurchaseValue += item.totalStockValuePurchase || 0;
            }
            if (data.displayOptions.showSalesValue) {
                acc.totalSalesValue += item.totalStockValueSales || 0;
            }
            return acc;
        }, {
            totalStock: 0,
            totalOpeningStock: 0,
            totalQtyIn: 0,
            totalQtyOut: 0,
            totalPurchaseValue: 0,
            totalSalesValue: 0
        });
    }, [sortedItems, data.displayOptions]);

    // Handle search query change
    const handleSearchChange = (e) => {
        setData(prev => ({ ...prev, searchQuery: e.target.value }));
    };

    // Handle items per page change
    const handleItemsPerPageChange = (e) => {
        const value = e.target.value;
        setData(prev => ({
            ...prev,
            itemsPerPage: value === 'all' ? 'all' : parseInt(value),
            currentPage: 1
        }));
    };

    // Handle page change
    const handlePageChange = (newPage) => {
        if (data.pagination && newPage >= 1 && newPage <= data.pagination.pages) {
            setData(prev => ({ ...prev, currentPage: newPage }));
            window.scrollTo(0, 0);
        }
    };

    // Handle checkbox change
    const handleCheckboxChange = (e) => {
        const { name, checked } = e.target;
        setData(prev => ({
            ...prev,
            displayOptions: {
                ...prev.displayOptions,
                [name]: checked
            },
            currentPage: 1
        }));
    };

    // Handle key down for Enter key navigation
    const handleKeyDown = (e, nextFieldId) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (nextFieldId) {
                const nextField = document.getElementById(nextFieldId);
                if (nextField) {
                    nextField.focus();
                }
            } else {
                handleGenerateReport();
            }
        }
    };

    // Export to Excel
    const exportToExcel = async () => {
        if (!hasGenerated || !sortedItems.length) {
            setNotification({ show: true, message: 'Please generate the report first', type: 'warning', duration: 3000 });
            return;
        }
        
        setExporting(true);
        try {
            const dataToExport = sortedItems.map((item, index) => {
                const rowData = {
                    '#': index + 1,
                    'Code': item.code || '',
                    'Item Name': item.name,
                    'Category': item.category || '-',
                    'Unit': item.unit || '-',
                    'Stock': formatCurrency(item.stock),
                    'Op. Stock': formatCurrency(item.openingStock),
                    'Qty. In': formatCurrency(item.totalQtyIn),
                    'Qty. Out': formatCurrency(item.totalQtyOut),
                    'Min Stock': item.minStock || '-',
                    'Max Stock': item.maxStock || '-',
                    'C.P': formatCurrency(item.avgPuPrice),
                    'S.P': formatCurrency(item.avgPrice)
                };

                if (data.displayOptions.showPurchaseValue) {
                    rowData['Stock Value (CP)'] = formatCurrency(item.totalStockValuePurchase);
                }
                if (data.displayOptions.showSalesValue) {
                    rowData['Stock Value (SP)'] = formatCurrency(item.totalStockValueSales);
                }
                return rowData;
            });

            // Add totals row
            const totalsRow = {
                '#': '',
                'Code': '',
                'Item Name': 'TOTALS',
                'Category': '',
                'Unit': '',
                'Stock': formatCurrency(totals.totalStock),
                'Op. Stock': formatCurrency(totals.totalOpeningStock),
                'Qty. In': formatCurrency(totals.totalQtyIn),
                'Qty. Out': formatCurrency(totals.totalQtyOut),
                'Min Stock': '',
                'Max Stock': '',
                'C.P': '',
                'S.P': ''
            };

            if (data.displayOptions.showPurchaseValue) {
                totalsRow['Stock Value (CP)'] = formatCurrency(totals.totalPurchaseValue);
            }
            if (data.displayOptions.showSalesValue) {
                totalsRow['Stock Value (SP)'] = formatCurrency(totals.totalSalesValue);
            }

            dataToExport.push(totalsRow);

            const ws = XLSX.utils.json_to_sheet(dataToExport);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Stock Status');
            
            const date = new Date().toISOString().split('T')[0];
            XLSX.writeFile(wb, `Stock_Status_${date}.xlsx`);
            setNotification({ show: true, message: 'Excel file exported successfully!', type: 'success', duration: 3000 });
        } catch (err) {
            setNotification({ show: true, message: 'Failed to export data', type: 'error', duration: 3000 });
        } finally {
            setExporting(false);
        }
    };

    // Print function
    const printStockStatus = () => {
        if (!hasGenerated || !sortedItems.length) {
            setNotification({ show: true, message: 'Please generate the report first', type: 'warning', duration: 3000 });
            return;
        }

        const printWindow = window.open('', '_blank');
        const printDate = new Date().toLocaleDateString();
        const fiscalYear = company.fiscalYear?.name || 'N/A';

        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Stock Status Report</title>
                <style>
                    @page { size: A4 landscape; margin: 10mm; }
                    body { font-family: Arial, sans-serif; font-size: 10px; margin: 0; padding: 5mm; }
                    .print-header { text-align: center; margin-bottom: 15px; }
                    .report-title { text-align: center; text-decoration: underline; margin-bottom: 10px; }
                    table { width: 100%; border-collapse: collapse; page-break-inside: auto; font-size: 12px; }
                    th, td { border: 1px solid #000; padding: 4px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    .text-end { text-align: right; }
                    .print-footer { margin-top: 10px; font-size: 9px; text-align: right; }
                </style>
            </head>
            <body>
                <div class="print-header">
                    <h1>${company.currentCompanyName || 'Company Name'}</h1>
                    <p>${company.address || ''}${company.city ? ', ' + company.city : ''}, TPIN: ${company.pan || ''}</p>
                    <h2 class="report-title">Stock Status Report</h2>
                    <hr>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                    <div><strong>From:</strong> ${data.fromDate} | <strong>To:</strong> ${data.toDate} | <strong>F.Y:</strong> ${fiscalYear}</div>
                    <div><strong>Total Items:</strong> ${sortedItems.length}${data.searchQuery ? ` | Search: "${data.searchQuery}"` : ''}</div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Code</th>
                            <th>Item Name</th>
                            <th>Category</th>
                            <th>Unit</th>
                            <th class="text-end">Stock</th>
                            <th class="text-end">Op. Stock</th>
                            <th class="text-end">Qty. In</th>
                            <th class="text-end">Qty. Out</th>
                            <th class="text-end">Min</th>
                            <th class="text-end">Max</th>
                            <th class="text-end">C.P</th>
                            <th class="text-end">S.P</th>
                            ${data.displayOptions.showPurchaseValue ? '<th class="text-end">Val (CP)</th>' : ''}
                            ${data.displayOptions.showSalesValue ? '<th class="text-end">Val (SP)</th>' : ''}
                        </tr>
                    </thead>
                    <tbody>
                        ${sortedItems.map((item, index) => `
                            <tr>
                                <td>${index + 1}</td>
                                <td>${item.code || ''}</td>
                                <td>${item.name}</td>
                                <td>${item.category || '-'}</td>
                                <td>${item.unit || '-'}</td>
                                <td class="text-end">${formatCurrency(item.stock)}</td>
                                <td class="text-end">${formatCurrency(item.openingStock)}</td>
                                <td class="text-end">${formatCurrency(item.totalQtyIn)}</td>
                                <td class="text-end">${formatCurrency(item.totalQtyOut)}</td>
                                <td class="text-end">${item.minStock || '-'}</td>
                                <td class="text-end">${item.maxStock || '-'}</td>
                                <td class="text-end">${formatCurrency(item.avgPuPrice)}</td>
                                <td class="text-end">${formatCurrency(item.avgPrice)}</td>
                                ${data.displayOptions.showPurchaseValue ? `<td class="text-end">${formatCurrency(item.totalStockValuePurchase)}</td>` : ''}
                                ${data.displayOptions.showSalesValue ? `<td class="text-end">${formatCurrency(item.totalStockValueSales)}</td>` : ''}
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr style="font-weight:bold;">
                            <td colspan="5">Totals</td>
                            <td class="text-end">${formatCurrency(totals.totalStock)}</td>
                            <td class="text-end">${formatCurrency(totals.totalOpeningStock)}</td>
                            <td class="text-end">${formatCurrency(totals.totalQtyIn)}</td>
                            <td class="text-end">${formatCurrency(totals.totalQtyOut)}</td>
                            <td colspan="2"></td>
                            <td></td>
                            <td></td>
                            ${data.displayOptions.showPurchaseValue ? `<td class="text-end">${formatCurrency(totals.totalPurchaseValue)}</td>` : ''}
                            ${data.displayOptions.showSalesValue ? `<td class="text-end">${formatCurrency(totals.totalSalesValue)}</td>` : ''}
                        </tr>
                    </tfoot>
                </table>
                <div class="print-footer">Printed from ${company.currentCompanyName || 'Company Name'} | ${new Date().toLocaleString()}</div>
                <script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; }</script>
            </body>
            </html>
        `;

        printWindow.document.write(printContent);
        printWindow.document.close();
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

    const columnCount = 13 + (data.displayOptions.showPurchaseValue ? 1 : 0) + (data.displayOptions.showSalesValue ? 1 : 0);

    if (initialLoading) return <Loader />;

    return (
        <div className="container-fluid">
            <Header />
            <div className="card mt-2 shadow-lg p-0 expanded-card ledger-card compact">
                <div className="card-header bg-white py-1">
                    <h1 className="h5 mb-0 text-center text-primary">Stock Status</h1>
                </div>
                <div className="card-body p-2 p-md-3">
                    {/* All Controls in One Row */}
                    <div className="row g-2 mb-3">
                        <div className="col-md-2">
                            <div className="position-relative">
                                <input type="text" id="fromDate" name="fromDate" ref={fromDateRef}
                                    className={`form-control form-control-sm no-date-icon ${dateErrors.fromDate ? 'is-invalid' : ''}`}
                                    value={data.fromDate}
                                    onChange={handleDateChange}
                                    onBlur={() => data.fromDate && !validateDate(data.fromDate) && setDateErrors(prev => ({ ...prev, fromDate: 'Invalid date format' }))}
                                    onKeyDown={(e) => handleKeyDown(e, 'toDate')}
                                    placeholder={company.dateFormat === 'nepali' ? "YYYY-MM-DD" : "YYYY-MM-DD"}
                                    autoComplete="off"
                                    autoFocus
                                    style={{ height: '30px', fontSize: '0.8rem', width: '100%', paddingTop: '0.75rem' }} />
                                <label className="position-absolute" style={{ top: '-0.5rem', left: '0.75rem', fontSize: '0.75rem', backgroundColor: 'white', padding: '0 0.25rem', color: '#6c757d', fontWeight: '500' }}>
                                    From Date: <span className="text-danger">*</span>
                                </label>
                                {dateErrors.fromDate && <div className="invalid-feedback d-block" style={{ fontSize: '0.7rem' }}>{dateErrors.fromDate}</div>}
                            </div>
                        </div>
                        <div className="col-md-2">
                            <div className="position-relative">
                                <input type="text" id="toDate" name="toDate" ref={toDateRef}
                                    className={`form-control form-control-sm no-date-icon ${dateErrors.toDate ? 'is-invalid' : ''}`}
                                    value={data.toDate}
                                    onChange={handleDateChange}
                                    onBlur={() => data.toDate && !validateDate(data.toDate) && setDateErrors(prev => ({ ...prev, toDate: 'Invalid date format' }))}
                                    onKeyDown={(e) => handleKeyDown(e, 'generateReport')}
                                    placeholder={company.dateFormat === 'nepali' ? "YYYY-MM-DD" : "YYYY-MM-DD"}
                                    autoComplete="off"
                                    style={{ height: '30px', fontSize: '0.8rem', width: '100%', paddingTop: '0.75rem' }} />
                                <label className="position-absolute" style={{ top: '-0.5rem', left: '0.75rem', fontSize: '0.75rem', backgroundColor: 'white', padding: '0 0.25rem', color: '#6c757d', fontWeight: '500' }}>
                                    To Date: <span className="text-danger">*</span>
                                </label>
                                {dateErrors.toDate && <div className="invalid-feedback d-block" style={{ fontSize: '0.7rem' }}>{dateErrors.toDate}</div>}
                            </div>
                        </div>
                        <div className="col-md-1">
                            <button id="generateReport" ref={generateBtnRef} className="btn btn-primary btn-sm w-100" onClick={handleGenerateReport} disabled={loading} style={{ height: '30px', fontSize: '0.75rem', padding: '0 6px' }}>
                                {loading ? <span className="spinner-border spinner-border-sm" style={{ width: '14px', height: '14px' }} /> : <><i className="fas fa-chart-line me-1"></i>Generate</>}
                            </button>
                        </div>
                        <div className="col-md-2">
                            <div className="input-group input-group-sm">
                                <span className="input-group-text" style={{ height: '30px', padding: '0 8px' }}><i className="fas fa-search small" style={{ fontSize: '11px' }}></i></span>
                                <input type="text" className="form-control form-control-sm" ref={searchInputRef} placeholder="Search item..." value={data.searchQuery}
                                    onChange={handleSearchChange} disabled={!hasGenerated} autoComplete="off"
                                    style={{ height: '30px', fontSize: '0.75rem' }} />
                            </div>
                        </div>
                        <div className="col-md-2">
                            <div className="d-flex align-items-center h-100 gap-2">
                                <div className="form-check form-switch">
                                    <input className="form-check-input" type="checkbox" role="switch" id="showPurchaseValue"
                                        checked={data.displayOptions.showPurchaseValue} onChange={handleCheckboxChange} name="showPurchaseValue"
                                        disabled={!hasGenerated} style={{ marginTop: '2px' }} />
                                    <label className="form-check-label small" htmlFor="showPurchaseValue" style={{ fontSize: '0.75rem' }}>CP Value</label>
                                </div>
                                <div className="form-check form-switch">
                                    <input className="form-check-input" type="checkbox" role="switch" id="showSalesValue"
                                        checked={data.displayOptions.showSalesValue} onChange={handleCheckboxChange} name="showSalesValue"
                                        disabled={!hasGenerated} style={{ marginTop: '2px' }} />
                                    <label className="form-check-label small" htmlFor="showSalesValue" style={{ fontSize: '0.75rem' }}>SP Value</label>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-1">
                            <select className="form-select form-select-sm" value={data.itemsPerPage} onChange={handleItemsPerPageChange}
                                disabled={!hasGenerated} style={{ height: '30px', fontSize: '0.75rem', width: '100%', padding: '0 20px 0 8px' }}>
                                <option value="10">10</option>
                                <option value="25">25</option>
                                <option value="50">50</option>
                                <option value="all">All</option>
                            </select>
                        </div>
                        <div className="col-md-1">
                            <button className="btn btn-outline-success btn-sm w-100" onClick={exportToExcel} 
                                disabled={!hasGenerated || !sortedItems.length || exporting}
                                style={{ height: '30px', fontSize: '0.7rem', padding: '0 4px' }}>
                                <i className="fas fa-file-excel me-1"></i>{exporting ? '...' : 'Excel'}
                            </button>
                        </div>
                        <div className="col-md-1">
                            <button className="btn btn-outline-primary btn-sm w-100" onClick={printStockStatus} 
                                disabled={!hasGenerated || !sortedItems.length}
                                style={{ height: '30px', fontSize: '0.7rem', padding: '0 4px' }}>
                                <i className="fas fa-print me-1"></i>Print
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="alert alert-danger text-center py-1 mb-2 small" style={{ fontSize: '0.75rem' }}>
                            {error}
                            <button type="button" className="btn-close btn-sm ms-2" style={{ fontSize: '10px' }} onClick={() => setError(null)}></button>
                        </div>
                    )}

                    {/* Loading indicator */}
                    {loading && (
                        <div className="text-center py-3">
                            <div className="spinner-border spinner-border-sm text-primary" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                            <p className="mt-2 small text-muted" style={{ fontSize: '0.75rem' }}>Loading stock data...</p>
                        </div>
                    )}

                    {/* Table */}
                    {hasGenerated && !loading && (
                        <>
                            {sortedItems.length === 0 ? (
                                <div className="alert alert-info text-center py-3" style={{ fontSize: '0.8rem' }}>
                                    <i className="fas fa-info-circle me-2"></i>
                                    {data.searchQuery ? 'No items match your search criteria' : 'No stock items found for the selected date range'}
                                </div>
                            ) : (
                                <>
                                    <div className="table-responsive" style={{ maxHeight: '450px', overflow: 'auto' }}>
                                        <table className="table table-sm table-hover mb-0" style={{ fontSize: '0.75rem' }}>
                                            <thead className="table-light" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                                                <tr>
                                                    <th style={{ padding: '6px 8px', textAlign: 'center', width: '40px' }}>#</th>
                                                    <th className="sortable" onClick={() => sortItems('code')} style={{ cursor: 'pointer', padding: '6px 8px', width: '80px' }}>
                                                        Code {data.sortConfig.key === 'code' && (data.sortConfig.direction === 'ascending' ? '↑' : '↓')}
                                                    </th>
                                                    <th className="sortable" onClick={() => sortItems('name')} style={{ cursor: 'pointer', padding: '6px 8px' }}>
                                                        Item Name {data.sortConfig.key === 'name' && (data.sortConfig.direction === 'ascending' ? '↑' : '↓')}
                                                    </th>
                                                    <th className="sortable" onClick={() => sortItems('category')} style={{ cursor: 'pointer', padding: '6px 8px' }}>
                                                        Category {data.sortConfig.key === 'category' && (data.sortConfig.direction === 'ascending' ? '↑' : '↓')}
                                                    </th>
                                                    <th className="sortable" onClick={() => sortItems('unit')} style={{ cursor: 'pointer', padding: '6px 8px' }}>
                                                        Unit {data.sortConfig.key === 'unit' && (data.sortConfig.direction === 'ascending' ? '↑' : '↓')}
                                                    </th>
                                                    <th className="text-end sortable" onClick={() => sortItems('stock')} style={{ cursor: 'pointer', padding: '6px 8px' }}>
                                                        Stock {data.sortConfig.key === 'stock' && (data.sortConfig.direction === 'ascending' ? '↑' : '↓')}
                                                    </th>
                                                    <th className="text-end sortable" onClick={() => sortItems('openingStock')} style={{ cursor: 'pointer', padding: '6px 8px' }}>
                                                        Op. Stock {data.sortConfig.key === 'openingStock' && (data.sortConfig.direction === 'ascending' ? '↑' : '↓')}
                                                    </th>
                                                    <th className="text-end sortable" onClick={() => sortItems('totalQtyIn')} style={{ cursor: 'pointer', padding: '6px 8px' }}>
                                                        Qty. In {data.sortConfig.key === 'totalQtyIn' && (data.sortConfig.direction === 'ascending' ? '↑' : '↓')}
                                                    </th>
                                                    <th className="text-end sortable" onClick={() => sortItems('totalQtyOut')} style={{ cursor: 'pointer', padding: '6px 8px' }}>
                                                        Qty. Out {data.sortConfig.key === 'totalQtyOut' && (data.sortConfig.direction === 'ascending' ? '↑' : '↓')}
                                                    </th>
                                                    <th className="text-end sortable" onClick={() => sortItems('minStock')} style={{ cursor: 'pointer', padding: '6px 8px' }}>
                                                        Min {data.sortConfig.key === 'minStock' && (data.sortConfig.direction === 'ascending' ? '↑' : '↓')}
                                                    </th>
                                                    <th className="text-end sortable" onClick={() => sortItems('maxStock')} style={{ cursor: 'pointer', padding: '6px 8px' }}>
                                                        Max {data.sortConfig.key === 'maxStock' && (data.sortConfig.direction === 'ascending' ? '↑' : '↓')}
                                                    </th>
                                                    <th className="text-end sortable" onClick={() => sortItems('avgPuPrice')} style={{ cursor: 'pointer', padding: '6px 8px' }}>
                                                        C.P {data.sortConfig.key === 'avgPuPrice' && (data.sortConfig.direction === 'ascending' ? '↑' : '↓')}
                                                    </th>
                                                    <th className="text-end sortable" onClick={() => sortItems('avgPrice')} style={{ cursor: 'pointer', padding: '6px 8px' }}>
                                                        S.P {data.sortConfig.key === 'avgPrice' && (data.sortConfig.direction === 'ascending' ? '↑' : '↓')}
                                                    </th>
                                                    {data.displayOptions.showPurchaseValue && (
                                                        <th className="text-end sortable" onClick={() => sortItems('totalStockValuePurchase')} style={{ cursor: 'pointer', padding: '6px 8px' }}>
                                                            Val (CP) {data.sortConfig.key === 'totalStockValuePurchase' && (data.sortConfig.direction === 'ascending' ? '↑' : '↓')}
                                                        </th>
                                                    )}
                                                    {data.displayOptions.showSalesValue && (
                                                        <th className="text-end sortable" onClick={() => sortItems('totalStockValueSales')} style={{ cursor: 'pointer', padding: '6px 8px' }}>
                                                            Val (SP) {data.sortConfig.key === 'totalStockValueSales' && (data.sortConfig.direction === 'ascending' ? '↑' : '↓')}
                                                        </th>
                                                    )}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {sortedItems.map((item, index) => (
                                                    <tr key={item.id}>
                                                        <td style={{ padding: '4px 6px', textAlign: 'center' }}>{index + 1}</td>
                                                        <td style={{ padding: '4px 6px' }}>{item.code}</td>
                                                        <td style={{ padding: '4px 6px' }}>
                                                            <div className="d-flex align-items-center">
                                                                {item.stock <= (item.minStock || 0) ? (
                                                                    <span className="badge bg-danger me-1" style={{ fontSize: '0.65rem', padding: '2px 4px' }}>LOW</span>
                                                                ) : item.stock >= (item.maxStock || Infinity) ? (
                                                                    <span className="badge bg-warning me-1" style={{ fontSize: '0.65rem', padding: '2px 4px' }}>HIGH</span>
                                                                ) : null}
                                                                <span className="text-truncate" style={{ maxWidth: '150px' }}>{item.name}</span>
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '4px 6px' }}>{item.category || '-'}</td>
                                                        <td style={{ padding: '4px 6px' }}>{item.unit || '-'}</td>
                                                        <td className="text-end" style={{ padding: '4px 6px' }}>{formatCurrency(item.stock)}</td>
                                                        <td className="text-end" style={{ padding: '4px 6px' }}>{formatCurrency(item.openingStock)}</td>
                                                        <td className="text-end" style={{ padding: '4px 6px' }}>{formatCurrency(item.totalQtyIn)}</td>
                                                        <td className="text-end" style={{ padding: '4px 6px' }}>{formatCurrency(item.totalQtyOut)}</td>
                                                        <td className="text-end" style={{ padding: '4px 6px' }}>{item.minStock || '-'}</td>
                                                        <td className="text-end" style={{ padding: '4px 6px' }}>{item.maxStock || '-'}</td>
                                                        <td className="text-end" style={{ padding: '4px 6px' }}>{formatCurrency(item.avgPuPrice)}</td>
                                                        <td className="text-end" style={{ padding: '4px 6px' }}>{formatCurrency(item.avgPrice)}</td>
                                                        {data.displayOptions.showPurchaseValue && (
                                                            <td className="text-end fw-bold" style={{ padding: '4px 6px' }}>{formatCurrency(item.totalStockValuePurchase)}</td>
                                                        )}
                                                        {data.displayOptions.showSalesValue && (
                                                            <td className="text-end fw-bold" style={{ padding: '4px 6px' }}>{formatCurrency(item.totalStockValueSales)}</td>
                                                        )}
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot className="table-group-divider">
                                                <tr className="fw-bold table-secondary">
                                                    <td colSpan="5" style={{ padding: '6px 8px' }}>Page Total</td>
                                                    <td className="text-end" style={{ padding: '6px 8px' }}>{formatCurrency(totals.totalStock)}</td>
                                                    <td className="text-end" style={{ padding: '6px 8px' }}>{formatCurrency(totals.totalOpeningStock)}</td>
                                                    <td className="text-end" style={{ padding: '6px 8px' }}>{formatCurrency(totals.totalQtyIn)}</td>
                                                    <td className="text-end" style={{ padding: '6px 8px' }}>{formatCurrency(totals.totalQtyOut)}</td>
                                                    <td colSpan="2"></td>
                                                    <td></td>
                                                    <td></td>
                                                    {data.displayOptions.showPurchaseValue && (
                                                        <td className="text-end" style={{ padding: '6px 8px' }}>{formatCurrency(totals.totalPurchaseValue)}</td>
                                                    )}
                                                    {data.displayOptions.showSalesValue && (
                                                        <td className="text-end" style={{ padding: '6px 8px' }}>{formatCurrency(totals.totalSalesValue)}</td>
                                                    )}
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>

                                    {/* Pagination */}
                                    {data.pagination && data.pagination.pages > 1 && (
                                        <div className="row mt-2">
                                            <div className="col-12">
                                                <nav>
                                                    <ul className="pagination justify-content-center pagination-sm" style={{ marginBottom: '0' }}>
                                                        <li className={`page-item ${data.currentPage === 1 ? 'disabled' : ''}`}>
                                                            <button className="page-link" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => handlePageChange(data.currentPage - 1)}>
                                                                Previous
                                                            </button>
                                                        </li>
                                                        {Array.from({ length: Math.min(5, data.pagination.pages) }, (_, i) => {
                                                            let pageNum;
                                                            if (data.pagination.pages <= 5) {
                                                                pageNum = i + 1;
                                                            } else if (data.currentPage <= 3) {
                                                                pageNum = i + 1;
                                                            } else if (data.currentPage >= data.pagination.pages - 2) {
                                                                pageNum = data.pagination.pages - 4 + i;
                                                            } else {
                                                                pageNum = data.currentPage - 2 + i;
                                                            }
                                                            return (
                                                                <li key={pageNum} className={`page-item ${data.currentPage === pageNum ? 'active' : ''}`}>
                                                                    <button className="page-link" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => handlePageChange(pageNum)}>
                                                                        {pageNum}
                                                                    </button>
                                                                </li>
                                                            );
                                                        })}
                                                        <li className={`page-item ${data.currentPage === data.pagination.pages ? 'disabled' : ''}`}>
                                                            <button className="page-link" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => handlePageChange(data.currentPage + 1)}>
                                                                Next
                                                            </button>
                                                        </li>
                                                    </ul>
                                                </nav>
                                                <div className="text-center text-muted small" style={{ fontSize: '0.7rem' }}>
                                                    Showing {((data.currentPage - 1) * (data.itemsPerPage === 'all' ? sortedItems.length : data.itemsPerPage)) + 1} to {Math.min(data.currentPage * (data.itemsPerPage === 'all' ? sortedItems.length : data.itemsPerPage), data.pagination.total)} of {data.pagination.total} items
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}

                    {!hasGenerated && !loading && !initialLoading && (
                        <div className="alert alert-info text-center py-3" style={{ fontSize: '0.8rem' }}>
                            <i className="fas fa-info-circle me-2"></i>
                            Please select a date range and click "Generate" to view stock status.
                        </div>
                    )}
                </div>
            </div>

            {showProductModal && (
                <ProductModal onClose={() => setShowProductModal(false)} />
            )}

            <NotificationToast show={notification.show} message={notification.message} type={notification.type} duration={notification.duration} onClose={() => setNotification({ ...notification, show: false })} />
        </div>
    );
};

export default StockStatus;