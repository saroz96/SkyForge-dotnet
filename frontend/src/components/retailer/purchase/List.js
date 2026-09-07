import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../Header';
import NepaliDate from 'nepali-datetime';
import { usePageNotRefreshContext } from '../PageNotRefreshContext';
import Loader from '../../Loader';
import ProductModal from '../dashboard/modals/ProductModal';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import * as XLSX from 'xlsx';
import NotificationToast from '../../NotificationToast';
import { FiFileText, FiPrinter, FiSearch, FiPlus, FiRefreshCw, FiCalendar, FiDownload } from 'react-icons/fi';
import './PurchaseBillsList.css';
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

const PurchaseBillsList = () => {
    const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
    const currentEnglishDate = new Date().toISOString().split('T')[0];
    const [exporting, setExporting] = useState(false);

    const [dateErrors, setDateErrors] = useState({ fromDate: '', toDate: '' });
    const [notification, setNotification] = useState({
        show: false, message: '', type: 'success', duration: 3000
    });

    const { draftSave, setDraftSave } = usePageNotRefreshContext();
    const [showProductModal, setShowProductModal] = useState(false);

    const [company, setCompany] = useState({ dateFormat: 'english', isVatExempt: false, vatEnabled: true, fiscalYear: {} });

    const [dateRange, setDateRange] = useState(() => {
        if (draftSave?.purchaseBillsData) {
            return { fromDate: draftSave.purchaseBillsData.fromDate || '', toDate: draftSave.purchaseBillsData.toDate || '', fromDateAd: draftSave.purchaseBillsData.fromDateAd || '', toDateAd: draftSave.purchaseBillsData.toDateAd || '' };
        }
        return { fromDate: '', toDate: '', fromDateAd: '', toDateAd: '' };
    });

    const [bills, setBills] = useState(() => draftSave?.purchaseBillsData?.bills || []);
    const [companyInfo, setCompanyInfo] = useState(() => {
        if (draftSave?.purchaseBillsData) {
            return {
                company: draftSave.purchaseBillsData.company, currentFiscalYear: draftSave.purchaseBillsData.currentFiscalYear,
                currentCompanyName: draftSave.purchaseBillsData.currentCompanyName || '', companyDateFormat: draftSave.purchaseBillsData.companyDateFormat || 'english',
                vatEnabled: draftSave.purchaseBillsData.vatEnabled !== undefined ? draftSave.purchaseBillsData.vatEnabled : true,
                isVatExempt: draftSave.purchaseBillsData.isVatExempt || false,
                isAdminOrSupervisor: draftSave.purchaseBillsData.isAdminOrSupervisor || false
            };
        }
        return { company: null, currentFiscalYear: null, currentCompanyName: '', companyDateFormat: 'english', vatEnabled: true, isVatExempt: false, isAdminOrSupervisor: false };
    });

    const [searchQuery, setSearchQuery] = useState(() => draftSave?.purchaseBillsSearch?.searchQuery || '');
    const [paymentModeFilter, setPaymentModeFilter] = useState(() => draftSave?.purchaseBillsSearch?.paymentModeFilter || '');
    const [selectedRowIndex, setSelectedRowIndex] = useState(() => draftSave?.purchaseBillsSearch?.selectedRowIndex || 0);

    const [columnWidths, setColumnWidths] = useState({
        bsDate: 80, adDate: 80, vchNo: 90, invNo: 90, supplierName: 150, payMode: 70,
        subTotal: 80, discount: 90, taxable: 70, vat: 70, roundOff: 70, total: 70, user: 80, actions: 120
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
    const [totals, setTotals] = useState({ subTotal: 0, discount: 0, taxable: 0, vat: 0, roundOff: 0, amount: 0 });
    const [filteredBills, setFilteredBills] = useState([]);

    const fromDateRef = useRef(null);
    const toDateRef = useRef(null);
    const searchInputRef = useRef(null);
    const paymentModeFilterRef = useRef(null);
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
                const response = await api.get('/api/retailer/purchase/entry-data');
                if (response.data.success) {
                    const responseData = response.data.data;
                    const dateFormat = responseData.company.dateFormat?.toLowerCase() || 'english';
                    const isNepaliFormat = dateFormat === 'nepali';
                    setCompany({ ...responseData.company, dateFormat: dateFormat, vatEnabled: responseData.company.vatEnabled || true, isVatExempt: responseData.company.isVatExempt || false });

                    const currentFiscalYear = responseData.currentFiscalYear;
                    const hasDraftDates = draftSave?.purchaseBillsData?.fromDate && draftSave?.purchaseBillsData?.toDate;

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
                        vatEnabled: responseData.company.vatEnabled, isVatExempt: responseData.company.isVatExempt || false,
                        isAdminOrSupervisor: responseData.isAdminOrSupervisor || false
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
            purchaseBillsData: { ...companyInfo, bills: bills, fromDate: dateRange.fromDate, toDate: dateRange.toDate, fromDateAd: dateRange.fromDateAd, toDateAd: dateRange.toDateAd },
            purchaseBillsSearch: { searchQuery, paymentModeFilter, selectedRowIndex, fromDate: dateRange.fromDate, toDate: dateRange.toDate }
        });
    }, [bills, searchQuery, paymentModeFilter, selectedRowIndex, dateRange, companyInfo]);

    // Save/load column widths
    useEffect(() => {
        const savedWidths = localStorage.getItem('purchaseBillsTableColumnWidths');
        if (savedWidths) try { setColumnWidths(JSON.parse(savedWidths)); } catch (e) {}
    }, []);
    useEffect(() => localStorage.setItem('purchaseBillsTableColumnWidths', JSON.stringify(columnWidths)), [columnWidths]);

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

                const response = await api.get(`/api/retailer/purchase-register?${params.toString()}`, { signal: abortController.signal });

                if (response.data.success) {
                    setBills(response.data.data.bills || []);
                    if (response.data.data.vatEnabled !== undefined) setCompanyInfo(prev => ({ ...prev, vatEnabled: response.data.data.vatEnabled, isVatExempt: response.data.data.isVatExempt || false }));
                    setError(null);
                } else {
                    setError(response.data.error || 'Failed to fetch purchase bills');
                }
                if (!draftSave?.purchaseBillsSearch?.selectedRowIndex) setSelectedRowIndex(0);
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error('Fetch error:', err);
                    setError(err.response?.data?.error || 'Failed to fetch purchase bills');
                }
            } finally {
                setLoading(false);
                setShouldFetch(false);
            }
        };
        fetchData();
        return () => abortController.abort();
    }, [shouldFetch, dateRange.fromDateAd, dateRange.toDateAd]);

    // Filter bills
    useEffect(() => {
        const billsArray = Array.isArray(bills) ? bills : [];
        const filtered = billsArray.filter(bill => {
            const matchesSearch = (bill.billNumber?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                (bill.partyBillNumber?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                (bill.accountName?.toLowerCase() || '').includes(searchQuery.toLowerCase());
            const matchesPaymentMode = paymentModeFilter === '' || (bill.paymentMode?.toLowerCase() || '') === paymentModeFilter.toLowerCase();
            return matchesSearch && matchesPaymentMode;
        });
        setFilteredBills(filtered);
        if (selectedRowIndex >= filtered.length && filtered.length > 0) setSelectedRowIndex(0);
    }, [bills, searchQuery, paymentModeFilter]);

    // Calculate totals
    useEffect(() => {
        if (filteredBills.length === 0) {
            setTotals({ subTotal: 0, discount: 0, taxable: 0, vat: 0, roundOff: 0, amount: 0 });
            return;
        }
        const newTotals = filteredBills.reduce((acc, bill) => {
            return {
                subTotal: acc.subTotal + (bill.subTotal || 0),
                discount: acc.discount + (bill.discountAmount || 0),
                taxable: acc.taxable + (bill.taxableAmount || 0),
                vat: acc.vat + (bill.vatAmount || 0),
                roundOff: acc.roundOff + (bill.roundOffAmount || 0),
                amount: acc.amount + (bill.totalAmount || 0)
            };
        }, { subTotal: 0, discount: 0, taxable: 0, vat: 0, roundOff: 0, amount: 0 });
        setTotals(newTotals);
    }, [filteredBills]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (filteredBills.length === 0) return;
            if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT') return;
            switch (e.key) {
                case 'ArrowUp': e.preventDefault(); setSelectedRowIndex(prev => Math.max(0, prev - 1)); break;
                case 'ArrowDown': e.preventDefault(); setSelectedRowIndex(prev => Math.min(filteredBills.length - 1, prev + 1)); break;
                default: break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [filteredBills]);

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
        const rowsToPrint = filtered ? filteredBills : (Array.isArray(bills) ? bills : []);
        const vatEnabled = companyInfo.vatEnabled;
        const isVatExempt = companyInfo.isVatExempt;
        const showVatColumns = vatEnabled && !isVatExempt;

        if (rowsToPrint.length === 0) { setNotification({ show: true, message: 'No bills to print', type: 'warning' }); return; }

        const printWindow = window.open("", "_blank");
        let tableContent = `
            <style>
                @page { margin: 3mm; } body { font-family: Arial, sans-serif; font-size: 7px; margin: 0; padding: 2mm; }
                table { width: 100%; border-collapse: collapse; page-break-inside: auto; font-size: 6px; }
                th, td { border: 1px solid #000; padding: 2px 3px; text-align: left; white-space: nowrap; }
                th { background-color: #f2f2f2 !important; -webkit-print-color-adjust: exact; font-size: 10px; font-weight: bold; }
                .print-header { text-align: center; margin-bottom: 5px; }
                .report-title { text-align: center; text-decoration: underline; font-size: 11px; font-weight: bold; margin: 3px 0; }
                .grand-total-row td { font-weight: bold; border-top: 2px solid #000; font-size: 7px; }
            </style>
            <div class="print-header"><h1>${companyInfo.currentCompanyName || 'Company Name'}</h1><p>${companyInfo.company?.address || ''}${companyInfo.company?.city ? ', ' + companyInfo.company.city : ''}, PAN: ${companyInfo.company?.pan || ''}</p><hr></div>
            <div class="report-title">Purchase Voucher's Register</div>
            <table><thead><tr><th>Miti</th><th>Date</th><th>Vch. No.</th><th>Inv. No.</th><th>Supplier Name</th><th>Pay Mode</th><th class="text-end">Sub Total</th><th class="text-end">Discount</th>${showVatColumns ? `<th class="text-end">Taxable</th><th class="text-end">VAT</th>` : ''}<th class="text-end">Off(-/+)</th><th class="text-end">Total</th><th>User</th></tr></thead><tbody>
        `;
        let printTotals = { subTotal: 0, discount: 0, taxable: 0, vat: 0, roundOff: 0, amount: 0 };
        rowsToPrint.forEach(bill => {
            tableContent += `<tr><td>${bill.nepaliDate || ''}</td><td>${bill.date ? new Date(bill.date).toLocaleDateString() : ''}</td><td>${bill.billNumber || ''}</td><td>${bill.partyBillNumber || ''}</td><td>${bill.accountName || ''}</td><td>${bill.paymentMode || ''}</td><td class="text-end">${(bill.subTotal || 0).toFixed(2)}</td><td class="text-end">${(bill.discountPercentage || 0).toFixed(2)}% - ${(bill.discountAmount || 0).toFixed(2)}</td>${showVatColumns ? `<td class="text-end">${(bill.taxableAmount || 0).toFixed(2)}</td><td class="text-end">${(bill.vatAmount || 0).toFixed(2)}</td>` : ''}<td class="text-end">${(bill.roundOffAmount || 0).toFixed(2)}</td><td class="text-end">${(bill.totalAmount || 0).toFixed(2)}</td><td>${bill.userName || ''}</td></tr>`;
            printTotals.subTotal += parseFloat(bill.subTotal || 0);
            printTotals.discount += parseFloat(bill.discountAmount || 0);
            printTotals.taxable += parseFloat(bill.taxableAmount || 0);
            printTotals.vat += parseFloat(bill.vatAmount || 0);
            printTotals.roundOff += parseFloat(bill.roundOffAmount || 0);
            printTotals.amount += parseFloat(bill.totalAmount || 0);
        });
        tableContent += `<tr class="grand-total-row"><td colspan="6">Grand Totals</td><td class="text-end">${printTotals.subTotal.toFixed(2)}</td><td class="text-end">${printTotals.discount.toFixed(2)}</td>${showVatColumns ? `<td class="text-end">${printTotals.taxable.toFixed(2)}</td><td class="text-end">${printTotals.vat.toFixed(2)}</td>` : ''}<td class="text-end">${printTotals.roundOff.toFixed(2)}</td><td class="text-end">${printTotals.amount.toFixed(2)}</td><td></td></tr></tbody></table>
            <script>window.onload=function(){window.print();window.onafterprint=function(){window.close()}}<\/script>
        `;
        printWindow.document.write(`<!DOCTYPE html><html><head><title>Purchase Voucher's Register</title></head><body>${tableContent}</body></html>`);
        printWindow.document.close();
    };

    const formatCurrencyForExport = (num) => {
        const number = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num) || 0;
        return number.toFixed(2);
    };

    const handleExportExcel = async () => {
        if (!filteredBills || filteredBills.length === 0) {
            setNotification({ show: true, message: 'No data to export', type: 'warning' });
            return;
        }
        setExporting(true);
        try {
            const currentDate = new Date().toISOString().split('T')[0];
            const showVatColumns = companyInfo.vatEnabled && !companyInfo.isVatExempt;
            let excelData = [];
            excelData.push(['Purchase Voucher\'s Register'], ['Company:', companyInfo.currentCompanyName || 'N/A'], ['Address:', companyInfo.company?.address || '', companyInfo.company?.city ? ', ' + companyInfo.company?.city : ''], ['PAN:', companyInfo.company?.pan || ''], ['From Date (BS):', dateRange.fromDate], ['To Date (BS):', dateRange.toDate], ['From Date (AD):', dateRange.fromDateAd], ['To Date (AD):', dateRange.toDateAd], ['Total Bills:', filteredBills.length], searchQuery && ['Search:', searchQuery], paymentModeFilter && ['Payment Mode Filter:', paymentModeFilter], ['Export Date:', new Date().toLocaleString()], []);
            const headers = ['S.No', 'Miti', 'Date', 'Vch. No.', 'Inv. No.', 'Supplier Name', 'Pay Mode', 'Sub Total', 'Discount (%)', 'Discount (Rs.)'];
            if (showVatColumns) { headers.push('Taxable'); headers.push('VAT'); }
            headers.push('Round Off', 'Total', 'User');
            excelData.push(headers);
            let totalSubTotal = 0, totalDiscount = 0, totalTaxable = 0, totalVat = 0, totalRoundOff = 0, totalAmount = 0;
            filteredBills.forEach((bill, index) => {
                const rowData = [index + 1, bill.nepaliDate || '', bill.date ? new Date(bill.date).toLocaleDateString() : '', bill.billNumber || '', bill.partyBillNumber || '', bill.accountName || 'N/A', bill.paymentMode || '', formatCurrencyForExport(bill.subTotal), (bill.discountPercentage || 0).toFixed(2), formatCurrencyForExport(bill.discountAmount)];
                if (showVatColumns) { rowData.push(formatCurrencyForExport(bill.taxableAmount)); rowData.push(formatCurrencyForExport(bill.vatAmount)); }
                rowData.push(formatCurrencyForExport(bill.roundOffAmount), formatCurrencyForExport(bill.totalAmount), bill.userName || '');
                excelData.push(rowData);
                totalSubTotal += parseFloat(bill.subTotal || 0);
                totalDiscount += parseFloat(bill.discountAmount || 0);
                totalTaxable += parseFloat(bill.taxableAmount || 0);
                totalVat += parseFloat(bill.vatAmount || 0);
                totalRoundOff += parseFloat(bill.roundOffAmount || 0);
                totalAmount += parseFloat(bill.totalAmount || 0);
            });
            excelData.push([]);
            const totalsRow = ['', '', '', '', '', 'TOTALS', '', formatCurrencyForExport(totalSubTotal), '', formatCurrencyForExport(totalDiscount)];
            if (showVatColumns) { totalsRow.push(formatCurrencyForExport(totalTaxable), formatCurrencyForExport(totalVat)); }
            totalsRow.push(formatCurrencyForExport(totalRoundOff), formatCurrencyForExport(totalAmount), '');
            excelData.push(totalsRow);
            const ws = XLSX.utils.aoa_to_sheet(excelData);
            const colWidths = [{ wch: 6 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 30 }, { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 14 }];
            if (showVatColumns) { colWidths.push({ wch: 14 }, { wch: 12 }); }
            colWidths.push({ wch: 12 }, { wch: 14 }, { wch: 14 });
            ws['!cols'] = colWidths;
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Purchase Register');
            XLSX.writeFile(wb, `Purchase_Register_${dateRange.fromDate}_to_${dateRange.toDate}_${currentDate}.xlsx`);
            setNotification({ show: true, message: 'Excel exported successfully!', type: 'success' });
        } catch (err) { setNotification({ show: true, message: 'Failed to export: ' + err.message, type: 'error' });
        } finally { setExporting(false); }
    };

    const formatCurrency = useCallback((num) => {
        const number = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : Number(num) || 0;
        return number.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }, []);

    const handleRowClick = useCallback((index) => setSelectedRowIndex(index), []);
    const handleRowDoubleClick = useCallback(() => {
        if (filteredBills[selectedRowIndex]) navigate(`/retailer/purchase/${filteredBills[selectedRowIndex].id}/print`);
    }, [navigate, filteredBills, selectedRowIndex]);

    const handleKeyDown = (e, nextFieldId) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (nextFieldId) document.getElementById(nextFieldId)?.focus();
        }
    };

    const ResizeHandle = React.memo(({ onResizeStart, left, columnName }) => (
        <div className="pb-resize-handle" style={{ position: 'absolute', top: 0, left: `${left}px`, width: '5px', height: '100%', cursor: 'col-resize', zIndex: 10 }} onMouseDown={(e) => { e.preventDefault(); onResizeStart(e, columnName); }} />
    ));

    const TableHeader = React.memo(() => {
        const showVatColumns = companyInfo.vatEnabled && !companyInfo.isVatExempt;
        const totalWidth = Object.values(columnWidths).reduce((a, b) => a + b, 0) + (showVatColumns ? columnWidths.taxable + columnWidths.vat : 0);
        const handleResizeStart = (e, columnName) => {
            setIsResizing(true); setResizingColumn(columnName); setStartX(e.clientX); setStartWidth(columnWidths[columnName]); e.preventDefault();
        };
        return (
            <div className="pb-header" style={{ minWidth: `${totalWidth}px` }}
                onMouseMove={(e) => { if (isResizing && resizingColumn) setColumnWidths(prev => ({ ...prev, [resizingColumn]: Math.max(60, startWidth + e.clientX - startX) })); }}
                onMouseUp={() => { setIsResizing(false); setResizingColumn(null); }}
                onMouseLeave={() => { setIsResizing(false); setResizingColumn(null); }}
            >
                <div className="pb-header-cell pb-cell--center" style={{ width: `${columnWidths.bsDate}px`, flexShrink: 0 }}>Miti<ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.bsDate - 2} columnName="bsDate" /></div>
                <div className="pb-header-cell pb-cell--center" style={{ width: `${columnWidths.adDate}px`, flexShrink: 0 }}>Date<ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.adDate - 2} columnName="adDate" /></div>
                <div className="pb-header-cell" style={{ width: `${columnWidths.vchNo}px`, flexShrink: 0 }}>Vch No.<ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.vchNo - 2} columnName="vchNo" /></div>
                <div className="pb-header-cell" style={{ width: `${columnWidths.invNo}px`, flexShrink: 0 }}>Inv No.<ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.invNo - 2} columnName="invNo" /></div>
                <div className="pb-header-cell" style={{ width: `${columnWidths.supplierName}px`, flexShrink: 0 }}>Supplier<ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.supplierName - 2} columnName="supplierName" /></div>
                <div className="pb-header-cell" style={{ width: `${columnWidths.payMode}px`, flexShrink: 0 }}>Pay Mode<ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.payMode - 2} columnName="payMode" /></div>
                <div className="pb-header-cell pb-cell--end" style={{ width: `${columnWidths.subTotal}px`, flexShrink: 0 }}>Sub Total<ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.subTotal - 2} columnName="subTotal" /></div>
                <div className="pb-header-cell pb-cell--end" style={{ width: `${columnWidths.discount}px`, flexShrink: 0 }}>Discount<ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.discount - 2} columnName="discount" /></div>
                {showVatColumns && (
                    <>
                        <div className="pb-header-cell pb-cell--end" style={{ width: `${columnWidths.taxable}px`, flexShrink: 0 }}>Taxable<ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.taxable - 2} columnName="taxable" /></div>
                        <div className="pb-header-cell pb-cell--end" style={{ width: `${columnWidths.vat}px`, flexShrink: 0 }}>VAT<ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.vat - 2} columnName="vat" /></div>
                    </>
                )}
                <div className="pb-header-cell pb-cell--end" style={{ width: `${columnWidths.roundOff}px`, flexShrink: 0 }}>Off(-/+)<ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.roundOff - 2} columnName="roundOff" /></div>
                <div className="pb-header-cell pb-cell--end" style={{ width: `${columnWidths.total}px`, flexShrink: 0 }}>Total<ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.total - 2} columnName="total" /></div>
                <div className="pb-header-cell" style={{ width: `${columnWidths.user}px`, flexShrink: 0 }}>User<ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.user - 2} columnName="user" /></div>
                <div className="pb-header-cell" style={{ width: `${columnWidths.actions}px`, flexShrink: 0 }}>Actions<ResizeHandle onResizeStart={handleResizeStart} left={columnWidths.actions - 2} columnName="actions" /></div>
                {isResizing && <div style={{ position: 'fixed', inset: 0, zIndex: 1000, cursor: 'col-resize' }} />}
            </div>
        );
    });

    const TableRow = React.memo(({ index, style, data }) => {
        const { bills: rowBills, selectedRowIndex, formatCurrency, navigate, handleRowClick } = data;
        const bill = rowBills[index];
        if (!bill) return null;
        const isSelected = selectedRowIndex === index;
        const showVatColumns = companyInfo.vatEnabled && !companyInfo.isVatExempt;

        return (
            <div style={{ ...style, display: 'flex', alignItems: 'center', height: '28px', borderBottom: '1px solid #e2e8f0', cursor: 'pointer', backgroundColor: isSelected ? '#eff6ff' : (index % 2 === 0 ? '#f8fafc' : 'white') }} className="pb-row" onClick={() => handleRowClick(index)} onDoubleClick={() => { if (bill && bill.id) navigate(`/retailer/purchase/${bill.id}/print`); }}>
                <div className="pb-cell pb-cell--center" style={{ width: `${columnWidths.bsDate}px`, flexShrink: 0 }}><span>{bill.nepaliDate || ''}</span></div>
                <div className="pb-cell pb-cell--center" style={{ width: `${columnWidths.adDate}px`, flexShrink: 0 }}><span>{bill.date ? new Date(bill.date).toLocaleDateString() : ''}</span></div>
                <div className="pb-cell" style={{ width: `${columnWidths.vchNo}px`, flexShrink: 0 }}><span>{bill.billNumber || ''}</span></div>
                <div className="pb-cell" style={{ width: `${columnWidths.invNo}px`, flexShrink: 0 }}><span>{bill.partyBillNumber || ''}</span></div>
                <div className="pb-cell" style={{ width: `${columnWidths.supplierName}px`, flexShrink: 0 }} title={bill.accountName || 'N/A'}><span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bill.accountName || 'N/A'}</span></div>
                <div className="pb-cell" style={{ width: `${columnWidths.payMode}px`, flexShrink: 0 }}><span>{bill.paymentMode || ''}</span></div>
                <div className="pb-cell pb-cell--end" style={{ width: `${columnWidths.subTotal}px`, flexShrink: 0 }}><span>{formatCurrency(bill.subTotal)}</span></div>
                <div className="pb-cell pb-cell--end" style={{ width: `${columnWidths.discount}px`, flexShrink: 0 }}><span>{(bill.discountPercentage || 0).toFixed(2)}% - {formatCurrency(bill.discountAmount)}</span></div>
                {showVatColumns && (
                    <>
                        <div className="pb-cell pb-cell--end" style={{ width: `${columnWidths.taxable}px`, flexShrink: 0 }}><span>{formatCurrency(bill.taxableAmount)}</span></div>
                        <div className="pb-cell pb-cell--end" style={{ width: `${columnWidths.vat}px`, flexShrink: 0 }}><span>{formatCurrency(bill.vatAmount)}</span></div>
                    </>
                )}
                <div className="pb-cell pb-cell--end" style={{ width: `${columnWidths.roundOff}px`, flexShrink: 0 }}><span>{formatCurrency(bill.roundOffAmount)}</span></div>
                <div className="pb-cell pb-cell--end" style={{ width: `${columnWidths.total}px`, flexShrink: 0 }}><span>{formatCurrency(bill.totalAmount)}</span></div>
                <div className="pb-cell" style={{ width: `${columnWidths.user}px`, flexShrink: 0 }} title={bill.userName || 'N/A'}><span>{bill.userName || 'N/A'}</span></div>
                <div className="pb-cell pb-cell--center gap-1" style={{ width: `${columnWidths.actions}px`, flexShrink: 0 }}>
                    <button className="pb-btn-action pb-btn-action--info" onClick={(e) => { e.stopPropagation(); if (bill && bill.id) navigate(`/retailer/purchase/${bill.id}/print`); }} title="View"><i className="bi bi-eye" /></button>
                    <button className="pb-btn-action pb-btn-action--warning" onClick={(e) => { e.stopPropagation(); if (bill && bill.id) navigate(`/retailer/purchase/edit/${bill.id}`); }} title="Edit"><i className="bi bi-pencil-square" /></button>
                    {/* <button className="pb-btn-action pb-btn-action--secondary" onClick={(e) => { e.stopPropagation(); navigate(`/retailer/purchase/regenerate-stock/${bill.id}`); }} title="Regenerate Stock"><i className="bi bi-arrow-repeat" /></button> */}
                </div>
            </div>
        );
    }, (prevProps, nextProps) => {
        if (prevProps.index !== nextProps.index) return false;
        if (prevProps.style !== nextProps.style) return false;
        const prevBill = prevProps.data.bills[prevProps.index];
        const nextBill = nextProps.data.bills[nextProps.index];
        return shallowEqual(prevBill, nextBill) && prevProps.data.selectedRowIndex === nextProps.data.selectedRowIndex;
    });

    const resetColumnWidths = () => {
        setColumnWidths({ bsDate: 80, adDate: 80, vchNo: 90, invNo: 90, supplierName: 150, payMode: 70, subTotal: 80, discount: 90, taxable: 70, vat: 70, roundOff: 70, total: 70, user: 80, actions: 120 });
        setNotification({ show: true, message: 'Column widths reset', type: 'success', duration: 2000 });
    };

    if (loading && bills.length === 0) return <Loader />;
    if (error) return <div className="pb-page"><Header /><div className="pb-shell"><div className="pb-state"><h3>Error</h3><p>{error}</p></div></div></div>;

    const billsArray = Array.isArray(bills) ? bills : [];

    return (
        <div className="pb-page">
            <Header />

            <div className="pb-shell">
                {/* Top Bar */}
                <div className="pb-topbar">
                    <div className="pb-topbar__left">
                        <div className="pb-topbar__icon"><FiFileText /></div>
                        <div><h1>Purchase Register</h1></div>
                    </div>
                    <div className="pb-topbar__actions">
                        <button className="pb-btn-icon" onClick={() => navigate('/retailer/purchase')} title="Add Purchase"><FiPlus /> Add</button>
                        <button className="pb-btn-icon" onClick={handleExportExcel} disabled={filteredBills.length === 0 || exporting}><FiDownload /> {exporting ? '…' : 'Excel'}</button>
                        <button className="pb-btn-icon" onClick={() => handlePrint(true)} disabled={billsArray.length === 0}><FiPrinter /> Print</button>
                        <button className="pb-btn-icon" onClick={resetColumnWidths} title="Reset columns"><FiRefreshCw /> Reset</button>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="pb-toolbar">
                    <div className="pb-field pb-field--date">
                        <label>From (BS) <span className="req">*</span></label>
                        <input type="text" id="fromDate" ref={fromDateRef} className={dateErrors.fromDate ? 'is-invalid' : ''} value={dateRange.fromDate || ''} onChange={(e) => { const v = e.target.value.replace(/[^0-9/-]/g, '').slice(0, 10); setDateRange(p => ({ ...p, fromDate: v, fromDateAd: convertBsToAd(v) || p.fromDateAd })); setDateErrors(p => ({ ...p, fromDate: '' })); }} onKeyDown={(e) => handleKeyDown(e, 'fromDateAd')} onBlur={(e) => { const d = e.target.value.trim(); if (!d) return; const c = validateAndCorrectNepaliDate(d); if (!c) { const ad = convertBsToAd(currentNepaliDate); setDateRange(p => ({ ...p, fromDate: currentNepaliDate, fromDateAd: ad })); setNotification({ show: true, message: 'Invalid Nepali date. Auto-corrected.', type: 'warning' }); } }} placeholder="YYYY-MM-DD" autoComplete="off" autoFocus />
                        {dateErrors.fromDate && <div className="pb-field-error">{dateErrors.fromDate}</div>}
                    </div>
                    <div className="pb-field pb-field--date">
                        <label>From (AD)</label>
                        <input type="date" id="fromDateAd" value={dateRange.fromDateAd || ''} onChange={(e) => { const v = e.target.value; setDateRange(p => ({ ...p, fromDateAd: v, fromDate: convertAdToBs(v) || p.fromDate })); }} onKeyDown={(e) => handleKeyDown(e, 'toDate')} />
                    </div>
                    <div className="pb-field pb-field--date">
                        <label>To (BS) <span className="req">*</span></label>
                        <input type="text" id="toDate" ref={toDateRef} className={dateErrors.toDate ? 'is-invalid' : ''} value={dateRange.toDate || ''} onChange={(e) => { const v = e.target.value.replace(/[^0-9/-]/g, '').slice(0, 10); setDateRange(p => ({ ...p, toDate: v, toDateAd: convertBsToAd(v) || p.toDateAd })); setDateErrors(p => ({ ...p, toDate: '' })); }} onKeyDown={(e) => handleKeyDown(e, 'toDateAd')} onBlur={(e) => { const d = e.target.value.trim(); if (!d) return; const c = validateAndCorrectNepaliDate(d); if (!c) { const ad = convertBsToAd(currentNepaliDate); setDateRange(p => ({ ...p, toDate: currentNepaliDate, toDateAd: ad })); setNotification({ show: true, message: 'Invalid Nepali date. Auto-corrected.', type: 'warning' }); } }} placeholder="YYYY-MM-DD" autoComplete="off" />
                        {dateErrors.toDate && <div className="pb-field-error">{dateErrors.toDate}</div>}
                    </div>
                    <div className="pb-field pb-field--date">
                        <label>To (AD)</label>
                        <input type="date" id="toDateAd" value={dateRange.toDateAd || ''} onChange={(e) => { const v = e.target.value; setDateRange(p => ({ ...p, toDateAd: v, toDate: convertAdToBs(v) || p.toDate })); }} onKeyDown={(e) => handleKeyDown(e, 'generateReport')} />
                    </div>

                    <button type="button" id="generateReport" ref={generateReportRef} className="pb-btn-gen" onClick={handleGenerateReport} disabled={loading}>
                        {loading ? <span className="spinner-border spinner-border-sm" style={{ width: 12, height: 12 }} /> : <><FiSearch className="me-1" /> Generate</>}
                    </button>

                    <div className="pb-toolbar-divider" />

                    <div className="pb-field pb-field--search">
                        <label>Search</label>
                        <div className="pb-search-wrap">
                            <FiSearch className="pb-search-icon" />
                            <input type="text" id="searchInput" ref={searchInputRef} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} disabled={billsArray.length === 0} autoComplete="off" />
                            {searchQuery && <button className="pb-search-clear" onClick={() => setSearchQuery('')}>×</button>}
                        </div>
                    </div>

                    <div className="pb-field pb-field--select">
                        <label>Mode</label>
                        <select id="paymentModeFilter" ref={paymentModeFilterRef} value={paymentModeFilter} onChange={(e) => setPaymentModeFilter(e.target.value)} disabled={billsArray.length === 0}>
                            <option value="">All</option>
                            <option value="cash">Cash</option>
                            <option value="credit">Credit</option>
                        </select>
                    </div>
                </div>

                {error && (
                    <div className="pb-alert">
                        <i className="bi bi-exclamation-circle" />{error}
                        <button type="button" className="btn-close btn-sm ms-auto" onClick={() => setError(null)} />
                    </div>
                )}

                {/* Main Content */}
                <div className="pb-main">
                    {billsArray.length === 0 && !loading ? (
                        <div className="pb-state">
                            <FiCalendar size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                            <h3>Select date range & generate</h3>
                            <p>Choose a date range and click Generate.</p>
                        </div>
                    ) : loading ? (
                        <div className="pb-state"><div className="spinner-border text-primary" /><p>Loading purchase bills...</p></div>
                    ) : filteredBills.length === 0 ? (
                        <div className="pb-state"><FiSearch size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} /><h3>No bills found</h3><p>{searchQuery ? 'Try a different search term' : 'No data for the selected date range'}</p></div>
                    ) : (
                        <>
                            <div className="pb-main__bar">
                                <span><strong>{filteredBills.length}</strong> bills</span>
                                <span>{dateRange.fromDate} — {dateRange.toDate}</span>
                            </div>

                            <div className="pb-table-wrap" ref={tableBodyRef}>
                                <AutoSizer>
                                    {({ height, width }) => {
                                        const showVatColumns = companyInfo.vatEnabled && !companyInfo.isVatExempt;
                                        const totalWidth = Object.values(columnWidths).reduce((a, b) => a + b, 0) + (showVatColumns ? columnWidths.taxable + columnWidths.vat : 0);
                                        return (
                                            <div style={{ position: 'relative', height: height, width: Math.max(width, totalWidth) }}>
                                                <TableHeader />
                                                <List height={height - 28} itemCount={filteredBills.length} itemSize={28} width={Math.max(width, totalWidth)} itemData={{ bills: filteredBills, selectedRowIndex, formatCurrency, navigate, handleRowClick }}>{TableRow}</List>
                                            </div>
                                        );
                                    }}
                                </AutoSizer>
                            </div>

                            {/* Sticky Footer with Totals */}
                            <div className="pb-footer">
                                <div className="pb-footer-cell" style={{ width: `${columnWidths.bsDate + columnWidths.adDate + columnWidths.vchNo + columnWidths.invNo + columnWidths.supplierName + columnWidths.payMode}px`, flexShrink: 0 }}><strong>Total:</strong></div>
                                <div className="pb-footer-cell pb-cell--end" style={{ width: `${columnWidths.subTotal}px`, flexShrink: 0 }}><strong>{formatCurrency(totals.subTotal)}</strong></div>
                                <div className="pb-footer-cell pb-cell--end" style={{ width: `${columnWidths.discount}px`, flexShrink: 0 }}><strong>{formatCurrency(totals.discount)}</strong></div>
                                {companyInfo.vatEnabled && !companyInfo.isVatExempt && (
                                    <>
                                        <div className="pb-footer-cell pb-cell--end" style={{ width: `${columnWidths.taxable}px`, flexShrink: 0 }}><strong>{formatCurrency(totals.taxable)}</strong></div>
                                        <div className="pb-footer-cell pb-cell--end" style={{ width: `${columnWidths.vat}px`, flexShrink: 0 }}><strong>{formatCurrency(totals.vat)}</strong></div>
                                    </>
                                )}
                                <div className="pb-footer-cell pb-cell--end" style={{ width: `${columnWidths.roundOff}px`, flexShrink: 0 }}><strong>{formatCurrency(totals.roundOff)}</strong></div>
                                <div className="pb-footer-cell pb-cell--end" style={{ width: `${columnWidths.total}px`, flexShrink: 0 }}><strong>{formatCurrency(totals.amount)}</strong></div>
                                <div className="pb-footer-cell" style={{ width: `${columnWidths.user + columnWidths.actions}px`, flexShrink: 0 }}></div>
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

export default PurchaseBillsList;