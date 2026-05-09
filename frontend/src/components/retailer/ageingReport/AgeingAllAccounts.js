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

const AgeingReportAllAccounts = () => {
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
        if (draftSave?.ageingReportData) {
            return {
                asOnDate: draftSave.ageingReportData.asOnDate || '',
                asOnDateAd: draftSave.ageingReportData.asOnDateAd || ''
            };
        }
        return {
            asOnDate: '',
            asOnDateAd: ''
        };
    });

    const [data, setData] = useState(() => {
        if (draftSave?.ageingReportData) {
            return {
                report: draftSave.ageingReportData.report || [],
                receivableTotals: draftSave.ageingReportData.receivableTotals || { '0-30': 0, '30-60': 0, '60-90': 0, '90-120': 0, '120-150': 0, 'over-150': 0, total: 0 },
                payableTotals: draftSave.ageingReportData.payableTotals || { '0-30': 0, '30-60': 0, '60-90': 0, '90-120': 0, '120-150': 0, 'over-150': 0, total: 0 },
                netTotals: draftSave.ageingReportData.netTotals || { '0-30': 0, '30-60': 0, '60-90': 0, '90-120': 0, '120-150': 0, 'over-150': 0, total: 0 },
                company: draftSave.ageingReportData.company,
                currentFiscalYear: draftSave.ageingReportData.currentFiscalYear,
                initialFiscalYear: draftSave.ageingReportData.initialFiscalYear,
                currentCompanyName: draftSave.ageingReportData.currentCompanyName || ''
            };
        }
        return {
            report: [],
            receivableTotals: { '0-30': 0, '30-60': 0, '60-90': 0, '90-120': 0, '120-150': 0, 'over-150': 0, total: 0 },
            payableTotals: { '0-30': 0, '30-60': 0, '60-90': 0, '90-120': 0, '120-150': 0, 'over-150': 0, total: 0 },
            netTotals: { '0-30': 0, '30-60': 0, '60-90': 0, '90-120': 0, '120-150': 0, 'over-150': 0, total: 0 },
            company: null,
            currentFiscalYear: null,
            initialFiscalYear: null,
            currentCompanyName: ''
        };
    });

    const [searchQuery, setSearchQuery] = useState(() => {
        if (draftSave?.ageingReportSearch) {
            return draftSave.ageingReportSearch.searchQuery || '';
        }
        return '';
    });

    const [typeFilter, setTypeFilter] = useState(() => {
        if (draftSave?.ageingReportSearch) {
            return draftSave.ageingReportSearch.typeFilter || 'all';
        }
        return 'all';
    });

    const [currentPage, setCurrentPage] = useState(() => {
        if (draftSave?.ageingReportSearch) {
            return draftSave.ageingReportSearch.currentPage || 1;
        }
        return 1;
    });

    const [itemsPerPage, setItemsPerPage] = useState(() => {
        if (draftSave?.ageingReportSearch) {
            return draftSave.ageingReportSearch.itemsPerPage || 10;
        }
        return 10;
    });

    const [sortConfig, setSortConfig] = useState(() => {
        if (draftSave?.ageingReportSearch) {
            return draftSave.ageingReportSearch.sortConfig || { key: 'accountName', direction: 'ascending' };
        }
        return { key: 'accountName', direction: 'ascending' };
    });

    const [showTotals, setShowTotals] = useState(() => {
        if (draftSave?.ageingReportSearch) {
            return draftSave.ageingReportSearch.showTotals !== undefined ? draftSave.ageingReportSearch.showTotals : true;
        }
        return true;
    });

    const [dateError, setDateError] = useState('');
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [error, setError] = useState(null);
    const [hasGenerated, setHasGenerated] = useState(false);
    const [exporting, setExporting] = useState(false);

    const [notification, setNotification] = useState({
        show: false,
        message: '',
        type: 'success',
        duration: 3000
    });

    const navigate = useNavigate();
    const searchInputRef = useRef(null);
    const asOnDateRef = useRef(null);
    const asOnDateAdRef = useRef(null);
    const generateBtnRef = useRef(null);
    const abortControllerRef = useRef(null);
    const tableBodyRef = useRef(null);

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

    const mapBuckets = useCallback((bucketData) => {
        if (!bucketData) return { '0-30': 0, '30-60': 0, '60-90': 0, '90-120': 0, '120-150': 0, 'over-150': 0, total: 0 };
        return {
            '0-30': Number(bucketData.range0To30) || 0,
            '30-60': Number(bucketData.range30To60) || 0,
            '60-90': Number(bucketData.range60To90) || 0,
            '90-120': Number(bucketData.range90To120) || 0,
            '120-150': Number(bucketData.range120To150) || 0,
            'over-150': Number(bucketData.over150) || 0,
            total: Number(bucketData.total) || 0
        };
    }, []);

    // Fetch company info
    useEffect(() => {
        const fetchCompanyInfo = async () => {
            try {
                setInitialLoading(true);
                const response = await api.get('/api/retailer/ageing-report/all-accounts');
                if (response.data.success) {
                    const responseData = response.data.data;
                    const dateFormat = responseData.companyDateFormat || 'english';
                    const isNepaliFormat = dateFormat === 'nepali';

                    setCompany({
                        dateFormat: dateFormat,
                        vatEnabled: responseData.company?.vatEnabled !== false,
                        fiscalYear: responseData.currentFiscalYear || {},
                        isVatExempt: responseData.company?.isVatExempt || false
                    });

                    const hasDraftDates = draftSave?.ageingReportData?.asOnDate;

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
                    }
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

    const fetchAgeingData = useCallback(async () => {
        if (!dateRange.asOnDate) {
            setDateError('Please enter a date');
            asOnDateRef.current?.focus();
            return;
        }

        if (company.dateFormat === 'nepali') {
            if (!isValidNepaliDate(dateRange.asOnDate)) {
                setDateError('Invalid date format');
                asOnDateRef.current?.focus();
                return;
            }
        }

        if (abortControllerRef.current) abortControllerRef.current.abort();
        abortControllerRef.current = new AbortController();

        try {
            setLoading(true);
            setError(null);
            // Use AD date for API call
            const asOnDateParam = dateRange.asOnDateAd || dateRange.asOnDate;
            const url = `/api/retailer/ageing-report/all-accounts${asOnDateParam ? `?asOnDate=${encodeURIComponent(asOnDateParam)}` : ''}`;
            const response = await api.get(url, { signal: abortControllerRef.current.signal });

            if (response.data.success) {
                const responseData = response.data.data;
                setData({
                    report: (responseData.report || []).map(account => ({
                        accountName: account.accountName,
                        buckets: mapBuckets(account.buckets),
                        isReceivable: account.isReceivable,
                        netBalance: Number(account.netBalance) || 0,
                        openingBalance: Number(account.openingBalance) || 0
                    })),
                    receivableTotals: mapBuckets(responseData.receivableTotals),
                    payableTotals: mapBuckets(responseData.payableTotals),
                    netTotals: mapBuckets(responseData.netTotals),
                    company: responseData.company,
                    currentFiscalYear: responseData.currentFiscalYear,
                    initialFiscalYear: responseData.initialFiscalYear,
                    currentCompanyName: responseData.currentCompanyName || ''
                });
                if (responseData.companyDateFormat) {
                    setCompany(prev => ({ ...prev, dateFormat: responseData.companyDateFormat }));
                }
                setHasGenerated(true);
                setNotification({ show: true, message: 'Report generated successfully!', type: 'success', duration: 3000 });
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
    }, [api, mapBuckets, dateRange.asOnDate, dateRange.asOnDateAd, company.dateFormat]);

    const handleGenerateReport = () => {
        if (!dateRange.asOnDate) {
            setDateError('Please enter a date');
            asOnDateRef.current?.focus();
            return;
        }
        if (company.dateFormat === 'nepali' && !isValidNepaliDate(dateRange.asOnDate)) {
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
        if (company.dateFormat === 'nepali') {
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

    const formatCurrency = useCallback((num) => {
        if (num === undefined || num === null) return '0.00';
        const number = Math.abs(typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num));
        if (isNaN(number)) return '0.00';
        return number.toLocaleString(company.dateFormat === 'nepali' ? 'en-IN' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }, [company.dateFormat]);

    const filteredAndSortedReport = useMemo(() => {
        if (!data.report.length) return [];
        let filtered = data.report.filter(account => {
            const typeMatches = typeFilter === 'all' || (typeFilter === 'receivable' && account.isReceivable) || (typeFilter === 'payable' && !account.isReceivable);
            const searchMatches = searchQuery === '' || account.accountName.toLowerCase().includes(searchQuery.toLowerCase());
            return typeMatches && searchMatches && Math.abs(account.netBalance) > 0.01;
        });
        return [...filtered].sort((a, b) => {
            if (sortConfig.key === 'accountName') {
                return sortConfig.direction === 'ascending' ? a.accountName.localeCompare(b.accountName) : b.accountName.localeCompare(a.accountName);
            }
            let aVal = sortConfig.key === 'type' ? (a.isReceivable ? 'receivable' : 'payable') : (sortConfig.key === 'netBalance' ? a.netBalance : a.buckets[sortConfig.key] || 0);
            let bVal = sortConfig.key === 'type' ? (b.isReceivable ? 'receivable' : 'payable') : (sortConfig.key === 'netBalance' ? b.netBalance : b.buckets[sortConfig.key] || 0);
            return sortConfig.direction === 'ascending' ? (aVal < bVal ? -1 : 1) : (aVal > bVal ? -1 : 1);
        });
    }, [data.report, typeFilter, searchQuery, sortConfig]);

    const currentPageItems = useMemo(() => {
        if (itemsPerPage === 'all') return filteredAndSortedReport;
        return filteredAndSortedReport.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    }, [filteredAndSortedReport, itemsPerPage, currentPage]);

    const totalPages = Math.ceil(filteredAndSortedReport.length / (itemsPerPage === 'all' ? 1 : itemsPerPage));

    // Save to draft
    useEffect(() => {
        if (hasGenerated) {
            setDraftSave({
                ...draftSave,
                ageingReportData: {
                    ...data,
                    asOnDate: dateRange.asOnDate,
                    asOnDateAd: dateRange.asOnDateAd
                },
                ageingReportSearch: {
                    searchQuery,
                    typeFilter,
                    currentPage,
                    itemsPerPage,
                    sortConfig,
                    showTotals
                }
            });
        }
    }, [data, searchQuery, typeFilter, currentPage, itemsPerPage, sortConfig, showTotals, dateRange.asOnDate, dateRange.asOnDateAd, hasGenerated]);

    useEffect(() => { setCurrentPage(1); }, [searchQuery, typeFilter, sortConfig]);

    const sortItems = (key) => setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'ascending' ? 'descending' : 'ascending' }));
    const getSortIndicator = (key) => sortConfig.key === key ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : '';

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
        if (!hasGenerated || !filteredAndSortedReport.length) {
            setNotification({ show: true, message: 'Please generate the report first', type: 'warning', duration: 3000 });
            return;
        }
        setExporting(true);
        try {
            const excelData = filteredAndSortedReport.map((acc, i) => ({
                '#': i + 1, 'Account Name': acc.accountName, 'Type': acc.isReceivable ? 'Receivable' : 'Payable',
                '0-30 Days': formatCurrency(acc.buckets['0-30']), '31-60 Days': formatCurrency(acc.buckets['30-60']),
                '61-90 Days': formatCurrency(acc.buckets['60-90']), '91-120 Days': formatCurrency(acc.buckets['90-120']),
                'Over 120 Days': formatCurrency(acc.buckets['over-120']), 'Closing': formatCurrency(acc.netBalance)
            }));

            // Calculate totals for filtered data
            const filteredReceivableTotals = { '0-30': 0, '30-60': 0, '60-90': 0, '90-120': 0, 'over-120': 0, total: 0 };
            const filteredPayableTotals = { '0-30': 0, '30-60': 0, '60-90': 0, '90-120': 0, 'over-120': 0, total: 0 };
            const filteredNetTotals = { '0-30': 0, '30-60': 0, '60-90': 0, '90-120': 0, 'over-120': 0, total: 0 };

            filteredAndSortedReport.forEach(acc => {
                Object.keys(acc.buckets).forEach(key => {
                    if (key !== 'total') {
                        if (acc.isReceivable) {
                            filteredReceivableTotals[key] += acc.buckets[key];
                            filteredNetTotals[key] += acc.buckets[key];
                        } else {
                            const absVal = Math.abs(acc.buckets[key]);
                            filteredPayableTotals[key] += absVal;
                            filteredNetTotals[key] -= absVal;
                        }
                    }
                });
                if (acc.isReceivable) {
                    filteredReceivableTotals.total += acc.buckets.total;
                    filteredNetTotals.total += acc.buckets.total;
                } else {
                    filteredPayableTotals.total += Math.abs(acc.buckets.total);
                    filteredNetTotals.total -= Math.abs(acc.buckets.total);
                }
            });

            excelData.push({}, { 'Account Name': 'TOTAL RECEIVABLES', '0-30 Days': formatCurrency(filteredReceivableTotals['0-30']), '31-60 Days': formatCurrency(filteredReceivableTotals['30-60']), '61-90 Days': formatCurrency(filteredReceivableTotals['60-90']), '91-120 Days': formatCurrency(filteredReceivableTotals['90-120']), 'Over 120 Days': formatCurrency(filteredReceivableTotals['over-120']), 'Closing': formatCurrency(filteredReceivableTotals.total) });
            excelData.push({ 'Account Name': 'TOTAL PAYABLES', '0-30 Days': formatCurrency(filteredPayableTotals['0-30']), '31-60 Days': formatCurrency(filteredPayableTotals['30-60']), '61-90 Days': formatCurrency(filteredPayableTotals['60-90']), '91-120 Days': formatCurrency(filteredPayableTotals['90-120']), 'Over 120 Days': formatCurrency(filteredPayableTotals['over-120']), 'Closing': formatCurrency(filteredPayableTotals.total) });
            excelData.push({ 'Account Name': 'NET TOTAL', '0-30 Days': formatCurrency(filteredNetTotals['0-30']), '31-60 Days': formatCurrency(filteredNetTotals['30-60']), '61-90 Days': formatCurrency(filteredNetTotals['60-90']), '91-120 Days': formatCurrency(filteredNetTotals['90-120']), 'Over 120 Days': formatCurrency(filteredNetTotals['over-120']), 'Closing': formatCurrency(filteredNetTotals.total) });

            const ws = XLSX.utils.json_to_sheet(excelData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Ageing Report');
            XLSX.writeFile(wb, `Ageing_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
            setNotification({ show: true, message: 'Excel file exported successfully!', type: 'success', duration: 3000 });
        } catch (err) {
            setNotification({ show: true, message: 'Failed to export data', type: 'error', duration: 3000 });
        } finally { setExporting(false); }
    };

    // const printReport = () => {
    //     if (!hasGenerated || !filteredAndSortedReport.length) {
    //         setNotification({ show: true, message: 'Please generate the report first', type: 'warning', duration: 3000 });
    //         return;
    //     }

    //     // Calculate totals for filtered data
    //     const filteredReceivableTotals = { '0-30': 0, '30-60': 0, '60-90': 0, '90-120': 0, 'over-120': 0, total: 0 };
    //     const filteredPayableTotals = { '0-30': 0, '30-60': 0, '60-90': 0, '90-120': 0, 'over-120': 0, total: 0 };
    //     const filteredNetTotals = { '0-30': 0, '30-60': 0, '60-90': 0, '90-120': 0, 'over-120': 0, total: 0 };

    //     filteredAndSortedReport.forEach(acc => {
    //         Object.keys(acc.buckets).forEach(key => {
    //             if (key !== 'total') {
    //                 if (acc.isReceivable) {
    //                     filteredReceivableTotals[key] += acc.buckets[key];
    //                     filteredNetTotals[key] += acc.buckets[key];
    //                 } else {
    //                     const absVal = Math.abs(acc.buckets[key]);
    //                     filteredPayableTotals[key] += absVal;
    //                     filteredNetTotals[key] -= absVal;
    //                 }
    //             }
    //         });
    //         if (acc.isReceivable) {
    //             filteredReceivableTotals.total += acc.buckets.total;
    //             filteredNetTotals.total += acc.buckets.total;
    //         } else {
    //             filteredPayableTotals.total += Math.abs(acc.buckets.total);
    //             filteredNetTotals.total -= Math.abs(acc.buckets.total);
    //         }
    //     });

    //     const printWindow = window.open('', '_blank');
    //     printWindow.document.write(`
    //     <!DOCTYPE html>
    //     <html>
    //     <head>
    //         <title>Ageing Report</title>
    //         <meta charset="UTF-8">
    //         <style>
    //             @page {
    //                 margin: 3mm;
    //             }
    //             body { 
    //                 font-family: Arial, sans-serif; 
    //                 font-size: 7px; 
    //                 margin: 0;
    //                 padding: 2mm;
    //             }
    //             table { 
    //                 width: 100%; 
    //                 border-collapse: collapse; 
    //                 page-break-inside: auto;
    //                 font-size: 6px;
    //             }
    //             tr { 
    //                 page-break-inside: avoid; 
    //                 page-break-after: auto; 
    //             }
    //             th, td { 
    //                 border: 1px solid #000; 
    //                 padding: 2px 3px; 
    //                 text-align: left; 
    //                 white-space: nowrap;
    //             }
    //             th { 
    //                 background-color: #f2f2f2 !important; 
    //                 -webkit-print-color-adjust: exact;
    //                 font-size: 10px;
    //                 font-weight: bold;
    //                 padding: 3px 3px;
    //             }
    //             td {
    //                 font-size: 8px;
    //                 padding: 2px 3px;
    //             }
    //             .print-header { 
    //                 text-align: center; 
    //                 margin-bottom: 5px; 
    //             }
    //             .nowrap {
    //                 white-space: nowrap;
    //             }
    //             h1 {
    //                 font-size: 14px;
    //                 margin: 0;
    //             }
    //             .report-title {
    //                 text-align: center;
    //                 text-decoration: underline;
    //                 font-size: 11px;
    //                 font-weight: bold;
    //                 margin: 3px 0;
    //             }
    //             .text-end {
    //                 text-align: right;
    //             }
    //             .receivable-row {
    //                 background-color: #e6f7ff;
    //             }
    //             .payable-row {
    //                 background-color: #fff7e6;
    //             }
    //             .total-row {
    //                 background-color: #e6e6e6;
    //                 font-weight: bold;
    //             }
    //             .net-total {
    //                 background-color: #f0f0f0;
    //                 font-weight: bold;
    //             }
    //             .grand-total-row td {
    //                 font-weight: bold;
    //                 border-top: 2px solid #000;
    //                 font-size: 7px;
    //             }
    //             .print-footer {
    //                 margin-top: 5px;
    //                 text-align: right;
    //                 font-size: 7px;
    //             }
    //         </style>
    //     </head>
    //     <body>
    //         <div class="print-header">
    //             <h1>${data.currentCompanyName || 'Company Name'}</h1>
    //             <p style="font-size: 8px; margin: 2px 0;">
    //                 ${data.company?.address || ''}${data.company?.city ? ', ' + data.company.city : ''},
    //                 PAN: ${data.company?.pan || ''}<br>
    //             </p>
    //             <hr style="margin: 2px 0;">
    //         </div>

    //         <div class="report-title">Ageing Report</div>

    //         <div style="display: flex; justify-content: space-between; align-items: center; margin: 5px 0; padding: 2px 0; font-size: 8px; border-top: 1px solid #000; border-bottom: 1px solid #000;">
    //             <div style="flex: 1; text-align: center;">
    //                 <strong>As on Date (BS):</strong> ${dateRange.asOnDate}
    //             </div>
    //             <div style="flex: 1; text-align: center;">
    //                 <strong>F.Y:</strong> ${data.currentFiscalYear?.name || 'N/A'}
    //             </div>
    //             <div style="flex: 1; text-align: center;">
    //                 <strong>Total Accounts:</strong> ${filteredAndSortedReport.length}
    //             </div>
    //             ${searchQuery ? `<div style="flex: 1; text-align: center;"><strong>Search:</strong> "${searchQuery}"</div>` : ''}
    //         </div>

    //         <table>
    //             <thead>
    //                 <tr>
    //                     <th class="nowrap">#</th>
    //                     <th class="nowrap">Account</th>
    //                     <th class="nowrap">Type</th>
    //                     <th class="nowrap text-end">0-30</th>
    //                     <th class="nowrap text-end">31-60</th>
    //                     <th class="nowrap text-end">61-90</th>
    //                     <th class="nowrap text-end">91-120</th>
    //                     <th class="nowrap text-end">120-150</th>
    //                     <th class="nowrap text-end">Over 150</th>
    //                     <th class="nowrap text-end">Closing</th>
    //                 </tr>
    //             </thead>
    //             <tbody>
    //                 ${filteredAndSortedReport.map((acc, i) => `
    //                     <tr class="${acc.isReceivable ? 'receivable-row' : 'payable-row'}">
    //                         <td class="nowrap">${i + 1}</td>
    //                         <td class="nowrap">${acc.accountName}</td>
    //                         <td class="nowrap">${acc.isReceivable ? 'Receivable' : 'Payable'}</td>
    //                         <td class="nowrap text-end">${formatCurrency(acc.buckets['0-30'])}</td>
    //                         <td class="nowrap text-end">${formatCurrency(acc.buckets['30-60'])}</td>
    //                         <td class="nowrap text-end">${formatCurrency(acc.buckets['60-90'])}</td>
    //                         <td class="nowrap text-end">${formatCurrency(acc.buckets['90-120'])}</td>
    //                         <td class="nowrap text-end">${formatCurrency(acc.buckets['120-150'])}</td>
    //                         <td class="nowrap text-end">${formatCurrency(acc.buckets['over-150'])}</td>
    //                         <td class="nowrap text-end">${formatCurrency(acc.netBalance)}</td>
    //                     </tr>
    //                 `).join('')}
    //             </tbody>
    //             ${showTotals ? `
    //             <tfoot>
    //                 <tr class="total-row">
    //                     <td colspan="3" class="nowrap">Total Receivables</td>
    //                     <td class="nowrap text-end">${formatCurrency(filteredReceivableTotals['0-30'])}</td>
    //                     <td class="nowrap text-end">${formatCurrency(filteredReceivableTotals['30-60'])}</td>
    //                     <td class="nowrap text-end">${formatCurrency(filteredReceivableTotals['60-90'])}</td>
    //                     <td class="nowrap text-end">${formatCurrency(filteredReceivableTotals['90-120'])}</td>
    //                     <td class="nowrap text-end">${formatCurrency(filteredReceivableTotals['120-150'])}</td>
    //                     <td class="nowrap text-end">${formatCurrency(filteredReceivableTotals['over-150'])}</td>
    //                     <td class="nowrap text-end">${formatCurrency(filteredReceivableTotals.total)}</td>
    //                 </tr>
    //                 <tr class="total-row">
    //                     <td colspan="3" class="nowrap">Total Payables</td>
    //                     <td class="nowrap text-end">${formatCurrency(filteredPayableTotals['0-30'])}</td>
    //                     <td class="nowrap text-end">${formatCurrency(filteredPayableTotals['30-60'])}</td>
    //                     <td class="nowrap text-end">${formatCurrency(filteredPayableTotals['60-90'])}</td>
    //                     <td class="nowrap text-end">${formatCurrency(filteredPayableTotals['90-120'])}</td>
    //                     <td class="nowrap text-end">${formatCurrency(filteredPayableTotals['120-150'])}</td>
    //                     <td class="nowrap text-end">${formatCurrency(filteredPayableTotals['over-150'])}</td>
    //                     <td class="nowrap text-end">${formatCurrency(filteredPayableTotals.total)}</td>
    //                 </tr>
    //                 <tr class="net-total">
    //                     <td colspan="3" class="nowrap">Net Total</td>
    //                     <td class="nowrap text-end">${formatCurrency(filteredNetTotals['0-30'])}</td>
    //                     <td class="nowrap text-end">${formatCurrency(filteredNetTotals['30-60'])}</td>
    //                     <td class="nowrap text-end">${formatCurrency(filteredNetTotals['60-90'])}</td>
    //                     <td class="nowrap text-end">${formatCurrency(filteredNetTotals['90-120'])}</td>
    //                     <td class="nowrap text-end">${formatCurrency(filteredNetTotals['120-150'])}</td>
    //                     <td class="nowrap text-end">${formatCurrency(filteredNetTotals['over-150'])}</td>
    //                 </tr>
    //                 </tr>
    //             </tfoot>
    //             ` : ''}
    //         </table>

    //         <script>
    //             window.onload = function() {
    //                 setTimeout(function() {
    //                     window.print();
    //                     window.close();
    //                 }, 200);
    //             };
    //         <\/script>
    //     </body>
    //     </html>
    // `);
    //     printWindow.document.close();
    // };

    const printReport = () => {
        if (!hasGenerated || !filteredAndSortedReport.length) {
            setNotification({ show: true, message: 'Please generate the report first', type: 'warning', duration: 3000 });
            return;
        }

        // Calculate totals for filtered data
        const filteredReceivableTotals = { '0-30': 0, '30-60': 0, '60-90': 0, '90-120': 0, '120-150': 0, 'over-150': 0, total: 0 };
        const filteredPayableTotals = { '0-30': 0, '30-60': 0, '60-90': 0, '90-120': 0, '120-150': 0, 'over-150': 0, total: 0 };
        const filteredNetTotals = { '0-30': 0, '30-60': 0, '60-90': 0, '90-120': 0, '120-150': 0, 'over-150': 0, total: 0 };

        filteredAndSortedReport.forEach(acc => {
            Object.keys(acc.buckets).forEach(key => {
                if (key !== 'total') {
                    if (acc.isReceivable) {
                        filteredReceivableTotals[key] += acc.buckets[key];
                        filteredNetTotals[key] += acc.buckets[key];
                    } else {
                        const absVal = Math.abs(acc.buckets[key]);
                        filteredPayableTotals[key] += absVal;
                        filteredNetTotals[key] -= absVal;
                    }
                }
            });
            if (acc.isReceivable) {
                filteredReceivableTotals.total += acc.buckets.total;
                filteredNetTotals.total += acc.buckets.total;
            } else {
                filteredPayableTotals.total += Math.abs(acc.buckets.total);
                filteredNetTotals.total -= Math.abs(acc.buckets.total);
            }
        });

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            setNotification({ show: true, message: 'Popup blocked. Please allow popups for this site.', type: 'error', duration: 3000 });
            return;
        }

        // Format currency for printing
        const formatPrintCurrency = (num) => {
            if (num === undefined || num === null) return '0.00';
            const number = Math.abs(typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num));
            if (isNaN(number)) return '0.00';
            return number.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        };

        // Generate table rows HTML
        const generateTableRows = () => {
            let rows = '';
            filteredAndSortedReport.forEach((acc, i) => {
                rows += `
                <tr class="${acc.isReceivable ? 'receivable-row' : 'payable-row'}">
                    <td class="text-center">${i + 1}</td>
                    <td>${escapeHtml(acc.accountName)}</td>
                    <td class="text-center">${acc.isReceivable ? 'Receivable' : 'Payable'}</td>
                    <td class="text-end">${formatPrintCurrency(acc.buckets['0-30'])}</td>
                    <td class="text-end">${formatPrintCurrency(acc.buckets['30-60'])}</td>
                    <td class="text-end">${formatPrintCurrency(acc.buckets['60-90'])}</td>
                    <td class="text-end">${formatPrintCurrency(acc.buckets['90-120'])}</td>
                    <td class="text-end">${formatPrintCurrency(acc.buckets['120-150'])}</td>
                    <td class="text-end">${formatPrintCurrency(acc.buckets['over-150'])}</td>
                    <td class="text-end fw-bold">${formatPrintCurrency(acc.netBalance)}</td>
                </tr>
            `;
            });
            return rows;
        };

        // Escape HTML to prevent XSS
        const escapeHtml = (text) => {
            if (!text) return '';
            return text
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        };

        const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Ageing Report - ${escapeHtml(data.currentCompanyName || 'Company Name')}</title>
            <meta charset="UTF-8">
            <style>
                @page {
                    margin: 10mm;
                    size: A4 landscape;
                }
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                body { 
                    font-family: Arial, Helvetica, sans-serif; 
                    font-size: 9px; 
                    margin: 0;
                    padding: 5mm;
                }
                .print-header { 
                    text-align: center; 
                    margin-bottom: 10px;
                }
                .print-header h1 {
                    font-size: 16px;
                    margin: 0;
                    font-weight: bold;
                }
                .print-header p {
                    font-size: 9px;
                    margin: 2px 0;
                }
                .print-header hr {
                    margin: 5px 0;
                }
                .report-title {
                    text-align: center;
                    text-decoration: underline;
                    font-size: 12px;
                    font-weight: bold;
                    margin: 5px 0;
                }
                .report-info {
                    display: flex;
                    justify-content: space-between;
                    margin: 8px 0;
                    padding: 5px;
                    background: #f5f5f5;
                    border: 1px solid #ddd;
                    font-size: 8px;
                }
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    page-break-inside: auto;
                    font-size: 8px;
                }
                tr { 
                    page-break-inside: avoid; 
                    page-break-after: auto; 
                }
                th, td { 
                    border: 1px solid #000; 
                    padding: 4px 6px; 
                    text-align: left; 
                }
                th { 
                    background-color: #e6e6e6 !important; 
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                    font-size: 9px;
                    font-weight: bold;
                }
                .text-end {
                    text-align: right;
                }
                .text-center {
                    text-align: center;
                }
                .receivable-row {
                    background-color: #e6f7ff;
                }
                .payable-row {
                    background-color: #fff7e6;
                }
                .total-row {
                    background-color: #e6e6e6;
                    font-weight: bold;
                }
                .net-total {
                    background-color: #d9ead3;
                    font-weight: bold;
                }
                .print-footer {
                    margin-top: 10px;
                    font-size: 7px;
                    text-align: center;
                    border-top: 1px solid #ccc;
                    padding-top: 5px;
                }
            </style>
        </head>
        <body>
            <div class="print-header">
                <h1>${escapeHtml(data.currentCompanyName || 'Company Name')}</h1>
                <p>
                    ${escapeHtml(data.company?.address || '')}${data.company?.city ? ', ' + escapeHtml(data.company.city) : ''}<br>
                    PAN: ${escapeHtml(data.company?.pan || '')} | Phone: ${escapeHtml(data.company?.phone || '')}
                </p>
                <hr>
            </div>
            
            <div class="report-title">Ageing Report</div>
            
            <div class="report-info">
                <div><strong>As on Date (BS):</strong> ${escapeHtml(dateRange.asOnDate || '')}</div>
                <div><strong>As on Date (AD):</strong> ${escapeHtml(dateRange.asOnDateAd || '')}</div>
                <div><strong>Fiscal Year:</strong> ${escapeHtml(data.currentFiscalYear?.name || 'N/A')}</div>
                <div><strong>Total Accounts:</strong> ${filteredAndSortedReport.length}</div>
                ${searchQuery ? `<div><strong>Search:</strong> "${escapeHtml(searchQuery)}"</div>` : ''}
                ${typeFilter !== 'all' ? `<div><strong>Filter:</strong> ${typeFilter === 'receivable' ? 'Receivable Only' : 'Payable Only'}</div>` : ''}
            </div>
            
            <table cellspacing="0">
                <thead>
                    <tr>
                        <th class="text-center" style="width: 40px;">#</th>
                        <th>Account Name</th>
                        <th class="text-center" style="width: 80px;">Type</th>
                        <th class="text-end" style="width: 70px;">0-30</th>
                        <th class="text-end" style="width: 70px;">31-60</th>
                        <th class="text-end" style="width: 70px;">61-90</th>
                        <th class="text-end" style="width: 70px;">91-120</th>
                        <th class="text-end" style="width: 70px;">121-150</th>
                        <th class="text-end" style="width: 70px;">Over 150</th>
                        <th class="text-end" style="width: 80px;">Closing</th>
                    </tr>
                </thead>
                <tbody>
                    ${generateTableRows()}
                </tbody>
                ${showTotals ? `
                <tfoot>
                    <tr class="total-row">
                        <td colspan="3" class="fw-bold">Total Receivables</td>
                        <td class="text-end">${formatPrintCurrency(filteredReceivableTotals['0-30'])}</td>
                        <td class="text-end">${formatPrintCurrency(filteredReceivableTotals['30-60'])}</td>
                        <td class="text-end">${formatPrintCurrency(filteredReceivableTotals['60-90'])}</td>
                        <td class="text-end">${formatPrintCurrency(filteredReceivableTotals['90-120'])}</td>
                        <td class="text-end">${formatPrintCurrency(filteredReceivableTotals['120-150'])}</td>
                        <td class="text-end">${formatPrintCurrency(filteredReceivableTotals['over-150'])}</td>
                        <td class="text-end fw-bold">${formatPrintCurrency(filteredReceivableTotals.total)}</td>
                    </tr>
                    <tr class="total-row">
                        <td colspan="3" class="fw-bold">Total Payables</td>
                        <td class="text-end">${formatPrintCurrency(filteredPayableTotals['0-30'])}</td>
                        <td class="text-end">${formatPrintCurrency(filteredPayableTotals['30-60'])}</td>
                        <td class="text-end">${formatPrintCurrency(filteredPayableTotals['60-90'])}</td>
                        <td class="text-end">${formatPrintCurrency(filteredPayableTotals['90-120'])}</td>
                        <td class="text-end">${formatPrintCurrency(filteredPayableTotals['120-150'])}</td>
                        <td class="text-end">${formatPrintCurrency(filteredPayableTotals['over-150'])}</td>
                        <td class="text-end fw-bold">${formatPrintCurrency(filteredPayableTotals.total)}</td>
                    </tr>
                    <tr class="net-total">
                        <td colspan="3" class="fw-bold">Net Total (Receivable - Payable)</td>
                        <td class="text-end">${formatPrintCurrency(filteredNetTotals['0-30'])}</td>
                        <td class="text-end">${formatPrintCurrency(filteredNetTotals['30-60'])}</td>
                        <td class="text-end">${formatPrintCurrency(filteredNetTotals['60-90'])}</td>
                        <td class="text-end">${formatPrintCurrency(filteredNetTotals['90-120'])}</td>
                        <td class="text-end">${formatPrintCurrency(filteredNetTotals['120-150'])}</td>
                        <td class="text-end">${formatPrintCurrency(filteredNetTotals['over-150'])}</td>
                        <td class="text-end fw-bold">${formatPrintCurrency(filteredNetTotals.total)}</td>
                    </tr>
                </tfoot>
                ` : ''}
            </table>
            
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
    `;

        printWindow.document.write(printContent);
        printWindow.document.close();
    };

    const handlePageChange = useCallback((newPage) => {
        if (itemsPerPage === 'all') return;
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [itemsPerPage, totalPages]);

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

    if (error && !hasGenerated) {
        return <div className="alert alert-danger text-center py-5">{error}</div>;
    }

    return (
        <div className="container-fluid">
            <Header />
            <div className="card mt-2 shadow-lg p-0 animate__animated animate__fadeInUp expanded-card ledger-card compact">
                <div className="card-header bg-white py-0">
                    <h1 className="h4 mb-0 text-center text-primary">Ageing Report</h1>
                </div>

                <div className="card-body p-2 p-md-3">
                    <div className="row g-2 mb-3">
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
                                    autoFocus
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
                            <button type="button" id="generateReport" ref={generateBtnRef}
                                className="btn btn-primary btn-sm" onClick={handleGenerateReport} disabled={loading}
                                style={{ height: '30px', fontSize: '0.8rem', padding: '0 12px', fontWeight: '500', whiteSpace: 'nowrap' }}>
                                {loading ? <span className="spinner-border spinner-border-sm" style={{ width: '14px', height: '14px' }} /> : <><i className="bi bi-search"></i> Generate</>}
                            </button>
                        </div>

                        {/* Search Input */}
                        <div className="col-12" style={{ flex: '0 0 auto', width: '15%' }}>
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
                                        disabled={!hasGenerated}
                                        autoComplete="off"
                                        style={{ height: '26px', fontSize: '0.875rem', paddingTop: '0.75rem', width: '100%' }}
                                    />
                                </div>
                                <label className="position-absolute" style={{ top: '-0.5rem', left: '0.75rem', fontSize: '0.75rem', backgroundColor: 'white', padding: '0 0.25rem', color: '#6c757d', fontWeight: '500' }}>
                                    Search
                                </label>
                            </div>
                        </div>

                        {/* Type Filter */}
                        <div className="col-12" style={{ flex: '0 0 auto', width: '10%' }}>
                            <div className="position-relative">
                                <select
                                    className="form-select form-select-sm"
                                    id="typeFilter"
                                    value={typeFilter}
                                    onChange={(e) => setTypeFilter(e.target.value)}
                                    disabled={!hasGenerated}
                                    style={{ height: '30px', fontSize: '0.875rem', paddingTop: '0.25rem', width: '100%' }}
                                >
                                    <option value="all">All</option>
                                    <option value="receivable">Receivable</option>
                                    <option value="payable">Payable</option>
                                </select>
                                <label className="position-absolute" style={{ top: '-0.5rem', left: '0.75rem', fontSize: '0.75rem', backgroundColor: 'white', padding: '0 0.25rem', color: '#6c757d', fontWeight: '500' }}>
                                    Type
                                </label>
                            </div>
                        </div>

                        {/* Items Per Page */}
                        <div className="col-12" style={{ flex: '0 0 auto', width: '8%' }}>
                            <div className="position-relative">
                                <select
                                    className="form-select form-select-sm"
                                    value={itemsPerPage}
                                    onChange={(e) => { setItemsPerPage(e.target.value === 'all' ? 'all' : parseInt(e.target.value)); setCurrentPage(1); }}
                                    disabled={!hasGenerated}
                                    style={{ height: '30px', fontSize: '0.875rem', paddingTop: '0.25rem', width: '100%' }}
                                >
                                    <option value="10">10</option>
                                    <option value="25">25</option>
                                    <option value="50">50</option>
                                    <option value="all">All</option>
                                </select>
                                <label className="position-absolute" style={{ top: '-0.5rem', left: '0.75rem', fontSize: '0.75rem', backgroundColor: 'white', padding: '0 0.25rem', color: '#6c757d', fontWeight: '500' }}>
                                    Items
                                </label>
                            </div>
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
                            <button className="btn btn-outline-success btn-sm d-flex align-items-center"
                                onClick={exportToExcel}
                                disabled={!hasGenerated || !filteredAndSortedReport.length || exporting}
                                style={{ height: '30px', padding: '0 12px', fontSize: '0.8rem', fontWeight: '500', whiteSpace: 'nowrap' }}>
                                <i className="bi bi-file-earmark-excel-fill me-1"></i>
                                {exporting ? '...' : 'Excel'}
                            </button>
                            <button className="btn btn-outline-primary btn-sm d-flex align-items-center"
                                onClick={printReport}
                                disabled={!hasGenerated || !filteredAndSortedReport.length}
                                style={{ height: '30px', padding: '0 12px', fontSize: '0.8rem', fontWeight: '500', whiteSpace: 'nowrap' }}>
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

                    {hasGenerated && data.report.length > 0 ? (
                        filteredAndSortedReport.length > 0 ? (
                            <>
                                <div className="table-responsive" style={{ maxHeight: '400px', overflow: 'auto' }}>
                                    <table className="table table-sm table-hover mb-0" style={{ fontSize: '0.75rem' }}>
                                        <thead className="table-light" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                                            <tr>
                                                <th style={{ padding: '6px 8px', textAlign: 'center', width: '50px' }}>S.N.</th>
                                                <th className="sortable" onClick={() => sortItems('accountName')} style={{ cursor: 'pointer', padding: '6px 8px' }}>Account Name {getSortIndicator('accountName')}</th>
                                                <th className="sortable" onClick={() => sortItems('type')} style={{ cursor: 'pointer', padding: '6px 8px' }}>Type {getSortIndicator('type')}</th>
                                                <th className="text-end sortable" onClick={() => sortItems('0-30')} style={{ cursor: 'pointer', padding: '6px 8px' }}>0-30 Days {getSortIndicator('0-30')}</th>
                                                <th className="text-end sortable" onClick={() => sortItems('30-60')} style={{ cursor: 'pointer', padding: '6px 8px' }}>31-60 Days {getSortIndicator('30-60')}</th>
                                                <th className="text-end sortable" onClick={() => sortItems('60-90')} style={{ cursor: 'pointer', padding: '6px 8px' }}>61-90 Days {getSortIndicator('60-90')}</th>
                                                <th className="text-end sortable" onClick={() => sortItems('90-120')} style={{ cursor: 'pointer', padding: '6px 8px' }}>91-120 Days {getSortIndicator('90-120')}</th>
                                                <th className="text-end sortable" onClick={() => sortItems('120-150')} style={{ cursor: 'pointer', padding: '6px 8px' }}>121-150 Days {getSortIndicator('120-150')}</th>
                                                <th className="text-end sortable" onClick={() => sortItems('over-150')} style={{ cursor: 'pointer', padding: '6px 8px' }}>Over 150 Days {getSortIndicator('over-150')}</th>
                                                <th className="text-end sortable" onClick={() => sortItems('netBalance')} style={{ cursor: 'pointer', padding: '6px 8px' }}>Closing {getSortIndicator('netBalance')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {currentPageItems.map((account, idx) => (
                                                <tr key={idx} className={account.isReceivable ? 'table-info' : 'table-warning'}>
                                                    <td style={{ padding: '4px 6px', textAlign: 'center' }}>{(currentPage - 1) * (itemsPerPage === 'all' ? filteredAndSortedReport.length : itemsPerPage) + idx + 1}</td>
                                                    <td className="fw-bold" style={{ padding: '4px 6px' }}>{account.accountName}</td>
                                                    <td style={{ padding: '4px 6px' }}><span className={`badge ${account.isReceivable ? 'bg-info' : 'bg-warning'}`} style={{ fontSize: '0.65rem', padding: '3px 6px' }}>{account.isReceivable ? 'Receivable' : 'Payable'}</span></td>
                                                    <td className="text-end" style={{ padding: '4px 6px' }}>{formatCurrency(account.buckets['0-30'])}</td>
                                                    <td className="text-end" style={{ padding: '4px 6px' }}>{formatCurrency(account.buckets['30-60'])}</td>
                                                    <td className="text-end" style={{ padding: '4px 6px' }}>{formatCurrency(account.buckets['60-90'])}</td>
                                                    <td className="text-end" style={{ padding: '4px 6px' }}>{formatCurrency(account.buckets['90-120'])}</td>
                                                    <td className="text-end" style={{ padding: '4px 6px' }}>{formatCurrency(account.buckets['120-150'])}</td>
                                                    <td className="text-end" style={{ padding: '4px 6px' }}>{formatCurrency(account.buckets['over-150'])}</td>
                                                    <td className="text-end fw-bold" style={{ padding: '4px 6px' }}>{formatCurrency(account.netBalance)}</td>
                                                </tr>
                                            ))}
                                        </tbody>

                                        {showTotals && currentPageItems.length > 0 && (
                                            <tfoot className="table-group-divider">
                                                {(() => {
                                                    const pageReceivableTotals = { '0-30': 0, '30-60': 0, '60-90': 0, '90-120': 0, '120-150': 0, 'over-150': 0, total: 0 };
                                                    const pagePayableTotals = { '0-30': 0, '30-60': 0, '60-90': 0, '90-120': 0, '120-150': 0, 'over-150': 0, total: 0 };
                                                    const pageNetTotals = { '0-30': 0, '30-60': 0, '60-90': 0, '90-120': 0, '120-150': 0, 'over-150': 0, total: 0 };

                                                    currentPageItems.forEach(acc => {
                                                        Object.keys(acc.buckets).forEach(key => {
                                                            if (key !== 'total') {
                                                                if (acc.isReceivable) {
                                                                    pageReceivableTotals[key] += acc.buckets[key];
                                                                    pageNetTotals[key] += acc.buckets[key];
                                                                } else {
                                                                    const absVal = Math.abs(acc.buckets[key]);
                                                                    pagePayableTotals[key] += absVal;
                                                                    pageNetTotals[key] -= absVal;
                                                                }
                                                            }
                                                        });
                                                        if (acc.isReceivable) {
                                                            pageReceivableTotals.total += acc.buckets.total;
                                                            pageNetTotals.total += acc.buckets.total;
                                                        } else {
                                                            pagePayableTotals.total += Math.abs(acc.buckets.total);
                                                            pageNetTotals.total -= Math.abs(acc.buckets.total);
                                                        }
                                                    });

                                                    return (
                                                        <>
                                                            <tr className="fw-bold table-secondary">
                                                                <td colSpan="3" style={{ padding: '6px 8px' }}>Total Receivables</td>
                                                                <td className="text-end" style={{ padding: '6px 8px' }}>{formatCurrency(pageReceivableTotals['0-30'])}</td>
                                                                <td className="text-end" style={{ padding: '6px 8px' }}>{formatCurrency(pageReceivableTotals['30-60'])}</td>
                                                                <td className="text-end" style={{ padding: '6px 8px' }}>{formatCurrency(pageReceivableTotals['60-90'])}</td>
                                                                <td className="text-end" style={{ padding: '6px 8px' }}>{formatCurrency(pageReceivableTotals['90-120'])}</td>
                                                                <td className="text-end" style={{ padding: '6px 8px' }}>{formatCurrency(pageReceivableTotals['120-150'])}</td>
                                                                <td className="text-end" style={{ padding: '6px 8px' }}>{formatCurrency(pageReceivableTotals['over-150'])}</td>
                                                                <td className="text-end" style={{ padding: '6px 8px' }}>{formatCurrency(pageReceivableTotals.total)}</td>
                                                            </tr>
                                                            <tr className="fw-bold table-secondary">
                                                                <td colSpan="3" style={{ padding: '6px 8px' }}>Total Payables</td>
                                                                <td className="text-end" style={{ padding: '6px 8px' }}>{formatCurrency(pagePayableTotals['0-30'])}</td>
                                                                <td className="text-end" style={{ padding: '6px 8px' }}>{formatCurrency(pagePayableTotals['30-60'])}</td>
                                                                <td className="text-end" style={{ padding: '6px 8px' }}>{formatCurrency(pagePayableTotals['60-90'])}</td>
                                                                <td className="text-end" style={{ padding: '6px 8px' }}>{formatCurrency(pagePayableTotals['90-120'])}</td>
                                                                <td className="text-end" style={{ padding: '6px 8px' }}>{formatCurrency(pagePayableTotals['120-150'])}</td>
                                                                <td className="text-end" style={{ padding: '6px 8px' }}>{formatCurrency(pagePayableTotals['over-150'])}</td>
                                                                <td className="text-end" style={{ padding: '6px 8px' }}>{formatCurrency(pagePayableTotals.total)}</td>
                                                            </tr>
                                                            <tr className="fw-bold table-primary">
                                                                <td colSpan="3" style={{ padding: '6px 8px' }}>Net Total</td>
                                                                <td className="text-end" style={{ padding: '6px 8px' }}>{formatCurrency(pageNetTotals['0-30'])}</td>
                                                                <td className="text-end" style={{ padding: '6px 8px' }}>{formatCurrency(pageNetTotals['30-60'])}</td>
                                                                <td className="text-end" style={{ padding: '6px 8px' }}>{formatCurrency(pageNetTotals['60-90'])}</td>
                                                                <td className="text-end" style={{ padding: '6px 8px' }}>{formatCurrency(pageNetTotals['90-120'])}</td>
                                                                <td className="text-end" style={{ padding: '6px 8px' }}>{formatCurrency(pageNetTotals['120-150'])}</td>
                                                                <td className="text-end" style={{ padding: '6px 8px' }}>{formatCurrency(pageNetTotals['over-150'])}</td>
                                                                <td className="text-end" style={{ padding: '6px 8px' }}>{formatCurrency(pageNetTotals.total)}</td>
                                                            </tr>
                                                        </>
                                                    );
                                                })()}
                                            </tfoot>
                                        )}
                                    </table>
                                </div>

                                {itemsPerPage !== 'all' && totalPages > 1 && (
                                    <div className="row mt-2">
                                        <div className="col-12">
                                            <nav>
                                                <ul className="pagination justify-content-center pagination-sm" style={{ marginBottom: '0' }}>
                                                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                                        <button className="page-link" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => handlePageChange(currentPage - 1)}>Previous</button>
                                                    </li>
                                                    {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                                                        let p = totalPages <= 5 ? i + 1 : (currentPage <= 3 ? i + 1 : (currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i));
                                                        return (
                                                            <li key={p} className={`page-item ${currentPage === p ? 'active' : ''}`}>
                                                                <button className="page-link" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => handlePageChange(p)}>{p}</button>
                                                            </li>
                                                        );
                                                    })}
                                                    <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                                                        <button className="page-link" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => handlePageChange(currentPage + 1)}>Next</button>
                                                    </li>
                                                </ul>
                                            </nav>
                                            <div className="text-center text-muted small" style={{ fontSize: '0.7rem' }}>
                                                Showing {((currentPage - 1) * (itemsPerPage === 'all' ? 1 : itemsPerPage)) + 1} to {Math.min(currentPage * (itemsPerPage === 'all' ? filteredAndSortedReport.length : itemsPerPage), filteredAndSortedReport.length)} of {filteredAndSortedReport.length} accounts
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="alert alert-warning text-center py-3" style={{ fontSize: '0.8rem' }}>
                                <i className="fas fa-exclamation-triangle me-2"></i>No accounts match your search criteria.
                            </div>
                        )
                    ) : hasGenerated && data.report.length === 0 && !loading ? (
                        <div className="alert alert-warning text-center py-3" style={{ fontSize: '0.8rem' }}>
                            <i className="fas fa-exclamation-triangle me-2"></i>No accounts found for the selected date.
                        </div>
                    ) : !hasGenerated && !loading && (
                        <div className="alert alert-info text-center py-3" style={{ fontSize: '0.8rem' }}>
                            <i className="fas fa-info-circle me-2"></i>
                            Please select an "As on Date" and click "Generate" to view the ageing report.
                        </div>
                    )}
                </div>
            </div>

            {showProductModal && (
                <ProductModal onClose={() => setShowProductModal(false)} />
            )}

            <NotificationToast show={notification.show} message={notification.message} type={notification.type} duration={notification.duration} onClose={() => setNotification({ ...notification, show: false })} />
        </div>
    );
};

export default AgeingReportAllAccounts;