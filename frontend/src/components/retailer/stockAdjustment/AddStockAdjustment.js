
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import NepaliDate from 'nepali-date-converter';
import axios from 'axios';
import Header from '../Header';
import NotificationToast from '../../NotificationToast';
import '../../../stylesheet/noDateIcon.css';
import VirtualizedItemListForPurchase from '../../VirtualizedItemListForPurchase';
import useDebounce from '../../../hooks/useDebounce';
import ProductModal from '../dashboard/modals/ProductModal';

const AddStockAdjustment = () => {
    const navigate = useNavigate();
    const transactionDateRef = useRef(null);
    const nepaliDateRef = useRef(null);
    const marginPercentageRef = useRef(null);
    const [showProductModal, setShowProductModal] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isInitialDataLoaded, setIsInitialDataLoaded] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
    const [useVoucherLastDateForStockAdjustment, setUseVoucherLastDateForStockAdjustment] = useState(false);
    const [lastStockAdjustmentDate, setLastStockAdjustmentDate] = useState(null);
    const [notification, setNotification] = useState({
        show: false,
        message: '',
        type: 'success'
    });
    const [dateErrors, setDateErrors] = useState({
        nepaliDate: '',
        billDate: ''
    });
    const [printAfterSave, setPrintAfterSave] = useState(
        localStorage.getItem('printAfterSaveStockAdjustment') === 'true' || false
    );
    const [searchQuery, setSearchQuery] = useState('');
    const [lastSearchQuery, setLastSearchQuery] = useState('');
    const [shouldShowLastSearchResults, setShouldShowLastSearchResults] = useState(false);
    const debouncedSearchQuery = useDebounce(searchQuery, 50);

    const [selectedItemReason, setSelectedItemReason] = useState('');
    const [headerReasonSearchQuery, setHeaderReasonSearchQuery] = useState('');
    const [showReasonModal, setShowReasonModal] = useState(false);
    const [reasonSearchResults, setReasonSearchResults] = useState([]);
    const [showReasonDropdown, setShowReasonDropdown] = useState(false);
    const [activeReasonIndex, setActiveReasonIndex] = useState(-1); // For tracking which row's dropdown is open
    const reasonDropdownRef = useRef(null);
    // Item search states
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [searchPage, setSearchPage] = useState(1);
    const [hasMoreSearchResults, setHasMoreSearchResults] = useState(false);
    const [totalSearchItems, setTotalSearchItems] = useState(0);

    const [formData, setFormData] = useState({
        adjustmentType: 'xcess',
        nepaliDate: currentNepaliDate,
        billDate: new Date().toISOString().split('T')[0],
        billNumber: '',
        isVatExempt: 'all',
        note: '',
        vatPercentage: 13,
        items: []
    });

    const [items, setItems] = useState([]);
    const [company, setCompany] = useState({
        dateFormat: 'english',
        vatEnabled: true,
        fiscalYear: {}
    });
    const [nextBillNumber, setNextBillNumber] = useState('');
    const [showItemDropdown, setShowItemDropdown] = useState(false);
    const itemDropdownRef = useRef(null);
    const itemSearchRef = useRef(null);

    // Modals state
    const [showSalesPriceModal, setShowSalesPriceModal] = useState(false);
    const [showBatchModal, setShowBatchModal] = useState(false);
    const [selectedItemIndex, setSelectedItemIndex] = useState(-1);
    const [selectedItemForBatch, setSelectedItemForBatch] = useState(null);
    const [salesPriceData, setSalesPriceData] = useState({
        puPrice: 0,
        marginPercentage: 0,
        currency: 'NPR',
        mrp: 0,
        salesPrice: 0
    });

    // For header insert functionality
    const itemsTableRef = useRef(null);
    const [selectedItemForInsert, setSelectedItemForInsert] = useState(null);
    const [selectedItemQuantity, setSelectedItemQuantity] = useState(0);
    const [selectedItemRate, setSelectedItemRate] = useState(0);
    const [selectedItemBatchNumber, setSelectedItemBatchNumber] = useState('');
    const [selectedItemExpiryDate, setSelectedItemExpiryDate] = useState('');
    const [showHeaderItemModal, setShowHeaderItemModal] = useState(false);
    const [headerSearchQuery, setHeaderSearchQuery] = useState('');
    const [headerLastSearchQuery, setHeaderLastSearchQuery] = useState('');
    const [headerShouldShowLastSearchResults, setHeaderShouldShowLastSearchResults] = useState(false);
    const [headerSearchResults, setHeaderSearchResults] = useState([]);
    const [headerSearchPage, setHeaderSearchPage] = useState(1);
    const [hasMoreHeaderSearchResults, setHasMoreHeaderSearchResults] = useState(false);
    const [totalHeaderSearchItems, setTotalHeaderSearchItems] = useState(0);
    const [isHeaderSearching, setIsHeaderSearching] = useState(false);
    const debouncedHeaderSearchQuery = useDebounce(headerSearchQuery, 50);

    // Create axios instance with auth interceptor
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

    // Function to get current bill number (does NOT increment)
    const getCurrentBillNumber = async () => {
        try {
            const response = await api.get('/api/retailer/stock-adjustments/current-number');
            return response.data.data.currentStockAdjustmentBillNumber;
        } catch (error) {
            console.error('Error getting current bill number:', error);
            return null;
        }
    };

    useEffect(() => {
        return () => {
            setLastSearchQuery('');
            setShouldShowLastSearchResults(false);
            setHeaderLastSearchQuery('');
            setHeaderShouldShowLastSearchResults(false);
        };
    }, []);

    // Fetch date preference setting from backend for Stock Adjustment
    const fetchDatePreference = async () => {
        try {
            console.log('=== fetchDatePreferenceForStockAdjustment CALLED ===');
            const response = await api.get('/api/retailer/date-preference/stock-adjustment');
            console.log('Date preference response:', response.data);

            if (response.data.success) {
                const useVoucherDate = response.data.data.useVoucherLastDate;
                console.log('useVoucherLastDateForStockAdjustment value from API:', useVoucherDate);
                setUseVoucherLastDateForStockAdjustment(useVoucherDate);
                return useVoucherDate;
            }
            return false;
        } catch (error) {
            console.error('Error fetching date preference:', error);
            return false;
        }
    };

    // Fetch last stock adjustment date from backend
    const fetchLastStockAdjustmentDate = async () => {
        try {
            console.log('=== fetchLastStockAdjustmentDate CALLED ===');

            // Use the endpoint: /api/retailer/last-stock-adjustment-date
            const response = await api.get('/api/retailer/last-stock-adjustment-date');
            console.log('Last stock adjustment date response:', response.data);

            if (response.data.success && response.data.data) {
                const data = response.data.data;
                const isNepaliFormat = company.dateFormat === 'nepali' || company.dateFormat === 'Nepali';

                // Get the appropriate date based on company format
                let lastDate = null;
                if (isNepaliFormat) {
                    // Use Nepali date field from response
                    lastDate = data.nepaliDate;
                    console.log('Using Nepali date field:', lastDate);
                } else {
                    // Use English date field from response
                    lastDate = data.date;
                    console.log('Using English date field:', lastDate);
                }

                if (lastDate) {
                    // Format the date (it should already be in YYYY-MM-DD format from backend)
                    let formattedDate = lastDate;
                    if (typeof lastDate === 'string' && lastDate.includes('T')) {
                        formattedDate = lastDate.split('T')[0];
                    }
                    console.log('Formatted last stock adjustment date:', formattedDate);
                    setLastStockAdjustmentDate(formattedDate);
                    return formattedDate;
                }
            }

            console.log('No last stock adjustment date found - returning null');
            return null;
        } catch (error) {
            console.error('Error fetching last stock adjustment date:', error);
            return null;
        }
    };

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                setIsLoading(true);

                // Fetch stock adjustment initial data (company, categories, etc.)
                const companyResponse = await api.get('/api/retailer/stock-adjustments');
                const { data } = companyResponse.data;

                // Set company settings FIRST (needed for date format)
                const isNepaliFormat = data.company?.dateFormat === 'nepali' ||
                    data.company?.dateFormat === 'Nepali';

                setCompany({
                    ...data.company,
                    dateFormat: data.company?.dateFormat || 'english',
                    vatEnabled: data.company?.vatEnabled || true
                });

                // Fetch date preference (useVoucherLastDate setting from backend)
                const useVoucherDate = await fetchDatePreference();

                // Fetch last stock adjustment date if needed
                let lastDate = null;
                if (useVoucherDate) {
                    lastDate = await fetchLastStockAdjustmentDate();
                }

                let transactionDate = '';
                let invoiceDate = '';

                console.log('Setting dates - useVoucherDate:', useVoucherDate, 'lastDate:', lastDate);

                // Set dates based on preference
                if (useVoucherDate && lastDate) {
                    // Use last voucher date
                    if (isNepaliFormat) {
                        transactionDate = lastDate;
                        invoiceDate = lastDate;
                    } else {
                        transactionDate = lastDate;
                        invoiceDate = lastDate;
                    }
                    console.log('Using LAST VOUCHER date:', { transactionDate, invoiceDate });
                } else {
                    // Use current system date
                    if (isNepaliFormat) {
                        transactionDate = currentNepaliDate;
                        invoiceDate = currentNepaliDate;
                    } else {
                        const today = new Date().toISOString().split('T')[0];
                        transactionDate = today;
                        invoiceDate = today;
                    }
                    console.log('Using SYSTEM date:', { transactionDate, invoiceDate });
                }

                // Fetch next bill number separately
                const currentBillNum = await getCurrentBillNumber();

                // Set form data with the determined dates
                setFormData(prev => ({
                    ...prev,
                    billNumber: currentBillNum,
                    nepaliDate: isNepaliFormat ? transactionDate : '',
                    billDate: !isNepaliFormat ? invoiceDate : ''
                }));

                setNextBillNumber(currentBillNum);
                setIsInitialDataLoaded(true);
            } catch (error) {
                console.error('Error fetching initial data:', error);
                setNotification({
                    show: true,
                    message: 'Error loading stock adjustment data',
                    type: 'error'
                });
            } finally {
                setIsLoading(false);
            }
        };
        fetchInitialData();
    }, []);

    // useEffect(() => {
    //     const fetchInitialData = async () => {
    //         try {
    //             setIsLoading(true);

    //             // Fetch stock adjustment initial data (company, categories, etc.)
    //             const companyResponse = await api.get('/api/retailer/stock-adjustments');
    //             const { data } = companyResponse.data;

    //             // Fetch next bill number separately
    //             const currentBillNum = await getCurrentBillNumber();

    //             setCompany(data.company || {});

    //             // Use the bill number from the separate endpoint
    //             setNextBillNumber(currentBillNum);

    //             setFormData(prev => ({
    //                 ...prev,
    //                 billNumber: currentBillNum
    //             }));

    //             setIsInitialDataLoaded(true);
    //         } catch (error) {
    //             console.error('Error fetching initial data:', error);
    //             setNotification({
    //                 show: true,
    //                 message: 'Error loading stock adjustment data',
    //                 type: 'error'
    //             });
    //         } finally {
    //             setIsLoading(false);
    //         }
    //     };
    //     fetchInitialData();
    // }, []);

    useEffect(() => {
        if (isInitialDataLoaded && transactionDateRef.current) {
            const timer = setTimeout(() => {
                transactionDateRef.current.focus();
            }, 50);

            return () => clearTimeout(timer);
        }
    }, [isInitialDataLoaded, company.dateFormat]);

    useEffect(() => {
        calculateTotal();
    }, [items, formData]);

    useEffect(() => {
        const handleF9KeyDown = (e) => {
            if (e.key === 'F9') {
                e.preventDefault();
                setShowProductModal(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleF9KeyDown);
        return () => {
            window.removeEventListener('keydown', handleF9KeyDown);
        };
    }, []);

    useEffect(() => {
        if (showItemDropdown) {
            setSearchPage(1);
            fetchItemsFromBackend(debouncedSearchQuery, 1, false);
        }
    }, [debouncedSearchQuery, formData.isVatExempt, showItemDropdown]);

    useEffect(() => {
        if (showHeaderItemModal) {
            setHeaderSearchPage(1);
            let searchTerm = '';

            if (headerSearchQuery.trim() !== '') {
                searchTerm = headerSearchQuery;
            } else if (headerShouldShowLastSearchResults && headerLastSearchQuery.trim() !== '') {
                searchTerm = headerLastSearchQuery;
            }

            fetchItemsFromBackend(searchTerm, 1, true);
        }
    }, [debouncedHeaderSearchQuery, formData.isVatExempt, showHeaderItemModal, headerShouldShowLastSearchResults, headerLastSearchQuery]);

    const fetchItemsFromBackend = async (searchTerm = '', page = 1, isHeaderModal = false) => {
        try {
            if (isHeaderModal) {
                setIsHeaderSearching(true);
            } else {
                setIsSearching(true);
            }

            const response = await api.get('/api/retailer/items/search', {
                params: {
                    search: searchTerm,
                    page: page,
                    limit: searchTerm.trim() ? 15 : 25,
                    vatStatus: formData.isVatExempt,
                    sortBy: searchTerm.trim() ? 'relevance' : 'name'
                }
            });

            if (response.data.success) {
                const itemsWithPrices = response.data.items.map(item => {
                    let latestPrice = 0;
                    let latestBatchNumber = '';
                    let latestExpiryDate = '';

                    if (item.stockEntries && item.stockEntries.length > 0) {
                        const sortedEntries = item.stockEntries.sort((a, b) =>
                            new Date(b.date) - new Date(a.date)
                        );
                        latestPrice = sortedEntries[0].puPrice || 0;
                        latestBatchNumber = sortedEntries[0].batchNumber || '';
                        latestExpiryDate = sortedEntries[0].expiryDate || '';
                    }

                    return {
                        ...item,
                        id: item.id,
                        _id: item.id,
                        latestPrice,
                        latestBatchNumber,
                        latestExpiryDate,
                        stock: item.currentStock || 0
                    };
                });

                if (isHeaderModal) {
                    if (page === 1) {
                        setHeaderSearchResults(itemsWithPrices);
                    } else {
                        setHeaderSearchResults(prev => [...prev, ...itemsWithPrices]);
                    }
                    setHasMoreHeaderSearchResults(response.data.pagination.hasNextPage);
                    setTotalHeaderSearchItems(response.data.pagination.totalItems);
                    setHeaderSearchPage(page);
                } else {
                    if (page === 1) {
                        setSearchResults(itemsWithPrices);
                    } else {
                        setSearchResults(prev => [...prev, ...itemsWithPrices]);
                    }
                    setHasMoreSearchResults(response.data.pagination.hasNextPage);
                    setTotalSearchItems(response.data.pagination.totalItems);
                    setSearchPage(page);
                }
            }
        } catch (error) {
            console.error('Error fetching items:', error);
            setNotification({
                show: true,
                message: 'Error loading items',
                type: 'error'
            });
        } finally {
            if (isHeaderModal) {
                setIsHeaderSearching(false);
            } else {
                setIsSearching(false);
            }
        }
    };

    const handleItemSearch = (e) => {
        const query = e.target.value;
        setSearchQuery(query);
        setShowItemDropdown(true);
    };

    const handleHeaderItemSearch = (e) => {
        const query = e.target.value;
        setHeaderSearchQuery(query);

        if (query.trim() !== '' && headerShouldShowLastSearchResults) {
            setHeaderShouldShowLastSearchResults(false);
            setHeaderLastSearchQuery('');
        }
    };

    const handleSearchFocus = () => {
        setShowItemDropdown(true);

        if (lastSearchQuery && !searchQuery) {
            setShouldShowLastSearchResults(true);
        }

        document.querySelectorAll('.dropdown-item').forEach(item => {
            item.classList.remove('active');
        });

        scrollToItemsTable();
    };

    const handleHeaderSearchFocus = () => {
        if (headerLastSearchQuery && !headerSearchQuery) {
            setHeaderShouldShowLastSearchResults(true);
            if (headerLastSearchQuery.trim() !== '') {
                fetchItemsFromBackend(headerLastSearchQuery, 1, true);
            }
        }
    };

    const handleHeaderItemModalClose = () => {
        setShowHeaderItemModal(false);
        if (!headerShouldShowLastSearchResults) {
            setHeaderSearchQuery('');
            setHeaderLastSearchQuery('');
        }
        setHeaderSearchResults([]);
        setHeaderSearchPage(1);
    };

    const showBatchModalForItem = (item) => {
        // Only show batch modal for "short" adjustment type
        if (formData.adjustmentType === 'short') {
            setSelectedItemForBatch(item);
            setShowBatchModal(true);

            setTimeout(() => {
                const firstBatchRow = document.querySelector('.batch-row');
                if (firstBatchRow) {
                    firstBatchRow.classList.add('bg-primary', 'text-white');
                    firstBatchRow.focus();
                }
            }, 100);
        } else {
            // For "xcess" type, add item directly without showing batch modal
            addItemToBill(item);
        }
    };

    const formatDateForInput = (date) => {
        if (!date) return '';

        if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return date;
        }

        try {
            const d = new Date(date);
            if (isNaN(d.getTime())) return '';

            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');

            return `${year}-${month}-${day}`;
        } catch (error) {
            console.error('Error formatting date:', error);
            return '';
        }
    };

    const addItemToBill = async (item, batchInfo = null) => {
        if (itemSearchRef.current?.value) {
            setLastSearchQuery(itemSearchRef.current.value);
            setShouldShowLastSearchResults(true);
        }

        let newItem;

        if (formData.adjustmentType === 'xcess') {
            // For xcess type, create a new item with default values
            newItem = {
                itemId: item.id,
                uniqueNumber: item.uniqueNumber || 'N/A',
                hscode: item.hscode,
                name: item.name,
                category: item.category?.name || 'No Category',
                batchNumber: 'XXX',
                expiryDate: getDefaultExpiryDate(),
                quantity: 0,
                unitId: item.unit?.id || item.unitId,
                unitName: item.unit?.name || item.unitName,
                puPrice: item.latestPrice || 0,
                price: item.latestPrice || 0, // Default price same as puPrice
                mrp: 0,
                amount: 0,
                vatStatus: item.vatStatus,
                reason: '',
                uniqueUuid: ''
            };
        } else {
            // For short type, use the batch info
            newItem = {
                itemId: item.id,
                uniqueNumber: item.uniqueNumber || 'N/A',
                hscode: item.hscode,
                name: item.name,
                category: item.category?.name || 'No Category',
                batchNumber: batchInfo.batchNumber || '',
                expiryDate: batchInfo.expiryDate ? formatDateForInput(batchInfo.expiryDate) : '',
                quantity: 0,
                unitId: item.unit?.id,
                unitName: item.unit?.name,
                puPrice: batchInfo.puPrice || 0,
                price: batchInfo.price || 0,
                mrp: batchInfo.mrp || 0,
                amount: 0,
                vatStatus: item.vatStatus,
                reason: '',
                uniqueUuid: batchInfo.uniqueUuid || ''
            };
        }

        const updatedItems = [...items, newItem];
        setItems(updatedItems);
        setShowItemDropdown(false);

        if (itemSearchRef.current) {
            itemSearchRef.current.value = '';
        }

        setSearchQuery('');

        setTimeout(() => {
            if (itemsTableRef.current) {
                itemsTableRef.current.scrollTop = itemsTableRef.current.scrollHeight;
            }
        }, 50);

        setTimeout(() => {
            const newItemIndex = updatedItems.length - 1;
            const batchNumberInput = document.getElementById(`batchNumber-${newItemIndex}`);
            if (batchNumberInput) {
                batchNumberInput.focus();
                batchNumberInput.select();
            }
        }, 100);
    };

    const getDefaultExpiryDate = () => {
        const today = new Date();
        today.setFullYear(today.getFullYear() + 2);
        return today.toISOString().split('T')[0];
    };

    const selectItemForInsert = async (item) => {
        if (headerSearchQuery.trim() !== '') {
            setHeaderLastSearchQuery(headerSearchQuery);
            setHeaderShouldShowLastSearchResults(true);
        } else if (headerShouldShowLastSearchResults && headerLastSearchQuery) {
            setHeaderShouldShowLastSearchResults(true);
        }
        setHeaderSearchQuery('');

        setShowHeaderItemModal(false);
        setSelectedItemForInsert(item);

        // Reset all input fields EXCEPT don't reset rate if user has already changed it
        setSelectedItemBatchNumber('');
        setSelectedItemExpiryDate('');
        setSelectedItemQuantity(0);
        // Only set rate to latest price if it hasn't been manually changed
        if (selectedItemRate === 0) {
            setSelectedItemRate(item.latestPrice || 0);
        }

        if (formData.adjustmentType === 'short') {
            // For short type, show batch modal
            setTimeout(() => {
                showBatchModalForItem(item);
            }, 100);
        } else {
            // For xcess type, set default values and focus on batch input
            setSelectedItemBatchNumber('XXX');
            setSelectedItemExpiryDate(getDefaultExpiryDate());
            // Use the already set selectedItemRate (could be user-modified)

            setTimeout(() => {
                const batchInput = document.getElementById('selectedItemBatch');
                if (batchInput) {
                    batchInput.focus();
                    batchInput.select();
                }
            }, 100);
        }
    };

    const handleBatchRowClick = async (batchInfo) => {
        if (!selectedItemForBatch) return;

        const isHeaderInsert = selectedItemForBatch === selectedItemForInsert;

        if (isHeaderInsert) {
            // Store batch info for later use
            setSelectedItemForInsert({
                ...selectedItemForInsert,
                batchInfo: {
                    batchNumber: batchInfo.batchNumber,
                    expiryDate: batchInfo.expiryDate,
                    price: batchInfo.price,
                    uniqueUuid: batchInfo.uniqueUuid,
                    puPrice: batchInfo.puPrice
                }
            });

            // Set the separate state variables for inputs
            setSelectedItemBatchNumber(batchInfo.batchNumber || '');
            setSelectedItemExpiryDate(batchInfo.expiryDate ? formatDateForInput(batchInfo.expiryDate) : '');
            // Don't override user's manually entered rate - only set if rate is 0
            if (selectedItemRate === 0) {
                setSelectedItemRate(batchInfo.puPrice || 0);
            }

            setShowBatchModal(false);
            setSelectedItemForBatch(null);

            setTimeout(() => {
                const batchInput = document.getElementById('selectedItemBatch');
                if (batchInput) {
                    batchInput.focus();
                    batchInput.select();
                }
            }, 100);
        } else {
            // For regular item addition
            addItemToBill(selectedItemForBatch, {
                batchNumber: batchInfo.batchNumber,
                expiryDate: batchInfo.expiryDate,
                price: batchInfo.price,
                uniqueUuid: batchInfo.uniqueUuid,
                puPrice: batchInfo.puPrice
            });

            setShowBatchModal(false);
            setSelectedItemForBatch(null);
        }
    };

    const insertSelectedItem = () => {
        const batchNumber = selectedItemBatchNumber || selectedItemForInsert?.batchInfo?.batchNumber;
        const expiryDate = selectedItemExpiryDate || selectedItemForInsert?.batchInfo?.expiryDate;

        if (!selectedItemForInsert) {
            setNotification({
                show: true,
                message: 'Please select an item first',
                type: 'error'
            });
            return;
        }

        if (formData.adjustmentType === 'short' && !batchNumber) {
            setNotification({
                show: true,
                message: 'Please enter batch information first',
                type: 'error'
            });
            return;
        }

        if (!selectedItemQuantity || selectedItemQuantity <= 0) {
            setNotification({
                show: true,
                message: 'Please enter a valid quantity',
                type: 'error'
            });
            document.getElementById('selectedItemQuantity')?.focus();
            return;
        }

        // For xcess type, use default values if not provided
        const finalBatchNumber = formData.adjustmentType === 'xcess'
            ? (batchNumber || 'XXX')
            : batchNumber;

        const finalExpiryDate = formData.adjustmentType === 'xcess'
            ? (expiryDate || getDefaultExpiryDate())
            : expiryDate;

        // Get the puPrice from batchInfo or latestPrice
        const batchPuPrice = selectedItemForInsert?.batchInfo?.puPrice || selectedItemForInsert.latestPrice || 0;

        // IMPORTANT: Use the user's manually entered rate (selectedItemRate) if it's not 0
        // Otherwise use the batch price or latest price
        const finalPrice = selectedItemRate !== 0 ? selectedItemRate :
            (selectedItemForInsert?.batchInfo?.price || selectedItemForInsert.latestPrice || 0);

        const finalPuPrice = selectedItemRate !== 0 ? selectedItemRate : batchPuPrice;

        const newItem = {
            itemId: selectedItemForInsert.id,
            uniqueNumber: selectedItemForInsert.uniqueNumber || 'N/A',
            hscode: selectedItemForInsert.hscode,
            name: selectedItemForInsert.name,
            category: selectedItemForInsert.category?.name || 'No Category',
            batchNumber: finalBatchNumber,
            expiryDate: finalExpiryDate ? new Date(finalExpiryDate).toISOString().split('T')[0] : '',
            quantity: selectedItemQuantity || 0,
            unitId: selectedItemForInsert.unit?.id || selectedItemForInsert.unitId,
            unitName: selectedItemForInsert.unit?.name || selectedItemForInsert.unitName,
            price: finalPrice,
            puPrice: finalPuPrice, // Use the finalPuPrice (could be user-modified)
            amount: (selectedItemQuantity || 0) * finalPuPrice,
            vatStatus: selectedItemForInsert.vatStatus,
            reason: selectedItemReason,
            uniqueUuid: selectedItemForInsert?.batchInfo?.uniqueUuid || '',
            mrp: 0
        };

        const updatedItems = [...items, newItem];
        setItems(updatedItems);

        // Reset all fields including the rate
        setSelectedItemForInsert(null);
        setSelectedItemQuantity(0);
        setSelectedItemRate(0); // Reset rate back to 0
        setSelectedItemReason('');
        setSelectedItemBatchNumber('');
        setSelectedItemExpiryDate('');
        setHeaderSearchQuery('');

        setTimeout(() => {
            const searchInput = document.getElementById('headerItemSearch');
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
        }, 50);

        setTimeout(() => {
            if (itemsTableRef.current) {
                itemsTableRef.current.scrollTop = itemsTableRef.current.scrollHeight;
            }
        }, 50);
    };

    const updateItemField = (index, field, value) => {
        const updatedItems = [...items];
        updatedItems[index][field] = value;

        if (field === 'quantity' || field === 'puPrice') {
            updatedItems[index].amount = (updatedItems[index].quantity * updatedItems[index].puPrice).toFixed(2);
        }

        setItems(updatedItems);
    };

    const removeItem = (index) => {
        const updatedItems = items.filter((_, i) => i !== index);
        setItems(updatedItems);
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (itemSearchRef.current && !itemSearchRef.current.contains(event.target)) {
                if (itemDropdownRef.current && !itemDropdownRef.current.contains(event.target)) {
                    setShowItemDropdown(false);
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const calculateTotal = () => {
        let subTotal = 0;
        let taxableAmount = 0;
        let nonTaxableAmount = 0;

        items.forEach(item => {
            const amount = parseFloat(item.amount) || 0;
            subTotal += amount;

            if (item.vatStatus?.toLowerCase() === 'vatable') {
                taxableAmount += amount;
            } else {
                nonTaxableAmount += amount;
            }
        });

        const vatPercentage = parseFloat(formData.vatPercentage) || 13;
        const vatAmount = (formData.isVatExempt === 'false' || formData.isVatExempt === 'all') ?
            (taxableAmount * vatPercentage) / 100 : 0;

        const totalAmount = taxableAmount + nonTaxableAmount + vatAmount;

        return {
            subTotal,
            taxableAmount,
            nonTaxableAmount,
            vatAmount,
            totalAmount
        };
    };

    // Manual reset function - does NOT increment bill number
    // const handleManualReset = async () => {
    //     try {
    //         setIsLoading(true);

    //         // Get current bill number (does NOT increment)
    //         const currentBillNum = await getCurrentBillNumber();

    //         // Fetch company settings if needed
    //         const companyResponse = await api.get('/api/retailer/stock-adjustments');
    //         const { data } = companyResponse.data;

    //         const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
    //         const currentRomanDate = new Date().toISOString().split('T')[0];

    //         setFormData({
    //             adjustmentType: 'xcess',
    //             nepaliDate: currentNepaliDate,
    //             billDate: currentRomanDate,
    //             billNumber: currentBillNum, // Use from separate endpoint
    //             isVatExempt: 'all',
    //             note: '',
    //             vatPercentage: 13,
    //             items: []
    //         });

    //         setCompany(data.company || {});
    //         setNextBillNumber(currentBillNum);
    //         setItems([]);

    //         setSelectedItemForInsert(null);
    //         setSelectedItemQuantity(0);
    //         setSelectedItemRate(0);
    //         setHeaderSearchQuery('');
    //         setHeaderLastSearchQuery('');
    //         setHeaderShouldShowLastSearchResults(false);
    //         setSelectedItemBatchNumber('');
    //         setSelectedItemExpiryDate('');

    //         setSearchQuery('');
    //         setSearchResults([]);
    //         setSearchPage(1);
    //         setHasMoreSearchResults(false);
    //         setTotalSearchItems(0);
    //         setShowItemDropdown(false);

    //         setTimeout(() => {
    //             if (company.dateFormat === 'nepali' && nepaliDateRef.current) {
    //                 nepaliDateRef.current.focus();
    //             } else if (transactionDateRef.current) {
    //                 transactionDateRef.current.focus();
    //             }
    //         }, 100);
    //     } catch (err) {
    //         console.error('Error resetting form:', err);
    //         setNotification({
    //             show: true,
    //             message: 'Error refreshing form data',
    //             type: 'error'
    //         });
    //     } finally {
    //         setIsLoading(false);
    //     }
    // };

    // Manual reset function - does NOT increment bill number
    const handleManualReset = async () => {
        try {
            setIsLoading(true);

            // Fetch company settings first to get date format
            const companyResponse = await api.get('/api/retailer/stock-adjustments');
            const { data } = companyResponse.data;

            const isNepaliFormat = data.company?.dateFormat === 'nepali' ||
                data.company?.dateFormat === 'Nepali';

            // Fetch current date preference (don't rely on state, fetch fresh)
            const useVoucherDate = await fetchDatePreference();

            // Fetch last stock adjustment date if needed
            let lastDate = null;
            if (useVoucherDate) {
                lastDate = await fetchLastStockAdjustmentDate();
            }

            let transactionDate = '';
            let invoiceDate = '';

            console.log('handleManualReset - useVoucherDate:', useVoucherDate, 'lastDate:', lastDate);

            // Set dates based on preference
            if (useVoucherDate && lastDate) {
                if (isNepaliFormat) {
                    transactionDate = lastDate;
                    invoiceDate = lastDate;
                } else {
                    transactionDate = lastDate;
                    invoiceDate = lastDate;
                }
                console.log('handleManualReset - Using LAST VOUCHER date:', { transactionDate, invoiceDate });
            } else {
                if (isNepaliFormat) {
                    transactionDate = currentNepaliDate;
                    invoiceDate = currentNepaliDate;
                } else {
                    const today = new Date().toISOString().split('T')[0];
                    transactionDate = today;
                    invoiceDate = today;
                }
                console.log('handleManualReset - Using SYSTEM date:', { transactionDate, invoiceDate });
            }

            // Get current bill number (does NOT increment)
            const currentBillNum = await getCurrentBillNumber();

            setFormData({
                adjustmentType: 'xcess',
                nepaliDate: isNepaliFormat ? transactionDate : '',
                billDate: !isNepaliFormat ? invoiceDate : '',
                billNumber: currentBillNum,
                isVatExempt: 'all',
                note: '',
                vatPercentage: 13,
                items: []
            });

            setCompany(data.company || {});
            setNextBillNumber(currentBillNum);
            setItems([]);

            setSelectedItemForInsert(null);
            setSelectedItemQuantity(0);
            setSelectedItemRate(0);
            setHeaderSearchQuery('');
            setHeaderLastSearchQuery('');
            setHeaderShouldShowLastSearchResults(false);
            setSelectedItemBatchNumber('');
            setSelectedItemExpiryDate('');
            setSelectedItemReason('');

            setSearchQuery('');
            setSearchResults([]);
            setSearchPage(1);
            setHasMoreSearchResults(false);
            setTotalSearchItems(0);
            setShowItemDropdown(false);

            setTimeout(() => {
                if (company.dateFormat === 'nepali' && nepaliDateRef.current) {
                    nepaliDateRef.current.focus();
                } else if (transactionDateRef.current) {
                    transactionDateRef.current.focus();
                }
            }, 100);
        } catch (err) {
            console.error('Error resetting form:', err);
            setNotification({
                show: true,
                message: 'Error refreshing form data',
                type: 'error'
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Reset after save - gets next bill number (increments)
    // const resetAfterSave = async () => {
    //     try {
    //         // Get next bill number (this increments the counter)
    //         const currentBillNum = await getCurrentBillNumber();

    //         // Fetch company settings if needed
    //         const companyResponse = await api.get('/api/retailer/stock-adjustments');
    //         const { data } = companyResponse.data;

    //         const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
    //         const currentRomanDate = new Date().toISOString().split('T')[0];

    //         setFormData({
    //             adjustmentType: 'xcess',
    //             nepaliDate: currentNepaliDate,
    //             billDate: currentRomanDate,
    //             billNumber: currentBillNum,
    //             isVatExempt: 'all',
    //             note: '',
    //             vatPercentage: 13,
    //             items: []
    //         });

    //         setCompany(data.company || {});
    //         setNextBillNumber(currentBillNum);
    //         setItems([]);

    //         setSelectedItemForInsert(null);
    //         setSelectedItemQuantity(0);
    //         setSelectedItemRate(0);
    //         setHeaderSearchQuery('');
    //         setHeaderLastSearchQuery('');
    //         setHeaderShouldShowLastSearchResults(false);
    //         setSelectedItemBatchNumber('');
    //         setSelectedItemExpiryDate('');

    //         setSearchQuery('');
    //         setSearchResults([]);
    //         setSearchPage(1);
    //         setHasMoreSearchResults(false);
    //         setTotalSearchItems(0);
    //         setShowItemDropdown(false);

    //         setTimeout(() => {
    //             if (company.dateFormat === 'nepali' && nepaliDateRef.current) {
    //                 nepaliDateRef.current.focus();
    //             } else if (transactionDateRef.current) {
    //                 transactionDateRef.current.focus();
    //             }
    //         }, 100);
    //     } catch (err) {
    //         console.error('Error resetting after save:', err);
    //         setNotification({
    //             show: true,
    //             message: 'Error refreshing form data',
    //             type: 'error'
    //         });
    //     }
    // };

    // Reset after save - respects date preferences
    const resetAfterSave = async () => {
        try {
            // Fetch company settings first to get date format
            const companyResponse = await api.get('/api/retailer/stock-adjustments');
            const { data } = companyResponse.data;

            const isNepaliFormat = data.company?.dateFormat === 'nepali' ||
                data.company?.dateFormat === 'Nepali';

            // Fetch current date preference (don't rely on state, fetch fresh)
            const useVoucherDate = await fetchDatePreference();

            // Fetch last stock adjustment date if needed
            let lastDate = null;
            if (useVoucherDate) {
                lastDate = await fetchLastStockAdjustmentDate();
            }

            let transactionDate = '';
            let invoiceDate = '';

            console.log('resetAfterSave - useVoucherDate:', useVoucherDate, 'lastDate:', lastDate);

            // Set dates based on preference
            if (useVoucherDate && lastDate) {
                if (isNepaliFormat) {
                    transactionDate = lastDate;
                    invoiceDate = lastDate;
                } else {
                    transactionDate = lastDate;
                    invoiceDate = lastDate;
                }
                console.log('resetAfterSave - Using LAST VOUCHER date:', { transactionDate, invoiceDate });
            } else {
                if (isNepaliFormat) {
                    transactionDate = currentNepaliDate;
                    invoiceDate = currentNepaliDate;
                } else {
                    const today = new Date().toISOString().split('T')[0];
                    transactionDate = today;
                    invoiceDate = today;
                }
                console.log('resetAfterSave - Using SYSTEM date:', { transactionDate, invoiceDate });
            }

            // Get current bill number (this increments the counter)
            const currentBillNum = await getCurrentBillNumber();

            setFormData({
                adjustmentType: 'xcess',
                nepaliDate: isNepaliFormat ? transactionDate : '',
                billDate: !isNepaliFormat ? invoiceDate : '',
                billNumber: currentBillNum,
                isVatExempt: 'all',
                note: '',
                vatPercentage: 13,
                items: []
            });

            setCompany(data.company || {});
            setNextBillNumber(currentBillNum);
            setItems([]);

            setSelectedItemForInsert(null);
            setSelectedItemQuantity(0);
            setSelectedItemRate(0);
            setHeaderSearchQuery('');
            setHeaderLastSearchQuery('');
            setHeaderShouldShowLastSearchResults(false);
            setSelectedItemBatchNumber('');
            setSelectedItemExpiryDate('');
            setSelectedItemReason('');

            setSearchQuery('');
            setSearchResults([]);
            setSearchPage(1);
            setHasMoreSearchResults(false);
            setTotalSearchItems(0);
            setShowItemDropdown(false);

            setTimeout(() => {
                if (company.dateFormat === 'nepali' && nepaliDateRef.current) {
                    nepaliDateRef.current.focus();
                } else if (transactionDateRef.current) {
                    transactionDateRef.current.focus();
                }
            }, 100);
        } catch (err) {
            console.error('Error resetting after save:', err);
            setNotification({
                show: true,
                message: 'Error refreshing form data',
                type: 'error'
            });
        }
    };

    const handlePrintAfterSaveChange = (e) => {
        const isChecked = e.target.checked;
        setPrintAfterSave(isChecked);
        localStorage.setItem('printAfterSaveStockAdjustment', isChecked);
    };

    const printImmediately = async (adjustmentId) => {
        try {
            const response = await api.get(`/api/retailer/stock-adjustments/${adjustmentId}/print`);
            const printData = response.data.data;

            const tempDiv = document.createElement('div');
            tempDiv.style.position = 'absolute';
            tempDiv.style.left = '-9999px';
            document.body.appendChild(tempDiv);

            tempDiv.innerHTML = `
        <div id="printableContent">
            <div class="print-adjustment-container">
                <div class="print-adjustment-header">
                    <div class="print-company-name">${printData.currentCompanyName || ''}</div>
                    <div class="print-company-details">
                        ${printData.currentCompany?.address || ''} | Tel: ${printData.currentCompany?.phone || ''} | PAN: ${printData.currentCompany?.pan || ''}
                    </div>
                    <div class="print-adjustment-title">STOCK ADJUSTMENT</div>
                </div>

                <div class="print-adjustment-details">
                    <div>
                        <div><strong>Type:</strong> ${printData.adjustment.adjustmentType === 'xcess' ? 'Excess' : 'Short'}</div>
                        ${printData.adjustment.note ? `<div><strong>Note:</strong> ${printData.adjustment.note}</div>` : ''}
                    </div>
                    <div>
                        <div><strong>Vch. No:</strong> ${printData.adjustment.billNumber || ''}</div>
                        <div><strong>Date:</strong> ${printData.companyDateFormat === 'Nepali' ? formatDate(printData.nepaliDate, 'nepali') : formatDate(printData.adjustment.date)}</div>
                    </div>
                </div>

                <table class="print-adjustment-table">
                    <thead>
                        <tr>
                            <th>S.N.</th>
                            <th>Code</th>
                            <th>HSN</th>
                            <th>Description of Goods</th>
                            <th>Batch</th>
                            <th>Expiry</th>
                            <th>Qty</th>
                            <th>Unit</th>
                            <th>Rate (Rs.)</th>
                            <th>Total (Rs.)</th>
                            <th>Reason</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${printData.adjustment.items?.map((item, i) => {
                const itemTotal = (item.quantity || 0) * (item.puPrice || 0);
                return `
                            <tr key="${i}">
                                <td>${i + 1}</td>
                                <td>${item.uniqueNumber || ''}</td>
                                <td>${item.hscode || ''}</td>
                                <td>
                                    ${item.vatStatus === 'vatExempt' ?
                        `${item.itemName || ''} *` :
                        item.itemName || ''}
                                </td>
                                <td>${item.batchNumber || 'N/A'}</td>
                                <td>${item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'N/A'}</td>
                                <td class="print-text-right">${formatTo2Decimal(item.quantity)}</td>
                                <td>${item.unitName || ''}</td>
                                <td class="print-text-right">${formatTo2Decimal(item.puPrice)}</td>
                                <td class="print-text-right">${formatTo2Decimal(itemTotal)}</td>
                                <td>${item.reason?.join(' ') || item.reason || ''}</td>
                            </tr>
                        `}).join('') || ''}
                    </tbody>
                    <tr>
                        <td colSpan="11" style={{ borderBottom: '1px solid #000' }}></td>
                    </tr>
                </table>

                <table class="print-totals-table">
                    <tbody>
                        <tr>
                            <td><strong>Sub Total:</strong></td>
                            <td class="print-text-right">${formatTo2Decimal(printData.adjustment.subTotal)}</td>
                        </tr>
                        <tr>
                            <td><strong>Discount:</strong></td>
                            <td class="print-text-right">${formatTo2Decimal(printData.adjustment.discountAmount)}</td>
                        </tr>
                        <tr>
                            <td><strong>Non Taxable:</strong></td>
                            <td class="print-text-right">${formatTo2Decimal(printData.adjustment.nonVatAdjustment)}</td>
                        </tr>
                        <tr>
                            <td><strong>Taxable Amount:</strong></td>
                            <td class="print-text-right">${formatTo2Decimal(printData.adjustment.taxableAmount)}</td>
                        </tr>
                        ${!printData.adjustment.isVatExempt ? `
                        <tr>
                            <td><strong>VAT (${printData.adjustment.vatPercentage || 0}%):</strong></td>
                            <td class="print-text-right">${formatTo2Decimal(printData.adjustment.vatAmount)}</td>
                        </tr>
                        ` : ''}
                        <tr>
                            <td><strong>Round Off:</strong></td>
                            <td class="print-text-right">${formatTo2Decimal(printData.adjustment.roundOffAmount)}</td>
                        </tr>
                        <tr>
                            <td><strong>Grand Total:</strong></td>
                            <td class="print-text-right">${formatTo2Decimal(printData.adjustment.totalAmount)}</td>
                        </tr>
                        <tr>
                            <td><strong>Total Qty:</strong></td>
                            <td class="print-text-right">${formatTo2Decimal(printData.totals?.totalQuantity || 0)}</td>
                        </tr>
                    </tbody>
                </table>

                <div class="print-amount-in-words">
                    <strong>In Words:</strong> ${convertToRupeesAndPaisa(printData.adjustment.totalAmount || 0)} Only.
                </div>
                <br /><br />
                <div class="print-signature-area">
                    <div class="print-signature-box">Received By</div>
                    <div class="print-signature-box">Prepared By: ${printData.adjustment.user?.name || printData.user?.name || ''}</div>
                    <div class="print-signature-box">For: ${printData.currentCompanyName || ''}</div>
                </div>
            </div>
        </div>
    `;

            const styles = `
        @page {
            size: A4;
            margin: 5mm;
        }
        body {
            font-family: 'Arial Narrow', Arial, sans-serif;
            font-size: 9pt;
            line-height: 1.2;
            color: #000;
            background: white;
            margin: 0;
            padding: 0;
        }
        .print-adjustment-container {
            width: 100%;
            max-width: 210mm;
            margin: 0 auto;
            padding: 2mm;
        }
        .print-adjustment-header {
            text-align: center;
            margin-bottom: 3mm;
            border-bottom: 1px solid #000;
            padding-bottom: 2mm;
        }
        .print-adjustment-title {
            font-size: 12pt;
            font-weight: bold;
            margin: 2mm 0;
            text-transform: uppercase;
        }
        .print-company-name {
            font-size: 16pt;
            font-weight: bold;
        }
        .print-company-details {
            font-size: 8pt;
            margin: 1mm 0;
            font-weight: bold;
        }
        .print-adjustment-details {
            display: flex;
            justify-content: space-between;
            margin: 2mm 0;
            font-size: 8pt;
        }
        .print-adjustment-table {
            width: 100%;
            border-collapse: collapse;
            margin: 3mm 0;
            font-size: 8pt;
            border: none;
            table-layout: fixed;
        }
        .print-adjustment-table thead {
            border-top: 1px solid #000;
            border-bottom: 1px solid #000;
        }
        .print-adjustment-table th {
            background-color: transparent;
            border: none;
            padding: 1mm;
            text-align: left;
            font-weight: bold;
        }
        .print-adjustment-table td {
            border: none;
            padding: 1mm;
            border-bottom: 1px solid #eee;
        }
        .print-adjustment-table th:nth-child(1),
        .print-adjustment-table td:nth-child(1) {
            width: 4%;
        }
        .print-adjustment-table th:nth-child(2),
        .print-adjustment-table td:nth-child(2) {
            width: 7%;
        }
        .print-adjustment-table th:nth-child(3),
        .print-adjustment-table td:nth-child(3) {
            width: 8%;
        }
        .print-adjustment-table th:nth-child(4),
        .print-adjustment-table td:nth-child(4) {
            width: 25%;
        }
        .print-adjustment-table th:nth-child(5),
        .print-adjustment-table td:nth-child(5) {
            width: 8%;
        }
        .print-adjustment-table th:nth-child(6),
        .print-adjustment-table td:nth-child(6) {
            width: 8%;
        }
        .print-adjustment-table th:nth-child(7),
        .print-adjustment-table td:nth-child(7) {
            width: 6%;
            text-align: right;
        }
        .print-adjustment-table th:nth-child(8),
        .print-adjustment-table td:nth-child(8) {
            width: 6%;
        }
        .print-adjustment-table th:nth-child(9),
        .print-adjustment-table td:nth-child(9) {
            width: 8%;
            text-align: right;
        }
        .print-adjustment-table th:nth-child(10),
        .print-adjustment-table td:nth-child(10) {
            width: 10%;
            text-align: right;
            padding-right: 2mm;
        }
        .print-adjustment-table th:nth-child(11),
        .print-adjustment-table td:nth-child(11) {
            width: 10%;
        }
        .print-adjustment-table td:nth-child(7),
        .print-adjustment-table td:nth-child(9),
        .print-adjustment-table td:nth-child(10) {
            white-space: nowrap;
            overflow: visible !important;
            text-overflow: clip !important;
        }
        .print-text-right {
            text-align: right;
            padding-right: 2mm;
        }
        .print-text-center {
            text-align: center;
        }
        .print-amount-in-words {
            font-size: 8pt;
            margin: 2mm 0;
            padding: 1mm;
            border: 1px dashed #000;
        }
        .print-signature-area {
            display: flex;
            justify-content: space-between;
            margin-top: 5mm;
            font-size: 8pt;
        }
        .print-signature-box {
            text-align: center;
            width: 30%;
            border-top: 1px solid #000;
            padding-top: 1mm;
            font-weight: bold;
        }
        .print-totals-table {
            width: 60%;
            margin-left: auto;
            border-collapse: collapse;
            font-size: 8pt;
        }
        .print-totals-table td {
            padding: 1mm;
        }
        .print-totals-table td:nth-child(2) {
            text-align: right;
            padding-right: 2mm;
            width: 40%;
            white-space: nowrap;
            overflow: visible !important;
            text-overflow: clip !important;
        }
    `;

            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
        <html>
            <head>
                <title>Stock_Adjustment_${printData.adjustment.billNumber}</title>
                <style>${styles}</style>
            </head>
            <body>
                ${tempDiv.innerHTML}
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

            document.body.removeChild(tempDiv);
        } catch (error) {
            console.error('Error fetching print data:', error);
            setNotification({
                show: true,
                message: 'Adjustment saved but failed to load print data',
                type: 'warning'
            });
        }
    };

    const formatTo2Decimal = (num) => {
        if (num === null || num === undefined) return '0.00';
        const rounded = Math.round(num * 100) / 100;
        const parts = rounded.toString().split(".");
        if (!parts[1]) return parts[0] + ".00";
        if (parts[1].length === 1) return parts[0] + "." + parts[1] + "0";
        return rounded.toString();
    };

    const formatDate = (dateString, format = 'english') => {
        if (!dateString) return 'N/A';

        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'N/A';

            if (format === 'nepali') {
                const nepaliDate = new NepaliDate(date);
                return nepaliDate.format('YYYY-MM-DD');
            }

            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } catch (e) {
            console.error('Date formatting error:', e);
            return 'N/A';
        }
    };

    const handleSubmit = async (e, print = false) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            const totals = calculateTotal();

            const parseDate = (dateString) => {
                if (!dateString) return new Date().toISOString();

                // If it's already a valid date string in YYYY-MM-DD format
                if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
                    // Create date at UTC to avoid timezone issues
                    const date = new Date(dateString);
                    date.setUTCHours(0, 0, 0, 0);
                    return date.toISOString();
                }
                return new Date(dateString).toISOString();
            };

            const adjustmentData = {
                adjustmentType: formData.adjustmentType,
                // nepaliDate: formData.nepaliDate,
                // billDate: formData.billDate,
                nepaliDate: parseDate(formData.nepaliDate),
                billDate: parseDate(formData.billDate),
                isVatExempt: formData.isVatExempt,
                vatPercentage: parseFloat(formData.vatPercentage) || 13,
                discountPercentage: 0, // Not used in stock adjustment
                note: formData.note || '',
                items: items.map(item => ({
                    itemId: item.itemId,
                    batchNumber: item.batchNumber,
                    expiryDate: item.expiryDate,
                    quantity: parseFloat(item.quantity) || 0,
                    unitId: item.unitId,
                    puPrice: parseFloat(item.puPrice) || 0,
                    price: parseFloat(item.price) || 0,
                    mrp: parseFloat(item.mrp) || 0,
                    marginPercentage: 0,
                    vatStatus: item.vatStatus,
                    reason: item.reason ? [item.reason] : [],
                    uniqueUuid: item.uniqueUuid
                }))
            };

            const response = await api.post('/api/retailer/stock-adjustments', adjustmentData);

            setNotification({
                show: true,
                message: 'Stock adjustment saved successfully!',
                type: 'success'
            });

            setItems([]);

            if ((print || printAfterSave) && response.data.data?.adjustmentId) {
                setIsSaving(false);
                await printImmediately(response.data.data.adjustmentId);
                await resetAfterSave();
            } else if (print) {
                setIsSaving(false);
                navigate(`/retailer/stockAdjustments/${response.data.data.adjustmentId}/print`);
            } else {
                await resetAfterSave();
                setIsSaving(false);
            }
        } catch (error) {
            console.error('Error saving stock adjustment:', error);
            setNotification({
                show: true,
                message: error.response?.data?.error || 'Failed to save stock adjustment. Please try again.',
                type: 'error'
            });
            setIsSaving(false);
        }
    };

    // Sales Price Modal functions
    const openSalesPriceModal = (index) => {
        setSelectedItemIndex(index);
        const item = items[index];

        const fullItem = searchResults.find(i => i.id === item.itemId) ||
            headerSearchResults.find(i => i.id === item.itemId) ||
            item;
        const latestStockEntry = fullItem.stockEntries?.[fullItem.stockEntries.length - 1] || {};

        const prevPuPrice = (latestStockEntry?.puPrice * latestStockEntry?.WSUnit) || 0;
        const currentPuPrice = item.puPrice;
        const marginPercentage = latestStockEntry?.marginPercentage || 0;
        const currency = latestStockEntry?.currency || 'NPR';
        const mrp = latestStockEntry?.mrp || 0;
        const salesPrice = latestStockEntry?.price || currentPuPrice;

        setSalesPriceData({
            prevPuPrice: prevPuPrice,
            puPrice: currentPuPrice,
            marginPercentage: marginPercentage,
            currency: currency,
            mrp: mrp,
            salesPrice: salesPrice
        });

        setShowSalesPriceModal(true);
    };

    const saveSalesPrice = () => {
        if (selectedItemIndex === -1) return;

        const updatedItems = [...items];
        updatedItems[selectedItemIndex] = {
            ...updatedItems[selectedItemIndex],
            price: salesPriceData.salesPrice,
            mrp: salesPriceData.mrp,
            marginPercentage: salesPriceData.marginPercentage,
            currency: salesPriceData.currency,
        };

        setItems(updatedItems);
        setShowSalesPriceModal(false);

        setTimeout(() => {
            const nextField = document.getElementById(`reason-${selectedItemIndex}`);
            if (nextField) {
                nextField.focus();
            }
        }, 0);
    };

    useEffect(() => {
        if (showSalesPriceModal && marginPercentageRef.current) {
            setTimeout(() => {
                marginPercentageRef.current.focus();
                marginPercentageRef.current.select();
            }, 100);
        }
    }, [showSalesPriceModal]);

    const totals = calculateTotal();

    const handleKeyDown = (e, currentFieldId) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const form = e.target.form;
            const inputs = Array.from(form.querySelectorAll('input, select, textarea')).filter(
                el => !el.hidden && !el.disabled && el.offsetParent !== null
            );
            const currentIndex = inputs.findIndex(input => input.id === currentFieldId);

            if (currentIndex > -1 && currentIndex < inputs.length - 1) {
                inputs[currentIndex + 1].focus();
            }
        }
    };

    const loadMoreSearchItems = () => {
        if (!isSearching) {
            fetchItemsFromBackend(searchQuery, searchPage + 1, false);
        }
    };

    const loadMoreHeaderSearchItems = () => {
        if (!isHeaderSearching) {
            fetchItemsFromBackend(headerSearchQuery, headerSearchPage + 1, true);
        }
    };

    const scrollToItemsTable = () => {
        if (itemsTableRef.current) {
            setTimeout(() => {
                itemsTableRef.current.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }, 100);
        }
    };

    useEffect(() => {
        if (itemsTableRef.current && items.length > 0) {
            setTimeout(() => {
                itemsTableRef.current.scrollTop = itemsTableRef.current.scrollHeight;
            }, 10);
        }
    }, [items]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (reasonDropdownRef.current && !reasonDropdownRef.current.contains(event.target)) {
                setShowReasonDropdown(false);
                setActiveReasonIndex(-1);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Memoized dropdown components
    const ItemDropdown = React.useMemo(() => {
        if (!showItemDropdown) return null;

        const itemsToShow = searchResults;

        return (
            <div
                id="dropdownMenu"
                className="dropdown-menu show"
                style={{
                    maxHeight: '280px',
                    height: '280px',
                    overflow: 'hidden',
                    position: 'absolute',
                    width: '100%',
                    zIndex: 1000,
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                }}
                ref={itemDropdownRef}
            >
                <div className="dropdown-header" style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    alignItems: 'center',
                    padding: '0 10px',
                    height: '40px',
                    background: '#f0f0f0',
                    fontWeight: 'bold',
                    borderBottom: '1px solid #dee2e6'
                }}>
                    <div><strong>#</strong></div>
                    <div><strong>HSN</strong></div>
                    <div><strong>Description</strong></div>
                    <div><strong>Category</strong></div>
                    <div><strong>Stock</strong></div>
                    <div><strong>Unit</strong></div>
                    <div><strong>Rate</strong></div>
                </div>

                {itemsToShow.length > 0 ? (
                    <VirtualizedItemListForPurchase
                        items={itemsToShow}
                        onItemClick={(item) => {
                            // Check adjustment type to decide whether to show batch modal or add directly
                            if (formData.adjustmentType === 'short') {
                                showBatchModalForItem(item);
                            } else {
                                addItemToBill(item);
                            }
                        }}
                        searchRef={itemSearchRef}
                        hasMore={hasMoreSearchResults}
                        isSearching={isSearching}
                        onLoadMore={loadMoreSearchItems}
                        totalItems={totalSearchItems}
                        page={searchPage}
                        searchQuery={searchQuery}
                        setNotification={setNotification}
                    />
                ) : (
                    <div className="text-center py-3 text-muted">
                        {searchQuery ? 'No items found' : 'Type to search items'}
                        <div className="small mt-1">
                            <small className="text-info">Press F6 to create a new item</small>
                        </div>
                    </div>
                )}
            </div>
        );
    }, [showItemDropdown, searchResults, searchQuery, lastSearchQuery, shouldShowLastSearchResults, formData.adjustmentType]);

    const formatter = new Intl.NumberFormat('en-NP', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    const getReasonOptions = () => {
        if (formData.adjustmentType === 'xcess') {
            return [
                '',
                'Bonus',
                'Free',
                'Opening Stock',
                'Physical Count Excess'
            ];
        } else { // short
            return [
                '',
                'Expired',
                'Donate',
                'Damage',
                'Breakage',
                'Return to Supplier',
                'Sample',
                'Physical Count Short'
            ];
        }
    };

    return (
        <div className="container-fluid">
            <Header />
            <div className="card mt-2 shadow-lg p-2 animate__animated animate__fadeInUp expanded-card ledger-card compact">
                <div className="card-header">
                    <div className="d-flex justify-content-between align-items-center">
                        <h2 className="card-title mb-0">
                            <i className="bi bi-file-text me-2"></i>
                            Stock Adjustment
                        </h2>
                        <div>
                            {formData.billNumber === '' && (
                                <span className="badge bg-danger me-2">Invoice number is required!</span>
                            )}
                            {dateErrors.nepaliDate && (
                                <span className="badge bg-danger">{dateErrors.nepaliDate}</span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="card-body p-2 p-md-3">
                    <form onSubmit={handleSubmit} id="adjustmentForm" className="needs-validation" noValidate>
                        {/* Date and Basic Info Row */}
                        <div className="row g-2 mb-3">
                            {company.dateFormat === 'nepali' || company.dateFormat === 'Nepali' ? (
                                <>
                                    <div className="col-12 col-md-6 col-lg-3">
                                        <div className="position-relative">
                                            <input
                                                type="text"
                                                name="nepaliDate"
                                                id="nepaliDate"
                                                ref={nepaliDateRef}
                                                autoFocus
                                                autoComplete='off'
                                                className={`form-control form-control-sm no-date-icon ${dateErrors.nepaliDate ? 'is-invalid' : ''}`}
                                                value={formData.nepaliDate}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    const sanitizedValue = value.replace(/[^0-9/-]/g, '');
                                                    if (sanitizedValue.length <= 10) {
                                                        setFormData({ ...formData, nepaliDate: sanitizedValue });
                                                        setDateErrors(prev => ({ ...prev, nepaliDate: '' }));
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
                                                            const currentDate = new NepaliDate();
                                                            const correctedDate = currentDate.format('YYYY-MM-DD');
                                                            setFormData({
                                                                ...formData,
                                                                nepaliDate: correctedDate
                                                            });
                                                            setDateErrors(prev => ({ ...prev, nepaliDate: '' }));

                                                            setNotification({
                                                                show: true,
                                                                message: 'Date required. Auto-corrected to current date.',
                                                                type: 'warning',
                                                                duration: 3000
                                                            });

                                                            handleKeyDown(e, 'nepaliDate');
                                                        } else if (dateErrors.nepaliDate) {
                                                            e.target.focus();
                                                        } else {
                                                            handleKeyDown(e, 'nepaliDate');
                                                        }
                                                    }
                                                }}
                                                onPaste={(e) => {
                                                    e.preventDefault();
                                                    const pastedData = e.clipboardData.getData('text');
                                                    const cleanedData = pastedData.replace(/[^0-9/-]/g, '');
                                                    const newValue = formData.nepaliDate + cleanedData;
                                                    if (newValue.length <= 10) {
                                                        setFormData({ ...formData, nepaliDate: newValue });
                                                    }
                                                }}
                                                onBlur={(e) => {
                                                    try {
                                                        const dateStr = e.target.value.trim();
                                                        if (!dateStr) {
                                                            setDateErrors(prev => ({ ...prev, nepaliDate: '' }));
                                                            return;
                                                        }

                                                        const nepaliDateFormat = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/;
                                                        if (!nepaliDateFormat.test(dateStr)) {
                                                            const currentDate = new NepaliDate();
                                                            const correctedDate = currentDate.format('YYYY-MM-DD');
                                                            setFormData({
                                                                ...formData,
                                                                nepaliDate: correctedDate
                                                            });
                                                            setDateErrors(prev => ({ ...prev, nepaliDate: '' }));

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
                                                            const currentDate = new NepaliDate();
                                                            const correctedDate = currentDate.format('YYYY-MM-DD');
                                                            setFormData({
                                                                ...formData,
                                                                nepaliDate: correctedDate
                                                            });
                                                            setDateErrors(prev => ({ ...prev, nepaliDate: '' }));

                                                            setNotification({
                                                                show: true,
                                                                message: 'Invalid Nepali date. Auto-corrected to current date.',
                                                                type: 'warning',
                                                                duration: 3000
                                                            });
                                                        } else {
                                                            setFormData({
                                                                ...formData,
                                                                nepaliDate: nepaliDate.format('YYYY-MM-DD')
                                                            });
                                                            setDateErrors(prev => ({ ...prev, nepaliDate: '' }));
                                                        }
                                                    } catch (error) {
                                                        const currentDate = new NepaliDate();
                                                        const correctedDate = currentDate.format('YYYY-MM-DD');
                                                        setFormData({
                                                            ...formData,
                                                            nepaliDate: correctedDate
                                                        });
                                                        setDateErrors(prev => ({ ...prev, nepaliDate: '' }));

                                                        setNotification({
                                                            show: true,
                                                            message: error.message ? `${error.message}. Auto-corrected to current date.` : 'Invalid date. Auto-corrected to current date.',
                                                            type: 'warning',
                                                            duration: 3000
                                                        });
                                                    }
                                                }}
                                                placeholder="YYYY-MM-DD"
                                                required
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
                                                Date: <span className="text-danger">*</span>
                                            </label>
                                            {dateErrors.nepaliDate && (
                                                <div className="invalid-feedback d-block" style={{ fontSize: '0.7rem' }}>
                                                    {dateErrors.nepaliDate}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="col-12 col-md-6 col-lg-3">
                                    <div className="position-relative">
                                        <input
                                            type="date"
                                            name="billDate"
                                            id="billDate"
                                            className="form-control form-control-sm"
                                            ref={transactionDateRef}
                                            autoFocus
                                            value={formData.billDate}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                const selectedDate = new Date(value);
                                                const today = new Date();
                                                today.setHours(0, 0, 0, 0);

                                                if (selectedDate > today) {
                                                    const todayStr = today.toISOString().split('T')[0];
                                                    setFormData({ ...formData, billDate: todayStr });

                                                    setNotification({
                                                        show: true,
                                                        message: 'Future date not allowed. Auto-corrected to today.',
                                                        type: 'warning',
                                                        duration: 3000
                                                    });
                                                } else {
                                                    setFormData({ ...formData, billDate: value });
                                                }
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    const value = e.target.value;

                                                    if (!value) {
                                                        const today = new Date();
                                                        const todayStr = today.toISOString().split('T')[0];
                                                        setFormData({ ...formData, billDate: todayStr });

                                                        setNotification({
                                                            show: true,
                                                            message: 'Date required. Auto-corrected to today.',
                                                            type: 'warning',
                                                            duration: 3000
                                                        });
                                                    }

                                                    handleKeyDown(e, 'billDate');
                                                }
                                            }}
                                            onBlur={(e) => {
                                                const value = e.target.value;
                                                if (!value) {
                                                    const today = new Date();
                                                    const todayStr = today.toISOString().split('T')[0];
                                                    setFormData({ ...formData, billDate: todayStr });

                                                    setNotification({
                                                        show: true,
                                                        message: 'Date required. Auto-corrected to today.',
                                                        type: 'warning',
                                                        duration: 3000
                                                    });
                                                }
                                            }}
                                            max={new Date().toISOString().split('T')[0]}
                                            required
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
                                            Date: <span className="text-danger">*</span>
                                        </label>
                                    </div>
                                </div>
                            )}

                            <div className="col-12 col-md-6 col-lg-2">
                                <div className="position-relative">
                                    <select
                                        id="adjustmentType"
                                        name="adjustmentType"
                                        className="form-control form-control-sm"
                                        value={formData.adjustmentType}
                                        onChange={(e) => setFormData({ ...formData, adjustmentType: e.target.value })}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleKeyDown(e, 'adjustmentType');
                                            }
                                        }}
                                        style={{
                                            height: '26px',
                                            fontSize: '0.875rem',
                                            paddingTop: '0.25rem',
                                            width: '100%'
                                        }}
                                    >
                                        <option value="xcess">Xcess</option>
                                        <option value="short">Short</option>
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
                                        Type:
                                    </label>
                                </div>
                            </div>

                            <div className="col-12 col-md-6 col-lg-2">
                                <div className="position-relative">
                                    <input
                                        type="text"
                                        name="billNumber"
                                        id="billNumber"
                                        className="form-control form-control-sm"
                                        value={formData.billNumber}
                                        readOnly
                                        tabIndex={0}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                document.getElementById('isVatExempt')?.focus();
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
                                        Vch. No:
                                    </label>
                                </div>
                            </div>

                            <div className="col-12 col-md-6 col-lg-3">
                                <div className="position-relative">
                                    <select
                                        className="form-control form-control-sm"
                                        name="isVatExempt"
                                        id="isVatExempt"
                                        value={formData.isVatExempt}
                                        onChange={(e) => setFormData({ ...formData, isVatExempt: e.target.value })}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleKeyDown(e, 'isVatExempt');
                                            }
                                        }}
                                        style={{
                                            height: '26px',
                                            fontSize: '0.875rem',
                                            paddingTop: '0.25rem',
                                            width: '100%'
                                        }}
                                    >
                                        {company.vatEnabled && <option value="all">All</option>}
                                        {company.vatEnabled && <option value="false">13%</option>}
                                        <option value="true">Exempt</option>
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
                                        VAT
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Items Table */}
                        <div
                            className="table-responsive"
                            style={{
                                minHeight: "270px",
                                maxHeight: "270px",
                                overflowY: "auto",
                                border: items.length > 0 ? '1px solid #dee2e6' : '1px dashed #ced4da',
                                backgroundColor: '#fff'
                            }}
                            ref={itemsTableRef}
                        >
                            <table className="table table-sm table-bordered table-hover mb-0">
                                <thead className="sticky-top bg-light">
                                    {/* Header item selection row */}
                                    <tr style={{
                                        height: '26px',
                                        backgroundColor: '#ffffff',
                                        position: 'sticky',
                                        top: 0,
                                        zIndex: 10,
                                        boxShadow: '0 2px 3px rgba(0,0,0,0.1)'
                                    }}>
                                        <td width="5%" style={{ padding: '2px', backgroundColor: '#ffffff' }}>
                                            <div className="position-relative">
                                                <input
                                                    type="text"
                                                    id="headerItemSearch"
                                                    className="form-control form-control-sm"
                                                    placeholder="Search..."
                                                    value={headerSearchQuery}
                                                    onChange={handleHeaderItemSearch}
                                                    onFocus={() => {
                                                        setShowHeaderItemModal(true);
                                                        handleHeaderSearchFocus();
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            if (!headerSearchQuery.trim()) {
                                                                setShowHeaderItemModal(false);
                                                                setTimeout(() => {
                                                                    document.getElementById('note')?.focus();
                                                                }, 50);
                                                            } else {
                                                                setShowHeaderItemModal(true);
                                                            }
                                                        } else if (e.key === 'F6') {
                                                            e.preventDefault();
                                                            setShowProductModal(true);
                                                            setShowHeaderItemModal(false);
                                                        } else if (e.key === 'Escape') {
                                                            e.preventDefault();
                                                            setShowHeaderItemModal(false);
                                                        }
                                                    }}
                                                    style={{
                                                        height: '20px',
                                                        fontSize: '0.75rem',
                                                        padding: '0 4px',
                                                        backgroundColor: '#ffffff'
                                                    }}
                                                />
                                            </div>
                                        </td>
                                        <td width="8%" style={{
                                            padding: '2px',
                                            fontSize: '0.75rem',
                                            textAlign: 'center',
                                            backgroundColor: '#ffffff'
                                        }}>
                                            {selectedItemForInsert ? selectedItemForInsert.uniqueNumber || 'N/A' : ''}
                                        </td>
                                        <td width="8%" style={{
                                            padding: '2px',
                                            fontSize: '0.75rem',
                                            textAlign: 'center',
                                            backgroundColor: '#ffffff'
                                        }}>
                                            {selectedItemForInsert ? selectedItemForInsert.hscode || 'N/A' : ''}
                                        </td>
                                        <td width="20%" style={{
                                            padding: '2px',
                                            fontSize: '0.75rem',
                                            backgroundColor: '#ffffff'
                                        }}>
                                            {selectedItemForInsert ? selectedItemForInsert.name : ''}
                                        </td>
                                        <td width="8%" style={{ padding: '2px', backgroundColor: '#ffffff' }}>
                                            <input
                                                type="text"
                                                className="form-control form-control-sm"
                                                placeholder="Batch"
                                                id="selectedItemBatch"
                                                value={selectedItemForInsert?.batchInfo?.batchNumber || selectedItemBatchNumber || ''}
                                                onChange={(e) => {
                                                    setSelectedItemBatchNumber(e.target.value);
                                                    if (selectedItemForInsert) {
                                                        setSelectedItemForInsert(prev => ({
                                                            ...prev,
                                                            batchInfo: {
                                                                ...prev.batchInfo,
                                                                batchNumber: e.target.value
                                                            }
                                                        }));
                                                    }
                                                }}
                                                onKeyDown={(e) => {
                                                    if ((e.key === 'Tab' || e.key === 'Enter')) {
                                                        e.preventDefault();
                                                        document.getElementById('selectedItemExpiryDate').focus();
                                                    } else if (e.key === 'Escape') {
                                                        setShowHeaderItemModal(true);
                                                        setTimeout(() => {
                                                            document.getElementById('headerItemSearch')?.focus();
                                                        }, 100);
                                                    }
                                                }}
                                                style={{
                                                    height: '20px',
                                                    fontSize: '0.75rem',
                                                    padding: '0 4px',
                                                    backgroundColor: '#ffffff'
                                                }}
                                            />
                                        </td>
                                        <td width="8%" style={{ padding: '2px', backgroundColor: '#ffffff' }}>
                                            <input
                                                type="date"
                                                className="form-control form-control-sm"
                                                placeholder="Expiry"
                                                id="selectedItemExpiryDate"
                                                value={selectedItemExpiryDate || (selectedItemForInsert?.batchInfo?.expiryDate ? formatDateForInput(selectedItemForInsert.batchInfo.expiryDate) : '')}
                                                onChange={(e) => {
                                                    const newDate = e.target.value;
                                                    setSelectedItemExpiryDate(newDate);
                                                    if (selectedItemForInsert) {
                                                        setSelectedItemForInsert(prev => ({
                                                            ...prev,
                                                            batchInfo: {
                                                                ...prev.batchInfo,
                                                                expiryDate: newDate
                                                            }
                                                        }));
                                                    }
                                                }}
                                                onKeyDown={(e) => {
                                                    if ((e.key === 'Tab' || e.key === 'Enter')) {
                                                        e.preventDefault();
                                                        document.getElementById('selectedItemQuantity').focus();
                                                    } else if (e.key === 'Escape') {
                                                        document.getElementById('selectedItemBatch').focus();
                                                    }
                                                }}
                                                style={{
                                                    height: '20px',
                                                    fontSize: '0.75rem',
                                                    padding: '0 4px',
                                                    backgroundColor: '#ffffff'
                                                }}
                                            />
                                        </td>
                                        <td width="8%" style={{ padding: '2px', backgroundColor: '#ffffff' }}>
                                            <input
                                                type="number"
                                                className="form-control form-control-sm"
                                                placeholder="Qty"
                                                id='selectedItemQuantity'
                                                value={selectedItemQuantity}
                                                onChange={(e) => {
                                                    const value = parseFloat(e.target.value) || 0;
                                                    setSelectedItemQuantity(value);
                                                }}
                                                onFocus={(e) => e.target.select()}
                                                onKeyDown={(e) => {
                                                    if ((e.key === 'Tab' || e.key === 'Enter')) {
                                                        e.preventDefault();
                                                        document.getElementById('selectedItemRate').focus();
                                                    }
                                                }}
                                                style={{
                                                    height: '20px',
                                                    fontSize: '0.75rem',
                                                    padding: '0 4px',
                                                    backgroundColor: '#ffffff'
                                                }}
                                            />
                                        </td>
                                        <td width="8%" style={{
                                            padding: '2px',
                                            fontSize: '0.75rem',
                                            textAlign: 'center',
                                            backgroundColor: '#ffffff'
                                        }}>
                                            {selectedItemForInsert ? (selectedItemForInsert.unitName || 'N/A') : '-'}

                                        </td>
                                        <td width="8%" style={{ padding: '2px', backgroundColor: '#ffffff' }}>
                                            <input
                                                type="number"
                                                className="form-control form-control-sm"
                                                placeholder="Rate"
                                                id='selectedItemRate'
                                                value={Math.round(selectedItemRate * 100) / 100}
                                                onChange={(e) => {
                                                    const newRate = parseFloat(e.target.value) || 0;
                                                    setSelectedItemRate(newRate);
                                                }}
                                                onFocus={(e) => e.target.select()}
                                                onKeyDown={(e) => {
                                                    if ((e.key === 'Tab' || e.key === 'Enter')) {
                                                        e.preventDefault();
                                                        document.getElementById('selectedItemReason').focus();
                                                    }
                                                }}
                                                style={{
                                                    height: '20px',
                                                    fontSize: '0.75rem',
                                                    padding: '0 4px',
                                                    backgroundColor: '#ffffff'
                                                }}
                                            />
                                        </td>
                                        <td width="8%" style={{ padding: '2px', backgroundColor: '#ffffff', position: 'relative' }}>
                                            <div className="position-relative" ref={activeReasonIndex === -1 ? reasonDropdownRef : null}>
                                                <input
                                                    type="text"
                                                    className="form-control form-control-sm"
                                                    placeholder="Reason"
                                                    id='selectedItemReason'
                                                    value={selectedItemReason}
                                                    readOnly
                                                    onClick={() => {
                                                        setShowReasonDropdown(true);
                                                        setActiveReasonIndex(-1);
                                                    }}
                                                    onFocus={() => {
                                                        setShowReasonDropdown(true);
                                                        setActiveReasonIndex(-1);
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                            e.preventDefault();
                                                            setShowReasonDropdown(true);
                                                            setActiveReasonIndex(-1);

                                                            // Focus the first reason item after dropdown opens
                                                            setTimeout(() => {
                                                                const firstReasonItem = document.querySelector('#reasonDropdown .dropdown-item');
                                                                if (firstReasonItem) {
                                                                    firstReasonItem.focus();
                                                                }
                                                            }, 50);
                                                        } else if (e.key === 'Tab') {
                                                            e.preventDefault();
                                                            // Allow tab to insert button even without reason
                                                            document.getElementById('insertButton')?.focus();
                                                        } else if (e.key === 'Escape') {
                                                            setShowReasonDropdown(false);
                                                            setActiveReasonIndex(-1);
                                                        } else if (e.key === 'ArrowDown' && !showReasonDropdown) {
                                                            e.preventDefault();
                                                            setShowReasonDropdown(true);
                                                            setActiveReasonIndex(-1);
                                                            setTimeout(() => {
                                                                const firstReasonItem = document.querySelector('#reasonDropdown .dropdown-item');
                                                                if (firstReasonItem) {
                                                                    firstReasonItem.focus();
                                                                }
                                                            }, 50);
                                                        }
                                                    }}
                                                    style={{
                                                        height: '20px',
                                                        fontSize: '0.75rem',
                                                        padding: '0 4px',
                                                        backgroundColor: '#ffffff',
                                                        cursor: 'pointer',
                                                        borderColor: '#ced4da' // Normal border color (not required)
                                                    }}
                                                />
                                                <small
                                                    className="position-absolute"
                                                    style={{
                                                        right: '2px',
                                                        top: '2px',
                                                        fontSize: '0.6rem',
                                                        color: '#6c757d',
                                                        pointerEvents: 'none'
                                                    }}
                                                >
                                                    ▼
                                                </small>

                                                {/* Reason Dropdown */}
                                                {showReasonDropdown && activeReasonIndex === -1 && (
                                                    <div
                                                        id="reasonDropdown"
                                                        className="dropdown-menu show"
                                                        style={{
                                                            position: 'absolute',
                                                            top: '100%',
                                                            left: 0,
                                                            width: '180px',
                                                            maxHeight: '200px',
                                                            overflowY: 'auto',
                                                            zIndex: 1050,
                                                            padding: '4px 0',
                                                            fontSize: '0.75rem',
                                                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Escape') {
                                                                e.preventDefault();
                                                                setShowReasonDropdown(false);
                                                                setActiveReasonIndex(-1);
                                                                document.getElementById('selectedItemReason')?.focus();
                                                            }
                                                        }}
                                                    >
                                                        {getReasonOptions().map((reason, idx) => (
                                                            <div
                                                                key={idx}
                                                                className="dropdown-item"
                                                                tabIndex={0}
                                                                data-index={idx}
                                                                style={{
                                                                    padding: '4px 8px',
                                                                    cursor: 'pointer',
                                                                    fontSize: '0.75rem',
                                                                    backgroundColor: selectedItemReason === reason ? '#e7f3ff' : 'transparent',
                                                                    outline: 'none'
                                                                }}
                                                                onClick={() => {
                                                                    setSelectedItemReason(reason);
                                                                    setShowReasonDropdown(false);
                                                                    setActiveReasonIndex(-1);
                                                                    // Focus on insert button after selection
                                                                    setTimeout(() => {
                                                                        document.getElementById('insertButton')?.focus();
                                                                    }, 50);
                                                                }}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        e.preventDefault();
                                                                        setSelectedItemReason(reason);
                                                                        setShowReasonDropdown(false);
                                                                        setActiveReasonIndex(-1);
                                                                        // Focus on insert button after selection
                                                                        setTimeout(() => {
                                                                            document.getElementById('insertButton')?.focus();
                                                                        }, 50);
                                                                    } else if (e.key === 'ArrowDown') {
                                                                        e.preventDefault();
                                                                        const nextElement = e.currentTarget.nextElementSibling;
                                                                        if (nextElement) {
                                                                            nextElement.focus();
                                                                        }
                                                                    } else if (e.key === 'ArrowUp') {
                                                                        e.preventDefault();
                                                                        const prevElement = e.currentTarget.previousElementSibling;
                                                                        if (prevElement) {
                                                                            prevElement.focus();
                                                                        } else {
                                                                            // If first item, go back to reason input
                                                                            document.getElementById('selectedItemReason')?.focus();
                                                                        }
                                                                    } else if (e.key === 'Escape') {
                                                                        e.preventDefault();
                                                                        setShowReasonDropdown(false);
                                                                        setActiveReasonIndex(-1);
                                                                        document.getElementById('selectedItemReason')?.focus();
                                                                    }
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    e.target.style.backgroundColor = '#0d6efd'; // Blue background on hover
                                                                    e.target.style.color = 'white';
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    e.target.style.backgroundColor = selectedItemReason === reason ? '#e7f3ff' : 'transparent';
                                                                    e.target.style.color = 'inherit';
                                                                }}
                                                                onFocus={(e) => {
                                                                    // Remove active class from all items
                                                                    document.querySelectorAll('#reasonDropdown .dropdown-item').forEach(item => {
                                                                        item.classList.remove('active');
                                                                        item.style.backgroundColor = '';
                                                                        item.style.color = '';
                                                                    });
                                                                    e.target.classList.add('active');
                                                                    e.target.style.backgroundColor = '#0d6efd'; // Blue background on focus
                                                                    e.target.style.color = 'white';
                                                                }}
                                                                onBlur={(e) => {
                                                                    if (selectedItemReason !== reason) {
                                                                        e.target.style.backgroundColor = 'transparent';
                                                                        e.target.style.color = 'inherit';
                                                                    }
                                                                }}
                                                            >
                                                                <i className={`bi ${formData.adjustmentType === 'xcess'
                                                                    ? 'bi-plus-circle'
                                                                    : 'bi-dash-circle'
                                                                    } me-2`} style={{ fontSize: '0.7rem' }}></i>
                                                                {reason}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td width="10%" style={{
                                            padding: '2px',
                                            fontSize: '0.75rem',
                                            textAlign: 'center',
                                            backgroundColor: '#ffffff'
                                        }}>
                                            Rs. {formatter.format(selectedItemQuantity * selectedItemRate)}
                                        </td>
                                        <td width="10%" style={{
                                            padding: '2px',
                                            textAlign: 'center',
                                            backgroundColor: '#ffffff'
                                        }}>
                                            <button
                                                type="button"
                                                id="insertButton"
                                                className="btn btn-sm btn-success py-0 px-2"
                                                onClick={insertSelectedItem}
                                                disabled={!selectedItemForInsert || (formData.adjustmentType === 'short' && !selectedItemForInsert?.batchInfo)}
                                                title={
                                                    !selectedItemForInsert
                                                        ? "Select an item first"
                                                        : formData.adjustmentType === 'short' && !selectedItemForInsert?.batchInfo
                                                            ? "Select batch first"
                                                            : "Insert item below"
                                                }
                                                onKeyDown={(e) => {
                                                    if ((e.key === 'Tab' || e.key === 'Enter')) {
                                                        e.preventDefault();
                                                        insertSelectedItem();
                                                    }
                                                }}
                                                style={{
                                                    height: '20px',
                                                    fontSize: '0.7rem',
                                                    fontWeight: 'bold',
                                                    backgroundColor: (!selectedItemForInsert || (formData.adjustmentType === 'short' && !selectedItemForInsert?.batchInfo))
                                                        ? '#6c757d'
                                                        : '#198754',
                                                    borderColor: (!selectedItemForInsert || (formData.adjustmentType === 'short' && !selectedItemForInsert?.batchInfo))
                                                        ? '#6c757d'
                                                        : '#198754',
                                                    cursor: (!selectedItemForInsert || (formData.adjustmentType === 'short' && !selectedItemForInsert?.batchInfo))
                                                        ? 'not-allowed'
                                                        : 'pointer'
                                                }}
                                            >
                                                INSERT
                                            </button>
                                        </td>
                                    </tr>

                                    {/* Column headers row */}
                                    <tr style={{
                                        height: '26px',
                                        backgroundColor: '#e9ecef',
                                        position: 'sticky',
                                        top: '26px',
                                        zIndex: 9
                                    }}>
                                        <th width="5%" style={{ padding: '3px', fontSize: '0.75rem' }}>S.N.</th>
                                        <th width="8%" style={{ padding: '3px', fontSize: '0.75rem' }}>#</th>
                                        <th width="8%" style={{ padding: '3px', fontSize: '0.75rem' }}>HSN</th>
                                        <th width="20%" style={{ padding: '3px', fontSize: '0.75rem' }}>Description of Goods</th>
                                        <th width="8%" style={{ padding: '3px', fontSize: '0.75rem' }}>Batch</th>
                                        <th width="8%" style={{ padding: '3px', fontSize: '0.75rem' }}>Expiry</th>
                                        <th width="8%" style={{ padding: '3px', fontSize: '0.75rem' }}>Qty</th>
                                        <th width="8%" style={{ padding: '3px', fontSize: '0.75rem' }}>Unit</th>
                                        <th width="8%" style={{ padding: '3px', fontSize: '0.75rem' }}>Rate</th>
                                        <th width="10%" style={{ padding: '3px', fontSize: '0.75rem' }}>Amount</th>
                                        <th width="8%" style={{ padding: '3px', fontSize: '0.75rem' }}>Reason</th>
                                        <th width="10%" style={{ padding: '3px', fontSize: '0.75rem' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody id="items" style={{ backgroundColor: '#fff' }}>
                                    {items.map((item, index) => (
                                        <tr key={index} className={`item ${item.vatStatus?.toLowerCase() === 'vatable' ? 'vatable-item' : 'non-vatable-item'}`} style={{ height: '26px' }}>
                                            <td style={{ padding: '3px', fontSize: '0.75rem' }}>{index + 1}</td>
                                            <td style={{ padding: '3px', fontSize: '0.75rem' }}>{item.uniqueNumber}</td>
                                            <td style={{ padding: '3px', fontSize: '0.75rem' }}>
                                                <input type="hidden" name={`items[${index}][hscode]`} value={item.hscode} />
                                                {item.hscode}
                                            </td>
                                            <td style={{ padding: '3px', fontSize: '0.75rem' }}>
                                                <input type="hidden" name={`items[${index}][itemId]`} value={item.itemId} />
                                                {item.name}
                                            </td>
                                            <td style={{ padding: '3px' }}>
                                                <input
                                                    type="text"
                                                    name={`items[${index}][batchNumber]`}
                                                    className="form-control form-control-sm"
                                                    id={`batchNumber-${index}`}
                                                    value={item.batchNumber}
                                                    onChange={(e) => updateItemField(index, 'batchNumber', e.target.value)}
                                                    required
                                                    onFocus={(e) => {
                                                        e.target.select();
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            document.getElementById(`expiryDate-${index}`)?.focus();
                                                        }
                                                    }}
                                                    style={{
                                                        height: '20px',
                                                        fontSize: '0.75rem',
                                                        padding: '0 4px'
                                                    }}
                                                />
                                            </td>
                                            <td style={{ padding: '3px' }}>
                                                <input
                                                    type="date"
                                                    name={`items[${index}][expiryDate]`}
                                                    className="form-control form-control-sm"
                                                    id={`expiryDate-${index}`}
                                                    value={item.expiryDate}
                                                    onChange={(e) => updateItemField(index, 'expiryDate', e.target.value)}
                                                    required
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            document.getElementById(`quantity-${index}`)?.focus();
                                                        }
                                                    }}
                                                    style={{
                                                        height: '20px',
                                                        fontSize: '0.75rem',
                                                        padding: '0 4px'
                                                    }}
                                                />
                                            </td>
                                            <td style={{ padding: '3px' }}>
                                                <input
                                                    type="number"
                                                    name={`items[${index}][quantity]`}
                                                    className="form-control form-control-sm"
                                                    id={`quantity-${index}`}
                                                    value={item.quantity}
                                                    onChange={(e) => updateItemField(index, 'quantity', e.target.value)}
                                                    required
                                                    onFocus={(e) => {
                                                        e.target.select();
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            document.getElementById(`puPrice-${index}`)?.focus();
                                                        }
                                                    }}
                                                    style={{
                                                        height: '20px',
                                                        fontSize: '0.75rem',
                                                        padding: '0 4px'
                                                    }}
                                                />
                                            </td>
                                            <td className="text-nowrap" style={{ padding: '3px', fontSize: '0.75rem' }}>
                                                {item.unitName}
                                                <input type="hidden" name={`items[${index}][unitId]`} value={item.unitId} />
                                            </td>
                                            <td style={{ padding: '3px' }}>
                                                <input
                                                    type="number"
                                                    name={`items[${index}][puPrice]`}
                                                    className="form-control form-control-sm"
                                                    id={`puPrice-${index}`}
                                                    value={Math.round(item.puPrice * 100) / 100}
                                                    onChange={(e) => updateItemField(index, 'puPrice', e.target.value)}
                                                    onFocus={(e) => {
                                                        e.target.select();
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            if (formData.adjustmentType === 'xcess') {
                                                                openSalesPriceModal(index);
                                                            } else {
                                                                document.getElementById(`reason-${index}`)?.focus();
                                                            }
                                                        }
                                                    }}
                                                    style={{
                                                        height: '20px',
                                                        fontSize: '0.75rem',
                                                        padding: '0 4px'
                                                    }}
                                                />
                                            </td>
                                            <td style={{ padding: '3px', position: 'relative' }}>
                                                <div className="position-relative" ref={activeReasonIndex === index ? reasonDropdownRef : null}>
                                                    <input
                                                        type="text"
                                                        name={`items[${index}][reason]`}
                                                        className="form-control form-control-sm"
                                                        id={`reason-${index}`}
                                                        value={item.reason || ''}
                                                        readOnly
                                                        placeholder="Reason"
                                                        onClick={() => {
                                                            setShowReasonDropdown(true);
                                                            setActiveReasonIndex(index);
                                                        }}
                                                        onFocus={() => {
                                                            setShowReasonDropdown(true);
                                                            setActiveReasonIndex(index);
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' || e.key === ' ') {
                                                                e.preventDefault();
                                                                setShowReasonDropdown(true);
                                                                setActiveReasonIndex(index);

                                                                // Focus the first reason item after dropdown opens
                                                                setTimeout(() => {
                                                                    const firstReasonItem = document.querySelector('#reasonDropdown-' + index + ' .dropdown-item');
                                                                    if (firstReasonItem) {
                                                                        firstReasonItem.focus();
                                                                    }
                                                                }, 50);
                                                            } else if (e.key === 'Tab') {
                                                                e.preventDefault();
                                                                if (index === items.length - 1) {
                                                                    document.getElementById('note')?.focus();
                                                                } else {
                                                                    document.getElementById(`batchNumber-${index + 1}`)?.focus();
                                                                }
                                                            } else if (e.key === 'Escape') {
                                                                setShowReasonDropdown(false);
                                                                setActiveReasonIndex(-1);
                                                            } else if (e.key === 'ArrowDown' && !showReasonDropdown) {
                                                                e.preventDefault();
                                                                setShowReasonDropdown(true);
                                                                setActiveReasonIndex(index);
                                                                setTimeout(() => {
                                                                    const firstReasonItem = document.querySelector('#reasonDropdown-' + index + ' .dropdown-item');
                                                                    if (firstReasonItem) {
                                                                        firstReasonItem.focus();
                                                                    }
                                                                }, 50);
                                                            }
                                                        }}
                                                        style={{
                                                            height: '20px',
                                                            fontSize: '0.75rem',
                                                            padding: '0 4px',
                                                            cursor: 'pointer',
                                                            backgroundColor: '#fff',
                                                            borderColor: '#ced4da' // Normal border color (not required)
                                                        }}
                                                    />
                                                    <small
                                                        className="position-absolute"
                                                        style={{
                                                            right: '2px',
                                                            top: '2px',
                                                            fontSize: '0.6rem',
                                                            color: '#6c757d',
                                                            pointerEvents: 'none'
                                                        }}
                                                    >
                                                        ▼
                                                    </small>

                                                    {/* Reason Dropdown for this row */}
                                                    {showReasonDropdown && activeReasonIndex === index && (
                                                        <div
                                                            id={`reasonDropdown-${index}`}
                                                            className="dropdown-menu show"
                                                            style={{
                                                                position: 'absolute',
                                                                top: '100%',
                                                                left: 0,
                                                                width: '180px',
                                                                maxHeight: '200px',
                                                                overflowY: 'auto',
                                                                zIndex: 1050,
                                                                padding: '4px 0',
                                                                fontSize: '0.75rem',
                                                                boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Escape') {
                                                                    e.preventDefault();
                                                                    setShowReasonDropdown(false);
                                                                    setActiveReasonIndex(-1);
                                                                    document.getElementById(`reason-${index}`)?.focus();
                                                                }
                                                            }}
                                                        >
                                                            {getReasonOptions().map((reason, idx) => (
                                                                <div
                                                                    key={idx}
                                                                    className="dropdown-item"
                                                                    tabIndex={0}
                                                                    data-index={idx}
                                                                    style={{
                                                                        padding: '4px 8px',
                                                                        cursor: 'pointer',
                                                                        fontSize: '0.75rem',
                                                                        backgroundColor: item.reason === reason ? '#e7f3ff' : 'transparent',
                                                                        outline: 'none'
                                                                    }}
                                                                    onClick={() => {
                                                                        updateItemField(index, 'reason', reason);
                                                                        setShowReasonDropdown(false);
                                                                        setActiveReasonIndex(-1);
                                                                        // Focus on next field after selection
                                                                        setTimeout(() => {
                                                                            if (index === items.length - 1) {
                                                                                document.getElementById('note')?.focus();
                                                                            } else {
                                                                                document.getElementById(`batchNumber-${index + 1}`)?.focus();
                                                                            }
                                                                        }, 50);
                                                                    }}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') {
                                                                            e.preventDefault();
                                                                            updateItemField(index, 'reason', reason);
                                                                            setShowReasonDropdown(false);
                                                                            setActiveReasonIndex(-1);
                                                                            // Focus on next field after selection
                                                                            setTimeout(() => {
                                                                                if (index === items.length - 1) {
                                                                                    document.getElementById('note')?.focus();
                                                                                } else {
                                                                                    document.getElementById(`batchNumber-${index + 1}`)?.focus();
                                                                                }
                                                                            }, 50);
                                                                        } else if (e.key === 'ArrowDown') {
                                                                            e.preventDefault();
                                                                            const nextElement = e.currentTarget.nextElementSibling;
                                                                            if (nextElement) {
                                                                                nextElement.focus();
                                                                            }
                                                                        } else if (e.key === 'ArrowUp') {
                                                                            e.preventDefault();
                                                                            const prevElement = e.currentTarget.previousElementSibling;
                                                                            if (prevElement) {
                                                                                prevElement.focus();
                                                                            } else {
                                                                                // If first item, go back to reason input
                                                                                document.getElementById(`reason-${index}`)?.focus();
                                                                            }
                                                                        } else if (e.key === 'Escape') {
                                                                            e.preventDefault();
                                                                            setShowReasonDropdown(false);
                                                                            setActiveReasonIndex(-1);
                                                                            document.getElementById(`reason-${index}`)?.focus();
                                                                        }
                                                                    }}
                                                                    onMouseEnter={(e) => {
                                                                        e.target.style.backgroundColor = '#0d6efd'; // Blue background on hover
                                                                        e.target.style.color = 'white';
                                                                    }}
                                                                    onMouseLeave={(e) => {
                                                                        e.target.style.backgroundColor = item.reason === reason ? '#e7f3ff' : 'transparent';
                                                                        e.target.style.color = 'inherit';
                                                                    }}
                                                                    onFocus={(e) => {
                                                                        // Remove active class from all items
                                                                        document.querySelectorAll(`#reasonDropdown-${index} .dropdown-item`).forEach(item => {
                                                                            item.classList.remove('active');
                                                                            item.style.backgroundColor = '';
                                                                            item.style.color = '';
                                                                        });
                                                                        e.target.classList.add('active');
                                                                        e.target.style.backgroundColor = '#0d6efd'; // Blue background on focus
                                                                        e.target.style.color = 'white';
                                                                    }}
                                                                    onBlur={(e) => {
                                                                        if (item.reason !== reason) {
                                                                            e.target.style.backgroundColor = 'transparent';
                                                                            e.target.style.color = 'inherit';
                                                                        }
                                                                    }}
                                                                >
                                                                    <i className={`bi ${formData.adjustmentType === 'xcess'
                                                                        ? 'bi-plus-circle'
                                                                        : 'bi-dash-circle'
                                                                        } me-2`} style={{ fontSize: '0.7rem' }}></i>
                                                                    {reason}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="item-amount" style={{ padding: '3px', fontSize: '0.75rem' }}>{formatter.format(item.amount)}</td>
                                            <td className="text-center" style={{ padding: '2px', whiteSpace: 'nowrap' }}>
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-danger py-0 px-1"
                                                    onClick={() => removeItem(index)}
                                                    style={{
                                                        height: '18px',
                                                        width: '18px',
                                                        minWidth: '18px',
                                                        fontSize: '0.6rem',
                                                        marginLeft: '2px',
                                                        backgroundColor: '#dc3545',
                                                        borderColor: '#dc3545'
                                                    }}
                                                >
                                                    <i className="bi bi-trash"></i>
                                                </button>
                                            </td>
                                            <td className="d-none">
                                                <input type="hidden" name={`items[${index}][vatStatus]`} value={item.vatStatus} />
                                                <input type="hidden" name={`items[${index}][price]`} value={item.price} />
                                                <input type="hidden" name={`items[${index}][uniqueUuid]`} value={item.uniqueUuid} />
                                                <input type="hidden" name={`items[${index}][mrp]`} value={item.mrp} />
                                            </td>
                                        </tr>
                                    ))}

                                    {/* Empty rows placeholder when no items */}
                                    {items.length === 0 && (
                                        <tr style={{ height: '24px' }}>
                                            <td colSpan="11" className="text-center text-muted py-1" style={{ fontSize: '0.75rem' }}>
                                                No items added yet. Use the search box above to add items.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Totals Section */}
                        <div className="table-responsive mb-2">
                            <table className="table table-sm table-bordered mb-1">
                                <thead>
                                    <tr>
                                        <th colSpan="6" className="text-center bg-light py-1" style={{ padding: '2px' }}>Adjustment Details</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td style={{ width: '15%', padding: '1px' }}>
                                            <label className="form-label mb-0" style={{ fontSize: '0.8rem' }}>Sub Total:</label>
                                        </td>
                                        <td style={{ width: '20%', padding: '1px' }}>
                                            <p className="form-control-plaintext mb-0" style={{ fontSize: '0.8rem' }}>Rs. {totals.subTotal.toFixed(2)}</p>
                                        </td>
                                        <td colSpan="4"></td>
                                    </tr>

                                    {company.vatEnabled && formData.isVatExempt !== 'true' && (
                                        <>
                                            <tr id="taxableAmountRow">
                                                <td style={{ padding: '1px' }}>
                                                    <label className="form-label mb-0" style={{ fontSize: '0.8rem' }}>Taxable Amount:</label>
                                                </td>
                                                <td style={{ padding: '1px' }}>
                                                    <p className="form-control-plaintext mb-0" style={{ fontSize: '0.8rem' }}>Rs. {totals.taxableAmount.toFixed(2)}</p>
                                                </td>
                                                <td style={{ padding: '1px' }}>
                                                    <label className="form-label mb-0" style={{ fontSize: '0.8rem' }}>VAT %:</label>
                                                </td>
                                                <td style={{ padding: '1px' }}>
                                                    <div className="position-relative">
                                                        <input
                                                            type="number"
                                                            name="vatPercentage"
                                                            id="vatPercentage"
                                                            className="form-control form-control-sm"
                                                            value={formData.vatPercentage}
                                                            readOnly
                                                            onFocus={(e) => {
                                                                e.target.select();
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    handleKeyDown(e, 'vatPercentage');
                                                                }
                                                            }}
                                                            style={{
                                                                height: '22px',
                                                                fontSize: '0.875rem',
                                                                paddingTop: '0.5rem',
                                                                width: '100%',
                                                                backgroundColor: '#f8f9fa'
                                                            }}
                                                        />
                                                    </div>
                                                </td>
                                                <td style={{ padding: '1px' }}>
                                                    <label className="form-label mb-0" style={{ fontSize: '0.8rem' }}>VAT Amount:</label>
                                                </td>
                                                <td style={{ padding: '1px' }}>
                                                    <p className="form-control-plaintext mb-0" style={{ fontSize: '0.8rem' }}>Rs. {totals.vatAmount.toFixed(2)}</p>
                                                </td>
                                            </tr>
                                        </>
                                    )}
                                    {company.vatEnabled && formData.isVatExempt === 'true' && (
                                        <td colSpan="4"></td>
                                    )}
                                    <tr>
                                        <td style={{ padding: '1px' }}>
                                            <label className="form-label mb-0" style={{ fontSize: '0.8rem' }}>Total Amount:</label>
                                        </td>
                                        <td style={{ padding: '1px' }}>
                                            <p className="form-control-plaintext mb-0" style={{ fontSize: '0.8rem' }}>Rs. {totals.totalAmount.toFixed(2)}</p>
                                        </td>
                                        <td style={{ padding: '1px' }}>
                                            <label className="form-label mb-0" style={{ fontSize: '0.8rem' }}>In Words:</label>
                                        </td>
                                        <td colSpan="3" style={{ padding: '1px' }}>
                                            <div
                                                className="form-control-plaintext mb-0"
                                                style={{
                                                    fontSize: '0.7rem',
                                                    lineHeight: '1.1',
                                                    maxHeight: '44px',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical',
                                                    wordBreak: 'break-word',
                                                    whiteSpace: 'normal'
                                                }}
                                                id="amountInWords"
                                                title={convertToRupeesAndPaisa(totals.totalAmount) + " Only."}
                                            >
                                                {convertToRupeesAndPaisa(totals.totalAmount)} Only.
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Description and Action Buttons */}
                        <div className="row g-2 mb-2">
                            <div className="col-12 col-md-8">
                                <div className="position-relative">
                                    <input
                                        type="text"
                                        className="form-control form-control-sm"
                                        id="note"
                                        name="note"
                                        value={formData.note}
                                        onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                                        placeholder="add note"
                                        autoComplete='off'
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                document.getElementById('saveBill')?.focus();
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
                                        Description:
                                    </label>
                                </div>
                            </div>
                            <div className="col-12 col-md-4">
                                <div className="d-flex justify-content-between align-items-center gap-2">
                                    <div className="form-check mb-0 d-flex align-items-center">
                                        <input
                                            className="form-check-input mt-0"
                                            type="checkbox"
                                            id="printAfterSave"
                                            checked={printAfterSave}
                                            onChange={handlePrintAfterSaveChange}
                                            style={{
                                                height: '14px',
                                                width: '14px'
                                            }}
                                        />
                                        <label
                                            className="form-check-label ms-2"
                                            htmlFor="printAfterSave"
                                            style={{
                                                fontSize: '0.8rem',
                                                marginBottom: '0'
                                            }}
                                        >
                                            Print after save
                                        </label>
                                    </div>

                                    <div className="d-flex gap-2">
                                        <button
                                            type="button"
                                            className="btn btn-secondary btn-sm d-flex align-items-center"
                                            onClick={handleManualReset}
                                            disabled={isSaving}
                                            style={{
                                                height: '26px',
                                                padding: '0 12px',
                                                fontSize: '0.8rem',
                                                fontWeight: '500'
                                            }}
                                        >
                                            <i className="bi bi-arrow-counterclockwise me-1" style={{ fontSize: '0.9rem' }}></i> Reset
                                        </button>
                                        <button
                                            type="submit"
                                            className="btn btn-primary btn-sm d-flex align-items-center"
                                            id="saveBill"
                                            disabled={isSaving}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    handleSubmit(e, printAfterSave);
                                                }
                                            }}
                                            style={{
                                                height: '26px',
                                                padding: '0 16px',
                                                fontSize: '0.8rem',
                                                fontWeight: '500'
                                            }}
                                        >
                                            {isSaving ? (
                                                <>
                                                    <span
                                                        className="spinner-border spinner-border-sm me-2"
                                                        role="status"
                                                        aria-hidden="true"
                                                        style={{ width: '10px', height: '10px' }}
                                                    ></span>
                                                    Saving...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="bi bi-save me-1" style={{ fontSize: '0.9rem' }}></i> Save
                                                </>
                                            )}
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-warning btn-sm d-flex align-items-center"
                                            onClick={(e) => handleSubmit(e, true)}
                                            disabled={isSaving}
                                            style={{
                                                height: '26px',
                                                padding: '0 12px',
                                                fontSize: '0.8rem',
                                                fontWeight: '500'
                                            }}
                                        >
                                            <i className="bi bi-printer me-1" style={{ fontSize: '0.9rem' }}></i> Print
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            {/* Sales Price Modal */}
            {showSalesPriceModal && (
                <div className="modal fade show" id="setSalesPriceModal" tabIndex="-1" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header py-1">
                                <h5 className="modal-title" id="setSalesPriceModalLabel">Set Sales Price for New Batch</h5>
                                <button type="button" className="btn-close" onClick={() => setShowSalesPriceModal(false)}></button>
                            </div>
                            <div className="modal-body">
                                <div className="row">
                                    <div className="col">
                                        <label htmlFor="prevPuPrice" className="form-label">Prev. Price</label>
                                        <input
                                            type="number"
                                            className="form-control form-control-sm"
                                            id="prevPuPrice"
                                            step="any"
                                            value={salesPriceData.prevPuPrice || ''}
                                            readOnly
                                        />
                                    </div>
                                    <div className="col">
                                        <label htmlFor="puPrice" className="form-label">New Price</label>
                                        <input
                                            type="number"
                                            className="form-control form-control-sm"
                                            id="puPrice"
                                            step="any"
                                            value={salesPriceData.puPrice}
                                            readOnly
                                        />
                                    </div>
                                </div>
                                <div className="mb-3">
                                    <label htmlFor="marginPercentage" className="form-label">Margin Percentage (%)</label>
                                    <input
                                        type="number"
                                        className="form-control form-control-sm"
                                        id="marginPercentage"
                                        min="0"
                                        step="any"
                                        value={Math.round(salesPriceData.marginPercentage * 100) / 100}
                                        onFocus={(e) => {
                                            e.target.select();
                                        }}
                                        onChange={(e) => {
                                            const margin = parseFloat(e.target.value) || 0;
                                            const puPrice = parseFloat(salesPriceData.puPrice) || 0;
                                            const salesPrice = puPrice + (puPrice * margin / 100);

                                            setSalesPriceData({
                                                ...salesPriceData,
                                                marginPercentage: margin,
                                                salesPrice: parseFloat(salesPrice.toFixed(2))
                                            });
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                document.getElementById('currency')?.focus();
                                            }
                                        }}
                                        ref={marginPercentageRef}
                                    />
                                </div>
                                <div className="mb-3">
                                    <label htmlFor="currency" className="form-label">Currency</label>
                                    <select
                                        className="form-select form-select-sm"
                                        id="currency"
                                        value={salesPriceData.currency}
                                        onChange={(e) => setSalesPriceData({ ...salesPriceData, currency: e.target.value })}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                document.getElementById('mrp')?.focus();
                                            }
                                        }}
                                    >
                                        <option value="NPR">NPR</option>
                                        <option value="INR">INR</option>
                                    </select>
                                </div>
                                <div className="mb-3">
                                    <label htmlFor="mrp" className="form-label">MRP</label>
                                    <input
                                        type="number"
                                        className="form-control form-control-sm"
                                        id="mrp"
                                        step="any"
                                        value={salesPriceData.mrp}
                                        onFocus={(e) => {
                                            e.target.select();
                                        }}
                                        onChange={(e) => {
                                            const mrp = parseFloat(e.target.value) || 0;
                                            const salesPrice = salesPriceData.currency === 'INR' ? mrp * 1.6 : mrp;
                                            const margin = ((salesPrice - salesPriceData.puPrice) / salesPriceData.puPrice) * 100;
                                            setSalesPriceData({
                                                ...salesPriceData,
                                                mrp: mrp,
                                                salesPrice: salesPrice,
                                                marginPercentage: margin
                                            });
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                document.getElementById('salesPrice')?.focus();
                                            }
                                        }}
                                    />
                                </div>
                                <div className="mb-3">
                                    <label htmlFor="salesPrice" className="form-label">Sales Price</label>
                                    <input
                                        type="number"
                                        className="form-control form-control-sm"
                                        id="salesPrice"
                                        step="any"
                                        value={Math.round(salesPriceData.salesPrice * 100) / 100}
                                        onFocus={(e) => {
                                            e.target.select();
                                        }}
                                        onChange={(e) => {
                                            const salesPrice = parseFloat(e.target.value) || 0;
                                            const margin = ((salesPrice - salesPriceData.puPrice) / salesPriceData.puPrice) * 100;
                                            setSalesPriceData({
                                                ...salesPriceData,
                                                salesPrice: salesPrice,
                                                marginPercentage: margin
                                            });
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                document.getElementById('saveSalesPrice')?.focus();
                                            }
                                        }}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="modal-footer py-1">
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    id='saveSalesPriceClose'
                                    onClick={() => setShowSalesPriceModal(false)}
                                >
                                    Close
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary btn-sm"
                                    id='saveSalesPrice'
                                    onClick={() => {
                                        saveSalesPrice();
                                    }}
                                >
                                    Save Sales Price
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Batch Modal - Only show for "short" adjustment type */}
            {showBatchModal && selectedItemForBatch && formData.adjustmentType === 'short' && (
                <div className="modal fade show" id="batchModal" tabIndex="-1" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content" style={{ borderRadius: '8px', overflow: 'hidden', minHeight: '200px' }}>
                            <div className="modal-header py-0" style={{ backgroundColor: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
                                <h5 className="modal-title mb-0 mx-auto fw-semibold" style={{ fontSize: '1.1rem' }}>
                                    <i className="bi bi-box-seam me-2"></i>
                                    {selectedItemForInsert === selectedItemForBatch
                                        ? "Select Batch for Insertion"
                                        : "Batch Information: " + selectedItemForBatch.name}
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close position-absolute"
                                    style={{ right: '1rem', top: '0.25rem' }}
                                    onClick={() => {
                                        setShowBatchModal(false);
                                        setSelectedItemForBatch(null);
                                        if (selectedItemForInsert === selectedItemForBatch) {
                                            setSelectedItemForInsert(null);
                                            setTimeout(() => {
                                                const searchInput = document.getElementById('headerItemSearch');
                                                if (searchInput) {
                                                    searchInput.focus();
                                                    searchInput.select();
                                                }
                                            }, 100);
                                        }
                                    }}
                                    aria-label="Close"
                                ></button>
                            </div>
                            <div className="modal-body p-0" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                                {selectedItemForBatch.stockEntries && selectedItemForBatch.stockEntries.every(entry => entry.quantity === 0) ? (
                                    <div className="d-flex justify-content-center align-items-center py-2">
                                        <div className="alert alert-warning d-flex align-items-center py-2 px-3 mb-0 w-75 text-center">
                                            <i className="bi bi-exclamation-triangle-fill me-2"></i>
                                            <span>Out of stock</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="table-responsive" style={{
                                        maxHeight: 'calc(55vh - 110px)',
                                        overflowY: 'auto'
                                    }} id="batchTableContainer">
                                        <table className="table table-sm table-hover mb-0">
                                            <thead className="table-light" style={{
                                                position: 'sticky',
                                                top: 0,
                                                zIndex: 1,
                                                backgroundColor: '#f8f9fa'
                                            }}>
                                                <tr className="text-center">
                                                    <th className="py-0" style={{ padding: '0px', fontSize: '0.75rem' }}>Batch No.</th>
                                                    <th className="py-0" style={{ padding: '0px', fontSize: '0.75rem' }}>Expiry Date</th>
                                                    <th className="py-0" style={{ padding: '0px', fontSize: '0.75rem' }}>Stock</th>
                                                    <th className="py-0" style={{ padding: '0px', fontSize: '0.75rem' }}>S.P</th>
                                                    <th className="py-0" style={{ padding: '0px', fontSize: '0.75rem' }}>C.P</th>
                                                    <th className="py-0" style={{ padding: '0px', fontSize: '0.75rem' }}>%</th>
                                                    <th className="py-0" style={{ padding: '0px', fontSize: '0.75rem' }}>MRP</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedItemForBatch.stockEntries
                                                    .filter(entry => entry.quantity > 0)
                                                    .map((entry, index) => (
                                                        <tr
                                                            key={index}
                                                            className={`batch-row text-center ${index === 0 ? 'bg-primary text-white' : ''}`}
                                                            style={{
                                                                height: '24px',
                                                                cursor: 'pointer',
                                                                fontSize: '0.75rem'
                                                            }}
                                                            onClick={() => {
                                                                handleBatchRowClick({
                                                                    batchNumber: entry.batchNumber,
                                                                    expiryDate: entry.expiryDate,
                                                                    price: entry.price,
                                                                    puPrice: entry.puPrice,
                                                                    uniqueUuid: entry.uniqueUuid
                                                                });
                                                            }}
                                                            tabIndex={0}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    handleBatchRowClick({
                                                                        batchNumber: entry.batchNumber,
                                                                        expiryDate: entry.expiryDate,
                                                                        price: entry.price,
                                                                        puPrice: entry.puPrice,
                                                                        uniqueUuid: entry.uniqueUuid
                                                                    });
                                                                } else if (e.key === 'ArrowDown') {
                                                                    e.preventDefault();
                                                                    const nextRow = e.currentTarget.nextElementSibling;
                                                                    if (nextRow) {
                                                                        e.currentTarget.classList.remove('bg-primary', 'text-white');
                                                                        nextRow.classList.add('bg-primary', 'text-white');
                                                                        nextRow.focus();
                                                                    }
                                                                } else if (e.key === 'ArrowUp') {
                                                                    e.preventDefault();
                                                                    const prevRow = e.currentTarget.previousElementSibling;
                                                                    if (prevRow) {
                                                                        e.currentTarget.classList.remove('bg-primary', 'text-white');
                                                                        prevRow.classList.add('bg-primary', 'text-white');
                                                                        prevRow.focus();
                                                                    } else {
                                                                        e.currentTarget.focus();
                                                                    }
                                                                } else if (e.key === 'Escape') {
                                                                    e.preventDefault();
                                                                    setShowBatchModal(false);
                                                                    setSelectedItemForBatch(null);
                                                                }
                                                            }}
                                                            onFocus={(e) => {
                                                                document.querySelectorAll('.batch-row').forEach(row => {
                                                                    row.classList.remove('bg-primary', 'text-white');
                                                                });
                                                                e.currentTarget.classList.add('bg-primary', 'text-white');
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                document.querySelectorAll('.batch-row').forEach(row => {
                                                                    row.classList.remove('bg-primary', 'text-white');
                                                                });
                                                                e.currentTarget.classList.add('bg-primary', 'text-white');
                                                            }}
                                                        >
                                                            <td className="align-middle" style={{ padding: '3px' }}>{entry.batchNumber || 'N/A'}</td>
                                                            <td className="align-middle" style={{ padding: '3px' }}>{formatDateForInput(entry.expiryDate)}</td>
                                                            <td className="align-middle fw-semibold" style={{ padding: '3px' }}>
                                                                {entry.quantity}
                                                            </td>
                                                            <td className="align-middle" style={{ padding: '3px' }}>{Math.round(entry.price * 100) / 100}</td>
                                                            <td className="align-middle" style={{ padding: '3px' }}>{Math.round(entry.puPrice * 100) / 100}</td>
                                                            <td className="align-middle" style={{ padding: '3px' }}>{Math.round(entry.marginPercentage * 100) / 100}</td>
                                                            <td className="align-middle" style={{ padding: '3px' }}>{Math.round(entry.mrp * 100) / 100}</td>
                                                        </tr>
                                                    ))
                                                }
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            <div className="modal-footer py-0 justify-content-center" style={{
                                backgroundColor: '#f8f9fa',
                                borderTop: '1px solid #dee2e6',
                            }}>
                                <button
                                    type="button"
                                    className="btn btn-primary btn-sm py-1 px-3 d-flex align-items-center"
                                    onClick={() => {
                                        setShowBatchModal(false);
                                        setSelectedItemForBatch(null);
                                        if (selectedItemForInsert === selectedItemForBatch) {
                                            setSelectedItemForInsert(null);
                                            setTimeout(() => {
                                                const searchInput = document.getElementById('headerItemSearch');
                                                if (searchInput) {
                                                    searchInput.focus();
                                                    searchInput.select();
                                                }
                                            }, 100);
                                        }
                                    }}
                                    style={{
                                        fontSize: '0.8rem',
                                        lineHeight: '1.2',
                                        minHeight: '28px'
                                    }}
                                >
                                    <i className="bi bi-x-circle me-1"></i>
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Header Item Modal */}
            {showHeaderItemModal && (
                <div
                    className="modal fade show"
                    id="headerItemModal"
                    tabIndex="-1"
                    style={{
                        display: 'block',
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 1050
                    }}
                >
                    <div
                        className="modal-dialog modal-xl"
                        style={{
                            position: 'absolute',
                            top: 'auto',
                            bottom: '0',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            margin: '0',
                            width: '90%',
                            maxWidth: '90%'
                        }}
                    >
                        <div
                            className="modal-content"
                            style={{
                                height: '35vh',
                                borderBottomLeftRadius: '0',
                                borderBottomRightRadius: '0',
                                borderTopLeftRadius: '0.5rem',
                                borderTopRightRadius: '0.5rem'
                            }}
                        >
                            <div className="modal-header py-0">
                                <h5 className="modal-title" style={{ fontSize: '0.9rem' }}>Select Item</h5>
                                <div className="d-flex align-items-center" style={{ flex: 1, marginLeft: '10px' }}>
                                    <div className="position-relative" style={{ width: '100%' }}>
                                        <input
                                            type="text"
                                            className="form-control form-control-sm"
                                            placeholder="Search items... (Press F6 to create new item)"
                                            autoComplete='off'
                                            value={headerSearchQuery}
                                            onChange={(e) => {
                                                const query = e.target.value;
                                                setHeaderSearchQuery(query);
                                                if (query.trim() !== '' && headerShouldShowLastSearchResults) {
                                                    setHeaderShouldShowLastSearchResults(false);
                                                    setHeaderLastSearchQuery('');
                                                }
                                            }}
                                            autoFocus
                                            onKeyDown={(e) => {
                                                if (e.key === 'ArrowDown') {
                                                    e.preventDefault();
                                                    const firstItem = document.querySelector('.dropdown-item');
                                                    if (firstItem) {
                                                        firstItem.focus();
                                                    }
                                                } else if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    const activeItem = document.querySelector('.dropdown-item.active');

                                                    if (activeItem) {
                                                        const index = parseInt(activeItem.getAttribute('data-index'));
                                                        const itemToAdd = headerSearchResults[index];
                                                        if (itemToAdd) {
                                                            selectItemForInsert(itemToAdd);
                                                            setShowHeaderItemModal(false);
                                                        }
                                                    } else {
                                                        if (!headerSearchQuery.trim()) {
                                                            setShowHeaderItemModal(false);
                                                            setTimeout(() => {
                                                                document.getElementById('note')?.focus();
                                                            }, 50);
                                                        }
                                                    }
                                                } else if (e.key === 'F6') {
                                                    e.preventDefault();
                                                    setShowProductModal(true);
                                                    setShowHeaderItemModal(false);
                                                } else if (e.key === 'Escape') {
                                                    e.preventDefault();
                                                    setShowHeaderItemModal(false);
                                                }
                                            }}
                                            style={{
                                                height: '24px',
                                                fontSize: '0.75rem',
                                                padding: '0.25rem 0.5rem',
                                                width: '100%'
                                            }}
                                        />
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={handleHeaderItemModalClose}
                                    aria-label="Close"
                                    style={{ fontSize: '0.6rem', padding: '0.25rem' }}
                                ></button>
                            </div>

                            <div className="modal-body p-0">
                                <div style={{ height: 'calc(55vh - 120px)' }}>
                                    <div
                                        id="dropdownMenu"
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

                                        {(headerSearchResults.length > 0 || (headerShouldShowLastSearchResults && headerSearchResults.length > 0)) ? (
                                            <VirtualizedItemListForPurchase
                                                items={headerSearchResults}
                                                onItemClick={(item) => {
                                                    selectItemForInsert(item);
                                                    setShowHeaderItemModal(false);
                                                }}
                                                searchRef={{ current: document.querySelector('#headerItemModal input[type="text"]') }}
                                                hasMore={hasMoreHeaderSearchResults}
                                                isSearching={isHeaderSearching}
                                                onLoadMore={loadMoreHeaderSearchItems}
                                                totalItems={totalHeaderSearchItems}
                                                page={headerSearchPage}
                                                searchQuery={headerShouldShowLastSearchResults ? headerLastSearchQuery : headerSearchQuery}
                                                setNotification={setNotification}
                                            />
                                        ) : (
                                            <div className="text-center py-3 text-muted" style={{ fontSize: '0.75rem' }}>
                                                {headerSearchQuery ? 'No items found' : 'Type to search items'}
                                                <div className="small mt-1">
                                                    <small className="text-info">Press F6 to create a new item</small>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <NotificationToast
                show={notification.show}
                message={notification.message}
                type={notification.type}
                onClose={() => setNotification({ ...notification, show: false })}
            />

            {/* Product modal */}
            {showProductModal && (
                <ProductModal onClose={() => setShowProductModal(false)} />
            )}
        </div>
    );
};

function convertToRupeesAndPaisa(amount) {
    const rupees = Math.floor(amount);
    const paisa = Math.round((amount - rupees) * 100);

    let words = '';

    if (rupees > 0) {
        words += numberToWords(rupees) + ' Rupees';
    }

    if (paisa > 0) {
        words += (rupees > 0 ? ' and ' : '') + numberToWords(paisa) + ' Paisa';
    }

    return words || 'Zero Rupees';
}

function numberToWords(num) {
    const ones = [
        '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
        'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
        'Seventeen', 'Eighteen', 'Nineteen'
    ];

    const tens = [
        '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
    ];

    const scales = ['', 'Thousand', 'Million', 'Billion'];

    function convertHundreds(num) {
        let words = '';

        if (num > 99) {
            words += ones[Math.floor(num / 100)] + ' Hundred ';
            num %= 100;
        }

        if (num > 19) {
            words += tens[Math.floor(num / 10)] + ' ';
            num %= 10;
        }

        if (num > 0) {
            words += ones[num] + ' ';
        }

        return words.trim();
    }

    if (num === 0) return 'Zero';
    if (num < 0) return 'Negative ' + numberToWords(Math.abs(num));

    let words = '';

    for (let i = 0; i < scales.length; i++) {
        let unit = Math.pow(1000, scales.length - i - 1);
        let currentNum = Math.floor(num / unit);

        if (currentNum > 0) {
            words += convertHundreds(currentNum) + ' ' + scales[scales.length - i - 1] + ' ';
        }

        num %= unit;
    }

    return words.trim();
}

export default AddStockAdjustment;