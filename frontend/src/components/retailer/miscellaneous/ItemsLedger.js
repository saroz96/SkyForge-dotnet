
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import NepaliDate from 'nepali-datetime';
import { Modal, Button, Form, Table, InputGroup, FormControl, Badge } from 'react-bootstrap';
import { BiBox, BiSearch, BiPrinter } from 'react-icons/bi';
import Header from '../Header';
import { usePageNotRefreshContext } from '../PageNotRefreshContext';
import '../../../stylesheet/retailer/Items/ItemsLedger.css';
import ProductModal from '../dashboard/modals/ProductModal';
import useDebounce from '../../../hooks/useDebounce';
import VirtualizedItemListForSales from '../../VirtualizedItemListForSales';

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

const ItemsLedger = () => {
    const navigate = useNavigate();
    const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
    const currentEnglishDate = new Date().toISOString().split('T')[0];
    const { draftSave, setDraftSave, clearDraft } = usePageNotRefreshContext();
    const [notification, setNotification] = useState({
        show: false,
        message: '',
        type: 'success',
        duration: 3000
    });
    const [company, setCompany] = useState({
        dateFormat: 'nepali',
        vatEnabled: true,
        fiscalYear: {}
    });
    const [dateError, setDateError] = useState({
        fromDate: '',
        toDate: ''
    });
    const [showProductModal, setShowProductModal] = useState(false);

    // SPLIT STATE: Separate date range from other data
    const [dateRange, setDateRange] = useState(() => {
        if (draftSave && draftSave.itemsLedgerData) {
            return {
                fromDate: draftSave.itemsLedgerData.fromDate || '',
                toDate: draftSave.itemsLedgerData.toDate || '',
                fromDateAd: draftSave.itemsLedgerData.fromDateAd || '',
                toDateAd: draftSave.itemsLedgerData.toDateAd || ''
            };
        }
        return {
            fromDate: '',
            toDate: '',
            fromDateAd: '',
            toDateAd: ''
        };
    });

    const [data, setData] = useState(() => {
        if (draftSave && draftSave.itemsLedgerData) {
            return {
                company: draftSave.itemsLedgerData.company,
                currentFiscalYear: draftSave.itemsLedgerData.currentFiscalYear,
                currentCompanyName: draftSave.itemsLedgerData.currentCompanyName,
                companyDateFormat: draftSave.itemsLedgerData.companyDateFormat,
                vatEnabled: draftSave.itemsLedgerData.vatEnabled,
                isVatExempt: draftSave.itemsLedgerData.isVatExempt,
                isAdminOrSupervisor: draftSave.itemsLedgerData.isAdminOrSupervisor
            };
        }
        return {
            company: null,
            currentFiscalYear: null,
            fromDate: '',
            toDate: ''
        };
    });

    const selectedItemRef = useRef(null);
    const fromDateRef = useRef(null);
    const toDateRef = useRef(null);
    const generateReportButtonRef = useRef(null);
    const itemInputRef = useRef(null);

    const [showItemModal, setShowItemModal] = useState(false);
    const [allItems, setAllItems] = useState([]);
    const [filteredItems, setFilteredItems] = useState([]);
    const [selectedItem, setSelectedItem] = useState(draftSave?.itemsLedgerData?.selectedItem || null);
    const [ledgerData, setLedgerData] = useState(draftSave?.itemsLedgerData?.ledgerData || null);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState(draftSave?.itemsLedgerData?.searchTerm || '');
    const [typeFilter, setTypeFilter] = useState(draftSave?.itemsLedgerData?.typeFilter || '');
    const [selectedRowIndex, setSelectedRowIndex] = useState(0);
    const itemListRef = useRef(null);
    const tableRef = useRef(null);

    // Add states for virtualized list
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [searchPage, setSearchPage] = useState(1);
    const [hasMoreSearchResults, setHasMoreSearchResults] = useState(false);
    const [totalSearchItems, setTotalSearchItems] = useState(0);
    const [itemSearchQuery, setItemSearchQuery] = useState('');
    const debouncedSearchQuery = useDebounce(itemSearchQuery, 500);

    const api = axios.create({
        baseURL: process.env.REACT_APP_API_BASE_URL,
        withCredentials: true,
    });

    // Add authorization header to all requests
    api.interceptors.request.use(
        (config) => {
            const token = localStorage.getItem('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        },
        (error) => {
            return Promise.reject(error);
        }
    );

    // Handle keyboard navigation between fields
    const handleKeyDown = (e, currentFieldId, nextFieldId) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (nextFieldId) {
                const nextField = document.getElementById(nextFieldId);
                if (nextField) {
                    nextField.focus();
                }
            } else {
                const form = e.target.form;
                const inputs = Array.from(form.querySelectorAll('input, select, button')).filter(
                    el => !el.hidden && !el.disabled && el.offsetParent !== null
                );
                const currentIndex = inputs.findIndex(input => input.id === currentFieldId);

                if (currentIndex > -1 && currentIndex < inputs.length - 1) {
                    inputs[currentIndex + 1].focus();
                }
            }
        }
    };

    const handleRowDoubleClick = (entry) => {
        // Determine the route based on transaction type display
        let route = '';

        switch (entry.typeDisplay) {
            case 'Purc':
                route = `/retailer/purchase/edit/${entry.transactionId}`;
                break;
            case 'PrRt':
                route = `/retailer/purchase-return/edit/${entry.transactionId}`;
                break;
            case 'Sale':
                if (entry.paymentMode === 'cash') {
                    route = `/retailer/cash-sales/edit/${entry.transactionId}`;
                } else {
                    route = `/retailer/credit-sales/edit/${entry.transactionId}`;
                }
                break;
            case 'SlRt':
                route = `/retailer/sales-return/edit/${entry.transactionId}`;
                break;
            case 'xcess':
            case 'short':
                route = `/retailer/stock-adjustments/edit/${entry.transactionId}`;
                break;
            default:
                console.log('No edit route for transaction type:', entry.typeDisplay);
                return;
        }

        if (route) {
            navigate(route);
        }
    };

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const response = await api.get('/api/retailer/sales-register/entry-data');

                if (response.data.success) {
                    const responseData = response.data.data;

                    const dateFormat = responseData.company.dateFormat?.toLowerCase() || 'english';
                    const isNepaliFormat = dateFormat === 'nepali';

                    setCompany({
                        ...responseData.company,
                        dateFormat: dateFormat,
                        vatEnabled: responseData.company.vatEnabled || true,
                        isVatExempt: responseData.company.isVatExempt || false
                    });

                    const currentFiscalYear = responseData.currentFiscalYear;
                    const hasDraftDates = draftSave?.itemsLedgerData?.fromDate &&
                        draftSave?.itemsLedgerData?.toDate;

                    if (!hasDraftDates && currentFiscalYear) {
                        let fromDateFormatted = '';
                        let toDateFormatted = '';
                        let fromDateAd = '';
                        let toDateAd = '';

                        if (isNepaliFormat) {
                            fromDateFormatted = currentFiscalYear.startDateNepali || currentNepaliDate;
                            toDateFormatted = currentNepaliDate;
                            fromDateAd = convertBsToAd(fromDateFormatted);
                            toDateAd = convertBsToAd(toDateFormatted);
                        } else {
                            fromDateFormatted = currentFiscalYear.startDate
                                ? new Date(currentFiscalYear.startDate).toISOString().split('T')[0]
                                : currentEnglishDate;
                            toDateFormatted = currentFiscalYear.endDate
                                ? new Date(currentFiscalYear.endDate).toISOString().split('T')[0]
                                : currentEnglishDate;
                            fromDateAd = fromDateFormatted;
                            toDateAd = toDateFormatted;
                        }

                        setDateRange({
                            fromDate: fromDateFormatted,
                            toDate: toDateFormatted,
                            fromDateAd: fromDateAd,
                            toDateAd: toDateAd
                        });
                    } else if (hasDraftDates) {
                        let fromDateAd = dateRange.fromDate;
                        let toDateAd = dateRange.toDate;
                        if (isNepaliFormat && dateRange.fromDate) {
                            fromDateAd = convertBsToAd(dateRange.fromDate);
                            toDateAd = convertBsToAd(dateRange.toDate);
                        }
                        setDateRange(prev => ({
                            ...prev,
                            fromDateAd: fromDateAd || prev.fromDateAd,
                            toDateAd: toDateAd || prev.toDateAd
                        }));
                    }

                    setData(prev => ({
                        ...prev,
                        company: responseData.company,
                        currentFiscalYear,
                        currentCompanyName: responseData.company.name,
                        companyDateFormat: responseData.company.dateFormat,
                        vatEnabled: responseData.company.vatEnabled,
                        isVatExempt: responseData.company.isVatExempt || false,
                        isAdminOrSupervisor: responseData.isAdminOrSupervisor || false
                    }));
                }
            } catch (err) {
                console.error('Error fetching initial data:', err);
                setNotification({
                    show: true,
                    message: 'Error loading company data',
                    type: 'error'
                });
            }
        };

        fetchInitialData();
    }, []);

    // Fetch items from backend with search functionality
    const fetchItemsFromBackend = async (searchTerm = '', page = 1) => {
        try {
            setIsSearching(true);
            const response = await api.get('/api/retailer/items/search', {
                params: {
                    search: searchTerm,
                    page: page,
                    limit: 15,
                    sortBy: searchTerm.trim() ? 'relevance' : 'name'
                }
            });

            if (response.data.success) {
                const itemsWithStock = response.data.items.map(item => ({
                    ...item,
                    stock: item.currentStock || 0,
                    latestPrice: item.stockEntries && item.stockEntries.length > 0
                        ? item.stockEntries.sort((a, b) => new Date(b.date) - new Date(a.date))[0]?.price || 0
                        : 0
                }));

                if (page === 1) {
                    setSearchResults(itemsWithStock);
                } else {
                    setSearchResults(prev => [...prev, ...itemsWithStock]);
                }
                setHasMoreSearchResults(response.data.pagination.hasNextPage);
                setTotalSearchItems(response.data.pagination.totalItems);
                setSearchPage(page);
            }
        } catch (error) {
            console.error('Error fetching items:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const loadMoreSearchItems = () => {
        if (!isSearching && hasMoreSearchResults) {
            fetchItemsFromBackend(itemSearchQuery, searchPage + 1);
        }
    };

    // Fetch items when modal opens
    useEffect(() => {
        if (showItemModal) {
            setSearchPage(1);
            fetchItemsFromBackend(itemSearchQuery, 1);
        }
    }, [showItemModal, debouncedSearchQuery]);

    // Add F9 key handler
    useEffect(() => {
        const handF9leKeyDown = (e) => {
            if (e.key === 'F9') {
                e.preventDefault();
                setShowProductModal(prev => !prev);
            }
        };
        window.addEventListener('keydown', handF9leKeyDown);
        return () => {
            window.removeEventListener('keydown', handF9leKeyDown);
        };
    }, []);

    // Focus on fromDate after item selection
    useEffect(() => {
        if (selectedItem && fromDateRef.current) {
            fromDateRef.current.focus();
        }
    }, [selectedItem]);

    // Save to draft when data changes
    useEffect(() => {
        const draftData = {
            ...data,
            selectedItem,
            ledgerData,
            searchTerm,
            typeFilter,
            fromDate: dateRange.fromDate,
            toDate: dateRange.toDate,
            fromDateAd: dateRange.fromDateAd,
            toDateAd: dateRange.toDateAd
        };

        setDraftSave({
            ...draftSave,
            itemsLedgerData: draftData
        });
    }, [data, selectedItem, ledgerData, searchTerm, typeFilter, dateRange]);

    const fetchItemLedger = async () => {
        if (!selectedItem || !dateRange.fromDateAd || !dateRange.toDateAd) return;

        try {
            setLoading(true);
            const response = await api.get(`/api/retailer/items-ledger/${selectedItem.id}`, {
                params: {
                    fromDate: dateRange.fromDateAd,
                    toDate: dateRange.toDateAd
                }
            });

            if (response.data.success) {
                setLedgerData(response.data.data);
            } else {
                console.error('Error from server:', response.data.error);
            }
        } catch (error) {
            console.error('Error fetching ledger data:', error);
            if (error.response) {
                console.error('Server responded with:', error.response.data);
            }
        } finally {
            setLoading(false);
        }
    };

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

    // Handle item selection
    const handleSelectItem = (item) => {
        setSelectedItem({
            id: item.id,
            name: item.name,
            unit: item.unit?.name || 'N/A'
        });
        setShowItemModal(false);
        setItemSearchQuery('');
    };

    // const handlePrint = (filtered = false) => {
    //     const entriesToPrint = filtered ? filteredEntries : ledgerData?.entries || [];

    //     if (entriesToPrint.length === 0) {
    //         alert("No data to print");
    //         return;
    //     }

    //     const printWindow = window.open("", "_blank");
    //     const printHeader = `
    //         <div class="print-header">
    //             <h1>${ledgerData?.currentCompanyName || 'Company Name'}</h1>
    //             <p>
    //                 ${ledgerData?.currentCompany?.address || ''}, ${ledgerData?.currentCompany?.city || ''},
    //                 Tel: ${ledgerData?.currentCompany?.phone || ''} | PAN: ${ledgerData?.currentCompany?.pan || ''}<br>
    //             </p>
    //             <hr>
    //         </div>
    //     `;

    //     let tableContent = `
    //     <style>
    //         @page {
    //             size: A4 landscape;
    //             margin: 10mm;
    //         }
    //         body { 
    //             font-family: 'Arial Narrow', Arial, sans-serif; 
    //             font-size: 9pt; 
    //             margin: 0;
    //             padding: 10mm;
    //         }
    //         table { 
    //             width: 100%; 
    //             border-collapse: collapse; 
    //             page-break-inside: auto;
    //         }
    //         tr { 
    //             page-break-inside: avoid; 
    //             page-break-after: auto; 
    //         }
    //         th, td { 
    //             border: 1px solid #000; 
    //             padding: 4px; 
    //             text-align: left; 
    //             white-space: nowrap;
    //         }
    //         th { 
    //             background-color: #f2f2f2 !important; 
    //             -webkit-print-color-adjust: exact; 
    //         }
    //         .print-header { 
    //             text-align: center; 
    //             margin-bottom: 15px; 
    //         }
    //         .nowrap {
    //             white-space: nowrap;
    //         }
    //         .type-Purc { color: #28a745; }
    //         .type-PrRt { color: #dc3545; }
    //         .type-Sale { color: #007bff; }
    //         .type-SlRt { color: #17a2b8; }
    //         .type-xcess { color: #28a745; }
    //         .type-short { color: #dc3545; }
    //     </style>
    //     ${printHeader}
    //     <h1 style="text-align:center;text-decoration:underline;">Item Ledger</h1>
    //     <h3 style="text-align:center;">${selectedItem?.name || ''}</h3>
    //     <p style="text-align:center;">Period: ${data.fromDate} to ${data.toDate}</p>
    //     <table>
    //         <thead>
    //             <tr>
    //                 <th class="nowrap">Date</th>
    //                 <th class="nowrap">Vch/Inv.</th>
    //                 <th class="nowrap">Party Name</th>
    //                 <th class="nowrap">Type</th>
    //                 <th class="nowrap">Qty. In</th>
    //                 <th class="nowrap">Qty. Out</th>
    //                 <th class="nowrap">Free</th>
    //                 <th class="nowrap">Unit</th>
    //                 <th class="nowrap">Rate (Rs.)</th>
    //                 <th class="nowrap">Balance</th>
    //             </tr>
    //         </thead>
    //         <tbody>
    //     `;

    //     // Add opening stock
    //     tableContent += `
    //         <tr class="opening-row" style="font-weight:bold; background-color:#f8f9fa;">
    //             <td>${data.fromDate}</td>
    //             <td></td>
    //             <td>Opening</td>
    //             <td></td>
    //             <td></td>
    //             <td></td>
    //             <td></td>
    //             <td></td>
    //             <td class="text-right">${ledgerData?.purchasePrice ? ledgerData.purchasePrice.toFixed(2) : ''}</td>
    //             <td class="text-right">${ledgerData?.openingStock?.toFixed(2) || '0.00'}</td>
    //         </tr>
    //     `;

    //     entriesToPrint.forEach(entry => {
    //         tableContent += `
    //         <tr>
    //             <td class="nowrap">${new Date(entry.date).toLocaleDateString()}</td>
    //             <td class="nowrap">${entry.billNumber || ''}</td>
    //             <td class="nowrap">${entry.partyName}</td>
    //             <td class="nowrap type-${entry.typeDisplay}">${entry.typeDisplay || entry.type}</td>
    //             <td class="nowrap text-right">${entry.qtyIn ? entry.qtyIn.toFixed(2) : '-'}</td>
    //             <td class="nowrap text-right">${entry.qtyOut ? entry.qtyOut.toFixed(2) : '-'}</td>
    //             <td class="nowrap text-right">${entry.bonus ? entry.bonus.toFixed(2) : '0.00'}</td>
    //             <td class="nowrap">${entry.unit || ''}</td>
    //             <td class="nowrap text-right">${entry.price ? entry.price.toFixed(2) : ''}</td>
    //             <td class="nowrap text-right">${entry.balance?.toFixed(2)}</td>
    //         </tr>
    //         `;
    //     });

    //     // Add totals row
    //     tableContent += `
    //         <tr style="font-weight:bold; border-top: 2px solid #000; background-color:#f2f2f2;">
    //             <td colspan="4">Totals:</td>
    //             <td class="text-right">${totals.qtyIn.toFixed(2)}</td>
    //             <td class="text-right">${totals.qtyOut.toFixed(2)}</td>
    //             <td class="text-right">${totals.free.toFixed(2)}</td>
    //             <td></td>
    //             <td></td>
    //             <td class="text-right">${totals.balance.toFixed(2)}</td>
    //         </tr>
    //         </tbody>
    //     </table>
    //     `;

    //     printWindow.document.write(`
    //     <html>
    //         <head>
    //             <title>Item Ledger: ${selectedItem?.name || ''}</title>
    //         </head>
    //         <body>
    //             ${tableContent}
    //             <script>
    //                 window.onload = function() {
    //                     setTimeout(function() {
    //                         window.print();
    //                     }, 200);
    //                 };
    //             <\/script>
    //         </body>
    //     </html>
    //     `);
    //     printWindow.document.close();
    // };

    // Get type display name for filter options - using actual TypeDisplay values from backend


    const handlePrint = (filtered = false) => {
        const entriesToPrint = filtered ? filteredEntries : ledgerData?.entries || [];

        if (entriesToPrint.length === 0) {
            alert("No data to print");
            return;
        }

        const printWindow = window.open("", "_blank");
        const printHeader = `
    <div class="print-header">
        <h1 style="font-size: 14px; margin: 0;">${data.currentCompanyName || 'Company Name'}</h1>
        <p style="font-size: 8px; margin: 2px 0;">
            ${data.company?.address || ''}${data.company?.city ? ', ' + data.company.city : ''},
            PAN: ${data.company?.pan || ''}<br>
        </p>
        <hr style="margin: 2px 0;">
    </div>
    `;

        let tableContent = `
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
            text-decoration: underline;
            font-size: 11px;
            font-weight: bold;
            margin: 3px 0;
        }
        .grand-total-row td {
            font-weight: bold;
            border-top: 2px solid #000;
            font-size: 7px;
        }
    </style>
    ${printHeader}
    <div class="report-title">Item Ledger</div>
    <h3 style="text-align:center; font-size: 10px; margin: 2px 0;">${selectedItem?.name || ''}</h3>
    <p style="text-align:center; font-size: 8px; margin: 2px 0;">Period: ${dateRange.fromDate} to ${dateRange.toDate}</p>
    <table>
        <thead>
            <tr>
                <th class="nowrap">Miti</th>
                <th class="nowrap">Date</th>
                <th class="nowrap">Vch/Inv.</th>
                <th class="nowrap">Party Name</th>
                <th class="nowrap">Type</th>
                <th class="nowrap">Qty. In</th>
                <th class="nowrap">Qty. Out</th>
                <th class="nowrap">Free</th>
                <th class="nowrap">Unit</th>
                <th class="nowrap">Rate (Rs.)</th>
                <th class="nowrap">Balance</th>
            </tr>
        </thead>
        <tbody>
    `;

        // Add opening stock
        tableContent += `
        <tr class="opening-row" style="font-weight:bold; background-color:#f8f9fa;">
            <td class="nowrap">${dateRange.fromDate}</td>
            <td class="nowrap">${dateRange.fromDateAd ? new Date(dateRange.fromDateAd).toLocaleDateString() : ''}</td>
            <td class="nowrap"></td>
            <td class="nowrap" colspan="2">Opening</td>
            <td class="nowrap" style="text-align: right;">${ledgerData?.openingStock?.toFixed(2) || '0.00'}</td>
            <td class="nowrap" style="text-align: right;"></td>
            <td class="nowrap" style="text-align: right;"></td>
            <td class="nowrap"></td>
            <td class="nowrap" style="text-align: right;">${ledgerData?.purchasePrice ? ledgerData.purchasePrice.toFixed(2) : ''}</td>
            <td class="nowrap" style="text-align: right;">${ledgerData?.openingStock?.toFixed(2) || '0.00'}</td>
        </tr>
    `;

        let printTotals = {
            qtyIn: 0,
            qtyOut: 0,
            free: 0,
            balance: 0
        };

        entriesToPrint.forEach(entry => {
            tableContent += `
        <tr>
            <td class="nowrap">${entry.nepaliDate || ''}</td>
            <td class="nowrap">${entry.date ? new Date(entry.date).toLocaleDateString() : ''}</td>
            <td class="nowrap">${entry.billNumber || ''}</td>
            <td class="nowrap">${entry.partyName}</td>
            <td class="nowrap type-${entry.typeDisplay}">${getTypeLabel(entry.typeDisplay)}</td>
            <td class="nowrap" style="text-align: right;">${entry.qtyIn ? entry.qtyIn.toFixed(2) : '-'}</td>
            <td class="nowrap" style="text-align: right;">${entry.qtyOut ? entry.qtyOut.toFixed(2) : '-'}</td>
            <td class="nowrap" style="text-align: right;">${entry.bonus ? entry.bonus.toFixed(2) : '0.00'}</td>
            <td class="nowrap">${entry.unit || ''}</td>
            <td class="nowrap" style="text-align: right;">${entry.price ? entry.price.toFixed(2) : ''}</td>
            <td class="nowrap" style="text-align: right;">${entry.balance?.toFixed(2)}</td>
        </tr>
        `;

            printTotals.qtyIn += entry.qtyIn || 0;
            printTotals.qtyOut += entry.qtyOut || 0;
            printTotals.free += entry.bonus || 0;
            printTotals.balance = entry.balance || 0;
        });

        tableContent += `
        <tr class="grand-total-row" style="font-weight:bold;">
            <td colspan="5" style="font-weight: bold;">Grand Totals</td>
            <td style="text-align: right; font-weight: bold;">${printTotals.qtyIn.toFixed(2)}</td>
            <td style="text-align: right; font-weight: bold;">${printTotals.qtyOut.toFixed(2)}</td>
            <td style="text-align: right; font-weight: bold;">${printTotals.free.toFixed(2)}</td>
            <td></td>
            <td></td>
            <td style="text-align: right; font-weight: bold;">${printTotals.balance.toFixed(2)}</td>
        </tr>
        </tbody>
    </table>
    `;

        printWindow.document.write(`
    <!DOCTYPE html>
    <html>
        <head>
            <title>Item Ledger: ${selectedItem?.name || ''}</title>
            <meta charset="UTF-8">
        </head>
        <body>
            ${tableContent}
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
    `);
        printWindow.document.close();
    };

    const getTypeOptions = () => {
        return [
            { value: '', label: 'All' },
            { value: 'Purc', label: 'Purchase' },
            { value: 'PrRt', label: 'Purchase Return' },
            { value: 'Sale', label: 'Sales' },
            { value: 'SlRt', label: 'Sales Return' },
            { value: 'xcess', label: 'Excess' },
            { value: 'short', label: 'Short' }
        ];
    };

    // Map typeDisplay to readable label for display
    const getTypeLabel = (typeDisplay) => {
        const map = {
            'Purc': 'Purc',
            'PrRt': 'PrRt',
            'Sale': 'Sale',
            'SlRt': 'SlRt',
            'xcess': 'Xces',
            'short': 'Shrt'
        };
        return map[typeDisplay] || typeDisplay;
    };

    // Filter ledger entries using typeDisplay
    const filteredEntries = ledgerData?.entries?.filter(entry => {
        const matchesSearch = entry.partyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            entry.billNumber?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = !typeFilter || entry.typeDisplay === typeFilter;
        return matchesSearch && matchesType;
    }) || [];

    // Calculate totals
    const totals = filteredEntries.reduce((acc, entry) => {
        return {
            qtyIn: acc.qtyIn + (entry.qtyIn || 0),
            qtyOut: acc.qtyOut + (entry.qtyOut || 0),
            free: acc.free + (entry.bonus || 0),
            balance: entry.balance || 0
        };
    }, { qtyIn: 0, qtyOut: 0, free: 0, balance: 0 });

    const handleGenerateReport = () => {
        if (!selectedItem) {
            setNotification({
                show: true,
                message: 'Please select an item first',
                type: 'warning',
                duration: 3000
            });
            return;
        }
        if (!dateRange.fromDate || !dateRange.toDate) {
            setNotification({
                show: true,
                message: 'Please select both from and to dates',
                type: 'warning',
                duration: 3000
            });
            return;
        }
        fetchItemLedger();
    };

    return (
        <div className="container-fluid">
            <Header />
            <div className="card mt-2 shadow-lg p-2 animate__animated animate__fadeInUp expanded-card ledger-card compact">
                <div className="card-header">
                    <h2 className="card-title text-center">
                        <BiBox className="" />
                        {selectedItem ? `Item Ledger: ${selectedItem.name}` : 'Item Ledger'}
                    </h2>
                </div>
                <div className="card-body">
                    <div className="filter-section">
                        {/* Item Field */}
                        <div className="filter-group" style={{ minWidth: '250px', flex: '0 0 auto' }}>
                            <div className="position-relative">
                                <FormControl
                                    type="text"
                                    placeholder="Select an item..."
                                    value={selectedItem?.name || ''}
                                    autoFocus
                                    onFocus={() => setShowItemModal(true)}
                                    readOnly
                                    ref={itemInputRef}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            if (!selectedItem) {
                                                setShowItemModal(true);
                                            } else {
                                                fromDateRef.current?.focus();
                                            }
                                        }
                                    }}
                                    className="form-control form-control-sm"
                                    style={{
                                        height: '26px',
                                        padding: '0.375rem 0.75rem',
                                        fontSize: '0.875rem',
                                        paddingTop: '0.5rem'
                                    }}
                                />
                                <label
                                    className="position-absolute"
                                    style={{
                                        top: '-0.5rem',
                                        left: '0.75rem',
                                        fontSize: '0.75rem',
                                        backgroundColor: 'white',
                                        padding: '0 0.25rem',
                                        color: '#6c757d',
                                        fontWeight: '500'
                                    }}
                                >
                                    Items
                                </label>
                            </div>
                        </div>

                        {/* Date Range Form */}
                        <Form
                            id="ledgerFilterForm"
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleGenerateReport();
                            }}
                            style={{
                                display: 'flex',
                                gap: '10px',
                                alignItems: 'flex-end',
                                flexWrap: 'wrap',
                                flex: '1'
                            }}
                        >
                            {/* From Date BS Field - Visible */}
                            <div className="filter-group" style={{ minWidth: '140px', maxWidth: '180px' }}>
                                <div className="position-relative">
                                    <input
                                        type="text"
                                        name="fromDate"
                                        id="fromDate"
                                        ref={fromDateRef}
                                        className={`form-control form-control-sm no-date-icon ${dateError.fromDate ? 'is-invalid' : ''}`}
                                        value={dateRange.fromDate || ''}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            const sanitizedValue = value.replace(/[^0-9/-]/g, '').slice(0, 10);
                                            const adDate = convertBsToAd(sanitizedValue);
                                            setDateRange(prev => ({
                                                ...prev,
                                                fromDate: sanitizedValue,
                                                fromDateAd: adDate || prev.fromDateAd
                                            }));
                                            setDateError(prev => ({ ...prev, fromDate: '' }));
                                        }}
                                        onKeyDown={(e) => {
                                            const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
                                            if (!allowedKeys.includes(e.key) && !/^\d$/.test(e.key) && e.key !== '/' && e.key !== '-' && !e.ctrlKey && !e.metaKey) {
                                                e.preventDefault();
                                            }
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                const dateStr = e.target.value.trim();
                                                if (!dateStr) {
                                                    const currentDate = company.dateFormat === 'nepali' ? new NepaliDate() : new Date();
                                                    const correctedDate = company.dateFormat === 'nepali' ? currentDate.format('YYYY-MM-DD') : currentDate.toISOString().split('T')[0];
                                                    const adDate = convertBsToAd(correctedDate);
                                                    setDateRange(prev => ({ ...prev, fromDate: correctedDate, fromDateAd: adDate }));
                                                    setDateError(prev => ({ ...prev, fromDate: '' }));
                                                    setNotification({ show: true, message: 'Date required. Auto-corrected to current date.', type: 'warning', duration: 3000 });
                                                    document.getElementById('toDate').focus();
                                                } else if (dateError.fromDate) {
                                                    e.target.focus();
                                                } else {
                                                    document.getElementById('toDate').focus();
                                                }
                                            }
                                        }}
                                        onBlur={(e) => {
                                            const dateStr = e.target.value.trim();
                                            if (!dateStr) return;
                                            const correctedDate = validateAndCorrectNepaliDate(dateStr);
                                            if (!correctedDate) {
                                                const fallbackDate = currentNepaliDate;
                                                const adDate = convertBsToAd(fallbackDate);
                                                setDateRange(prev => ({ ...prev, fromDate: fallbackDate, fromDateAd: adDate }));
                                                setNotification({ show: true, message: 'Invalid Nepali date. Auto-corrected to current date.', type: 'warning', duration: 3000 });
                                            }
                                        }}
                                        placeholder="YYYY-MM-DD (BS)"
                                        required
                                        autoComplete="off"
                                        style={{
                                            height: '26px',
                                            fontSize: '0.875rem',
                                            paddingTop: '0.75rem',
                                            width: '100%'
                                        }}
                                    />
                                    <label
                                        className="position-absolute"
                                        style={{
                                            top: '-0.5rem',
                                            left: '0.75rem',
                                            fontSize: '0.75rem',
                                            backgroundColor: 'white',
                                            padding: '0 0.25rem',
                                            color: '#6c757d',
                                            fontWeight: '500'
                                        }}
                                    >
                                        From Date: <span className="text-danger">*</span>
                                    </label>
                                    {dateError.fromDate && (
                                        <div className="invalid-feedback d-block" style={{ fontSize: '0.7rem' }}>
                                            {dateError.fromDate}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Hidden AD From Date Field - Stored but not displayed */}
                            <input
                                type="hidden"
                                name="fromDateAd"
                                id="fromDateAd"
                                value={dateRange.fromDateAd || ''}
                            />

                            {/* To Date BS Field - Visible */}
                            <div className="filter-group" style={{ minWidth: '140px', maxWidth: '180px' }}>
                                <div className="position-relative">
                                    <input
                                        type="text"
                                        name="toDate"
                                        id="toDate"
                                        ref={toDateRef}
                                        className={`form-control form-control-sm no-date-icon ${dateError.toDate ? 'is-invalid' : ''}`}
                                        value={dateRange.toDate || ''}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            const sanitizedValue = value.replace(/[^0-9/-]/g, '').slice(0, 10);
                                            const adDate = convertBsToAd(sanitizedValue);
                                            setDateRange(prev => ({
                                                ...prev,
                                                toDate: sanitizedValue,
                                                toDateAd: adDate || prev.toDateAd
                                            }));
                                            setDateError(prev => ({ ...prev, toDate: '' }));
                                        }}
                                        onKeyDown={(e) => {
                                            const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
                                            if (!allowedKeys.includes(e.key) && !/^\d$/.test(e.key) && e.key !== '/' && e.key !== '-' && !e.ctrlKey && !e.metaKey) {
                                                e.preventDefault();
                                            }
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                const dateStr = e.target.value.trim();
                                                if (!dateStr) {
                                                    const currentDate = company.dateFormat === 'nepali' ? new NepaliDate() : new Date();
                                                    const correctedDate = company.dateFormat === 'nepali' ? currentDate.format('YYYY-MM-DD') : currentDate.toISOString().split('T')[0];
                                                    const adDate = convertBsToAd(correctedDate);
                                                    setDateRange(prev => ({ ...prev, toDate: correctedDate, toDateAd: adDate }));
                                                    setDateError(prev => ({ ...prev, toDate: '' }));
                                                    setNotification({ show: true, message: 'Date required. Auto-corrected to current date.', type: 'warning', duration: 3000 });
                                                    document.getElementById('generateReportButton').focus();
                                                } else if (dateError.toDate) {
                                                    e.target.focus();
                                                } else {
                                                    document.getElementById('generateReportButton').focus();
                                                }
                                            }
                                        }}
                                        onBlur={(e) => {
                                            const dateStr = e.target.value.trim();
                                            if (!dateStr) return;
                                            const correctedDate = validateAndCorrectNepaliDate(dateStr);
                                            if (!correctedDate) {
                                                const fallbackDate = currentNepaliDate;
                                                const adDate = convertBsToAd(fallbackDate);
                                                setDateRange(prev => ({ ...prev, toDate: fallbackDate, toDateAd: adDate }));
                                                setNotification({ show: true, message: 'Invalid Nepali date. Auto-corrected to current date.', type: 'warning', duration: 3000 });
                                            }
                                        }}
                                        placeholder="YYYY-MM-DD (BS)"
                                        required
                                        autoComplete="off"
                                        style={{
                                            height: '26px',
                                            fontSize: '0.875rem',
                                            paddingTop: '0.75rem',
                                            width: '100%'
                                        }}
                                    />
                                    <label
                                        className="position-absolute"
                                        style={{
                                            top: '-0.5rem',
                                            left: '0.75rem',
                                            fontSize: '0.75rem',
                                            backgroundColor: 'white',
                                            padding: '0 0.25rem',
                                            color: '#6c757d',
                                            fontWeight: '500'
                                        }}
                                    >
                                        To Date: <span className="text-danger">*</span>
                                    </label>
                                    {dateError.toDate && (
                                        <div className="invalid-feedback d-block" style={{ fontSize: '0.7rem' }}>
                                            {dateError.toDate}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Hidden AD To Date Field - Stored but not displayed */}
                            <input
                                type="hidden"
                                name="toDateAd"
                                id="toDateAd"
                                value={dateRange.toDateAd || ''}
                            />

                            {/* Generate Report Button */}
                            <div className="filter-group" style={{ minWidth: '100px' }}>
                                <Button
                                    variant="primary"
                                    type="submit"
                                    ref={generateReportButtonRef}
                                    id="generateReportButton"
                                    className="btn-sm"
                                    style={{
                                        height: '30px',
                                        padding: '0 15px',
                                        fontSize: '0.875rem',
                                        fontWeight: '500'
                                    }}
                                >
                                    <i className="bi bi-search"></i>Generate
                                </Button>
                            </div>
                        </Form>

                        {/* Search Field */}
                        <div className="filter-group" style={{ minWidth: '180px', flex: '0 0 auto' }}>
                            <div className="position-relative">
                                <input
                                    type="text"
                                    id="searchInput"
                                    autoComplete='off'
                                    className="form-control form-control-sm"
                                    placeholder=""
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            const nextField = document.getElementById('typeFilter');
                                            if (nextField) nextField.focus();
                                        }
                                    }}
                                    style={{
                                        height: '26px',
                                        fontSize: '0.875rem',
                                        paddingTop: '1rem',
                                        width: '100%'
                                    }}
                                />
                                <label
                                    className="position-absolute"
                                    style={{
                                        top: '-0.5rem',
                                        left: '0.75rem',
                                        fontSize: '0.75rem',
                                        backgroundColor: 'white',
                                        padding: '0 0.25rem',
                                        color: '#6c757d',
                                        fontWeight: '500',
                                    }}
                                >
                                    Search
                                </label>
                            </div>
                        </div>

                        {/* Filter by Type Field */}
                        <div className="filter-group" style={{ minWidth: '160px', flex: '0 0 auto' }}>
                            <div className="position-relative">
                                <select
                                    id="typeFilter"
                                    value={typeFilter}
                                    onChange={(e) => setTypeFilter(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            const printAllBtn = document.querySelector('button[onclick*="handlePrint(false)"]');
                                            if (printAllBtn) printAllBtn.focus();
                                        }
                                    }}
                                    className="form-control form-control-sm"
                                    style={{
                                        height: '26px',
                                        fontSize: '0.875rem',
                                        paddingTop: '0.25rem',
                                        width: '100%'
                                    }}
                                >
                                    {getTypeOptions().map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                                <label
                                    className="position-absolute"
                                    style={{
                                        top: '-0.5rem',
                                        left: '0.75rem',
                                        fontSize: '0.75rem',
                                        backgroundColor: 'white',
                                        padding: '0 0.25rem',
                                        color: '#6c757d',
                                        fontWeight: '500'
                                    }}
                                >
                                    Filter by Type
                                </label>
                            </div>
                        </div>

                        {/* Print Buttons */}
                        <div className="filter-group" style={{ minWidth: 'auto', flex: '0 0 auto' }}>
                            <div style={{ display: 'flex', gap: '5px' }}>
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-sm border rounded"
                                    disabled={!ledgerData}
                                    onClick={() => handlePrint(true)}
                                    style={{
                                        height: '30px',
                                        padding: '0 12px',
                                        fontSize: '0.875rem',
                                        display: 'inline-flex',
                                        alignItems: 'center'
                                    }}
                                >
                                    <i className="bi bi-printer"></i>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="table-container" style={{ height: '400px', overflowY: 'auto' }}>
                        <Table striped bordered hover className="ledger-table small-table" ref={tableRef} style={{ fontSize: '0.8rem', marginBottom: '0' }}>
                            <thead style={{ position: 'sticky', top: 0, backgroundColor: '#fff', zIndex: 1 }}>
                                <tr style={{ height: '30px' }}>
                                    <th style={{ padding: '4px 6px', fontWeight: '600' }}>Miti</th>
                                    <th style={{ padding: '4px 6px', fontWeight: '600' }}>Date</th>
                                    <th style={{ padding: '4px 6px', fontWeight: '600' }}>Vch/Inv.</th>
                                    <th style={{ padding: '4px 6px', fontWeight: '600' }}>Party Name</th>
                                    <th style={{ padding: '4px 6px', fontWeight: '600' }}>Type</th>
                                    <th style={{ padding: '4px 6px', fontWeight: '600' }}>Qty. In</th>
                                    <th style={{ padding: '4px 6px', fontWeight: '600' }}>Qty. Out</th>
                                    <th style={{ padding: '4px 6px', fontWeight: '600' }}>Free</th>
                                    <th style={{ padding: '4px 6px', fontWeight: '600' }}>Unit</th>
                                    <th style={{ padding: '4px 6px', fontWeight: '600' }}>Rate (Rs.)</th>
                                    <th style={{ padding: '4px 6px', fontWeight: '600' }}>Balance</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && (
                                    <tr>
                                        <td colSpan="11" className="text-center py-3" style={{ fontSize: '0.85rem' }}>
                                            Loading...
                                        </td>
                                    </tr>
                                )}

                                {!loading && !ledgerData && (
                                    <tr>
                                        <td colSpan="11" className="text-center py-3 text-muted" style={{ fontSize: '0.85rem' }}>
                                            Please select an item and date range
                                        </td>
                                    </tr>
                                )}

                                {!loading && ledgerData && (
                                    <>
                                        <tr className="opening-row" style={{ height: '28px', backgroundColor: '#f8f9fa', fontWeight: 'bold' }}>
                                            <td style={{ padding: '4px 6px' }}>{dateRange.fromDate}</td>
                                            <td style={{ padding: '4px 6px' }}>{dateRange.fromDateAd ? new Date(dateRange.fromDateAd).toLocaleDateString() : ''}</td>
                                            <td style={{ padding: '4px 6px' }}></td>
                                            <td style={{ padding: '4px 6px' }} colSpan="2">Opening</td>
                                            <td style={{ padding: '4px 6px', textAlign: 'right' }}></td>
                                            <td style={{ padding: '4px 6px', textAlign: 'right' }}></td>
                                            <td style={{ padding: '4px 6px', textAlign: 'right' }}></td>
                                            <td style={{ padding: '4px 6px' }}></td>
                                            <td style={{ padding: '4px 6px', textAlign: 'right' }}>
                                                {ledgerData?.purchasePrice ? ledgerData.purchasePrice.toFixed(2) : ''}
                                            </td>
                                            <td style={{ padding: '4px 6px', textAlign: 'right' }}>
                                                {ledgerData?.openingStock?.toFixed(2) || '0.00'}
                                            </td>
                                        </tr>

                                        {filteredEntries.map((entry, index) => (
                                            <tr
                                                key={index}
                                                className={`type-${entry.typeDisplay}`}
                                                onDoubleClick={() => handleRowDoubleClick(entry)}
                                                onClick={() => setSelectedRowIndex(index)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        setSelectedRowIndex(index);
                                                    }
                                                }}
                                                tabIndex={0}
                                                style={{
                                                    height: '26px',
                                                    cursor: 'pointer',
                                                    backgroundColor: selectedRowIndex === index ? '#e7f3ff' : (index % 2 === 0 ? '#f8f9fa' : 'white')
                                                }}
                                                title="Double-click to edit"
                                            >
                                                <td style={{ padding: '4px 6px', whiteSpace: 'nowrap' }}>{entry.nepaliDate || ''}</td>
                                                <td style={{ padding: '4px 6px', whiteSpace: 'nowrap' }}>
                                                    {entry.date ? new Date(entry.date).toLocaleDateString() : ''}
                                                </td>
                                                <td style={{ padding: '4px 6px', whiteSpace: 'nowrap' }}>{entry.billNumber || ''}</td>
                                                <td style={{ padding: '4px 6px', whiteSpace: 'nowrap' }}>{entry.partyName}</td>
                                                <td style={{ padding: '4px 6px', whiteSpace: 'nowrap' }} className={`type-${entry.typeDisplay}`}>
                                                    {getTypeLabel(entry.typeDisplay)}
                                                </td>
                                                <td style={{ padding: '4px 6px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                    {entry.qtyIn ? entry.qtyIn.toFixed(2) : '-'}
                                                </td>
                                                <td style={{ padding: '4px 6px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                    {entry.qtyOut ? entry.qtyOut.toFixed(2) : '-'}
                                                </td>
                                                <td style={{ padding: '4px 6px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                    {entry.bonus ? entry.bonus.toFixed(2) : '0.00'}
                                                </td>
                                                <td style={{ padding: '4px 6px', whiteSpace: 'nowrap' }}>{entry.unit || ''}</td>
                                                <td style={{ padding: '4px 6px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                    {entry.price ? entry.price.toFixed(2) : ''}
                                                </td>
                                                <td style={{ padding: '4px 6px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                    {entry.balance?.toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                    </>
                                )}
                            </tbody>

                            {ledgerData && filteredEntries.length > 0 && (
                                <tfoot style={{ position: 'sticky', bottom: 0, backgroundColor: '#fff', zIndex: 1 }}>
                                    <tr className="bg-light" style={{ height: '28px', fontWeight: 'bold', borderTop: '2px solid #dee2e6' }}>
                                        <td colSpan="5" style={{ padding: '4px 6px' }}>Totals:</td>
                                        <td style={{ padding: '4px 6px', textAlign: 'right' }}>{totals.qtyIn.toFixed(2)}</td>
                                        <td style={{ padding: '4px 6px', textAlign: 'right' }}>{totals.qtyOut.toFixed(2)}</td>
                                        <td style={{ padding: '4px 6px', textAlign: 'right' }}>{totals.free.toFixed(2)}</td>
                                        <td style={{ padding: '4px 6px' }}></td>
                                        <td style={{ padding: '4px 6px' }}></td>
                                        <td style={{ padding: '4px 6px', textAlign: 'right' }}>{totals.balance.toFixed(2)}</td>
                                    </tr>
                                </tfoot>
                            )}
                        </Table>
                    </div>
                </div>
            </div>

            {/* Item Selection Modal */}
            {showItemModal && (
                <div className="modal fade show" id="itemModal" tabIndex="-1" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-xl modal-dialog-centered">
                        <div className="modal-content" style={{ height: '440px' }}>
                            <div className="modal-header py-1">
                                <p className="modal-title mb-0" id="itemModalLabel" style={{ fontSize: '0.9rem', fontWeight: '500' }}>
                                    Select an Item
                                </p>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setShowItemModal(false)}
                                    style={{ fontSize: '0.7rem' }}
                                ></button>
                            </div>
                            <div className="p-2 bg-white sticky-top">
                                <input
                                    type="text"
                                    id="searchItem"
                                    className="form-control form-control-sm"
                                    placeholder="Search Item... (Press ESC to close)"
                                    autoFocus
                                    autoComplete='off'
                                    value={itemSearchQuery}
                                    onChange={(e) => setItemSearchQuery(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Escape') {
                                            e.preventDefault();
                                            setShowItemModal(false);
                                        } else if (e.key === 'ArrowDown') {
                                            e.preventDefault();
                                            const firstItem = document.querySelector('.dropdown-item');
                                            if (firstItem) {
                                                firstItem.focus();
                                            }
                                        }
                                    }}
                                    style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                                />
                            </div>
                            <div className="modal-body p-0">
                                <div style={{ height: 'calc(400px - 100px)' }}>
                                    <div
                                        className="w-100 h-100"
                                        style={{
                                            border: '1px solid #dee2e6',
                                            borderRadius: '0.25rem',
                                            overflow: 'hidden'
                                        }}
                                    >
                                        <div className="dropdown-header" style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(7, 1fr)',
                                            alignItems: 'center',
                                            padding: '0 8px',
                                            height: '20px',
                                            background: '#f0f0f0',
                                            fontWeight: 'bold',
                                            borderBottom: '1px solid #dee2e6',
                                            position: 'sticky',
                                            top: 0,
                                            zIndex: 1,
                                            fontSize: '0.7rem'
                                        }}>
                                            <div><strong>#</strong></div>
                                            <div><strong>HSN</strong></div>
                                            <div><strong>Description</strong></div>
                                            <div><strong>Category</strong></div>
                                            <div><strong>Stock</strong></div>
                                            <div><strong>Unit</strong></div>
                                            <div><strong>Rate</strong></div>
                                        </div>

                                        {searchResults.length > 0 ? (
                                            <VirtualizedItemListForSales
                                                items={searchResults}
                                                onItemClick={handleSelectItem}
                                                searchRef={itemInputRef}
                                                hasMore={hasMoreSearchResults}
                                                isSearching={isSearching}
                                                onLoadMore={loadMoreSearchItems}
                                                totalItems={totalSearchItems}
                                                page={searchPage}
                                                searchQuery={itemSearchQuery}
                                                modalClose={() => setShowItemModal(false)}
                                            />
                                        ) : (
                                            <div className="text-center py-3 text-muted" style={{ fontSize: '0.75rem' }}>
                                                {isSearching ? 'Loading items...' : 'No items found'}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer py-1" style={{ fontSize: '0.75rem' }}>
                                <div className="d-flex justify-content-between w-100">
                                    <div>
                                        Showing {searchResults.length} of {totalSearchItems} items
                                    </div>
                                    <div>
                                        <small className="text-muted">Press ESC to close</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Product modal */}
            {showProductModal && (
                <ProductModal onClose={() => setShowProductModal(false)} />
            )}
        </div>
    );
};

export default ItemsLedger;