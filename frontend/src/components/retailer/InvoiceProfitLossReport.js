import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import NepaliDate from 'nepali-date-converter';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { usePageNotRefreshContext } from './PageNotRefreshContext';
import Loader from '../Loader';
import Header from './Header';
import ProductModal from './dashboard/modals/ProductModal';

const InvoiceWiseProfitLossReport = () => {
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

    const { draftSave, setDraftSave } = usePageNotRefreshContext();
    const [showProductModal, setShowProductModal] = useState(false);

    const [company, setCompany] = useState({
        dateFormat: 'english',
        vatEnabled: true,
        fiscalYear: {}
    });

    const [data, setData] = useState(() => {
        if (draftSave && draftSave.profitLossData) {
            return draftSave.profitLossData;
        }
        return {
            company: null,
            currentFiscalYear: null,
            results: [],
            fromDate: '',
            toDate: '',
            billNumber: '',
            currentCompanyName: '',
            companyDateFormat: 'english',
            summary: {
                totalProfit: 0,
                totalSales: 0,
                totalCost: 0,
                totalInvoices: 0
            }
        };
    });

    const [searchQuery, setSearchQuery] = useState(() => {
        if (draftSave && draftSave.profitLossSearch) {
            return draftSave.profitLossSearch.searchQuery || '';
        }
        return '';
    });

    const [selectedRowIndex, setSelectedRowIndex] = useState(() => {
        if (draftSave && draftSave.profitLossSearch) {
            return draftSave.profitLossSearch.selectedRowIndex || 0;
        }
        return 0;
    });

    // Column resizing state
    const [columnWidths, setColumnWidths] = useState({
        date: 90,
        invNo: 100,
        account: 180,
        cost: 100,
        sales: 100,
        cpPercentage: 80,
        spPercentage: 80,
        profit: 100,
        actions: 80
    });

    const [isResizing, setIsResizing] = useState(false);
    const [resizingColumn, setResizingColumn] = useState(null);
    const [startX, setStartX] = useState(0);
    const [startWidth, setStartWidth] = useState(0);

    // Expanded rows state for item details
    const [expandedRows, setExpandedRows] = useState({});

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [filteredResults, setFilteredResults] = useState([]);

    const fromDateRef = useRef(null);
    const toDateRef = useRef(null);
    const billNumberRef = useRef(null);
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

    // Fetch initial data - using existing endpoint that returns company info
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const response = await api.get('/api/retailer/invoice-wise-profit-loss');
                
                if (response.data.success) {
                    const responseData = response.data.data;
                    const dateFormat = responseData.companyDateFormat?.toLowerCase() || 'english';
                    
                    setCompany({
                        dateFormat: dateFormat,
                        vatEnabled: responseData.company?.vatEnabled || true,
                        fiscalYear: responseData.currentFiscalYear || {}
                    });

                    const isNepaliFormat = dateFormat === 'nepali';
                    const currentFiscalYear = responseData.currentFiscalYear;
                    
                    if (currentFiscalYear) {
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
                            toDate: toDateFormatted,
                            company: responseData.company,
                            currentFiscalYear: currentFiscalYear,
                            currentCompanyName: responseData.currentCompanyName || '',
                            companyDateFormat: dateFormat
                        }));
                    }
                }
            } catch (err) {
                console.error('Error fetching initial data:', err);
                setData(prev => ({
                    ...prev,
                    fromDate: currentEnglishDate,
                    toDate: currentEnglishDate
                }));
                setNotification({
                    show: true,
                    message: 'Error loading company data, using default dates',
                    type: 'warning'
                });
            }
        };

        fetchInitialData();
    }, []);

    // Save data to draft context
    useEffect(() => {
        setDraftSave({
            ...draftSave,
            profitLossData: data,
            profitLossSearch: {
                searchQuery,
                selectedRowIndex,
                fromDate: data.fromDate,
                toDate: data.toDate,
                billNumber: data.billNumber
            }
        });
    }, [data, searchQuery, selectedRowIndex]);

    // Save/load column widths
    useEffect(() => {
        const savedWidths = localStorage.getItem('profitLossTableColumnWidths');
        if (savedWidths) {
            try {
                setColumnWidths(JSON.parse(savedWidths));
            } catch (e) {
                console.error('Failed to load column widths:', e);
            }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('profitLossTableColumnWidths', JSON.stringify(columnWidths));
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
                if (data.billNumber) params.append('billNumber', data.billNumber);

                const response = await api.get(`/api/retailer/invoice-wise-profit-loss?${params.toString()}`);

                if (response.data.success) {
                    const responseData = response.data.data;
                    setData(prev => ({
                        ...prev,
                        results: responseData.results || [],
                        summary: responseData.summary || {
                            totalProfit: 0,
                            totalSales: 0,
                            totalCost: 0,
                            totalInvoices: 0
                        },
                        company: responseData.company || prev.company,
                        currentFiscalYear: responseData.currentFiscalYear || prev.currentFiscalYear,
                        currentCompanyName: responseData.currentCompanyName || prev.currentCompanyName,
                        companyDateFormat: responseData.companyDateFormat || prev.companyDateFormat
                    }));
                    setExpandedRows({});
                    setError(null);
                } else {
                    setError(response.data.error || 'Failed to fetch profit/loss data');
                }

                if (!draftSave?.profitLossSearch?.selectedRowIndex) {
                    setSelectedRowIndex(0);
                }
            } catch (err) {
                console.error('Fetch error:', err);
                setError(err.response?.data?.error || 'Failed to fetch profit/loss data');
            } finally {
                setLoading(false);
                setShouldFetch(false);
            }
        };

        fetchData();
    }, [shouldFetch, data.fromDate, data.toDate, data.billNumber]);

    // Filter results based on search query
    useEffect(() => {
        const filtered = data.results.filter(bill => {
            const matchesSearch =
                bill.billNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                bill.accountName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                bill.cashAccount?.toLowerCase().includes(searchQuery.toLowerCase());

            return matchesSearch;
        });

        setFilteredResults(filtered);

        if (!draftSave?.profitLossSearch?.selectedRowIndex) {
            setSelectedRowIndex(0);
        }
    }, [data.results, searchQuery]);

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

    // Calculate totals from filtered results
    const totals = useMemo(() => {
        if (filteredResults.length === 0) {
            return { totalCost: 0, totalSales: 0, totalProfit: 0, cpPercentage: 0, spPercentage: 0 };
        }

        const totalCost = filteredResults.reduce((sum, bill) => sum + (bill.totalCost || 0), 0);
        const totalSales = filteredResults.reduce((sum, bill) => sum + (bill.totalSales || 0), 0);
        const totalProfit = filteredResults.reduce((sum, bill) => sum + (bill.totalProfit || 0), 0);
        const cpPercentage = totalCost !== 0 ? (totalProfit / totalCost) * 100 : 0;
        const spPercentage = totalSales !== 0 ? (totalProfit / totalSales) * 100 : 0;

        return { totalCost, totalSales, totalProfit, cpPercentage, spPercentage };
    }, [filteredResults]);

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (filteredResults.length === 0) return;

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
                    setSelectedRowIndex(prev => Math.min(filteredResults.length - 1, prev + 1));
                    break;
                case 'Enter':
                    if (selectedRowIndex >= 0 && selectedRowIndex < filteredResults.length) {
                        const bill = filteredResults[selectedRowIndex];
                        toggleRowExpansion(bill.id);
                    }
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [filteredResults, selectedRowIndex]);

    const toggleRowExpansion = (id) => {
        setExpandedRows(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const handleDateChange = (e) => {
        const { name, value } = e.target;
        const sanitizedValue = value.replace(/[^0-9/-]/g, '');
        if (sanitizedValue.length <= 10) {
            setData(prev => ({ ...prev, [name]: sanitizedValue }));
            setDateErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleBillNumberChange = (e) => {
        setData(prev => ({ ...prev, billNumber: e.target.value }));
    };

    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value);
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

    const handleReset = () => {
        const isNepaliFormat = company.dateFormat === 'nepali';
        let fromDateFormatted = '';
        let toDateFormatted = '';

        if (isNepaliFormat) {
            fromDateFormatted = data.currentFiscalYear?.startDateNepali || currentNepaliDate;
            toDateFormatted = currentNepaliDate;
        } else {
            fromDateFormatted = data.currentFiscalYear?.startDate
                ? new Date(data.currentFiscalYear.startDate).toISOString().split('T')[0]
                : currentEnglishDate;
            toDateFormatted = data.currentFiscalYear?.endDate
                ? new Date(data.currentFiscalYear.endDate).toISOString().split('T')[0]
                : currentEnglishDate;
        }

        setData(prev => ({
            ...prev,
            fromDate: fromDateFormatted,
            toDate: toDateFormatted,
            billNumber: ''
        }));
        setSearchQuery('');
        setError(null);
        setExpandedRows({});
    };

    const formatDate = useCallback((dateString) => {
        if (!dateString) return '';
        try {
            if (company.dateFormat === 'nepali') {
                return new NepaliDate(dateString).format('YYYY-MM-DD');
            }
            return new Date(dateString).toISOString().split('T')[0];
        } catch (error) {
            return dateString;
        }
    }, [company.dateFormat]);

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

    const formatPercentage = useCallback((value, total) => {
        if (!total || total === 0) return '0.00';
        return ((value / total) * 100).toFixed(2);
    }, []);

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

    const handlePrint = () => {
        if (filteredResults.length === 0) {
            alert("No data to print");
            return;
        }

        const printWindow = window.open("", "_blank");
        const printHeader = `
        <div class="print-header">
            <h1>${data.currentCompanyName || 'Company Name'}</h1>
            <p>
                ${data.company?.address || ''}${data.company?.city ? ', ' + data.company.city : ''},
                PAN: ${data.company?.pan || ''}<br>
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
            .text-end {
                text-align: right;
            }
            .profit-positive {
                color: green;
            }
            .profit-negative {
                color: red;
            }
        </style>
        ${printHeader}
        <h2 style="text-align:center;text-decoration:underline;">Invoice Wise Profit/Loss Report</h2>
        <p style="text-align:center;"><strong>From Date:</strong> ${data.fromDate} | <strong>To Date:</strong> ${data.toDate}</p>
        <table>
            <thead>
                <tr>
                    <th>S.N</th>
                    <th>Date</th>
                    <th>Inv No.</th>
                    <th>Account</th>
                    <th class="text-end">Cost</th>
                    <th class="text-end">Sales</th>
                    <th class="text-end">C.P(%)</th>
                    <th class="text-end">S.P(%)</th>
                    <th class="text-end">Profit</th>
                </tr>
            </thead>
            <tbody>
        `;

        filteredResults.forEach((bill, index) => {
            tableContent += `
            <tr>
                <td class="text-center">${index + 1}</td>
                <td class="nowrap">${formatDate(bill.date)}</td>
                <td class="nowrap">${bill.billNumber || ''}</td>
                <td>${bill.accountName || bill.cashAccount || 'N/A'}</td>
                <td class="text-end">${formatCurrency(bill.totalCost)}</td>
                <td class="text-end">${formatCurrency(bill.totalSales)}</td>
                <td class="text-end">${formatPercentage(bill.totalProfit, bill.totalCost)}</td>
                <td class="text-end">${formatPercentage(bill.totalProfit, bill.totalSales)}</td>
                <td class="text-end ${bill.totalProfit >= 0 ? 'profit-positive' : 'profit-negative'}">
                    ${formatCurrency(bill.totalProfit)}
                </td>
            </tr>
            `;
        });

        tableContent += `
            <tr style="font-weight:bold; border-top: 2px solid #000;">
                <td colspan="4">Grand Total</td>
                <td class="text-end">${formatCurrency(totals.totalCost)}</td>
                <td class="text-end">${formatCurrency(totals.totalSales)}</td>
                <td class="text-end">${formatPercentage(totals.totalProfit, totals.totalCost)}</td>
                <td class="text-end">${formatPercentage(totals.totalProfit, totals.totalSales)}</td>
                <td class="text-end ${totals.totalProfit >= 0 ? 'profit-positive' : 'profit-negative'}">
                    ${formatCurrency(totals.totalProfit)}
                </td>
            </tr>
            </tbody>
        </table>
        `;

        printWindow.document.write(`
        <html>
            <head>
                <title>Invoice Wise Profit/Loss Report</title>
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

    // Reset column widths
    const resetColumnWidths = () => {
        setColumnWidths({
            date: 90,
            invNo: 100,
            account: 180,
            cost: 100,
            sales: 100,
            cpPercentage: 80,
            spPercentage: 80,
            profit: 100,
            actions: 80
        });
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
        const totalWidth = columnWidths.date + columnWidths.invNo + columnWidths.account +
            columnWidths.cost + columnWidths.sales + columnWidths.cpPercentage +
            columnWidths.spPercentage + columnWidths.profit + columnWidths.actions;

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
                <div className="d-flex align-items-center px-1 border-end position-relative" style={{ width: `${columnWidths.invNo}px`, flexShrink: 0, minWidth: '60px' }}>
                    <strong style={{ fontSize: '0.75rem' }}>Inv No.</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.invNo - 3} columnName="invNo" />
                </div>
                <div className="d-flex align-items-center px-1 border-end position-relative" style={{ width: `${columnWidths.account}px`, flexShrink: 0, minWidth: '100px' }}>
                    <strong style={{ fontSize: '0.75rem' }}>Account</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.account - 3} columnName="account" />
                </div>
                <div className="d-flex align-items-center justify-content-end px-1 border-end position-relative" style={{ width: `${columnWidths.cost}px`, flexShrink: 0, minWidth: '80px' }}>
                    <strong style={{ fontSize: '0.75rem' }}>Cost</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.cost - 2} columnName="cost" />
                </div>
                <div className="d-flex align-items-center justify-content-end px-1 border-end position-relative" style={{ width: `${columnWidths.sales}px`, flexShrink: 0, minWidth: '80px' }}>
                    <strong style={{ fontSize: '0.75rem' }}>Sales</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.sales - 2} columnName="sales" />
                </div>
                <div className="d-flex align-items-center justify-content-end px-1 border-end position-relative" style={{ width: `${columnWidths.cpPercentage}px`, flexShrink: 0, minWidth: '70px' }}>
                    <strong style={{ fontSize: '0.75rem' }}>C.P(%)</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.cpPercentage - 2} columnName="cpPercentage" />
                </div>
                <div className="d-flex align-items-center justify-content-end px-1 border-end position-relative" style={{ width: `${columnWidths.spPercentage}px`, flexShrink: 0, minWidth: '70px' }}>
                    <strong style={{ fontSize: '0.75rem' }}>S.P(%)</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.spPercentage - 2} columnName="spPercentage" />
                </div>
                <div className="d-flex align-items-center justify-content-end px-1 border-end position-relative" style={{ width: `${columnWidths.profit}px`, flexShrink: 0, minWidth: '90px' }}>
                    <strong style={{ fontSize: '0.75rem' }}>Profit</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.profit - 2} columnName="profit" />
                </div>
                <div className="d-flex align-items-center justify-content-center px-1 position-relative" style={{ width: `${columnWidths.actions}px`, flexShrink: 0, minWidth: '70px' }}>
                    <strong style={{ fontSize: '0.75rem' }}>Actions</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.actions - 2} columnName="actions" />
                </div>

                {isResizing && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, cursor: 'col-resize' }} />
                )}
            </div>
        );
    });

    // Modal for Item Details - Using a modal instead of expanding rows
    const [showItemModal, setShowItemModal] = useState(false);
    const [selectedBill, setSelectedBill] = useState(null);

    const handleViewItems = (bill) => {
        setSelectedBill(bill);
        setShowItemModal(true);
    };

    // Table Row Component - Now using modal instead of inline expansion
    const TableRow = React.memo(({ index, style, data: rowData }) => {
        const { bills, selectedRowIndex, formatCurrency, formatDate, formatPercentage, handleRowClick, onViewItems } = rowData;
        const bill = bills[index];

        if (!bill) return null;

        const isSelected = selectedRowIndex === index;

        const getProfitClass = (profit) => {
            if (profit > 0) return 'text-success';
            if (profit < 0) return 'text-danger';
            return '';
        };

        const getProfitIcon = (profit) => {
            if (profit > 0) return <i className="fas fa-caret-up text-success ms-1"></i>;
            if (profit < 0) return <i className="fas fa-caret-down text-danger ms-1"></i>;
            return null;
        };

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
                    <span style={{ fontSize: '0.75rem' }}>{formatDate(bill.date)}</span>
                </div>
                <div className="d-flex align-items-center px-1 border-end" style={{ width: `${columnWidths.invNo}px`, flexShrink: 0, height: '100%', overflow: 'hidden' }}>
                    <span style={{ fontSize: '0.75rem' }}>{bill.billNumber || ''}</span>
                </div>
                <div className="d-flex align-items-center px-1 border-end" style={{ width: `${columnWidths.account}px`, flexShrink: 0, height: '100%', overflow: 'hidden' }} title={bill.accountName || bill.cashAccount || 'N/A'}>
                    <span style={{ fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {bill.accountName || bill.cashAccount || 'N/A'}
                    </span>
                </div>
                <div className="d-flex align-items-center justify-content-end px-1 border-end" style={{ width: `${columnWidths.cost}px`, flexShrink: 0, height: '100%' }}>
                    <span style={{ fontSize: '0.75rem' }}>{formatCurrency(bill.totalCost)}</span>
                </div>
                <div className="d-flex align-items-center justify-content-end px-1 border-end" style={{ width: `${columnWidths.sales}px`, flexShrink: 0, height: '100%' }}>
                    <span style={{ fontSize: '0.75rem' }}>{formatCurrency(bill.totalSales)}</span>
                </div>
                <div className="d-flex align-items-center justify-content-end px-1 border-end" style={{ width: `${columnWidths.cpPercentage}px`, flexShrink: 0, height: '100%' }}>
                    <span style={{ fontSize: '0.75rem' }}>{formatPercentage(bill.totalProfit, bill.totalCost)}</span>
                </div>
                <div className="d-flex align-items-center justify-content-end px-1 border-end" style={{ width: `${columnWidths.spPercentage}px`, flexShrink: 0, height: '100%' }}>
                    <span style={{ fontSize: '0.75rem' }}>{formatPercentage(bill.totalProfit, bill.totalSales)}</span>
                </div>
                <div className={`d-flex align-items-center justify-content-end px-1 border-end ${getProfitClass(bill.totalProfit)}`} style={{ width: `${columnWidths.profit}px`, flexShrink: 0, height: '100%' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>
                        {formatCurrency(bill.totalProfit)}
                        {getProfitIcon(bill.totalProfit)}
                    </span>
                </div>
                <div className="d-flex align-items-center justify-content-center px-1 gap-1" style={{ width: `${columnWidths.actions}px`, flexShrink: 0, height: '100%' }}>
                    {bill.items && bill.items.length > 0 && (
                        <button
                            className="btn btn-sm btn-info py-0 px-1 d-flex align-items-center"
                            onClick={(e) => { e.stopPropagation(); onViewItems(bill); }}
                            style={{ height: '20px', fontSize: '0.7rem', fontWeight: 'bold' }}
                            title="View Items"
                        >
                            <i className="fas fa-eye me-1" style={{ fontSize: '0.6rem' }}></i>View
                        </button>
                    )}
                </div>
            </div>
        );
    }, (prevProps, nextProps) => {
        if (prevProps.index !== nextProps.index) return false;
        if (prevProps.style !== nextProps.style) return false;
        
        const prevBill = prevProps.data.bills[prevProps.index];
        const nextBill = nextProps.data.bills[nextProps.index];
        
        return shallowEqual(prevBill, nextBill) && 
               prevProps.data.selectedRowIndex === nextProps.data.selectedRowIndex;
    });

    if (loading && !data.results.length) return <Loader />;

    return (
        <div className="container-fluid">
            <Header />
            <div className="card mt-2 shadow-lg p-0 animate__animated animate__fadeInUp expanded-card ledger-card compact">
                <div className="card-header bg-white py-0">
                    <h1 className="h4 mb-0 text-center text-primary">Invoice Wise Profit/Loss Report</h1>
                </div>

                <div className="card-body p-2 p-md-3">
                    {/* Filter Row */}
                    <div className="row g-2 mb-3">
                        <div className="col-12 col-md-2">
                            <div className="position-relative">
                                <input
                                    type="text"
                                    name="fromDate"
                                    id="fromDate"
                                    ref={fromDateRef}
                                    className={`form-control form-control-sm no-date-icon ${dateErrors.fromDate ? 'is-invalid' : ''}`}
                                    value={data.fromDate}
                                    onChange={handleDateChange}
                                    onKeyDown={(e) => {
                                        const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
                                            'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
                                        if (!allowedKeys.includes(e.key) && !/^\d$/.test(e.key) && e.key !== '/' && e.key !== '-' && !e.ctrlKey && !e.metaKey) {
                                            e.preventDefault();
                                        }
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            if (dateErrors.fromDate) {
                                                e.target.focus();
                                            } else {
                                                document.getElementById('toDate')?.focus();
                                            }
                                        }
                                    }}
                                    onBlur={(e) => {
                                        const dateStr = e.target.value.trim();
                                        if (!dateStr) {
                                            setDateErrors(prev => ({ ...prev, fromDate: '' }));
                                            return;
                                        }
                                    }}
                                    placeholder={company.dateFormat === 'nepali' ? "YYYY-MM-DD" : "YYYY-MM-DD"}
                                    required
                                    autoComplete="off"
                                    style={{ height: '26px', fontSize: '0.875rem', paddingTop: '0.75rem', width: '100%' }}
                                />
                                <label className="position-absolute" style={{ top: '-0.5rem', left: '0.75rem', fontSize: '0.75rem', backgroundColor: 'white', padding: '0 0.25rem', color: '#6c757d', fontWeight: '500' }}>
                                    From Date: <span className="text-danger">*</span>
                                </label>
                            </div>
                        </div>

                        <div className="col-12 col-md-2">
                            <div className="position-relative">
                                <input
                                    type="text"
                                    name="toDate"
                                    id="toDate"
                                    ref={toDateRef}
                                    className={`form-control form-control-sm no-date-icon ${dateErrors.toDate ? 'is-invalid' : ''}`}
                                    value={data.toDate}
                                    onChange={handleDateChange}
                                    onKeyDown={(e) => {
                                        const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
                                            'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
                                        if (!allowedKeys.includes(e.key) && !/^\d$/.test(e.key) && e.key !== '/' && e.key !== '-' && !e.ctrlKey && !e.metaKey) {
                                            e.preventDefault();
                                        }
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            if (dateErrors.toDate) {
                                                e.target.focus();
                                            } else {
                                                document.getElementById('billNumber')?.focus();
                                            }
                                        }
                                    }}
                                    onBlur={(e) => {}}
                                    placeholder={company.dateFormat === 'nepali' ? "YYYY-MM-DD" : "YYYY-MM-DD"}
                                    required
                                    autoComplete="off"
                                    style={{ height: '26px', fontSize: '0.875rem', paddingTop: '0.75rem', width: '100%' }}
                                />
                                <label className="position-absolute" style={{ top: '-0.5rem', left: '0.75rem', fontSize: '0.75rem', backgroundColor: 'white', padding: '0 0.25rem', color: '#6c757d', fontWeight: '500' }}>
                                    To Date: <span className="text-danger">*</span>
                                </label>
                            </div>
                        </div>

                        <div className="col-12 col-md-2">
                            <div className="position-relative">
                                <input
                                    type="text"
                                    name="billNumber"
                                    id="billNumber"
                                    ref={billNumberRef}
                                    className="form-control form-control-sm"
                                    value={data.billNumber}
                                    onChange={handleBillNumberChange}
                                    onKeyDown={(e) => handleKeyDown(e, 'generateReport')}
                                    placeholder="Bill Number"
                                    autoComplete="off"
                                    style={{ height: '26px', fontSize: '0.875rem', paddingTop: '0.75rem', width: '100%' }}
                                />
                                <label className="position-absolute" style={{ top: '-0.5rem', left: '0.75rem', fontSize: '0.75rem', backgroundColor: 'white', padding: '0 0.25rem', color: '#6c757d', fontWeight: '500' }}>
                                    Bill No.
                                </label>
                            </div>
                        </div>

                        <div className="col-12 col-md-1">
                            <button
                                type="button"
                                id="generateReport"
                                ref={generateReportRef}
                                className="btn btn-primary btn-sm w-100"
                                onClick={handleGenerateReport}
                                style={{ height: '30px', fontSize: '0.8rem', padding: '0 6px', fontWeight: '500' }}
                            >
                                <i className="fas fa-chart-line me-1"></i>Generate
                            </button>
                        </div>

                        <div className="col-12 col-md-1">
                            <button
                                type="button"
                                className="btn btn-secondary btn-sm w-100"
                                onClick={handleReset}
                                style={{ height: '30px', fontSize: '0.8rem', padding: '0 6px', fontWeight: '500' }}
                            >
                                <i className="fas fa-sync me-1"></i>Reset
                            </button>
                        </div>

                        <div className="col-12 col-md-2">
                            <div className="position-relative">
                                <div className="input-group input-group-sm">
                                    <input
                                        type="text"
                                        className="form-control form-control-sm"
                                        id="searchInput"
                                        ref={searchInputRef}
                                        placeholder="Search..."
                                        value={searchQuery}
                                        onChange={handleSearchChange}
                                        disabled={data.results.length === 0}
                                        autoComplete="off"
                                        style={{ height: '26px', fontSize: '0.875rem', paddingTop: '0.75rem', width: '100%' }}
                                    />
                                </div>
                                <label className="position-absolute" style={{ top: '-0.5rem', left: '0.75rem', fontSize: '0.75rem', backgroundColor: 'white', padding: '0 0.25rem', color: '#6c757d', fontWeight: '500' }}>
                                    Search
                                </label>
                            </div>
                        </div>

                        <div className="col-12 col-md-auto d-flex align-items-end justify-content-end gap-2">
                            <button
                                className="btn btn-secondary btn-sm d-flex align-items-center"
                                onClick={handlePrint}
                                disabled={data.results.length === 0}
                                style={{ height: '30px', padding: '0 12px', fontSize: '0.8rem', fontWeight: '500', whiteSpace: 'nowrap' }}
                            >
                                <i className="fas fa-print me-1"></i>Print
                            </button>
                            <button
                                className="btn btn-secondary btn-sm d-flex align-items-center"
                                onClick={resetColumnWidths}
                                title="Reset column widths"
                                style={{ height: '30px', padding: '0 12px', fontSize: '0.8rem', fontWeight: '500' }}
                            >
                                <i className="fas fa-redo me-1" style={{ fontSize: '0.6rem' }}></i>Reset
                            </button>
                        </div>
                    </div>

                    {/* Results Table */}
                    {data.results.length === 0 && !shouldFetch ? (
                        <div className="alert alert-info text-center py-3" style={{ fontSize: '0.875rem' }}>
                            <i className="fas fa-info-circle me-2"></i>
                            Please select date range and click "Generate" to view data
                        </div>
                    ) : (
                        <>
                            <div
                                style={{
                                    height: "450px",
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
                                        <p className="mt-2 small text-muted">Loading profit/loss data...</p>
                                    </div>
                                ) : filteredResults.length === 0 ? (
                                    <div className="d-flex flex-column justify-content-center align-items-center h-100">
                                        <i className="bi bi-search text-muted" style={{ fontSize: '1.5rem' }}></i>
                                        <h6 className="mt-2 text-muted">No invoices found</h6>
                                        <p className="text-muted small">{searchQuery ? 'Try a different search term' : 'No data for the selected criteria'}</p>
                                    </div>
                                ) : (
                                    <AutoSizer>
                                        {({ height, width }) => {
                                            const totalWidth = columnWidths.date + columnWidths.invNo + columnWidths.account +
                                                columnWidths.cost + columnWidths.sales + columnWidths.cpPercentage +
                                                columnWidths.spPercentage + columnWidths.profit + columnWidths.actions;

                                            return (
                                                <div style={{ position: 'relative', height: height, width: Math.max(width, totalWidth) }}>
                                                    <TableHeader />
                                                    <List
                                                        height={height - 28}
                                                        itemCount={filteredResults.length}
                                                        itemSize={28}
                                                        width={Math.max(width, totalWidth)}
                                                        itemData={{
                                                            bills: filteredResults,
                                                            selectedRowIndex,
                                                            formatCurrency,
                                                            formatDate,
                                                            formatPercentage,
                                                            handleRowClick: setSelectedRowIndex,
                                                            onViewItems: handleViewItems
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
                            {filteredResults.length > 0 && (
                                <div
                                    className="d-flex bg-light border-top sticky-bottom"
                                    style={{ zIndex: 2, height: '28px', borderTop: '2px solid #dee2e6' }}
                                >
                                    <div className="d-flex align-items-center px-1" style={{ width: `${columnWidths.date + columnWidths.invNo + columnWidths.account}px`, flexShrink: 0, height: '100%' }}>
                                        <strong style={{ fontSize: '0.75rem' }}>Grand Total:</strong>
                                    </div>

                                    <div className="d-flex align-items-center justify-content-end px-1 border-start" style={{ width: `${columnWidths.cost}px`, flexShrink: 0, height: '100%' }}>
                                        <strong style={{ fontSize: '0.75rem' }}>{formatCurrency(totals.totalCost)}</strong>
                                    </div>

                                    <div className="d-flex align-items-center justify-content-end px-1 border-start" style={{ width: `${columnWidths.sales}px`, flexShrink: 0, height: '100%' }}>
                                        <strong style={{ fontSize: '0.75rem' }}>{formatCurrency(totals.totalSales)}</strong>
                                    </div>

                                    <div className="d-flex align-items-center justify-content-end px-1 border-start" style={{ width: `${columnWidths.cpPercentage}px`, flexShrink: 0, height: '100%' }}>
                                        <strong style={{ fontSize: '0.75rem' }}>{formatPercentage(totals.totalProfit, totals.totalCost)}</strong>
                                    </div>

                                    <div className="d-flex align-items-center justify-content-end px-1 border-start" style={{ width: `${columnWidths.spPercentage}px`, flexShrink: 0, height: '100%' }}>
                                        <strong style={{ fontSize: '0.75rem' }}>{formatPercentage(totals.totalProfit, totals.totalSales)}</strong>
                                    </div>

                                    <div className={`d-flex align-items-center justify-content-end px-1 border-start ${totals.totalProfit >= 0 ? 'text-success' : 'text-danger'}`} style={{ width: `${columnWidths.profit}px`, flexShrink: 0, height: '100%' }}>
                                        <strong style={{ fontSize: '0.75rem' }}>{formatCurrency(totals.totalProfit)}</strong>
                                    </div>

                                    <div className="d-flex align-items-center px-1" style={{ width: `${columnWidths.actions}px`, flexShrink: 0, height: '100%' }}>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Item Details Modal */}
            {showItemModal && selectedBill && (
                <div className="modal fade show" tabIndex="-1" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header bg-primary text-white">
                                <h5 className="modal-title">
                                    <i className="fas fa-box me-2"></i>
                                    Item Details - Invoice: {selectedBill.billNumber}
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close btn-close-white"
                                    onClick={() => setShowItemModal(false)}
                                ></button>
                            </div>
                            <div className="modal-body p-0">
                                <div className="table-responsive" style={{ maxHeight: '400px' }}>
                                    <table className="table table-sm table-bordered mb-0">
                                        <thead className="table-light">
                                            <tr>
                                                <th style={{ width: '5%' }}>S.N</th>
                                                <th style={{ width: '30%' }}>Item Name</th>
                                                <th style={{ width: '8%' }} className="text-end">Qty</th>
                                                <th style={{ width: '12%' }} className="text-end">Cost Price</th>
                                                <th style={{ width: '12%' }} className="text-end">Sale Price</th>
                                                <th style={{ width: '12%' }} className="text-end">Profit/Unit</th>
                                                <th style={{ width: '15%' }} className="text-end">Total Profit</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedBill.items.map((item, idx) => {
                                                const profitPerUnit = item.price - (item.puPrice || 0);
                                                const itemProfit = profitPerUnit * item.quantity;
                                                return (
                                                    <tr key={idx}>
                                                        <td className="text-center">{idx + 1}</td>
                                                        <td>{item.itemName || 'N/A'}</td>
                                                        <td className="text-end">{item.quantity}</td>
                                                        <td className="text-end">{formatCurrency(item.puPrice)}</td>
                                                        <td className="text-end">{formatCurrency(item.price)}</td>
                                                        <td className={`text-end ${profitPerUnit >= 0 ? 'text-success' : 'text-danger'}`}>
                                                            {formatCurrency(profitPerUnit)}
                                                        </td>
                                                        <td className={`text-end fw-bold ${itemProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                                                            {formatCurrency(itemProfit)}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        <tfoot className="table-secondary">
                                            <tr>
                                                <td colSpan="4" className="text-end fw-bold">Total Profit:</td>
                                                <td colSpan="3" className={`text-end fw-bold ${selectedBill.totalProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                                                    {formatCurrency(selectedBill.totalProfit)}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => setShowItemModal(false)}
                                >
                                    <i className="fas fa-times me-1"></i>Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Product modal */}
            {showProductModal && (
                <ProductModal onClose={() => setShowProductModal(false)} />
            )}
        </div>
    );
};

export default InvoiceWiseProfitLossReport;