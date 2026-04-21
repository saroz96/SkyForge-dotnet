import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../Header';
import NepaliDate from 'nepali-date-converter';
import { usePageNotRefreshContext } from '../PageNotRefreshContext';
import '../../../stylesheet/noDateIcon.css';
import Loader from '../../Loader';
import ProductModal from '../dashboard/modals/ProductModal';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import * as XLSX from 'xlsx';
import NotificationToast from '../../NotificationToast';
import VirtualizedAccountList from '../../VirtualizedAccountList';

const Statement = () => {
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
    const [showAccountModal, setShowAccountModal] = useState(false);

    // Account search states for virtualized list
    const [accounts, setAccounts] = useState([]);
    const [isAccountSearching, setIsAccountSearching] = useState(false);
    const [accountSearchPage, setAccountSearchPage] = useState(1);
    const [hasMoreAccountResults, setHasMoreAccountResults] = useState(false);
    const [totalAccounts, setTotalAccounts] = useState(0);
    const [accountSearchQuery, setAccountSearchQuery] = useState('');
    const [accountLastSearchQuery, setAccountLastSearchQuery] = useState('');
    const [accountShouldShowLastSearchResults, setAccountShouldShowLastSearchResults] = useState(false);
    const accountSearchRef = useRef(null);

    const [company, setCompany] = useState({
        dateFormat: 'english',
        vatEnabled: true,
        fiscalYear: {}
    });

    const [data, setData] = useState(() => {
        if (draftSave && draftSave.statementData) {
            return draftSave.statementData;
        }
        return {
            company: null,
            currentFiscalYear: null,
            statement: [],
            itemwiseStatement: [],
            accounts: [],
            selectedCompany: null,
            partyName: '',
            fromDate: '',
            toDate: '',
            paymentMode: 'all',
            totalDebit: 0,
            totalCredit: 0,
            openingBalance: 0,
            currentCompanyName: '',
            companyDateFormat: 'english',
            nepaliDate: '',
            user: null,
            selectedAccountUniqueNumber: null,
            selectedAccountName: null
        };
    });

    const [viewMode, setViewMode] = useState(() => {
        if (draftSave && draftSave.statementViewMode) {
            return draftSave.statementViewMode;
        }
        return 'regular';
    });

    const [searchQuery, setSearchQuery] = useState(() => {
        if (draftSave && draftSave.statementSearch) {
            return draftSave.statementSearch.searchQuery || '';
        }
        return '';
    });

    const [selectedRowIndex, setSelectedRowIndex] = useState(() => {
        if (draftSave && draftSave.statementSearch) {
            return draftSave.statementSearch.selectedRowIndex || 0;
        }
        return 0;
    });

    // Column resizing state
    const [columnWidths, setColumnWidths] = useState({
        date: 90,
        voucherNo: 100,
        voucherType: 80,
        payMode: 80,
        account: 200,
        debit: 100,
        credit: 100,
        balance: 100
    });

    const [isResizing, setIsResizing] = useState(false);
    const [resizingColumn, setResizingColumn] = useState(null);
    const [startX, setStartX] = useState(0);
    const [startWidth, setStartWidth] = useState(0);

    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState(null);
    const [filteredStatement, setFilteredStatement] = useState([]);

    const fromDateRef = useRef(null);
    const toDateRef = useRef(null);
    const searchInputRef = useRef(null);
    const paymentModeRef = useRef(null);
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

    // Function to fetch accounts from backend with search and pagination
    const fetchAccountsFromBackend = async (searchTerm = '', page = 1) => {
        try {
            setIsAccountSearching(true);
            const response = await api.get('/api/retailer/all/accounts/search', {
                params: {
                    search: searchTerm,
                    page: page,
                    limit: searchTerm.trim() ? 15 : 25,
                }
            });

            if (response.data.success) {
                if (page === 1) {
                    setAccounts(response.data.accounts);
                } else {
                    setAccounts(prev => [...prev, ...response.data.accounts]);
                }
                setHasMoreAccountResults(response.data.pagination.hasNextPage);
                setTotalAccounts(response.data.pagination.totalAccounts);
                setAccountSearchPage(page);

                if (searchTerm.trim() !== '') {
                    setAccountLastSearchQuery(searchTerm);
                    setAccountShouldShowLastSearchResults(true);
                }
            }
        } catch (error) {
            console.error('Error fetching accounts:', error);
            setNotification({
                show: true,
                message: 'Error loading accounts',
                type: 'error'
            });
        } finally {
            setIsAccountSearching(false);
        }
    };

    // Load more accounts for infinite scroll
    const loadMoreAccounts = () => {
        if (!isAccountSearching && hasMoreAccountResults) {
            const searchTerm = accountShouldShowLastSearchResults ? accountLastSearchQuery : accountSearchQuery;
            fetchAccountsFromBackend(searchTerm, accountSearchPage + 1);
        }
    };

    // Handle account search input
    const handleAccountSearch = (e) => {
        const searchText = e.target.value;
        setAccountSearchQuery(searchText);
        setAccountSearchPage(1);

        if (searchText.trim() !== '' && accountShouldShowLastSearchResults) {
            setAccountShouldShowLastSearchResults(false);
            setAccountLastSearchQuery('');
        }

        const timer = setTimeout(() => {
            fetchAccountsFromBackend(searchText, 1);
        }, 300);

        return () => clearTimeout(timer);
    };

    // Get focus target after modal closes
    const getFocusTargetOnModalClose = () => {
        if (fromDateRef.current) {
            return 'fromDate';
        }
        return 'account';
    };

    // Save data to draft context
    useEffect(() => {
        setDraftSave({
            ...draftSave,
            statementData: data,
            statementViewMode: viewMode,
            statementSearch: {
                searchQuery,
                selectedRowIndex,
                fromDate: data.fromDate,
                toDate: data.toDate,
                paymentMode: data.paymentMode,
                selectedCompany: data.selectedCompany
            }
        });
    }, [data, viewMode, searchQuery, selectedRowIndex]);

    // Save/load column widths
    useEffect(() => {
        const savedWidths = localStorage.getItem('statementTableColumnWidths');
        if (savedWidths) {
            try {
                setColumnWidths(JSON.parse(savedWidths));
            } catch (e) {
                console.error('Failed to load column widths:', e);
            }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('statementTableColumnWidths', JSON.stringify(columnWidths));
    }, [columnWidths]);

    // Fetch accounts when modal opens
    useEffect(() => {
        if (showAccountModal) {
            setAccountSearchQuery('');
            setAccountSearchPage(1);
            if (accountShouldShowLastSearchResults && accountLastSearchQuery.trim() !== '') {
                fetchAccountsFromBackend(accountLastSearchQuery, 1);
            } else {
                fetchAccountsFromBackend('', 1);
            }
        }
    }, [showAccountModal]);

    // Function to format date for display in input fields based on company date format
    const formatDateForInput = useCallback((dateString) => {
        if (!dateString) return '';
        try {
            if (company.dateFormat === 'nepali') {
                return new NepaliDate(dateString).format('YYYY-MM-DD');
            } else {
                return new Date(dateString).toISOString().split('T')[0];
            }
        } catch (error) {
            return dateString;
        }
    }, [company.dateFormat]);

    // Function to convert input date to backend format (UTC)
    const convertToBackendDate = useCallback((dateString) => {
        if (!dateString) return '';
        try {
            if (company.dateFormat === 'nepali') {
                // Nepali date - keep as is for backend
                return dateString;
            } else {
                // English date - convert to ISO format
                return new Date(dateString).toISOString().split('T')[0];
            }
        } catch (error) {
            return dateString;
        }
    }, [company.dateFormat]);

    // Fetch initial data (accounts list)
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                setLoading(true);
                const response = await api.get('/api/retailer/statement');

                if (response.data.success) {
                    const responseData = response.data.data;

                    // Set company date format
                    const dateFormat = responseData.company?.dateFormat?.toLowerCase() || 'english';

                    setCompany({
                        ...responseData.company,
                        dateFormat: dateFormat,
                        vatEnabled: responseData.company?.vatEnabled !== false
                    });

                    // Get fiscal year dates and format them for display
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
                    message: 'Error loading account data',
                    type: 'error'
                });
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();
    }, []);

    // Fetch statement data when generate report is clicked
    useEffect(() => {
        const fetchStatementData = async () => {
            if (!shouldFetch) return;

            try {
                setLoading(true);
                const params = new URLSearchParams();

                // IMPORTANT: Send the date format to backend
                params.append('dateFormat', company.dateFormat);

                // Send dates as-is - backend will interpret based on dateFormat
                if (data.fromDate) params.append('fromDate', data.fromDate);
                if (data.toDate) params.append('toDate', data.toDate);
                if (data.selectedCompany) params.append('account', data.selectedCompany);
                if (data.paymentMode && data.paymentMode !== 'all') params.append('paymentMode', data.paymentMode);
                if (viewMode === 'itemwise') params.append('includeItems', 'true');

                const response = await api.get(`/api/retailer/statement?${params.toString()}`);

                if (response.data.success) {
                    const responseData = response.data.data;

                    const selectedAccount = accounts.find(a => a.id === responseData.selectedCompany);
                    const formattedPartyName = selectedAccount && selectedAccount.uniqueNumber
                        ? `${selectedAccount.uniqueNumber} ${selectedAccount.name}`.trim()
                        : responseData.partyName || data.partyName;

                    // Update state with the received data
                    setData(prev => ({
                        ...prev,
                        statement: responseData.statement || [],
                        itemwiseStatement: responseData.itemwiseStatement || [],
                        partyName: formattedPartyName,
                        selectedCompany: responseData.selectedCompany || prev.selectedCompany,
                        totalDebit: responseData.totalDebit || 0,
                        totalCredit: responseData.totalCredit || 0,
                        openingBalance: responseData.openingBalance || 0,
                        company: responseData.company || prev.company,
                        currentFiscalYear: responseData.currentFiscalYear || prev.currentFiscalYear,
                        companyDateFormat: responseData.companyDateFormat || prev.companyDateFormat,
                        nepaliDate: responseData.nepaliDate || prev.nepaliDate,
                        currentCompanyName: responseData.currentCompanyName || prev.currentCompanyName,
                        user: responseData.user || prev.user
                    }));
                    setError(null);
                    setSelectedRowIndex(0);
                } else {
                    const errorMsg = response.data.error || 'Failed to fetch statement';
                    setError(errorMsg);
                    setNotification({
                        show: true,
                        message: errorMsg,
                        type: 'error'
                    });
                }
            } catch (err) {
                console.error('Fetch error:', err);
                const errorMsg = err.response?.data?.error || 'Failed to fetch statement';
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

        fetchStatementData();
    }, [shouldFetch, viewMode, company.dateFormat]);

    // Filter statement based on search query
    useEffect(() => {
        const filtered = data.statement.filter(item => {
            return (
                item.billNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.account?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.type?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        });

        setFilteredStatement(filtered);
        setSelectedRowIndex(0);
    }, [data.statement, searchQuery]);

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (filteredStatement.length === 0) return;

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
                    setSelectedRowIndex(prev => Math.min(filteredStatement.length - 1, prev + 1));
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [filteredStatement]);

    // Scroll to selected row
    useEffect(() => {
        if (tableBodyRef.current && filteredStatement.length > 0) {
            const rows = tableBodyRef.current.querySelectorAll('tr');
            if (rows.length > selectedRowIndex) {
                rows[selectedRowIndex].scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest'
                });
            }
        }
    }, [selectedRowIndex, filteredStatement]);

    // F9 key handler for product modal
    useEffect(() => {
        const handleF9KeyDown = (e) => {
            if (e.key === 'F9') {
                e.preventDefault();
                setShowProductModal(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleF9KeyDown);
        return () => {
            window.removeEventListener('keydown', handleF9KeyDown);
        };
    }, []);

    const paymentModeOptions = [
        { value: 'all', label: 'All (Include Cash)' },
        { value: 'exclude-cash', label: 'All (Exclude Cash)' },
        { value: 'cash', label: 'Cash' },
        { value: 'credit', label: 'Credit' }
    ];

    const selectAccount = (account) => {
        const formattedName = `${account.uniqueNumber || ''} ${account.name}`.trim();
        setData(prev => ({
            ...prev,
            selectedCompany: account.id,
            partyName: formattedName,
            selectedAccountUniqueNumber: account.uniqueNumber, // Store unique number separately
            selectedAccountName: account.name // Store name separately
        }));
        setShowAccountModal(false);
        setAccountSearchQuery('');

        setTimeout(() => {
            if (fromDateRef.current) {
                fromDateRef.current.focus();
            }
        }, 50);
    };

    const handleDateChange = (e) => {
        const { name, value } = e.target;
        setData(prev => ({ ...prev, [name]: value }));
    };

    const handlePaymentModeChange = (e) => {
        setData(prev => ({ ...prev, paymentMode: e.target.value }));
    };

    const handleViewModeChange = (e) => {
        setViewMode(e.target.value);
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
        if (!data.selectedCompany) {
            setError('Please select an account');
            setNotification({
                show: true,
                message: 'Please select an account',
                type: 'warning'
            });
            return;
        }
        setShouldFetch(true);
    };

    const handleRowClick = (index) => {
        setSelectedRowIndex(index);
    };

    const handleRowDoubleClick = (item) => {
        let route = '';
        const billId = item.billId || item.id;
        const purchaseBillId = item.purchaseBillId || item.id;
        const purchaseReturnBillId = item.purchaseReturnBillId || item.id;
        const paymentAccountId = item.paymentAccountId || item.id;
        const receiptAccountId = item.receiptAccountId || item.id;
        const journalBillId = item.journalBillId || item.id;
        const debitNoteId = item.debitNoteId || item.id;
        const salesBillId = item.salesBillId || item.id;

        switch (item.type?.toLowerCase()) {
            case 'sale':
                if (item.paymentMode === 'cash') {
                    route = `/retailer/cash-sales/edit/${salesBillId || billId}`;
                } else if (item.paymentMode === 'credit') {
                    route = `/retailer/credit-sales/edit/${salesBillId || billId}`;
                }
                break;
            case 'purc':
                route = `/retailer/purchase/edit/${purchaseBillId}`;
                break;
            case 'prrt':
                route = `/retailer/purchase-return/edit/${purchaseReturnBillId}`;
                break;
            case 'pymt':
                route = `/retailer/payments/${paymentAccountId}`;
                break;
            case 'rcpt':
                route = `/retailer/receipts/${receiptAccountId}`;
                break;
            case 'jrnl':
                route = `/retailer/journal/${journalBillId}`;
                break;
            case 'drnt':
                route = `/retailer/debit-note/${debitNoteId}`;
                break;
            default:
                return;
        }

        if (route) {
            navigate(route);
        }
    };

    const handleKeyDown = (e, nextFieldId) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (nextFieldId) {
                const nextField = document.getElementById(nextFieldId);
                if (nextField) {
                    nextField.focus();
                }
            } else {
                // If no nextFieldId provided, try to find the next focusable element
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
        // Determine which data to print based on view mode
        let rowsToPrint;
        if (viewMode === 'regular') {
            // Use filteredStatement if available (has search filter), otherwise use data.statement
            rowsToPrint = filteredStatement.length > 0 ? filteredStatement : data.statement;
        } else {
            rowsToPrint = data.itemwiseStatement;
        }

        if (!rowsToPrint || rowsToPrint.length === 0) {
            setNotification({
                show: true,
                message: 'No statement data to print. Please generate a report first.',
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

        let tableContent = '';
        if (viewMode === 'regular') {
            tableContent = generateRegularPrintContent(rowsToPrint);
        } else {
            tableContent = generateItemwisePrintContent(rowsToPrint);
        }

        printWindow.document.write(`
            <html>
                <head>
                    <title>Statement - ${viewMode === 'regular' ? 'Regular' : 'Itemwise'}</title>
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

    const generateRegularPrintContent = (statementData) => {
        let balance = data.openingBalance;
        const statement = statementData;

        // Calculate totals
        let totalDebit = 0;
        let totalCredit = 0;

        let tableContent = `
        <div class="print-header">
            <h2 style="margin:0; padding:0;">${data.currentCompanyName || 'Company Name'}</h2>
            <p style="margin:2px 0; font-size:8px;">
                ${data.company?.address || ''}${data.company?.city ? ', ' + data.company.city : ''}<br>
                PAN: ${data.company?.pan || ''} | Phone: ${data.company?.phone || ''}
            </p>
            <hr style="margin:5px 0;">
            <h3 style="margin:5px 0; text-decoration:underline;">Statement of Account</h3>
            <p style="margin:2px 0; font-size:9px;">
                <strong>Party:</strong> ${data.partyName} &nbsp;|&nbsp;
                <strong>From Date:</strong> ${data.fromDate} &nbsp;|&nbsp;
                <strong>To Date:</strong> ${data.toDate} &nbsp;|&nbsp;
                <strong>Payment Mode:</strong> ${data.paymentMode === 'all' ? 'All (Include Cash)' : data.paymentMode === 'exclude-cash' ? 'All (Exclude Cash)' : data.paymentMode} &nbsp;|&nbsp;
                <strong>View Mode:</strong> Regular
            </p>
        </div>
        <table cellspacing="0">
            <thead>
                <tr>
                    <th class="col-date">Date</th>
                    <th class="col-vch-no">Vch No.</th>
                    <th class="col-type">Type</th>
                    <th class="col-pay-mode">Pay Mode</th>
                    <th class="col-account">Account</th>
                    <th class="col-debit text-end">Debit (Rs.)</th>
                    <th class="col-credit text-end">Credit (Rs.)</th>
                    <th class="col-balance text-end">Balance (Rs.)</th>
                </tr>
            </thead>
            <tbody>
    `;

        statement.forEach((item, index) => {
            const formattedDate = company.dateFormat === 'nepali'
                ? new NepaliDate(item.date).format('YYYY-MM-DD')
                : new Date(item.date).toISOString().split('T')[0];

            const debitAmount = parseFloat(item.debit) || 0;
            const creditAmount = parseFloat(item.credit) || 0;

            // Update running balance
            balance = balance + debitAmount - creditAmount;

            totalDebit += debitAmount;
            totalCredit += creditAmount;

            const rowClass = index % 2 === 0 ? 'even-row' : '';
            const balanceText = balance > 0 ? `${formatCurrencyForPrint(Math.abs(balance))} Dr` : `${formatCurrencyForPrint(Math.abs(balance))} Cr`;

            // Get the account name
            let accountName = '';
            if (item.type === 'Pymt') {
                accountName = item.PaymentReceiptType || item.accountType || '';
            } else if (item.type === 'Rcpt') {
                accountName = item.PaymentReceiptType || item.accountType || '';
            } else {
                accountName = item.accountType || item.purchaseSalesType || item.purchaseSalesReturnType || item.journalAccountType || '';
            }

            tableContent += `
            <tr class="${rowClass}">
                <td class="col-date nowrap">${formattedDate}</td>
                <td class="col-vch-no nowrap">${item.billNumber || ''}</td>
                <td class="col-type nowrap">${item.type || ''}</td>
                <td class="col-pay-mode nowrap">${item.paymentMode || ''}</td>
                <td class="col-account" style="white-space: normal; word-wrap: break-word;">${accountName}</td>
                <td class="col-debit text-end">${debitAmount > 0 ? formatCurrencyForPrint(debitAmount) : '-'}</td>
                <td class="col-credit text-end">${creditAmount > 0 ? formatCurrencyForPrint(creditAmount) : '-'}</td>
                <td class="col-balance text-end">${balanceText}</td>
            </tr>
        `;
        });

        const finalBalanceText = balance > 0 ? `${formatCurrencyForPrint(Math.abs(balance))} Dr` : `${formatCurrencyForPrint(Math.abs(balance))} Cr`;

        tableContent += `
            <tr class="footer-total">
                <td colspan="5" class="text-end"><strong>TOTALS</strong></td>
                <td class="text-end"><strong>${formatCurrencyForPrint(totalDebit)}</strong></td>
                <td class="text-end"><strong>${formatCurrencyForPrint(totalCredit)}</strong></td>
                <td class="text-end"><strong>${finalBalanceText}</strong></td>
            </tr>
            </tbody>
        </table>
        <div style="margin-top: 15px; font-size: 8px; text-align: center; border-top: 1px solid #ccc; padding-top: 5px;">
            <p>Generated on: ${new Date().toLocaleString()} | Powered by SkyForge</p>
        </div>
    `;

        return tableContent;
    };

    const generateItemwisePrintContent = (statementData) => {
        const itemwiseData = statementData;

        if (!itemwiseData || itemwiseData.length === 0) {
            return '<div class="alert alert-warning">No itemwise statement data available</div>';
        }

        let tableContent = `
            <div class="print-header">
                <h2 style="margin:0; padding:0;">${data.currentCompanyName || 'Company Name'}</h2>
                <p style="margin:2px 0; font-size:8px;">
                    ${data.company?.address || ''}${data.company?.city ? ', ' + data.company.city : ''}<br>
                    PAN: ${data.company?.pan || ''} | Phone: ${data.company?.phone || ''}
                </p>
                <hr style="margin:5px 0;">
                <h3 style="margin:5px 0; text-decoration:underline;">Itemwise Statement</h3>
                <p style="margin:2px 0; font-size:9px;">
                    <strong>Party:</strong> ${data.partyName} &nbsp;|&nbsp;
                    <strong>From Date:</strong> ${data.fromDate} &nbsp;|&nbsp;
                    <strong>To Date:</strong> ${data.toDate} &nbsp;|&nbsp;
                    <strong>Payment Mode:</strong> ${data.paymentMode === 'all' ? 'All (Include Cash)' : data.paymentMode === 'exclude-cash' ? 'All (Exclude Cash)' : data.paymentMode}
                </p>
            </div>
            <table cellspacing="0">
                <thead>
                    <tr>
                        <th class="nowrap">Date</th>
                        <th class="nowrap">Vch No.</th>
                        <th class="nowrap">Type</th>
                        <th class="nowrap">Pay Mode</th>
                        <th class="nowrap">Item Name</th>
                        <th class="nowrap text-end">Qty</th>
                        <th class="nowrap">Unit</th>
                        <th class="nowrap text-end">Rate (Rs.)</th>
                        <th class="nowrap text-end">Discount (Rs.)</th>
                        <th class="nowrap text-end">Taxable (Rs.)</th>
                        <th class="nowrap text-end">VAT (Rs.)</th>
                        <th class="nowrap text-end">Total (Rs.)</th>
                    </tr>
                </thead>
                <tbody>
        `;

        let grandTotalQty = 0;
        let grandTotalAmount = 0;
        let grandTotalVat = 0;
        let grandTotalTaxable = 0;
        let grandTotalDiscount = 0;

        itemwiseData.forEach((bill) => {
            if (bill.items && bill.items.length > 0) {
                bill.items.forEach((item) => {
                    const formattedDate = company.dateFormat === 'nepali'
                        ? new NepaliDate(bill.date).format('YYYY-MM-DD')
                        : new Date(bill.date).toISOString().split('T')[0];

                    const quantity = item.quantity ? parseFloat(item.quantity) : 0;
                    const rate = item.puPrice || item.price || 0;
                    const discount = item.discountAmountPerItem || 0;
                    const taxable = (item.taxableAmount || 0) * quantity;
                    const vat = bill.vatAmount || 0;
                    const total = bill.totalAmount || 0;

                    grandTotalQty += quantity;
                    grandTotalAmount += total;
                    grandTotalVat += vat;
                    grandTotalTaxable += taxable;
                    grandTotalDiscount += discount;

                    tableContent += `
                        <tr>
                            <td class="nowrap">${formattedDate}</td>
                            <td class="nowrap">${bill.billNumber || ''}</td>
                            <td class="nowrap">${bill.type || ''}</td>
                            <td class="nowrap">${bill.paymentMode || ''}</td>
                            <td class="nowrap" style="white-space: normal; word-wrap: break-word;">${item.item?.name || item.productName || 'N/A'}</td>
                            <td class="text-end">${quantity.toFixed(2)}</td>
                            <td class="nowrap">${item.unit?.name || ''}</td>
                            <td class="text-end">${formatCurrencyForPrint(rate)}</td>
                            <td class="text-end">${formatCurrencyForPrint(discount)}</td>
                            <td class="text-end">${formatCurrencyForPrint(taxable)}</td>
                            <td class="text-end">${formatCurrencyForPrint(vat)}</td>
                            <td class="text-end">${formatCurrencyForPrint(total)}</td>
                        </tr>
                    `;
                });
            }
        });

        tableContent += `
            <tr class="footer-total">
                <td colspan="5" class="text-end"><strong>GRAND TOTALS</strong></td>
                <td class="text-end"><strong>${grandTotalQty.toFixed(2)}</strong></td>
                <td></td>
                <td></td>
                <td class="text-end"><strong>${formatCurrencyForPrint(grandTotalDiscount)}</strong></td>
                <td class="text-end"><strong>${formatCurrencyForPrint(grandTotalTaxable)}</strong></td>
                <td class="text-end"><strong>${formatCurrencyForPrint(grandTotalVat)}</strong></td>
                <td class="text-end"><strong>${formatCurrencyForPrint(grandTotalAmount)}</strong></td>
            </tr>
            </tbody>
        </table>
        <div style="margin-top: 15px; font-size: 8px; text-align: center; border-top: 1px solid #ccc; padding-top: 5px;">
            <p>Generated on: ${new Date().toLocaleString()} | Powered by SkyForge</p>
        </div>
    `;

        return tableContent;
    };

    const formatCurrencyForPrint = (num) => {
        const number = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num) || 0;
        return number.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    const formatCurrencyForExport = (num) => {
        const number = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num) || 0;
        return number.toFixed(2);
    };

    const handleExportExcel = async () => {
        if (viewMode === 'regular') {
            if (!data.statement || data.statement.length === 0) {
                setNotification({
                    show: true,
                    message: 'No data available to export. Please generate a report first.',
                    type: 'warning'
                });
                return;
            }
        } else {
            if (!data.itemwiseStatement || data.itemwiseStatement.length === 0) {
                setNotification({
                    show: true,
                    message: 'No data available to export. Please generate a report first.',
                    type: 'warning'
                });
                return;
            }
        }

        setExporting(true);
        try {
            let excelData = [];
            const currentDate = new Date().toISOString().split('T')[0];

            excelData.push(['Company Name:', data.currentCompanyName || 'N/A']);
            excelData.push(['Report Type:', 'Statement Report']);
            excelData.push(['View Mode:', viewMode === 'regular' ? 'Regular Statement' : 'Itemwise Statement']);
            excelData.push(['Party Name:', data.partyName || 'N/A']);
            excelData.push(['From Date:', data.fromDate]);
            excelData.push(['To Date:', data.toDate]);
            excelData.push(['Payment Mode:', data.paymentMode === 'all' ? 'All (Include Cash)' : data.paymentMode === 'exclude-cash' ? 'All (Exclude Cash)' : data.paymentMode]);
            excelData.push(['Export Date:', currentDate]);
            excelData.push([]);

            if (viewMode === 'regular') {
                const openingBalance = data.openingBalance || 0;
                excelData.push([]);

                const headers = [
                    'Date', 'Voucher No.', 'Voucher Type', 'Payment Mode',
                    'Account', 'Debit Amount', 'Credit Amount', 'Balance'
                ];
                excelData.push(headers);

                let balance = openingBalance;
                let totalDebit = 0;
                let totalCredit = 0;

                const statementToExport = filteredStatement.length > 0 ? filteredStatement : data.statement;

                statementToExport.forEach((item) => {
                    const debitAmount = parseFloat(item.debit) || 0;
                    const creditAmount = parseFloat(item.credit) || 0;

                    balance = balance + debitAmount - creditAmount;
                    totalDebit += debitAmount;
                    totalCredit += creditAmount;

                    const formattedDate = company.dateFormat === 'nepali'
                        ? new NepaliDate(item.date).format('YYYY-MM-DD')
                        : new Date(item.date).toISOString().split('T')[0];

                    let accountName = '';
                    if (item.type === 'Pymt') {
                        accountName = item.PaymentReceiptType || item.accountType || '';
                    } else if (item.type === 'Rcpt') {
                        accountName = item.PaymentReceiptType || item.accountType || '';
                    } else {
                        accountName = item.accountType || item.purchaseSalesType || item.purchaseSalesReturnType || item.journalAccountType || '';
                    }

                    const balanceText = balance > 0 ? `${formatCurrencyForExport(Math.abs(balance))} Dr` : `${formatCurrencyForExport(Math.abs(balance))} Cr`;

                    const rowData = [
                        formattedDate,
                        item.billNumber || '',
                        item.type || '',
                        item.paymentMode || '',
                        accountName,
                        debitAmount > 0 ? formatCurrencyForExport(debitAmount) : '-',
                        creditAmount > 0 ? formatCurrencyForExport(creditAmount) : '-',
                        balanceText
                    ];
                    excelData.push(rowData);
                });

                excelData.push([]);
                const finalBalanceText = balance > 0 ? `${formatCurrencyForExport(Math.abs(balance))} Dr` : `${formatCurrencyForExport(Math.abs(balance))} Cr`;
                excelData.push([
                    'TOTALS', '', '', '', '',
                    formatCurrencyForExport(totalDebit),
                    formatCurrencyForExport(totalCredit),
                    finalBalanceText
                ]);
            } else {
                const headers = [
                    'Date', 'Voucher No.', 'Voucher Type', 'Payment Mode',
                    'Item Name', 'Quantity', 'Unit', 'Rate (Rs.)', 'Discount (Rs.)',
                    'Taxable Amount (Rs.)', 'VAT Amount (Rs.)', 'Total Amount (Rs.)'
                ];
                excelData.push(headers);

                let grandTotalQty = 0;
                let grandTotalAmount = 0;
                let grandTotalVat = 0;
                let grandTotalTaxable = 0;
                let grandTotalDiscount = 0;

                data.itemwiseStatement.forEach((bill) => {
                    if (bill.items && bill.items.length > 0) {
                        const formattedDate = company.dateFormat === 'nepali'
                            ? new NepaliDate(bill.date).format('YYYY-MM-DD')
                            : new Date(bill.date).toISOString().split('T')[0];

                        bill.items.forEach((item) => {
                            const quantity = item.quantity ? parseFloat(item.quantity) : 0;
                            const rate = item.puPrice || item.price || 0;
                            const discount = item.discountAmountPerItem || 0;
                            const taxable = (item.netPrice || 0) * quantity;
                            const vat = bill.vatAmount || 0;
                            const total = bill.totalAmount || 0;

                            grandTotalQty += quantity;
                            grandTotalAmount += total;
                            grandTotalVat += vat;
                            grandTotalTaxable += taxable;
                            grandTotalDiscount += discount;

                            const rowData = [
                                formattedDate,
                                bill.billNumber,
                                bill.type,
                                bill.paymentMode,
                                item.item?.name || item.productName || 'N/A',
                                quantity.toFixed(2),
                                item.unit?.name || '',
                                formatCurrencyForExport(rate),
                                formatCurrencyForExport(discount),
                                formatCurrencyForExport(taxable),
                                formatCurrencyForExport(vat),
                                formatCurrencyForExport(total)
                            ];
                            excelData.push(rowData);
                        });
                    }
                });

                excelData.push([]);
                excelData.push([
                    'GRAND TOTALS', '', '', '', '',
                    grandTotalQty.toFixed(2), '',
                    '',
                    formatCurrencyForExport(grandTotalDiscount),
                    formatCurrencyForExport(grandTotalTaxable),
                    formatCurrencyForExport(grandTotalVat),
                    formatCurrencyForExport(grandTotalAmount)
                ]);
            }

            const ws = XLSX.utils.aoa_to_sheet(excelData);

            ws['!cols'] = viewMode === 'regular'
                ? [{ wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }]
                : [{ wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 25 }, { wch: 10 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 15 }];

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Statement Report');

            const fileName = `Statement_${data.partyName}_${data.fromDate}_to_${data.toDate}_${viewMode}.xlsx`;
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

    const formatBalance = (amount) => {
        return amount > 0 ? `${formatCurrency(amount)} Dr` : `${formatCurrency(Math.abs(amount))} Cr`;
    };

    const resetColumnWidths = () => {
        setColumnWidths({
            date: 90,
            voucherNo: 100,
            voucherType: 80,
            payMode: 80,
            account: 200,
            debit: 100,
            credit: 100,
            balance: 100
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
        const totalWidth = columnWidths.date + columnWidths.voucherNo + columnWidths.voucherType +
            columnWidths.payMode + columnWidths.account + columnWidths.debit +
            columnWidths.credit + columnWidths.balance;

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
                    <strong style={{ fontSize: '0.75rem' }}>Vch No.</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.voucherNo - 3} columnName="voucherNo" />
                </div>
                <div className="d-flex align-items-center px-1 border-end position-relative" style={{ width: `${columnWidths.voucherType}px`, flexShrink: 0, minWidth: '60px' }}>
                    <strong style={{ fontSize: '0.75rem' }}>Type</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.voucherType - 3} columnName="voucherType" />
                </div>
                <div className="d-flex align-items-center px-1 border-end position-relative" style={{ width: `${columnWidths.payMode}px`, flexShrink: 0, minWidth: '60px' }}>
                    <strong style={{ fontSize: '0.75rem' }}>Pay Mode</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.payMode - 3} columnName="payMode" />
                </div>
                <div className="d-flex align-items-center px-1 border-end position-relative" style={{ width: `${columnWidths.account}px`, flexShrink: 0, minWidth: '100px' }}>
                    <strong style={{ fontSize: '0.75rem' }}>Account</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.account - 3} columnName="account" />
                </div>
                <div className="d-flex align-items-center justify-content-end px-1 border-end position-relative" style={{ width: `${columnWidths.debit}px`, flexShrink: 0, minWidth: '80px' }}>
                    <strong style={{ fontSize: '0.75rem' }}>Debit</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.debit - 2} columnName="debit" />
                </div>
                <div className="d-flex align-items-center justify-content-end px-1 border-end position-relative" style={{ width: `${columnWidths.credit}px`, flexShrink: 0, minWidth: '80px' }}>
                    <strong style={{ fontSize: '0.75rem' }}>Credit</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.credit - 2} columnName="credit" />
                </div>
                <div className="d-flex align-items-center justify-content-end px-1 position-relative" style={{ width: `${columnWidths.balance}px`, flexShrink: 0, minWidth: '80px' }}>
                    <strong style={{ fontSize: '0.75rem' }}>Balance</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.balance - 2} columnName="balance" />
                </div>

                {isResizing && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, cursor: 'col-resize' }} />
                )}
            </div>
        );
    });

    // Table Row Component
    // const TableRow = React.memo(({ index, style, data: rowData }) => {
    //     const { statement, selectedRowIndex, formatCurrency, formatBalance, handleRowClick, handleRowDoubleClick } = rowData;
    //     const item = statement[index];

    //     if (!item) return null;

    //     const isSelected = selectedRowIndex === index;

    //     return (
    //         <div
    //             style={{
    //                 ...style,
    //                 display: 'flex',
    //                 alignItems: 'center',
    //                 height: '28px',
    //                 minHeight: '28px',
    //                 padding: '0',
    //                 borderBottom: '1px solid #dee2e6',
    //                 cursor: 'pointer',
    //                 backgroundColor: isSelected ? '#e7f3ff' : (index % 2 === 0 ? '#f8f9fa' : 'white')
    //             }}
    //             onClick={() => handleRowClick(index)}
    //             onDoubleClick={() => handleRowDoubleClick(item)}
    //         >
    //             <div className="d-flex align-items-center justify-content-center px-1 border-end" style={{ width: `${columnWidths.date}px`, flexShrink: 0, height: '100%' }}>
    //                 <span style={{ fontSize: '0.75rem' }}>{item.date ? (company.dateFormat === 'nepali'
    //                     ? new NepaliDate(item.date).format('YYYY-MM-DD')
    //                     : new Date(item.date).toISOString().split('T')[0]) : ''}</span>
    //             </div>
    //             <div className="d-flex align-items-center px-1 border-end" style={{ width: `${columnWidths.voucherNo}px`, flexShrink: 0, height: '100%', overflow: 'hidden' }}>
    //                 <span style={{ fontSize: '0.75rem' }}>{item.billNumber || ''}</span>
    //             </div>
    //             <div className="d-flex align-items-center px-1 border-end" style={{ width: `${columnWidths.voucherType}px`, flexShrink: 0, height: '100%', overflow: 'hidden' }}>
    //                 <span style={{ fontSize: '0.75rem' }}>{item.type || ''}</span>
    //             </div>
    //             <div className="d-flex align-items-center px-1 border-end" style={{ width: `${columnWidths.payMode}px`, flexShrink: 0, height: '100%', overflow: 'hidden' }}>
    //                 <span style={{ fontSize: '0.75rem' }}>{item.paymentMode || ''}</span>
    //             </div>
    //             <div className="d-flex align-items-center px-1 border-end" style={{ width: `${columnWidths.account}px`, flexShrink: 0, height: '100%', overflow: 'hidden' }} title={item.accountType || item.purchaseSalesType || item.purchaseSalesReturnType || item.PaymentReceiptType || item.journalAccountType || 'Opening'}>
    //                 <span style={{ fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
    //                     {item.accountType || item.purchaseSalesType || item.PaymentReceiptType || item.journalAccountType || 'Opening'}
    //                 </span>
    //             </div>
    //             <div className="d-flex align-items-center justify-content-end px-1 border-end" style={{ width: `${columnWidths.debit}px`, flexShrink: 0, height: '100%' }}>
    //                 <span style={{ fontSize: '0.75rem' }}>{formatCurrency(item.debit)}</span>
    //             </div>
    //             <div className="d-flex align-items-center justify-content-end px-1 border-end" style={{ width: `${columnWidths.credit}px`, flexShrink: 0, height: '100%' }}>
    //                 <span style={{ fontSize: '0.75rem' }}>{formatCurrency(item.credit)}</span>
    //             </div>
    //             <div className="d-flex align-items-center justify-content-end px-1" style={{ width: `${columnWidths.balance}px`, flexShrink: 0, height: '100%' }}>
    //                 <span style={{ fontSize: '0.75rem' }}>{formatBalance(item.balance)}</span>
    //             </div>
    //         </div>
    //     );
    // });

    // Table Row Component - Update the account column display
    const TableRow = React.memo(({ index, style, data: rowData }) => {
        const { statement, selectedRowIndex, formatCurrency, formatBalance, handleRowClick, handleRowDoubleClick } = rowData;
        const item = statement[index];

        if (!item) return null;

        const isSelected = selectedRowIndex === index;

        // *** ADD THIS FUNCTION TO FORMAT ACCOUNT NAME WITH PARTY BILL NUMBER ***
        const getFormattedAccountName = (item) => {
            // For Purchase transactions
            if (item.type === 'Purc') {
                if (item.partyBillNumber) {
                    return `Purchase ${item.partyBillNumber}`;
                }
                return item.accountType || item.purchaseSalesType || 'Purchase';
            }
            // For Purchase Return transactions
            if (item.type === 'PrRt') {
                if (item.partyBillNumber) {
                    return `Purchase Return ${item.partyBillNumber}`;
                }
                return item.accountType || item.purchaseSalesReturnType || 'Purchase Return';
            }
            // For other transaction types
            return item.accountType || item.purchaseSalesType || item.purchaseSalesReturnType ||
                item.PaymentReceiptType || item.journalAccountType || 'Opening';
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
                onDoubleClick={() => handleRowDoubleClick(item)}
            >
                {/* Date Column */}
                <div className="d-flex align-items-center justify-content-center px-1 border-end" style={{ width: `${columnWidths.date}px`, flexShrink: 0, height: '100%' }}>
                    <span style={{ fontSize: '0.75rem' }}>{item.date ? (company.dateFormat === 'nepali'
                        ? new NepaliDate(item.date).format('YYYY-MM-DD')
                        : new Date(item.date).toISOString().split('T')[0]) : ''}</span>
                </div>

                {/* Voucher No Column */}
                <div className="d-flex align-items-center px-1 border-end" style={{ width: `${columnWidths.voucherNo}px`, flexShrink: 0, height: '100%', overflow: 'hidden' }}>
                    <span style={{ fontSize: '0.75rem' }}>{item.billNumber || ''}</span>
                </div>

                {/* Type Column */}
                <div className="d-flex align-items-center px-1 border-end" style={{ width: `${columnWidths.voucherType}px`, flexShrink: 0, height: '100%', overflow: 'hidden' }}>
                    <span style={{ fontSize: '0.75rem' }}>{item.type || ''}</span>
                </div>

                {/* Pay Mode Column */}
                <div className="d-flex align-items-center px-1 border-end" style={{ width: `${columnWidths.payMode}px`, flexShrink: 0, height: '100%', overflow: 'hidden' }}>
                    <span style={{ fontSize: '0.75rem' }}>{item.paymentMode || ''}</span>
                </div>

                {/* Account Column - MODIFIED HERE */}
                <div
                    className="d-flex align-items-center px-1 border-end"
                    style={{ width: `${columnWidths.account}px`, flexShrink: 0, height: '100%', overflow: 'hidden' }}
                    title={getFormattedAccountName(item)}
                >
                    <span style={{ fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {getFormattedAccountName(item)}
                    </span>
                </div>

                {/* Debit Column */}
                <div className="d-flex align-items-center justify-content-end px-1 border-end" style={{ width: `${columnWidths.debit}px`, flexShrink: 0, height: '100%' }}>
                    <span style={{ fontSize: '0.75rem' }}>{formatCurrency(item.debit)}</span>
                </div>

                {/* Credit Column */}
                <div className="d-flex align-items-center justify-content-end px-1 border-end" style={{ width: `${columnWidths.credit}px`, flexShrink: 0, height: '100%' }}>
                    <span style={{ fontSize: '0.75rem' }}>{formatCurrency(item.credit)}</span>
                </div>

                {/* Balance Column */}
                <div className="d-flex align-items-center justify-content-end px-1" style={{ width: `${columnWidths.balance}px`, flexShrink: 0, height: '100%' }}>
                    <span style={{ fontSize: '0.75rem' }}>{formatBalance(item.balance)}</span>
                </div>
            </div>
        );
    });

    if (loading && !data.statement.length) return <Loader />;

    return (
        <div className="container-fluid">
            <Header />
            <div className="card mt-2 shadow-lg p-0 animate__animated animate__fadeInUp expanded-card ledger-card compact">
                <div className="card-header bg-white py-0">
                    <h1 className="h4 mb-0 text-center text-primary">Statement</h1>
                </div>

                <div className="card-body p-2 p-md-3">
                    {/* Filter Row */}
                    <div className="row g-2 mb-3">
                        {/* Party Name Selection */}
                        <div className="col-12 col-md-2">
                            <div className="position-relative">
                                <input
                                    type="text"
                                    id="account"
                                    name="account"
                                    className="form-control form-control-sm"
                                    value={data.partyName}
                                    onClick={() => setShowAccountModal(true)}
                                    readOnly
                                    style={{ height: '30px', fontSize: '0.875rem', paddingTop: '0.25rem', cursor: 'pointer' }}
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
                                    Party Name: <span className="text-danger">*</span>
                                </label>
                            </div>
                        </div>

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
                                    onKeyDown={(e) => handleKeyDown(e, 'paymentMode')}
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

                        {/* Payment Mode */}
                        <div className="col-12 col-md-2">
                            <div className="position-relative">
                                <select
                                    className="form-select form-select-sm"
                                    id="paymentMode"
                                    ref={paymentModeRef}
                                    value={data.paymentMode}
                                    onKeyDown={(e) => handleKeyDown(e, 'viewMode')}
                                    onChange={handlePaymentModeChange}
                                    style={{ height: '30px', fontSize: '0.875rem', paddingTop: '0.25rem', width: '100%' }}
                                >
                                    {paymentModeOptions.map(option => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
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
                                    Payment Mode
                                </label>
                            </div>
                        </div>

                        {/* View Mode */}
                        <div className="col-12 col-md-1">
                            <div className="position-relative">
                                <select
                                    className="form-select form-select-sm"
                                    id="viewMode"
                                    value={viewMode}
                                    onKeyDown={(e) => handleKeyDown(e, 'generateReport')}
                                    onChange={handleViewModeChange}
                                    style={{ height: '30px', fontSize: '0.875rem', paddingTop: '0.25rem', width: '100%' }}
                                >
                                    <option value="regular">Regular</option>
                                    <option value="itemwise">Itemwise</option>
                                </select>
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
                                    View Mode
                                </label>
                            </div>
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
                                    disabled={data.statement.length === 0}
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
                                type="button"
                                id="generateReport"
                                ref={generateReportRef}
                                className="btn btn-primary btn-sm"
                                onClick={handleGenerateReport}
                                style={{ height: '30px', fontSize: '0.8rem', padding: '0 12px', fontWeight: '500', whiteSpace: 'nowrap' }}
                            >
                                <i className="fas fa-chart-line me-1"></i>Generate
                            </button>
                            <button
                                className="btn btn-success btn-sm"
                                onClick={handleExportExcel}
                                disabled={(viewMode === 'regular' && data.statement.length === 0) || (viewMode === 'itemwise' && data.itemwiseStatement.length === 0) || exporting}
                                style={{ height: '30px', fontSize: '0.8rem', padding: '0 12px', fontWeight: '500', whiteSpace: 'nowrap' }}
                            >
                                {exporting ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="fas fa-file-excel me-1"></i>}
                                Excel
                            </button>
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={handlePrint}
                                disabled={(viewMode === 'regular' && data.statement.length === 0) || (viewMode === 'itemwise' && data.itemwiseStatement.length === 0)}
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

                    {/* Statement Table */}
                    {data.statement.length === 0 && data.itemwiseStatement.length === 0 ? (
                        <div className="alert alert-info text-center py-3" style={{ fontSize: '0.875rem' }}>
                            <i className="fas fa-info-circle me-2"></i>
                            Please select account, date range and click "Generate Report" to view statement
                        </div>
                    ) : (
                        <>
                            <div style={{ height: "450px", border: '1px solid #dee2e6', backgroundColor: '#fff', position: 'relative' }} ref={tableBodyRef}>
                                {loading ? (
                                    <div className="d-flex flex-column justify-content-center align-items-center h-100">
                                        <div className="spinner-border spinner-border-sm text-primary" role="status">
                                            <span className="visually-hidden">Loading...</span>
                                        </div>
                                        <p className="mt-2 small text-muted">Loading statement...</p>
                                    </div>
                                ) : viewMode === 'regular' ? (
                                    filteredStatement.length === 0 ? (
                                        <div className="d-flex flex-column justify-content-center align-items-center h-100">
                                            <i className="bi bi-search text-muted" style={{ fontSize: '1.5rem' }}></i>
                                            <h6 className="mt-2 text-muted">No transactions found</h6>
                                            <p className="text-muted small">{searchQuery ? 'Try a different search term' : 'No data for the selected criteria'}</p>
                                        </div>
                                    ) : (
                                        <AutoSizer>
                                            {({ height, width }) => {
                                                const totalWidth = columnWidths.date + columnWidths.voucherNo + columnWidths.voucherType +
                                                    columnWidths.payMode + columnWidths.account + columnWidths.debit +
                                                    columnWidths.credit + columnWidths.balance;

                                                return (
                                                    <div style={{ position: 'relative', height: height, width: Math.max(width, totalWidth) }}>
                                                        <TableHeader />
                                                        <List
                                                            height={height - 28}
                                                            itemCount={filteredStatement.length}
                                                            itemSize={28}
                                                            width={Math.max(width, totalWidth)}
                                                            itemData={{
                                                                statement: filteredStatement,
                                                                selectedRowIndex,
                                                                formatCurrency,
                                                                formatBalance,
                                                                handleRowClick,
                                                                handleRowDoubleClick
                                                            }}
                                                        >
                                                            {TableRow}
                                                        </List>
                                                    </div>
                                                );
                                            }}
                                        </AutoSizer>
                                    )
                                ) : (
                                    // Itemwise view - show the table
                                    data.itemwiseStatement.length === 0 ? (
                                        <div className="d-flex flex-column justify-content-center align-items-center h-100">
                                            <i className="bi bi-box-seam text-muted" style={{ fontSize: '1.5rem' }}></i>
                                            <h6 className="mt-2 text-muted">No items found</h6>
                                            <p className="text-muted small">No item transactions for the selected criteria</p>
                                        </div>
                                    ) : (
                                        <div style={{ height: "100%", overflow: 'auto' }}>
                                            <table className="table table-sm table-bordered table-hover mb-0" style={{ fontSize: '0.75rem', minWidth: '1200px' }}>
                                                <thead className="bg-light sticky-top" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                                                    <tr>
                                                        <th style={{ width: '8%' }}>Date</th>
                                                        <th style={{ width: '10%' }}>Vch No.</th>
                                                        <th style={{ width: '8%' }}>Type</th>
                                                        <th style={{ width: '8%' }}>Pay Mode</th>
                                                        <th style={{ width: '15%' }}>Item Name</th>
                                                        <th style={{ width: '6%' }} className="text-end">Qty</th>
                                                        <th style={{ width: '6%' }}>Unit</th>
                                                        <th style={{ width: '8%' }} className="text-end">Rate (Rs.)</th>
                                                        <th style={{ width: '8%' }} className="text-end">Discount (Rs.)</th>
                                                        <th style={{ width: '8%' }} className="text-end">Taxable (Rs.)</th>
                                                        <th style={{ width: '6%' }} className="text-end">VAT (Rs.)</th>
                                                        <th style={{ width: '9%' }} className="text-end">Total (Rs.)</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {/* {data.itemwiseStatement.map((bill, billIndex) => (
                                                        bill.items && bill.items.map((item, itemIndex) => {
                                                            const formattedDate = company.dateFormat === 'nepali'
                                                                ? new NepaliDate(bill.date).format('YYYY-MM-DD')
                                                                : new Date(bill.date).toISOString().split('T')[0];

                                                            const quantity = item.quantity ? parseFloat(item.quantity) : 0;
                                                            const rate = item.puPrice || item.price || 0;
                                                            const discount = item.discountAmountPerItem || 0;
                                                            const taxable = (item.taxableAmount || 0);
                                                            const vat = bill.vatAmount || 0;
                                                            const total = bill.totalAmount || 0;

                                                            return (
                                                                <tr key={`${bill.billNumber}-${itemIndex}`} style={{ backgroundColor: (billIndex + itemIndex) % 2 === 0 ? '#f8f9fa' : 'white' }}>
                                                                    <td className="nowrap">{formattedDate}</td>
                                                                    <td className="nowrap">{bill.billNumber || ''}</td>
                                                                    <td className="nowrap">{bill.type || ''}</td>
                                                                    <td className="nowrap">{bill.paymentMode || ''}</td>
                                                                    <td style={{ whiteSpace: 'normal', wordWrap: 'break-word' }}>{item.item?.name || item.productName || 'N/A'}</td>
                                                                    <td className="text-end">{quantity.toFixed(2)}</td>
                                                                    <td>{item.unit?.name || ''}</td>
                                                                    <td className="text-end">{formatCurrency(rate)}</td>
                                                                    <td className="text-end">{formatCurrency(discount)}</td>
                                                                    <td className="text-end">{formatCurrency(taxable)}</td>
                                                                    <td className="text-end">{formatCurrency(vat)}</td>
                                                                    <td className="text-end">{formatCurrency(total)}</td>
                                                                </tr>
                                                            );
                                                        })
                                                    ))} */}

                                                    {data.itemwiseStatement.map((bill, billIndex) => (
                                                        bill.items && bill.items.map((item, itemIndex) => {
                                                            const formattedDate = company.dateFormat === 'nepali'
                                                                ? new NepaliDate(bill.date).format('YYYY-MM-DD')
                                                                : new Date(bill.date).toISOString().split('T')[0];

                                                            const quantity = item.quantity ? parseFloat(item.quantity) : 0;
                                                            const rate = item.puPrice || item.price || 0;
                                                            const discount = item.discountAmountPerItem || 0;
                                                            // Use item.taxableAmount and item.vatAmount from backend
                                                            const taxable = item.taxableAmount || 0;
                                                            const vat = item.vatAmount || 0;
                                                            const total = item.totalAmount || (taxable + vat);

                                                            return (
                                                                <tr key={`${bill.billNumber}-${itemIndex}`} style={{ backgroundColor: (billIndex + itemIndex) % 2 === 0 ? '#f8f9fa' : 'white' }}>
                                                                    <td className="nowrap">{formattedDate}</td>
                                                                    <td className="nowrap">{bill.billNumber || ''}</td>
                                                                    <td className="nowrap">{bill.type || ''}</td>
                                                                    <td className="nowrap">{bill.paymentMode || ''}</td>
                                                                    <td style={{ whiteSpace: 'normal', wordWrap: 'break-word' }}>{item.item?.name || item.productName || 'N/A'}</td>
                                                                    <td className="text-end">{quantity.toFixed(2)}</td>
                                                                    <td>{item.unit?.name || ''}</td>
                                                                    <td className="text-end">{formatCurrency(rate)}</td>
                                                                    <td className="text-end">{formatCurrency(discount)}</td>
                                                                    <td className="text-end">{formatCurrency(taxable)}</td>
                                                                    <td className="text-end">{formatCurrency(vat)}</td>
                                                                    <td className="text-end">{formatCurrency(total)}</td>
                                                                </tr>
                                                            );
                                                        })
                                                    ))}
                                                </tbody>
                                                {(() => {
                                                    let grandTotalQty = 0;
                                                    let grandTotalAmount = 0;
                                                    let grandTotalVat = 0;
                                                    let grandTotalTaxable = 0;
                                                    let grandTotalDiscount = 0;

                                                    data.itemwiseStatement.forEach((bill) => {
                                                        if (bill.items && bill.items.length > 0) {
                                                            bill.items.forEach((item) => {
                                                                const quantity = item.quantity ? parseFloat(item.quantity) : 0;
                                                                const discount = item.discountAmountPerItem || 0;
                                                                const taxable = (item.netPrice || 0) * quantity;
                                                                const vat = bill.vatAmount || 0;
                                                                const total = bill.totalAmount || 0;

                                                                grandTotalQty += quantity;
                                                                grandTotalAmount += total;
                                                                grandTotalVat += vat;
                                                                grandTotalTaxable += taxable;
                                                                grandTotalDiscount += discount;
                                                            });
                                                        }
                                                    });

                                                    return (
                                                        <tfoot>
                                                            <tr style={{ fontWeight: 'bold', borderTop: '2px solid #dee2e6', backgroundColor: '#f8f9fa' }}>
                                                                <td colSpan="5" className="text-end"><strong>Grand Totals:</strong></td>
                                                                <td className="text-end"><strong>{grandTotalQty.toFixed(2)}</strong></td>
                                                                <td></td>
                                                                <td></td>
                                                                <td className="text-end"><strong>{formatCurrency(grandTotalDiscount)}</strong></td>
                                                                <td className="text-end"><strong>{formatCurrency(grandTotalTaxable)}</strong></td>
                                                                <td className="text-end"><strong>{formatCurrency(grandTotalVat)}</strong></td>
                                                                <td className="text-end"><strong>{formatCurrency(grandTotalAmount)}</strong></td>
                                                            </tr>
                                                        </tfoot>
                                                    );
                                                })()}
                                            </table>
                                        </div>
                                    )
                                )}
                            </div>

                            {/* Footer with totals - only for regular view */}
                            {viewMode === 'regular' && filteredStatement.length > 0 && (
                                <div className="d-flex bg-light border-top sticky-bottom" style={{ zIndex: 2, height: '28px', borderTop: '2px solid #dee2e6' }}>
                                    <div className="d-flex align-items-center px-1" style={{ width: `${columnWidths.date + columnWidths.voucherNo + columnWidths.voucherType + columnWidths.payMode + columnWidths.account}px`, flexShrink: 0, height: '100%' }}>
                                        <strong style={{ fontSize: '0.75rem' }}>Totals:</strong>
                                    </div>
                                    <div className="d-flex align-items-center justify-content-end px-1 border-start" style={{ width: `${columnWidths.debit}px`, flexShrink: 0, height: '100%' }}>
                                        <strong style={{ fontSize: '0.75rem' }}>{formatCurrency(data.totalDebit)}</strong>
                                    </div>
                                    <div className="d-flex align-items-center justify-content-end px-1 border-start" style={{ width: `${columnWidths.credit}px`, flexShrink: 0, height: '100%' }}>
                                        <strong style={{ fontSize: '0.75rem' }}>{formatCurrency(data.totalCredit)}</strong>
                                    </div>
                                    <div className="d-flex align-items-center justify-content-end px-1 border-start" style={{ width: `${columnWidths.balance}px`, flexShrink: 0, height: '100%' }}>
                                        <strong style={{ fontSize: '0.75rem' }}>{formatBalance(filteredStatement.length > 0 ? filteredStatement[filteredStatement.length - 1].balance : 0)}</strong>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Account Selection Modal with Virtualized List */}
            {showAccountModal && (
                <>
                    <div className="modal-backdrop fade show" style={{ zIndex: 1040 }}></div>
                    <div
                        className="modal fade show"
                        tabIndex="-1"
                        style={{ display: 'block', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1050 }}
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                                e.preventDefault();
                                setShowAccountModal(false);
                                const focusTargetId = getFocusTargetOnModalClose();
                                setTimeout(() => document.getElementById(focusTargetId)?.focus(), 50);
                            }
                        }}
                    >
                        <div className="modal-dialog modal-xl modal-dialog-centered" style={{ maxWidth: '70%' }}>
                            <div className="modal-content" style={{ height: '500px' }}>
                                <div className="modal-header py-1">
                                    <h5 className="modal-title" style={{ fontSize: '0.9rem' }}>
                                        Select Account
                                    </h5>
                                    <small className="ms-auto text-muted" style={{ fontSize: '0.7rem' }}>
                                        {totalAccounts > 0 ? `${accounts.length} of ${totalAccounts} accounts shown` : 'Loading accounts...'}
                                    </small>
                                    <button
                                        type="button"
                                        className="btn-close"
                                        onClick={() => {
                                            setShowAccountModal(false);
                                            const focusTargetId = getFocusTargetOnModalClose();
                                            setTimeout(() => document.getElementById(focusTargetId)?.focus(), 50);
                                        }}
                                    ></button>
                                </div>
                                <div className="p-2 bg-white sticky-top">
                                    <input
                                        type="text"
                                        id="searchAccount"
                                        className="form-control form-control-sm"
                                        placeholder="Search Account..."
                                        autoFocus
                                        autoComplete='off'
                                        value={accountSearchQuery}
                                        onChange={handleAccountSearch}
                                        onKeyDown={(e) => {
                                            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                                                e.preventDefault();
                                                const firstAccountItem = document.querySelector('.account-item');
                                                if (firstAccountItem) firstAccountItem.focus();
                                            } else if (e.key === 'Enter') {
                                                e.preventDefault();
                                                const activeItem = document.querySelector('.account-item.active');
                                                if (activeItem) {
                                                    const accountId = activeItem.getAttribute('data-account-id');
                                                    const account = accounts.find(a => a.id === accountId);
                                                    if (account) selectAccount(account);
                                                } else {
                                                    setShowAccountModal(false);
                                                    const focusTargetId = getFocusTargetOnModalClose();
                                                    setTimeout(() => document.getElementById(focusTargetId)?.focus(), 50);
                                                }
                                            }
                                        }}
                                        ref={accountSearchRef}
                                        style={{ height: '24px', fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                    />
                                </div>
                                <div className="modal-body p-0">
                                    <div style={{ height: 'calc(500px - 120px)' }}>
                                        <VirtualizedAccountList
                                            accounts={accounts}
                                            onAccountClick={selectAccount}
                                            searchRef={accountSearchRef}
                                            hasMore={hasMoreAccountResults}
                                            isSearching={isAccountSearching}
                                            onLoadMore={loadMoreAccounts}
                                            totalAccounts={totalAccounts}
                                            page={accountSearchPage}
                                            searchQuery={accountShouldShowLastSearchResults ? accountLastSearchQuery : accountSearchQuery}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Product Modal */}
            {showProductModal && <ProductModal onClose={() => setShowProductModal(false)} />}

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

export default Statement;