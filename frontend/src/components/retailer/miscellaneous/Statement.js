
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
import VirtualizedAccountList from '../../VirtualizedAccountList';
import CashSettlementModal from './CashSettlementModal';
import { FiFileText, FiPrinter, FiDownload, FiBox, FiSearch, FiRefreshCw, FiUser, FiCalendar, FiShare2, FiLink } from 'react-icons/fi';
import { Badge } from 'react-bootstrap';
import './Statement.css';
import api, { refreshToken } from '../../services/api';
import AccountModalForPaymentReceipt from '../payment/AccountModalForPaymentReceipt';

// Helper functions for date conversion (Kept exactly as provided)
const convertBsToAd = (bsDate) => {
    if (!bsDate || !/^\d{4}-\d{2}-\d{2}$/.test(bsDate)) return null;
    try {
        const nepaliDate = new NepaliDate(bsDate);
        const jsDate = nepaliDate.getDateObject();
        if (!jsDate || isNaN(jsDate.getTime())) return null;
        const year = jsDate.getFullYear();
        const month = String(jsDate.getMonth() + 1).padStart(2, '0');
        const day = String(jsDate.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (error) {
        console.error('Error converting BS to AD:', error);
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
        } else { return null; }
        if (isNaN(date.getTime())) return null;
        const nepaliDate = new NepaliDate(date);
        return `${nepaliDate.getYear()}-${String(nepaliDate.getMonth() + 1).padStart(2, '0')}-${String(nepaliDate.getDate()).padStart(2, '0')}`;
    } catch (error) {
        console.error('Error converting AD to BS:', error);
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
        return nepaliDate.getYear() === year && nepaliDate.getMonth() + 1 === month && nepaliDate.getDate() === day;
    } catch { return false; }
};

const Statement = () => {
    const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
    const currentEnglishDate = new Date().toISOString().split('T')[0];
    const navigate = useNavigate();
    const { draftSave, setDraftSave } = usePageNotRefreshContext();

    // --- State Management ---
    const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
    const [whatsAppNumber, setWhatsAppNumber] = useState('');
    const [whatsAppMessage, setWhatsAppMessage] = useState('');
    const [generatedShareLink, setGeneratedShareLink] = useState('');
    const [isGeneratingLink, setIsGeneratingLink] = useState(false);
    const [emailLoading, setEmailLoading] = useState(false);
    const [showProductModal, setShowProductModal] = useState(false);
    const [showAccountModal, setShowAccountModal] = useState(false);
    const [showCashSettlementModal, setShowCashSettlementModal] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState(null);

    const [dateErrors, setDateErrors] = useState({ fromDate: '', toDate: '' });
    const [notification, setNotification] = useState({ show: false, message: '', type: 'success', duration: 3000 });
    const [company, setCompany] = useState({ dateFormat: 'english', vatEnabled: true, fiscalYear: {} });
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState(null);
    const [selectedRowIndex, setSelectedRowIndex] = useState(0);
    const [shouldFetch, setShouldFetch] = useState(false);

    // --- Account Search State ---
    const [accounts, setAccounts] = useState([]);
    const [isAccountSearching, setIsAccountSearching] = useState(false);
    const [accountSearchPage, setAccountSearchPage] = useState(1);
    const [hasMoreAccountResults, setHasMoreAccountResults] = useState(false);
    const [totalAccounts, setTotalAccounts] = useState(0);
    const [accountSearchQuery, setAccountSearchQuery] = useState('');
    const [accountLastSearchQuery, setAccountLastSearchQuery] = useState('');
    const [accountShouldShowLastSearchResults, setAccountShouldShowLastSearchResults] = useState(false);
    const [selectedAccountId, setSelectedAccountId] = useState('');
    const accountSearchRef = useRef(null);
    const fromDateRef = useRef(null);
    const toDateRef = useRef(null);
    const searchInputRef = useRef(null);
    const generateReportRef = useRef(null);
    const tableBodyRef = useRef(null);

    // --- Date & Data State ---
    const [dateRange, setDateRange] = useState(() => {
        if (draftSave?.statementData) {
            return { fromDate: draftSave.statementData.fromDate || '', toDate: draftSave.statementData.toDate || '', fromDateAd: draftSave.statementData.fromDateAd || '', toDateAd: draftSave.statementData.toDateAd || '' };
        }
        return { fromDate: '', toDate: '', fromDateAd: '', toDateAd: '' };
    });

    const [data, setData] = useState(() => {
        if (draftSave?.statementData) {
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
                selectedAccountName: draftSave.statementData.selectedAccountName || null,
                selectedAccountPhone: draftSave.statementData.selectedAccountPhone || null
            };
        }
        return {
            company: null, currentFiscalYear: null, statement: [], itemwiseStatement: [], accounts: [], selectedCompany: null,
            partyName: '', paymentMode: 'all', totalDebit: 0, totalCredit: 0, openingBalance: 0, currentCompanyName: '',
            companyDateFormat: 'english', nepaliDate: '', user: null, selectedAccountUniqueNumber: null, selectedAccountName: null, selectedAccountPhone: null
        };
    });

    const [viewMode, setViewMode] = useState(() => draftSave?.statementViewMode || 'regular');
    const [searchQuery, setSearchQuery] = useState(() => draftSave?.statementSearch?.searchQuery || '');
    const [filteredStatement, setFilteredStatement] = useState([]);
    const [filteredItemwiseStatement, setFilteredItemwiseStatement] = useState([]);

    // --- Column Resizing ---
    const [columnWidths, setColumnWidths] = useState({
        bsDate: 90, adDate: 90, voucherNo: 100, voucherType: 80, payMode: 80, account: 200, debit: 100, credit: 100, balance: 100, remarks: 100
    });
    const [isResizing, setIsResizing] = useState(false);
    const [resizingColumn, setResizingColumn] = useState(null);
    const [startX, setStartX] = useState(0);
    const [startWidth, setStartWidth] = useState(0);

    // --- API ---
    // const api = axios.create({
    //     baseURL: process.env.REACT_APP_API_BASE_URL,
    //     withCredentials: true,
    // });
    // api.interceptors.request.use((config) => {
    //     const token = localStorage.getItem('token');
    //     if (token) config.headers.Authorization = `Bearer ${token}`;
    //     return config;
    // });

    // --- Helpers ---
    const validateAndCorrectNepaliDate = (dateStr) => {
        if (!dateStr) return null;
        if (isValidNepaliDate(dateStr)) return dateStr;
        const match = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        if (match) {
            let [_, year, month, day] = match;
            month = Math.min(12, Math.max(1, parseInt(month, 10)));
            day = Math.min(32, Math.max(1, parseInt(day, 10)));
            const correctedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            return isValidNepaliDate(correctedDate) ? correctedDate : null;
        }
        return null;
    };

    const getFocusTargetOnModalClose = () => fromDateRef.current ? 'fromDate' : 'account';

    const formatCurrency = useCallback((num) => {
        const number = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num) || 0;
        return number.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }, []);

    const formatBalance = (amount) => {
        return amount > 0 ? `${formatCurrency(amount)} Dr` : `${formatCurrency(Math.abs(amount))} Cr`;
    };

    // --- Fetch Functions ---
    // const fetchAccountsFromBackend = async (searchTerm = '', page = 1) => {
    //     try {
    //         setIsAccountSearching(true);
    //         const response = await api.get('/api/retailer/all/accounts/search', {
    //             params: { search: searchTerm, page: page, limit: searchTerm.trim() ? 15 : 25 }
    //         });
    //         if (response.data.success) {
    //             if (page === 1) setAccounts(response.data.accounts);
    //             else setAccounts(prev => [...prev, ...response.data.accounts]);
    //             setHasMoreAccountResults(response.data.pagination.hasNextPage);
    //             setTotalAccounts(response.data.pagination.totalAccounts);
    //             setAccountSearchPage(page);
    //             if (searchTerm.trim() !== '') { setAccountLastSearchQuery(searchTerm); setAccountShouldShowLastSearchResults(true); }
    //         }
    //     } catch (error) {
    //         console.error('Error fetching accounts:', error); setNotification({ show: true, message: 'Error loading accounts', type: 'error' });
    //     } finally { setIsAccountSearching(false); }
    // };

    // Replace or update this function
    const fetchAccountsFromBackend = async (searchTerm = '', page = 1, append = false) => {
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
                if (append) {
                    // APPEND to existing accounts instead of replacing
                    setAccounts(prev => [...prev, ...response.data.accounts]);
                } else {
                    setAccounts(response.data.accounts);
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

    // const loadMoreAccounts = () => {
    //     if (!isAccountSearching && hasMoreAccountResults) {
    //         const searchTerm = accountShouldShowLastSearchResults ? accountLastSearchQuery : accountSearchQuery;
    //         fetchAccountsFromBackend(searchTerm, accountSearchPage + 1);
    //     }
    // };

    // Replace or update this function
    const loadMoreAccounts = () => {
        if (!isAccountSearching && hasMoreAccountResults) {
            const nextPage = accountSearchPage + 1;
            // Pass true for append parameter
            const searchTerm = accountShouldShowLastSearchResults ? accountLastSearchQuery : accountSearchQuery;
            fetchAccountsFromBackend(searchTerm, nextPage, true);
        }
    };

    const handleAccountSearch = (e) => {
        const searchText = e.target.value;
        setAccountSearchQuery(searchText);
        setAccountSearchPage(1);
        if (searchText.trim() !== '' && accountShouldShowLastSearchResults) {
            setAccountShouldShowLastSearchResults(false);
            setAccountLastSearchQuery('');
        }
        const timer = setTimeout(() => fetchAccountsFromBackend(searchText, 1), 300);
        return () => clearTimeout(timer);
    };

    // --- Initial Data ---
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                setLoading(true);
                const response = await api.get('/api/retailer/statement');
                if (response.data.success) {
                    const responseData = response.data.data;
                    const dateFormat = responseData.company?.dateFormat?.toLowerCase() || 'english';
                    const isNepaliFormat = dateFormat === 'nepali';
                    setCompany({ ...responseData.company, dateFormat: dateFormat, vatEnabled: responseData.company?.vatEnabled !== false });

                    const currentFiscalYear = responseData.currentFiscalYear;
                    const hasDraftDates = draftSave?.statementData?.fromDate && draftSave?.statementData?.toDate;

                    if (!hasDraftDates && currentFiscalYear) {
                        let fromDateFormatted = '', toDateFormatted = '', fromDateAd = '', toDateAd = '';
                        if (isNepaliFormat) {
                            fromDateFormatted = currentFiscalYear.startDateNepali || currentNepaliDate;
                            toDateFormatted = currentNepaliDate;
                            fromDateAd = convertBsToAd(fromDateFormatted);
                            toDateAd = convertBsToAd(toDateFormatted);
                        } else {
                            fromDateFormatted = currentFiscalYear.startDate ? new Date(currentFiscalYear.startDate).toISOString().split('T')[0] : currentEnglishDate;
                            toDateFormatted = currentFiscalYear.endDate ? new Date(currentFiscalYear.endDate).toISOString().split('T')[0] : currentEnglishDate;
                            fromDateAd = fromDateFormatted; toDateAd = toDateFormatted;
                        }
                        setDateRange({ fromDate: fromDateFormatted, toDate: toDateFormatted, fromDateAd, toDateAd });
                    } else if (hasDraftDates) {
                        let fromDateAd = dateRange.fromDate;
                        let toDateAd = dateRange.toDate;
                        if (isNepaliFormat && dateRange.fromDate) {
                            fromDateAd = convertBsToAd(dateRange.fromDate);
                            toDateAd = convertBsToAd(dateRange.toDate);
                        }
                        setDateRange(prev => ({ ...prev, fromDateAd: fromDateAd || prev.fromDateAd, toDateAd: toDateAd || prev.toDateAd }));
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
                setNotification({ show: true, message: 'Error loading account data', type: 'error' });
            } finally { setLoading(false); }
        };
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (showAccountModal) {
            setAccountSearchQuery('');
            setAccountSearchPage(1);
            if (accountShouldShowLastSearchResults && accountLastSearchQuery.trim() !== '') {
                fetchAccountsFromBackend(accountLastSearchQuery, 1);
            } else { fetchAccountsFromBackend('', 1); }
        }
    }, [showAccountModal]);

    // --- Main Fetch ---
    useEffect(() => {
        const abortController = new AbortController();
        const fetchStatementData = async () => {
            if (!shouldFetch) return;
            try {
                setLoading(true);
                const params = new URLSearchParams();
                params.append('dateFormat', company.dateFormat);
                if (dateRange.fromDateAd) params.append('fromDate', dateRange.fromDateAd);
                if (dateRange.toDateAd) params.append('toDate', dateRange.toDateAd);
                if (data.selectedCompany) params.append('account', data.selectedCompany);
                if (data.paymentMode && data.paymentMode !== 'all') params.append('paymentMode', data.paymentMode);
                if (viewMode === 'itemwise') params.append('includeItems', 'true');

                const response = await api.get(`/api/retailer/statement?${params.toString()}`, { signal: abortController.signal });

                if (response.data.success) {
                    const responseData = response.data.data;
                    let selectedAccountPhone = null;
                    if (responseData.selectedCompany) {
                        const selectedAccount = accounts.find(a => a.id === responseData.selectedCompany);
                        if (selectedAccount) selectedAccountPhone = selectedAccount.phone || null;
                    }
                    const selectedAccount = accounts.find(a => a.id === responseData.selectedCompany);
                    const formattedPartyName = selectedAccount && selectedAccount.uniqueNumber
                        ? `${selectedAccount.uniqueNumber} ${selectedAccount.name}`.trim()
                        : responseData.partyName || data.partyName;

                    setData(prev => ({
                        ...prev,
                        statement: responseData.statement || [],
                        itemwiseStatement: responseData.itemwiseStatement || [],
                        partyName: formattedPartyName,
                        selectedCompany: responseData.selectedCompany || prev.selectedCompany,
                        selectedAccountPhone: selectedAccountPhone || prev.selectedAccountPhone,
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
                    setNotification({ show: true, message: errorMsg, type: 'error' });
                }
            } catch (err) {
                if (err.name !== 'AbortError') {
                    const errorMsg = err.response?.data?.error || 'Failed to fetch statement';
                    setError(errorMsg);
                    setNotification({ show: true, message: errorMsg, type: 'error' });
                }
            } finally {
                setLoading(false);
                setShouldFetch(false);
            }
        };
        fetchStatementData();
        return () => abortController.abort();
    }, [shouldFetch, viewMode, company.dateFormat, dateRange.fromDateAd, dateRange.toDateAd, data.selectedCompany, data.paymentMode]);

    // --- Filtering ---
    useEffect(() => {
        const filtered = data.statement.filter(item => {
            return item.billNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.account?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.type?.toLowerCase().includes(searchQuery.toLowerCase());
        });
        setFilteredStatement(filtered);
        setSelectedRowIndex(0);
    }, [data.statement, searchQuery]);

    useEffect(() => {
        if (viewMode === 'itemwise' && data.itemwiseStatement.length > 0) {
            const filtered = data.itemwiseStatement.filter(bill => {
                const billMatch = bill.billNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    bill.type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    bill.paymentMode?.toLowerCase().includes(searchQuery.toLowerCase());
                const itemMatch = bill.items?.some(item =>
                    item.item?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    item.productName?.toLowerCase().includes(searchQuery.toLowerCase())
                );
                return billMatch || itemMatch;
            });
            setFilteredItemwiseStatement(filtered);
        } else {
            setFilteredItemwiseStatement(data.itemwiseStatement);
        }
    }, [data.itemwiseStatement, searchQuery, viewMode]);

    // --- Keyboard & Save ---
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (filteredStatement.length === 0) return;
            if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT') return;
            switch (e.key) {
                case 'ArrowUp': e.preventDefault(); setSelectedRowIndex(prev => Math.max(0, prev - 1)); break;
                case 'ArrowDown': e.preventDefault(); setSelectedRowIndex(prev => Math.min(filteredStatement.length - 1, prev + 1)); break;
                default: break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [filteredStatement]);

    useEffect(() => {
        const handleF9KeyDown = (e) => { if (e.key === 'F9') { e.preventDefault(); setShowProductModal(prev => !prev); } };
        window.addEventListener('keydown', handleF9KeyDown);
        return () => window.removeEventListener('keydown', handleF9KeyDown);
    }, []);

    useEffect(() => {
        setDraftSave({
            ...draftSave,
            statementData: { ...data, fromDate: dateRange.fromDate, toDate: dateRange.toDate, fromDateAd: dateRange.fromDateAd, toDateAd: dateRange.toDateAd },
            statementViewMode: viewMode,
            statementSearch: { searchQuery, selectedRowIndex, fromDate: dateRange.fromDate, toDate: dateRange.toDate, paymentMode: data.paymentMode, selectedCompany: data.selectedCompany }
        });
    }, [data, viewMode, searchQuery, selectedRowIndex, dateRange]);

    useEffect(() => {
        const savedWidths = localStorage.getItem('statementTableColumnWidths');
        if (savedWidths) try { setColumnWidths(JSON.parse(savedWidths)); } catch (e) { }
    }, []);
    useEffect(() => localStorage.setItem('statementTableColumnWidths', JSON.stringify(columnWidths)), [columnWidths]);

    // --- Handlers ---
    const handleGenerateReport = () => {
        if (!dateRange.fromDate || !dateRange.toDate) { setError('Please select both from and to dates'); setNotification({ show: true, message: 'Please select both from and to dates', type: 'warning' }); return; }
        if (!data.selectedCompany) { setError('Please select an account'); setNotification({ show: true, message: 'Please select an account', type: 'warning' }); return; }
        setShouldFetch(true);
    };

    const selectAccount = (account) => {
        const formattedName = `${account.uniqueNumber || ''} ${account.name}`.trim();
        setData(prev => ({
            ...prev,
            selectedCompany: account.id,
            partyName: formattedName,
            selectedAccountUniqueNumber: account.uniqueNumber,
            selectedAccountName: account.name,
            selectedAccountPhone: account.phone || ''
        }));
        setShowAccountModal(false);
         setSelectedAccountId(account.id);
        setAccountSearchQuery('');
        setTimeout(() => fromDateRef.current?.focus(), 50);
    };

    const handlePaymentModeChange = (e) => setData(prev => ({ ...prev, paymentMode: e.target.value }));
    const handleViewModeChange = (e) => setViewMode(e.target.value);
    const handleRowClick = (index) => setSelectedRowIndex(index);

    const handleRowDoubleClick = (item) => {
        let route = '';
        const accountGroupName = (item.accountGroupName || '').toLowerCase().trim();
        const isSundryDebtor = accountGroupName === 'sundry debtors';
        const isSundryCreditor = accountGroupName === 'sundry creditors';
        const isCashInHand = accountGroupName === 'cash in hand';

        switch (item.type?.toLowerCase()) {
            // case 'sale':
            //     if (isSundryDebtor || isSundryCreditor) route = `/retailer/credit-sales/edit/${item.salesBillId || item.id}`;
            //     else if (isCashInHand) route = `/retailer/cash-sales/edit/${item.salesBillId || item.id}`;
            //     break;
            case 'sale': route = `/retailer/sales/edit/${item.salesBillId || item.id}`; break;

            case 'purc': route = `/retailer/purchase/edit/${item.purchaseBillId}`; break;
            case 'slrt':
                if (isSundryDebtor || isSundryCreditor) route = `/retailer/sales-return/edit/${item.salesReturnBillId || item.id}`;
                else if (isCashInHand) route = `/retailer/cash/sales-return/edit/${item.salesReturnBillId || item.id}`;
                break;
            case 'prrt': route = `/retailer/purchase-return/edit/${item.purchaseReturnBillId}`; break;
            case 'pymt': route = `/retailer/payments/edit/${item.paymentAccountId || item.id}`; break;
            case 'rcpt': route = `/retailer/receipts/edit/${item.receiptAccountId || item.id}`; break;
            case 'jrnl': route = `/retailer/journal/edit/${item.journalBillId || item.id}`; break;
            case 'drnt': route = `/retailer/debit-note/edit/${item.debitNoteId || item.id}`; break;
            case 'crnt': route = `/retailer/credit-note/edit/${item.creditNoteId || item.id}`; break;
            default: return;
        }
        if (route) navigate(route);
    };

    const handleKeyDown = (e, nextFieldId) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (nextFieldId) document.getElementById(nextFieldId)?.focus();
        }
    };

    const resetColumnWidths = () => {
        setColumnWidths({ bsDate: 90, adDate: 90, voucherNo: 100, voucherType: 80, payMode: 80, account: 200, debit: 100, credit: 100, balance: 100, remarks: 100 });
        setNotification({ show: true, message: 'Column widths reset', type: 'success', duration: 2000 });
    };

    // --- Cash Settlement ---
    const handleCashSettlement = async (transactionId, status, remarks) => {
        if (!transactionId) { setNotification({ show: true, message: 'Transaction ID is required', type: 'error' }); return; }
        try {
            const response = await api.put(`/api/retailer/transaction/${transactionId}/cash-settlement`, { status, remarks });
            if (response.data.success) {
                setData(prev => ({
                    ...prev,
                    statement: prev.statement.map(item => {
                        let itemId = null;
                        switch (item.type) {
                            case 'Sale': itemId = item.salesBillId; break;
                            case 'Purc': itemId = item.purchaseBillId; break;
                            case 'SlRt': itemId = item.salesReturnBillId; break;
                            case 'PrRt': itemId = item.purchaseReturnBillId; break;
                            default: itemId = item.billId || item.id;
                        }
                        if (itemId === transactionId) return { ...item, cashSettlementStatus: status, cashSettlementDate: response.data.data.date, cashSettlementUserName: response.data.data.user, cashSettlementRemarks: remarks, isCashSettled: ['Received', 'Paid', 'Refunded', 'Returned'].includes(status) };
                        return item;
                    })
                }));
                setNotification({ show: true, message: response.data.message, type: 'success' });
                setShowCashSettlementModal(false);
            }
        } catch (error) { setNotification({ show: true, message: error.response?.data?.error || 'Failed to update cash settlement', type: 'error' }); }
    };

    const handleCashSettlementClick = (item) => {
        let transactionId = null;
        switch (item.type) {
            case 'Sale': transactionId = item.salesBillId; break;
            case 'Purc': transactionId = item.purchaseBillId; break;
            case 'SlRt': transactionId = item.salesReturnBillId; break;
            case 'PrRt': transactionId = item.purchaseReturnBillId; break;
            default: transactionId = item.billId || item.id || item.transactionId || item.BillId || item.Id;
        }
        const isCashTransaction = item.paymentMode === 'Cash' || item.paymentMode === 'cash';
        const isAllowedType = ['Sale', 'Purc', 'SlRt', 'PrRt'].includes(item.type);
        if (isCashTransaction && isAllowedType && transactionId) {
            setSelectedTransaction({ ...item, transactionId });
            setShowCashSettlementModal(true);
        } else if (!transactionId) {
            setNotification({ show: true, message: 'Transaction ID not found', type: 'warning' });
        }
    };

    // --- WhatsApp & Share ---
    const buildWhatsAppMessage = useCallback(() => {
        if (!generatedShareLink) return 'Generating link...';
        return `📊 *STATEMENT OF ACCOUNT*\n\n🏢 *Company:* ${data.currentCompanyName || 'N/A'}\n👤 *Party:* ${data.partyName || 'N/A'}\n📅 *Period:* ${dateRange.fromDate} to ${dateRange.toDate}\n\n─────────────────────\n\n🔗 *View your statement anytime:*\n${generatedShareLink}\n\n💡 *This link is permanent and always shows your latest statement.*\n\n─────────────────────\n📅 Generated: ${new Date().toLocaleString()}\n🔹 Powered by Ams Software`;
    }, [data, dateRange, generatedShareLink]);

    const handleOpenWhatsAppModal = async () => {
        const rowsToShare = viewMode === 'regular' ? (filteredStatement.length > 0 ? filteredStatement : data.statement) : data.itemwiseStatement;
        if (!rowsToShare || rowsToShare.length === 0) { setNotification({ show: true, message: 'No statement data to share', type: 'warning' }); return; }
        if (!data.selectedCompany) { setNotification({ show: true, message: 'Please select an account first', type: 'warning' }); return; }
        try {
            setIsGeneratingLink(true);
            const response = await api.post('/api/retailer/generate-share-token', { accountId: data.selectedCompany });
            if (response.data.success) {
                const shareableUrl = response.data.shareableUrl;
                setGeneratedShareLink(shareableUrl);
                const message = `📊 *STATEMENT OF ACCOUNT*\n\n🏢 *Company:* ${data.currentCompanyName || 'N/A'}\n👤 *Party:* ${data.partyName || 'N/A'}\n📅 *Period:* ${dateRange.fromDate} to ${dateRange.toDate}\n\n─────────────────────\n\n🔗 *View your statement anytime:*\n${shareableUrl}\n\n💡 *This link is permanent and always shows your latest statement.*\n\n─────────────────────\n📅 Generated: ${new Date().toLocaleString()}\n🔹 Powered by Ams Software`;
                setWhatsAppMessage(message);
                let defaultNumber = '';
                if (data.selectedAccountPhone) defaultNumber = data.selectedAccountPhone.replace(/[^0-9]/g, '');
                else if (data.selectedCompany) { const sa = accounts.find(a => a.id === data.selectedCompany); if (sa?.phone) defaultNumber = sa.phone.replace(/[^0-9]/g, ''); }
                else if (data.company?.phone) defaultNumber = data.company.phone.replace(/[^0-9]/g, '');
                setWhatsAppNumber(defaultNumber);
                setShowWhatsAppModal(true);
            } else throw new Error(response.data.error || 'Failed to generate share link');
            setIsGeneratingLink(false);
        } catch (error) { setNotification({ show: true, message: 'Failed to generate share link: ' + (error.response?.data?.error || error.message), type: 'error' }); setIsGeneratingLink(false); setShowWhatsAppModal(false); }
    };

    const handleSendWhatsApp = () => {
        if (!whatsAppNumber || whatsAppNumber.length < 10) { setNotification({ show: true, message: 'Please enter a valid WhatsApp number', type: 'warning' }); return; }
        if (!generatedShareLink) { setNotification({ show: true, message: 'Please wait while we generate the link...', type: 'info' }); handleOpenWhatsAppModal(); return; }
        const messageToSend = whatsAppMessage || buildWhatsAppMessage();
        const cleanNumber = whatsAppNumber.replace(/[^0-9]/g, '');
        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        const whatsappUrl = isMobile ? `https://wa.me/${cleanNumber}?text=${encodeURIComponent(messageToSend)}` : `https://web.whatsapp.com/send?phone=${cleanNumber}&text=${encodeURIComponent(messageToSend)}`;
        setShowWhatsAppModal(false);
        setWhatsAppNumber('');
        setGeneratedShareLink('');
        setWhatsAppMessage('');
        window.open(whatsappUrl, '_blank');
        setNotification({ show: true, message: '✅ WhatsApp opened with the statement link!', type: 'success', duration: 3000 });
    };

    const generatePermanentShareLink = async () => {
        if (!data.selectedCompany) { setNotification({ show: true, message: 'Please select an account first', type: 'warning' }); return; }
        try {
            setEmailLoading(true);
            const response = await api.post('/api/retailer/generate-share-token', { accountId: data.selectedCompany });
            if (response.data.success) {
                const shareableUrl = response.data.shareableUrl;
                navigator.clipboard.writeText(shareableUrl).then(() => {
                    setNotification({ show: true, message: '✅ Link copied to clipboard!', type: 'success', duration: 5000 });
                }).catch(() => { prompt('Copy this link to share the statement:', shareableUrl); });
            }
            setEmailLoading(false);
        } catch (error) { setNotification({ show: true, message: 'Failed to generate share link: ' + (error.response?.data?.error || error.message), type: 'error' }); setEmailLoading(false); }
    };

    // --- Export & Print ---
    const handlePrint = () => {
        const rowsToPrint = viewMode === 'regular' ? (filteredStatement.length > 0 ? filteredStatement : data.statement) : data.itemwiseStatement;
        if (!rowsToPrint || rowsToPrint.length === 0) { setNotification({ show: true, message: 'No statement data to print', type: 'warning' }); return; }
        const printWindow = window.open("", "_blank");
        if (!printWindow) { setNotification({ show: true, message: 'Popup blocked', type: 'error' }); return; }
        let tableContent = viewMode === 'regular' ? generateRegularPrintContent(rowsToPrint) : generateItemwisePrintContent(rowsToPrint);
        printWindow.document.write(`<html><head><title>Statement - ${viewMode === 'regular' ? 'Regular' : 'Itemwise'}</title><style>
            @page { margin: 5mm; size: A4 portrait; } body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10px; margin: 0; padding: 5mm; background: #fff; color: #000; }
            table { width: 100%; border-collapse: collapse; page-break-inside: auto; font-size: 10px; } tr { page-break-inside: avoid; page-break-after: auto; }
            th, td { border: 1px solid #333; padding: 4px 6px; text-align: left; white-space: nowrap; }
            th { background-color: #e8e8e8 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-size: 11px; font-weight: 700; color: #1a1a1a; }
            td { font-size: 10px; padding: 4px 6px; } .print-header { text-align: center; margin-bottom: 10px; }
            .text-end { text-align: right; } .text-center { text-align: center; } .nowrap { white-space: nowrap; }
            .report-title { text-align: center; text-decoration: underline; font-size: 14px; font-weight: 700; margin: 6px 0; color: #1a1a1a; letter-spacing: 0.5px; }
            .grand-total-row td { font-weight: 700; border-top: 3px double #000; background-color: #f5f5f5 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .company-name { font-size: 18px; font-weight: 700; margin: 0; padding: 0; color: #1a1a1a; letter-spacing: 1px; }
            .company-details { font-size: 10px; margin: 4px 0; color: #333; line-height: 1.4; }
            .statement-info { font-size: 10px; margin: 4px 0; color: #444; line-height: 1.6; }
            .statement-info strong { font-weight: 600; color: #1a1a1a; }
            .footer { margin-top: 15px; font-size: 9px; text-align: center; border-top: 1px solid #ccc; padding-top: 8px; color: #666; }
            .total-label { font-size: 11px; font-weight: 600; } .voucher-type { font-weight: 500; color: #1a1a1a; }
            @media print { body { padding: 10px; } th, td { padding: 3px 5px; } }
        </style></head><body>${tableContent}<script>window.onload=function(){setTimeout(function(){window.print();setTimeout(function(){window.close()},500)},300)}</script></body></html>`);
        printWindow.document.close();
    };

    const generateRegularPrintContent = (statementData) => {
        let balance = data.openingBalance;
        let totalDebit = 0, totalCredit = 0;
        const isNepaliFormat = company.dateFormat === 'nepali';
        let tableContent = `
            <div class="print-header"><div class="company-name">${data.currentCompanyName || 'Company Name'}</div>
            <div class="company-details">${data.company?.address || ''}${data.company?.city ? ', ' + data.company.city : ''}<br>PAN: ${data.company?.pan || ''} | Phone: ${data.company?.phone || ''}</div>
            <hr style="margin:6px 0; border: 1px solid #ccc;">
            <div class="report-title">STATEMENT OF ACCOUNT</div>
            <div class="statement-info"><strong>Party:</strong> ${data.partyName} &nbsp;|&nbsp; <strong>From (BS):</strong> ${dateRange.fromDate} &nbsp;|&nbsp; <strong>To (BS):</strong> ${dateRange.toDate} &nbsp;|&nbsp; <strong>Payment Mode:</strong> ${data.paymentMode === 'all' ? 'All (Include Cash)' : data.paymentMode === 'exclude-cash' ? 'All (Exclude Cash)' : data.paymentMode}</div>
            </div>
            <table><thead><tr><th>Miti</th><th>Date</th><th>Vch No.</th><th>Type</th><th>Pay Mode</th><th>Account</th><th class="text-end">Debit</th><th class="text-end">Credit</th><th class="text-end">Balance</th></tr></thead><tbody>
        `;
        statementData.forEach((item) => {
            const isOpening = item.accountType === 'Opening' || item.type === 'Opening' || (!item.type && item.accountType === 'Opening');
            const bsDate = isOpening ? dateRange.fromDate : (item.nepaliDate || (isNepaliFormat ? new NepaliDate(item.date).format('YYYY-MM-DD') : ''));
            const adDate = isOpening ? dateRange.fromDateAd : (item.date ? new Date(item.date).toLocaleDateString() : '');
            const debit = parseFloat(item.debit) || 0;
            const credit = parseFloat(item.credit) || 0;
            balance = balance + debit - credit;
            totalDebit += debit; totalCredit += credit;
            const balanceText = balance > 0 ? `${formatCurrencyForPrint(Math.abs(balance))} Dr` : `${formatCurrencyForPrint(Math.abs(balance))} Cr`;
            let accountName = isOpening ? 'Opening' : (item.type === 'Pymt' || item.type === 'Rcpt' ? item.PaymentReceiptType || item.accountType || '' : item.accountType || item.purchaseSalesType || item.purchaseSalesReturnType || item.journalAccountType || '');
            tableContent += `<tr><td>${bsDate || '-'}</td><td>${adDate || '-'}</td><td>${item.billNumber || ''}</td><td>${item.type || ''}</td><td>${item.paymentMode || ''}</td><td style="white-space:normal;word-wrap:break-word;max-width:150px;">${accountName}</td><td class="text-end">${debit > 0 ? formatCurrencyForPrint(debit) : '-'}</td><td class="text-end">${credit > 0 ? formatCurrencyForPrint(credit) : '-'}</td><td class="text-end">${balanceText}</td></tr>`;
        });
        const finalBalanceText = balance > 0 ? `${formatCurrencyForPrint(Math.abs(balance))} Dr` : `${formatCurrencyForPrint(Math.abs(balance))} Cr`;
        tableContent += `<tr class="grand-total-row"><td colspan="6" class="text-end total-label">TOTALS</td><td class="text-end total-label">${formatCurrencyForPrint(totalDebit)}</td><td class="text-end total-label">${formatCurrencyForPrint(totalCredit)}</td><td class="text-end total-label">${finalBalanceText}</td></tr></tbody></table>
            <div class="footer">Generated on: ${new Date().toLocaleString()} | Powered by Ams Software</div>`;
        return tableContent;
    };

    const generateItemwisePrintContent = (statementData) => {
        if (!statementData || statementData.length === 0) return '<div>No itemwise statement data available</div>';
        const isNepaliFormat = company.dateFormat === 'nepali';
        let tableContent = `
            <div class="print-header"><div class="company-name">${data.currentCompanyName || 'Company Name'}</div>
            <div class="company-details">${data.company?.address || ''}${data.company?.city ? ', ' + data.company.city : ''}<br>PAN: ${data.company?.pan || ''} | Phone: ${data.company?.phone || ''}</div>
            <hr style="margin:6px 0; border: 1px solid #ccc;">
            <div class="report-title">ITEMWISE STATEMENT</div>
            <div class="statement-info"><strong>Party:</strong> ${data.partyName} &nbsp;|&nbsp; <strong>From (BS):</strong> ${dateRange.fromDate} &nbsp;|&nbsp; <strong>To (BS):</strong> ${dateRange.toDate} &nbsp;|&nbsp; <strong>Payment Mode:</strong> ${data.paymentMode === 'all' ? 'All (Include Cash)' : data.paymentMode === 'exclude-cash' ? 'All (Exclude Cash)' : data.paymentMode}</div></div>
            <table><thead><tr><th>Miti</th><th>Date</th><th>Vch No.</th><th>Type</th><th>Pay Mode</th><th>Item Name</th><th class="text-end">Qty</th><th>Unit</th><th class="text-end">Rate</th><th class="text-end">Disc</th><th class="text-end">Taxable</th><th class="text-end">VAT</th><th class="text-end">Total</th></tr></thead><tbody>
        `;
        let gQty = 0, gAmt = 0, gVat = 0, gTax = 0, gDisc = 0;
        statementData.forEach((bill) => {
            if (bill.items && bill.items.length > 0) {
                const bsDate = bill.nepaliDate || (isNepaliFormat ? new NepaliDate(bill.date).format('YYYY-MM-DD') : '');
                const adDate = bill.date ? new Date(bill.date).toLocaleDateString() : '';
                bill.items.forEach((item) => {
                    const qty = parseFloat(item.quantity) || 0, rate = item.puPrice || item.price || 0, disc = item.discountAmountPerItem || 0, taxable = item.taxableAmount || 0, vat = item.vatAmount || 0, total = item.totalAmount || (taxable + vat);
                    gQty += qty; gAmt += total; gVat += vat; gTax += taxable; gDisc += disc;
                    tableContent += `<tr><td>${bsDate}</td><td>${adDate}</td><td>${bill.billNumber || ''}</td><td>${bill.type || ''}</td><td>${bill.paymentMode || ''}</td><td style="white-space:normal;word-wrap:break-word;max-width:180px;">${item.item?.name || item.productName || 'N/A'}</td><td class="text-end">${qty.toFixed(2)}</td><td>${item.unit?.name || ''}</td><td class="text-end">${formatCurrencyForPrint(rate)}</td><td class="text-end">${formatCurrencyForPrint(disc)}</td><td class="text-end">${formatCurrencyForPrint(taxable)}</td><td class="text-end">${formatCurrencyForPrint(vat)}</td><td class="text-end">${formatCurrencyForPrint(total)}</td></tr>`;
                });
            }
        });
        tableContent += `<tr class="grand-total-row"><td colspan="6" class="text-end total-label">GRAND TOTALS</td><td class="text-end total-label">${gQty.toFixed(2)}</td><td></td><td></td><td class="text-end total-label">${formatCurrencyForPrint(gDisc)}</td><td class="text-end total-label">${formatCurrencyForPrint(gTax)}</td><td class="text-end total-label">${formatCurrencyForPrint(gVat)}</td><td class="text-end total-label">${formatCurrencyForPrint(gAmt)}</td></tr></tbody></table>
            <div class="footer">Generated on: ${new Date().toLocaleString()} | Powered by Ams Software</div>`;
        return tableContent;
    };

    const formatCurrencyForPrint = (num) => {
        const number = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num) || 0;
        return number.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const handleExportExcel = async () => {
        const hasData = viewMode === 'regular' ? (data.statement && data.statement.length > 0) : (data.itemwiseStatement && data.itemwiseStatement.length > 0);
        if (!hasData) { setNotification({ show: true, message: 'No data available to export', type: 'warning' }); return; }
        setExporting(true);
        try {
            let excelData = [];
            const currentDate = new Date().toISOString().split('T')[0];
            const isNepaliFormat = company.dateFormat === 'nepali';
            excelData.push(['Company Name:', data.currentCompanyName || 'N/A'], ['Report Type:', 'Statement Report'], ['View Mode:', viewMode === 'regular' ? 'Regular Statement' : 'Itemwise Statement'], ['Party Name:', data.partyName || 'N/A'], ['From Date (BS):', dateRange.fromDate], ['To Date (BS):', dateRange.toDate], ['Payment Mode:', data.paymentMode === 'all' ? 'All (Include Cash)' : data.paymentMode === 'exclude-cash' ? 'All (Exclude Cash)' : data.paymentMode], ['Export Date:', currentDate], []);

            if (viewMode === 'regular') {
                const openingBalance = data.openingBalance || 0;
                excelData.push([]);
                excelData.push(['Miti', 'Date', 'Vch No.', 'Vch Type', 'Pay Mode', 'Account', 'Debit', 'Credit', 'Balance', 'Remarks']);
                let balance = openingBalance, totalDebit = 0, totalCredit = 0;
                const stmt = filteredStatement.length > 0 ? filteredStatement : data.statement;
                stmt.forEach((item) => {
                    const isOpening = item.accountType === 'Opening' || item.type === 'Opening' || (!item.type && item.accountType === 'Opening');
                    const bsDate = isOpening ? dateRange.fromDate : (item.nepaliDate || (isNepaliFormat ? new NepaliDate(item.date).format('YYYY-MM-DD') : ''));
                    const adDate = isOpening ? dateRange.fromDateAd : (item.date ? new Date(item.date).toISOString().split('T')[0] : '');
                    const debit = parseFloat(item.debit) || 0, credit = parseFloat(item.credit) || 0;
                    balance = balance + debit - credit; totalDebit += debit; totalCredit += credit;
                    const balanceText = balance > 0 ? `${formatCurrencyForExport(Math.abs(balance))} Dr` : `${formatCurrencyForExport(Math.abs(balance))} Cr`;
                    let accountName = isOpening ? 'Opening' : (item.type === 'Pymt' || item.type === 'Rcpt' ? item.PaymentReceiptType || item.accountType || '' : item.accountType || item.purchaseSalesType || item.purchaseSalesReturnType || item.journalAccountType || '');
                    let remarks = item.cashSettlementRemarks || (item.instType && item.instNo ? `${item.instType} ${item.instNo}` : item.instType || item.instNo || '');
                    excelData.push([bsDate || '-', adDate || '-', item.billNumber || '', item.type || '', item.paymentMode || '', accountName, debit > 0 ? formatCurrencyForExport(debit) : '-', credit > 0 ? formatCurrencyForExport(credit) : '-', balanceText, remarks || '']);
                });
                const finalBalanceText = balance > 0 ? `${formatCurrencyForExport(Math.abs(balance))} Dr` : `${formatCurrencyForExport(Math.abs(balance))} Cr`;
                excelData.push([], ['TOTALS', '', '', '', '', 'Grand Total:', formatCurrencyForExport(totalDebit), formatCurrencyForExport(totalCredit), finalBalanceText, '']);
            } else {
                excelData.push(['Miti', 'Date', 'Vch No.', 'Vch Type', 'Pay Mode', 'Item Name', 'Qty', 'Unit', 'Rate', 'Disc', 'Taxable', 'VAT', 'Total']);
                let gQty = 0, gAmt = 0, gVat = 0, gTax = 0, gDisc = 0;
                data.itemwiseStatement.forEach((bill) => {
                    if (bill.items && bill.items.length > 0) {
                        const bsDate = bill.nepaliDate || (isNepaliFormat ? new NepaliDate(bill.date).format('YYYY-MM-DD') : '');
                        const adDate = bill.date ? new Date(bill.date).toISOString().split('T')[0] : '';
                        bill.items.forEach((item) => {
                            const qty = parseFloat(item.quantity) || 0, rate = item.puPrice || item.price || 0, disc = item.discountAmountPerItem || 0, taxable = item.taxableAmount || 0, vat = item.vatAmount || 0, total = item.totalAmount || (taxable + vat);
                            gQty += qty; gAmt += total; gVat += vat; gTax += taxable; gDisc += disc;
                            excelData.push([bsDate || '-', adDate || '-', bill.billNumber || '', bill.type || '', bill.paymentMode || '', item.item?.name || item.productName || 'N/A', qty.toFixed(2), item.unit?.name || '', formatCurrencyForExport(rate), formatCurrencyForExport(disc), formatCurrencyForExport(taxable), formatCurrencyForExport(vat), formatCurrencyForExport(total)]);
                        });
                    }
                });
                excelData.push([], ['GRAND TOTALS', '', '', '', '', '', gQty.toFixed(2), '', '', formatCurrencyForExport(gDisc), formatCurrencyForExport(gTax), formatCurrencyForExport(gVat), formatCurrencyForExport(gAmt)]);
            }
            const ws = XLSX.utils.aoa_to_sheet(excelData);
            ws['!cols'] = viewMode === 'regular'
                ? [{ wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }]
                : [{ wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 25 }, { wch: 10 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 15 }];
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Statement Report');
            XLSX.writeFile(wb, `Statement_${data.partyName}_${dateRange.fromDate}_to_${dateRange.toDate}_${viewMode}.xlsx`);
            setNotification({ show: true, message: 'Excel exported successfully!', type: 'success' });
        } catch (err) {
            setNotification({ show: true, message: 'Failed to export Excel file: ' + err.message, type: 'error' });
        } finally { setExporting(false); }
    };

    const formatCurrencyForExport = (num) => {
        const number = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num) || 0;
        return number.toFixed(2);
    };

    // --- Resize Handle Component ---
    const ResizeHandle = React.memo(({ onResizeStart, left, columnName }) => (
        <div className="st-resize-handle" style={{ position: 'absolute', top: 0, left: `${left}px`, width: '5px', height: '100%', cursor: 'col-resize', zIndex: 10 }} onMouseDown={(e) => { e.preventDefault(); onResizeStart(e, columnName); }} />
    ));

    // --- Table Header Component ---
    const TableHeader = React.memo(() => {
        const totalWidth = Object.values(columnWidths).reduce((a, b) => a + b, 0);
        const handleResizeStart = (e, columnName) => {
            setIsResizing(true); setResizingColumn(columnName); setStartX(e.clientX); setStartWidth(columnWidths[columnName]); e.preventDefault();
        };
        return (
            <div className="st-header" style={{ minWidth: `${totalWidth}px` }}
                onMouseMove={(e) => { if (isResizing && resizingColumn) setColumnWidths(prev => ({ ...prev, [resizingColumn]: Math.max(60, startWidth + e.clientX - startX) })); }}
                onMouseUp={() => { setIsResizing(false); setResizingColumn(null); }}
                onMouseLeave={() => { setIsResizing(false); setResizingColumn(null); }}
            >
                <div className="st-header-cell st-cell--center" style={{ width: `${columnWidths.bsDate}px`, flexShrink: 0 }}>Miti<ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.bsDate - 2} columnName="bsDate" /></div>
                <div className="st-header-cell st-cell--center" style={{ width: `${columnWidths.adDate}px`, flexShrink: 0 }}>Date<ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.adDate - 2} columnName="adDate" /></div>
                <div className="st-header-cell" style={{ width: `${columnWidths.voucherNo}px`, flexShrink: 0 }}>Vch No.<ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.voucherNo - 2} columnName="voucherNo" /></div>
                <div className="st-header-cell" style={{ width: `${columnWidths.voucherType}px`, flexShrink: 0 }}>Type<ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.voucherType - 2} columnName="voucherType" /></div>
                <div className="st-header-cell" style={{ width: `${columnWidths.payMode}px`, flexShrink: 0 }}>Pay Mode<ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.payMode - 2} columnName="payMode" /></div>
                <div className="st-header-cell" style={{ width: `${columnWidths.account}px`, flexShrink: 0 }}>Account<ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.account - 2} columnName="account" /></div>
                <div className="st-header-cell st-cell--end" style={{ width: `${columnWidths.debit}px`, flexShrink: 0 }}>Debit<ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.debit - 2} columnName="debit" /></div>
                <div className="st-header-cell st-cell--end" style={{ width: `${columnWidths.credit}px`, flexShrink: 0 }}>Credit<ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.credit - 2} columnName="credit" /></div>
                <div className="st-header-cell st-cell--end" style={{ width: `${columnWidths.balance}px`, flexShrink: 0 }}>Balance<ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.balance - 2} columnName="balance" /></div>
                <div className="st-header-cell" style={{ width: `${columnWidths.remarks}px`, flexShrink: 0 }}>Remarks<ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.remarks - 2} columnName="remarks" /></div>
                {isResizing && <div style={{ position: 'fixed', inset: 0, zIndex: 1000, cursor: 'col-resize' }} />}
            </div>
        );
    });

    // --- Table Row Component ---
    const TableRow = React.memo(({ index, style, data: rowData }) => {
        const { statement, selectedRowIndex, formatCurrency, formatBalance, handleRowClick, handleRowDoubleClick } = rowData;
        const item = statement[index];
        const isNepaliFormat = company.dateFormat === 'nepali';

        const getSettlementStatusBadge = (item) => {
            if (!item.isCashTransaction) return null;

            const status = item.cashSettlementStatus;
            if (!status || status === 'Pending') {
                return (
                    <Badge bg="secondary" style={{ fontSize: '8px' }}>
                        <i className="bi bi-clock me-1"></i>Pending
                    </Badge>
                );
            }

            const statusColors = {
                'Received': 'success',
                'Paid': 'info',
                'Refunded': 'warning',
                'Returned': 'success',
                'Pending': 'secondary'
            };

            const statusIcons = {
                'Received': '✓',
                'Paid': '✓',
                'Refunded': '↩',
                'Returned': '↩',
                'Pending': '⏳'
            };

            return (
                <Badge bg={statusColors[status] || 'secondary'} style={{ fontSize: '8px' }}>
                    {statusIcons[status] || ''} {status}
                </Badge>
            );
        };

        if (!item) return null;

        const isSelected = selectedRowIndex === index;

        // Check if this is a cash entry (cash received/paid)
        const isCashEntry = item.isCashEntry || false;
        const isCashTransaction = item.isCashTransaction || false;
        const isSundryAccount = item.isSundryAccount || false;

        // Only show cash entry styling if it's a Sundry account
        const showCashEntry = isCashEntry && isSundryAccount;

        const getFormattedAccountName = (item) => {
            // For cash entries on Sundry accounts
            if (showCashEntry) {
                return item.accountType || 'Cash Entry';
            }

            // For original cash transactions on Sundry accounts
            if (isCashTransaction && isSundryAccount && item.paymentDirection) {
                if (item.type === 'Sale' && item.paymentMode === 'Cash') {
                    return 'Cash Sale';
                }
                if (item.type === 'Purc' && item.paymentMode === 'Cash') {
                    return 'Cash Purchase';
                }
                if (item.type === 'SlRt' && item.paymentMode === 'Cash') {
                    return 'Cash Sales Rtn.';
                }
                if (item.type === 'PrRt' && item.paymentMode === 'Cash') {
                    return 'Cash Purchase Rtn.';
                }
            }

            // Existing logic for other transactions
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
            if (item.type === 'Pymt') {
                return item.accountType || 'Payment';
            }
            if (item.type === 'Rcpt') {
                return item.accountType || 'Receipt';
            }

            return item.accountType || item.purchaseSalesType || item.purchaseSalesReturnType ||
                item.PaymentReceiptType || item.journalAccountType || 'Opening';
        };

        // Check if this is an opening balance entry
        const isOpeningBalance = item.accountType === 'Opening' ||
            item.type === 'Opening' ||
            (!item.type && item.accountType === 'Opening') ||
            (item.accountType === 'Opening');

        // Calculate BS Date and AD Date
        let bsDate = '';
        let adDateDisplay = '';

        if (isOpeningBalance) {
            if (isNepaliFormat && dateRange.fromDate) {
                bsDate = dateRange.fromDate;
            } else if (dateRange.fromDateAd) {
                adDateDisplay = dateRange.fromDateAd;
            }
        } else {
            bsDate = item.nepaliDate || (isNepaliFormat ? new NepaliDate(item.date).format('YYYY-MM-DD') : '');
            adDateDisplay = item.date ? new Date(item.date).toLocaleDateString() : '';
        }

        // Determine row background color
        let backgroundColor = isSelected ? '#e7f3ff' : (index % 2 === 0 ? '#f8f9fa' : 'white');

        // Special highlighting for cash entries (cash received/paid) - ONLY for Sundry accounts
        if (showCashEntry) {
            backgroundColor = isSelected ? '#d4edda' : (index % 2 === 0 ? '#e8f5e9' : '#f1f8e9');
        }

        // Determine if we should show the cash indicators
        const showCashIndicators = isCashTransaction && isSundryAccount;

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
                    backgroundColor: backgroundColor,
                    borderLeft: showCashEntry ? '3px solid #28a745' : 'none'
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
                    <span style={{
                        fontSize: '0.75rem',
                        fontWeight: showCashEntry ? '600' : 'normal'
                    }}>
                        {item.billNumber || ''}
                    </span>
                </div>

                {/* Type Column */}
                <div className="d-flex align-items-center px-1 border-end" style={{ width: `${columnWidths.voucherType}px`, flexShrink: 0, height: '100%', overflow: 'hidden' }}>
                    <span style={{
                        fontSize: '0.75rem',
                        fontWeight: showCashEntry ? '600' : 'normal',
                        color: showCashEntry ? '#28a745' :
                            showCashIndicators ? '#856404' : 'inherit'
                    }}>
                        {showCashEntry ? 'Cash' : (item.type || '')}
                        {showCashEntry && (
                            <span style={{ fontSize: '0.65rem', marginLeft: '2px' }}>
                                {item.paymentDirection === 'Received' ? '⬇' : '⬆'}
                            </span>
                        )}
                    </span>
                </div>

                {/* Pay Mode Column */}
                <div className="d-flex align-items-center px-1 border-end" style={{ width: `${columnWidths.payMode}px`, flexShrink: 0, height: '100%', overflow: 'hidden' }}>
                    <span style={{
                        fontSize: '0.75rem',
                        fontWeight: showCashEntry ? '600' : 'normal'
                    }}>
                        {showCashEntry ? 'Cash' : (item.paymentMode || '')}
                    </span>
                </div>

                {/* Account Column - FIXED: Added (e) parameter and correct event handling */}
                <div
                    className="d-flex align-items-center px-1 border-end"
                    style={{ width: `${columnWidths.account}px`, flexShrink: 0, height: '100%', overflow: 'hidden' }}
                    title={`${getFormattedAccountName(item)}${item.cashSettlementStatus ? ` - ${item.cashSettlementStatus}` : ''}`}
                    onClick={(e) => {
                        // First check if it's a clickable cash transaction
                        const isCashTransactionType = item.paymentMode === 'Cash' && ['Sale', 'Purc', 'SlRt', 'PrRt'].includes(item.type);
                        if (isCashTransactionType) {
                            // Prevent the row click from triggering
                            e.stopPropagation();
                            handleCashSettlementClick(item);
                        }
                    }}
                >
                    <span style={{
                        fontSize: '0.75rem',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        fontWeight: showCashEntry ? '600' : 'normal',
                        color: showCashEntry ? '#28a745' : 'inherit',
                        cursor: (item.paymentMode === 'Cash' && ['Sale', 'Purc', 'SlRt', 'PrRt'].includes(item.type)) ? 'pointer' : 'default'
                    }}>
                        {getFormattedAccountName(item)}
                        {item.isCashTransaction && ['Sale', 'Purc', 'SlRt', 'PrRt'].includes(item.type) && (
                            <span style={{ marginLeft: '4px' }}>
                                {getSettlementStatusBadge(item)}
                            </span>
                        )}
                    </span>
                </div>

                {/* Debit Column */}
                <div className="d-flex align-items-center justify-content-end px-1 border-end" style={{ width: `${columnWidths.debit}px`, flexShrink: 0, height: '100%' }}>
                    <span style={{
                        fontSize: '0.75rem',
                        color: item.debit > 0 ? (showCashEntry ? '#28a745' : '#000') : 'inherit',
                        fontWeight: showCashEntry ? '600' : 'normal'
                    }}>
                        {item.debit > 0 ? formatCurrency(item.debit) : '-'}
                    </span>
                </div>

                {/* Credit Column */}
                <div className="d-flex align-items-center justify-content-end px-1 border-end" style={{ width: `${columnWidths.credit}px`, flexShrink: 0, height: '100%' }}>
                    <span style={{
                        fontSize: '0.75rem',
                        color: item.credit > 0 ? (showCashEntry ? '#dc3545' : '#000') : 'inherit',
                        fontWeight: showCashEntry ? '600' : 'normal'
                    }}>
                        {item.credit > 0 ? formatCurrency(item.credit) : '-'}
                    </span>
                </div>

                {/* Balance Column */}
                <div className="d-flex align-items-center justify-content-end px-1" style={{ width: `${columnWidths.balance}px`, flexShrink: 0, height: '100%' }}>
                    <span style={{
                        fontSize: '0.75rem',
                        fontWeight: showCashEntry ? '600' : 'normal',
                        color: showCashEntry ? '#1a73e8' : 'inherit'
                    }}>
                        {item.balance > 0 ? `${formatCurrency(item.balance)} Dr` : `${formatCurrency(Math.abs(item.balance))} Cr`}
                    </span>
                </div>

                {/* Remarks Column */}
                <div className="d-flex align-items-center justify-content-end px-1">
                    <span style={{
                        fontSize: '0.75rem',
                        fontWeight: showCashEntry ? '600' : 'normal',
                        color: showCashEntry ? '#1a73e8' : 'inherit'
                    }}>
                        {(item.cashSettlementRemarks)}
                        {(item.instType)} {(item.instNo)}
                    </span>
                </div>
            </div>
        );
    });

    function shallowEqual(objA, objB) {
        if (objA === objB) return true;
        if (typeof objA !== 'object' || objA === null || typeof objB !== 'object' || objB === null) return false;
        const keysA = Object.keys(objA); const keysB = Object.keys(objB);
        if (keysA.length !== keysB.length) return false;
        for (let i = 0; i < keysA.length; i++) {
            if (!objB.hasOwnProperty(keysA[i]) || objA[keysA[i]] !== objB[keysA[i]]) return false;
        }
        return true;
    }

    if (loading && !data.statement.length && !data.itemwiseStatement.length) return <Loader />;
    if (error) return <div className="st-page"><Header /><div className="st-shell"><div className="st-state"><h3>Error</h3><p>{error}</p></div></div></div>;

    return (
        <div className="st-page">
            <Header />

            <div className="st-shell">
                {/* Top Bar */}
                <div className="st-topbar">
                    <div className="st-topbar__left">
                        <div className="st-topbar__icon"><FiFileText /></div>
                        <div><h1>{data.partyName ? `Statement: ${data.partyName}` : 'Statement'}</h1></div>
                    </div>
                    <div className="st-topbar__actions">
                        <button className="st-btn-icon" onClick={handleExportExcel} disabled={exporting}><FiDownload /> {exporting ? '…' : 'Excel'}</button>
                        <button className="st-btn-icon" onClick={handlePrint}><FiPrinter /> Print</button>
                        <button className="st-btn-icon" onClick={resetColumnWidths} title="Reset columns"><FiRefreshCw /> Reset</button>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="st-toolbar">
                    <div className="st-field st-field--account">
                        <label>Party <span className="req">*</span></label>
                        <input type="text" id="account" value={data.partyName} onClick={() => setShowAccountModal(true)} readOnly placeholder="Click to select..." />
                    </div>

                    <div className="st-field st-field--date">
                        <label>From (BS) <span className="req">*</span></label>
                        <input type="text" id="fromDate" ref={fromDateRef} className={dateErrors.fromDate ? 'is-invalid' : ''} value={dateRange.fromDate || ''} onChange={(e) => { const v = e.target.value.replace(/[^0-9/-]/g, '').slice(0, 10); setDateRange(p => ({ ...p, fromDate: v, fromDateAd: convertBsToAd(v) || p.fromDateAd })); setDateErrors(p => ({ ...p, fromDate: '' })); }} onKeyDown={(e) => handleKeyDown(e, 'fromDateAd')} onBlur={(e) => { const d = e.target.value.trim(); if (!d) return; const c = validateAndCorrectNepaliDate(d); if (!c) { const ad = convertBsToAd(currentNepaliDate); setDateRange(p => ({ ...p, fromDate: currentNepaliDate, fromDateAd: ad })); setNotification({ show: true, message: 'Invalid Nepali date. Auto-corrected.', type: 'warning' }); } }} placeholder="YYYY-MM-DD" autoComplete="off" autoFocus />
                        {dateErrors.fromDate && <div className="st-field-error">{dateErrors.fromDate}</div>}
                    </div>
                    <div className="st-field st-field--date">
                        <label>From (AD)</label>
                        <input type="date" id="fromDateAd" value={dateRange.fromDateAd || ''} onChange={(e) => { const v = e.target.value; setDateRange(p => ({ ...p, fromDateAd: v, fromDate: convertAdToBs(v) || p.fromDate })); }} onKeyDown={(e) => handleKeyDown(e, 'toDate')} />
                    </div>
                    <div className="st-field st-field--date">
                        <label>To (BS) <span className="req">*</span></label>
                        <input type="text" id="toDate" ref={toDateRef} className={dateErrors.toDate ? 'is-invalid' : ''} value={dateRange.toDate || ''} onChange={(e) => { const v = e.target.value.replace(/[^0-9/-]/g, '').slice(0, 10); setDateRange(p => ({ ...p, toDate: v, toDateAd: convertBsToAd(v) || p.toDateAd })); setDateErrors(p => ({ ...p, toDate: '' })); }} onKeyDown={(e) => handleKeyDown(e, 'toDateAd')} onBlur={(e) => { const d = e.target.value.trim(); if (!d) return; const c = validateAndCorrectNepaliDate(d); if (!c) { const ad = convertBsToAd(currentNepaliDate); setDateRange(p => ({ ...p, toDate: currentNepaliDate, toDateAd: ad })); setNotification({ show: true, message: 'Invalid Nepali date. Auto-corrected.', type: 'warning' }); } }} placeholder="YYYY-MM-DD" autoComplete="off" />
                        {dateErrors.toDate && <div className="st-field-error">{dateErrors.toDate}</div>}
                    </div>
                    <div className="st-field st-field--date">
                        <label>To (AD)</label>
                        <input type="date" id="toDateAd" value={dateRange.toDateAd || ''} onChange={(e) => { const v = e.target.value; setDateRange(p => ({ ...p, toDateAd: v, toDate: convertAdToBs(v) || p.toDate })); }} onKeyDown={(e) => handleKeyDown(e, 'generateReport')} />
                    </div>

                    <div className="st-field st-field--select">
                        <label>Pay Mode</label>
                        <select id="paymentMode" value={data.paymentMode} onChange={handlePaymentModeChange}>
                            <option value="all">All (Inc. Cash)</option>
                            <option value="exclude-cash">All (Exc. Cash)</option>
                            <option value="cash">Cash</option>
                            <option value="credit">Credit</option>
                        </select>
                    </div>

                    <div className="st-field st-field--select">
                        <label>View</label>
                        <select id="viewMode" value={viewMode} onChange={handleViewModeChange}>
                            <option value="regular">Regular</option>
                            <option value="itemwise">Itemwise</option>
                        </select>
                    </div>

                    <button type="button" id="generateReport" ref={generateReportRef} className="st-btn-gen" onClick={handleGenerateReport} disabled={loading || !data.selectedCompany}>
                        {loading ? <span className="spinner-border spinner-border-sm" style={{ width: 12, height: 12 }} /> : <><FiSearch className="me-1" /> Generate</>}
                    </button>

                    <div className="st-toolbar-divider" />

                    <div className="st-field st-field--search">
                        <label>Search</label>
                        <div className="st-search-wrap">
                            <FiSearch className="st-search-icon" />
                            <input type="text" id="searchInput" ref={searchInputRef} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} disabled={data.statement.length === 0 && data.itemwiseStatement.length === 0} autoComplete="off" />
                            {searchQuery && <button className="st-search-clear" onClick={() => setSearchQuery('')}>×</button>}
                        </div>
                    </div>

                    {/* WhatsApp & Share Buttons */}
                    <div className="st-actions">
                        <button className="st-btn-wa" title='Share via WhatsApp' onClick={handleOpenWhatsAppModal} disabled={data.statement.length === 0 && data.itemwiseStatement.length === 0 || isGeneratingLink}>
                            {isGeneratingLink ? <span className="spinner-border spinner-border-sm me-1" /> : <><i className="bi bi-whatsapp me-1" /></>}
                        </button>
                        <button className="st-btn-share" title='Get Share Link' onClick={generatePermanentShareLink} disabled={!data.selectedCompany || emailLoading}>
                            <FiLink className="me-1" /> {emailLoading ? '...' : ''}
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="st-alert">
                        <i className="bi bi-exclamation-circle" />{error}
                        <button type="button" className="btn-close btn-sm ms-auto" onClick={() => setError(null)} />
                    </div>
                )}

                {/* Main Content */}
                <div className="st-main">
                    {data.statement.length === 0 && data.itemwiseStatement.length === 0 && !loading ? (
                        <div className="st-state">
                            <FiCalendar size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                            <h3>Select party & generate</h3>
                            <p>Choose an account and date range, then click Generate.</p>
                        </div>
                    ) : loading ? (
                        <div className="st-state"><div className="spinner-border text-primary" /><p>Loading statement...</p></div>
                    ) : viewMode === 'regular' ? (
                        filteredStatement.length === 0 ? (
                            <div className="st-state"><FiSearch size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} /><h3>No transactions found</h3><p>{searchQuery ? 'Try a different search term' : 'No data for the selected criteria'}</p></div>
                        ) : (
                            <>
                                <div className="st-main__bar">
                                    <span><strong>{filteredStatement.length}</strong> transactions</span>
                                    <span>{dateRange.fromDate} — {dateRange.toDate}</span>
                                </div>
                                <div className="st-table-wrap" ref={tableBodyRef}>
                                    <AutoSizer>
                                        {({ height, width }) => {
                                            const totalWidth = Object.values(columnWidths).reduce((a, b) => a + b, 0);
                                            return (
                                                <div style={{ position: 'relative', height: height, width: Math.max(width, totalWidth) }}>
                                                    <TableHeader />
                                                    <List height={height - 28} itemCount={filteredStatement.length} itemSize={28} width={Math.max(width, totalWidth)} itemData={{ statement: filteredStatement, selectedRowIndex, formatCurrency, formatBalance, handleRowClick, handleRowDoubleClick }}>{TableRow}</List>
                                                </div>
                                            );
                                        }}
                                    </AutoSizer>
                                </div>
                                <div className="st-footer">
                                    <div className="st-footer-cell" style={{ width: `${columnWidths.bsDate + columnWidths.adDate + columnWidths.voucherNo + columnWidths.voucherType + columnWidths.payMode + columnWidths.account}px`, flexShrink: 0 }}><strong>Totals:</strong></div>
                                    <div className="st-footer-cell st-cell--end" style={{ width: `${columnWidths.debit}px`, flexShrink: 0 }}><strong>{formatCurrency(data.totalDebit)}</strong></div>
                                    <div className="st-footer-cell st-cell--end" style={{ width: `${columnWidths.credit}px`, flexShrink: 0 }}><strong>{formatCurrency(data.totalCredit)}</strong></div>
                                    <div className="st-footer-cell st-cell--end" style={{ width: `${columnWidths.balance}px`, flexShrink: 0 }}><strong>{formatBalance(filteredStatement[filteredStatement.length - 1]?.balance || 0)}</strong></div>
                                </div>
                            </>
                        )
                    ) : (
                        // Itemwise View - Standard HTML table (not virtualized due to nested structure)
                        filteredItemwiseStatement.length === 0 ? (
                            <div className="st-state"><FiBox size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} /><h3>No items found</h3><p>No item transactions for the selected criteria</p></div>
                        ) : (
                            <>
                                <div className="st-main__bar">
                                    <span><strong>{filteredItemwiseStatement.length}</strong> bills</span>
                                    <span>{dateRange.fromDate} — {dateRange.toDate}</span>
                                </div>
                                <div className="st-table-wrap" style={{ overflow: 'auto' }}>
                                    <table className="st-table">
                                        <thead>
                                            <tr>
                                                <th>Miti</th><th>Date</th><th>Vch No.</th><th>Type</th><th>Pay Mode</th>
                                                <th>Item Name</th><th className="num">Qty</th><th>Unit</th><th className="num">Rate</th>
                                                <th className="num">Disc</th><th className="num">Taxable</th><th className="num">VAT</th><th className="num">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredItemwiseStatement.map((bill, bi) => (
                                                bill.items && bill.items.map((item, ii) => {
                                                    const isNepaliFormatLocal = company.dateFormat === 'nepali';
                                                    const bsDate = bill.nepaliDate || (isNepaliFormatLocal ? new NepaliDate(bill.nepaliDate).format('YYYY-MM-DD') : '');
                                                    const adDate = bill.date ? new Date(bill.date).toLocaleDateString() : '';
                                                    const qty = parseFloat(item.quantity) || 0;
                                                    const rate = item.puPrice || item.price || 0;
                                                    const disc = item.discountAmountPerItem || 0;
                                                    const taxable = item.taxableAmount || 0;
                                                    const vat = item.vatAmount || 0;
                                                    const total = item.totalAmount || (taxable + vat);
                                                    return (
                                                        <tr key={`${bill.billNumber}-${ii}`} className={((bi + ii) % 2 === 0) ? '' : 'st-row-alt'}>
                                                            <td>{bsDate}</td><td>{adDate}</td><td>{bill.billNumber || ''}</td><td>{bill.type || ''}</td><td>{bill.paymentMode || ''}</td>
                                                            <td style={{ whiteSpace: 'normal', wordWrap: 'break-word' }}>{item.item?.name || item.productName || 'N/A'}</td>
                                                            <td className="num">{qty.toFixed(2)}</td><td>{item.unit?.name || ''}</td><td className="num">{formatCurrency(rate)}</td>
                                                            <td className="num">{formatCurrency(disc)}</td><td className="num">{formatCurrency(taxable)}</td><td className="num">{formatCurrency(vat)}</td><td className="num">{formatCurrency(total)}</td>
                                                        </tr>
                                                    );
                                                })
                                            ))}
                                        </tbody>
                                        {(() => {
                                            let gQty = 0, gAmt = 0, gVat = 0, gTax = 0, gDisc = 0;
                                            filteredItemwiseStatement.forEach((bill) => {
                                                if (bill.items && bill.items.length > 0) bill.items.forEach((item) => {
                                                    gQty += parseFloat(item.quantity) || 0;
                                                    gDisc += item.discountAmountPerItem || 0;
                                                    gTax += item.taxableAmount || 0;
                                                    gVat += item.vatAmount || 0;
                                                    gAmt += item.totalAmount || ((item.taxableAmount || 0) + (item.vatAmount || 0));
                                                });
                                            });
                                            return (
                                                <tfoot>
                                                    <tr className="st-row-total">
                                                        <td colSpan="6" className="text-end"><strong>Grand Totals:</strong></td>
                                                        <td className="num"><strong>{gQty.toFixed(2)}</strong></td><td></td><td></td>
                                                        <td className="num"><strong>{formatCurrency(gDisc)}</strong></td>
                                                        <td className="num"><strong>{formatCurrency(gTax)}</strong></td>
                                                        <td className="num"><strong>{formatCurrency(gVat)}</strong></td>
                                                        <td className="num"><strong>{formatCurrency(gAmt)}</strong></td>
                                                    </tr>
                                                </tfoot>
                                            );
                                        })()}
                                    </table>
                                </div>
                            </>
                        )
                    )}
                </div>
            </div>

            {/* Account Selection Modal */}
            {/* {showAccountModal && (
                <div className="st-modal-overlay" onClick={() => setShowAccountModal(false)}>
                    <div className="st-modal st-modal--xl" onClick={e => e.stopPropagation()}>
                        <div className="st-modal-header">
                            <h5>Select Account</h5>
                            <small className="ms-auto text-muted" style={{ fontSize: '0.65rem' }}>{totalAccounts > 0 ? `${accounts.length} of ${totalAccounts}` : 'Loading…'}</small>
                            <button type="button" className="btn-close" onClick={() => { setShowAccountModal(false); setTimeout(() => document.getElementById(getFocusTargetOnModalClose())?.focus(), 50); }} />
                        </div>
                        <div className="st-modal-body">
                            <input type="text" id="searchAccount" className="st-search-input" placeholder="Search Account..." autoFocus autoComplete='off' value={accountSearchQuery} onChange={handleAccountSearch} onKeyDown={(e) => {
                                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); const first = document.querySelector('.account-item'); if (first) first.focus(); }
                                else if (e.key === 'Enter') { e.preventDefault(); const active = document.querySelector('.account-item.active'); if (active) { const account = accounts.find(a => a.id === active.getAttribute('data-account-id')); if (account) selectAccount(account); } else { setShowAccountModal(false); setTimeout(() => document.getElementById(getFocusTargetOnModalClose())?.focus(), 50); } }
                            }} ref={accountSearchRef} />
                            <div style={{ height: '300px', marginTop: '0.5rem' }}>
                                <VirtualizedAccountList accounts={accounts} onAccountClick={selectAccount} searchRef={accountSearchRef} hasMore={hasMoreAccountResults} isSearching={isAccountSearching} onLoadMore={loadMoreAccounts} totalAccounts={totalAccounts} page={accountSearchPage} searchQuery={accountShouldShowLastSearchResults ? accountLastSearchQuery : accountSearchQuery} />
                            </div>
                        </div>
                        <div className="st-modal-footer"><span>Showing {accounts.length} of {totalAccounts}</span><small className="text-muted">ESC to close</small></div>
                    </div>
                </div>
            )} */}

            {showAccountModal && (
                <AccountModalForPaymentReceipt
                    show={showAccountModal}
                    onClose={() => {
                        setShowAccountModal(false);
                        // Focus back to the account field after closing
                        setTimeout(() => {
                            const accountInput = document.getElementById('account');
                            if (accountInput) accountInput.focus();
                        }, 100);
                    }}
                    onSelectAccount={selectAccount}
                    accounts={accounts}
                    totalAccounts={totalAccounts}
                    isSearching={isAccountSearching}
                    hasMore={hasMoreAccountResults}
                    searchQuery={accountSearchQuery}
                    onSearch={(query) => {
                        // Handle search
                        setAccountSearchQuery(query);
                        setAccountSearchPage(1);

                        if (query.trim() !== '' && accountShouldShowLastSearchResults) {
                            setAccountShouldShowLastSearchResults(false);
                            setAccountLastSearchQuery('');
                        }

                        // Debounced search
                        const timer = setTimeout(() => {
                            fetchAccountsFromBackend(query, 1);
                        }, 300);
                        return () => clearTimeout(timer);
                    }}
                    onLoadMore={loadMoreAccounts}
                    page={accountSearchPage}
                    onCreateAccount={() => {
                        // Handle creating new account - you can implement this
                        setShowAccountModal(false);
                        // Optionally open account creation page in new tab or modal
                        window.open('/retailer/accounts', '_blank');
                        // Or navigate
                        // navigate('/retailer/accounts');
                    }}
                    selectedAccountId={selectedAccountId}
                />
            )}

            {/* WhatsApp Modal */}
            {showWhatsAppModal && (
                <div className="st-modal-overlay" onClick={() => { setShowWhatsAppModal(false); setWhatsAppNumber(''); setGeneratedShareLink(''); }}>
                    <div className="st-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
                        <div className="st-modal-header">
                            <h5><i className="bi bi-whatsapp text-success me-2" />Share via WhatsApp</h5>
                            <button type="button" className="btn-close" onClick={() => { setShowWhatsAppModal(false); setWhatsAppNumber(''); setGeneratedShareLink(''); }} />
                        </div>
                        <div className="st-modal-body">
                            {data.selectedAccountName && <div className="st-info-box"><strong>Account:</strong> {data.selectedAccountName}{data.selectedAccountPhone && <span className="ms-2 text-muted"><i className="bi bi-phone me-1" />{data.selectedAccountPhone}</span>}</div>}
                            {generatedShareLink && (
                                <div className="st-link-box">
                                    <div className="d-flex align-items-center mb-2"><i className="bi bi-link-45deg text-success fs-5 me-2" /><strong className="text-success">Permanent Link Generated</strong></div>
                                    <div className="st-link-code"><code>{generatedShareLink}</code></div>
                                    <small className="text-muted d-block mt-1"><i className="bi bi-info-circle me-1" />This link will always show the latest statement.</small>
                                </div>
                            )}
                            <div className="mb-3"><label className="form-label fw-bold">WhatsApp Number <span className="text-danger">*</span></label>
                                <div className="input-group"><span className="input-group-text"><i className="bi bi-plus-circle" /></span><input type="text" className="form-control" placeholder="e.g., 9779812345678" value={whatsAppNumber} onChange={(e) => setWhatsAppNumber(e.target.value.replace(/[^0-9]/g, ''))} autoFocus onKeyDown={(e) => { if (e.key === 'Enter') handleSendWhatsApp(); }} /></div>
                                <small className="text-muted"><i className="bi bi-info-circle me-1" />Enter number without + sign (e.g., 9779812345678)</small>
                            </div>
                            <div><label className="form-label fw-bold">Message Preview</label><div className="st-msg-preview">{whatsAppMessage || 'Generating message...'}</div></div>
                        </div>
                        <div className="st-modal-footer">
                            <button className="st-btn-secondary" onClick={() => { setShowWhatsAppModal(false); setWhatsAppNumber(''); setGeneratedShareLink(''); }} disabled={isGeneratingLink}>Cancel</button>
                            <button className="st-btn-wa st-btn-wa--solid" onClick={handleSendWhatsApp} disabled={!whatsAppNumber || whatsAppNumber.length < 10 || isGeneratingLink || !generatedShareLink}><i className="bi bi-whatsapp me-1" />Send Link</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cash Settlement Modal */}
            <CashSettlementModal show={showCashSettlementModal} onClose={() => { setShowCashSettlementModal(false); setSelectedTransaction(null); }} transaction={selectedTransaction} onSettle={handleCashSettlement} formatCurrency={formatCurrency} />

            {showProductModal && <ProductModal onClose={() => setShowProductModal(false)} />}
            <NotificationToast show={notification.show} message={notification.message} type={notification.type} duration={notification.duration} onClose={() => setNotification({ ...notification, show: false })} />
        </div>
    );
};

export default Statement;