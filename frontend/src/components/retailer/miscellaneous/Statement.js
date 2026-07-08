import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../Header';
import NepaliDate from 'nepali-datetime';
import { usePageNotRefreshContext } from '../PageNotRefreshContext';
import '../../../stylesheet/noDateIcon.css';
import Loader from '../../Loader';
import ProductModal from '../dashboard/modals/ProductModal';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import * as XLSX from 'xlsx';
import NotificationToast from '../../NotificationToast';
import VirtualizedAccountList from '../../VirtualizedAccountList';

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

    // SPLIT STATE: Separate date range from other data
    const [dateRange, setDateRange] = useState(() => {
        if (draftSave && draftSave.statementData) {
            return {
                fromDate: draftSave.statementData.fromDate || '',
                toDate: draftSave.statementData.toDate || '',
                fromDateAd: draftSave.statementData.fromDateAd || '',
                toDateAd: draftSave.statementData.toDateAd || ''
            };
        }
        return {
            fromDate: '',
            toDate: '',
            fromDateAd: '',
            toDateAd: ''
        };
    });

    const [data, setData] = useState(() => {
        if (draftSave && draftSave.statementData) {
            return {
                company: draftSave.statementData.company || null,
                currentFiscalYear: draftSave.statementData.currentFiscalYear || null,
                statement: draftSave.statementData.statement || [],
                itemwiseStatement: draftSave.statementData.itemwiseStatement || [],
                accounts: draftSave.statementData.accounts || [],
                selectedCompany: draftSave.statementData.selectedCompany || null,
                partyName: draftSave.statementData.partyName || '',
                paymentMode: draftSave.statementData.paymentMode || 'all',
                totalDebit: draftSave.statementData.totalDebit || 0,
                totalCredit: draftSave.statementData.totalCredit || 0,
                openingBalance: draftSave.statementData.openingBalance || 0,
                currentCompanyName: draftSave.statementData.currentCompanyName || '',
                companyDateFormat: draftSave.statementData.companyDateFormat || 'english',
                nepaliDate: draftSave.statementData.nepaliDate || '',
                user: draftSave.statementData.user || null,
                selectedAccountUniqueNumber: draftSave.statementData.selectedAccountUniqueNumber || null,
                selectedAccountName: draftSave.statementData.selectedAccountName || null
            };
        }
        return {
            company: null,
            currentFiscalYear: null,
            statement: [],
            itemwiseStatement: [],
            accounts: [],
            selectedCompany: null,
            partyName: '',
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

    // Column resizing state - Updated with BS Date and AD Date columns
    const [columnWidths, setColumnWidths] = useState({
        bsDate: 90,
        adDate: 90,
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
            statementData: {
                ...data,
                fromDate: dateRange.fromDate,
                toDate: dateRange.toDate,
                fromDateAd: dateRange.fromDateAd,
                toDateAd: dateRange.toDateAd
            },
            statementViewMode: viewMode,
            statementSearch: {
                searchQuery,
                selectedRowIndex,
                fromDate: dateRange.fromDate,
                toDate: dateRange.toDate,
                paymentMode: data.paymentMode,
                selectedCompany: data.selectedCompany
            }
        });
    }, [data, viewMode, searchQuery, selectedRowIndex, dateRange.fromDate, dateRange.toDate, dateRange.fromDateAd, dateRange.toDateAd]);

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
                    const isNepaliFormat = dateFormat === 'nepali';

                    setCompany({
                        ...responseData.company,
                        dateFormat: dateFormat,
                        vatEnabled: responseData.company?.vatEnabled !== false
                    });

                    // Get fiscal year dates and format them for display
                    const currentFiscalYear = responseData.currentFiscalYear;
                    const hasDraftDates = draftSave?.statementData?.fromDate && draftSave?.statementData?.toDate;

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
                            toDateFormatted = currentEnglishDate;
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

                    setData(prev => ({
                        ...prev,
                        company: responseData.company,
                        currentFiscalYear: currentFiscalYear,
                        companyDateFormat: responseData.companyDateFormat,
                        nepaliDate: responseData.nepaliDate,
                        currentCompanyName: responseData.currentCompanyName,
                        user: responseData.user
                    }));
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

                // Use AD dates for API call
                if (dateRange.fromDateAd) params.append('fromDate', dateRange.fromDateAd);
                if (dateRange.toDateAd) params.append('toDate', dateRange.toDateAd);
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
    }, [shouldFetch, viewMode, company.dateFormat, dateRange.fromDateAd, dateRange.toDateAd, data.selectedCompany, data.paymentMode]);

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
        { value: 'all', label: 'All (Inc. Cash)' },
        { value: 'exclude-cash', label: 'All (Exc. Cash)' },
        { value: 'cash', label: 'Cash' },
        { value: 'credit', label: 'Credit' }
    ];

    const selectAccount = (account) => {
        const formattedName = `${account.uniqueNumber || ''} ${account.name}`.trim();
        setData(prev => ({
            ...prev,
            selectedCompany: account.id,
            partyName: formattedName,
            selectedAccountUniqueNumber: account.uniqueNumber,
            selectedAccountName: account.name
        }));
        setShowAccountModal(false);
        setAccountSearchQuery('');

        setTimeout(() => {
            if (fromDateRef.current) {
                fromDateRef.current.focus();
            }
        }, 50);
    };

    const handlePaymentModeChange = (e) => {
        setData(prev => ({ ...prev, paymentMode: e.target.value }));
    };

    const handleViewModeChange = (e) => {
        setViewMode(e.target.value);
    };

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

    const handlePrint = () => {
        // Determine which data to print based on view mode
        let rowsToPrint;
        if (viewMode === 'regular') {
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
                        margin: 5mm;
                        size: A4 portrait;
                    }
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
                    tr { 
                        page-break-inside: avoid; 
                        page-break-after: auto; 
                    }
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
                    td {
                        font-size: 10px;
                        padding: 4px 6px;
                    }
                    .print-header { 
                        text-align: center; 
                        margin-bottom: 10px; 
                    }
                    .text-end { 
                        text-align: right; 
                    }
                    .text-center {
                        text-align: center;
                    }
                    .nowrap {
                        white-space: nowrap;
                    }
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
                    .statement-info {
                        font-size: 10px;
                        margin: 4px 0;
                        color: #444;
                        line-height: 1.6;
                    }
                    .statement-info strong {
                        font-weight: 600;
                        color: #1a1a1a;
                    }
                    .footer {
                        margin-top: 15px;
                        font-size: 9px;
                        text-align: center;
                        border-top: 1px solid #ccc;
                        padding-top: 8px;
                        color: #666;
                    }
                    .total-label {
                        font-size: 11px;
                        font-weight: 600;
                    }
                    .voucher-type {
                        font-weight: 500;
                        color: #1a1a1a;
                    }
                    .amount-positive {
                        font-weight: 500;
                    }
                    .amount-negative {
                        font-weight: 500;
                    }
                    .balance-text {
                        font-weight: 600;
                    }
                    /* Ensure tables don't break across pages badly */
                    table {
                        page-break-inside: auto;
                    }
                    thead {
                        display: table-header-group;
                    }
                    tbody {
                        display: table-row-group;
                    }
                    /* Responsive cell sizing */
                    .col-miti { min-width: 80px; }
                    .col-date { min-width: 80px; }
                    .col-vch { min-width: 70px; }
                    .col-type { min-width: 60px; }
                    .col-paymode { min-width: 80px; }
                    .col-account { min-width: 120px; }
                    .col-amount { min-width: 80px; }
                    .col-balance { min-width: 90px; }
                    
                    /* Itemwise specific */
                    .col-item { min-width: 120px; }
                    .col-qty { min-width: 60px; }
                    .col-unit { min-width: 50px; }
                    .col-rate { min-width: 70px; }
                    
                    @media print {
                        body { 
                            padding: 10px;
                        }
                        th, td {
                            padding: 3px 5px;
                        }
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

    //     const generateRegularPrintContent = (statementData) => {
    //         let balance = data.openingBalance;
    //         const statement = statementData;

    //         // Calculate totals
    //         let totalDebit = 0;
    //         let totalCredit = 0;
    //         const isNepaliFormat = company.dateFormat === 'nepali';

    //         let tableContent = `
    //     <div class="print-header">
    //         <div class="company-name">${data.currentCompanyName || 'Company Name'}</div>
    //         <div class="company-details">
    //             ${data.company?.address || ''}${data.company?.city ? ', ' + data.company.city : ''}<br>
    //             PAN: ${data.company?.pan || ''} | Phone: ${data.company?.phone || ''}
    //         </div>
    //         <hr style="margin:6px 0; border: 1px solid #ccc;">
    //         <div class="report-title">STATEMENT OF ACCOUNT</div>
    //         <div class="statement-info">
    //             <strong>Party:</strong> ${data.partyName} &nbsp;|&nbsp;
    //             <strong>From (BS):</strong> ${dateRange.fromDate} &nbsp;|&nbsp;
    //             <strong>To (BS):</strong> ${dateRange.toDate} &nbsp;|&nbsp;
    //             <strong>From (AD):</strong> ${dateRange.fromDateAd} &nbsp;|&nbsp;
    //             <strong>To (AD):</strong> ${dateRange.toDateAd} &nbsp;|&nbsp;
    //             <strong>Payment Mode:</strong> ${data.paymentMode === 'all' ? 'All (Include Cash)' : data.paymentMode === 'exclude-cash' ? 'All (Exclude Cash)' : data.paymentMode}
    //         </div>
    //     </div>
    //     <table cellspacing="0">
    //         <thead>
    //             <tr>
    //                 <th class="nowrap col-miti">Miti</th>
    //                 <th class="nowrap col-date">Date</th>
    //                 <th class="nowrap col-vch">Vch No.</th>
    //                 <th class="nowrap col-type">Type</th>
    //                 <th class="nowrap col-paymode">Pay Mode</th>
    //                 <th class="nowrap col-account">Account</th>
    //                 <th class="nowrap col-amount text-end">Debit (Rs.)</th>
    //                 <th class="nowrap col-amount text-end">Credit (Rs.)</th>
    //                 <th class="nowrap col-balance text-end">Balance (Rs.)</th>
    //             </tr>
    //         </thead>
    //         <tbody>
    // `;

    //         statement.forEach((item, index) => {
    //             const bsDate = item.nepaliDate || (isNepaliFormat ? new NepaliDate(item.date).format('YYYY-MM-DD') : '');
    //             const adDate = item.date ? new Date(item.date).toLocaleDateString() : '';

    //             const debitAmount = parseFloat(item.debit) || 0;
    //             const creditAmount = parseFloat(item.credit) || 0;

    //             // Update running balance
    //             balance = balance + debitAmount - creditAmount;

    //             totalDebit += debitAmount;
    //             totalCredit += creditAmount;

    //             const balanceText = balance > 0 ? `${formatCurrencyForPrint(Math.abs(balance))} Dr` : `${formatCurrencyForPrint(Math.abs(balance))} Cr`;

    //             // Get the account name
    //             let accountName = '';
    //             if (item.type === 'Pymt') {
    //                 accountName = item.PaymentReceiptType || item.accountType || '';
    //             } else if (item.type === 'Rcpt') {
    //                 accountName = item.PaymentReceiptType || item.accountType || '';
    //             } else {
    //                 accountName = item.accountType || item.purchaseSalesType || item.purchaseSalesReturnType || item.journalAccountType || '';
    //             }

    //             tableContent += `
    //         <tr>
    //             <td class="nowrap">${bsDate}</td>
    //             <td class="nowrap">${adDate}</td>
    //             <td class="nowrap">${item.billNumber || ''}</td>
    //             <td class="nowrap voucher-type">${item.type || ''}</td>
    //             <td class="nowrap">${item.paymentMode || ''}</td>
    //             <td style="white-space: normal; word-wrap: break-word; max-width: 150px;">${accountName}</td>
    //             <td class="text-end amount-positive">${debitAmount > 0 ? formatCurrencyForPrint(debitAmount) : '-'}</td>
    //             <td class="text-end amount-positive">${creditAmount > 0 ? formatCurrencyForPrint(creditAmount) : '-'}</td>
    //             <td class="text-end balance-text">${balanceText}</td>
    //         </tr>
    //     `;
    //         });

    //         const finalBalanceText = balance > 0 ? `${formatCurrencyForPrint(Math.abs(balance))} Dr` : `${formatCurrencyForPrint(Math.abs(balance))} Cr`;

    //         tableContent += `
    //         <tr class="grand-total-row">
    //             <td colspan="6" class="text-end total-label">TOTALS</td>
    //             <td class="text-end total-label">${formatCurrencyForPrint(totalDebit)}</td>
    //             <td class="text-end total-label">${formatCurrencyForPrint(totalCredit)}</td>
    //             <td class="text-end total-label">${finalBalanceText}</td>
    //         </tr>
    //         </tbody>
    //     </table>
    //     <div class="footer">
    //         Generated on: ${new Date().toLocaleString()} | Powered by Ams Software
    //     </div>
    // `;

    //         return tableContent;
    //     };

    const generateRegularPrintContent = (statementData) => {
        let balance = data.openingBalance;
        const statement = statementData;

        // Calculate totals
        let totalDebit = 0;
        let totalCredit = 0;
        const isNepaliFormat = company.dateFormat === 'nepali';

        let tableContent = `
    <div class="print-header">
        <div class="company-name">${data.currentCompanyName || 'Company Name'}</div>
        <div class="company-details">
            ${data.company?.address || ''}${data.company?.city ? ', ' + data.company.city : ''}<br>
            PAN: ${data.company?.pan || ''} | Phone: ${data.company?.phone || ''}
        </div>
        <hr style="margin:6px 0; border: 1px solid #ccc;">
        <div class="report-title">STATEMENT OF ACCOUNT</div>
        <div class="statement-info">
            <strong>Party:</strong> ${data.partyName} &nbsp;|&nbsp;
            <strong>From (BS):</strong> ${dateRange.fromDate} &nbsp;|&nbsp;
            <strong>To (BS):</strong> ${dateRange.toDate} &nbsp;|&nbsp;
            <strong>From (AD):</strong> ${dateRange.fromDateAd} &nbsp;|&nbsp;
            <strong>To (AD):</strong> ${dateRange.toDateAd} &nbsp;|&nbsp;
            <strong>Payment Mode:</strong> ${data.paymentMode === 'all' ? 'All (Include Cash)' : data.paymentMode === 'exclude-cash' ? 'All (Exclude Cash)' : data.paymentMode}
        </div>
    </div>
    <table cellspacing="0">
        <thead>
            <tr>
                <th class="nowrap col-miti">Miti</th>
                <th class="nowrap col-date">Date</th>
                <th class="nowrap col-vch">Vch No.</th>
                <th class="nowrap col-type">Type</th>
                <th class="nowrap col-paymode">Pay Mode</th>
                <th class="nowrap col-account">Account</th>
                <th class="nowrap col-amount text-end">Debit (Rs.)</th>
                <th class="nowrap col-amount text-end">Credit (Rs.)</th>
                <th class="nowrap col-balance text-end">Balance (Rs.)</th>
            </tr>
        </thead>
        <tbody>
`;

        statement.forEach((item, index) => {
            // Check if this is an opening balance entry
            const isOpeningBalance = item.accountType === 'Opening' ||
                item.type === 'Opening' ||
                (!item.type && item.accountType === 'Opening') ||
                (item.accountType === 'Opening');

            let bsDate = '';
            let adDate = '';

            if (isOpeningBalance) {
                // For opening balance, show the from date
                if (isNepaliFormat) {
                    bsDate = dateRange.fromDate || '';
                } else {
                    adDate = dateRange.fromDateAd || '';
                }
            } else {
                bsDate = item.nepaliDate || (isNepaliFormat ? new NepaliDate(item.date).format('YYYY-MM-DD') : '');
                adDate = item.date ? new Date(item.date).toLocaleDateString() : '';
            }

            const debitAmount = parseFloat(item.debit) || 0;
            const creditAmount = parseFloat(item.credit) || 0;

            // Update running balance
            balance = balance + debitAmount - creditAmount;

            totalDebit += debitAmount;
            totalCredit += creditAmount;

            const balanceText = balance > 0 ? `${formatCurrencyForPrint(Math.abs(balance))} Dr` : `${formatCurrencyForPrint(Math.abs(balance))} Cr`;

            // Get the account name
            let accountName = '';
            if (isOpeningBalance) {
                accountName = 'Opening';
            } else if (item.type === 'Pymt') {
                accountName = item.PaymentReceiptType || item.accountType || '';
            } else if (item.type === 'Rcpt') {
                accountName = item.PaymentReceiptType || item.accountType || '';
            } else {
                accountName = item.accountType || item.purchaseSalesType || item.purchaseSalesReturnType || item.journalAccountType || '';
            }

            tableContent += `
        <tr>
            <td class="nowrap">${bsDate || '-'}</td>
            <td class="nowrap">${adDate || '-'}</td>
            <td class="nowrap">${item.billNumber || ''}</td>
            <td class="nowrap voucher-type">${item.type || ''}</td>
            <td class="nowrap">${item.paymentMode || ''}</td>
            <td style="white-space: normal; word-wrap: break-word; max-width: 150px;">${accountName}</td>
            <td class="text-end amount-positive">${debitAmount > 0 ? formatCurrencyForPrint(debitAmount) : '-'}</td>
            <td class="text-end amount-positive">${creditAmount > 0 ? formatCurrencyForPrint(creditAmount) : '-'}</td>
            <td class="text-end balance-text">${balanceText}</td>
        </tr>
    `;
        });

        const finalBalanceText = balance > 0 ? `${formatCurrencyForPrint(Math.abs(balance))} Dr` : `${formatCurrencyForPrint(Math.abs(balance))} Cr`;

        tableContent += `
        <tr class="grand-total-row">
            <td colspan="6" class="text-end total-label">TOTALS</td>
            <td class="text-end total-label">${formatCurrencyForPrint(totalDebit)}</td>
            <td class="text-end total-label">${formatCurrencyForPrint(totalCredit)}</td>
            <td class="text-end total-label">${finalBalanceText}</td>
        </tr>
        </tbody>
    </table>
    <div class="footer">
        Generated on: ${new Date().toLocaleString()} | Powered by Ams Software
    </div>
`;

        return tableContent;
    };

    const generateItemwisePrintContent = (statementData) => {
        const itemwiseData = statementData;
        const isNepaliFormat = company.dateFormat === 'nepali';

        if (!itemwiseData || itemwiseData.length === 0) {
            return '<div class="alert alert-warning">No itemwise statement data available</div>';
        }

        let tableContent = `
        <div class="print-header">
            <div class="company-name">${data.currentCompanyName || 'Company Name'}</div>
            <div class="company-details">
                ${data.company?.address || ''}${data.company?.city ? ', ' + data.company.city : ''}<br>
                PAN: ${data.company?.pan || ''} | Phone: ${data.company?.phone || ''}
            </div>
            <hr style="margin:6px 0; border: 1px solid #ccc;">
            <div class="report-title">ITEMWISE STATEMENT</div>
            <div class="statement-info">
                <strong>Party:</strong> ${data.partyName} &nbsp;|&nbsp;
                <strong>From (BS):</strong> ${dateRange.fromDate} &nbsp;|&nbsp;
                <strong>To (BS):</strong> ${dateRange.toDate} &nbsp;|&nbsp;
                <strong>From (AD):</strong> ${dateRange.fromDateAd} &nbsp;|&nbsp;
                <strong>To (AD):</strong> ${dateRange.toDateAd} &nbsp;|&nbsp;
                <strong>Payment Mode:</strong> ${data.paymentMode === 'all' ? 'All (Include Cash)' : data.paymentMode === 'exclude-cash' ? 'All (Exclude Cash)' : data.paymentMode}
            </div>
        </div>
        <table cellspacing="0">
            <thead>
                <tr>
                    <th class="nowrap col-miti">Miti</th>
                    <th class="nowrap col-date">Date</th>
                    <th class="nowrap col-vch">Vch No.</th>
                    <th class="nowrap col-type">Type</th>
                    <th class="nowrap col-paymode">Pay Mode</th>
                    <th class="nowrap col-item">Item Name</th>
                    <th class="nowrap col-qty text-end">Qty</th>
                    <th class="nowrap col-unit">Unit</th>
                    <th class="nowrap col-rate text-end">Rate (Rs.)</th>
                    <th class="nowrap col-amount text-end">Discount (Rs.)</th>
                    <th class="nowrap col-amount text-end">Taxable (Rs.)</th>
                    <th class="nowrap col-amount text-end">VAT (Rs.)</th>
                    <th class="nowrap col-amount text-end">Total (Rs.)</th>
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
                const bsDate = bill.nepaliDate || (isNepaliFormat ? new NepaliDate(bill.date).format('YYYY-MM-DD') : '');
                const adDate = bill.date ? new Date(bill.date).toLocaleDateString() : '';

                bill.items.forEach((item) => {
                    const quantity = item.quantity ? parseFloat(item.quantity) : 0;
                    const rate = item.puPrice || item.price || 0;
                    const discount = item.discountAmountPerItem || 0;
                    const taxable = item.taxableAmount || 0;
                    const vat = item.vatAmount || 0;
                    const total = item.totalAmount || (taxable + vat);

                    grandTotalQty += quantity;
                    grandTotalAmount += total;
                    grandTotalVat += vat;
                    grandTotalTaxable += taxable;
                    grandTotalDiscount += discount;

                    tableContent += `
                    <tr>
                        <td class="nowrap">${bsDate}</td>
                        <td class="nowrap">${adDate}</td>
                        <td class="nowrap">${bill.billNumber || ''}</td>
                        <td class="nowrap voucher-type">${bill.type || ''}</td>
                        <td class="nowrap">${bill.paymentMode || ''}</td>
                        <td style="white-space: normal; word-wrap: break-word; max-width: 180px;">${item.item?.name || item.productName || 'N/A'}</td>
                        <td class="text-end amount-positive">${quantity.toFixed(2)}</td>
                        <td class="nowrap">${item.unit?.name || ''}</td>
                        <td class="text-end amount-positive">${formatCurrencyForPrint(rate)}</td>
                        <td class="text-end amount-positive">${formatCurrencyForPrint(discount)}</td>
                        <td class="text-end amount-positive">${formatCurrencyForPrint(taxable)}</td>
                        <td class="text-end amount-positive">${formatCurrencyForPrint(vat)}</td>
                        <td class="text-end amount-positive">${formatCurrencyForPrint(total)}</td>
                    </tr>
                `;
                });
            }
        });

        tableContent += `
        <tr class="grand-total-row">
            <td colspan="6" class="text-end total-label">GRAND TOTALS</td>
            <td class="text-end total-label">${grandTotalQty.toFixed(2)}</td>
            <td></td>
            <td></td>
            <td class="text-end total-label">${formatCurrencyForPrint(grandTotalDiscount)}</td>
            <td class="text-end total-label">${formatCurrencyForPrint(grandTotalTaxable)}</td>
            <td class="text-end total-label">${formatCurrencyForPrint(grandTotalVat)}</td>
            <td class="text-end total-label">${formatCurrencyForPrint(grandTotalAmount)}</td>
        </tr>
        </tbody>
    </table>
    <div class="footer">
        Generated on: ${new Date().toLocaleString()} | Powered by Ams Software
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
            const isNepaliFormat = company.dateFormat === 'nepali';

            excelData.push(['Company Name:', data.currentCompanyName || 'N/A']);
            excelData.push(['Report Type:', 'Statement Report']);
            excelData.push(['View Mode:', viewMode === 'regular' ? 'Regular Statement' : 'Itemwise Statement']);
            excelData.push(['Party Name:', data.partyName || 'N/A']);
            excelData.push(['From Date (BS):', dateRange.fromDate]);
            excelData.push(['To Date (BS):', dateRange.toDate]);
            excelData.push(['From Date (AD):', dateRange.fromDateAd]);
            excelData.push(['To Date (AD):', dateRange.toDateAd]);
            excelData.push(['Payment Mode:', data.paymentMode === 'all' ? 'All (Include Cash)' : data.paymentMode === 'exclude-cash' ? 'All (Exclude Cash)' : data.paymentMode]);
            excelData.push(['Export Date:', currentDate]);
            excelData.push([]);

            if (viewMode === 'regular') {
                const openingBalance = data.openingBalance || 0;
                excelData.push([]);

                const headers = [
                    'Miti', 'Date', 'Voucher No.', 'Voucher Type', 'Payment Mode',
                    'Account', 'Debit Amount', 'Credit Amount', 'Balance'
                ];
                excelData.push(headers);

                let balance = openingBalance;
                let totalDebit = 0;
                let totalCredit = 0;

                const statementToExport = filteredStatement.length > 0 ? filteredStatement : data.statement;

                // Helper function to check if item is opening balance
                const isOpeningBalance = (item) => {
                    return item.accountType === 'Opening' ||
                        item.type === 'Opening' ||
                        (!item.type && item.accountType === 'Opening') ||
                        (item.accountType === 'Opening');
                };

                statementToExport.forEach((item) => {
                    // Check if this is an opening balance entry
                    const isOpening = isOpeningBalance(item);

                    let bsDate = '';
                    let adDate = '';

                    if (isOpening) {
                        // For opening balance, show the from date
                        if (isNepaliFormat) {
                            bsDate = dateRange.fromDate || '';
                        } else {
                            adDate = dateRange.fromDateAd || '';
                        }
                    } else {
                        bsDate = item.nepaliDate || (isNepaliFormat ? new NepaliDate(item.date).format('YYYY-MM-DD') : '');
                        adDate = item.date ? new Date(item.date).toISOString().split('T')[0] : '';
                    }

                    const debitAmount = parseFloat(item.debit) || 0;
                    const creditAmount = parseFloat(item.credit) || 0;

                    balance = balance + debitAmount - creditAmount;
                    totalDebit += debitAmount;
                    totalCredit += creditAmount;

                    let accountName = '';
                    if (isOpening) {
                        accountName = 'Opening';
                    } else if (item.type === 'Pymt') {
                        accountName = item.PaymentReceiptType || item.accountType || '';
                    } else if (item.type === 'Rcpt') {
                        accountName = item.PaymentReceiptType || item.accountType || '';
                    } else {
                        accountName = item.accountType || item.purchaseSalesType || item.purchaseSalesReturnType || item.journalAccountType || '';
                    }

                    const balanceText = balance > 0 ? `${formatCurrencyForExport(Math.abs(balance))} Dr` : `${formatCurrencyForExport(Math.abs(balance))} Cr`;

                    const rowData = [
                        bsDate || '-',
                        adDate || '-',
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

                // Add totals row with proper column alignment
                excelData.push([]);
                const finalBalanceText = balance > 0 ? `${formatCurrencyForExport(Math.abs(balance))} Dr` : `${formatCurrencyForExport(Math.abs(balance))} Cr`;
                excelData.push([
                    'TOTALS',  // Column 1: Miti
                    '',        // Column 2: Date
                    '',        // Column 3: Voucher No.
                    '',        // Column 4: Voucher Type
                    '',        // Column 5: Payment Mode
                    'Grand Total:', // Column 6: Account
                    formatCurrencyForExport(totalDebit),  // Column 7: Debit Amount
                    formatCurrencyForExport(totalCredit), // Column 8: Credit Amount
                    finalBalanceText  // Column 9: Balance
                ]);

                // Add opening balance info for reference
                if (openingBalance !== 0) {
                    const openingBalanceText = openingBalance > 0 ?
                        `${formatCurrencyForExport(Math.abs(openingBalance))} Dr` :
                        `${formatCurrencyForExport(Math.abs(openingBalance))} Cr`;
                    excelData.push([
                        '', '', '', '', '',
                        '', '',
                    ]);
                }
            } else {
                // Itemwise view
                const headers = [
                    'Miti', 'Date', 'Voucher No.', 'Voucher Type', 'Payment Mode',
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
                        const bsDate = bill.nepaliDate || (isNepaliFormat ? new NepaliDate(bill.date).format('YYYY-MM-DD') : '');
                        const adDate = bill.date ? new Date(bill.date).toISOString().split('T')[0] : '';

                        bill.items.forEach((item) => {
                            const quantity = item.quantity ? parseFloat(item.quantity) : 0;
                            const rate = item.puPrice || item.price || 0;
                            const discount = item.discountAmountPerItem || 0;
                            const taxable = item.taxableAmount || 0;
                            const vat = item.vatAmount || 0;
                            const total = item.totalAmount || (taxable + vat);

                            grandTotalQty += quantity;
                            grandTotalAmount += total;
                            grandTotalVat += vat;
                            grandTotalTaxable += taxable;
                            grandTotalDiscount += discount;

                            const rowData = [
                                bsDate || '-',
                                adDate || '-',
                                bill.billNumber || '',
                                bill.type || '',
                                bill.paymentMode || '',
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

                // Add grand totals row with proper column alignment
                excelData.push([]);
                excelData.push([
                    'GRAND TOTALS',  // Column 1: Miti
                    '',              // Column 2: Date
                    '',              // Column 3: Voucher No.
                    '',              // Column 4: Voucher Type
                    '',              // Column 5: Payment Mode
                    '',              // Column 6: Item Name
                    grandTotalQty.toFixed(2),  // Column 7: Quantity
                    '',              // Column 8: Unit
                    '',              // Column 9: Rate
                    formatCurrencyForExport(grandTotalDiscount),  // Column 10: Discount
                    formatCurrencyForExport(grandTotalTaxable),   // Column 11: Taxable
                    formatCurrencyForExport(grandTotalVat),       // Column 12: VAT
                    formatCurrencyForExport(grandTotalAmount)     // Column 13: Total
                ]);
            }

            const ws = XLSX.utils.aoa_to_sheet(excelData);

            ws['!cols'] = viewMode === 'regular'
                ? [{ wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }]
                : [{ wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 25 }, { wch: 10 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 15 }];

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Statement Report');

            const fileName = `Statement_${data.partyName}_${dateRange.fromDate}_to_${dateRange.toDate}_${viewMode}.xlsx`;
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
        return number.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }, []);

    const formatBalance = (amount) => {
        return amount > 0 ? `${formatCurrency(amount)} Dr` : `${formatCurrency(Math.abs(amount))} Cr`;
    };

    const resetColumnWidths = () => {
        setColumnWidths({
            bsDate: 90,
            adDate: 90,
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

    // Table Header Component - Updated with BS Date and AD Date columns
    const TableHeader = React.memo(() => {
        const totalWidth = columnWidths.bsDate + columnWidths.adDate + columnWidths.voucherNo +
            columnWidths.voucherType + columnWidths.payMode + columnWidths.account +
            columnWidths.debit + columnWidths.credit + columnWidths.balance;

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

                {/* Voucher No */}
                <div className="d-flex align-items-center px-1 border-end position-relative" style={{ width: `${columnWidths.voucherNo}px`, flexShrink: 0, minWidth: '60px' }}>
                    <strong style={{ fontSize: '0.75rem' }}>Vch No.</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.voucherNo - 3} columnName="voucherNo" />
                </div>

                {/* Type */}
                <div className="d-flex align-items-center px-1 border-end position-relative" style={{ width: `${columnWidths.voucherType}px`, flexShrink: 0, minWidth: '60px' }}>
                    <strong style={{ fontSize: '0.75rem' }}>Type</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.voucherType - 3} columnName="voucherType" />
                </div>

                {/* Pay Mode */}
                <div className="d-flex align-items-center px-1 border-end position-relative" style={{ width: `${columnWidths.payMode}px`, flexShrink: 0, minWidth: '60px' }}>
                    <strong style={{ fontSize: '0.75rem' }}>Pay Mode</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.payMode - 3} columnName="payMode" />
                </div>

                {/* Account */}
                <div className="d-flex align-items-center px-1 border-end position-relative" style={{ width: `${columnWidths.account}px`, flexShrink: 0, minWidth: '100px' }}>
                    <strong style={{ fontSize: '0.75rem' }}>Account</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.account - 3} columnName="account" />
                </div>

                {/* Debit */}
                <div className="d-flex align-items-center justify-content-end px-1 border-end position-relative" style={{ width: `${columnWidths.debit}px`, flexShrink: 0, minWidth: '80px' }}>
                    <strong style={{ fontSize: '0.75rem' }}>Debit</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.debit - 2} columnName="debit" />
                </div>

                {/* Credit */}
                <div className="d-flex align-items-center justify-content-end px-1 border-end position-relative" style={{ width: `${columnWidths.credit}px`, flexShrink: 0, minWidth: '80px' }}>
                    <strong style={{ fontSize: '0.75rem' }}>Credit</strong>
                    <ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.credit - 2} columnName="credit" />
                </div>

                {/* Balance */}
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
    
    const TableRow = React.memo(({ index, style, data: rowData }) => {
        const { statement, selectedRowIndex, formatCurrency, formatBalance, handleRowClick, handleRowDoubleClick } = rowData;
        const item = statement[index];
        const isNepaliFormat = company.dateFormat === 'nepali';

        if (!item) return null;

        const isSelected = selectedRowIndex === index;

        const getFormattedAccountName = (item) => {
            if (item.type === 'Purc') {
                if (item.partyBillNumber) {
                    return `Purchase ${item.partyBillNumber}`;
                }
                return item.accountType || item.purchaseSalesType || 'Purchase';
            }
            if (item.type === 'PrRt') {
                if (item.partyBillNumber) {
                    return `Purchase Return ${item.partyBillNumber}`;
                }
                return item.accountType || item.purchaseSalesReturnType || 'Purchase Return';
            }
            return item.accountType || item.purchaseSalesType || item.purchaseSalesReturnType ||
                item.PaymentReceiptType || item.journalAccountType || 'Opening';
        };

        // Helper function to subtract days from AD date
        const subtractDaysFromAdDate = (adDateStr, days) => {
            if (!adDateStr) return adDateStr;
            try {
                const date = new Date(adDateStr);
                date.setDate(date.getDate() - days);
                return date.toISOString().split('T')[0];
            } catch (error) {
                console.error('Error subtracting days from AD date:', error);
                return adDateStr;
            }
        };

        // Helper function to subtract days from Nepali date
        const subtractDaysFromNepaliDate = (nepaliDateStr, days) => {
            if (!nepaliDateStr || !isNepaliFormat) return nepaliDateStr;
            try {
                const nepaliDate = new NepaliDate(nepaliDateStr);
                const jsDate = nepaliDate.getDateObject();
                jsDate.setDate(jsDate.getDate() - days);
                const newNepaliDate = new NepaliDate(jsDate);
                const year = newNepaliDate.getYear();
                const month = String(newNepaliDate.getMonth() + 1).padStart(2, '0');
                const day = String(newNepaliDate.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            } catch (error) {
                console.error('Error subtracting days from Nepali date:', error);
                return nepaliDateStr;
            }
        };

        // Check if this is an opening balance entry
        const isOpeningBalance = item.accountType === 'Opening' ||
            item.type === 'Opening' ||
            (!item.type && item.accountType === 'Opening') ||
            (item.accountType === 'Opening');

        let bsDate = '';
        let adDateDisplay = '';

        if (isOpeningBalance) {
            // For opening balance, show the from date (not subtracted)
            if (isNepaliFormat && dateRange.fromDate) {
                // Show the from date as-is for the opening balance
                bsDate = dateRange.fromDate;
            } else if (dateRange.fromDateAd) {
                // For AD date, show the from date
                adDateDisplay = dateRange.fromDateAd;
            }
        } else {
            // For regular transactions, use the transaction date
            bsDate = item.nepaliDate || (isNepaliFormat ? new NepaliDate(item.date).format('YYYY-MM-DD') : '');
            adDateDisplay = item.date ? new Date(item.date).toISOString().split('T')[0] : '';
        }

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
                {/* BS Date Column */}
                <div className="d-flex align-items-center justify-content-center px-1 border-end" style={{ width: `${columnWidths.bsDate}px`, flexShrink: 0, height: '100%' }}>
                    <span style={{ fontSize: '0.75rem' }}>{bsDate || '-'}</span>
                </div>

                {/* AD Date Column */}
                <div className="d-flex align-items-center justify-content-center px-1 border-end" style={{ width: `${columnWidths.adDate}px`, flexShrink: 0, height: '100%' }}>
                    <span style={{ fontSize: '0.75rem' }}>{adDateDisplay || '-'}</span>
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

                {/* Account Column */}
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
            <div className="card mt-2 shadow-lg p-0 animate__animated animate__fadeInUp expanded-card ledger-card compact" style={{ height: '580px', display: 'flex', flexDirection: 'column' }}>                <div className="card-header bg-white py-0">
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
                                    style={{ height: '30px', fontSize: '0.875rem', paddingTop: '0.25rem', cursor: 'pointer', width: '100%' }}
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

                        {/* From Date BS Field */}
                        <div className="col-12" style={{ flex: '0 0 auto', width: '12%' }}>
                            <div className="position-relative">
                                <input
                                    type="text"
                                    name="fromDate"
                                    id="fromDate"
                                    ref={fromDateRef}
                                    className={`form-control form-control-sm no-date-icon ${dateErrors.fromDate ? 'is-invalid' : ''}`}
                                    value={dateRange.fromDate}
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
                                                const correctedDate = company.dateFormat === 'nepali' ? currentNepaliDate : currentEnglishDate;
                                                const adDate = company.dateFormat === 'nepali' ? convertBsToAd(correctedDate) : correctedDate;
                                                setDateRange(prev => ({ ...prev, fromDate: correctedDate, fromDateAd: adDate }));
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
                                    value={dateRange.fromDateAd}
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
                                    value={dateRange.toDate}
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
                                                const correctedDate = company.dateFormat === 'nepali' ? currentNepaliDate : currentEnglishDate;
                                                const adDate = company.dateFormat === 'nepali' ? convertBsToAd(correctedDate) : correctedDate;
                                                setDateRange(prev => ({ ...prev, toDate: correctedDate, toDateAd: adDate }));
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
                                    value={dateRange.toDateAd}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        const bsDate = convertAdToBs(value);
                                        setDateRange(prev => ({
                                            ...prev,
                                            toDateAd: value,
                                            toDate: bsDate || prev.toDate
                                        }));
                                    }}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleKeyDown(e, 'paymentMode'); }}
                                    style={{ height: '26px', fontSize: '0.875rem', paddingTop: '0.75rem', width: '100%' }}
                                />
                                <label className="position-absolute" style={{ top: '-0.5rem', left: '0.75rem', fontSize: '0.75rem', backgroundColor: 'white', padding: '0 0.25rem', color: '#6c757d', fontWeight: '500' }}>
                                    To (AD):
                                </label>
                            </div>
                        </div>

                        {/* Payment Mode */}
                        <div className="col-12" style={{ flex: '0 0 auto', width: '12%' }}>
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
                                    Pay. Mode
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
                        <div className="col-12" style={{ flex: '0 0 auto', width: '12%' }}>
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
                                    style={{ height: '26px', fontSize: '0.875rem', paddingTop: '0.75rem', width: '100%' }}
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
                                <i className="bi bi-search"></i>Generate
                            </button>
                            <button
                                className="btn btn-success btn-sm"
                                onClick={handleExportExcel}
                                disabled={(viewMode === 'regular' && data.statement.length === 0) || (viewMode === 'itemwise' && data.itemwiseStatement.length === 0) || exporting}
                                style={{ height: '30px', fontSize: '0.8rem', padding: '0 12px', fontWeight: '500', whiteSpace: 'nowrap' }}
                            >
                                {exporting ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-file-excel me-1"></i>}
                            </button>
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={handlePrint}
                                disabled={(viewMode === 'regular' && data.statement.length === 0) || (viewMode === 'itemwise' && data.itemwiseStatement.length === 0)}
                                style={{ height: '30px', fontSize: '0.8rem', padding: '0 12px', fontWeight: '500', whiteSpace: 'nowrap' }}
                            >
                                <i className="bi bi-printer"></i>
                            </button>
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={resetColumnWidths}
                                title="Reset column widths to default"
                                style={{ height: '30px', fontSize: '0.8rem', padding: '0 12px', fontWeight: '500' }}
                            >
                                <i className="bi bi-x-circle"></i>
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
                            <div style={{ height: "calc(100vh - 300px)", border: '1px solid #dee2e6', backgroundColor: '#fff', position: 'relative' }} ref={tableBodyRef}>
                                {loading ? (
                                    <div className="d-flex flex-column justify-content-center align-items-center h-100">
                                        <div className="spinner-border spinner-border-sm text-primary" role="status">
                                            <span className="visually-hidden">Loading...</span>
                                        </div>
                                        <p className="mt-2 small text-muted" style={{ fontSize: '0.8rem' }}>Loading statement...</p>
                                    </div>
                                ) : viewMode === 'regular' ? (
                                    filteredStatement.length === 0 ? (
                                        <div className="d-flex flex-column justify-content-center align-items-center h-100">
                                            <i className="bi bi-search text-muted" style={{ fontSize: '1.5rem' }}></i>
                                            <h6 className="mt-2 text-muted" style={{ fontSize: '0.9rem' }}>No transactions found</h6>
                                            <p className="text-muted small" style={{ fontSize: '0.75rem' }}>{searchQuery ? 'Try a different search term' : 'No data for the selected criteria'}</p>
                                        </div>
                                    ) : (
                                        <AutoSizer>
                                            {({ height, width }) => {
                                                const totalWidth = columnWidths.bsDate + columnWidths.adDate +
                                                    columnWidths.voucherNo + columnWidths.voucherType +
                                                    columnWidths.payMode + columnWidths.account +
                                                    columnWidths.debit + columnWidths.credit + columnWidths.balance;

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
                                            <h6 className="mt-2 text-muted" style={{ fontSize: '0.9rem' }}>No items found</h6>
                                            <p className="text-muted small" style={{ fontSize: '0.75rem' }}>No item transactions for the selected criteria</p>
                                        </div>
                                    ) : (
                                        <div style={{ height: "100%", overflow: 'auto' }}>
                                            <table className="table table-sm table-bordered table-hover mb-0" style={{ fontSize: '0.75rem', minWidth: '1200px' }}>
                                                <thead className="bg-light sticky-top" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                                                    <tr>
                                                        <th style={{ width: '8%' }}>Miti</th>
                                                        <th style={{ width: '8%' }}>Date</th>
                                                        <th style={{ width: '10%' }}>Vch No.</th>
                                                        <th style={{ width: '8%' }}>Type</th>
                                                        <th style={{ width: '8%' }}>Pay Mode</th>
                                                        <th style={{ width: '15%' }}>Item Name</th>
                                                        <th style={{ width: '6%' }} className="text-end">Qty</th>
                                                        <th style={{ width: '6%' }}>Unit</th>
                                                        <th style={{ width: '8%' }} className="text-end">Rate (Rs.)</th>
                                                        <th style={{ width: '8%' }} className="text-end">Disc. (Rs.)</th>
                                                        <th style={{ width: '8%' }} className="text-end">Taxable (Rs.)</th>
                                                        <th style={{ width: '6%' }} className="text-end">VAT (Rs.)</th>
                                                        <th style={{ width: '9%' }} className="text-end">Total (Rs.)</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {data.itemwiseStatement.map((bill, billIndex) => (
                                                        bill.items && bill.items.map((item, itemIndex) => {
                                                            const isNepaliFormatLocal = company.dateFormat === 'nepali';
                                                            const bsDate = bill.nepaliDate || (isNepaliFormatLocal ? new NepaliDate(bill.nepaliDate).format('YYYY-MM-DD') : '');
                                                            const adDate = bill.date ? new Date(bill.date).toLocaleDateString() : '';

                                                            const quantity = item.quantity ? parseFloat(item.quantity) : 0;
                                                            const rate = item.puPrice || item.price || 0;
                                                            const discount = item.discountAmountPerItem || 0;
                                                            const taxable = item.taxableAmount || 0;
                                                            const vat = item.vatAmount || 0;
                                                            const total = item.totalAmount || (taxable + vat);

                                                            return (
                                                                <tr key={`${bill.billNumber}-${itemIndex}`} style={{ backgroundColor: (billIndex + itemIndex) % 2 === 0 ? '#f8f9fa' : 'white' }}>
                                                                    <td className="nowrap">{bsDate}</td>
                                                                    <td className="nowrap">{adDate}</td>
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
                                                                const taxable = item.taxableAmount || 0;
                                                                const vat = item.vatAmount || 0;
                                                                const total = item.totalAmount || (taxable + vat);

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
                                                                <td colSpan="6" className="text-end"><strong>Grand Totals:</strong></td>
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
                                    <div className="d-flex align-items-center px-1" style={{ width: `${columnWidths.bsDate + columnWidths.adDate + columnWidths.voucherNo + columnWidths.voucherType + columnWidths.payMode + columnWidths.account}px`, flexShrink: 0, height: '100%' }}>
                                        <strong style={{ fontSize: '0.75rem' }}>Totals:</strong>
                                    </div>
                                    <div className="d-flex align-items-center justify-content-end px-1 border-start" style={{ width: `${columnWidths.debit}px`, flexShrink: 0, height: '100%' }}>
                                        <strong style={{ fontSize: '0.75rem' }}>{formatCurrency(data.totalDebit)}</strong>
                                    </div>
                                    <div className="d-flex align-items-center justify-content-end px-1 border-start" style={{ width: `${columnWidths.credit}px`, flexShrink: 0, height: '100%' }}>
                                        <strong style={{ fontSize: '0.75rem' }}>{formatCurrency(data.totalCredit)}</strong>
                                    </div>
                                    <div className="d-flex align-items-center justify-content-end px-1 border-start" style={{ width: `${columnWidths.balance}px`, flexShrink: 0, height: '100%' }}>
                                        <strong style={{ fontSize: '0.75rem' }}>{formatBalance(filteredStatement.length > 0 ? filteredStatement[filteredStatement.length - 1]?.balance : 0)}</strong>
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
                            <div className="modal-content" style={{ height: '400px' }}>
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