
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import NepaliDate from 'nepali-date-converter';
import axios from 'axios';
import Header from '../Header';
import '../../../stylesheet/retailer/purchase/AddPurchase.css'
import NotificationToast from '../../NotificationToast';
import { usePageNotRefreshContext } from '../PageNotRefreshContext';
import '../../../stylesheet/noDateIcon.css'
import ProductModal from '../dashboard/modals/ProductModal';
import AccountBalanceDisplay from '../payment/AccountBalanceDisplay';
import useDebounce from '../../../hooks/useDebounce';
import VirtualizedItemList from '../../VirtualizedItemList';
import VirtualizedAccountList from '../../VirtualizedAccountList';

const AddPurchase = () => {
    const { draftSave, setDraftSave, clearDraft } = usePageNotRefreshContext();
    const navigate = useNavigate();

    // Search states
    const [searchQuery, setSearchQuery] = useState('');
    const [lastSearchQuery, setLastSearchQuery] = useState('');
    const [shouldShowLastSearchResults, setShouldShowLastSearchResults] = useState(false);
    const debouncedSearchQuery = useDebounce(searchQuery, 50);
    const [showItemDropdown, setShowItemDropdown] = useState(false);
    const [lastPurchaseData, setLastPurchaseData] = useState(null);
    // Account search states
    const [isAccountSearching, setIsAccountSearching] = useState(false);
    const [accountSearchResults, setAccountSearchResults] = useState([]);
    const [accountSearchPage, setAccountSearchPage] = useState(1);
    const [hasMoreAccountResults, setHasMoreAccountResults] = useState(false);
    const [totalAccounts, setTotalAccounts] = useState(0);
    const [accountSearchQuery, setAccountSearchQuery] = useState('');
    const [accountLastSearchQuery, setAccountLastSearchQuery] = useState('');
    const [accountShouldShowLastSearchResults, setAccountShouldShowLastSearchResults] = useState(false);

    // Item search states
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [searchPage, setSearchPage] = useState(1);
    const [hasMoreSearchResults, setHasMoreSearchResults] = useState(false);
    const [totalSearchItems, setTotalSearchItems] = useState(0);
    const [isHeaderMode, setIsHeaderMode] = useState(false);

    // Header search states for purchase items
    const [headerSearchQuery, setHeaderSearchQuery] = useState('');
    const [showHeaderItemModal, setShowHeaderItemModal] = useState(false);
    const [selectedItemForInsert, setSelectedItemForInsert] = useState(null);
    const [selectedItemQuantity, setSelectedItemQuantity] = useState(0);
    const [selectedItemRate, setSelectedItemRate] = useState(0);
    const [selectedItemWSUnit, setSelectedItemWSUnit] = useState(1);
    const [selectedItemBonus, setSelectedItemBonus] = useState(0);
    const [selectedItemBatchNumber, setSelectedItemBatchNumber] = useState('');
    const [selectedItemExpiryDate, setSelectedItemExpiryDate] = useState('');
    const [headerLastSearchQuery, setHeaderLastSearchQuery] = useState('');
    const [headerShouldShowLastSearchResults, setHeaderShouldShowLastSearchResults] = useState(false);
    const [isHeaderSearching, setIsHeaderSearching] = useState(false);
    const [headerSearchResults, setHeaderSearchResults] = useState([]);
    const [headerSearchPage, setHeaderSearchPage] = useState(1);
    const [hasMoreHeaderSearchResults, setHasMoreHeaderSearchResults] = useState(false);
    const [totalHeaderSearchItems, setTotalHeaderSearchItems] = useState(0);
    const [selectedItemForBatch, setSelectedItemForBatch] = useState(null);
    const [showBatchModal, setShowBatchModal] = useState(false);

    const itemsTableRef = useRef(null);
    const itemDropdownRef = useRef(null);

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
        localStorage.getItem('printAfterSavePurchase') === 'true' || false
    );
    const continueButtonRef = useRef(null);
    const [transactionCache, setTransactionCache] = useState(new Map());
    const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
    const transactionDateRef = useRef(null);
    const [partyBillNumberError, setPartyBillNumberError] = useState('');
    const [duplicateInvoiceInfo, setDuplicateInvoiceInfo] = useState({
        exists: false,
        partyName: '',
        date: null
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isInitialDataLoaded, setIsInitialDataLoaded] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
    const [storeManagementEnabled, setStoreManagementEnabled] = useState(false);
    const [notification, setNotification] = useState({
        show: false,
        message: '',
        type: 'success'
    });
    const [dateErrors, setDateErrors] = useState({
        transactionDateNepali: '',
        nepaliDate: ''
    });

    const [formData, setFormData] = useState(draftSave?.formData || {
        accountId: '',
        accountName: '',
        accountAddress: '',
        accountPan: '',
        transactionDateNepali: currentNepaliDate,
        transactionDateRoman: new Date().toISOString().split('T')[0],
        nepaliDate: currentNepaliDate,
        billDate: new Date().toISOString().split('T')[0],
        billNumber: '',
        partyBillNumber: '',
        paymentMode: 'credit',
        isVatExempt: 'all',
        discountPercentage: 0,
        discountAmount: 0,
        roundOffAmount: 0,
        CCAmount: 0,
        vatPercentage: 13,
        items: []
    });

    const [items, setItems] = useState(draftSave?.items || []);
    const [accounts, setAccounts] = useState([]);
    const [filteredAccounts, setFilteredAccounts] = useState([]);
    const [showAccountModal, setShowAccountModal] = useState(false);
    const [showTransactionModal, setShowTransactionModal] = useState(false);
    const [showSalesPriceModal, setShowSalesPriceModal] = useState(false);
    const [transactions, setTransactions] = useState([]);
    const [transactionType, setTransactionType] = useState('purchase');
    const [selectedItemIndex, setSelectedItemIndex] = useState(-1);

    const [salesPriceData, setSalesPriceData] = useState({
        puPrice: 0,
        CCPercentage: 7.5,
        itemCCAmount: 0,
        marginPercentage: 0,
        currency: 'NPR',
        mrp: 0,
        salesPrice: 0
    });

    const [company, setCompany] = useState({
        dateFormat: 'Nepali' || 'nepali',
        vatEnabled: true,
        fiscalYear: {}
    });

    const [stores, setStores] = useState([]);
    const [racksByStore, setRacksByStore] = useState({});
    const [nextBillNumber, setNextBillNumber] = useState('');

    const [roundOffPurchase, setRoundOffPurchase] = useState(false);
    const [manualRoundOffOverride, setManualRoundOffOverride] = useState(false);

    const accountSearchRef = useRef(null);
    const itemSearchRef = useRef(null);
    const accountModalRef = useRef(null);
    const transactionModalRef = useRef(null);

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
                    limit: 15,
                    vatStatus: formData.isVatExempt,
                    sortBy: searchTerm.trim() ? 'relevance' : 'name'
                }
            });

            if (response.data.success) {
                const itemsWithLatestPuPrice = response.data.items.map(item => {
                    // Get latest purchase price from stockEntries
                    let latestPrice = 0;
                    let latestBatchNumber = '';
                    let latestExpiryDate = '';
                    let latestWSUnit = 1;

                    // Calculate total stock from stockEntries
                    let totalStock = 0;
                    if (item.stockEntries && item.stockEntries.length > 0) {
                        // Calculate total stock by summing up all quantities from stockEntries
                        totalStock = item.stockEntries.reduce((sum, entry) => sum + (entry.quantity || 0), 0);

                        const sortedEntries = item.stockEntries.sort((a, b) =>
                            new Date(b.date) - new Date(a.date)
                        );
                        latestPrice = sortedEntries[0].puPrice || 0;
                        latestBatchNumber = sortedEntries[0].batchNumber || '';
                        latestExpiryDate = sortedEntries[0].expiryDate || '';
                        latestWSUnit = sortedEntries[0].WSUnit || 1;
                    }

                    return {
                        ...item,
                        latestPrice,
                        latestBatchNumber,
                        latestExpiryDate,
                        latestWSUnit,
                        stock: totalStock
                    };
                });

                if (isHeaderModal) {
                    if (page === 1) {
                        setHeaderSearchResults(itemsWithLatestPuPrice);
                    } else {
                        setHeaderSearchResults(prev => [...prev, ...itemsWithLatestPuPrice]);
                    }
                    setHasMoreHeaderSearchResults(response.data.pagination.hasNextPage);
                    setTotalHeaderSearchItems(response.data.pagination.totalItems);
                    setHeaderSearchPage(page);
                } else {
                    if (page === 1) {
                        setSearchResults(itemsWithLatestPuPrice);
                    } else {
                        setSearchResults(prev => [...prev, ...itemsWithLatestPuPrice]);
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
        const fetchTransactionSettings = async () => {
            try {
                const response = await api.get('/api/retailer/get-display-purchase-transactions');
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
        // Save draft to session storage whenever form data or items change
        if (formData.accountId || items.length > 0) {
            setDraftSave({
                formData,
                items,
                accounts
            });
        }
    }, [formData, items, accounts, setDraftSave]);

    useEffect(() => {
        const handleF6Key = (e) => {
            if (e.key === 'F6' && showAccountModal) {
                e.preventDefault();
                setShowAccountCreationModal(true);
                setShowAccountModal(false);
            }
        };

        window.addEventListener('keydown', handleF6Key);
        return () => {
            window.removeEventListener('keydown', handleF6Key);
        };
    }, [showAccountModal]);

    useEffect(() => {
        const handleF9Key = (e) => {
            if (e.key === 'F9') {
                e.preventDefault();
                setShowProductModal(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleF9Key);
        return () => {
            window.removeEventListener('keydown', handleF9Key);
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

    // Function to get the current bill number (does NOT increment)
    const getCurrentBillNumber = async () => {
        try {
            const response = await api.get('/api/retailer/purchase/current-number');
            return response.data.data.currentPurchaseBillNumber;
        } catch (error) {
            console.error('Error getting current bill number:', error);
            return null;
        }
    };

    // Function to get the next bill number (increments the counter)
    const getNextBillNumber = async () => {
        try {
            const response = await api.get('/api/retailer/purchase/next-number');
            return response.data.data.nextPurchaseBillNumber;
        } catch (error) {
            console.error('Error getting next bill number:', error);
            return null;
        }
    };

    // useEffect(() => {
    //     const fetchInitialData = async () => {
    //         try {
    //             setIsLoading(true);

    //             // Fetch purchase entry data from your new ASP.NET endpoint
    //             const response = await api.get('/api/retailer/purchase/entry-data');

    //             if (response.data.success) {
    //                 const data = response.data.data;

    //                 setCompany({
    //                     ...data.company,
    //                     dateFormat: data.company.dateFormat || 'nepali' || data.company.dateFormat === 'Nepali', // This should be 'nepali' or 'english'
    //                     vatEnabled: data.company.vatEnabled || true
    //                 });

    //                 setAccounts(data.accounts || []);
    //                 setNextBillNumber(data.nextPurchaseBillNumber || '');

    //                 // Get dates from the API response
    //                 const apiDates = data.dates || {};

    //                 // Set initial form data based on date format
    //                 const isNepaliFormat = data.company.dateFormat === 'nepali' ||
    //                     data.company.dateFormat === 'Nepali';

    //                 setFormData(prev => ({
    //                     ...prev,
    //                     billNumber: data.nextPurchaseBillNumber || '',
    //                     // Use dates from API response
    //                     transactionDateNepali: isNepaliFormat ? currentNepaliDate : '',
    //                     nepaliDate: isNepaliFormat ? currentNepaliDate : '',
    //                     transactionDateRoman: new Date().toISOString().split('T')[0],
    //                     billDate: new Date().toISOString().split('T')[0]
    //                 }));

    //                 setIsInitialDataLoaded(true);
    //             } else {
    //                 throw new Error(response.data.error || 'Failed to load data');
    //             }
    //         } catch (error) {
    //             console.error('Error fetching initial data:', error);
    //             setNotification({
    //                 show: true,
    //                 message: 'Error loading purchase data',
    //                 type: 'error'
    //             });
    //         } finally {
    //             setIsLoading(false);
    //         }
    //     };

    //     fetchInitialData();
    // }, []);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                setIsLoading(true);

                // Fetch purchase entry data
                const response = await api.get('/api/retailer/purchase/entry-data');

                if (response.data.success) {
                    const data = response.data.data;

                    setCompany({
                        ...data.company,
                        dateFormat: data.company.dateFormat || 'nepali',
                        vatEnabled: data.company.vatEnabled || true
                    });

                    setAccounts(data.accounts || []);

                    // Set the current bill number (does NOT increment)
                    setNextBillNumber(data.nextPurchaseBillNumber || '');

                    // Set form data with current bill number
                    const isNepaliFormat = data.company.dateFormat === 'nepali' ||
                        data.company.dateFormat === 'Nepali';

                    setFormData(prev => ({
                        ...prev,
                        billNumber: data.nextPurchaseBillNumber || '',
                        transactionDateNepali: isNepaliFormat ? currentNepaliDate : '',
                        nepaliDate: isNepaliFormat ? currentNepaliDate : '',
                        transactionDateRoman: new Date().toISOString().split('T')[0],
                        billDate: new Date().toISOString().split('T')[0]
                    }));

                    setIsInitialDataLoaded(true);
                }
            } catch (error) {
                console.error('Error fetching initial data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchInitialData();
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
        fetchRoundOffSetting();
    }, []);

    const fetchRoundOffSetting = async () => {
        try {
            const response = await api.get('/api/retailer/roundoff-purchase');
            if (response.data.success) {
                setRoundOffPurchase(response.data.data.settingsForPurchase?.roundOffPurchase || false);
            }
        } catch (error) {
            console.error("Error fetching round-off setting:", error);
            setRoundOffPurchase(false);
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

    const handleAccountModalClose = () => {
        setShowAccountModal(false);
    };

    const selectAccount = (account) => {
        setFormData({
            ...formData,
            accountId: account.id, // Use id instead of _id for ASP.NET
            accountName: `${account.uniqueNumber || ''} ${account.name}`.trim(),
            accountAddress: account.address,
            accountPan: account.pan
        });
        setShowAccountModal(false);
    };

    const handleHeaderItemSearch = (e) => {
        const query = e.target.value;
        setHeaderSearchQuery(query);
        setHeaderSearchPage(1);

        if (query.trim() !== '' && headerShouldShowLastSearchResults) {
            setHeaderShouldShowLastSearchResults(false);
            setHeaderLastSearchQuery('');
        }

        fetchItemsFromBackend(query, 1, true);
    };

    const selectItemForInsert = async (item) => {
        setSelectedItemForInsert(item);
        setShowHeaderItemModal(false);

        if (headerSearchQuery.trim() !== '') {
            setHeaderLastSearchQuery(headerSearchQuery);
            setHeaderShouldShowLastSearchResults(true);
        } else if (headerShouldShowLastSearchResults && headerLastSearchQuery) {
            setHeaderShouldShowLastSearchResults(true);
        }
        setHeaderSearchQuery('');

        // Set default batch and expiry date
        setSelectedItemBatchNumber('XXX');
        setSelectedItemExpiryDate(getDefaultExpiryDate());
        try {
            const response = await api.get(`/api/retailer/purchase/last-purchase-data/${item.id}`);
            if (response.data.success) {
                const lastData = response.data.data;

                // Set the values from last purchase data
                setSelectedItemRate(lastData.puPrice || 0);
                setSelectedItemWSUnit(lastData.wsUnit || 1);
                setSelectedItemBatchNumber(lastData.batchNumber || 'XXX');

                if (lastData.expiryDate) {
                    setSelectedItemExpiryDate(lastData.expiryDate);
                }

                // Store last purchase data for sales price modal
                setLastPurchaseData(lastData);
            }
        } catch (error) {
            console.error('Error fetching last purchase data:', error);
            // Fallback to stockEntries if the endpoint fails
            if (item.stockEntries && item.stockEntries.length > 0) {
                const sortedStockEntries = item.stockEntries.sort((a, b) => new Date(a.date) - new Date(b.date));
                const latestStockEntry = sortedStockEntries[sortedStockEntries.length - 1] || sortedStockEntries[0];

                setSelectedItemRate(latestStockEntry.puPrice || 0);
                setSelectedItemWSUnit(latestStockEntry.WSUnit || 1);
                setSelectedItemBatchNumber(latestStockEntry.batchNumber || '');

                let expiryDate = '';
                if (latestStockEntry.expiryDate) {
                    if (latestStockEntry.expiryDate instanceof Date) {
                        expiryDate = latestStockEntry.expiryDate.toISOString().split('T')[0];
                    } else if (typeof latestStockEntry.expiryDate === 'string') {
                        try {
                            const parsedDate = new Date(latestStockEntry.expiryDate);
                            if (!isNaN(parsedDate.getTime())) {
                                expiryDate = parsedDate.toISOString().split('T')[0];
                            }
                        } catch (error) {
                            console.error('Error parsing expiry date:', error);
                        }
                    }
                }
                setSelectedItemExpiryDate(expiryDate);
            }
        }

        let hasTransactions = false;

        if (transactionSettings.displayTransactionsForPurchase && formData.accountId) {
            const cacheKey = `${item.id}-${formData.accountId}`; // Use id instead of _id

            if (transactionCache.has(cacheKey)) {
                const cachedTransactions = transactionCache.get(cacheKey);
                if (cachedTransactions.length > 0) {
                    setTransactions(cachedTransactions);
                    setShowTransactionModal(true);
                    hasTransactions = true;
                }
            }

            if (!hasTransactions) {
                try {
                    setIsLoadingTransactions(true);

                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 3000);

                    // Update transaction endpoint to match your backend
                    const response = await api.get(`/api/retailer/transactions/${item.id}/${formData.accountId}/Purchase`, {
                        signal: controller.signal
                    });

                    clearTimeout(timeoutId);

                    if (response.data.success && response.data.data.transactions.length > 0) {
                        setTransactionCache(prev => new Map(prev.set(cacheKey, response.data.data.transactions)));
                        setTransactions(response.data.data.transactions);
                        setShowTransactionModal(true);
                        hasTransactions = true;
                    }
                } catch (error) {
                    if (error.name !== 'AbortError') {
                        console.error('Error fetching transactions:', error);
                    }
                } finally {
                    setIsLoadingTransactions(false);
                }
            }
        }

        if (!hasTransactions) {
            setTimeout(() => {
                const headerWsUnitInput = document.getElementById('headerWsUnit');
                if (headerWsUnitInput) {
                    headerWsUnitInput.focus();
                    headerWsUnitInput.select();
                }
            }, 100);
        }
    };

    const insertSelectedItem = () => {
        if (!selectedItemForInsert) {
            setNotification({
                show: true,
                message: 'Please select an item first',
                type: 'error'
            });
            return;
        }

        if (isHeaderMode) {
            setIsHeaderMode(false);
        }

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

        const sortedStockEntries = selectedItemForInsert.stockEntries?.sort((a, b) => new Date(a.date) - new Date(b.date)) || [];
        const latestStockEntry = sortedStockEntries[sortedStockEntries.length - 1] || sortedStockEntries[0] || {};

        const unitData = selectedItemForInsert.unit || {};
        const unitId = unitData.id || selectedItemForInsert.unitId;
        const unitName = selectedItemForInsert.unitName || unitData.name || '';

        const newItem = {
            itemId: selectedItemForInsert.id, // Use itemId instead of item
            uniqueNumber: selectedItemForInsert.uniqueNumber || 'N/A',
            hscode: selectedItemForInsert.hscode,
            name: selectedItemForInsert.name,
            category: selectedItemForInsert.category?.name || 'No Category',
            wsUnit: selectedItemWSUnit || 1, // Use wsUnit instead of WSUnit
            batchNumber: selectedItemBatchNumber || latestStockEntry.batchNumber || '',
            expiryDate: selectedItemExpiryDate || (latestStockEntry.expiryDate ? new Date(latestStockEntry.expiryDate).toISOString().split('T')[0] : ''),
            quantity: selectedItemQuantity || 0,
            bonus: selectedItemBonus || 0,
            // unitId: selectedItemForInsert.unit?.id, // Use unitId
            // unitName: selectedItemForInsert.unit?.name,
            unitId: unitId, // Use the extracted unitId
            unitName: unitName, // Use the extracted unitName
            puPrice: selectedItemRate || latestStockEntry.puPrice || 0,
            price: 0,
            mrp: 0,
            marginPercentage: 0,
            currency: 'NPR',
            ccPercentage: 0, // Use ccPercentage instead of CCPercentage
            itemCcAmount: 0, // Use itemCcAmount instead of itemCCAmount
            amount: (selectedItemQuantity || 0) * (selectedItemRate || latestStockEntry.puPrice || 0),
            vatStatus: selectedItemForInsert.vatStatus,
            ...(storeManagementEnabled && {
                store: stores.length > 0 ? stores[0].id : null,
                rack: null
            })
        };

        setItems([...items, newItem]);

        setSelectedItemForInsert(null);
        setSelectedItemQuantity(0);
        setSelectedItemRate(0);
        setSelectedItemWSUnit(1);
        setSelectedItemBonus(0);
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
    };

    const getDefaultExpiryDate = () => {
        const today = new Date();
        today.setFullYear(today.getFullYear() + 2);
        return today.toISOString().split('T')[0];
    };

    const updateItemField = (index, field, value) => {
        const updatedItems = [...items];

        // Map field names to match your DTO
        const fieldMap = {
            'WSUnit': 'wsUnit',
            'batchNumber': 'batchNumber',
            'expiryDate': 'expiryDate',
            'quantity': 'quantity',
            'bonus': 'bonus',
            'puPrice': 'puPrice',
            'store': 'store',
            'rack': 'rack'
        };

        const mappedField = fieldMap[field] || field;
        updatedItems[index][mappedField] = value;

        if (field === 'quantity' || field === 'puPrice') {
            updatedItems[index].amount = (updatedItems[index].quantity * updatedItems[index].puPrice).toFixed(2);
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

    const showBatchModalForItem = (item) => {
        setSelectedItemForBatch(item);
        setShowBatchModal(true);

        setTimeout(() => {
            const firstBatchRow = document.querySelector('.batch-row');
            if (firstBatchRow) {
                firstBatchRow.classList.add('bg-primary', 'text-white');
                firstBatchRow.focus();
            }
        }, 100);
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (itemSearchRef.current && !itemSearchRef.current.contains(event.target)) {
                const dropdown = document.getElementById('dropdownMenu');
                if (dropdown && !dropdown.contains(event.target)) {
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

    const calculateTotal = (itemsToCalculate = items) => {
        let subTotal = 0;
        let taxableAmount = 0;
        let nonTaxableAmount = 0;
        let totalCcAmount = 0;
        let taxableCCAmount = 0;
        let nonTaxableCCAmount = 0;

        itemsToCalculate.forEach(item => {
            const itemAmount = parseFloat(item.amount) || 0;
            const itemCCAmount = parseFloat(item.itemCcAmount) || 0; // Use itemCcAmount

            subTotal = preciseAdd(subTotal, itemAmount);
            totalCcAmount = preciseAdd(totalCcAmount, itemCCAmount);

            if (item.vatStatus === 'vatable') {
                taxableAmount = preciseAdd(taxableAmount, itemAmount);
                taxableCCAmount = preciseAdd(taxableCCAmount, itemCCAmount);
            } else {
                nonTaxableAmount = preciseAdd(nonTaxableAmount, itemAmount);
                nonTaxableCCAmount = preciseAdd(nonTaxableCCAmount, itemCCAmount);
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

                discountForTaxable = preciseMultiply(effectiveDiscount, taxableRatio);
                discountForNonTaxable = preciseMultiply(effectiveDiscount, nonTaxableRatio);
            }
        } else if (discountPercentage > 0) {
            discountForTaxable = preciseMultiply(taxableAmount, discountPercentage / 100);
            discountForNonTaxable = preciseMultiply(nonTaxableAmount, discountPercentage / 100);
            effectiveDiscount = preciseAdd(discountForTaxable, discountForNonTaxable);
        }

        const finalTaxableAmount = preciseSubtract(
            preciseAdd(taxableAmount, taxableCCAmount),
            discountForTaxable
        );

        const finalNonTaxableAmount = preciseSubtract(
            preciseAdd(nonTaxableAmount, nonTaxableCCAmount),
            discountForNonTaxable
        );

        let vatAmount = 0;
        if (formData.isVatExempt === 'false' || formData.isVatExempt === 'all') {
            vatAmount = preciseMultiply(finalTaxableAmount, formData.vatPercentage / 100);
        }

        let totalBeforeRoundOff = preciseAdd(
            preciseAdd(finalTaxableAmount, finalNonTaxableAmount),
            vatAmount
        );

        let roundOffAmount = 0;
        let autoRoundOffAmount = 0;

        if (roundOffPurchase) {
            const roundedTotal = Math.round(totalBeforeRoundOff);
            autoRoundOffAmount = preciseSubtract(roundedTotal, totalBeforeRoundOff);
        }

        if (roundOffPurchase && !manualRoundOffOverride) {
            roundOffAmount = autoRoundOffAmount;
        } else {
            roundOffAmount = parseFloat(formData.roundOffAmount) || 0;
        }

        const totalAmount = preciseAdd(totalBeforeRoundOff, roundOffAmount);

        return {
            subTotal: preciseRound(subTotal, 2),
            taxableAmount: preciseRound(finalTaxableAmount, 2),
            nonTaxableAmount: preciseRound(finalNonTaxableAmount, 2),
            vatAmount: preciseRound(vatAmount, 2),
            totalAmount: preciseRound(totalAmount, 2),
            totalCCAmount: preciseRound(totalCcAmount, 2),
            discountAmount: preciseRound(effectiveDiscount, 2),
            roundOffAmount: preciseRound(roundOffAmount, 2),
            autoRoundOffAmount: preciseRound(autoRoundOffAmount, 2)
        };
    };

    const handleDiscountPercentageChange = (e) => {
        const value = parseFloat(e.target.value) || 0;
        const validatedValue = Math.min(Math.max(value, 0), 100);

        const subTotal = calculateTotal().subTotal;
        const discountAmount = preciseMultiply(subTotal, validatedValue / 100);

        setFormData({
            ...formData,
            discountPercentage: validatedValue,
            discountAmount: preciseRound(discountAmount, 2)
        });
    };

    const handleDiscountAmountChange = (e) => {
        const value = parseFloat(e.target.value) || 0;
        const subTotal = calculateTotal().subTotal;

        const validatedValue = Math.min(Math.max(value, 0), subTotal);

        const discountPercentage = subTotal > 0 ?
            preciseMultiply(validatedValue / subTotal, 100) : 0;

        setFormData({
            ...formData,
            discountAmount: validatedValue,
            discountPercentage: preciseRound(discountPercentage, 2)
        });
    };

    // Precision utility functions
    const preciseAdd = (a, b) => {
        return parseFloat((parseFloat(a) + parseFloat(b)).toFixed(10));
    };

    const preciseSubtract = (a, b) => {
        return parseFloat((parseFloat(a) - parseFloat(b)).toFixed(10));
    };

    const preciseMultiply = (a, b) => {
        return parseFloat((parseFloat(a) * parseFloat(b)).toFixed(10));
    };

    const preciseDivide = (a, b) => {
        return b !== 0 ? parseFloat((parseFloat(a) / parseFloat(b)).toFixed(10)) : 0;
    };

    const preciseRound = (value, decimals = 2) => {
        return parseFloat(value.toFixed(decimals));
    };

    const fetchLastTransactions = async (itemId, index) => {
        if (!formData.accountId) {
            setNotification({
                show: true,
                message: 'Please select an account first',
                type: 'error'
            });
            return;
        }

        setSelectedItemIndex(index);
        setIsLoadingTransactions(true);

        try {
            const cacheKey = `${itemId}-${formData.accountId}`;

            if (transactionCache.has(cacheKey)) {
                const cachedTransactions = transactionCache.get(cacheKey);
                setTransactions(cachedTransactions);
                setTransactionType('purchase');
                setShowTransactionModal(true);
                return;
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);

            const response = await api.get(`/api/retailer/transactions/${itemId}/${formData.accountId}/Purchase`, {
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.data.success) {
                setTransactionCache(prev => new Map(prev.set(cacheKey, response.data.data.transactions)));
                setTransactions(response.data.data.transactions);
                setTransactionType('purchase');
                setShowTransactionModal(true);
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Error fetching transactions:', error);
            }
        } finally {
            setIsLoadingTransactions(false);
        }
    };

    const fetchSalesTransactions = async () => {
        if (!items[selectedItemIndex] || !formData.accountId) return;

        try {
            setIsLoadingTransactions(true);
            const cacheKey = `${items[selectedItemIndex].itemId}-${formData.accountId}-sales`; // Use itemId

            if (transactionCache.has(cacheKey)) {
                const cachedTransactions = transactionCache.get(cacheKey);
                setTransactions(cachedTransactions);
                setTransactionType('sales');
                return;
            }

            const response = await api.get(`/api/retailer/transactions/sales-by-item-account?itemId=${items[selectedItemIndex].itemId}&accountId=${formData.accountId}`);

            if (response.data.success) {
                setTransactionCache(prev => new Map(prev.set(cacheKey, response.data.data.transactions)));
                setTransactions(response.data.data.transactions);
                setTransactionType('sales');
            } else {
                setNotification({
                    show: true,
                    message: response.data.message || 'Failed to fetch sales transactions',
                    type: 'error'
                });
            }
        } catch (error) {
            console.error('Error fetching sales transactions:', error);
            setNotification({
                show: true,
                message: 'Error fetching sales transactions',
                type: 'error'
            });
        } finally {
            setIsLoadingTransactions(false);
        }
    };

    const fetchPurchaseTransactions = async () => {
        if (!items[selectedItemIndex] || !formData.accountId) return;

        try {
            setIsLoadingTransactions(true);
            const cacheKey = `${items[selectedItemIndex].itemId}-${formData.accountId}-purchase`; // Use itemId

            if (transactionCache.has(cacheKey)) {
                const cachedTransactions = transactionCache.get(cacheKey);
                setTransactions(cachedTransactions);
                setTransactionType('purchase');
                return;
            }

            const response = await api.get(`/api/retailer/transactions/purchase-by-item-account?itemId=${items[selectedItemIndex].itemId}&accountId=${formData.accountId}`);

            if (response.data.success) {
                setTransactionCache(prev => new Map(prev.set(cacheKey, response.data.data.transactions)));
                setTransactions(response.data.data.transactions);
                setTransactionType('purchase');
            } else {
                setNotification({
                    show: true,
                    message: response.data.message || 'Failed to fetch purchase transactions',
                    type: 'error'
                });
            }
        } catch (error) {
            console.error('Error fetching purchase transactions:', error);
            setNotification({
                show: true,
                message: 'Error fetching purchase transactions',
                type: 'error'
            });
        } finally {
            setIsLoadingTransactions(false);
        }
    };

    const openSalesPriceModalFromHeader = () => {
        if (!selectedItemForInsert) {
            setNotification({
                show: true,
                message: 'Please select an item first',
                type: 'error'
            });
            return;
        }

        const fullItem = selectedItemForInsert;
        // const latestStockEntry = fullItem.stockEntries?.[fullItem.stockEntries.length - 1] || {};
        const lastData = lastPurchaseData || fullItem.stockEntries?.[fullItem.stockEntries.length - 1] || {};

        // const prevPuPrice = Math.round((lastData?.puPrice * (lastData?.WSUnit || 1)) * 100) / 100 || 0;
        // const currentPuPrice = Math.round(selectedItemRate * 100) / 100;
        // const CCPercentage = lastData?.CCPercentage || 7.5;
        // const marginPercentage = lastData?.marginPercentage || 0;
        // const currency = lastData?.currency || 'NPR';
        // const latestMrp = Math.round((lastData?.mrp * (lastData?.WSUnit || 1)) * 100) / 100 || 0;
        // const salesPrice = Math.round((lastData?.price * (lastData?.WSUnit || 1)) * 100) / 100 || currentPuPrice;

        // const itemCCAmount = ((currentPuPrice * CCPercentage / 100) * (selectedItemBonus || 0));
        // Use the correct property names from your DTO
        const prevPuPrice = Math.round((lastData.puPrice * (lastData.wsUnit || 1)) * 100) / 100 || 0;
        const currentPuPrice = Math.round(selectedItemRate * 100) / 100;
        const CCPercentage = lastData.ccPercentage || 7.5;
        const marginPercentage = lastData.marginPercentage || 0;
        const currency = lastData.currency || 'NPR';
        const latestMrp = Math.round((lastData.mrp * (lastData.wsUnit || 1)) * 100) / 100 || 0;
        const salesPrice = Math.round((lastData.price || currentPuPrice) * 100) / 100; // Use puPrice instead of price

        const itemCCAmount = ((currentPuPrice * CCPercentage / 100) * (selectedItemBonus || 0));

        setSalesPriceData({
            // prevPuPrice: prevPuPrice,
            // puPrice: currentPuPrice,
            // CCPercentage: CCPercentage,
            // itemCCAmount: itemCCAmount,
            // marginPercentage: marginPercentage,
            // currency: currency,
            // mrp: latestMrp,
            // salesPrice: salesPrice
            prevPuPrice: prevPuPrice,
            puPrice: currentPuPrice,
            CCPercentage: CCPercentage,
            itemCCAmount: itemCCAmount,
            marginPercentage: marginPercentage,
            currency: currency,
            mrp: latestMrp,
            salesPrice: salesPrice,
        });

        setShowSalesPriceModal(true);
    };

    const openSalesPriceModal = (index) => {
        setSelectedItemIndex(index);
        const item = items[index];

        const fullItem = headerSearchResults.find(i => i.id === item.itemId) || item;
        const latestStockEntry = fullItem.stockEntries?.[fullItem.stockEntries.length - 1];

        const prevPuPrice = Math.round((latestStockEntry?.puPrice * (latestStockEntry?.WSUnit || 1)) * 100) / 100 || 0;
        const currentPuPrice = Math.round(item.puPrice * 100) / 100;
        const CCPercentage = latestStockEntry?.CCPercentage || 7.5;
        const marginPercentage = latestStockEntry?.marginPercentage || 0;
        const currency = latestStockEntry?.currency || 'NPR';
        const latestMrp = Math.round((latestStockEntry?.mrp * (latestStockEntry?.WSUnit || 1)) * 100) / 100 || 0;
        const salesPrice = Math.round((latestStockEntry?.price * (latestStockEntry?.WSUnit || 1)) * 100) / 100 || currentPuPrice;

        const itemCCAmount = ((currentPuPrice * CCPercentage / 100) * (item.bonus || 0));

        setSalesPriceData({
            prevPuPrice: prevPuPrice,
            puPrice: currentPuPrice,
            CCPercentage: CCPercentage,
            itemCCAmount: itemCCAmount,
            marginPercentage: marginPercentage,
            currency: currency,
            mrp: latestMrp,
            salesPrice: salesPrice
        });

        setShowSalesPriceModal(true);
    };

    const saveSalesPrice = () => {
        if (isHeaderMode) {
            // Handle header mode
            const unitData = selectedItemForInsert.unit || {};
            const unitId = unitData.id || selectedItemForInsert.unitId;
            const unitName = selectedItemForInsert.unitName || unitData.name || '';

            const newItem = {
                itemId: selectedItemForInsert.id, // Use itemId
                uniqueNumber: selectedItemForInsert.uniqueNumber || 'N/A',
                hscode: selectedItemForInsert.hscode,
                name: selectedItemForInsert.name,
                category: selectedItemForInsert.category?.name || 'No Category',
                wsUnit: selectedItemWSUnit || 1, // Use wsUnit
                batchNumber: selectedItemBatchNumber || '',
                expiryDate: selectedItemExpiryDate || '',
                quantity: selectedItemQuantity || 0,
                bonus: selectedItemBonus || 0,
                // unitId: selectedItemForInsert.unit?.id, // Use unitId
                // unitName: selectedItemForInsert.unit?.name,
                unitId: unitId, // Use extracted unitId
                unitName: unitName, // Use extracted unitName
                puPrice: salesPriceData.puPrice,
                price: salesPriceData.salesPrice,
                mrp: salesPriceData.mrp,
                marginPercentage: salesPriceData.marginPercentage,
                currency: salesPriceData.currency,
                ccPercentage: salesPriceData.CCPercentage, // Use ccPercentage
                itemCcAmount: salesPriceData.itemCCAmount, // Use itemCcAmount
                amount: (selectedItemQuantity || 0) * (salesPriceData.puPrice || 0),
                vatStatus: selectedItemForInsert.vatStatus,
                ...(storeManagementEnabled && {
                    store: stores.length > 0 ? stores[0].id : null,
                    rack: null
                })
            };

            setItems([...items, newItem]);

            // Reset header fields
            setSelectedItemForInsert(null);
            setSelectedItemQuantity(0);
            setSelectedItemRate(0);
            setSelectedItemWSUnit(1);
            setSelectedItemBonus(0);
            setSelectedItemBatchNumber('');
            setSelectedItemExpiryDate('');
            setHeaderSearchQuery('');

            setIsHeaderMode(false);
            setShowSalesPriceModal(false);

            setTimeout(() => {
                const searchInput = document.getElementById('headerItemSearch');
                if (searchInput) {
                    searchInput.focus();
                    searchInput.select();
                }
            }, 50);

        } else {
            // Handle regular mode (existing code)
            if (selectedItemIndex === -1) return;

            const updatedItems = [...items];
            updatedItems[selectedItemIndex] = {
                ...updatedItems[selectedItemIndex],
                price: salesPriceData.salesPrice,
                mrp: salesPriceData.mrp,
                marginPercentage: salesPriceData.marginPercentage,
                currency: salesPriceData.currency,
                ccPercentage: salesPriceData.CCPercentage, // Use ccPercentage
                itemCcAmount: salesPriceData.itemCCAmount // Use itemCcAmount
            };

            setItems(updatedItems);
            setShowSalesPriceModal(false);
        }
    };

    // const resetForm = async () => {
    //     try {
    //         setIsLoading(true);

    //         // Fetch the next bill number
    //         const numberResponse = await api.get('/api/retailer/purchase/next-number');
    //         const nextBillNum = numberResponse.data.data.nextPurchaseBillNumber;

    //         // Fetch other data
    //         const response = await api.get('/api/retailer/purchase/entry-data');
    //         const { data } = response.data;

    //         const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
    //         const currentRomanDate = new Date().toISOString().split('T')[0];

    //         setFormData({
    //             accountId: '',
    //             accountName: '',
    //             accountAddress: '',
    //             accountPan: '',
    //             transactionDateNepali: currentNepaliDate,
    //             transactionDateRoman: currentRomanDate,
    //             nepaliDate: currentNepaliDate,
    //             billDate: currentRomanDate,
    //             billNumber: nextBillNum,
    //             partyBillNumber: '',
    //             paymentMode: 'credit',
    //             isVatExempt: 'all',
    //             discountPercentage: 0,
    //             discountAmount: 0,
    //             roundOffAmount: 0,
    //             CCAmount: 0,
    //             vatPercentage: 13,
    //             items: []
    //         });

    //         setAccountSearchQuery('');
    //         setAccountSearchPage(1);
    //         setAccountSearchResults([]);
    //         setHasMoreAccountResults(false);
    //         setTotalAccounts(0);

    //         fetchAccountsFromBackend('', 1);

    //         setStores(data.stores || []);
    //         setRacksByStore(data.racksByStore || {});
    //         setNextBillNumber(nextBillNum);
    //         setItems([]);
    //         clearDraft();

    //         setHeaderSearchQuery('');
    //         setHeaderSearchResults([]);
    //         setHeaderSearchPage(1);
    //         setHasMoreHeaderSearchResults(false);
    //         setTotalHeaderSearchItems(0);

    //         setSearchQuery('');
    //         setSearchResults([]);
    //         setSearchPage(1);
    //         setHasMoreSearchResults(false);
    //         setTotalSearchItems(0);

    //         setTimeout(() => {
    //             if (transactionDateRef.current) {
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

            // Get current bill number (does NOT increment)
            const currentBillNum = await getCurrentBillNumber();

            // Fetch other data
            const response = await api.get('/api/retailer/purchase/entry-data');
            const { data } = response.data;

            const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
            const currentRomanDate = new Date().toISOString().split('T')[0];

            setFormData({
                accountId: '',
                accountName: '',
                accountAddress: '',
                accountPan: '',
                transactionDateNepali: currentNepaliDate,
                transactionDateRoman: currentRomanDate,
                nepaliDate: currentNepaliDate,
                billDate: currentRomanDate,
                billNumber: currentBillNum, // Use current number (does NOT increment)
                partyBillNumber: '',
                paymentMode: 'credit',
                isVatExempt: 'all',
                discountPercentage: 0,
                discountAmount: 0,
                roundOffAmount: 0,
                CCAmount: 0,
                vatPercentage: 13,
                items: []
            });

            setAccountSearchQuery('');
            setAccountSearchPage(1);
            setAccountSearchResults([]);
            setHasMoreAccountResults(false);
            setTotalAccounts(0);

            fetchAccountsFromBackend('', 1);

            setStores(data.stores || []);
            setRacksByStore(data.racksByStore || {});
            setNextBillNumber(currentBillNum);
            setItems([]);
            clearDraft();

            setHeaderSearchQuery('');
            setHeaderSearchResults([]);
            setHeaderSearchPage(1);
            setHasMoreHeaderSearchResults(false);
            setTotalHeaderSearchItems(0);

            setSearchQuery('');
            setSearchResults([]);
            setSearchPage(1);
            setHasMoreSearchResults(false);
            setTotalSearchItems(0);

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
    // const resetAfterSave = async () => {
    //     try {
    //         // Get next bill number (this increments the counter)
    //         const nextBillNum = await getNextBillNumber();

    //         // Fetch other data
    //         const response = await api.get('/api/retailer/purchase/entry-data');
    //         const { data } = response.data;

    //         const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
    //         const currentRomanDate = new Date().toISOString().split('T')[0];

    //         setFormData({
    //             accountId: '',
    //             accountName: '',
    //             accountAddress: '',
    //             accountPan: '',
    //             transactionDateNepali: currentNepaliDate,
    //             transactionDateRoman: currentRomanDate,
    //             nepaliDate: currentNepaliDate,
    //             billDate: currentRomanDate,
    //             billNumber: nextBillNum, // This will be the next number (incremented)
    //             partyBillNumber: '',
    //             paymentMode: 'credit',
    //             isVatExempt: 'all',
    //             discountPercentage: 0,
    //             discountAmount: 0,
    //             roundOffAmount: 0,
    //             CCAmount: 0,
    //             vatPercentage: 13,
    //             items: []
    //         });

    //         setAccountSearchQuery('');
    //         setAccountSearchPage(1);
    //         setAccountSearchResults([]);
    //         setHasMoreAccountResults(false);
    //         setTotalAccounts(0);

    //         fetchAccountsFromBackend('', 1);

    //         setStores(data.stores || []);
    //         setRacksByStore(data.racksByStore || {});
    //         setNextBillNumber(nextBillNum);
    //         setItems([]);
    //         clearDraft();

    //         setHeaderSearchQuery('');
    //         setHeaderSearchResults([]);
    //         setHeaderSearchPage(1);
    //         setHasMoreHeaderSearchResults(false);
    //         setTotalHeaderSearchItems(0);

    //         setSearchQuery('');
    //         setSearchResults([]);
    //         setSearchPage(1);
    //         setHasMoreSearchResults(false);
    //         setTotalSearchItems(0);

    //         setTimeout(() => {
    //             if (transactionDateRef.current) {
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
    // Reset after save - use current bill number (does NOT increment)
    const resetAfterSave = async () => {
        try {
            // Get current bill number (does NOT increment) - THIS IS THE KEY CHANGE
            const currentBillNum = await getCurrentBillNumber();

            // Fetch other data
            const response = await api.get('/api/retailer/purchase/entry-data');
            const { data } = response.data;

            const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
            const currentRomanDate = new Date().toISOString().split('T')[0];

            setFormData({
                accountId: '',
                accountName: '',
                accountAddress: '',
                accountPan: '',
                transactionDateNepali: currentNepaliDate,
                transactionDateRoman: currentRomanDate,
                nepaliDate: currentNepaliDate,
                billDate: currentRomanDate,
                billNumber: currentBillNum, // This will be the next number (already incremented during save)
                partyBillNumber: '',
                paymentMode: 'credit',
                isVatExempt: 'all',
                discountPercentage: 0,
                discountAmount: 0,
                roundOffAmount: 0,
                CCAmount: 0,
                vatPercentage: 13,
                items: []
            });

            setAccountSearchQuery('');
            setAccountSearchPage(1);
            setAccountSearchResults([]);
            setHasMoreAccountResults(false);
            setTotalAccounts(0);

            fetchAccountsFromBackend('', 1);

            setStores(data.stores || []);
            setRacksByStore(data.racksByStore || {});
            setNextBillNumber(currentBillNum);
            setItems([]);
            clearDraft();

            setHeaderSearchQuery('');
            setHeaderSearchResults([]);
            setHeaderSearchPage(1);
            setHasMoreHeaderSearchResults(false);
            setTotalHeaderSearchItems(0);

            setSearchQuery('');
            setSearchResults([]);
            setSearchPage(1);
            setHasMoreSearchResults(false);
            setTotalSearchItems(0);

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

    const handleSubmit = async (e, print = false) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            const calculatedValues = calculateTotal();

            // Prepare data according to your CreatePurchaseBillDTO
            const billData = {
                accountId: formData.accountId,
                // billNumber: formData.billNumber,
                partyBillNumber: formData.partyBillNumber,
                paymentMode: formData.paymentMode,
                isVatExempt: formData.isVatExempt === 'true',
                isVatAll: formData.isVatExempt,
                discountPercentage: formData.discountPercentage,
                discountAmount: formData.discountAmount,
                vatPercentage: formData.vatPercentage,
                vatAmount: calculatedValues.vatAmount,
                roundOffAmount: calculatedValues.roundOffAmount,
                subTotal: calculatedValues.subTotal,
                taxableAmount: calculatedValues.taxableAmount,
                nonVatPurchase: calculatedValues.nonTaxableAmount,
                totalCcAmount: calculatedValues.totalCCAmount,
                totalAmount: calculatedValues.totalAmount,
                nepaliDate: new Date(formData.nepaliDate).toISOString().split('T')[0],
                date: formData.billDate,
                transactionDateNepali: new Date(formData.transactionDateNepali).toISOString().split('T')[0],
                transactionDate: formData.transactionDateRoman,
                purchaseSalesType: "Purchase",
                originalCopies: 1,
                items: items.map(item => ({
                    itemId: item.itemId,
                    batchNumber: item.batchNumber,
                    expiryDate: item.expiryDate,
                    wsUnit: item.wsUnit || 1,
                    quantity: item.quantity,
                    bonus: item.bonus || 0,
                    puPrice: item.puPrice,
                    price: item.price || 0,
                    mrp: item.mrp || 0,
                    marginPercentage: item.marginPercentage || 0,
                    currency: item.currency || 'NPR',
                    ccPercentage: item.ccPercentage || 0,
                    itemCcAmount: item.itemCcAmount || 0,
                    unitId: item.unitId,
                    vatStatus: item.vatStatus
                }))
            };

            const response = await api.post('/api/retailer/purchase', billData);

            if (response.data.success) {
                setTransactionCache(new Map());

                setNotification({
                    show: true,
                    message: 'Purchase bill created successfully!',
                    type: 'success'
                });

                setDuplicateInvoiceInfo({ exists: false, partyName: '' });
                clearDraft();

                if ((print || printAfterSave) && response.data.data?.id) {
                    setItems([]);
                    setIsSaving(false);
                    resetAfterSave();
                    await printImmediately(response.data.data.id);
                } else {
                    await resetAfterSave();
                }
            } else {
                throw new Error(response.data.error || 'Failed to create purchase bill');
            }
        } catch (error) {
            console.error('Error saving purchase:', error);
            setNotification({
                show: true,
                message: error.response?.data?.error || 'Failed to save purchase. Please try again.',
                type: 'error'
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handlePrintAfterSaveChange = (e) => {
        const isChecked = e.target.checked;
        setPrintAfterSave(isChecked);
        localStorage.setItem('printAfterSavePurchase', isChecked);
    };

    // const printImmediately = async (billId) => {
    //     try {
    //         const response = await api.get(`/api/retailer/purchase/${billId}/print`);
    //         const printData = response.data.data;

    //         const tempDiv = document.createElement('div');
    //         tempDiv.style.position = 'absolute';
    //         tempDiv.style.left = '-9999px';
    //         document.body.appendChild(tempDiv);

    //         tempDiv.innerHTML = `
    //             <div id="printableContent">
    //                 <div class="print-invoice-container">
    //                     <div class="print-invoice-header">
    //                         <div class="print-company-name">${printData.companyName || 'Company Name'}</div>
    //                         <div class="print-company-details">
    //                             Address | Tel: | PAN:
    //                         </div>
    //                         <div class="print-invoice-title">PURCHASE INVOICE</div>
    //                     </div>

    //                     <div class="print-invoice-details">
    //                         <div>
    //                             <div><strong>Supplier:</strong> ${printData.accountName || 'N/A'}</div>
    //                             <div><strong>Address:</strong> ${printData.accountAddress || 'N/A'}</div>
    //                             <div><strong>PAN:</strong> ${printData.accountPan || 'N/A'}</div>
    //                             <div><strong>Payment Mode:</strong> ${printData.paymentMode}</div>
    //                         </div>
    //                         <div>
    //                             <div><strong>Invoice No:</strong> ${printData.billNumber}</div>
    //                             <div><strong>Supplier Inv No:</strong> ${printData.partyBillNumber || 'N/A'}</div>
    //                             <div><strong>Transaction Date:</strong> ${new Date(printData.transactionDate).toLocaleDateString()}</div>
    //                             <div><strong>Inv. Issue Date:</strong> ${new Date(printData.date).toLocaleDateString()}</div>
    //                         </div>
    //                     </div>

    //                     <table class="print-invoice-table">
    //                         <thead>
    //                             <tr>
    //                                 <th>SN</th>
    //                                 <th>Code</th>
    //                                 <th>Description of Goods</th>
    //                                 <th>Unit</th>
    //                                 <th>Batch</th>
    //                                 <th>Expiry</th>
    //                                 <th>Qty</th>
    //                                 <th>Free</th>
    //                                 <th>Rate</th>
    //                                 <th>Amount</th>
    //                             </tr>
    //                         </thead>
    //                         <tbody>
    //                             ${printData.items?.map((item, i) => `
    //                                 <tr key="${i}">
    //                                     <td>${i + 1}</td>
    //                                     <td>${item.itemUniqueNumber || 'N/A'}</td>
    //                                     <td>${item.itemName || 'N/A'}</td>
    //                                     <td>${item.unitName || 'N/A'}</td>
    //                                     <td>${item.batchNumber || 'N/A'}</td>
    //                                     <td>${item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'N/A'}</td>
    //                                     <td>${item.quantity || 0}</td>
    //                                     <td>${item.bonus || 0}</td>
    //                                     <td>${formatTo2Decimal(item.puPrice)}</td>
    //                                     <td>${formatTo2Decimal(item.quantity * item.puPrice)}</td>
    //                                 </tr>
    //                             `).join('') || ''}
    //                         </tbody>
    //                         <tr>
    //                             <td colSpan="10" style="border-bottom: 1px dashed #000"></td>
    //                         </tr>
    //                     </table>

    //                     <table class="print-totals-table">
    //                         <tbody>
    //                             <tr>
    //                                 <td><strong>Sub Total:</strong></td>
    //                                 <td class="print-text-right">${formatTo2Decimal(printData.subTotal)}</td>
    //                             </tr>
    //                             <tr>
    //                                 <td><strong>Discount (${printData.discountPercentage}%):</strong></td>
    //                                 <td class="print-text-right">${formatTo2Decimal(printData.discountAmount)}</td>
    //                             </tr>
    //                             <tr>
    //                                 <td><strong>CC Charge:</strong></td>
    //                                 <td class="print-text-right">${formatTo2Decimal(printData.totalCcAmount)}</td>
    //                             </tr>
    //                             ${!printData.isVatExempt && `
    //                                 <tr>
    //                                     <td><strong>Taxable Amount:</strong></td>
    //                                     <td class="print-text-right">${formatTo2Decimal(printData.taxableAmount)}</td>
    //                                 </tr>
    //                                 <tr>
    //                                     <td><strong>VAT (${printData.vatPercentage}%):</strong></td>
    //                                     <td class="print-text-right">${formatTo2Decimal(printData.vatAmount)}</td>
    //                                 </tr>
    //                             `}
    //                             <tr>
    //                                 <td><strong>Round Off:</strong></td>
    //                                 <td class="print-text-right">${formatTo2Decimal(printData.roundOffAmount)}</td>
    //                             </tr>
    //                             <tr>
    //                                 <td><strong>Grand Total:</strong></td>
    //                                 <td class="print-text-right">${formatTo2Decimal(printData.totalAmount)}</td>
    //                             </tr>
    //                         </tbody>
    //                     </table>

    //                     <div class="print-amount-in-words">
    //                         <strong>In Words:</strong> ${convertToRupeesAndPaisa(printData.totalAmount)} Only.
    //                     </div>

    //                     <div class="print-signature-area">
    //                         <div class="print-signature-box">Prepared By</div>
    //                         <div class="print-signature-box">Checked By</div>
    //                         <div class="print-signature-box">Approved By</div>
    //                     </div>
    //                 </div>
    //             </div>
    //         `;

    //         const styles = `
    //             @page {
    //                 size: A4;
    //                 margin: 5mm;
    //             }
    //             body {
    //                 font-family: 'Arial Narrow', Arial, sans-serif;
    //                 font-size: 9pt;
    //                 line-height: 1.2;
    //                 color: #000;
    //                 background: white;
    //                 margin: 0;
    //                 padding: 0;
    //             }
    //             .print-invoice-container {
    //                 width: 100%;
    //                 max-width: 210mm;
    //                 margin: 0 auto;
    //                 padding: 2mm;
    //             }
    //             .print-invoice-header {
    //                 text-align: center;
    //                 margin-bottom: 3mm;
    //                 border-bottom: 1px solid #000;
    //                 padding-bottom: 2mm;
    //             }
    //             .print-invoice-title {
    //                 font-size: 12pt;
    //                 font-weight: bold;
    //                 margin: 2mm 0;
    //                 text-transform: uppercase;
    //             }
    //             .print-company-name {
    //                 font-size: 16pt;
    //                 font-weight: bold;
    //             }
    //             .print-company-details {
    //                 font-size: 8pt;
    //                 margin: 1mm 0;
    //                 font-weight: bold;
    //             }
    //             .print-invoice-details {
    //                 display: flex;
    //                 justify-content: space-between;
    //                 margin: 2mm 0;
    //                 font-size: 8pt;
    //             }
    //             .print-invoice-table {
    //                 width: 100%;
    //                 border-collapse: collapse;
    //                 margin: 3mm 0;
    //                 font-size: 8pt;
    //                 border: none;
    //             }
    //             .print-invoice-table thead {
    //                 border-top: 1px solid #000;
    //                 border-bottom: 1px solid #000;
    //             }
    //             .print-invoice-table th {
    //                 background-color: transparent;
    //                 border: none;
    //                 padding: 1mm;
    //                 text-align: left;
    //                 font-weight: bold;
    //             }
    //             .print-invoice-table td {
    //                 border: none;
    //                 padding: 1mm;
    //                 border-bottom: 1px solid #eee;
    //             }
    //             .print-text-right {
    //                 text-align: right;
    //             }
    //             .print-amount-in-words {
    //                 font-size: 8pt;
    //                 margin: 2mm 0;
    //                 padding: 1mm;
    //                 border: 1px dashed #000;
    //             }
    //             .print-signature-area {
    //                 display: flex;
    //                 justify-content: space-between;
    //                 margin-top: 5mm;
    //                 font-size: 8pt;
    //             }
    //             .print-signature-box {
    //                 text-align: center;
    //                 width: 30%;
    //                 border-top: 1px solid #000;
    //                 padding-top: 1mm;
    //                 font-weight: bold;
    //             }
    //             .print-totals-table {
    //                 width: 60%;
    //                 margin-left: auto;
    //                 border-collapse: collapse;
    //                 font-size: 8pt;
    //             }
    //             .print-totals-table td {
    //                 padding: 1mm;
    //             }
    //         `;

    //         const printWindow = window.open('', '_blank');
    //         printWindow.document.write(`
    //             <html>
    //                 <head>
    //                     <title>Purchase_Invoice_${printData.billNumber}</title>
    //                     <style>${styles}</style>
    //                 </head>
    //                 <body>
    //                     ${tempDiv.innerHTML}
    //                     <script>
    //                         window.onload = function() {
    //                             setTimeout(function() {
    //                                 window.print();
    //                                 window.close();
    //                             }, 200);
    //                         };
    //                     </script>
    //                 </body>
    //             </html>
    //         `);
    //         printWindow.document.close();

    //         document.body.removeChild(tempDiv);
    //     } catch (error) {
    //         console.error('Error fetching print data:', error);
    //         setNotification({
    //             show: true,
    //             message: 'Bill saved but failed to load print data',
    //             type: 'warning'
    //         });
    //     }
    // };

    const printImmediately = async (billId) => {
        try {
            const response = await api.get(`/api/retailer/purchase/${billId}/print`);
            const printData = response.data.data;

            const tempDiv = document.createElement('div');
            tempDiv.style.position = 'absolute';
            tempDiv.style.left = '-9999px';
            document.body.appendChild(tempDiv);

            tempDiv.innerHTML = `
            <div id="printableContent" class="print-version">
                <div class="print-invoice-container">
                    <div class="print-invoice-header">
                        <div class="print-company-name">${printData.currentCompanyName || ''}</div>
                        <div class="print-company-details">
                            ${printData.currentCompany?.address || ''} | Tel: ${printData.currentCompany?.phone || ''} | PAN: ${printData.currentCompany?.pan || ''}
                        </div>
                        <div class="print-invoice-title">PURCHASE INVOICE</div>
                    </div>

                    <div class="print-invoice-details">
                        <div>
                            <div><strong>Supplier:</strong> ${printData.bill.account?.name || 'N/A'}</div>
                            <div><strong>Address:</strong> ${printData.bill.account?.address || 'N/A'}</div>
                            <div><strong>PAN:</strong> ${printData.bill.account?.pan || 'N/A'}</div>
                            <div><strong>Payment Mode:</strong> ${printData.bill.paymentMode || 'N/A'}</div>
                        </div>
                        <div>
                            <div><strong>Invoice No:</strong> ${printData.bill.billNumber || 'N/A'}</div>
                            <div><strong>Supplier Inv No:</strong> ${printData.bill.partyBillNumber || 'N/A'}</div>
                            <div><strong>Transaction Date:</strong> ${new Date(printData.bill.transactionDate).toLocaleDateString()}</div>
                            <div><strong>Inv. Issue Date:</strong> ${new Date(printData.bill.date).toLocaleDateString()}</div>
                        </div>
                    </div>

                    <table class="print-invoice-table">
                        <thead>
                            <tr>
                                <th>SN</th>
                                <th>Code</th>
                                <th>HSN</th>
                                <th>Description of Goods</th>
                                <th>Unit</th>
                                <th>Batch</th>
                                <th>Expiry</th>
                                <th>Qty</th>
                                <th>Free</th>
                                <th>Rate</th>
                                <th>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${printData.bill.items?.map((item, i) => `
                                <tr key="${i}">
                                    <td>${i + 1}</td>
                                    <td>${item.uniqueNumber || ''}</td>
                                    <td>${item.hscode || ''}</td>
                                    <td>${item.itemName || ''}</td>
                                    <td>${item.unitName || ''}</td>
                                    <td>${item.batchNumber || ''}</td>
                                    <td>${item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'N/A'}</td>
                                    <td>${item.quantity || 0}</td>
                                    <td>${item.bonus || 0}</td>
                                    <td>${(item.puPrice || 0).toFixed(2)}</td>
                                    <td>${((item.quantity || 0) * (item.puPrice || 0)).toFixed(2)}</td>
                                </tr>
                            `).join('') || ''}
                        </tbody>
                    </table>

                    <table class="print-totals-table">
                        <tbody>
                            <tr>
                                <td><strong>Sub Total:</strong></td>
                                <td class="print-text-right">${(printData.bill.subTotal || 0).toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td><strong>Discount (${printData.bill.discountPercentage || 0}%):</strong></td>
                                <td class="print-text-right">${(printData.bill.discountAmount || 0).toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td><strong>CC Charge:</strong></td>
                                <td class="print-text-right">${(printData.bill.totalCcAmount || 0).toFixed(2)}</td>
                            </tr>
                            ${!printData.bill.isVatExempt ? `
                                <tr>
                                    <td><strong>Taxable Amount:</strong></td>
                                    <td class="print-text-right">${(printData.bill.taxableAmount || 0).toFixed(2)}</td>
                                </tr>
                                <tr>
                                    <td><strong>VAT (${printData.bill.vatPercentage || 13}%):</strong></td>
                                    <td class="print-text-right">${(printData.bill.vatAmount || 0).toFixed(2)}</td>
                                </tr>
                            ` : ''}
                            <tr>
                                <td><strong>Round Off:</strong></td>
                                <td class="print-text-right">${(printData.bill.roundOffAmount || 0).toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td><strong>Grand Total:</strong></td>
                                <td class="print-text-right">${(printData.bill.totalAmount || 0).toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>

                    <div class="print-amount-in-words">
                        <strong>In Words:</strong> ${convertToRupeesAndPaisa(printData.bill.totalAmount || 0)} Only.
                    </div>

                    <div class="print-signature-area">
                        <div class="print-signature-box">Prepared By</div>
                        <div class="print-signature-box">Checked By</div>
                        <div class="print-signature-box">Approved By</div>
                    </div>
                </div>
            </div>
        `;

            const styles = `
            @media print {
                @page { size: A4; margin: 5mm; }
                body { font-family: 'Arial Narrow', Arial, sans-serif; font-size: 9pt; line-height: 1.2; color: #000; background: white; margin: 0; padding: 0; }
                .print-invoice-container { width: 100%; max-width: 210mm; margin: 0 auto; padding: 2mm; }
                .print-invoice-header { text-align: center; margin-bottom: 3mm; border-bottom: 1px dashed #000; padding-bottom: 2mm; }
                .print-invoice-title { font-size: 12pt; font-weight: bold; margin: 2mm 0; text-transform: uppercase; }
                .print-company-name { font-size: 16pt; font-weight: bold; }
                .print-company-details { font-size: 8pt; font-weight: bold; margin: 1mm 0; }
                .print-invoice-details { display: flex; justify-content: space-between; margin: 2mm 0; font-size: 8pt; }
                .print-invoice-table { width: 100%; border-collapse: collapse; margin: 3mm 0; font-size: 8pt; border: none; }
                .print-invoice-table thead { border-top: 1px dashed #000; border-bottom: 1px dashed #000; }
                .print-invoice-table th { background-color: transparent; border: none; padding: 1mm; text-align: left; font-weight: bold; }
                .print-invoice-table td { border: none; padding: 1mm; border-bottom: 1px solid #eee; }
                .print-text-right { text-align: right; }
                .print-amount-in-words { font-size: 8pt; margin: 2mm 0; padding: 1mm; border: 1px dashed #000; }
                .print-signature-area { display: flex; justify-content: space-between; margin-top: 5mm; font-size: 8pt; }
                .print-signature-box { text-align: center; width: 30%; border-top: 1px dashed #000; padding-top: 1mm; font-weight: bold; }
                .print-totals-table { width: 60%; margin-left: auto; border-collapse: collapse; font-size: 8pt; }
                .print-totals-table td { padding: 1mm; }
            }
            @media screen { .print-version { display: none; } }
        `;

            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
            <html>
                <head>
                    <title>Purchase_Invoice_${printData.bill.billNumber}</title>
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

    function formatTo2Decimal(num) {
        const rounded = Math.round(num * 100) / 100;
        const parts = rounded.toString().split(".");
        if (!parts[1]) return parts[0] + ".00";
        if (parts[1].length === 1) return parts[0] + "." + parts[1] + "0";
        return rounded.toString();
    }

    const totals = calculateTotal();

    useEffect(() => {
        if (roundOffPurchase && !manualRoundOffOverride) {
            setFormData(prev => ({
                ...prev,
                roundOffAmount: totals.autoRoundOffAmount.toFixed(2)
            }));
        }
    }, [roundOffPurchase, manualRoundOffOverride, totals.autoRoundOffAmount]);

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

    // const checkDuplicatePartyBillNumber = async (billNumber) => {
    //     try {
    //         if (!billNumber) return { exists: false, partyName: '', date: null };

    //         const response = await api.get(`/api/retailer/purchase/check-invoice?partyBillNumber=${billNumber}`);
    //         return response.data;
    //     } catch (error) {
    //         console.error('Error checking duplicate invoice:', error);
    //         return { exists: false, partyName: '', date: null };
    //     }
    // };

    const checkDuplicatePartyBillNumber = async (billNumber) => {
        try {
            if (!billNumber) return { exists: false, partyName: '', date: null, dateString: '' };

            const response = await api.get(`/api/retailer/purchase/check-invoice?partyBillNumber=${billNumber}`);
            return response.data;
        } catch (error) {
            console.error('Error checking duplicate invoice:', error);
            return { exists: false, partyName: '', date: null, dateString: '' };
        }
    };

    const handleTransactionModalClose = () => {
        setShowTransactionModal(false);

        setTimeout(() => {
            const headerWsUnitInput = document.getElementById('headerWsUnit');
            if (headerWsUnitInput) {
                headerWsUnitInput.focus();
                headerWsUnitInput.select();
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
            } else if (showAccountModal && e.key === 'F6') {
                e.preventDefault();
                setShowAccountCreationModal(true);
                setShowAccountModal(false);
            }
        };

        document.addEventListener('keydown', handleGlobalKeyDown);
        return () => {
            document.removeEventListener('keydown', handleGlobalKeyDown);
        };
    }, [showTransactionModal, showAccountCreationModal, showAccountModal, handleTransactionModalClose]);

    useEffect(() => {
        return () => {
            setLastSearchQuery('');
            setShouldShowLastSearchResults(false);
        };
    }, []);

    const loadMoreAccounts = () => {
        if (!isAccountSearching) {
            fetchAccountsFromBackend(accountSearchQuery, accountSearchPage + 1);
        }
    };

    const loadMoreSearchItems = () => {
        if (!isSearching) {
            fetchItemsFromBackend(searchQuery, searchPage + 1, false);
        }
    };

    const loadMoreHeaderSearchItems = () => {
        if (!isHeaderSearching && hasMoreHeaderSearchResults) {
            fetchItemsFromBackend(
                headerShouldShowLastSearchResults ? headerLastSearchQuery : headerSearchQuery,
                headerSearchPage + 1,
                true
            );
        }
    };

    const handleHeaderSearchFocus = () => {
        if (headerLastSearchQuery && !headerSearchQuery) {
            setHeaderShouldShowLastSearchResults(true);
            if (headerLastSearchQuery.trim() !== '') {
                fetchItemsFromBackend(headerLastSearchQuery, 1, true);
            }
        }
    };

    const handleAccountCreationModalClose = () => {
        setShowAccountCreationModal(false);
        setShowAccountModal(true);

        fetchAccountsFromBackend('', 1);
    };

    const validateHeaderFields = () => {
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

            return false;
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

            return false;
        }

        return true;
    };


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
                    <VirtualizedItemList
                        items={itemsToShow}
                        onItemClick={(item) => showBatchModalForItem(item)}
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
    }, [showItemDropdown, searchResults, searchQuery, lastSearchQuery, shouldShowLastSearchResults]);


    return (
        <div className="container-fluid">
            <Header />
            <div className="card mt-2 shadow-lg p-2 animate__animated animate__fadeInUp expanded-card ledger-card compact">
                <div className="card-header">
                    <div className="d-flex justify-content-between align-items-center">
                        <h2 className="card-title mb-0">
                            <i className="bi bi-file-text me-2"></i>
                            Purchase Entry
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
                                                ref={company.dateFormat === 'roman' ? transactionDateRef : null}
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
                                                e.preventDefault();
                                                document.getElementById('paymentMode')?.focus();
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
                                    <input
                                        type="text"
                                        className={`form-control form-control-sm ${duplicateInvoiceInfo.exists ? 'is-warning' : ''}`}
                                        id="partyBillNumber"
                                        name="partyBillNumber"
                                        value={formData.partyBillNumber}
                                        onChange={async (e) => {
                                            const value = e.target.value;
                                            setFormData({ ...formData, partyBillNumber: value });
                                            setDuplicateInvoiceInfo({ exists: false, partyName: '', date: null });
                                        }}
                                        onBlur={async (e) => {
                                            const value = e.target.value.trim();
                                            if (value) {
                                                const result = await checkDuplicatePartyBillNumber(value);
                                                setDuplicateInvoiceInfo(result);
                                            }
                                        }}
                                        onKeyDown={async (e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                const value = e.target.value.trim();
                                                if (value) {
                                                    const result = await checkDuplicatePartyBillNumber(value);
                                                    setDuplicateInvoiceInfo(result);
                                                }
                                                document.getElementById('isVatExempt')?.focus();
                                            }
                                        }}
                                        autoComplete='off'
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
                                        Party Inv. No: <span className="text-danger">*</span>
                                    </label>
                                    {/* {duplicateInvoiceInfo.exists && (
                                        <div className="text-warning small mt-1" style={{ fontSize: '0.7rem' }}>
                                            Warning: This invoice already used by {duplicateInvoiceInfo.partyName} on {new Date(duplicateInvoiceInfo.date).toISOString().split('T')[0]}
                                        </div>
                                    )} */}
                                    {duplicateInvoiceInfo.exists && (
                                        <div className="text-warning small mt-1" style={{ fontSize: '0.7rem' }}>
                                            Warning: This invoice already used by {duplicateInvoiceInfo.partyName} on {
                                                duplicateInvoiceInfo.dateString || new Date(duplicateInvoiceInfo.date).toLocaleDateString()
                                            }
                                        </div>
                                    )}
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
                            {/* Party Name Field */}
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
                                            transactionType="payment"
                                            dateFormat={company.dateFormat}
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

                            {/* Party Address Field */}
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

                            {/* VAT No Field */}
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
                                        <td width="5%" style={{
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
                                        <td width="5%" style={{ padding: '2px', backgroundColor: '#ffffff' }}>
                                            <input
                                                type="number"
                                                className="form-control form-control-sm"
                                                id='headerWsUnit'
                                                placeholder="WS Unit"
                                                value={selectedItemWSUnit}
                                                onChange={(e) => setSelectedItemWSUnit(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if ((e.key === 'Tab' || e.key === 'Enter')) {
                                                        e.preventDefault();
                                                        document.getElementById('headerBatch').focus();
                                                        document.getElementById('headerBatch').select();
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
                                                type="text"
                                                className="form-control form-control-sm"
                                                id='headerBatch'
                                                placeholder="Batch"
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
                                                onChange={(e) => setSelectedItemQuantity(e.target.value)}
                                                onFocus={(e) => e.target.select()}
                                                onKeyDown={(e) => {
                                                    if ((e.key === 'Tab' || e.key === 'Enter')) {
                                                        e.preventDefault();
                                                        document.getElementById('headerBonus').focus();
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
                                                placeholder="Bonus"
                                                id="headerBonus"
                                                value={selectedItemBonus}
                                                onChange={(e) => setSelectedItemBonus(e.target.value)}
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
                                            {/* {selectedItemForInsert ? (selectedItemForInsert.unit?.name || 'N/A') : '-'} */}
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

                                                        if (e.key === 'Enter') {
                                                            // Validate required fields first
                                                            if (!selectedItemBatchNumber.trim()) {
                                                                setNotification({
                                                                    show: true,
                                                                    message: 'Batch number is required before setting sales price',
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
                                                                    message: 'Expiry date is required before setting sales price',
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

                                                            // Set header mode and open sales price modal
                                                            setIsHeaderMode(true);
                                                            openSalesPriceModalFromHeader();
                                                        } else {
                                                            // For Tab key, focus insert button
                                                            document.getElementById('insertButton').focus();
                                                        }
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
                                            {formatter.format(selectedItemQuantity * selectedItemRate)}
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
                                                    if (showSalesPriceModal) {
                                                        // If sales price modal is open, save it first
                                                        saveSalesPrice();
                                                    } else if (validateHeaderFields()) {
                                                        insertSelectedItem();
                                                    }
                                                }}
                                                disabled={!selectedItemForInsert}
                                                title={selectedItemForInsert ?
                                                    `Insert item ${selectedItemQuantity > 0 ? `(Quantity: ${selectedItemQuantity})` : '(Quantity will be 0)'}`
                                                    : 'Insert item'}
                                                onKeyDown={(e) => {
                                                    if ((e.key === 'Tab' || e.key === 'Enter')) {
                                                        e.preventDefault();
                                                        if (showSalesPriceModal) {
                                                            saveSalesPrice();
                                                        } else if (validateHeaderFields()) {
                                                            insertSelectedItem();
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

                                    {/* Column headers row */}
                                    <tr style={{
                                        height: '26px',
                                        backgroundColor: '#e9ecef',
                                        position: 'sticky',
                                        top: '26px',
                                        zIndex: 9
                                    }}>
                                        <th width="5%" style={{ padding: '3px', fontSize: '0.75rem' }}>S.N.</th>
                                        <th width="5%" style={{ padding: '3px', fontSize: '0.75rem' }}>#</th>
                                        <th width="8%" style={{ padding: '3px', fontSize: '0.75rem' }}>HSN</th>
                                        <th width="20%" style={{ padding: '3px', fontSize: '0.75rem' }}>Description of Goods</th>
                                        <th width="5%" style={{ padding: '3px', fontSize: '0.75rem' }}>WS Unit</th>
                                        <th width="8%" style={{ padding: '3px', fontSize: '0.75rem' }}>Batch</th>
                                        <th width="8%" style={{ padding: '3px', fontSize: '0.75rem' }}>Expiry</th>
                                        {storeManagementEnabled && <th width="8%" style={{ padding: '3px', fontSize: '0.75rem' }}>Store</th>}
                                        {storeManagementEnabled && <th width="8%" style={{ padding: '3px', fontSize: '0.75rem' }}>Rack</th>}
                                        <th width="8%" style={{ padding: '3px', fontSize: '0.75rem' }}>Qty</th>
                                        <th width="8%" style={{ padding: '3px', fontSize: '0.75rem' }}>Bonus</th>
                                        <th width="8%" style={{ padding: '3px', fontSize: '0.75rem' }}>Unit</th>
                                        <th width="8%" style={{ padding: '3px', fontSize: '0.75rem' }}>Rate</th>
                                        <th width="10%" style={{ padding: '3px', fontSize: '0.75rem' }}>Amount</th>
                                        <th width="10%" style={{ padding: '3px', fontSize: '0.75rem' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody id="items" style={{ backgroundColor: '#fff' }}>
                                    {items.map((item, index) => (
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
                                                    type="number"
                                                    name={`items[${index}][wsUnit]`}
                                                    className="form-control form-control-sm"
                                                    id={`wsUnit-${index}`}
                                                    value={item.wsUnit}
                                                    onChange={(e) => updateItemField(index, 'wsUnit', e.target.value)}
                                                    required
                                                    onFocus={(e) => {
                                                        e.target.select();
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            document.getElementById(`batchNumber-${index}`)?.focus();
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
                                                    type="text"
                                                    name={`items[${index}][batchNumber]`}
                                                    className="form-control form-control-sm"
                                                    id={`batchNumber-${index}`}
                                                    value={item.batchNumber}
                                                    onChange={(e) => updateItemField(index, 'batchNumber', e.target.value)}
                                                    onFocus={(e) => {
                                                        e.target.select();
                                                    }}
                                                    required
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
                                                            if (storeManagementEnabled) {
                                                                document.getElementById(`store-${index}`)?.focus();
                                                            } else {
                                                                document.getElementById(`quantity-${index}`)?.focus();
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

                                            {storeManagementEnabled && (
                                                <td style={{ padding: '3px' }}>
                                                    <select
                                                        name={`items[${index}][store]`}
                                                        className="form-control form-control-sm"
                                                        id={`store-${index}`}
                                                        value={item.store || ''}
                                                        onChange={(e) => updateItemField(index, 'store', e.target.value || null)}
                                                        required={storeManagementEnabled}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                document.getElementById(`rack-${index}`)?.focus();
                                                            }
                                                        }}
                                                        style={{
                                                            height: '20px',
                                                            fontSize: '0.75rem',
                                                            padding: '0 4px'
                                                        }}
                                                    >
                                                        <option value="">Select Store</option>
                                                        {stores.map(store => (
                                                            <option key={store.id} value={store.id}>{store.name}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                            )}

                                            {storeManagementEnabled && (
                                                <td style={{ padding: '3px' }}>
                                                    <select
                                                        name={`items[${index}][rack]`}
                                                        className="form-control form-control-sm"
                                                        id={`rack-${index}`}
                                                        value={item.rack || ''}
                                                        onChange={(e) => updateItemField(index, 'rack', e.target.value || null)}
                                                        required={storeManagementEnabled}
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
                                                    >
                                                        <option value="">Select Rack</option>
                                                        {racksByStore[item.store]?.map(rack => (
                                                            <option key={rack.id} value={rack.id}>{rack.name}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                            )}

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
                                                            document.getElementById(`bonus-${index}`)?.focus();
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
                                                    name={`items[${index}][bonus]`}
                                                    className="form-control form-control-sm"
                                                    id={`bonus-${index}`}
                                                    value={item.bonus}
                                                    onChange={(e) => updateItemField(index, 'bonus', e.target.value)}
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
                                            {/* <td className="text-nowrap" style={{ padding: '3px', fontSize: '0.75rem' }}>
                                                {item.unitName}
                                                <input type="hidden" name={`items[${index}][unitId]`} value={item.unitId} />
                                            </td> */}
                                            <td className="text-nowrap" style={{ padding: '3px', fontSize: '0.75rem' }}>
                                                {item.unitName || item.unit?.name || ''}
                                                <input type="hidden" name={`items[${index}][unitId]`} value={item.unitId || item.unit?.id || ''} />
                                            </td>
                                            <td style={{ padding: '3px' }}>
                                                <input
                                                    type="number"
                                                    name={`items[${index}][puPrice]`}
                                                    className="form-control form-control-sm"
                                                    id={`puPrice-${index}`}
                                                    value={item.puPrice}
                                                    onChange={(e) => updateItemField(index, 'puPrice', e.target.value)}
                                                    onFocus={(e) => {
                                                        e.target.select();
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            openSalesPriceModal(index);
                                                        }
                                                    }}
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
                                                    onClick={() => fetchLastTransactions(item.itemId, index)}
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
                                            <input type="hidden" name={`items[${index}][vatStatus]`} value={item.vatStatus} />
                                        </tr>
                                    ))}

                                    {items.length === 0 && (
                                        <tr style={{ height: '24px' }}>
                                            <td colSpan={storeManagementEnabled ? 16 : 14} className="text-center text-muted py-1" style={{ fontSize: '0.75rem' }}>
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

                                    <tr id="taxableAmountRow">
                                        <td style={{ padding: '1px' }}>
                                            <label className="form-label mb-0" style={{ fontSize: '0.8rem' }}>CC Charge</label>
                                        </td>
                                        <td style={{ padding: '1px' }}>
                                            <div className="position-relative">
                                                <input
                                                    type="number"
                                                    name="CCAmount"
                                                    id="CCAmount"
                                                    className="form-control form-control-sm"
                                                    value={totals.totalCCAmount.toFixed(2)}
                                                    readOnly
                                                    onFocus={(e) => {
                                                        e.target.select();
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            handleKeyDown(e, 'CCAmount');
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
                                        {company.vatEnabled && formData.isVatExempt !== 'true' && (
                                            <>
                                                <td style={{ padding: '1px' }}>
                                                    <label className="form-label mb-0" style={{ fontSize: '0.8rem' }}>Taxable Amount:</label>
                                                </td>
                                                <td style={{ padding: '1px' }}>
                                                    <p className="form-control-plaintext mb-0" style={{ fontSize: '0.8rem' }}>Rs. {totals.taxableAmount.toFixed(2)}</p>
                                                </td>
                                                <td className="d-none">
                                                    <input
                                                        type="number"
                                                        name="vatPercentage"
                                                        id="vatPercentage"
                                                        className="form-control"
                                                        value={formData.vatPercentage}
                                                        readOnly
                                                    />
                                                </td>
                                                <td style={{ padding: '1px' }}>
                                                    <label className="form-label mb-0" style={{ fontSize: '0.8rem' }}>VAT (13%):</label>
                                                </td>
                                                <td style={{ padding: '1px' }}>
                                                    <p className="form-control-plaintext mb-0" style={{ fontSize: '0.8rem' }}>Rs. {totals.vatAmount.toFixed(2)}</p>
                                                </td>
                                            </>
                                        )}
                                        {company.vatEnabled && formData.isVatExempt === 'true' && (
                                            <>
                                                <td colSpan="4"></td>
                                            </>
                                        )}
                                    </tr>
                                    <tr>
                                        <td style={{ padding: '1px' }}>
                                            <label className="form-label mb-0" style={{ fontSize: '0.8rem' }}>Round Off:</label>
                                        </td>
                                        <td style={{ padding: '1px' }}>
                                            <div className="position-relative">
                                                <div className="input-group input-group-sm">
                                                    <input
                                                        type="number"
                                                        className="form-control form-control-sm"
                                                        step="any"
                                                        id="roundOffAmount"
                                                        name="roundOffAmount"
                                                        value={roundOffPurchase && !manualRoundOffOverride ? totals.autoRoundOffAmount.toFixed(2) : formData.roundOffAmount}
                                                        onChange={(e) => {
                                                            if (roundOffPurchase) {
                                                                setManualRoundOffOverride(true);
                                                            }
                                                            setFormData({ ...formData, roundOffAmount: e.target.value });
                                                        }}
                                                        onFocus={(e) => {
                                                            e.target.select();
                                                            if (roundOffPurchase && !manualRoundOffOverride) {
                                                                setFormData(prev => ({
                                                                    ...prev,
                                                                    roundOffAmount: totals.autoRoundOffAmount.toFixed(2)
                                                                }));
                                                            }
                                                        }}
                                                        onBlur={(e) => {
                                                            if (roundOffPurchase && parseFloat(e.target.value) === totals.autoRoundOffAmount) {
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
                                                            height: '22px',
                                                            fontSize: '0.875rem',
                                                            width: '100%'
                                                        }}
                                                    />
                                                    {roundOffPurchase && (
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
                                                                height: '22px',
                                                                fontSize: '0.75rem'
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
                                                {roundOffPurchase && (
                                                    <small className="text-muted" style={{ fontSize: '0.65rem' }}>
                                                        {manualRoundOffOverride ? "Manual override active" : "Auto round-off enabled"}
                                                    </small>
                                                )}
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
                                                    WebkitBoxOrientation: 'vertical',
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
                            {/* Print After Save Checkbox */}
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

                            {/* Action Buttons */}
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
                                            onChange={handleHeaderItemSearch}
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
                                    onClick={() => {
                                        setShowHeaderItemModal(false);
                                        if (!headerShouldShowLastSearchResults) {
                                            setHeaderSearchQuery('');
                                            setHeaderLastSearchQuery('');
                                        }
                                        setHeaderSearchResults([]);
                                        setHeaderSearchPage(1);
                                    }}
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
                                            <VirtualizedItemList
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

            {/* Account Modal */}
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
                                document.getElementById('address').focus();
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
                                                    document.getElementById('address').focus();
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
                                            document.getElementById('address').focus();
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
                                    {transactionType === 'purchase' ? 'Last Purchase Transactions' : 'Last Sales Transactions'}
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
                                                    whiteSpace: 'nowrap',
                                                    textAlign: 'right'
                                                }}>Free</th>
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
                                                            if (transactionType === 'purchase' && transaction.purchaseBillId && transaction.purchaseBillId.id) {
                                                                navigate(`/retailer/purchase/${transaction.purchaseBillId.id}/print`);
                                                            } else if (transactionType === 'sales' && transaction.billId && transaction.billId.id) {
                                                                navigate(`/retailer/sales/${transaction.billId.id}/print`);
                                                            }
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                if (transactionType === 'purchase' && transaction.purchaseBillId && transaction.purchaseBillId.id) {
                                                                    navigate(`/purchase-bills/${transaction.purchaseBillId.id}/print`);
                                                                } else if (transactionType === 'sales' && transaction.billId && transaction.billId.id) {
                                                                    navigate(`/bills/${transaction.billId.id}/print`);
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
                                                        <td style={{ padding: '0.15rem 0.3rem', textAlign: 'right' }}>{transaction.bonus || 0}</td>
                                                        <td style={{ padding: '0.15rem 0.3rem' }}>{transaction.unit?.name || 'N/A'}</td>
                                                        <td style={{ padding: '0.15rem 0.3rem', textAlign: 'right', fontWeight: '500' }}>
                                                            Rs.{transaction.puPrice ? Math.round(transaction.puPrice * 100) / 100 : 0}
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr style={{ height: '28px' }}>
                                                    <td colSpan="9" className="text-center text-muted align-middle" style={{ padding: '0.15rem 0.3rem' }}>
                                                        No previous {transactionType} transactions found
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
                                {/* Show Sales Transactions button only if currently viewing Purchase transactions */}
                                {transactionType === 'purchase' && (
                                    <button
                                        id="showSalesTransactions"
                                        className="btn btn-info btn-sm py-1 px-2"
                                        onClick={fetchSalesTransactions}
                                        style={{
                                            fontSize: '0.8rem',
                                            lineHeight: '1.2',
                                            minHeight: '28px'
                                        }}
                                    >
                                        <i className="bi bi-receipt me-1"></i> Show Sales Transactions
                                    </button>
                                )}

                                {/* Show Purchase Transactions button only if currently viewing Sales transactions */}
                                {transactionType === 'sales' && (
                                    <button
                                        id="showPurchaseTransactions"
                                        className="btn btn-info btn-sm py-1 px-2"
                                        onClick={fetchPurchaseTransactions}
                                        style={{
                                            fontSize: '0.8rem',
                                            lineHeight: '1.2',
                                            minHeight: '28px'
                                        }}
                                    >
                                        <i className="bi bi-cart me-1"></i> Show Purchase Transactions
                                    </button>
                                )}

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

            {showSalesPriceModal && (
                <div className="modal fade show" id="setSalesPriceModal" tabIndex="-1" style={{
                    display: 'block',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 1050
                }}>
                    <div className="modal-dialog modal-lg" style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        margin: '0',
                        width: '90%',
                        maxWidth: '800px'
                    }}>
                        <div className="modal-content" style={{
                            border: '1px solid #dee2e6',
                            maxHeight: '90vh',
                            overflowY: 'auto'
                        }}>
                            <div className="modal-header py-1 px-3" style={{ backgroundColor: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
                                <h5 className="modal-title mb-0" id="setSalesPriceModalLabel" style={{ fontSize: '0.9rem', fontWeight: '500' }}>
                                    Set Sales Price for New Batch
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setShowSalesPriceModal(false)}
                                    style={{ fontSize: '0.6rem', padding: '0.25rem' }}
                                ></button>
                            </div>
                            <div className="modal-body p-2">
                                <div className="row g-2 mb-2">
                                    <div className="col-12 col-md-6">
                                        <div className="position-relative">
                                            <input
                                                type="number"
                                                className="form-control form-control-sm"
                                                id="prePuPrice"
                                                step="any"
                                                value={salesPriceData.prevPuPrice.toFixed(2)}
                                                readOnly
                                                style={{
                                                    height: '26px',
                                                    fontSize: '0.875rem',
                                                    paddingTop: '0.75rem',
                                                    width: '100%',
                                                    backgroundColor: '#f8f9fa'
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
                                                Prev. Price (Rs.)
                                            </label>
                                        </div>
                                    </div>
                                    <div className="col-12 col-md-6">
                                        <div className="position-relative">
                                            <input
                                                type="number"
                                                className="form-control form-control-sm"
                                                id="puPrice"
                                                step="any"
                                                value={salesPriceData.puPrice}
                                                readOnly
                                                style={{
                                                    height: '26px',
                                                    fontSize: '0.875rem',
                                                    paddingTop: '0.75rem',
                                                    width: '100%',
                                                    backgroundColor: '#f8f9fa'
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
                                                New Price (Rs.)
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className="row g-2 mb-2">
                                    <div className="col-12 col-md-6">
                                        <div className="position-relative">
                                            <input
                                                type="number"
                                                className="form-control form-control-sm"
                                                id="CCPercentage"
                                                autoFocus
                                                step="any"
                                                value={salesPriceData.CCPercentage}
                                                onFocus={(e) => {
                                                    e.target.select();
                                                }}
                                                onChange={(e) => {
                                                    const CCPercentage = parseFloat(e.target.value) || 0;
                                                    const item = isHeaderMode ? null : items[selectedItemIndex];
                                                    const bonus = isHeaderMode ? selectedItemBonus : (item?.bonus || 0);
                                                    const itemCCAmount = ((salesPriceData.puPrice * CCPercentage / 100) * bonus);

                                                    setSalesPriceData({
                                                        ...salesPriceData,
                                                        CCPercentage: CCPercentage,
                                                        itemCCAmount: itemCCAmount
                                                    });
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        document.getElementById('itemCCAmount')?.focus();
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
                                                CC (%)
                                            </label>
                                        </div>
                                    </div>
                                    <div className="col-12 col-md-6">
                                        <div className="position-relative">
                                            <input
                                                type="number"
                                                className="form-control form-control-sm"
                                                id="itemCCAmount"
                                                step="any"
                                                value={Math.round(salesPriceData.itemCCAmount * 100) / 100}
                                                onFocus={(e) => {
                                                    e.target.select();
                                                }}
                                                onChange={(e) => {
                                                    const itemCCAmount = parseFloat(e.target.value) || 0;
                                                    const item = isHeaderMode ? null : items[selectedItemIndex];
                                                    const bonus = isHeaderMode ? selectedItemBonus : (item?.bonus || 0);
                                                    const puPrice = salesPriceData.puPrice;

                                                    const CCPercentage = bonus > 0 && puPrice > 0
                                                        ? (itemCCAmount / (puPrice * bonus)) * 100
                                                        : 0;

                                                    setSalesPriceData({
                                                        ...salesPriceData,
                                                        itemCCAmount: itemCCAmount,
                                                        CCPercentage: CCPercentage
                                                    });
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        document.getElementById('marginPercentage')?.focus();
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
                                                CC Charge (Rs.)
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className="row g-2 mb-2">
                                    <div className="col-12 col-md-6">
                                        <div className="position-relative">
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
                                                        const margin = parseFloat(e.target.value) || 0;
                                                        const puPrice = parseFloat(salesPriceData.puPrice) || 0;
                                                        const salesPrice = puPrice + (puPrice * margin / 100);

                                                        setSalesPriceData({
                                                            ...salesPriceData,
                                                            marginPercentage: margin,
                                                            salesPrice: parseFloat(salesPrice.toFixed(2))
                                                        });
                                                        document.getElementById('currency')?.focus();
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
                                                Margin (%)
                                            </label>
                                        </div>
                                    </div>
                                    <div className="col-12 col-md-6">
                                        <div className="position-relative">
                                            <select
                                                className="form-control form-control-sm"
                                                id="currency"
                                                value={salesPriceData.currency}
                                                onChange={(e) => setSalesPriceData({ ...salesPriceData, currency: e.target.value })}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        document.getElementById('mrp')?.focus();
                                                    }
                                                }}
                                                style={{
                                                    height: '26px',
                                                    fontSize: '0.875rem',
                                                    paddingTop: '0.25rem',
                                                    width: '100%'
                                                }}
                                            >
                                                <option value="NPR">NPR</option>
                                                <option value="INR">INR</option>
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
                                                Currency
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className="row g-2 mb-2">
                                    <div className="col-12 col-md-6">
                                        <div className="position-relative">
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
                                                    let salesPrice = salesPriceData.currency === 'INR' ? mrp * 1.6 : mrp;
                                                    const item = isHeaderMode ? selectedItemForInsert : items[selectedItemIndex];
                                                    if (item?.vatStatus === 'vatable') {
                                                        salesPrice = salesPrice / 1.13;
                                                    }
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
                                                MRP (Rs.)
                                            </label>
                                        </div>
                                    </div>
                                    <div className="col-12 col-md-6">
                                        <div className="position-relative">
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
                                                Sales Price (Rs.)
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Last Purchase Information Section */}
                            {lastPurchaseData && (
                                <div className="row g-2 mb-3">
                                    <div className="col-12">
                                        <div className="card border-info">
                                            <div className="card-header bg-info bg-opacity-10 py-1 px-2">
                                                <h6 className="mb-0" style={{ fontSize: '0.8rem' }}>
                                                    <i className="bi bi-clock-history me-1"></i>
                                                    Last Purchase Details
                                                </h6>
                                            </div>
                                            <div className="card-body py-2 px-2">
                                                <div className="row g-2">
                                                    <div className="col-6 col-md-3">
                                                        <small className="text-muted d-block" style={{ fontSize: '0.65rem' }}>Bill No:</small>
                                                        <span style={{ fontSize: '0.75rem', fontWeight: '500' }}>
                                                            {lastPurchaseData.billNumber || 'N/A'}
                                                        </span>
                                                    </div>
                                                    <div className="col-6 col-md-3">
                                                        <small className="text-muted d-block" style={{ fontSize: '0.65rem' }}>Date:</small>
                                                        <span style={{ fontSize: '0.75rem' }}>
                                                            {lastPurchaseData.date ? new Date(lastPurchaseData.date).toLocaleDateString() : 'N/A'}
                                                        </span>
                                                    </div>
                                                    <div className="col-6 col-md-2">
                                                        <small className="text-muted d-block" style={{ fontSize: '0.65rem' }}>Rate:</small>
                                                        <span style={{ fontSize: '0.75rem', fontWeight: '500' }}>
                                                            Rs. {lastPurchaseData.puPrice?.toFixed(2) || '0.00'}
                                                        </span>
                                                    </div>
                                                    <div className="col-6 col-md-2">
                                                        <small className="text-muted d-block" style={{ fontSize: '0.65rem' }}>MRP:</small>
                                                        <span style={{ fontSize: '0.75rem' }}>
                                                            Rs. {lastPurchaseData.mrp?.toFixed(2) || '0.00'}
                                                        </span>
                                                    </div>
                                                    <div className="col-6 col-md-2">
                                                        <small className="text-muted d-block" style={{ fontSize: '0.65rem' }}>Unit:</small>
                                                        <span style={{ fontSize: '0.75rem' }}>
                                                            {lastPurchaseData.unitName || 'N/A'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="row g-2 mt-1">
                                                    <div className="col-6 col-md-3">
                                                        <small className="text-muted d-block" style={{ fontSize: '0.65rem' }}>Batch:</small>
                                                        <span style={{ fontSize: '0.75rem' }}>
                                                            {lastPurchaseData.batchNumber || 'N/A'}
                                                        </span>
                                                    </div>
                                                    <div className="col-6 col-md-3">
                                                        <small className="text-muted d-block" style={{ fontSize: '0.65rem' }}>Expiry:</small>
                                                        <span style={{ fontSize: '0.75rem' }}>
                                                            {lastPurchaseData.expiryDate || 'N/A'}
                                                        </span>
                                                    </div>
                                                    <div className="col-6 col-md-2">
                                                        <small className="text-muted d-block" style={{ fontSize: '0.65rem' }}>Qty:</small>
                                                        <span style={{ fontSize: '0.75rem' }}>
                                                            {lastPurchaseData.quantity || 0}
                                                        </span>
                                                    </div>
                                                    <div className="col-6 col-md-2">
                                                        <small className="text-muted d-block" style={{ fontSize: '0.65rem' }}>Bonus:</small>
                                                        <span style={{ fontSize: '0.75rem' }}>
                                                            {lastPurchaseData.bonus || 0}
                                                        </span>
                                                    </div>
                                                    <div className="col-6 col-md-2">
                                                        <small className="text-muted d-block" style={{ fontSize: '0.65rem' }}>CC %:</small>
                                                        <span style={{ fontSize: '0.75rem' }}>
                                                            {lastPurchaseData.ccPercentage?.toFixed(2) || '7.50'}%
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div className="modal-footer py-1 px-3" style={{ backgroundColor: '#f8f9fa', borderTop: '1px solid #dee2e6' }}>
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-sm py-1 px-2"
                                    id='saveSalesPriceClose'
                                    onClick={() => setShowSalesPriceModal(false)}
                                    style={{
                                        fontSize: '0.8rem',
                                        lineHeight: '1.2',
                                        minHeight: '28px',
                                        fontWeight: '500'
                                    }}
                                >
                                    Close
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary btn-sm py-1 px-3"
                                    id='saveSalesPrice'
                                    onClick={() => {
                                        saveSalesPrice();
                                    }}
                                    style={{
                                        fontSize: '0.8rem',
                                        lineHeight: '1.2',
                                        minHeight: '28px',
                                        fontWeight: '500'
                                    }}
                                >
                                    Save Sales Price
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

export default AddPurchase;


