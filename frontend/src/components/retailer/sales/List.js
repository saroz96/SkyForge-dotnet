import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../../../stylesheet/retailer/sales/List.css';
import Header from '../Header';
import NepaliDate from 'nepali-datetime';
import { usePageNotRefreshContext } from '../PageNotRefreshContext';
import '../../../stylesheet/noDateIcon.css';
import Loader from '../../Loader';
import ProductModal from '../dashboard/modals/ProductModal';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import * as XLSX from 'xlsx';

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

const SalesBillsList = () => {
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

    // SPLIT STATE: Separate date range from bills and company info
    const [dateRange, setDateRange] = useState(() => {
        if (draftSave && draftSave.salesBillsData) {
            return {
                fromDate: draftSave.salesBillsData.fromDate || '',
                toDate: draftSave.salesBillsData.toDate || '',
                fromDateAd: draftSave.salesBillsData.fromDateAd || '',
                toDateAd: draftSave.salesBillsData.toDateAd || ''
            };
        }
        return {
            fromDate: '',
            toDate: '',
            fromDateAd: '',
            toDateAd: ''
        };
    });

    const [bills, setBills] = useState(() => {
        if (draftSave && draftSave.salesBillsData) {
            return draftSave.salesBillsData.bills || [];
        }
        return [];
    });

    const [companyInfo, setCompanyInfo] = useState(() => {
        if (draftSave && draftSave.salesBillsData) {
            return {
                company: draftSave.salesBillsData.company,
                currentFiscalYear: draftSave.salesBillsData.currentFiscalYear,
                currentCompanyName: draftSave.salesBillsData.currentCompanyName || '',
                companyDateFormat: draftSave.salesBillsData.companyDateFormat || 'english',
                vatEnabled: draftSave.salesBillsData.vatEnabled !== undefined ? draftSave.salesBillsData.vatEnabled : true,
                isVatExempt: draftSave.salesBillsData.isVatExempt || false,
                isAdminOrSupervisor: draftSave.salesBillsData.isAdminOrSupervisor || false
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
        if (draftSave && draftSave.salesBillsSearch) {
            return draftSave.salesBillsSearch.searchQuery || '';
        }
        return '';
    });

    const [paymentModeFilter, setPaymentModeFilter] = useState(() => {
        if (draftSave && draftSave.salesBillsSearch) {
            return draftSave.salesBillsSearch.paymentModeFilter || '';
        }
        return '';
    });

    const [selectedRowIndex, setSelectedRowIndex] = useState(() => {
        if (draftSave && draftSave.salesBillsSearch) {
            return draftSave.salesBillsSearch.selectedRowIndex || 0;
        }
        return 0;
    });

    // Column resizing state - Updated with separate BS and AD date columns
    const [columnWidths, setColumnWidths] = useState({
        bsDate: 80,
        adDate: 80,
        invNo: 100,
        partyName: 150,
        payMode: 70,
        subTotal: 80,
        discount: 100,
        taxable: 70,
        vat: 70,
        roundOff: 80,
        total: 100,
        user: 100,
        actions: 120
    });

    const [isResizing, setIsResizing] = useState(false);
    const [resizingColumn, setResizingColumn] = useState(null);
    const [startX, setStartX] = useState(0);
    const [startWidth, setStartWidth] = useState(0);

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

    // Fetch company and fiscal year info - RUNS ONLY ONCE on mount
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
                    const hasDraftDates = draftSave?.salesBillsData?.fromDate &&
                        draftSave?.salesBillsData?.toDate;

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
                    } else if (hasDraftDates) {
                        let fromDateAd = dateRange.fromDate;
                        let toDateAd = dateRange.toDate;
                        if (isNepaliFormat && dateRange.fromDate) {
                            fromDateAd = convertBsToAd(dateRange.fromDate);
                            toDateAd = convertBsToAd(dateRange.toDate);
                        }
                        setDateRange(prev => ({
                            ...prev,
                            fromDateAd: fromDateAd || prev.fromDateAd,
                            toDateAd: toDateAd || prev.toDateAd
                        }));
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

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [totals, setTotals] = useState({
        subTotal: 0,
        discount: 0,
        taxable: 0,
        vat: 0,
        roundOff: 0,
        amount: 0
    });
    const [filteredBills, setFilteredBills] = useState([]);

    const fromDateRef = useRef(null);
    const toDateRef = useRef(null);
    const searchInputRef = useRef(null);
    const paymentModeFilterRef = useRef(null);
    const generateReportRef = useRef(null);
    const tableBodyRef = useRef(null);
    const [shouldFetch, setShouldFetch] = useState(false);
    const navigate = useNavigate();

    // Save data and search state to draft context
    useEffect(() => {
        setDraftSave({
            ...draftSave,
            salesBillsData: {
                ...companyInfo,
                bills: bills,
                fromDate: dateRange.fromDate,
                toDate: dateRange.toDate,
                fromDateAd: dateRange.fromDateAd,
                toDateAd: dateRange.toDateAd
            },
            salesBillsSearch: {
                searchQuery,
                paymentModeFilter,
                selectedRowIndex,
                fromDate: dateRange.fromDate,
                toDate: dateRange.toDate
            }
        });
    }, [bills, searchQuery, paymentModeFilter, selectedRowIndex, dateRange.fromDate, dateRange.toDate, dateRange.fromDateAd, dateRange.toDateAd, companyInfo]);

    // Save/load column widths
    useEffect(() => {
        const savedWidths = localStorage.getItem('salesBillsTableColumnWidths');
        if (savedWidths) {
            try {
                setColumnWidths(JSON.parse(savedWidths));
            } catch (e) {
                console.error('Failed to load column widths:', e);
            }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('salesBillsTableColumnWidths', JSON.stringify(columnWidths));
    }, [columnWidths]);

    // Fetch data when generate report is clicked - ONLY UPDATES BILLS, NOT INPUT FIELDS
    useEffect(() => {
        const abortController = new AbortController();

        const fetchData = async () => {
            if (!shouldFetch) return;

            try {
                setLoading(true);
                const params = new URLSearchParams();
                // Use AD dates for API call
                if (dateRange.fromDateAd) params.append('fromDate', dateRange.fromDateAd);
                if (dateRange.toDateAd) params.append('toDate', dateRange.toDateAd);

                const response = await api.get(`/api/retailer/sales-register?${params.toString()}`, {
                    signal: abortController.signal
                });

                if (response.data.success) {
                    // ONLY update bills - keep everything else unchanged
                    setBills(response.data.data.bills || []);
                    // Update company info only if needed
                    if (response.data.data.vatEnabled !== undefined) {
                        setCompanyInfo(prev => ({
                            ...prev,
                            vatEnabled: response.data.data.vatEnabled,
                            isVatExempt: response.data.data.isVatExempt || false
                        }));
                    }
                    setError(null);
                } else {
                    setError(response.data.error || 'Failed to fetch sales bills');
                }

                if (!draftSave?.salesBillsSearch?.selectedRowIndex) {
                    setSelectedRowIndex(0);
                }
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error('Fetch error:', err);
                    setError(err.response?.data?.error || 'Failed to fetch sales bills');
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

    // Filter bills based on search and payment mode
    useEffect(() => {
        const billsArray = Array.isArray(bills) ? bills : [];

        const filtered = billsArray.filter(bill => {
            const matchesSearch =
                (bill.billNumber?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                (bill.accountName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                (bill.cashAccount?.toLowerCase() || '').includes(searchQuery.toLowerCase());

            const matchesPaymentMode =
                paymentModeFilter === '' ||
                (bill.paymentMode?.toLowerCase() || '') === paymentModeFilter.toLowerCase();

            return matchesSearch && matchesPaymentMode;
        });

        setFilteredBills(filtered);

        if (selectedRowIndex >= filtered.length && filtered.length > 0) {
            setSelectedRowIndex(0);
        }
    }, [bills, searchQuery, paymentModeFilter]);

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

    // Calculate totals when filtered bills change
    useEffect(() => {
        if (filteredBills.length === 0) {
            setTotals({
                subTotal: 0,
                discount: 0,
                taxable: 0,
                vat: 0,
                roundOff: 0,
                amount: 0
            });
            return;
        }

        const newTotals = filteredBills.reduce((acc, bill) => {
            return {
                subTotal: acc.subTotal + (bill.subTotal || 0),
                discount: acc.discount + (bill.discountAmount || 0),
                taxable: acc.taxable + (bill.taxableAmount || 0),
                vat: acc.vat + (bill.vatAmount || 0),
                roundOff: acc.roundOff + (bill.roundOffAmount || 0),
                amount: acc.amount + (bill.totalAmount || 0)
            };
        }, {
            subTotal: 0,
            discount: 0,
            taxable: 0,
            vat: 0,
            roundOff: 0,
            amount: 0
        });

        setTotals(newTotals);
    }, [filteredBills]);

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (filteredBills.length === 0) return;

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
                    setSelectedRowIndex(prev => Math.min(filteredBills.length - 1, prev + 1));
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [filteredBills]);

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
            return;
        }
        setShouldFetch(true);
    };

    const handlePrint = (filtered = false) => {
        const rowsToPrint = filtered ? filteredBills : (Array.isArray(bills) ? bills : []);
        const vatEnabled = companyInfo.vatEnabled;
        const isVatExempt = companyInfo.isVatExempt;
        const showVatColumns = vatEnabled && !isVatExempt;

        if (rowsToPrint.length === 0) {
            alert("No bills to print");
            return;
        }

        const printWindow = window.open("", "_blank");
        const printHeader = `
    <div class="print-header">
        <h1 style="font-size: 14px; margin: 0;">${companyInfo.currentCompanyName || 'Company Name'}</h1>
        <p style="font-size: 8px; margin: 2px 0;">
            ${companyInfo.company?.address || ''}${companyInfo.company?.city ? ', ' + companyInfo.company.city : ''},
            PAN: ${companyInfo.company?.pan || ''}<br>
        </p>
        <hr style="margin: 2px 0;">
    </div>
    `;

        let tableContent = `
    <style>
        @page {
            margin: 3mm;
        }
        body { 
            font-family: Arial, sans-serif; 
            font-size: 7px; 
            margin: 0;
            padding: 2mm;
        }
        table { 
            width: 100%; 
            border-collapse: collapse; 
            page-break-inside: auto;
            font-size: 6px;
        }
        tr { 
            page-break-inside: avoid; 
            page-break-after: auto; 
        }
        th, td { 
            border: 1px solid #000; 
            padding: 2px 3px; 
            text-align: left; 
            white-space: nowrap;
        }
        th { 
            background-color: #f2f2f2 !important; 
            -webkit-print-color-adjust: exact;
            font-size: 10px;
            font-weight: bold;
            padding: 3px 3px;
        }
        td {
            font-size: 8px;
            padding: 2px 3px;
        }
        .print-header { 
            text-align: center; 
            margin-bottom: 5px; 
        }
        .nowrap {
            white-space: nowrap;
        }
        h1 {
            font-size: 14px;
            margin: 0;
        }
        .report-title {
            text-align: center;
            text-decoration: underline;
            font-size: 11px;
            font-weight: bold;
            margin: 3px 0;
        }
        .grand-total-row td {
            font-weight: bold;
            border-top: 2px solid #000;
            font-size: 7px;
        }
    </style>
    ${printHeader}
    <div class="report-title">Sales Voucher's Register</div>
    <table>
        <thead>
            <tr>
                <th class="nowrap">Miti</th>
                <th class="nowrap">Date</th>
                <th class="nowrap">Inv No.</th>
                <th class="nowrap">Party Name</th>
                <th class="nowrap">Pay Mode</th>
                <th class="nowrap">Sub Total</th>
                <th class="nowrap">Discount</th>
                ${showVatColumns ? `
                <th class="nowrap">Taxable</th>
                <th class="nowrap">VAT</th>
                ` : ''}
                <th class="nowrap">Off(-/+)</th>
                <th class="nowrap">Total</th>
                <th class="nowrap">User</th>
            </tr>
        </thead>
        <tbody>
    `;

        let printTotals = {
            subTotal: 0,
            discount: 0,
            taxable: 0,
            vat: 0,
            roundOff: 0,
            amount: 0
        };

        rowsToPrint.forEach(bill => {
            tableContent += `
        <tr>
            <td class="nowrap">${bill.nepaliDate || ''}</td>
            <td class="nowrap">${bill.date ? new Date(bill.date).toLocaleDateString('en-CA') : ''}</td>
            <td class="nowrap">${bill.billNumber || ''}</td>
            <td class="nowrap">${bill.accountName || bill.cashAccount || 'N/A'}</td>
            <td class="nowrap">${bill.paymentMode || ''}</td>
            <td class="nowrap" style="text-align: right;">${(bill.subTotal || 0).toFixed(2)}</td>
            <td class="nowrap" style="text-align: right;">${(bill.discountPercentage || 0).toFixed(2)}% - ${(bill.discountAmount || 0).toFixed(2)}</td>
            ${showVatColumns ? `
            <td class="nowrap" style="text-align: right;">${(bill.taxableAmount || 0).toFixed(2)}</td>
            <td class="nowrap" style="text-align: right;">${(bill.vatAmount || 0).toFixed(2)}</td>
            ` : ''}
            <td class="nowrap" style="text-align: right;">${(bill.roundOffAmount || 0).toFixed(2)}</td>
            <td class="nowrap" style="text-align: right;">${(bill.totalAmount || 0).toFixed(2)}</td>
            <td class="nowrap">${bill.userName || 'N/A'}</td>
        </tr>
        `;

            printTotals.subTotal += parseFloat(bill.subTotal || 0);
            printTotals.discount += parseFloat(bill.discountAmount || 0);
            printTotals.taxable += parseFloat(bill.taxableAmount || 0);
            printTotals.vat += parseFloat(bill.vatAmount || 0);
            printTotals.roundOff += parseFloat(bill.roundOffAmount || 0);
            printTotals.amount += parseFloat(bill.totalAmount || 0);
        });

        tableContent += `
        <tr class="grand-total-row" style="font-weight:bold;">
            <td colspan="5" style="font-weight: bold;">Grand Totals</td>
            <td style="text-align: right; font-weight: bold;">${printTotals.subTotal.toFixed(2)}</td>
            <td style="text-align: right; font-weight: bold;">${printTotals.discount.toFixed(2)}</td>
            ${showVatColumns ? `
            <td style="text-align: right; font-weight: bold;">${printTotals.taxable.toFixed(2)}</td>
            <td style="text-align: right; font-weight: bold;">${printTotals.vat.toFixed(2)}</td>
            ` : ''}
            <td style="text-align: right; font-weight: bold;">${printTotals.roundOff.toFixed(2)}</td>
            <td style="text-align: right; font-weight: bold;">${printTotals.amount.toFixed(2)}</td>
            <td></td>
        </tr>
        </tbody>
    </table>
    `;

        printWindow.document.write(`
    <!DOCTYPE html>
    <html>
        <head>
            <title>Sales Voucher's Register</title>
            <meta charset="UTF-8">
        </head>
        <body>
            ${tableContent}
            <script>
                window.onload = function() {
                    setTimeout(function() {
                        window.print();
                        window.close();
                    }, 200);
                };
            <\/script>
        </body>
    </html>
    `);
        printWindow.document.close();
    };

    const formatCurrency = useCallback((num) => {
        const number = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num) || 0;
        return number.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }, []);

    // Add this function for Excel export formatting
    const formatCurrencyForExport = (num) => {
        const number = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num) || 0;
        return number.toFixed(2);
    };

    // Add the handleExportExcel function
    const handleExportExcel = async () => {
        if (!filteredBills || filteredBills.length === 0) {
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
            excelData.push(['Sales Voucher\'s Register']);
            excelData.push(['Company:', companyInfo.currentCompanyName || 'N/A']);
            excelData.push(['Address:', companyInfo.company?.address || '', companyInfo.company?.city ? ', ' + companyInfo.company?.city : '']);
            excelData.push(['PAN:', companyInfo.company?.pan || '']);
            excelData.push(['From Date (BS):', dateRange.fromDate]);
            excelData.push(['To Date (BS):', dateRange.toDate]);
            excelData.push(['From Date (AD):', dateRange.fromDateAd]);
            excelData.push(['To Date (AD):', dateRange.toDateAd]);
            excelData.push(['Total Bills:', filteredBills.length]);
            if (searchQuery) excelData.push(['Search:', searchQuery]);
            if (paymentModeFilter) excelData.push(['Payment Mode Filter:', paymentModeFilter === 'cash' ? 'Cash' : paymentModeFilter === 'credit' ? 'Credit' : 'All']);
            excelData.push(['Export Date:', new Date().toLocaleString()]);
            excelData.push([]); // Empty row for spacing

            // Headers
            const headers = [
                'S.No',
                'Miti',
                'Date',
                'Inv No.',
                'Party Name',
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

            // Data rows
            let totalSubTotal = 0;
            let totalDiscount = 0;
            let totalTaxable = 0;
            let totalVat = 0;
            let totalRoundOff = 0;
            let totalAmount = 0;

            filteredBills.forEach((bill, index) => {
                const rowData = [
                    index + 1,
                    bill.nepaliDate || '',
                    bill.date ? new Date(bill.date).toLocaleDateString() : '',
                    bill.billNumber || '',
                    bill.accountName || bill.cashAccount || 'N/A',
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

                // Accumulate totals
                totalSubTotal += parseFloat(bill.subTotal || 0);
                totalDiscount += parseFloat(bill.discountAmount || 0);
                totalTaxable += parseFloat(bill.taxableAmount || 0);
                totalVat += parseFloat(bill.vatAmount || 0);
                totalRoundOff += parseFloat(bill.roundOffAmount || 0);
                totalAmount += parseFloat(bill.totalAmount || 0);
            });

            // Empty row before totals
            excelData.push([]);

            // Totals row
            const totalsRow = [
                '',
                '',
                '',
                '',
                'TOTALS',
                '',
                formatCurrencyForExport(totalSubTotal),
                '',
                formatCurrencyForExport(totalDiscount)
            ];

            if (showVatColumns) {
                totalsRow.push(formatCurrencyForExport(totalTaxable));
                totalsRow.push(formatCurrencyForExport(totalVat));
            }

            totalsRow.push(formatCurrencyForExport(totalRoundOff));
            totalsRow.push(formatCurrencyForExport(totalAmount));
            totalsRow.push('');

            excelData.push(totalsRow);

            // Create worksheet
            const ws = XLSX.utils.aoa_to_sheet(excelData);

            // Set column widths
            const colWidths = [
                { wch: 6 },   // S.No
                { wch: 14 },  // Miti
                { wch: 14 },  // Date
                { wch: 12 },  // Inv No.
                { wch: 30 },  // Party Name
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

            // Apply formatting to header rows
            const headerRows = 12; // Number of header rows
            for (let row = 0; row < headerRows; row++) {
                for (let col = 0; col < excelData[row].length; col++) {
                    const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
                    if (ws[cellRef]) {
                        ws[cellRef].s = {
                            font: {
                                bold: row === 0 || row === 1 || row === 2 || row === 3,
                                size: row === 0 ? 14 : 10
                            },
                            alignment: {
                                horizontal: row === 0 ? 'center' : 'left',
                                vertical: 'center'
                            }
                        };
                    }
                }
            }

            // Apply formatting to data rows and totals
            const dataStartRow = headerRows;
            const dataEndRow = excelData.length - 1;

            for (let row = dataStartRow; row <= dataEndRow; row++) {
                const isTotalsRow = row === dataEndRow;
                for (let col = 0; col < excelData[row].length; col++) {
                    const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
                    if (ws[cellRef]) {
                        // Numeric columns
                        const numericColumns = [6, 8, 9, 10, 11, 12];
                        const isNumeric = numericColumns.includes(col) ||
                            (showVatColumns && (col === 9 || col === 10)) ||
                            (col === (showVatColumns ? 11 : 9) || col === (showVatColumns ? 12 : 10));

                        if (isNumeric && row > headerRows) {
                            ws[cellRef].s = {
                                font: {
                                    bold: isTotalsRow
                                },
                                alignment: {
                                    horizontal: 'right',
                                    vertical: 'center'
                                },
                                numFmt: '#,##0.00'
                            };
                        } else {
                            ws[cellRef].s = {
                                font: {
                                    bold: isTotalsRow
                                },
                                alignment: {
                                    horizontal: col === 0 || col === 4 ? 'left' : 'center',
                                    vertical: 'center'
                                }
                            };
                        }
                    }
                }
            }

            // Highlight totals row
            const totalsRowIndex = dataEndRow;
            for (let col = 0; col < excelData[totalsRowIndex].length; col++) {
                const cellRef = XLSX.utils.encode_cell({ r: totalsRowIndex, c: col });
                if (ws[cellRef]) {
                    ws[cellRef].s = {
                        ...ws[cellRef].s,
                        font: {
                            bold: true,
                            size: 11
                        },
                        fill: {
                            fgColor: { rgb: "E8E8E8" }
                        }
                    };
                }
            }

            // Create workbook
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Sales Register');

            // Generate filename
            const fileName = `Sales_Register_${dateRange.fromDate}_to_${dateRange.toDate}_${currentDate}.xlsx`;
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

    const handleRowDoubleClick = useCallback((billId) => {
        if (filteredBills[selectedRowIndex]) {
            navigate(`/retailer/sales/${filteredBills[selectedRowIndex].id}/print`);
        }
    }, [navigate, filteredBills, selectedRowIndex]);

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

    // Table Header Component - Updated with BS Date and AD Date columns
    const TableHeader = React.memo(() => {
        const showVatColumns = companyInfo.vatEnabled && !companyInfo.isVatExempt;

        const totalWidth = columnWidths.bsDate + columnWidths.adDate + columnWidths.invNo +
            columnWidths.partyName + columnWidths.payMode + columnWidths.subTotal +
            columnWidths.discount + columnWidths.roundOff + columnWidths.total +
            columnWidths.user + columnWidths.actions +
            (showVatColumns ? (columnWidths.taxable + columnWidths.vat) : 0);

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
                {/* BS Date */}
                <div className="d-flex align-items-center justify-content-center px-1 border-end position-relative" style={{ width: `${columnWidths.bsDate}px`, flexShrink: 0, minWidth: '80px' }}>
                    <strong style={{ fontSize: '0.75rem' }}>Miti</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.bsDate - 2} columnName="bsDate" />
                </div>

                {/* AD Date */}
                <div className="d-flex align-items-center justify-content-center px-1 border-end position-relative" style={{ width: `${columnWidths.adDate}px`, flexShrink: 0, minWidth: '80px' }}>
                    <strong style={{ fontSize: '0.75rem' }}>Date</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.adDate - 2} columnName="adDate" />
                </div>

                {/* Inv No. */}
                <div className="d-flex align-items-center px-1 border-end position-relative" style={{ width: `${columnWidths.invNo}px`, flexShrink: 0, minWidth: '60px' }}>
                    <strong style={{ fontSize: '0.75rem' }}>Inv No.</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.invNo - 3} columnName="invNo" />
                </div>

                {/* Party Name */}
                <div className="d-flex align-items-center px-1 border-end position-relative" style={{ width: `${columnWidths.partyName}px`, flexShrink: 0, minWidth: '100px' }}>
                    <strong style={{ fontSize: '0.75rem' }}>Party Name</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.partyName - 3} columnName="partyName" />
                </div>

                {/* Pay Mode */}
                <div className="d-flex align-items-center px-1 border-end position-relative" style={{ width: `${columnWidths.payMode}px`, flexShrink: 0, minWidth: '60px' }}>
                    <strong style={{ fontSize: '0.75rem' }}>Pay Mode</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.payMode - 2} columnName="payMode" />
                </div>

                {/* Sub Total */}
                <div className="d-flex align-items-center justify-content-end px-1 border-end position-relative" style={{ width: `${columnWidths.subTotal}px`, flexShrink: 0, minWidth: '80px' }}>
                    <strong style={{ fontSize: '0.75rem' }}>Sub Total</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.subTotal - 2} columnName="subTotal" />
                </div>

                {/* Discount */}
                <div className="d-flex align-items-center justify-content-end px-1 border-end position-relative" style={{ width: `${columnWidths.discount}px`, flexShrink: 0, minWidth: '80px' }}>
                    <strong style={{ fontSize: '0.75rem' }}>Discount</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.discount - 2} columnName="discount" />
                </div>

                {showVatColumns && (
                    <>
                        <div className="d-flex align-items-center justify-content-end px-1 border-end position-relative" style={{ width: `${columnWidths.taxable}px`, flexShrink: 0, minWidth: '50px' }}>
                            <strong style={{ fontSize: '0.75rem' }}>Taxable</strong>
                            <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.taxable - 1} columnName="taxable" />
                        </div>
                        <div className="d-flex align-items-center justify-content-end px-1 border-end position-relative" style={{ width: `${columnWidths.vat}px`, flexShrink: 0, minWidth: '60px' }}>
                            <strong style={{ fontSize: '0.75rem' }}>VAT</strong>
                            <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.vat - 1} columnName="vat" />
                        </div>
                    </>
                )}

                {/* Round Off */}
                <div className="d-flex align-items-center justify-content-end px-1 border-end position-relative" style={{ width: `${columnWidths.roundOff}px`, flexShrink: 0, minWidth: '80px' }}>
                    <strong style={{ fontSize: '0.75rem' }}>Off(-/+)</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.roundOff - 2} columnName="roundOff" />
                </div>

                {/* Total */}
                <div className="d-flex align-items-center justify-content-end px-1 border-end position-relative" style={{ width: `${columnWidths.total}px`, flexShrink: 0, minWidth: '80px' }}>
                    <strong style={{ fontSize: '0.75rem' }}>Total</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.total - 2} columnName="total" />
                </div>

                {/* User */}
                <div className="d-flex align-items-center px-1 border-end position-relative" style={{ width: `${columnWidths.user}px`, flexShrink: 0, minWidth: '80px' }}>
                    <strong style={{ fontSize: '0.75rem' }}>User</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.user - 2} columnName="user" />
                </div>

                {/* Actions */}
                <div className="d-flex align-items-center px-1 position-relative" style={{ width: `${columnWidths.actions}px`, flexShrink: 0, minWidth: '100px' }}>
                    <strong style={{ fontSize: '0.75rem' }}>Actions</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.actions - 2} columnName="actions" />
                </div>

                {isResizing && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, cursor: 'col-resize' }} />
                )}
            </div>
        );
    });

    // Table Row Component - Updated with BS Date and AD Date columns
    const TableRow = React.memo(({ index, style, data: rowData }) => {
        const { bills: rowBills, selectedRowIndex, formatCurrency, navigate } = rowData;
        const bill = rowBills[index];

        const handleRowClick = () => {
            rowData.handleRowClick(index);
        };

        const handleDoubleClick = () => {
            if (bill && bill.id) {
                navigate(`/retailer/sales/${bill.id}/print`);
            }
        };

        const handleViewClick = (e) => {
            e.stopPropagation();
            if (bill && bill.id) {
                navigate(`/retailer/sales/${bill.id}/print`);
            }
        };

        const handleEditClick = (e) => {
            e.stopPropagation();
            if (bill && bill.id) {
                if (bill.accountId) {
                    navigate(`/retailer/credit-sales/edit/${bill.id}`);
                } else if (bill.cashAccount) {
                    navigate(`/retailer/cash-sales/edit/${bill.id}`);
                }
            }
        };

        if (!bill) return null;

        const isSelected = selectedRowIndex === index;
        const showVatColumns = companyInfo.vatEnabled && !companyInfo.isVatExempt;

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
                {/* BS Date */}
                <div className="d-flex align-items-center justify-content-center px-1 border-end" style={{ width: `${columnWidths.bsDate}px`, flexShrink: 0, height: '100%' }}>
                    <span style={{ fontSize: '0.75rem' }}>{bill.nepaliDate || ''}</span>
                </div>

                {/* AD Date */}
                <div className="d-flex align-items-center justify-content-center px-1 border-end" style={{ width: `${columnWidths.adDate}px`, flexShrink: 0, height: '100%' }}>
                    <span style={{ fontSize: '0.75rem' }}>{bill.date ? new Date(bill.date).toLocaleDateString() : ''}</span>
                </div>

                {/* Inv No. */}
                <div className="d-flex align-items-center px-1 border-end" style={{ width: `${columnWidths.invNo}px`, flexShrink: 0, height: '100%', overflow: 'hidden' }}>
                    <span style={{ fontSize: '0.75rem' }}>{bill.billNumber || ''}</span>
                </div>

                {/* Party Name */}
                <div className="d-flex align-items-center px-1 border-end" style={{ width: `${columnWidths.partyName}px`, flexShrink: 0, height: '100%', overflow: 'hidden' }} title={bill.accountName || bill.cashAccount || 'N/A'}>
                    <span style={{ fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bill.accountName || bill.cashAccount || 'N/A'}</span>
                </div>

                {/* Pay Mode */}
                <div className="d-flex align-items-center px-1 border-end" style={{ width: `${columnWidths.payMode}px`, flexShrink: 0, height: '100%' }}>
                    <span style={{ fontSize: '0.75rem' }}>{bill.paymentMode || ''}</span>
                </div>

                {/* Sub Total */}
                <div className="d-flex align-items-center justify-content-end px-1 border-end" style={{ width: `${columnWidths.subTotal}px`, flexShrink: 0, height: '100%' }}>
                    <span style={{ fontSize: '0.75rem' }}>{formatCurrency(bill.subTotal)}</span>
                </div>

                {/* Discount */}
                <div className="d-flex align-items-center justify-content-end px-1 border-end" style={{ width: `${columnWidths.discount}px`, flexShrink: 0, height: '100%' }}>
                    <span style={{ fontSize: '0.75rem' }}>{(bill.discountPercentage || 0).toFixed(2)}% - {formatCurrency(bill.discountAmount)}</span>
                </div>

                {showVatColumns && (
                    <>
                        <div className="d-flex align-items-center justify-content-end px-1 border-end" style={{ width: `${columnWidths.taxable}px`, flexShrink: 0, height: '100%' }}>
                            <span style={{ fontSize: '0.75rem' }}>{formatCurrency(bill.taxableAmount)}</span>
                        </div>
                        <div className="d-flex align-items-center justify-content-end px-1 border-end" style={{ width: `${columnWidths.vat}px`, flexShrink: 0, height: '100%' }}>
                            <span style={{ fontSize: '0.75rem' }}>{formatCurrency(bill.vatAmount)}</span>
                        </div>
                    </>
                )}

                {/* Round Off */}
                <div className="d-flex align-items-center justify-content-end px-1 border-end" style={{ width: `${columnWidths.roundOff}px`, flexShrink: 0, height: '100%' }}>
                    <span style={{ fontSize: '0.75rem' }}>{formatCurrency(bill.roundOffAmount)}</span>
                </div>

                {/* Total */}
                <div className="d-flex align-items-center justify-content-end px-1 border-end" style={{ width: `${columnWidths.total}px`, flexShrink: 0, height: '100%' }}>
                    <span style={{ fontSize: '0.75rem' }}>{formatCurrency(bill.totalAmount)}</span>
                </div>

                {/* User */}
                <div className="d-flex align-items-center px-1 border-end" style={{ width: `${columnWidths.user}px`, flexShrink: 0, height: '100%', overflow: 'hidden' }} title={bill.userName || 'N/A'}>
                    <span style={{ fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bill.userName || 'N/A'}</span>
                </div>

                {/* Actions */}
                <div className="d-flex align-items-center justify-content-center px-1 gap-1" style={{ width: `${columnWidths.actions}px`, flexShrink: 0, height: '100%' }}>
                    <button className="btn btn-sm btn-info py-0 px-1 d-flex align-items-center" onClick={handleViewClick} style={{ height: '20px', fontSize: '0.7rem', fontWeight: 'bold' }}>
                        <i class="bi bi-eye"></i>
                    </button>
                    <button className="btn btn-sm btn-warning py-0 px-1 d-flex align-items-center" onClick={handleEditClick} style={{ height: '20px', fontSize: '0.7rem', fontWeight: 'bold' }}>
                        <i class="bi bi-pencil-square"></i>
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
            invNo: 100,
            partyName: 150,
            payMode: 70,
            subTotal: 80,
            discount: 100,
            taxable: 70,
            vat: 70,
            roundOff: 80,
            total: 100,
            user: 100,
            actions: 120
        });
    };

    // Validate and auto-correct Nepali date
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

    // Safe check for loading and error states
    if (loading && bills.length === 0) return <Loader />;

    if (error) {
        return <div className="alert alert-danger text-center py-5">{error}</div>;
    }

    const billsArray = Array.isArray(bills) ? bills : [];

    return (
        <div className="container-fluid">
            <Header />
            <div className="card mt-2 shadow-lg p-0 animate__animated animate__fadeInUp expanded-card ledger-card compact">
                <div className="card-header bg-white py-0">
                    <h1 className="h4 mb-0 text-center text-primary">Sales Voucher's Register</h1>
                </div>

                <div className="card-body p-2 p-md-3">
                    <div className="row g-2 mb-3">
                        {/* From Date BS Field */}
                        <div className="col-12" style={{ flex: '0 0 auto', width: '12%' }}>
                            <div className="position-relative">
                                <input
                                    type="text"
                                    name="fromDate"
                                    id="fromDate"
                                    ref={fromDateRef}
                                    className={`form-control form-control-sm no-date-icon ${dateErrors.fromDate ? 'is-invalid' : ''}`}
                                    value={dateRange.fromDate || ''}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        const sanitizedValue = value.replace(/[^0-9/-]/g, '').slice(0, 10);
                                        const adDate = convertBsToAd(sanitizedValue);
                                        setDateRange(prev => ({
                                            ...prev,
                                            fromDate: sanitizedValue,
                                            fromDateAd: adDate || prev.fromDateAd
                                        }));
                                        setDateErrors(prev => ({ ...prev, fromDate: '' }));
                                    }}
                                    onKeyDown={(e) => {
                                        const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
                                        if (!allowedKeys.includes(e.key) && !/^\d$/.test(e.key) && e.key !== '/' && e.key !== '-' && !e.ctrlKey && !e.metaKey) {
                                            e.preventDefault();
                                        }
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            const dateStr = e.target.value.trim();
                                            if (!dateStr) {
                                                const currentDate = company.dateFormat === 'nepali' ? new NepaliDate() : new Date();
                                                const correctedDate = company.dateFormat === 'nepali' ? currentDate.format('YYYY-MM-DD') : currentDate.toISOString().split('T')[0];
                                                setDateRange(prev => ({ ...prev, fromDate: correctedDate }));
                                                setDateErrors(prev => ({ ...prev, fromDate: '' }));
                                                setNotification({ show: true, message: 'Date required. Auto-corrected to current date.', type: 'warning', duration: 3000 });
                                                handleKeyDown(e, 'fromDateAd');
                                            } else if (dateErrors.fromDate) {
                                                e.target.focus();
                                            } else {
                                                handleKeyDown(e, 'fromDateAd');
                                            }
                                        }
                                    }}
                                    onBlur={(e) => {
                                        const dateStr = e.target.value.trim();
                                        if (!dateStr) return;
                                        const correctedDate = validateAndCorrectNepaliDate(dateStr);
                                        if (!correctedDate) {
                                            const fallbackDate = currentNepaliDate;
                                            const adDate = convertBsToAd(fallbackDate);
                                            setDateRange(prev => ({ ...prev, fromDate: fallbackDate, fromDateAd: adDate }));
                                            setNotification({ show: true, message: 'Invalid Nepali date. Auto-corrected to current date.', type: 'warning', duration: 3000 });
                                        }
                                    }}
                                    placeholder="YYYY-MM-DD (BS)"
                                    required
                                    autoFocus
                                    autoComplete="off"
                                    style={{ height: '26px', fontSize: '0.875rem', paddingTop: '0.75rem', width: '100%' }}
                                />
                                <label className="position-absolute" style={{ top: '-0.5rem', left: '0.75rem', fontSize: '0.75rem', backgroundColor: 'white', padding: '0 0.25rem', color: '#6c757d', fontWeight: '500' }}>
                                    From (BS): <span className="text-danger">*</span>
                                </label>
                            </div>
                        </div>

                        {/* From Date AD Field */}
                        <div className="col-12" style={{ flex: '0 0 auto', width: '12%' }}>
                            <div className="position-relative">
                                <input
                                    type="date"
                                    name="fromDateAd"
                                    id="fromDateAd"
                                    className="form-control form-control-sm"
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
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleKeyDown(e, 'toDate'); }}
                                    style={{ height: '26px', fontSize: '0.875rem', paddingTop: '0.75rem', width: '100%' }}
                                />
                                <label className="position-absolute" style={{ top: '-0.5rem', left: '0.75rem', fontSize: '0.75rem', backgroundColor: 'white', padding: '0 0.25rem', color: '#6c757d', fontWeight: '500' }}>
                                    From (AD):
                                </label>
                            </div>
                        </div>

                        {/* To Date BS Field */}
                        <div className="col-12" style={{ flex: '0 0 auto', width: '12%' }}>
                            <div className="position-relative">
                                <input
                                    type="text"
                                    name="toDate"
                                    id="toDate"
                                    ref={toDateRef}
                                    className={`form-control form-control-sm no-date-icon ${dateErrors.toDate ? 'is-invalid' : ''}`}
                                    value={dateRange.toDate || ''}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        const sanitizedValue = value.replace(/[^0-9/-]/g, '').slice(0, 10);
                                        const adDate = convertBsToAd(sanitizedValue);
                                        setDateRange(prev => ({
                                            ...prev,
                                            toDate: sanitizedValue,
                                            toDateAd: adDate || prev.toDateAd
                                        }));
                                        setDateErrors(prev => ({ ...prev, toDate: '' }));
                                    }}
                                    onKeyDown={(e) => {
                                        const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
                                        if (!allowedKeys.includes(e.key) && !/^\d$/.test(e.key) && e.key !== '/' && e.key !== '-' && !e.ctrlKey && !e.metaKey) {
                                            e.preventDefault();
                                        }
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            const dateStr = e.target.value.trim();
                                            if (!dateStr) {
                                                const currentDate = company.dateFormat === 'nepali' ? new NepaliDate() : new Date();
                                                const correctedDate = company.dateFormat === 'nepali' ? currentDate.format('YYYY-MM-DD') : currentDate.toISOString().split('T')[0];
                                                setDateRange(prev => ({ ...prev, toDate: correctedDate }));
                                                setDateErrors(prev => ({ ...prev, toDate: '' }));
                                                setNotification({ show: true, message: 'Date required. Auto-corrected to current date.', type: 'warning', duration: 3000 });
                                                handleKeyDown(e, 'toDateAd');
                                            } else if (dateErrors.toDate) {
                                                e.target.focus();
                                            } else {
                                                handleKeyDown(e, 'toDateAd');
                                            }
                                        }
                                    }}
                                    onBlur={(e) => {
                                        const dateStr = e.target.value.trim();
                                        if (!dateStr) return;
                                        const correctedDate = validateAndCorrectNepaliDate(dateStr);
                                        if (!correctedDate) {
                                            const fallbackDate = currentNepaliDate;
                                            const adDate = convertBsToAd(fallbackDate);
                                            setDateRange(prev => ({ ...prev, toDate: fallbackDate, toDateAd: adDate }));
                                            setNotification({ show: true, message: 'Invalid Nepali date. Auto-corrected to current date.', type: 'warning', duration: 3000 });
                                        }
                                    }}
                                    placeholder="YYYY-MM-DD (BS)"
                                    required
                                    autoComplete="off"
                                    style={{ height: '26px', fontSize: '0.875rem', paddingTop: '0.75rem', width: '100%' }}
                                />
                                <label className="position-absolute" style={{ top: '-0.5rem', left: '0.75rem', fontSize: '0.75rem', backgroundColor: 'white', padding: '0 0.25rem', color: '#6c757d', fontWeight: '500' }}>
                                    To (BS): <span className="text-danger">*</span>
                                </label>
                            </div>
                        </div>

                        {/* To Date AD Field */}
                        <div className="col-12" style={{ flex: '0 0 auto', width: '12%' }}>
                            <div className="position-relative">
                                <input
                                    type="date"
                                    name="toDateAd"
                                    id="toDateAd"
                                    className="form-control form-control-sm"
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
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleKeyDown(e, 'generateReport'); }}
                                    style={{ height: '26px', fontSize: '0.875rem', paddingTop: '0.75rem', width: '100%' }}
                                />
                                <label className="position-absolute" style={{ top: '-0.5rem', left: '0.75rem', fontSize: '0.75rem', backgroundColor: 'white', padding: '0 0.25rem', color: '#6c757d', fontWeight: '500' }}>
                                    To (AD):
                                </label>
                            </div>
                        </div>

                        {/* Generate Report Button */}
                        <div className="col-12 col-md-1">
                            <button type="button" id="generateReport" ref={generateReportRef}
                                className="btn btn-primary btn-sm" onClick={handleGenerateReport}
                                style={{ height: '30px', fontSize: '0.8rem', padding: '0 12px', fontWeight: '500', whiteSpace: 'nowrap' }}>
                                <i className="bi bi-search"></i>Generate
                            </button>
                        </div>

                        {/* Search Row */}
                        <div className="col-12" style={{ flex: '0 0 auto', width: '12%' }}>
                            <div className="position-relative">
                                <div className="input-group input-group-sm">
                                    <input
                                        type="text"
                                        className="form-control form-control-sm"
                                        id="searchInput"
                                        ref={searchInputRef}
                                        placeholder=""
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        disabled={billsArray.length === 0}
                                        autoComplete='off'
                                        style={{ height: '26px', fontSize: '0.875rem', paddingTop: '0.75rem', width: '100%' }}
                                    />
                                </div>
                                <label className="position-absolute" style={{ top: '-0.5rem', left: '0.75rem', fontSize: '0.75rem', backgroundColor: 'white', padding: '0 0.25rem', color: '#6c757d', fontWeight: '500' }}>
                                    Search
                                </label>
                            </div>
                        </div>

                        {/* Payment Mode Filter */}
                        <div className="col-12 col-md-1">
                            <div className="position-relative">
                                <select
                                    className="form-select form-select-sm"
                                    id="paymentModeFilter"
                                    ref={paymentModeFilterRef}
                                    value={paymentModeFilter}
                                    onChange={(e) => setPaymentModeFilter(e.target.value)}
                                    disabled={billsArray.length === 0}
                                    style={{ height: '30px', fontSize: '0.875rem', paddingTop: '0.25rem', width: '100%' }}
                                >
                                    <option value="">All</option>
                                    <option value="cash">Cash</option>
                                    <option value="credit">Credit</option>
                                </select>
                                <label className="position-absolute" style={{ top: '-0.5rem', left: '0.75rem', fontSize: '0.75rem', backgroundColor: 'white', padding: '0 0.25rem', color: '#6c757d', fontWeight: '500' }}>
                                    Mode
                                </label>
                            </div>
                        </div>

                        <div className="col-12 col-md-auto d-flex align-items-end justify-content-end gap-2">
                            <button className="btn btn-primary btn-sm d-flex align-items-center"
                                onClick={() => navigate('/retailer/sales')}
                                style={{ height: '30px', padding: '0 12px', fontSize: '0.8rem', fontWeight: '500', whiteSpace: 'nowrap' }}>
                                <i className="bi bi-plus-circle"></i>
                            </button>
                            <button className="btn btn-success btn-sm d-flex align-items-center"
                                onClick={handleExportExcel}
                                disabled={filteredBills.length === 0 || exporting}
                                style={{ height: '30px', padding: '0 12px', fontSize: '0.8rem', fontWeight: '500', whiteSpace: 'nowrap' }}>
                                {exporting ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-file-excel me-1"></i>}
                                {exporting ? 'Exporting...' : ''}
                            </button>
                            <button className="btn btn-secondary btn-sm d-flex align-items-center"
                                onClick={() => handlePrint(true)} disabled={billsArray.length === 0}
                                style={{ height: '30px', padding: '0 12px', fontSize: '0.8rem', fontWeight: '500', whiteSpace: 'nowrap' }}>
                                <i className="bi bi-printer"></i>
                            </button>
                            <button className="btn btn-secondary btn-sm d-flex align-items-center"
                                onClick={resetColumnWidths} title="Reset column widths to default"
                                style={{ height: '30px', padding: '0 12px', fontSize: '0.8rem', fontWeight: '500' }}>
                                <i className="bi bi-x-circle"></i>
                            </button>
                        </div>
                    </div>

                    {billsArray.length === 0 && !loading ? (
                        <div className="alert alert-info text-center py-3" style={{ fontSize: '0.875rem' }}>
                            <i className="fas fa-info-circle me-2"></i>
                            Please select date range and click "Generate Report" to view data
                        </div>
                    ) : (
                        <>
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
                                    </div>
                                ) : filteredBills.length === 0 ? (
                                    <div className="d-flex flex-column justify-content-center align-items-center h-100">
                                        <i className="bi bi-search text-muted" style={{ fontSize: '1.5rem' }}></i>
                                        <h6 className="mt-2 text-muted" style={{ fontSize: '0.9rem' }}>
                                            No sales bills found
                                        </h6>
                                        <p className="text-muted small" style={{ fontSize: '0.75rem' }}>
                                            {searchQuery ? 'Try a different search term' : 'No data for the selected date range'}
                                        </p>
                                    </div>
                                ) : (
                                    <AutoSizer>
                                        {({ height, width }) => {
                                            const showVatColumns = companyInfo.vatEnabled && !companyInfo.isVatExempt;
                                            const totalWidth = columnWidths.bsDate + columnWidths.adDate +
                                                columnWidths.invNo + columnWidths.partyName +
                                                columnWidths.payMode + columnWidths.subTotal +
                                                columnWidths.discount + columnWidths.roundOff +
                                                columnWidths.total + columnWidths.user +
                                                columnWidths.actions +
                                                (showVatColumns ? (columnWidths.taxable + columnWidths.vat) : 0);

                                            return (
                                                <div style={{ position: 'relative', height: height, width: Math.max(width, totalWidth) }}>
                                                    <TableHeader />
                                                    <List
                                                        height={height - 28}
                                                        itemCount={filteredBills.length}
                                                        itemSize={28}
                                                        width={Math.max(width, totalWidth)}
                                                        itemData={{
                                                            bills: filteredBills,
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
                                style={{ zIndex: 2, height: '28px', borderTop: '2px solid #dee2e6' }}
                            >
                                <div
                                    className="d-flex align-items-center px-1"
                                    style={{ width: `${columnWidths.bsDate + columnWidths.adDate + columnWidths.invNo + columnWidths.partyName + columnWidths.payMode}px`, flexShrink: 0, height: '100%' }}
                                >
                                    <strong style={{ fontSize: '0.75rem' }}>Total:</strong>
                                </div>
                                <div className="d-flex align-items-center justify-content-end px-1 border-start" style={{ width: `${columnWidths.subTotal}px`, flexShrink: 0, height: '100%' }}>
                                    <strong style={{ fontSize: '0.75rem' }}>{formatCurrency(totals.subTotal)}</strong>
                                </div>
                                <div className="d-flex align-items-center justify-content-end px-1 border-start" style={{ width: `${columnWidths.discount}px`, flexShrink: 0, height: '100%' }}>
                                    <strong style={{ fontSize: '0.75rem' }}>{formatCurrency(totals.discount)}</strong>
                                </div>
                                {companyInfo.vatEnabled && !companyInfo.isVatExempt && (
                                    <>
                                        <div className="d-flex align-items-center justify-content-end px-1 border-start" style={{ width: `${columnWidths.taxable}px`, flexShrink: 0, height: '100%' }}>
                                            <strong style={{ fontSize: '0.75rem' }}>{formatCurrency(totals.taxable)}</strong>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-end px-1 border-start" style={{ width: `${columnWidths.vat}px`, flexShrink: 0, height: '100%' }}>
                                            <strong style={{ fontSize: '0.75rem' }}>{formatCurrency(totals.vat)}</strong>
                                        </div>
                                    </>
                                )}
                                <div className="d-flex align-items-center justify-content-end px-1 border-start" style={{ width: `${columnWidths.roundOff}px`, flexShrink: 0, height: '100%' }}>
                                    <strong style={{ fontSize: '0.75rem' }}>{formatCurrency(totals.roundOff)}</strong>
                                </div>
                                <div className="d-flex align-items-center justify-content-end px-1 border-start" style={{ width: `${columnWidths.total}px`, flexShrink: 0, height: '100%' }}>
                                    <strong style={{ fontSize: '0.75rem' }}>{formatCurrency(totals.amount)}</strong>
                                </div>
                                <div className="d-flex align-items-center px-1 border-start" style={{ width: `${columnWidths.user + columnWidths.actions}px`, flexShrink: 0, height: '100%' }}></div>
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

export default SalesBillsList;