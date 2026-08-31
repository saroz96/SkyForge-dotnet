import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../Header';
import NepaliDate from 'nepali-datetime';
import { usePageNotRefreshContext } from '../PageNotRefreshContext';
import Loader from '../../Loader';
import ProductModal from '../dashboard/modals/ProductModal';
import * as XLSX from 'xlsx';
import NotificationToast from '../../NotificationToast';
import { FiCalendar, FiFileText, FiPrinter, FiDownload, FiSearch, FiFilter } from 'react-icons/fi';
import './AgeingAllAccounts.css';
import api, { refreshToken } from '../../services/api';

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

const AgeingReportAllAccounts = () => {
    const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
    const currentEnglishDate = new Date().toISOString().split('T')[0];
    const { draftSave, setDraftSave } = usePageNotRefreshContext();
    const [showProductModal, setShowProductModal] = useState(false);

    const [company, setCompany] = useState({ dateFormat: 'english', isVatExempt: false, vatEnabled: true, fiscalYear: {} });
    const [dateRange, setDateRange] = useState(() => {
        if (draftSave?.ageingReportData) {
            return { asOnDate: draftSave.ageingReportData.asOnDate || '', asOnDateAd: draftSave.ageingReportData.asOnDateAd || '' };
        }
        return { asOnDate: '', asOnDateAd: '' };
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
            company: null, currentFiscalYear: null, initialFiscalYear: null, currentCompanyName: ''
        };
    });

    const [searchQuery, setSearchQuery] = useState(() => draftSave?.ageingReportSearch?.searchQuery || '');
    const [typeFilter, setTypeFilter] = useState(() => draftSave?.ageingReportSearch?.typeFilter || 'all');
    const [currentPage, setCurrentPage] = useState(() => draftSave?.ageingReportSearch?.currentPage || 1);
    const [itemsPerPage, setItemsPerPage] = useState(() => draftSave?.ageingReportSearch?.itemsPerPage || 10);
    const [sortConfig, setSortConfig] = useState(() => draftSave?.ageingReportSearch?.sortConfig || { key: 'accountName', direction: 'ascending' });
    const [showTotals, setShowTotals] = useState(() => draftSave?.ageingReportSearch?.showTotals !== undefined ? draftSave.ageingReportSearch.showTotals : true);

    const [dateError, setDateError] = useState('');
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [error, setError] = useState(null);
    const [hasGenerated, setHasGenerated] = useState(false);
    const [exporting, setExporting] = useState(false);

    const [notification, setNotification] = useState({ show: false, message: '', type: 'success', duration: 3000 });

    const navigate = useNavigate();
    const searchInputRef = useRef(null);
    const asOnDateRef = useRef(null);
    const asOnDateAdRef = useRef(null);
    const generateBtnRef = useRef(null);
    const abortControllerRef = useRef(null);
    const tableBodyRef = useRef(null);

    // const api = useMemo(() => {
    //     const instance = axios.create({ baseURL: process.env.REACT_APP_API_BASE_URL, withCredentials: true });
    //     instance.interceptors.request.use((config) => {
    //         const token = localStorage.getItem('token');
    //         if (token) config.headers.Authorization = `Bearer ${token}`;
    //         return config;
    //     });
    //     return instance;
    // }, []);

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

    useEffect(() => {
        const fetchCompanyInfo = async () => {
            try {
                setInitialLoading(true);
                const response = await api.get('/api/retailer/ageing-report/all-accounts');
                if (response.data.success) {
                    const responseData = response.data.data;
                    const dateFormat = responseData.companyDateFormat || 'english';
                    setCompany({
                        dateFormat: dateFormat,
                        vatEnabled: responseData.company?.vatEnabled !== false,
                        fiscalYear: responseData.currentFiscalYear || {},
                        isVatExempt: responseData.company?.isVatExempt || false
                    });
                    const hasDraftDates = draftSave?.ageingReportData?.asOnDate;
                    if (!hasDraftDates) {
                        let asOnDateFormatted = '', asOnDateAd = '';
                        if (dateFormat === 'nepali') {
                            asOnDateFormatted = currentNepaliDate;
                            asOnDateAd = convertBsToAd(currentNepaliDate);
                        } else {
                            asOnDateFormatted = currentEnglishDate;
                            asOnDateAd = currentEnglishDate;
                        }
                        setDateRange({ asOnDate: asOnDateFormatted, asOnDateAd: asOnDateAd });
                    }
                }
            } catch (err) {
                setDateRange({ asOnDate: currentEnglishDate, asOnDateAd: currentEnglishDate });
            } finally {
                setInitialLoading(false);
            }
        };
        fetchCompanyInfo();
    }, []);

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

    const fetchAgeingData = useCallback(async () => {
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

        abortControllerRef.current?.abort();
        abortControllerRef.current = new AbortController();
        try {
            setLoading(true);
            setError(null);
            const asOnDateParam = dateRange.asOnDateAd || dateRange.asOnDate;
            const response = await api.get(`/api/retailer/ageing-report/all-accounts?asOnDate=${encodeURIComponent(asOnDateParam)}`, { signal: abortControllerRef.current.signal });

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
                if (responseData.companyDateFormat) setCompany(prev => ({ ...prev, dateFormat: responseData.companyDateFormat }));
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
        if (!dateRange.asOnDate) { setDateError('Please enter a date'); asOnDateRef.current?.focus(); return; }
        if (company.dateFormat === 'nepali' && !isValidNepaliDate(dateRange.asOnDate)) { setDateError('Invalid date format'); asOnDateRef.current?.focus(); return; }
        fetchAgeingData();
    };

    const handleAsOnDateChange = (e) => {
        const value = e.target.value.replace(/[^0-9/-]/g, '').slice(0, 10);
        const adDate = convertBsToAd(value);
        setDateRange({ asOnDate: value, asOnDateAd: adDate || dateRange.asOnDateAd });
        setDateError('');
    };

    const handleAsOnDateAdChange = (e) => {
        const value = e.target.value;
        const bsDate = convertAdToBs(value);
        setDateRange({ asOnDate: bsDate || dateRange.asOnDate, asOnDateAd: value });
        setDateError('');
    };

    const handleAsOnDateBlur = () => {
        const dateStr = dateRange.asOnDate?.trim();
        if (!dateStr) return;
        if (company.dateFormat === 'nepali') {
            const correctedDate = validateAndCorrectNepaliDate(dateStr);
            if (!correctedDate) {
                const fallbackDate = currentNepaliDate;
                const adDate = convertBsToAd(fallbackDate);
                setDateRange({ asOnDate: fallbackDate, asOnDateAd: adDate });
                setNotification({ show: true, message: 'Invalid Nepali date. Auto-corrected.', type: 'warning', duration: 3000 });
            } else if (correctedDate !== dateStr) {
                const adDate = convertBsToAd(correctedDate);
                setDateRange({ asOnDate: correctedDate, asOnDateAd: adDate });
                setNotification({ show: true, message: 'Date auto-corrected.', type: 'warning', duration: 3000 });
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

    useEffect(() => {
        if (hasGenerated) {
            setDraftSave({
                ...draftSave,
                ageingReportData: { ...data, asOnDate: dateRange.asOnDate, asOnDateAd: dateRange.asOnDateAd },
                ageingReportSearch: { searchQuery, typeFilter, currentPage, itemsPerPage, sortConfig, showTotals }
            });
        }
    }, [data, searchQuery, typeFilter, currentPage, itemsPerPage, sortConfig, showTotals, dateRange.asOnDate, dateRange.asOnDateAd, hasGenerated]);

    useEffect(() => { setCurrentPage(1); }, [searchQuery, typeFilter, sortConfig]);

    const sortItems = (key) => setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'ascending' ? 'descending' : 'ascending' }));
    const getSortIndicator = (key) => sortConfig.key === key ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : '';

    const handleKeyDown = (e, nextFieldId) => {
        if (e.key === 'Enter') { e.preventDefault(); if (nextFieldId) document.getElementById(nextFieldId)?.focus(); else handleGenerateReport(); }
    };

    const exportToExcel = async () => {
        if (!hasGenerated || !filteredAndSortedReport.length) {
            setNotification({ show: true, message: 'Please generate the report first', type: 'warning' });
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
            setNotification({ show: true, message: 'Excel file exported successfully!', type: 'success' });
        } catch (err) {
            setNotification({ show: true, message: 'Failed to export data', type: 'error' });
        } finally { setExporting(false); }
    };

    const printReport = () => {
        if (!hasGenerated || !filteredAndSortedReport.length) {
            setNotification({ show: true, message: 'Please generate the report first', type: 'warning' });
            return;
        }

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
        if (!printWindow) { setNotification({ show: true, message: 'Popup blocked', type: 'error' }); return; }

        const formatPrintCurrency = (num) => {
            if (num === undefined || num === null) return '0.00';
            const number = Math.abs(typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num));
            if (isNaN(number)) return '0.00';
            return number.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        };

        const escapeHtml = (text) => {
            if (!text) return '';
            return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        };

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

        const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Ageing Report - ${escapeHtml(data.currentCompanyName || 'Company Name')}</title>
            <style>
                @page { margin: 10mm; size: A4 landscape; }
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: Arial, Helvetica, sans-serif; font-size: 9px; margin: 0; padding: 5mm; }
                .print-header { text-align: center; margin-bottom: 10px; }
                .print-header h1 { font-size: 16px; margin: 0; font-weight: bold; }
                .print-header p { font-size: 9px; margin: 2px 0; }
                .print-header hr { margin: 5px 0; }
                .report-title { text-align: center; text-decoration: underline; font-size: 12px; font-weight: bold; margin: 5px 0; }
                .report-info { display: flex; justify-content: space-between; margin: 8px 0; padding: 5px; background: #f5f5f5; border: 1px solid #ddd; font-size: 8px; }
                table { width: 100%; border-collapse: collapse; page-break-inside: auto; font-size: 8px; }
                tr { page-break-inside: avoid; page-break-after: auto; }
                th, td { border: 1px solid #000; padding: 4px 6px; text-align: left; }
                th { background-color: #e6e6e6 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-size: 9px; font-weight: bold; }
                .text-end { text-align: right; } .text-center { text-align: center; }
                .receivable-row { background-color: #e6f7ff; }
                .payable-row { background-color: #fff7e6; }
                .total-row { background-color: #e6e6e6; font-weight: bold; }
                .net-total { background-color: #d9ead3; font-weight: bold; }
                .print-footer { margin-top: 10px; font-size: 7px; text-align: center; border-top: 1px solid #ccc; padding-top: 5px; }
            </style>
        </head>
        <body>
            <div class="print-header">
                <h1>${escapeHtml(data.currentCompanyName || 'Company Name')}</h1>
                <p>${escapeHtml(data.company?.address || '')}${data.company?.city ? ', ' + escapeHtml(data.company.city) : ''}<br>PAN: ${escapeHtml(data.company?.pan || '')} | Phone: ${escapeHtml(data.company?.phone || '')}</p>
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
            <table>
                <thead>
                    <tr>
                        <th class="text-center" style="width:40px;">#</th><th>Account Name</th><th class="text-center" style="width:80px;">Type</th>
                        <th class="text-end" style="width:70px;">0-30</th><th class="text-end" style="width:70px;">31-60</th><th class="text-end" style="width:70px;">61-90</th>
                        <th class="text-end" style="width:70px;">91-120</th><th class="text-end" style="width:70px;">121-150</th><th class="text-end" style="width:70px;">Over 150</th>
                        <th class="text-end" style="width:80px;">Closing</th>
                    </tr>
                </thead>
                <tbody>${generateTableRows()}</tbody>
                ${showTotals ? `
                <tfoot>
                    <tr class="total-row"><td colspan="3" class="fw-bold">Total Receivables</td>
                        <td class="text-end">${formatPrintCurrency(filteredReceivableTotals['0-30'])}</td>
                        <td class="text-end">${formatPrintCurrency(filteredReceivableTotals['30-60'])}</td>
                        <td class="text-end">${formatPrintCurrency(filteredReceivableTotals['60-90'])}</td>
                        <td class="text-end">${formatPrintCurrency(filteredReceivableTotals['90-120'])}</td>
                        <td class="text-end">${formatPrintCurrency(filteredReceivableTotals['120-150'])}</td>
                        <td class="text-end">${formatPrintCurrency(filteredReceivableTotals['over-150'])}</td>
                        <td class="text-end fw-bold">${formatPrintCurrency(filteredReceivableTotals.total)}</td>
                    </tr>
                    <tr class="total-row"><td colspan="3" class="fw-bold">Total Payables</td>
                        <td class="text-end">${formatPrintCurrency(filteredPayableTotals['0-30'])}</td>
                        <td class="text-end">${formatPrintCurrency(filteredPayableTotals['30-60'])}</td>
                        <td class="text-end">${formatPrintCurrency(filteredPayableTotals['60-90'])}</td>
                        <td class="text-end">${formatPrintCurrency(filteredPayableTotals['90-120'])}</td>
                        <td class="text-end">${formatPrintCurrency(filteredPayableTotals['120-150'])}</td>
                        <td class="text-end">${formatPrintCurrency(filteredPayableTotals['over-150'])}</td>
                        <td class="text-end fw-bold">${formatPrintCurrency(filteredPayableTotals.total)}</td>
                    </tr>
                    <tr class="net-total"><td colspan="3" class="fw-bold">Net Total</td>
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
            <script>window.onload=function(){setTimeout(function(){window.print();setTimeout(function(){window.close()},500)},200)}</script>
        </body>
        </html>
    `;
        printWindow.document.write(printContent);
        printWindow.document.close();
    };

    const handlePageChange = useCallback((newPage) => {
        if (itemsPerPage === 'all') return;
        if (newPage >= 1 && newPage <= totalPages) setCurrentPage(newPage);
    }, [itemsPerPage, totalPages]);

    useEffect(() => {
        const handleKeyDown = (e) => { if (e.key === 'F9') { e.preventDefault(); setShowProductModal(prev => !prev); } };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    if (initialLoading) return <Loader />;
    if (error && !hasGenerated) return <div className="ar-page"><Header /><div className="ar-shell"><div className="ar-state"><h3>Error</h3><p>{error}</p></div></div></div>;

    return (
        <div className="ar-page">
            <Header />

            <div className="ar-shell">
                {/* Top Bar */}
                <div className="ar-topbar">
                    <div className="ar-topbar__left">
                        <div className="ar-topbar__icon"><FiFileText /></div>
                        <div><h1>Ageing Report</h1></div>
                    </div>
                    <div className="ar-topbar__actions">
                        <button className="ar-btn-icon" onClick={exportToExcel} disabled={!hasGenerated || !filteredAndSortedReport.length || exporting}>
                            <FiDownload /> {exporting ? '…' : 'Excel'}
                        </button>
                        <button className="ar-btn-icon" onClick={printReport} disabled={!hasGenerated || !filteredAndSortedReport.length}>
                            <FiPrinter /> Print
                        </button>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="ar-toolbar">
                    <div className="ar-field ar-field--date">
                        <label>As on (BS) <span className="req">*</span></label>
                        <input type="text" id="asOnDate" ref={asOnDateRef} className={dateError ? 'is-invalid' : ''} value={dateRange.asOnDate} onChange={handleAsOnDateChange} onBlur={handleAsOnDateBlur} onKeyDown={(e) => handleKeyDown(e, 'asOnDateAd')} placeholder="YYYY-MM-DD" autoComplete="off" autoFocus />
                        {dateError && <div className="ar-field-error">{dateError}</div>}
                    </div>
                    <div className="ar-field ar-field--date">
                        <label>As on (AD)</label>
                        <input type="date" id="asOnDateAd" ref={asOnDateAdRef} value={dateRange.asOnDateAd || ''} onChange={handleAsOnDateAdChange} onKeyDown={(e) => handleKeyDown(e, 'generateReport')} />
                    </div>
                    <button type="button" id="generateReport" ref={generateBtnRef} className="ar-btn-gen" onClick={handleGenerateReport} disabled={loading}>
                        {loading ? <span className="spinner-border spinner-border-sm" style={{ width: 12, height: 12 }} /> : <><FiSearch className="me-1" /> Generate</>}
                    </button>

                    <div className="ar-toolbar-divider" />

                    <div className="ar-field ar-field--search">
                        <label>Search</label>
                        <div className="ar-search-wrap">
                            <FiSearch className="ar-search-icon" />
                            <input type="text" id="searchInput" ref={searchInputRef} placeholder="Account..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} disabled={!hasGenerated} autoComplete="off" />
                            {searchQuery && <button className="ar-search-clear" onClick={() => setSearchQuery('')}>×</button>}
                        </div>
                    </div>
                    <div className="ar-field ar-field--select">
                        <label>Type</label>
                        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} disabled={!hasGenerated}>
                            <option value="all">All</option>
                            <option value="receivable">Receivable</option>
                            <option value="payable">Payable</option>
                        </select>
                    </div>
                    <div className="ar-field ar-field--select">
                        <label>Rows</label>
                        <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(e.target.value === 'all' ? 'all' : parseInt(e.target.value)); setCurrentPage(1); }} disabled={!hasGenerated}>
                            <option value="10">10</option><option value="25">25</option><option value="50">50</option><option value="all">All</option>
                        </select>
                    </div>
                    <div className="ar-toggle-item">
                        <span>Totals</span>
                        <input className="form-check-input" type="checkbox" role="switch" checked={showTotals} onChange={() => setShowTotals(!showTotals)} disabled={!hasGenerated} />
                    </div>
                </div>

                {error && <div className="ar-alert"><i className="bi bi-exclamation-circle" />{error}<button type="button" className="btn-close btn-sm ms-auto" onClick={() => setError(null)} /></div>}

                {/* Main Content */}
                <div className="ar-main">
                    {!hasGenerated && !loading ? (
                        <div className="ar-state">
                            <FiCalendar size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                            <h3>Select date & generate</h3>
                            <p>Choose an "As on" date and click Generate.</p>
                        </div>
                    ) : loading ? (
                        <div className="ar-state"><div className="spinner-border text-primary" /><p>Loading report...</p></div>
                    ) : data.report.length === 0 ? (
                        <div className="ar-state"><FiFileText size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} /><h3>No accounts found</h3><p>No data for the selected date.</p></div>
                    ) : filteredAndSortedReport.length === 0 ? (
                        <div className="ar-state"><FiSearch size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} /><h3>No matching results</h3><p>Try adjusting your search or filter.</p></div>
                    ) : (
                        <>
                            <div className="ar-main__bar">
                                <span><strong>{filteredAndSortedReport.length}</strong> accounts</span>
                                <span>As on: {dateRange.asOnDate}</span>
                            </div>

                            <div className="ar-table-scroll" ref={tableBodyRef}>
                                <table className="ar-table">
                                    <thead>
                                        <tr>
                                            <th className="text-center" style={{ width: 40 }}>#</th>
                                            <th className={`sortable ${sortConfig.key === 'accountName' ? 'sorted' : ''}`} onClick={() => sortItems('accountName')}>Account{getSortIndicator('accountName')}</th>
                                            <th className={`sortable ${sortConfig.key === 'type' ? 'sorted' : ''}`} onClick={() => sortItems('type')}>Type{getSortIndicator('type')}</th>
                                            <th className={`num sortable ${sortConfig.key === '0-30' ? 'sorted' : ''}`} onClick={() => sortItems('0-30')}>0-30{getSortIndicator('0-30')}</th>
                                            <th className={`num sortable ${sortConfig.key === '30-60' ? 'sorted' : ''}`} onClick={() => sortItems('30-60')}>31-60{getSortIndicator('30-60')}</th>
                                            <th className={`num sortable ${sortConfig.key === '60-90' ? 'sorted' : ''}`} onClick={() => sortItems('60-90')}>61-90{getSortIndicator('60-90')}</th>
                                            <th className={`num sortable ${sortConfig.key === '90-120' ? 'sorted' : ''}`} onClick={() => sortItems('90-120')}>91-120{getSortIndicator('90-120')}</th>
                                            <th className={`num sortable ${sortConfig.key === '120-150' ? 'sorted' : ''}`} onClick={() => sortItems('120-150')}>121-150{getSortIndicator('120-150')}</th>
                                            <th className={`num sortable ${sortConfig.key === 'over-150' ? 'sorted' : ''}`} onClick={() => sortItems('over-150')}>Over 150{getSortIndicator('over-150')}</th>
                                            <th className={`num sortable ${sortConfig.key === 'netBalance' ? 'sorted' : ''}`} onClick={() => sortItems('netBalance')}>Closing{getSortIndicator('netBalance')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {currentPageItems.map((account, idx) => {
                                            const sn = itemsPerPage === 'all' ? idx + 1 : (currentPage - 1) * itemsPerPage + idx + 1;
                                            return (
                                                <tr key={idx} className={account.isReceivable ? 'ar-row-receivable' : 'ar-row-payable'}>
                                                    <td className="text-center">{sn}</td>
                                                    <td className="fw-bold">{account.accountName}</td>
                                                    <td><span className={`ar-badge ${account.isReceivable ? 'ar-badge--info' : 'ar-badge--warning'}`}>{account.isReceivable ? 'Receivable' : 'Payable'}</span></td>
                                                    <td className="num">{formatCurrency(account.buckets['0-30'])}</td>
                                                    <td className="num">{formatCurrency(account.buckets['30-60'])}</td>
                                                    <td className="num">{formatCurrency(account.buckets['60-90'])}</td>
                                                    <td className="num">{formatCurrency(account.buckets['90-120'])}</td>
                                                    <td className="num">{formatCurrency(account.buckets['120-150'])}</td>
                                                    <td className="num">{formatCurrency(account.buckets['over-150'])}</td>
                                                    <td className="num fw-bold">{formatCurrency(account.netBalance)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    {showTotals && currentPageItems.length > 0 && (
                                        <tfoot>
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
                                                        <tr className="ar-row-total"><td colSpan="3">Total Receivables</td>
                                                            <td className="num">{formatCurrency(pageReceivableTotals['0-30'])}</td>
                                                            <td className="num">{formatCurrency(pageReceivableTotals['30-60'])}</td>
                                                            <td className="num">{formatCurrency(pageReceivableTotals['60-90'])}</td>
                                                            <td className="num">{formatCurrency(pageReceivableTotals['90-120'])}</td>
                                                            <td className="num">{formatCurrency(pageReceivableTotals['120-150'])}</td>
                                                            <td className="num">{formatCurrency(pageReceivableTotals['over-150'])}</td>
                                                            <td className="num fw-bold">{formatCurrency(pageReceivableTotals.total)}</td>
                                                        </tr>
                                                        <tr className="ar-row-total"><td colSpan="3">Total Payables</td>
                                                            <td className="num">{formatCurrency(pagePayableTotals['0-30'])}</td>
                                                            <td className="num">{formatCurrency(pagePayableTotals['30-60'])}</td>
                                                            <td className="num">{formatCurrency(pagePayableTotals['60-90'])}</td>
                                                            <td className="num">{formatCurrency(pagePayableTotals['90-120'])}</td>
                                                            <td className="num">{formatCurrency(pagePayableTotals['120-150'])}</td>
                                                            <td className="num">{formatCurrency(pagePayableTotals['over-150'])}</td>
                                                            <td className="num fw-bold">{formatCurrency(pagePayableTotals.total)}</td>
                                                        </tr>
                                                        <tr className="ar-row-net"><td colSpan="3">Net Total</td>
                                                            <td className="num">{formatCurrency(pageNetTotals['0-30'])}</td>
                                                            <td className="num">{formatCurrency(pageNetTotals['30-60'])}</td>
                                                            <td className="num">{formatCurrency(pageNetTotals['60-90'])}</td>
                                                            <td className="num">{formatCurrency(pageNetTotals['90-120'])}</td>
                                                            <td className="num">{formatCurrency(pageNetTotals['120-150'])}</td>
                                                            <td className="num">{formatCurrency(pageNetTotals['over-150'])}</td>
                                                            <td className="num fw-bold">{formatCurrency(pageNetTotals.total)}</td>
                                                        </tr>
                                                    </>
                                                );
                                            })()}
                                        </tfoot>
                                    )}
                                </table>
                            </div>

                            {itemsPerPage !== 'all' && totalPages > 1 && (
                                <div className="ar-pager">
                                    <span>
                                        {((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, filteredAndSortedReport.length)} of {filteredAndSortedReport.length}
                                    </span>
                                    <nav>
                                        <ul className="pagination pagination-sm mb-0">
                                            <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                                <button className="page-link" onClick={() => handlePageChange(currentPage - 1)}>‹</button>
                                            </li>
                                            {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                                                let p = totalPages <= 5 ? i + 1 : (currentPage <= 3 ? i + 1 : (currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i));
                                                return (
                                                    <li key={p} className={`page-item ${currentPage === p ? 'active' : ''}`}>
                                                        <button className="page-link" onClick={() => handlePageChange(p)}>{p}</button>
                                                    </li>
                                                );
                                            })}
                                            <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                                                <button className="page-link" onClick={() => handlePageChange(currentPage + 1)}>›</button>
                                            </li>
                                        </ul>
                                    </nav>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {showProductModal && <ProductModal onClose={() => setShowProductModal(false)} />}
            <NotificationToast show={notification.show} message={notification.message} type={notification.type} duration={notification.duration} onClose={() => setNotification({ ...notification, show: false })} />
        </div>
    );
};

export default AgeingReportAllAccounts;