import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import NepaliDate from 'nepali-date-converter';
import axios from 'axios';
import Header from '../Header';
import NotificationToast from '../../NotificationToast';
import '../../../stylesheet/noDateIcon.css';
import ProductModal from '../dashboard/modals/ProductModal';
import AccountBalanceDisplay from '../payment/AccountBalanceDisplay';
import useDebounce from '../../../hooks/useDebounce';
import VirtualizedItemListForSales from '../../VirtualizedItemListForSales';
import VirtualizedAccountList from '../../VirtualizedAccountList';
import { Button } from 'react-bootstrap';
import { BiArrowBack } from 'react-icons/bi';

const EditSalesReturn = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // Search states
    const [searchQuery, setSearchQuery] = useState('');
    const [lastSearchQuery, setLastSearchQuery] = useState('');
    const [shouldShowLastSearchResults, setShouldShowLastSearchResults] = useState(false);
    const debouncedSearchQuery = useDebounce(searchQuery, 500);
    const [showItemDropdown, setShowItemDropdown] = useState(false);
    const [showAccountModal, setShowAccountModal] = useState(false);
    const [transactions, setTransactions] = useState([]);
    const [showTransactionModal, setShowTransactionModal] = useState(false);
    const [selectedItemIndex, setSelectedItemIndex] = useState(-1);
    const [roundOffSalesReturn, setRoundOffSalesReturn] = useState(false);
    const [manualRoundOffOverride, setManualRoundOffOverride] = useState(false);
    // Account search states
    const [isAccountSearching, setIsAccountSearching] = useState(false);
    const [accountSearchResults, setAccountSearchResults] = useState([]);
    const [accountSearchPage, setAccountSearchPage] = useState(1);
    const [hasMoreAccountResults, setHasMoreAccountResults] = useState(false);
    const [totalAccounts, setTotalAccounts] = useState(0);
    const [accountSearchQuery, setAccountSearchQuery] = useState('');
    const [accountLastSearchQuery, setAccountLastSearchQuery] = useState('');
    const [accountShouldShowLastSearchResults, setAccountShouldShowLastSearchResults] = useState(false);
    const [highlightedRowIndex, setHighlightedRowIndex] = useState(-1);
    const [currentViewingItemId, setCurrentViewingItemId] = useState(null);
    const [transactionType, setTransactionType] = useState('sales'); // Default to sales for sales return
    // Item search states for header
    const [isHeaderSearching, setIsHeaderSearching] = useState(false);
    const [headerSearchQuery, setHeaderSearchQuery] = useState('');
    const [showHeaderItemModal, setShowHeaderItemModal] = useState(false);
    const [selectedItemForInsert, setSelectedItemForInsert] = useState(null);

    // New state for batch selection modal
    const [showBatchSelectionModal, setShowBatchSelectionModal] = useState(false);
    const [selectedItemStockEntries, setSelectedItemStockEntries] = useState([]);
    const [selectedItemForBatch, setSelectedItemForBatch] = useState(null);
    const [selectedBatchEntry, setSelectedBatchEntry] = useState(null);

    // Header item states
    const [selectedItemQuantity, setSelectedItemQuantity] = useState(0);
    const [selectedItemRate, setSelectedItemRate] = useState(0);
    const [selectedItemBatchNumber, setSelectedItemBatchNumber] = useState('');
    const [selectedItemExpiryDate, setSelectedItemExpiryDate] = useState('');

    const [headerLastSearchQuery, setHeaderLastSearchQuery] = useState('');
    const [headerShouldShowLastSearchResults, setHeaderShouldShowLastSearchResults] = useState(false);
    const [headerSearchResults, setHeaderSearchResults] = useState([]);
    const [headerSearchPage, setHeaderSearchPage] = useState(1);
    const [hasMoreHeaderSearchResults, setHasMoreHeaderSearchResults] = useState(false);
    const [totalHeaderSearchItems, setTotalHeaderSearchItems] = useState(0);
    const [originalSalesBill, setOriginalSalesBill] = useState(null);

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
    const [isLoading, setIsLoading] = useState(true);
    const [isInitialDataLoaded, setIsInitialDataLoaded] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
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
        accountId: '',
        accountName: '',
        accountAddress: '',
        accountPan: '',
        transactionDateNepali: currentNepaliDate,
        transactionDateRoman: new Date().toISOString().split('T')[0],
        nepaliDate: currentNepaliDate,
        billDate: new Date().toISOString().split('T')[0],
        billNumber: '',
        originalSalesBillId: '',
        originalSalesBillNumber: '',
        paymentMode: 'credit',
        isVatExempt: 'all',
        discountPercentage: 0,
        discountAmount: 0,
        roundOffAmount: 0,
        vatPercentage: 13,
        items: []
    });

    const [items, setItems] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [company, setCompany] = useState({
        dateFormat: 'nepali',
        vatEnabled: true,
        fiscalYear: {}
    });

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

    // Fetch items from backend for header modal
    // const fetchItemsFromBackend = async (searchTerm = '', page = 1, isHeaderModal = true) => {
    //     try {
    //         setIsHeaderSearching(true);

    //         const response = await api.get('/api/retailer/items/search', {
    //             params: {
    //                 search: searchTerm,
    //                 page: page,
    //                 limit: 15,
    //                 vatStatus: formData.isVatExempt,
    //                 sortBy: searchTerm.trim() ? 'relevance' : 'name'
    //             }
    //         });

    //         if (response.data.success) {
    //             const itemsWithLatestPrice = response.data.items.map(item => {
    //                 let stockEntries = [];
    //                 if (item.stockEntries && item.stockEntries.length > 0) {
    //                     stockEntries = [...item.stockEntries].sort((a, b) =>
    //                         new Date(a.date) - new Date(b.date)
    //                     ).map(entry => ({
    //                         ...entry,
    //                         availableQuantity: entry.quantity || 0,
    //                         displayPrice: entry.price || 0,
    //                         purchasePrice: entry.purchasePrice || entry.price || 0
    //                     }));
    //                 }

    //                 let latestPrice = 0;
    //                 let latestBatchNumber = '';
    //                 let latestExpiryDate = '';
    //                 let totalStock = 0;

    //                 if (stockEntries.length > 0) {
    //                     totalStock = stockEntries.reduce((sum, entry) => sum + (entry.quantity || 0), 0);
    //                     const sortedEntries = stockEntries.sort((a, b) =>
    //                         new Date(b.date) - new Date(a.date)
    //                     );
    //                     latestPrice = sortedEntries[0].price || 0;
    //                     latestBatchNumber = sortedEntries[0].batchNumber || '';
    //                     latestExpiryDate = sortedEntries[0].expiryDate || '';
    //                 }

    //                 return {
    //                     ...item,
    //                     id: item.id,
    //                     _id: item.id,
    //                     stockEntries: stockEntries,
    //                     latestPrice,
    //                     latestBatchNumber,
    //                     latestExpiryDate,
    //                     stock: totalStock,
    //                     unitName: item.unit?.name || item.unitName || '',
    //                     unitId: item.unit?.id || item.unitId
    //                 };
    //             });

    //             if (page === 1) {
    //                 setHeaderSearchResults(itemsWithLatestPrice);
    //             } else {
    //                 setHeaderSearchResults(prev => [...prev, ...itemsWithLatestPrice]);
    //             }
    //             setHasMoreHeaderSearchResults(response.data.pagination.hasNextPage);
    //             setTotalHeaderSearchItems(response.data.pagination.totalItems);
    //             setHeaderSearchPage(page);
    //         }
    //     } catch (error) {
    //         console.error('Error fetching items:', error);
    //         setNotification({
    //             show: true,
    //             message: 'Error loading items',
    //             type: 'error'
    //         });
    //     } finally {
    //         setIsHeaderSearching(false);
    //     }
    // };

    const fetchItemsFromBackend = async (searchTerm = '', page = 1, isHeaderModal = true) => {
        try {
            setIsHeaderSearching(true);

            // Determine which date to send based on company format
            const isNepaliFormat = company.dateFormat === 'nepali' || company.dateFormat === 'Nepali';

            let params = {
                search: searchTerm,
                page: page,
                limit: 15,
                vatStatus: formData.isVatExempt,
                sortBy: searchTerm.trim() ? 'relevance' : 'name'
            };

            // Add date filter based on the return bill's transaction date (not current date)
            if (isNepaliFormat && formData.transactionDateNepali) {
                params.asOfNepaliDate = formData.transactionDateNepali;
                console.log('Sending Nepali date filter for edit sales return:', formData.transactionDateNepali);
            } else if (!isNepaliFormat && formData.transactionDateRoman) {
                params.asOfEnglishDate = formData.transactionDateRoman;
                console.log('Sending English date filter for edit sales return:', formData.transactionDateRoman);
            }

            const response = await api.get('/api/retailer/items/search', { params });

            if (response.data.success) {
                const itemsWithLatestPrice = response.data.items.map(item => {
                    let stockEntries = [];
                    if (item.stockEntries && item.stockEntries.length > 0) {
                        stockEntries = [...item.stockEntries].sort((a, b) =>
                            new Date(a.date) - new Date(b.date)
                        ).map(entry => ({
                            ...entry,
                            availableQuantity: entry.quantity || 0,
                            displayPrice: entry.price || 0,
                            purchasePrice: entry.purchasePrice || entry.price || 0
                        }));
                    }

                    let latestPrice = 0;
                    let latestBatchNumber = '';
                    let latestExpiryDate = '';
                    let totalStock = 0;

                    if (stockEntries.length > 0) {
                        totalStock = stockEntries.reduce((sum, entry) => sum + (entry.quantity || 0), 0);
                        const sortedEntries = stockEntries.sort((a, b) =>
                            new Date(b.date) - new Date(a.date)
                        );
                        latestPrice = sortedEntries[0].price || 0;
                        latestBatchNumber = sortedEntries[0].batchNumber || '';
                        latestExpiryDate = sortedEntries[0].expiryDate || '';
                    }

                    return {
                        ...item,
                        id: item.id,
                        _id: item.id,
                        stockEntries: stockEntries,
                        latestPrice,
                        latestBatchNumber,
                        latestExpiryDate,
                        stock: totalStock,
                        unitName: item.unit?.name || item.unitName || '',
                        unitId: item.unit?.id || item.unitId
                    };
                });

                if (page === 1) {
                    setHeaderSearchResults(itemsWithLatestPrice);
                } else {
                    setHeaderSearchResults(prev => [...prev, ...itemsWithLatestPrice]);
                }
                setHasMoreHeaderSearchResults(response.data.pagination.hasNextPage);
                setTotalHeaderSearchItems(response.data.pagination.totalItems);
                setHeaderSearchPage(page);
            }
        } catch (error) {
            console.error('Error fetching items:', error);
            setNotification({
                show: true,
                message: 'Error loading items',
                type: 'error'
            });
        } finally {
            setIsHeaderSearching(false);
        }
    };

    // Refetch items when transaction date changes during editing
    useEffect(() => {
        if (showHeaderItemModal && isInitialDataLoaded) {
            const searchTerm = headerShouldShowLastSearchResults ? headerLastSearchQuery : headerSearchQuery;
            fetchItemsFromBackend(searchTerm, 1, true);
        }
    }, [formData.transactionDateNepali, formData.transactionDateRoman, isInitialDataLoaded]);

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
        const handleF6Key = (e) => {
            if (e.key === 'F6' && showHeaderItemModal) {
                e.preventDefault();
                setShowItemsModal(true);
                setShowHeaderItemModal(false);
                setHeaderSearchQuery('');
                setHeaderLastSearchQuery('');
                setHeaderShouldShowLastSearchResults(false);
            }
        };

        window.addEventListener('keydown', handleF6Key);
        return () => {
            window.removeEventListener('keydown', handleF6Key);
        };
    }, [showHeaderItemModal]);

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

    // Initial data loading
    useEffect(() => {
        const fetchSalesReturnData = async () => {
            try {
                setIsLoading(true);

                const response = await api.get(`/api/retailer/sales-return/edit/${id}`);
                const { data } = response.data;

                setCompany({
                    ...data.company,
                    dateFormat: data.company.dateFormat || 'nepali',
                    vatEnabled: data.company.vatEnabled || true
                });

                const invoice = data.salesReturnInvoice;
                const dateFormat = data.company.dateFormat;

                // Helper function to format date properly
                const formatDate = (dateValue) => {
                    if (!dateValue) return '';

                    if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
                        return dateValue;
                    }

                    try {
                        const date = new Date(dateValue);
                        if (isNaN(date.getTime())) return '';

                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');

                        return `${year}-${month}-${day}`;
                    } catch (e) {
                        console.error('Date formatting error:', e);
                        return '';
                    }
                };

                const accountDoc = data.accounts.find(acc => acc.id === invoice.accountId);
                const accountNameWithNumber = accountDoc?.uniqueNumber
                    ? `${accountDoc.uniqueNumber} ${invoice.accountName}`
                    : invoice.accountName;

                const itemsData = invoice.items.map(item => ({
                    itemId: item.itemId,
                    uniqueNumber: item.uniqueNumber,
                    hscode: item.hscode,
                    name: item.itemName,
                    category: item.category?.name || 'No Category',
                    batchNumber: item.batchNumber,
                    expiryDate: item.expiryDate,
                    quantity: item.quantity,
                    unitId: item.unitId,
                    unitName: item.unitName,
                    price: item.price,
                    amount: (item.quantity * item.price).toFixed(2),
                    vatStatus: item.vatStatus,
                    uniqueUuid: item.uniqueUuid,
                    stockEntryId: item.stockEntryId || null
                }));

                setFormData({
                    accountId: invoice.accountId,
                    accountName: accountNameWithNumber,
                    accountAddress: invoice.accountAddress || '',
                    accountPan: invoice.accountPan || '',
                    transactionDateNepali: formatDate(invoice.transactionDateNepali || invoice.transactionDate),
                    transactionDateRoman: formatDate(invoice.transactionDate || invoice.transactionDateNepali),
                    nepaliDate: formatDate(invoice.nepaliDate || invoice.date),
                    billDate: formatDate(invoice.date || invoice.nepaliDate),
                    billNumber: invoice.billNumber,
                    originalSalesBillId: invoice.originalSalesBillId || '',
                    originalSalesBillNumber: invoice.originalSalesBillNumber || '',
                    paymentMode: invoice.paymentMode,
                    isVatExempt: invoice.isVatExempt ? 'true' :
                        (invoice.isVatAll === 'all' ? 'all' : 'false'),
                    discountPercentage: invoice.discountPercentage,
                    discountAmount: invoice.discountAmount,
                    roundOffAmount: invoice.roundOffAmount,
                    vatPercentage: invoice.vatPercentage,
                    items: itemsData
                });

                setItems(itemsData);
                setOriginalSalesBill(invoice.originalSalesBill);

                // Fetch accounts
                fetchAccountsFromBackend('', 1);

                setIsInitialDataLoaded(true);
            } catch (error) {
                console.error('Error fetching sales return data:', error);
                setNotification({
                    show: true,
                    message: 'Failed to load sales return data',
                    type: 'error'
                });
            } finally {
                setIsLoading(false);
            }
        };

        if (id) {
            fetchSalesReturnData();
        }
    }, [id]);

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
    }, [formData.items, formData.discountPercentage, formData.discountAmount, formData.roundOffAmount]);

    // Add this useEffect for transaction modal keyboard navigation
    useEffect(() => {
        if (!showTransactionModal) return;

        const handleKeyDown = (e) => {
            // Only handle arrow keys when transaction modal is open
            if (!showTransactionModal) return;

            // Check if Continue button is focused initially
            const isContinueButtonFocused = document.activeElement === continueButtonRef.current;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (transactions.length === 0) return;

                // If no row is highlighted and Continue button is focused, highlight first row
                if (highlightedRowIndex === -1 && isContinueButtonFocused) {
                    setHighlightedRowIndex(0);
                    scrollToRow(0);
                }
                // Move to next row if not at the end
                else if (highlightedRowIndex < transactions.length - 1) {
                    setHighlightedRowIndex(prev => prev + 1);
                    scrollToRow(highlightedRowIndex + 1);
                }
            }
            else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (transactions.length === 0) return;

                // If at first row, move highlight to -1 (no row highlighted) and focus Continue button
                if (highlightedRowIndex === 0) {
                    setHighlightedRowIndex(-1);
                    continueButtonRef.current?.focus();
                }
                // Move to previous row
                else if (highlightedRowIndex > 0) {
                    setHighlightedRowIndex(prev => prev - 1);
                    scrollToRow(highlightedRowIndex - 1);
                }
            }
            else if (e.key === 'Enter') {
                e.preventDefault();
                // If a row is highlighted, trigger its click action
                if (highlightedRowIndex >= 0 && transactions[highlightedRowIndex]) {
                    const transaction = transactions[highlightedRowIndex];
                    if (transactionType === 'purchase') {
                        const billId = transaction.purchaseBillId || transaction.billId;
                        if (billId) navigate(`/retailer/purchase/${billId}/print`);
                    } else {
                        const billId = transaction.salesBillId || transaction.billId;
                        if (billId) navigate(`/retailer/sales/${billId}/print`);
                    }
                }
                // If no row highlighted and Continue button is focused, close modal
                else if (document.activeElement === continueButtonRef.current) {
                    handleTransactionModalClose();
                }
            }
            else if (e.key === 'Escape') {
                e.preventDefault();
                handleTransactionModalClose();
            }
        };

        const scrollToRow = (rowIndex) => {
            setTimeout(() => {
                const row = document.getElementById(`transaction-row-${rowIndex}`);
                if (row) {
                    row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    row.focus();
                }
            }, 50);
        };

        // Add event listener
        document.addEventListener('keydown', handleKeyDown);

        // Cleanup
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [showTransactionModal, transactions, highlightedRowIndex, transactionType, navigate]);

    // Reset highlighted row when modal closes
    useEffect(() => {
        if (!showTransactionModal) {
            setHighlightedRowIndex(-1);
        }
    }, [showTransactionModal]);

    // Reset highlighted row when transactions change
    useEffect(() => {
        setHighlightedRowIndex(-1);
    }, [transactions]);

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
            accountId: account.id,
            accountName: `${account.uniqueNumber || ''} ${account.name}`.trim(),
            accountAddress: account.address || '',
            accountPan: account.pan || ''
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
            // setTimeout(() => {
            //     const batchInput = document.getElementById('headerBatch');
            //     if (batchInput) {
            //         batchInput.focus();
            //         batchInput.select();
            //     }
            // }, 100);

            if (transactionSettings.displayTransactionsForSalesReturn && formData.accountId) {
                await fetchLastTransactions(item.id);
            } else {
                // Focus on batch number input in header row
                setTimeout(() => {
                    const batchInput = document.getElementById('headerBatch');
                    if (batchInput) {
                        batchInput.focus();
                        batchInput.select();
                    }
                }, 100);
            }
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

        if (transactionSettings.displayTransactionsForSalesReturn && formData.accountId) {
            fetchLastTransactions(selectedItemForBatch.id);
        } else {
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

    const selectItemForInsert = async (item) => {
        selectItemForBatchSelection(item);
    };

    const getDefaultExpiryDate = () => {
        const today = new Date();
        today.setFullYear(today.getFullYear() + 2);
        return today.toISOString().split('T')[0];
    };

    // const insertSelectedItem = () => {
    //     if (!selectedItemForInsert) {
    //         setNotification({
    //             show: true,
    //             message: 'Please select an item first',
    //             type: 'error'
    //         });
    //         return;
    //     }

    //     if (!selectedItemBatchNumber.trim()) {
    //         setNotification({
    //             show: true,
    //             message: 'Batch number is required before inserting item',
    //             type: 'error'
    //         });
    //         setTimeout(() => {
    //             const batchInput = document.querySelector('input[placeholder="Batch"]');
    //             if (batchInput) {
    //                 batchInput.focus();
    //                 batchInput.select();
    //             }
    //         }, 100);
    //         return;
    //     }

    //     if (!selectedItemExpiryDate.trim()) {
    //         setNotification({
    //             show: true,
    //             message: 'Expiry date is required before inserting item',
    //             type: 'error'
    //         });
    //         setTimeout(() => {
    //             const expiryInput = document.getElementById('headerExpiryDate');
    //             if (expiryInput) {
    //                 expiryInput.focus();
    //                 expiryInput.select();
    //             }
    //         }, 100);
    //         return;
    //     }

    //     if (selectedItemQuantity <= 0) {
    //         setNotification({
    //             show: true,
    //             message: 'Quantity must be greater than 0',
    //             type: 'error'
    //         });
    //         setTimeout(() => {
    //             const quantityInput = document.getElementById('headerQuantity');
    //             if (quantityInput) {
    //                 quantityInput.focus();
    //                 quantityInput.select();
    //             }
    //         }, 100);
    //         return;
    //     }

    //     const sortedStockEntries = selectedItemForInsert.stockEntries?.sort((a, b) => new Date(a.date) - new Date(b.date)) || [];
    //     const latestStockEntry = sortedStockEntries[sortedStockEntries.length - 1] || sortedStockEntries[0] || {};

    //     const unitId = selectedItemForInsert.unitId || selectedItemForInsert.unit?.id;
    //     const unitName = selectedItemForInsert.unitName || selectedItemForInsert.unit?.name || '';

    //     const newItem = {
    //         itemId: selectedItemForInsert.id,
    //         uniqueNumber: selectedItemForInsert.uniqueNumber || 'N/A',
    //         hscode: selectedItemForInsert.hscode,
    //         name: selectedItemForInsert.name,
    //         category: selectedItemForInsert.category?.name || 'No Category',
    //         batchNumber: selectedItemBatchNumber || latestStockEntry.batchNumber || '',
    //         expiryDate: selectedItemExpiryDate || (latestStockEntry.expiryDate ? new Date(latestStockEntry.expiryDate).toISOString().split('T')[0] : ''),
    //         quantity: selectedItemQuantity || 0,
    //         unitId: unitId,
    //         unitName: unitName,
    //         price: selectedItemRate || latestStockEntry.price || 0,
    //         amount: (selectedItemQuantity || 0) * (selectedItemRate || latestStockEntry.price || 0),
    //         vatStatus: selectedItemForInsert.vatStatus,
    //         uniqueUuid: selectedItemForInsert.uniqueUuid || latestStockEntry.uniqueUuid || '',
    //         stockEntryId: selectedBatchEntry?.id || selectedBatchEntry?._id || null
    //     };

    //     const updatedItems = [...items, newItem];
    //     setItems(updatedItems);
    //     setFormData(prev => ({
    //         ...prev,
    //         items: updatedItems
    //     }));

    //     setSelectedItemForInsert(null);
    //     setSelectedItemQuantity(0);
    //     setSelectedItemRate(0);
    //     setSelectedItemBatchNumber('');
    //     setSelectedItemExpiryDate('');
    //     setSelectedBatchEntry(null);
    //     setHeaderSearchQuery('');

    //     setTimeout(() => {
    //         const searchInput = document.getElementById('headerItemSearch');
    //         if (searchInput) {
    //             searchInput.focus();
    //             searchInput.select();
    //         }
    //     }, 50);
    // };

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

        // Remove the quantity > 0 check - allow zero quantity
        // if (selectedItemQuantity <= 0) {
        //     setNotification({
        //         show: true,
        //         message: 'Quantity must be greater than 0',
        //         type: 'error'
        //     });
        //     return;
        // }

        const sortedStockEntries = selectedItemForInsert.stockEntries?.sort((a, b) => new Date(a.date) - new Date(b.date)) || [];
        const latestStockEntry = sortedStockEntries[sortedStockEntries.length - 1] || sortedStockEntries[0] || {};

        const unitId = selectedItemForInsert.unitId || selectedItemForInsert.unit?.id;
        const unitName = selectedItemForInsert.unitName || selectedItemForInsert.unit?.name || '';

        const newItem = {
            itemId: selectedItemForInsert.id,
            uniqueNumber: selectedItemForInsert.uniqueNumber || 'N/A',
            hscode: selectedItemForInsert.hscode,
            name: selectedItemForInsert.name,
            category: selectedItemForInsert.category?.name || 'No Category',
            batchNumber: selectedItemBatchNumber || latestStockEntry.batchNumber || '',
            expiryDate: selectedItemExpiryDate || (latestStockEntry.expiryDate ? new Date(latestStockEntry.expiryDate).toISOString().split('T')[0] : ''),
            quantity: selectedItemQuantity || 0,  // Will be 0 if not set
            unitId: unitId,
            unitName: unitName,
            price: selectedItemRate || latestStockEntry.price || 0,
            amount: (selectedItemQuantity || 0) * (selectedItemRate || latestStockEntry.price || 0),
            vatStatus: selectedItemForInsert.vatStatus,
            uniqueUuid: selectedItemForInsert.uniqueUuid || latestStockEntry.uniqueUuid || '',
            stockEntryId: selectedBatchEntry?.id || selectedBatchEntry?._id || null
        };

        const updatedItems = [...items, newItem];
        setItems(updatedItems);
        setFormData(prev => ({
            ...prev,
            items: updatedItems
        }));

        setSelectedItemForInsert(null);
        setSelectedItemQuantity(0);
        setSelectedItemRate(0);
        setSelectedItemBatchNumber('');
        setSelectedItemExpiryDate('');
        setSelectedBatchEntry(null);
        setHeaderSearchQuery('');

        setTimeout(() => {
            const searchInput = document.getElementById('headerItemSearch');
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
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

        setFormData(prev => ({
            ...prev,
            items: updatedItems
        }));

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
        if (items.length <= 1) {
            setNotification({
                show: true,
                message: 'You cannot remove the last item. A bill must have at least one item.',
                type: 'error'
            });
            return;
        }

        const updatedItems = items.filter((_, i) => i !== index);
        setItems(updatedItems);
        setFormData(prev => ({
            ...prev,
            items: updatedItems
        }));
    };

    useEffect(() => {
        if (itemsTableRef.current && items.length > 0) {
            setTimeout(() => {
                itemsTableRef.current.scrollTop = itemsTableRef.current.scrollHeight;
            }, 10);
        }
    }, [formData.items]);

    useEffect(() => {
        if (showTransactionModal && continueButtonRef.current) {
            const timer = setTimeout(() => {
                continueButtonRef.current.focus();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [showTransactionModal]);

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
    const totals = calculateTotal();

    useEffect(() => {
        if (roundOffSalesReturn && !manualRoundOffOverride) {
            setFormData(prev => ({
                ...prev,
                roundOffAmount: totals.autoRoundOffAmount
            }));
        }
    }, [roundOffSalesReturn, manualRoundOffOverride, totals.autoRoundOffAmount]);

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

    // const fetchLastTransactions = async (itemId, index) => {
    //     if (!formData.accountId) {
    //         setNotification({
    //             show: true,
    //             message: 'Please select an account first',
    //             type: 'error'
    //         });
    //         return;
    //     }

    //     setSelectedItemIndex(index);
    //     setIsLoadingTransactions(true);

    //     try {
    //         const cacheKey = `${itemId}-${formData.accountId}`;

    //         if (transactionCache.has(cacheKey)) {
    //             const cachedTransactions = transactionCache.get(cacheKey);
    //             setTransactions(cachedTransactions);
    //             setShowTransactionModal(true);
    //             return;
    //         }

    //         const controller = new AbortController();
    //         const timeoutId = setTimeout(() => controller.abort(), 3000);

    //         const response = await api.get(`/api/retailer/transactions/${itemId}/${formData.accountId}/Sales`, {
    //             signal: controller.signal
    //         });

    //         clearTimeout(timeoutId);

    //         if (response.data.success) {
    //             setTransactionCache(prev => new Map(prev.set(cacheKey, response.data.data.transactions)));
    //             setTransactions(response.data.data.transactions);
    //             setShowTransactionModal(true);
    //         }
    //     } catch (error) {
    //         if (error.name !== 'AbortError') {
    //             console.error('Error fetching transactions:', error);
    //         }
    //     } finally {
    //         setIsLoadingTransactions(false);
    //     }
    // };

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
        setCurrentViewingItemId(itemId);  // Add this line
        setIsLoadingTransactions(true);

        try {
            const cacheKey = `${itemId}-${formData.accountId}`;

            if (transactionCache.has(cacheKey)) {
                const cachedTransactions = transactionCache.get(cacheKey);
                setTransactions(cachedTransactions);
                setTransactionType('sales');  // Set transaction type for sales return
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
                setTransactionType('sales');  // Set transaction type
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
        console.log('=== fetchSalesTransactions CALLED ===');

        const itemId = currentViewingItemId;

        if (!itemId) {
            setNotification({
                show: true,
                message: 'No item selected. Please select an item first.',
                type: 'error'
            });
            return;
        }

        if (!formData.accountId) {
            setNotification({
                show: true,
                message: 'Please select an account first',
                type: 'error'
            });
            return;
        }

        try {
            setIsLoadingTransactions(true);
            const cacheKey = `${itemId}-${formData.accountId}-sales`;

            if (transactionCache.has(cacheKey)) {
                const cachedTransactions = transactionCache.get(cacheKey);
                setTransactions(cachedTransactions);
                setTransactionType('sales');
                setIsLoadingTransactions(false);
                return;
            }

            const response = await api.get(`/api/retailer/transactions/${itemId}/${formData.accountId}/Sales`);

            if (response.data.success) {
                const transactionsData = response.data.data?.transactions || [];
                setTransactionCache(prev => new Map(prev.set(cacheKey, transactionsData)));
                setTransactions(transactionsData);
                setTransactionType('sales');

                if (transactionsData.length === 0) {
                    setNotification({
                        show: true,
                        message: 'No sales transactions found for this item and account',
                        type: 'info',
                        duration: 3000
                    });
                }
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
        console.log('=== fetchPurchaseTransactions CALLED ===');

        const itemId = currentViewingItemId;

        if (!itemId) {
            setNotification({
                show: true,
                message: 'No item selected. Please select an item first.',
                type: 'error'
            });
            return;
        }

        if (!formData.accountId) {
            setNotification({
                show: true,
                message: 'Please select an account first',
                type: 'error'
            });
            return;
        }

        try {
            setIsLoadingTransactions(true);
            const cacheKey = `${itemId}-${formData.accountId}-purchase`;

            if (transactionCache.has(cacheKey)) {
                const cachedTransactions = transactionCache.get(cacheKey);
                setTransactions(cachedTransactions);
                setTransactionType('purchase');
                setIsLoadingTransactions(false);
                return;
            }

            const response = await api.get(`/api/retailer/transactions/${itemId}/${formData.accountId}/Purchase`);

            if (response.data.success) {
                const transactionsData = response.data.data?.transactions || [];
                setTransactionCache(prev => new Map(prev.set(cacheKey, transactionsData)));
                setTransactions(transactionsData);
                setTransactionType('purchase');

                if (transactionsData.length === 0) {
                    setNotification({
                        show: true,
                        message: 'No purchase transactions found for this item and account',
                        type: 'info',
                        duration: 3000
                    });
                }
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

    const handleTransactionModalClose = () => {
        setShowTransactionModal(false);
        setHighlightedRowIndex(-1);

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
            } else if (showBatchSelectionModal && e.key === 'Escape') {
                e.preventDefault();
                setShowBatchSelectionModal(false);
                setSelectedItemForBatch(null);
                setShowHeaderItemModal(true);
            }
        };

        document.addEventListener('keydown', handleGlobalKeyDown);
        return () => {
            document.removeEventListener('keydown', handleGlobalKeyDown);
        };
    }, [showTransactionModal, showAccountCreationModal, showAccountModal, showBatchSelectionModal]);

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

    const loadMoreAccounts = () => {
        if (!isAccountSearching) {
            fetchAccountsFromBackend(accountSearchQuery, accountSearchPage + 1);
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

    // const validateHeaderFields = () => {
    //     if (!selectedItemBatchNumber.trim()) {
    //         setNotification({
    //             show: true,
    //             message: 'Batch number is required before inserting item',
    //             type: 'error'
    //         });

    //         setTimeout(() => {
    //             const batchInput = document.querySelector('input[placeholder="Batch"]');
    //             if (batchInput) {
    //                 batchInput.focus();
    //                 batchInput.select();
    //             }
    //         }, 100);

    //         return false;
    //     }

    //     if (!selectedItemExpiryDate.trim()) {
    //         setNotification({
    //             show: true,
    //             message: 'Expiry date is required before inserting item',
    //             type: 'error'
    //         });

    //         setTimeout(() => {
    //             const expiryInput = document.getElementById('headerExpiryDate');
    //             if (expiryInput) {
    //                 expiryInput.focus();
    //                 expiryInput.select();
    //             }
    //         }, 100);

    //         return false;
    //     }

    //     if (selectedItemQuantity <= 0) {
    //         setNotification({
    //             show: true,
    //             message: 'Quantity must be greater than 0',
    //             type: 'error'
    //         });

    //         setTimeout(() => {
    //             const quantityInput = document.getElementById('headerQuantity');
    //             if (quantityInput) {
    //                 quantityInput.focus();
    //                 quantityInput.select();
    //             }
    //         }, 100);

    //         return false;
    //     }

    //     return true;
    // };

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

    const handlePrintAfterSaveChange = (e) => {
        const isChecked = e.target.checked;
        setPrintAfterSave(isChecked);
        localStorage.setItem('printAfterSaveSalesReturn', isChecked);
    };

    const handleSubmit = async (e, print = false) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            const calculatedValues = calculateTotal();

            // Prepare data according to your ASP.NET UpdateSalesReturnDTO
            const billData = {
                accountId: formData.accountId,
                originalSalesBillId: formData.originalSalesBillId || null,
                originalSalesBillNumber: formData.originalSalesBillNumber || '',
                paymentMode: formData.paymentMode,
                isVatExempt: formData.isVatExempt === 'true',
                isVatAll: formData.isVatExempt,
                discountPercentage: parseFloat(formData.discountPercentage) || 0,
                discountAmount: parseFloat(formData.discountAmount) || 0,
                vatPercentage: parseFloat(formData.vatPercentage) || 13,
                vatAmount: calculatedValues.vatAmount,
                roundOffAmount: calculatedValues.roundOffAmount,
                subTotal: calculatedValues.subTotal,
                taxableAmount: calculatedValues.taxableAmount,
                nonVatSalesReturn: calculatedValues.nonTaxableAmount,
                totalAmount: calculatedValues.totalAmount,
                nepaliDate: formData.nepaliDate,
                date: formData.billDate,
                transactionDateNepali: formData.transactionDateNepali,
                transactionDate: formData.transactionDateRoman,
                purchaseSalesReturnType: "Sales Return",
                originalCopies: 1,
                print: print || printAfterSave,
                items: items.map(item => ({
                    itemId: item.itemId,
                    batchNumber: item.batchNumber,
                    expiryDate: item.expiryDate,
                    quantity: item.quantity,
                    price: item.price,
                    unitId: item.unitId,
                    vatStatus: item.vatStatus,
                    uniqueUuid: item.uniqueUuid,
                    stockEntryId: item.stockEntryId || null
                }))
            };

            console.log('Submitting sales return data:', billData);

            const response = await api.put(`/api/retailer/sales-return/edit/${id}`, billData);

            console.log('Update response:', response.data);

            setNotification({
                show: true,
                message: 'Sales return updated successfully!',
                type: 'success'
            });

            if (print || printAfterSave) {
                if (response.data.data?.billId) {
                    await printImmediately(response.data.data.billId);
                    setTimeout(() => {
                        handleBack();
                    }, 1000);
                }
            } else {
                handleBack();
            }
        } catch (error) {
            console.error('Error updating sales return:', error);
            setNotification({
                show: true,
                message: error.response?.data?.error || 'Failed to update sales return. Please try again.',
                type: 'error'
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleBack = () => {
        navigate(-1);
    };

    const formatter = new Intl.NumberFormat('en-NP', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    if (isLoading) {
        return (
            <div className="container-fluid">
                <Header />
                <div className="text-center py-5">
                    <div className="spinner-border" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container-fluid">
            <Header />
            <div className="card mt-2 shadow-lg p-2 animate__animated animate__fadeInUp expanded-card ledger-card compact">
                <div className="card-header">
                    <div className="d-flex justify-content-between align-items-center">
                        <h2 className="card-title mb-0">
                            <i className="bi bi-file-text me-2"></i>
                            Update Credit Sales Return Entry
                        </h2>
                        <div>
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
                                                        handleKeyDown(e, 'transactionDateNepali');
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
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        handleKeyDown(e, 'nepaliDate');
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
                                                    setFormData({ ...formData, transactionDateRoman: value });
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        handleKeyDown(e, 'transactionDateRoman');
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
                                                    setFormData({ ...formData, billDate: value });
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        handleKeyDown(e, 'billDate');
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
                                        Return No:
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
                                        name="originalSalesBillNumber"
                                        id="originalSalesBillNumber"
                                        className="form-control form-control-sm"
                                        value={formData.originalSalesBillNumber}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            originalSalesBillNumber: e.target.value
                                        })}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                document.getElementById('isVatExempt')?.focus();
                                            }
                                        }}
                                        placeholder="Enter org. invoice"
                                        style={{
                                            height: '26px',
                                            fontSize: '0.875rem',
                                            paddingTop: '0.75rem',
                                            width: '100%',
                                            backgroundColor: '#ffffff'
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
                                                onChange={(e) => setSelectedItemQuantity(parseFloat(e.target.value) || 0)}
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
                                        }} id="headerUnitName">
                                            {selectedItemForInsert ? (selectedItemForInsert.unitName || 'N/A') : '-'}
                                        </td>
                                        <td width="8%" style={{ padding: '2px', backgroundColor: '#ffffff' }}>
                                            <input
                                                type="number"
                                                className="form-control form-control-sm"
                                                placeholder="Rate"
                                                id="headerRate"
                                                value={Math.round(selectedItemRate * 100) / 100}
                                                onChange={(e) => setSelectedItemRate(parseFloat(e.target.value) || 0)}
                                                onFocus={(e) => e.target.select()}
                                                onKeyDown={(e) => {
                                                    if ((e.key === 'Tab' || e.key === 'Enter')) {
                                                        e.preventDefault();

                                                        if (validateHeaderFields()) {
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
                                                    if (validateHeaderFields()) {
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
                                                        if (validateHeaderFields()) {
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
                                                {item.unitName}
                                                <input type="hidden" name={`items[${index}][unitId]`} value={item.unitId} />
                                            </td>
                                            <td style={{ padding: '3px' }}>
                                                <input
                                                    type="number"
                                                    name={`items[${index}][price]`}
                                                    className="form-control form-control-sm"
                                                    id={`price-${index}`}
                                                    value={Math.round(item.price * 100) / 100}
                                                    onChange={(e) => updateItemField(index, 'price', parseFloat(e.target.value) || 0)}
                                                    onFocus={(e) => {
                                                        e.target.select();
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            document.getElementById(`amount-${index}`)?.focus();
                                                        }
                                                    }}
                                                    style={{
                                                        height: '20px',
                                                        fontSize: '0.75rem',
                                                        padding: '0 4px'
                                                    }}
                                                />
                                            </td>
                                            <td className="item-amount" style={{ padding: '3px', fontSize: '0.75rem' }} id={`amount-${index}`}>{formatter.format(item.amount)}</td>
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
                                            <input type="hidden" name={`items[${index}][uniqueUuid]`} value={item.uniqueUuid} />
                                            <input type="hidden" name={`items[${index}][stockEntryId]`} value={item.stockEntryId || ''} />
                                        </tr>
                                    ))}

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
                                <Button variant="secondary" className="btn-sm d-flex align-items-center" onClick={handleBack}>
                                    <BiArrowBack /> Back
                                </Button>
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
                                            Updating...
                                        </>
                                    ) : (
                                        <>
                                            <i className="bi bi-save me-1" style={{ fontSize: '0.9rem' }}></i> Update
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
                                            onChange={(e) => {
                                                const query = e.target.value;
                                                setHeaderSearchQuery(query);
                                                setHeaderSearchPage(1);

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
                                <div style={{ height: 'calc(35vh - 60px)' }}>
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
                                                    <th className="py-0" style={{ padding: '0px', fontSize: '0.75rem' }}>Rate</th>
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
                                                                <td className="d-none">{entry.uniqueUuid}</td>
                                                            </tr>
                                                        );
                                                    })
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
            {/* {showTransactionModal && (
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
                                                            if (transaction.salesBillId && transaction.salesBillId.id) {
                                                                navigate(`/retailer/sales/${transaction.salesBillId.id}/print`);
                                                            }
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                if (transaction.salesBillId && transaction.salesBillId.id) {
                                                                    navigate(`/retailer/sales/${transaction.salesBillId.id}/print`);
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
            )} */}

            {/* {showTransactionModal && (
                <div
                    className="modal fade show"
                    id="transactionModal"
                    tabIndex="-1"
                    style={{
                        display: 'block',
                        backgroundColor: 'rgba(0,0,0,0.5)'
                    }}
                    role="dialog"
                    aria-labelledby="transactionModalLabel"
                    aria-modal="true"
                >
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content shadow-sm border-0 rounded-2">
                            <div className="modal-header py-1 px-2 bg-primary text-white rounded-top-2" style={{ borderBottom: 'none' }}>
                                <div className="d-flex align-items-center">
                                    <i className="bi bi-receipt text-white me-1" style={{ fontSize: '0.9rem' }}></i>
                                    <h6 className="modal-title text-white mb-0" style={{ fontSize: '0.85rem', fontWeight: '500' }}>
                                        {transactionType === 'purchase' ? 'Purchase History' : 'Sales History'}
                                    </h6>
                                </div>
                                <button
                                    type="button"
                                    className="btn-close btn-close-white"
                                    style={{ fontSize: '0.5rem', padding: '0.5rem' }}
                                    onClick={handleTransactionModalClose}
                                    aria-label="Close"
                                ></button>
                            </div>

                            <div className="modal-body p-0">
                                <div
                                    className="table-responsive"
                                    style={{ maxHeight: '220px', overflowY: 'auto' }}
                                    id="transactionTableContainer"
                                >
                                    <table className="table table-sm table-hover mb-0" style={{ fontSize: '0.7rem' }}>
                                        <thead className="sticky-top bg-light" style={{ top: 0, zIndex: 10 }}>
                                            <tr>
                                                <th className="py-1 px-1 text-center" style={{ width: '5%' }}>#</th>
                                                <th className="py-1 px-1" style={{ width: '12%' }}>Date</th>
                                                <th className="py-1 px-1" style={{ width: '12%' }}>Inv.No</th>
                                                <th className="py-1 px-1" style={{ width: '8%' }}>Type</th>
                                                <th className="py-1 px-1" style={{ width: '10%' }}>A/c</th>
                                                <th className="py-1 px-1" style={{ width: '8%' }}>Pay</th>
                                                <th className="py-1 px-1 text-end" style={{ width: '7%' }}>Qty</th>
                                                <th className="py-1 px-1 text-end" style={{ width: '7%' }}>Free</th>
                                                <th className="py-1 px-1" style={{ width: '8%' }}>Unit</th>
                                                <th className="py-1 px-1 text-end" style={{ width: '13%' }}>Rate</th>
                                                <th className="py-1 px-1 text-center" style={{ width: '10%' }}></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {transactions.length > 0 ? (
                                                transactions.map((transaction, index) => {
                                                    // Format date based on company date format
                                                    let formattedDate = '';
                                                    if (company.dateFormat === 'nepali' || company.dateFormat === 'Nepali') {
                                                        try {
                                                            const dateObj = new Date(transaction.date);
                                                            if (!isNaN(dateObj.getTime())) {
                                                                const nepaliDate = new NepaliDate(dateObj);
                                                                formattedDate = nepaliDate.format('YYYY-MM-DD');
                                                            } else {
                                                                formattedDate = transaction.date?.split('T')[0] || 'N/A';
                                                            }
                                                        } catch (error) {
                                                            console.error('Error formatting Nepali date:', error);
                                                            formattedDate = transaction.date?.split('T')[0] || 'N/A';
                                                        }
                                                    } else {
                                                        formattedDate = transaction.date?.split('T')[0] || 'N/A';
                                                    }

                                                    return (
                                                        <tr
                                                            key={index}
                                                            id={`transaction-row-${index}`}
                                                            className="transaction-row"
                                                            data-index={index}
                                                            style={{
                                                                cursor: 'pointer',
                                                                height: '28px',
                                                                backgroundColor: highlightedRowIndex === index ? '#0d6efd' : 'transparent',
                                                                color: highlightedRowIndex === index ? 'white' : 'inherit',
                                                                transition: 'background-color 0.2s ease'
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                if (highlightedRowIndex !== index) {
                                                                    e.currentTarget.style.backgroundColor = '#f8f9fa';
                                                                    e.currentTarget.style.color = 'inherit';
                                                                }
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                if (highlightedRowIndex !== index) {
                                                                    e.currentTarget.style.backgroundColor = '';
                                                                    e.currentTarget.style.color = '';
                                                                }
                                                            }}
                                                            onClick={() => {
                                                                if (transactionType === 'purchase') {
                                                                    const billId = transaction.purchaseBillId || transaction.billId;
                                                                    if (billId) navigate(`/retailer/purchase/${billId}/print`);
                                                                } else {
                                                                    const billId = transaction.salesBillId || transaction.billId;
                                                                    if (billId) navigate(`/retailer/sales/${billId}/print`);
                                                                }
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    if (transactionType === 'purchase') {
                                                                        const billId = transaction.purchaseBillId || transaction.billId;
                                                                        if (billId) navigate(`/retailer/purchase/${billId}/print`);
                                                                    } else {
                                                                        const billId = transaction.salesBillId || transaction.billId;
                                                                        if (billId) navigate(`/retailer/sales/${billId}/print`);
                                                                    }
                                                                }
                                                            }}
                                                            tabIndex={-1}
                                                        >
                                                            <td className="py-1 px-1 text-center text-secondary">{index + 1}</td>
                                                            <td className="py-1 px-1 text-nowrap">{formattedDate}</td>
                                                            <td className="py-1 px-1 fw-semibold">{transaction.billNumber || 'N/A'}</td>
                                                            <td className="py-1 px-1">
                                                                <span className={`badge ${transaction.type === 'Sale' ? 'bg-success' : 'bg-info'} px-1 py-0`} style={{ fontSize: '0.6rem' }}>
                                                                    {transaction.type?.substring(0, 4) || 'N/A'}
                                                                </span>
                                                            </td>
                                                            <td className="py-1 px-1 text-muted">{transaction.purchaseSalesType?.substring(0, 8) || 'N/A'}</td>
                                                            <td className="py-1 px-1">
                                                                <span className={`badge ${transaction.paymentMode === 'Cash' ? 'bg-warning' : 'bg-primary'} bg-opacity-25 text-dark px-1 py-0`} style={{ fontSize: '0.6rem' }}>
                                                                    {transaction.paymentMode?.substring(0, 6) || 'N/A'}
                                                                </span>
                                                            </td>
                                                            <td className="py-1 px-1 text-end fw-medium">{transaction.quantity || 0}</td>
                                                            <td className="py-1 px-1 text-end text-secondary">{transaction.bonus || 0}</td>
                                                            <td className="py-1 px-1">{transaction.unitName || transaction.unit || 'N/A'}</td>
                                                            <td className="py-1 px-1 text-end fw-semibold">
                                                                {transactionType === 'purchase'
                                                                    ? (transaction.puPrice ? Math.round(transaction.puPrice * 100) / 100 : 0)
                                                                    : (transaction.price ? Math.round(transaction.price * 100) / 100 : 0)}
                                                            </td>
                                                            <td className="py-1 px-1 text-center">
                                                                <button
                                                                    className="btn btn-sm btn-outline-primary py-0 px-1"
                                                                    style={{ fontSize: '0.6rem' }}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (transactionType === 'purchase') {
                                                                            const billId = transaction.purchaseBillId || transaction.billId;
                                                                            if (billId) navigate(`/retailer/purchase/${billId}/print`);
                                                                        } else {
                                                                            const billId = transaction.salesBillId || transaction.billId;
                                                                            if (billId) navigate(`/retailer/sales/${billId}/print`);
                                                                        }
                                                                    }}
                                                                >
                                                                    <i className="bi bi-printer" style={{ fontSize: '0.6rem' }}></i>
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            ) : (
                                                <tr>
                                                    <td colSpan="11" className="text-center py-3">
                                                        <div className="d-flex flex-column align-items-center">
                                                            <i className="bi bi-inbox text-muted" style={{ fontSize: '1.5rem' }}></i>
                                                            <p className="text-muted mb-0" style={{ fontSize: '0.7rem' }}>No transactions found</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {transactions.length > 7 && (
                                    <div className="text-center py-1 bg-light border-top" style={{ fontSize: '0.6rem', color: '#6c757d' }}>
                                        <i className="bi bi-arrow-down-short me-1"></i>Scroll for more ({transactions.length} total)<i className="bi bi-arrow-down-short ms-1"></i>
                                    </div>
                                )}
                            </div>

                            <div className="modal-footer py-1 px-2 bg-light border-top">
                                <div className="d-flex gap-1 w-100 justify-content-between align-items-center">
                                    <div>
                                        {transactionType === 'purchase' && (
                                            <button
                                                id="showSalesTransactions"
                                                className="btn btn-info btn-sm py-0 px-2 d-flex align-items-center gap-1"
                                                onClick={fetchSalesTransactions}
                                                style={{ fontSize: '0.65rem', height: '24px' }}
                                            >
                                                <i className="bi bi-receipt" style={{ fontSize: '0.7rem' }}></i>
                                                Show Sales Transaction
                                            </button>
                                        )}

                                        {transactionType === 'sales' && (
                                            <button
                                                id="showPurchaseTransactions"
                                                className="btn btn-info btn-sm py-0 px-2 d-flex align-items-center gap-1"
                                                onClick={fetchPurchaseTransactions}
                                                style={{ fontSize: '0.65rem', height: '24px' }}
                                            >
                                                <i className="bi bi-cart" style={{ fontSize: '0.7rem' }}></i>
                                                Show Purchase Transaction
                                            </button>
                                        )}
                                    </div>

                                    <button
                                        ref={continueButtonRef}
                                        type="button"
                                        className="btn btn-primary btn-sm py-0 px-3 d-flex align-items-center gap-1"
                                        onClick={handleTransactionModalClose}
                                        style={{ fontSize: '0.65rem', height: '24px' }}
                                    >
                                        <i className="bi bi-check-lg" style={{ fontSize: '0.7rem' }}></i>
                                        Continue
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )} */}

            {showTransactionModal && (
                <div className="modal fade show" id="transactionModal" tabIndex="-1" style={{
                    display: 'block',
                    backgroundColor: 'rgba(0,0,0,0.5)'
                }} role="dialog" aria-labelledby="transactionModalLabel" aria-modal="true">
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content shadow-sm border-0 rounded-2">
                            {/* Modal Header */}
                            <div className="modal-header py-1 px-2 bg-primary text-white rounded-top-2" style={{ borderBottom: 'none' }}>
                                <div className="d-flex align-items-center">
                                    <i className="bi bi-receipt text-white me-1" style={{ fontSize: '0.9rem' }}></i>
                                    <h6 className="modal-title text-white mb-0" style={{ fontSize: '0.85rem', fontWeight: '500' }}>
                                        {transactionType === 'purchase' ? 'Purchase History' : 'Sales History'}
                                    </h6>
                                </div>
                                <button type="button" className="btn-close btn-close-white" style={{ fontSize: '0.5rem', padding: '0.5rem' }} onClick={handleTransactionModalClose} aria-label="Close"></button>
                            </div>

                            {/* Modal Body */}
                            <div className="modal-body p-0">
                                <div className="table-responsive" style={{ maxHeight: '220px', overflowY: 'auto' }} id="transactionTableContainer">
                                    <table className="table table-sm table-hover mb-0" style={{ fontSize: '0.7rem' }}>
                                        <thead className="sticky-top bg-light" style={{ top: 0, zIndex: 10 }}>
                                            <tr>
                                                <th className="py-1 px-1 text-center" style={{ width: '5%' }}>#</th>
                                                <th className="py-1 px-1" style={{ width: '12%' }}>Date</th>
                                                <th className="py-1 px-1" style={{ width: '12%' }}>Inv.No</th>
                                                <th className="py-1 px-1" style={{ width: '8%' }}>Type</th>
                                                <th className="py-1 px-1" style={{ width: '10%' }}>A/c</th>
                                                <th className="py-1 px-1" style={{ width: '8%' }}>Pay</th>
                                                <th className="py-1 px-1 text-end" style={{ width: '7%' }}>Qty</th>
                                                <th className="py-1 px-1 text-end" style={{ width: '7%' }}>Free</th>
                                                <th className="py-1 px-1" style={{ width: '8%' }}>Unit</th>
                                                <th className="py-1 px-1 text-end" style={{ width: '13%' }}>Rate</th>
                                                <th className="py-1 px-1 text-center" style={{ width: '10%' }}></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {transactions.length > 0 ? (
                                                transactions.map((transaction, index) => {
                                                    // FIX: Use the correct date field based on company format
                                                    let formattedDate = '';
                                                    const isNepaliFormat = company.dateFormat === 'nepali' || company.dateFormat === 'Nepali';

                                                    if (isNepaliFormat) {
                                                        // For Nepali format, use the NepaliDate field
                                                        if (transaction.nepaliDate) {
                                                            try {
                                                                // If nepaliDate is a string, extract just the date part
                                                                if (typeof transaction.nepaliDate === 'string') {
                                                                    if (transaction.nepaliDate.includes('T')) {
                                                                        formattedDate = transaction.nepaliDate.split('T')[0];
                                                                    } else if (/^\d{4}-\d{2}-\d{2}$/.test(transaction.nepaliDate)) {
                                                                        formattedDate = transaction.nepaliDate;
                                                                    } else {
                                                                        const dateObj = new Date(transaction.nepaliDate);
                                                                        if (!isNaN(dateObj.getTime())) {
                                                                            const nepaliDate = new NepaliDate(dateObj);
                                                                            formattedDate = nepaliDate.format('YYYY-MM-DD');
                                                                        }
                                                                    }
                                                                } else if (transaction.nepaliDate instanceof Date) {
                                                                    const nepaliDate = new NepaliDate(transaction.nepaliDate);
                                                                    formattedDate = nepaliDate.format('YYYY-MM-DD');
                                                                }
                                                            } catch (error) {
                                                                console.error('Error formatting Nepali date:', error);
                                                                // Fallback to using Date field
                                                                const dateObj = new Date(transaction.date);
                                                                if (!isNaN(dateObj.getTime())) {
                                                                    const nepaliDate = new NepaliDate(dateObj);
                                                                    formattedDate = nepaliDate.format('YYYY-MM-DD');
                                                                }
                                                            }
                                                        } else if (transaction.date) {
                                                            // Fallback to date field
                                                            const dateObj = new Date(transaction.date);
                                                            if (!isNaN(dateObj.getTime())) {
                                                                const nepaliDate = new NepaliDate(dateObj);
                                                                formattedDate = nepaliDate.format('YYYY-MM-DD');
                                                            }
                                                        }
                                                    } else {
                                                        // For English format, use the Date field
                                                        if (transaction.date) {
                                                            try {
                                                                if (typeof transaction.date === 'string') {
                                                                    if (transaction.date.includes('T')) {
                                                                        formattedDate = transaction.date.split('T')[0];
                                                                    } else if (/^\d{4}-\d{2}-\d{2}$/.test(transaction.date)) {
                                                                        formattedDate = transaction.date;
                                                                    } else {
                                                                        const dateObj = new Date(transaction.date);
                                                                        if (!isNaN(dateObj.getTime())) {
                                                                            formattedDate = dateObj.toISOString().split('T')[0];
                                                                        }
                                                                    }
                                                                } else if (transaction.date instanceof Date) {
                                                                    formattedDate = transaction.date.toISOString().split('T')[0];
                                                                }
                                                            } catch (error) {
                                                                console.error('Error formatting English date:', error);
                                                                formattedDate = 'N/A';
                                                            }
                                                        }
                                                    }

                                                    return (
                                                        <tr key={index} id={`transaction-row-${index}`} className="transaction-row" data-index={index}
                                                            style={{
                                                                cursor: 'pointer',
                                                                height: '28px',
                                                                backgroundColor: highlightedRowIndex === index ? '#0d6efd' : 'transparent',
                                                                color: highlightedRowIndex === index ? 'white' : 'inherit',
                                                                transition: 'background-color 0.2s ease'
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                if (highlightedRowIndex !== index) {
                                                                    e.currentTarget.style.backgroundColor = '#f8f9fa';
                                                                    e.currentTarget.style.color = 'inherit';
                                                                }
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                if (highlightedRowIndex !== index) {
                                                                    e.currentTarget.style.backgroundColor = '';
                                                                    e.currentTarget.style.color = '';
                                                                }
                                                            }}
                                                            onClick={() => {
                                                                if (transactionType === 'purchase') {
                                                                    const billId = transaction.purchaseBillId || transaction.billId || transaction.id;
                                                                    if (billId) navigate(`/retailer/purchase/${billId}/print`);
                                                                } else {
                                                                    const billId = transaction.salesBillId || transaction.billId;
                                                                    if (billId) navigate(`/retailer/sales/${billId}/print`);
                                                                }
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    if (transactionType === 'purchase') {
                                                                        const billId = transaction.purchaseBillId || transaction.billId || transaction.id;
                                                                        if (billId) navigate(`/retailer/purchase/${billId}/print`);
                                                                    } else {
                                                                        const billId = transaction.salesBillId || transaction.billId;
                                                                        if (billId) navigate(`/retailer/sales/${billId}/print`);
                                                                    }
                                                                }
                                                            }}
                                                            tabIndex={-1}>
                                                            <td className="py-1 px-1 text-center text-secondary">{index + 1}</td>
                                                            <td className="py-1 px-1 text-nowrap">{formattedDate || 'N/A'}</td>
                                                            <td className="py-1 px-1 fw-semibold">{transaction.billNumber || transaction.purchaseBillNumber || 'N/A'}</td>
                                                            <td className="py-1 px-1">
                                                                <span className={`badge ${transaction.type === 'Sale' ? 'bg-success' : 'bg-info'} px-1 py-0`} style={{ fontSize: '0.6rem' }}>
                                                                    {transaction.type?.substring(0, 4) || 'N/A'}
                                                                </span>
                                                            </td>
                                                            <td className="py-1 px-1 text-muted">{transaction.purchaseSalesType?.substring(0, 8) || 'N/A'}</td>
                                                            <td className="py-1 px-1">
                                                                <span className={`badge ${transaction.paymentMode === 'Cash' ? 'bg-warning' : 'bg-primary'} bg-opacity-25 text-dark px-1 py-0`} style={{ fontSize: '0.6rem' }}>
                                                                    {transaction.paymentMode?.substring(0, 6) || 'N/A'}
                                                                </span>
                                                            </td>
                                                            <td className="py-1 px-1 text-end fw-medium">{transaction.quantity || 0}</td>
                                                            <td className="py-1 px-1 text-end text-secondary">{transaction.bonus || 0}</td>
                                                            <td className="py-1 px-1">{transaction.unitName || transaction.unit || 'N/A'}</td>
                                                            <td className="py-1 px-1 text-end fw-semibold">
                                                                {transactionType === 'purchase'
                                                                    ? (transaction.puPrice ? Math.round(transaction.puPrice * 100) / 100 : 0)
                                                                    : (transaction.price ? Math.round(transaction.price * 100) / 100 : 0)}
                                                            </td>
                                                            <td className="py-1 px-1 text-center">
                                                                <button className="btn btn-sm btn-outline-primary py-0 px-1" style={{ fontSize: '0.6rem' }}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (transactionType === 'purchase') {
                                                                            const billId = transaction.purchaseBillId || transaction.billId || transaction.id;
                                                                            if (billId) navigate(`/retailer/purchase/${billId}/print`);
                                                                        } else {
                                                                            const billId = transaction.salesBillId || transaction.billId;
                                                                            if (billId) navigate(`/retailer/sales/${billId}/print`);
                                                                        }
                                                                    }}>
                                                                    <i className="bi bi-printer" style={{ fontSize: '0.6rem' }}></i>
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            ) : (
                                                <tr>
                                                    <td colSpan="11" className="text-center py-3">
                                                        <div className="d-flex flex-column align-items-center">
                                                            <i className="bi bi-inbox text-muted" style={{ fontSize: '1.5rem' }}></i>
                                                            <p className="text-muted mb-0" style={{ fontSize: '0.7rem' }}>No transactions found</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="modal-footer py-1 px-2 bg-light border-top">
                                <div className="d-flex gap-1 w-100 justify-content-between align-items-center">
                                    <div>
                                        {transactionType === 'purchase' && (
                                            <button id="showSalesTransactions" className="btn btn-info btn-sm py-0 px-2 d-flex align-items-center gap-1"
                                                onClick={fetchSalesTransactions} style={{ fontSize: '0.65rem', height: '24px' }}>
                                                <i className="bi bi-receipt" style={{ fontSize: '0.7rem' }}></i>
                                                Show Sales Transaction
                                            </button>
                                        )}
                                        {transactionType === 'sales' && (
                                            <button id="showPurchaseTransactions" className="btn btn-info btn-sm py-0 px-2 d-flex align-items-center gap-1"
                                                onClick={fetchPurchaseTransactions} style={{ fontSize: '0.65rem', height: '24px' }}>
                                                <i className="bi bi-cart" style={{ fontSize: '0.7rem' }}></i>
                                                Show Purchase Transaction
                                            </button>
                                        )}
                                    </div>
                                    <button ref={continueButtonRef} type="button" className="btn btn-primary btn-sm py-0 px-3 d-flex align-items-center gap-1"
                                        onClick={handleTransactionModalClose} style={{ fontSize: '0.65rem', height: '24px' }}>
                                        <i className="bi bi-check-lg" style={{ fontSize: '0.7rem' }}></i>
                                        Continue
                                    </button>
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

export default EditSalesReturn;