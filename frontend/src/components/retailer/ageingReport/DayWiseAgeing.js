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

const DayWiseAgeing = () => {
    const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
    const currentEnglishDate = new Date().toISOString().split('T')[0];

    const { draftSave, setDraftSave } = usePageNotRefreshContext();
    const [showProductModal, setShowProductModal] = useState(false);

    const [company, setCompany] = useState({
        dateFormat: 'english',
        isVatExempt: false,
        vatEnabled: true,
        fiscalYear: {}
    });

    // Date range state with both BS and AD dates
    const [dateRange, setDateRange] = useState(() => {
        if (draftSave?.dayWiseAgeingData) {
            return {
                asOnDate: draftSave.dayWiseAgeingData.asOnDate || '',
                asOnDateAd: draftSave.dayWiseAgeingData.asOnDateAd || ''
            };
        }
        return {
            asOnDate: '',
            asOnDateAd: ''
        };
    });

    const [data, setData] = useState(() => {
        if (draftSave?.dayWiseAgeingData) {
            return {
                account: draftSave.dayWiseAgeingData.account || null,
                agingData: draftSave.dayWiseAgeingData.agingData || {
                    totalOutstanding: 0,
                    agingBreakdown: {},
                    transactions: [],
                    summary: {}
                },
                accounts: draftSave.dayWiseAgeingData.accounts || [],
                company: draftSave.dayWiseAgeingData.company || null,
                currentFiscalYear: draftSave.dayWiseAgeingData.currentFiscalYear || null,
                currentCompanyName: draftSave.dayWiseAgeingData.currentCompanyName || '',
                asOnDate: draftSave.dayWiseAgeingData.asOnDate || '',
                hasDateFilter: draftSave.dayWiseAgeingData.hasDateFilter || false
            };
        }
        return {
            account: null,
            agingData: {
                totalOutstanding: 0,
                agingBreakdown: {},
                transactions: [],
                summary: {}
            },
            accounts: [],
            company: null,
            currentFiscalYear: null,
            currentCompanyName: '',
            asOnDate: '',
            hasDateFilter: false
        };
    });

    const [selectedAccount, setSelectedAccount] = useState(() => {
        if (draftSave?.dayWiseAgeingData?.account) {
            return draftSave.dayWiseAgeingData.account;
        }
        return null;
    });

    const [dateError, setDateError] = useState('');
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [error, setError] = useState(null);
    const [hasGenerated, setHasGenerated] = useState(false);
    const [selectedRowIndex, setSelectedRowIndex] = useState(0);
    const [showTotals, setShowTotals] = useState(() => {
        if (draftSave?.dayWiseAgeingSearch) {
            return draftSave.dayWiseAgeingSearch.showTotals !== undefined ? draftSave.dayWiseAgeingSearch.showTotals : true;
        }
        return true;
    });
    const [exporting, setExporting] = useState(false);
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

    const [notification, setNotification] = useState({
        show: false,
        message: '',
        type: 'success',
        duration: 3000
    });

    const navigate = useNavigate();
    const asOnDateRef = useRef(null);
    const asOnDateAdRef = useRef(null);
    const generateBtnRef = useRef(null);
    const tableBodyRef = useRef(null);
    const abortControllerRef = useRef(null);

    // API instance with JWT token
    const api = useMemo(() => {
        const instance = axios.create({
            baseURL: process.env.REACT_APP_API_BASE_URL,
            withCredentials: true,
        });
        instance.interceptors.request.use(
            (config) => {
                const token = localStorage.getItem('token');
                if (token) config.headers.Authorization = `Bearer ${token}`;
                return config;
            },
            (error) => Promise.reject(error)
        );
        return instance;
    }, []);

    // Helper function to check if date format is Nepali
    const isNepaliDateFormat = useCallback(() => {
        return company.dateFormat && company.dateFormat.toLowerCase() === 'nepali';
    }, [company.dateFormat]);

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

    // Function to fetch accounts from backend with search and pagination
    const fetchAccountsFromBackend = async (searchTerm = '', page = 1) => {
        try {
            setIsAccountSearching(true);
            const response = await api.get('/api/retailer/accounts/search', {
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
        return isNepaliDateFormat() ? 'asOnDate' : 'asOnDate';
    };

    // Fetch company info on mount
    useEffect(() => {
        const fetchCompanyInfo = async () => {
            try {
                setInitialLoading(true);
                const response = await api.get('/api/retailer/day-count-aging');
                if (response.data.success) {
                    const responseData = response.data.data;
                    const dateFormat = responseData.company?.dateFormat?.toLowerCase() || 'english';
                    const isNepaliFormat = dateFormat === 'nepali';

                    setCompany({
                        dateFormat: dateFormat,
                        vatEnabled: responseData.company?.vatEnabled !== false,
                        fiscalYear: responseData.currentFiscalYear || {},
                        isVatExempt: responseData.company?.isVatExempt || false
                    });

                    const hasDraftDates = draftSave?.dayWiseAgeingData?.asOnDate;

                    if (!hasDraftDates) {
                        let asOnDateFormatted = '';
                        let asOnDateAd = '';

                        if (isNepaliFormat) {
                            asOnDateFormatted = currentNepaliDate;
                            asOnDateAd = convertBsToAd(currentNepaliDate);
                        } else {
                            asOnDateFormatted = currentEnglishDate;
                            asOnDateAd = currentEnglishDate;
                        }

                        setDateRange({
                            asOnDate: asOnDateFormatted,
                            asOnDateAd: asOnDateAd
                        });
                    } else if (draftSave?.dayWiseAgeingData) {
                        setSelectedAccount(draftSave.dayWiseAgeingData.account);
                        setData(prev => ({
                            ...prev,
                            account: draftSave.dayWiseAgeingData.account,
                            agingData: draftSave.dayWiseAgeingData.agingData,
                            company: draftSave.dayWiseAgeingData.company,
                            currentFiscalYear: draftSave.dayWiseAgeingData.currentFiscalYear,
                            currentCompanyName: draftSave.dayWiseAgeingData.currentCompanyName
                        }));
                        setHasGenerated(true);

                        let asOnDateAd = dateRange.asOnDate;
                        if (isNepaliFormat && dateRange.asOnDate) {
                            asOnDateAd = convertBsToAd(dateRange.asOnDate);
                        }
                        setDateRange(prev => ({
                            ...prev,
                            asOnDateAd: asOnDateAd || prev.asOnDateAd
                        }));
                    }

                    setData(prev => ({
                        ...prev,
                        accounts: responseData.accounts || [],
                        company: responseData.company,
                        currentFiscalYear: responseData.currentFiscalYear,
                        currentCompanyName: responseData.currentCompanyName
                    }));
                }
            } catch (err) {
                console.error('Error fetching company info:', err);
                setDateRange({
                    asOnDate: currentEnglishDate,
                    asOnDateAd: currentEnglishDate
                });
            } finally {
                setInitialLoading(false);
            }
        };
        fetchCompanyInfo();
    }, []);

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

    const fetchAgeingData = useCallback(async () => {
        if (!selectedAccount) {
            setNotification({ show: true, message: 'Please select an account first', type: 'warning', duration: 3000 });
            return;
        }

        if (!dateRange.asOnDate) {
            setDateError('Please enter a date');
            asOnDateRef.current?.focus();
            return;
        }

        if (isNepaliDateFormat() && !isValidNepaliDate(dateRange.asOnDate)) {
            setDateError('Invalid date format');
            asOnDateRef.current?.focus();
            return;
        }

        if (abortControllerRef.current) abortControllerRef.current.abort();
        abortControllerRef.current = new AbortController();

        try {
            setLoading(true);
            setError(null);
            // Use AD date for API call
            const asOnDateParam = dateRange.asOnDateAd || dateRange.asOnDate;
            const url = `/api/retailer/day-count-aging?accountId=${selectedAccount.id}&asOnDate=${encodeURIComponent(asOnDateParam)}`;
            const response = await api.get(url, { signal: abortControllerRef.current.signal });

            if (response.data.success) {
                console.log('API Response received');
                console.log('Transactions count:', response.data.data.agingData?.transactions?.length);
                setData(response.data.data);
                setHasGenerated(true);
                setSelectedRowIndex(0);

                if (response.data.data.agingData?.transactions?.length === 0) {
                    setNotification({ show: true, message: 'No transactions found for this account and date', type: 'warning', duration: 3000 });
                } else {
                    setNotification({ show: true, message: 'Report generated successfully!', type: 'success', duration: 3000 });
                }
            }
        } catch (err) {
            if (err.name !== 'AbortError' && err.name !== 'CanceledError') {
                const errorMsg = err.response?.data?.error || 'Failed to load ageing report';
                setError(errorMsg);
                setNotification({ show: true, message: errorMsg, type: 'error', duration: 3000 });
            }
        } finally {
            setLoading(false);
        }
    }, [api, selectedAccount, dateRange.asOnDate, dateRange.asOnDateAd, isNepaliDateFormat]);

    const handleGenerateReport = () => {
        if (!selectedAccount) {
            setNotification({ show: true, message: 'Please select an account first', type: 'warning', duration: 3000 });
            return;
        }
        if (!dateRange.asOnDate) {
            setDateError('Please enter a date');
            asOnDateRef.current?.focus();
            return;
        }
        if (isNepaliDateFormat() && !isValidNepaliDate(dateRange.asOnDate)) {
            setDateError('Invalid date format');
            asOnDateRef.current?.focus();
            return;
        }
        fetchAgeingData();
    };

    // Handle BS date change
    const handleAsOnDateChange = (e) => {
        const value = e.target.value;
        const sanitizedValue = value.replace(/[^0-9/-]/g, '').slice(0, 10);
        const adDate = convertBsToAd(sanitizedValue);
        setDateRange({
            asOnDate: sanitizedValue,
            asOnDateAd: adDate || dateRange.asOnDateAd
        });
        setDateError('');
    };

    // Handle AD date change
    const handleAsOnDateAdChange = (e) => {
        const value = e.target.value;
        const bsDate = convertAdToBs(value);
        setDateRange({
            asOnDate: bsDate || dateRange.asOnDate,
            asOnDateAd: value
        });
        setDateError('');
    };

    // Handle BS date blur for validation
    const handleAsOnDateBlur = () => {
        const dateStr = dateRange.asOnDate?.trim();
        if (!dateStr) return;
        if (isNepaliDateFormat()) {
            const correctedDate = validateAndCorrectNepaliDate(dateStr);
            if (!correctedDate) {
                const fallbackDate = currentNepaliDate;
                const adDate = convertBsToAd(fallbackDate);
                setDateRange({ asOnDate: fallbackDate, asOnDateAd: adDate });
                setNotification({ show: true, message: 'Invalid Nepali date. Auto-corrected to current date.', type: 'warning', duration: 3000 });
            } else if (correctedDate !== dateStr) {
                const adDate = convertBsToAd(correctedDate);
                setDateRange({ asOnDate: correctedDate, asOnDateAd: adDate });
                setNotification({ show: true, message: 'Date auto-corrected to valid Nepali date.', type: 'warning', duration: 3000 });
            }
        }
    };

    const selectAccount = (account) => {
        setSelectedAccount(account);
        setShowAccountModal(false);
        setAccountSearchQuery('');
        setDateError('');

        // Focus on asOnDate input after modal closes
        setTimeout(() => {
            if (asOnDateRef.current) {
                asOnDateRef.current.focus();
            }
        }, 100);
    };

    const formatCurrency = useCallback((num) => {
        if (num === undefined || num === null) return '0.00';
        const number = Math.abs(typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num));
        if (isNaN(number)) return '0.00';
        return number.toLocaleString(isNepaliDateFormat() ? 'en-IN' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }, [isNepaliDateFormat]);

    const getTransactionDate = useCallback((transaction) => {
        if (!transaction) return '';

        // For Date column (AD date) - always show the AD date from backend
        if (transaction.date) {
            try {
                // Format as YYYY-MM-DD for consistency
                return new Date(transaction.date).toLocaleDateString();
            } catch (e) {
                return transaction.date;
            }
        }
        return '';
    }, []);

    // Add a new function for getting Nepali date (Miti)
    const getNepaliDate = useCallback((transaction) => {
        if (!transaction) return '';

        // For Miti column - show the Nepali date from backend
        if (transaction.nepaliDate) {
            return transaction.nepaliDate;
        }
        return '';
    }, []);

    const formatBalance = (balance) => {
        const formattedBalance = formatCurrency(Math.abs(balance));
        return balance >= 0 ? `${formattedBalance} Dr` : `${formattedBalance} Cr`;
    };

    const getTransactionTypeLabel = (type) => {
        const labels = {
            sales: 'Sale',
            purchase: 'Purchase',
            purchase_return: 'Purchase Return',
            sales_return: 'Sales Return',
            payment: 'Payment',
            receipt: 'Receipt',
            debit_note: 'Debit Note',
            credit_note: 'Credit Note',
            journal: 'Journal'
        };
        return labels[type] || 'Transaction';
    };

    const getTransactionIcon = (type) => {
        const icons = {
            sales: 'fas fa-file-invoice-dollar text-primary',
            purchase: 'fas fa-shopping-cart text-info',
            purchase_return: 'fas fa-undo text-warning',
            sales_return: 'fas fa-exchange-alt text-danger',
            payment: 'fas fa-money-bill-wave text-success',
            receipt: 'fas fa-hand-holding-usd text-success',
            debit_note: 'fas fa-file-alt text-danger',
            credit_note: 'fas fa-file-alt text-success',
            journal: 'fas fa-book text-secondary'
        };
        return icons[type] || 'fas fa-file-alt text-secondary';
    };

    const getAgingSummary = () => {
        if (!data?.agingData?.transactions) return [];
        const transactions = data.agingData.transactions;
        return [
            { range: '0-30 days', count: transactions.filter(t => t.age <= 30).length, variant: 'primary' },
            { range: '31-60 days', count: transactions.filter(t => t.age > 30 && t.age <= 60).length, variant: 'info' },
            { range: '61-90 days', count: transactions.filter(t => t.age > 60 && t.age <= 90).length, variant: 'warning' },
            { range: '90+ days', count: transactions.filter(t => t.age > 90).length, variant: 'danger' }
        ];
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
                handleGenerateReport();
            }
        }
    };

    const exportToExcel = async () => {
        if (!hasGenerated) {
            setNotification({ show: true, message: 'Please generate the report first', type: 'warning', duration: 3000 });
            return;
        }

        setExporting(true);
        try {
            const excelData = [];

            excelData.push(['Company Name:', data.currentCompanyName || 'N/A']);
            excelData.push(['Report Type:', 'Day Wise Ageing Report']);
            excelData.push(['Account:', selectedAccount?.name || data.account?.name || 'N/A']);
            excelData.push(['As on Date (BS):', dateRange.asOnDate]);
            excelData.push(['Export Date:', new Date().toLocaleString()]);
            excelData.push([]);

            const openingBalance = data.account?.openingBalance || 0;
            const openingBalanceType = data.account?.openingBalanceType || 'Dr';
            excelData.push(['Opening:', `${formatCurrency(Math.abs(openingBalance))} ${openingBalanceType}`]);
            excelData.push([]);

            excelData.push(['Date', 'Age (Days)', 'Voucher No.', 'Particulars', 'Debit Amount', 'Credit Amount', 'Balance']);

            if (data.agingData.transactions && data.agingData.transactions.length > 0) {
                data.agingData.transactions.forEach(transaction => {
                    excelData.push([
                        getTransactionDate(transaction),
                        `${transaction.age} days`,
                        transaction.referenceNumber,
                        getTransactionTypeLabel(transaction.type),
                        formatCurrency(transaction.debit),
                        formatCurrency(transaction.credit),
                        formatBalance(transaction.balance)
                    ]);
                });
            } else {
                excelData.push(['No transactions found', '', '', '', '', '', '']);
            }

            const ws = XLSX.utils.aoa_to_sheet(excelData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Day Wise Ageing');
            XLSX.writeFile(wb, `Day_Wise_Ageing_${selectedAccount?.name || 'Report'}_${dateRange.asOnDate}.xlsx`);

            setNotification({ show: true, message: 'Excel file exported successfully!', type: 'success', duration: 3000 });
        } catch (err) {
            setNotification({ show: true, message: 'Failed to export data', type: 'error', duration: 3000 });
        } finally {
            setExporting(false);
        }
    };

    // const printReport = () => {
    //     if (!hasGenerated) {
    //         setNotification({ show: true, message: 'Please generate the report first', type: 'warning', duration: 3000 });
    //         return;
    //     }

    //     const printWindow = window.open('', '_blank');
    //     const printContent = `
    //         <!DOCTYPE html>
    //         <html>
    //         <head>
    //             <title>Day Wise Ageing Report</title>
    //             <style>
    //                 @page { margin: 10mm; }
    //                 body { font-family: Arial; font-size: 10px; margin: 0; padding: 5mm; }
    //                 .print-header { text-align: center; margin-bottom: 20px; }
    //                 table { width: 100%; border-collapse: collapse; font-size: 12px; }
    //                 th, td { border: 1px solid #000; padding: 4px; text-align: left; }
    //                 th { background: #f2f2f2; }
    //                 .text-end { text-align: right; }
    //             </style>
    //         </head>
    //         <body>
    //             <div class="print-header">
    //                 <h1>${data.currentCompanyName || 'Company Name'}</h1>
    //                 <h2>Day Wise Ageing Report</h2>
    //                 <p><strong>Account:</strong> ${selectedAccount?.name || data.account?.name || 'N/A'}</p>
    //                 <p><strong>As on Date (BS):</strong> ${dateRange.asOnDate}</p>
    //                 <p><strong>Opening:</strong> ${formatCurrency(Math.abs(data.account?.openingBalance || 0))} ${data.account?.openingBalanceType || 'Dr'}</p>
    //                 <hr>
    //             </div>
    //             <table>
    //                 <thead>
    //                     <tr><th>Date</th><th>Age</th><th>Vch No.</th><th>Particulars</th><th class="text-end">Debit</th><th class="text-end">Credit</th><th class="text-end">Balance</th></tr>
    //                 </thead>
    //                 <tbody>
    //                     ${data.agingData.transactions && data.agingData.transactions.length > 0 ?
    //             data.agingData.transactions.map(transaction => `
    //                             <tr>
    //                                 <td>${getTransactionDate(transaction)}</td>
    //                                 <td>${transaction.age} days</td>
    //                                 <td>${transaction.referenceNumber}</td>
    //                                 <td>${getTransactionTypeLabel(transaction.type)}</td>
    //                                 <td class="text-end">${formatCurrency(transaction.debit)}</td>
    //                                 <td class="text-end">${formatCurrency(transaction.credit)}</td>
    //                                 <td class="text-end">${formatBalance(transaction.balance)}</td>
    //                             </tr>
    //                         `).join('') :
    //             '<tr><td colspan="7" class="text-center">No transactions found</td></tr>'
    //         }
    //                 </tbody>
    //             </table>
    //             <script>window.onload=function(){window.print();window.onafterprint=function(){window.close()}}<\/script>
    //         </body>
    //         </html>
    //     `;
    //     printWindow.document.write(printContent);
    //     printWindow.document.close();
    // };

    // Save to draft

    //     const printReport = () => {
    //     if (!hasGenerated) {
    //         setNotification({ show: true, message: 'Please generate the report first', type: 'warning', duration: 3000 });
    //         return;
    //     }

    //     const printWindow = window.open('', '_blank');
    //     const printContent = `
    //         <!DOCTYPE html>
    //         <html>
    //         <head>
    //             <title>Day Wise Ageing Report</title>
    //             <style>
    //                 @page { margin: 10mm; }
    //                 body { 
    //                     font-family: Arial, sans-serif; 
    //                     font-size: 12px; 
    //                     margin: 0; 
    //                     padding: 5mm;
    //                 }
    //                 .print-header { 
    //                     text-align: center; 
    //                     margin-bottom: 15px; 
    //                 }
    //                 .print-header h1 {
    //                     font-size: 18px;
    //                     margin: 0;
    //                 }
    //                 .print-header h2 {
    //                     font-size: 14px;
    //                     margin: 5px 0;
    //                 }
    //                 .info-row {
    //                     display: flex;
    //                     justify-content: space-between;
    //                     align-items: center;
    //                     margin: 10px 0;
    //                     padding: 8px 0;
    //                     border-top: 1px solid #ddd;
    //                     border-bottom: 1px solid #ddd;
    //                     font-size: 12px;
    //                 }
    //                 .info-item {
    //                     flex: 1;
    //                     text-align: center;
    //                 }
    //                 .info-item strong {
    //                     font-weight: bold;
    //                 }
    //                 table { 
    //                     width: 100%; 
    //                     border-collapse: collapse; 
    //                     font-size: 11px;
    //                     margin-top: 10px;
    //                 }
    //                 th, td { 
    //                     border: 1px solid #000; 
    //                     padding: 6px; 
    //                     text-align: left; 
    //                 }
    //                 th { 
    //                     background: #f2f2f2; 
    //                     font-weight: bold;
    //                 }
    //                 .text-end { 
    //                     text-align: right; 
    //                 }
    //                 .text-center {
    //                     text-align: center;
    //                 }
    //                 .fw-bold {
    //                     font-weight: bold;
    //                 }
    //                 .print-footer {
    //                     margin-top: 20px;
    //                     text-align: right;
    //                     font-size: 10px;
    //                     border-top: 1px solid #ddd;
    //                     padding-top: 8px;
    //                 }
    //             </style>
    //         </head>
    //         <body>
    //             <div class="print-header">
    //                 <h1>${data.currentCompanyName || 'Company Name'}</h1>
    //                 <h2>Day Wise Ageing Report</h2>
    //             </div>

    //             <div class="info-row">
    //                 <div class="info-item">
    //                     <strong>Account:</strong> ${selectedAccount?.name || data.account?.name || 'N/A'}
    //                 </div>
    //                 <div class="info-item">
    //                     <strong>As on Date (BS):</strong> ${dateRange.asOnDate}
    //                 </div>
    //                 <div class="info-item">
    //                     <strong>Opening:</strong> ${formatCurrency(Math.abs(data.account?.openingBalance || 0))} ${data.account?.openingBalanceType || 'Dr'}
    //                 </div>
    //             </div>

    //             <table>
    //                 <thead>
    //                     <tr>
    //                         <th>Miti (BS)</th>
    //                         <th>Date (AD)</th>
    //                         <th>Age (Days)</th>
    //                         <th>Vch. No.</th>
    //                         <th>Particulars</th>
    //                         <th class="text-end">Debit</th>
    //                         <th class="text-end">Credit</th>
    //                         <th class="text-end">Balance</th>
    //                     </tr>
    //                 </thead>
    //                 <tbody>
    //                     ${data.agingData.transactions && data.agingData.transactions.length > 0 ?
    //                         data.agingData.transactions.map(transaction => `
    //                             <tr>
    //                                 <td class="text-center">${transaction.nepaliDate || '-'}</td>
    //                                 <td class="text-center">${transaction.date || '-'}</td>
    //                                 <td class="text-center">${transaction.age} days</td>
    //                                 <td>${transaction.referenceNumber || '-'}</td>
    //                                 <td>${getTransactionTypeLabel(transaction.type)}</td>
    //                                 <td class="text-end">${formatCurrency(transaction.debit)}</td>
    //                                 <td class="text-end">${formatCurrency(transaction.credit)}</td>
    //                                 <td class="text-end fw-bold">${formatBalance(transaction.balance)}</td>
    //                             </tr>
    //                         `).join('') :
    //                         '<tr><td colspan="8" class="text-center">No transactions found</td></tr>'
    //                     }
    //                 </tbody>
    //                 ${showTotals && data.agingData.transactions.length > 0 ? `
    //                 <tfoot>
    //                     <tr class="fw-bold">
    //                         <td colspan="5" class="text-end">Totals</td>
    //                         <td class="text-end">${formatCurrency(data.agingData.transactions.reduce((sum, t) => sum + (t.debit || 0), 0))}</td>
    //                         <td class="text-end">${formatCurrency(data.agingData.transactions.reduce((sum, t) => sum + (t.credit || 0), 0))}</td>
    //                         <td class="text-end">${formatBalance(data.agingData.transactions[data.agingData.transactions.length - 1]?.balance || 0)}</td>
    //                     </tr>
    //                 </tfoot>
    //                 ` : ''}
    //             </table>

    //             <div class="print-footer">
    //                 Printed from ${data.currentCompanyName || 'Company Name'} | ${new Date().toLocaleString()}
    //             </div>

    //             <script>
    //                 window.onload = function() {
    //                     window.print();
    //                     window.onafterprint = function() {
    //                         window.close();
    //                     };
    //                 };
    //             <\/script>
    //         </body>
    //         </html>
    //     `;
    //     printWindow.document.write(printContent);
    //     printWindow.document.close();
    // };

    const printReport = () => {
        if (!hasGenerated) {
            setNotification({ show: true, message: 'Please generate the report first', type: 'warning', duration: 3000 });
            return;
        }

        const printWindow = window.open('', '_blank');

        // Calculate totals
        let totalDebit = 0;
        let totalCredit = 0;
        let closingBalance = 0;

        if (data.agingData.transactions && data.agingData.transactions.length > 0) {
            data.agingData.transactions.forEach(transaction => {
                totalDebit += transaction.debit || 0;
                totalCredit += transaction.credit || 0;
                closingBalance = transaction.balance;
            });
        }

        const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Day Wise Ageing Report</title>
            <meta charset="UTF-8">
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
                    font-size: 11px;
                    font-weight: bold;
                    margin: 3px 0;
                }
                .info-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin: 5px 0;
                    padding: 2px 0;
                    font-size: 8px;
                    border-top: 1px solid #000;
                    border-bottom: 1px solid #000;
                }
                .info-item {
                    flex: 1;
                    text-align: center;
                }
                .info-item strong {
                    font-weight: bold;
                }
                .text-end {
                    text-align: right;
                }
                .text-center {
                    text-align: center;
                }
                .fw-bold {
                    font-weight: bold;
                }
                .grand-total-row td {
                    font-weight: bold;
                    border-top: 2px solid #000;
                    font-size: 7px;
                }
                .print-footer {
                    margin-top: 5px;
                    text-align: right;
                    font-size: 7px;
                }
            </style>
        </head>
        <body>
            <div class="print-header">
                <h1>${data.currentCompanyName || 'Company Name'}</h1>
                <p style="font-size: 8px; margin: 2px 0;">
                    ${data.company?.address || ''}${data.company?.city ? ', ' + data.company.city : ''},
                    PAN: ${data.company?.pan || ''}<br>
                </p>
                <hr style="margin: 2px 0;">
            </div>
            
            <div class="report-title">Day Wise Ageing Report</div>
            
            <div class="info-row">
                <div class="info-item">
                    <strong>Account:</strong> ${selectedAccount?.name || data.account?.name || 'N/A'}
                </div>
                <div class="info-item">
                    <strong>As on Date (BS):</strong> ${dateRange.asOnDate}
                </div>
                <div class="info-item">
                    <strong>Opening:</strong> ${formatCurrency(Math.abs(data.account?.openingBalance || 0))} ${data.account?.openingBalanceType || 'Dr'}
                </div>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th class="nowrap">Miti</th>
                        <th class="nowrap">Date</th>
                        <th class="nowrap">Age (Days)</th>
                        <th class="nowrap">Vch. No.</th>
                        <th class="nowrap">Particulars</th>
                        <th class="nowrap text-end">Debit</th>
                        <th class="nowrap text-end">Credit</th>
                        <th class="nowrap text-end">Balance</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.agingData.transactions && data.agingData.transactions.length > 0 ?
                data.agingData.transactions.map(transaction => `
                            <tr>
                                <td class="nowrap text-center">${transaction.nepaliDate || '-'}</td>
                                <td class="nowrap text-center">${new Date(transaction.date || '-').toLocaleDateString()}</td>
                                <td class="nowrap text-center">${transaction.age} days</td>
                                <td class="nowrap">${transaction.referenceNumber || '-'}</td>
                                <td class="nowrap">${getTransactionTypeLabel(transaction.type)}</td>
                                <td class="nowrap text-end">${formatCurrency(transaction.debit)}</td>
                                <td class="nowrap text-end">${formatCurrency(transaction.credit)}</td>
                                <td class="nowrap text-end fw-bold">${formatBalance(transaction.balance)}</td>
                            </tr>
                        `).join('') :
                '<tr><td colspan="8" class="text-center">No transactions found</td></tr>'
            }
                </tbody>
                ${showTotals && data.agingData.transactions.length > 0 ? `
                <tfoot>
                    <tr class="grand-total-row">
                        <td colspan="5" class="text-end fw-bold">Totals</td>
                        <td class="text-end fw-bold">${formatCurrency(totalDebit)}</td>
                        <td class="text-end fw-bold">${formatCurrency(totalCredit)}</td>
                        <td class="text-end fw-bold">${formatBalance(closingBalance)}</td>
                    </tr>
                </tfoot>
                ` : ''}
            
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
    `;

        printWindow.document.write(printContent);
        printWindow.document.close();
    };

    useEffect(() => {
        if (hasGenerated) {
            setDraftSave({
                ...draftSave,
                dayWiseAgeingData: {
                    ...data,
                    account: selectedAccount,
                    asOnDate: dateRange.asOnDate,
                    asOnDateAd: dateRange.asOnDateAd
                },
                dayWiseAgeingSearch: {
                    showTotals,
                    selectedRowIndex
                }
            });
        }
    }, [data, selectedAccount, dateRange.asOnDate, dateRange.asOnDateAd, showTotals, selectedRowIndex, hasGenerated]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!data?.agingData?.transactions?.length) return;
            const activeElement = document.activeElement;
            if (['INPUT', 'SELECT', 'TEXTAREA'].includes(activeElement.tagName)) return;

            switch (e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    setSelectedRowIndex(prev => Math.max(0, prev - 1));
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    setSelectedRowIndex(prev => Math.min(data.agingData.transactions.length - 1, prev + 1));
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [data?.agingData?.transactions]);

    useEffect(() => {
        if (tableBodyRef.current && data?.agingData?.transactions?.length > 0) {
            const rows = tableBodyRef.current.querySelectorAll('tr');
            if (rows.length > selectedRowIndex) {
                rows[selectedRowIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    }, [selectedRowIndex, data?.agingData?.transactions]);

    const handleRowClick = (index) => {
        setSelectedRowIndex(index);
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

    if (initialLoading) return <Loader />;

    return (
        <div className="container-fluid">
            <Header />
            <div className="card mt-2 shadow-lg p-0 animate__animated animate__fadeInUp expanded-card ledger-card compact">
                <div className="card-header bg-white py-0">
                    <h1 className="h4 mb-0 text-center text-primary">Day Wise Ageing Report</h1>
                </div>

                <div className="card-body p-2 p-md-3">
                    <div className="row g-2 mb-3">
                        {/* Account Selection */}
                        <div className="col-12" style={{ flex: '0 0 auto', width: '20%' }}>
                            <div className="position-relative">
                                <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    value={selectedAccount ? selectedAccount.name : ''}
                                    onClick={() => setShowAccountModal(true)}
                                    onFocus={() => setShowAccountModal(true)}
                                    readOnly
                                    placeholder="Select Account"
                                    autoComplete="off"
                                    style={{ height: '26px', fontSize: '0.875rem', paddingTop: '0.75rem', width: '100%' }}
                                />
                                <label className="position-absolute" style={{ top: '-0.5rem', left: '0.75rem', fontSize: '0.75rem', backgroundColor: 'white', padding: '0 0.25rem', color: '#6c757d', fontWeight: '500' }}>
                                    Account: <span className="text-danger">*</span>
                                </label>
                            </div>
                        </div>

                        {/* As on Date BS Field */}
                        <div className="col-12" style={{ flex: '0 0 auto', width: '15%' }}>
                            <div className="position-relative">
                                <input
                                    type="text"
                                    id="asOnDate"
                                    name="asOnDate"
                                    ref={asOnDateRef}
                                    className={`form-control form-control-sm no-date-icon ${dateError ? 'is-invalid' : ''}`}
                                    value={dateRange.asOnDate}
                                    onChange={handleAsOnDateChange}
                                    onBlur={handleAsOnDateBlur}
                                    onKeyDown={(e) => handleKeyDown(e, 'asOnDateAd')}
                                    placeholder="YYYY-MM-DD (BS)"
                                    autoComplete="off"
                                    style={{ height: '26px', fontSize: '0.875rem', paddingTop: '0.75rem', width: '100%' }}
                                />
                                <label className="position-absolute" style={{ top: '-0.5rem', left: '0.75rem', fontSize: '0.75rem', backgroundColor: 'white', padding: '0 0.25rem', color: '#6c757d', fontWeight: '500' }}>
                                    As on (BS): <span className="text-danger">*</span>
                                </label>
                                {dateError && <div className="invalid-feedback d-block" style={{ fontSize: '0.7rem' }}>{dateError}</div>}
                            </div>
                        </div>

                        {/* As on Date AD Field */}
                        <div className="col-12" style={{ flex: '0 0 auto', width: '15%' }}>
                            <div className="position-relative">
                                <input
                                    type="date"
                                    id="asOnDateAd"
                                    name="asOnDateAd"
                                    ref={asOnDateAdRef}
                                    className="form-control form-control-sm"
                                    value={dateRange.asOnDateAd || ''}
                                    onChange={handleAsOnDateAdChange}
                                    onKeyDown={(e) => handleKeyDown(e, 'generateReport')}
                                    style={{ height: '26px', fontSize: '0.875rem', paddingTop: '0.75rem', width: '100%' }}
                                />
                                <label className="position-absolute" style={{ top: '-0.5rem', left: '0.75rem', fontSize: '0.75rem', backgroundColor: 'white', padding: '0 0.25rem', color: '#6c757d', fontWeight: '500' }}>
                                    As on (AD):
                                </label>
                            </div>
                        </div>

                        {/* Generate Report Button */}
                        <div className="col-12 col-md-1">
                            <button
                                type="button"
                                id="generateReport"
                                ref={generateBtnRef}
                                className="btn btn-primary btn-sm w-100"
                                onClick={handleGenerateReport}
                                disabled={loading || !selectedAccount}
                                style={{ height: '30px', fontSize: '0.8rem', padding: '0 12px', fontWeight: '500', whiteSpace: 'nowrap' }}
                            >
                                {loading ? <span className="spinner-border spinner-border-sm" style={{ width: '14px', height: '14px' }} /> : <><i className="bi bi-search"></i> Generate</>}
                            </button>
                        </div>

                        {/* Show Totals Checkbox */}
                        <div className="col-12 col-md-auto d-flex align-items-end">
                            <div className="form-check form-switch">
                                <input
                                    className="form-check-input"
                                    type="checkbox"
                                    role="switch"
                                    id="showTotals"
                                    checked={showTotals}
                                    onChange={() => setShowTotals(!showTotals)}
                                    disabled={!hasGenerated}
                                    style={{ marginTop: '2px' }}
                                />
                                <label className="form-check-label small" htmlFor="showTotals" style={{ fontSize: '0.75rem' }}>
                                    Show Totals
                                </label>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="col-12 col-md-auto d-flex align-items-end justify-content-end gap-2">
                            <button
                                className="btn btn-outline-success btn-sm d-flex align-items-center"
                                onClick={exportToExcel}
                                disabled={!hasGenerated || exporting}
                                style={{ height: '30px', padding: '0 12px', fontSize: '0.8rem', fontWeight: '500', whiteSpace: 'nowrap' }}
                            >
                                <i className="bi bi-file-earmark-excel-fill me-1"></i>
                                {exporting ? '...' : 'Excel'}
                            </button>
                            <button
                                className="btn btn-outline-primary btn-sm d-flex align-items-center"
                                onClick={printReport}
                                disabled={!hasGenerated}
                                style={{ height: '30px', padding: '0 12px', fontSize: '0.8rem', fontWeight: '500', whiteSpace: 'nowrap' }}
                            >
                                <i className="bi bi-printer me-1"></i>
                                Print
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="alert alert-danger text-center py-1 mb-2 small" style={{ fontSize: '0.75rem' }}>
                            {error}
                            <button type="button" className="btn-close btn-sm ms-2" style={{ fontSize: '10px' }} onClick={() => setError(null)}></button>
                        </div>
                    )}

                    {!selectedAccount && !loading && (
                        <div className="alert alert-info text-center py-3" style={{ fontSize: '0.8rem' }}>
                            <i className="fas fa-info-circle me-2"></i>Please select an account to view the ageing report.
                        </div>
                    )}

                    {selectedAccount && !hasGenerated && !loading && (
                        <div className="alert alert-info text-center py-3" style={{ fontSize: '0.8rem' }}>
                            <i className="fas fa-info-circle me-2"></i>Please select an "As on Date" and click "Generate" to view the ageing report.
                        </div>
                    )}

                    {/* Always show account info when hasGenerated is true */}
                    {hasGenerated && selectedAccount && (
                        <>
                            <div className="mb-2">
                                <div className="d-flex justify-content-between">
                                    <div>
                                        <strong>Account:</strong> {selectedAccount.name}
                                    </div>
                                    <div>
                                        <strong>Report Date (BS):</strong> {dateRange.asOnDate}
                                    </div>
                                    <div>
                                        <strong>Opening:</strong>{' '}
                                        <span className="fw-bold">
                                            {formatCurrency(Math.abs(data.account?.openingBalance || 0))} {data.account?.openingBalanceType || 'Dr'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {data?.agingData?.transactions?.length > 0 ? (
                                <>
                                    <div className="table-responsive" style={{ maxHeight: '400px', overflow: 'auto' }}>
                                        <table className="table table-sm table-hover mb-0" style={{ fontSize: '0.75rem' }}>
                                            <thead className="table-light" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                                                <tr>
                                                    <th style={{ padding: '4px 6px' }}>Miti</th>
                                                    <th style={{ padding: '4px 6px' }}>Date</th>
                                                    <th style={{ padding: '4px 6px' }}>Age (Days)</th>
                                                    <th style={{ padding: '4px 6px' }}>Vch. No.</th>
                                                    <th style={{ padding: '4px 6px' }}>Particulars</th>
                                                    <th className="text-end" style={{ padding: '4px 6px' }}>Debit</th>
                                                    <th className="text-end" style={{ padding: '4px 6px' }}>Credit</th>
                                                    <th className="text-end" style={{ padding: '4px 6px' }}>Balance</th>
                                                </tr>
                                            </thead>
                                            <tbody ref={tableBodyRef}>
                                                {data.agingData.transactions.map((transaction, index) => (
                                                    <tr
                                                        key={transaction._id || index}
                                                        className={selectedRowIndex === index ? 'table-primary' : ''}
                                                        onClick={() => handleRowClick(index)}
                                                        style={{ cursor: 'pointer' }}
                                                    >
                                                        <td style={{ padding: '6px 8px' }}>{transaction.nepaliDate}</td>
                                                        <td style={{ padding: '6px 8px' }}>{getTransactionDate(transaction)}</td>
                                                        <td style={{ padding: '6px 8px' }}>{transaction.age} days</td>
                                                        <td style={{ padding: '6px 8px' }}>{transaction.referenceNumber}</td>
                                                        <td style={{ padding: '6px 8px' }}>
                                                            <i className={getTransactionIcon(transaction.type)} />{' '}
                                                            {getTransactionTypeLabel(transaction.type)}
                                                        </td>
                                                        <td className="text-end text-danger" style={{ padding: '6px 8px' }}>
                                                            {formatCurrency(transaction.debit)}
                                                        </td>
                                                        <td className="text-end text-success" style={{ padding: '6px 8px' }}>
                                                            {formatCurrency(transaction.credit)}
                                                        </td>
                                                        <td className="text-end fw-bold" style={{ padding: '6px 8px' }}>
                                                            {formatBalance(transaction.balance)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>

                                            {showTotals && data.agingData.transactions.length > 0 && (() => {
                                                let totalDebit = 0;
                                                let totalCredit = 0;
                                                let closingBalance = 0;

                                                data.agingData.transactions.forEach(transaction => {
                                                    totalDebit += transaction.debit || 0;
                                                    totalCredit += transaction.credit || 0;
                                                    closingBalance = transaction.balance;
                                                });

                                                return (
                                                    <tfoot className="table-group-divider">
                                                        <tr className="fw-bold table-secondary">
                                                            <td colSpan="5" style={{ padding: '6px 8px' }}>Totals</td>
                                                            <td className="text-end" style={{ padding: '6px 8px' }}>
                                                                {formatCurrency(totalDebit)}
                                                            </td>
                                                            <td className="text-end" style={{ padding: '6px 8px' }}>
                                                                {formatCurrency(totalCredit)}
                                                            </td>
                                                            <td className="text-end" style={{ padding: '6px 8px' }}>
                                                                {formatBalance(closingBalance)}
                                                            </td>
                                                        </tr>
                                                    </tfoot>
                                                );
                                            })()}
                                        </table>
                                    </div>

                                    {/* Ageing Summary */}
                                    <div className="d-flex flex-wrap gap-2 mt-3">
                                        {getAgingSummary().map((item, idx) => (
                                            <div key={idx} className="d-flex justify-content-between align-items-center px-2 py-1 bg-white rounded border" style={{ fontSize: '0.75rem', minWidth: '100px' }}>
                                                <span className="me-2">{item.range}</span>
                                                <span className={`badge bg-${item.variant} rounded-pill`}>{item.count}</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="alert alert-warning text-center py-3" style={{ fontSize: '0.8rem' }}>
                                    <i className="fas fa-exclamation-triangle me-2"></i>No transactions found for the selected account and date. Only opening balance is shown.
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

            {showProductModal && (
                <ProductModal onClose={() => setShowProductModal(false)} />
            )}

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

export default DayWiseAgeing;

//--------------------------------------------------------------------------end

