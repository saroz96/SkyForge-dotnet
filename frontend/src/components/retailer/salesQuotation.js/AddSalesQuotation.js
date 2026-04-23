import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import NepaliDate from 'nepali-date-converter';
import axios from 'axios';
import Header from '../Header';
import NotificationToast from '../../NotificationToast';
import '../../../stylesheet/retailer/salesQuotation/AddSalesQuotation.css';
import '../../../stylesheet/noDateIcon.css'
import ProductModal from '../dashboard/modals/ProductModal';
import AccountBalanceDisplay from '../payment/AccountBalanceDisplay';
import useDebounce from '../../../hooks/useDebounce';
import VirtualizedItemListForSales from '../../VirtualizedItemListForSales';
import VirtualizedAccountList from '../../VirtualizedAccountList';
import { usePageNotRefreshContext } from '../PageNotRefreshContext';

const AddSalesQuotation = () => {
    const { salesQuotationDraftSave, setSalesQuotationDraftSave, clearSalesQuotationDraft } = usePageNotRefreshContext();
    const navigate = useNavigate();
    const transactionDateRef = useRef(null);
    const [isInitialDataLoaded, setIsInitialDataLoaded] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [showProductModal, setShowProductModal] = useState(false);
    const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
    const itemsTableRef = useRef(null);
    const [notification, setNotification] = useState({
        show: false,
        message: '',
        type: 'success'
    });
    const [dateErrors, setDateErrors] = useState({
        transactionDateNepali: '',
        nepaliDate: ''
    });
    const [showItemsModal, setShowItemsModal] = useState(false);
    const [showAccountCreationModal, setShowAccountCreationModal] = useState(false);
    const [pollInterval, setPollInterval] = useState(null);
    const [printAfterSave, setPrintAfterSave] = useState(
        localStorage.getItem('printAfterSaveSalesQuotation') === 'true' || false
    );

    // Search states for items
    const [searchQuery, setSearchQuery] = useState('');
    const [lastSearchQuery, setLastSearchQuery] = useState('');
    const [shouldShowLastSearchResults, setShouldShowLastSearchResults] = useState(false);
    const debouncedSearchQuery = useDebounce(searchQuery, 50);
    const [roundOffSales, setRoundOffSales] = useState(false);
    const [manualRoundOffOverride, setManualRoundOffOverride] = useState(false);
    // Search states for accounts
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

    // Header item insertion states
    const [showHeaderItemModal, setShowHeaderItemModal] = useState(false);
    const [headerLastSearchQuery, setHeaderLastSearchQuery] = useState('');
    const [headerShouldShowLastSearchResults, setHeaderShouldShowLastSearchResults] = useState(false);
    const [headerSearchQuery, setHeaderSearchQuery] = useState('');
    const [selectedItemForInsert, setSelectedItemForInsert] = useState(null);
    const [selectedItemQuantity, setSelectedItemQuantity] = useState(0);
    const [selectedItemRate, setSelectedItemRate] = useState(0);
    const [selectedItemDescription, setSelectedItemDescription] = useState('');

    // For header modal search
    const [isHeaderSearching, setIsHeaderSearching] = useState(false);
    const [headerSearchResults, setHeaderSearchResults] = useState([]);
    const [headerSearchPage, setHeaderSearchPage] = useState(1);
    const [hasMoreHeaderSearchResults, setHasMoreHeaderSearchResults] = useState(false);
    const [totalHeaderSearchItems, setTotalHeaderSearchItems] = useState(0);
    const debouncedHeaderSearchQuery = useDebounce(headerSearchQuery, 50);

    const [transactionSettings, setTransactionSettings] = useState({
        displayTransactions: false,
        displayTransactionsForPurchase: false,
        displayTransactionsForSalesReturn: false,
        displayTransactionsForPurchaseReturn: false
    });
    const [transactionCache, setTransactionCache] = useState(new Map());
    const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
    const [loadingItems, setLoadingItems] = useState(new Set());
    const [selectedItemIndex, setSelectedItemIndex] = useState(-1);
    const continueButtonRef = useRef(null);

    const [formData, setFormData] = useState(salesQuotationDraftSave?.formData || {
        accountId: '',
        accountName: '',
        accountAddress: '',
        accountPan: '',
        transactionDateNepali: currentNepaliDate,
        transactionDateRoman: new Date().toISOString().split('T')[0],
        nepaliDate: currentNepaliDate,
        billDate: new Date().toISOString().split('T')[0],
        billNumber: '',
        paymentMode: 'credit',
        isVatExempt: 'all',
        discountPercentage: 0,
        discountAmount: 0,
        roundOffAmount: 0,
        vatPercentage: 13,
        description: '',
        items: []
    });

    const [items, setItems] = useState(salesQuotationDraftSave?.items || []);
    const [accounts, setAccounts] = useState([]);
    const [filteredAccounts, setFilteredAccounts] = useState([]);
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

    // Function to get the current bill number (does NOT increment)
    const getCurrentBillNumber = async () => {
        try {
            const response = await api.get('/api/retailer/sales-quotation/current-number');
            return response.data.data.currentQuotationNumber;
        } catch (error) {
            console.error('Error getting current bill number:', error);
            return null;
        }
    };

    // Function to get the next bill number (increments the counter)
    const getNextBillNumber = async () => {
        try {
            const response = await api.get('/api/retailer/sales-quotation/next-number');
            return response.data.data.nextQuotationNumber;
        } catch (error) {
            console.error('Error getting next bill number:', error);
            return null;
        }
    };

    // Initial data fetching
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                setIsLoading(true);

                // Fetch current bill number
                const currentBillNum = await getCurrentBillNumber();

                // Fetch company settings and initial data
                const companyResponse = await api.get('/api/retailer/sales-quotation');
                const { data } = companyResponse.data;

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

                // Set form data with bill number
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

                // Load initial accounts
                fetchAccountsFromBackend('', 1);

                setIsInitialDataLoaded(true);
            } catch (error) {
                console.error('Error fetching initial data:', error);
                setNotification({
                    show: true,
                    message: 'Error loading sales quotation data',
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
            const response = await api.get('/api/retailer/roundoff-sales');
            if (response.data.success) {
                setRoundOffSales(response.data.data.settings?.roundOffSales || false);
            }
        } catch (error) {
            console.error("Error fetching round-off setting:", error);
            setRoundOffSales(false);
        }
    };

    // Save draft to context
    useEffect(() => {
        if (formData.accountId || items.length > 0) {
            setSalesQuotationDraftSave({
                formData,
                items,
                accounts
            });
        }
    }, [formData, items, accounts, setSalesQuotationDraftSave]);

    useEffect(() => {
        const fetchTransactionSettings = async () => {
            try {
                const response = await api.get('/api/retailer/get-display-sales-transactions');
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
        return () => {
            setLastSearchQuery('');
            setShouldShowLastSearchResults(false);
            setAccountLastSearchQuery('');
            setAccountShouldShowLastSearchResults(false);
            setHeaderLastSearchQuery('');
            setHeaderShouldShowLastSearchResults(false);
        };
    }, []);

    useEffect(() => {
        if (showTransactionModal && continueButtonRef.current) {
            const timer = setTimeout(() => {
                continueButtonRef.current.focus();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [showTransactionModal]);

    useEffect(() => {
        const handleF6KeyForAccounts = (e) => {
            if (e.key === 'F6' && showAccountModal) {
                e.preventDefault();
                setShowAccountCreationModal(true);
                setShowAccountModal(false);
            }
        };

        window.addEventListener('keydown', handleF6KeyForAccounts);
        return () => {
            window.removeEventListener('keydown', handleF6KeyForAccounts);
        };
    }, [showAccountModal]);

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

    // Functions
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
                const itemsWithPrices = response.data.items.map(item => {
                    let latestPrice = 0;

                    if (item.stockEntries && item.stockEntries.length > 0) {
                        const sortedEntries = item.stockEntries.sort((a, b) =>
                            new Date(b.date) - new Date(a.date)
                        );
                        latestPrice = sortedEntries[0].price || 0;
                    }

                    return {
                        ...item,
                        id: item.id,
                        _id: item.id,
                        latestPrice,
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

    const handleAccountCreationModalClose = () => {
        setShowAccountCreationModal(false);
        setShowAccountModal(true);
        fetchAccountsFromBackend('', 1);
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
    };

    const handleItemSearch = (e) => {
        const query = e.target.value;
        setSearchQuery(query);
        setShowItemDropdown(true);
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

    const addItemToBill = async (item) => {
        if (itemSearchRef.current?.value) {
            setLastSearchQuery(itemSearchRef.current.value);
            setShouldShowLastSearchResults(true);
        }

        // Get latest price from stock entries
        const sortedStockEntries = item.stockEntries?.sort((a, b) => new Date(a.date) - new Date(b.date)) || [];
        const firstStockEntry = sortedStockEntries[0] || {};

        const newItem = {
            itemId: item.id,
            uniqueNumber: item.uniqueNumber || 'N/A',
            hscode: item.hscode,
            name: item.name,
            category: item.category?.name || 'No Category',
            quantity: 0,
            unitId: item.unit?.id || item.unitId,
            unitName: item.unit?.name || item.unitName,
            price: Math.round((firstStockEntry.price || 0) * 100) / 100,
            puPrice: firstStockEntry.puPrice || 0,
            netPuPrice: firstStockEntry.netPuPrice || 0,
            amount: 0,
            vatStatus: item.vatStatus,
            uniqueUuid: firstStockEntry.uniqueUuid,
            description: ''
        };

        const updatedItems = [...items, newItem];
        setItems(updatedItems);
        setShowItemDropdown(false);
        itemSearchRef.current.value = '';

        setSearchQuery('');
        if (itemSearchRef.current) {
            itemSearchRef.current.value = '';
        }

        // Check transaction settings
        if (transactionSettings.displayTransactions && formData.accountId) {
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

                const response = await api.get(`/api/retailer/transactions/${item.id}/${formData.accountId}/Sales`, {
                    signal: controller.signal
                });

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

        setTimeout(() => {
            if (itemsTableRef.current) {
                itemsTableRef.current.scrollTop = itemsTableRef.current.scrollHeight;
            }
        }, 50);

        setTimeout(() => {
            const descriptionInput = document.getElementById(`description-${updatedItems.length - 1}`);
            if (descriptionInput) {
                descriptionInput.focus();
                descriptionInput.select();
            }
        }, 100);
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
        setSelectedItemRate(item.latestPrice || 0);
        setSelectedItemDescription('');

        // Check transaction settings for header insert
        if (transactionSettings.displayTransactions && formData.accountId) {
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

                const response = await api.get(`/api/retailer/transactions/${item.id}/${formData.accountId}/Sales`, {
                    signal: controller.signal
                });

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

        setTimeout(() => {
            const descriptionInput = document.getElementById('headerItemDescription');
            if (descriptionInput) {
                descriptionInput.focus();
                descriptionInput.select();
            }
        }, 100);
    };

    const insertSelectedItem = () => {
        if (!selectedItemForInsert) return;

        const sortedStockEntries = selectedItemForInsert.stockEntries?.sort((a, b) => new Date(a.date) - new Date(b.date)) || [];
        const firstStockEntry = sortedStockEntries[0] || {};

        const newItem = {
            itemId: selectedItemForInsert.id,
            uniqueNumber: selectedItemForInsert.uniqueNumber || 'N/A',
            hscode: selectedItemForInsert.hscode,
            name: selectedItemForInsert.name,
            category: selectedItemForInsert.category?.name || 'No Category',
            quantity: selectedItemQuantity || 0,
            unitId: selectedItemForInsert.unit?.id || selectedItemForInsert.unitId,
            unitName: selectedItemForInsert.unit?.name || selectedItemForInsert.unitName,
            price: selectedItemRate || Math.round((firstStockEntry.price || 0) * 100) / 100,
            puPrice: firstStockEntry.puPrice || 0,
            netPuPrice: firstStockEntry.netPuPrice || 0,
            amount: (selectedItemQuantity || 0) * (selectedItemRate || Math.round((firstStockEntry.price || 0) * 100) / 100),
            vatStatus: selectedItemForInsert.vatStatus,
            uniqueUuid: firstStockEntry.uniqueUuid,
            description: selectedItemDescription || ''
        };

        const updatedItems = [...items, newItem];
        setItems(updatedItems);

        setSelectedItemForInsert(null);
        setSelectedItemQuantity(0);
        setSelectedItemRate(0);
        setSelectedItemDescription('');
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

    // const calculateTotal = (itemsToCalculate = items) => {
    //     let subTotal = 0;
    //     let taxableAmount = 0;
    //     let nonTaxableAmount = 0;

    //     itemsToCalculate.forEach(item => {
    //         subTotal += parseFloat(item.amount) || 0;

    //         if (item.vatStatus === 'vatable') {
    //             taxableAmount += parseFloat(item.amount) || 0;
    //         } else {
    //             nonTaxableAmount += parseFloat(item.amount) || 0;
    //         }
    //     });

    //     const discountPercentage = parseFloat(formData.discountPercentage) || 0;
    //     const discountAmount = parseFloat(formData.discountAmount) || 0;

    //     const discountForTaxable = (taxableAmount * discountPercentage) / 100;
    //     const discountForNonTaxable = (nonTaxableAmount * discountPercentage) / 100;

    //     const finalTaxableAmount = taxableAmount - discountForTaxable;
    //     const finalNonTaxableAmount = nonTaxableAmount - discountForNonTaxable;

    //     let vatAmount = 0;
    //     if (formData.isVatExempt === 'false' || formData.isVatExempt === 'all') {
    //         vatAmount = (finalTaxableAmount * formData.vatPercentage) / 100;
    //     }

    //     const roundOffAmount = parseFloat(formData.roundOffAmount) || 0;
    //     const totalAmount = finalTaxableAmount + finalNonTaxableAmount + vatAmount + roundOffAmount;

    //     return {
    //         subTotal,
    //         taxableAmount: finalTaxableAmount,
    //         nonTaxableAmount: finalNonTaxableAmount,
    //         vatAmount,
    //         totalAmount
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
        if (roundOffSales) {
            const roundedTotal = Math.round(totalBeforeRoundOff);
            autoRoundOffAmount = roundedTotal - totalBeforeRoundOff;
            autoRoundOffAmount = Math.round(autoRoundOffAmount * 100) / 100;
        }

        // Use auto or manual round-off
        if (roundOffSales && !manualRoundOffOverride) {
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
        const subTotal = calculateTotal().subTotal;
        const discountAmount = (subTotal * value) / 100;

        setFormData({
            ...formData,
            discountPercentage: value,
            discountAmount: discountAmount.toFixed(2)
        });
    };

    const handleDiscountAmountChange = (e) => {
        const value = parseFloat(e.target.value) || 0;
        const subTotal = calculateTotal().subTotal;
        const discountPercentage = subTotal > 0 ? (value / subTotal) * 100 : 0;

        setFormData({
            ...formData,
            discountAmount: value,
            discountPercentage: discountPercentage.toFixed(2)
        });
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

            const currentBillNum = await getCurrentBillNumber();

            const response = await api.get('/api/retailer/sales-quotation');
            const { data } = response.data;

            const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
            const currentRomanDate = new Date().toISOString().split('T')[0];

            setFormData({
                accountId: '',
                accountName: '',
                accountAddress: '',
                accountPan: '',
                transactionDateNepali: currentNepaliDate,
                transactionDate: currentRomanDate,
                nepaliDate: currentNepaliDate,
                date: currentRomanDate,
                billNumber: currentBillNum,
                paymentMode: 'credit',
                isVatExempt: 'all',
                discountPercentage: 0,
                discountAmount: 0,
                roundOffAmount: 0,
                vatPercentage: 13,
                description: '',
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

            clearSalesQuotationDraft();

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
            const currentBillNum = await getCurrentBillNumber();

            const response = await api.get('/api/retailer/sales-quotation');
            const { data } = response.data;

            const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
            const currentRomanDate = new Date().toISOString().split('T')[0];

            setFormData({
                accountId: '',
                accountName: '',
                accountAddress: '',
                accountPan: '',
                transactionDateNepali: currentNepaliDate,
                transactionDate: currentRomanDate,
                nepaliDate: currentNepaliDate,
                date: currentRomanDate,
                billNumber: currentBillNum,
                paymentMode: 'credit',
                isVatExempt: 'all',
                discountPercentage: 0,
                discountAmount: 0,
                roundOffAmount: 0,
                vatPercentage: 13,
                description: '',
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
        }
    };

    const handleSubmit = async (e, print = false) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            const calculatedValues = calculateTotal();

            const quotationData = {
                accountId: formData.accountId,
                paymentMode: formData.paymentMode,
                isVatExempt: formData.isVatExempt,
                discountPercentage: formData.discountPercentage,
                discountAmount: formData.discountAmount,
                vatPercentage: formData.vatPercentage,
                vatAmount: calculatedValues.vatAmount,
                roundOffAmount: calculatedValues.roundOffAmount,
                subTotal: calculatedValues.subTotal,
                taxableAmount: calculatedValues.taxableAmount,
                nonVatSales: calculatedValues.nonTaxableAmount,
                totalAmount: calculatedValues.totalAmount,
                nepaliDate: new Date(formData.nepaliDate).toISOString().split('T')[0],
                date: formData.billDate,
                transactionDateNepali: new Date(formData.transactionDateNepali).toISOString().split('T')[0],
                transactionDate: formData.transactionDateRoman,
                description: formData.description,
                items: items.map(item => ({
                    itemId: item.itemId,
                    unitId: item.unitId,
                    quantity: item.quantity,
                    price: item.price,
                    vatStatus: item.vatStatus,
                    uniqueUuid: item.uniqueUuid,
                    description: item.description
                })),
                print
            };

            const response = await api.post('/api/retailer/sales-quotation', quotationData);

            setTransactionCache(new Map());

            setNotification({
                show: true,
                message: 'Sales quotation saved successfully!',
                type: 'success'
            });

            if ((print || printAfterSave) && response.data.data?.quotation?._id) {
                setItems([]);
                setIsSaving(false);
                await printQuotationImmediately(response.data.data.quotation._id);
                await resetAfterSave();
            } else {
                await resetAfterSave();
                setIsSaving(false);
            }
        } catch (error) {
            console.error('Error saving sales quotation:', error);
            setNotification({
                show: true,
                message: error.response?.data?.error || 'Failed to save sales quotation. Please try again.',
                type: 'error'
            });
            setIsSaving(false);
        }
    };

    const handlePrintAfterSaveChange = (e) => {
        const isChecked = e.target.checked;
        setPrintAfterSave(isChecked);
        localStorage.setItem('printAfterSaveSalesQuotation', isChecked);
    };

    // const printQuotationImmediately = async (quotationId) => {
    //     try {
    //         const response = await api.get(`/api/retailer/sales-quotation/${quotationId}/print`);
    //         const printData = response.data.data;

    //         const tempDiv = document.createElement('div');
    //         tempDiv.style.position = 'absolute';
    //         tempDiv.style.left = '-9999px';
    //         document.body.appendChild(tempDiv);

    //         tempDiv.innerHTML = `
    //         <div id="printableContent">
    //             <div class="print-quotation-container">
    //                 <div class="print-quotation-header">
    //                     <div class="print-company-name">${printData.currentCompanyName || ''}</div>
    //                     <div class="print-company-details">
    //                         ${printData.currentCompany?.address || ''} | Tel: ${printData.currentCompany?.phone || ''} | PAN: ${printData.currentCompany?.pan || ''}
    //                     </div>
    //                     <div class="print-quotation-title">SALES QUOTATION</div>
    //                 </div>

    //                 <div class="print-quotation-details">
    //                     <div>
    //                         <div><strong>M/S:</strong> ${printData.quotation.account?.name || 'N/A'}</div>
    //                         <div><strong>Address:</strong> ${printData.quotation.account?.address || 'N/A'}</div>
    //                         <div><strong>PAN:</strong> ${printData.quotation.account?.pan || 'N/A'}</div>
    //                         <div><strong>Email:</strong> ${printData.quotation.account?.email || 'N/A'}</div>
    //                     </div>
    //                     <div>
    //                         <div><strong>Quotation No:</strong> ${printData.quotation.billNumber || 'N/A'}</div>
    //                         <div><strong>Validity Periods:</strong> ${new Date(printData.quotation.transactionDate).toLocaleDateString()}</div>
    //                         <div><strong>Quotation Issue Date:</strong> ${new Date(printData.quotation.date).toLocaleDateString()}</div>
    //                         <div><strong>Mode of Payment:</strong> ${printData.quotation.paymentMode || 'N/A'}</div>
    //                     </div>
    //                 </div>

    //                 <table class="print-quotation-table">
    //                     <thead>
    //                         <tr>
    //                             <th>S.N.</th>
    //                             <th>#</th>
    //                             <th>HSN</th>
    //                             <th>Description of Goods</th>
    //                             <th>Description</th>
    //                             <th>Qty</th>
    //                             <th>Unit</th>
    //                             <th>Rate (Rs.)</th>
    //                             <th>Total (Rs.)</th>
    //                         </tr>
    //                     </thead>
    //                     <tbody>
    //                         ${printData.quotation.items?.map((item, i) => `
    //                             <tr key="${i}">
    //                                 <td>${i + 1}</td>
    //                                 <td>${item.item?.uniqueNumber || item.uniqueNumber || ''}</td>
    //                                 <td>${item.item?.hscode || item.hscode || ''}</td>
    //                                 <td>${item.item?.name || item.itemName || ''}</td>
    //                                 <td>${item.description || ''}</td>
    //                                 <td>${item.quantity || 0}</td>
    //                                 <td>${item.item?.unit?.name || item.unitName || ''}</td>
    //                                 <td>${(item.price || 0).toFixed(2)}</td>
    //                                 <td>${((item.quantity || 0) * (item.price || 0)).toFixed(2)}</td>
    //                             </tr>
    //                         `).join('') || ''}
    //                     </tbody>
    //                     <tr>
    //                         <td colSpan="9" style="border-bottom: 1px dashed #000"></td>
    //                     </tr>
    //                 </table>

    //                 <table class="print-totals-table">
    //                     <tbody>
    //                         <tr>
    //                             <td><strong>Sub-Total:</strong></td>
    //                             <td class="print-text-right">${(printData.quotation.subTotal || 0).toFixed(2)}</td>
    //                         </tr>
    //                         <tr>
    //                             <td><strong>Discount (${printData.quotation.discountPercentage || 0}%):</strong></td>
    //                             <td class="print-text-right">${(printData.quotation.discountAmount || 0).toFixed(2)}</td>
    //                         </tr>
    //                         <tr>
    //                             <td><strong>Non-Taxable:</strong></td>
    //                             <td class="print-text-right">${(printData.quotation.nonVatSales || 0).toFixed(2)}</td>
    //                         </tr>
    //                         <tr>
    //                             <td><strong>Taxable Amount:</strong></td>
    //                             <td class="print-text-right">${(printData.quotation.taxableAmount || 0).toFixed(2)}</td>
    //                         </tr>
    //                         ${!printData.quotation.isVatExempt ? `
    //                             <tr>
    //                                 <td><strong>VAT (${printData.quotation.vatPercentage || 13}%):</strong></td>
    //                                 <td class="print-text-right">${(printData.quotation.vatAmount || 0).toFixed(2)}</td>
    //                             </tr>
    //                         ` : ''}
    //                         <tr>
    //                             <td><strong>Round Off:</strong></td>
    //                             <td class="print-text-right">${(printData.quotation.roundOffAmount || 0).toFixed(2)}</td>
    //                         </tr>
    //                         <tr>
    //                             <td><strong>Grand Total:</strong></td>
    //                             <td class="print-text-right">${(printData.quotation.totalAmount || 0).toFixed(2)}</td>
    //                         </tr>
    //                     </tbody>
    //                 </table>

    //                 <div class="print-amount-in-words">
    //                     <strong>In Words:</strong> ${convertToRupeesAndPaisa(printData.quotation.totalAmount || 0)} Only.
    //                 </div>

    //                 ${printData.quotation.description ? `
    //                     <div class="mt-3 print-note">
    //                         <strong>Note:</strong> ${printData.quotation.description}
    //                     </div>
    //                 ` : ''}

    //                 <div class="print-signature-area">
    //                     <div class="print-signature-box">Received By</div>
    //                     <div class="print-signature-box">Prepared By: ${printData.quotation.user?.name || ''}</div>
    //                     <div class="print-signature-box">For: ${printData.currentCompanyName || ''}</div>
    //                 </div>
    //             </div>
    //         </div>
    //     `;

    //         const styles = `
    //         @page {
    //             size: A4;
    //             margin: 5mm;
    //         }
    //         body {
    //             font-family: 'Arial Narrow', Arial, sans-serif;
    //             font-size: 9pt;
    //             line-height: 1.2;
    //             color: #000;
    //             background: white;
    //             margin: 0;
    //             padding: 0;
    //         }
    //         .print-quotation-container {
    //             width: 100%;
    //             max-width: 210mm;
    //             margin: 0 auto;
    //             padding: 2mm;
    //         }
    //         .print-quotation-header {
    //             text-align: center;
    //             margin-bottom: 3mm;
    //             border-bottom: 1px solid #000;
    //             padding-bottom: 2mm;
    //         }
    //         .print-quotation-title {
    //             font-size: 12pt;
    //             font-weight: bold;
    //             margin: 2mm 0;
    //             text-transform: uppercase;
    //         }
    //         .print-company-name {
    //             font-size: 16pt;
    //             font-weight: bold;
    //         }
    //         .print-company-details {
    //             font-size: 8pt;
    //             margin: 1mm 0;
    //             font-weight: bold;
    //         }
    //         .print-quotation-details {
    //             display: flex;
    //             justify-content: space-between;
    //             margin: 2mm 0;
    //             font-size: 8pt;
    //         }
    //         .print-quotation-table {
    //             width: 100%;
    //             border-collapse: collapse;
    //             margin: 3mm 0;
    //             font-size: 8pt;
    //             border: none;
    //         }
    //         .print-quotation-table thead {
    //             border-top: 1px solid #000;
    //             border-bottom: 1px solid #000;
    //         }
    //         .print-quotation-table th {
    //             background-color: transparent;
    //             border: none;
    //             padding: 1mm;
    //             text-align: left;
    //             font-weight: bold;
    //         }
    //         .print-quotation-table td {
    //             border: none;
    //             padding: 1mm;
    //             border-bottom: 1px solid #eee;
    //         }
    //         .print-text-right {
    //             text-align: right;
    //         }
    //         .print-text-center {
    //             text-align: center;
    //         }
    //         .print-amount-in-words {
    //             font-size: 8pt;
    //             margin: 2mm 0;
    //             padding: 1mm;
    //             border: 1px dashed #000;
    //         }
    //         .print-signature-area {
    //             display: flex;
    //             justify-content: space-between;
    //             margin-top: 5mm;
    //             font-size: 8pt;
    //         }
    //         .print-signature-box {
    //             text-align: center;
    //             width: 30%;
    //             border-top: 1px solid #000;
    //             padding-top: 1mm;
    //             font-weight: bold;
    //         }
    //         .print-totals-table {
    //             width: 60%;
    //             margin-left: auto;
    //             border-collapse: collapse;
    //             font-size: 8pt;
    //         }
    //         .print-totals-table td {
    //             padding: 1mm;
    //         }
    //     `;

    //         const printWindow = window.open('', '_blank');
    //         printWindow.document.write(`
    //         <html>
    //             <head>
    //                 <title>Sales_Quotation_${printData.quotation.billNumber}</title>
    //                 <style>${styles}</style>
    //             </head>
    //             <body>
    //                 ${tempDiv.innerHTML}
    //                 <script>
    //                     window.onload = function() {
    //                         setTimeout(function() {
    //                             window.print();
    //                             window.close();
    //                         }, 200);
    //                     };
    //                 </script>
    //             </body>
    //         </html>
    //     `);
    //         printWindow.document.close();

    //         document.body.removeChild(tempDiv);
    //     } catch (error) {
    //         console.error('Error fetching print data:', error);
    //         setNotification({
    //             show: true,
    //             message: 'Quotation saved but failed to load print data',
    //             type: 'warning'
    //         });
    //     }
    // };

    const printQuotationImmediately = async (quotationId) => {
        try {
            const response = await api.get(`/api/retailer/sales-quotation/${quotationId}/print`);

            if (!response.data.success) {
                throw new Error(response.data.error || 'Failed to fetch quotation data');
            }

            const printData = response.data.data;

            // Create a temporary div for the printable content
            const tempDiv = document.createElement('div');
            tempDiv.style.position = 'absolute';
            tempDiv.style.left = '-9999px';
            document.body.appendChild(tempDiv);

            // Build the HTML structure matching your SalesQuotationPrint component
            tempDiv.innerHTML = `
            <style>
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
                    width: 6%;
                }
                .print-invoice-table th:nth-child(3),
                .print-invoice-table td:nth-child(3) {
                    width: 7%;
                }
                .print-invoice-table th:nth-child(4),
                .print-invoice-table td:nth-child(4) {
                    width: 20%;
                }
                .print-invoice-table th:nth-child(5),
                .print-invoice-table td:nth-child(5) {
                    width: 20%;
                }
                .print-invoice-table th:nth-child(6),
                .print-invoice-table td:nth-child(6) {
                    width: 6%;
                    text-align: right;
                }
                .print-invoice-table th:nth-child(7),
                .print-invoice-table td:nth-child(7) {
                    width: 6%;
                }
                .print-invoice-table th:nth-child(8),
                .print-invoice-table td:nth-child(8) {
                    width: 12%;
                    text-align: right;
                }
                .print-invoice-table th:nth-child(9),
                .print-invoice-table td:nth-child(9) {
                    width: 12%;
                    text-align: right;
                }
                .print-text-right {
                    text-align: right;
                    padding-right: 2mm;
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
                }
            </style>
            <div class="print-invoice-container">
                <div class="print-invoice-header">
                    <div class="print-company-name">${printData.currentCompanyName || ''}</div>
                    <div class="print-company-details">
                        ${printData.currentCompany?.address || ''} | Tel: ${printData.currentCompany?.phone || ''} | PAN: ${printData.currentCompany?.pan || ''}
                    </div>
                    <div class="print-invoice-title">SALES QUOTATION</div>
                </div>

                <div class="print-invoice-details">
                    <div>
                        <div><strong>Customer:</strong> ${printData.bill?.account?.name || ''}</div>
                        <div><strong>Address:</strong> ${printData.bill?.account?.address || ''}</div>
                        <div><strong>PAN:</strong> ${printData.bill?.account?.pan || ''}</div>
                        <div><strong>Email:</strong> ${printData.bill?.account?.email || ''}, <strong>Phone:</strong> ${printData.bill?.account?.phone || ''}</div>
                    </div>
                    <div>
                        <div><strong>Quot. No:</strong> ${printData.bill?.billNumber || ''}</div>
                        <div><strong>Validity:</strong> ${printData.companyDateFormat === 'Nepali' ? formatDate(printData.transactionDateNepali, 'nepali') : formatDate(printData.bill?.transactionDate)}</div>
                        <div><strong>Date:</strong> ${printData.companyDateFormat === 'Nepali' ? formatDate(printData.nepaliDate, 'nepali') : formatDate(printData.bill?.date)}</div>
                        <div><strong>Payment Mode:</strong> ${printData.bill?.paymentMode || 'N/A'}</div>
                    </div>
                </div>

                <table class="print-invoice-table">
                    <thead>
                        <tr>
                            <th>S.N.</th>
                            <th>#</th>
                            <th>HSN</th>
                            <th>Description of Goods</th>
                            <th>Description</th>
                            <th>Qty</th>
                            <th>Unit</th>
                            <th>Rate (Rs.)</th>
                            <th>Total (Rs.)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${printData.bill?.items?.map((item, i) => {
                const itemTotal = (item.quantity || 0) * (item.price || 0);
                return `
                                <tr>
                                    <td>${i + 1}</td>
                                    <td>${item.uniqueNumber || ''}</td>
                                    <td>${item.hscode || ''}</td>
                                    <td>${item.vatStatus === 'vatExempt' ? `${item.itemName || ''} *` : (item.itemName || '')}</td>
                                    <td>${item.description || ''}</td>
                                    <td class="print-text-right">${(item.quantity || 0).toFixed(2)}</td>
                                    <td>${item.unitName || ''}</td>
                                    <td class="print-text-right">${(item.price || 0).toFixed(2)}</td>
                                    <td class="print-text-right">${itemTotal.toFixed(2)}</td>
                                </tr>
                            `;
            }).join('')}
                    </tbody>
                    <tr>
                        <td colspan="9" style="border-bottom: 1px solid #000"></td>
                    </tr>
                </table>

                <table class="print-totals-table">
                    <tbody>
                        <tr>
                            <td><strong>Sub-Total:</strong></td>
                            <td class="print-text-right">${(printData.bill?.subTotal || 0).toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td><strong>Discount (${printData.bill?.discountPercentage || 0}%):</strong></td>
                            <td class="print-text-right">${(printData.bill?.discountAmount || 0).toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td><strong>Non-Taxable:</strong></td>
                            <td class="print-text-right">${(printData.bill?.nonVatSales || 0).toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td><strong>Taxable Amount:</strong></td>
                            <td class="print-text-right">${(printData.bill?.taxableAmount || 0).toFixed(2)}</td>
                        </tr>
                        ${!printData.bill?.isVatExempt ? `
                            <tr>
                                <td><strong>VAT (${printData.bill?.vatPercentage || 0}%):</strong></td>
                                <td class="print-text-right">${(printData.bill?.vatAmount || 0).toFixed(2)}</td>
                            </tr>
                        ` : ''}
                        <tr>
                            <td><strong>Round Off:</strong></td>
                            <td class="print-text-right">${(printData.bill?.roundOffAmount || 0).toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td><strong>Grand Total:</strong></td>
                            <td class="print-text-right">${(printData.bill?.totalAmount || 0).toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>

                <div class="print-amount-in-words">
                    <strong>In Words:</strong> ${numberToWordsWithPaisa(printData.bill?.totalAmount || 0)} Only.
                </div>

                ${printData.bill?.description ? `
                    <div class="mt-3 print-note">
                        <strong>Note:</strong> ${printData.bill.description}
                    </div>
                ` : ''}

                <br /><br />
                <div class="print-signature-area">
                    <div class="print-signature-box">Received By</div>
                    <div class="print-signature-box">Prepared By: ${printData.bill?.user?.name || ''}</div>
                    <div class="print-signature-box">For: ${printData.currentCompanyName || ''}</div>
                </div>
            </div>
        `;

            // Open print window
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
            <html>
                <head>
                    <title>Sales_Quotation_${printData.bill?.billNumber || ''}</title>
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

            // Clean up
            document.body.removeChild(tempDiv);

        } catch (error) {
            console.error('Error fetching print data:', error);
            throw error; // Re-throw to be caught by the calling function
        }
    };

    // Helper function for date formatting (add this inside your component)
    const formatDate = (dateString, format = 'english') => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'N/A';

            if (format === 'nepali') {
                // You might want to add Nepali date conversion here
                // For now, return as is
                return dateString;
            }

            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } catch (e) {
            return 'N/A';
        }
    };

    // Helper function for number to words (add this inside your component)
    const numberToWordsWithPaisa = (amount) => {
        const rupees = Math.floor(amount);
        const paisa = Math.round((amount - rupees) * 100);

        let result = numberToWords(rupees) + ' Rupees';

        if (paisa > 0) {
            result += ' and ' + numberToWords(paisa) + ' Paisa';
        }

        return result;
    };

    const numberToWords = (num) => {
        const ones = [
            '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
            'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
            'Seventeen', 'Eighteen', 'Nineteen'
        ];
        const tens = [
            '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
        ];
        const scales = ['', 'Thousand', 'Million', 'Billion'];

        const convertHundreds = (num) => {
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
        };

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
    };

    const totals = calculateTotal();

    useEffect(() => {
        if (roundOffSales && !manualRoundOffOverride) {
            setFormData(prev => ({
                ...prev,
                roundOffAmount: totals.autoRoundOffAmount
            }));
        }
    }, [roundOffSales, manualRoundOffOverride, totals.autoRoundOffAmount]);

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
            if (selectedItemForInsert) {
                const descriptionInput = document.getElementById('headerItemDescription');
                if (descriptionInput) {
                    descriptionInput.focus();
                    descriptionInput.select();
                }
            } else if (items.length > 0) {
                const descriptionInput = document.getElementById(`description-${items.length - 1}`);
                if (descriptionInput) {
                    descriptionInput.focus();
                    descriptionInput.select();
                }
            }
        }, 200);
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
                handleAccountCreationModalClose();
            } else if (showItemsModal && e.key === 'Escape') {
                e.preventDefault();
                setShowItemsModal(false);
                setTimeout(() => {
                    itemSearchRef.current?.focus();
                }, 100);
            }
        };

        document.addEventListener('keydown', handleGlobalKeyDown);
        return () => {
            document.removeEventListener('keydown', handleGlobalKeyDown);
        };
    }, [showTransactionModal, showAccountCreationModal, showItemsModal, handleTransactionModalClose, handleAccountCreationModalClose]);

    useEffect(() => {
        if (itemsTableRef.current && items.length > 0) {
            setTimeout(() => {
                itemsTableRef.current.scrollTop = itemsTableRef.current.scrollHeight;
            }, 10);
        }
    }, [items]);

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
        if (!isHeaderSearching) {
            fetchItemsFromBackend(headerSearchQuery, headerSearchPage + 1, true);
        }
    };

    const formatter = new Intl.NumberFormat('en-NP', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

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
    }, [showItemDropdown, searchResults, searchQuery, isSearching, hasMoreSearchResults, totalSearchItems, searchPage]);

    // The JSX remains the same as your original AddSalesQuotation component
    // with property names updated to match the pattern (itemId instead of item, unitId instead of unit, etc.)

    return (
        <div className="container-fluid">
            <Header />
            <div className="card mt-2 shadow-lg p-2 animate__animated animate__fadeInUp expanded-card ledger-card compact">
                <div className="card-header">
                    <div className="d-flex justify-content-between align-items-center">
                        <h2 className="card-title mb-0">
                            <i className="bi bi-file-text me-2"></i>
                            Sales Quotation
                        </h2>
                        <div>
                            {formData.billNumber === '' && (
                                <span className="badge bg-danger me-2">Quotation number is required!</span>
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
                    <form onSubmit={handleSubmit} id="quotationForm" className="needs-validation" noValidate>
                        {/* Date and Basic Info Row - same as your original */}
                        <div className="row g-2 mb-3">
                            {company.dateFormat === 'nepali' || company.dateFormat === 'Nepali' ? (
                                <>
                                    <div className="col-12 col-md-6 col-lg-3">
                                        <div className="position-relative">
                                            <input
                                                type="text"
                                                name="transactionDateNepali"
                                                id="transactionDateNepali"
                                                ref={transactionDateRef}
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
                                                Validity Periods: <span className="text-danger">*</span>
                                            </label>
                                            {dateErrors.transactionDateNepali && (
                                                <div className="invalid-feedback d-block" style={{ fontSize: '0.7rem' }}>
                                                    {dateErrors.transactionDateNepali}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="col-12 col-md-6 col-lg-3">
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
                                                Quotation Date: <span className="text-danger">*</span>
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
                                    <div className="col-12 col-md-6 col-lg-3">
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
                                                Validity Periods: <span className="text-danger">*</span>
                                            </label>
                                        </div>
                                    </div>
                                    <div className="col-12 col-md-6 col-lg-3">
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
                                                Quotation Date: <span className="text-danger">*</span>
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
                                        Quot. No:
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
                                        <td width="25%" style={{
                                            padding: '2px',
                                            fontSize: '0.75rem',
                                            backgroundColor: '#ffffff'
                                        }}>
                                            {selectedItemForInsert ? selectedItemForInsert.name : ''}
                                        </td>
                                        <td width="20%" style={{ padding: '2px', backgroundColor: '#ffffff' }}>
                                            <input
                                                type="text"
                                                className="form-control form-control-sm"
                                                id='headerItemDescription'
                                                placeholder="Description"
                                                value={selectedItemDescription}
                                                onChange={(e) => setSelectedItemDescription(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if ((e.key === 'Tab' || e.key === 'Enter')) {
                                                        e.preventDefault();
                                                        document.getElementById('selectedItemQuantity').focus();
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
                                                onChange={(e) => setSelectedItemQuantity(parseFloat(e.target.value) || 0)}
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
                                            {selectedItemForInsert ? (selectedItemForInsert.unit?.name || selectedItemForInsert.unitName || 'N/A') : '-'}
                                        </td>
                                        <td width="8%" style={{ padding: '2px', backgroundColor: '#ffffff' }}>
                                            <input
                                                type="number"
                                                className="form-control form-control-sm"
                                                placeholder="Rate"
                                                id='selectedItemRate'
                                                value={Math.round(selectedItemRate * 100) / 100}
                                                onChange={(e) => setSelectedItemRate(parseFloat(e.target.value) || 0)}
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
                                                onClick={insertSelectedItem}
                                                disabled={!selectedItemForInsert}
                                                title="Insert item below"
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
                                                    backgroundColor: selectedItemForInsert ? '#198754' : '#6c757d',
                                                    borderColor: selectedItemForInsert ? '#198754' : '#6c757d',
                                                    cursor: selectedItemForInsert ? 'pointer' : 'not-allowed'
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
                                        <th width="25%" style={{ padding: '3px', fontSize: '0.75rem' }}>Description of Goods</th>
                                        <th width="20%" style={{ padding: '3px', fontSize: '0.75rem' }}>Description</th>
                                        <th width="8%" style={{ padding: '3px', fontSize: '0.75rem' }}>Qty</th>
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
                                            <td style={{ padding: '3px', fontSize: '0.75rem' }}>
                                                {item.uniqueNumber}
                                                <input type="hidden" name={`items[${index}][uniqueNumber]`} value={item.uniqueNumber} />
                                            </td>
                                            <td style={{ padding: '3px', fontSize: '0.75rem' }}>
                                                {item.hscode}
                                                <input type="hidden" name={`items[${index}][hscode]`} value={item.hscode} />
                                            </td>
                                            <td style={{ padding: '3px', fontSize: '0.75rem' }}>
                                                {item.name}
                                                <input type="hidden" name={`items[${index}][itemId]`} value={item.itemId} />
                                            </td>
                                            <td style={{ padding: '3px' }}>
                                                <input
                                                    type="text"
                                                    name={`items[${index}][description]`}
                                                    className="form-control form-control-sm"
                                                    autoComplete='off'
                                                    id={`description-${index}`}
                                                    value={item.description || ''}
                                                    onChange={(e) => updateItemField(index, 'description', e.target.value)}
                                                    onFocus={(e) => {
                                                        e.target.select();
                                                    }}
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
                                                            document.getElementById(`price-${index}`)?.focus();
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
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            itemSearchRef.current?.focus();
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
                                                    {loadingItems.has(item.itemId) ? (
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
                                                <input type="hidden" name={`items[${index}][uniqueUuid]`} value={item.uniqueUuid} />
                                            </td>
                                        </tr>
                                    ))}

                                    {/* Empty rows placeholder when no items */}
                                    {items.length === 0 && (
                                        <tr style={{ height: '24px' }}>
                                            <td colSpan="10" className="text-center text-muted py-1" style={{ fontSize: '0.75rem' }}>
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
                                                            document.getElementById('description')?.focus();
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
                                                        value={roundOffSales && !manualRoundOffOverride ? totals.autoRoundOffAmount.toFixed(2) : formData.roundOffAmount}
                                                        onChange={(e) => {
                                                            if (roundOffSales) {
                                                                setManualRoundOffOverride(true);
                                                            }
                                                            setFormData({ ...formData, roundOffAmount: parseFloat(e.target.value) || 0 });
                                                        }}
                                                        onFocus={(e) => {
                                                            e.target.select();
                                                            if (roundOffSales && !manualRoundOffOverride) {
                                                                setFormData(prev => ({
                                                                    ...prev,
                                                                    roundOffAmount: totals.autoRoundOffAmount.toFixed(2)
                                                                }));
                                                            }
                                                        }}
                                                        onBlur={(e) => {
                                                            if (roundOffSales && parseFloat(e.target.value) === totals.autoRoundOffAmount) {
                                                                setManualRoundOffOverride(false);
                                                            }
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                document.getElementById('description')?.focus();
                                                            }
                                                        }}
                                                        style={{
                                                            height: '28px',
                                                            fontSize: '0.875rem',
                                                            width: 'auto',
                                                            flex: '1'
                                                        }}
                                                    />
                                                    {roundOffSales && (
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

                        <div className="row g-2 mb-2">
                            {/* Description Field */}
                            <div className="col-md-8 col-lg-9">
                                <div className="position-relative">
                                    <input
                                        type="text"
                                        className="form-control form-control-sm"
                                        id="description"
                                        name="description"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        autoComplete="off"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                document.getElementById('saveQuotation')?.focus();
                                            }
                                        }}
                                        style={{
                                            height: '24px',
                                            fontSize: '0.875rem',
                                            paddingTop: '0.5rem',
                                            width: '100%'
                                        }}
                                    />
                                    <label
                                        className="position-absolute"
                                        style={{
                                            top: '-0.4rem',
                                            left: '0.75rem',
                                            fontSize: '0.75rem',
                                            backgroundColor: 'white',
                                            padding: '0 0.25rem',
                                            color: '#6c757d',
                                            fontWeight: '500'
                                        }}
                                    >
                                        Description
                                    </label>
                                </div>
                            </div>

                            {/* Checkbox and Action Buttons */}
                            <div className="col-md-4 col-lg-3">
                                <div className="d-flex justify-content-between align-items-center h-100">
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
                                            id="saveQuotation"
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
                            </div>
                        </div>
                    </form>
                </div>
            </div>

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
                                    Last Sales Transactions
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
                                                            }
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                if (transaction.billId && transaction.billId.id) {
                                                                    navigate(`/retailer/sales/${transaction.billId.id}/print`);
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

            {/* Product modal */}
            {showProductModal && (
                <ProductModal onClose={() => setShowProductModal(false)} />
            )}

            <NotificationToast
                show={notification.show}
                message={notification.message}
                type={notification.type}
                onClose={() => setNotification({ ...notification, show: false })}
            />

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

export default AddSalesQuotation;