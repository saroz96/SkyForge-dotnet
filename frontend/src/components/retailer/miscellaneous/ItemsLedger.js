
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import NepaliDate from 'nepali-date-converter';
import { Modal, Button, Form, Table, InputGroup, FormControl, Badge } from 'react-bootstrap';
import { BiBox, BiSearch, BiPrinter } from 'react-icons/bi';
import Header from '../Header';
import { usePageNotRefreshContext } from '../PageNotRefreshContext';
import '../../../stylesheet/retailer/Items/ItemsLedger.css';
import ProductModal from '../dashboard/modals/ProductModal';
import useDebounce from '../../../hooks/useDebounce';
import VirtualizedItemListForSales from '../../VirtualizedItemListForSales';

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
    const [data, setData] = useState(() => {
        if (draftSave && draftSave.itemsLedgerData) {
            return draftSave.itemsLedgerData;
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
    const handleKeyDown = (e, currentFieldId) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const form = e.target.form;
            const inputs = Array.from(form.querySelectorAll('input, select, button')).filter(
                el => !el.hidden && !el.disabled && el.offsetParent !== null
            );
            const currentIndex = inputs.findIndex(input => input.id === currentFieldId);

            if (currentIndex > -1 && currentIndex < inputs.length - 1) {
                inputs[currentIndex + 1].focus();
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

    // useEffect(() => {
    //     const fetchInitialData = async () => {
    //         try {
    //             const response = await api.get('/api/my-company');
    //             if (response.data.success) {
    //                 const { company: companyData, currentFiscalYear } = response.data;

    //                 // Set company info
    //                 const dateFormat = companyData.dateFormat || 'english';
    //                 setCompany({
    //                     dateFormat,
    //                     isVatExempt: companyData.isVatExempt || false,
    //                     vatEnabled: companyData.vatEnabled !== false,
    //                     fiscalYear: currentFiscalYear || {}
    //                 });

    //                 // Set dates based on fiscal year
    //                 if (currentFiscalYear?.startDate) {
    //                     setData(prev => ({
    //                         ...prev,
    //                         fromDate: dateFormat === 'Nepali'
    //                             ? new NepaliDate(currentFiscalYear.startDate).format('YYYY-MM-DD')
    //                             : new Date(currentFiscalYear.startDate).toISOString().split('T')[0],
    //                         toDate: dateFormat === 'Nepali' ? currentNepaliDate : currentEnglishDate,
    //                         company: companyData,
    //                         currentFiscalYear
    //                     }));
    //                 }
    //             }
    //         } catch (err) {
    //             console.error('Error fetching initial data:', err);
    //         }
    //     };

    //     fetchInitialData();
    // }, []);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                // Fetch sales entry data from ASP.NET endpoint
                const response = await api.get('/api/retailer/sales-register/entry-data');

                if (response.data.success) {
                    const data = response.data.data;

                    setCompany({
                        ...data.company,
                        dateFormat: data.company.dateFormat?.toLowerCase() || 'english',
                        vatEnabled: data.company.vatEnabled || true,
                        isVatExempt: data.company.isVatExempt || false
                    });

                    // Set fiscal year from response
                    const currentFiscalYear = data.currentFiscalYear;

                    // Determine date format
                    const isNepaliFormat = data.company.dateFormat?.toLowerCase() === 'nepali';

                    // Check if we have draft dates
                    const hasDraftDates = draftSave?.salesBillsData?.fromDate && draftSave?.salesBillsData?.toDate;

                    if (!hasDraftDates && currentFiscalYear) {
                        // Set default dates based on company date format
                        let fromDateFormatted = '';
                        let toDateFormatted = '';

                        if (isNepaliFormat) {
                            // Use Nepali date fields from fiscal year
                            fromDateFormatted = currentFiscalYear.startDateNepali || currentNepaliDate;
                            toDateFormatted = currentNepaliDate;
                        } else {
                            // Use English date fields from fiscal year
                            fromDateFormatted = currentFiscalYear.startDate
                                ? new Date(currentFiscalYear.startDate).toISOString().split('T')[0]
                                : currentEnglishDate;

                            toDateFormatted = currentFiscalYear.endDate
                                ? new Date(currentFiscalYear.endDate).toISOString().split('T')[0]
                                : currentEnglishDate;
                        }

                        setData(prev => ({
                            ...prev,
                            fromDate: fromDateFormatted,
                            toDate: toDateFormatted,
                            company: data.company,
                            currentFiscalYear,
                            currentCompanyName: data.company.name,
                            companyDateFormat: data.company.dateFormat,
                            vatEnabled: data.company.vatEnabled,
                            isVatExempt: data.company.isVatExempt || false,
                            isAdminOrSupervisor: data.isAdminOrSupervisor || false
                        }));
                    } else {
                        // If we have draft data, ensure company info is updated
                        setData(prev => ({
                            ...prev,
                            company: data.company,
                            currentFiscalYear,
                            currentCompanyName: data.company.name,
                            companyDateFormat: data.company.dateFormat,
                            vatEnabled: data.company.vatEnabled,
                            isVatExempt: data.company.isVatExempt || false,
                            isAdminOrSupervisor: data.isAdminOrSupervisor || false
                        }));
                    }
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
        };

        setDraftSave({
            ...draftSave,
            itemsLedgerData: draftData
        });
    }, [data, selectedItem, ledgerData, searchTerm, typeFilter]);

    const validateDate = (e) => {
        const { name, value } = e.target;
        const errorKey = `${name}Error`;

        if (!value.trim()) {
            setDateError(prev => ({ ...prev, [name]: 'Date is required' }));
            return false;
        }

        // Regex patterns for date validation
        const datePattern = /^\d{4}-\d{2}-\d{2}$/;

        let isValid = false;
        let errorMessage = '';

        if (company.dateFormat === 'nepali') {
            // Validate Nepali date
            if (!datePattern.test(value)) {
                errorMessage = 'Invalid Nepali date format. Use YYYY-MM-DD';
            } else {
                try {
                    const nepaliDate = new NepaliDate(value);
                    // Check if it's a valid Nepali date
                    const year = nepaliDate.getYear();
                    const month = nepaliDate.getMonth();
                    const day = nepaliDate.getDate();

                    if (year < 2000 || year > 2099 || month < 0 || month > 11 || day < 1 || day > 32) {
                        errorMessage = 'Invalid Nepali date';
                    } else {
                        isValid = true;
                    }
                } catch (err) {
                    errorMessage = 'Invalid Nepali date';
                }
            }
        } else {
            // Validate English date
            if (!datePattern.test(value)) {
                errorMessage = 'Invalid English date format. Use YYYY-MM-DD';
            } else {
                const date = new Date(value);
                if (isNaN(date.getTime())) {
                    errorMessage = 'Invalid English date';
                } else {
                    isValid = true;
                }
            }
        }

        if (!isValid) {
            // Auto-correct to current date
            const currentDate = company.dateFormat === 'nepali'
                ? new NepaliDate().format('YYYY-MM-DD')
                : new Date().toISOString().split('T')[0];

            setData(prev => ({ ...prev, [name]: currentDate }));
            setDateError(prev => ({
                ...prev,
                [name]: `${errorMessage}`
            }));

            // Show toast notification
            setTimeout(() => {
                alert(`Invalid ${name === 'fromDate' ? 'From' : 'To'} date. Auto-corrected to ${currentDate}`);
            }, 100);

            return false;
        }

        // Clear error if valid
        setDateError(prev => ({ ...prev, [name]: '' }));
        return true;
    };

    const fetchItemLedger = async () => {
        const fromDateValid = validateDateField('fromDate', data.fromDate);
        const toDateValid = validateDateField('toDate', data.toDate);

        if (!fromDateValid || !toDateValid) {
            setLoading(false);
            return;
        }
        if (!selectedItem || !data.fromDate || !data.toDate) return;

        try {
            setLoading(true);
            const response = await api.get(`/api/retailer/items-ledger/${selectedItem.id}`, {
                params: {
                    fromDate: data.fromDate,
                    toDate: data.toDate
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

    const validateDateField = (fieldName, value) => {
        if (!value.trim()) {
            setDateError(prev => ({ ...prev, [fieldName]: `${fieldName === 'fromDate' ? 'From' : 'To'} date is required` }));
            return false;
        }

        try {
            if (company.dateFormat === 'nepali') {
                const nepaliDate = new NepaliDate(value);
                const year = nepaliDate.getYear();
                if (year < 2000 || year > 2099) {
                    throw new Error('Invalid year');
                }
            } else {
                const date = new Date(value);
                if (isNaN(date.getTime())) {
                    throw new Error('Invalid date');
                }
            }
            setDateError(prev => ({ ...prev, [fieldName]: '' }));
            return true;
        } catch (err) {
            // Auto-correct to current date
            const currentDate = company.dateFormat === 'nepali'
                ? new NepaliDate().format('YYYY-MM-DD')
                : new Date().toISOString().split('T')[0];

            setData(prev => ({ ...prev, [fieldName]: currentDate }));
            setDateError(prev => ({
                ...prev,
                [fieldName]: `Invalid date. Auto-corrected to ${currentDate}`
            }));

            return false;
        }
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

    const handlePrint = (filtered = false) => {
        const entriesToPrint = filtered ? filteredEntries : ledgerData?.entries || [];

        if (entriesToPrint.length === 0) {
            alert("No data to print");
            return;
        }

        const printWindow = window.open("", "_blank");
        const printHeader = `
            <div class="print-header">
                <h1>${ledgerData?.currentCompanyName || 'Company Name'}</h1>
                <p>
                    ${ledgerData?.currentCompany?.address || ''}, ${ledgerData?.currentCompany?.city || ''},
                    Tel: ${ledgerData?.currentCompany?.phone || ''} | PAN: ${ledgerData?.currentCompany?.pan || ''}<br>
                </p>
                <hr>
            </div>
        `;

        let tableContent = `
        <style>
            @page {
                size: A4 landscape;
                margin: 10mm;
            }
            body { 
                font-family: 'Arial Narrow', Arial, sans-serif; 
                font-size: 9pt; 
                margin: 0;
                padding: 10mm;
            }
            table { 
                width: 100%; 
                border-collapse: collapse; 
                page-break-inside: auto;
            }
            tr { 
                page-break-inside: avoid; 
                page-break-after: auto; 
            }
            th, td { 
                border: 1px solid #000; 
                padding: 4px; 
                text-align: left; 
                white-space: nowrap;
            }
            th { 
                background-color: #f2f2f2 !important; 
                -webkit-print-color-adjust: exact; 
            }
            .print-header { 
                text-align: center; 
                margin-bottom: 15px; 
            }
            .nowrap {
                white-space: nowrap;
            }
            .type-Purc { color: #28a745; }
            .type-PrRt { color: #dc3545; }
            .type-Sale { color: #007bff; }
            .type-SlRt { color: #17a2b8; }
            .type-xcess { color: #28a745; }
            .type-short { color: #dc3545; }
        </style>
        ${printHeader}
        <h1 style="text-align:center;text-decoration:underline;">Item Ledger</h1>
        <h3 style="text-align:center;">${selectedItem?.name || ''}</h3>
        <p style="text-align:center;">Period: ${data.fromDate} to ${data.toDate}</p>
        <table>
            <thead>
                <tr>
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
                <td>${data.fromDate}</td>
                <td></td>
                <td>Opening</td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td class="text-right">${ledgerData?.purchasePrice ? ledgerData.purchasePrice.toFixed(2) : ''}</td>
                <td class="text-right">${ledgerData?.openingStock?.toFixed(2) || '0.00'}</td>
            </tr>
        `;

        entriesToPrint.forEach(entry => {
            tableContent += `
            <tr>
                <td class="nowrap">${new Date(entry.date).toLocaleDateString()}</td>
                <td class="nowrap">${entry.billNumber || ''}</td>
                <td class="nowrap">${entry.partyName}</td>
                <td class="nowrap type-${entry.typeDisplay}">${entry.typeDisplay || entry.type}</td>
                <td class="nowrap text-right">${entry.qtyIn ? entry.qtyIn.toFixed(2) : '-'}</td>
                <td class="nowrap text-right">${entry.qtyOut ? entry.qtyOut.toFixed(2) : '-'}</td>
                <td class="nowrap text-right">${entry.bonus ? entry.bonus.toFixed(2) : '0.00'}</td>
                <td class="nowrap">${entry.unit || ''}</td>
                <td class="nowrap text-right">${entry.price ? entry.price.toFixed(2) : ''}</td>
                <td class="nowrap text-right">${entry.balance?.toFixed(2)}</td>
            </tr>
            `;
        });

        // Add totals row
        tableContent += `
            <tr style="font-weight:bold; border-top: 2px solid #000; background-color:#f2f2f2;">
                <td colspan="4">Totals:</td>
                <td class="text-right">${totals.qtyIn.toFixed(2)}</td>
                <td class="text-right">${totals.qtyOut.toFixed(2)}</td>
                <td class="text-right">${totals.free.toFixed(2)}</td>
                <td></td>
                <td></td>
                <td class="text-right">${totals.balance.toFixed(2)}</td>
            </tr>
            </tbody>
        </table>
        `;

        printWindow.document.write(`
        <html>
            <head>
                <title>Item Ledger: ${selectedItem?.name || ''}</title>
            </head>
            <body>
                ${tableContent}
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                        }, 200);
                    };
                <\/script>
            </body>
        </html>
        `);
        printWindow.document.close();
    };

    // Get type display name for filter options - using actual TypeDisplay values from backend
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
            'Purc': 'Purchase',
            'PrRt': 'Purchase Return',
            'Sale': 'Sales',
            'SlRt': 'Sales Return',
            'xcess': 'Excess',
            'short': 'Short'
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

    const handleDateChange = (e) => {
        const { name, value } = e.target;

        // Basic format check (allow typing)
        const datePattern = /^\d{0,4}-?\d{0,2}-?\d{0,2}$/;

        if (!datePattern.test(value.replace(/-/g, ''))) {
            return; // Don't update if invalid pattern during typing
        }

        setData(prev => ({ ...prev, [name]: value }));

        // Clear error when user starts typing
        if (dateError[name]) {
            setDateError(prev => ({ ...prev, [name]: '' }));
        }
    };

    // Handle keyboard navigation in item modal
    const handleModalKeyDown = (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            setShowItemModal(false);
        }
    };

    const formatter = new Intl.NumberFormat('en-NP', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

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
                                fetchItemLedger();
                            }}
                            style={{
                                display: 'flex',
                                gap: '10px',
                                alignItems: 'flex-end',
                                flexWrap: 'wrap',
                                flex: '1'
                            }}
                        >
                            {/* From Date
                            <div className="filter-group" style={{ minWidth: '100px', maxWidth: '180px' }}>
                                <div className="position-relative">
                                    <input
                                        type="text"
                                        name="fromDate"
                                        id="fromDate"
                                        ref={fromDateRef}
                                        className={`form-control form-control-sm ${dateError.fromDate ? 'is-invalid' : ''}`}
                                        value={data.fromDate}
                                        onChange={handleDateChange}
                                        onBlur={validateDate}
                                        required
                                        autoComplete='off'
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleKeyDown(e, 'fromDate');
                                            }
                                        }}
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
                                        From Date
                                    </label>
                                    {dateError.fromDate && (
                                        <div className="invalid-feedback d-block" style={{ fontSize: '0.7rem' }}>
                                            {dateError.fromDate}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="filter-group" style={{ minWidth: '100px', maxWidth: '180px' }}>
                                <div className="position-relative">
                                    <input
                                        type="text"
                                        name="toDate"
                                        id="toDate"
                                        ref={toDateRef}
                                        className={`form-control form-control-sm ${dateError.toDate ? 'is-invalid' : ''}`}
                                        value={data.toDate}
                                        onChange={handleDateChange}
                                        onBlur={validateDate}
                                        required
                                        autoComplete='off'
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleKeyDown(e, 'toDate');
                                            }
                                        }}
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
                                        To Date
                                    </label>
                                    {dateError.toDate && (
                                        <div className="invalid-feedback d-block" style={{ fontSize: '0.7rem' }}>
                                            {dateError.toDate}
                                        </div>
                                    )}
                                </div>
                            </div> */}

                            {/* From Date */}
                            <div className="filter-group" style={{ minWidth: '100px', maxWidth: '180px' }}>
                                <div className="position-relative">
                                    <input
                                        type="text"
                                        name="fromDate"
                                        id="fromDate"
                                        ref={fromDateRef}
                                        className={`form-control form-control-sm no-date-icon ${dateError.fromDate ? 'is-invalid' : ''}`}
                                        value={data.fromDate}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            // Allow only numbers, / and - while typing
                                            const sanitizedValue = value.replace(/[^0-9/-]/g, '');
                                            if (sanitizedValue.length <= 10) {
                                                setData(prev => ({ ...prev, fromDate: sanitizedValue }));
                                                setDateError(prev => ({ ...prev, fromDate: '' }));
                                            }
                                        }}
                                        onKeyDown={(e) => {
                                            const allowedKeys = [
                                                'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
                                                'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
                                                'Home', 'End'
                                            ];

                                            if (!allowedKeys.includes(e.key) &&
                                                !/^\d$/.test(e.key) &&
                                                e.key !== '/' &&
                                                e.key !== '-' &&
                                                !e.ctrlKey && !e.metaKey) {
                                                e.preventDefault();
                                            }

                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                const dateStr = e.target.value.trim();

                                                if (!dateStr) {
                                                    // Auto-correct empty date to current date
                                                    const currentDate = company.dateFormat === 'nepali'
                                                        ? new NepaliDate().format('YYYY-MM-DD')
                                                        : new Date().toISOString().split('T')[0];

                                                    setData(prev => ({ ...prev, fromDate: currentDate }));
                                                    setDateError(prev => ({ ...prev, fromDate: '' }));

                                                    // Show notification
                                                    setNotification({
                                                        show: true,
                                                        message: 'Date required. Auto-corrected to current date.',
                                                        type: 'warning',
                                                        duration: 3000
                                                    });

                                                    // Move to next field
                                                    document.getElementById('toDate').focus();
                                                } else if (dateError.fromDate) {
                                                    e.target.focus();
                                                } else {
                                                    document.getElementById('toDate').focus();
                                                }
                                            }
                                        }}
                                        onBlur={(e) => {
                                            try {
                                                const dateStr = e.target.value.trim();
                                                if (!dateStr) {
                                                    setDateError(prev => ({ ...prev, fromDate: '' }));
                                                    return;
                                                }

                                                if (company.dateFormat === 'nepali') {
                                                    // Validate Nepali date
                                                    const nepaliDateFormat = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/;
                                                    if (!nepaliDateFormat.test(dateStr)) {
                                                        const currentDate = new NepaliDate().format('YYYY-MM-DD');
                                                        setData(prev => ({ ...prev, fromDate: currentDate }));
                                                        setNotification({
                                                            show: true,
                                                            message: 'Invalid date format. Auto-corrected to current date.',
                                                            type: 'warning',
                                                            duration: 3000
                                                        });
                                                        return;
                                                    }

                                                    // Normalize the date string (replace - with / for parsing)
                                                    const normalizedDateStr = dateStr.replace(/-/g, '/');
                                                    const [year, month, day] = normalizedDateStr.split('/').map(Number);

                                                    // Validate month and day ranges
                                                    if (month < 1 || month > 12) {
                                                        throw new Error("Month must be between 1-12");
                                                    }
                                                    if (day < 1 || day > 32) {
                                                        throw new Error("Day must be between 1-32");
                                                    }

                                                    // Create Nepali date object
                                                    const nepaliDate = new NepaliDate(year, month - 1, day);

                                                    // Verify the date is valid by checking if the parsed values match
                                                    if (
                                                        nepaliDate.getYear() !== year ||
                                                        nepaliDate.getMonth() + 1 !== month ||
                                                        nepaliDate.getDate() !== day
                                                    ) {
                                                        const currentDate = new NepaliDate().format('YYYY-MM-DD');
                                                        setData(prev => ({ ...prev, fromDate: currentDate }));
                                                        setNotification({
                                                            show: true,
                                                            message: 'Invalid Nepali date. Auto-corrected to current date.',
                                                            type: 'warning',
                                                            duration: 3000
                                                        });
                                                    } else {
                                                        // Format back to YYYY-MM-DD
                                                        setData(prev => ({
                                                            ...prev,
                                                            fromDate: nepaliDate.format('YYYY-MM-DD')
                                                        }));
                                                        setDateError(prev => ({ ...prev, fromDate: '' }));
                                                    }
                                                } else {
                                                    // Validate English date
                                                    const englishDateFormat = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/;
                                                    if (!englishDateFormat.test(dateStr)) {
                                                        const currentDate = new Date().toISOString().split('T')[0];
                                                        setData(prev => ({ ...prev, fromDate: currentDate }));
                                                        setNotification({
                                                            show: true,
                                                            message: 'Invalid date format. Auto-corrected to current date.',
                                                            type: 'warning',
                                                            duration: 3000
                                                        });
                                                        return;
                                                    }

                                                    const dateObj = new Date(dateStr);
                                                    if (isNaN(dateObj.getTime())) {
                                                        throw new Error("Invalid English date");
                                                    }

                                                    setData(prev => ({
                                                        ...prev,
                                                        fromDate: dateObj.toISOString().split('T')[0]
                                                    }));
                                                    setDateError(prev => ({ ...prev, fromDate: '' }));
                                                }
                                            } catch (error) {
                                                // Auto-correct to current date on any error
                                                const currentDate = company.dateFormat === 'nepali'
                                                    ? new NepaliDate().format('YYYY-MM-DD')
                                                    : new Date().toISOString().split('T')[0];

                                                setData(prev => ({ ...prev, fromDate: currentDate }));
                                                setDateError(prev => ({ ...prev, fromDate: '' }));

                                                setNotification({
                                                    show: true,
                                                    message: error.message
                                                        ? `${error.message}. Auto-corrected to current date.`
                                                        : 'Invalid date. Auto-corrected to current date.',
                                                    type: 'warning',
                                                    duration: 3000
                                                });
                                            }
                                        }}
                                        placeholder={company.dateFormat === 'nepali' ? "YYYY-MM-DD" : "YYYY-MM-DD"}
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

                            {/* To Date */}
                            <div className="filter-group" style={{ minWidth: '100px', maxWidth: '180px' }}>
                                <div className="position-relative">
                                    <input
                                        type="text"
                                        name="toDate"
                                        id="toDate"
                                        ref={toDateRef}
                                        className={`form-control form-control-sm no-date-icon ${dateError.toDate ? 'is-invalid' : ''}`}
                                        value={data.toDate}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            const sanitizedValue = value.replace(/[^0-9/-]/g, '');
                                            if (sanitizedValue.length <= 10) {
                                                setData(prev => ({ ...prev, toDate: sanitizedValue }));
                                                setDateError(prev => ({ ...prev, toDate: '' }));
                                            }
                                        }}
                                        onKeyDown={(e) => {
                                            const allowedKeys = [
                                                'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
                                                'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
                                                'Home', 'End'
                                            ];

                                            if (!allowedKeys.includes(e.key) &&
                                                !/^\d$/.test(e.key) &&
                                                e.key !== '/' &&
                                                e.key !== '-' &&
                                                !e.ctrlKey && !e.metaKey) {
                                                e.preventDefault();
                                            }

                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                const dateStr = e.target.value.trim();

                                                if (!dateStr) {
                                                    const currentDate = company.dateFormat === 'nepali'
                                                        ? new NepaliDate().format('YYYY-MM-DD')
                                                        : new Date().toISOString().split('T')[0];

                                                    setData(prev => ({ ...prev, toDate: currentDate }));
                                                    setDateError(prev => ({ ...prev, toDate: '' }));

                                                    setNotification({
                                                        show: true,
                                                        message: 'Date required. Auto-corrected to current date.',
                                                        type: 'warning',
                                                        duration: 3000
                                                    });

                                                    document.getElementById('generateReportButton').focus();
                                                } else if (dateError.toDate) {
                                                    e.target.focus();
                                                } else {
                                                    document.getElementById('generateReportButton').focus();
                                                }
                                            }
                                        }}
                                        onPaste={(e) => {
                                            e.preventDefault();
                                            const pastedData = e.clipboardData.getData('text');
                                            const cleanedData = pastedData.replace(/[^0-9/-]/g, '');
                                            const newValue = data.toDate + cleanedData;
                                            if (newValue.length <= 10) {
                                                setData(prev => ({ ...prev, toDate: newValue }));
                                            }
                                        }}
                                        onBlur={(e) => {
                                            try {
                                                const dateStr = e.target.value.trim();
                                                if (!dateStr) {
                                                    setDateError(prev => ({ ...prev, toDate: '' }));
                                                    return;
                                                }

                                                if (company.dateFormat === 'nepali') {
                                                    const nepaliDateFormat = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/;
                                                    if (!nepaliDateFormat.test(dateStr)) {
                                                        const currentDate = new NepaliDate().format('YYYY-MM-DD');
                                                        setData(prev => ({ ...prev, toDate: currentDate }));
                                                        setNotification({
                                                            show: true,
                                                            message: 'Invalid date format. Auto-corrected to current date.',
                                                            type: 'warning',
                                                            duration: 3000
                                                        });
                                                        return;
                                                    }

                                                    const normalizedDateStr = dateStr.replace(/-/g, '/');
                                                    const [year, month, day] = normalizedDateStr.split('/').map(Number);

                                                    if (month < 1 || month > 12) {
                                                        throw new Error("Month must be between 1-12");
                                                    }
                                                    if (day < 1 || day > 32) {
                                                        throw new Error("Day must be between 1-32");
                                                    }

                                                    const nepaliDate = new NepaliDate(year, month - 1, day);

                                                    if (
                                                        nepaliDate.getYear() !== year ||
                                                        nepaliDate.getMonth() + 1 !== month ||
                                                        nepaliDate.getDate() !== day
                                                    ) {
                                                        const currentDate = new NepaliDate().format('YYYY-MM-DD');
                                                        setData(prev => ({ ...prev, toDate: currentDate }));
                                                        setNotification({
                                                            show: true,
                                                            message: 'Invalid Nepali date. Auto-corrected to current date.',
                                                            type: 'warning',
                                                            duration: 3000
                                                        });
                                                    } else {
                                                        setData(prev => ({
                                                            ...prev,
                                                            toDate: nepaliDate.format('YYYY-MM-DD')
                                                        }));
                                                        setDateError(prev => ({ ...prev, toDate: '' }));
                                                    }
                                                } else {
                                                    const englishDateFormat = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/;
                                                    if (!englishDateFormat.test(dateStr)) {
                                                        const currentDate = new Date().toISOString().split('T')[0];
                                                        setData(prev => ({ ...prev, toDate: currentDate }));
                                                        setNotification({
                                                            show: true,
                                                            message: 'Invalid date format. Auto-corrected to current date.',
                                                            type: 'warning',
                                                            duration: 3000
                                                        });
                                                        return;
                                                    }

                                                    const dateObj = new Date(dateStr);
                                                    if (isNaN(dateObj.getTime())) {
                                                        throw new Error("Invalid English date");
                                                    }

                                                    setData(prev => ({
                                                        ...prev,
                                                        toDate: dateObj.toISOString().split('T')[0]
                                                    }));
                                                    setDateError(prev => ({ ...prev, toDate: '' }));
                                                }
                                            } catch (error) {
                                                const currentDate = company.dateFormat === 'nepali'
                                                    ? new NepaliDate().format('YYYY-MM-DD')
                                                    : new Date().toISOString().split('T')[0];

                                                setData(prev => ({ ...prev, toDate: currentDate }));
                                                setDateError(prev => ({ ...prev, toDate: '' }));

                                                setNotification({
                                                    show: true,
                                                    message: error.message
                                                        ? `${error.message}. Auto-corrected to current date.`
                                                        : 'Invalid date. Auto-corrected to current date.',
                                                    type: 'warning',
                                                    duration: 3000
                                                });
                                            }
                                        }}
                                        placeholder={company.dateFormat === 'nepali' ? "YYYY-MM-DD" : "YYYY-MM-DD"}
                                        required
                                        autoComplete='off'
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

                            {/* Generate Report Button */}
                            <div className="filter-group" style={{ minWidth: '100px' }}>
                                <Button
                                    variant="primary"
                                    type="submit"
                                    ref={generateReportButtonRef}
                                    id="generateReportButton"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            fetchItemLedger();
                                        }
                                    }}
                                    className="btn-sm"
                                    style={{
                                        height: '30px',
                                        padding: '0 15px',
                                        fontSize: '0.875rem',
                                        fontWeight: '500'
                                    }}
                                >
                                    View
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
                                            handleKeyDown(e, 'searchInput');
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
                                            handleKeyDown(e, 'typeFilter');
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
                                    onClick={() => handlePrint(false)}
                                    style={{
                                        height: '30px',
                                        padding: '0 12px',
                                        fontSize: '0.875rem',
                                        display: 'inline-flex',
                                        alignItems: 'center'
                                    }}
                                >
                                    <BiPrinter style={{ marginRight: '0.25rem' }} /> All
                                </button>
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
                                    <BiPrinter style={{ marginRight: '0.25rem' }} /> Filtered
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="table-container" style={{ height: '400px', overflowY: 'auto' }}>
                        <Table striped bordered hover className="ledger-table small-table" ref={tableRef} style={{ fontSize: '0.8rem', marginBottom: '0' }}>
                            <thead style={{ position: 'sticky', top: 0, backgroundColor: '#fff', zIndex: 1 }}>
                                <tr style={{ height: '30px' }}>
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
                                        <td colSpan="10" className="text-center py-3" style={{ fontSize: '0.85rem' }}>
                                            Loading...
                                        </td>
                                    </tr>
                                )}

                                {!loading && !ledgerData && (
                                    <tr>
                                        <td colSpan="10" className="text-center py-3 text-muted" style={{ fontSize: '0.85rem' }}>
                                            Please select an item and date range
                                        </td>
                                    </tr>
                                )}

                                {!loading && ledgerData && (
                                    <>
                                        <tr className="opening-row" style={{ height: '28px', backgroundColor: '#f8f9fa', fontWeight: 'bold' }}>
                                            <td style={{ padding: '4px 6px' }}>{data.fromDate}</td>
                                            <td style={{ padding: '4px 6px' }} colSpan="1"></td>
                                            <td style={{ padding: '4px 6px' }} colSpan="1">Opening</td>
                                            <td style={{ padding: '4px 6px' }} colSpan="1"></td>
                                            <td style={{ padding: '4px 6px' }} colSpan="1"></td>
                                            <td style={{ padding: '4px 6px' }} colSpan="1"></td>
                                            <td style={{ padding: '4px 6px' }} colSpan="1"></td>
                                            <td style={{ padding: '4px 6px' }} colSpan="1"></td>
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
                                                <td style={{ padding: '4px 6px', whiteSpace: 'nowrap' }}>
                                                    {company.dateFormat === 'Nepali' || company.dateFormat === 'nepali'
                                                        ? new NepaliDate(entry.nepaliDate).format('YYYY-MM-DD')
                                                        : new Date(entry.date).toLocaleDateString()}
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
                                        <td colSpan="4" style={{ padding: '4px 6px' }}>Totals:</td>
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
