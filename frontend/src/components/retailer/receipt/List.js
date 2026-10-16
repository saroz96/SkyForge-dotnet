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
import NotificationToast from '../../NotificationToast';
import { FiFileText, FiPrinter, FiSearch, FiPlus, FiRefreshCw, FiCalendar } from 'react-icons/fi';
import './ReceiptsList.css';
import api, { refreshToken } from '../../services/api';

// Helper functions for date conversion
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

const ReceiptsList = () => {
    const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
    const currentEnglishDate = new Date().toISOString().split('T')[0];

    const [dateErrors, setDateErrors] = useState({ fromDate: '', toDate: '' });
    const [notification, setNotification] = useState({
        show: false, message: '', type: 'success', duration: 3000
    });

    const { draftSave, setDraftSave } = usePageNotRefreshContext();
    const [showProductModal, setShowProductModal] = useState(false);

    const [company, setCompany] = useState({ dateFormat: 'english', vatEnabled: true, fiscalYear: {} });

    const [dateRange, setDateRange] = useState(() => {
        if (draftSave?.receiptsData) {
            return { fromDate: draftSave.receiptsData.fromDate || '', toDate: draftSave.receiptsData.toDate || '', fromDateAd: draftSave.receiptsData.fromDateAd || '', toDateAd: draftSave.receiptsData.toDateAd || '' };
        }
        return { fromDate: '', toDate: '', fromDateAd: '', toDateAd: '' };
    });

    const [receipts, setReceipts] = useState(() => draftSave?.receiptsData?.receipts || []);
    const [companyInfo, setCompanyInfo] = useState(() => {
        if (draftSave?.receiptsData) {
            return {
                company: draftSave.receiptsData.company, currentFiscalYear: draftSave.receiptsData.currentFiscalYear,
                currentCompanyName: draftSave.receiptsData.currentCompanyName || '', companyDateFormat: draftSave.receiptsData.companyDateFormat || 'english',
                vatEnabled: draftSave.receiptsData.vatEnabled !== undefined ? draftSave.receiptsData.vatEnabled : true,
                isAdminOrSupervisor: draftSave.receiptsData.isAdminOrSupervisor || false
            };
        }
        return { company: null, currentFiscalYear: null, currentCompanyName: '', companyDateFormat: 'english', vatEnabled: true, isAdminOrSupervisor: false };
    });

    const [searchQuery, setSearchQuery] = useState(() => draftSave?.receiptsSearch?.searchQuery || '');
    const [receiptAccountFilter, setReceiptAccountFilter] = useState(() => draftSave?.receiptsSearch?.receiptAccountFilter || '');
    const [selectedRowIndex, setSelectedRowIndex] = useState(() => draftSave?.receiptsSearch?.selectedRowIndex || 0);

    const [columnWidths, setColumnWidths] = useState({
        bsDate: 80, adDate: 80, voucherNo: 100, account: 150, credit: 80, receiptAccount: 130, user: 100, actions: 100
    });

    const [isResizing, setIsResizing] = useState(false);
    const [resizingColumn, setResizingColumn] = useState(null);
    const [startX, setStartX] = useState(0);
    const [startWidth, setStartWidth] = useState(0);

    // const api = axios.create({
    //     baseURL: process.env.REACT_APP_API_BASE_URL,
    //     withCredentials: true,
    // });
    // api.interceptors.request.use((config) => {
    //     const token = localStorage.getItem('token');
    //     if (token) config.headers.Authorization = `Bearer ${token}`;
    //     return config;
    // });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [totalCredit, setTotalCredit] = useState(0);
    const [filteredReceipts, setFilteredReceipts] = useState([]);

    const fromDateRef = useRef(null);
    const toDateRef = useRef(null);
    const searchInputRef = useRef(null);
    const receiptAccountFilterRef = useRef(null);
    const generateReportRef = useRef(null);
    const tableBodyRef = useRef(null);
    const [shouldFetch, setShouldFetch] = useState(false);
    const navigate = useNavigate();

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

    // Fetch company and fiscal year info
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const response = await api.get('/api/retailer/receipts/entry-data');
                if (response.data.success) {
                    const responseData = response.data.data;
                    const dateFormat = responseData.company.dateFormat?.toLowerCase() || 'english';
                    const isNepaliFormat = dateFormat === 'nepali';
                    setCompany({ ...responseData.company, dateFormat: dateFormat, vatEnabled: responseData.company.vatEnabled || true });

                    const currentFiscalYear = responseData.currentFiscalYear;
                    const hasDraftDates = draftSave?.receiptsData?.fromDate && draftSave?.receiptsData?.toDate;

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

                    setCompanyInfo({
                        company: responseData.company, currentFiscalYear: currentFiscalYear,
                        currentCompanyName: responseData.company.name, companyDateFormat: responseData.company.dateFormat,
                        vatEnabled: responseData.company.vatEnabled, isAdminOrSupervisor: responseData.permissions?.isAdminOrSupervisor || false
                    });
                }
            } catch (err) {
                setNotification({ show: true, message: 'Error loading company data', type: 'error' });
            }
        };
        fetchInitialData();
    }, []);

    // Save data and search state to draft context
    useEffect(() => {
        setDraftSave({
            ...draftSave,
            receiptsData: { ...companyInfo, receipts: receipts, fromDate: dateRange.fromDate, toDate: dateRange.toDate, fromDateAd: dateRange.fromDateAd, toDateAd: dateRange.toDateAd },
            receiptsSearch: { searchQuery, receiptAccountFilter, selectedRowIndex, fromDate: dateRange.fromDate, toDate: dateRange.toDate }
        });
    }, [receipts, searchQuery, receiptAccountFilter, selectedRowIndex, dateRange, companyInfo]);

    // Save/load column widths
    useEffect(() => {
        const savedWidths = localStorage.getItem('receiptsTableColumnWidths');
        if (savedWidths) try { setColumnWidths(JSON.parse(savedWidths)); } catch (e) {}
    }, []);
    useEffect(() => localStorage.setItem('receiptsTableColumnWidths', JSON.stringify(columnWidths)), [columnWidths]);

    // Fetch data when generate report is clicked
    useEffect(() => {
        const abortController = new AbortController();
        const fetchData = async () => {
            if (!shouldFetch) return;
            try {
                setLoading(true);
                const params = new URLSearchParams();
                if (dateRange.fromDateAd) params.append('fromDate', dateRange.fromDateAd);
                if (dateRange.toDateAd) params.append('toDate', dateRange.toDateAd);

                const response = await api.get(`/api/retailer/receipts/register?${params.toString()}`, { signal: abortController.signal });

                if (response.data.success) {
                    setReceipts(response.data.data.receipts || []);
                    if (response.data.data.vatEnabled !== undefined) setCompanyInfo(prev => ({ ...prev, vatEnabled: response.data.data.vatEnabled }));
                    setError(null);
                } else {
                    setError(response.data.error || 'Failed to fetch receipts');
                }
                if (!draftSave?.receiptsSearch?.selectedRowIndex) setSelectedRowIndex(0);
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error('Fetch error:', err);
                    setError(err.response?.data?.error || 'Failed to fetch receipts');
                }
            } finally {
                setLoading(false);
                setShouldFetch(false);
            }
        };
        fetchData();
        return () => abortController.abort();
    }, [shouldFetch, dateRange.fromDateAd, dateRange.toDateAd]);

    // Filter receipts
    useEffect(() => {
        const receiptsArray = Array.isArray(receipts) ? receipts : [];
        const filtered = receiptsArray.filter(receipt => {
            const matchesSearch = (receipt.billNumber?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                (receipt.accountName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                (receipt.userName?.toLowerCase() || '').includes(searchQuery.toLowerCase());
            const matchesReceiptAccount = receiptAccountFilter === '' || (receipt.receiptAccountName?.toLowerCase() || '') === receiptAccountFilter.toLowerCase();
            return matchesSearch && matchesReceiptAccount;
        });
        setFilteredReceipts(filtered);
        if (selectedRowIndex >= filtered.length && filtered.length > 0) setSelectedRowIndex(0);
    }, [receipts, searchQuery, receiptAccountFilter]);

    // Calculate totals
    useEffect(() => {
        if (filteredReceipts.length === 0) { setTotalCredit(0); return; }
        const newTotal = filteredReceipts.reduce((acc, receipt) => receipt.status === 'Active' ? acc + (receipt.credit || 0) : acc, 0);
        setTotalCredit(newTotal);
    }, [filteredReceipts]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (filteredReceipts.length === 0) return;
            if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT') return;
            switch (e.key) {
                case 'ArrowUp': e.preventDefault(); setSelectedRowIndex(prev => Math.max(0, prev - 1)); break;
                case 'ArrowDown': e.preventDefault(); setSelectedRowIndex(prev => Math.min(filteredReceipts.length - 1, prev + 1)); break;
                default: break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [filteredReceipts]);

    useEffect(() => {
        const handleF9KeyDown = (e) => { if (e.key === 'F9') { e.preventDefault(); setShowProductModal(prev => !prev); } };
        window.addEventListener('keydown', handleF9KeyDown);
        return () => window.removeEventListener('keydown', handleF9KeyDown);
    }, []);

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

    const handleGenerateReport = () => {
        if (!dateRange.fromDate || !dateRange.toDate) { setError('Please select both from and to dates'); return; }
        setShouldFetch(true);
    };

    const handlePrint = (filtered = false) => {
        const rowsToPrint = filtered ? filteredReceipts : (Array.isArray(receipts) ? receipts : []);
        if (rowsToPrint.length === 0) { setNotification({ show: true, message: 'No receipts to print', type: 'warning' }); return; }

        const printWindow = window.open('', '_blank');
        let tableContent = `
            <style>
                @page { margin: 3mm; } body { font-family: Arial, sans-serif; font-size: 7px; margin: 0; padding: 2mm; }
                table { width: 100%; border-collapse: collapse; page-break-inside: auto; font-size: 6px; }
                th, td { border: 1px solid #000; padding: 2px 3px; text-align: left; white-space: nowrap; }
                th { background-color: #f2f2f2 !important; -webkit-print-color-adjust: exact; font-size: 10px; font-weight: bold; }
                .print-header { text-align: center; margin-bottom: 5px; }
                .report-title { text-align: center; text-decoration: underline; font-size: 11px; font-weight: bold; margin: 3px 0; }
                .grand-total-row td { font-weight: bold; border-top: 2px solid #000; font-size: 7px; }
                .text-danger { color: #dc3545 !important; }
            </style>
            <div class="print-header"><h1>${companyInfo.currentCompanyName || 'Company Name'}</h1><p>${companyInfo.company?.address || ''}${companyInfo.company?.city ? ', ' + companyInfo.company.city : ''}, PAN: ${companyInfo.company?.pan || ''}</p><hr></div>
            <div class="report-title">Receipt Voucher's Register</div>
            <table><thead><tr><th>Miti</th><th>Date</th><th>Vch No.</th><th>Account</th><th>Credit</th><th>Receipt Account</th><th>User</th></tr></thead><tbody>
        `;
        let printTotalCredit = 0;
        rowsToPrint.forEach(receipt => {
            const isCanceled = receipt.status !== 'Active';
            tableContent += `<tr><td>${receipt.nepaliDate || ''}</td><td>${receipt.date ? new Date(receipt.date).toLocaleDateString() : ''}</td><td>${receipt.billNumber || ''}</td><td>${isCanceled ? '<span class="text-danger">Canceled</span>' : (receipt.accountName || 'N/A')}</td><td class="text-end">${isCanceled ? '<span class="text-danger">0.00</span>' : (receipt.credit?.toFixed(2) || '0.00')}</td><td>${isCanceled ? '<span class="text-danger">Canceled</span>' : (receipt.receiptAccountName || 'N/A')}</td><td>${receipt.userName || 'N/A'}</td></tr>`;
            if (!isCanceled) printTotalCredit += parseFloat(receipt.credit || 0);
        });
        tableContent += `<tr class="grand-total-row"><td colspan="4">Grand Totals</td><td class="text-end">${printTotalCredit.toFixed(2)}</td><td colspan="2"></td></tr></tbody></table>
            <script>window.onload=function(){window.print();window.onafterprint=function(){window.close()}}<\/script>
        `;
        printWindow.document.write(`<!DOCTYPE html><html><head><title>Receipt Voucher's Register</title></head><body>${tableContent}</body></html>`);
        printWindow.document.close();
    };

    const formatCurrency = useCallback((num) => {
        const number = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num) || 0;
        return number.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }, []);

    const handleRowClick = useCallback((index) => setSelectedRowIndex(index), []);

    const handleRowDoubleClick = useCallback(() => {
        if (filteredReceipts[selectedRowIndex]) navigate(`/retailer/receipts/${filteredReceipts[selectedRowIndex].id}/print`);
    }, [navigate, filteredReceipts, selectedRowIndex]);

    const handleKeyDown = (e, nextFieldId) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (nextFieldId) document.getElementById(nextFieldId)?.focus();
        }
    };

    const receiptAccounts = useMemo(() => {
        return [...new Set(receipts.map(r => r.receiptAccountName).filter(name => name !== undefined && name !== null))];
    }, [receipts]);

    const ResizeHandle = React.memo(({ onResizeStart, left, columnName }) => (
        <div className="rl-resize-handle" style={{ position: 'absolute', top: 0, left: `${left}px`, width: '5px', height: '100%', cursor: 'col-resize', zIndex: 10 }} onMouseDown={(e) => { e.preventDefault(); onResizeStart(e, columnName); }} />
    ));

    const TableHeader = React.memo(() => {
        const totalWidth = Object.values(columnWidths).reduce((a, b) => a + b, 0);
        const handleResizeStart = (e, columnName) => {
            setIsResizing(true); setResizingColumn(columnName); setStartX(e.clientX); setStartWidth(columnWidths[columnName]); e.preventDefault();
        };
        return (
            <div className="rl-header" style={{ minWidth: `${totalWidth}px` }}
                onMouseMove={(e) => { if (isResizing && resizingColumn) setColumnWidths(prev => ({ ...prev, [resizingColumn]: Math.max(60, startWidth + e.clientX - startX) })); }}
                onMouseUp={() => { setIsResizing(false); setResizingColumn(null); }}
                onMouseLeave={() => { setIsResizing(false); setResizingColumn(null); }}
            >
                <div className="rl-header-cell rl-cell--center" style={{ width: `${columnWidths.bsDate}px`, flexShrink: 0 }}>Miti<ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.bsDate - 2} columnName="bsDate" /></div>
                <div className="rl-header-cell rl-cell--center" style={{ width: `${columnWidths.adDate}px`, flexShrink: 0 }}>Date<ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.adDate - 2} columnName="adDate" /></div>
                <div className="rl-header-cell" style={{ width: `${columnWidths.voucherNo}px`, flexShrink: 0 }}>Vch No.<ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.voucherNo - 2} columnName="voucherNo" /></div>
                <div className="rl-header-cell" style={{ width: `${columnWidths.account}px`, flexShrink: 0 }}>Account<ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.account - 2} columnName="account" /></div>
                <div className="rl-header-cell rl-cell--end" style={{ width: `${columnWidths.credit}px`, flexShrink: 0 }}>Credit<ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.credit - 2} columnName="credit" /></div>
                <div className="rl-header-cell" style={{ width: `${columnWidths.receiptAccount}px`, flexShrink: 0 }}>Receipt A/c<ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.receiptAccount - 2} columnName="receiptAccount" /></div>
                <div className="rl-header-cell" style={{ width: `${columnWidths.user}px`, flexShrink: 0 }}>User<ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.user - 2} columnName="user" /></div>
                <div className="rl-header-cell" style={{ width: `${columnWidths.actions}px`, flexShrink: 0 }}>Actions<ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.actions - 2} columnName="actions" /></div>
                {isResizing && <div style={{ position: 'fixed', inset: 0, zIndex: 1000, cursor: 'col-resize' }} />}
            </div>
        );
    });

    const TableRow = React.memo(({ index, style, data }) => {
        const { receipts: rowReceipts, selectedRowIndex, formatCurrency, navigate, handleRowClick } = data;
        const receipt = rowReceipts[index];
        if (!receipt) return null;
        const isSelected = selectedRowIndex === index;
        const isCanceled = receipt.status !== 'Active';

        return (
            <div style={{ ...style, display: 'flex', alignItems: 'center', height: '28px', borderBottom: '1px solid #e2e8f0', cursor: 'pointer', backgroundColor: isSelected ? '#eff6ff' : (index % 2 === 0 ? '#f8fafc' : 'white') }} className="rl-row" onClick={() => handleRowClick(index)} onDoubleClick={() => { if (receipt && receipt.id) navigate(`/retailer/receipts/${receipt.id}/print`); }}>
                <div className="rl-cell rl-cell--center" style={{ width: `${columnWidths.bsDate}px`, flexShrink: 0 }}><span>{receipt.nepaliDate || ''}</span></div>
                <div className="rl-cell rl-cell--center" style={{ width: `${columnWidths.adDate}px`, flexShrink: 0 }}><span>{receipt.date ? new Date(receipt.date).toLocaleDateString() : ''}</span></div>
                <div className="rl-cell" style={{ width: `${columnWidths.voucherNo}px`, flexShrink: 0 }}><span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{receipt.billNumber || ''}</span></div>
                <div className="rl-cell" style={{ width: `${columnWidths.account}px`, flexShrink: 0 }} title={receipt.accountName || 'N/A'}><span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: isCanceled ? '#dc2626' : 'inherit' }}>{isCanceled ? 'Canceled' : (receipt.accountName || 'N/A')}</span></div>
                <div className="rl-cell rl-cell--end" style={{ width: `${columnWidths.credit}px`, flexShrink: 0 }}><span style={{ color: isCanceled ? '#dc2626' : 'inherit' }}>{isCanceled ? '0.00' : formatCurrency(receipt.credit)}</span></div>
                <div className="rl-cell" style={{ width: `${columnWidths.receiptAccount}px`, flexShrink: 0 }} title={receipt.receiptAccountName || 'N/A'}><span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: isCanceled ? '#dc2626' : 'inherit' }}>{isCanceled ? 'Canceled' : (receipt.receiptAccountName || 'N/A')}</span></div>
                <div className="rl-cell" style={{ width: `${columnWidths.user}px`, flexShrink: 0 }} title={receipt.userName || 'N/A'}><span>{receipt.userName || 'N/A'}</span></div>
                <div className="rl-cell rl-cell--center gap-1" style={{ width: `${columnWidths.actions}px`, flexShrink: 0 }}>
                    <button className="rl-btn-action rl-btn-action--info" onClick={(e) => { e.stopPropagation(); if (receipt && receipt.id) navigate(`/retailer/receipts/${receipt.id}/print`); }} title="View"><i className="bi bi-eye" /></button>
                    <button className="rl-btn-action rl-btn-action--warning" onClick={(e) => { e.stopPropagation(); if (receipt && receipt.id) navigate(`/retailer/receipts/edit/${receipt.id}`); }} title="Edit"><i className="bi bi-pencil-square" /></button>
                </div>
            </div>
        );
    }, (prevProps, nextProps) => {
        if (prevProps.index !== nextProps.index) return false;
        if (prevProps.style !== nextProps.style) return false;
        const prevReceipt = prevProps.data.receipts[prevProps.index];
        const nextReceipt = nextProps.data.receipts[nextProps.index];
        return shallowEqual(prevReceipt, nextReceipt) && prevProps.data.selectedRowIndex === nextProps.data.selectedRowIndex;
    });

    const resetColumnWidths = () => {
        setColumnWidths({ bsDate: 80, adDate: 80, voucherNo: 100, account: 150, credit: 80, receiptAccount: 130, user: 100, actions: 100 });
        setNotification({ show: true, message: 'Column widths reset', type: 'success', duration: 2000 });
    };

    if (loading && receipts.length === 0) return <Loader />;
    if (error) return <div className="rl-page"><Header /><div className="rl-shell"><div className="rl-state"><h3>Error</h3><p>{error}</p></div></div></div>;

    const receiptsArray = Array.isArray(receipts) ? receipts : [];

    return (
        <div className="rl-page">
            <Header />

            <div className="rl-shell">
                {/* Top Bar */}
                <div className="rl-topbar">
                    <div className="rl-topbar__left">
                        <div className="rl-topbar__icon"><FiFileText /></div>
                        <div><h1>Receipts Register</h1></div>
                    </div>
                    <div className="rl-topbar__actions">
                        <button className="rl-btn-icon" onClick={() => navigate('/retailer/receipts')} title="Add Receipt"><FiPlus /> Add</button>
                        <button className="rl-btn-icon" onClick={() => handlePrint(true)} disabled={receiptsArray.length === 0}><FiPrinter /> Print</button>
                        <button className="rl-btn-icon" onClick={resetColumnWidths} title="Reset columns"><FiRefreshCw /> Reset</button>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="rl-toolbar">
                    <div className="rl-field rl-field--date">
                        <label>From (BS) <span className="req">*</span></label>
                        <input type="text" id="fromDate" ref={fromDateRef} className={dateErrors.fromDate ? 'is-invalid' : ''} value={dateRange.fromDate || ''} onChange={(e) => { const v = e.target.value.replace(/[^0-9/-]/g, '').slice(0, 10); setDateRange(p => ({ ...p, fromDate: v, fromDateAd: convertBsToAd(v) || p.fromDateAd })); setDateErrors(p => ({ ...p, fromDate: '' })); }} onKeyDown={(e) => handleKeyDown(e, 'fromDateAd')} onBlur={(e) => { const d = e.target.value.trim(); if (!d) return; const c = validateAndCorrectNepaliDate(d); if (!c) { const ad = convertBsToAd(currentNepaliDate); setDateRange(p => ({ ...p, fromDate: currentNepaliDate, fromDateAd: ad })); setNotification({ show: true, message: 'Invalid Nepali date. Auto-corrected.', type: 'warning' }); } }} placeholder="YYYY-MM-DD" autoComplete="off" autoFocus />
                        {dateErrors.fromDate && <div className="rl-field-error">{dateErrors.fromDate}</div>}
                    </div>
                    <div className="rl-field rl-field--date">
                        <label>From (AD)</label>
                        <input type="date" id="fromDateAd" value={dateRange.fromDateAd || ''} onChange={(e) => { const v = e.target.value; setDateRange(p => ({ ...p, fromDateAd: v, fromDate: convertAdToBs(v) || p.fromDate })); }} onKeyDown={(e) => handleKeyDown(e, 'toDate')} />
                    </div>
                    <div className="rl-field rl-field--date">
                        <label>To (BS) <span className="req">*</span></label>
                        <input type="text" id="toDate" ref={toDateRef} className={dateErrors.toDate ? 'is-invalid' : ''} value={dateRange.toDate || ''} onChange={(e) => { const v = e.target.value.replace(/[^0-9/-]/g, '').slice(0, 10); setDateRange(p => ({ ...p, toDate: v, toDateAd: convertBsToAd(v) || p.toDateAd })); setDateErrors(p => ({ ...p, toDate: '' })); }} onKeyDown={(e) => handleKeyDown(e, 'toDateAd')} onBlur={(e) => { const d = e.target.value.trim(); if (!d) return; const c = validateAndCorrectNepaliDate(d); if (!c) { const ad = convertBsToAd(currentNepaliDate); setDateRange(p => ({ ...p, toDate: currentNepaliDate, toDateAd: ad })); setNotification({ show: true, message: 'Invalid Nepali date. Auto-corrected.', type: 'warning' }); } }} placeholder="YYYY-MM-DD" autoComplete="off" />
                        {dateErrors.toDate && <div className="rl-field-error">{dateErrors.toDate}</div>}
                    </div>
                    <div className="rl-field rl-field--date">
                        <label>To (AD)</label>
                        <input type="date" id="toDateAd" value={dateRange.toDateAd || ''} onChange={(e) => { const v = e.target.value; setDateRange(p => ({ ...p, toDateAd: v, toDate: convertAdToBs(v) || p.toDate })); }} onKeyDown={(e) => handleKeyDown(e, 'generateReport')} />
                    </div>

                    <button type="button" id="generateReport" ref={generateReportRef} className="rl-btn-gen" onClick={handleGenerateReport} disabled={loading}>
                        {loading ? <span className="spinner-border spinner-border-sm" style={{ width: 12, height: 12 }} /> : <><FiSearch className="me-1" /> Generate</>}
                    </button>

                    <div className="rl-toolbar-divider" />

                    <div className="rl-field rl-field--search">
                        <label>Search</label>
                        <div className="rl-search-wrap">
                            <FiSearch className="rl-search-icon" />
                            <input type="text" id="searchInput" ref={searchInputRef} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} disabled={receiptsArray.length === 0} autoComplete="off" />
                            {searchQuery && <button className="rl-search-clear" onClick={() => setSearchQuery('')}>×</button>}
                        </div>
                    </div>

                    <div className="rl-field rl-field--select">
                        <label>Receipt A/c</label>
                        <select id="receiptAccountFilter" ref={receiptAccountFilterRef} value={receiptAccountFilter} onChange={(e) => setReceiptAccountFilter(e.target.value)} disabled={receiptsArray.length === 0}>
                            <option value="">All</option>
                            {receiptAccounts.map(account => <option key={account} value={account}>{account}</option>)}
                        </select>
                    </div>
                </div>

                {error && (
                    <div className="rl-alert">
                        <i className="bi bi-exclamation-circle" />{error}
                        <button type="button" className="btn-close btn-sm ms-auto" onClick={() => setError(null)} />
                    </div>
                )}

                {/* Main Content */}
                <div className="rl-main">
                    {receiptsArray.length === 0 && !loading ? (
                        <div className="rl-state">
                            <FiCalendar size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                            <h3>Select date range & generate</h3>
                            <p>Choose a date range and click Generate.</p>
                        </div>
                    ) : loading ? (
                        <div className="rl-state"><div className="spinner-border text-primary" /><p>Loading receipts...</p></div>
                    ) : filteredReceipts.length === 0 ? (
                        <div className="rl-state"><FiSearch size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} /><h3>No receipts found</h3><p>{searchQuery ? 'Try a different search term' : 'No data for the selected date range'}</p></div>
                    ) : (
                        <>
                            <div className="rl-main__bar">
                                <span><strong>{filteredReceipts.length}</strong> receipts</span>
                                <span>{dateRange.fromDate} — {dateRange.toDate}</span>
                            </div>

                            <div className="rl-table-wrap" ref={tableBodyRef}>
                                <AutoSizer>
                                    {({ height, width }) => {
                                        const totalWidth = Object.values(columnWidths).reduce((a, b) => a + b, 0);
                                        return (
                                            <div style={{ position: 'relative', height: height, width: Math.max(width, totalWidth) }}>
                                                <TableHeader />
                                                <List height={height - 28} itemCount={filteredReceipts.length} itemSize={28} width={Math.max(width, totalWidth)} itemData={{ receipts: filteredReceipts, selectedRowIndex, formatCurrency, navigate, handleRowClick }}>{TableRow}</List>
                                            </div>
                                        );
                                    }}
                                </AutoSizer>
                            </div>

                            {/* Sticky Footer with Totals */}
                            <div className="rl-footer">
                                <div className="rl-footer-cell" style={{ width: `${columnWidths.bsDate + columnWidths.adDate + columnWidths.voucherNo + columnWidths.account}px`, flexShrink: 0 }}><strong>Total:</strong></div>
                                <div className="rl-footer-cell rl-cell--end" style={{ width: `${columnWidths.credit}px`, flexShrink: 0 }}><strong>{formatCurrency(totalCredit)}</strong></div>
                                <div className="rl-footer-cell" style={{ flex: 1, minWidth: `${columnWidths.receiptAccount + columnWidths.user + columnWidths.actions}px` }}></div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {showProductModal && <ProductModal onClose={() => setShowProductModal(false)} />}
            <NotificationToast show={notification.show} message={notification.message} type={notification.type} duration={notification.duration} onClose={() => setNotification({ ...notification, show: false })} />
        </div>
    );
};

export default ReceiptsList;