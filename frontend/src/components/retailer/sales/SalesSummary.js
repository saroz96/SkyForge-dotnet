// SalesSummary.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../Header';
import NepaliDate from 'nepali-datetime';
import { usePageNotRefreshContext } from '../PageNotRefreshContext';
import Loader from '../../Loader';
import ProductModal from '../dashboard/modals/ProductModal';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import * as XLSX from 'xlsx';
import NotificationToast from '../../NotificationToast';
import { FiFileText, FiPrinter, FiDownload, FiSearch, FiRefreshCw, FiCalendar, FiEye } from 'react-icons/fi';
import './SalesSummary.css';
import api, { refreshToken } from '../../services/api';

// Helper functions for date conversion
const convertBsToAd = (bsDate) => {
    if (!bsDate || !/^\d{4}-\d{2}-\d{2}$/.test(bsDate)) return null;

    try {
        const nepaliDate = new NepaliDate(bsDate);
        if (!nepaliDate || typeof nepaliDate.getDateObject !== 'function') {
            console.error('Invalid NepaliDate object or missing getDateObject method');
            return null;
        }

        const jsDate = nepaliDate.getDateObject();
        if (!jsDate || isNaN(jsDate.getTime())) {
            console.error('Invalid AD date generated from BS date:', bsDate);
            return null;
        }

        const year = jsDate.getFullYear();
        const month = String(jsDate.getMonth() + 1).padStart(2, '0');
        const day = String(jsDate.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
    } catch (error) {
        console.error('Error converting BS to AD:', error.message, 'Date:', bsDate);
        return null;
    }
};

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

        if (isNaN(date.getTime())) {
            console.error('Invalid AD date:', adDate);
            return null;
        }

        const nepaliDate = new NepaliDate(date);
        if (!nepaliDate || typeof nepaliDate.getYear !== 'function') {
            console.error('Invalid NepaliDate object');
            return null;
        }

        const year = nepaliDate.getYear();
        const month = nepaliDate.getMonth();
        const day = nepaliDate.getDate();

        if (!year || month === undefined || !day) {
            console.error('Invalid BS components generated');
            return null;
        }

        return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    } catch (error) {
        console.error('Error converting AD to BS:', error.message, 'Date:', adDate);
        return null;
    }
};

const isValidNepaliDate = (dateStr) => {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;

    try {
        const [year, month, day] = dateStr.split('-').map(Number);
        if (month < 1 || month > 12) return false;
        if (day < 1 || day > 32) return false;

        const nepaliDate = new NepaliDate(dateStr);
        if (!nepaliDate || typeof nepaliDate.getYear !== 'function') {
            return false;
        }

        const bsYear = nepaliDate.getYear();
        const bsMonth = nepaliDate.getMonth() + 1;
        const bsDay = nepaliDate.getDate();

        return (bsYear === year && bsMonth === month && bsDay === day);
    } catch (error) {
        console.warn('Invalid Nepali date:', dateStr, error.message);
        return false;
    }
};

const SalesSummary = () => {
    const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
    const currentEnglishDate = new Date().toISOString().split('T')[0];
    const [exporting, setExporting] = useState(false);

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
        isVatExempt: false,
        vatEnabled: true,
        fiscalYear: {}
    });

    // Date range state
    const [dateRange, setDateRange] = useState(() => {
        if (draftSave && draftSave.salesSummaryData) {
            return {
                fromDate: draftSave.salesSummaryData.fromDate || '',
                toDate: draftSave.salesSummaryData.toDate || '',
                fromDateAd: draftSave.salesSummaryData.fromDateAd || '',
                toDateAd: draftSave.salesSummaryData.toDateAd || ''
            };
        }
        return {
            fromDate: '',
            toDate: '',
            fromDateAd: '',
            toDateAd: ''
        };
    });

    // Combined bills data (sales + returns)
    const [salesBills, setSalesBills] = useState([]);
    const [returnBills, setReturnBills] = useState([]);
    const [combinedData, setCombinedData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);

    const [companyInfo, setCompanyInfo] = useState(() => {
        if (draftSave && draftSave.salesSummaryData) {
            return {
                company: draftSave.salesSummaryData.company,
                currentFiscalYear: draftSave.salesSummaryData.currentFiscalYear,
                currentCompanyName: draftSave.salesSummaryData.currentCompanyName || '',
                companyDateFormat: draftSave.salesSummaryData.companyDateFormat || 'english',
                vatEnabled: draftSave.salesSummaryData.vatEnabled !== undefined ? draftSave.salesSummaryData.vatEnabled : true,
                isVatExempt: draftSave.salesSummaryData.isVatExempt || false,
                isAdminOrSupervisor: draftSave.salesSummaryData.isAdminOrSupervisor || false
            };
        }
        return {
            company: null,
            currentFiscalYear: null,
            currentCompanyName: '',
            companyDateFormat: 'english',
            vatEnabled: true,
            isVatExempt: false,
            isAdminOrSupervisor: false
        };
    });

    const [searchQuery, setSearchQuery] = useState(() => {
        if (draftSave && draftSave.salesSummarySearch) {
            return draftSave.salesSummarySearch.searchQuery || '';
        }
        return '';
    });

    const [paymentModeFilter, setPaymentModeFilter] = useState(() => {
        if (draftSave && draftSave.salesSummarySearch) {
            return draftSave.salesSummarySearch.paymentModeFilter || '';
        }
        return '';
    });

    // Type filter state
    const [typeFilter, setTypeFilter] = useState(() => {
        if (draftSave && draftSave.salesSummarySearch) {
            return draftSave.salesSummarySearch.typeFilter || 'all';
        }
        return 'all';
    });

    const [selectedRowIndex, setSelectedRowIndex] = useState(() => {
        if (draftSave && draftSave.salesSummarySearch) {
            return draftSave.salesSummarySearch.selectedRowIndex || 0;
        }
        return 0;
    });

    // Column resizing state
    const [columnWidths, setColumnWidths] = useState({
        bsDate: 80,
        adDate: 80,
        invNo: 90,
        partyName: 150,
        type: 60,
        payMode: 70,
        subTotal: 80,
        discount: 90,
        taxable: 70,
        vat: 70,
        roundOff: 70,
        total: 80,
        user: 80,
        actions: 70
    });

    const [isResizing, setIsResizing] = useState(false);
    const [resizingColumn, setResizingColumn] = useState(null);
    const [startX, setStartX] = useState(0);
    const [startWidth, setStartWidth] = useState(0);

    // API instance with JWT token
    // const api = axios.create({
    //     baseURL: process.env.REACT_APP_API_BASE_URL,
    //     withCredentials: true,
    // });

    // api.interceptors.request.use(
    //     (config) => {
    //         const token = localStorage.getItem('token');
    //         if (token) {
    //             config.headers.Authorization = `Bearer ${token}`;
    //         }
    //         return config;
    //     },
    //     (error) => {
    //         return Promise.reject(error);
    //     }
    // );

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [totals, setTotals] = useState({
        subTotal: 0,
        discount: 0,
        taxable: 0,
        vat: 0,
        roundOff: 0,
        amount: 0,
        // Return totals
        returnSubTotal: 0,
        returnDiscount: 0,
        returnTaxable: 0,
        returnVat: 0,
        returnRoundOff: 0,
        returnAmount: 0,
        // Net totals
        netSubTotal: 0,
        netDiscount: 0,
        netTaxable: 0,
        netVat: 0,
        netRoundOff: 0,
        netAmount: 0
    });

    const fromDateRef = useRef(null);
    const toDateRef = useRef(null);
    const searchInputRef = useRef(null);
    const paymentModeFilterRef = useRef(null);
    const typeFilterRef = useRef(null);
    const generateReportRef = useRef(null);
    const tableBodyRef = useRef(null);
    const [shouldFetch, setShouldFetch] = useState(false);
    const navigate = useNavigate();

    // Fetch company and fiscal year info
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const response = await api.get('/api/retailer/sales-register/entry-data');

                if (response.data.success) {
                    const responseData = response.data.data;

                    const dateFormat = responseData.company.dateFormat?.toLowerCase() || 'english';
                    const isNepaliFormat = dateFormat === 'nepali';

                    setCompany({
                        ...responseData.company,
                        dateFormat: dateFormat,
                        vatEnabled: responseData.company.vatEnabled || true,
                        isVatExempt: responseData.company.isVatExempt || false
                    });

                    const currentFiscalYear = responseData.currentFiscalYear;
                    const hasDraftDates = draftSave?.salesSummaryData?.fromDate &&
                        draftSave?.salesSummaryData?.toDate;

                    if (!hasDraftDates && currentFiscalYear) {
                        let fromDateFormatted = '';
                        let toDateFormatted = '';
                        let fromDateAd = '';
                        let toDateAd = '';

                        if (isNepaliFormat) {
                            fromDateFormatted = currentFiscalYear.startDateNepali || currentNepaliDate;
                            toDateFormatted = currentNepaliDate;
                            fromDateAd = convertBsToAd(fromDateFormatted);
                            toDateAd = convertBsToAd(toDateFormatted);
                        } else {
                            fromDateFormatted = currentFiscalYear.startDate
                                ? new Date(currentFiscalYear.startDate).toISOString().split('T')[0]
                                : currentEnglishDate;
                            toDateFormatted = currentFiscalYear.endDate
                                ? new Date(currentFiscalYear.endDate).toISOString().split('T')[0]
                                : currentEnglishDate;
                            fromDateAd = fromDateFormatted;
                            toDateAd = toDateFormatted;
                        }

                        setDateRange({
                            fromDate: fromDateFormatted,
                            toDate: toDateFormatted,
                            fromDateAd: fromDateAd,
                            toDateAd: toDateAd
                        });
                    }

                    setCompanyInfo({
                        company: responseData.company,
                        currentFiscalYear: currentFiscalYear,
                        currentCompanyName: responseData.company.name,
                        companyDateFormat: responseData.company.dateFormat,
                        vatEnabled: responseData.company.vatEnabled,
                        isVatExempt: responseData.company.isVatExempt || false,
                        isAdminOrSupervisor: responseData.isAdminOrSupervisor || false
                    });
                }
            } catch (err) {
                console.error('Error fetching initial data:', err);
                setNotification({
                    show: true,
                    message: 'Error loading company data',
                    type: 'error'
                });
            }
        };

        fetchInitialData();
    }, []);

    // Save data to draft context
    useEffect(() => {
        setDraftSave({
            ...draftSave,
            salesSummaryData: {
                ...companyInfo,
                fromDate: dateRange.fromDate,
                toDate: dateRange.toDate,
                fromDateAd: dateRange.fromDateAd,
                toDateAd: dateRange.toDateAd
            },
            salesSummarySearch: {
                searchQuery,
                paymentModeFilter,
                typeFilter,
                selectedRowIndex,
                fromDate: dateRange.fromDate,
                toDate: dateRange.toDate
            }
        });
    }, [searchQuery, paymentModeFilter, typeFilter, selectedRowIndex, dateRange.fromDate, dateRange.toDate, dateRange.fromDateAd, dateRange.toDateAd, companyInfo]);

    // Save/load column widths
    useEffect(() => {
        const savedWidths = localStorage.getItem('salesSummaryTableColumnWidths');
        if (savedWidths) {
            try {
                setColumnWidths(JSON.parse(savedWidths));
            } catch (e) {
                console.error('Failed to load column widths:', e);
            }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('salesSummaryTableColumnWidths', JSON.stringify(columnWidths));
    }, [columnWidths]);

    // Fetch data when generate report is clicked
    useEffect(() => {
        const abortController = new AbortController();

        const fetchData = async () => {
            if (!shouldFetch) return;

            try {
                setLoading(true);
                const params = new URLSearchParams();
                if (dateRange.fromDateAd) params.append('fromDate', dateRange.fromDateAd);
                if (dateRange.toDateAd) params.append('toDate', dateRange.toDateAd);

                // Fetch sales bills
                const salesResponse = await api.get(`/api/retailer/sales-register?${params.toString()}`, {
                    signal: abortController.signal
                });

                // Fetch sales returns
                const returnResponse = await api.get(`/api/retailer/sales-return/register?${params.toString()}`, {
                    signal: abortController.signal
                });

                let salesData = [];
                let returnData = [];

                if (salesResponse.data.success) {
                    salesData = salesResponse.data.data.bills || [];
                    setSalesBills(salesData);
                }

                if (returnResponse.data.success) {
                    returnData = returnResponse.data.data.bills || [];
                    setReturnBills(returnData);
                }

                // Combine data with type indicator
                const combined = [
                    ...salesData.map(bill => ({ ...bill, type: 'Sales' })),
                    ...returnData.map(bill => ({ ...bill, type: 'Return' }))
                ];

                // Sort by date (newest first)
                combined.sort((a, b) => {
                    const dateA = a.date ? new Date(a.date) : new Date(0);
                    const dateB = b.date ? new Date(b.date) : new Date(0);
                    return dateA - dateB;
                });

                setCombinedData(combined);
                setError(null);
                setSelectedRowIndex(0);
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error('Fetch error:', err);
                    setError(err.response?.data?.error || 'Failed to fetch data');
                }
            } finally {
                setLoading(false);
                setShouldFetch(false);
            }
        };

        fetchData();

        return () => {
            abortController.abort();
        };
    }, [shouldFetch, dateRange.fromDateAd, dateRange.toDateAd]);

    // Filter combined data - Updated with typeFilter
    useEffect(() => {
        const filtered = combinedData.filter(item => {
            // Search filter
            const matchesSearch =
                (item.billNumber?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                (item.accountName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                (item.cashAccount?.toLowerCase() || '').includes(searchQuery.toLowerCase());

            // Payment mode filter
            const matchesPaymentMode =
                paymentModeFilter === '' ||
                (item.paymentMode?.toLowerCase() || '') === paymentModeFilter.toLowerCase();

            // Type filter
            let matchesType = true;
            if (typeFilter === 'sales') {
                matchesType = item.type === 'Sales';
            } else if (typeFilter === 'return') {
                matchesType = item.type === 'Return';
            }

            return matchesSearch && matchesPaymentMode && matchesType;
        });

        setFilteredData(filtered);

        if (selectedRowIndex >= filtered.length && filtered.length > 0) {
            setSelectedRowIndex(0);
        }
    }, [combinedData, searchQuery, paymentModeFilter, typeFilter]);

    // Calculate totals based on filtered data
    useEffect(() => {
        if (filteredData.length === 0) {
            setTotals({
                subTotal: 0,
                discount: 0,
                taxable: 0,
                vat: 0,
                roundOff: 0,
                amount: 0,
                returnSubTotal: 0,
                returnDiscount: 0,
                returnTaxable: 0,
                returnVat: 0,
                returnRoundOff: 0,
                returnAmount: 0,
                netSubTotal: 0,
                netDiscount: 0,
                netTaxable: 0,
                netVat: 0,
                netRoundOff: 0,
                netAmount: 0
            });
            return;
        }

        // Separate sales and return data from filtered results
        const sales = filteredData.filter(item => item.type === 'Sales');
        const returns = filteredData.filter(item => item.type === 'Return');

        // Sales totals
        const salesTotals = sales.reduce((acc, bill) => ({
            subTotal: acc.subTotal + (bill.subTotal || 0),
            discount: acc.discount + (bill.discountAmount || 0),
            taxable: acc.taxable + (bill.taxableAmount || 0),
            vat: acc.vat + (bill.vatAmount || 0),
            roundOff: acc.roundOff + (bill.roundOffAmount || 0),
            amount: acc.amount + (bill.totalAmount || 0)
        }), { subTotal: 0, discount: 0, taxable: 0, vat: 0, roundOff: 0, amount: 0 });

        // Return totals
        const returnTotals = returns.reduce((acc, bill) => ({
            subTotal: acc.subTotal + (bill.subTotal || 0),
            discount: acc.discount + (bill.discountAmount || 0),
            taxable: acc.taxable + (bill.taxableAmount || 0),
            vat: acc.vat + (bill.vatAmount || 0),
            roundOff: acc.roundOff + (bill.roundOffAmount || 0),
            amount: acc.amount + (bill.totalAmount || 0)
        }), { subTotal: 0, discount: 0, taxable: 0, vat: 0, roundOff: 0, amount: 0 });

        setTotals({
            subTotal: salesTotals.subTotal,
            discount: salesTotals.discount,
            taxable: salesTotals.taxable,
            vat: salesTotals.vat,
            roundOff: salesTotals.roundOff,
            amount: salesTotals.amount,
            returnSubTotal: returnTotals.subTotal,
            returnDiscount: returnTotals.discount,
            returnTaxable: returnTotals.taxable,
            returnVat: returnTotals.vat,
            returnRoundOff: returnTotals.roundOff,
            returnAmount: returnTotals.amount,
            netSubTotal: salesTotals.subTotal - returnTotals.subTotal,
            netDiscount: salesTotals.discount - returnTotals.discount,
            netTaxable: salesTotals.taxable - returnTotals.taxable,
            netVat: salesTotals.vat - returnTotals.vat,
            netRoundOff: salesTotals.roundOff - returnTotals.roundOff,
            netAmount: salesTotals.amount - returnTotals.amount
        });
    }, [filteredData]);

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

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (filteredData.length === 0) return;

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
                    setSelectedRowIndex(prev => Math.min(filteredData.length - 1, prev + 1));
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [filteredData]);

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

    const handleGenerateReport = () => {
        if (!dateRange.fromDate || !dateRange.toDate) {
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

    const handlePrint = (filtered = false) => {
        const rowsToPrint = filtered ? filteredData : combinedData;

        if (rowsToPrint.length === 0) {
            setNotification({
                show: true,
                message: "No data to print",
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

        let tableContent = generatePrintContent(rowsToPrint);

        printWindow.document.write(`
            <html>
                <head>
                    <title>Sales Summary Report</title>
                    <meta charset="UTF-8">
                    <style>
                        @page { margin: 5mm; size: A4 portrait; }
                        body { 
                            font-family: 'Segoe UI', Arial, sans-serif; 
                            font-size: 10px; 
                            margin: 0;
                            padding: 5mm;
                            background: #fff;
                            color: #000;
                        }
                        table { 
                            width: 100%; 
                            border-collapse: collapse; 
                            page-break-inside: auto;
                            font-size: 10px;
                        }
                        tr { page-break-inside: avoid; page-break-after: auto; }
                        th, td { 
                            border: 1px solid #333; 
                            padding: 4px 6px; 
                            text-align: left; 
                            white-space: nowrap;
                        }
                        th { 
                            background-color: #e8e8e8 !important; 
                            -webkit-print-color-adjust: exact; 
                            print-color-adjust: exact;
                            font-size: 11px;
                            font-weight: 700;
                            color: #1a1a1a;
                        }
                        td { font-size: 10px; padding: 4px 6px; }
                        .print-header { text-align: center; margin-bottom: 10px; }
                        .text-end { text-align: right; }
                        .nowrap { white-space: nowrap; }
                        .report-title {
                            text-align: center;
                            text-decoration: underline;
                            font-size: 14px;
                            font-weight: 700;
                            margin: 6px 0;
                            color: #1a1a1a;
                            letter-spacing: 0.5px;
                        }
                        .grand-total-row td {
                            font-weight: 700;
                            border-top: 3px double #000;
                            background-color: #f5f5f5 !important;
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                        .company-name {
                            font-size: 18px;
                            font-weight: 700;
                            margin: 0;
                            padding: 0;
                            color: #1a1a1a;
                            letter-spacing: 1px;
                        }
                        .company-details {
                            font-size: 10px;
                            margin: 4px 0;
                            color: #333;
                            line-height: 1.4;
                        }
                        .return-row { background-color: #fff5f5 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        .sales-row { background-color: #f0fff4 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        .footer {
                            margin-top: 15px;
                            font-size: 9px;
                            text-align: center;
                            border-top: 1px solid #ccc;
                            padding-top: 8px;
                            color: #666;
                        }
                        .total-label { font-size: 11px; font-weight: 600; }
                        @media print {
                            body { padding: 10px; }
                            th, td { padding: 3px 5px; }
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
                            }, 300);
                        };
                    <\/script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const generatePrintContent = (rowsToPrint) => {
        let tableContent = `
            <div class="print-header">
                <div class="company-name">${companyInfo.currentCompanyName || 'Company Name'}</div>
                <div class="company-details">
                    ${companyInfo.company?.address || ''}${companyInfo.company?.city ? ', ' + companyInfo.company?.city : ''}<br>
                    PAN: ${companyInfo.company?.pan || ''} | Phone: ${companyInfo.company?.phone || ''}
                </div>
                <hr style="margin:6px 0; border: 1px solid #ccc;">
                <div class="report-title">Sales Summary Report</div>
                <div class="statement-info">
                    <strong>From (BS):</strong> ${dateRange.fromDate} &nbsp;|&nbsp;
                    <strong>To (BS):</strong> ${dateRange.toDate} &nbsp;|&nbsp;
                    <strong>From (AD):</strong> ${dateRange.fromDateAd} &nbsp;|&nbsp;
                    <strong>To (AD):</strong> ${dateRange.toDateAd} &nbsp;|&nbsp;
                    <strong>Total Records:</strong> ${rowsToPrint.length}
                </div>
            </div>
            <table cellspacing="0">
                <thead>
                    <tr>
                        <th class="nowrap">Miti</th>
                        <th class="nowrap">Date</th>
                        <th class="nowrap">Inv No.</th>
                        <th class="nowrap">Party Name</th>
                        <th class="nowrap">Type</th>
                        <th class="nowrap">Mode</th>
                        <th class="nowrap text-end">Sub Total</th>
                        <th class="nowrap text-end">Discount</th>
                        <th class="nowrap text-end">Taxable</th>
                        <th class="nowrap text-end">VAT</th>
                        <th class="nowrap text-end">Off(-/+)</th>
                        <th class="nowrap text-end">Total</th>
                        <th class="nowrap">User</th>
                    </tr>
                </thead>
                <tbody>
        `;

        // Separate sales and returns for correct calculation
        const printSales = rowsToPrint.filter(item => item.type === 'Sales');
        const printReturns = rowsToPrint.filter(item => item.type === 'Return');

        // Print Sales rows
        printSales.forEach((bill) => {
            tableContent += `
                <tr class="sales-row">
                    <td class="nowrap">${bill.nepaliDate || ''}</td>
                    <td class="nowrap">${bill.date ? new Date(bill.date).toLocaleDateString('en-CA') : ''}</td>
                    <td class="nowrap">${bill.billNumber || ''}</td>
                    <td style="white-space: normal; word-wrap: break-word; max-width: 150px;">${bill.accountName || bill.cashAccount || 'N/A'}</td>
                    <td class="nowrap" style="text-align: center; font-weight: bold; color: #059669;">SAL</td>
                    <td class="nowrap">${bill.paymentMode || ''}</td>
                    <td class="text-end">${(bill.subTotal || 0).toFixed(2)}</td>
                    <td class="text-end">${(bill.discountPercentage || 0).toFixed(2)}% - ${(bill.discountAmount || 0).toFixed(2)}</td>
                    <td class="text-end">${(bill.taxableAmount || 0).toFixed(2)}</td>
                    <td class="text-end">${(bill.vatAmount || 0).toFixed(2)}</td>
                    <td class="text-end">${(bill.roundOffAmount || 0).toFixed(2)}</td>
                    <td class="text-end">${(bill.totalAmount || 0).toFixed(2)}</td>
                    <td class="nowrap">${bill.userName || 'N/A'}</td>
                </tr>
            `;
        });

        // Print Return rows (with negative sign)
        printReturns.forEach((bill) => {
            tableContent += `
                <tr class="return-row">
                    <td class="nowrap">${bill.nepaliDate || ''}</td>
                    <td class="nowrap">${bill.date ? new Date(bill.date).toLocaleDateString('en-CA') : ''}</td>
                    <td class="nowrap">${bill.billNumber || ''}</td>
                    <td style="white-space: normal; word-wrap: break-word; max-width: 150px;">${bill.accountName || bill.cashAccount || 'N/A'}</td>
                    <td class="nowrap" style="text-align: center; font-weight: bold; color: #dc2626;">RET</td>
                    <td class="nowrap">${bill.paymentMode || ''}</td>
                    <td class="text-end" style="color: #dc2626;">-${(bill.subTotal || 0).toFixed(2)}</td>
                    <td class="text-end" style="color: #dc2626;">-${(bill.discountAmount || 0).toFixed(2)}</td>
                    <td class="text-end" style="color: #dc2626;">-${(bill.taxableAmount || 0).toFixed(2)}</td>
                    <td class="text-end" style="color: #dc2626;">-${(bill.vatAmount || 0).toFixed(2)}</td>
                    <td class="text-end" style="color: #dc2626;">-${(bill.roundOffAmount || 0).toFixed(2)}</td>
                    <td class="text-end" style="font-weight: bold; color: #dc2626;">-${(bill.totalAmount || 0).toFixed(2)}</td>
                    <td class="nowrap">${bill.userName || 'N/A'}</td>
                </tr>
            `;
        });

        // Calculate grand totals (Sales - Returns)
        const grandTotals = {
            subTotal: printSales.reduce((sum, bill) => sum + (bill.subTotal || 0), 0) -
                printReturns.reduce((sum, bill) => sum + (bill.subTotal || 0), 0),
            discount: printSales.reduce((sum, bill) => sum + (bill.discountAmount || 0), 0) -
                printReturns.reduce((sum, bill) => sum + (bill.discountAmount || 0), 0),
            taxable: printSales.reduce((sum, bill) => sum + (bill.taxableAmount || 0), 0) -
                printReturns.reduce((sum, bill) => sum + (bill.taxableAmount || 0), 0),
            vat: printSales.reduce((sum, bill) => sum + (bill.vatAmount || 0), 0) -
                printReturns.reduce((sum, bill) => sum + (bill.vatAmount || 0), 0),
            roundOff: printSales.reduce((sum, bill) => sum + (bill.roundOffAmount || 0), 0) -
                printReturns.reduce((sum, bill) => sum + (bill.roundOffAmount || 0), 0),
            amount: printSales.reduce((sum, bill) => sum + (bill.totalAmount || 0), 0) -
                printReturns.reduce((sum, bill) => sum + (bill.totalAmount || 0), 0)
        };

        tableContent += `
                <tr class="grand-total-row">
                    <td colspan="5" class="text-end total-label">NET TOTALS</td>
                    <td></td>
                    <td class="text-end total-label">${grandTotals.subTotal.toFixed(2)}</td>
                    <td class="text-end total-label">${grandTotals.discount.toFixed(2)}</td>
                    <td class="text-end total-label">${grandTotals.taxable.toFixed(2)}</td>
                    <td class="text-end total-label">${grandTotals.vat.toFixed(2)}</td>
                    <td class="text-end total-label">${grandTotals.roundOff.toFixed(2)}</td>
                    <td class="text-end total-label">${grandTotals.amount.toFixed(2)}</td>
                    <td></td>
                </tr>
                </tbody>
            </table>
            <div class="footer">
                Generated on: ${new Date().toLocaleString()} | Powered by Ams Software
            </div>
        `;

        return tableContent;
    };

    const formatCurrency = useCallback((num) => {
        const number = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num) || 0;
        return number.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }, []);

    const formatCurrencyForExport = (num) => {
        const number = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num) || 0;
        return number.toFixed(2);
    };

    const handleExportExcel = async () => {
        if (!filteredData || filteredData.length === 0) {
            setNotification({
                show: true,
                message: 'No data available to export. Please generate a report first.',
                type: 'warning'
            });
            return;
        }

        setExporting(true);
        try {
            const currentDate = new Date().toISOString().split('T')[0];
            const showVatColumns = companyInfo.vatEnabled && !companyInfo.isVatExempt;

            let excelData = [];

            // Header information
            excelData.push(['Sales Summary Report']);
            excelData.push(['Company:', companyInfo.currentCompanyName || 'N/A']);
            excelData.push(['Address:', companyInfo.company?.address || '', companyInfo.company?.city ? ', ' + companyInfo.company?.city : '']);
            excelData.push(['PAN:', companyInfo.company?.pan || '']);
            excelData.push(['From Date (BS):', dateRange.fromDate]);
            excelData.push(['To Date (BS):', dateRange.toDate]);
            excelData.push(['From Date (AD):', dateRange.fromDateAd]);
            excelData.push(['To Date (AD):', dateRange.toDateAd]);
            excelData.push(['Total Records:', filteredData.length]);
            if (searchQuery) excelData.push(['Search:', searchQuery]);
            if (paymentModeFilter) excelData.push(['Payment Mode Filter:', paymentModeFilter === 'cash' ? 'Cash' : paymentModeFilter === 'credit' ? 'Credit' : 'All']);
            if (typeFilter) excelData.push(['Type Filter:', typeFilter === 'sales' ? 'Sales' : typeFilter === 'return' ? 'Return' : 'All']);
            excelData.push(['Export Date:', new Date().toLocaleString()]);
            excelData.push([]);

            // Headers
            const headers = [
                'S.No',
                'Miti',
                'Date',
                'Inv No.',
                'Party Name',
                'Type',
                'Pay Mode',
                'Sub Total',
                'Discount (%)',
                'Discount (Rs.)'
            ];

            if (showVatColumns) {
                headers.push('Taxable');
                headers.push('VAT');
            }

            headers.push('Round Off');
            headers.push('Total');
            headers.push('User');

            excelData.push(headers);

            // Data rows - separate Sales and Return
            const sales = filteredData.filter(item => item.type === 'Sales');
            const returns = filteredData.filter(item => item.type === 'Return');

            // Add Sales rows
            sales.forEach((bill, index) => {
                const rowData = [
                    index + 1,
                    bill.nepaliDate || '',
                    bill.date ? new Date(bill.date).toLocaleDateString() : '',
                    bill.billNumber || '',
                    bill.accountName || bill.cashAccount || 'N/A',
                    'SAL',
                    bill.paymentMode || '',
                    formatCurrencyForExport(bill.subTotal),
                    (bill.discountPercentage || 0).toFixed(2),
                    formatCurrencyForExport(bill.discountAmount)
                ];

                if (showVatColumns) {
                    rowData.push(formatCurrencyForExport(bill.taxableAmount));
                    rowData.push(formatCurrencyForExport(bill.vatAmount));
                }

                rowData.push(formatCurrencyForExport(bill.roundOffAmount));
                rowData.push(formatCurrencyForExport(bill.totalAmount));
                rowData.push(bill.userName || '');

                excelData.push(rowData);
            });

            // Add Return rows (with negative values)
            returns.forEach((bill, index) => {
                const rowData = [
                    sales.length + index + 1,
                    bill.nepaliDate || '',
                    bill.date ? new Date(bill.date).toLocaleDateString() : '',
                    bill.billNumber || '',
                    bill.accountName || bill.cashAccount || 'N/A',
                    'RET',
                    bill.paymentMode || '',
                    -parseFloat(bill.subTotal || 0),
                    (bill.discountPercentage || 0).toFixed(2),
                    -parseFloat(bill.discountAmount || 0)
                ];

                if (showVatColumns) {
                    rowData.push(-parseFloat(bill.taxableAmount || 0));
                    rowData.push(-parseFloat(bill.vatAmount || 0));
                }

                rowData.push(-parseFloat(bill.roundOffAmount || 0));
                rowData.push(-parseFloat(bill.totalAmount || 0));
                rowData.push(bill.userName || '');

                excelData.push(rowData);
            });

            // Empty row before totals
            excelData.push([]);

            // Sales Totals row
            const salesTotalsRow = [
                '',
                '',
                '',
                '',
                '',
                'Sales Totals',
                '',
                formatCurrencyForExport(totals.subTotal),
                '',
                formatCurrencyForExport(totals.discount)
            ];

            if (showVatColumns) {
                salesTotalsRow.push(formatCurrencyForExport(totals.taxable));
                salesTotalsRow.push(formatCurrencyForExport(totals.vat));
            }

            salesTotalsRow.push(formatCurrencyForExport(totals.roundOff));
            salesTotalsRow.push(formatCurrencyForExport(totals.amount));
            salesTotalsRow.push('');

            excelData.push(salesTotalsRow);

            // Return Totals row
            const returnTotalsRow = [
                '',
                '',
                '',
                '',
                '',
                'Return Totals',
                '',
                formatCurrencyForExport(totals.returnSubTotal),
                '',
                formatCurrencyForExport(totals.returnDiscount)
            ];

            if (showVatColumns) {
                returnTotalsRow.push(formatCurrencyForExport(totals.returnTaxable));
                returnTotalsRow.push(formatCurrencyForExport(totals.returnVat));
            }

            returnTotalsRow.push(formatCurrencyForExport(totals.returnRoundOff));
            returnTotalsRow.push(formatCurrencyForExport(totals.returnAmount));
            returnTotalsRow.push('');

            excelData.push(returnTotalsRow);

            // Net Totals row
            const netTotalsRow = [
                '',
                '',
                '',
                '',
                '',
                'NET TOTALS',
                '',
                formatCurrencyForExport(totals.netSubTotal),
                '',
                formatCurrencyForExport(totals.netDiscount)
            ];

            if (showVatColumns) {
                netTotalsRow.push(formatCurrencyForExport(totals.netTaxable));
                netTotalsRow.push(formatCurrencyForExport(totals.netVat));
            }

            netTotalsRow.push(formatCurrencyForExport(totals.netRoundOff));
            netTotalsRow.push(formatCurrencyForExport(totals.netAmount));
            netTotalsRow.push('');

            excelData.push(netTotalsRow);

            // Create worksheet
            const ws = XLSX.utils.aoa_to_sheet(excelData);

            // Set column widths
            const colWidths = [
                { wch: 6 },   // S.No
                { wch: 14 },  // Miti
                { wch: 14 },  // Date
                { wch: 12 },  // Inv No.
                { wch: 30 },  // Party Name
                { wch: 8 },   // Type
                { wch: 10 },  // Pay Mode
                { wch: 14 },  // Sub Total
                { wch: 12 },  // Discount (%)
                { wch: 14 },  // Discount (Rs.)
            ];

            if (showVatColumns) {
                colWidths.push({ wch: 14 }); // Taxable
                colWidths.push({ wch: 12 }); // VAT
            }

            colWidths.push({ wch: 12 }); // Round Off
            colWidths.push({ wch: 14 }); // Total
            colWidths.push({ wch: 14 }); // User

            ws['!cols'] = colWidths;

            // Create workbook
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Sales Summary');

            // Generate filename
            const fileName = `Sales_Summary_${dateRange.fromDate}_to_${dateRange.toDate}_${currentDate}.xlsx`;
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

    const handleRowClick = useCallback((index) => {
        setSelectedRowIndex(index);
    }, []);

    const handleRowDoubleClick = useCallback((billId, type) => {
        if (type === 'Return') {
            navigate(`/retailer/sales-return/${billId}/print`);
        } else {
            navigate(`/retailer/sales/${billId}/print`);
        }
    }, [navigate]);

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

    const validateAndCorrectNepaliDate = (dateStr) => {
        if (!dateStr) return null;
        if (isValidNepaliDate(dateStr)) return dateStr;

        const match = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        if (match) {
            let [_, year, month, day] = match;
            month = parseInt(month, 10);
            day = parseInt(day, 10);

            if (month < 1) month = 1;
            if (month > 12) month = 12;
            if (day < 1) day = 1;
            if (day > 32) day = 32;

            const correctedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            if (isValidNepaliDate(correctedDate)) {
                return correctedDate;
            }
        }
        return null;
    };

    // Resize Handle Component
    const ResizeHandle = React.memo(({ onResizeStart, left, columnName }) => {
        return (
            <div
                className="ss-resize-handle"
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
        const totalWidth = Object.values(columnWidths).reduce((a, b) => a + b, 0);

        const handleResizeStart = (e, columnName) => {
            setIsResizing(true);
            setResizingColumn(columnName);
            setStartX(e.clientX);
            setStartWidth(columnWidths[columnName]);
            e.preventDefault();
        };

        return (
            <div
                className="ss-header"
                style={{
                    minWidth: `${totalWidth}px`,
                    zIndex: 2,
                    height: '28px'
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
                {/* BS Date */}
                <div className="ss-header-cell ss-cell--center" style={{ width: `${columnWidths.bsDate}px`, flexShrink: 0, minWidth: '80px' }}>
                    <strong>Miti</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.bsDate - 2} columnName="bsDate" />
                </div>

                {/* AD Date */}
                <div className="ss-header-cell ss-cell--center" style={{ width: `${columnWidths.adDate}px`, flexShrink: 0, minWidth: '80px' }}>
                    <strong>Date</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.adDate - 2} columnName="adDate" />
                </div>

                {/* Inv No. */}
                <div className="ss-header-cell" style={{ width: `${columnWidths.invNo}px`, flexShrink: 0, minWidth: '60px' }}>
                    <strong>Inv No.</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.invNo - 3} columnName="invNo" />
                </div>

                {/* Party Name */}
                <div className="ss-header-cell" style={{ width: `${columnWidths.partyName}px`, flexShrink: 0, minWidth: '100px' }}>
                    <strong>Party Name</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.partyName - 3} columnName="partyName" />
                </div>

                {/* Type */}
                <div className="ss-header-cell ss-cell--center" style={{ width: `${columnWidths.type}px`, flexShrink: 0, minWidth: '50px' }}>
                    <strong>Type</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.type - 2} columnName="type" />
                </div>

                {/* Pay Mode */}
                <div className="ss-header-cell" style={{ width: `${columnWidths.payMode}px`, flexShrink: 0, minWidth: '60px' }}>
                    <strong>Mode</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.payMode - 2} columnName="payMode" />
                </div>

                {/* Sub Total */}
                <div className="ss-header-cell ss-cell--end" style={{ width: `${columnWidths.subTotal}px`, flexShrink: 0, minWidth: '80px' }}>
                    <strong>Sub Total</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.subTotal - 2} columnName="subTotal" />
                </div>

                {/* Discount */}
                <div className="ss-header-cell ss-cell--end" style={{ width: `${columnWidths.discount}px`, flexShrink: 0, minWidth: '80px' }}>
                    <strong>Discount</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.discount - 2} columnName="discount" />
                </div>

                {/* Taxable */}
                <div className="ss-header-cell ss-cell--end" style={{ width: `${columnWidths.taxable}px`, flexShrink: 0, minWidth: '50px' }}>
                    <strong>Taxable</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.taxable - 1} columnName="taxable" />
                </div>

                {/* VAT */}
                <div className="ss-header-cell ss-cell--end" style={{ width: `${columnWidths.vat}px`, flexShrink: 0, minWidth: '60px' }}>
                    <strong>VAT</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.vat - 1} columnName="vat" />
                </div>

                {/* Round Off */}
                <div className="ss-header-cell ss-cell--end" style={{ width: `${columnWidths.roundOff}px`, flexShrink: 0, minWidth: '50px' }}>
                    <strong>Off(-/+)</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.roundOff - 2} columnName="roundOff" />
                </div>

                {/* Total */}
                <div className="ss-header-cell ss-cell--end" style={{ width: `${columnWidths.total}px`, flexShrink: 0, minWidth: '60px' }}>
                    <strong>Total</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.total - 2} columnName="total" />
                </div>

                {/* User */}
                <div className="ss-header-cell" style={{ width: `${columnWidths.user}px`, flexShrink: 0, minWidth: '60px' }}>
                    <strong>User</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.user - 2} columnName="user" />
                </div>

                {/* Actions */}
                <div className="ss-header-cell" style={{ width: `${columnWidths.actions}px`, flexShrink: 0, minWidth: '60px' }}>
                    <strong>Actions</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.actions - 2} columnName="actions" />
                </div>

                {isResizing && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, cursor: 'col-resize' }} />
                )}
            </div>
        );
    });

    // Table Row Component
    const TableRow = React.memo(({ index, style, data: rowData }) => {
        const { bills: rowBills, selectedRowIndex, formatCurrency, navigate, handleRowClick } = rowData;
        const bill = rowBills[index];

        const handleDoubleClick = () => {
            if (bill && bill.id) {
                if (bill.type === 'Return') {
                    navigate(`/retailer/sales-return/${bill.id}/print`);
                } else {
                    navigate(`/retailer/sales/${bill.id}/print`);
                }
            }
        };

        const handleViewClick = (e) => {
            e.stopPropagation();
            if (bill && bill.id) {
                if (bill.type === 'Return') {
                    navigate(`/retailer/sales-return/${bill.id}/print`);
                } else {
                    navigate(`/retailer/sales/${bill.id}/print`);
                }
            }
        };

        if (!bill) return null;

        const isSelected = selectedRowIndex === index;
        const isReturn = bill.type === 'Return';

        return (
            <div
                style={{
                    ...style,
                    display: 'flex',
                    alignItems: 'center',
                    height: '28px',
                    minHeight: '28px',
                    padding: '0',
                    borderBottom: '1px solid #e2e8f0',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? '#eff6ff' : (index % 2 === 0 ? '#f8fafc' : 'white')
                }}
                className="ss-row"
                onClick={() => handleRowClick(index)}
                onDoubleClick={handleDoubleClick}
            >
                {/* BS Date */}
                <div className="ss-cell ss-cell--center" style={{ width: `${columnWidths.bsDate}px`, flexShrink: 0, height: '100%' }}>
                    <span>{bill.nepaliDate || ''}</span>
                </div>

                {/* AD Date */}
                <div className="ss-cell ss-cell--center" style={{ width: `${columnWidths.adDate}px`, flexShrink: 0, height: '100%' }}>
                    <span>{bill.date ? new Date(bill.date).toLocaleDateString() : ''}</span>
                </div>

                {/* Inv No. */}
                <div className="ss-cell" style={{ width: `${columnWidths.invNo}px`, flexShrink: 0, height: '100%', overflow: 'hidden' }}>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bill.billNumber || ''}</span>
                </div>

                {/* Party Name */}
                <div className="ss-cell" style={{ width: `${columnWidths.partyName}px`, flexShrink: 0, height: '100%', overflow: 'hidden' }} title={bill.accountName || bill.cashAccount || 'N/A'}>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bill.accountName || bill.cashAccount || 'N/A'}</span>
                </div>

                {/* Type */}
                <div className="ss-cell ss-cell--center" style={{ width: `${columnWidths.type}px`, flexShrink: 0, height: '100%' }}>
                    <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 'bold',
                        color: isReturn ? '#dc2626' : '#059669',
                        backgroundColor: isReturn ? '#fef2f2' : '#f0fdf4',
                        padding: '1px 6px',
                        borderRadius: '3px',
                        border: `1px solid ${isReturn ? '#dc2626' : '#059669'}`
                    }}>
                        {isReturn ? 'RET' : 'SAL'}
                    </span>
                </div>

                {/* Pay Mode */}
                <div className="ss-cell" style={{ width: `${columnWidths.payMode}px`, flexShrink: 0, height: '100%' }}>
                    <span>{bill.paymentMode || ''}</span>
                </div>

                {/* Sub Total */}
                <div className="ss-cell ss-cell--end" style={{ width: `${columnWidths.subTotal}px`, flexShrink: 0, height: '100%' }}>
                    <span style={{ fontSize: '0.75rem', color: isReturn ? '#dc2626' : 'inherit' }}>
                        {isReturn ? '-' : ''}{formatCurrency(bill.subTotal)}
                    </span>
                </div>

                {/* Discount */}
                <div className="ss-cell ss-cell--end" style={{ width: `${columnWidths.discount}px`, flexShrink: 0, height: '100%' }}>
                    <span style={{ fontSize: '0.75rem', color: isReturn ? '#dc2626' : 'inherit' }}>
                        {isReturn ? '-' : ''}{(bill.discountPercentage || 0).toFixed(2)}% - {formatCurrency(bill.discountAmount)}
                    </span>
                </div>

                {/* Taxable */}
                <div className="ss-cell ss-cell--end" style={{ width: `${columnWidths.taxable}px`, flexShrink: 0, height: '100%' }}>
                    <span style={{ fontSize: '0.75rem', color: isReturn ? '#dc2626' : 'inherit' }}>
                        {isReturn ? '-' : ''}{formatCurrency(bill.taxableAmount)}
                    </span>
                </div>

                {/* VAT */}
                <div className="ss-cell ss-cell--end" style={{ width: `${columnWidths.vat}px`, flexShrink: 0, height: '100%' }}>
                    <span style={{ fontSize: '0.75rem', color: isReturn ? '#dc2626' : 'inherit' }}>
                        {isReturn ? '-' : ''}{formatCurrency(bill.vatAmount)}
                    </span>
                </div>

                {/* Round Off */}
                <div className="ss-cell ss-cell--end" style={{ width: `${columnWidths.roundOff}px`, flexShrink: 0, height: '100%' }}>
                    <span style={{ fontSize: '0.75rem', color: isReturn ? '#dc2626' : 'inherit' }}>
                        {isReturn ? '-' : ''}{formatCurrency(bill.roundOffAmount)}
                    </span>
                </div>

                {/* Total */}
                <div className="ss-cell ss-cell--end" style={{ width: `${columnWidths.total}px`, flexShrink: 0, height: '100%' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: isReturn ? 'bold' : 'normal', color: isReturn ? '#dc2626' : 'inherit' }}>
                        {isReturn ? '-' : ''}{formatCurrency(bill.totalAmount)}
                    </span>
                </div>

                {/* User */}
                <div className="ss-cell" style={{ width: `${columnWidths.user}px`, flexShrink: 0, height: '100%', overflow: 'hidden' }} title={bill.userName || 'N/A'}>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bill.userName || 'N/A'}</span>
                </div>

                {/* Actions */}
                <div className="ss-cell ss-cell--center" style={{ width: `${columnWidths.actions}px`, flexShrink: 0, height: '100%' }}>
                    <button
                        className="ss-btn-action ss-btn-action--info"
                        onClick={handleViewClick}
                        title="View"
                    >
                        <i className="bi bi-eye" />
                    </button>
                </div>
            </div>
        );
    }, (prevProps, nextProps) => {
        if (prevProps.index !== nextProps.index) return false;
        if (prevProps.style !== nextProps.style) return false;
        const prevBill = prevProps.data.bills[prevProps.index];
        const nextBill = nextProps.data.bills[nextProps.index];
        return shallowEqual(prevBill, nextBill) && prevProps.data.selectedRowIndex === nextProps.data.selectedRowIndex;
    });

    const resetColumnWidths = () => {
        setColumnWidths({
            bsDate: 80,
            adDate: 80,
            invNo: 90,
            partyName: 150,
            type: 60,
            payMode: 70,
            subTotal: 80,
            discount: 90,
            taxable: 70,
            vat: 70,
            roundOff: 70,
            total: 80,
            user: 80,
            actions: 70
        });
        setNotification({
            show: true,
            message: 'Column widths reset',
            type: 'success',
            duration: 2000
        });
    };

    // Safe check for loading and error states
    if (loading && combinedData.length === 0) return <Loader />;

    if (error) {
        return (
            <div className="ss-page">
                <Header />
                <div className="ss-shell">
                    <div className="ss-state">
                        <h3>Error</h3>
                        <p>{error}</p>
                    </div>
                </div>
            </div>
        );
    }

    const dataArray = Array.isArray(filteredData) ? filteredData : [];

    return (
        <div className="ss-page">
            <Header />

            <div className="ss-shell">
                {/* Top Bar */}
                <div className="ss-topbar">
                    <div className="ss-topbar__left">
                        <div className="ss-topbar__icon"><FiFileText /></div>
                        <div><h1>Sales Summary</h1></div>
                    </div>
                    <div className="ss-topbar__actions">
                        <button className="ss-btn-icon" onClick={handleExportExcel} disabled={filteredData.length === 0 || exporting}>
                            <FiDownload /> {exporting ? '…' : 'Excel'}
                        </button>
                        <button className="ss-btn-icon" onClick={() => handlePrint(true)} disabled={dataArray.length === 0}>
                            <FiPrinter /> Print
                        </button>
                        <button className="ss-btn-icon" onClick={resetColumnWidths} title="Reset columns">
                            <FiRefreshCw /> Reset
                        </button>
                    </div>
                </div>

                {/* Toolbar - Updated with always enabled search and filters */}
                <div className="ss-toolbar">
                    <div className="ss-field ss-field--date">
                        <label>From (BS) <span className="req">*</span></label>
                        <input
                            type="text"
                            id="fromDate"
                            ref={fromDateRef}
                            className={dateErrors.fromDate ? 'is-invalid' : ''}
                            value={dateRange.fromDate || ''}
                            onChange={(e) => {
                                const value = e.target.value.replace(/[^0-9/-]/g, '').slice(0, 10);
                                const adDate = convertBsToAd(value);
                                setDateRange(prev => ({
                                    ...prev,
                                    fromDate: value,
                                    fromDateAd: adDate || prev.fromDateAd
                                }));
                                setDateErrors(prev => ({ ...prev, fromDate: '' }));
                            }}
                            onKeyDown={(e) => handleKeyDown(e, 'fromDateAd')}
                            onBlur={(e) => {
                                const dateStr = e.target.value.trim();
                                if (!dateStr) return;
                                const correctedDate = validateAndCorrectNepaliDate(dateStr);
                                if (!correctedDate) {
                                    const fallbackDate = currentNepaliDate;
                                    const adDate = convertBsToAd(fallbackDate);
                                    setDateRange(prev => ({ ...prev, fromDate: fallbackDate, fromDateAd: adDate }));
                                    setNotification({ show: true, message: 'Invalid Nepali date. Auto-corrected.', type: 'warning' });
                                }
                            }}
                            placeholder="YYYY-MM-DD"
                            autoFocus
                            autoComplete="off"
                        />
                        {dateErrors.fromDate && <div className="ss-field-error">{dateErrors.fromDate}</div>}
                    </div>

                    <div className="ss-field ss-field--date">
                        <label>From (AD)</label>
                        <input
                            type="date"
                            id="fromDateAd"
                            value={dateRange.fromDateAd || ''}
                            onChange={(e) => {
                                const value = e.target.value;
                                const bsDate = convertAdToBs(value);
                                setDateRange(prev => ({
                                    ...prev,
                                    fromDateAd: value,
                                    fromDate: bsDate || prev.fromDate
                                }));
                            }}
                            onKeyDown={(e) => handleKeyDown(e, 'toDate')}
                        />
                    </div>

                    <div className="ss-field ss-field--date">
                        <label>To (BS) <span className="req">*</span></label>
                        <input
                            type="text"
                            id="toDate"
                            ref={toDateRef}
                            className={dateErrors.toDate ? 'is-invalid' : ''}
                            value={dateRange.toDate || ''}
                            onChange={(e) => {
                                const value = e.target.value.replace(/[^0-9/-]/g, '').slice(0, 10);
                                const adDate = convertBsToAd(value);
                                setDateRange(prev => ({
                                    ...prev,
                                    toDate: value,
                                    toDateAd: adDate || prev.toDateAd
                                }));
                                setDateErrors(prev => ({ ...prev, toDate: '' }));
                            }}
                            onKeyDown={(e) => handleKeyDown(e, 'toDateAd')}
                            onBlur={(e) => {
                                const dateStr = e.target.value.trim();
                                if (!dateStr) return;
                                const correctedDate = validateAndCorrectNepaliDate(dateStr);
                                if (!correctedDate) {
                                    const fallbackDate = currentNepaliDate;
                                    const adDate = convertBsToAd(fallbackDate);
                                    setDateRange(prev => ({ ...prev, toDate: fallbackDate, toDateAd: adDate }));
                                    setNotification({ show: true, message: 'Invalid Nepali date. Auto-corrected.', type: 'warning' });
                                }
                            }}
                            placeholder="YYYY-MM-DD"
                            autoComplete="off"
                        />
                        {dateErrors.toDate && <div className="ss-field-error">{dateErrors.toDate}</div>}
                    </div>

                    <div className="ss-field ss-field--date">
                        <label>To (AD)</label>
                        <input
                            type="date"
                            id="toDateAd"
                            value={dateRange.toDateAd || ''}
                            onChange={(e) => {
                                const value = e.target.value;
                                const bsDate = convertAdToBs(value);
                                setDateRange(prev => ({
                                    ...prev,
                                    toDateAd: value,
                                    toDate: bsDate || prev.toDate
                                }));
                            }}
                            onKeyDown={(e) => handleKeyDown(e, 'generateReport')}
                        />
                    </div>

                    <button type="button" id="generateReport" ref={generateReportRef} className="ss-btn-gen" onClick={handleGenerateReport} disabled={loading}>
                        {loading ? <span className="spinner-border spinner-border-sm" style={{ width: 12, height: 12 }} /> : <><FiSearch className="me-1" /> Generate</>}
                    </button>

                    <div className="ss-toolbar-divider" />

                    <div className="ss-field ss-field--search">
                        <label>Search</label>
                        <div className="ss-search-wrap">
                            <FiSearch className="ss-search-icon" />
                            <input
                                type="text"
                                id="searchInput"
                                ref={searchInputRef}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                autoComplete="off"
                            />
                            {searchQuery && <button className="ss-search-clear" onClick={() => setSearchQuery('')}>×</button>}
                        </div>
                    </div>

                    <div className="ss-field ss-field--select">
                        <label>Mode</label>
                        <select
                            id="paymentModeFilter"
                            ref={paymentModeFilterRef}
                            value={paymentModeFilter}
                            onChange={(e) => setPaymentModeFilter(e.target.value)}
                        >
                            <option value="">All</option>
                            <option value="cash">Cash</option>
                            <option value="credit">Credit</option>
                        </select>
                    </div>

                    <div className="ss-field ss-field--select">
                        <label>Type</label>
                        <select
                            id="typeFilter"
                            ref={typeFilterRef}
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                        >
                            <option value="all">All</option>
                            <option value="sales">Sales</option>
                            <option value="return">Return</option>
                        </select>
                    </div>
                </div>

                {error && (
                    <div className="ss-alert">
                        <i className="bi bi-exclamation-circle" />{error}
                        <button type="button" className="btn-close btn-sm ms-auto" onClick={() => setError(null)} />
                    </div>
                )}

                {/* Main Content */}
                <div className="ss-main">
                    {dataArray.length === 0 && !loading ? (
                        <div className="ss-state">
                            <FiCalendar size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                            <h3>Select date range & generate</h3>
                            <p>Choose a date range, then click Generate.</p>
                        </div>
                    ) : loading ? (
                        <div className="ss-state"><div className="spinner-border text-primary" /><p>Loading data...</p></div>
                    ) : dataArray.length === 0 ? (
                        <div className="ss-state">
                            <FiSearch size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                            <h3>No records found</h3>
                            <p>{searchQuery ? 'Try a different search term' : 'No data for the selected date range'}</p>
                        </div>
                    ) : (
                        <>
                            <div className="ss-main__bar">
                                <span><strong>{dataArray.length}</strong> records</span>
                                <span>{dateRange.fromDate} — {dateRange.toDate}</span>
                            </div>
                            <div className="ss-table-wrap" ref={tableBodyRef}>
                                <AutoSizer>
                                    {({ height, width }) => {
                                        const totalWidth = Object.values(columnWidths).reduce((a, b) => a + b, 0);

                                        return (
                                            <div style={{ position: 'relative', height: height, width: Math.max(width, totalWidth) }}>
                                                <TableHeader />
                                                <List
                                                    height={height - 28}
                                                    itemCount={dataArray.length}
                                                    itemSize={28}
                                                    width={Math.max(width, totalWidth)}
                                                    itemData={{
                                                        bills: dataArray,
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
                            </div>

                            {/* Footer with Net Totals */}
                            <div className="ss-footer">
                                <div className="ss-footer-cell" style={{ width: `${columnWidths.bsDate + columnWidths.adDate + columnWidths.invNo + columnWidths.partyName + columnWidths.type + columnWidths.payMode}px`, flexShrink: 0 }}>
                                    <strong>Net Totals:</strong>
                                </div>
                                <div className="ss-footer-cell ss-cell--end" style={{ width: `${columnWidths.subTotal}px`, flexShrink: 0 }}>
                                    <strong
                                        style={{ fontSize: '0.75rem', color: '#2563eb', cursor: 'help' }}
                                        title={`S: ${formatCurrency(totals.subTotal)} | R: ${formatCurrency(totals.returnSubTotal)}`}
                                    >
                                        {formatCurrency(totals.netSubTotal)}
                                    </strong>
                                </div>
                                <div className="ss-footer-cell ss-cell--end" style={{ width: `${columnWidths.discount}px`, flexShrink: 0 }}>
                                    <strong
                                        style={{ fontSize: '0.75rem', color: '#2563eb', cursor: 'help' }}
                                        title={`S: ${formatCurrency(totals.discount)} | R: ${formatCurrency(totals.returnDiscount)}`}
                                    >
                                        {formatCurrency(totals.netDiscount)}
                                    </strong>
                                </div>
                                <div className="ss-footer-cell ss-cell--end" style={{ width: `${columnWidths.taxable}px`, flexShrink: 0 }}>
                                    <strong
                                        style={{ fontSize: '0.75rem', color: '#2563eb', cursor: 'help' }}
                                        title={`S: ${formatCurrency(totals.taxable)} | R: ${formatCurrency(totals.returnTaxable)}`}
                                    >
                                        {formatCurrency(totals.netTaxable)}
                                    </strong>
                                </div>
                                <div className="ss-footer-cell ss-cell--end" style={{ width: `${columnWidths.vat}px`, flexShrink: 0 }}>
                                    <strong
                                        style={{ fontSize: '0.75rem', color: '#2563eb', cursor: 'help' }}
                                        title={`S: ${formatCurrency(totals.vat)} | R: ${formatCurrency(totals.returnVat)}`}
                                    >
                                        {formatCurrency(totals.netVat)}
                                    </strong>
                                </div>
                                <div className="ss-footer-cell ss-cell--end" style={{ width: `${columnWidths.roundOff}px`, flexShrink: 0 }}>
                                    <strong
                                        style={{ fontSize: '0.75rem', color: '#2563eb', cursor: 'help' }}
                                        title={`S: ${formatCurrency(totals.roundOff)} | R: ${formatCurrency(totals.returnRoundOff)}`}
                                    >
                                        {formatCurrency(totals.netRoundOff)}
                                    </strong>
                                </div>
                                <div className="ss-footer-cell ss-cell--end" style={{ width: `${columnWidths.total}px`, flexShrink: 0 }}>
                                    <strong
                                        style={{ fontSize: '0.75rem', color: '#2563eb', cursor: 'help' }}
                                        title={`S: ${formatCurrency(totals.amount)} | R: ${formatCurrency(totals.returnAmount)}`}
                                    >
                                        {formatCurrency(totals.netAmount)}
                                    </strong>
                                </div>
                                <div className="ss-footer-cell" style={{ width: `${columnWidths.user + columnWidths.actions}px`, flexShrink: 0 }}>
                                    <span style={{ fontSize: '0.6rem', color: '#64748b' }}>
                                        {dataArray.length} records
                                    </span>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Product modal */}
            {showProductModal && <ProductModal onClose={() => setShowProductModal(false)} />}

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

export default SalesSummary;