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

const SalesVatReport = () => {
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
        salesVatReport: [],
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
        invoiceNo: 100,
        buyerName: 150,
        panNumber: 100,
        totalSales: 100,
        discount: 100,
        nonVatSales: 100,
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
                const response = await api.get('/api/retailer/sales-vat-report');

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

                const response = await api.get(`/api/retailer/sales-vat-report?${params.toString()}`);

                if (response.data.success) {
                    const responseData = response.data.data;
                    setData(prev => ({
                        ...prev,
                        salesVatReport: responseData.salesVatReport || [],
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
                    const errorMsg = response.data.error || 'Failed to fetch VAT report';
                    setError(errorMsg);
                    setNotification({
                        show: true,
                        message: errorMsg,
                        type: 'error'
                    });
                }
            } catch (err) {
                console.error('Fetch error:', err);
                const errorMsg = err.response?.data?.error || 'Failed to fetch VAT report';
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
        const filtered = data.salesVatReport.filter(report => {
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
    }, [data.salesVatReport, searchQuery]);

    // Calculate totals
    const totals = useMemo(() => {
        return filteredReports.reduce((acc, report) => ({
            totalAmount: acc.totalAmount + (report.totalAmount || 0),
            discountAmount: acc.discountAmount + (report.discountAmount || 0),
            nonVatSales: acc.nonVatSales + (report.nonVatSales || 0),
            taxableAmount: acc.taxableAmount + (report.taxableAmount || 0),
            vatAmount: acc.vatAmount + (report.vatAmount || 0)
        }), {
            totalAmount: 0,
            discountAmount: 0,
            nonVatSales: 0,
            taxableAmount: 0,
            vatAmount: 0
        });
    }, [filteredReports]);

    // Save/load column widths
    useEffect(() => {
        const savedWidths = localStorage.getItem('salesVatTableColumnWidths');
        if (savedWidths) {
            try {
                setColumnWidths(JSON.parse(savedWidths));
            } catch (e) {
                console.error('Failed to load column widths:', e);
            }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('salesVatTableColumnWidths', JSON.stringify(columnWidths));
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
        if (!data.salesVatReport || data.salesVatReport.length === 0) {
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

            excelData.push(['Company Name:', data.currentCompanyName || 'N/A']);
            excelData.push(['Report Type:', 'Sales VAT Report']);
            excelData.push(['From Date:', data.fromDate]);
            excelData.push(['To Date:', data.toDate]);
            excelData.push(['Export Date:', currentDate]);
            excelData.push([]);

            const headers = [
                'Date', 'Invoice No.', 'Buyer\'s Name', 'Buyer\'s PAN',
                'Total Sales', 'Discount', 'Non-VAT Sales', 'Taxable Amt.', 'VAT'
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
                    formatCurrency(report.nonVatSales),
                    formatCurrency(report.taxableAmount),
                    formatCurrency(report.vatAmount)
                ]);
            });

            excelData.push([]);
            excelData.push([
                'TOTALS', '', '', '',
                formatCurrency(totals.totalAmount),
                formatCurrency(totals.discountAmount),
                formatCurrency(totals.nonVatSales),
                formatCurrency(totals.taxableAmount),
                formatCurrency(totals.vatAmount)
            ]);

            const ws = XLSX.utils.aoa_to_sheet(excelData);
            ws['!cols'] = [
                { wch: 12 }, { wch: 14 }, { wch: 25 }, { wch: 12 },
                { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 12 }
            ];

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Sales VAT Report');

            const fileName = `Sales_VAT_Report_${data.fromDate}_to_${data.toDate}.xlsx`;
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

        let tableContent = `
            <div class="print-header">
                <h2 style="margin:0; padding:0;">${data.currentCompanyName || 'Company Name'}</h2>
                <p style="margin:2px 0; font-size:8px;">
                    ${data.company?.address || ''}${data.company?.city ? ', ' + data.company.city : ''}<br>
                    PAN: ${data.company?.pan || ''} | Phone: ${data.company?.phone || ''}
                </p>
                <hr style="margin:5px 0;">
                <h3 style="margin:5px 0; text-decoration:underline;">Sales VAT Report</h3>
                <p style="margin:2px 0; font-size:9px;">
                    <strong>From Date:</strong> ${data.fromDate} &nbsp;|&nbsp;
                    <strong>To Date:</strong> ${data.toDate}
                </p>
            </div>
            <table cellspacing="0">
                <thead>
                    <tr>
                        <th class="nowrap">Date</th>
                        <th class="nowrap">Invoice No.</th>
                        <th class="nowrap">Buyer's Name</th>
                        <th class="nowrap">Buyer's PAN</th>
                        <th class="text-end">Total Sales</th>
                        <th class="text-end">Discount</th>
                        <th class="text-end">Non-VAT Sales</th>
                        <th class="text-end">Taxable Amt.</th>
                        <th class="text-end">VAT</th>
                    </tr>
                </thead>
                <tbody>
        `;

        filteredReports.forEach((report, index) => {
            const rowClass = index % 2 === 0 ? 'even-row' : '';
            tableContent += `
                <tr class="${rowClass}">
                    <td class="nowrap">${formatDate(report.nepaliDate || report.date)}</td>
                    <td class="nowrap">${report.billNumber}</td>
                    <td class="nowrap">${report.accountName || 'Cash Sale'}</td>
                    <td class="nowrap">${report.panNumber}</td>
                    <td class="text-end">${formatCurrency(report.totalAmount)}</td>
                    <td class="text-end">${formatCurrency(report.discountAmount)}</td>
                    <td class="text-end">${formatCurrency(report.nonVatSales)}</td>
                    <td class="text-end">${formatCurrency(report.taxableAmount)}</td>
                    <td class="text-end">${formatCurrency(report.vatAmount)}</td>
                </tr>
            `;
        });

        tableContent += `
                </tbody>
                <tfoot>
                    <tr class="total-row">
                        <td colspan="4"><strong>Grand Totals</strong></td>
                        <td class="text-end"><strong>${formatCurrency(totals.totalAmount)}</strong></td>
                        <td class="text-end"><strong>${formatCurrency(totals.discountAmount)}</strong></td>
                        <td class="text-end"><strong>${formatCurrency(totals.nonVatSales)}</strong></td>
                        <td class="text-end"><strong>${formatCurrency(totals.taxableAmount)}</strong></td>
                        <td class="text-end"><strong>${formatCurrency(totals.vatAmount)}</strong></td>
                    </tr>
                </tfoot>
            </table>
            <div style="margin-top: 15px; font-size: 8px; text-align: center; border-top: 1px solid #ccc; padding-top: 5px;">
                <p>Generated on: ${new Date().toLocaleString()} | Powered by SkyForge</p>
            </div>
        `;

        printWindow.document.write(`
            <html>
                <head>
                    <title>Sales VAT Report - ${data.currentCompanyName || 'Company Name'}</title>
                    <style>
                        @page { 
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
                            print-color-adjust: exact;
                        }
                        .print-header { 
                            text-align: center; 
                            margin-bottom: 15px; 
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
                    </style>
                </head>
                <body>
                    ${tableContent}
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
        `);
        printWindow.document.close();
    };

    const resetColumnWidths = () => {
        setColumnWidths({
            date: 90,
            invoiceNo: 100,
            buyerName: 150,
            panNumber: 100,
            totalSales: 100,
            discount: 100,
            nonVatSales: 100,
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
        const totalWidth = columnWidths.date + columnWidths.invoiceNo + columnWidths.buyerName +
            columnWidths.panNumber + columnWidths.totalSales + columnWidths.discount +
            columnWidths.nonVatSales + columnWidths.taxableAmount + columnWidths.vatAmount;

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
                <div className="d-flex align-items-center px-1 border-end position-relative" style={{ width: `${columnWidths.invoiceNo}px`, flexShrink: 0, minWidth: '60px' }}>
                    <strong style={{ fontSize: '0.75rem' }}>Invoice No.</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.invoiceNo - 2} columnName="invoiceNo" />
                </div>
                <div className="d-flex align-items-center px-1 border-end position-relative" style={{ width: `${columnWidths.buyerName}px`, flexShrink: 0, minWidth: '100px' }}>
                    <strong style={{ fontSize: '0.75rem' }}>Buyer's Name</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.buyerName - 2} columnName="buyerName" />
                </div>
                <div className="d-flex align-items-center px-1 border-end position-relative" style={{ width: `${columnWidths.panNumber}px`, flexShrink: 0, minWidth: '80px' }}>
                    <strong style={{ fontSize: '0.75rem' }}>Buyer's PAN</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.panNumber - 2} columnName="panNumber" />
                </div>
                <div className="d-flex align-items-center justify-content-end px-1 border-end position-relative" style={{ width: `${columnWidths.totalSales}px`, flexShrink: 0, minWidth: '80px' }}>
                    <strong style={{ fontSize: '0.75rem' }}>Total Sales</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.totalSales - 2} columnName="totalSales" />
                </div>
                <div className="d-flex align-items-center justify-content-end px-1 border-end position-relative" style={{ width: `${columnWidths.discount}px`, flexShrink: 0, minWidth: '80px' }}>
                    <strong style={{ fontSize: '0.75rem' }}>Discount</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.discount - 2} columnName="discount" />
                </div>
                <div className="d-flex align-items-center justify-content-end px-1 border-end position-relative" style={{ width: `${columnWidths.nonVatSales}px`, flexShrink: 0, minWidth: '80px' }}>
                    <strong style={{ fontSize: '0.75rem' }}>Non-VAT Sales</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.nonVatSales - 2} columnName="nonVatSales" />
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
                <div className="d-flex align-items-center px-1 border-end" style={{ width: `${columnWidths.invoiceNo}px`, flexShrink: 0, height: '100%', overflow: 'hidden' }}>
                    <span style={{ fontSize: '0.75rem' }}>{report.billNumber}</span>
                </div>
                <div className="d-flex align-items-center px-1 border-end" style={{ width: `${columnWidths.buyerName}px`, flexShrink: 0, height: '100%', overflow: 'hidden' }} title={report.accountName}>
                    <span style={{ fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {report.accountName || 'Cash Sale'}
                    </span>
                </div>
                <div className="d-flex align-items-center px-1 border-end" style={{ width: `${columnWidths.panNumber}px`, flexShrink: 0, height: '100%', overflow: 'hidden' }}>
                    <span style={{ fontSize: '0.75rem' }}>{report.panNumber}</span>
                </div>
                <div className="d-flex align-items-center justify-content-end px-1 border-end" style={{ width: `${columnWidths.totalSales}px`, flexShrink: 0, height: '100%' }}>
                    <span style={{ fontSize: '0.75rem' }}>{formatCurrency(report.totalAmount)}</span>
                </div>
                <div className="d-flex align-items-center justify-content-end px-1 border-end" style={{ width: `${columnWidths.discount}px`, flexShrink: 0, height: '100%' }}>
                    <span style={{ fontSize: '0.75rem' }}>{formatCurrency(report.discountAmount)}</span>
                </div>
                <div className="d-flex align-items-center justify-content-end px-1 border-end" style={{ width: `${columnWidths.nonVatSales}px`, flexShrink: 0, height: '100%' }}>
                    <span style={{ fontSize: '0.75rem' }}>{formatCurrency(report.nonVatSales)}</span>
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

    if (loading && !data.salesVatReport.length) return <Loader />;

    return (
        <div className="container-fluid">
            <Header />
            <div className="card mt-2 shadow-lg p-0 animate__animated animate__fadeInUp expanded-card ledger-card compact">
                <div className="card-header bg-white py-0">
                    <h1 className="h4 mb-0 text-center text-primary">Sales VAT Report</h1>
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
                                    disabled={data.salesVatReport.length === 0}
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
                                disabled={data.salesVatReport.length === 0 || exporting}
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

                    {data.salesVatReport.length === 0 ? (
                        <div className="alert alert-info text-center py-3" style={{ fontSize: '0.875rem' }}>
                            <i className="fas fa-info-circle me-2"></i>
                            Please select date range and click "Generate Report" to view VAT report
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
                                            const totalWidth = columnWidths.date + columnWidths.invoiceNo + columnWidths.buyerName +
                                                columnWidths.panNumber + columnWidths.totalSales + columnWidths.discount +
                                                columnWidths.nonVatSales + columnWidths.taxableAmount + columnWidths.vatAmount;

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
                                    <div className="d-flex align-items-center px-1" style={{ width: `${columnWidths.date + columnWidths.invoiceNo + columnWidths.buyerName + columnWidths.panNumber}px`, flexShrink: 0, height: '100%' }}>
                                        <strong style={{ fontSize: '0.75rem' }}>Totals:</strong>
                                    </div>
                                    <div className="d-flex align-items-center justify-content-end px-1 border-start" style={{ width: `${columnWidths.totalSales}px`, flexShrink: 0, height: '100%' }}>
                                        <strong style={{ fontSize: '0.75rem' }}>{formatCurrency(totals.totalAmount)}</strong>
                                    </div>
                                    <div className="d-flex align-items-center justify-content-end px-1 border-start" style={{ width: `${columnWidths.discount}px`, flexShrink: 0, height: '100%' }}>
                                        <strong style={{ fontSize: '0.75rem' }}>{formatCurrency(totals.discountAmount)}</strong>
                                    </div>
                                    <div className="d-flex align-items-center justify-content-end px-1 border-start" style={{ width: `${columnWidths.nonVatSales}px`, flexShrink: 0, height: '100%' }}>
                                        <strong style={{ fontSize: '0.75rem' }}>{formatCurrency(totals.nonVatSales)}</strong>
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

export default SalesVatReport;

//--------------------------------------------------------------------end

// import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
// import { useNavigate } from 'react-router-dom';
// import axios from 'axios';
// import Header from '../Header';
// import NepaliDate from 'nepali-date-converter';
// import '../../../stylesheet/noDateIcon.css';
// import Loader from '../../Loader';
// import * as XLSX from 'xlsx';
// import NotificationToast from '../../NotificationToast';

// const SalesVatReport = () => {
//     const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
//     const currentEnglishDate = new Date().toISOString().split('T')[0];

//     const [dateErrors, setDateErrors] = useState({
//         fromDate: '',
//         toDate: ''
//     });

//     const [notification, setNotification] = useState({
//         show: false,
//         message: '',
//         type: 'success',
//         duration: 3000
//     });

//     const [company, setCompany] = useState({
//         dateFormat: 'english',
//         vatEnabled: true,
//         fiscalYear: {}
//     });

//     const [data, setData] = useState({
//         company: null,
//         currentFiscalYear: null,
//         salesVatReport: [],
//         fromDate: '',
//         toDate: '',
//         companyDateFormat: 'english',
//         nepaliDate: '',
//         currentCompanyName: '',
//         user: null
//     });

//     const [loading, setLoading] = useState(false);
//     const [exporting, setExporting] = useState(false);
//     const [error, setError] = useState(null);
//     const [searchQuery, setSearchQuery] = useState('');
//     const [selectedRowIndex, setSelectedRowIndex] = useState(0);
//     const [filteredReports, setFilteredReports] = useState([]);

//     const fromDateRef = useRef(null);
//     const toDateRef = useRef(null);
//     const searchInputRef = useRef(null);
//     const generateReportRef = useRef(null);
//     const tableBodyRef = useRef(null);
//     const [shouldFetch, setShouldFetch] = useState(false);
//     const navigate = useNavigate();

//     // API instance with JWT token
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

//     // Helper function to check if date format is Nepali
//     const isNepaliDateFormat = useCallback(() => {
//         return company.dateFormat && company.dateFormat.toLowerCase() === 'nepali';
//     }, [company.dateFormat]);

//     // Fetch initial data
//     useEffect(() => {
//         const fetchInitialData = async () => {
//             try {
//                 setLoading(true);
//                 const response = await api.get('/api/retailer/sales-vat-report');

//                 if (response.data.success) {
//                     const responseData = response.data.data;
//                     const dateFormat = responseData.company?.dateFormat?.toLowerCase() || 'english';

//                     setCompany({
//                         dateFormat: dateFormat,
//                         vatEnabled: responseData.company?.vatEnabled !== false,
//                         fiscalYear: responseData.currentFiscalYear || {}
//                     });

//                     const currentFiscalYear = responseData.currentFiscalYear;
//                     if (currentFiscalYear) {
//                         let fromDateFormatted = '';
//                         let toDateFormatted = '';

//                         if (dateFormat === 'nepali') {
//                             fromDateFormatted = currentFiscalYear.startDateNepali || currentNepaliDate;
//                             toDateFormatted = currentNepaliDate;
//                         } else {
//                             fromDateFormatted = currentFiscalYear.startDate
//                                 ? new Date(currentFiscalYear.startDate).toISOString().split('T')[0]
//                                 : currentEnglishDate;
//                             toDateFormatted = currentEnglishDate;
//                         }

//                         setData(prev => ({
//                             ...prev,
//                             company: responseData.company,
//                             currentFiscalYear: currentFiscalYear,
//                             companyDateFormat: responseData.companyDateFormat,
//                             nepaliDate: responseData.nepaliDate,
//                             currentCompanyName: responseData.currentCompanyName,
//                             user: responseData.user,
//                             fromDate: fromDateFormatted,
//                             toDate: toDateFormatted
//                         }));
//                     } else {
//                         setData(prev => ({
//                             ...prev,
//                             company: responseData.company,
//                             currentFiscalYear: responseData.currentFiscalYear,
//                             companyDateFormat: responseData.companyDateFormat,
//                             nepaliDate: responseData.nepaliDate,
//                             currentCompanyName: responseData.currentCompanyName,
//                             user: responseData.user
//                         }));
//                     }
//                 }
//             } catch (err) {
//                 console.error('Error fetching initial data:', err);
//                 setNotification({
//                     show: true,
//                     message: 'Error loading data',
//                     type: 'error'
//                 });
//             } finally {
//                 setLoading(false);
//             }
//         };

//         fetchInitialData();
//     }, []);

//     // Fetch VAT report data when generate is clicked
//     useEffect(() => {
//         const fetchVatReportData = async () => {
//             if (!shouldFetch) return;

//             try {
//                 setLoading(true);
//                 const params = new URLSearchParams();
//                 params.append('dateFormat', company.dateFormat);
//                 if (data.fromDate) params.append('fromDate', data.fromDate);
//                 if (data.toDate) params.append('toDate', data.toDate);

//                 const response = await api.get(`/api/retailer/sales-vat-report?${params.toString()}`);

//                 if (response.data.success) {
//                     const responseData = response.data.data;
//                     setData(prev => ({
//                         ...prev,
//                         salesVatReport: responseData.salesVatReport || [],
//                         company: responseData.company || prev.company,
//                         currentFiscalYear: responseData.currentFiscalYear || prev.currentFiscalYear,
//                         companyDateFormat: responseData.companyDateFormat || prev.companyDateFormat,
//                         nepaliDate: responseData.nepaliDate || prev.nepaliDate,
//                         currentCompanyName: responseData.currentCompanyName || prev.currentCompanyName,
//                         user: responseData.user || prev.user,
//                         fromDate: data.fromDate,
//                         toDate: data.toDate
//                     }));
//                     setError(null);
//                     setSelectedRowIndex(0);
//                 } else {
//                     const errorMsg = response.data.error || 'Failed to fetch VAT report';
//                     setError(errorMsg);
//                     setNotification({
//                         show: true,
//                         message: errorMsg,
//                         type: 'error'
//                     });
//                 }
//             } catch (err) {
//                 console.error('Fetch error:', err);
//                 const errorMsg = err.response?.data?.error || 'Failed to fetch VAT report';
//                 setError(errorMsg);
//                 setNotification({
//                     show: true,
//                     message: errorMsg,
//                     type: 'error'
//                 });
//             } finally {
//                 setLoading(false);
//                 setShouldFetch(false);
//             }
//         };

//         fetchVatReportData();

//         // Cleanup function to reset shouldFetch when component unmounts
//         return () => {
//             setShouldFetch(false);
//         };
//     }, [shouldFetch, company.dateFormat, data.fromDate, data.toDate]);

//     // Filter reports based on search
//     useEffect(() => {
//         const filtered = data.salesVatReport.filter(report => {
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
//     }, [data.salesVatReport, searchQuery]);

//     // Calculate totals
//     const totals = useMemo(() => {
//         return filteredReports.reduce((acc, report) => ({
//             totalAmount: acc.totalAmount + (report.totalAmount || 0),
//             discountAmount: acc.discountAmount + (report.discountAmount || 0),
//             nonVatSales: acc.nonVatSales + (report.nonVatSales || 0),
//             taxableAmount: acc.taxableAmount + (report.taxableAmount || 0),
//             vatAmount: acc.vatAmount + (report.vatAmount || 0)
//         }), {
//             totalAmount: 0,
//             discountAmount: 0,
//             nonVatSales: 0,
//             taxableAmount: 0,
//             vatAmount: 0
//         });
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
//                 default:
//                     break;
//             }
//         };

//         window.addEventListener('keydown', handleKeyDown);
//         return () => window.removeEventListener('keydown', handleKeyDown);
//     }, [filteredReports]);

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
//             setNotification({
//                 show: true,
//                 message: 'Please select both from and to dates',
//                 type: 'warning'
//             });
//             return;
//         }
//         setShouldFetch(true);
//     };

//     const handleRowClick = (index) => {
//         setSelectedRowIndex(index);
//     };

//     const handleKeyDown = (e, nextFieldId) => {
//         if (e.key === 'Enter') {
//             e.preventDefault();
//             if (nextFieldId) {
//                 const nextField = document.getElementById(nextFieldId);
//                 if (nextField) {
//                     nextField.focus();
//                 }
//             }
//         }
//     };

//     const formatCurrency = useCallback((num) => {
//         const number = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num) || 0;
//         if (company.dateFormat === 'nepali') {
//             return number.toLocaleString('en-IN', {
//                 minimumFractionDigits: 2,
//                 maximumFractionDigits: 2
//             });
//         }
//         return number.toLocaleString('en-US', {
//             minimumFractionDigits: 2,
//             maximumFractionDigits: 2
//         });
//     }, [company.dateFormat]);

//     const formatDate = useCallback((dateString) => {
//         if (!dateString) return '';
//         if (company.dateFormat === 'nepali') {
//             try {
//                 return new NepaliDate(dateString).format('YYYY-MM-DD');
//             } catch (error) {
//                 return dateString;
//             }
//         }
//         return new Date(dateString).toISOString().split('T')[0];
//     }, [company.dateFormat]);

//     const exportToExcel = async () => {
//         if (!data.salesVatReport || data.salesVatReport.length === 0) {
//             setNotification({
//                 show: true,
//                 message: 'No data available to export. Please generate a report first.',
//                 type: 'warning'
//             });
//             return;
//         }

//         setExporting(true);
//         try {
//             const excelData = [];
//             const currentDate = new Date().toISOString().split('T')[0];

//             excelData.push(['Company Name:', data.currentCompanyName || 'N/A']);
//             excelData.push(['Report Type:', 'Sales VAT Report']);
//             excelData.push(['From Date:', data.fromDate]);
//             excelData.push(['To Date:', data.toDate]);
//             excelData.push(['Export Date:', currentDate]);
//             excelData.push([]);

//             const headers = [
//                 'Date', 'Invoice No.', 'Buyer\'s Name', 'Buyer\'s PAN',
//                 'Total Sales', 'Discount', 'Non-VAT Sales', 'Taxable Amount', 'VAT'
//             ];
//             excelData.push(headers);

//             filteredReports.forEach((report) => {
//                 excelData.push([
//                     formatDate(report.nepaliDate || report.date),
//                     report.billNumber,
//                     report.accountName,
//                     report.panNumber,
//                     formatCurrency(report.totalAmount),
//                     formatCurrency(report.discountAmount),
//                     formatCurrency(report.nonVatSales),
//                     formatCurrency(report.taxableAmount),
//                     formatCurrency(report.vatAmount)
//                 ]);
//             });

//             excelData.push([]);
//             excelData.push([
//                 'TOTALS', '', '', '',
//                 formatCurrency(totals.totalAmount),
//                 formatCurrency(totals.discountAmount),
//                 formatCurrency(totals.nonVatSales),
//                 formatCurrency(totals.taxableAmount),
//                 formatCurrency(totals.vatAmount)
//             ]);

//             const ws = XLSX.utils.aoa_to_sheet(excelData);
//             ws['!cols'] = [
//                 { wch: 12 }, { wch: 14 }, { wch: 25 }, { wch: 12 },
//                 { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 12 }
//             ];

//             const wb = XLSX.utils.book_new();
//             XLSX.utils.book_append_sheet(wb, ws, 'Sales VAT Report');

//             const fileName = `Sales_VAT_Report_${data.fromDate}_to_${data.toDate}.xlsx`;
//             XLSX.writeFile(wb, fileName);

//             setNotification({
//                 show: true,
//                 message: 'Excel file exported successfully!',
//                 type: 'success'
//             });
//         } catch (err) {
//             console.error('Error exporting to Excel:', err);
//             setNotification({
//                 show: true,
//                 message: 'Failed to export Excel file: ' + err.message,
//                 type: 'error'
//             });
//         } finally {
//             setExporting(false);
//         }
//     };

//     const handlePrint = () => {
//         if (filteredReports.length === 0) {
//             setNotification({
//                 show: true,
//                 message: 'No data to print. Please generate a report first.',
//                 type: 'warning'
//             });
//             return;
//         }

//         const printWindow = window.open("", "_blank");

//         if (!printWindow) {
//             setNotification({
//                 show: true,
//                 message: 'Popup blocked. Please allow popups for this site.',
//                 type: 'error'
//             });
//             return;
//         }

//         let tableContent = `
//             <div class="print-header">
//                 <h2 style="margin:0; padding:0;">${data.currentCompanyName || 'Company Name'}</h2>
//                 <p style="margin:2px 0; font-size:8px;">
//                     ${data.company?.address || ''}${data.company?.city ? ', ' + data.company.city : ''}<br>
//                     PAN: ${data.company?.pan || ''} | Phone: ${data.company?.phone || ''}
//                 </p>
//                 <hr style="margin:5px 0;">
//                 <h3 style="margin:5px 0; text-decoration:underline;">Sales VAT Report</h3>
//                 <p style="margin:2px 0; font-size:9px;">
//                     <strong>From Date:</strong> ${data.fromDate} &nbsp;|&nbsp;
//                     <strong>To Date:</strong> ${data.toDate}
//                 </p>
//             </div>
//             <table cellspacing="0">
//                 <thead>
//                     <tr>
//                         <th class="nowrap">Date</th>
//                         <th class="nowrap">Invoice No.</th>
//                         <th class="nowrap">Buyer's Name</th>
//                         <th class="nowrap">Buyer's PAN</th>
//                         <th class="text-end">Total Sales</th>
//                         <th class="text-end">Discount</th>
//                         <th class="text-end">Non-VAT Sales</th>
//                         <th class="text-end">Taxable Amount</th>
//                         <th class="text-end">VAT</th>
//                     </tr>
//                 </thead>
//                 <tbody>
//         `;

//         filteredReports.forEach((report, index) => {
//             const rowClass = index % 2 === 0 ? 'even-row' : '';
//             tableContent += `
//                 <tr class="${rowClass}">
//                     <td class="nowrap">${formatDate(report.nepaliDate || report.date)}</td>
//                     <td class="nowrap">${report.billNumber}</td>
//                     <td class="nowrap">${report.accountName || 'Cash Sale'}</td>
//                     <td class="nowrap">${report.panNumber}</td>
//                     <td class="text-end">${formatCurrency(report.totalAmount)}</td>
//                     <td class="text-end">${formatCurrency(report.discountAmount)}</td>
//                     <td class="text-end">${formatCurrency(report.nonVatSales)}</td>
//                     <td class="text-end">${formatCurrency(report.taxableAmount)}</td>
//                     <td class="text-end">${formatCurrency(report.vatAmount)}</td>
//                 </tr>
//             `;
//         });

//         tableContent += `
//                 </tbody>
//                 <tfoot>
//                     <tr class="total-row">
//                         <td colspan="4"><strong>Grand Totals</strong></td>
//                         <td class="text-end"><strong>${formatCurrency(totals.totalAmount)}</strong></td>
//                         <td class="text-end"><strong>${formatCurrency(totals.discountAmount)}</strong></td>
//                         <td class="text-end"><strong>${formatCurrency(totals.nonVatSales)}</strong></td>
//                         <td class="text-end"><strong>${formatCurrency(totals.taxableAmount)}</strong></td>
//                         <td class="text-end"><strong>${formatCurrency(totals.vatAmount)}</strong></td>
//                     </tr>
//                 </tfoot>
//             </table>
//             <div style="margin-top: 15px; font-size: 8px; text-align: center; border-top: 1px solid #ccc; padding-top: 5px;">
//                 <p>Generated on: ${new Date().toLocaleString()} | Powered by SkyForge</p>
//             </div>
//         `;

//         printWindow.document.write(`
//             <html>
//                 <head>
//                     <title>Sales VAT Report - ${data.currentCompanyName || 'Company Name'}</title>
//                     <style>
//                         @page {
//                             size: A4 landscape;
//                             margin: 10mm;
//                         }
//                         body {
//                             font-family: Arial, sans-serif;
//                             font-size: 10px;
//                             margin: 0;
//                             padding: 10mm;
//                         }
//                         table {
//                             width: 100%;
//                             border-collapse: collapse;
//                             page-break-inside: auto;
//                         }
//                         tr {
//                             page-break-inside: avoid;
//                             page-break-after: auto;
//                         }
//                         th, td {
//                             border: 1px solid #000;
//                             padding: 4px;
//                             text-align: left;
//                             white-space: nowrap;
//                         }
//                         th {
//                             background-color: #f2f2f2 !important;
//                             -webkit-print-color-adjust: exact;
//                             print-color-adjust: exact;
//                         }
//                         .print-header {
//                             text-align: center;
//                             margin-bottom: 15px;
//                         }
//                         .text-end {
//                             text-align: right;
//                         }
//                         .nowrap {
//                             white-space: nowrap;
//                         }
//                         .total-row {
//                             background-color: #e6e6e6;
//                             font-weight: bold;
//                         }
//                     </style>
//                 </head>
//                 <body>
//                     ${tableContent}
//                     <script>
//                         window.onload = function() {
//                             setTimeout(function() {
//                                 window.print();
//                                 setTimeout(function() {
//                                     window.close();
//                                 }, 500);
//                             }, 200);
//                         };
//                     <\/script>
//                 </body>
//             </html>
//         `);
//         printWindow.document.close();
//     };

//     // Reset component state when unmounting to prevent navigation issues
//     useEffect(() => {
//         return () => {
//             setShouldFetch(false);
//             setLoading(false);
//             setError(null);
//         };
//     }, []);

//     if (loading && !data.salesVatReport.length) return <Loader />;

//     return (
//         <div className="container-fluid">
//             <Header />
//             <div className="card mt-2 shadow-lg p-0 animate__animated animate__fadeInUp expanded-card ledger-card compact">
//                 <div className="card-header bg-white py-0">
//                     <h1 className="h4 mb-0 text-center text-primary">Sales VAT Report</h1>
//                 </div>

//                 <div className="card-body p-2 p-md-3">
//                     {/* Filter Row */}
//                     <div className="row g-2 mb-3">
//                         {/* From Date */}
//                         <div className="col-12 col-md-2">
//                             <div className="position-relative">
//                                 <input
//                                     type="text"
//                                     name="fromDate"
//                                     id="fromDate"
//                                     ref={fromDateRef}
//                                     className={`form-control form-control-sm no-date-icon ${dateErrors.fromDate ? 'is-invalid' : ''}`}
//                                     value={data.fromDate}
//                                     onChange={(e) => {
//                                         const value = e.target.value;
//                                         const sanitizedValue = value.replace(/[^0-9/-]/g, '');
//                                         if (sanitizedValue.length <= 10) {
//                                             setData(prev => ({ ...prev, fromDate: sanitizedValue }));
//                                             setDateErrors(prev => ({ ...prev, fromDate: '' }));
//                                         }
//                                     }}
//                                     onKeyDown={(e) => handleKeyDown(e, 'toDate')}
//                                     onPaste={(e) => {
//                                         e.preventDefault();
//                                         const pastedData = e.clipboardData.getData('text');
//                                         const cleanedData = pastedData.replace(/[^0-9/-]/g, '');
//                                         const newValue = data.fromDate + cleanedData;
//                                         if (newValue.length <= 10) {
//                                             setData(prev => ({ ...prev, fromDate: newValue }));
//                                         }
//                                     }}
//                                     onBlur={(e) => {
//                                         // Date validation logic
//                                         try {
//                                             const dateStr = e.target.value.trim();
//                                             if (!dateStr) {
//                                                 setDateErrors(prev => ({ ...prev, fromDate: '' }));
//                                                 return;
//                                             }

//                                             if (company.dateFormat === 'nepali') {
//                                                 const nepaliDateFormat = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/;
//                                                 if (!nepaliDateFormat.test(dateStr)) {
//                                                     const currentDate = new NepaliDate();
//                                                     const correctedDate = currentDate.format('YYYY-MM-DD');
//                                                     setData(prev => ({ ...prev, fromDate: correctedDate }));
//                                                     setDateErrors(prev => ({ ...prev, fromDate: '' }));
//                                                     setNotification({
//                                                         show: true,
//                                                         message: 'Invalid date format. Auto-corrected to current date.',
//                                                         type: 'warning',
//                                                         duration: 3000
//                                                     });
//                                                     return;
//                                                 }

//                                                 const normalizedDateStr = dateStr.replace(/-/g, '/');
//                                                 const [year, month, day] = normalizedDateStr.split('/').map(Number);

//                                                 if (month < 1 || month > 12) {
//                                                     throw new Error("Month must be between 1-12");
//                                                 }
//                                                 if (day < 1 || day > 32) {
//                                                     throw new Error("Day must be between 1-32");
//                                                 }

//                                                 const nepaliDate = new NepaliDate(year, month - 1, day);

//                                                 if (
//                                                     nepaliDate.getYear() !== year ||
//                                                     nepaliDate.getMonth() + 1 !== month ||
//                                                     nepaliDate.getDate() !== day
//                                                 ) {
//                                                     const currentDate = new NepaliDate();
//                                                     const correctedDate = currentDate.format('YYYY-MM-DD');
//                                                     setData(prev => ({ ...prev, fromDate: correctedDate }));
//                                                     setDateErrors(prev => ({ ...prev, fromDate: '' }));
//                                                     setNotification({
//                                                         show: true,
//                                                         message: 'Invalid Nepali date. Auto-corrected to current date.',
//                                                         type: 'warning',
//                                                         duration: 3000
//                                                     });
//                                                 } else {
//                                                     setData(prev => ({
//                                                         ...prev,
//                                                         fromDate: nepaliDate.format('YYYY-MM-DD')
//                                                     }));
//                                                     setDateErrors(prev => ({ ...prev, fromDate: '' }));
//                                                 }
//                                             } else {
//                                                 const englishDateFormat = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/;
//                                                 if (!englishDateFormat.test(dateStr)) {
//                                                     const currentDate = new Date();
//                                                     const correctedDate = currentDate.toISOString().split('T')[0];
//                                                     setData(prev => ({ ...prev, fromDate: correctedDate }));
//                                                     setDateErrors(prev => ({ ...prev, fromDate: '' }));
//                                                     setNotification({
//                                                         show: true,
//                                                         message: 'Invalid date format. Auto-corrected to current date.',
//                                                         type: 'warning',
//                                                         duration: 3000
//                                                     });
//                                                     return;
//                                                 }

//                                                 const dateObj = new Date(dateStr);
//                                                 if (isNaN(dateObj.getTime())) {
//                                                     throw new Error("Invalid English date");
//                                                 }

//                                                 setData(prev => ({
//                                                     ...prev,
//                                                     fromDate: dateObj.toISOString().split('T')[0]
//                                                 }));
//                                                 setDateErrors(prev => ({ ...prev, fromDate: '' }));
//                                             }
//                                         } catch (error) {
//                                             const currentDate = company.dateFormat === 'nepali' ? new NepaliDate() : new Date();
//                                             const correctedDate = company.dateFormat === 'nepali'
//                                                 ? currentDate.format('YYYY-MM-DD')
//                                                 : currentDate.toISOString().split('T')[0];
//                                             setData(prev => ({ ...prev, fromDate: correctedDate }));
//                                             setDateErrors(prev => ({ ...prev, fromDate: '' }));
//                                             setNotification({
//                                                 show: true,
//                                                 message: error.message ? `${error.message}. Auto-corrected to current date.` : 'Invalid date. Auto-corrected to current date.',
//                                                 type: 'warning',
//                                                 duration: 3000
//                                             });
//                                         }
//                                     }}
//                                     placeholder={company.dateFormat === 'nepali' ? "YYYY-MM-DD" : "YYYY-MM-DD"}
//                                     required
//                                     autoComplete="off"
//                                     style={{
//                                         height: '26px',
//                                         fontSize: '0.875rem',
//                                         paddingTop: '0.75rem',
//                                         width: '100%'
//                                     }}
//                                 />
//                                 <label
//                                     className="position-absolute"
//                                     style={{
//                                         top: '-0.5rem',
//                                         left: '0.75rem',
//                                         fontSize: '0.75rem',
//                                         backgroundColor: 'white',
//                                         padding: '0 0.25rem',
//                                         color: '#6c757d',
//                                         fontWeight: '500'
//                                     }}
//                                 >
//                                     From Date: <span className="text-danger">*</span>
//                                 </label>
//                                 {dateErrors.fromDate && (
//                                     <div className="invalid-feedback d-block" style={{ fontSize: '0.7rem' }}>
//                                         {dateErrors.fromDate}
//                                     </div>
//                                 )}
//                             </div>
//                         </div>

//                         {/* To Date */}
//                         <div className="col-12 col-md-2">
//                             <div className="position-relative">
//                                 <input
//                                     type="text"
//                                     name="toDate"
//                                     id="toDate"
//                                     ref={toDateRef}
//                                     className={`form-control form-control-sm no-date-icon ${dateErrors.toDate ? 'is-invalid' : ''}`}
//                                     value={data.toDate}
//                                     onChange={(e) => {
//                                         const value = e.target.value;
//                                         const sanitizedValue = value.replace(/[^0-9/-]/g, '');
//                                         if (sanitizedValue.length <= 10) {
//                                             setData(prev => ({ ...prev, toDate: sanitizedValue }));
//                                             setDateErrors(prev => ({ ...prev, toDate: '' }));
//                                         }
//                                     }}
//                                     onKeyDown={(e) => handleKeyDown(e, 'generateReport')}
//                                     onPaste={(e) => {
//                                         e.preventDefault();
//                                         const pastedData = e.clipboardData.getData('text');
//                                         const cleanedData = pastedData.replace(/[^0-9/-]/g, '');
//                                         const newValue = data.toDate + cleanedData;
//                                         if (newValue.length <= 10) {
//                                             setData(prev => ({ ...prev, toDate: newValue }));
//                                         }
//                                     }}
//                                     onBlur={(e) => {
//                                         // Similar validation as fromDate
//                                         try {
//                                             const dateStr = e.target.value.trim();
//                                             if (!dateStr) {
//                                                 setDateErrors(prev => ({ ...prev, toDate: '' }));
//                                                 return;
//                                             }

//                                             if (company.dateFormat === 'nepali') {
//                                                 const nepaliDateFormat = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/;
//                                                 if (!nepaliDateFormat.test(dateStr)) {
//                                                     const currentDate = new NepaliDate();
//                                                     const correctedDate = currentDate.format('YYYY-MM-DD');
//                                                     setData(prev => ({ ...prev, toDate: correctedDate }));
//                                                     setDateErrors(prev => ({ ...prev, toDate: '' }));
//                                                     setNotification({
//                                                         show: true,
//                                                         message: 'Invalid date format. Auto-corrected to current date.',
//                                                         type: 'warning',
//                                                         duration: 3000
//                                                     });
//                                                     return;
//                                                 }

//                                                 const normalizedDateStr = dateStr.replace(/-/g, '/');
//                                                 const [year, month, day] = normalizedDateStr.split('/').map(Number);

//                                                 if (month < 1 || month > 12) {
//                                                     throw new Error("Month must be between 1-12");
//                                                 }
//                                                 if (day < 1 || day > 32) {
//                                                     throw new Error("Day must be between 1-32");
//                                                 }

//                                                 const nepaliDate = new NepaliDate(year, month - 1, day);

//                                                 if (
//                                                     nepaliDate.getYear() !== year ||
//                                                     nepaliDate.getMonth() + 1 !== month ||
//                                                     nepaliDate.getDate() !== day
//                                                 ) {
//                                                     const currentDate = new NepaliDate();
//                                                     const correctedDate = currentDate.format('YYYY-MM-DD');
//                                                     setData(prev => ({ ...prev, toDate: correctedDate }));
//                                                     setDateErrors(prev => ({ ...prev, toDate: '' }));
//                                                     setNotification({
//                                                         show: true,
//                                                         message: 'Invalid Nepali date. Auto-corrected to current date.',
//                                                         type: 'warning',
//                                                         duration: 3000
//                                                     });
//                                                 } else {
//                                                     setData(prev => ({
//                                                         ...prev,
//                                                         toDate: nepaliDate.format('YYYY-MM-DD')
//                                                     }));
//                                                     setDateErrors(prev => ({ ...prev, toDate: '' }));
//                                                 }
//                                             } else {
//                                                 const englishDateFormat = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/;
//                                                 if (!englishDateFormat.test(dateStr)) {
//                                                     const currentDate = new Date();
//                                                     const correctedDate = currentDate.toISOString().split('T')[0];
//                                                     setData(prev => ({ ...prev, toDate: correctedDate }));
//                                                     setDateErrors(prev => ({ ...prev, toDate: '' }));
//                                                     setNotification({
//                                                         show: true,
//                                                         message: 'Invalid date format. Auto-corrected to current date.',
//                                                         type: 'warning',
//                                                         duration: 3000
//                                                     });
//                                                     return;
//                                                 }

//                                                 const dateObj = new Date(dateStr);
//                                                 if (isNaN(dateObj.getTime())) {
//                                                     throw new Error("Invalid English date");
//                                                 }

//                                                 setData(prev => ({
//                                                     ...prev,
//                                                     toDate: dateObj.toISOString().split('T')[0]
//                                                 }));
//                                                 setDateErrors(prev => ({ ...prev, toDate: '' }));
//                                             }
//                                         } catch (error) {
//                                             const currentDate = company.dateFormat === 'nepali' ? new NepaliDate() : new Date();
//                                             const correctedDate = company.dateFormat === 'nepali'
//                                                 ? currentDate.format('YYYY-MM-DD')
//                                                 : currentDate.toISOString().split('T')[0];
//                                             setData(prev => ({ ...prev, toDate: correctedDate }));
//                                             setDateErrors(prev => ({ ...prev, toDate: '' }));
//                                             setNotification({
//                                                 show: true,
//                                                 message: error.message ? `${error.message}. Auto-corrected to current date.` : 'Invalid date. Auto-corrected to current date.',
//                                                 type: 'warning',
//                                                 duration: 3000
//                                             });
//                                         }
//                                     }}
//                                     placeholder={company.dateFormat === 'nepali' ? "YYYY-MM-DD" : "YYYY-MM-DD"}
//                                     required
//                                     autoComplete='off'
//                                     style={{
//                                         height: '26px',
//                                         fontSize: '0.875rem',
//                                         paddingTop: '0.75rem',
//                                         width: '100%'
//                                     }}
//                                 />
//                                 <label
//                                     className="position-absolute"
//                                     style={{
//                                         top: '-0.5rem',
//                                         left: '0.75rem',
//                                         fontSize: '0.75rem',
//                                         backgroundColor: 'white',
//                                         padding: '0 0.25rem',
//                                         color: '#6c757d',
//                                         fontWeight: '500'
//                                     }}
//                                 >
//                                     To Date: <span className="text-danger">*</span>
//                                 </label>
//                                 {dateErrors.toDate && (
//                                     <div className="invalid-feedback d-block" style={{ fontSize: '0.7rem' }}>
//                                         {dateErrors.toDate}
//                                     </div>
//                                 )}
//                             </div>
//                         </div>

//                         {/* Generate Button */}
//                         <div className="col-12 col-md-1">
//                             <button
//                                 type="button"
//                                 id="generateReport"
//                                 ref={generateReportRef}
//                                 className="btn btn-primary btn-sm w-100"
//                                 onClick={handleGenerateReport}
//                                 style={{ height: '30px', fontSize: '0.8rem', padding: '0 12px', fontWeight: '500', whiteSpace: 'nowrap' }}
//                             >
//                                 <i className="fas fa-chart-line me-1"></i>Generate
//                             </button>
//                         </div>

//                         {/* Search */}
//                         <div className="col-12 col-md-2">
//                             <div className="position-relative">
//                                 <input
//                                     type="text"
//                                     className="form-control form-control-sm"
//                                     id="searchInput"
//                                     ref={searchInputRef}
//                                     placeholder=""
//                                     value={searchQuery}
//                                     onChange={(e) => setSearchQuery(e.target.value)}
//                                     disabled={data.salesVatReport.length === 0}
//                                     autoComplete="off"
//                                     style={{ height: '30px', fontSize: '0.875rem', paddingTop: '0.25rem', width: '100%' }}
//                                 />
//                                 <label
//                                     className="position-absolute"
//                                     style={{
//                                         top: '-0.5rem',
//                                         left: '0.75rem',
//                                         fontSize: '0.75rem',
//                                         backgroundColor: 'white',
//                                         padding: '0 0.25rem',
//                                         color: '#6c757d',
//                                         fontWeight: '500'
//                                     }}
//                                 >
//                                     Search
//                                 </label>
//                             </div>
//                         </div>

//                         {/* Action Buttons */}
//                         <div className="col-12 col-md-auto d-flex align-items-end justify-content-end gap-2">
//                             <button
//                                 className="btn btn-success btn-sm"
//                                 onClick={exportToExcel}
//                                 disabled={data.salesVatReport.length === 0 || exporting}
//                                 style={{ height: '30px', fontSize: '0.8rem', padding: '0 12px', fontWeight: '500', whiteSpace: 'nowrap' }}
//                             >
//                                 {exporting ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="fas fa-file-excel me-1"></i>}
//                                 Excel
//                             </button>
//                             <button
//                                 className="btn btn-secondary btn-sm"
//                                 onClick={handlePrint}
//                                 disabled={filteredReports.length === 0}
//                                 style={{ height: '30px', fontSize: '0.8rem', padding: '0 12px', fontWeight: '500', whiteSpace: 'nowrap' }}
//                             >
//                                 <i className="fas fa-print me-1"></i>Print
//                             </button>
//                         </div>
//                     </div>

//                     {error && (
//                         <div className="alert alert-danger text-center py-1 mb-2 small" style={{ fontSize: '0.75rem' }}>
//                             {error}
//                             <button type="button" className="btn-close btn-sm ms-2" style={{ fontSize: '10px' }} onClick={() => setError(null)}></button>
//                         </div>
//                     )}

//                     {data.salesVatReport.length === 0 ? (
//                         <div className="alert alert-info text-center py-3" style={{ fontSize: '0.875rem' }}>
//                             <i className="fas fa-info-circle me-2"></i>
//                             Please select date range and click "Generate Report" to view VAT report
//                         </div>
//                     ) : (
//                         <>
//                             <div className="table-responsive" style={{ maxHeight: '450px', overflow: 'auto' }}>
//                                 <table className="table table-sm table-hover mb-0" style={{ fontSize: '0.75rem' }}>
//                                     <thead className="table-light" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
//                                         <tr>
//                                             <th style={{ padding: '6px 8px' }}>Date</th>
//                                             <th style={{ padding: '6px 8px' }}>Invoice No.</th>
//                                             <th style={{ padding: '6px 8px' }}>Buyer's Name</th>
//                                             <th style={{ padding: '6px 8px' }}>Buyer's PAN</th>
//                                             <th className="text-end" style={{ padding: '6px 8px' }}>Total Sales</th>
//                                             <th className="text-end" style={{ padding: '6px 8px' }}>Discount</th>
//                                             <th className="text-end" style={{ padding: '6px 8px' }}>Non-VAT Sales</th>
//                                             <th className="text-end" style={{ padding: '6px 8px' }}>Taxable Amount</th>
//                                             <th className="text-end" style={{ padding: '6px 8px' }}>VAT</th>
//                                         </tr>
//                                     </thead>
//                                     <tbody ref={tableBodyRef}>
//                                         {filteredReports.map((report, index) => (
//                                             <tr
//                                                 key={index}
//                                                 className={selectedRowIndex === index ? 'table-primary' : ''}
//                                                 onClick={() => handleRowClick(index)}
//                                                 style={{ cursor: 'pointer' }}
//                                             >
//                                                 <td style={{ padding: '6px 8px' }}>{formatDate(report.nepaliDate || report.date)}</td>
//                                                 <td style={{ padding: '6px 8px' }}>{report.billNumber}</td>
//                                                 <td style={{ padding: '6px 8px' }}>{report.accountName || 'Cash Sale'}</td>
//                                                 <td style={{ padding: '6px 8px' }}>{report.panNumber}</td>
//                                                 <td className="text-end" style={{ padding: '6px 8px' }}>{formatCurrency(report.totalAmount)}</td>
//                                                 <td className="text-end" style={{ padding: '6px 8px' }}>{formatCurrency(report.discountAmount)}</td>
//                                                 <td className="text-end" style={{ padding: '6px 8px' }}>{formatCurrency(report.nonVatSales)}</td>
//                                                 <td className="text-end" style={{ padding: '6px 8px' }}>{formatCurrency(report.taxableAmount)}</td>
//                                                 <td className="text-end" style={{ padding: '6px 8px' }}>{formatCurrency(report.vatAmount)}</td>
//                                             </tr>
//                                         ))}
//                                     </tbody>
//                                     <tfoot className="table-group-divider">
//                                         <tr className="fw-bold table-secondary">
//                                             <td colSpan="4" style={{ padding: '6px 8px' }}>Totals</td>
//                                             <td className="text-end" style={{ padding: '6px 8px' }}>{formatCurrency(totals.totalAmount)}</td>
//                                             <td className="text-end" style={{ padding: '6px 8px' }}>{formatCurrency(totals.discountAmount)}</td>
//                                             <td className="text-end" style={{ padding: '6px 8px' }}>{formatCurrency(totals.nonVatSales)}</td>
//                                             <td className="text-end" style={{ padding: '6px 8px' }}>{formatCurrency(totals.taxableAmount)}</td>
//                                             <td className="text-end" style={{ padding: '6px 8px' }}>{formatCurrency(totals.vatAmount)}</td>
//                                         </tr>
//                                     </tfoot>
//                                 </table>
//                             </div>

//                             <div className="mt-2 text-end">
//                                 <small className="text-muted">
//                                     Showing {filteredReports.length} of {data.salesVatReport.length} records
//                                 </small>
//                             </div>
//                         </>
//                     )}
//                 </div>
//             </div>

//             {/* Notification Toast */}
//             <NotificationToast
//                 show={notification.show}
//                 message={notification.message}
//                 type={notification.type}
//                 onClose={() => setNotification({ ...notification, show: false })}
//             />
//         </div>
//     );
// };

// export default SalesVatReport;