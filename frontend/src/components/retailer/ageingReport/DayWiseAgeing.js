import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../Header';
import Loader from '../../Loader';
import * as XLSX from 'xlsx';
import NotificationToast from '../../NotificationToast';
import NepaliDate from 'nepali-date-converter';
import VirtualizedAccountList from '../../VirtualizedAccountList';

const DayWiseAgeing = () => {
    const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
    const currentEnglishDate = new Date().toISOString().split('T')[0];

    const [company, setCompany] = useState({
        dateFormat: 'english',
        vatEnabled: true,
        fiscalYear: {}
    });

    const [data, setData] = useState({
        account: null,
        agingData: {
            totalOutstanding: 0,
            agingBreakdown: {
                current: 0,
                oneToThirty: 0,
                thirtyOneToSixty: 0,
                sixtyOneToNinety: 0,
                ninetyPlus: 0
            },
            transactions: [],
            summary: {}
        },
        accounts: [],
        company: null,
        currentFiscalYear: null,
        currentCompanyName: '',
        asOnDate: '',
        hasDateFilter: false
    });

    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [asOnDate, setAsOnDate] = useState('');
    const [dateError, setDateError] = useState('');
    const [showAccountModal, setShowAccountModal] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [hasGenerated, setHasGenerated] = useState(false);
    const [selectedRowIndex, setSelectedRowIndex] = useState(0);
    const [showTotals, setShowTotals] = useState(true);

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
    const generateBtnRef = useRef(null);
    const tableBodyRef = useRef(null);
    const abortControllerRef = useRef(null);

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

    // Helper function to check if date format is Nepali (case insensitive)
    const isNepaliDateFormat = useCallback(() => {
        return company.dateFormat && company.dateFormat.toLowerCase() === 'nepali';
    }, [company.dateFormat]);

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
        return 'asOnDate';
    };

    // Fetch accounts on component mount
    useEffect(() => {
        const fetchAccounts = async () => {
            try {
                setInitialLoading(true);
                const response = await api.get('/api/retailer/day-count-aging');
                if (response.data.success) {
                    const responseData = response.data.data;
                    const dateFormat = responseData.company?.dateFormat?.toLowerCase() || 'english';
                    console.log('Date format from API:', dateFormat);

                    setCompany({
                        dateFormat: dateFormat,
                        vatEnabled: responseData.company?.vatEnabled !== false,
                        fiscalYear: responseData.currentFiscalYear || {}
                    });
                    setData(prev => ({
                        ...prev,
                        accounts: responseData.accounts || [],
                        company: responseData.company,
                        currentFiscalYear: responseData.currentFiscalYear,
                        currentCompanyName: responseData.currentCompanyName
                    }));

                    const initialDate = isNepaliDateFormat() ? currentNepaliDate : currentEnglishDate;
                    setAsOnDate(initialDate);
                }
            } catch (err) {
                console.error('Error fetching accounts:', err);
                setError('Failed to fetch accounts');
            } finally {
                setInitialLoading(false);
            }
        };
        fetchAccounts();
    }, [api, isNepaliDateFormat]);

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

        if (abortControllerRef.current) abortControllerRef.current.abort();
        abortControllerRef.current = new AbortController();

        try {
            setLoading(true);
            setError(null);
            const url = `/api/retailer/day-count-aging?accountId=${selectedAccount.id}&asOnDate=${encodeURIComponent(asOnDate)}`; const response = await api.get(url, { signal: abortControllerRef.current.signal });

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
    }, [api, selectedAccount, asOnDate]);

    const validateDate = (dateStr) => {
        if (!dateStr) return false;
        if (isNepaliDateFormat()) {
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

    const handleGenerateReport = () => {
        if (!selectedAccount) {
            setNotification({ show: true, message: 'Please select an account first', type: 'warning', duration: 3000 });
            return;
        }
        if (!asOnDate) {
            setDateError('Please enter a date');
            asOnDateRef.current?.focus();
            return;
        }
        if (!validateDate(asOnDate)) {
            setDateError('Invalid date format');
            asOnDateRef.current?.focus();
            return;
        }
        fetchAgeingData();
    };

    const selectAccount = (account) => {
        setSelectedAccount(account);
        setShowAccountModal(false);
        setAccountSearchQuery('');

        // Focus on asOnDate input after modal closes
        setTimeout(() => {
            if (asOnDateRef.current) {
                asOnDateRef.current.focus();
            }
        }, 100);

        // Auto-generate report after selecting account
        // setTimeout(() => {
        //     if (asOnDate && validateDate(asOnDate)) {
        //         fetchAgeingData();
        //     }
        // }, 150);
    };

    const formatCurrency = useCallback((num) => {
        if (num === undefined || num === null) return '0.00';
        const number = Math.abs(typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num));
        if (isNaN(number)) return '0.00';
        return number.toLocaleString(isNepaliDateFormat() ? 'en-IN' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }, [isNepaliDateFormat]);

    const getTransactionDate = useCallback((transaction) => {
        if (!transaction) return '';

        if (isNepaliDateFormat()) {
            if (transaction.nepaliDate) {
                try {
                    return new NepaliDate(transaction.nepaliDate).format('YYYY-MM-DD');
                } catch (e) {
                    console.error('Error formatting Nepali date:', e);
                    return transaction.nepaliDate;
                }
            }
            if (transaction.date) {
                try {
                    return new NepaliDate(transaction.date).format('YYYY-MM-DD');
                } catch (e) {
                    return transaction.date;
                }
            }
        } else {
            if (transaction.date) {
                try {
                    return new Date(transaction.date).toISOString().split('T')[0];
                } catch (e) {
                    return transaction.date;
                }
            }
        }
        return '';
    }, [isNepaliDateFormat]);

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
            excelData.push(['As on Date:', asOnDate]);
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
            XLSX.writeFile(wb, `Day_Wise_Ageing_${selectedAccount?.name || 'Report'}_${asOnDate}.xlsx`);

            setNotification({ show: true, message: 'Excel file exported successfully!', type: 'success', duration: 3000 });
        } catch (err) {
            setNotification({ show: true, message: 'Failed to export data', type: 'error', duration: 3000 });
        } finally {
            setExporting(false);
        }
    };

    const printReport = () => {
        if (!hasGenerated) {
            setNotification({ show: true, message: 'Please generate the report first', type: 'warning', duration: 3000 });
            return;
        }

        const printWindow = window.open('', '_blank');
        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Day Wise Ageing Report</title>
                <style>
                    @page { margin: 10mm; }
                    body { font-family: Arial; font-size: 10px; margin: 0; padding: 5mm; }
                    .print-header { text-align: center; margin-bottom: 20px; }
                    table { width: 100%; border-collapse: collapse; font-size: 12px; }
                    th, td { border: 1px solid #000; padding: 4px; text-align: left; }
                    th { background: #f2f2f2; }
                    .text-end { text-align: right; }
                </style>
            </head>
            <body>
                <div class="print-header">
                    <h3>${data.currentCompanyName || 'Company Name'}</h3>
                    <h2>Day Wise Ageing Report</h2>
                    <p><strong>Account:</strong> ${selectedAccount?.name || data.account?.name || 'N/A'}</p>
                    <p><strong>As on Date:</strong> ${asOnDate}</p>
                    <p><strong>Opening:</strong> ${formatCurrency(Math.abs(data.account?.openingBalance || 0))} ${data.account?.openingBalanceType || 'Dr'}</p>
                    <hr>
                </div>
                <table>
                    <thead>
                        <tr><th>Date</th><th>Age</th><th>Vch No.</th><th>Particulars</th><th class="text-end">Debit</th><th class="text-end">Credit</th><th class="text-end">Balance</th></tr>
                    </thead>
                    <tbody>
                        ${data.agingData.transactions && data.agingData.transactions.length > 0 ?
                data.agingData.transactions.map(transaction => `
                                <tr>
                                    <td>${getTransactionDate(transaction)}</td>
                                    <td>${transaction.age} days</td>
                                    <td>${transaction.referenceNumber}</td>
                                    <td>${getTransactionTypeLabel(transaction.type)}</td>
                                    <td class="text-end">${formatCurrency(transaction.debit)}</td>
                                    <td class="text-end">${formatCurrency(transaction.credit)}</td>
                                    <td class="text-end">${formatBalance(transaction.balance)}</td>
                                </tr>
                            `).join('') :
                '<tr><td colspan="7" class="text-center">No transactions found</td></tr>'
            }
                    </tbody>
                </table>
                <script>window.onload=function(){window.print();window.onafterprint=function(){window.close()}}<\/script>
            </body>
            </html>
        `;
        printWindow.document.write(printContent);
        printWindow.document.close();
    };

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

    if (initialLoading) return <Loader />;

    return (
        <div className="container-fluid">
            <Header />
            <div className="card mt-2 shadow-lg p-0 expanded-card ledger-card compact">
                <div className="card-header">
                    <h2 className="card-title text-center">
                        Day Wise Ageing Report
                    </h2>                </div>
                <div className="card-body">
                    <div className="filter-section" style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '15px' }}>
                        <div className="col-md-3">
                            <div className="position-relative">
                                <input
                                    type="text"
                                    className="form-control form-control-sm no-date-icon"
                                    value={selectedAccount ? `${selectedAccount.name}` : ''}
                                    onClick={() => setShowAccountModal(true)}
                                    onFocus={() => setShowAccountModal(true)}
                                    readOnly
                                    placeholder="Select Account"
                                    style={{ height: '30px', fontSize: '0.8rem', width: '100%', paddingTop: '0.75rem' }}
                                />
                                <label className="position-absolute" style={{ top: '-0.5rem', left: '0.75rem', fontSize: '0.75rem', backgroundColor: 'white', padding: '0 0.25rem', color: '#6c757d', fontWeight: '500' }}>
                                    Account: <span className="text-danger">*</span>
                                </label>
                            </div>
                        </div>

                        <div className="col-md-2">
                            <div className="position-relative">
                                <input
                                    type="text"
                                    id="asOnDate"
                                    ref={asOnDateRef}
                                    className={`form-control form-control-sm no-date-icon ${dateError ? 'is-invalid' : ''}`}
                                    value={asOnDate}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        const sanitizedValue = value.replace(/[^0-9/-]/g, '');
                                        if (sanitizedValue.length <= 10) {
                                            setAsOnDate(sanitizedValue);
                                            setDateError('');
                                        }
                                    }}
                                    onBlur={() => {
                                        if (asOnDate && !validateDate(asOnDate)) {
                                            setDateError('Invalid date format');
                                        } else {
                                            setDateError('');
                                        }
                                    }}
                                    onKeyDown={(e) => e.key === 'Enter' && handleGenerateReport()}
                                    placeholder={isNepaliDateFormat() ? "YYYY-MM-DD" : "YYYY-MM-DD"}
                                    autoComplete="off"
                                    style={{ height: '30px', fontSize: '0.8rem', width: '100%', paddingTop: '0.75rem' }}
                                />
                                <label className="position-absolute" style={{ top: '-0.5rem', left: '0.75rem', fontSize: '0.75rem', backgroundColor: 'white', padding: '0 0.25rem', color: '#6c757d', fontWeight: '500' }}>
                                    As on Date: <span className="text-danger">*</span>
                                </label>
                                {dateError && <div className="invalid-feedback d-block" style={{ fontSize: '0.7rem' }}>{dateError}</div>}
                            </div>
                        </div>

                        <div className="col-md-1">
                            <button
                                ref={generateBtnRef}
                                className="btn btn-primary btn-sm w-100"
                                onClick={handleGenerateReport}
                                disabled={loading || !selectedAccount}
                                style={{ height: '30px', fontSize: '0.75rem', padding: '0 6px' }}
                            >
                                {loading ? <span className="spinner-border spinner-border-sm" style={{ width: '14px', height: '14px' }} /> : <><i className="fas fa-chart-line me-1"></i>Generate</>}
                            </button>
                        </div>

                        <div className="col-md-1">
                            <div className="form-check form-switch mt-2">
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
                                <label className="form-check-label small" htmlFor="showTotals" style={{ fontSize: '0.75rem' }}>Totals</label>
                            </div>
                        </div>

                        <div className="col-md-1">
                            <button
                                className="btn btn-outline-success btn-sm w-100"
                                onClick={exportToExcel}
                                disabled={!hasGenerated || exporting}
                                style={{ height: '30px', fontSize: '0.7rem', padding: '0 4px' }}
                            >
                                <i className="fas fa-file-excel me-1"></i>{exporting ? '...' : 'Excel'}
                            </button>
                        </div>

                        <div className="col-md-1">
                            <button
                                className="btn btn-outline-primary btn-sm w-100"
                                onClick={printReport}
                                disabled={!hasGenerated}
                                style={{ height: '30px', fontSize: '0.7rem', padding: '0 4px' }}
                            >
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

                    {!selectedAccount && (
                        <div className="alert alert-info text-center py-3" style={{ fontSize: '0.8rem' }}>
                            <i className="fas fa-info-circle me-2"></i>Please select an account to view the ageing report.
                        </div>
                    )}

                    {selectedAccount && !hasGenerated && !loading && (
                        <div className="alert alert-info text-center py-3" style={{ fontSize: '0.8rem' }}>
                            <i className="fas fa-info-circle me-2"></i>Please select an "As on Date" and click "Generate" to view the ageing report.
                        </div>
                    )}

                    {/* Always show account info when hasGenerated is true, even without transactions */}
                    {hasGenerated && (
                        <>
                            <div className="mb-2">
                                <div className="d-flex justify-content-between">
                                    <div>
                                        <strong>Report Date:</strong> {asOnDate}
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
                                                // Calculate totals from transactions
                                                let totalDebit = 0;
                                                let totalCredit = 0;
                                                let closingBalance = 0;

                                                data.agingData.transactions.forEach(transaction => {
                                                    totalDebit += transaction.debit || 0;
                                                    totalCredit += transaction.credit || 0;
                                                    closingBalance = transaction.balance; // Last transaction balance
                                                });

                                                return (
                                                    <tfoot className="table-group-divider">
                                                        <tr className="fw-bold table-secondary">
                                                            <td colSpan="4" style={{ padding: '6px 8px' }}>Totals</td>
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

                                    {/* Ageing Summary
                                    <div className="mt-3">
                                        <div className="row">
                                            <div className="col-md-4">
                                                <div className="card bg-light">
                                                    <div className="card-body py-2">
                                                        <h6 className="card-title mb-2">Ageing Summary</h6>
                                                        <div className="list-group list-group-flush">
                                                            {getAgingSummary().map((item, idx) => (
                                                                <div key={idx} className="list-group-item d-flex justify-content-between align-items-center py-1" style={{ fontSize: '0.75rem' }}>
                                                                    {item.range}
                                                                    <span className={`badge bg-${item.variant} rounded-pill`}>{item.count}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div> */}

                                    <div className="d-flex flex-wrap gap-2">
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