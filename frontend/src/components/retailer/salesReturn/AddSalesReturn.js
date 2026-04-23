
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import NepaliDate from 'nepali-date-converter';
import axios from 'axios';
import Header from '../Header';
import NotificationToast from '../../NotificationToast';
import { usePageNotRefreshContext } from '../PageNotRefreshContext';
import '../../../stylesheet/noDateIcon.css'
import ProductModal from '../dashboard/modals/ProductModal';
import AccountBalanceDisplay from '../payment/AccountBalanceDisplay';
import useDebounce from '../../../hooks/useDebounce';
import VirtualizedItemListForSales from '../../VirtualizedItemListForSales';
import VirtualizedAccountList from '../../VirtualizedAccountList';
import BatchSelectionModal from './BatchSelectionModal'; // You'll need to create this component

const AddSalesReturn = () => {
    const { draftCreditSalesReturnSave, setDraftCreditSalesReturnSave, clearCreditSalesReturnDraft } = usePageNotRefreshContext();
    const navigate = useNavigate();

    // Account search states
    const [isAccountSearching, setIsAccountSearching] = useState(false);
    const [accountSearchResults, setAccountSearchResults] = useState([]);
    const [accountSearchPage, setAccountSearchPage] = useState(1);
    const [hasMoreAccountResults, setHasMoreAccountResults] = useState(false);
    const [totalAccounts, setTotalAccounts] = useState(0);
    const [accountSearchQuery, setAccountSearchQuery] = useState('');
    const [accountLastSearchQuery, setAccountLastSearchQuery] = useState('');
    const [accountShouldShowLastSearchResults, setAccountShouldShowLastSearchResults] = useState(false);
    const [roundOffSalesReturn, setRoundOffSalesReturn] = useState(false);
    const [manualRoundOffOverride, setManualRoundOffOverride] = useState(false);
    // Item search states
    const [searchQuery, setSearchQuery] = useState('');
    const [lastSearchQuery, setLastSearchQuery] = useState('');
    const [shouldShowLastSearchResults, setShouldShowLastSearchResults] = useState(false);
    const debouncedSearchQuery = useDebounce(searchQuery, 500);

    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [searchPage, setSearchPage] = useState(1);
    const [hasMoreSearchResults, setHasMoreSearchResults] = useState(false);
    const [totalSearchItems, setTotalSearchItems] = useState(0);

    // Header search states
    const [headerSearchQuery, setHeaderSearchQuery] = useState('');
    const [showHeaderItemModal, setShowHeaderItemModal] = useState(false);
    const [selectedItemForInsert, setSelectedItemForInsert] = useState(null);

    // New state for batch selection modal
    const [showBatchSelectionModal, setShowBatchSelectionModal] = useState(false);
    const [selectedItemStockEntries, setSelectedItemStockEntries] = useState([]);
    const [selectedItemForBatch, setSelectedItemForBatch] = useState(null);
    const [selectedBatchEntry, setSelectedBatchEntry] = useState(null);

    // Old header item states (keeping for backward compatibility but will be deprecated)
    const [selectedItemQuantity, setSelectedItemQuantity] = useState(0);
    const [selectedItemRate, setSelectedItemRate] = useState(0);
    const [selectedItemBatchNumber, setSelectedItemBatchNumber] = useState('');
    const [selectedItemExpiryDate, setSelectedItemExpiryDate] = useState('');

    const [headerLastSearchQuery, setHeaderLastSearchQuery] = useState('');
    const [headerShouldShowLastSearchResults, setHeaderShouldShowLastSearchResults] = useState(false);
    const [isHeaderSearching, setIsHeaderSearching] = useState(false);
    const [headerSearchResults, setHeaderSearchResults] = useState([]);
    const [headerSearchPage, setHeaderSearchPage] = useState(1);
    const [hasMoreHeaderSearchResults, setHasMoreHeaderSearchResults] = useState(false);
    const [totalHeaderSearchItems, setTotalHeaderSearchItems] = useState(0);

    const itemsTableRef = useRef(null);
    const [transactionSettings, setTransactionSettings] = useState({
        displayTransactions: false,
        displayTransactionsForPurchase: false,
        displayTransactionsForSalesReturn: false,
        displayTransactionsForPurchaseReturn: false
    });
    const [showItemsModal, setShowItemsModal] = useState(false);
    const [showAccountCreationModal, setShowAccountCreationModal] = useState(false);
    const [showProductModal, setShowProductModal] = useState(false);
    const [printAfterSave, setPrintAfterSave] = useState(
        localStorage.getItem('printAfterSaveSalesReturn') === 'true' || false
    );
    const continueButtonRef = useRef(null);
    const [transactionCache, setTransactionCache] = useState(new Map());
    const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
    const transactionDateRef = useRef(null);
    const [isInitialDataLoaded, setIsInitialDataLoaded] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [loadingItems, setLoadingItems] = useState(new Set());
    const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
    const [notification, setNotification] = useState({
        show: false,
        message: '',
        type: 'success'
    });
    const [dateErrors, setDateErrors] = useState({
        transactionDateNepali: '',
        nepaliDate: ''
    });

    const [formData, setFormData] = useState(draftCreditSalesReturnSave?.formData || {
        accountId: '',
        accountName: '',
        accountAddress: '',
        accountPan: '',
        transactionDateNepali: new NepaliDate(currentNepaliDate).format('YYYY-MM-DD'),
        transactionDateRoman: new Date().toISOString().split('T')[0],
        nepaliDate: new NepaliDate(currentNepaliDate).format('YYYY-MM-DD'),
        billDate: new Date().toISOString().split('T')[0],
        billNumber: '',
        paymentMode: 'credit',
        isVatExempt: 'all',
        discountPercentage: 0,
        discountAmount: 0,
        roundOffAmount: 0,
        vatPercentage: 13,
        salesInvoiceNumber: '',
        items: []
    });

    const [items, setItems] = useState(draftCreditSalesReturnSave?.items || []);
    const [salesInvoiceData, setSalesInvoiceData] = useState(null);
    const [salesInvoiceLoading, setSalesInvoiceLoading] = useState(false);
    const [accounts, setAccounts] = useState([]);
    const [showAccountModal, setShowAccountModal] = useState(false);
    const [showItemDropdown, setShowItemDropdown] = useState(false);
    const [showTransactionModal, setShowTransactionModal] = useState(false);
    const [transactions, setTransactions] = useState([]);
    const itemDropdownRef = useRef(null);
    const [company, setCompany] = useState({
        dateFormat: 'nepali',
        vatEnabled: true,
        fiscalYear: {}
    });
    const [nextBillNumber, setNextBillNumber] = useState('');
    const [categories, setCategories] = useState([]);
    const [units, setUnits] = useState([]);
    const [companyGroups, setCompanyGroups] = useState([]);

    const accountSearchRef = useRef(null);
    const itemSearchRef = useRef(null);
    const accountModalRef = useRef(null);
    const transactionModalRef = useRef(null);

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

    // Fetch accounts from backend
    const fetchAccountsFromBackend = async (searchTerm = '', page = 1) => {
        try {
            setIsAccountSearching(true);

            const response = await api.get('/api/retailer/accounts/search', {
                params: {
                    search: searchTerm,
                    page: page,
                    limit: searchTerm.trim() ? 15 : 25,
                }
            });

            if (response.data.success) {
                if (page === 1) {
                    setAccountSearchResults(response.data.accounts);
                    setAccounts(response.data.accounts);
                } else {
                    setAccountSearchResults(prev => [...prev, ...response.data.accounts]);
                    setAccounts(prev => [...prev, ...response.data.accounts]);
                }
                setHasMoreAccountResults(response.data.pagination.hasNextPage);
                setTotalAccounts(response.data.pagination.totalAccounts);
                setAccountSearchPage(page);

                if (searchTerm.trim() !== '') {
                    setAccountLastSearchQuery(searchTerm);
                    setAccountShouldShowLastSearchResults(true);
                }
            }
        } catch (error) {
            console.error('Error fetching accounts:', error);
            setNotification({
                show: true,
                message: 'Error loading accounts',
                type: 'error'
            });
        } finally {
            setIsAccountSearching(false);
        }
    };

    // Fetch items from backend
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
                    // Get all stock entries for batch selection
                    let stockEntries = [];
                    if (item.stockEntries && item.stockEntries.length > 0) {
                        // Sort by date (oldest first for FIFO)
                        stockEntries = [...item.stockEntries].sort((a, b) =>
                            new Date(a.date) - new Date(b.date)
                        ).map(entry => ({
                            ...entry,
                            availableQuantity: entry.quantity || 0,
                            displayPrice: entry.price || 0,
                            purchasePrice: entry.purchasePrice || entry.price || 0
                        }));
                    }

                    return {
                        ...item,
                        id: item.id,
                        _id: item.id,
                        stockEntries: stockEntries,
                        latestPrice: stockEntries.length > 0 ? stockEntries[0].price || 0 : 0,
                        latestBatchNumber: stockEntries.length > 0 ? stockEntries[0].batchNumber || '' : '',
                        latestExpiryDate: stockEntries.length > 0 ? stockEntries[0].expiryDate || '' : '',
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

    // Fetch stock entries for a specific item
    const fetchItemStockEntries = async (itemId) => {
        try {
            const response = await api.get(`/api/retailer/items/${itemId}/stock-entries`);
            if (response.data.success) {
                return response.data.data.stockEntries || [];
            }
            return [];
        } catch (error) {
            console.error('Error fetching stock entries:', error);
            return [];
        }
    };

    // Function to get the current bill number (does NOT increment)
    const getCurrentBillNumber = async () => {
        try {
            const response = await api.get('/api/retailer/sales-return/current-number');
            return response.data.data.currentSalesReturnBillNumber;
        } catch (error) {
            console.error('Error getting current bill number:', error);
            return null;
        }
    };

    // Initial data loading
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                setIsLoading(true);

                // Fetch next bill number separately
                const numberResponse = await api.get('/api/retailer/sales-return/current-number');
                const currentBillNum = await getCurrentBillNumber();

                // Fetch company settings and initial data
                const response = await api.get('/api/retailer/sales-return');
                const { data } = response.data;

                // Set company settings
                setCompany({
                    ...data.company,
                    dateFormat: data.company.dateFormat || 'nepali',
                    vatEnabled: data.company.vatEnabled || true
                });

                // Set other data
                setCategories(data.categories || []);
                setUnits(data.units || []);
                setCompanyGroups(data.companyGroups || []);

                // Use the bill number from the separate endpoint
                setNextBillNumber(currentBillNum);
                const isNepaliFormat = data.company.dateFormat === 'nepali' ||
                    data.company.dateFormat === 'Nepali';

                setFormData(prev => ({
                    ...prev,
                    billNumber: currentBillNum,
                    transactionDateNepali: isNepaliFormat ? currentNepaliDate : '',
                    nepaliDate: isNepaliFormat ? currentNepaliDate : '',
                    transactionDateRoman: new Date().toISOString().split('T')[0],
                    billDate: new Date().toISOString().split('T')[0]
                }));

                fetchAccountsFromBackend('', 1);
                setIsInitialDataLoaded(true);
            } catch (error) {
                console.error('Error fetching initial data:', error);
                setNotification({
                    show: true,
                    message: 'Error loading sales return data',
                    type: 'error'
                });
            } finally {
                setIsLoading(false);
            }
        };
        fetchInitialData();
    }, []);

    useEffect(() => {
        fetchRoundOffSetting();
    }, []);

    const fetchRoundOffSetting = async () => {
        try {
            const response = await api.get('/api/retailer/roundoff-sales-return');
            if (response.data.success) {
                // Access the nested settings from settingsForSalesReturn object
                const settings = response.data.data?.settingsForSalesReturn;
                if (settings) {
                    setRoundOffSalesReturn(settings.roundOffSalesReturn || false);
                }
            }
        } catch (error) {
            console.error("Error fetching round-off setting:", error);
            setRoundOffSalesReturn(false);
        }
    };

    useEffect(() => {
        if (showItemDropdown) {
            setSearchPage(1);
            fetchItemsFromBackend(debouncedSearchQuery, 1, false);
        }
    }, [debouncedSearchQuery, formData.isVatExempt, showItemDropdown]);

    // For header modal search
    const debouncedHeaderSearchQuery = useDebounce(headerSearchQuery, 500);

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

    useEffect(() => {
        if (showAccountModal) {
            setAccountSearchQuery('');
            setAccountSearchPage(1);

            if (accountShouldShowLastSearchResults && accountLastSearchQuery.trim() !== '') {
                fetchAccountsFromBackend(accountLastSearchQuery, 1);
            } else {
                fetchAccountsFromBackend('', 1);
            }
        }
    }, [showAccountModal]);

    useEffect(() => {
        if (formData.accountId || items.length > 0) {
            setDraftCreditSalesReturnSave({
                formData,
                items,
                accounts
            });
        }
    }, [formData, items, accounts, setDraftCreditSalesReturnSave]);

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

    useEffect(() => {
        const handleF6KeyForItems = (e) => {
            if (e.key === 'F6' && document.activeElement === itemSearchRef.current) {
                e.preventDefault();
                setShowItemsModal(true);
                setSearchQuery('');
                if (itemSearchRef.current) {
                    itemSearchRef.current.value = '';
                }
                setShowItemDropdown(false);
            }
        };

        window.addEventListener('keydown', handleF6KeyForItems);
        return () => {
            window.removeEventListener('keydown', handleF6KeyForItems);
        };
    }, []);

    useEffect(() => {
        const handleF6KeyForHeaderModal = (e) => {
            if (e.key === 'F6' && showHeaderItemModal) {
                e.preventDefault();
                setShowItemsModal(true);
                setShowHeaderItemModal(false);
                setHeaderSearchQuery('');
                setHeaderLastSearchQuery('');
                setHeaderShouldShowLastSearchResults(false);
            }
        };

        window.addEventListener('keydown', handleF6KeyForHeaderModal);
        return () => {
            window.removeEventListener('keydown', handleF6KeyForHeaderModal);
        };
    }, [showHeaderItemModal]);

    useEffect(() => {
        const fetchTransactionSettings = async () => {
            try {
                const response = await api.get('/api/retailer/get-display-sales-return-transactions');
                if (response.data.success) {
                    setTransactionSettings(response.data.data);
                }
            } catch (error) {
                console.error('Error fetching transaction settings:', error);
            }
        };
        fetchTransactionSettings();
    }, []);

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
        return () => {
            setLastSearchQuery('');
            setShouldShowLastSearchResults(false);
        };
    }, []);

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

    useEffect(() => {
        if (itemsTableRef.current && items.length > 0) {
            setTimeout(() => {
                itemsTableRef.current.scrollTop = itemsTableRef.current.scrollHeight;
            }, 10);
        }
    }, [items]);

    useEffect(() => {
        if (showTransactionModal && continueButtonRef.current) {
            const timer = setTimeout(() => {
                continueButtonRef.current.focus();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [showTransactionModal]);

    const loadMoreAccounts = () => {
        if (!isAccountSearching) {
            fetchAccountsFromBackend(accountSearchQuery, accountSearchPage + 1);
        }
    };

    const handleAccountSearch = (e) => {
        const searchText = e.target.value;
        setAccountSearchQuery(searchText);
        setAccountSearchPage(1);

        if (searchText.trim() !== '' && accountShouldShowLastSearchResults) {
            setAccountShouldShowLastSearchResults(false);
            setAccountLastSearchQuery('');
        }

        const timer = setTimeout(() => {
            fetchAccountsFromBackend(searchText, 1);
        }, 300);

        return () => clearTimeout(timer);
    };

    const handleAccountModalClose = () => {
        setShowAccountModal(false);
    };

    const selectAccount = (account) => {
        setFormData({
            ...formData,
            accountId: account.id,
            accountName: `${account.uniqueNumber || ''} ${account.name}`.trim(),
            accountAddress: account.address,
            accountPan: account.pan
        });
        setShowAccountModal(false);

        // Focus on address field after account selection
        setTimeout(() => {
            document.getElementById('address').focus();
            document.getElementById('address').select();
        }, 50);
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

    // New function to handle item selection and show batch modal
    // const selectItemForBatchSelection = async (item) => {
    //     setSelectedItemForBatch(item);

    //     // If item has stock entries, show batch selection modal
    //     if (item.stockEntries && item.stockEntries.length > 0) {
    //         setSelectedItemStockEntries(item.stockEntries);
    //         setShowBatchSelectionModal(true);
    //         setShowHeaderItemModal(false);

    //         // Store the last search query for future reference
    //         if (headerSearchQuery.trim() !== '') {
    //             setHeaderLastSearchQuery(headerSearchQuery);
    //             setHeaderShouldShowLastSearchResults(true);
    //         }
    //         setHeaderSearchQuery('');
    //     } else {
    //         // If no stock entries, show warning
    //         setNotification({
    //             show: true,
    //             message: 'No stock entries found for this item',
    //             type: 'warning'
    //         });
    //     }
    // };

    // Function to handle item selection and show batch modal
    // const selectItemForBatchSelection = async (item) => {
    //     setSelectedItemForBatch(item);
    //     setShowBatchSelectionModal(true);
    //     setShowHeaderItemModal(false);

    //     // Store the last search query for future reference
    //     if (headerSearchQuery.trim() !== '') {
    //         setHeaderLastSearchQuery(headerSearchQuery);
    //         setHeaderShouldShowLastSearchResults(true);
    //     }
    //     setHeaderSearchQuery('');

    //     // Focus on first batch row after modal opens
    //     setTimeout(() => {
    //         const firstBatchRow = document.querySelector('.batch-row');
    //         if (firstBatchRow) {
    //             firstBatchRow.classList.add('bg-primary', 'text-white');
    //             firstBatchRow.focus();
    //         }
    //     }, 100);
    // };

    // Function to handle item selection and show batch modal only if stock available
    const selectItemForBatchSelection = async (item) => {
        setSelectedItemForBatch(item);

        // Check if item has stock entries with quantity > 0
        const hasAvailableStock = item.stockEntries &&
            item.stockEntries.some(entry => (entry.quantity || 0) > 0);

        if (hasAvailableStock) {
            // Show batch selection modal
            setSelectedItemStockEntries(item.stockEntries);
            setShowBatchSelectionModal(true);
            setShowHeaderItemModal(false);

            // Store the last search query for future reference
            if (headerSearchQuery.trim() !== '') {
                setHeaderLastSearchQuery(headerSearchQuery);
                setHeaderShouldShowLastSearchResults(true);
            }
            setHeaderSearchQuery('');

            // Focus on first batch row after modal opens
            setTimeout(() => {
                const firstBatchRow = document.querySelector('.batch-row');
                if (firstBatchRow) {
                    firstBatchRow.classList.add('bg-primary', 'text-white');
                    firstBatchRow.focus();
                }
            }, 100);
        } else {
            // No stock available - set to header row directly with default values
            setSelectedItemForInsert(item);
            setSelectedItemBatchNumber('XXX');
            setSelectedItemExpiryDate(getDefaultExpiryDate());
            setSelectedItemRate(item.latestPrice || 0);
            setSelectedItemQuantity(0);
            setShowHeaderItemModal(false);

            // Focus on batch number input in header row
            setTimeout(() => {
                const batchInput = document.getElementById('headerBatch');
                if (batchInput) {
                    batchInput.focus();
                    batchInput.select();
                }
            }, 100);
        }
    };

    // Handle batch selection from modal - sets to header row
    const handleBatchSelect = (stockEntry) => {
        if (!selectedItemForBatch) return;

        // Set the selected batch details to the header row
        setSelectedItemForInsert(selectedItemForBatch);
        setSelectedItemBatchNumber(stockEntry.batchNumber || 'XXX');
        setSelectedItemExpiryDate(stockEntry.expiryDate || getDefaultExpiryDate());
        setSelectedItemRate(Math.round(stockEntry.price * 100) / 100 || 0);
        setSelectedItemQuantity(0);

        // Store the stock entry ID for reference
        setSelectedBatchEntry(stockEntry);

        // Close batch modal
        setShowBatchSelectionModal(false);
        setSelectedItemForBatch(null);

        // Focus on batch number input in header row
        setTimeout(() => {
            const batchInput = document.getElementById('headerBatch');
            if (batchInput) {
                batchInput.focus();
                batchInput.select();
            }
        }, 100);

        // Show success notification
        // setNotification({
        //     show: true,
        //     message: `Batch ${stockEntry.batchNumber || 'XXX'} selected. Adjust quantity if needed and click INSERT.`,
        //     type: 'success',
        //     duration: 3000
        // });
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

    // Check for transactions after item is added
    const checkTransactionsAfterItemAdd = async (item, newItem) => {
        if (transactionSettings.displayTransactionsForSalesReturn && formData.accountId) {
            const cacheKey = `${item.id}-${formData.accountId}`;

            if (transactionCache.has(cacheKey)) {
                const cachedTransactions = transactionCache.get(cacheKey);
                if (cachedTransactions.length > 0) {
                    setTransactions(cachedTransactions);
                    setShowTransactionModal(true);
                    return;
                }
            }

            try {
                setIsLoadingTransactions(true);

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3000);

                const response = await api.get(`/api/retailer/transactions/${item.id}/${formData.accountId}/Sales`, {
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (response.data.success) {
                    setTransactionCache(prev => new Map(prev.set(cacheKey, response.data.data.transactions)));

                    if (response.data.data.transactions.length > 0) {
                        setTransactions(response.data.data.transactions);
                        setShowTransactionModal(true);
                        return;
                    }
                }
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error('Error fetching transactions:', error);
                }
            } finally {
                setIsLoadingTransactions(false);
            }
        }

        // Focus on quantity input of the newly added item
        setTimeout(() => {
            const quantityInput = document.getElementById(`quantity-${items.length}`);
            if (quantityInput) {
                quantityInput.focus();
                quantityInput.select();
            }
        }, 100);
    };

    // Legacy function for backward compatibility
    const addItemToBill = async (item) => {
        // This function is now replaced by selectItemForBatchSelection
        selectItemForBatchSelection(item);
    };

    // Legacy function for backward compatibility
    const selectItemForInsert = async (item) => {
        // This function is now replaced by selectItemForBatchSelection
        selectItemForBatchSelection(item);
    };

    // Legacy insert function (kept for backward compatibility)
    const insertSelectedItem = () => {
        if (!selectedItemForInsert) {
            setNotification({
                show: true,
                message: 'Please select an item first',
                type: 'error'
            });
            return;
        }

        // Validate required fields
        if (!selectedItemBatchNumber.trim()) {
            setNotification({
                show: true,
                message: 'Batch number is required before inserting item',
                type: 'error'
            });

            setTimeout(() => {
                const batchInput = document.querySelector('input[placeholder="Batch"]');
                if (batchInput) {
                    batchInput.focus();
                    batchInput.select();
                }
            }, 100);

            return;
        }

        if (!selectedItemExpiryDate.trim()) {
            setNotification({
                show: true,
                message: 'Expiry date is required before inserting item',
                type: 'error'
            });

            setTimeout(() => {
                const expiryInput = document.getElementById('headerExpiryDate');
                if (expiryInput) {
                    expiryInput.focus();
                    expiryInput.select();
                }
            }, 100);

            return;
        }

        if (selectedItemQuantity > 0) {
            const newItem = {
                itemId: selectedItemForInsert.id,
                uniqueNumber: selectedItemForInsert.uniqueNumber || 'N/A',
                hscode: selectedItemForInsert.hscode,
                name: selectedItemForInsert.name,
                category: selectedItemForInsert.category?.name || 'No Category',
                batchNumber: selectedItemBatchNumber,
                expiryDate: selectedItemExpiryDate,
                quantity: selectedItemQuantity || 0,
                unitId: selectedItemForInsert.unit?.id || selectedItemForInsert.unitId,
                unitName: selectedItemForInsert.unit?.name || selectedItemForInsert.unitName,
                price: selectedItemRate || 0,
                amount: (selectedItemQuantity || 0) * (selectedItemRate || 0),
                vatStatus: selectedItemForInsert.vatStatus,
                uniqueUuid: selectedItemForInsert.uniqueUuid
            };

            setItems([...items, newItem]);

            setSelectedItemForInsert(null);
            setSelectedItemQuantity(0);
            setSelectedItemRate(0);
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
        }
    };

    const updateItemField = (index, field, value) => {
        const updatedItems = [...items];
        updatedItems[index][field] = value;

        if (field === 'quantity' || field === 'price') {
            updatedItems[index].amount = (updatedItems[index].quantity * updatedItems[index].price).toFixed(2);
        }

        setItems(updatedItems);

        if (formData.discountPercentage || formData.discountAmount) {
            const subTotal = calculateTotal(updatedItems).subTotal;

            if (formData.discountPercentage) {
                const discountAmount = (subTotal * formData.discountPercentage) / 100;
                setFormData(prev => ({
                    ...prev,
                    discountAmount: discountAmount.toFixed(2)
                }));
            } else if (formData.discountAmount) {
                const discountPercentage = subTotal > 0 ? (formData.discountAmount / subTotal) * 100 : 0;
                setFormData(prev => ({
                    ...prev,
                    discountPercentage: discountPercentage.toFixed(2)
                }));
            }
        }
    };

    const removeItem = (index) => {
        const updatedItems = items.filter((_, i) => i !== index);
        setItems(updatedItems);
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

    // const calculateTotal = (itemsToCalculate = items) => {
    //     let subTotal = 0;
    //     let taxableAmount = 0;
    //     let nonTaxableAmount = 0;

    //     itemsToCalculate.forEach(item => {
    //         const itemAmount = parseFloat(item.amount) || 0;
    //         subTotal += itemAmount;

    //         if (item.vatStatus === 'vatable') {
    //             taxableAmount += itemAmount;
    //         } else {
    //             nonTaxableAmount += itemAmount;
    //         }
    //     });

    //     const discountPercentage = parseFloat(formData.discountPercentage) || 0;
    //     const discountAmount = parseFloat(formData.discountAmount) || 0;

    //     let effectiveDiscount = 0;
    //     let discountForTaxable = 0;
    //     let discountForNonTaxable = 0;

    //     if (discountAmount > 0) {
    //         effectiveDiscount = discountAmount;

    //         if (subTotal > 0) {
    //             const taxableRatio = taxableAmount / subTotal;
    //             const nonTaxableRatio = nonTaxableAmount / subTotal;

    //             discountForTaxable = effectiveDiscount * taxableRatio;
    //             discountForNonTaxable = effectiveDiscount * nonTaxableRatio;
    //         }
    //     } else if (discountPercentage > 0) {
    //         discountForTaxable = (taxableAmount * discountPercentage) / 100;
    //         discountForNonTaxable = (nonTaxableAmount * discountPercentage) / 100;
    //         effectiveDiscount = discountForTaxable + discountForNonTaxable;
    //     }

    //     const finalTaxableAmount = taxableAmount - discountForTaxable;
    //     const finalNonTaxableAmount = nonTaxableAmount - discountForNonTaxable;

    //     let vatAmount = 0;
    //     if (formData.isVatExempt === 'false' || formData.isVatExempt === 'all') {
    //         vatAmount = (finalTaxableAmount * formData.vatPercentage) / 100;
    //     }

    //     let totalBeforeRoundOff = finalTaxableAmount + finalNonTaxableAmount + vatAmount;

    //     const roundOffAmount = parseFloat(formData.roundOffAmount) || 0;
    //     const totalAmount = totalBeforeRoundOff + roundOffAmount;

    //     return {
    //         subTotal,
    //         taxableAmount: finalTaxableAmount,
    //         nonTaxableAmount: finalNonTaxableAmount,
    //         vatAmount,
    //         totalAmount,
    //         discountAmount: effectiveDiscount,
    //         roundOffAmount
    //     };
    // };

    const calculateTotal = (itemsToCalculate = items) => {
        let subTotal = 0;
        let taxableAmount = 0;
        let nonTaxableAmount = 0;

        itemsToCalculate.forEach(item => {
            const itemAmount = parseFloat(item.amount) || 0;
            subTotal += itemAmount;

            if (item.vatStatus === 'vatable') {
                taxableAmount += itemAmount;
            } else {
                nonTaxableAmount += itemAmount;
            }
        });

        const discountPercentage = parseFloat(formData.discountPercentage) || 0;
        const discountAmount = parseFloat(formData.discountAmount) || 0;

        let effectiveDiscount = 0;
        let discountForTaxable = 0;
        let discountForNonTaxable = 0;

        if (discountAmount > 0) {
            effectiveDiscount = discountAmount;

            if (subTotal > 0) {
                const taxableRatio = taxableAmount / subTotal;
                const nonTaxableRatio = nonTaxableAmount / subTotal;

                discountForTaxable = effectiveDiscount * taxableRatio;
                discountForNonTaxable = effectiveDiscount * nonTaxableRatio;
            }
        } else if (discountPercentage > 0) {
            discountForTaxable = (taxableAmount * discountPercentage) / 100;
            discountForNonTaxable = (nonTaxableAmount * discountPercentage) / 100;
            effectiveDiscount = discountForTaxable + discountForNonTaxable;
        }

        const finalTaxableAmount = taxableAmount - discountForTaxable;
        const finalNonTaxableAmount = nonTaxableAmount - discountForNonTaxable;

        let vatAmount = 0;
        if (formData.isVatExempt === 'false' || formData.isVatExempt === 'all') {
            vatAmount = (finalTaxableAmount * formData.vatPercentage) / 100;
        }

        // Calculate total before round off
        let totalBeforeRoundOff = finalTaxableAmount + finalNonTaxableAmount + vatAmount;

        // Calculate auto round-off amount
        let roundOffAmount = 0;
        let autoRoundOffAmount = 0;

        // Calculate auto round-off if enabled
        if (roundOffSalesReturn) {
            const roundedTotal = Math.round(totalBeforeRoundOff);
            autoRoundOffAmount = roundedTotal - totalBeforeRoundOff;
            autoRoundOffAmount = Math.round(autoRoundOffAmount * 100) / 100;
        }

        // Use auto or manual round-off
        if (roundOffSalesReturn && !manualRoundOffOverride) {
            roundOffAmount = autoRoundOffAmount;
        } else {
            roundOffAmount = parseFloat(formData.roundOffAmount) || 0;
        }

        const totalAmount = totalBeforeRoundOff + roundOffAmount;

        return {
            subTotal: Math.round(subTotal * 100) / 100,
            taxableAmount: Math.round(finalTaxableAmount * 100) / 100,
            nonTaxableAmount: Math.round(finalNonTaxableAmount * 100) / 100,
            vatAmount: Math.round(vatAmount * 100) / 100,
            totalAmount: Math.round(totalAmount * 100) / 100,
            discountAmount: Math.round(effectiveDiscount * 100) / 100,
            roundOffAmount: Math.round(roundOffAmount * 100) / 100,
            autoRoundOffAmount: Math.round(autoRoundOffAmount * 100) / 100
        };
    };


    const handleDiscountPercentageChange = (e) => {
        const value = parseFloat(e.target.value) || 0;
        const validatedValue = Math.min(Math.max(value, 0), 100);

        const subTotal = calculateTotal().subTotal;
        const discountAmount = (subTotal * validatedValue) / 100;

        setFormData({
            ...formData,
            discountPercentage: validatedValue,
            discountAmount: discountAmount.toFixed(2)
        });
    };

    const handleDiscountAmountChange = (e) => {
        const value = parseFloat(e.target.value) || 0;
        const subTotal = calculateTotal().subTotal;

        const validatedValue = Math.min(Math.max(value, 0), subTotal);

        const discountPercentage = subTotal > 0 ? (validatedValue / subTotal) * 100 : 0;

        setFormData({
            ...formData,
            discountAmount: validatedValue,
            discountPercentage: discountPercentage.toFixed(2)
        });
    };

    const fetchLastTransactions = async (itemId) => {
        if (!formData.accountId) {
            setNotification({
                show: true,
                message: 'Please select an account first',
                type: 'error'
            });
            return;
        }

        setLoadingItems(prev => new Set(prev).add(itemId));
        setIsLoadingTransactions(true);

        try {
            const cacheKey = `${itemId}-${formData.accountId}`;

            if (transactionCache.has(cacheKey)) {
                const cachedTransactions = transactionCache.get(cacheKey);
                setTransactions(cachedTransactions);
                setShowTransactionModal(true);
                return;
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);

            const response = await api.get(`/api/retailer/transactions/${itemId}/${formData.accountId}/Sales`, {
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.data.success) {
                setTransactionCache(prev => new Map(prev.set(cacheKey, response.data.data.transactions)));
                setTransactions(response.data.data.transactions);
                setShowTransactionModal(true);
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Error fetching transactions:', error);
            }
        } finally {
            setLoadingItems(prev => {
                const newSet = new Set(prev);
                newSet.delete(itemId);
                return newSet;
            });
            setIsLoadingTransactions(false);
        }
    };

    // Manual reset function - does NOT increment bill number
    const handleManualReset = async () => {
        try {
            setIsLoading(true);

            // Get current bill number (does NOT increment)
            const currentBillNum = await getCurrentBillNumber();

            // Fetch other data
            const response = await api.get('/api/retailer/sales-return');
            const { data } = response.data;

            const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
            const currentRomanDate = new Date().toISOString().split('T')[0];

            setFormData({
                accountId: '',
                accountName: '',
                accountAddress: '',
                accountPan: '',
                transactionDateNepali: new NepaliDate(currentNepaliDate).format('YYYY-MM-DD'),
                transactionDateRoman: currentRomanDate,
                nepaliDate: new NepaliDate(currentNepaliDate).format('YYYY-MM-DD'),
                billDate: currentRomanDate,
                billNumber: currentBillNum,
                paymentMode: 'credit',
                isVatExempt: 'all',
                discountPercentage: 0,
                discountAmount: 0,
                roundOffAmount: 0,
                vatPercentage: 13,
                salesInvoiceNumber: '',
                items: []
            });

            setAccountSearchQuery('');
            setAccountSearchPage(1);
            setAccountSearchResults([]);
            setHasMoreAccountResults(false);
            setTotalAccounts(0);

            setCategories(data.categories || []);
            setUnits(data.units || []);
            setCompanyGroups(data.companyGroups || []);

            fetchAccountsFromBackend('', 1);

            setNextBillNumber(currentBillNum);
            setItems([]);
            setSalesInvoiceData(null);
            clearCreditSalesReturnDraft();

            if (accountSearchRef.current) {
                accountSearchRef.current.value = '';
            }

            setSearchQuery('');
            setSearchResults([]);
            setSearchPage(1);
            setHasMoreSearchResults(false);
            setTotalSearchItems(0);
            setShowItemDropdown(false);

            setHeaderSearchQuery('');
            setHeaderLastSearchQuery('');
            setHeaderShouldShowLastSearchResults(false);
            setSelectedItemForInsert(null);

            setTimeout(() => {
                if (transactionDateRef.current) {
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

    // Reset after save - increments bill number
    const resetAfterSave = async () => {
        try {
            // Get next bill number (this increments the counter)
            const nextBillNum = await getCurrentBillNumber();

            // Fetch other data
            const response = await api.get('/api/retailer/sales-return');
            const { data } = response.data;

            const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
            const currentRomanDate = new Date().toISOString().split('T')[0];

            setFormData({
                accountId: '',
                accountName: '',
                accountAddress: '',
                accountPan: '',
                transactionDateNepali: new NepaliDate(currentNepaliDate).format('YYYY-MM-DD'),
                transactionDateRoman: currentRomanDate,
                nepaliDate: new NepaliDate(currentNepaliDate).format('YYYY-MM-DD'),
                billDate: currentRomanDate,
                billNumber: nextBillNum,
                paymentMode: 'credit',
                isVatExempt: 'all',
                discountPercentage: 0,
                discountAmount: 0,
                roundOffAmount: 0,
                vatPercentage: 13,
                salesInvoiceNumber: '',
                items: []
            });

            setAccountSearchQuery('');
            setAccountSearchPage(1);
            setAccountSearchResults([]);
            setHasMoreAccountResults(false);
            setTotalAccounts(0);

            setCategories(data.categories || []);
            setUnits(data.units || []);
            setCompanyGroups(data.companyGroups || []);

            fetchAccountsFromBackend('', 1);

            setNextBillNumber(nextBillNum);
            setItems([]);
            setSalesInvoiceData(null);
            clearCreditSalesReturnDraft();

            setSearchQuery('');
            setSearchResults([]);
            setSearchPage(1);
            setHasMoreSearchResults(false);
            setTotalSearchItems(0);
            setShowItemDropdown(false);

            setHeaderSearchQuery('');
            setHeaderSearchResults([]);
            setHeaderSearchPage(1);
            setHasMoreHeaderSearchResults(false);
            setTotalHeaderSearchItems(0);
            setSelectedItemForInsert(null);

            setTimeout(() => {
                if (transactionDateRef.current) {
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

    const formatter = new Intl.NumberFormat('en-NP', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    const fetchSalesBillDetails = async (e) => {
        const invoiceNumber = e?.target?.value || formData.salesInvoiceNumber;

        if (!invoiceNumber) return;

        setSalesInvoiceLoading(true);
        try {
            const response = await api.get(`/api/retailer/sales-bill-by-number/${invoiceNumber}`);

            if (response.data.success) {
                const billData = response.data.data.bill;

                // Check if this is a credit sales bill
                if (billData.billType !== 'credit') {
                    setSalesInvoiceLoading(false);

                    setNotification({
                        show: true,
                        message: `Bill ${invoiceNumber} is not a credit sales bill. Please check the bill type.`,
                        type: 'warning'
                    });

                    setFormData(prev => ({ ...prev, salesInvoiceNumber: '' }));
                    setSalesInvoiceData(null);
                    setItems([]);

                    return;
                }

                // Check if this bill already has existing returns
                if (billData.hasExistingReturns && billData.existingReturns.length > 0) {
                    setSalesInvoiceLoading(false);

                    const returnDetails = billData.existingReturns
                        .map((ret, idx) =>
                            `Return ${idx + 1}: ${ret.billNumber} (${new Date(ret.date).toLocaleDateString()}) - Rs. ${ret.totalAmount?.toFixed(2) || '0.00'}`
                        )
                        .join('\n');

                    setNotification({
                        show: true,
                        message: `⚠️ Sales return already exists for invoice ${invoiceNumber}!\n\nExisting Returns:\n${returnDetails}\n\nYou cannot create another return for the same invoice.`,
                        type: 'warning'
                    });

                    setFormData(prev => ({ ...prev, salesInvoiceNumber: '' }));
                    setSalesInvoiceData(null);
                    setItems([]);

                    return;
                }

                // Check if bill is fully returned
                if (billData.isFullyReturned) {
                    setSalesInvoiceLoading(false);

                    setNotification({
                        show: true,
                        message: `All items from invoice ${invoiceNumber} have already been returned.`,
                        type: 'warning'
                    });

                    setFormData(prev => ({ ...prev, salesInvoiceNumber: '' }));
                    setSalesInvoiceData(null);
                    setItems([]);

                    return;
                }

                // Calculate VAT status based on items in the bill
                let isVatExemptValue = 'all';

                if (billData.items && billData.items.length > 0) {
                    const vatStatuses = billData.items.map(item => {
                        return item.item?.vatStatus || item.vatStatus || 'vatable';
                    });

                    const allVatable = vatStatuses.every(status => status === 'vatable');
                    const allVatExempt = vatStatuses.every(status => status === 'vatExempt');

                    if (allVatable) {
                        isVatExemptValue = 'false';
                    } else if (allVatExempt) {
                        isVatExemptValue = 'true';
                    } else {
                        isVatExemptValue = 'all';
                    }
                }

                console.log('Bill Summary:', billData.billSummary);
                console.log('Discount Percentage:', billData.billSummary?.discountPercentage);
                console.log('Discount Amount:', billData.billSummary?.discountAmount);

                // Update account information
                setFormData(prev => ({
                    ...prev,
                    accountId: billData.account?._id || '',
                    accountName: billData.account?.name || '',
                    accountAddress: billData.account?.address || '',
                    accountPan: billData.account?.pan || '',
                    discountPercentage: billData.billSummary?.discountPercentage || 0,
                    discountAmount: billData.billSummary?.discountAmount || 0,
                    vatPercentage: billData.billSummary?.vatPercentage || 13,
                    paymentMode: billData.billSummary?.paymentMode || 'credit',
                    isVatExempt: isVatExemptValue,
                    roundOffAmount: billData.billSummary?.roundOffAmount || 0,
                    salesInvoiceNumber: invoiceNumber
                }));

                // Transform items correctly
                const transformedItems = billData.items.map((item, index) => {
                    let unitId = item.unitId || item.UnitId;
                    let unitName = item.unitName || item.UnitName;

                    if (item.unit && item.unit._id) {
                        unitId = item.unit._id;
                        unitName = item.unit.name;
                    }

                    let expiryDate = item.expiryDate;
                    if (expiryDate) {
                        if (typeof expiryDate === 'string' && expiryDate.includes('T')) {
                            expiryDate = expiryDate.split('T')[0];
                        } else if (expiryDate instanceof Date) {
                            expiryDate = expiryDate.toISOString().split('T')[0];
                        }
                    } else {
                        expiryDate = getDefaultExpiryDate();
                    }

                    const defaultQuantity = Math.max(0, item.availableQuantity || 0);

                    return {
                        itemId: item.item?._id || item.item,
                        uniqueNumber: item.item?.uniqueNumber || '',
                        hscode: item.item?.hscode || '',
                        name: item.item?.name || '',
                        category: item.item?.category?.name || 'No Category',
                        batchNumber: item.batchNumber || 'XXX',
                        expiryDate: expiryDate,
                        quantity: defaultQuantity,
                        unitId: unitId,
                        unitName: unitName || '',
                        price: item.originalPrice || item.price || item.item?.sellingPrice || 0,
                        amount: (defaultQuantity * (item.originalPrice || item.price || item.item?.sellingPrice || 0)).toFixed(2),
                        vatStatus: item.item?.vatStatus || item.vatStatus || 'vatable',
                        _originalQuantity: item.originalQuantity,
                        _availableQuantity: item.availableQuantity,
                        _returnedQuantity: item.returnedQuantity
                    };
                });

                setItems(transformedItems);
                setSalesInvoiceData(billData);

                setNotification({
                    show: true,
                    message: `✅ Sales bill ${invoiceNumber} loaded successfully. ${transformedItems.length} items found.`,
                    type: 'success'
                });

                setTimeout(() => {
                    if (transformedItems.length > 0) {
                        const batchNumberInput = document.getElementById(`batchNumber-0`);
                        if (batchNumberInput) {
                            batchNumberInput.focus();
                            batchNumberInput.select();
                        }
                    }
                }, 100);

            } else {
                const errorData = response.data;

                if (errorData.isCashSales) {
                    setNotification({
                        show: true,
                        message: `❌ ${invoiceNumber} is a Cash Sales bill!\n\nCash Account: ${errorData.cashAccount || 'N/A'}\nAddress: ${errorData.cashAccountAddress || 'N/A'}\n\nCash sales returns should be created from the Cash Sales Return section.`,
                        type: 'error'
                    });
                } else if (errorData.isCreditSales === false) {
                    setNotification({
                        show: true,
                        message: `❌ ${invoiceNumber} is not a valid credit sales bill.\nPlease check the bill type.`,
                        type: 'error'
                    });
                } else {
                    setNotification({
                        show: true,
                        message: errorData.error || 'Sales bill not found',
                        type: 'error'
                    });
                }

                setFormData(prev => ({ ...prev, salesInvoiceNumber: '' }));
                setSalesInvoiceData(null);
                setItems([]);
            }
        } catch (error) {
            console.error('Error fetching sales bill:', error);

            if (error.response?.data?.isCashSales) {
                const errorData = error.response.data;
                setNotification({
                    show: true,
                    message: `❌ ${invoiceNumber} is a Cash Sales bill!\n\nCash Account: ${errorData.cashAccount || 'N/A'}\nAddress: ${errorData.cashAccountAddress || 'N/A'}\n\nCash sales returns should be created from the Cash Sales Return section.`,
                    type: 'error'
                });
            } else if (error.response?.data?.isCreditSales === false) {
                setNotification({
                    show: true,
                    message: `❌ ${invoiceNumber} is not a valid credit sales bill.\nPlease check the bill type.`,
                    type: 'error'
                });
            } else if (error.response?.data?.error) {
                setNotification({
                    show: true,
                    message: error.response.data.error,
                    type: 'error'
                });
            } else {
                setNotification({
                    show: true,
                    message: 'Error fetching sales bill details',
                    type: 'error'
                });
            }

            setFormData(prev => ({ ...prev, salesInvoiceNumber: '' }));
            setSalesInvoiceData(null);
            setItems([]);
        } finally {
            setSalesInvoiceLoading(false);
        }
    };

    const getDefaultExpiryDate = () => {
        const today = new Date();
        today.setFullYear(today.getFullYear() + 2);
        return today.toISOString().split('T')[0];
    };

    const handleSubmit = async (e, print = false) => {
        e.preventDefault();

        if (salesInvoiceData?.hasExistingReturns) {
            setNotification({
                show: true,
                message: `Cannot save: Sales return already exists for invoice ${formData.salesInvoiceNumber}`,
                type: 'error'
            });
            return;
        }

        // Validation
        if (!formData.accountId) {
            setNotification({
                show: true,
                message: 'Please select an account first',
                type: 'error'
            });
            return;
        }

        if (items.length === 0) {
            setNotification({
                show: true,
                message: 'Please add at least one item',
                type: 'error'
            });
            return;
        }

        setIsSaving(true);

        try {
            const calculatedValues = calculateTotal();

            // Prepare items for submission
            const preparedItems = items.map(item => {
                let unitId = null;
                if (item.unitId) {
                    unitId = item.unitId;
                } else if (item.unit && typeof item.unit === 'object' && item.unit._id) {
                    unitId = item.unit._id;
                } else if (typeof item.unit === 'string') {
                    unitId = item.unit;
                }

                let expiryDate = item.expiryDate;
                if (expiryDate) {
                    if (typeof expiryDate === 'string' && expiryDate.includes('T')) {
                        expiryDate = expiryDate.split('T')[0];
                    } else if (expiryDate instanceof Date) {
                        expiryDate = expiryDate.toISOString().split('T')[0];
                    }
                } else {
                    const defaultDate = new Date();
                    defaultDate.setFullYear(defaultDate.getFullYear() + 2);
                    expiryDate = defaultDate.toISOString().split('T')[0];
                }

                return {
                    itemId: item.itemId,
                    batchNumber: item.batchNumber || 'XXX',
                    expiryDate: expiryDate,
                    quantity: Number(item.quantity) || 0,
                    unitId: unitId,
                    price: Number(item.price) || 0,
                    vatStatus: item.vatStatus || 'vatable',
                    stockEntryId: item.stockEntryId || null // Include stock entry ID if available
                };
            });

            // Prepare bill data according to CreateSalesReturnDTO
            const billData = {
                accountId: formData.accountId,
                items: preparedItems,
                vatPercentage: Number(formData.vatPercentage) || 13,
                transactionDateNepali: formData.transactionDateNepali,
                transactionDateRoman: formData.transactionDateRoman,
                billDate: formData.billDate,
                nepaliDate: formData.nepaliDate,
                isVatExempt: formData.isVatExempt,
                discountPercentage: Number(formData.discountPercentage) || 0,
                discountAmount: Number(formData.discountAmount) || 0,
                paymentMode: formData.paymentMode,
                roundOffAmount: Number(formData.roundOffAmount) || 0,
                originalSalesBillId: salesInvoiceData?._id || null,
                originalSalesBillNumber: formData.salesInvoiceNumber || '',
                subTotal: calculatedValues.subTotal,
                taxableAmount: calculatedValues.taxableAmount,
                nonVatSalesReturn: calculatedValues.nonTaxableAmount,
                vatAmount: calculatedValues.vatAmount,
                totalAmount: calculatedValues.totalAmount,
                originalCopies: 1,
                purchaseSalesReturnType: "SalesReturn",
                print
            };

            const response = await api.post('/api/retailer/sales-return', billData);

            if (response.data.success) {
                setNotification({
                    show: true,
                    message: 'Sales return saved successfully!',
                    type: 'success'
                });

                setTransactionCache(new Map());

                if ((print || printAfterSave) && response.data.data?.bill?._id) {
                    setIsSaving(false);
                    await printImmediately(response.data.data.bill._id);
                    await resetAfterSave();
                } else {
                    await resetAfterSave();
                    setIsSaving(false);
                }

            } else {
                setNotification({
                    show: true,
                    message: response.data.message || response.data.error || 'Failed to save sales return',
                    type: 'error'
                });
                setIsSaving(false);
            }
        } catch (error) {
            console.error('Error saving sales return:', error);
            setNotification({
                show: true,
                message: error.response?.data?.message || error.response?.data?.error || 'Failed to save sales return',
                type: 'error'
            });
            setIsSaving(false);
        }
    };

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

    const handleTransactionModalClose = () => {
        setShowTransactionModal(false);

        setTimeout(() => {
            const headerBatchInput = document.getElementById('headerBatch');
            if (headerBatchInput) {
                headerBatchInput.focus();
                headerBatchInput.select();
            } else if (items.length > 0) {
                const quantityInput = document.getElementById(`quantity-${items.length - 1}`);
                if (quantityInput) {
                    quantityInput.focus();
                    quantityInput.select();
                }
            }
        }, 100);
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && showHeaderItemModal) {
                e.preventDefault();
                setShowHeaderItemModal(false);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [showHeaderItemModal]);

    useEffect(() => {
        const handleGlobalKeyDown = (e) => {
            if (showTransactionModal) {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    handleTransactionModalClose();
                }
            } else if (showAccountCreationModal && e.key === 'Escape') {
                e.preventDefault();
                setShowAccountCreationModal(false);
                setShowAccountModal(true);
            } else if (showItemsModal && e.key === 'Escape') {
                e.preventDefault();
                setShowItemsModal(false);
                setTimeout(() => {
                    itemSearchRef.current?.focus();
                }, 100);
            } else if (showBatchSelectionModal && e.key === 'Escape') {
                e.preventDefault();
                setShowBatchSelectionModal(false);
                setShowHeaderItemModal(true);
            }
        };

        document.addEventListener('keydown', handleGlobalKeyDown);
        return () => {
            document.removeEventListener('keydown', handleGlobalKeyDown);
        };
    }, [showTransactionModal, showAccountCreationModal, showItemsModal, showBatchSelectionModal, handleTransactionModalClose]);

    const handleAccountCreationModalClose = () => {
        setShowAccountCreationModal(false);
        setShowAccountModal(true);
        fetchAccountsFromBackend('', 1);
    };

    const handlePrintAfterSaveChange = (e) => {
        const isChecked = e.target.checked;
        setPrintAfterSave(isChecked);
        localStorage.setItem('printAfterSaveSalesReturn', isChecked);
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
                // Convert to Nepali date
                const nepaliDate = new NepaliDate(date);
                return nepaliDate.format('YYYY-MM-DD');
            }

            // English format
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } catch (e) {
            console.error('Date formatting error:', e);
            return 'N/A';
        }
    };

    const printImmediately = async (billId) => {
        try {
            const response = await api.get(`/api/retailer/sales-return/${billId}/print`);
            const printData = response.data.data;

            const tempDiv = document.createElement('div');
            tempDiv.style.position = 'absolute';
            tempDiv.style.left = '-9999px';
            document.body.appendChild(tempDiv);

            tempDiv.innerHTML = `
            <div id="printableContent">
                <div class="print-invoice-container">
                    <div class="print-invoice-header">
                        <div class="print-company-name">${printData.currentCompanyName || ''}</div>
                        <div class="print-company-details">
                            ${printData.currentCompany?.address || ''} | Tel: ${printData.currentCompany?.phone || ''} | PAN: ${printData.currentCompany?.pan || ''}
                        </div>
                        <div class="print-invoice-title">SALES RETURN</div>
                    </div>

                    <div class="print-invoice-details">
                        <div>
                            ${printData.bill.account ? `
                                <div><strong>M/S:</strong> ${printData.bill.account.name || ''}</div>
                                <div><strong>Address:</strong> ${printData.bill.account.address || ''}</div>
                                <div><strong>PAN:</strong> ${printData.bill.account.pan || ''}</div>
                                <div><strong>Email:</strong> ${printData.bill.account.email || ''}</div>
                                <div><strong>Phone:</strong> ${printData.bill.account.phone || ''}</div>
                            ` : printData.bill.cashAccount ? `
                                <div><strong>Customer:</strong> ${printData.bill.cashAccount || ''}</div>
                                <div><strong>Address:</strong> ${printData.bill.cashAccountAddress || ''}</div>
                                <div><strong>PAN:</strong> ${printData.bill.cashAccountPan || ''}</div>
                                <div><strong>Email:</strong> ${printData.bill.cashAccountEmail || ''}</div>
                                <div><strong>Phone:</strong> ${printData.bill.cashAccountPhone || ''}</div>
                            ` : `
                                <div><strong>Customer:</strong> Cash Return</div>
                                <div><strong>Address:</strong> N/A</div>
                                <div><strong>PAN:</strong> N/A</div>
                                <div><strong>Email:</strong> N/A</div>
                                <div><strong>Phone:</strong> N/A</div>
                            `}
                        </div>
                        <div>
                            <div><strong>Invoice No:</strong> ${printData.bill.billNumber || ''}</div>
                            <div><strong>Org. Inv.:</strong> ${printData.bill.originalSalesBillNumber || ''}</div>
                            <div><strong>Transaction Date:</strong> ${printData.companyDateFormat === 'Nepali' ? formatDate(printData.transactionDateNepali, 'nepali') : formatDate(printData.bill.transactionDate)}</div>
                            <div><strong>Invoice Issue Date:</strong> ${printData.companyDateFormat === 'Nepali' ? formatDate(printData.nepaliDate, 'nepali') : formatDate(printData.bill.date)}</div>
                            <div><strong>Payment Mode:</strong> ${printData.bill.paymentMode || ''}</div>
                        </div>
                    </div>

                    <table class="print-invoice-table">
                        <thead>
                            <tr>
                                <th>S.N.</th>
                                <th>Code</th>
                                <th>HSN</th>
                                <th>Description of Goods</th>
                                <th>Unit</th>
                                <th>Batch</th>
                                <th>Expiry</th>
                                <th>Qty</th>
                                <th>Price</th>
                                <th>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${printData.bill.items?.map((item, i) => {
                const itemTotal = (item.quantity || 0) * (item.price || 0);
                return `
                                    <tr key="${i}">
                                        <td>${i + 1}</td>
                                        <td>${item.uniqueNumber || ''}</td>
                                        <td>${item.hscode || ''}</td>
                                        <td>
                                            ${item.vatStatus === 'vatExempt' ?
                        `${item.itemName || ''} *` :
                        item.itemName || ''
                    }
                                        </td>
                                        <td>${item.unitName || ''}</td>
                                        <td>${item.batchNumber || 'N/A'}</td>
                                        <td>${item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'N/A'}</td>
                                        <td class="print-text-right">${formatTo2Decimal(item.quantity)}</td>
                                        <td class="print-text-right">${formatTo2Decimal(item.price)}</td>
                                        <td class="print-text-right">${formatTo2Decimal(itemTotal)}</td>
                                    </tr>
                                `;
            }).join('') || ''}
                        </tbody>
                        <tr>
                            <td colSpan="10" style={{ borderBottom: '1px solid #000' }}></td>
                        </tr>
                    </table>

                    <table class="print-totals-table">
                        <tbody>
                            <tr>
                                <td><strong>Sub-Total:</strong></td>
                                <td class="print-text-right">${formatTo2Decimal(printData.bill.subTotal)}</td>
                            </tr>
                            <tr>
                                <td><strong>Discount:</strong></td>
                                <td class="print-text-right">${formatTo2Decimal(printData.bill.discountAmount)}</td>
                            </tr>
                            <tr>
                                <td><strong>Non-Taxable:</strong></td>
                                <td class="print-text-right">${formatTo2Decimal(printData.bill.nonVatSalesReturn)}</td>
                            </tr>
                            <tr>
                                <td><strong>Taxable Amount:</strong></td>
                                <td class="print-text-right">${formatTo2Decimal(printData.bill.taxableAmount)}</td>
                            </tr>
                            ${!printData.bill.isVatExempt ? `
                                <tr>
                                    <td><strong>VAT (${printData.bill.vatPercentage || 0}%):</strong></td>
                                    <td class="print-text-right">${formatTo2Decimal(printData.bill.vatAmount)}</td>
                                </tr>
                            ` : ''}
                            <tr>
                                <td><strong>Round Off:</strong></td>
                                <td class="print-text-right">${formatTo2Decimal(printData.bill.roundOffAmount)}</td>
                            </tr>
                            <tr>
                                <td><strong>Grand Total:</strong></td>
                                <td class="print-text-right">${formatTo2Decimal(printData.bill.totalAmount)}</td>
                            </tr>
                        </tbody>
                    </table>

                    <div class="print-amount-in-words">
                        <strong>In Words:</strong> ${convertToRupeesAndPaisa(printData.bill.totalAmount || 0)} Only.
                    </div>
                    <br /><br />
                    <div class="print-signature-area">
                        <div class="print-signature-box">Received By</div>
                        <div class="print-signature-box">Prepared By: ${printData.bill.user?.name || ''}</div>
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
            .print-invoice-container {
                width: 100%;
                max-width: 210mm;
                margin: 0 auto;
                padding: 2mm;
            }
            .print-invoice-header {
                text-align: center;
                margin-bottom: 3mm;
                border-bottom: 1px solid #000;
                padding-bottom: 2mm;
            }
            .print-invoice-title {
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
            .print-invoice-details {
                display: flex;
                justify-content: space-between;
                margin: 2mm 0;
                font-size: 8pt;
            }
            .print-invoice-table {
                width: 100%;
                border-collapse: collapse;
                margin: 3mm 0;
                font-size: 8pt;
                border: none;
                table-layout: fixed;
            }
            .print-invoice-table thead {
                border-top: 1px solid #000;
                border-bottom: 1px solid #000;
            }
            .print-invoice-table th {
                background-color: transparent;
                border: none;
                padding: 1mm;
                text-align: left;
                font-weight: bold;
            }
            .print-invoice-table td {
                border: none;
                padding: 1mm;
                border-bottom: 1px solid #eee;
            }
            .print-invoice-table th:nth-child(1),
            .print-invoice-table td:nth-child(1) {
                width: 4%;
            }
            .print-invoice-table th:nth-child(2),
            .print-invoice-table td:nth-child(2) {
                width: 7%;
            }
            .print-invoice-table th:nth-child(3),
            .print-invoice-table td:nth-child(3) {
                width: 8%;
            }
            .print-invoice-table th:nth-child(4),
            .print-invoice-table td:nth-child(4) {
                width: 25%;
            }
            .print-invoice-table th:nth-child(5),
            .print-invoice-table td:nth-child(5) {
                width: 6%;
            }
            .print-invoice-table th:nth-child(6),
            .print-invoice-table td:nth-child(6) {
                width: 8%;
            }
            .print-invoice-table th:nth-child(7),
            .print-invoice-table td:nth-child(7) {
                width: 8%;
            }
            .print-invoice-table th:nth-child(8),
            .print-invoice-table td:nth-child(8) {
                width: 6%;
                text-align: right;
            }
            .print-invoice-table th:nth-child(9),
            .print-invoice-table td:nth-child(9) {
                width: 8%;
                text-align: right;
            }
            .print-invoice-table th:nth-child(10),
            .print-invoice-table td:nth-child(10) {
                width: 10%;
                text-align: right;
                padding-right: 2mm;
            }
            .print-invoice-table td:nth-child(9),
            .print-invoice-table td:nth-child(10) {
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
                    <title>Sales_Return_${printData.bill.billNumber}</title>
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
                    </script>
                </body>
            </html>
        `);
            printWindow.document.close();

            document.body.removeChild(tempDiv);
        } catch (error) {
            console.error('Error fetching print data:', error);
            setNotification({
                show: true,
                message: 'Bill saved but failed to load print data',
                type: 'warning'
            });
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

    const totals = calculateTotal();

    useEffect(() => {
        if (roundOffSalesReturn && !manualRoundOffOverride) {
            setFormData(prev => ({
                ...prev,
                roundOffAmount: totals.autoRoundOffAmount
            }));
        }
    }, [roundOffSalesReturn, manualRoundOffOverride, totals.autoRoundOffAmount]);

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
                    <VirtualizedItemListForSales
                        items={itemsToShow}
                        onItemClick={(item) => addItemToBill(item)}
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
    }, [showItemDropdown, searchResults, searchQuery, isSearching, hasMoreSearchResults, searchPage, totalSearchItems]);

    return (
        <div className="container-fluid">
            <Header />
            <div className="card mt-2 shadow-lg p-2 animate__animated animate__fadeInUp expanded-card ledger-card compact">
                <div className="card-header">
                    <div className="d-flex justify-content-between align-items-center">
                        <h2 className="card-title mb-0">
                            <i className="bi bi-file-text me-2"></i>
                            Credit Sales Return Entry
                        </h2>
                        <div>
                            {formData.billNumber === '' && (
                                <span className="badge bg-danger me-2">Invoice number is required!</span>
                            )}
                            {dateErrors.transactionDateNepali && (
                                <span className="badge bg-danger me-2">{dateErrors.transactionDateNepali}</span>
                            )}
                            {dateErrors.nepaliDate && (
                                <span className="badge bg-danger">{dateErrors.nepaliDate}</span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="card-body p-2 p-md-3">
                    <form onSubmit={handleSubmit} id="billForm" className="needs-validation" noValidate>
                        {/* Date and Basic Info Row */}
                        <div className="row g-2 mb-3">
                            {company.dateFormat === 'nepali' || company.dateFormat === 'Nepali' ? (
                                <>
                                    <div className="col-12 col-md-6 col-lg-2">
                                        <div className="position-relative">
                                            <input
                                                type="text"
                                                name="transactionDateNepali"
                                                id="transactionDateNepali"
                                                ref={company.dateFormat === 'nepali' || company.dateFormat === 'Nepali' ? transactionDateRef : null}
                                                autoComplete='off'
                                                className={`form-control form-control-sm no-date-icon ${dateErrors.transactionDateNepali ? 'is-invalid' : ''}`}
                                                value={formData.transactionDateNepali}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    const sanitizedValue = value.replace(/[^0-9/-]/g, '');
                                                    if (sanitizedValue.length <= 10) {
                                                        setFormData({ ...formData, transactionDateNepali: sanitizedValue });
                                                        setDateErrors(prev => ({ ...prev, transactionDateNepali: '' }));
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
                                                                transactionDateNepali: correctedDate
                                                            });
                                                            setDateErrors(prev => ({ ...prev, transactionDateNepali: '' }));
                                                            setNotification({
                                                                show: true,
                                                                message: 'Date required. Auto-corrected to current date.',
                                                                type: 'warning',
                                                                duration: 3000
                                                            });
                                                            handleKeyDown(e, 'transactionDateNepali');
                                                        } else if (dateErrors.transactionDateNepali) {
                                                            e.target.focus();
                                                        } else {
                                                            handleKeyDown(e, 'transactionDateNepali');
                                                        }
                                                    }
                                                }}
                                                onPaste={(e) => {
                                                    e.preventDefault();
                                                    const pastedData = e.clipboardData.getData('text');
                                                    const cleanedData = pastedData.replace(/[^0-9/-]/g, '');
                                                    const newValue = formData.transactionDateNepali + cleanedData;
                                                    if (newValue.length <= 10) {
                                                        setFormData({ ...formData, transactionDateNepali: newValue });
                                                    }
                                                }}
                                                onBlur={(e) => {
                                                    try {
                                                        const dateStr = e.target.value.trim();
                                                        if (!dateStr) {
                                                            setDateErrors(prev => ({ ...prev, transactionDateNepali: '' }));
                                                            return;
                                                        }
                                                        const nepaliDateFormat = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/;
                                                        if (!nepaliDateFormat.test(dateStr)) {
                                                            const currentDate = new NepaliDate();
                                                            const correctedDate = currentDate.format('YYYY-MM-DD');
                                                            setFormData({
                                                                ...formData,
                                                                transactionDateNepali: correctedDate
                                                            });
                                                            setDateErrors(prev => ({ ...prev, transactionDateNepali: '' }));
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
                                                                transactionDateNepali: correctedDate
                                                            });
                                                            setDateErrors(prev => ({ ...prev, transactionDateNepali: '' }));
                                                            setNotification({
                                                                show: true,
                                                                message: 'Invalid Nepali date. Auto-corrected to current date.',
                                                                type: 'warning',
                                                                duration: 3000
                                                            });
                                                        } else {
                                                            setFormData({
                                                                ...formData,
                                                                transactionDateNepali: nepaliDate.format('YYYY-MM-DD')
                                                            });
                                                            setDateErrors(prev => ({ ...prev, transactionDateNepali: '' }));
                                                        }
                                                    } catch (error) {
                                                        const currentDate = new NepaliDate();
                                                        const correctedDate = currentDate.format('YYYY-MM-DD');
                                                        setFormData({
                                                            ...formData,
                                                            transactionDateNepali: correctedDate
                                                        });
                                                        setDateErrors(prev => ({ ...prev, transactionDateNepali: '' }));
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
                                                Transaction Date: <span className="text-danger">*</span>
                                            </label>
                                            {dateErrors.transactionDateNepali && (
                                                <div className="invalid-feedback d-block" style={{ fontSize: '0.7rem' }}>
                                                    {dateErrors.transactionDateNepali}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="col-12 col-md-6 col-lg-2">
                                        <div className="position-relative">
                                            <input
                                                type="text"
                                                name="nepaliDate"
                                                id="nepaliDate"
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
                                                Invoice Date: <span className="text-danger">*</span>
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
                                <>
                                    <div className="col-12 col-md-6 col-lg-2">
                                        <div className="position-relative">
                                            <input
                                                type="date"
                                                name="transactionDateRoman"
                                                id="transactionDateRoman"
                                                className="form-control form-control-sm"
                                                ref={company.dateFormat === 'nepali' ? null : transactionDateRef}
                                                value={formData.transactionDateRoman}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    const selectedDate = new Date(value);
                                                    const today = new Date();
                                                    today.setHours(0, 0, 0, 0);
                                                    if (selectedDate > today) {
                                                        const todayStr = today.toISOString().split('T')[0];
                                                        setFormData({ ...formData, transactionDateRoman: todayStr });
                                                        setNotification({
                                                            show: true,
                                                            message: 'Future date not allowed. Auto-corrected to today.',
                                                            type: 'warning',
                                                            duration: 3000
                                                        });
                                                    } else {
                                                        setFormData({ ...formData, transactionDateRoman: value });
                                                    }
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        const value = e.target.value;
                                                        if (!value) {
                                                            const today = new Date();
                                                            const todayStr = today.toISOString().split('T')[0];
                                                            setFormData({ ...formData, transactionDateRoman: todayStr });
                                                            setNotification({
                                                                show: true,
                                                                message: 'Date required. Auto-corrected to today.',
                                                                type: 'warning',
                                                                duration: 3000
                                                            });
                                                        }
                                                        handleKeyDown(e, 'transactionDateRoman');
                                                    }
                                                }}
                                                onBlur={(e) => {
                                                    const value = e.target.value;
                                                    if (!value) {
                                                        const today = new Date();
                                                        const todayStr = today.toISOString().split('T')[0];
                                                        setFormData({ ...formData, transactionDateRoman: todayStr });
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
                                                Transaction Date: <span className="text-danger">*</span>
                                            </label>
                                        </div>
                                    </div>

                                    <div className="col-12 col-md-6 col-lg-2">
                                        <div className="position-relative">
                                            <input
                                                type="date"
                                                name="billDate"
                                                id="billDate"
                                                className="form-control form-control-sm"
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
                                                Invoice Date: <span className="text-danger">*</span>
                                            </label>
                                        </div>
                                    </div>
                                </>
                            )}

                            <div className="col-12 col-md-6 col-lg-2">
                                <div className="position-relative">
                                    <input
                                        type="text"
                                        name="billNumber"
                                        id="billNumber"
                                        className="form-control form-control-sm"
                                        value={formData.billNumber}
                                        readOnly
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleKeyDown(e, 'billNumber');
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
                                        Inv. No:
                                    </label>
                                </div>
                            </div>

                            <div className="col-12 col-md-6 col-lg-2">
                                <div className="position-relative">
                                    <select
                                        className="form-control form-control-sm"
                                        name="paymentMode"
                                        id="paymentMode"
                                        value={formData.paymentMode}
                                        onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleKeyDown(e, 'paymentMode');
                                            }
                                        }}
                                        style={{
                                            height: '26px',
                                            fontSize: '0.875rem',
                                            paddingTop: '0.25rem',
                                            width: '100%'
                                        }}
                                    >
                                        <option value="credit">credit</option>
                                        <option value="cash">cash</option>
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
                                        Payment Mode:
                                    </label>
                                </div>
                            </div>

                            <div className="col-12 col-md-6 col-lg-2">
                                <div className="position-relative">
                                    <div className="input-group">
                                        <input
                                            type="text"
                                            name="salesInvoiceNumber"
                                            id="salesInvoiceNumber"
                                            className="form-control form-control-sm"
                                            autoComplete='off'
                                            value={formData.salesInvoiceNumber || ''}
                                            onChange={(e) => setFormData({ ...formData, salesInvoiceNumber: e.target.value })}
                                            onBlur={fetchSalesBillDetails}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    fetchSalesBillDetails(e);
                                                    handleKeyDown(e, 'salesInvoiceNumber');
                                                }
                                            }}
                                            placeholder="Enter org. invoice"
                                            disabled={salesInvoiceLoading}
                                            style={{
                                                height: '26px',
                                                fontSize: '0.875rem',
                                                paddingTop: '0.75rem',
                                                width: '100%'
                                            }}
                                        />
                                        {salesInvoiceLoading && (
                                            <span className="input-group-text">
                                                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                            </span>
                                        )}
                                    </div>
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
                                        Org. Inv. No:
                                    </label>
                                </div>
                            </div>

                            <div className="col-12 col-md-6 col-lg-2">
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

                        <div className="row g-2 mb-3">
                            <div className="col-12 col-md-6">
                                <div className="position-relative">
                                    <input
                                        type="text"
                                        id="account"
                                        name="account"
                                        className="form-control form-control-sm"
                                        value={formData.accountName}
                                        onClick={() => setShowAccountModal(true)}
                                        onFocus={() => setShowAccountModal(true)}
                                        readOnly
                                        required
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleKeyDown(e, 'account');
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
                                        Party Name: <span className="text-danger">*</span>
                                    </label>
                                    <input type="hidden" id="accountId" name="accountId" value={formData.accountId} />
                                </div>
                            </div>

                            <div className="col-12 col-md-2">
                                <div className="position-relative">
                                    <div
                                        className="form-control form-control-sm"
                                        style={{
                                            height: '26px',
                                            fontSize: '0.875rem',
                                            paddingTop: '0.4rem',
                                            width: '100%',
                                            border: '1px solid #ced4da',
                                            borderRadius: '0.375rem',
                                            overflow: 'hidden',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        <AccountBalanceDisplay
                                            accountId={formData.accountId}
                                            api={api}
                                            newTransactionAmount={parseFloat(totals.totalAmount) || 0}
                                            compact={true}
                                            dateFormat={company.dateFormat}
                                            refreshTrigger={showAccountCreationModal}
                                            style={{
                                                fontSize: '0.875rem',
                                                lineHeight: '1',
                                                margin: '0',
                                                padding: '0',
                                                display: 'inline-block',
                                                verticalAlign: 'middle'
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="col-12 col-md-2">
                                <div className="position-relative">
                                    <input
                                        type="text"
                                        id="address"
                                        className="form-control form-control-sm"
                                        value={formData.accountAddress}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleKeyDown(e, 'address');
                                            }
                                        }}
                                        readOnly
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
                                        Address:
                                    </label>
                                </div>
                            </div>

                            <div className="col-12 col-md-2">
                                <div className="position-relative">
                                    <input
                                        type="text"
                                        id="pan"
                                        name="pan"
                                        className="form-control form-control-sm"
                                        value={formData.accountPan}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleKeyDown(e, 'pan');
                                            }
                                        }}
                                        readOnly
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
                                        Vat No:
                                    </label>
                                </div>
                            </div>
                        </div>

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
                                                                    const discountInput = document.getElementById('discountPercentage');
                                                                    if (discountInput) {
                                                                        discountInput.focus();
                                                                        discountInput.select();
                                                                    }
                                                                }, 50);
                                                            } else {
                                                                setShowHeaderItemModal(true);
                                                            }
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
                                                id='headerBatch'
                                                value={selectedItemBatchNumber}
                                                onChange={(e) => setSelectedItemBatchNumber(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if ((e.key === 'Tab' || e.key === 'Enter')) {
                                                        e.preventDefault();
                                                        document.getElementById('headerExpiryDate').focus();
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
                                                id="headerExpiryDate"
                                                value={selectedItemExpiryDate}
                                                onChange={(e) => setSelectedItemExpiryDate(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if ((e.key === 'Tab' || e.key === 'Enter')) {
                                                        e.preventDefault();
                                                        document.getElementById('headerQuantity').focus();
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
                                                id="headerQuantity"
                                                value={selectedItemQuantity}
                                                onChange={(e) => {
                                                    const value = parseFloat(e.target.value) || 0;
                                                    setSelectedItemQuantity(value);
                                                }}
                                                onFocus={(e) => e.target.select()}
                                                onKeyDown={(e) => {
                                                    if ((e.key === 'Tab' || e.key === 'Enter')) {
                                                        e.preventDefault();
                                                        document.getElementById('headerRate').focus();
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
                                                id="headerRate"
                                                value={Math.round(selectedItemRate * 100) / 100}
                                                onChange={(e) => setSelectedItemRate(e.target.value)}
                                                onFocus={(e) => e.target.select()}
                                                onKeyDown={(e) => {
                                                    if ((e.key === 'Tab' || e.key === 'Enter')) {
                                                        e.preventDefault();
                                                        document.getElementById('insertButton').focus();
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
                                                onClick={() => {
                                                    if (selectedItemForInsert && selectedItemQuantity > 0) {
                                                        insertSelectedItem();
                                                        setTimeout(() => {
                                                            if (itemsTableRef.current) {
                                                                itemsTableRef.current.scrollTop = itemsTableRef.current.scrollHeight;
                                                            }
                                                        }, 50);
                                                    }
                                                }}
                                                disabled={!selectedItemForInsert}
                                                title={selectedItemForInsert ?
                                                    `Insert item ${selectedItemQuantity > 0 ? `(Quantity: ${selectedItemQuantity})` : '(Quantity will be 0)'}`
                                                    : 'Insert item'}
                                                onKeyDown={(e) => {
                                                    if ((e.key === 'Tab' || e.key === 'Enter')) {
                                                        e.preventDefault();
                                                        if (selectedItemForInsert && selectedItemQuantity > 0) {
                                                            insertSelectedItem();
                                                            setTimeout(() => {
                                                                if (itemsTableRef.current) {
                                                                    itemsTableRef.current.scrollTop = itemsTableRef.current.scrollHeight;
                                                                }
                                                            }, 50);
                                                        }
                                                    }
                                                }}
                                                style={{
                                                    height: '20px',
                                                    fontSize: '0.7rem',
                                                    fontWeight: 'bold',
                                                    backgroundColor: '#198754',
                                                    borderColor: '#198754',
                                                    opacity: !selectedItemForInsert ? 0.5 : 1
                                                }}
                                            >
                                                INSERT
                                            </button>
                                        </td>
                                    </tr>

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
                                        <th width="10%" style={{ padding: '3px', fontSize: '0.75rem' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody id="items" style={{ backgroundColor: '#fff' }}>
                                    {items.map((item, index) => {
                                        return (
                                            <tr key={index} className={`item ${item.vatStatus === 'vatable' ? 'vatable-item' : 'non-vatable-item'}`} style={{ height: '26px' }}>
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
                                                        readOnly={!!salesInvoiceData}
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
                                                        readOnly={!!salesInvoiceData}
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
                                                        onChange={(e) => {
                                                            const value = parseFloat(e.target.value) || 0;
                                                            updateItemField(index, 'quantity', value);
                                                        }}
                                                        onBlur={(e) => {
                                                            const value = parseFloat(e.target.value) || 0;
                                                            updateItemField(index, 'quantity', value);
                                                        }}
                                                        required
                                                        min="0"
                                                        step="0.01"
                                                        onFocus={(e) => {
                                                            e.target.select();
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                document.getElementById(`price-${index}`)?.focus();
                                                            } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                                                                e.preventDefault();
                                                                const currentValue = parseFloat(e.target.value) || 0;
                                                                const step = e.shiftKey ? 10 : (e.ctrlKey ? 0.1 : 1);
                                                                const newValue = e.key === 'ArrowUp' ? currentValue + step : Math.max(0, currentValue - step);
                                                                updateItemField(index, 'quantity', newValue);
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
                                                    {item.unitName || ''}
                                                    <input type="hidden" name={`items[${index}][unitId]`} value={item.unitId} />
                                                </td>
                                                <td style={{ padding: '3px' }}>
                                                    <input
                                                        type="number"
                                                        name={`items[${index}][price]`}
                                                        className="form-control form-control-sm"
                                                        id={`price-${index}`}
                                                        value={Math.round(item.price * 100) / 100}
                                                        onChange={(e) => updateItemField(index, 'price', e.target.value)}
                                                        onFocus={(e) => {
                                                            e.target.select();
                                                            setTimeout(() => {
                                                                const row = e.target.closest('tr');
                                                                if (row && itemsTableRef.current) {
                                                                    row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                                                                }
                                                            }, 10);
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                itemSearchRef.current?.focus();
                                                            }
                                                        }}
                                                        readOnly={!!salesInvoiceData}
                                                        style={{
                                                            height: '20px',
                                                            fontSize: '0.75rem',
                                                            padding: '0 4px'
                                                        }}
                                                    />
                                                </td>
                                                <td className="item-amount" style={{ padding: '3px', fontSize: '0.75rem' }}>{formatter.format(item.amount)}</td>
                                                <td className="text-center" style={{ padding: '2px', whiteSpace: 'nowrap' }}>
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-info py-0 px-1"
                                                        onClick={() => fetchLastTransactions(item.itemId)}
                                                        title="View last transactions"
                                                        disabled={isLoadingTransactions}
                                                        style={{
                                                            height: '18px',
                                                            width: '18px',
                                                            minWidth: '18px',
                                                            fontSize: '0.6rem',
                                                            marginRight: '2px',
                                                            backgroundColor: '#0dcaf0',
                                                            borderColor: '#0dcaf0'
                                                        }}
                                                    >
                                                        {isLoadingTransactions ? (
                                                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" style={{ width: "8px", height: "8px" }}></span>
                                                        ) : (
                                                            <i className="bi bi-clock-history"></i>
                                                        )}
                                                    </button>
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
                                                </td>
                                            </tr>
                                        );
                                    })}
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
                                        <th colSpan="6" className="text-center bg-light py-1" style={{ padding: '2px' }}>Bill Details</th>
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
                                        <td style={{ width: '15%', padding: '1px' }}>
                                            <label className="form-label mb-0" style={{ fontSize: '0.8rem' }}>Discount %:</label>
                                        </td>
                                        <td style={{ width: '20%', padding: '1px' }}>
                                            <div className="position-relative">
                                                <input
                                                    type="number"
                                                    step="any"
                                                    name="discountPercentage"
                                                    id="discountPercentage"
                                                    className="form-control form-control-sm"
                                                    value={formData.discountPercentage}
                                                    onChange={handleDiscountPercentageChange}
                                                    onFocus={(e) => {
                                                        e.target.select();
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            handleKeyDown(e, 'discountPercentage');
                                                        }
                                                    }}
                                                    style={{
                                                        height: '22px',
                                                        fontSize: '0.875rem',
                                                        paddingTop: '0.5rem',
                                                        width: '100%'
                                                    }}
                                                />
                                            </div>
                                        </td>
                                        <td style={{ width: '15%', padding: '1px' }}>
                                            <label className="form-label mb-0" style={{ fontSize: '0.8rem' }}>Discount (Rs.):</label>
                                        </td>
                                        <td style={{ width: '15%', padding: '1px' }}>
                                            <div className="position-relative">
                                                <input
                                                    type="number"
                                                    step="any"
                                                    name="discountAmount"
                                                    id="discountAmount"
                                                    value={formData.discountAmount}
                                                    className="form-control form-control-sm"
                                                    onChange={handleDiscountAmountChange}
                                                    onFocus={(e) => {
                                                        e.target.select();
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            handleKeyDown(e, 'discountAmount');
                                                        }
                                                    }}
                                                    style={{
                                                        height: '22px',
                                                        fontSize: '0.875rem',
                                                        paddingTop: '0.5rem',
                                                        width: '100%'
                                                    }}
                                                />
                                            </div>
                                        </td>
                                    </tr>

                                    {company.vatEnabled && formData.isVatExempt !== 'true' && (
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
                                    )}

                                    <tr>
                                        <td style={{ padding: '1px' }}>
                                            <label className="form-label mb-0" style={{ fontSize: '0.8rem' }}>Round Off:</label>
                                        </td>
                                        {/* <td style={{ padding: '1px' }}>
                                            <div className="position-relative">
                                                <input
                                                    type="number"
                                                    className="form-control form-control-sm"
                                                    step="any"
                                                    id="roundOffAmount"
                                                    name="roundOffAmount"
                                                    value={formData.roundOffAmount}
                                                    onChange={(e) => setFormData({ ...formData, roundOffAmount: e.target.value })}
                                                    onFocus={(e) => {
                                                        e.target.select();
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            document.getElementById('saveBill')?.focus();
                                                        }
                                                    }}
                                                    style={{
                                                        height: '22px',
                                                        fontSize: '0.875rem',
                                                        paddingTop: '0.5rem',
                                                        width: '100%'
                                                    }}
                                                />
                                                <label
                                                    className="position-absolute"
                                                    style={{
                                                        top: '-0.4rem',
                                                        left: '0.5rem',
                                                        fontSize: '0.7rem',
                                                        backgroundColor: 'white',
                                                        padding: '0 0.25rem',
                                                        color: '#6c757d',
                                                        fontWeight: '500'
                                                    }}
                                                >
                                                    Rs.
                                                </label>
                                            </div>
                                        </td> */}
                                        <td style={{ padding: '1px', verticalAlign: 'middle' }}>
                                            <div className="position-relative" style={{ minWidth: '150px' }}>
                                                <div className="input-group input-group-sm" style={{ flexWrap: 'nowrap' }}>
                                                    <input
                                                        type="number"
                                                        className="form-control form-control-sm"
                                                        step="any"
                                                        id="roundOffAmount"
                                                        name="roundOffAmount"
                                                        value={roundOffSalesReturn && !manualRoundOffOverride ? totals.autoRoundOffAmount.toFixed(2) : formData.roundOffAmount}
                                                        onChange={(e) => {
                                                            if (roundOffSalesReturn) {
                                                                setManualRoundOffOverride(true);
                                                            }
                                                            setFormData({ ...formData, roundOffAmount: parseFloat(e.target.value) || 0 });
                                                        }}
                                                        onFocus={(e) => {
                                                            e.target.select();
                                                            if (roundOffSalesReturn && !manualRoundOffOverride) {
                                                                setFormData(prev => ({
                                                                    ...prev,
                                                                    roundOffAmount: totals.autoRoundOffAmount.toFixed(2)
                                                                }));
                                                            }
                                                        }}
                                                        onBlur={(e) => {
                                                            if (roundOffSalesReturn && parseFloat(e.target.value) === totals.autoRoundOffAmount) {
                                                                setManualRoundOffOverride(false);
                                                            }
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                document.getElementById('saveBill')?.focus();
                                                            }
                                                        }}
                                                        style={{
                                                            height: '28px',
                                                            fontSize: '0.875rem',
                                                            width: 'auto',
                                                            flex: '1'
                                                        }}
                                                    />
                                                    {roundOffSalesReturn && (
                                                        <button
                                                            type="button"
                                                            className="btn btn-outline-secondary btn-sm"
                                                            onClick={() => {
                                                                if (manualRoundOffOverride) {
                                                                    setManualRoundOffOverride(false);
                                                                    setFormData(prev => ({
                                                                        ...prev,
                                                                        roundOffAmount: totals.autoRoundOffAmount.toFixed(2)
                                                                    }));
                                                                } else {
                                                                    setManualRoundOffOverride(true);
                                                                    setFormData(prev => ({
                                                                        ...prev,
                                                                        roundOffAmount: totals.autoRoundOffAmount.toFixed(2)
                                                                    }));
                                                                }
                                                            }}
                                                            title={manualRoundOffOverride ? "Use auto round-off" : "Switch to manual input"}
                                                            style={{
                                                                height: '28px',
                                                                fontSize: '0.75rem',
                                                                padding: '0 8px',
                                                                whiteSpace: 'nowrap'
                                                            }}
                                                        >
                                                            {manualRoundOffOverride ? (
                                                                <i className="bi bi-arrow-clockwise"></i>
                                                            ) : (
                                                                <i className="bi bi-pencil"></i>
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1px' }}>
                                            <label className="form-label mb-0" style={{ fontSize: '0.8rem' }}>Total Amount:</label>
                                        </td>
                                        <td style={{ padding: '1px' }}>
                                            <p className="form-control-plaintext mb-0" style={{ fontSize: '0.8rem' }}>Rs. {totals.totalAmount.toFixed(2)}</p>
                                        </td>
                                        <td style={{ padding: '1px' }}>
                                            <label className="form-label mb-0" style={{ fontSize: '0.8rem' }}>In Words:</label>
                                        </td>
                                        <td style={{ padding: '1px' }}>
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

                        {/* Action Buttons */}
                        <div className="d-flex justify-content-between align-items-center">
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
                            </div>
                        </div>
                    </form>
                </div>
            </div>

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
                                                            selectItemForBatchSelection(itemToAdd);
                                                            setShowHeaderItemModal(false);
                                                        }
                                                    } else {
                                                        if (!headerSearchQuery.trim()) {
                                                            setShowHeaderItemModal(false);
                                                            setTimeout(() => {
                                                                const discountInput = document.getElementById('discountPercentage');
                                                                if (discountInput) {
                                                                    discountInput.focus();
                                                                    discountInput.select();
                                                                }
                                                            }, 50);
                                                        }
                                                    }
                                                } else if (e.key === 'F6') {
                                                    e.preventDefault();
                                                    setShowItemsModal(true);
                                                    setShowHeaderItemModal(false);
                                                    setHeaderSearchQuery('');
                                                    setHeaderShouldShowLastSearchResults(false);
                                                    setHeaderLastSearchQuery('');
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
                                            <VirtualizedItemListForSales
                                                items={headerSearchResults}
                                                onItemClick={(item) => {
                                                    selectItemForBatchSelection(item);
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

            {/* Batch Selection Modal */}
            {/* {showBatchSelectionModal && selectedItemForBatch && (
                <BatchSelectionModal
                    item={selectedItemForBatch}
                    stockEntries={selectedItemStockEntries}
                    onSelect={handleBatchSelect}
                    onClose={() => {
                        setShowBatchSelectionModal(false);
                        setShowHeaderItemModal(true);
                    }}
                    notification={notification}
                    setNotification={setNotification}
                />
            )} */}

            {/* Batch Selection Modal */}
            {showBatchSelectionModal && selectedItemForBatch && (
                <div className="modal fade show" id="batchModal" tabIndex="-1" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content" style={{ borderRadius: '8px', overflow: 'hidden', minHeight: '200px' }}>
                            <div className="modal-header py-0" style={{ backgroundColor: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
                                <h5 className="modal-title mb-0 mx-auto fw-semibold" style={{ fontSize: '1.1rem' }}>
                                    <i className="bi bi-box-seam me-2"></i>
                                    Batch Information: {selectedItemForBatch.name}
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close position-absolute"
                                    style={{ right: '1rem', top: '0.25rem' }}
                                    onClick={() => {
                                        setShowBatchSelectionModal(false);
                                        setSelectedItemForBatch(null);
                                        setShowHeaderItemModal(true);
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
                                                    <th className="py-0" style={{ padding: '0px', fontSize: '0.75rem' }}>MRP</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedItemForBatch.stockEntries
                                                    .filter(entry => entry.quantity > 0)
                                                    .map((entry, index) => {
                                                        // Calculate used stock for this batch in current bill
                                                        const usedStock = items
                                                            .filter(item =>
                                                                item.itemId === selectedItemForBatch.id &&
                                                                item.batchNumber === entry.batchNumber &&
                                                                item.uniqueUuid === entry.uniqueUuid
                                                            )
                                                            .reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);

                                                        const availableStock = Math.max(0, (entry.quantity || 0) - usedStock);

                                                        return (
                                                            <tr
                                                                key={index}
                                                                className={`batch-row text-center ${index === 0 ? 'bg-primary text-white' : ''}`}
                                                                style={{
                                                                    height: '24px',
                                                                    cursor: availableStock > 0 ? 'pointer' : 'not-allowed',
                                                                    fontSize: '0.75rem',
                                                                    opacity: availableStock > 0 ? 1 : 0.6
                                                                }}
                                                                onClick={() => {
                                                                    if (availableStock > 0) {
                                                                        handleBatchSelect(entry);
                                                                    }
                                                                }}
                                                                tabIndex={availableStock > 0 ? 0 : -1}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter' && availableStock > 0) {
                                                                        e.preventDefault();
                                                                        handleBatchSelect(entry);
                                                                    } else if (e.key === 'ArrowDown') {
                                                                        e.preventDefault();
                                                                        const nextRow = e.currentTarget.nextElementSibling;
                                                                        if (nextRow) {
                                                                            e.currentTarget.classList.remove('bg-primary', 'text-white');
                                                                            nextRow.classList.add('bg-primary', 'text-white');
                                                                            nextRow.focus();

                                                                            const tableContainer = document.getElementById('batchTableContainer');
                                                                            if (tableContainer) {
                                                                                const rowRect = nextRow.getBoundingClientRect();
                                                                                const containerRect = tableContainer.getBoundingClientRect();

                                                                                if (rowRect.bottom > containerRect.bottom) {
                                                                                    nextRow.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                                                                                }
                                                                            }
                                                                        }
                                                                    } else if (e.key === 'ArrowUp') {
                                                                        e.preventDefault();
                                                                        const prevRow = e.currentTarget.previousElementSibling;
                                                                        if (prevRow) {
                                                                            e.currentTarget.classList.remove('bg-primary', 'text-white');
                                                                            prevRow.classList.add('bg-primary', 'text-white');
                                                                            prevRow.focus();

                                                                            const tableContainer = document.getElementById('batchTableContainer');
                                                                            if (tableContainer) {
                                                                                const rowRect = prevRow.getBoundingClientRect();
                                                                                const containerRect = tableContainer.getBoundingClientRect();

                                                                                if (rowRect.top < containerRect.top) {
                                                                                    prevRow.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                                                                                }
                                                                            }
                                                                        }
                                                                    } else if (e.key === 'Escape') {
                                                                        e.preventDefault();
                                                                        setShowBatchSelectionModal(false);
                                                                        setSelectedItemForBatch(null);
                                                                        setShowHeaderItemModal(true);
                                                                    }
                                                                }}
                                                                onFocus={(e) => {
                                                                    if (availableStock > 0) {
                                                                        document.querySelectorAll('.batch-row').forEach(row => {
                                                                            row.classList.remove('bg-primary', 'text-white');
                                                                        });
                                                                        e.currentTarget.classList.add('bg-primary', 'text-white');

                                                                        const tableContainer = document.getElementById('batchTableContainer');
                                                                        if (tableContainer) {
                                                                            const rowRect = e.currentTarget.getBoundingClientRect();
                                                                            const containerRect = tableContainer.getBoundingClientRect();

                                                                            if (rowRect.bottom > containerRect.bottom) {
                                                                                e.currentTarget.scrollIntoView({ block: 'end', behavior: 'smooth' });
                                                                            } else if (rowRect.top < containerRect.top) {
                                                                                e.currentTarget.scrollIntoView({ block: 'start', behavior: 'smooth' });
                                                                            }
                                                                        }
                                                                    }
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    if (availableStock > 0) {
                                                                        document.querySelectorAll('.batch-row').forEach(row => {
                                                                            row.classList.remove('bg-primary', 'text-white');
                                                                        });
                                                                        e.currentTarget.classList.add('bg-primary', 'text-white');
                                                                    }
                                                                }}
                                                                title={availableStock > 0
                                                                    ? `Total: ${entry.quantity} | Used in current bill: ${usedStock} | Available: ${availableStock}\nClick to select this batch`
                                                                    : `Total: ${entry.quantity} | Used in current bill: ${usedStock} | Available: ${availableStock}\nOut of stock`
                                                                }
                                                            >
                                                                <td className="align-middle" style={{ padding: '3px' }}>{entry.batchNumber || 'N/A'}</td>
                                                                <td className="align-middle" style={{ padding: '3px' }}>
                                                                    {entry.expiryDate ? new Date(entry.expiryDate).toLocaleDateString('en-NP') : 'N/A'}
                                                                </td>
                                                                <td className="align-middle fw-semibold" style={{ padding: '3px' }}>
                                                                    <span
                                                                        style={{
                                                                            color: availableStock <= 0 ? '#dc3545' :
                                                                                availableStock < 5 ? '#ffc107' :
                                                                                    '#198754',
                                                                            position: 'relative'
                                                                        }}
                                                                    >
                                                                        {availableStock}
                                                                        {usedStock > 0 && (
                                                                            <small
                                                                                style={{
                                                                                    fontSize: '0.6rem',
                                                                                    color: '#6c757d',
                                                                                    marginLeft: '2px',
                                                                                    position: 'absolute',
                                                                                    top: '-8px',
                                                                                    right: '-12px'
                                                                                }}
                                                                                title={`Used in current bill: ${usedStock}`}
                                                                            >
                                                                                ({usedStock})
                                                                            </small>
                                                                        )}
                                                                    </span>
                                                                </td>
                                                                <td className="align-middle" style={{ padding: '3px' }}>{Math.round((entry.price || 0) * 100) / 100}</td>
                                                                <td className="align-middle" style={{ padding: '3px' }}>{Math.round((entry.puPrice || 0) * 100) / 100}</td>
                                                                <td className="align-middle" style={{ padding: '3px' }}>{Math.round((entry.mrp || 0) * 100) / 100}</td>
                                                                <td className="d-none">{entry.uniqueUuid}</td>
                                                            </tr>
                                                        );
                                                    })
                                                }
                                            </tbody>
                                        </table>
                                        {selectedItemForBatch.stockEntries && selectedItemForBatch.stockEntries.filter(entry => entry.quantity > 0).length > 6 && (
                                            <div className="text-center py-0" style={{
                                                fontSize: '0.5rem',
                                                color: '#6c757d',
                                                backgroundColor: '#f8f9fa',
                                                borderTop: '1px solid #dee2e6',
                                                position: 'sticky',
                                                bottom: 0
                                            }}>
                                            </div>
                                        )}
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
                                        setShowBatchSelectionModal(false);
                                        setSelectedItemForBatch(null);
                                        setShowHeaderItemModal(true);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            setShowBatchSelectionModal(false);
                                            setSelectedItemForBatch(null);
                                            setShowHeaderItemModal(true);
                                        } else if (e.key === 'Escape') {
                                            e.preventDefault();
                                            setShowBatchSelectionModal(false);
                                            setSelectedItemForBatch(null);
                                            setShowHeaderItemModal(true);
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

            {showAccountModal && (
                <div
                    className="modal fade show"
                    id="accountModal"
                    tabIndex="-1"
                    style={{ display: 'block' }}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                            handleAccountModalClose();
                            setTimeout(() => {
                                document.getElementById('salesInvoiceNumber').focus();
                            }, 0);
                        }
                    }}
                >
                    <div className="modal-dialog modal-xl modal-dialog-centered">
                        <div className="modal-content" style={{ height: '400px' }}>
                            <div className="modal-header py-1">
                                <h5 className="modal-title" id="accountModalLabel" style={{ fontSize: '0.9rem' }}>
                                    Select an Account
                                </h5>
                                <small className="ms-auto text-muted" style={{ fontSize: '0.7rem' }}>
                                    {totalAccounts > 0 ? `${accounts.length} of ${totalAccounts} accounts shown` : 'Loading accounts...'}
                                </small>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={handleAccountModalClose}
                                    aria-label="Close"
                                    style={{ fontSize: '0.6rem', padding: '0.25rem' }}
                                ></button>
                            </div>
                            <div className="p-2 bg-white sticky-top">
                                <input
                                    type="text"
                                    id="searchAccount"
                                    className="form-control form-control-sm"
                                    placeholder="Search Account... (Press F6 to create new account)"
                                    autoFocus
                                    autoComplete='off'
                                    value={accountSearchQuery}
                                    onChange={handleAccountSearch}
                                    onKeyDown={(e) => {
                                        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                                            e.preventDefault();
                                            const firstAccountItem = document.querySelector('.account-item');
                                            if (firstAccountItem) {
                                                firstAccountItem.focus();
                                            }
                                        } else if (e.key === 'Enter') {
                                            e.preventDefault();
                                            const firstAccountItem = document.querySelector('.account-item.active');
                                            if (firstAccountItem) {
                                                const accountId = firstAccountItem.getAttribute('data-account-id');
                                                const account = accounts.find(a => a.id === accountId);
                                                if (account) {
                                                    selectAccount(account);
                                                }
                                            }
                                        } else if (e.key === 'F6') {
                                            e.preventDefault();
                                            setShowAccountCreationModal(true);
                                            handleAccountModalClose();
                                        }
                                    }}
                                    onFocus={() => {
                                        if (accountLastSearchQuery && !accountSearchQuery && accountShouldShowLastSearchResults) {
                                        }
                                    }}
                                    ref={accountSearchRef}
                                    style={{
                                        height: '24px',
                                        fontSize: '0.75rem',
                                        padding: '0.25rem 0.5rem'
                                    }}
                                />
                            </div>
                            <div className="modal-body p-0">
                                <div style={{ height: 'calc(320px - 40px)' }}>
                                    <VirtualizedAccountList
                                        accounts={accounts}
                                        onAccountClick={(account) => {
                                            selectAccount(account);
                                        }}
                                        searchRef={accountSearchRef}
                                        hasMore={hasMoreAccountResults}
                                        isSearching={isAccountSearching}
                                        onLoadMore={loadMoreAccounts}
                                        totalAccounts={totalAccounts}
                                        page={accountSearchPage}
                                        searchQuery={accountShouldShowLastSearchResults ? accountLastSearchQuery : accountSearchQuery}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Transaction Modal */}
            {showTransactionModal && (
                <div className="modal fade show" id="transactionModal" tabIndex="-1" style={{ display: 'block' }} role="dialog" aria-labelledby="transactionModalLabel" aria-modal="true">
                    <div className="modal-dialog modal-xl modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header py-1 px-3" style={{ minHeight: '40px' }}>
                                <h6 className="modal-title mb-0" id="transactionModalLabel" style={{ fontSize: '1rem' }}>
                                    Last Transactions
                                </h6>
                                <button
                                    type="button"
                                    className="close p-0"
                                    onClick={handleTransactionModalClose}
                                    aria-label="Close"
                                    style={{
                                        margin: '0',
                                        fontSize: '1.2rem',
                                        lineHeight: '1',
                                        background: 'none',
                                        border: 'none'
                                    }}
                                >
                                    <span aria-hidden="true">&times;</span>
                                </button>
                            </div>

                            <div className="modal-body p-0">
                                <div className="table-responsive" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                    <table className="table table-sm table-hover mb-0 small">
                                        <thead>
                                            <tr className="sticky-top bg-light" style={{ top: 0 }}>
                                                <th style={{
                                                    width: '5%',
                                                    padding: '0.15rem 0.3rem',
                                                    fontSize: '0.75rem',
                                                    whiteSpace: 'nowrap'
                                                }}>#</th>
                                                <th style={{
                                                    width: '15%',
                                                    padding: '0.15rem 0.3rem',
                                                    fontSize: '0.75rem',
                                                    whiteSpace: 'nowrap'
                                                }}>Date</th>
                                                <th style={{
                                                    width: '15%',
                                                    padding: '0.15rem 0.3rem',
                                                    fontSize: '0.75rem',
                                                    whiteSpace: 'nowrap'
                                                }}>Inv. No.</th>
                                                <th style={{
                                                    width: '10%',
                                                    padding: '0.15rem 0.3rem',
                                                    fontSize: '0.75rem',
                                                    whiteSpace: 'nowrap'
                                                }}>Type</th>
                                                <th style={{
                                                    width: '10%',
                                                    padding: '0.15rem 0.3rem',
                                                    fontSize: '0.75rem',
                                                    whiteSpace: 'nowrap'
                                                }}>A/c Type</th>
                                                <th style={{
                                                    width: '10%',
                                                    padding: '0.15rem 0.3rem',
                                                    fontSize: '0.75rem',
                                                    whiteSpace: 'nowrap'
                                                }}>Pay.Mode</th>
                                                <th style={{
                                                    width: '10%',
                                                    padding: '0.15rem 0.3rem',
                                                    fontSize: '0.75rem',
                                                    whiteSpace: 'nowrap',
                                                    textAlign: 'right'
                                                }}>Qty.</th>
                                                <th style={{
                                                    width: '10%',
                                                    padding: '0.15rem 0.3rem',
                                                    fontSize: '0.75rem',
                                                    whiteSpace: 'nowrap'
                                                }}>Unit</th>
                                                <th style={{
                                                    width: '15%',
                                                    padding: '0.15rem 0.3rem',
                                                    fontSize: '0.75rem',
                                                    whiteSpace: 'nowrap',
                                                    textAlign: 'right'
                                                }}>Rate</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {transactions.length > 0 ? (
                                                transactions.map((transaction, index) => (
                                                    <tr
                                                        key={index}
                                                        style={{
                                                            cursor: 'pointer',
                                                            height: '28px',
                                                            fontSize: '0.8rem'
                                                        }}
                                                        onClick={() => {
                                                            if (transaction.billId && transaction.billId.id) {
                                                                navigate(`/retailer/sales/${transaction.billId.id}/print`);
                                                            } else if (transaction.purchaseBillId && transaction.purchaseBillId.id) {
                                                                navigate(`/retailer/purchase/${transaction.purchaseBillId.id}/print`);
                                                            }
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                if (transaction.billId && transaction.billId.id) {
                                                                    navigate(`/retailer/sales/${transaction.billId.id}/print`);
                                                                } else if (transaction.purchaseBillId && transaction.purchaseBillId.id) {
                                                                    navigate(`/retailer/purchase/${transaction.purchaseBillId.id}/print`);
                                                                }
                                                            } else if (e.key === 'Tab') {
                                                                e.preventDefault();
                                                                continueButtonRef.current?.focus();
                                                            }
                                                        }}
                                                        tabIndex={0}
                                                    >
                                                        <td style={{ padding: '0.15rem 0.3rem' }}>{index + 1}</td>
                                                        <td style={{ padding: '0.15rem 0.3rem', whiteSpace: 'nowrap' }}>
                                                            {new NepaliDate(transaction.date).format('YYYY-MM-DD')}
                                                        </td>
                                                        <td style={{ padding: '0.15rem 0.3rem', fontWeight: '500' }}>
                                                            {transaction.billNumber || 'N/A'}
                                                        </td>
                                                        <td style={{ padding: '0.15rem 0.3rem' }}>{transaction.type || 'N/A'}</td>
                                                        <td style={{ padding: '0.15rem 0.3rem' }}>{transaction.purchaseSalesType || 'N/A'}</td>
                                                        <td style={{ padding: '0.15rem 0.3rem' }}>{transaction.paymentMode || 'N/A'}</td>
                                                        <td style={{ padding: '0.15rem 0.3rem', textAlign: 'right' }}>{transaction.quantity || 0}</td>
                                                        <td style={{ padding: '0.15rem 0.3rem' }}>{transaction.unit?.name || 'N/A'}</td>
                                                        <td style={{ padding: '0.15rem 0.3rem', textAlign: 'right', fontWeight: '500' }}>
                                                            Rs.{transaction.price ? Math.round(transaction.price * 100) / 100 : 0}
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr style={{ height: '28px' }}>
                                                    <td colSpan="9" className="text-center text-muted align-middle" style={{ padding: '0.15rem 0.3rem' }}>
                                                        No previous transactions found
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {transactions.length > 5 && (
                                    <div className="text-center py-1" style={{
                                        fontSize: '0.7rem',
                                        color: '#6c757d',
                                        backgroundColor: '#f8f9fa',
                                        borderTop: '1px solid #dee2e6'
                                    }}>
                                        Showing {transactions.length} transactions • Scroll to see more
                                    </div>
                                )}
                            </div>

                            <div className="modal-footer py-1 px-3" style={{ minHeight: '45px' }}>
                                <button
                                    ref={continueButtonRef}
                                    type="button"
                                    className="btn btn-primary btn-sm py-1 px-3"
                                    onClick={handleTransactionModalClose}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleTransactionModalClose();
                                        } else if (e.key === 'Tab' && !e.shiftKey) {
                                            e.preventDefault();
                                            const firstTransactionRow = document.querySelector('tbody tr');
                                            if (firstTransactionRow) {
                                                firstTransactionRow.focus();
                                            }
                                        }
                                    }}
                                    style={{
                                        fontSize: '0.8rem',
                                        lineHeight: '1.2',
                                        minHeight: '28px'
                                    }}
                                >
                                    Continue
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Product modal */}
            {showProductModal && (
                <ProductModal onClose={() => setShowProductModal(false)} />
            )}

            {/* Account Creation Modal */}
            {showAccountCreationModal && (
                <div className="modal fade show" tabIndex="-1" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.7)' }}>
                    <div className="modal-dialog modal-fullscreen">
                        <div className="modal-content" style={{ height: '95vh', margin: '2.5vh auto' }}>
                            <div className="modal-header bg-primary text-white">
                                <h5 className="modal-title">Create New Account</h5>
                                <div className="d-flex align-items-center">
                                    <button
                                        type="button"
                                        className="btn-close btn-close-white"
                                        onClick={handleAccountCreationModalClose}
                                    ></button>
                                </div>
                            </div>
                            <div className="modal-body p-0">
                                <iframe
                                    src="/retailer/accounts"
                                    title="Account Creation"
                                    style={{ width: '100%', height: '100%', border: 'none' }}
                                />
                            </div>
                            <div className="modal-footer bg-light">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={handleAccountCreationModalClose}
                                >
                                    <i className="bi bi-arrow-left me-2"></i>Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Items Modal */}
            {showItemsModal && (
                <div className="modal fade show" tabIndex="-1" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.7)' }}>
                    <div className="modal-dialog modal-fullscreen">
                        <div className="modal-content" style={{ height: '95vh', margin: '2.5vh auto' }}>
                            <div className="modal-header bg-primary text-white">
                                <h5 className="modal-title">Create New Item</h5>
                                <div className="d-flex align-items-center">
                                    <button
                                        type="button"
                                        className="btn-close btn-close-white"
                                        onClick={() => setShowItemsModal(false)}
                                    ></button>
                                </div>
                            </div>
                            <div className="modal-body p-0">
                                <iframe
                                    src="/retailer/items"
                                    title="Item Creation"
                                    style={{ width: '100%', height: '100%', border: 'none' }}
                                />
                            </div>
                            <div className="modal-footer bg-light">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowItemsModal(false)}
                                >
                                    <i className="bi bi-arrow-left me-2"></i>Close
                                </button>
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

export default AddSalesReturn;