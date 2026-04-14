import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../Header';
import Loader from '../../Loader';
import * as XLSX from 'xlsx';
import NotificationToast from '../../NotificationToast';
import NepaliDate from 'nepali-date-converter';

const AgeingReportAllAccounts = () => {
    const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
    const currentEnglishDate = new Date().toISOString().split('T')[0];

    const [company, setCompany] = useState({
        dateFormat: 'english',
        vatEnabled: true,
        fiscalYear: {}
    });

    const [data, setData] = useState({
        report: [],
        receivableTotals: { '0-30': 0, '30-60': 0, '60-90': 0, '90-120': 0, 'over-120': 0, total: 0 },
        payableTotals: { '0-30': 0, '30-60': 0, '60-90': 0, '90-120': 0, 'over-120': 0, total: 0 },
        netTotals: { '0-30': 0, '30-60': 0, '60-90': 0, '90-120': 0, 'over-120': 0, total: 0 },
        company: null,
        currentFiscalYear: null,
        initialFiscalYear: null,
        currentCompanyName: ''
    });

    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [sortConfig, setSortConfig] = useState({ key: 'accountName', direction: 'ascending' });
    const [showTotals, setShowTotals] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [hasGenerated, setHasGenerated] = useState(false);
    const [asOnDate, setAsOnDate] = useState('');
    const [dateError, setDateError] = useState('');

    const [notification, setNotification] = useState({
        show: false,
        message: '',
        type: 'success',
        duration: 3000
    });

    const navigate = useNavigate();
    const searchInputRef = useRef(null);
    const asOnDateRef = useRef(null);
    const generateBtnRef = useRef(null);
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

    const mapBuckets = useCallback((bucketData) => {
        if (!bucketData) return { '0-30': 0, '30-60': 0, '60-90': 0, '90-120': 0, 'over-120': 0, total: 0 };
        return {
            '0-30': Number(bucketData.range0To30) || 0,
            '30-60': Number(bucketData.range30To60) || 0,
            '60-90': Number(bucketData.range60To90) || 0,
            '90-120': Number(bucketData.range90To120) || 0,
            'over-120': Number(bucketData.over120) || 0,
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
                        fiscalYear: responseData.currentFiscalYear || {}
                    });
                    setAsOnDate(dateFormat === 'nepali' ? currentNepaliDate : currentEnglishDate);
                }
            } catch (err) {
                console.error('Error fetching company info:', err);
                setAsOnDate(currentEnglishDate);
            } finally {
                setInitialLoading(false);
            }
        };
        fetchCompanyInfo();
    }, []);

    const fetchAgeingData = useCallback(async () => {
        if (abortControllerRef.current) abortControllerRef.current.abort();
        abortControllerRef.current = new AbortController();

        try {
            setLoading(true);
            setError(null);
            const url = `/api/retailer/ageing-report/all-accounts${asOnDate ? `?asOnDate=${encodeURIComponent(asOnDate)}` : ''}`;
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
    }, [api, mapBuckets, asOnDate]);

    const validateDate = (dateStr) => {
        if (!dateStr) return false;
        if (company.dateFormat === 'nepali') {
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

    const filteredTotals = useMemo(() => {
        const totals = { receivable: { '0-30': 0, '30-60': 0, '60-90': 0, '90-120': 0, 'over-120': 0, total: 0 }, payable: { '0-30': 0, '30-60': 0, '60-90': 0, '90-120': 0, 'over-120': 0, total: 0 }, net: { '0-30': 0, '30-60': 0, '60-90': 0, '90-120': 0, 'over-120': 0, total: 0 } };
        filteredAndSortedReport.forEach(acc => {
            Object.keys(acc.buckets).forEach(key => {
                if (key !== 'total') {
                    if (acc.isReceivable) {
                        totals.receivable[key] += acc.buckets[key];
                        totals.net[key] += acc.buckets[key];
                    } else {
                        const absVal = Math.abs(acc.buckets[key]);
                        totals.payable[key] += absVal;
                        totals.net[key] -= absVal;
                    }
                }
            });
            if (acc.isReceivable) {
                totals.receivable.total += acc.buckets.total;
                totals.net.total += acc.buckets.total;
            } else {
                totals.payable.total += Math.abs(acc.buckets.total);
                totals.net.total -= Math.abs(acc.buckets.total);
            }
        });
        return totals;
    }, [filteredAndSortedReport]);

    const currentPageItems = useMemo(() => {
        if (itemsPerPage === 'all') return filteredAndSortedReport;
        return filteredAndSortedReport.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    }, [filteredAndSortedReport, itemsPerPage, currentPage]);

    const totalPages = Math.ceil(filteredAndSortedReport.length / (itemsPerPage === 'all' ? 1 : itemsPerPage));

    useEffect(() => { setCurrentPage(1); }, [searchQuery, typeFilter, sortConfig]);

    const sortItems = (key) => setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'ascending' ? 'descending' : 'ascending' }));
    const getSortIndicator = (key) => sortConfig.key === key ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : '';

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
            excelData.push({}, { 'Account Name': 'TOTAL RECEIVABLES', '0-30 Days': formatCurrency(filteredTotals.receivable['0-30']), '31-60 Days': formatCurrency(filteredTotals.receivable['30-60']), '61-90 Days': formatCurrency(filteredTotals.receivable['60-90']), '91-120 Days': formatCurrency(filteredTotals.receivable['90-120']), 'Over 120 Days': formatCurrency(filteredTotals.receivable['over-120']), 'Closing': formatCurrency(filteredTotals.receivable.total) });
            excelData.push({ 'Account Name': 'TOTAL PAYABLES', '0-30 Days': formatCurrency(filteredTotals.payable['0-30']), '31-60 Days': formatCurrency(filteredTotals.payable['30-60']), '61-90 Days': formatCurrency(filteredTotals.payable['60-90']), '91-120 Days': formatCurrency(filteredTotals.payable['90-120']), 'Over 120 Days': formatCurrency(filteredTotals.payable['over-120']), 'Closing': formatCurrency(filteredTotals.payable.total) });
            excelData.push({ 'Account Name': 'NET TOTAL', '0-30 Days': formatCurrency(filteredTotals.net['0-30']), '31-60 Days': formatCurrency(filteredTotals.net['30-60']), '61-90 Days': formatCurrency(filteredTotals.net['60-90']), '91-120 Days': formatCurrency(filteredTotals.net['90-120']), 'Over 120 Days': formatCurrency(filteredTotals.net['over-120']), 'Closing': formatCurrency(filteredTotals.net.total) });
            const ws = XLSX.utils.json_to_sheet(excelData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Ageing Report');
            XLSX.writeFile(wb, `Ageing_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
            setNotification({ show: true, message: 'Excel file exported successfully!', type: 'success', duration: 3000 });
        } catch (err) {
            setNotification({ show: true, message: 'Failed to export data', type: 'error', duration: 3000 });
        } finally { setExporting(false); }
    };

    const printReport = () => {
        if (!hasGenerated || !filteredAndSortedReport.length) {
            setNotification({ show: true, message: 'Please generate the report first', type: 'warning', duration: 3000 });
            return;
        }
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html><html><head><title>Ageing Report</title>
            <style>@page{margin:10mm}body{font-family:Arial;font-size:10px;margin:0;padding:5mm}
            .print-header{text-align:center;margin-bottom:20px}table{width:100%;border-collapse:collapse;font-size:12px}
            th,td{border:1px solid #000;padding:4px;text-align:left}th{background:#f2f2f2}.text-end{text-align:right}
            .receivable-row{background:#e6f7ff}.payable-row{background:#fff7e6}.total-row{background:#e6e6e6;font-weight:bold}
            .net-total{background:#f0f0f0;font-weight:bold}</style></head>
            <body><div class="print-header"><h3>${data.currentCompanyName || 'Company Name'}</h3>
            <p>${data.company?.address || ''}${data.company?.city ? ', ' + data.company.city : ''}</p>
            <h2>Ageing Report</h2><p><strong>As on Date:</strong> ${asOnDate} | <strong>F.Y:</strong> ${data.currentFiscalYear?.name || 'N/A'}</p><hr></div>
            <table><thead><tr><th>#</th><th>Account</th><th>Type</th><th class="text-end">0-30</th><th class="text-end">31-60</th><th class="text-end">61-90</th><th class="text-end">91-120</th><th class="text-end">Over 120</th><th class="text-end">Closing</th></tr></thead>
            <tbody>${filteredAndSortedReport.map((acc, i) => `<tr class="${acc.isReceivable ? 'receivable-row' : 'payable-row'}">
                <td>${i + 1}</td><td>${acc.accountName}</td><td>${acc.isReceivable ? 'Receivable' : 'Payable'}</td>
                <td class="text-end">${formatCurrency(acc.buckets['0-30'])}</td><td class="text-end">${formatCurrency(acc.buckets['30-60'])}</td>
                <td class="text-end">${formatCurrency(acc.buckets['60-90'])}</td><td class="text-end">${formatCurrency(acc.buckets['90-120'])}</td>
                <td class="text-end">${formatCurrency(acc.buckets['over-120'])}</td><td class="text-end">${formatCurrency(acc.netBalance)}</td></td>`).join('')}</tbody>
            ${showTotals ? `<tfoot><tr class="total-row"><td colspan="3">Total Receivables</td><td class="text-end">${formatCurrency(filteredTotals.receivable['0-30'])}</td>
            <td class="text-end">${formatCurrency(filteredTotals.receivable['30-60'])}</td><td class="text-end">${formatCurrency(filteredTotals.receivable['60-90'])}</td>
            <td class="text-end">${formatCurrency(filteredTotals.receivable['90-120'])}</td><td class="text-end">${formatCurrency(filteredTotals.receivable['over-120'])}</td>
            <td class="text-end">${formatCurrency(filteredTotals.receivable.total)}</td></tr>
            <tr class="total-row"><td colspan="3">Total Payables</td><td class="text-end">${formatCurrency(filteredTotals.payable['0-30'])}</td>
            <td class="text-end">${formatCurrency(filteredTotals.payable['30-60'])}</td><td class="text-end">${formatCurrency(filteredTotals.payable['60-90'])}</td>
            <td class="text-end">${formatCurrency(filteredTotals.payable['90-120'])}</td><td class="text-end">${formatCurrency(filteredTotals.payable['over-120'])}</td>
            <td class="text-end">${formatCurrency(filteredTotals.payable.total)}</td></tr>
            <tr class="net-total"><td colspan="3">Net Total</td><td class="text-end">${formatCurrency(filteredTotals.net['0-30'])}</td>
            <td class="text-end">${formatCurrency(filteredTotals.net['30-60'])}</td><td class="text-end">${formatCurrency(filteredTotals.net['60-90'])}</td>
            <td class="text-end">${formatCurrency(filteredTotals.net['90-120'])}</td><td class="text-end">${formatCurrency(filteredTotals.net['over-120'])}</td>
            <td class="text-end">${formatCurrency(filteredTotals.net.total)}</td></tr></tfoot>` : ''}
            </table><div class="print-footer">Printed from ${data.currentCompanyName || 'Company Name'} | ${new Date().toLocaleString()}</div>
            <script>window.onload=function(){window.print();window.onafterprint=function(){window.close()}}<\/script></body></html>
        `);
        printWindow.document.close();
    };

    const handlePageChange = useCallback((newPage) => {
        if (itemsPerPage === 'all') return;
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [itemsPerPage, totalPages]);


    if (initialLoading) return <Loader />;

    return (
        <div className="container-fluid">
            <Header />
            <div className="card mt-2 shadow-lg p-0 expanded-card ledger-card compact">
                <div className="card-header bg-white py-1">
                    <h1 className="h5 mb-0 text-center text-primary">Ageing Report</h1>
                </div>
                <div className="card-body p-2 p-md-3">
                    {/* All Controls in One Row - Slightly Increased Size */}
                    <div className="row g-2 mb-3">
                        <div className="col-md-2">
                            <div className="position-relative">
                                <input type="text" id="asOnDate" ref={asOnDateRef}
                                    className={`form-control form-control-sm no-date-icon ${dateError ? 'is-invalid' : ''}`}
                                    value={asOnDate}
                                    onChange={(e) => { setAsOnDate(e.target.value.replace(/[^0-9/-]/g, '')); setDateError(''); }}
                                    onBlur={() => asOnDate && !validateDate(asOnDate) && setDateError('Invalid date format')}
                                    onKeyDown={(e) => e.key === 'Enter' && handleGenerateReport()}
                                    placeholder={company.dateFormat === 'nepali' ? "YYYY-MM-DD" : "YYYY-MM-DD"}
                                    autoFocus
                                    autoComplete="off"
                                    style={{ height: '30px', fontSize: '0.8rem', width: '100%', paddingTop: '0.75rem' }} />
                                <label className="position-absolute" style={{ top: '-0.5rem', left: '0.75rem', fontSize: '0.75rem', backgroundColor: 'white', padding: '0 0.25rem', color: '#6c757d', fontWeight: '500' }}>
                                    As on Date: <span className="text-danger">*</span>
                                </label>
                                {dateError && <div className="invalid-feedback d-block" style={{ fontSize: '0.7rem' }}>{dateError}</div>}
                            </div>
                        </div>
                        <div className="col-md-1">
                            <button ref={generateBtnRef} className="btn btn-primary btn-sm w-100" onClick={handleGenerateReport} disabled={loading} style={{ height: '30px', fontSize: '0.75rem', padding: '0 6px' }}>
                                {loading ? <span className="spinner-border spinner-border-sm" style={{ width: '14px', height: '14px' }} /> : <><i className="fas fa-chart-line me-1"></i>Generate</>}
                            </button>
                        </div>
                        <div className="col-md-2">
                            <div className="input-group input-group-sm">
                                <span className="input-group-text" style={{ height: '30px', padding: '0 8px' }}><i className="fas fa-search small" style={{ fontSize: '11px' }}></i></span>
                                <input type="text" className="form-control form-control-sm" ref={searchInputRef} placeholder="Search account..." value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)} disabled={!hasGenerated} autoComplete="off"
                                    style={{ height: '30px', fontSize: '0.75rem' }} />
                            </div>
                        </div>
                        <div className="col-md-2">
                            <select className="form-select form-select-sm" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} disabled={!hasGenerated}
                                style={{ height: '30px', fontSize: '0.75rem', width: '100%', padding: '0 20px 0 8px' }}>
                                <option value="all">All</option>
                                <option value="receivable">Receivable</option>
                                <option value="payable">Payable</option>
                            </select>
                        </div>
                        <div className="col-md-1">
                            <select className="form-select form-select-sm" value={itemsPerPage} onChange={(e) => { setItemsPerPage(e.target.value === 'all' ? 'all' : parseInt(e.target.value)); setCurrentPage(1); }}
                                disabled={!hasGenerated} style={{ height: '30px', fontSize: '0.75rem', width: '100%', padding: '0 20px 0 8px' }}>
                                <option value="10">10</option><option value="25">25</option><option value="50">50</option><option value="all">All</option>
                            </select>
                        </div>
                        <div className="col-md-1">
                            <div className="form-check form-switch mt-2">
                                <input className="form-check-input" type="checkbox" role="switch" id="showTotals" checked={showTotals}
                                    onChange={() => setShowTotals(!showTotals)} disabled={!hasGenerated} style={{ marginTop: '2px' }} />
                                <label className="form-check-label small" htmlFor="showTotals" style={{ fontSize: '0.75rem' }}>Totals</label>
                            </div>
                        </div>
                        <div className="col-md-1">
                            <button className="btn btn-outline-success btn-sm w-100" onClick={exportToExcel} disabled={!hasGenerated || !filteredAndSortedReport.length || exporting}
                                style={{ height: '30px', fontSize: '0.7rem', padding: '0 4px' }}>
                                <i className="fas fa-file-excel me-1"></i>{exporting ? '...' : 'Excel'}
                            </button>
                        </div>
                        <div className="col-md-1">
                            <button className="btn btn-outline-primary btn-sm w-100" onClick={printReport} disabled={!hasGenerated || !filteredAndSortedReport.length}
                                style={{ height: '30px', fontSize: '0.7rem', padding: '0 4px' }}>
                                <i className="fas fa-print me-1"></i>Print
                            </button>
                        </div>
                    </div>

                    {error && <div className="alert alert-danger text-center py-1 mb-2 small" style={{ fontSize: '0.75rem' }}>{error}<button type="button" className="btn-close btn-sm ms-2" style={{ fontSize: '10px' }} onClick={() => setError(null)}></button></div>}

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
                                                <th className="text-end sortable" onClick={() => sortItems('over-120')} style={{ cursor: 'pointer', padding: '6px 8px' }}>Over 120 Days {getSortIndicator('over-120')}</th>
                                                <th className="text-end sortable" onClick={() => sortItems('netBalance')} style={{ cursor: 'pointer', padding: '6px 8px' }}>Closing {getSortIndicator('netBalance')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {currentPageItems.map((account, idx) => (
                                                <tr key={idx} className={account.isReceivable ? 'table-info' : 'table-warning'}>
                                                    <td style={{ padding: '4px 6px', textAlign: 'center' }}>{idx + 1}</td>
                                                    <td className="fw-bold" style={{ padding: '4px 6px' }}>{account.accountName}</td>
                                                    <td style={{ padding: '4px 6px' }}><span className={`badge ${account.isReceivable ? 'bg-info' : 'bg-warning'}`} style={{ fontSize: '0.65rem', padding: '3px 6px' }}>{account.isReceivable ? 'Receivable' : 'Payable'}</span></td>
                                                    <td className="text-end" style={{ padding: '4px 6px' }}>{formatCurrency(account.buckets['0-30'])}</td>
                                                    <td className="text-end" style={{ padding: '4px 6px' }}>{formatCurrency(account.buckets['30-60'])}</td>
                                                    <td className="text-end" style={{ padding: '4px 6px' }}>{formatCurrency(account.buckets['60-90'])}</td>
                                                    <td className="text-end" style={{ padding: '4px 6px' }}>{formatCurrency(account.buckets['90-120'])}</td>
                                                    <td className="text-end" style={{ padding: '4px 6px' }}>{formatCurrency(account.buckets['over-120'])}</td>
                                                    <td className="text-end fw-bold" style={{ padding: '4px 6px' }}>{formatCurrency(account.netBalance)}</td>
                                                </tr>
                                            ))}
                                        </tbody>

                                        {showTotals && currentPageItems.length > 0 && (
                                            <tfoot className="table-group-divider">
                                                {(() => {
                                                    // Calculate totals for current page items only
                                                    const pageReceivableTotals = { '0-30': 0, '30-60': 0, '60-90': 0, '90-120': 0, 'over-120': 0, total: 0 };
                                                    const pagePayableTotals = { '0-30': 0, '30-60': 0, '60-90': 0, '90-120': 0, 'over-120': 0, total: 0 };
                                                    const pageNetTotals = { '0-30': 0, '30-60': 0, '60-90': 0, '90-120': 0, 'over-120': 0, total: 0 };

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
                                                                <td className="text-end" style={{ padding: '6px 8px' }}>{formatCurrency(pageReceivableTotals['over-120'])}</td>
                                                                <td className="text-end" style={{ padding: '6px 8px' }}>{formatCurrency(pageReceivableTotals.total)}</td>
                                                            </tr>
                                                            <tr className="fw-bold table-secondary">
                                                                <td colSpan="3" style={{ padding: '6px 8px' }}>Total Payables</td>
                                                                <td className="text-end" style={{ padding: '6px 8px' }}>{formatCurrency(pagePayableTotals['0-30'])}</td>
                                                                <td className="text-end" style={{ padding: '6px 8px' }}>{formatCurrency(pagePayableTotals['30-60'])}</td>
                                                                <td className="text-end" style={{ padding: '6px 8px' }}>{formatCurrency(pagePayableTotals['60-90'])}</td>
                                                                <td className="text-end" style={{ padding: '6px 8px' }}>{formatCurrency(pagePayableTotals['90-120'])}</td>
                                                                <td className="text-end" style={{ padding: '6px 8px' }}>{formatCurrency(pagePayableTotals['over-120'])}</td>
                                                                <td className="text-end" style={{ padding: '6px 8px' }}>{formatCurrency(pagePayableTotals.total)}</td>
                                                            </tr>
                                                            <tr className="fw-bold table-primary">
                                                                <td colSpan="3" style={{ padding: '6px 8px' }}>Net Total</td>
                                                                <td className="text-end" style={{ padding: '6px 8px' }}>{formatCurrency(pageNetTotals['0-30'])}</td>
                                                                <td className="text-end" style={{ padding: '6px 8px' }}>{formatCurrency(pageNetTotals['30-60'])}</td>
                                                                <td className="text-end" style={{ padding: '6px 8px' }}>{formatCurrency(pageNetTotals['60-90'])}</td>
                                                                <td className="text-end" style={{ padding: '6px 8px' }}>{formatCurrency(pageNetTotals['90-120'])}</td>
                                                                <td className="text-end" style={{ padding: '6px 8px' }}>{formatCurrency(pageNetTotals['over-120'])}</td>
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
                                    <div className="row mt-2"><div className="col-12">
                                        <nav><ul className="pagination justify-content-center pagination-sm" style={{ marginBottom: '0' }}>
                                            <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}><button className="page-link" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => handlePageChange(currentPage - 1)}>Previous</button></li>
                                            {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                                                let p = totalPages <= 5 ? i + 1 : (currentPage <= 3 ? i + 1 : (currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i));
                                                return <li key={p} className={`page-item ${currentPage === p ? 'active' : ''}`}><button className="page-link" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => handlePageChange(p)}>{p}</button></li>;
                                            })}
                                            <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}><button className="page-link" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => handlePageChange(currentPage + 1)}>Next</button></li>
                                        </ul></nav>
                                        <div className="text-center text-muted small" style={{ fontSize: '0.7rem' }}>Showing {((currentPage - 1) * (itemsPerPage === 'all' ? 1 : itemsPerPage)) + 1} to {Math.min(currentPage * (itemsPerPage === 'all' ? filteredAndSortedReport.length : itemsPerPage), filteredAndSortedReport.length)} of {filteredAndSortedReport.length} accounts</div>
                                    </div></div>
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
                            <i className="fas fa-info-circle me-2"></i>Please select an "As on Date" and click "Generate" to view the ageing report.
                        </div>
                    )}
                </div>
            </div>
            <NotificationToast show={notification.show} message={notification.message} type={notification.type} duration={notification.duration} onClose={() => setNotification({ ...notification, show: false })} />
        </div>
    );
};

export default AgeingReportAllAccounts;
