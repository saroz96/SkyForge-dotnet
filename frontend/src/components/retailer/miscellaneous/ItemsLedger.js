import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import NepaliDate from 'nepali-date-converter';
import { Modal, Button, Form, Table, InputGroup, FormControl, Badge } from 'react-bootstrap';
import { BiBox, BiSearch, BiPrinter } from 'react-icons/bi';
import Header from '../Header';
import { usePageNotRefreshContext } from '../PageNotRefreshContext';
import '../../../stylesheet/retailer/Items/ItemsLedger.css';
import ProductModal from '../dashboard/modals/ProductModal';
import useDebounce from '../../../hooks/useDebounce';
import NewVirtualizedItemList from '../../NewVirtualizedItemList';

const ItemsLedger = () => {
    const navigate = useNavigate();
    const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
    const currentEnglishDate = new Date().toISOString().split('T')[0];
    const { draftSave, setDraftSave, clearDraft } = usePageNotRefreshContext();
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
            toDate: company.dateFormat === 'nepali' ? currentNepaliDate : currentEnglishDate
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

    const handleRowDoubleClick = (item) => {
        // Determine the route based on transaction type and payment mode
        let route = '';
        const billId = item.billId || item._id;
        const purchaseBillId = item.purchaseBillId || item._id;
        const purchaseReturnBillId = item.purchaseReturnBillId || item._id;

        switch (item.type?.toLowerCase()) {
            case 'sale':
                if (item.paymentMode === 'cash') {
                    route = `/retailer/cash-sales/edit/${billId}`;
                } else if (item.paymentMode === 'credit') {
                    route = `/retailer/credit-sales/edit/${billId}`;
                }
                break;
            case 'purc':
                route = `/retailer/purchase/edit/${purchaseBillId}`;
                break;

            case 'prrt':
                route = `/retailer/purchase-return/edit/${purchaseReturnBillId}`;
                break;
            default:
                console.log('No edit route for transaction type:', item.type);
                return;
        }

        if (route) {
            navigate(route);
        }
    };

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const response = await api.get('/api/my-company');
                if (response.data.success) {
                    const { company: companyData, currentFiscalYear } = response.data;

                    // Set company info
                    const dateFormat = companyData.dateFormat || 'english';
                    setCompany({
                        dateFormat,
                        isVatExempt: companyData.isVatExempt || false,
                        vatEnabled: companyData.vatEnabled !== false, // default true
                        fiscalYear: currentFiscalYear || {}
                    });

                    // Set dates based on fiscal year
                    if (currentFiscalYear?.startDate) {
                        setData(prev => ({
                            ...prev,
                            fromDate: dateFormat === 'nepali'
                                ? new NepaliDate(currentFiscalYear.startDate).format('YYYY-MM-DD')
                                : new NepaliDate(currentFiscalYear.startDate).format('YYYY-MM-DD'),
                            toDate: dateFormat === 'nepali' ? currentNepaliDate : currentEnglishDate,
                            company: companyData,
                            currentFiscalYear
                        }));
                    }
                }
            } catch (err) {
                console.error('Error fetching initial data:', err);
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
                    // limit: searchTerm.trim() ? 15 : 25,
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

    // Load more items for infinite scrolling
    // const loadMoreSearchItems = () => {
    //     if (!isSearching) {
    //         fetchItemsFromBackend(itemSearchQuery, searchPage + 1);
    //     }
    // };

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
        const nepaliDatePattern = /^\d{4}-\d{2}-\d{2}$/;
        const englishDatePattern = /^\d{4}-\d{2}-\d{2}$/;

        let isValid = false;
        let errorMessage = '';

        if (company.dateFormat === 'nepali') {
            // Validate Nepali date
            if (!nepaliDatePattern.test(value)) {
                // errorMessage = 'Invalid Nepali date format. Use YYYY-MM-DD';
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
            if (!englishDatePattern.test(value)) {
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
            id: item._id,
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
                <h1>${ledgerData.currentCompanyName || 'Company Name'}</h1>
                <p>
                    ${ledgerData.currentCompany?.address || ''}-${ledgerData.currentCompany?.ward || ''}, ${ledgerData.currentCompany?.city || ''},
                    TPIN: ${ledgerData.currentCompany?.pan || ''}<br>
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
                font-family: Arial, sans-serif; 
                font-size: 10px; 
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
        </style>
        ${printHeader}
        <h1 style="text-align:center;text-decoration:underline;">Items Ledger: ${selectedItem?.name || ''}</h1>
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
            <tr className="opening-row">
                <td><strong>${data.fromDate}</strong></td>
                <td colSpan="1"><strong></strong></td>
                <td colSpan="1"><strong>Opening</strong></td>
                <td colSpan="5"><strong></strong></td>
                <td><strong>${ledgerData?.purchasePrice || ''}</strong></td>
                <td><strong>${ledgerData?.openingStock?.toFixed(2) || '0.00'}</strong></td>
            </tr>
        `;

        let runningBalance = ledgerData?.openingStock || 0;

        entriesToPrint.forEach(entry => {
            tableContent += `
            <tr>
                <td class="nowrap">${new Date(entry.date).toLocaleDateString()}</td>
                <td class="nowrap">${entry.billNumber || ''}</td>
                <td class="nowrap">${entry.partyName}</td>
                <td class="nowrap">${entry.type}</td>
                <td class="nowrap">${entry.qtyIn || '-'}</td>
                <td class="nowrap">${entry.qtyOut || '-'}</td>
                <td class="nowrap">${entry.bonus || 0}</td>
                <td class="nowrap">${entry.unit || ''}</td>
                <td class="nowrap">${Math.round(entry.price || '') * 100 / 100}</td>
                <td class="nowrap">${entry.balance?.toFixed(2)}</td>
            </tr>
            `;
        });

        // Add totals row
        tableContent += `
            <tr style="font-weight:bold; border-top: 2px solid #000;">
                <td colspan="4">Totals:</td>
                <td>${totals.qtyIn.toFixed(2)}</td>
                <td>${totals.qtyOut.toFixed(2)}</td>
                <td>${totals.free.toFixed(2)}</td>
                <td></td>
                <td></td>
                <td>${totals.balance.toFixed(2)}</td>
            </tr>
            </tbody>
        </table>
        `;

        printWindow.document.write(`
        <html>
            <head>
                <title>Items Ledger: ${selectedItem?.name || ''}</title>
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

    // Filter ledger entries
    const filteredEntries = ledgerData?.entries?.filter(entry => {
        const matchesSearch = entry.partyName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = !typeFilter || entry.type.toLowerCase() === typeFilter.toLowerCase();
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
                        {selectedItem ? `Items Ledger: ${selectedItem.name}` : 'Items Ledger'}
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
                            {/* From Date */}
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

                            {/* To Date */}
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
                                    id="adjustmentTypeFilter"
                                    value={typeFilter}
                                    onChange={(e) => setTypeFilter(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleKeyDown(e, 'adjustmentTypeFilter');
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
                                    <option value="">All</option>
                                    <option value="xcess">Xcess</option>
                                    <option value="short">Short</option>
                                    <option value="Sale">Sales</option>
                                    <option value="SlRt">Sales Return</option>
                                    <option value="Purc">Purchase</option>
                                    <option value="PrRt">Purchase Return</option>
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

                    <div className="table-container" style={{ height: '400px' }}>
                        <Table striped bordered hover className="ledger-table small-table" ref={tableRef} style={{ fontSize: '0.8rem', marginBottom: '0' }}>
                            <thead>
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
                                        <tr className="opening-row" style={{ height: '28px' }}>
                                            <td style={{ padding: '4px 6px' }}><strong>{data.fromDate}</strong></td>
                                            <td style={{ padding: '4px 6px' }} colSpan="1"><strong></strong></td>
                                            <td style={{ padding: '4px 6px' }} colSpan="1"><strong>Opening</strong></td>
                                            <td style={{ padding: '4px 6px' }} colSpan="5"><strong></strong></td>
                                            <td style={{ padding: '4px 6px' }}><strong>{ledgerData?.purchasePrice || ''}</strong></td>
                                            <td style={{ padding: '4px 6px' }}><strong>{ledgerData?.openingStock?.toFixed(2) || '0.00'}</strong></td>
                                        </tr>

                                        {filteredEntries.map((entry, index) => (
                                            <tr
                                                key={index}
                                                className={`searchClass`}
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
                                                    cursor: 'pointer'
                                                }}
                                                title="Double-click to edit"
                                            >
                                                <td style={{ padding: '4px 6px', whiteSpace: 'nowrap' }}>{new NepaliDate(entry.date).format('YYYY-MM-DD')}</td>
                                                <td style={{ padding: '4px 6px', whiteSpace: 'nowrap' }}>{entry.billNumber || ''}</td>
                                                <td style={{ padding: '4px 6px', whiteSpace: 'nowrap' }}>{entry.partyName}</td>
                                                <td style={{ padding: '4px 6px', whiteSpace: 'nowrap' }} className={`type-${entry.type}`}>{entry.type}</td>
                                                <td style={{ padding: '4px 6px', textAlign: 'right', whiteSpace: 'nowrap' }}>{entry.qtyIn || '-'}</td>
                                                <td style={{ padding: '4px 6px', textAlign: 'right', whiteSpace: 'nowrap' }}>{entry.qtyOut || '-'}</td>
                                                <td style={{ padding: '4px 6px', textAlign: 'right', whiteSpace: 'nowrap' }}>{entry.bonus || 0}</td>
                                                <td style={{ padding: '4px 6px', whiteSpace: 'nowrap' }}>{entry.unit || ''}</td>
                                                <td style={{ padding: '4px 6px', textAlign: 'right', whiteSpace: 'nowrap' }}>{formatter.format(entry.price || '')}</td>
                                                <td style={{ padding: '4px 6px', textAlign: 'right', whiteSpace: 'nowrap' }}>{entry.balance?.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </>
                                )}
                            </tbody>

                            {ledgerData && filteredEntries.length > 0 && (
                                <tfoot>
                                    <tr className="bg-light" style={{ height: '28px' }}>
                                        <td colSpan="4" style={{ padding: '4px 6px' }}><strong>Totals:</strong></td>
                                        <td style={{ padding: '4px 6px', textAlign: 'right' }}><strong>{totals.qtyIn.toFixed(2)}</strong></td>
                                        <td style={{ padding: '4px 6px', textAlign: 'right' }}><strong>{totals.qtyOut.toFixed(2)}</strong></td>
                                        <td style={{ padding: '4px 6px', textAlign: 'right' }}><strong>{totals.free.toFixed(2)}</strong></td>
                                        <td style={{ padding: '4px 6px' }}></td>
                                        <td style={{ padding: '4px 6px' }}></td>
                                        <td style={{ padding: '4px 6px', textAlign: 'right' }}><strong>{totals.balance.toFixed(2)}</strong></td>
                                    </tr>
                                </tfoot>
                            )}
                        </Table>
                    </div>
                </div>
            </div>

            {/* Item Selection Modal */}
            {showItemModal && (
                <div className="modal fade show" id="itemModal" tabIndex="-1" style={{ display: 'block' }}>
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
                                    placeholder="Search Item..."
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
                                            // Focus on first item in the list
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
                                            <NewVirtualizedItemList
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
                                        {/* {itemSearchQuery.trim() && searchResults.length >= 15 && ' (Showing first 15 matches)'} */}
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
