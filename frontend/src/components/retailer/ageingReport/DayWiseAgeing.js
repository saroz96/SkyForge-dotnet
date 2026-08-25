import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../Header';
import NepaliDate from 'nepali-datetime';
import { usePageNotRefreshContext } from '../PageNotRefreshContext';
import Loader from '../../Loader';
import ProductModal from '../dashboard/modals/ProductModal';
import * as XLSX from 'xlsx';
import NotificationToast from '../../NotificationToast';
import VirtualizedAccountList from '../../VirtualizedAccountList';
import { FiCalendar, FiFileText, FiPrinter, FiDownload, FiSearch, FiUser } from 'react-icons/fi';
import './DayWiseAgeing.css';
import api, { refreshToken } from '../../services/api';
import AccountModalForPaymentReceipt from '../payment/AccountModalForPaymentReceipt';

// Helper functions for date conversion
const convertBsToAd = (bsDate) => {
    if (!bsDate || !/^\d{4}-\d{2}-\d{2}$/.test(bsDate)) return null;
    try {
        const nepaliDate = new NepaliDate(bsDate);
        const jsDate = nepaliDate?.getDateObject?.();
        if (!jsDate || isNaN(jsDate.getTime())) return null;
        return `${jsDate.getFullYear()}-${String(jsDate.getMonth() + 1).padStart(2, '0')}-${String(jsDate.getDate()).padStart(2, '0')}`;
    } catch { return null; }
};

const convertAdToBs = (adDate) => {
    if (!adDate) return null;
    try {
        const date = typeof adDate === 'string'
            ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(adDate) ? adDate + 'T00:00:00' : adDate)
            : adDate instanceof Date ? adDate : null;
        if (!date || isNaN(date.getTime())) return null;
        const nepaliDate = new NepaliDate(date);
        return `${nepaliDate.getYear()}-${String(nepaliDate.getMonth() + 1).padStart(2, '0')}-${String(nepaliDate.getDate()).padStart(2, '0')}`;
    } catch { return null; }
};

const isValidNepaliDate = (dateStr) => {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
    try {
        const [year, month, day] = dateStr.split('-').map(Number);
        const nepaliDate = new NepaliDate(dateStr);
        return nepaliDate.getYear() === year && nepaliDate.getMonth() + 1 === month && nepaliDate.getDate() === day;
    } catch { return false; }
};

const DayWiseAgeing = () => {
    const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
    const currentEnglishDate = new Date().toISOString().split('T')[0];
    const { draftSave, setDraftSave } = usePageNotRefreshContext();
    const [showProductModal, setShowProductModal] = useState(false);

    const [company, setCompany] = useState({ dateFormat: 'english', isVatExempt: false, vatEnabled: true, fiscalYear: {} });
    const [dateRange, setDateRange] = useState(() => {
        if (draftSave?.dayWiseAgeingData) {
            return { fromDate: draftSave.dayWiseAgeingData.fromDate || '', toDate: draftSave.dayWiseAgeingData.toDate || '', fromDateAd: draftSave.dayWiseAgeingData.fromDateAd || '', toDateAd: draftSave.dayWiseAgeingData.toDateAd || '' };
        }
        return { fromDate: '', toDate: '', fromDateAd: '', toDateAd: '' };
    });

    const [dateErrors, setDateErrors] = useState({ fromDate: '', toDate: '' });
    const [data, setData] = useState(() => {
        if (draftSave?.dayWiseAgeingData) {
            return {
                account: draftSave.dayWiseAgeingData.account || null,
                agingData: draftSave.dayWiseAgeingData.agingData || { totalOutstanding: 0, agingBreakdown: {}, transactions: [], summary: {}, openingBalanceBeforeFromDate: 0, openingBalanceType: 'Dr' },
                accounts: draftSave.dayWiseAgeingData.accounts || [], company: draftSave.dayWiseAgeingData.company || null,
                currentFiscalYear: draftSave.dayWiseAgeingData.currentFiscalYear || null, currentCompanyName: draftSave.dayWiseAgeingData.currentCompanyName || '',
                hasDateFilter: draftSave.dayWiseAgeingData.hasDateFilter || false
            };
        }
        return { account: null, agingData: { totalOutstanding: 0, agingBreakdown: {}, transactions: [], summary: {}, openingBalanceBeforeFromDate: 0, openingBalanceType: 'Dr' }, accounts: [], company: null, currentFiscalYear: null, currentCompanyName: '', hasDateFilter: false };
    });

    const [selectedAccount, setSelectedAccount] = useState(() => draftSave?.dayWiseAgeingData?.account || null);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [error, setError] = useState(null);
    const [hasGenerated, setHasGenerated] = useState(false);
    const [selectedRowIndex, setSelectedRowIndex] = useState(0);
    const [showTotals, setShowTotals] = useState(() => draftSave?.dayWiseAgeingSearch?.showTotals !== undefined ? draftSave.dayWiseAgeingSearch.showTotals : true);
    const [exporting, setExporting] = useState(false);
    const [showAccountModal, setShowAccountModal] = useState(false);

    // Account search states
    const [accounts, setAccounts] = useState([]);
    const [isAccountSearching, setIsAccountSearching] = useState(false);
    const [accountSearchPage, setAccountSearchPage] = useState(1);
    const [hasMoreAccountResults, setHasMoreAccountResults] = useState(false);
    const [totalAccounts, setTotalAccounts] = useState(0);
    const [accountSearchQuery, setAccountSearchQuery] = useState('');
    const [accountLastSearchQuery, setAccountLastSearchQuery] = useState('');
    const [accountShouldShowLastSearchResults, setAccountShouldShowLastSearchResults] = useState(false);
    // Add this state near other state declarations
    const [selectedAccountId, setSelectedAccountId] = useState('');
    const accountSearchRef = useRef(null);

    const [notification, setNotification] = useState({ show: false, message: '', type: 'success', duration: 3000 });
    const navigate = useNavigate();
    const fromDateRef = useRef(null);
    const fromDateAdRef = useRef(null);
    const toDateRef = useRef(null);
    const toDateAdRef = useRef(null);
    const generateBtnRef = useRef(null);
    const tableBodyRef = useRef(null);
    const abortControllerRef = useRef(null);

    const isNepaliDateFormat = useCallback(() => company.dateFormat && company.dateFormat.toLowerCase() === 'nepali', [company.dateFormat]);

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

    // Fetch accounts
    // const fetchAccountsFromBackend = async (searchTerm = '', page = 1) => {
    //     try {
    //         setIsAccountSearching(true);
    //         const response = await api.get('/api/retailer/accounts/search', {
    //             params: { search: searchTerm, page: page, limit: searchTerm.trim() ? 15 : 25 }
    //         });
    //         if (response.data.success) {
    //             if (page === 1) { setAccounts(response.data.accounts); } else { setAccounts(prev => [...prev, ...response.data.accounts]); }
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
            const response = await api.get('/api/retailer/accounts/search', {
                params: {
                    search: searchTerm,
                    page: page,
                    limit: searchTerm.trim() ? 15 : 25
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
            const searchTerm = accountShouldShowLastSearchResults ? accountLastSearchQuery : accountSearchQuery;
            // Pass true for append parameter
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

    const getFocusTargetOnModalClose = () => 'fromDate';

    // Fetch company info
    useEffect(() => {
        const fetchCompanyInfo = async () => {
            try {
                setInitialLoading(true);
                const response = await api.get('/api/retailer/day-count-aging');
                if (response.data.success) {
                    const responseData = response.data.data;
                    const dateFormat = responseData.company?.dateFormat?.toLowerCase() || 'english';
                    setCompany({
                        dateFormat: dateFormat, vatEnabled: responseData.company?.vatEnabled !== false,
                        fiscalYear: responseData.currentFiscalYear || {}, isVatExempt: responseData.company?.isVatExempt || false
                    });
                    const hasDraftDates = draftSave?.dayWiseAgeingData?.fromDate && draftSave?.dayWiseAgeingData?.toDate;
                    if (!hasDraftDates && responseData.currentFiscalYear) {
                        let fromDateFormatted = '', toDateFormatted = '', fromDateAd = '', toDateAd = '';
                        if (dateFormat === 'nepali') {
                            fromDateFormatted = responseData.currentFiscalYear.startDateNepali || currentNepaliDate;
                            toDateFormatted = currentNepaliDate;
                            fromDateAd = convertBsToAd(fromDateFormatted);
                            toDateAd = convertBsToAd(toDateFormatted);
                        } else {
                            fromDateFormatted = responseData.currentFiscalYear.startDate ? new Date(responseData.currentFiscalYear.startDate).toISOString().split('T')[0] : currentEnglishDate;
                            toDateFormatted = currentEnglishDate;
                            fromDateAd = fromDateFormatted;
                            toDateAd = toDateFormatted;
                        }
                        setDateRange({ fromDate: fromDateFormatted, toDate: toDateFormatted, fromDateAd, toDateAd });
                    } else if (hasDraftDates) {
                        let fromDateAd = dateRange.fromDate;
                        let toDateAd = dateRange.toDate;
                        if (dateFormat === 'nepali' && dateRange.fromDate) {
                            fromDateAd = convertBsToAd(dateRange.fromDate);
                            toDateAd = convertBsToAd(dateRange.toDate);
                        }
                        setDateRange(prev => ({ ...prev, fromDateAd: fromDateAd || prev.fromDateAd, toDateAd: toDateAd || prev.toDateAd }));
                    }
                    setData(prev => ({ ...prev, accounts: responseData.accounts || [], company: responseData.company, currentFiscalYear: responseData.currentFiscalYear, currentCompanyName: responseData.currentCompanyName }));
                }
            } catch (err) {
                setDateRange({ fromDate: currentEnglishDate, toDate: currentEnglishDate, fromDateAd: currentEnglishDate, toDateAd: currentEnglishDate });
            } finally { setInitialLoading(false); }
        };
        fetchCompanyInfo();
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

    const fetchAgeingData = useCallback(async () => {
        if (!selectedAccount) { setNotification({ show: true, message: 'Please select an account first', type: 'warning' }); return; }
        if (!dateRange.fromDate) { setDateErrors(prev => ({ ...prev, fromDate: 'Required' })); fromDateRef.current?.focus(); return; }
        if (!dateRange.toDate) { setDateErrors(prev => ({ ...prev, toDate: 'Required' })); toDateRef.current?.focus(); return; }
        if (isNepaliDateFormat()) {
            if (!isValidNepaliDate(dateRange.fromDate)) { setDateErrors(prev => ({ ...prev, fromDate: 'Invalid' })); fromDateRef.current?.focus(); return; }
            if (!isValidNepaliDate(dateRange.toDate)) { setDateErrors(prev => ({ ...prev, toDate: 'Invalid' })); toDateRef.current?.focus(); return; }
        }

        abortControllerRef.current?.abort();
        abortControllerRef.current = new AbortController();
        try {
            setLoading(true); setError(null);
            const fromDateParam = dateRange.fromDateAd || dateRange.fromDate;
            const toDateParam = dateRange.toDateAd || dateRange.toDate;
            const url = `/api/retailer/day-count-aging?accountId=${selectedAccount.id}&fromDate=${encodeURIComponent(fromDateParam)}&toDate=${encodeURIComponent(toDateParam)}`;
            const response = await api.get(url, { signal: abortControllerRef.current.signal });

            if (response.data.success) {
                setData(response.data.data);
                setHasGenerated(true);
                setSelectedRowIndex(0);
                if (response.data.data.agingData?.transactions?.length === 0) {
                    setNotification({ show: true, message: 'No transactions found for this account and date range', type: 'warning' });
                } else {
                    setNotification({ show: true, message: 'Report generated successfully!', type: 'success' });
                }
            }
        } catch (err) {
            if (err.name !== 'AbortError' && err.name !== 'CanceledError') {
                const errorMsg = err.response?.data?.error || 'Failed to load ageing report';
                setError(errorMsg);
                setNotification({ show: true, message: errorMsg, type: 'error' });
            }
        } finally { setLoading(false); }
    }, [api, selectedAccount, dateRange.fromDate, dateRange.toDate, dateRange.fromDateAd, dateRange.toDateAd, isNepaliDateFormat]);

    const handleGenerateReport = () => {
        if (!selectedAccount) { setNotification({ show: true, message: 'Please select an account first', type: 'warning' }); return; }
        if (!dateRange.fromDate) { setDateErrors(prev => ({ ...prev, fromDate: 'Required' })); fromDateRef.current?.focus(); return; }
        if (!dateRange.toDate) { setDateErrors(prev => ({ ...prev, toDate: 'Required' })); toDateRef.current?.focus(); return; }
        if (isNepaliDateFormat()) {
            if (!isValidNepaliDate(dateRange.fromDate)) { setDateErrors(prev => ({ ...prev, fromDate: 'Invalid' })); fromDateRef.current?.focus(); return; }
            if (!isValidNepaliDate(dateRange.toDate)) { setDateErrors(prev => ({ ...prev, toDate: 'Invalid' })); toDateRef.current?.focus(); return; }
        }
        fetchAgeingData();
    };

    // --- Date Handlers ---
    const handleFromDateChange = (e) => {
        const value = e.target.value.replace(/[^0-9/-]/g, '').slice(0, 10);
        const adDate = convertBsToAd(value);
        setDateRange(prev => ({ ...prev, fromDate: value, fromDateAd: adDate || prev.fromDateAd }));
        setDateErrors(prev => ({ ...prev, fromDate: '' }));
    };
    const handleToDateChange = (e) => {
        const value = e.target.value.replace(/[^0-9/-]/g, '').slice(0, 10);
        const adDate = convertBsToAd(value);
        setDateRange(prev => ({ ...prev, toDate: value, toDateAd: adDate || prev.toDateAd }));
        setDateErrors(prev => ({ ...prev, toDate: '' }));
    };
    const handleFromDateAdChange = (e) => {
        const value = e.target.value;
        const bsDate = convertAdToBs(value);
        setDateRange(prev => ({ ...prev, fromDateAd: value, fromDate: bsDate || prev.fromDate }));
        setDateErrors(prev => ({ ...prev, fromDate: '' }));
    };
    const handleToDateAdChange = (e) => {
        const value = e.target.value;
        const bsDate = convertAdToBs(value);
        setDateRange(prev => ({ ...prev, toDateAd: value, toDate: bsDate || prev.toDate }));
        setDateErrors(prev => ({ ...prev, toDate: '' }));
    };
    const handleFromDateBlur = () => {
        const dateStr = dateRange.fromDate?.trim();
        if (!dateStr) return;
        if (isNepaliDateFormat()) {
            const correctedDate = validateAndCorrectNepaliDate(dateStr);
            if (!correctedDate) {
                const adDate = convertBsToAd(currentNepaliDate);
                setDateRange(prev => ({ ...prev, fromDate: currentNepaliDate, fromDateAd: adDate }));
                setNotification({ show: true, message: 'Invalid Nepali date. Auto-corrected.', type: 'warning' });
            } else if (correctedDate !== dateStr) {
                const adDate = convertBsToAd(correctedDate);
                setDateRange(prev => ({ ...prev, fromDate: correctedDate, fromDateAd: adDate }));
                setNotification({ show: true, message: 'Date auto-corrected.', type: 'warning' });
            }
        }
    };
    const handleToDateBlur = () => {
        const dateStr = dateRange.toDate?.trim();
        if (!dateStr) return;
        if (isNepaliDateFormat()) {
            const correctedDate = validateAndCorrectNepaliDate(dateStr);
            if (!correctedDate) {
                const adDate = convertBsToAd(currentNepaliDate);
                setDateRange(prev => ({ ...prev, toDate: currentNepaliDate, toDateAd: adDate }));
                setNotification({ show: true, message: 'Invalid Nepali date. Auto-corrected.', type: 'warning' });
            } else if (correctedDate !== dateStr) {
                const adDate = convertBsToAd(correctedDate);
                setDateRange(prev => ({ ...prev, toDate: correctedDate, toDateAd: adDate }));
                setNotification({ show: true, message: 'Date auto-corrected.', type: 'warning' });
            }
        }
    };

    const selectAccount = (account) => {
        setSelectedAccount(account);
         setSelectedAccountId(account.id);
        setShowAccountModal(false);
        setAccountSearchQuery('');
        setDateErrors({ fromDate: '', toDate: '' });
        setTimeout(() => fromDateRef.current?.focus(), 100);
    };

    const formatCurrency = useCallback((num) => {
        if (num === undefined || num === null) return '0.00';
        const number = Math.abs(typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num));
        if (isNaN(number)) return '0.00';
        return number.toLocaleString(isNepaliDateFormat() ? 'en-IN' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }, [isNepaliDateFormat]);

    const formatBalance = (balance) => {
        const formattedBalance = formatCurrency(Math.abs(balance));
        return balance >= 0 ? `${formattedBalance} Dr` : `${formattedBalance} Cr`;
    };

    const getTransactionTypeLabel = (type) => {
        const labels = { sales: 'Sale', purchase: 'Purchase', purchase_return: 'Purchase Return', sales_return: 'Sales Return', payment: 'Payment', receipt: 'Receipt', debit_note: 'Debit Note', credit_note: 'Credit Note', journal: 'Journal' };
        return labels[type] || 'Transaction';
    };

    const getTransactionIcon = (type) => {
        const icons = { sales: 'fas fa-file-invoice-dollar text-primary', purchase: 'fas fa-shopping-cart text-info', purchase_return: 'fas fa-undo text-warning', sales_return: 'fas fa-exchange-alt text-danger', payment: 'fas fa-money-bill-wave text-success', receipt: 'fas fa-hand-holding-usd text-success', debit_note: 'fas fa-file-alt text-danger', credit_note: 'fas fa-file-alt text-success', journal: 'fas fa-book text-secondary' };
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
        if (e.key === 'Enter') { e.preventDefault(); if (nextFieldId) document.getElementById(nextFieldId)?.focus(); else handleGenerateReport(); }
    };

    const exportToExcel = async () => {
        if (!hasGenerated) { setNotification({ show: true, message: 'Please generate the report first', type: 'warning' }); return; }
        setExporting(true);
        try {
            const excelData = [];
            excelData.push(['Company Name:', data.currentCompanyName || 'N/A']);
            excelData.push(['Report Type:', 'Day Wise Ageing Report']);
            excelData.push(['Account:', selectedAccount?.name || data.account?.name || 'N/A']);
            excelData.push(['From Date (BS):', dateRange.fromDate]);
            excelData.push(['To Date (BS):', dateRange.toDate]);
            excelData.push(['From Date (AD):', dateRange.fromDateAd]);
            excelData.push(['To Date (AD):', dateRange.toDateAd]);
            excelData.push(['Export Date:', new Date().toLocaleString()]);
            excelData.push([]);

            const openingBalanceBefore = data.agingData?.openingBalanceBeforeFromDate || 0;
            const openingBalanceType = data.agingData?.openingBalanceType || (openingBalanceBefore >= 0 ? 'Dr' : 'Cr');
            excelData.push(['Opening Balance Before From Date:', `${formatCurrency(Math.abs(openingBalanceBefore))} ${openingBalanceType}`]);
            excelData.push([]);

            excelData.push(['Date', 'Age (Days)', 'Voucher No.', 'Particulars', 'Debit Amount', 'Credit Amount', 'Balance']);
            if (data.agingData.transactions && data.agingData.transactions.length > 0) {
                data.agingData.transactions.forEach(transaction => {
                    excelData.push([transaction.nepaliDate || '', `${transaction.age} days`, transaction.referenceNumber, getTransactionTypeLabel(transaction.type), formatCurrency(transaction.debit), formatCurrency(transaction.credit), formatBalance(transaction.balance)]);
                });
            } else {
                excelData.push(['No transactions found', '', '', '', '', '', '']);
            }

            const ws = XLSX.utils.aoa_to_sheet(excelData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Day Wise Ageing');
            XLSX.writeFile(wb, `Day_Wise_Ageing_${selectedAccount?.name || 'Report'}_${dateRange.fromDate}_to_${dateRange.toDate}.xlsx`);
            setNotification({ show: true, message: 'Excel exported successfully!', type: 'success' });
        } catch (err) {
            setNotification({ show: true, message: 'Failed to export data', type: 'error' });
        } finally { setExporting(false); }
    };

    const printReport = () => {
        if (!hasGenerated) { setNotification({ show: true, message: 'Please generate the report first', type: 'warning' }); return; }
        const printWindow = window.open('', '_blank');
        let totalDebit = 0; let totalCredit = 0; let closingBalance = 0;
        if (data.agingData.transactions && data.agingData.transactions.length > 0) {
            data.agingData.transactions.forEach(transaction => {
                totalDebit += transaction.debit || 0; totalCredit += transaction.credit || 0; closingBalance = transaction.balance;
            });
        }
        const openingBalanceBefore = data.agingData?.openingBalanceBeforeFromDate || 0;
        const openingBalanceType = data.agingData?.openingBalanceType || (openingBalanceBefore >= 0 ? 'Dr' : 'Cr');

        const printContent = `
        <!DOCTYPE html><html><head><title>Day Wise Ageing Report</title>
        <style>
            @page { margin: 3mm; } body { font-family: Arial, sans-serif; font-size: 7px; margin: 0; padding: 2mm; }
            table { width: 100%; border-collapse: collapse; page-break-inside: auto; font-size: 6px; }
            th, td { border: 1px solid #000; padding: 2px 3px; text-align: left; white-space: nowrap; }
            th { background-color: #f2f2f2 !important; -webkit-print-color-adjust: exact; font-size: 10px; font-weight: bold; }
            .print-header { text-align: center; margin-bottom: 5px; }
            .report-title { text-align: center; font-size: 11px; font-weight: bold; margin: 3px 0; }
            .info-row { display: flex; justify-content: space-between; align-items: center; margin: 5px 0; padding: 2px 0; font-size: 8px; border-top: 1px solid #000; border-bottom: 1px solid #000; }
            .text-end { text-align: right; } .text-center { text-align: center; } .fw-bold { font-weight: bold; }
            .grand-total-row td { font-weight: bold; border-top: 2px solid #000; font-size: 7px; }
        </style></head>
        <body>
            <div class="print-header"><h1>${data.currentCompanyName || 'Company Name'}</h1><p>${data.company?.address || ''}${data.company?.city ? ', ' + data.company.city : ''}, PAN: ${data.company?.pan || ''}</p><hr></div>
            <div class="report-title">Day Wise Ageing Report</div>
            <div class="info-row">
                <div><strong>Account:</strong> ${selectedAccount?.name || data.account?.name || 'N/A'}</div>
                <div><strong>From:</strong> ${dateRange.fromDate}</div>
                <div><strong>To:</strong> ${dateRange.toDate}</div>
                <div class="text-end"><strong>Opening:</strong> ${formatCurrency(Math.abs(openingBalanceBefore))} ${openingBalanceType}</div>
            </div>
            <table>
                <thead><tr><th>Miti</th><th>Date</th><th>Age</th><th>Vch. No.</th><th>Particulars</th><th class="text-end">Debit</th><th class="text-end">Credit</th><th class="text-end">Balance</th></tr></thead>
                <tbody>
                    ${data.agingData.transactions && data.agingData.transactions.length > 0 ? data.agingData.transactions.map(t => `
                        <tr><td class="text-center">${t.nepaliDate || '-'}</td><td class="text-center">${new Date(t.date || '-').toLocaleDateString()}</td><td class="text-center">${t.age} days</td><td>${t.referenceNumber || '-'}</td><td>${getTransactionTypeLabel(t.type)}</td><td class="text-end">${formatCurrency(t.debit)}</td><td class="text-end">${formatCurrency(t.credit)}</td><td class="text-end fw-bold">${formatBalance(t.balance)}</td></tr>
                    `).join('') : '<tr><td colspan="8" class="text-center">No transactions found</td></tr>'}
                </tbody>
                ${showTotals && data.agingData.transactions.length > 0 ? `<tfoot><tr class="grand-total-row"><td colspan="5" class="text-end fw-bold">Totals</td><td class="text-end fw-bold">${formatCurrency(totalDebit)}</td><td class="text-end fw-bold">${formatCurrency(totalCredit)}</td><td class="text-end fw-bold">${formatBalance(closingBalance)}</td></tr></tfoot>` : ''}
            </table>
            <script>window.onload=function(){setTimeout(function(){window.print();window.close()},200)}</script>
        </body></html>`;
        printWindow.document.write(printContent);
        printWindow.document.close();
    };

    useEffect(() => {
        if (hasGenerated) {
            setDraftSave({
                ...draftSave,
                dayWiseAgeingData: { ...data, account: selectedAccount, fromDate: dateRange.fromDate, toDate: dateRange.toDate, fromDateAd: dateRange.fromDateAd, toDateAd: dateRange.toDateAd },
                dayWiseAgeingSearch: { showTotals, selectedRowIndex }
            });
        }
    }, [data, selectedAccount, dateRange.fromDate, dateRange.toDate, dateRange.fromDateAd, dateRange.toDateAd, showTotals, selectedRowIndex, hasGenerated]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!data?.agingData?.transactions?.length) return;
            if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
            switch (e.key) {
                case 'ArrowUp': e.preventDefault(); setSelectedRowIndex(prev => Math.max(0, prev - 1)); break;
                case 'ArrowDown': e.preventDefault(); setSelectedRowIndex(prev => Math.min(data.agingData.transactions.length - 1, prev + 1)); break;
                default: break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [data?.agingData?.transactions]);

    useEffect(() => {
        if (tableBodyRef.current && data?.agingData?.transactions?.length > 0) {
            const rows = tableBodyRef.current.querySelectorAll('tr');
            if (rows.length > selectedRowIndex) rows[selectedRowIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [selectedRowIndex, data?.agingData?.transactions]);

    const handleRowClick = (index) => setSelectedRowIndex(index);

    useEffect(() => {
        const handleKeyDown = (e) => { if (e.key === 'F9') { e.preventDefault(); setShowProductModal(prev => !prev); } };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    if (initialLoading) return <Loader />;
    if (error && !hasGenerated) return <div className="dw-page"><Header /><div className="dw-shell"><div className="dw-state"><h3>Error</h3><p>{error}</p></div></div></div>;

    return (
        <div className="dw-page">
            <Header />

            <div className="dw-shell">
                {/* Top Bar */}
                <div className="dw-topbar">
                    <div className="dw-topbar__left">
                        <div className="dw-topbar__icon"><FiFileText /></div>
                        <div><h1>Day Wise Ageing</h1></div>
                    </div>
                    <div className="dw-topbar__actions">
                        <button className="dw-btn-icon" onClick={exportToExcel} disabled={!hasGenerated || exporting}><FiDownload /> {exporting ? '…' : 'Excel'}</button>
                        <button className="dw-btn-icon" onClick={printReport} disabled={!hasGenerated}><FiPrinter /> Print</button>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="dw-toolbar">
                    <div className="dw-field dw-field--account">
                        <label>Account <span className="req">*</span></label>
                        <input type="text" value={selectedAccount ? selectedAccount.name : ''} onClick={() => setShowAccountModal(true)} onFocus={() => setShowAccountModal(true)} readOnly placeholder="Click to select" />
                    </div>

                    <div className="dw-field dw-field--date">
                        <label>From (BS) <span className="req">*</span></label>
                        <input type="text" id="fromDate" ref={fromDateRef} className={dateErrors.fromDate ? 'is-invalid' : ''} value={dateRange.fromDate} onChange={handleFromDateChange} onBlur={handleFromDateBlur} onKeyDown={(e) => handleKeyDown(e, 'fromDateAd')} placeholder="YYYY-MM-DD" autoComplete="off" autoFocus />
                        {dateErrors.fromDate && <div className="dw-field-error">{dateErrors.fromDate}</div>}
                    </div>
                    <div className="dw-field dw-field--date">
                        <label>From (AD)</label>
                        <input type="date" id="fromDateAd" ref={fromDateAdRef} value={dateRange.fromDateAd || ''} onChange={handleFromDateAdChange} onKeyDown={(e) => handleKeyDown(e, 'toDate')} />
                    </div>
                    <div className="dw-field dw-field--date">
                        <label>To (BS) <span className="req">*</span></label>
                        <input type="text" id="toDate" ref={toDateRef} className={dateErrors.toDate ? 'is-invalid' : ''} value={dateRange.toDate} onChange={handleToDateChange} onBlur={handleToDateBlur} onKeyDown={(e) => handleKeyDown(e, 'toDateAd')} placeholder="YYYY-MM-DD" autoComplete="off" />
                        {dateErrors.toDate && <div className="dw-field-error">{dateErrors.toDate}</div>}
                    </div>
                    <div className="dw-field dw-field--date">
                        <label>To (AD)</label>
                        <input type="date" id="toDateAd" ref={toDateAdRef} value={dateRange.toDateAd || ''} onChange={handleToDateAdChange} onKeyDown={(e) => handleKeyDown(e, 'generateReport')} />
                    </div>

                    <button type="button" id="generateReport" ref={generateBtnRef} className="dw-btn-gen" onClick={handleGenerateReport} disabled={loading || !selectedAccount}>
                        {loading ? <span className="spinner-border spinner-border-sm" style={{ width: 12, height: 12 }} /> : <><FiSearch className="me-1" /> Generate</>}
                    </button>

                    <div className="dw-toolbar-divider" />

                    <div className="dw-toggle-item">
                        <span>Totals</span>
                        <input className="form-check-input" type="checkbox" role="switch" checked={showTotals} onChange={() => setShowTotals(!showTotals)} disabled={!hasGenerated} />
                    </div>
                </div>

                {error && <div className="dw-alert"><i className="bi bi-exclamation-circle" />{error}<button type="button" className="btn-close btn-sm ms-auto" onClick={() => setError(null)} /></div>}

                {/* Main Content */}
                <div className="dw-main">
                    {!selectedAccount && !loading ? (
                        <div className="dw-state"><FiUser size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} /><h3>Select an Account</h3><p>Choose an account to view its ageing report.</p></div>
                    ) : !hasGenerated && !loading ? (
                        <div className="dw-state"><FiCalendar size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} /><h3>Select date range & generate</h3><p>Choose a date range and click Generate.</p></div>
                    ) : loading ? (
                        <div className="dw-state"><div className="spinner-border text-primary" /><p>Loading report...</p></div>
                    ) : data?.agingData?.transactions?.length === 0 ? (
                        <div className="dw-state"><FiFileText size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} /><h3>No transactions</h3><p>Only opening balance is shown.</p></div>
                    ) : (
                        <>
                            <div className="dw-main__bar">
                                <span><strong>{selectedAccount?.name}</strong> · {data.agingData.transactions?.length || 0} transactions</span>
                                <span>Opening: <strong>{formatCurrency(Math.abs(data.agingData?.openingBalanceBeforeFromDate || 0))} {data.agingData?.openingBalanceType || (data.agingData?.openingBalanceBeforeFromDate >= 0 ? 'Dr' : 'Cr')}</strong></span>
                            </div>

                            <div className="dw-table-scroll" ref={tableBodyRef}>
                                <table className="dw-table">
                                    <thead>
                                        <tr>
                                            <th>Miti</th><th>Date</th><th>Age</th><th>Vch. No.</th><th>Particulars</th><th className="num">Debit</th><th className="num">Credit</th><th className="num">Balance</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.agingData.transactions.map((transaction, index) => (
                                            <tr key={transaction._id || index} className={selectedRowIndex === index ? 'dw-row-selected' : ''} onClick={() => handleRowClick(index)}>
                                                <td>{transaction.nepaliDate}</td>
                                                <td>{new Date(transaction.date).toLocaleDateString()}</td>
                                                <td>{transaction.age} days</td>
                                                <td>{transaction.referenceNumber}</td>
                                                <td><i className={getTransactionIcon(transaction.type)} /> {getTransactionTypeLabel(transaction.type)}</td>
                                                <td className="num dw-text-red">{formatCurrency(transaction.debit)}</td>
                                                <td className="num dw-text-green">{formatCurrency(transaction.credit)}</td>
                                                <td className="num fw-bold">{formatBalance(transaction.balance)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    {showTotals && data.agingData.transactions.length > 0 && (() => {
                                        let totalDebit = 0, totalCredit = 0, closingBalance = 0;
                                        data.agingData.transactions.forEach(t => { totalDebit += t.debit || 0; totalCredit += t.credit || 0; closingBalance = t.balance; });
                                        return (
                                            <tfoot>
                                                <tr className="dw-row-total"><td colSpan="5">Totals</td>
                                                    <td className="num">{formatCurrency(totalDebit)}</td>
                                                    <td className="num">{formatCurrency(totalCredit)}</td>
                                                    <td className="num fw-bold">{formatBalance(closingBalance)}</td>
                                                </tr>
                                            </tfoot>
                                        );
                                    })()}
                                </table>
                            </div>

                            {/* Aging Summary Chips */}
                            <div className="dw-chips">
                                {getAgingSummary().map((item, idx) => (
                                    <div key={idx} className="dw-chip dw-chip--blue">
                                        <span className="dw-chip__label">{item.range}</span>
                                        <span className={`dw-chip__val dw-chip__val--${item.variant}`}>{item.count}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Account Selection Modal */}
            {/* {showAccountModal && (
                <div className="dw-modal-overlay" onClick={() => setShowAccountModal(false)}>
                    <div className="dw-modal dw-modal--xl" onClick={e => e.stopPropagation()}>
                        <div className="dw-modal-header">
                            <h5>Select Account</h5>
                            <small className="ms-auto text-muted" style={{ fontSize: '0.65rem' }}>{totalAccounts > 0 ? `${accounts.length} of ${totalAccounts}` : 'Loading…'}</small>
                            <button type="button" className="btn-close" onClick={() => { setShowAccountModal(false); setTimeout(() => document.getElementById(getFocusTargetOnModalClose())?.focus(), 50); }} />
                        </div>
                        <div className="dw-modal-body">
                            <input type="text" id="searchAccount" className="dw-search-input" placeholder="Search Account..." autoFocus autoComplete='off' value={accountSearchQuery} onChange={handleAccountSearch} onKeyDown={(e) => {
                                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); const first = document.querySelector('.account-item'); if (first) first.focus(); }
                                else if (e.key === 'Enter') { e.preventDefault(); const active = document.querySelector('.account-item.active'); if (active) { const account = accounts.find(a => a.id === active.getAttribute('data-account-id')); if (account) selectAccount(account); } else { setShowAccountModal(false); setTimeout(() => document.getElementById(getFocusTargetOnModalClose())?.focus(), 50); } }
                            }} ref={accountSearchRef} />
                            <div style={{ height: '300px', marginTop: '0.5rem' }}>
                                <VirtualizedAccountList accounts={accounts} onAccountClick={selectAccount} searchRef={accountSearchRef} hasMore={hasMoreAccountResults} isSearching={isAccountSearching} onLoadMore={loadMoreAccounts} totalAccounts={totalAccounts} page={accountSearchPage} searchQuery={accountShouldShowLastSearchResults ? accountLastSearchQuery : accountSearchQuery} />
                            </div>
                        </div>
                    </div>
                </div>
            )} */}

            {showAccountModal && (
                <AccountModalForPaymentReceipt
                    show={showAccountModal}
                    onClose={() => {
                        setShowAccountModal(false);
                        // Focus back to the fromDate field after closing
                        setTimeout(() => {
                            const fromDateInput = document.getElementById('fromDate');
                            if (fromDateInput) fromDateInput.focus();
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
                        // Handle creating new account
                        setShowAccountModal(false);
                        // Open account creation in new tab
                        window.open('/retailer/accounts', '_blank');
                        // Or navigate to accounts page
                        // navigate('/retailer/accounts');
                    }}
                    selectedAccountId={selectedAccountId}
                />
            )}

            {showProductModal && <ProductModal onClose={() => setShowProductModal(false)} />}
            <NotificationToast show={notification.show} message={notification.message} type={notification.type} duration={notification.duration} onClose={() => setNotification({ ...notification, show: false })} />
        </div>
    );
};

export default DayWiseAgeing;