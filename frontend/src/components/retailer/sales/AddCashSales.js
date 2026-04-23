import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import NepaliDate from 'nepali-date-converter';
import axios from 'axios';
import Header from '../Header';
import NotificationToast from '../../NotificationToast';
import '../../../stylesheet/retailer/sales/AddCashSales.css'
import '../../../stylesheet/noDateIcon.css'
import ProductModal from '../dashboard/modals/ProductModal';
import useDebounce from '../../../hooks/useDebounce';
import VirtualizedItemList from '../../VirtualizedItemListForSales';
import VirtualizedAccountList from '../../VirtualizedAccountList';
import AccountCreationModal from './AccountCreationModal';
import AccountBalanceDisplay from '../payment/AccountBalanceDisplay';

const AddCashSales = () => {
    const navigate = useNavigate();
    const [quantityErrors, setQuantityErrors] = useState({});
    const [stockValidation, setStockValidation] = useState({
        itemStockMap: new Map(),
        usedStockMap: new Map(),
    });
    const [isManualAccountEntry, setIsManualAccountEntry] = useState(false);
    const [manualAccountName, setManualAccountName] = useState('');
    const [isAccountSearching, setIsAccountSearching] = useState(false);
    const [accountSearchResults, setAccountSearchResults] = useState([]);
    const [accountSearchPage, setAccountSearchPage] = useState(1);
    const [hasMoreAccountResults, setHasMoreAccountResults] = useState(false);
    const [totalAccounts, setTotalAccounts] = useState(0);
    const [accountSearchQuery, setAccountSearchQuery] = useState('');
    const [accountLastSearchQuery, setAccountLastSearchQuery] = useState('');
    const [accountShouldShowLastSearchResults, setAccountShouldShowLastSearchResults] = useState(false);

    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [searchPage, setSearchPage] = useState(1);
    const [hasMoreSearchResults, setHasMoreSearchResults] = useState(false);
    const [totalSearchItems, setTotalSearchItems] = useState(0);

    const [headerSearchQuery, setHeaderSearchQuery] = useState('');
    const [showHeaderItemModal, setShowHeaderItemModal] = useState(false);
    const [selectedItemForInsert, setSelectedItemForInsert] = useState(null);
    const [selectedItemQuantity, setSelectedItemQuantity] = useState(0);
    const [selectedItemRate, setSelectedItemRate] = useState(0);
    const [selectedItemBatchNumber, setSelectedItemBatchNumber] = useState('');
    const [selectedItemExpiryDate, setSelectedItemExpiryDate] = useState('');
    const [headerLastSearchQuery, setHeaderLastSearchQuery] = useState('');
    const [headerShouldShowLastSearchResults, setHeaderShouldShowLastSearchResults] = useState(false);
    const [headerQuantityError, setHeaderQuantityError] = useState('');
    const [roundOffSales, setRoundOffSales] = useState(false);
    const [manualRoundOffOverride, setManualRoundOffOverride] = useState(false);
    const [isHeaderSearching, setIsHeaderSearching] = useState(false);
    const [headerSearchResults, setHeaderSearchResults] = useState([]);
    const [headerSearchPage, setHeaderSearchPage] = useState(1);
    const [hasMoreHeaderSearchResults, setHasMoreHeaderSearchResults] = useState(false);
    const [totalHeaderSearchItems, setTotalHeaderSearchItems] = useState(0);

    const itemsTableRef = useRef(null);
    const [printAfterSave, setPrintAfterSave] = useState(
        localStorage.getItem('printAfterSaveCash') === 'true' || false
    );
    const [showItemsModal, setShowItemsModal] = useState(false);
    const [showAccountCreationModal, setShowAccountCreationModal] = useState(false);
    const [showProductModal, setShowProductModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [lastSearchQuery, setLastSearchQuery] = useState('');
    const [shouldShowLastSearchResults, setShouldShowLastSearchResults] = useState(false);
    const debouncedSearchQuery = useDebounce(searchQuery, 50);
    const transactionDateRef = useRef(null);
    const [isInitialDataLoaded, setIsInitialDataLoaded] = useState(false);
    const addressRef = useRef(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
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
    const [formData, setFormData] = useState({
        cashAccount: '',
        cashAccountId: '',
        cashAccountAddress: '',
        cashAccountPan: '',
        cashAccountEmail: '',
        cashAccountPhone: '',
        transactionDateNepali: currentNepaliDate,
        transactionDateRoman: new Date().toISOString().split('T')[0],
        nepaliDate: currentNepaliDate,
        billDate: new Date().toISOString().split('T')[0],
        billNumber: '',
        paymentMode: 'cash',
        isVatExempt: 'all',
        discountPercentage: 0,
        discountAmount: 0,
        roundOffAmount: 0,
        vatPercentage: 13,
        items: []
    });

    const [items, setItems] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [showAccountModal, setShowAccountModal] = useState(false);
    const [showItemDropdown, setShowItemDropdown] = useState(false);
    const itemDropdownRef = useRef(null);
    const [company, setCompany] = useState({
        dateFormat: 'nepali',
        vatEnabled: true,
        fiscalYear: {}
    });
    const [nextBillNumber, setNextBillNumber] = useState('');

    const accountSearchRef = useRef(null);
    const itemSearchRef = useRef(null);

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
            const response = await api.get('/api/retailer/cash-sales/current-number');
            return response.data.data.currentCashSalesBillNumber;
        } catch (error) {
            console.error('Error getting current bill number:', error);
            return null;
        }
    };

    // Fetch accounts from backend with pagination
    const fetchAccountsFromBackend = async (searchTerm = '', page = 1) => {
        try {
            setIsAccountSearching(true);

            const response = await api.get('/api/retailer/accounts/cash/search', {
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

    // Fetch items from backend with pagination
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
                    let latestBatchNumber = '';
                    let latestExpiryDate = '';

                    if (item.stockEntries && item.stockEntries.length > 0) {
                        const sortedEntries = item.stockEntries.sort((a, b) =>
                            new Date(a.date) - new Date(b.date)
                        );
                        latestPrice = sortedEntries[0].price || 0;
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

    // For header modal search
    const debouncedHeaderSearchQuery = useDebounce(headerSearchQuery, 500);

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
        const fetchInitialData = async () => {
            try {
                setIsLoading(true);

                // Fetch current bill number (does NOT increment)
                const currentBillNum = await getCurrentBillNumber();

                const response = await api.get('/api/retailer/cash-sales');
                const { data } = response.data;

                setCompany({
                    ...data.company,
                    dateFormat: data.company.dateFormat || 'nepali',
                    vatEnabled: data.company.vatEnabled || true
                });

                setNextBillNumber(currentBillNum);
                setFormData(prev => ({
                    ...prev,
                    billNumber: currentBillNum
                }));

                // Fetch initial accounts with pagination
                fetchAccountsFromBackend('', 1);
                setIsInitialDataLoaded(true);
            } catch (error) {
                console.error('Error fetching initial data:', error);
                setNotification({
                    show: true,
                    message: 'Error loading cash sales data',
                    type: 'error'
                });
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

    useEffect(() => {
        calculateTotal();
    }, [items, formData]);

    useEffect(() => {
        if (showItemDropdown) {
            setSearchPage(1);
            fetchItemsFromBackend(debouncedSearchQuery, 1, false);
        }
    }, [debouncedSearchQuery, formData.isVatExempt, showItemDropdown]);

    // For header modal search
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

    // Update stock validation based on search results
    useEffect(() => {
        const updateStockMaps = () => {
            const newItemStockMap = new Map();
            const newUsedStockMap = new Map();

            const allItemsToCheck = [...searchResults];

            if (headerSearchResults.length > 0) {
                headerSearchResults.forEach(item => {
                    const existingItem = allItemsToCheck.find(i => i.id === item.id);
                    if (!existingItem) {
                        allItemsToCheck.push(item);
                    }
                });
            }

            allItemsToCheck.forEach(item => {
                const totalStock = item.stockEntries?.reduce((sum, entry) => sum + (entry.quantity || 0), 0) || 0;
                newItemStockMap.set(item.id, totalStock);
            });

            items.forEach(item => {
                const itemId = item.itemId;
                const currentUsed = newUsedStockMap.get(itemId) || 0;
                newUsedStockMap.set(itemId, currentUsed + (parseFloat(item.quantity) || 0));
            });

            setStockValidation(prev => ({
                ...prev,
                itemStockMap: newItemStockMap,
                usedStockMap: newUsedStockMap
            }));

            if (items.length > 0) {
                validateAllQuantities();
            }
        };

        if (searchResults.length > 0 || headerSearchResults.length > 0) {
            updateStockMaps();
        }
    }, [searchResults, headerSearchResults, items]);

    // Handle keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'F9') {
                e.preventDefault();
                setShowProductModal(prev => !prev);
            } else if (e.key === 'F6' && showAccountModal) {
                e.preventDefault();
                setShowAccountModal(false);
                setShowAccountCreationModal(true);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
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

    // Add account creation handler
    const handleAccountCreated = async (newAccountData) => {
        try {
            fetchAccountsFromBackend('', 1);

            if (newAccountData?.name) {
                setFormData({
                    ...formData,
                    cashAccount: newAccountData.name,
                    cashAccountId: newAccountData.id,
                    cashAccountAddress: newAccountData.address || '',
                    cashAccountPan: newAccountData.pan || '',
                    cashAccountEmail: newAccountData.email || '',
                    cashAccountPhone: newAccountData.phone || ''
                });

                setNotification({
                    show: true,
                    message: 'Account created and selected!',
                    type: 'success'
                });
            }

            setShowAccountCreationModal(false);

            setTimeout(() => {
                addressRef.current?.focus();
            }, 100);
        } catch (error) {
            console.error('Error refreshing accounts:', error);
        }
    };

    const handleAccountCreationModalClose = () => {
        setShowAccountCreationModal(false);
        setShowAccountModal(true);
        fetchAccountsFromBackend('', 1);
    };

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
            cashAccount: account.name,
            cashAccountId: account.id,
            cashAccountAddress: account.address || '',
            cashAccountPan: account.pan || '',
            cashAccountEmail: account.email || '',
            cashAccountPhone: account.phone || ''
        });
        setShowAccountModal(false);
        setTimeout(() => {
            addressRef.current?.focus();
        }, 100);
    };

    const handleItemSearch = (e) => {
        const query = e.target.value;
        setSearchQuery(query);
        setShowItemDropdown(true);

        if (query.trim() !== '' && shouldShowLastSearchResults) {
            setShouldShowLastSearchResults(false);
            setLastSearchQuery('');
        }
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

    const handleHeaderItemModalClose = () => {
        setShowHeaderItemModal(false);
        if (!headerShouldShowLastSearchResults) {
            setHeaderSearchQuery('');
            setHeaderLastSearchQuery('');
        }
        setHeaderSearchResults([]);
        setHeaderSearchPage(1);
    };

    const addItemToBill = (item) => {
        if (itemSearchRef.current?.value) {
            setLastSearchQuery(itemSearchRef.current.value);
            setShouldShowLastSearchResults(true);
        }

        const totalStock = item.stockEntries.reduce((sum, entry) => sum + (entry.quantity || 0), 0);

        if (totalStock === 0) {
            setNotification({
                show: true,
                message: `Item "${item.name}" has zero stock and cannot be added to the bill.`,
                type: 'error'
            });
            itemSearchRef.current.value = '';
            itemSearchRef.current.focus();
            return;
        }

        const sortedStockEntries = item.stockEntries.sort((a, b) => new Date(a.date) - new Date(b.date));
        const firstStockEntry = sortedStockEntries[0] || {};

        let expiryDate = '';
        if (item.firstExpiryDate) {
            expiryDate = item.firstExpiryDate;
        } else if (firstStockEntry.expiryDate) {
            if (firstStockEntry.expiryDate instanceof Date) {
                expiryDate = firstStockEntry.expiryDate.toISOString().split('T')[0];
            } else if (typeof firstStockEntry.expiryDate === 'string') {
                try {
                    const parsedDate = new Date(firstStockEntry.expiryDate);
                    if (!isNaN(parsedDate.getTime())) {
                        expiryDate = parsedDate.toISOString().split('T')[0];
                    }
                } catch (error) {
                    console.error('Error parsing expiry date:', error);
                }
            }
        }

        const newItem = {
            itemId: item.id,
            uniqueNumber: item.uniqueNumber || 'N/A',
            hscode: item.hscode,
            name: item.name,
            category: item.category?.name || 'No Category',
            batchNumber: firstStockEntry.batchNumber || '',
            expiryDate: expiryDate,
            quantity: 0,
            unitId: item.unit?.id || item.unitId,
            unitName: item.unit?.name || item.unitName,
            price: Math.round(firstStockEntry.price * 100) / 100 || 0,
            puPrice: firstStockEntry.puPrice || 0,
            mrp: firstStockEntry.mrp || 0,
            netPuPrice: firstStockEntry.netPuPrice || 0,
            amount: 0,
            vatStatus: item.vatStatus,
            uniqueUuid: firstStockEntry.uniqueUuid
        };

        const updatedItems = [...items, newItem];
        setItems(updatedItems);
        setShowItemDropdown(false);
        itemSearchRef.current.value = '';

        setSearchQuery('');
        if (itemSearchRef.current) {
            itemSearchRef.current.value = '';
        }

        const availableStock = stockValidation.itemStockMap.get(item.id) || 0;

        setNotification({
            show: true,
            message: `Available stock: ${availableStock}`,
            type: 'success'
        });

        setTimeout(() => {
            const quantityInput = document.getElementById(`quantity-${updatedItems.length - 1}`);
            if (quantityInput) {
                quantityInput.focus();
                quantityInput.select();
            }
        }, 100);
    };

    // const selectItemForInsert = (item) => {
    //     setSelectedItemForInsert(item);
    //     setShowHeaderItemModal(false);

    //     if (headerSearchQuery.trim() !== '') {
    //         setHeaderLastSearchQuery(headerSearchQuery);
    //         setHeaderShouldShowLastSearchResults(true);
    //     } else if (headerShouldShowLastSearchResults && headerLastSearchQuery) {
    //         setHeaderShouldShowLastSearchResults(true);
    //     }
    //     setHeaderSearchQuery('');

    //     if (item.stockEntries && item.stockEntries.length > 0) {
    //         const sortedStockEntries = item.stockEntries.sort((a, b) => new Date(a.date) - new Date(b.date));
    //         const firstStockEntry = sortedStockEntries[0];
    //         setSelectedItemRate(firstStockEntry.price || 0);
    //         setSelectedItemBatchNumber(firstStockEntry.batchNumber || '');

    //         let expiryDate = '';
    //         if (item.firstExpiryDate) {
    //             expiryDate = item.firstExpiryDate;
    //         } else if (firstStockEntry.expiryDate) {
    //             if (firstStockEntry.expiryDate instanceof Date) {
    //                 expiryDate = firstStockEntry.expiryDate.toISOString().split('T')[0];
    //             } else if (typeof firstStockEntry.expiryDate === 'string') {
    //                 try {
    //                     const parsedDate = new Date(firstStockEntry.expiryDate);
    //                     if (!isNaN(parsedDate.getTime())) {
    //                         expiryDate = parsedDate.toISOString().split('T')[0];
    //                     }
    //                 } catch (error) {
    //                     console.error('Error parsing expiry date:', error);
    //                 }
    //             }
    //         }
    //         setSelectedItemExpiryDate(expiryDate);
    //     }

    //     setTimeout(() => {
    //         const quantityInput = document.getElementById('selectedItemQuantity');
    //         if (quantityInput) {
    //             quantityInput.focus();
    //             quantityInput.select();
    //         }
    //     }, 100);
    // };

    const selectItemForInsert = (item) => {
        setSelectedItemForInsert(item);
        setShowHeaderItemModal(false);

        if (headerSearchQuery.trim() !== '') {
            setHeaderLastSearchQuery(headerSearchQuery);
            setHeaderShouldShowLastSearchResults(true);
        } else if (headerShouldShowLastSearchResults && headerLastSearchQuery) {
            setHeaderShouldShowLastSearchResults(true);
        }
        setHeaderSearchQuery('');

        const hasStockEntries = item.stockEntries && item.stockEntries.length > 0;

        // Use latestPrice which now includes last sales price for out-of-stock items
        setSelectedItemRate(item.latestPrice || 0);

        if (hasStockEntries) {
            const sortedStockEntries = [...(item.stockEntries || [])].sort((a, b) =>
                new Date(a.date) - new Date(b.date)
            );
            const firstStockEntry = sortedStockEntries[0];
            setSelectedItemBatchNumber(firstStockEntry.batchNumber || '');

            let expiryDate = '';
            if (item.firstExpiryDate) {
                expiryDate = item.firstExpiryDate;
            } else if (firstStockEntry.expiryDate) {
                if (firstStockEntry.expiryDate instanceof Date) {
                    expiryDate = firstStockEntry.expiryDate.toISOString().split('T')[0];
                } else if (typeof firstStockEntry.expiryDate === 'string') {
                    try {
                        const parsedDate = new Date(firstStockEntry.expiryDate);
                        if (!isNaN(parsedDate.getTime())) {
                            expiryDate = parsedDate.toISOString().split('T')[0];
                        }
                    } catch (error) {
                        console.error('Error parsing expiry date:', error);
                    }
                }
            }
            setSelectedItemExpiryDate(expiryDate);
        } else {
            // For out-of-stock items, clear batch and expiry
            setSelectedItemBatchNumber('');
            setSelectedItemExpiryDate('');
        }

        setTimeout(() => {
            const quantityInput = document.getElementById('selectedItemQuantity');
            if (quantityInput) {
                quantityInput.focus();
                quantityInput.select();
            }
        }, 100);
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

        if (!selectedItemBatchNumber.trim()) {
            setNotification({
                show: true,
                message: 'Batch number is required',
                type: 'error'
            });
            setTimeout(() => {
                const batchInput = document.getElementById('selectedItemBatch');
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
                message: 'Expiry date is required',
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

        const totalStock = selectedItemForInsert.stockEntries?.reduce((sum, entry) => sum + (entry.quantity || 0), 0) || 0;

        if (selectedItemQuantity > totalStock) {
            setNotification({
                show: true,
                message: `Quantity (${selectedItemQuantity}) exceeds available stock (${totalStock}) for "${selectedItemForInsert.name}"`,
                type: 'error'
            });
            setTimeout(() => {
                const quantityInput = document.getElementById('selectedItemQuantity');
                if (quantityInput) {
                    quantityInput.focus();
                    quantityInput.select();
                }
            }, 100);
            return;
        }

        if (selectedItemQuantity > 0) {
            const existingItems = items.filter(item => item.itemId === selectedItemForInsert.id);
            if (existingItems.length > 0) {
                const totalExistingQuantity = existingItems.reduce((sum, item) => {
                    return sum + (parseFloat(item.quantity) || 0);
                }, 0);

                const combinedQuantity = totalExistingQuantity + parseFloat(selectedItemQuantity);

                if (combinedQuantity > totalStock) {
                    setNotification({
                        show: true,
                        message: `Stock exceeded (${combinedQuantity}/${totalStock})`,
                        type: 'error'
                    });
                    setTimeout(() => {
                        const quantityInput = document.getElementById('selectedItemQuantity');
                        if (quantityInput) {
                            quantityInput.focus();
                            quantityInput.select();
                        }
                    }, 100);
                    return;
                }
            }
        }

        const sortedStockEntries = selectedItemForInsert.stockEntries.sort((a, b) => new Date(a.date) - new Date(b.date));
        const matchingStockEntry = sortedStockEntries.find(entry =>
            entry.batchNumber === selectedItemBatchNumber
        ) || sortedStockEntries[0] || {};

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
            price: selectedItemRate || Math.round(matchingStockEntry.price * 100) / 100,
            puPrice: matchingStockEntry.puPrice || 0,
            netPuPrice: matchingStockEntry.netPuPrice || 0,
            mrp: matchingStockEntry.mrp || 0,
            amount: (selectedItemQuantity || 0) * (selectedItemRate || Math.round(matchingStockEntry.price * 100) / 100),
            vatStatus: selectedItemForInsert.vatStatus,
            uniqueUuid: matchingStockEntry.uniqueUuid
        };

        const updatedItems = [...items, newItem];
        setItems(updatedItems);

        setSelectedItemForInsert(null);
        setSelectedItemQuantity(0);
        setSelectedItemRate(0);
        setSelectedItemBatchNumber('');
        setSelectedItemExpiryDate('');
        setHeaderQuantityError('');
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

        setTimeout(() => {
            validateAllQuantities(updatedItems);
        }, 0);
    };

    const calculateUsedStock = (items) => {
        const newUsedStockMap = new Map();

        items.forEach(item => {
            const itemId = item.itemId;
            const currentUsed = newUsedStockMap.get(itemId) || 0;
            const itemQuantity = parseFloat(item.quantity) || 0;

            newUsedStockMap.set(itemId, currentUsed + itemQuantity);
        });

        return newUsedStockMap;
    };

    const getAvailableStockForDisplay = (item) => {
        if (!item) return 0;
        return stockValidation.itemStockMap.get(item.itemId) || 0;
    };

    const getRemainingStock = (item, itemsToCheck = items) => {
        if (!item) return 0;
        const itemId = item.itemId;
        const availableStock = stockValidation.itemStockMap.get(itemId) || 0;
        const usedStockMap = calculateUsedStock(itemsToCheck);
        const totalUsed = usedStockMap.get(itemId) || 0;
        return availableStock - totalUsed;
    };

    const validateQuantity = (index, quantity, itemsToValidate = items) => {
        const item = itemsToValidate[index];
        if (!item) return true;

        const itemId = item.itemId;
        const availableStock = stockValidation.itemStockMap.get(itemId) || 0;

        if (availableStock === 0 && !stockValidation.itemStockMap.has(itemId)) {
            return true;
        }

        const usedStockMap = calculateUsedStock(itemsToValidate);
        const totalUsed = usedStockMap.get(itemId) || 0;

        return totalUsed <= availableStock;
    };

    const validateAllQuantities = (itemsToValidate = items) => {
        const newErrors = {};

        itemsToValidate.forEach((item, index) => {
            const itemId = item.itemId;

            if (stockValidation.itemStockMap.has(itemId)) {
                const isValid = validateQuantity(index, item.quantity, itemsToValidate);
                if (!isValid) {
                    const remainingStock = getRemainingStock(item, itemsToValidate);
                    const availableStock = getAvailableStockForDisplay(item);
                    newErrors[index] = `Stock: ${availableStock} | Rem.: ${remainingStock}`;
                }
            }
        });

        setQuantityErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const updateItemField = (index, field, value) => {
        const updatedItems = [...items];
        updatedItems[index][field] = value;

        if (field === 'quantity' || field === 'price') {
            if (field === 'quantity') {
                const item = updatedItems[index];
                const itemId = item.itemId;

                if (stockValidation.itemStockMap.has(itemId)) {
                    const isValid = validateQuantity(index, value, updatedItems);
                    const remainingStock = getRemainingStock(item, updatedItems);
                    const availableStock = getAvailableStockForDisplay(item);

                    if (!isValid) {
                        setQuantityErrors(prev => ({
                            ...prev,
                            [index]: `Stock: ${availableStock} | Rem.: ${remainingStock}`
                        }));
                    } else {
                        setQuantityErrors(prev => {
                            const newErrors = { ...prev };
                            delete newErrors[index];
                            return newErrors;
                        });
                    }
                }
            }

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

        setTimeout(() => {
            validateAllQuantities(updatedItems);
        }, 0);
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

    useEffect(() => {
        if (itemsTableRef.current && items.length > 0) {
            setTimeout(() => {
                itemsTableRef.current.scrollTop = itemsTableRef.current.scrollHeight;
            }, 10);
        }
    }, [items]);

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
    //         totalAmount,
    //         discountAmount
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

    // Manual reset function - does NOT increment bill number
    const handleManualReset = async () => {
        try {
            setIsLoading(true);

            const currentBillNum = await getCurrentBillNumber();

            const response = await api.get('/api/retailer/cash-sales');
            const { data } = response.data;

            const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
            const currentRomanDate = new Date().toISOString().split('T')[0];

            setFormData({
                cashAccount: '',
                cashAccountId: '',
                cashAccountAddress: '',
                cashAccountPan: '',
                cashAccountEmail: '',
                cashAccountPhone: '',
                transactionDateNepali: currentNepaliDate,
                transactionDateRoman: currentRomanDate,
                nepaliDate: currentNepaliDate,
                billDate: currentRomanDate,
                billNumber: currentBillNum,
                paymentMode: 'cash',
                isVatExempt: 'all',
                discountPercentage: 0,
                discountAmount: 0,
                roundOffAmount: 0,
                vatPercentage: 13,
                items: []
            });

            setAccountSearchQuery('');
            setAccountSearchPage(1);
            setAccountSearchResults([]);
            setHasMoreAccountResults(false);
            setTotalAccounts(0);
            fetchAccountsFromBackend('', 1);

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
            setHeaderShouldShowLastSearchResults(false);
            setHeaderLastSearchQuery('');

            setItems([]);
            setQuantityErrors({});
            setSelectedItemForInsert(null);
            setSelectedItemQuantity(0);
            setSelectedItemRate(0);
            setSelectedItemBatchNumber('');
            setSelectedItemExpiryDate('');

            setNextBillNumber(currentBillNum);

            if (accountSearchRef.current) {
                accountSearchRef.current.value = '';
            }

            if (itemSearchRef.current) {
                itemSearchRef.current.value = '';
            }

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

            const response = await api.get('/api/retailer/cash-sales');
            const { data } = response.data;

            const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
            const currentRomanDate = new Date().toISOString().split('T')[0];

            setFormData({
                cashAccount: '',
                cashAccountId: '',
                cashAccountAddress: '',
                cashAccountPan: '',
                cashAccountEmail: '',
                cashAccountPhone: '',
                transactionDateNepali: currentNepaliDate,
                transactionDateRoman: currentRomanDate,
                nepaliDate: currentNepaliDate,
                billDate: currentRomanDate,
                billNumber: currentBillNum,
                paymentMode: 'cash',
                isVatExempt: 'all',
                discountPercentage: 0,
                discountAmount: 0,
                roundOffAmount: 0,
                vatPercentage: 13,
                items: []
            });

            setAccountSearchQuery('');
            setAccountSearchPage(1);
            setAccountSearchResults([]);
            setHasMoreAccountResults(false);
            setTotalAccounts(0);
            fetchAccountsFromBackend('', 1);

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
            setHeaderShouldShowLastSearchResults(false);
            setHeaderLastSearchQuery('');

            setItems([]);
            setQuantityErrors({});
            setSelectedItemForInsert(null);
            setSelectedItemQuantity(0);
            setSelectedItemRate(0);
            setSelectedItemBatchNumber('');
            setSelectedItemExpiryDate('');

            setNextBillNumber(currentBillNum);

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

    const handleSubmit = async (e, print = false) => {
        e.preventDefault();

        const isValid = validateAllQuantities();
        if (!isValid) {
            setNotification({
                show: true,
                message: 'Please fix quantity errors before submitting',
                type: 'error'
            });

            const firstErrorIndex = Object.keys(quantityErrors)[0];
            if (firstErrorIndex !== undefined) {
                setTimeout(() => {
                    document.getElementById(`quantity-${firstErrorIndex}`)?.focus();
                }, 100);
            }
            return;
        }

        setIsSaving(true);

        try {
            const calculatedValues = calculateTotal();

            // Send null for empty email and phone fields, not empty strings
            const cashAccountEmail = formData.cashAccountEmail && formData.cashAccountEmail.trim() !== ''
                ? formData.cashAccountEmail.trim()
                : null;

            const cashAccountPhone = formData.cashAccountPhone && formData.cashAccountPhone.trim() !== ''
                ? formData.cashAccountPhone.trim()
                : null;

            // Prepare data according to backend DTO
            const billData = {
                // Cash account fields - send null for optional fields if empty
                cashAccount: formData.cashAccount,
                cashAccountId: formData.cashAccountId,
                cashAccountAddress: formData.cashAccountAddress || null,
                cashAccountPan: formData.cashAccountPan || null,
                cashAccountEmail: cashAccountEmail, // Send null if empty
                cashAccountPhone: cashAccountPhone, // Send null if empty

                // VAT fields
                // isVatExempt: formData.isVatExempt === 'true',
                // isVatAll: formData.isVatExempt,
                isVatExempt: formData.isVatExempt,
                vatPercentage: parseFloat(formData.vatPercentage) || 13,
                vatAmount: parseFloat(calculatedValues.vatAmount) || 0,

                // Discount fields
                discountPercentage: parseFloat(formData.discountPercentage) || 0,
                discountAmount: parseFloat(formData.discountAmount) || 0,

                // Payment mode
                paymentMode: 'cash',

                // Amount fields
                roundOffAmount: parseFloat(formData.roundOffAmount) || 0,
                subTotal: parseFloat(calculatedValues.subTotal) || 0,
                taxableAmount: parseFloat(calculatedValues.taxableAmount) || 0,
                nonVatSales: parseFloat(calculatedValues.nonTaxableAmount) || 0,
                totalAmount: parseFloat(calculatedValues.totalAmount) || 0,

                // Date fields
                nepaliDate: formData.nepaliDate,
                date: formData.billDate,
                transactionDateNepali: formData.transactionDateNepali,
                transactionDate: formData.transactionDateRoman,

                // Static fields
                purchaseSalesType: "Sales",
                originalCopies: 1,

                // Items array
                items: items.map(item => ({
                    itemId: item.itemId,
                    batchNumber: item.batchNumber || '',
                    expiryDate: item.expiryDate || null,
                    quantity: parseFloat(item.quantity) || 0,
                    unitId: item.unitId,
                    price: parseFloat(item.price) || 0,
                    puPrice: parseFloat(item.puPrice) || 0,
                    mrp: parseFloat(item.mrp),
                    netPuPrice: parseFloat(item.netPuPrice) || parseFloat(item.puPrice) || 0,
                    vatStatus: item.vatStatus || 'vatable',
                    uniqueUuid: item.uniqueUuid || ''
                })),

                print: print || false
            };

            console.log('Sending bill data:', JSON.stringify(billData, null, 2));

            const response = await api.post('/api/retailer/cash-sales', billData);

            setNotification({
                show: true,
                message: 'Cash sales bill saved successfully!',
                type: 'success'
            });

            if ((print || printAfterSave) && response.data.data?.bill?._id) {
                setItems([]);
                setIsSaving(false);
                await printImmediately(response.data.data.bill._id);
                await resetAfterSave();
            } else {
                await resetAfterSave();
                setIsSaving(false);
            }
        } catch (error) {
            console.error('Error saving cash sales bill:', error);

            if (error.response) {
                console.error('Error response data:', error.response.data);

                // Handle validation errors
                if (error.response.data.errors) {
                    const validationErrors = error.response.data.errors;
                    let errorMessage = '';
                    Object.keys(validationErrors).forEach(key => {
                        errorMessage += `${key}: ${validationErrors[key].join(', ')}\n`;
                    });
                    setNotification({
                        show: true,
                        message: errorMessage,
                        type: 'error'
                    });
                } else {
                    setNotification({
                        show: true,
                        message: error.response.data?.error || 'Failed to save cash sales bill. Please try again.',
                        type: 'error'
                    });
                }
            } else {
                setNotification({
                    show: true,
                    message: error.message || 'Failed to save cash sales bill. Please try again.',
                    type: 'error'
                });
            }
            setIsSaving(false);
        }
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

    const printImmediately = async (billId) => {
        try {
            const response = await api.get(`/api/retailer/sales/${billId}/print`);
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
                        <div class="print-invoice-title">${printData.firstBill ? 'TAX INVOICE' : 'INVOICE'}</div>
                    </div>

                    <div class="print-invoice-details">
                        <div>
                            <div><strong>M/S:</strong> ${printData.bill.cashAccount || ''}</div>
                            <div><strong>Address:</strong> ${printData.bill.cashAccountAddress || ''}</div>
                            <div><strong>PAN:</strong> ${printData.bill.cashAccountPan || ''}</div>
                            <div><strong>Email:</strong> ${printData.bill.cashAccountEmail || ''}, <strong>Tel:</strong> ${printData.bill.cashAccountPhone || ''}</div>
                        </div>
                        <div>
                            <div><strong>Invoice No:</strong> ${printData.bill.billNumber || ''}</div>
                            <div><strong>Trans. Date:</strong> ${new Date(printData.bill.transactionDate).toLocaleDateString()}</div>
                            <div><strong>Invoice Issue Date:</strong> ${new Date(printData.bill.date).toLocaleDateString()}</div>
                            <div><strong>Mode of Payment:</strong> ${printData.bill.paymentMode || ''}</div>
                        </div>
                    </div>

                    <table class="print-invoice-table">
                        <thead>
                            <tr>
                                <th>SN</th>
                                <th>#</th>
                                <th>HSN</th>
                                <th>Description of Goods</th>
                                <th>Unit</th>
                                <th>Batch</th>
                                <th>Expiry</th>
                                <th>Qty</th>
                                <th>Rate</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${printData.bill.items?.map((item, i) => `
                                <tr key="${i}">
                                    <td>${i + 1}</td>
                                    <td>${item.item?.uniqueNumber || item.uniqueNumber || ''}</td>
                                    <td>${item.item?.hscode || item.hscode || ''}</td>
                                    <td>
                                        ${item.item?.name || item.itemName || ''}
                                        ${item.item?.vatStatus === 'vatExempt' ? '*' : ''}
                                    </td>
                                    <td>${item.item?.unit?.name || item.unitName || ''}</td>
                                    <td>${item.batchNumber || ''}</td>
                                    <td>${item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'N/A'}</td>
                                    <td>${item.quantity || 0}</td>
                                    <td>${(item.price || 0).toFixed(2)}</td>
                                    <td>${((item.quantity || 0) * (item.price || 0)).toFixed(2)}</td>
                                </tr>
                            `).join('') || ''}
                        </tbody>
                        <tr>
                            <td colSpan="10" style="border-bottom: 1px dashed #000"></td>
                        </tr>
                    </table>

                    <table class="print-totals-table">
                        <tbody>
                            <tr>
                                <td><strong>Sub Total:</strong></td>
                                <td class="print-text-right">${(printData.bill.subTotal || 0).toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td><strong>Discount:</strong></td>
                                <td class="print-text-right">${(printData.bill.discountAmount || 0).toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td><strong>Non-Taxable:</strong></td>
                                <td class="print-text-right">${(printData.bill.nonVatSales || 0).toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td><strong>Taxable Amount:</strong></td>
                                <td class="print-text-right">${(printData.bill.taxableAmount || 0).toFixed(2)}</td>
                            </tr>
                            ${!printData.bill.isVatExempt ? `
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
            .print-text-right {
                text-align: right;
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
        `;

            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
            <html>
                <head>
                    <title>Cash_Sales_Invoice_${printData.bill.billNumber}</title>
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

    const handlePrintAfterSaveChange = (e) => {
        const isChecked = e.target.checked;
        setPrintAfterSave(isChecked);
        localStorage.setItem('printAfterSaveCash', isChecked);
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
            if (showAccountCreationModal && e.key === 'Escape') {
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
    }, [showAccountCreationModal, showAccountModal]);

    useEffect(() => {
        const handleTabKeyDown = (e) => {
            if (e.key === 'Tab' && e.target.id === 'selectedItemBatch' && !e.shiftKey) {
                e.preventDefault();
                document.getElementById('headerExpiryDate')?.focus();
            } else if (e.key === 'Tab' && e.target.id === 'headerExpiryDate' && !e.shiftKey) {
                e.preventDefault();
                document.getElementById('selectedItemQuantity')?.focus();
            } else if (e.key === 'Tab' && e.target.id === 'selectedItemQuantity' && e.shiftKey) {
                e.preventDefault();
                document.getElementById('headerExpiryDate')?.focus();
            } else if (e.key === 'Tab' && e.target.id === 'headerExpiryDate' && e.shiftKey) {
                e.preventDefault();
                document.getElementById('selectedItemBatch')?.focus();
            }
        };

        document.addEventListener('keydown', handleTabKeyDown);
        return () => {
            document.removeEventListener('keydown', handleTabKeyDown);
        };
    }, []);

    const formatter = new Intl.NumberFormat('en-NP', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    // Date validation functions
    const validateNepaliDate = (dateStr) => {
        try {
            if (!dateStr) return null;

            const nepaliDateFormat = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/;
            if (!nepaliDateFormat.test(dateStr)) {
                return null;
            }

            const normalizedDateStr = dateStr.replace(/-/g, '/');
            const [year, month, day] = normalizedDateStr.split('/').map(Number);

            if (month < 1 || month > 12 || day < 1 || day > 32) {
                return null;
            }

            const nepaliDate = new NepaliDate(year, month - 1, day);

            if (nepaliDate.getYear() !== year || nepaliDate.getMonth() + 1 !== month || nepaliDate.getDate() !== day) {
                return null;
            }

            return nepaliDate;
        } catch (error) {
            return null;
        }
    };

    const handleTransactionDateNepaliBlur = (e) => {
        try {
            const dateStr = e.target.value.trim();
            if (!dateStr) {
                setDateErrors(prev => ({ ...prev, transactionDateNepali: '' }));
                return;
            }

            const validNepaliDate = validateNepaliDate(dateStr);
            if (!validNepaliDate) {
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
                    transactionDateNepali: validNepaliDate.format('YYYY-MM-DD')
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
                message: 'Invalid date. Auto-corrected to current date.',
                type: 'warning',
                duration: 3000
            });
        }
    };

    const handleNepaliDateBlur = (e) => {
        try {
            const dateStr = e.target.value.trim();
            if (!dateStr) {
                setDateErrors(prev => ({ ...prev, nepaliDate: '' }));
                return;
            }

            const validNepaliDate = validateNepaliDate(dateStr);
            if (!validNepaliDate) {
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
                    nepaliDate: validNepaliDate.format('YYYY-MM-DD')
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
                message: 'Invalid date. Auto-corrected to current date.',
                type: 'warning',
                duration: 3000
            });
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
                            Cash Sales Entry
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
                                                onBlur={handleTransactionDateNepaliBlur}
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
                                                onBlur={handleNepaliDateBlur}
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
                                                ref={transactionDateRef}
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
                            {/* Cash Account Field */}
                            <div className="col-12 col-md-6">
                                <div className="position-relative">
                                    <input
                                        type="text"
                                        id="account"
                                        name="account"
                                        className="form-control form-control-sm"
                                        value={formData.cashAccount}
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
                                        Cash Account: <span className="text-danger">*</span>
                                    </label>
                                    <input type="hidden" id="cashAccountId" name="cashAccountId" value={formData.cashAccountId} />
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
                                            accountId={formData.cashAccountId}
                                            api={api}
                                            newTransactionAmount={parseFloat(totals.totalAmount) || 0}
                                            compact={true}
                                            dateFormat={company.dateFormat}
                                            refreshTrigger={showAccountCreationModal}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Cash Account Address Field */}
                            <div className="col-12 col-md-2">
                                <div className="position-relative">
                                    <input
                                        type="text"
                                        id="cashAccountAddress"
                                        className="form-control form-control-sm"
                                        value={formData.cashAccountAddress}
                                        onChange={(e) => setFormData({ ...formData, cashAccountAddress: e.target.value })}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleKeyDown(e, 'cashAccountAddress');
                                            }
                                        }}
                                        ref={addressRef}
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
                                        Address:
                                    </label>
                                </div>
                            </div>

                            {/* Phone Field */}
                            <div className="col-12 col-md-2">
                                <div className="position-relative">
                                    <input
                                        type="text"
                                        id="cashAccountPhone"
                                        className="form-control form-control-sm"
                                        value={formData.cashAccountPhone}
                                        onChange={(e) => setFormData({ ...formData, cashAccountPhone: e.target.value })}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleKeyDown(e, 'cashAccountPhone');
                                            }
                                        }}
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
                                        Phone:
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
                                                value={selectedItemBatchNumber}
                                                onChange={(e) => {
                                                    setSelectedItemBatchNumber(e.target.value);
                                                }}
                                                onKeyDown={(e) => {
                                                    if ((e.key === 'Tab' || e.key === 'Enter')) {
                                                        e.preventDefault();
                                                        document.getElementById('headerExpiryDate').focus();
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
                                                id="headerExpiryDate"
                                                value={selectedItemExpiryDate}
                                                onChange={(e) => {
                                                    setSelectedItemExpiryDate(e.target.value);
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
                                                    if (selectedItemForInsert) {
                                                        const totalStock = selectedItemForInsert.stockEntries?.reduce((sum, entry) => sum + (entry.quantity || 0), 0) || 0;
                                                        const existingItems = items.filter(item =>
                                                            item.itemId === selectedItemForInsert.id
                                                        );
                                                        let totalExistingQuantity = 0;
                                                        if (existingItems.length > 0) {
                                                            totalExistingQuantity = existingItems.reduce((sum, item) => {
                                                                return sum + (parseFloat(item.quantity) || 0);
                                                            }, 0);
                                                        }
                                                        const availableStock = totalStock - totalExistingQuantity;
                                                        const combinedQuantity = totalExistingQuantity + value;
                                                        if (value > 0 && combinedQuantity > totalStock) {
                                                            setNotification({
                                                                show: true,
                                                                message: `Stock exceeded ${combinedQuantity}/${totalStock}`,
                                                                type: 'warning'
                                                            });
                                                        }
                                                    }
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
                                                    backgroundColor: headerQuantityError ? '#fff5f5' : '#ffffff',
                                                    borderColor: headerQuantityError ? '#dc3545' : '#ced4da'
                                                }}
                                            />
                                            {headerQuantityError && (
                                                <div className="invalid-feedback d-block small" style={{
                                                    fontSize: '0.65rem',
                                                    color: '#dc3545',
                                                    fontWeight: 'bold'
                                                }}>
                                                    {headerQuantityError}
                                                </div>
                                            )}
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
                                                value={selectedItemRate}
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
                                                title={!selectedItemForInsert ? "Select item first" : "Insert item below"}
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
                                        const availableStock = getAvailableStockForDisplay(item);
                                        const remainingStock = getRemainingStock(item);
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
                                                        readOnly
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
                                                        readOnly
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
                                                        className={`form-control form-control-sm ${quantityErrors[index] ? 'is-invalid' : ''}`}
                                                        id={`quantity-${index}`}
                                                        value={item.quantity}
                                                        onChange={(e) => {
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
                                                                if (!quantityErrors[index]) {
                                                                    document.getElementById(`price-${index}`)?.focus();
                                                                } else {
                                                                    e.target.focus();
                                                                    e.target.select();
                                                                }
                                                            }
                                                        }}
                                                        style={{
                                                            height: '20px',
                                                            fontSize: '0.75rem',
                                                            padding: '0 4px',
                                                            backgroundColor: quantityErrors[index] ? '#fff5f5' : '#fff'
                                                        }}
                                                    />
                                                    {quantityErrors[index] && (
                                                        <div className="invalid-feedback d-block small" style={{
                                                            fontSize: '0.65rem',
                                                            color: '#dc3545',
                                                            fontWeight: 'bold'
                                                        }}>
                                                            {quantityErrors[index]}
                                                        </div>
                                                    )}
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
                                                        value={item.price}
                                                        onChange={(e) => updateItemField(index, 'price', parseFloat(e.target.value) || 0)}
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
                                                    onChange={(e) => setFormData({ ...formData, roundOffAmount: parseFloat(e.target.value) || 0 })}
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
                                document.getElementById('cashAccountAddress').focus();
                            }, 0);
                        }
                    }}
                >
                    <div className="modal-dialog modal-xl modal-dialog-centered">
                        <div className="modal-content" style={{ height: '400px' }}>
                            <div className="modal-header py-1">
                                <h5 className="modal-title" id="accountModalLabel" style={{ fontSize: '0.9rem' }}>
                                    Select Cash Account
                                </h5>
                                <small className="ms-auto text-muted" style={{ fontSize: '0.7rem' }}>
                                    {totalAccounts > 0 ? `${accounts.length} of ${totalAccounts} accounts shown` : 'Type to search or enter new account'}
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
                                    placeholder="Type to search or enter new account name..."
                                    autoFocus
                                    autoComplete='off'
                                    value={formData.cashAccount}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setFormData(prev => ({
                                            ...prev,
                                            cashAccount: value,
                                            cashAccountId: '',
                                            cashAccountAddress: '',
                                            cashAccountPan: '',
                                            cashAccountEmail: '',
                                            cashAccountPhone: ''
                                        }));

                                        setAccountSearchQuery(value);
                                        setAccountSearchPage(1);

                                        if (value.trim() !== '' && accountShouldShowLastSearchResults) {
                                            setAccountShouldShowLastSearchResults(false);
                                            setAccountLastSearchQuery('');
                                        }

                                        const timer = setTimeout(() => {
                                            fetchAccountsFromBackend(value, 1);
                                        }, 300);

                                        return () => clearTimeout(timer);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                                            e.preventDefault();
                                            const firstAccountItem = document.querySelector('.account-item');
                                            if (firstAccountItem) {
                                                firstAccountItem.focus();
                                            }
                                        } else if (e.key === 'Enter') {
                                            e.preventDefault();
                                            setShowAccountModal(false);
                                            setTimeout(() => {
                                                addressRef.current?.focus();
                                                addressRef.current?.select();
                                            }, 100);
                                        } else if (e.key === 'F6') {
                                            e.preventDefault();
                                            setShowAccountCreationModal(true);
                                            handleAccountModalClose();
                                        }
                                    }}
                                    onFocus={() => {
                                        if (accountLastSearchQuery && !accountSearchQuery && accountShouldShowLastSearchResults) {
                                            // Optional: restore last search
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
                                    {accountSearchQuery.trim() !== '' && accounts.length === 0 ? (
                                        <div className="text-center py-4">
                                            <i className="bi bi-person-plus text-primary mb-2" style={{ fontSize: '1.5rem' }}></i>
                                            <p className="text-muted mb-2" style={{ fontSize: '0.8rem' }}>
                                                No accounts found for "<strong>{accountSearchQuery}</strong>"
                                            </p>
                                            <p className="text-muted mb-3" style={{ fontSize: '0.7rem' }}>
                                                Press Enter to use as new account, or F6 to create full account
                                            </p>
                                        </div>
                                    ) : (
                                        <div style={{
                                            height: '100%',
                                            overflowY: 'auto'
                                        }}>
                                            <VirtualizedAccountList
                                                accounts={accounts}
                                                onAccountClick={(account) => {
                                                    setFormData({
                                                        ...formData,
                                                        cashAccount: account.name,
                                                        cashAccountId: account.id,
                                                        cashAccountAddress: account.address || '',
                                                        cashAccountPan: account.pan || '',
                                                        cashAccountEmail: account.email || '',
                                                        cashAccountPhone: account.phone || ''
                                                    });
                                                    setShowAccountModal(false);
                                                    setTimeout(() => {
                                                        addressRef.current?.focus();
                                                        addressRef.current?.select();
                                                    }, 100);
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
                                    )}
                                </div>
                            </div>
                            <div className="modal-footer py-1" style={{
                                borderTop: '1px solid #dee2e6',
                                backgroundColor: '#f8f9fa'
                            }}>
                                <div className="d-flex justify-content-between w-100 align-items-center">
                                    <div>
                                        <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                                            {accountSearchQuery.trim() !== '' && accounts.length === 0
                                                ? 'Type account name and press Enter to use'
                                                : 'Select account or continue typing'}
                                        </small>
                                    </div>
                                    <div className="d-flex gap-2">
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-primary py-0 px-2"
                                            onClick={() => {
                                                setShowAccountModal(false);
                                                setTimeout(() => {
                                                    addressRef.current?.focus();
                                                    addressRef.current?.select();
                                                }, 100);
                                            }}
                                            style={{
                                                height: '24px',
                                                fontSize: '0.75rem'
                                            }}
                                        >
                                            Use Entered Name
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-outline-secondary py-0 px-2"
                                            onClick={handleAccountModalClose}
                                            style={{
                                                height: '24px',
                                                fontSize: '0.75rem'
                                            }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
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

export default AddCashSales;