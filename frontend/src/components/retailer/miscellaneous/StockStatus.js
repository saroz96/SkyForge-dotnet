import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import Header from '../Header';
import Loader from '../../Loader';
import { usePageNotRefreshContext } from '../PageNotRefreshContext';
import * as XLSX from 'xlsx';
import ProductModal from '../dashboard/modals/ProductModal';
import NotificationToast from '../../NotificationToast';
import NepaliDate from 'nepali-datetime';
import './StockStatus.css';
import api, { refreshToken } from '../../services/api';

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

const getVatFilterLabel = (vatFilter) => {
    if (vatFilter === '13') return '13% VAT';
    if (vatFilter === 'vatExempt') return 'VAT Exempt';
    return 'All Items';
};

const StockStatus = () => {
    const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
    const currentEnglishDate = new Date().toISOString().split('T')[0];
    const { draftStockStatusSave, setDraftStockStatusSave } = usePageNotRefreshContext();
    const [showProductModal, setShowProductModal] = useState(false);

    // const api = useMemo(() => {
    //     const instance = axios.create({
    //         baseURL: process.env.REACT_APP_API_BASE_URL,
    //         withCredentials: true,
    //     });
    //     instance.interceptors.request.use((config) => {
    //         const token = localStorage.getItem('token');
    //         if (token) config.headers.Authorization = `Bearer ${token}`;
    //         return config;
    //     });
    //     return instance;
    // }, []);

    const [dateRange, setDateRange] = useState(() => {
        const d = draftStockStatusSave?.stockStatusData;
        return d ? {
            fromDate: d.fromDate || '', toDate: d.toDate || '',
            fromDateAd: d.fromDateAd || '', toDateAd: d.toDateAd || ''
        } : { fromDate: '', toDate: '', fromDateAd: '', toDateAd: '' };
    });

    const [data, setData] = useState(() => {
        const d = draftStockStatusSave?.stockStatusData;
        return d ? {
            items: d.items || [],
            pagination: d.pagination || { current: 1, pages: 1, total: 0 },
            searchQuery: d.searchQuery || '',
            currentPage: d.currentPage || 1,
            itemsPerPage: d.itemsPerPage || 10,
            displayOptions: d.displayOptions || { showPurchaseValue: false, showSalesValue: false },
            sortConfig: d.sortConfig || { key: 'name', direction: 'ascending' },
            isAdminOrSupervisor: d.isAdminOrSupervisor || false,
            vatFilter: d.vatFilter || 'all'
        } : {
            items: [], pagination: { current: 1, pages: 1, total: 0 },
            searchQuery: '', currentPage: 1, itemsPerPage: 10,
            displayOptions: { showPurchaseValue: false, showSalesValue: false },
            sortConfig: { key: 'name', direction: 'ascending' },
            isAdminOrSupervisor: false, vatFilter: 'all'
        };
    });

    const [dateErrors, setDateErrors] = useState({ fromDate: '', toDate: '' });
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [error, setError] = useState(null);
    const [hasGenerated, setHasGenerated] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [notification, setNotification] = useState({ show: false, message: '', type: 'success', duration: 3000 });
    const [company, setCompany] = useState({
        dateFormat: 'english', fiscalYear: null,
        currentCompanyName: '', address: '', city: '', pan: ''
    });

    const fromDateRef = useRef(null);
    const toDateRef = useRef(null);
    const abortControllerRef = useRef(null);

    useEffect(() => {
        const fetchCompanyInfo = async () => {
            try {
                setInitialLoading(true);
                const response = await api.get('/api/retailer/sales-register/entry-data');
                if (response.data.success) {
                    const rd = response.data.data;
                    const dateFormat = rd.company?.dateFormat?.toLowerCase() || 'english';
                    const fy = rd.currentFiscalYear;
                    setCompany({
                        dateFormat, fiscalYear: fy || {},
                        currentCompanyName: rd.company?.name || '',
                        address: rd.company?.address || '',
                        city: rd.company?.city || '',
                        pan: rd.company?.pan || ''
                    });
                    const hasDraft = draftStockStatusSave?.stockStatusData?.fromDate;
                    if (!hasDraft && fy) {
                        let from = '', to = '', fromAd = '', toAd = '';
                        if (dateFormat === 'nepali') {
                            from = fy.startDateNepali || currentNepaliDate;
                            to = currentNepaliDate;
                            fromAd = convertBsToAd(from);
                            toAd = convertBsToAd(to);
                        } else {
                            from = fy.startDate ? new Date(fy.startDate).toISOString().split('T')[0] : currentEnglishDate;
                            to = fy.endDate ? new Date(fy.endDate).toISOString().split('T')[0] : currentEnglishDate;
                            fromAd = from; toAd = to;
                        }
                        setDateRange({ fromDate: from, toDate: to, fromDateAd: fromAd, toDateAd: toAd });
                    }
                }
            } catch {
                setDateRange({ fromDate: currentEnglishDate, toDate: currentEnglishDate, fromDateAd: currentEnglishDate, toDateAd: currentEnglishDate });
            } finally {
                setInitialLoading(false);
            }
        };
        fetchCompanyInfo();
    }, []);

    const validateDate = (dateStr) => {
        if (!dateStr) return false;
        if (company.dateFormat === 'nepali') {
            const m = dateStr.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
            if (!m) return false;
            const [, y, mo, d] = m.map(Number);
            try {
                const nd = new NepaliDate(y, mo - 1, d);
                return nd.getYear() === y && nd.getMonth() + 1 === mo && nd.getDate() === d;
            } catch { return false; }
        }
        return /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(dateStr) && !isNaN(new Date(dateStr).getTime());
    };

    const validateAndCorrectNepaliDate = (dateStr) => {
        if (!dateStr) return null;
        if (isValidNepaliDate(dateStr)) return dateStr;
        const m = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        if (!m) return null;
        const corrected = `${m[1]}-${String(Math.min(12, Math.max(1, +m[2]))).padStart(2, '0')}-${String(Math.min(32, Math.max(1, +m[3]))).padStart(2, '0')}`;
        return isValidNepaliDate(corrected) ? corrected : null;
    };

    const fetchStockItems = useCallback(async () => {
        if (!dateRange.fromDate || !dateRange.toDate) {
            setDateErrors({ fromDate: 'Required', toDate: 'Required' });
            return;
        }
        if (company.dateFormat === 'nepali') {
            if (!validateDate(dateRange.fromDate)) { setDateErrors(p => ({ ...p, fromDate: 'Invalid' })); fromDateRef.current?.focus(); return; }
            if (!validateDate(dateRange.toDate)) { setDateErrors(p => ({ ...p, toDate: 'Invalid' })); toDateRef.current?.focus(); return; }
        }
        abortControllerRef.current?.abort();
        abortControllerRef.current = new AbortController();
        try {
            setLoading(true); setError(null);
            const params = new URLSearchParams();
            params.append('page', data.currentPage);
            params.append('limit', data.itemsPerPage === 'all' ? 10000 : data.itemsPerPage);
            params.append('fromDate', dateRange.fromDateAd || dateRange.fromDate);
            params.append('toDate', dateRange.toDateAd || dateRange.toDate);
            if (data.searchQuery) params.append('search', data.searchQuery);
            if (data.displayOptions.showPurchaseValue) params.append('showPurchaseValue', true);
            if (data.displayOptions.showSalesValue) params.append('showSalesValue', true);
            if (data.vatFilter !== 'all') params.append('vatFilter', data.vatFilter);

            const response = await api.get(`/api/retailer/stock-status?${params}`, { signal: abortControllerRef.current.signal });
            if (response.data.success) {
                const rd = response.data.data;
                setData(p => ({ ...p, items: rd.items || [], pagination: rd.pagination || p.pagination, isAdminOrSupervisor: rd.isAdminOrSupervisor || false }));
                setHasGenerated(true);
                setNotification({ show: true, message: 'Stock status loaded!', type: 'success', duration: 2000 });
            }
        } catch (err) {
            if (err.name === 'AbortError' || err.name === 'CanceledError') return;
            const msg = err.response?.data?.error || 'Failed to fetch stock status';
            setError(msg);
            setNotification({ show: true, message: msg, type: 'error', duration: 3000 });
        } finally { setLoading(false); }
    }, [data.currentPage, data.itemsPerPage, data.searchQuery, data.displayOptions, data.vatFilter, dateRange, company.dateFormat]);

    const handleGenerateReport = () => {
        setDateErrors({ fromDate: '', toDate: '' });
        if (!dateRange.fromDate) { setDateErrors(p => ({ ...p, fromDate: 'Required' })); return; }
        if (!dateRange.toDate) { setDateErrors(p => ({ ...p, toDate: 'Required' })); return; }
        fetchStockItems();
    };

    const handleFromDateChange = (e) => {
        const v = e.target.value.replace(/[^0-9/-]/g, '').slice(0, 10);
        setDateRange(p => ({ ...p, fromDate: v, fromDateAd: convertBsToAd(v) || p.fromDateAd }));
        setDateErrors(p => ({ ...p, fromDate: '' }));
    };
    const handleToDateChange = (e) => {
        const v = e.target.value.replace(/[^0-9/-]/g, '').slice(0, 10);
        setDateRange(p => ({ ...p, toDate: v, toDateAd: convertBsToAd(v) || p.toDateAd }));
        setDateErrors(p => ({ ...p, toDate: '' }));
    };
    const handleFromDateAdChange = (e) => {
        const v = e.target.value;
        setDateRange(p => ({ ...p, fromDateAd: v, fromDate: convertAdToBs(v) || p.fromDate }));
    };
    const handleToDateAdChange = (e) => {
        const v = e.target.value;
        setDateRange(p => ({ ...p, toDateAd: v, toDate: convertAdToBs(v) || p.toDate }));
    };

    const handleDateBlur = (field) => {
        const dateStr = dateRange[field]?.trim();
        if (!dateStr || company.dateFormat !== 'nepali') return;
        const corrected = validateAndCorrectNepaliDate(dateStr);
        const adField = field === 'fromDate' ? 'fromDateAd' : 'toDateAd';
        if (!corrected) {
            setDateRange(p => ({ ...p, [field]: currentNepaliDate, [adField]: convertBsToAd(currentNepaliDate) }));
        } else if (corrected !== dateStr) {
            setDateRange(p => ({ ...p, [field]: corrected, [adField]: convertBsToAd(corrected) }));
        }
    };

    useEffect(() => {
        if (!hasGenerated) return;
        const t = setTimeout(() => {
            if (data.currentPage !== 1) setData(p => ({ ...p, currentPage: 1 }));
            else fetchStockItems();
        }, 500);
        return () => clearTimeout(t);
    }, [data.searchQuery]);

    useEffect(() => { if (hasGenerated) fetchStockItems(); }, [data.currentPage, data.itemsPerPage, data.displayOptions.showPurchaseValue, data.displayOptions.showSalesValue, data.vatFilter]);

    useEffect(() => {
        if (hasGenerated) {
            setDraftStockStatusSave({ ...draftStockStatusSave, stockStatusData: { ...data, ...dateRange } });
        }
    }, [data, dateRange]);

    const sortItems = (key) => {
        setData(p => ({
            ...p,
            sortConfig: { key, direction: p.sortConfig.key === key && p.sortConfig.direction === 'ascending' ? 'descending' : 'ascending' }
        }));
    };

    const sortedItems = useMemo(() => {
        if (!Array.isArray(data.items)) return [];
        const { key, direction } = data.sortConfig;
        return [...data.items].sort((a, b) => {
            let av = a[key], bv = b[key];
            if (typeof av === 'number' && typeof bv === 'number') return direction === 'ascending' ? av - bv : bv - av;
            av = (av ?? '').toString().toLowerCase();
            bv = (bv ?? '').toString().toLowerCase();
            return direction === 'ascending' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
        });
    }, [data.items, data.sortConfig]);

    const formatCurrency = useCallback((num) => {
        if (num == null) return '0.00';
        const n = Math.abs(typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num));
        if (isNaN(n)) return '0.00';
        return n.toLocaleString(company.dateFormat === 'nepali' ? 'en-IN' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }, [company.dateFormat]);

    const totals = useMemo(() => sortedItems.reduce((a, i) => {
        a.totalStock += i.stock || 0; a.totalOpeningStock += i.openingStock || 0;
        a.totalQtyIn += i.totalQtyIn || 0; a.totalQtyOut += i.totalQtyOut || 0;
        if (data.displayOptions.showPurchaseValue) a.totalPurchaseValue += i.totalStockValuePurchase || 0;
        if (data.displayOptions.showSalesValue) a.totalSalesValue += i.totalStockValueSales || 0;
        return a;
    }, { totalStock: 0, totalOpeningStock: 0, totalQtyIn: 0, totalQtyOut: 0, totalPurchaseValue: 0, totalSalesValue: 0 }), [sortedItems, data.displayOptions]);

    const summaryStats = useMemo(() => ({
        lowStock: sortedItems.filter(i => i.stock <= (i.minStock || 0)).length,
        highStock: sortedItems.filter(i => i.stock >= (i.maxStock || Infinity)).length,
    }), [sortedItems]);

    const sortIcon = (key) => data.sortConfig.key !== key
        ? <i className="bi bi-arrow-down-up ms-1 opacity-25" style={{ fontSize: '0.55rem' }} />
        : <i className={`bi bi-sort-${data.sortConfig.direction === 'ascending' ? 'down' : 'up'} ms-1`} style={{ fontSize: '0.55rem' }} />;

    const handleKeyDown = (e, nextId) => {
        if (e.key === 'Enter') { e.preventDefault(); nextId ? document.getElementById(nextId)?.focus() : handleGenerateReport(); }
    };

    // const exportToExcel = async () => {
    //     if (!hasGenerated || !sortedItems.length) {
    //         setNotification({ show: true, message: 'Generate report first', type: 'warning', duration: 2000 });
    //         return;
    //     }
    //     setExporting(true);
    //     try {
    //         const rows = sortedItems.map((item, i) => ({
    //             '#': i + 1, Code: item.code || '', 'Item Name': item.name,
    //             Category: item.category || '-', Unit: item.unit || '-',
    //             Stock: formatCurrency(item.stock), 'Op. Stock': formatCurrency(item.openingStock),
    //             'Qty In': formatCurrency(item.totalQtyIn), 'Qty Out': formatCurrency(item.totalQtyOut),
    //             'C.P': formatCurrency(item.avgPuPrice), 'S.P': formatCurrency(item.avgPrice),
    //             ...(data.displayOptions.showPurchaseValue && { 'Val(CP)': formatCurrency(item.totalStockValuePurchase) }),
    //             ...(data.displayOptions.showSalesValue && { 'Val(SP)': formatCurrency(item.totalStockValueSales) }),
    //         }));
    //         const ws = XLSX.utils.json_to_sheet(rows);
    //         const wb = XLSX.utils.book_new();
    //         XLSX.utils.book_append_sheet(wb, ws, 'Stock Status');
    //         XLSX.writeFile(wb, `Stock_Status_${new Date().toISOString().split('T')[0]}.xlsx`);
    //         setNotification({ show: true, message: 'Exported!', type: 'success', duration: 2000 });
    //     } catch {
    //         setNotification({ show: true, message: 'Export failed', type: 'error', duration: 2000 });
    //     } finally { setExporting(false); }
    // };

    // const printStockStatus = () => {
    //     if (!hasGenerated || !sortedItems.length) {
    //         setNotification({ show: true, message: 'Generate report first', type: 'warning', duration: 2000 });
    //         return;
    //     }
    //     const w = window.open('', '_blank');
    //     w.document.write(`<!DOCTYPE html><html><head><title>Stock Status</title>
    //         <style>@page{size:A4 landscape;margin:8mm}body{font-family:Segoe UI,Arial;font-size:8px}
    //         table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:3px 4px}
    //         th{background:#f1f5f9}.text-end{text-align:right}h2{text-align:center;margin:0 0 8px}</style></head><body>
    //         <h2>${company.currentCompanyName} — Stock Status</h2>
    //         <p>${dateRange.fromDate} to ${dateRange.toDate} (BS) | ${getVatFilterLabel(data.vatFilter)}</p>
    //         <table><thead><tr><th>#</th><th>Code</th><th>Name</th><th>Category</th><th>Unit</th>
    //         <th class="text-end">Stock</th><th class="text-end">Op</th><th class="text-end">In</th><th class="text-end">Out</th>
    //         <th class="text-end">CP</th><th class="text-end">SP</th></tr></thead><tbody>
    //         ${sortedItems.map((item, i) => `<tr><td>${i+1}</td><td>${item.code||''}</td><td>${item.name}</td>
    //         <td>${item.category||'-'}</td><td>${item.unit||'-'}</td>
    //         <td class="text-end">${formatCurrency(item.stock)}</td><td class="text-end">${formatCurrency(item.openingStock)}</td>
    //         <td class="text-end">${formatCurrency(item.totalQtyIn)}</td><td class="text-end">${formatCurrency(item.totalQtyOut)}</td>
    //         <td class="text-end">${formatCurrency(item.avgPuPrice)}</td><td class="text-end">${formatCurrency(item.avgPrice)}</td></tr>`).join('')}
    //         </tbody></table><script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}</script></body></html>`);
    //     w.document.close();
    // };


    const exportToExcel = async () => {
        if (!hasGenerated || !sortedItems.length) {
            setNotification({ show: true, message: 'Please generate the report first', type: 'warning', duration: 3000 });
            return;
        }

        setExporting(true);
        try {
            const headerInfo = [
                ['Stock Status Report'],
                [`Company: ${company.currentCompanyName || 'Company Name'}`],
                [`Address: ${company.address || ''}${company.city ? ', ' + company.city : ''}`],
                [`TPIN: ${company.pan || ''}`],
                [`Period: ${dateRange.fromDate} to ${dateRange.toDate} (BS)`],
                [`Fiscal Year: ${company.fiscalYear?.name || 'N/A'}`],
                [`VAT Status: ${getVatFilterLabel(data.vatFilter)}`],
                [`Total Items: ${sortedItems.length}${data.searchQuery ? ` | Search: "${data.searchQuery}"` : ''}`],
                [`Generated on: ${new Date().toLocaleString()}`],
                [],
            ];

            const dataToExport = sortedItems.map((item, index) => {
                const rowData = {
                    '#': index + 1,
                    'Code': item.code || '',
                    'Item Name': item.name,
                    'Category': item.category || '-',
                    'Unit': item.unit || '-',
                    'Stock': formatCurrency(item.stock),
                    'Op. Stock': formatCurrency(item.openingStock),
                    'Qty. In': formatCurrency(item.totalQtyIn),
                    'Qty. Out': formatCurrency(item.totalQtyOut),
                    'Min Stock': item.minStock || '-',
                    'Max Stock': item.maxStock || '-',
                    'C.P': formatCurrency(item.avgPuPrice),
                    'S.P': formatCurrency(item.avgPrice)
                };
                if (data.displayOptions.showPurchaseValue) rowData['Stock Value (CP)'] = formatCurrency(item.totalStockValuePurchase);
                if (data.displayOptions.showSalesValue) rowData['Stock Value (SP)'] = formatCurrency(item.totalStockValueSales);
                return rowData;
            });

            const totalsRow = {
                '#': '', 'Code': '', 'Item Name': 'TOTALS', 'Category': '', 'Unit': '',
                'Stock': formatCurrency(totals.totalStock),
                'Op. Stock': formatCurrency(totals.totalOpeningStock),
                'Qty. In': formatCurrency(totals.totalQtyIn),
                'Qty. Out': formatCurrency(totals.totalQtyOut),
                'Min Stock': '', 'Max Stock': '', 'C.P': '', 'S.P': ''
            };
            if (data.displayOptions.showPurchaseValue) totalsRow['Stock Value (CP)'] = formatCurrency(totals.totalPurchaseValue);
            if (data.displayOptions.showSalesValue) totalsRow['Stock Value (SP)'] = formatCurrency(totals.totalSalesValue);
            dataToExport.push(totalsRow);

            const ws = XLSX.utils.json_to_sheet(dataToExport);
            const existingData = XLSX.utils.sheet_to_json(ws, { header: 1 });
            const columns = existingData[0] ? existingData[0].length : Object.keys(dataToExport[0] || {}).length;
            const headerRows = headerInfo.length;
            const newData = [];

            headerInfo.forEach(row => {
                const newRow = Array(columns).fill('');
                row.forEach((val, idx) => { if (idx < columns) newRow[idx] = val; });
                newData.push(newRow);
            });
            existingData.forEach(row => {
                const newRow = Array(columns).fill('');
                row.forEach((val, idx) => { if (idx < columns) newRow[idx] = val; });
                newData.push(newRow);
            });

            const newWs = XLSX.utils.aoa_to_sheet(newData);
            newWs['!cols'] = [
                { wch: 6 }, { wch: 15 }, { wch: 30 }, { wch: 20 }, { wch: 10 },
                { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 },
                { wch: 10 }, { wch: 12 }, { wch: 12 }
            ];

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, newWs, 'Stock Status');

            const date = new Date().toISOString().split('T')[0];
            let fileName = `Stock_Status_${date}`;
            if (data.vatFilter && data.vatFilter !== 'all') fileName += `_${data.vatFilter}`;
            XLSX.writeFile(wb, `${fileName}.xlsx`);
            setNotification({ show: true, message: 'Excel file exported successfully!', type: 'success', duration: 3000 });
        } catch (err) {
            console.error('Export error:', err);
            setNotification({ show: true, message: 'Failed to export data', type: 'error', duration: 3000 });
        } finally {
            setExporting(false);
        }
    };

    const printStockStatus = () => {
        if (!hasGenerated || !sortedItems.length) {
            setNotification({ show: true, message: 'Please generate the report first', type: 'warning', duration: 3000 });
            return;
        }

        const printWindow = window.open('', '_blank');
        const fiscalYear = company.fiscalYear?.name || 'N/A';

        const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Stock Status Report</title>
        <style>
            @page { size: A4 landscape; margin: 8mm; }
            body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 8px; margin: 0; padding: 4mm; color: #0f172a; }
            .print-header { text-align: center; margin-bottom: 12px; border-bottom: 2px solid #1e3a5f; padding-bottom: 8px; }
            .company-name { font-size: 16px; font-weight: 700; color: #1e3a5f; }
            .print-header p { font-size: 8px; margin: 4px 0; color: #64748b; }
            .report-title { font-size: 12px; font-weight: 600; margin-top: 6px; }
            table { width: 100%; border-collapse: collapse; font-size: 8px; }
            th, td { border: 1px solid #cbd5e1; padding: 4px 5px; }
            th { background: #f1f5f9; font-weight: 600; text-transform: uppercase; font-size: 7px; letter-spacing: 0.03em; }
            .text-end { text-align: right; }
            .filter-info { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 8px; background: #f8fafc; padding: 6px 8px; border-radius: 4px; }
            .print-footer { margin-top: 8px; font-size: 7px; text-align: right; color: #64748b; }
            tfoot tr { background: #f1f5f9; font-weight: 700; }
        </style>
    </head>
    <body>
        <div class="print-header">
            <div class="company-name">${company.currentCompanyName || 'Company Name'}</div>
            <p>${company.address || ''}${company.city ? ', ' + company.city : ''} | TPIN: ${company.pan || ''}</p>
            <div class="report-title">Stock Status Report</div>
        </div>
        <div class="filter-info">
            <div><strong>Period:</strong> ${dateRange.fromDate} — ${dateRange.toDate} (BS) | <strong>F.Y:</strong> ${fiscalYear}</div>
            <div><strong>VAT:</strong> ${getVatFilterLabel(data.vatFilter)} | <strong>Items:</strong> ${sortedItems.length}</div>
        </div>
        <table>
            <thead>
                <tr>
                    <th style="text-align:center;">#</th><th>Code</th><th>Item Name</th><th>Category</th><th>Unit</th>
                    <th class="text-end">Stock</th><th class="text-end">Op. Stock</th><th class="text-end">Qty In</th><th class="text-end">Qty Out</th>
                    <th class="text-end">Min</th><th class="text-end">Max</th><th class="text-end">C.P</th><th class="text-end">S.P</th>
                    ${data.displayOptions.showPurchaseValue ? '<th class="text-end">Val (CP)</th>' : ''}
                    ${data.displayOptions.showSalesValue ? '<th class="text-end">Val (SP)</th>' : ''}
                </tr>
            </thead>
            <tbody>
                ${sortedItems.map((item, index) => `
                    <tr>
                        <td style="text-align:center;">${index + 1}</td>
                        <td>${item.code || ''}</td><td>${item.name}</td><td>${item.category || '-'}</td><td>${item.unit || '-'}</td>
                        <td class="text-end">${formatCurrency(item.stock)}</td><td class="text-end">${formatCurrency(item.openingStock)}</td>
                        <td class="text-end">${formatCurrency(item.totalQtyIn)}</td><td class="text-end">${formatCurrency(item.totalQtyOut)}</td>
                        <td class="text-end">${item.minStock || '-'}</td><td class="text-end">${item.maxStock || '-'}</td>
                        <td class="text-end">${formatCurrency(item.avgPuPrice)}</td><td class="text-end">${formatCurrency(item.avgPrice)}</td>
                        ${data.displayOptions.showPurchaseValue ? `<td class="text-end">${formatCurrency(item.totalStockValuePurchase)}</td>` : ''}
                        ${data.displayOptions.showSalesValue ? `<td class="text-end">${formatCurrency(item.totalStockValueSales)}</td>` : ''}
                    </tr>
                `).join('')}
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="5" style="text-align:right;">Totals</td>
                    <td class="text-end">${formatCurrency(totals.totalStock)}</td>
                    <td class="text-end">${formatCurrency(totals.totalOpeningStock)}</td>
                    <td class="text-end">${formatCurrency(totals.totalQtyIn)}</td>
                    <td class="text-end">${formatCurrency(totals.totalQtyOut)}</td>
                    <td colspan="2"></td><td></td><td></td>
                    ${data.displayOptions.showPurchaseValue ? `<td class="text-end">${formatCurrency(totals.totalPurchaseValue)}</td>` : ''}
                    ${data.displayOptions.showSalesValue ? `<td class="text-end">${formatCurrency(totals.totalSalesValue)}</td>` : ''}
                </tr>
            </tfoot>
        </table>
        <div class="print-footer">Printed on ${new Date().toLocaleString()}</div>
        <script>window.onload=function(){window.print();window.onafterprint=function(){window.close();};}</script>
    </body>
    </html>`;

        printWindow.document.write(printContent);
        printWindow.document.close();
    };


    useEffect(() => {
        const fn = (e) => { if (e.key === 'F9') { e.preventDefault(); setShowProductModal(p => !p); } };
        window.addEventListener('keydown', fn);
        return () => window.removeEventListener('keydown', fn);
    }, []);

    if (initialLoading) return <Loader />;

    return (
        <div className="stock-status-page">
            <Header />

            <div className="ss-shell">
                {/* Compact header bar */}
                <div className="ss-topbar">
                    <div className="ss-topbar__left">
                        <div className="ss-topbar__icon"><i className="bi bi-box-seam" /></div>
                        <div>
                            <h1>Stock Status</h1>
                            {/* <p className="ss-topbar__meta">
                                {company.currentCompanyName}{company.fiscalYear?.name ? ` · FY ${company.fiscalYear.name}` : ''}{company.pan ? ` · ${company.pan}` : ''}
                            </p> */}
                        </div>
                    </div>
                    <div className="ss-topbar__actions">
                        <button type="button" className="ss-btn-icon" onClick={exportToExcel} disabled={!hasGenerated || !sortedItems.length || exporting}>
                            <i className="bi bi-file-earmark-excel" />{exporting ? '…' : 'Excel'}
                        </button>
                        <button type="button" className="ss-btn-icon" onClick={printStockStatus} disabled={!hasGenerated || !sortedItems.length}>
                            <i className="bi bi-printer" />Print
                        </button>
                    </div>
                </div>

                {/* Single-row toolbar — all controls on one line */}
                <div className="ss-toolbar">
                    <div className="ss-field ss-field--bs">
                        <label>From BS <span className="req">*</span></label>
                        <input ref={fromDateRef} id="fromDate" className={dateErrors.fromDate ? 'is-invalid' : ''}
                            value={dateRange.fromDate} onChange={handleFromDateChange} onBlur={() => handleDateBlur('fromDate')}
                            onKeyDown={(e) => handleKeyDown(e, 'fromDateAd')} placeholder="YYYY-MM-DD" autoFocus />
                    </div>
                    <div className="ss-field ss-field--ad">
                        <label>From AD</label>
                        <input type="date" id="fromDateAd" value={dateRange.fromDateAd || ''} onChange={handleFromDateAdChange} onKeyDown={(e) => handleKeyDown(e, 'toDate')} />
                    </div>
                    <div className="ss-field ss-field--bs">
                        <label>To BS <span className="req">*</span></label>
                        <input ref={toDateRef} id="toDate" className={dateErrors.toDate ? 'is-invalid' : ''}
                            value={dateRange.toDate} onChange={handleToDateChange} onBlur={() => handleDateBlur('toDate')}
                            onKeyDown={(e) => handleKeyDown(e, 'toDateAd')} placeholder="YYYY-MM-DD" />
                    </div>
                    <div className="ss-field ss-field--ad">
                        <label>To AD</label>
                        <input type="date" id="toDateAd" value={dateRange.toDateAd || ''} onChange={handleToDateAdChange} onKeyDown={(e) => handleKeyDown(e, 'generateReport')} />
                    </div>
                    <button type="button" id="generateReport" className="ss-btn-gen" onClick={handleGenerateReport} disabled={loading}>
                        {loading ? <span className="spinner-border spinner-border-sm" style={{ width: 12, height: 12 }} /> : <><i className="bi bi-play-fill" /> Generate</>}
                    </button>

                    <div className="ss-toolbar-divider" />

                    <div className="ss-field ss-field--search">
                        <label>Search</label>
                        <input id="searchInput" placeholder="Name, code…" value={data.searchQuery}
                            onChange={(e) => setData(p => ({ ...p, searchQuery: e.target.value }))} disabled={!hasGenerated} />
                    </div>
                    <div className="ss-field ss-field--select">
                        <label>Rows</label>
                        <select value={data.itemsPerPage} disabled={!hasGenerated}
                            onChange={(e) => setData(p => ({ ...p, itemsPerPage: e.target.value === 'all' ? 'all' : +e.target.value, currentPage: 1 }))}>
                            <option value="10">10</option><option value="25">25</option><option value="50">50</option><option value="all">All</option>
                        </select>
                    </div>
                    <div className="ss-field ss-field--vat">
                        <label>VAT</label>
                        <select value={data.vatFilter} disabled={!hasGenerated}
                            onChange={(e) => setData(p => ({ ...p, vatFilter: e.target.value, currentPage: 1 }))}>
                            <option value="all">All</option><option value="13">13%</option><option value="vatExempt">Exempt</option>
                        </select>
                    </div>

                    <div className="ss-toggles">
                        <div className="ss-toggle-item">
                            <span>CP</span>
                            <input className="form-check-input" type="checkbox" name="showPurchaseValue"
                                checked={data.displayOptions.showPurchaseValue} disabled={!hasGenerated}
                                onChange={(e) => setData(p => ({ ...p, displayOptions: { ...p.displayOptions, showPurchaseValue: e.target.checked }, currentPage: 1 }))} />
                        </div>
                        <div className="ss-toggle-item">
                            <span>SP</span>
                            <input className="form-check-input" type="checkbox" name="showSalesValue"
                                checked={data.displayOptions.showSalesValue} disabled={!hasGenerated}
                                onChange={(e) => setData(p => ({ ...p, displayOptions: { ...p.displayOptions, showSalesValue: e.target.checked }, currentPage: 1 }))} />
                        </div>
                    </div>

                    {/* Inline stats — no separate row */}
                    {hasGenerated && sortedItems.length > 0 && (
                        <>
                            <div className="ss-toolbar-divider" />
                            <div className="ss-chips">
                                {/* <span className="ss-chip ss-chip--blue"><span className="ss-chip__label">Items</span><span className="ss-chip__val">{data.pagination?.total || sortedItems.length}</span></span> */}
                                {/* <span className="ss-chip ss-chip--green"><span className="ss-chip__label">Stock</span><span className="ss-chip__val">{formatCurrency(totals.totalStock)}</span></span> */}
                                {summaryStats.lowStock > 0 && <span className="ss-chip ss-chip--red"><span className="ss-chip__label">Low</span><span className="ss-chip__val">{summaryStats.lowStock}</span></span>}
                                {summaryStats.highStock > 0 && <span className="ss-chip ss-chip--amber"><span className="ss-chip__label">Over</span><span className="ss-chip__val">{summaryStats.highStock}</span></span>}
                            </div>
                        </>
                    )}
                </div>

                {error && (
                    <div className="ss-alert">
                        <i className="bi bi-exclamation-circle" />{error}
                        <button type="button" className="btn-close btn-sm ms-auto" onClick={() => setError(null)} />
                    </div>
                )}

                {/* Main table area — fills all remaining viewport height */}
                <div className="ss-main">
                    {loading ? (
                        <div className="ss-state">
                            <div className="spinner-border spinner-border-sm text-primary" />
                            <p style={{ marginTop: '0.5rem' }}>Loading…</p>
                        </div>
                    ) : !hasGenerated ? (
                        <div className="ss-state">
                            <i className="bi bi-calendar-range" />
                            <h3>Select dates &amp; generate</h3>
                            <p>All controls are above — report fills this area.</p>
                        </div>
                    ) : sortedItems.length === 0 ? (
                        <div className="ss-state">
                            <i className="bi bi-inbox" />
                            <h3>No items found</h3>
                            <p>{data.searchQuery ? 'Try a different search.' : 'No stock for this date range.'}</p>
                        </div>
                    ) : (
                        <>
                            <div className="ss-main__bar">
                                <span><strong>{sortedItems.length}</strong> items · {getVatFilterLabel(data.vatFilter)}</span>
                                <span>{dateRange.fromDate} — {dateRange.toDate} (BS)</span>
                            </div>

                            <div className="ss-table-scroll">
                                <table className="ss-table">
                                    <thead>
                                        <tr>
                                            <th style={{ textAlign: 'center', width: 32 }}>#</th>
                                            <th className={`sortable ${data.sortConfig.key === 'code' ? 'sorted' : ''}`} onClick={() => sortItems('code')}>Code{sortIcon('code')}</th>
                                            <th className={`sortable ${data.sortConfig.key === 'name' ? 'sorted' : ''}`} onClick={() => sortItems('name')}>Item{sortIcon('name')}</th>
                                            <th className={`sortable ${data.sortConfig.key === 'category' ? 'sorted' : ''}`} onClick={() => sortItems('category')}>Category{sortIcon('category')}</th>
                                            <th className={`sortable ${data.sortConfig.key === 'unit' ? 'sorted' : ''}`} onClick={() => sortItems('unit')}>Unit{sortIcon('unit')}</th>
                                            <th className={`num sortable ${data.sortConfig.key === 'stock' ? 'sorted' : ''}`} onClick={() => sortItems('stock')}>Stock{sortIcon('stock')}</th>
                                            <th className={`num sortable ${data.sortConfig.key === 'openingStock' ? 'sorted' : ''}`} onClick={() => sortItems('openingStock')}>Op.{sortIcon('openingStock')}</th>
                                            <th className={`num sortable ${data.sortConfig.key === 'totalQtyIn' ? 'sorted' : ''}`} onClick={() => sortItems('totalQtyIn')}>In{sortIcon('totalQtyIn')}</th>
                                            <th className={`num sortable ${data.sortConfig.key === 'totalQtyOut' ? 'sorted' : ''}`} onClick={() => sortItems('totalQtyOut')}>Out{sortIcon('totalQtyOut')}</th>
                                            <th className={`num sortable ${data.sortConfig.key === 'minStock' ? 'sorted' : ''}`} onClick={() => sortItems('minStock')}>Min{sortIcon('minStock')}</th>
                                            <th className={`num sortable ${data.sortConfig.key === 'maxStock' ? 'sorted' : ''}`} onClick={() => sortItems('maxStock')}>Max{sortIcon('maxStock')}</th>
                                            <th className={`num sortable ${data.sortConfig.key === 'avgPuPrice' ? 'sorted' : ''}`} onClick={() => sortItems('avgPuPrice')}>CP{sortIcon('avgPuPrice')}</th>
                                            <th className={`num sortable ${data.sortConfig.key === 'avgPrice' ? 'sorted' : ''}`} onClick={() => sortItems('avgPrice')}>SP{sortIcon('avgPrice')}</th>
                                            {data.displayOptions.showPurchaseValue && (
                                                <th className={`num sortable ${data.sortConfig.key === 'totalStockValuePurchase' ? 'sorted' : ''}`} onClick={() => sortItems('totalStockValuePurchase')}>Val CP{sortIcon('totalStockValuePurchase')}</th>
                                            )}
                                            {data.displayOptions.showSalesValue && (
                                                <th className={`num sortable ${data.sortConfig.key === 'totalStockValueSales' ? 'sorted' : ''}`} onClick={() => sortItems('totalStockValueSales')}>Val SP{sortIcon('totalStockValueSales')}</th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedItems.map((item, index) => (
                                            <tr key={item.id}>
                                                <td style={{ textAlign: 'center', color: 'var(--ss-muted)' }}>{index + 1}</td>
                                                <td><span className="ss-code">{item.code}</span></td>
                                                <td>
                                                    {item.stock <= (item.minStock || 0) && <span className="ss-badge ss-badge--low">LOW</span>}
                                                    {item.stock >= (item.maxStock || Infinity) && <span className="ss-badge ss-badge--high">HI</span>}
                                                    <span className="ss-item-name">{item.name}</span>
                                                </td>
                                                <td>{item.category || '—'}</td>
                                                <td>{item.unit || '—'}</td>
                                                <td className="num">{formatCurrency(item.stock)}</td>
                                                <td className="num">{formatCurrency(item.openingStock)}</td>
                                                <td className="num">{formatCurrency(item.totalQtyIn)}</td>
                                                <td className="num">{formatCurrency(item.totalQtyOut)}</td>
                                                <td className="num">{item.minStock ?? '—'}</td>
                                                <td className="num">{item.maxStock ?? '—'}</td>
                                                <td className="num">{formatCurrency(item.avgPuPrice)}</td>
                                                <td className="num">{formatCurrency(item.avgPrice)}</td>
                                                {data.displayOptions.showPurchaseValue && <td className="num">{formatCurrency(item.totalStockValuePurchase)}</td>}
                                                {data.displayOptions.showSalesValue && <td className="num">{formatCurrency(item.totalStockValueSales)}</td>}
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td colSpan="5">Total</td>
                                            <td className="num">{formatCurrency(totals.totalStock)}</td>
                                            <td className="num">{formatCurrency(totals.totalOpeningStock)}</td>
                                            <td className="num">{formatCurrency(totals.totalQtyIn)}</td>
                                            <td className="num">{formatCurrency(totals.totalQtyOut)}</td>
                                            <td colSpan="2" />
                                            <td /><td />
                                            {data.displayOptions.showPurchaseValue && <td className="num">{formatCurrency(totals.totalPurchaseValue)}</td>}
                                            {data.displayOptions.showSalesValue && <td className="num">{formatCurrency(totals.totalSalesValue)}</td>}
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            {data.pagination?.pages > 1 && (
                                <div className="ss-pager">
                                    <span>
                                        {((data.currentPage - 1) * (data.itemsPerPage === 'all' ? sortedItems.length : data.itemsPerPage)) + 1}–
                                        {Math.min(data.currentPage * (data.itemsPerPage === 'all' ? sortedItems.length : data.itemsPerPage), data.pagination.total)} of {data.pagination.total}
                                    </span>
                                    <nav>
                                        <ul className="pagination pagination-sm mb-0">
                                            <li className={`page-item ${data.currentPage === 1 ? 'disabled' : ''}`}>
                                                <button className="page-link" onClick={() => setData(p => ({ ...p, currentPage: p.currentPage - 1 }))}>‹</button>
                                            </li>
                                            {Array.from({ length: Math.min(5, data.pagination.pages) }, (_, i) => {
                                                let pg;
                                                if (data.pagination.pages <= 5) pg = i + 1;
                                                else if (data.currentPage <= 3) pg = i + 1;
                                                else if (data.currentPage >= data.pagination.pages - 2) pg = data.pagination.pages - 4 + i;
                                                else pg = data.currentPage - 2 + i;
                                                return (
                                                    <li key={pg} className={`page-item ${data.currentPage === pg ? 'active' : ''}`}>
                                                        <button className="page-link" onClick={() => setData(p => ({ ...p, currentPage: pg }))}>{pg}</button>
                                                    </li>
                                                );
                                            })}
                                            <li className={`page-item ${data.currentPage === data.pagination.pages ? 'disabled' : ''}`}>
                                                <button className="page-link" onClick={() => setData(p => ({ ...p, currentPage: p.currentPage + 1 }))}>›</button>
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
            <NotificationToast show={notification.show} message={notification.message} type={notification.type}
                duration={notification.duration} onClose={() => setNotification(p => ({ ...p, show: false }))} />
        </div>
    );
};

export default StockStatus;
