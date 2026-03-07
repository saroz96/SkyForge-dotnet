// import React, { useState, useEffect, useRef, useCallback } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import NepaliDate from 'nepali-date-converter';
// import axios from 'axios';
// import Header from '../Header';
// import NotificationToast from '../../NotificationToast';
// import '../../../stylesheet/noDateIcon.css';
// import ProductModal from '../dashboard/modals/ProductModal';
// import AccountBalanceDisplay from '../payment/AccountBalanceDisplay';
// import useDebounce from '../../../hooks/useDebounce';
// import VirtualizedItemListForPurchase from '../../VirtualizedItemListForPurchase';
// import VirtualizedAccountList from '../../VirtualizedAccountList';
// import { Button } from 'react-bootstrap';
// import { BiArrowBack } from 'react-icons/bi';

// const EditPurcRtn = () => {
//     const { id } = useParams();
//     const navigate = useNavigate();

//     // Item search states
//     const [searchQuery, setSearchQuery] = useState('');
//     const [lastSearchQuery, setLastSearchQuery] = useState('');
//     const [shouldShowLastSearchResults, setShouldShowLastSearchResults] = useState(false);
//     const debouncedSearchQuery = useDebounce(searchQuery, 50);
//     const [showItemsModal, setShowItemsModal] = useState(false);

//     // Account search states
//     const [isAccountSearching, setIsAccountSearching] = useState(false);
//     const [accountSearchResults, setAccountSearchResults] = useState([]);
//     const [accountSearchPage, setAccountSearchPage] = useState(1);
//     const [hasMoreAccountResults, setHasMoreAccountResults] = useState(false);
//     const [totalAccounts, setTotalAccounts] = useState(0);
//     const [accountSearchQuery, setAccountSearchQuery] = useState('');
//     const [accountLastSearchQuery, setAccountLastSearchQuery] = useState('');
//     const [accountShouldShowLastSearchResults, setAccountShouldShowLastSearchResults] = useState(false);

//     // Item search states
//     const [isSearching, setIsSearching] = useState(false);
//     const [searchResults, setSearchResults] = useState([]);
//     const [searchPage, setSearchPage] = useState(1);
//     const [hasMoreSearchResults, setHasMoreSearchResults] = useState(false);
//     const [totalSearchItems, setTotalSearchItems] = useState(0);
//     // Add these near your existing state declarations
//     const [selectedItemIndex, setSelectedItemIndex] = useState(-1);
//     const [transactionType, setTransactionType] = useState('purchase'); // Add this
//     // Header modal states
//     const [isHeaderInsertMode, setIsHeaderInsertMode] = useState(false);
//     const [headerQuantityError, setHeaderQuantityError] = useState('');
//     const [showHeaderItemModal, setShowHeaderItemModal] = useState(false);
//     const [headerLastSearchQuery, setHeaderLastSearchQuery] = useState('');
//     const [headerShouldShowLastSearchResults, setHeaderShouldShowLastSearchResults] = useState(false);
//     const [headerSearchQuery, setHeaderSearchQuery] = useState('');
//     const [selectedItemForInsert, setSelectedItemForInsert] = useState(null);
//     const [selectedItemQuantity, setSelectedItemQuantity] = useState(0);
//     const [selectedItemRate, setSelectedItemRate] = useState(0);
//     const [selectedItemBatchNumber, setSelectedItemBatchNumber] = useState('');
//     const [selectedItemExpiryDate, setSelectedItemExpiryDate] = useState('');

//     // For header modal search
//     const [isHeaderSearching, setIsHeaderSearching] = useState(false);
//     const [headerSearchResults, setHeaderSearchResults] = useState([]);
//     const [headerSearchPage, setHeaderSearchPage] = useState(1);
//     const [hasMoreHeaderSearchResults, setHasMoreHeaderSearchResults] = useState(false);
//     const [totalHeaderSearchItems, setTotalHeaderSearchItems] = useState(0);

//     const debouncedHeaderSearchQuery = useDebounce(headerSearchQuery, 50);

//     const itemsTableRef = useRef(null);
//     const [transactionSettings, setTransactionSettings] = useState({
//         displayTransactions: false,
//         displayTransactionsForPurchase: false,
//         displayTransactionsForSalesReturn: false,
//         displayTransactionsForPurchaseReturn: false
//     });

//     const [printAfterSave, setPrintAfterSave] = useState(
//         localStorage.getItem('printAfterSavePurchaseReturn') === 'true' || false
//     );
//     const [showAccountCreationModal, setShowAccountCreationModal] = useState(false);
//     const [pollInterval, setPollInterval] = useState(null);

//     const [showProductModal, setShowProductModal] = useState(false);
//     const continueButtonRef = useRef(null);
//     const transactionDateRef = useRef(null);
//     const [transactionCache, setTransactionCache] = useState(new Map());
//     const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
//     const [isLoading, setIsLoading] = useState(true);
//     const [loadingItems, setLoadingItems] = useState(new Set());
//     const [isSaving, setIsSaving] = useState(false);
//     const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
//     const [notification, setNotification] = useState({
//         show: false,
//         message: '',
//         type: 'success'
//     });
//     const [dateErrors, setDateErrors] = useState({
//         transactionDateNepali: '',
//         nepaliDate: ''
//     });

//     const [formData, setFormData] = useState({
//         accountId: '',
//         accountName: '',
//         accountAddress: '',
//         accountPan: '',
//         transactionDateNepali: currentNepaliDate,
//         transactionDateRoman: new Date().toISOString().split('T')[0],
//         nepaliDate: currentNepaliDate,
//         billDate: new Date().toISOString().split('T')[0],
//         billNumber: '',
//         paymentMode: 'credit',
//         isVatExempt: 'all',
//         discountPercentage: 0,
//         discountAmount: 0,
//         roundOffAmount: 0,
//         vatPercentage: 13,
//         subTotal: 0,
//         taxableAmount: 0,
//         vatAmount: 0,
//         totalAmount: 0,
//         items: []
//     });

//     const [items, setItems] = useState([]);
//     const [accounts, setAccounts] = useState([]);
//     const [showAccountModal, setShowAccountModal] = useState(false);
//     const [showItemDropdown, setShowItemDropdown] = useState(false);
//     const [showTransactionModal, setShowTransactionModal] = useState(false);
//     const [transactions, setTransactions] = useState([]);
//     const itemDropdownRef = useRef(null);
//     const [company, setCompany] = useState({
//         dateFormat: 'english',
//         vatEnabled: true,
//         fiscalYear: {}
//     });

//     // Add these missing state variables
//     const [showBatchModal, setShowBatchModal] = useState(false);
//     const [selectedItemForBatch, setSelectedItemForBatch] = useState(null);
//     const [categories, setCategories] = useState([]);
//     const [units, setUnits] = useState([]);
//     const [companyGroups, setCompanyGroups] = useState([]);

//     const accountSearchRef = useRef(null);
//     const itemSearchRef = useRef(null);
//     const accountModalRef = useRef(null);
//     const transactionModalRef = useRef(null);

//     const api = axios.create({
//         baseURL: process.env.REACT_APP_API_BASE_URL,
//         withCredentials: true,
//     });

//     // UseEffects
//     useEffect(() => {
//         const fetchPurchaseReturnData = async () => {
//             try {
//                 const response = await api.get(`/api/retailer/purchase-return/edit/${id}`);
//                 const { data } = response.data;

//                 setCompany(data.company);
//                 setFormData({
//                     accountId: data.purchaseReturn.account?._id || '',
//                     accountName: data.purchaseReturn.account?.name || '',
//                     accountAddress: data.purchaseReturn.account?.address || '',
//                     accountPan: data.purchaseReturn.account?.pan || '',
//                     transactionDateNepali: new NepaliDate(data.purchaseReturn.transactionDate).format('YYYY-MM-DD') || currentNepaliDate,
//                     transactionDateRoman: data.purchaseReturn.transactionDate || new Date().toISOString().split('T')[0],
//                     nepaliDate: new NepaliDate(data.purchaseReturn.date).format('YYYY-MM-DD') || currentNepaliDate,
//                     billDate: data.purchaseReturn.date || new Date().toISOString().split('T')[0],
//                     billNumber: data.purchaseReturn.billNumber,
//                     paymentMode: data.purchaseReturn.paymentMode || 'credit',
//                     isVatExempt: data.purchaseReturn.isVatExempt ? 'true' : data.purchaseReturn.isVatAll ? 'all' : 'false',
//                     discountPercentage: data.purchaseReturn.discountPercentage || 0,
//                     discountAmount: Math.round(data.purchaseReturn.discountAmount * 100) / 100 || 0,
//                     roundOffAmount: Math.round(data.purchaseReturn.roundOffAmount * 100) / 100 || 0,
//                     vatPercentage: data.purchaseReturn.vatPercentage || 13,
//                     subTotal: data.purchaseReturn.subTotal || 0,
//                     taxableAmount: data.purchaseReturn.taxableAmount || 0,
//                     vatAmount: data.purchaseReturn.vatAmount || 0,
//                     totalAmount: data.purchaseReturn.totalAmount || 0
//                 });

//                 const processedItems = data.purchaseReturn.items.map(item => ({
//                     item: item.item || 'N/A',
//                     uniqueNumber: item.uniqueNumber || 'N/A',
//                     hscode: item.hscode || 'N/A',
//                     name: item.name,
//                     category: item.category?.name || 'No Category',
//                     batchNumber: item.batchNumber || '',
//                     expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString().split('T')[0] : '',
//                     quantity: item.quantity,
//                     unit: item.unit,
//                     price: item.price,
//                     puPrice: item.puPrice || 0,
//                     netPuPrice: item.netPuPrice || 0,
//                     amount: (item.quantity * item.puPrice).toFixed(2),
//                     vatStatus: item.vatStatus,
//                     uniqueUuId: item.uniqueUuId
//                 }));

//                 setItems(processedItems);
//                 setAccounts(data.accounts || []);
//                 setCategories(data.categories || []);
//                 setUnits(data.units || []);
//                 setCompanyGroups(data.companyGroups || []);
//                 setIsLoading(false);
//             } catch (error) {
//                 console.error('Error fetching purchase return data:', error);
//                 setNotification({
//                     show: true,
//                     message: 'Failed to load purchase return data',
//                     type: 'error'
//                 });
//                 navigate('/api/retailer/purchase-return');
//             }
//         };

//         fetchPurchaseReturnData();
//     }, [id]);

//     useEffect(() => {
//         calculateTotal();
//     }, [items, formData]);

//     useEffect(() => {
//         const fetchTransactionSettings = async () => {
//             try {
//                 const response = await api.get('/api/retailer/get-display-purchase-transactions');
//                 if (response.data.success) {
//                     setTransactionSettings(response.data.data);
//                 }
//             } catch (error) {
//                 console.error('Error fetching transaction settings:', error);
//             }
//         };
//         fetchTransactionSettings();
//     }, []);

//     useEffect(() => {
//         const handleF9KeyDown = (e) => {
//             if (e.key === 'F9') {
//                 e.preventDefault();
//                 setShowProductModal(prev => !prev);
//             }
//         };
//         window.addEventListener('keydown', handleF9KeyDown);
//         return () => {
//             window.removeEventListener('keydown', handleF9KeyDown);
//         };
//     }, []);

//     useEffect(() => {
//         if (showTransactionModal && continueButtonRef.current) {
//             const timer = setTimeout(() => {
//                 continueButtonRef.current.focus();
//             }, 100);
//             return () => clearTimeout(timer);
//         }
//     }, [showTransactionModal]);

//     useEffect(() => {
//         return () => {
//             setLastSearchQuery('');
//             setShouldShowLastSearchResults(false);
//         };
//     }, []);

//     useEffect(() => {
//         const handleF6KeyForAccounts = (e) => {
//             if (e.key === 'F6' && showAccountModal) {
//                 e.preventDefault();
//                 setShowAccountCreationModal(true);
//                 setShowAccountModal(false);
//             }
//         };

//         window.addEventListener('keydown', handleF6KeyForAccounts);
//         return () => {
//             window.removeEventListener('keydown', handleF6KeyForAccounts);
//         };
//     }, [showAccountModal]);

//     const handleBack = () => {
//         navigate(-1);
//     };

//     useEffect(() => {
//         const handleF6KeyForItems = (e) => {
//             if (e.key === 'F6' && document.activeElement === itemSearchRef.current) {
//                 e.preventDefault();
//                 setShowItemsModal(true);
//                 setSearchQuery('');
//                 if (itemSearchRef.current) {
//                     itemSearchRef.current.value = '';
//                 }
//                 setShowItemDropdown(false);
//             }
//         };

//         window.addEventListener('keydown', handleF6KeyForItems);
//         return () => {
//             window.removeEventListener('keydown', handleF6KeyForItems);
//         };
//     }, []);

//     useEffect(() => {
//         const handleF6KeyForHeaderModal = (e) => {
//             if (e.key === 'F6' && showHeaderItemModal) {
//                 e.preventDefault();
//                 setShowItemsModal(true);
//                 setShowHeaderItemModal(false);
//                 setHeaderSearchQuery('');
//                 setHeaderLastSearchQuery('');
//                 setHeaderShouldShowLastSearchResults(false);
//             }
//         };

//         window.addEventListener('keydown', handleF6KeyForHeaderModal);
//         return () => {
//             window.removeEventListener('keydown', handleF6KeyForHeaderModal);
//         };
//     }, [showHeaderItemModal]);

//     useEffect(() => {
//         const handleKeyDown = (e) => {
//             if (e.key === 'Escape' && showHeaderItemModal) {
//                 e.preventDefault();
//                 setShowHeaderItemModal(false);
//             }
//         };

//         document.addEventListener('keydown', handleKeyDown);
//         return () => {
//             document.removeEventListener('keydown', handleKeyDown);
//         };
//     }, [showHeaderItemModal]);

//     // Search effects
//     useEffect(() => {
//         if (showItemDropdown) {
//             setSearchPage(1);
//             fetchItemsFromBackend(debouncedSearchQuery, 1, false);
//         }
//     }, [debouncedSearchQuery, formData.isVatExempt, showItemDropdown]);

//     useEffect(() => {
//         if (showHeaderItemModal) {
//             setHeaderSearchPage(1);
//             let searchTerm = '';
//             if (headerSearchQuery.trim() !== '') {
//                 searchTerm = headerSearchQuery;
//             } else if (headerShouldShowLastSearchResults && headerLastSearchQuery.trim() !== '') {
//                 searchTerm = headerLastSearchQuery;
//             }
//             fetchItemsFromBackend(searchTerm, 1, true);
//         }
//     }, [debouncedHeaderSearchQuery, formData.isVatExempt, showHeaderItemModal, headerShouldShowLastSearchResults, headerLastSearchQuery]);

//     useEffect(() => {
//         if (showAccountModal) {
//             setAccountSearchQuery('');
//             setAccountSearchPage(1);
//             if (accountShouldShowLastSearchResults && accountLastSearchQuery.trim() !== '') {
//                 fetchAccountsFromBackend(accountLastSearchQuery, 1);
//             } else {
//                 fetchAccountsFromBackend('', 1);
//             }
//         }
//     }, [showAccountModal]);

//     // Functions
//     const fetchAccountsFromBackend = async (searchTerm = '', page = 1) => {
//         try {
//             setIsAccountSearching(true);
//             const response = await api.get('/api/retailer/accounts/search', {
//                 params: {
//                     search: searchTerm,
//                     page: page,
//                     limit: searchTerm.trim() ? 15 : 25,
//                 }
//             });

//             if (response.data.success) {
//                 if (page === 1) {
//                     setAccountSearchResults(response.data.accounts);
//                     setAccounts(response.data.accounts);
//                 } else {
//                     setAccountSearchResults(prev => [...prev, ...response.data.accounts]);
//                     setAccounts(prev => [...prev, ...response.data.accounts]);
//                 }
//                 setHasMoreAccountResults(response.data.pagination.hasNextPage);
//                 setTotalAccounts(response.data.pagination.totalAccounts);
//                 setAccountSearchPage(page);

//                 if (searchTerm.trim() !== '') {
//                     setAccountLastSearchQuery(searchTerm);
//                     setAccountShouldShowLastSearchResults(true);
//                 }
//             }
//         } catch (error) {
//             console.error('Error fetching accounts:', error);
//             setNotification({
//                 show: true,
//                 message: 'Error loading accounts',
//                 type: 'error'
//             });
//         } finally {
//             setIsAccountSearching(false);
//         }
//     };

//     const fetchItemsFromBackend = async (searchTerm = '', page = 1, isHeaderModal = false) => {
//         try {
//             if (isHeaderModal) {
//                 setIsHeaderSearching(true);
//             } else {
//                 setIsSearching(true);
//             }

//             const response = await api.get('/api/retailer/items/search', {
//                 params: {
//                     search: searchTerm,
//                     page: page,
//                     limit: searchTerm.trim() ? 15 : 25,
//                     vatStatus: formData.isVatExempt,
//                     sortBy: searchTerm.trim() ? 'relevance' : 'name'
//                 }
//             });

//             if (response.data.success) {
//                 const itemsWithPrices = response.data.items.map(item => {
//                     let latestPrice = 0;
//                     let latestBatchNumber = '';
//                     let latestExpiryDate = '';

//                     if (item.stockEntries && item.stockEntries.length > 0) {
//                         const sortedEntries = item.stockEntries.sort((a, b) =>
//                             new Date(b.date) - new Date(a.date)
//                         );
//                         latestPrice = sortedEntries[0].puPrice || 0;
//                         latestBatchNumber = sortedEntries[0].batchNumber || '';
//                         latestExpiryDate = sortedEntries[0].expiryDate || '';
//                     }

//                     return {
//                         ...item,
//                         latestPrice,
//                         latestBatchNumber,
//                         latestExpiryDate,
//                         stock: item.currentStock || 0
//                     };
//                 });

//                 if (isHeaderModal) {
//                     if (page === 1) {
//                         setHeaderSearchResults(itemsWithPrices);
//                     } else {
//                         setHeaderSearchResults(prev => [...prev, ...itemsWithPrices]);
//                     }
//                     setHasMoreHeaderSearchResults(response.data.pagination.hasNextPage);
//                     setTotalHeaderSearchItems(response.data.pagination.totalItems);
//                     setHeaderSearchPage(page);
//                 } else {
//                     if (page === 1) {
//                         setSearchResults(itemsWithPrices);
//                     } else {
//                         setSearchResults(prev => [...prev, ...itemsWithPrices]);
//                     }
//                     setHasMoreSearchResults(response.data.pagination.hasNextPage);
//                     setTotalSearchItems(response.data.pagination.totalItems);
//                     setSearchPage(page);
//                 }
//             }
//         } catch (error) {
//             console.error('Error fetching items:', error);
//             setNotification({
//                 show: true,
//                 message: 'Error loading items',
//                 type: 'error'
//             });
//         } finally {
//             if (isHeaderModal) {
//                 setIsHeaderSearching(false);
//             } else {
//                 setIsSearching(false);
//             }
//         }
//     };

//     const handleAccountCreationModalClose = () => {
//         setShowAccountCreationModal(false);
//         setShowAccountModal(true);
//         fetchAccountsFromBackend('', 1);
//     };

//     const handleAccountSearch = (e) => {
//         const searchText = e.target.value;
//         setAccountSearchQuery(searchText);
//         setAccountSearchPage(1);
//         if (searchText.trim() !== '' && accountShouldShowLastSearchResults) {
//             setAccountShouldShowLastSearchResults(false);
//             setAccountLastSearchQuery('');
//         }
//         const timer = setTimeout(() => {
//             fetchAccountsFromBackend(searchText, 1);
//         }, 300);
//         return () => clearTimeout(timer);
//     };

//     const handleAccountModalClose = () => {
//         setShowAccountModal(false);
//     };

//     const selectAccount = (account) => {
//         setFormData({
//             ...formData,
//             accountId: account._id,
//             accountName: `${account.uniqueNumber || ''} ${account.name}`.trim(),
//             accountAddress: account.address,
//             accountPan: account.pan
//         });
//         setShowAccountModal(false);
//     };

//     const handleItemSearch = (e) => {
//         const query = e.target.value;
//         setSearchQuery(query);
//         setShowItemDropdown(true);
//     };

//     const handleHeaderItemSearch = (e) => {
//         const query = e.target.value;
//         setHeaderSearchQuery(query);
//         if (query.trim() !== '' && headerShouldShowLastSearchResults) {
//             setHeaderShouldShowLastSearchResults(false);
//             setHeaderLastSearchQuery('');
//         }
//     };

//     const handleSearchFocus = () => {
//         setShowItemDropdown(true);
//         if (lastSearchQuery && !searchQuery) {
//             setShouldShowLastSearchResults(true);
//         }
//         document.querySelectorAll('.dropdown-item').forEach(item => {
//             item.classList.remove('active');
//         });
//         scrollToItemsTable();
//     };

//     const handleHeaderSearchFocus = () => {
//         if (headerLastSearchQuery && !headerSearchQuery) {
//             setHeaderShouldShowLastSearchResults(true);
//             if (headerLastSearchQuery.trim() !== '') {
//                 fetchItemsFromBackend(headerLastSearchQuery, 1, true);
//             }
//         }
//     };

//     const handleHeaderItemModalClose = () => {
//         setShowHeaderItemModal(false);
//         if (!headerShouldShowLastSearchResults) {
//             setHeaderSearchQuery('');
//             setHeaderLastSearchQuery('');
//         }
//         setHeaderSearchResults([]);
//         setHeaderSearchPage(1);
//     };

//     const showBatchModalForItem = (item) => {
//         setSelectedItemForBatch(item);
//         setShowBatchModal(true);
//         setTimeout(() => {
//             const firstBatchRow = document.querySelector('.batch-row');
//             if (firstBatchRow) {
//                 firstBatchRow.classList.add('bg-primary', 'text-white');
//                 firstBatchRow.focus();
//             }
//         }, 100);
//     };

//     const formatDateForInput = (date) => {
//         if (!date) return '';
//         if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
//             return date;
//         }
//         try {
//             const d = new Date(date);
//             if (isNaN(d.getTime())) return '';
//             const year = d.getFullYear();
//             const month = String(d.getMonth() + 1).padStart(2, '0');
//             const day = String(d.getDate()).padStart(2, '0');
//             return `${year}-${month}-${day}`;
//         } catch (error) {
//             console.error('Error formatting date:', error);
//             return '';
//         }
//     };

//     const addItemToBill = async (item, batchInfo) => {
//         if (itemSearchRef.current?.value) {
//             setLastSearchQuery(itemSearchRef.current.value);
//             setShouldShowLastSearchResults(true);
//         }

//         const newItem = {
//             item: item._id,
//             uniqueNumber: item.uniqueNumber || 'N/A',
//             hscode: item.hscode,
//             name: item.name,
//             category: item.category?.name || 'No Category',
//             batchNumber: batchInfo.batchNumber || '',
//             expiryDate: batchInfo.expiryDate ? new Date(batchInfo.expiryDate).toISOString().split('T')[0] : '',
//             quantity: 0,
//             unit: item.unit,
//             price: Math.round(batchInfo.puPrice * 100) / 100 || 0,
//             puPrice: Math.round(batchInfo.puPrice * 100) / 100 || 0,
//             netPuPrice: batchInfo.netPuPrice || 0,
//             amount: 0,
//             vatStatus: item.vatStatus,
//             uniqueUuId: batchInfo.uniqueUuId
//         };

//         const updatedItems = [...items, newItem];
//         setItems(updatedItems);
//         setShowItemDropdown(false);
//         itemSearchRef.current.value = '';
//         setSearchQuery('');
//         if (itemSearchRef.current) {
//             itemSearchRef.current.value = '';
//         }

//         // In addItemToBill function, replace this section:
//         if (transactionSettings.displayTransactionsForPurchaseReturn && formData.accountId) {
//             const cacheKey = `${item._id}-${formData.accountId}`;

//             if (transactionCache.has(cacheKey)) {
//                 const cachedTransactions = transactionCache.get(cacheKey);
//                 if (cachedTransactions.length > 0) {
//                     setTransactions(cachedTransactions);
//                     setTransactionType('purchase'); // Add this
//                     setShowTransactionModal(true);
//                     return;
//                 }
//             }

//             try {
//                 setIsLoadingTransactions(true);
//                 const controller = new AbortController();
//                 const timeoutId = setTimeout(() => controller.abort(), 3000);
//                 const response = await api.get(`/api/retailer/transactions/${item._id}/${formData.accountId}/Purchase`, {
//                     signal: controller.signal
//                 });
//                 clearTimeout(timeoutId);

//                 if (response.data.success) {
//                     setTransactionCache(prev => new Map(prev.set(cacheKey, response.data.data.transactions)));
//                     if (response.data.data.transactions.length > 0) {
//                         setTransactions(response.data.data.transactions);
//                         setTransactionType('purchase'); // Add this
//                         setShowTransactionModal(true);
//                         return;
//                     }
//                 }
//             } catch (error) {
//                 if (error.name !== 'AbortError') {
//                     console.error('Error fetching transactions:', error);
//                 }
//             } finally {
//                 setIsLoadingTransactions(false);
//             }
//         }

//         setTimeout(() => {
//             if (itemsTableRef.current) {
//                 itemsTableRef.current.scrollTop = itemsTableRef.current.scrollHeight;
//             }
//         }, 50);

//         setTimeout(() => {
//             const quantityInput = document.getElementById(`quantity-${updatedItems.length - 1}`);
//             if (quantityInput) {
//                 quantityInput.focus();
//                 quantityInput.select();
//             }
//         }, 100);
//     };

//     const selectItemForInsert = async (item) => {
//         if (headerSearchQuery.trim() !== '') {
//             setHeaderLastSearchQuery(headerSearchQuery);
//             setHeaderShouldShowLastSearchResults(true);
//         } else if (headerShouldShowLastSearchResults && headerLastSearchQuery) {
//             setHeaderShouldShowLastSearchResults(true);
//         }
//         setHeaderSearchQuery('');
//         setShowHeaderItemModal(false);
//         setSelectedItemForInsert(item);
//         setSelectedItemBatchNumber('');
//         setSelectedItemExpiryDate('');
//         setTimeout(() => {
//             showBatchModalForItem(item);
//         }, 100);
//     };

//     const handleBatchRowClick = async (batchInfo) => {
//         if (!selectedItemForBatch) return;
//         const isHeaderInsert = selectedItemForBatch === selectedItemForInsert;

//         if (isHeaderInsert) {
//             setSelectedItemForInsert({
//                 ...selectedItemForInsert,
//                 batchInfo: {
//                     batchNumber: batchInfo.batchNumber,
//                     expiryDate: batchInfo.expiryDate,
//                     puPrice: batchInfo.puPrice,
//                     uniqueUuId: batchInfo.uniqueUuId,
//                     netPuPrice: batchInfo.netPuPrice
//                 }
//             });

//             setSelectedItemBatchNumber(batchInfo.batchNumber || '');
//             setSelectedItemExpiryDate(batchInfo.expiryDate ? formatDateForInput(batchInfo.expiryDate) : '');
//             setSelectedItemRate(batchInfo.puPrice || 0);

//             // Store the selected item before closing modal
//             const tempSelectedItem = selectedItemForBatch;

//             // Close batch modal
//             setShowBatchModal(false);
//             setSelectedItemForBatch(null);

//             // Check for transactions AFTER modal closes
//             if (transactionSettings.displayTransactionsForPurchaseReturn && formData.accountId) {
//                 setIsHeaderInsertMode(true);

//                 // Use setTimeout to ensure modal is closed before opening transaction modal
//                 setTimeout(async () => {
//                     await fetchLastTransactions(tempSelectedItem._id);
//                 }, 100);
//             } else {
//                 setTimeout(() => {
//                     const quantityInput = document.getElementById('selectedItemQuantity');
//                     if (quantityInput) {
//                         quantityInput.focus();
//                         quantityInput.select();
//                     }
//                 }, 100);
//             }
//         } else {
//             // For non-header insert (regular item addition)
//             const tempSelectedItem = selectedItemForBatch;
//             const tempBatchInfo = batchInfo;

//             // Close batch modal first
//             setShowBatchModal(false);
//             setSelectedItemForBatch(null);

//             // Then add item to bill
//             setTimeout(() => {
//                 addItemToBill(tempSelectedItem, {
//                     batchNumber: tempBatchInfo.batchNumber,
//                     expiryDate: tempBatchInfo.expiryDate,
//                     puPrice: tempBatchInfo.puPrice,
//                     uniqueUuId: tempBatchInfo.uniqueUuId,
//                     netPuPrice: tempBatchInfo.netPuPrice
//                 });
//             }, 100);
//         }
//     };

//     const insertSelectedItem = () => {
//         if (showTransactionModal) {
//             setShowTransactionModal(false);
//         }

//         const batchNumber = selectedItemBatchNumber || selectedItemForInsert?.batchInfo?.batchNumber;
//         const expiryDate = selectedItemExpiryDate || selectedItemForInsert?.batchInfo?.expiryDate;

//         if (!selectedItemForInsert || !batchNumber) {
//             setNotification({
//                 show: true,
//                 message: 'Please enter batch information first',
//                 type: 'error'
//             });
//             return;
//         }

//         if (!selectedItemQuantity || selectedItemQuantity <= 0) {
//             setNotification({
//                 show: true,
//                 message: 'Please enter a valid quantity',
//                 type: 'error'
//             });
//             document.getElementById('selectedItemQuantity')?.focus();
//             return;
//         }

//         const newItem = {
//             item: selectedItemForInsert._id,
//             uniqueNumber: selectedItemForInsert.uniqueNumber || 'N/A',
//             hscode: selectedItemForInsert.hscode,
//             name: selectedItemForInsert.name,
//             category: selectedItemForInsert.category?.name || 'No Category',
//             batchNumber: batchNumber,
//             expiryDate: expiryDate ? new Date(expiryDate).toISOString().split('T')[0] : '',
//             quantity: selectedItemQuantity || 0,
//             unit: selectedItemForInsert.unit,
//             price: selectedItemRate || Math.round(selectedItemForInsert.batchInfo?.puPrice * 100) / 100,
//             puPrice: selectedItemForInsert.batchInfo?.puPrice || 0,
//             netPuPrice: selectedItemForInsert.batchInfo?.netPuPrice || 0,
//             amount: (selectedItemQuantity || 0) * (selectedItemRate || Math.round(selectedItemForInsert.batchInfo?.puPrice * 100) / 100),
//             vatStatus: selectedItemForInsert.vatStatus,
//             uniqueUuId: selectedItemForInsert.batchInfo?.uniqueUuId
//         };

//         const updatedItems = [...items, newItem];
//         setItems(updatedItems);

//         setSelectedItemForInsert(null);
//         setSelectedItemQuantity(0);
//         setSelectedItemRate(0);
//         setSelectedItemBatchNumber('');
//         setSelectedItemExpiryDate('');
//         setHeaderQuantityError('');
//         setHeaderSearchQuery('');

//         setTimeout(() => {
//             const searchInput = document.getElementById('headerItemSearch');
//             if (searchInput) {
//                 searchInput.focus();
//                 searchInput.select();
//             }
//         }, 50);

//         setTimeout(() => {
//             if (itemsTableRef.current) {
//                 itemsTableRef.current.scrollTop = itemsTableRef.current.scrollHeight;
//             }
//         }, 50);
//     };

//     const updateItemField = (index, field, value) => {
//         const updatedItems = [...items];
//         updatedItems[index][field] = value;

//         if (field === 'quantity' || field === 'puPrice') {
//             updatedItems[index].amount = (updatedItems[index].quantity * updatedItems[index].puPrice).toFixed(2);
//         }

//         setItems(updatedItems);

//         if (formData.discountPercentage || formData.discountAmount) {
//             const subTotal = calculateTotal(updatedItems).subTotal;

//             if (formData.discountPercentage) {
//                 const discountAmount = (subTotal * formData.discountPercentage) / 100;
//                 setFormData(prev => ({
//                     ...prev,
//                     discountAmount: discountAmount.toFixed(2)
//                 }));
//             } else if (formData.discountAmount) {
//                 const discountPercentage = subTotal > 0 ? (formData.discountAmount / subTotal) * 100 : 0;
//                 setFormData(prev => ({
//                     ...prev,
//                     discountPercentage: discountPercentage.toFixed(2)
//                 }));
//             }
//         }
//     };

//     const removeItem = (index) => {
//         if (items.length <= 1) {
//             setNotification({
//                 show: true,
//                 message: "You cannot remove the last item. A bill must have at least one item.",
//                 type: 'error'
//             });
//             return;
//         }

//         const updatedItems = items.filter((_, i) => i !== index);
//         setItems(updatedItems);
//     };

//     useEffect(() => {
//         const handleClickOutside = (event) => {
//             if (itemSearchRef.current && !itemSearchRef.current.contains(event.target)) {
//                 if (itemDropdownRef.current && !itemDropdownRef.current.contains(event.target)) {
//                     setShowItemDropdown(false);
//                 }
//             }
//         };

//         document.addEventListener('mousedown', handleClickOutside);
//         return () => {
//             document.removeEventListener('mousedown', handleClickOutside);
//         };
//     }, []);

//     const calculateTotal = (itemsToCalculate = items) => {
//         let subTotal = 0;
//         let taxableAmount = 0;
//         let nonTaxableAmount = 0;

//         itemsToCalculate.forEach(item => {
//             subTotal += parseFloat(item.amount) || 0;

//             if (item.vatStatus === 'vatable') {
//                 taxableAmount += parseFloat(item.amount) || 0;
//             } else {
//                 nonTaxableAmount += parseFloat(item.amount) || 0;
//             }
//         });

//         const discountPercentage = parseFloat(formData.discountPercentage) || 0;
//         const discountAmount = parseFloat(formData.discountAmount) || 0;

//         const discountForTaxable = (taxableAmount * discountPercentage) / 100;
//         const discountForNonTaxable = (nonTaxableAmount * discountPercentage) / 100;

//         const finalTaxableAmount = taxableAmount - discountForTaxable;
//         const finalNonTaxableAmount = nonTaxableAmount - discountForNonTaxable;

//         let vatAmount = 0;
//         if (formData.isVatExempt === 'false' || formData.isVatExempt === 'all') {
//             vatAmount = (finalTaxableAmount * formData.vatPercentage) / 100;
//         }

//         const roundOffAmount = parseFloat(formData.roundOffAmount) || 0;
//         const totalAmount = finalTaxableAmount + finalNonTaxableAmount + vatAmount + roundOffAmount;

//         return {
//             subTotal: Math.round(subTotal * 100) / 100,
//             taxableAmount: Math.round(finalTaxableAmount * 100) / 100,
//             nonTaxableAmount: Math.round(finalNonTaxableAmount * 100) / 100,
//             vatAmount: Math.round(vatAmount * 100) / 100,
//             totalAmount: Math.round(totalAmount * 100) / 100,
//             discountAmount: Math.round(discountAmount * 100) / 100,
//             roundOffAmount: Math.round(roundOffAmount * 100) / 100
//         };
//     };

//     const handleDiscountPercentageChange = (e) => {
//         const value = parseFloat(e.target.value) || 0;
//         const subTotal = calculateTotal().subTotal;
//         const discountAmount = (subTotal * value) / 100;

//         setFormData({
//             ...formData,
//             discountPercentage: value,
//             discountAmount: discountAmount.toFixed(2)
//         });
//     };

//     const handleDiscountAmountChange = (e) => {
//         const value = parseFloat(e.target.value) || 0;
//         const subTotal = calculateTotal().subTotal;
//         const discountPercentage = subTotal > 0 ? (value / subTotal) * 100 : 0;

//         setFormData({
//             ...formData,
//             discountAmount: value,
//             discountPercentage: discountPercentage.toFixed(2)
//         });
//     };

//     const fetchLastTransactions = async (itemId, index = null) => {
//         if (!formData.accountId) {
//             setNotification({
//                 show: true,
//                 message: 'Please select an account first',
//                 type: 'error'
//             });
//             return;
//         }

//         if (index !== null) {
//             setSelectedItemIndex(index);
//         }
//         setLoadingItems(prev => new Set(prev).add(itemId));
//         setIsLoadingTransactions(true);

//         try {
//             const cacheKey = `${itemId}-${formData.accountId}`;

//             if (transactionCache.has(cacheKey)) {
//                 const cachedTransactions = transactionCache.get(cacheKey);
//                 setTransactions(cachedTransactions);
//                 setTransactionType('purchase'); // Set transaction type
//                 setShowTransactionModal(true);
//                 return;
//             }

//             const controller = new AbortController();
//             const timeoutId = setTimeout(() => controller.abort(), 3000);

//             // FIXED: Changed from '/Purchase' to the correct endpoint format
//             const response = await api.get(`/api/retailer/transactions/${itemId}/${formData.accountId}/Purchase`, {
//                 signal: controller.signal
//             });

//             clearTimeout(timeoutId);

//             if (response.data.success) {
//                 setTransactionCache(prev => new Map(prev.set(cacheKey, response.data.data.transactions)));
//                 setTransactions(response.data.data.transactions || []);
//                 setTransactionType('purchase'); // Set transaction type
//                 setShowTransactionModal(true);
//             }
//         } catch (error) {
//             if (error.name !== 'AbortError') {
//                 console.error('Error fetching transactions:', error);
//                 setNotification({
//                     show: true,
//                     message: 'Error fetching transactions',
//                     type: 'error'
//                 });
//             }
//         } finally {
//             setLoadingItems(prev => {
//                 const newSet = new Set(prev);
//                 newSet.delete(itemId);
//                 return newSet;
//             });
//             setIsLoadingTransactions(false);
//         }
//     };

//     const fetchSalesTransactions = async () => {
//         if (!items[selectedItemIndex] || !formData.accountId) return;

//         try {
//             setIsLoadingTransactions(true);
//             const cacheKey = `${items[selectedItemIndex].item}-${formData.accountId}-sales`;

//             if (transactionCache.has(cacheKey)) {
//                 const cachedTransactions = transactionCache.get(cacheKey);
//                 setTransactions(cachedTransactions);
//                 setTransactionType('sales');
//                 return;
//             }

//             const response = await api.get(`/api/retailer/transactions/sales-by-item-account?itemId=${items[selectedItemIndex].item}&accountId=${formData.accountId}`);

//             if (response.data.success) {
//                 setTransactionCache(prev => new Map(prev.set(cacheKey, response.data.data.transactions)));
//                 setTransactions(response.data.data.transactions);
//                 setTransactionType('sales');
//             } else {
//                 setNotification({
//                     show: true,
//                     message: response.data.message || 'Failed to fetch sales transactions',
//                     type: 'error'
//                 });
//             }
//         } catch (error) {
//             console.error('Error fetching sales transactions:', error);
//             setNotification({
//                 show: true,
//                 message: 'Error fetching sales transactions',
//                 type: 'error'
//             });
//         } finally {
//             setIsLoadingTransactions(false);
//         }
//     };

//     const fetchPurchaseTransactions = async () => {
//         if (!items[selectedItemIndex] || !formData.accountId) return;

//         try {
//             setIsLoadingTransactions(true);
//             const cacheKey = `${items[selectedItemIndex].item}-${formData.accountId}-purchase`;

//             if (transactionCache.has(cacheKey)) {
//                 const cachedTransactions = transactionCache.get(cacheKey);
//                 setTransactions(cachedTransactions);
//                 setTransactionType('purchase');
//                 return;
//             }

//             const response = await api.get(`/api/retailer/transactions/purchase-by-item-account?itemId=${items[selectedItemIndex].item}&accountId=${formData.accountId}`);

//             if (response.data.success) {
//                 setTransactionCache(prev => new Map(prev.set(cacheKey, response.data.data.transactions)));
//                 setTransactions(response.data.data.transactions);
//                 setTransactionType('purchase');
//             } else {
//                 setNotification({
//                     show: true,
//                     message: response.data.message || 'Failed to fetch purchase transactions',
//                     type: 'error'
//                 });
//             }
//         } catch (error) {
//             console.error('Error fetching purchase transactions:', error);
//             setNotification({
//                 show: true,
//                 message: 'Error fetching purchase transactions',
//                 type: 'error'
//             });
//         } finally {
//             setIsLoadingTransactions(false);
//         }
//     };

//     const formatter = new Intl.NumberFormat('en-NP', {
//         minimumFractionDigits: 2,
//         maximumFractionDigits: 2,
//     });

//     const handleSubmit = async (e, print = false) => {
//         e.preventDefault();
//         setIsSaving(true);

//         try {
//             const billData = {
//                 ...formData,
//                 items: items.map(item => ({
//                     item: item.item,
//                     batchNumber: item.batchNumber,
//                     expiryDate: item.expiryDate,
//                     quantity: item.quantity,
//                     unit: item.unit?._id,
//                     price: item.price,
//                     puPrice: item.puPrice,
//                     netPuPrice: item.netPuPrice,
//                     vatStatus: item.vatStatus,
//                     uniqueUuId: item.uniqueUuId
//                 })),
//                 print: print || printAfterSave
//             };

//             const response = await api.put(`/api/retailer/purchase-return/edit/${id}`, billData);

//             setNotification({
//                 show: true,
//                 message: 'Purchase return updated successfully!',
//                 type: 'success'
//             });

//             if (print || printAfterSave) {
//                 if (response.data.data?.billId) {
//                     await printImmediately(response.data.data.billId);
//                     setTimeout(() => {
//                         handleBack();
//                     }, 1000);
//                 }
//             } else {
//                 setIsSaving(false);
//                 handleBack();
//             }
//         } catch (error) {
//             console.error('Error updating purchase return:', error);
//             setNotification({
//                 show: true,
//                 message: 'Failed to update purchase return. Please try again.',
//                 type: 'error'
//             });
//             setIsSaving(false);
//         }
//     };

//     const handleKeyDown = (e, currentFieldId) => {
//         if (e.key === 'Enter') {
//             e.preventDefault();
//             const form = e.target.form;
//             const inputs = Array.from(form.querySelectorAll('input, select, textarea')).filter(
//                 el => !el.hidden && !el.disabled && el.offsetParent !== null
//             );
//             const currentIndex = inputs.findIndex(input => input.id === currentFieldId);

//             if (currentIndex > -1 && currentIndex < inputs.length - 1) {
//                 inputs[currentIndex + 1].focus();
//             }
//         }
//     };

//     useEffect(() => {
//         const handleKeyDown = (e) => {
//             if (e.key === 'Tab' && e.target.id === 'selectedItemBatch' && !e.shiftKey) {
//                 e.preventDefault();
//                 document.getElementById('headerExpiryDate')?.focus();
//             } else if (e.key === 'Tab' && e.target.id === 'headerExpiryDate' && !e.shiftKey) {
//                 e.preventDefault();
//                 document.getElementById('selectedItemQuantity')?.focus();
//             } else if (e.key === 'Tab' && e.target.id === 'selectedItemQuantity' && e.shiftKey) {
//                 e.preventDefault();
//                 document.getElementById('headerExpiryDate')?.focus();
//             } else if (e.key === 'Tab' && e.target.id === 'headerExpiryDate' && e.shiftKey) {
//                 e.preventDefault();
//                 document.getElementById('selectedItemBatch')?.focus();
//             }
//         };

//         document.addEventListener('keydown', handleKeyDown);
//         return () => {
//             document.removeEventListener('keydown', handleKeyDown);
//         };
//     }, []);

//     const handleTransactionModalClose = () => {
//         setShowTransactionModal(false);
//         setIsHeaderInsertMode(false);
//         setTimeout(() => {
//             if (selectedItemForInsert && selectedItemForInsert.batchInfo) {
//                 const quantityInput = document.getElementById('selectedItemQuantity');
//                 if (quantityInput) {
//                     quantityInput.focus();
//                     quantityInput.select();
//                 }
//             } else {
//                 if (items.length > 0) {
//                     const quantityInput = document.getElementById(`quantity-${items.length - 1}`);
//                     if (quantityInput) {
//                         quantityInput.focus();
//                         quantityInput.select();
//                     }
//                 }
//             }
//         }, 200);
//     };

//     useEffect(() => {
//         const handleGlobalKeyDown = (e) => {
//             if (showTransactionModal) {
//                 if (e.key === 'Escape') {
//                     e.preventDefault();
//                     handleTransactionModalClose();
//                 }
//             } else if (showAccountCreationModal && e.key === 'Escape') {
//                 e.preventDefault();
//                 handleAccountCreationModalClose();
//             } else if (showItemsModal && e.key === 'Escape') {
//                 e.preventDefault();
//                 setShowItemsModal(false);
//                 setTimeout(() => {
//                     itemSearchRef.current?.focus();
//                 }, 100);
//             }
//         };

//         document.addEventListener('keydown', handleGlobalKeyDown);
//         return () => {
//             document.removeEventListener('keydown', handleGlobalKeyDown);
//         };
//     }, [showTransactionModal, showAccountCreationModal, showItemsModal, handleTransactionModalClose, handleAccountCreationModalClose]);

//     const printImmediately = async (billId) => {
//         try {
//             const response = await api.get(`/api/retailer/purchase-return/${billId}/print`);
//             const printData = response.data.data;

//             // Create a temporary div to hold the print content
//             const tempDiv = document.createElement('div');
//             tempDiv.style.position = 'absolute';
//             tempDiv.style.left = '-9999px';
//             document.body.appendChild(tempDiv);

//             // Helper function to format numbers to 2 decimal places
//             const formatTo2Decimal = (num) => {
//                 const rounded = Math.round(num * 100) / 100;
//                 const parts = rounded.toString().split(".");
//                 if (!parts[1]) return parts[0] + ".00";
//                 if (parts[1].length === 1) return parts[0] + "." + parts[1] + "0";
//                 return rounded.toString();
//             };

//             // Helper function for number to words conversion
//             const numberToWords = (num) => {
//                 const ones = [
//                     '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
//                     'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
//                     'Seventeen', 'Eighteen', 'Nineteen'
//                 ];

//                 const tens = [
//                     '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
//                 ];

//                 const scales = ['', 'Thousand', 'Million', 'Billion'];

//                 const convertHundreds = (num) => {
//                     let words = '';

//                     if (num > 99) {
//                         words += ones[Math.floor(num / 100)] + ' Hundred ';
//                         num %= 100;
//                     }

//                     if (num > 19) {
//                         words += tens[Math.floor(num / 10)] + ' ';
//                         num %= 10;
//                     }

//                     if (num > 0) {
//                         words += ones[num] + ' ';
//                     }

//                     return words.trim();
//                 };

//                 if (num === 0) return 'Zero';
//                 if (num < 0) return 'Negative ' + numberToWords(Math.abs(num));

//                 let words = '';

//                 for (let i = 0; i < scales.length; i++) {
//                     let unit = Math.pow(1000, scales.length - i - 1);
//                     let currentNum = Math.floor(num / unit);

//                     if (currentNum > 0) {
//                         words += convertHundreds(currentNum) + ' ' + scales[scales.length - i - 1] + ' ';
//                     }

//                     num %= unit;
//                 }

//                 return words.trim();
//             };

//             const numberToWordsWithPaisa = (amount) => {
//                 const rupees = Math.floor(amount);
//                 const paisa = Math.round((amount - rupees) * 100);

//                 let result = numberToWords(rupees) + ' Rupees';

//                 if (paisa > 0) {
//                     result += ' and ' + numberToWords(paisa) + ' Paisa';
//                 }

//                 return result;
//             };

//             // Create the printable content for purchase return
//             tempDiv.innerHTML = `
//             <div id="printableContent" class="print-version">
//                 <div class="print-invoice-container">
//                     <div class="print-invoice-header">
//                         <div class="print-company-name">${printData.currentCompanyName}</div>
//                         <div class="print-company-details">
//                             ${printData.currentCompany.address} ${printData.currentCompany.city ? printData.currentCompany.city : ''} |
//                             Tel: ${printData.currentCompany.phone} | PAN: ${printData.currentCompany.pan}
//                         </div>
//                         <div class="print-invoice-title">PURCHASE RETURN</div>
//                     </div>

//                     <div class="print-invoice-details">
//                         <div>
//                             <div><strong>Supplier:</strong> ${printData.bill.account?.name || 'Account Not Found'}</div>
//                             <div><strong>Address:</strong> ${printData.bill.account?.address || 'N/A'}</div>
//                             <div><strong>PAN:</strong> ${printData.bill.account?.pan || 'N/A'}</div>
//                             <div><strong>Payment Mode:</strong> ${printData.bill.paymentMode}</div>
//                         </div>
//                         <div>
//                             <div><strong>Invoice No:</strong> ${printData.bill.billNumber}</div>
//                             <div><strong>Supplier Inv No:</strong> ${printData.bill.partyBillNumber || 'N/A'}</div>
//                             <div><strong>Transaction Date:</strong> ${new Date(printData.bill.transactionDate).toLocaleDateString()}</div>
//                             <div><strong>Inv. Issue Date:</strong> ${new Date(printData.bill.date).toLocaleDateString()}</div>
//                         </div>
//                     </div>

//                     <table class="print-invoice-table">
//                         <thead>
//                             <tr>
//                                 <th>SN</th>
//                                 <th>Code</th>
//                                 <th>HSN</th>
//                                 <th>Description of Goods</th>
//                                 <th>Unit</th>
//                                 <th>Batch</th>
//                                 <th>Expiry</th>
//                                 <th>Qty</th>
//                                 <th>Rate</th>
//                                 <th>MRP</th>
//                                 <th>Amount</th>
//                             </tr>
//                         </thead>
//                         <tbody>
//                             ${printData.bill.items.map((item, i) => `
//                                 <tr key="${i}">
//                                     <td>${i + 1}</td>
//                                     <td>${item.item.uniqueNumber}</td>
//                                     <td>${item.item.hscode}</td>
//                                     <td>${item.item.name}</td>
//                                     <td>${item.item.unit?.name || ''}</td>
//                                     <td>${item.batchNumber}</td>
//                                     <td>${item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'N/A'}</td>
//                                     <td>${item.quantity}</td>
//                                     <td>${formatTo2Decimal(item.puPrice)}</td>
//                                     <td>${formatTo2Decimal(item.mrp || 0)}</td>
//                                     <td>${formatTo2Decimal(item.quantity * item.puPrice)}</td>
//                                 </tr>
//                             `).join('')}
//                         </tbody>
//                         <tr>
//                             <td colSpan="11" style="borderBottom: '1px dashed #000'"></td>
//                         </tr>
//                     </table>

//                     <table class="print-totals-table">
//                         <tbody>
//                             <tr>
//                                 <td><strong>Sub Total:</strong></td>
//                                 <td class="print-text-right">${formatTo2Decimal(printData.bill.subTotal)}</td>
//                             </tr>
//                             <tr>
//                                 <td><strong>Discount (${printData.bill.discountPercentage}%):</strong></td>
//                                 <td class="print-text-right">${formatTo2Decimal(printData.bill.discountAmount)}</td>
//                             </tr>
//                             ${!printData.bill.isVatExempt ? `
//                                 <tr>
//                                     <td><strong>Taxable Amount:</strong></td>
//                                     <td class="print-text-right">${formatTo2Decimal(printData.bill.taxableAmount)}</td>
//                                 </tr>
//                                 <tr>
//                                     <td><strong>VAT (${printData.bill.vatPercentage}%):</strong></td>
//                                     <td class="print-text-right">${formatTo2Decimal(printData.bill.taxableAmount * printData.bill.vatPercentage / 100)}</td>
//                                 </tr>
//                             ` : ''}
//                             <tr>
//                                 <td><strong>Round Off:</strong></td>
//                                 <td class="print-text-right">${formatTo2Decimal(printData.bill.roundOffAmount)}</td>
//                             </tr>
//                             <tr>
//                                 <td><strong>Grand Total:</strong></td>
//                                 <td class="print-text-right">${formatTo2Decimal(printData.bill.totalAmount)}</td>
//                             </tr>
//                         </tbody>
//                     </table>

//                     <div class="print-amount-in-words">
//                         <strong>In Words:</strong> ${numberToWordsWithPaisa(printData.bill.totalAmount)} Only.
//                     </div>

//                     <br /><br />
//                     <div class="print-signature-area">
//                         <div class="print-signature-box">Prepared By</div>
//                         <div class="print-signature-box">Checked By</div>
//                         <div class="print-signature-box">Approved By</div>
//                     </div>
//                 </div>
//             </div>
//         `;

//             // Add print styles
//             const styles = `
//             @media print {
//                 @page {
//                     size: A4;
//                     margin: 5mm;
//                 }

//                 body {
//                     font-family: 'Arial Narrow', Arial, sans-serif;
//                     font-size: 9pt;
//                     line-height: 1.2;
//                     color: #000;
//                     background: white;
//                     margin: 0;
//                     padding: 0;
//                 }

//                 .print-invoice-container {
//                     width: 100%;
//                     max-width: 210mm;
//                     margin: 0 auto;
//                     padding: 2mm;
//                 }

//                 .print-invoice-header {
//                     text-align: center;
//                     margin-bottom: 3mm;
//                     border-bottom: 1px dashed #000;
//                     padding-bottom: 2mm;
//                 }

//                 .print-invoice-title {
//                     font-size: 12pt;
//                     font-weight: bold;
//                     margin: 2mm 0;
//                     text-transform: uppercase;
//                 }

//                 .print-company-name {
//                     font-size: 16pt;
//                     font-weight: bold;
//                 }

//                 .print-company-details {
//                     font-size: 8pt;
//                     font-weight: bold;
//                     margin: 1mm 0;
//                 }

//                 .print-invoice-details {
//                     display: flex;
//                     justify-content: space-between;
//                     margin: 2mm 0;
//                     font-size: 8pt;
//                 }

//                 .print-invoice-table {
//                     width: 100%;
//                     border-collapse: collapse;
//                     margin: 3mm 0;
//                     font-size: 8pt;
//                     border: none;
//                 }

//                 .print-invoice-table thead {
//                     border-top: 1px dashed #000;
//                     border-bottom: 1px dashed #000;
//                 }

//                 .print-invoice-table th {
//                     background-color: transparent;
//                     border: none;
//                     padding: 1mm;
//                     text-align: left;
//                     font-weight: bold;
//                 }

//                 .print-invoice-table td {
//                     border: none;
//                     padding: 1mm;
//                     border-bottom: 1px solid #eee;
//                 }

//                 .print-text-right {
//                     text-align: right;
//                 }

//                 .print-text-center {
//                     text-align: center;
//                 }

//                 .print-amount-in-words {
//                     font-size: 8pt;
//                     margin: 2mm 0;
//                     padding: 1mm;
//                     border: 1px dashed #000;
//                 }

//                 .print-signature-area {
//                     display: flex;
//                     justify-content: space-between;
//                     margin-top: 5mm;
//                     font-size: 8pt;
//                 }

//                 .print-signature-box {
//                     text-align: center;
//                     width: 30%;
//                     border-top: 1px dashed #000;
//                     padding-top: 1mm;
//                     font-weight: bold;
//                 }

//                 .print-totals-table {
//                     width: 60%;
//                     margin-left: auto;
//                     border-collapse: collapse;
//                     font-size: 8pt;
//                 }

//                 .print-totals-table td {
//                     padding: 1mm;
//                 }

//                 .print-footer {
//                     text-align: center;
//                     font-size: 7pt;
//                     margin-top: 3mm;
//                     border-top: 1px dashed #000;
//                     padding-top: 1mm;
//                 }

//                 .no-print {
//                     display: none;
//                 }

//                 /* Hide screen version when printing */
//                 .screen-version {
//                     display: none;
//                 }
//             }

//             @media screen {
//                 /* Hide print version on screen */
//                 .print-version {
//                     display: none;
//                 }
//             }
//         `;

//             // Create print window
//             const printWindow = window.open('', '_blank');
//             printWindow.document.write(`
//             <html>
//                 <head>
//                     <title>Purchase_Return_Invoice_${printData.bill.billNumber}</title>
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
//             printWindow.document.close();

//             // Clean up
//             document.body.removeChild(tempDiv);
//         } catch (error) {
//             console.error('Error fetching print data:', error);
//             setNotification({
//                 show: true,
//                 message: 'Bill updated but failed to load print data',
//                 type: 'warning'
//             });
//         }
//     };

//     const scrollToItemsTable = () => {
//         if (itemsTableRef.current) {
//             setTimeout(() => {
//                 itemsTableRef.current.scrollIntoView({
//                     behavior: 'smooth',
//                     block: 'start'
//                 });
//             }, 100);
//         }
//     };

//     useEffect(() => {
//         if (itemsTableRef.current && items.length > 0) {
//             setTimeout(() => {
//                 itemsTableRef.current.scrollTop = itemsTableRef.current.scrollHeight;
//             }, 10);
//         }
//     }, [items]);

//     const handlePrintAfterSaveChange = (e) => {
//         const isChecked = e.target.checked;
//         setPrintAfterSave(isChecked);
//         localStorage.setItem('printAfterSavePurchaseReturn', isChecked);
//     };

//     const loadMoreAccounts = () => {
//         if (!isAccountSearching) {
//             fetchAccountsFromBackend(accountSearchQuery, accountSearchPage + 1);
//         }
//     };

//     const loadMoreSearchItems = () => {
//         if (!isSearching) {
//             fetchItemsFromBackend(searchQuery, searchPage + 1, false);
//         }
//     };

//     const loadMoreHeaderSearchItems = () => {
//         if (!isHeaderSearching) {
//             fetchItemsFromBackend(headerSearchQuery, headerSearchPage + 1, true);
//         }
//     };

//     const totals = calculateTotal();

//     // Memoized dropdown component
//     const ItemDropdown = React.useMemo(() => {
//         if (!showItemDropdown) return null;

//         const itemsToShow = searchResults;

//         return (
//             <div
//                 id="dropdownMenu"
//                 className="dropdown-menu show"
//                 style={{
//                     maxHeight: '280px',
//                     height: '280px',
//                     overflow: 'hidden',
//                     position: 'absolute',
//                     width: '100%',
//                     zIndex: 1000,
//                     border: '1px solid #ddd',
//                     borderRadius: '4px'
//                 }}
//                 ref={itemDropdownRef}
//             >
//                 <div className="dropdown-header" style={{
//                     display: 'grid',
//                     gridTemplateColumns: 'repeat(7, 1fr)',
//                     alignItems: 'center',
//                     padding: '0 10px',
//                     height: '40px',
//                     background: '#f0f0f0',
//                     fontWeight: 'bold',
//                     borderBottom: '1px solid #dee2e6'
//                 }}>
//                     <div><strong>#</strong></div>
//                     <div><strong>HSN</strong></div>
//                     <div><strong>Description</strong></div>
//                     <div><strong>Category</strong></div>
//                     <div><strong>Stock</strong></div>
//                     <div><strong>Unit</strong></div>
//                     <div><strong>Rate</strong></div>
//                 </div>

//                 {itemsToShow.length > 0 ? (
//                     <VirtualizedItemListForPurchase
//                         items={itemsToShow}
//                         onItemClick={(item) => showBatchModalForItem(item)}
//                         searchRef={itemSearchRef}
//                         hasMore={hasMoreSearchResults}
//                         isSearching={isSearching}
//                         onLoadMore={loadMoreSearchItems}
//                         totalItems={totalSearchItems}
//                         page={searchPage}
//                         searchQuery={searchQuery}
//                         setNotification={setNotification}
//                     />
//                 ) : (
//                     <div className="text-center py-3 text-muted">
//                         {searchQuery ? 'No items found' : 'Type to search items'}
//                         <div className="small mt-1">
//                             <small className="text-info">Press F6 to create a new item</small>
//                         </div>
//                     </div>
//                 )}
//             </div>
//         );
//     }, [showItemDropdown, searchResults, searchQuery, lastSearchQuery, shouldShowLastSearchResults]);

//     if (isLoading) {
//         return (
//             <div className="container-fluid">
//                 <Header />
//                 <div className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
//                     <div className="spinner-border text-primary" role="status">
//                         <span className="visually-hidden">Loading...</span>
//                     </div>
//                 </div>
//             </div>
//         );
//     }

//     return (
//         <div className="container-fluid">
//             <Header />
//             <div className="card mt-2 shadow-lg p-2 animate__animated animate__fadeInUp expanded-card ledger-card compact">
//                 <div className="card-header">
//                     <div className="d-flex justify-content-between align-items-center">
//                         <h2 className="card-title mb-0">
//                             <i className="bi bi-file-text me-2"></i>
//                             Update Purchase Return Entry
//                         </h2>
//                         <div>
//                             {formData.billNumber === '' && (
//                                 <span className="badge bg-danger me-2">Invoice number is required!</span>
//                             )}
//                             {dateErrors.transactionDateNepali && (
//                                 <span className="badge bg-danger me-2">{dateErrors.transactionDateNepali}</span>
//                             )}
//                             {dateErrors.nepaliDate && (
//                                 <span className="badge bg-danger">{dateErrors.nepaliDate}</span>
//                             )}
//                         </div>
//                     </div>
//                 </div>
//                 <div className="card-body p-2 p-md-3">
//                     <form onSubmit={handleSubmit} id="billForm" className="needs-validation" noValidate>
//                         {/* Date and Basic Info Row */}
//                         <div className="row g-2 mb-3">
//                             {company.dateFormat === 'nepali' ? (
//                                 <>
//                                     <div className="col-12 col-md-6 col-lg-3">
//                                         <div className="position-relative">
//                                             <input
//                                                 type="text"
//                                                 name="transactionDateNepali"
//                                                 id="transactionDateNepali"
//                                                 ref={company.dateFormat === 'nepali' ? transactionDateRef : null}
//                                                 autoComplete='off'
//                                                 className={`form-control form-control-sm no-date-icon ${dateErrors.transactionDateNepali ? 'is-invalid' : ''}`}
//                                                 value={formData.transactionDateNepali}
//                                                 onChange={(e) => {
//                                                     const value = e.target.value;
//                                                     const sanitizedValue = value.replace(/[^0-9/-]/g, '');
//                                                     if (sanitizedValue.length <= 10) {
//                                                         setFormData({ ...formData, transactionDateNepali: sanitizedValue });
//                                                         setDateErrors(prev => ({ ...prev, transactionDateNepali: '' }));
//                                                     }
//                                                 }}
//                                                 onKeyDown={(e) => {
//                                                     const allowedKeys = [
//                                                         'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
//                                                         'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
//                                                         'Home', 'End'
//                                                     ];
//                                                     if (!allowedKeys.includes(e.key) &&
//                                                         !/^\d$/.test(e.key) &&
//                                                         e.key !== '/' &&
//                                                         e.key !== '-' &&
//                                                         !e.ctrlKey && !e.metaKey) {
//                                                         e.preventDefault();
//                                                     }
//                                                     if (e.key === 'Enter') {
//                                                         e.preventDefault();
//                                                         const dateStr = e.target.value.trim();
//                                                         if (!dateStr) {
//                                                             const currentDate = new NepaliDate();
//                                                             const correctedDate = currentDate.format('YYYY-MM-DD');
//                                                             setFormData({
//                                                                 ...formData,
//                                                                 transactionDateNepali: correctedDate
//                                                             });
//                                                             setDateErrors(prev => ({ ...prev, transactionDateNepali: '' }));
//                                                             setNotification({
//                                                                 show: true,
//                                                                 message: 'Date required. Auto-corrected to current date.',
//                                                                 type: 'warning',
//                                                                 duration: 3000
//                                                             });
//                                                             handleKeyDown(e, 'transactionDateNepali');
//                                                         } else if (dateErrors.transactionDateNepali) {
//                                                             e.target.focus();
//                                                         } else {
//                                                             handleKeyDown(e, 'transactionDateNepali');
//                                                         }
//                                                     }
//                                                 }}
//                                                 onPaste={(e) => {
//                                                     e.preventDefault();
//                                                     const pastedData = e.clipboardData.getData('text');
//                                                     const cleanedData = pastedData.replace(/[^0-9/-]/g, '');
//                                                     const newValue = formData.transactionDateNepali + cleanedData;
//                                                     if (newValue.length <= 10) {
//                                                         setFormData({ ...formData, transactionDateNepali: newValue });
//                                                     }
//                                                 }}
//                                                 onBlur={(e) => {
//                                                     try {
//                                                         const dateStr = e.target.value.trim();
//                                                         if (!dateStr) {
//                                                             setDateErrors(prev => ({ ...prev, transactionDateNepali: '' }));
//                                                             return;
//                                                         }
//                                                         const nepaliDateFormat = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/;
//                                                         if (!nepaliDateFormat.test(dateStr)) {
//                                                             const currentDate = new NepaliDate();
//                                                             const correctedDate = currentDate.format('YYYY-MM-DD');
//                                                             setFormData({
//                                                                 ...formData,
//                                                                 transactionDateNepali: correctedDate
//                                                             });
//                                                             setDateErrors(prev => ({ ...prev, transactionDateNepali: '' }));
//                                                             setNotification({
//                                                                 show: true,
//                                                                 message: 'Invalid date format. Auto-corrected to current date.',
//                                                                 type: 'warning',
//                                                                 duration: 3000
//                                                             });
//                                                             return;
//                                                         }
//                                                         const normalizedDateStr = dateStr.replace(/-/g, '/');
//                                                         const [year, month, day] = normalizedDateStr.split('/').map(Number);
//                                                         if (month < 1 || month > 12) {
//                                                             throw new Error("Month must be between 1-12");
//                                                         }
//                                                         if (day < 1 || day > 32) {
//                                                             throw new Error("Day must be between 1-32");
//                                                         }
//                                                         const nepaliDate = new NepaliDate(year, month - 1, day);
//                                                         if (
//                                                             nepaliDate.getYear() !== year ||
//                                                             nepaliDate.getMonth() + 1 !== month ||
//                                                             nepaliDate.getDate() !== day
//                                                         ) {
//                                                             const currentDate = new NepaliDate();
//                                                             const correctedDate = currentDate.format('YYYY-MM-DD');
//                                                             setFormData({
//                                                                 ...formData,
//                                                                 transactionDateNepali: correctedDate
//                                                             });
//                                                             setDateErrors(prev => ({ ...prev, transactionDateNepali: '' }));
//                                                             setNotification({
//                                                                 show: true,
//                                                                 message: 'Invalid Nepali date. Auto-corrected to current date.',
//                                                                 type: 'warning',
//                                                                 duration: 3000
//                                                             });
//                                                         } else {
//                                                             setFormData({
//                                                                 ...formData,
//                                                                 transactionDateNepali: nepaliDate.format('YYYY-MM-DD')
//                                                             });
//                                                             setDateErrors(prev => ({ ...prev, transactionDateNepali: '' }));
//                                                         }
//                                                     } catch (error) {
//                                                         const currentDate = new NepaliDate();
//                                                         const correctedDate = currentDate.format('YYYY-MM-DD');
//                                                         setFormData({
//                                                             ...formData,
//                                                             transactionDateNepali: correctedDate
//                                                         });
//                                                         setDateErrors(prev => ({ ...prev, transactionDateNepali: '' }));
//                                                         setNotification({
//                                                             show: true,
//                                                             message: error.message ? `${error.message}. Auto-corrected to current date.` : 'Invalid date. Auto-corrected to current date.',
//                                                             type: 'warning',
//                                                             duration: 3000
//                                                         });
//                                                     }
//                                                 }}
//                                                 placeholder="YYYY-MM-DD"
//                                                 required
//                                                 style={{
//                                                     height: '26px',
//                                                     fontSize: '0.875rem',
//                                                     paddingTop: '0.75rem',
//                                                     width: '100%'
//                                                 }}
//                                             />
//                                             <label
//                                                 className="position-absolute"
//                                                 style={{
//                                                     top: '-0.5rem',
//                                                     left: '0.75rem',
//                                                     fontSize: '0.75rem',
//                                                     backgroundColor: 'white',
//                                                     padding: '0 0.25rem',
//                                                     color: '#6c757d',
//                                                     fontWeight: '500'
//                                                 }}
//                                             >
//                                                 Transaction Date: <span className="text-danger">*</span>
//                                             </label>
//                                             {dateErrors.transactionDateNepali && (
//                                                 <div className="invalid-feedback d-block" style={{ fontSize: '0.7rem' }}>
//                                                     {dateErrors.transactionDateNepali}
//                                                 </div>
//                                             )}
//                                         </div>
//                                     </div>

//                                     <div className="col-12 col-md-6 col-lg-3">
//                                         <div className="position-relative">
//                                             <input
//                                                 type="text"
//                                                 name="nepaliDate"
//                                                 id="nepaliDate"
//                                                 autoComplete='off'
//                                                 className={`form-control form-control-sm no-date-icon ${dateErrors.nepaliDate ? 'is-invalid' : ''}`}
//                                                 value={formData.nepaliDate}
//                                                 onChange={(e) => {
//                                                     const value = e.target.value;
//                                                     const sanitizedValue = value.replace(/[^0-9/-]/g, '');
//                                                     if (sanitizedValue.length <= 10) {
//                                                         setFormData({ ...formData, nepaliDate: sanitizedValue });
//                                                         setDateErrors(prev => ({ ...prev, nepaliDate: '' }));
//                                                     }
//                                                 }}
//                                                 onKeyDown={(e) => {
//                                                     const allowedKeys = [
//                                                         'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
//                                                         'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
//                                                         'Home', 'End'
//                                                     ];
//                                                     if (!allowedKeys.includes(e.key) &&
//                                                         !/^\d$/.test(e.key) &&
//                                                         e.key !== '/' &&
//                                                         e.key !== '-' &&
//                                                         !e.ctrlKey && !e.metaKey) {
//                                                         e.preventDefault();
//                                                     }
//                                                     if (e.key === 'Enter') {
//                                                         e.preventDefault();
//                                                         const dateStr = e.target.value.trim();
//                                                         if (!dateStr) {
//                                                             const currentDate = new NepaliDate();
//                                                             const correctedDate = currentDate.format('YYYY-MM-DD');
//                                                             setFormData({
//                                                                 ...formData,
//                                                                 nepaliDate: correctedDate
//                                                             });
//                                                             setDateErrors(prev => ({ ...prev, nepaliDate: '' }));
//                                                             setNotification({
//                                                                 show: true,
//                                                                 message: 'Date required. Auto-corrected to current date.',
//                                                                 type: 'warning',
//                                                                 duration: 3000
//                                                             });
//                                                             handleKeyDown(e, 'nepaliDate');
//                                                         } else if (dateErrors.nepaliDate) {
//                                                             e.target.focus();
//                                                         } else {
//                                                             handleKeyDown(e, 'nepaliDate');
//                                                         }
//                                                     }
//                                                 }}
//                                                 onPaste={(e) => {
//                                                     e.preventDefault();
//                                                     const pastedData = e.clipboardData.getData('text');
//                                                     const cleanedData = pastedData.replace(/[^0-9/-]/g, '');
//                                                     const newValue = formData.nepaliDate + cleanedData;
//                                                     if (newValue.length <= 10) {
//                                                         setFormData({ ...formData, nepaliDate: newValue });
//                                                     }
//                                                 }}
//                                                 onBlur={(e) => {
//                                                     try {
//                                                         const dateStr = e.target.value.trim();
//                                                         if (!dateStr) {
//                                                             setDateErrors(prev => ({ ...prev, nepaliDate: '' }));
//                                                             return;
//                                                         }
//                                                         const nepaliDateFormat = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/;
//                                                         if (!nepaliDateFormat.test(dateStr)) {
//                                                             const currentDate = new NepaliDate();
//                                                             const correctedDate = currentDate.format('YYYY-MM-DD');
//                                                             setFormData({
//                                                                 ...formData,
//                                                                 nepaliDate: correctedDate
//                                                             });
//                                                             setDateErrors(prev => ({ ...prev, nepaliDate: '' }));
//                                                             setNotification({
//                                                                 show: true,
//                                                                 message: 'Invalid date format. Auto-corrected to current date.',
//                                                                 type: 'warning',
//                                                                 duration: 3000
//                                                             });
//                                                             return;
//                                                         }
//                                                         const normalizedDateStr = dateStr.replace(/-/g, '/');
//                                                         const [year, month, day] = normalizedDateStr.split('/').map(Number);
//                                                         if (month < 1 || month > 12) {
//                                                             throw new Error("Month must be between 1-12");
//                                                         }
//                                                         if (day < 1 || day > 32) {
//                                                             throw new Error("Day must be between 1-32");
//                                                         }
//                                                         const nepaliDate = new NepaliDate(year, month - 1, day);
//                                                         if (
//                                                             nepaliDate.getYear() !== year ||
//                                                             nepaliDate.getMonth() + 1 !== month ||
//                                                             nepaliDate.getDate() !== day
//                                                         ) {
//                                                             const currentDate = new NepaliDate();
//                                                             const correctedDate = currentDate.format('YYYY-MM-DD');
//                                                             setFormData({
//                                                                 ...formData,
//                                                                 nepaliDate: correctedDate
//                                                             });
//                                                             setDateErrors(prev => ({ ...prev, nepaliDate: '' }));
//                                                             setNotification({
//                                                                 show: true,
//                                                                 message: 'Invalid Nepali date. Auto-corrected to current date.',
//                                                                 type: 'warning',
//                                                                 duration: 3000
//                                                             });
//                                                         } else {
//                                                             setFormData({
//                                                                 ...formData,
//                                                                 nepaliDate: nepaliDate.format('YYYY-MM-DD')
//                                                             });
//                                                             setDateErrors(prev => ({ ...prev, nepaliDate: '' }));
//                                                         }
//                                                     } catch (error) {
//                                                         const currentDate = new NepaliDate();
//                                                         const correctedDate = currentDate.format('YYYY-MM-DD');
//                                                         setFormData({
//                                                             ...formData,
//                                                             nepaliDate: correctedDate
//                                                         });
//                                                         setDateErrors(prev => ({ ...prev, nepaliDate: '' }));
//                                                         setNotification({
//                                                             show: true,
//                                                             message: error.message ? `${error.message}. Auto-corrected to current date.` : 'Invalid date. Auto-corrected to current date.',
//                                                             type: 'warning',
//                                                             duration: 3000
//                                                         });
//                                                     }
//                                                 }}
//                                                 placeholder="YYYY-MM-DD"
//                                                 required
//                                                 style={{
//                                                     height: '26px',
//                                                     fontSize: '0.875rem',
//                                                     paddingTop: '0.75rem',
//                                                     width: '100%'
//                                                 }}
//                                             />
//                                             <label
//                                                 className="position-absolute"
//                                                 style={{
//                                                     top: '-0.5rem',
//                                                     left: '0.75rem',
//                                                     fontSize: '0.75rem',
//                                                     backgroundColor: 'white',
//                                                     padding: '0 0.25rem',
//                                                     color: '#6c757d',
//                                                     fontWeight: '500'
//                                                 }}
//                                             >
//                                                 Invoice Date: <span className="text-danger">*</span>
//                                             </label>
//                                             {dateErrors.nepaliDate && (
//                                                 <div className="invalid-feedback d-block" style={{ fontSize: '0.7rem' }}>
//                                                     {dateErrors.nepaliDate}
//                                                 </div>
//                                             )}
//                                         </div>
//                                     </div>
//                                 </>
//                             ) : (
//                                 <>
//                                     <div className="col-12 col-md-6 col-lg-3">
//                                         <div className="position-relative">
//                                             <input
//                                                 type="date"
//                                                 name="transactionDateRoman"
//                                                 id="transactionDateRoman"
//                                                 className="form-control form-control-sm"
//                                                 ref={company.dateFormat === 'nepali' ? null : transactionDateRef}
//                                                 value={formData.transactionDateRoman}
//                                                 onChange={(e) => {
//                                                     const value = e.target.value;
//                                                     const selectedDate = new Date(value);
//                                                     const today = new Date();
//                                                     today.setHours(0, 0, 0, 0);
//                                                     if (selectedDate > today) {
//                                                         const todayStr = today.toISOString().split('T')[0];
//                                                         setFormData({ ...formData, transactionDateRoman: todayStr });
//                                                         setNotification({
//                                                             show: true,
//                                                             message: 'Future date not allowed. Auto-corrected to today.',
//                                                             type: 'warning',
//                                                             duration: 3000
//                                                         });
//                                                     } else {
//                                                         setFormData({ ...formData, transactionDateRoman: value });
//                                                     }
//                                                 }}
//                                                 onKeyDown={(e) => {
//                                                     if (e.key === 'Enter') {
//                                                         e.preventDefault();
//                                                         const value = e.target.value;
//                                                         if (!value) {
//                                                             const today = new Date();
//                                                             const todayStr = today.toISOString().split('T')[0];
//                                                             setFormData({ ...formData, transactionDateRoman: todayStr });
//                                                             setNotification({
//                                                                 show: true,
//                                                                 message: 'Date required. Auto-corrected to today.',
//                                                                 type: 'warning',
//                                                                 duration: 3000
//                                                             });
//                                                         }
//                                                         handleKeyDown(e, 'transactionDateRoman');
//                                                     }
//                                                 }}
//                                                 onBlur={(e) => {
//                                                     const value = e.target.value;
//                                                     if (!value) {
//                                                         const today = new Date();
//                                                         const todayStr = today.toISOString().split('T')[0];
//                                                         setFormData({ ...formData, transactionDateRoman: todayStr });
//                                                         setNotification({
//                                                             show: true,
//                                                             message: 'Date required. Auto-corrected to today.',
//                                                             type: 'warning',
//                                                             duration: 3000
//                                                         });
//                                                     }
//                                                 }}
//                                                 max={new Date().toISOString().split('T')[0]}
//                                                 required
//                                                 style={{
//                                                     height: '26px',
//                                                     fontSize: '0.875rem',
//                                                     paddingTop: '0.75rem',
//                                                     width: '100%'
//                                                 }}
//                                             />
//                                             <label
//                                                 className="position-absolute"
//                                                 style={{
//                                                     top: '-0.5rem',
//                                                     left: '0.75rem',
//                                                     fontSize: '0.75rem',
//                                                     backgroundColor: 'white',
//                                                     padding: '0 0.25rem',
//                                                     color: '#6c757d',
//                                                     fontWeight: '500'
//                                                 }}
//                                             >
//                                                 Transaction Date: <span className="text-danger">*</span>
//                                             </label>
//                                         </div>
//                                     </div>
//                                     <div className="col-12 col-md-6 col-lg-3">
//                                         <div className="position-relative">
//                                             <input
//                                                 type="date"
//                                                 name="billDate"
//                                                 id="billDate"
//                                                 className="form-control form-control-sm"
//                                                 value={formData.billDate}
//                                                 onChange={(e) => {
//                                                     const value = e.target.value;
//                                                     const selectedDate = new Date(value);
//                                                     const today = new Date();
//                                                     today.setHours(0, 0, 0, 0);
//                                                     if (selectedDate > today) {
//                                                         const todayStr = today.toISOString().split('T')[0];
//                                                         setFormData({ ...formData, billDate: todayStr });
//                                                         setNotification({
//                                                             show: true,
//                                                             message: 'Future date not allowed. Auto-corrected to today.',
//                                                             type: 'warning',
//                                                             duration: 3000
//                                                         });
//                                                     } else {
//                                                         setFormData({ ...formData, billDate: value });
//                                                     }
//                                                 }}
//                                                 onKeyDown={(e) => {
//                                                     if (e.key === 'Enter') {
//                                                         e.preventDefault();
//                                                         const value = e.target.value;
//                                                         if (!value) {
//                                                             const today = new Date();
//                                                             const todayStr = today.toISOString().split('T')[0];
//                                                             setFormData({ ...formData, billDate: todayStr });
//                                                             setNotification({
//                                                                 show: true,
//                                                                 message: 'Date required. Auto-corrected to today.',
//                                                                 type: 'warning',
//                                                                 duration: 3000
//                                                             });
//                                                         }
//                                                         handleKeyDown(e, 'billDate');
//                                                     }
//                                                 }}
//                                                 onBlur={(e) => {
//                                                     const value = e.target.value;
//                                                     if (!value) {
//                                                         const today = new Date();
//                                                         const todayStr = today.toISOString().split('T')[0];
//                                                         setFormData({ ...formData, billDate: todayStr });
//                                                         setNotification({
//                                                             show: true,
//                                                             message: 'Date required. Auto-corrected to today.',
//                                                             type: 'warning',
//                                                             duration: 3000
//                                                         });
//                                                     }
//                                                 }}
//                                                 max={new Date().toISOString().split('T')[0]}
//                                                 required
//                                                 style={{
//                                                     height: '26px',
//                                                     fontSize: '0.875rem',
//                                                     paddingTop: '0.75rem',
//                                                     width: '100%'
//                                                 }}
//                                             />
//                                             <label
//                                                 className="position-absolute"
//                                                 style={{
//                                                     top: '-0.5rem',
//                                                     left: '0.75rem',
//                                                     fontSize: '0.75rem',
//                                                     backgroundColor: 'white',
//                                                     padding: '0 0.25rem',
//                                                     color: '#6c757d',
//                                                     fontWeight: '500'
//                                                 }}
//                                             >
//                                                 Invoice Date: <span className="text-danger">*</span>
//                                             </label>
//                                         </div>
//                                     </div>
//                                 </>
//                             )}

//                             <div className="col-12 col-md-6 col-lg-2">
//                                 <div className="position-relative">
//                                     <input
//                                         type="text"
//                                         name="billNumber"
//                                         id="billNumber"
//                                         className="form-control form-control-sm"
//                                         value={formData.billNumber}
//                                         readOnly
//                                         onKeyDown={(e) => {
//                                             if (e.key === 'Enter') {
//                                                 handleKeyDown(e, 'billNumber');
//                                             }
//                                         }}
//                                         style={{
//                                             height: '26px',
//                                             fontSize: '0.875rem',
//                                             paddingTop: '0.75rem',
//                                             width: '100%'
//                                         }}
//                                     />
//                                     <label
//                                         className="position-absolute"
//                                         style={{
//                                             top: '-0.5rem',
//                                             left: '0.75rem',
//                                             fontSize: '0.75rem',
//                                             backgroundColor: 'white',
//                                             padding: '0 0.25rem',
//                                             color: '#6c757d',
//                                             fontWeight: '500'
//                                         }}
//                                     >
//                                         Vch. No:
//                                     </label>
//                                 </div>
//                             </div>

//                             <div className="col-12 col-md-6 col-lg-2">
//                                 <div className="position-relative">
//                                     <select
//                                         className="form-control form-control-sm"
//                                         name="paymentMode"
//                                         id="paymentMode"
//                                         value={formData.paymentMode}
//                                         onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
//                                         onKeyDown={(e) => {
//                                             if (e.key === 'Enter') {
//                                                 handleKeyDown(e, 'paymentMode');
//                                             }
//                                         }}
//                                         style={{
//                                             height: '26px',
//                                             fontSize: '0.875rem',
//                                             paddingTop: '0.25rem',
//                                             width: '100%'
//                                         }}
//                                     >
//                                         <option value="credit">credit</option>
//                                         <option value="cash">cash</option>
//                                     </select>
//                                     <label
//                                         className="position-absolute"
//                                         style={{
//                                             top: '-0.5rem',
//                                             left: '0.75rem',
//                                             fontSize: '0.75rem',
//                                             backgroundColor: 'white',
//                                             padding: '0 0.25rem',
//                                             color: '#6c757d',
//                                             fontWeight: '500'
//                                         }}
//                                     >
//                                         Payment Mode:
//                                     </label>
//                                 </div>
//                             </div>

//                             <div className="col-12 col-md-6 col-lg-2">
//                                 <div className="position-relative">
//                                     <select
//                                         className="form-control form-control-sm"
//                                         name="isVatExempt"
//                                         id="isVatExempt"
//                                         value={formData.isVatExempt}
//                                         onChange={(e) => setFormData({ ...formData, isVatExempt: e.target.value })}
//                                         onKeyDown={(e) => {
//                                             if (e.key === 'Enter') {
//                                                 handleKeyDown(e, 'isVatExempt');
//                                             }
//                                         }}
//                                         style={{
//                                             height: '26px',
//                                             fontSize: '0.875rem',
//                                             paddingTop: '0.25rem',
//                                             width: '100%'
//                                         }}
//                                     >
//                                         {company.vatEnabled && <option value="all">All</option>}
//                                         {company.vatEnabled && <option value="false">13%</option>}
//                                         <option value="true">Exempt</option>
//                                     </select>
//                                     <label
//                                         className="position-absolute"
//                                         style={{
//                                             top: '-0.5rem',
//                                             left: '0.75rem',
//                                             fontSize: '0.75rem',
//                                             backgroundColor: 'white',
//                                             padding: '0 0.25rem',
//                                             color: '#6c757d',
//                                             fontWeight: '500'
//                                         }}
//                                     >
//                                         VAT
//                                     </label>
//                                 </div>
//                             </div>
//                         </div>

//                         <div className="row g-2 mb-3">
//                             {/* Party Name Field */}
//                             <div className="col-12 col-md-6">
//                                 <div className="position-relative">
//                                     <input
//                                         type="text"
//                                         id="account"
//                                         name="account"
//                                         className="form-control form-control-sm"
//                                         value={formData.accountName}
//                                         onClick={() => setShowAccountModal(true)}
//                                         onFocus={() => setShowAccountModal(true)}
//                                         readOnly
//                                         required
//                                         onKeyDown={(e) => {
//                                             if (e.key === 'Enter') {
//                                                 handleKeyDown(e, 'account');
//                                             }
//                                         }}
//                                         style={{
//                                             height: '26px',
//                                             fontSize: '0.875rem',
//                                             paddingTop: '0.75rem',
//                                             width: '100%'
//                                         }}
//                                     />
//                                     <label
//                                         className="position-absolute"
//                                         style={{
//                                             top: '-0.5rem',
//                                             left: '0.75rem',
//                                             fontSize: '0.75rem',
//                                             backgroundColor: 'white',
//                                             padding: '0 0.25rem',
//                                             color: '#6c757d',
//                                             fontWeight: '500'
//                                         }}
//                                     >
//                                         Party Name: <span className="text-danger">*</span>
//                                     </label>
//                                     <input type="hidden" id="accountId" name="accountId" value={formData.accountId} />
//                                 </div>
//                             </div>

//                             <div className="col-12 col-md-2">
//                                 <div className="position-relative">
//                                     <div
//                                         className="form-control form-control-sm"
//                                         style={{
//                                             height: '26px',
//                                             fontSize: '0.875rem',
//                                             paddingTop: '0.4rem',
//                                             width: '100%',
//                                             border: '1px solid #ced4da',
//                                             borderRadius: '0.375rem',
//                                             overflow: 'hidden',
//                                             whiteSpace: 'nowrap'
//                                         }}
//                                     >
//                                         <AccountBalanceDisplay
//                                             accountId={formData.accountId}
//                                             api={api}
//                                             compact={true}
//                                             dateFormat={company.dateFormat}
//                                             refreshTrigger={showAccountCreationModal}
//                                             style={{
//                                                 fontSize: '0.875rem',
//                                                 lineHeight: '1',
//                                                 margin: '0',
//                                                 padding: '0',
//                                                 display: 'inline-block',
//                                                 verticalAlign: 'middle'
//                                             }}
//                                         />
//                                     </div>
//                                 </div>
//                             </div>

//                             {/* Party Address Field */}
//                             <div className="col-12 col-md-2">
//                                 <div className="position-relative">
//                                     <input
//                                         type="text"
//                                         id="address"
//                                         className="form-control form-control-sm"
//                                         value={formData.accountAddress}
//                                         onKeyDown={(e) => {
//                                             if (e.key === 'Enter') {
//                                                 handleKeyDown(e, 'address');
//                                             }
//                                         }}
//                                         readOnly
//                                         style={{
//                                             height: '26px',
//                                             fontSize: '0.875rem',
//                                             paddingTop: '0.75rem',
//                                             width: '100%'
//                                         }}
//                                     />
//                                     <label
//                                         className="position-absolute"
//                                         style={{
//                                             top: '-0.5rem',
//                                             left: '0.75rem',
//                                             fontSize: '0.75rem',
//                                             backgroundColor: 'white',
//                                             padding: '0 0.25rem',
//                                             color: '#6c757d',
//                                             fontWeight: '500'
//                                         }}
//                                     >
//                                         Address:
//                                     </label>
//                                 </div>
//                             </div>

//                             {/* VAT No Field */}
//                             <div className="col-12 col-md-2">
//                                 <div className="position-relative">
//                                     <input
//                                         type="text"
//                                         id="pan"
//                                         name="pan"
//                                         className="form-control form-control-sm"
//                                         value={formData.accountPan}
//                                         onKeyDown={(e) => {
//                                             if (e.key === 'Enter') {
//                                                 handleKeyDown(e, 'pan');
//                                             }
//                                         }}
//                                         readOnly
//                                         style={{
//                                             height: '26px',
//                                             fontSize: '0.875rem',
//                                             paddingTop: '0.75rem',
//                                             width: '100%'
//                                         }}
//                                     />
//                                     <label
//                                         className="position-absolute"
//                                         style={{
//                                             top: '-0.5rem',
//                                             left: '0.75rem',
//                                             fontSize: '0.75rem',
//                                             backgroundColor: 'white',
//                                             padding: '0 0.25rem',
//                                             color: '#6c757d',
//                                             fontWeight: '500'
//                                         }}
//                                     >
//                                         Vat No:
//                                     </label>
//                                 </div>
//                             </div>
//                         </div>

//                         <div
//                             className="table-responsive"
//                             style={{
//                                 minHeight: "270px",
//                                 maxHeight: "270px",
//                                 overflowY: "auto",
//                                 border: items.length > 0 ? '1px solid #dee2e6' : '1px dashed #ced4da',
//                                 backgroundColor: '#fff'
//                             }}
//                             ref={itemsTableRef}
//                         >
//                             <table className="table table-sm table-bordered table-hover mb-0">
//                                 <thead className="sticky-top bg-light">
//                                     {/* Header item selection row */}
//                                     <tr style={{
//                                         height: '26px',
//                                         backgroundColor: '#ffffff',
//                                         position: 'sticky',
//                                         top: 0,
//                                         zIndex: 10,
//                                         boxShadow: '0 2px 3px rgba(0,0,0,0.1)'
//                                     }}>
//                                         <td width="5%" style={{ padding: '2px', backgroundColor: '#ffffff' }}>
//                                             <div className="position-relative">
//                                                 <input
//                                                     type="text"
//                                                     id="headerItemSearch"
//                                                     className="form-control form-control-sm"
//                                                     placeholder="Search..."
//                                                     value={headerSearchQuery}
//                                                     onChange={handleHeaderItemSearch}
//                                                     onFocus={() => {
//                                                         setShowHeaderItemModal(true);
//                                                         handleHeaderSearchFocus();
//                                                     }}
//                                                     onKeyDown={(e) => {
//                                                         if (e.key === 'Enter') {
//                                                             e.preventDefault();
//                                                             if (!headerSearchQuery.trim()) {
//                                                                 setShowHeaderItemModal(false);
//                                                                 setTimeout(() => {
//                                                                     const discountInput = document.getElementById('discountPercentage');
//                                                                     if (discountInput) {
//                                                                         discountInput.focus();
//                                                                         discountInput.select();
//                                                                     }
//                                                                 }, 50);
//                                                             } else {
//                                                                 setShowHeaderItemModal(true);
//                                                             }
//                                                         } else if (e.key === 'Escape') {
//                                                             e.preventDefault();
//                                                             setShowHeaderItemModal(false);
//                                                         }
//                                                     }}
//                                                     style={{
//                                                         height: '20px',
//                                                         fontSize: '0.75rem',
//                                                         padding: '0 4px',
//                                                         backgroundColor: '#ffffff'
//                                                     }}
//                                                 />
//                                             </div>
//                                         </td>
//                                         <td width="8%" style={{
//                                             padding: '2px',
//                                             fontSize: '0.75rem',
//                                             textAlign: 'center',
//                                             backgroundColor: '#ffffff'
//                                         }}>
//                                             {selectedItemForInsert ? selectedItemForInsert.uniqueNumber || 'N/A' : ''}
//                                         </td>
//                                         <td width="8%" style={{
//                                             padding: '2px',
//                                             fontSize: '0.75rem',
//                                             textAlign: 'center',
//                                             backgroundColor: '#ffffff'
//                                         }}>
//                                             {selectedItemForInsert ? selectedItemForInsert.hscode || 'N/A' : ''}
//                                         </td>
//                                         <td width="20%" style={{
//                                             padding: '2px',
//                                             fontSize: '0.75rem',
//                                             backgroundColor: '#ffffff'
//                                         }}>
//                                             {selectedItemForInsert ? selectedItemForInsert.name : ''}
//                                         </td>
//                                         <td width="8%" style={{ padding: '2px', backgroundColor: '#ffffff' }}>
//                                             <input
//                                                 type="text"
//                                                 className="form-control form-control-sm"
//                                                 placeholder="Batch"
//                                                 id="selectedItemBatch"
//                                                 value={selectedItemForInsert?.batchInfo?.batchNumber || selectedItemBatchNumber || ''}
//                                                 onChange={(e) => {
//                                                     setSelectedItemBatchNumber(e.target.value);
//                                                     if (selectedItemForInsert) {
//                                                         setSelectedItemForInsert(prev => ({
//                                                             ...prev,
//                                                             batchInfo: {
//                                                                 ...prev.batchInfo,
//                                                                 batchNumber: e.target.value
//                                                             }
//                                                         }));
//                                                     }
//                                                 }}
//                                                 onKeyDown={(e) => {
//                                                     if ((e.key === 'Tab' || e.key === 'Enter')) {
//                                                         e.preventDefault();
//                                                         document.getElementById('headerExpiryDate').focus();
//                                                     } else if (e.key === 'Escape') {
//                                                         setShowHeaderItemModal(true);
//                                                         setTimeout(() => {
//                                                             document.getElementById('headerItemSearch')?.focus();
//                                                         }, 100);
//                                                     }
//                                                 }}
//                                                 readOnly
//                                                 style={{
//                                                     height: '20px',
//                                                     fontSize: '0.75rem',
//                                                     padding: '0 4px',
//                                                     backgroundColor: '#ffffff'
//                                                 }}
//                                             />
//                                         </td>
//                                         <td width="8%" style={{ padding: '2px', backgroundColor: '#ffffff' }}>
//                                             <input
//                                                 type="date"
//                                                 className="form-control form-control-sm"
//                                                 placeholder="Expiry"
//                                                 id="headerExpiryDate"
//                                                 value={selectedItemExpiryDate || (selectedItemForInsert?.batchInfo?.expiryDate ? formatDateForInput(selectedItemForInsert.batchInfo.expiryDate) : '')}
//                                                 onChange={(e) => {
//                                                     const newDate = e.target.value;
//                                                     setSelectedItemExpiryDate(newDate);
//                                                     if (selectedItemForInsert) {
//                                                         setSelectedItemForInsert(prev => ({
//                                                             ...prev,
//                                                             batchInfo: {
//                                                                 ...prev.batchInfo,
//                                                                 expiryDate: newDate
//                                                             }
//                                                         }));
//                                                     }
//                                                 }}
//                                                 onKeyDown={(e) => {
//                                                     if ((e.key === 'Tab' || e.key === 'Enter')) {
//                                                         e.preventDefault();
//                                                         document.getElementById('selectedItemQuantity').focus();
//                                                     } else if (e.key === 'Escape') {
//                                                         document.getElementById('selectedItemBatch').focus();
//                                                     }
//                                                 }}
//                                                 style={{
//                                                     height: '20px',
//                                                     fontSize: '0.75rem',
//                                                     padding: '0 4px',
//                                                     backgroundColor: '#ffffff'
//                                                 }}
//                                             />
//                                         </td>
//                                         <td width="8%" style={{ padding: '2px', backgroundColor: '#ffffff' }}>
//                                             <input
//                                                 type="number"
//                                                 className="form-control form-control-sm"
//                                                 placeholder="Qty"
//                                                 id='selectedItemQuantity'
//                                                 value={selectedItemQuantity}
//                                                 onChange={(e) => {
//                                                     const value = parseFloat(e.target.value) || 0;
//                                                     setSelectedItemQuantity(value);
//                                                 }}
//                                                 onFocus={(e) => e.target.select()}
//                                                 onKeyDown={(e) => {
//                                                     if ((e.key === 'Tab' || e.key === 'Enter')) {
//                                                         e.preventDefault();
//                                                         document.getElementById('selectedItemRate').focus();
//                                                     }
//                                                 }}
//                                                 style={{
//                                                     height: '20px',
//                                                     fontSize: '0.75rem',
//                                                     padding: '0 4px',
//                                                     backgroundColor: headerQuantityError ? '#fff5f5' : '#ffffff',
//                                                     borderColor: headerQuantityError ? '#dc3545' : '#ced4da'
//                                                 }}
//                                             />
//                                             {headerQuantityError && (
//                                                 <div className="invalid-feedback d-block small" style={{
//                                                     fontSize: '0.65rem',
//                                                     color: '#dc3545',
//                                                     fontWeight: 'bold'
//                                                 }}>
//                                                     {headerQuantityError}
//                                                 </div>
//                                             )}
//                                         </td>
//                                         <td width="8%" style={{
//                                             padding: '2px',
//                                             fontSize: '0.75rem',
//                                             textAlign: 'center',
//                                             backgroundColor: '#ffffff'
//                                         }}>
//                                             {selectedItemForInsert ? (selectedItemForInsert.unit?.name || 'N/A') : '-'}
//                                         </td>
//                                         <td width="8%" style={{ padding: '2px', backgroundColor: '#ffffff' }}>
//                                             <input
//                                                 type="number"
//                                                 className="form-control form-control-sm"
//                                                 placeholder="Rate"
//                                                 id='selectedItemRate'
//                                                 value={Math.round(selectedItemRate * 100) / 100}
//                                                 onChange={(e) => setSelectedItemRate(e.target.value)}
//                                                 onFocus={(e) => e.target.select()}
//                                                 onKeyDown={(e) => {
//                                                     if ((e.key === 'Tab' || e.key === 'Enter')) {
//                                                         e.preventDefault();
//                                                         document.getElementById('insertButton').focus();
//                                                     }
//                                                 }}
//                                                 style={{
//                                                     height: '20px',
//                                                     fontSize: '0.75rem',
//                                                     padding: '0 4px',
//                                                     backgroundColor: '#ffffff'
//                                                 }}
//                                             />
//                                         </td>
//                                         <td width="10%" style={{
//                                             padding: '2px',
//                                             fontSize: '0.75rem',
//                                             textAlign: 'center',
//                                             backgroundColor: '#ffffff'
//                                         }}>
//                                             Rs. {formatter.format(selectedItemQuantity * selectedItemRate)}
//                                         </td>
//                                         <td width="10%" style={{
//                                             padding: '2px',
//                                             textAlign: 'center',
//                                             backgroundColor: '#ffffff'
//                                         }}>
//                                             <button
//                                                 type="button"
//                                                 id="insertButton"
//                                                 className="btn btn-sm btn-success py-0 px-2"
//                                                 onClick={insertSelectedItem}
//                                                 disabled={!selectedItemForInsert || !selectedItemForInsert.batchInfo}
//                                                 title={!selectedItemForInsert?.batchInfo ? "Select batch first" : "Insert item below"}
//                                                 onKeyDown={(e) => {
//                                                     if ((e.key === 'Tab' || e.key === 'Enter')) {
//                                                         e.preventDefault();
//                                                         insertSelectedItem();
//                                                     }
//                                                 }}
//                                                 style={{
//                                                     height: '20px',
//                                                     fontSize: '0.7rem',
//                                                     fontWeight: 'bold',
//                                                     backgroundColor: selectedItemForInsert?.batchInfo ? '#198754' : '#6c757d',
//                                                     borderColor: selectedItemForInsert?.batchInfo ? '#198754' : '#6c757d',
//                                                     cursor: selectedItemForInsert?.batchInfo ? 'pointer' : 'not-allowed'
//                                                 }}
//                                             >
//                                                 INSERT
//                                             </button>
//                                         </td>
//                                     </tr>

//                                     {/* Column headers row */}
//                                     <tr style={{
//                                         height: '26px',
//                                         backgroundColor: '#e9ecef',
//                                         position: 'sticky',
//                                         top: '26px',
//                                         zIndex: 9
//                                     }}>
//                                         <th width="5%" style={{ padding: '3px', fontSize: '0.75rem' }}>S.N.</th>
//                                         <th width="8%" style={{ padding: '3px', fontSize: '0.75rem' }}>#</th>
//                                         <th width="8%" style={{ padding: '3px', fontSize: '0.75rem' }}>HSN</th>
//                                         <th width="20%" style={{ padding: '3px', fontSize: '0.75rem' }}>Description of Goods</th>
//                                         <th width="8%" style={{ padding: '3px', fontSize: '0.75rem' }}>Batch</th>
//                                         <th width="8%" style={{ padding: '3px', fontSize: '0.75rem' }}>Expiry</th>
//                                         <th width="8%" style={{ padding: '3px', fontSize: '0.75rem' }}>Qty</th>
//                                         <th width="8%" style={{ padding: '3px', fontSize: '0.75rem' }}>Unit</th>
//                                         <th width="8%" style={{ padding: '3px', fontSize: '0.75rem' }}>Price</th>
//                                         <th width="10%" style={{ padding: '3px', fontSize: '0.75rem' }}>Amount</th>
//                                         <th width="10%" style={{ padding: '3px', fontSize: '0.75rem' }}>Action</th>
//                                     </tr>
//                                 </thead>
//                                 <tbody id="items" style={{ backgroundColor: '#fff' }}>
//                                     {items.map((item, index) => (
//                                         <tr key={index} className={`item ${item.vatStatus === 'vatable' ? 'vatable-item' : 'non-vatable-item'}`} style={{ height: '26px' }}>
//                                             <td style={{ padding: '3px', fontSize: '0.75rem' }}>{index + 1}</td>
//                                             <td style={{ padding: '3px', fontSize: '0.75rem' }}>{item.uniqueNumber}</td>
//                                             <td style={{ padding: '3px', fontSize: '0.75rem' }}>
//                                                 <input type="hidden" name={`items[${index}][hscode]`} value={item.hscode} />
//                                                 {item.hscode}
//                                             </td>
//                                             <td style={{ padding: '3px', fontSize: '0.75rem' }}>
//                                                 <input type="hidden" name={`items[${index}][item]`} value={item.item?._id || item.item} />
//                                                 {item.name}
//                                             </td>
//                                             <td style={{ padding: '3px' }}>
//                                                 <input
//                                                     type="text"
//                                                     name={`items[${index}][batchNumber]`}
//                                                     className="form-control form-control-sm"
//                                                     id={`batchNumber-${index}`}
//                                                     value={item.batchNumber}
//                                                     onChange={(e) => updateItemField(index, 'batchNumber', e.target.value)}
//                                                     required
//                                                     onFocus={(e) => {
//                                                         e.target.select();
//                                                     }}
//                                                     onKeyDown={(e) => {
//                                                         if (e.key === 'Enter') {
//                                                             e.preventDefault();
//                                                             document.getElementById(`expiryDate-${index}`)?.focus();
//                                                         }
//                                                     }}
//                                                     style={{
//                                                         height: '20px',
//                                                         fontSize: '0.75rem',
//                                                         padding: '0 4px'
//                                                     }}
//                                                 />
//                                             </td>
//                                             <td style={{ padding: '3px' }}>
//                                                 <input
//                                                     type="date"
//                                                     name={`items[${index}][expiryDate]`}
//                                                     className="form-control form-control-sm"
//                                                     id={`expiryDate-${index}`}
//                                                     value={item.expiryDate}
//                                                     onChange={(e) => updateItemField(index, 'expiryDate', e.target.value)}
//                                                     required
//                                                     onKeyDown={(e) => {
//                                                         if (e.key === 'Enter') {
//                                                             e.preventDefault();
//                                                             document.getElementById(`quantity-${index}`)?.focus();
//                                                         }
//                                                     }}
//                                                     style={{
//                                                         height: '20px',
//                                                         fontSize: '0.75rem',
//                                                         padding: '0 4px'
//                                                     }}
//                                                 />
//                                             </td>
//                                             <td style={{ padding: '3px' }}>
//                                                 <input
//                                                     type="number"
//                                                     name={`items[${index}][quantity]`}
//                                                     className="form-control form-control-sm"
//                                                     id={`quantity-${index}`}
//                                                     value={item.quantity}
//                                                     onChange={(e) => updateItemField(index, 'quantity', e.target.value)}
//                                                     required
//                                                     onFocus={(e) => {
//                                                         e.target.select();
//                                                     }}
//                                                     onKeyDown={(e) => {
//                                                         if (e.key === 'Enter') {
//                                                             e.preventDefault();
//                                                             document.getElementById(`puPrice-${index}`)?.focus();
//                                                         }
//                                                     }}
//                                                     style={{
//                                                         height: '20px',
//                                                         fontSize: '0.75rem',
//                                                         padding: '0 4px'
//                                                     }}
//                                                 />
//                                             </td>
//                                             <td className="text-nowrap" style={{ padding: '3px', fontSize: '0.75rem' }}>
//                                                 {item.unit?.name}
//                                                 <input type="hidden" name={`items[${index}][unit]`} value={item.unit?._id} />
//                                             </td>
//                                             <td style={{ padding: '3px' }}>
//                                                 <input
//                                                     type="number"
//                                                     name={`items[${index}][puPrice]`}
//                                                     className="form-control form-control-sm"
//                                                     id={`puPrice-${index}`}
//                                                     value={Math.round(item.puPrice * 100) / 100}
//                                                     onChange={(e) => updateItemField(index, 'puPrice', e.target.value)}
//                                                     onFocus={(e) => {
//                                                         e.target.select();
//                                                     }}
//                                                     onKeyDown={(e) => {
//                                                         if (e.key === 'Enter') {
//                                                             e.preventDefault();
//                                                             itemSearchRef.current?.focus();
//                                                         }
//                                                     }}
//                                                     style={{
//                                                         height: '20px',
//                                                         fontSize: '0.75rem',
//                                                         padding: '0 4px'
//                                                     }}
//                                                 />
//                                             </td>
//                                             <td className="item-amount" style={{ padding: '3px', fontSize: '0.75rem' }}>{formatter.format(item.amount)}</td>
//                                             <td className="text-center" style={{ padding: '2px', whiteSpace: 'nowrap' }}>
//                                                 <button
//                                                     type="button"
//                                                     className="btn btn-sm btn-info py-0 px-1"
//                                                     onClick={() => fetchLastTransactions(item.item)}
//                                                     title="View last transactions"
//                                                     disabled={isLoadingTransactions}
//                                                     style={{
//                                                         height: '18px',
//                                                         width: '18px',
//                                                         minWidth: '18px',
//                                                         fontSize: '0.6rem',
//                                                         marginRight: '2px',
//                                                         backgroundColor: '#0dcaf0',
//                                                         borderColor: '#0dcaf0'
//                                                     }}
//                                                 >
//                                                     {isLoadingTransactions ? (
//                                                         <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" style={{ width: "8px", height: "8px" }}></span>
//                                                     ) : (
//                                                         <i className="bi bi-clock-history"></i>
//                                                     )}
//                                                 </button>
//                                                 <button
//                                                     type="button"
//                                                     className="btn btn-sm btn-danger py-0 px-1"
//                                                     onClick={() => removeItem(index)}
//                                                     style={{
//                                                         height: '18px',
//                                                         width: '18px',
//                                                         minWidth: '18px',
//                                                         fontSize: '0.6rem',
//                                                         marginLeft: '2px',
//                                                         backgroundColor: '#dc3545',
//                                                         borderColor: '#dc3545'
//                                                     }}
//                                                 >
//                                                     <i className="bi bi-trash"></i>
//                                                 </button>
//                                             </td>
//                                             <td className="d-none">
//                                                 <input type="hidden" name={`items[${index}][vatStatus]`} value={item.vatStatus} />
//                                                 <input type="hidden" name={`items[${index}][puPrice]`} value={item.puPrice} />
//                                                 <input type="hidden" name={`items[${index}][netPuPrice]`} value={item.netPuPrice} />
//                                                 <input type="hidden" name={`items[${index}][uniqueUuId]`} value={item.uniqueUuId} />
//                                             </td>
//                                         </tr>
//                                     ))}

//                                     {/* Empty rows placeholder when no items */}
//                                     {items.length === 0 && (
//                                         <tr style={{ height: '24px' }}>
//                                             <td colSpan="11" className="text-center text-muted py-1" style={{ fontSize: '0.75rem' }}>
//                                                 No items added yet. Use the search box above to add items.
//                                             </td>
//                                         </tr>
//                                     )}
//                                 </tbody>
//                             </table>
//                         </div>

//                         <div className="table-responsive mb-2">
//                             <table className="table table-sm table-bordered mb-1">
//                                 <thead>
//                                     <tr>
//                                         <th colSpan="6" className="text-center bg-light py-1" style={{ padding: '2px' }}>Bill Details</th>
//                                     </tr>
//                                 </thead>
//                                 <tbody>
//                                     {/* Row 1: Sub Total, Discount %, Discount Amount */}
//                                     <tr>
//                                         <td style={{ width: '15%', padding: '1px' }}>
//                                             <label className="form-label mb-0" style={{ fontSize: '0.8rem' }}>Sub Total:</label>
//                                         </td>
//                                         <td style={{ width: '20%', padding: '1px' }}>
//                                             <p className="form-control-plaintext mb-0" style={{ fontSize: '0.8rem' }}>Rs. {totals.subTotal.toFixed(2)}</p>
//                                         </td>
//                                         <td style={{ width: '15%', padding: '1px' }}>
//                                             <label className="form-label mb-0" style={{ fontSize: '0.8rem' }}>Discount %:</label>
//                                         </td>
//                                         <td style={{ width: '20%', padding: '1px' }}>
//                                             <div className="position-relative">
//                                                 <input
//                                                     type="number"
//                                                     step="any"
//                                                     name="discountPercentage"
//                                                     id="discountPercentage"
//                                                     className="form-control form-control-sm"
//                                                     value={formData.discountPercentage}
//                                                     onChange={handleDiscountPercentageChange}
//                                                     onFocus={(e) => {
//                                                         e.target.select();
//                                                     }}
//                                                     onKeyDown={(e) => {
//                                                         if (e.key === 'Enter') {
//                                                             handleKeyDown(e, 'discountPercentage');
//                                                         }
//                                                     }}
//                                                     style={{
//                                                         height: '22px',
//                                                         fontSize: '0.875rem',
//                                                         paddingTop: '0.5rem',
//                                                         width: '100%'
//                                                     }}
//                                                 />
//                                             </div>
//                                         </td>
//                                         <td style={{ width: '15%', padding: '1px' }}>
//                                             <label className="form-label mb-0" style={{ fontSize: '0.8rem' }}>Discount (Rs.):</label>
//                                         </td>
//                                         <td style={{ width: '15%', padding: '1px' }}>
//                                             <div className="position-relative">
//                                                 <input
//                                                     type="number"
//                                                     step="any"
//                                                     name="discountAmount"
//                                                     id="discountAmount"
//                                                     value={formData.discountAmount}
//                                                     className="form-control form-control-sm"
//                                                     onChange={handleDiscountAmountChange}
//                                                     onFocus={(e) => {
//                                                         e.target.select();
//                                                     }}
//                                                     onKeyDown={(e) => {
//                                                         if (e.key === 'Enter') {
//                                                             handleKeyDown(e, 'discountAmount');
//                                                         }
//                                                     }}
//                                                     style={{
//                                                         height: '22px',
//                                                         fontSize: '0.875rem',
//                                                         paddingTop: '0.5rem',
//                                                         width: '100%'
//                                                     }}
//                                                 />
//                                             </div>
//                                         </td>
//                                     </tr>

//                                     {company.vatEnabled && formData.isVatExempt !== 'true' && (
//                                         <>
//                                             <tr id="taxableAmountRow">
//                                                 <td style={{ padding: '1px' }}>
//                                                     <label className="form-label mb-0" style={{ fontSize: '0.8rem' }}>Taxable Amount:</label>
//                                                 </td>
//                                                 <td style={{ padding: '1px' }}>
//                                                     <p className="form-control-plaintext mb-0" style={{ fontSize: '0.8rem' }}>Rs. {totals.taxableAmount.toFixed(2)}</p>
//                                                 </td>
//                                                 <td style={{ padding: '1px' }}>
//                                                     <label className="form-label mb-0" style={{ fontSize: '0.8rem' }}>VAT %:</label>
//                                                 </td>
//                                                 <td style={{ padding: '1px' }}>
//                                                     <div className="position-relative">
//                                                         <input
//                                                             type="number"
//                                                             name="vatPercentage"
//                                                             id="vatPercentage"
//                                                             className="form-control form-control-sm"
//                                                             value={formData.vatPercentage}
//                                                             readOnly
//                                                             onFocus={(e) => {
//                                                                 e.target.select();
//                                                             }}
//                                                             onKeyDown={(e) => {
//                                                                 if (e.key === 'Enter') {
//                                                                     handleKeyDown(e, 'vatPercentage');
//                                                                 }
//                                                             }}
//                                                             style={{
//                                                                 height: '22px',
//                                                                 fontSize: '0.875rem',
//                                                                 paddingTop: '0.5rem',
//                                                                 width: '100%',
//                                                                 backgroundColor: '#f8f9fa'
//                                                             }}
//                                                         />
//                                                     </div>
//                                                 </td>
//                                                 <td style={{ padding: '1px' }}>
//                                                     <label className="form-label mb-0" style={{ fontSize: '0.8rem' }}>VAT Amount:</label>
//                                                 </td>
//                                                 <td style={{ padding: '1px' }}>
//                                                     <p className="form-control-plaintext mb-0" style={{ fontSize: '0.8rem' }}>Rs. {totals.vatAmount.toFixed(2)}</p>
//                                                 </td>
//                                             </tr>
//                                         </>
//                                     )}

//                                     {/* Row 3: Round Off, Total Amount, In Words */}
//                                     <tr>
//                                         <td style={{ padding: '1px' }}>
//                                             <label className="form-label mb-0" style={{ fontSize: '0.8rem' }}>Round Off:</label>
//                                         </td>
//                                         <td style={{ padding: '1px' }}>
//                                             <div className="position-relative">
//                                                 <input
//                                                     type="number"
//                                                     className="form-control form-control-sm"
//                                                     step="any"
//                                                     id="roundOffAmount"
//                                                     name="roundOffAmount"
//                                                     value={formData.roundOffAmount}
//                                                     onChange={(e) => setFormData({ ...formData, roundOffAmount: e.target.value })}
//                                                     onFocus={(e) => {
//                                                         e.target.select();
//                                                     }}
//                                                     onKeyDown={(e) => {
//                                                         if (e.key === 'Enter') {
//                                                             e.preventDefault();
//                                                             document.getElementById('saveBill')?.focus();
//                                                         }
//                                                     }}
//                                                     style={{
//                                                         height: '22px',
//                                                         fontSize: '0.875rem',
//                                                         paddingTop: '0.5rem',
//                                                         width: '100%'
//                                                     }}
//                                                 />
//                                                 <label
//                                                     className="position-absolute"
//                                                     style={{
//                                                         top: '-0.4rem',
//                                                         left: '0.5rem',
//                                                         fontSize: '0.7rem',
//                                                         backgroundColor: 'white',
//                                                         padding: '0 0.25rem',
//                                                         color: '#6c757d',
//                                                         fontWeight: '500'
//                                                     }}
//                                                 >
//                                                     Rs.
//                                                 </label>
//                                             </div>
//                                         </td>
//                                         <td style={{ padding: '1px' }}>
//                                             <label className="form-label mb-0" style={{ fontSize: '0.8rem' }}>Total Amount:</label>
//                                         </td>
//                                         <td style={{ padding: '1px' }}>
//                                             <p className="form-control-plaintext mb-0" style={{ fontSize: '0.8rem' }}>Rs. {totals.totalAmount.toFixed(2)}</p>
//                                         </td>
//                                         <td style={{ padding: '1px' }}>
//                                             <label className="form-label mb-0" style={{ fontSize: '0.8rem' }}>In Words:</label>
//                                         </td>
//                                         <td style={{ padding: '1px' }}>
//                                             <div
//                                                 className="form-control-plaintext mb-0"
//                                                 style={{
//                                                     fontSize: '0.7rem',
//                                                     lineHeight: '1.1',
//                                                     maxHeight: '44px',
//                                                     overflow: 'hidden',
//                                                     textOverflow: 'ellipsis',
//                                                     display: '-webkit-box',
//                                                     WebkitLineClamp: 2,
//                                                     WebkitBoxOrient: 'vertical',
//                                                     wordBreak: 'break-word',
//                                                     whiteSpace: 'normal'
//                                                 }}
//                                                 id="amountInWords"
//                                                 title={convertToRupeesAndPaisa(totals.totalAmount) + " Only."}
//                                             >
//                                                 {convertToRupeesAndPaisa(totals.totalAmount)} Only.
//                                             </div>
//                                         </td>
//                                     </tr>
//                                 </tbody>
//                             </table>
//                         </div>

//                         {/* Action Buttons */}
//                         <div className="row g-2 mb-2">
//                             {/* Checkbox and Action Buttons */}
//                             <div className="col-12">
//                                 <div className="d-flex justify-content-between align-items-center h-100">
//                                     {/* Print After Save Checkbox */}
//                                     <div className="form-check mb-0 d-flex align-items-center">
//                                         <input
//                                             className="form-check-input mt-0"
//                                             type="checkbox"
//                                             id="printAfterSave"
//                                             checked={printAfterSave}
//                                             onChange={handlePrintAfterSaveChange}
//                                             style={{
//                                                 height: '14px',
//                                                 width: '14px'
//                                             }}
//                                         />
//                                         <label
//                                             className="form-check-label ms-2"
//                                             htmlFor="printAfterSave"
//                                             style={{
//                                                 fontSize: '0.8rem',
//                                                 marginBottom: '0'
//                                             }}
//                                         >
//                                             Print after save
//                                         </label>
//                                     </div>

//                                     {/* Action Buttons */}
//                                     <div className="d-flex gap-2">
//                                         <Button
//                                             variant="secondary"
//                                             className="btn-sm d-flex align-items-center"
//                                             onClick={handleBack}
//                                             disabled={isSaving}
//                                             style={{
//                                                 height: '26px',
//                                                 padding: '0 12px',
//                                                 fontSize: '0.8rem',
//                                                 fontWeight: '500'
//                                             }}
//                                         >
//                                             <BiArrowBack className="me-1" style={{ fontSize: '0.9rem' }} /> Back
//                                         </Button>
//                                         <button
//                                             type="submit"
//                                             className="btn btn-primary btn-sm d-flex align-items-center"
//                                             id="saveBill"
//                                             onClick={(e) => handleSubmit(e, printAfterSave)}
//                                             disabled={isSaving}
//                                             onKeyDown={(e) => {
//                                                 if (e.key === 'Enter') {
//                                                     e.preventDefault();
//                                                     handleSubmit(e, printAfterSave);
//                                                 }
//                                             }}
//                                             style={{
//                                                 height: '26px',
//                                                 padding: '0 16px',
//                                                 fontSize: '0.8rem',
//                                                 fontWeight: '500'
//                                             }}
//                                         >
//                                             {isSaving ? (
//                                                 <>
//                                                     <span
//                                                         className="spinner-border spinner-border-sm me-2"
//                                                         role="status"
//                                                         aria-hidden="true"
//                                                         style={{ width: '10px', height: '10px' }}
//                                                     ></span>
//                                                     Updating...
//                                                 </>
//                                             ) : (
//                                                 <>
//                                                     <i className="bi bi-save me-1" style={{ fontSize: '0.9rem' }}></i> Update
//                                                 </>
//                                             )}
//                                         </button>
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>
//                     </form>
//                 </div>
//             </div>

//             {/* Account Modal */}
//             {showAccountModal && (
//                 <div
//                     className="modal fade show"
//                     id="accountModal"
//                     tabIndex="-1"
//                     style={{ display: 'block' }}
//                     onKeyDown={(e) => {
//                         if (e.key === 'Escape') {
//                             handleAccountModalClose();
//                             setTimeout(() => {
//                                 document.getElementById('address').focus();
//                             }, 0);
//                         }
//                     }}
//                 >
//                     <div className="modal-dialog modal-xl modal-dialog-centered">
//                         <div className="modal-content" style={{ height: '400px' }}>
//                             <div className="modal-header py-1">
//                                 <h5 className="modal-title" id="accountModalLabel" style={{ fontSize: '0.9rem' }}>
//                                     Select an Account
//                                 </h5>
//                                 <small className="ms-auto text-muted" style={{ fontSize: '0.7rem' }}>
//                                     {totalAccounts > 0 ? `${accounts.length} of ${totalAccounts} accounts shown` : 'Loading accounts...'}
//                                 </small>
//                                 <button
//                                     type="button"
//                                     className="btn-close"
//                                     onClick={handleAccountModalClose}
//                                     aria-label="Close"
//                                     style={{ fontSize: '0.6rem', padding: '0.25rem' }}
//                                 ></button>
//                             </div>
//                             <div className="p-2 bg-white sticky-top">
//                                 <input
//                                     type="text"
//                                     id="searchAccount"
//                                     className="form-control form-control-sm"
//                                     placeholder="Search Account... (Press F6 to create new account)"
//                                     autoFocus
//                                     autoComplete='off'
//                                     value={accountSearchQuery}
//                                     onChange={handleAccountSearch}
//                                     onKeyDown={(e) => {
//                                         if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
//                                             e.preventDefault();
//                                             const firstAccountItem = document.querySelector('.account-item');
//                                             if (firstAccountItem) {
//                                                 firstAccountItem.focus();
//                                             }
//                                         } else if (e.key === 'Enter') {
//                                             e.preventDefault();
//                                             const firstAccountItem = document.querySelector('.account-item.active');
//                                             if (firstAccountItem) {
//                                                 const accountId = firstAccountItem.getAttribute('data-account-id');
//                                                 const account = accounts.find(a => a._id === accountId);
//                                                 if (account) {
//                                                     selectAccount(account);
//                                                     document.getElementById('address').focus();
//                                                 }
//                                             }
//                                         } else if (e.key === 'F6') {
//                                             e.preventDefault();
//                                             setShowAccountCreationModal(true);
//                                             handleAccountModalClose();
//                                         }
//                                     }}
//                                     onFocus={() => {
//                                         if (accountLastSearchQuery && !accountSearchQuery && accountShouldShowLastSearchResults) {
//                                         }
//                                     }}
//                                     ref={accountSearchRef}
//                                     style={{
//                                         height: '24px',
//                                         fontSize: '0.75rem',
//                                         padding: '0.25rem 0.5rem'
//                                     }}
//                                 />
//                             </div>
//                             <div className="modal-body p-0">
//                                 <div style={{ height: 'calc(320px - 40px)' }}>
//                                     <VirtualizedAccountList
//                                         accounts={accounts}
//                                         onAccountClick={(account) => {
//                                             selectAccount(account);
//                                             document.getElementById('address').focus();
//                                         }}
//                                         searchRef={accountSearchRef}
//                                         hasMore={hasMoreAccountResults}
//                                         isSearching={isAccountSearching}
//                                         onLoadMore={loadMoreAccounts}
//                                         totalAccounts={totalAccounts}
//                                         page={accountSearchPage}
//                                         searchQuery={accountShouldShowLastSearchResults ? accountLastSearchQuery : accountSearchQuery}
//                                     />
//                                 </div>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             )}

//             {/* Transaction Modal */}
//             {showTransactionModal && (
//                 <div className="modal fade show" id="transactionModal" tabIndex="-1" style={{ display: 'block' }} role="dialog" aria-labelledby="transactionModalLabel" aria-modal="true">
//                     <div className="modal-dialog modal-xl modal-dialog-centered">
//                         <div className="modal-content">
//                             <div className="modal-header py-1 px-3" style={{ minHeight: '40px' }}>
//                                 {/* <h6 className="modal-title mb-0" id="transactionModalLabel" style={{ fontSize: '1rem' }}>
//                                     Last Transactions
//                                 </h6> */}

//                                 <h6 className="modal-title mb-0" id="transactionModalLabel" style={{ fontSize: '1rem' }}>
//                                     {transactionType === 'purchase' ? 'Last Purchase Transactions' : 'Last Transactions'}
//                                 </h6>
//                                 <button
//                                     type="button"
//                                     className="close p-0"
//                                     onClick={handleTransactionModalClose}
//                                     aria-label="Close"
//                                     style={{
//                                         margin: '0',
//                                         fontSize: '1.2rem',
//                                         lineHeight: '1',
//                                         background: 'none',
//                                         border: 'none'
//                                     }}
//                                 >
//                                     <span aria-hidden="true">&times;</span>
//                                 </button>
//                             </div>

//                             <div className="modal-body p-0">
//                                 <div className="table-responsive" style={{ maxHeight: '200px', overflowY: 'auto' }}>
//                                     <table className="table table-sm table-hover mb-0 small">
//                                         <thead>
//                                             <tr className="sticky-top bg-light" style={{ top: 0 }}>
//                                                 <th style={{
//                                                     width: '5%',
//                                                     padding: '0.15rem 0.3rem',
//                                                     fontSize: '0.75rem',
//                                                     whiteSpace: 'nowrap'
//                                                 }}>#</th>
//                                                 <th style={{
//                                                     width: '15%',
//                                                     padding: '0.15rem 0.3rem',
//                                                     fontSize: '0.75rem',
//                                                     whiteSpace: 'nowrap'
//                                                 }}>Date</th>
//                                                 <th style={{
//                                                     width: '15%',
//                                                     padding: '0.15rem 0.3rem',
//                                                     fontSize: '0.75rem',
//                                                     whiteSpace: 'nowrap'
//                                                 }}>Inv. No.</th>
//                                                 <th style={{
//                                                     width: '10%',
//                                                     padding: '0.15rem 0.3rem',
//                                                     fontSize: '0.75rem',
//                                                     whiteSpace: 'nowrap'
//                                                 }}>Type</th>
//                                                 <th style={{
//                                                     width: '10%',
//                                                     padding: '0.15rem 0.3rem',
//                                                     fontSize: '0.75rem',
//                                                     whiteSpace: 'nowrap'
//                                                 }}>A/c Type</th>
//                                                 <th style={{
//                                                     width: '10%',
//                                                     padding: '0.15rem 0.3rem',
//                                                     fontSize: '0.75rem',
//                                                     whiteSpace: 'nowrap'
//                                                 }}>Pay.Mode</th>
//                                                 <th style={{
//                                                     width: '10%',
//                                                     padding: '0.15rem 0.3rem',
//                                                     fontSize: '0.75rem',
//                                                     whiteSpace: 'nowrap',
//                                                     textAlign: 'right'
//                                                 }}>Qty.</th>
//                                                 <th style={{
//                                                     width: '10%',
//                                                     padding: '0.15rem 0.3rem',
//                                                     fontSize: '0.75rem',
//                                                     whiteSpace: 'nowrap'
//                                                 }}>Unit</th>
//                                                 <th style={{
//                                                     width: '15%',
//                                                     padding: '0.15rem 0.3rem',
//                                                     fontSize: '0.75rem',
//                                                     whiteSpace: 'nowrap',
//                                                     textAlign: 'right'
//                                                 }}>Rate</th>
//                                             </tr>
//                                         </thead>
//                                         <tbody>
//                                             {transactions.length > 0 ? (
//                                                 transactions.map((transaction, index) => (
//                                                     <tr
//                                                         key={index}
//                                                         style={{
//                                                             cursor: 'pointer',
//                                                             height: '28px',
//                                                             fontSize: '0.8rem'
//                                                         }}
//                                                         onClick={() => {
//                                                             if (transaction.purchaseReturnBillId && transaction.purchaseReturnBillId._id) {
//                                                                 navigate(`/purchase-return/${transaction.purchaseReturnBillId._id}/print`);
//                                                             }
//                                                         }}
//                                                         onKeyDown={(e) => {
//                                                             if (e.key === 'Enter') {
//                                                                 e.preventDefault();
//                                                                 if (transaction.purchaseReturnBillId && transaction.purchaseReturnBillId._id) {
//                                                                     navigate(`/purchase-return/${transaction.purchaseReturnBillId._id}/print`);
//                                                                 }
//                                                             } else if (e.key === 'Tab') {
//                                                                 e.preventDefault();
//                                                                 continueButtonRef.current?.focus();
//                                                             }
//                                                         }}
//                                                         tabIndex={0}
//                                                     >
//                                                         <td style={{ padding: '0.15rem 0.3rem' }}>{index + 1}</td>
//                                                         <td style={{ padding: '0.15rem 0.3rem', whiteSpace: 'nowrap' }}>
//                                                             {new NepaliDate(transaction.date).format('YYYY-MM-DD')}
//                                                         </td>
//                                                         <td style={{ padding: '0.15rem 0.3rem', fontWeight: '500' }}>
//                                                             {transaction.billNumber || 'N/A'}
//                                                         </td>
//                                                         <td style={{ padding: '0.15rem 0.3rem' }}>{transaction.type || 'N/A'}</td>
//                                                         <td style={{ padding: '0.15rem 0.3rem' }}>{transaction.purchaseSalesReturnType || 'N/A'}</td>
//                                                         <td style={{ padding: '0.15rem 0.3rem' }}>{transaction.paymentMode || 'N/A'}</td>
//                                                         <td style={{ padding: '0.15rem 0.3rem', textAlign: 'right' }}>{transaction.quantity || 0}</td>
//                                                         <td style={{ padding: '0.15rem 0.3rem' }}>{transaction.unit?.name || 'N/A'}</td>
//                                                         <td style={{ padding: '0.15rem 0.3rem', textAlign: 'right', fontWeight: '500' }}>
//                                                             Rs.{transaction.puPrice ? Math.round(transaction.puPrice * 100) / 100 : 0}
//                                                         </td>
//                                                     </tr>
//                                                 ))
//                                             ) : (
//                                                 <tr style={{ height: '28px' }}>
//                                                     <td colSpan="9" className="text-center text-muted align-middle" style={{ padding: '0.15rem 0.3rem' }}>
//                                                         No previous transactions found
//                                                     </td>
//                                                 </tr>
//                                             )}
//                                         </tbody>
//                                     </table>
//                                 </div>

//                                 {transactions.length > 5 && (
//                                     <div className="text-center py-1" style={{
//                                         fontSize: '0.7rem',
//                                         color: '#6c757d',
//                                         backgroundColor: '#f8f9fa',
//                                         borderTop: '1px solid #dee2e6'
//                                     }}>
//                                         Showing {transactions.length} transactions • Scroll to see more
//                                     </div>
//                                 )}
//                             </div>

//                             <div className="modal-footer py-1 px-3" style={{ minHeight: '45px' }}>
//                                 {/* Show Sales Transactions button only if currently viewing Purchase transactions */}
//                                 {transactionType === 'purchase' && (
//                                     <button
//                                         id="showSalesTransactions"
//                                         className="btn btn-info btn-sm py-1 px-3"
//                                         onClick={fetchSalesTransactions}
//                                         style={{
//                                             fontSize: '0.8rem',
//                                             lineHeight: '1.2',
//                                             minHeight: '28px'
//                                         }}
//                                     >
//                                         <i className="bi bi-receipt"></i> Show Sales Transactions
//                                     </button>
//                                 )}

//                                 {/* Show Purchase Transactions button only if currently viewing Sales transactions */}
//                                 {transactionType === 'sales' && (
//                                     <button
//                                         id="showPurchaseTransactions"
//                                         className="btn btn-info btn-sm py-1 px-3"
//                                         onClick={fetchPurchaseTransactions}
//                                         style={{
//                                             fontSize: '0.8rem',
//                                             lineHeight: '1.2',
//                                             minHeight: '28px'
//                                         }}
//                                     >
//                                         <i className="bi bi-cart"></i> Show Purchase Transactions
//                                     </button>
//                                 )}

//                                 <button
//                                     ref={continueButtonRef}
//                                     type="button"
//                                     className="btn btn-primary btn-sm py-1 px-3"
//                                     onClick={handleTransactionModalClose}
//                                     onKeyDown={(e) => {
//                                         if (e.key === 'Enter') {
//                                             e.preventDefault();
//                                             handleTransactionModalClose();
//                                         } else if (e.key === 'Tab' && !e.shiftKey) {
//                                             e.preventDefault();
//                                             const firstTransactionRow = document.querySelector('tbody tr');
//                                             if (firstTransactionRow) {
//                                                 firstTransactionRow.focus();
//                                             }
//                                         }
//                                     }}
//                                     style={{
//                                         fontSize: '0.8rem',
//                                         lineHeight: '1.2',
//                                         minHeight: '28px'
//                                     }}
//                                 >
//                                     Continue
//                                 </button>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             )}

//             {/* Header Item Modal */}
//             {showHeaderItemModal && (
//                 <div
//                     className="modal fade show"
//                     id="headerItemModal"
//                     tabIndex="-1"
//                     style={{
//                         display: 'block',
//                         backgroundColor: 'rgba(0,0,0,0.5)',
//                         position: 'fixed',
//                         top: 0,
//                         left: 0,
//                         right: 0,
//                         bottom: 0,
//                         zIndex: 1050
//                     }}
//                 >
//                     <div
//                         className="modal-dialog modal-xl"
//                         style={{
//                             position: 'absolute',
//                             top: 'auto',
//                             bottom: '0',
//                             left: '50%',
//                             transform: 'translateX(-50%)',
//                             margin: '0',
//                             width: '90%',
//                             maxWidth: '90%'
//                         }}
//                     >
//                         <div
//                             className="modal-content"
//                             style={{
//                                 height: '35vh',
//                                 borderBottomLeftRadius: '0',
//                                 borderBottomRightRadius: '0',
//                                 borderTopLeftRadius: '0.5rem',
//                                 borderTopRightRadius: '0.5rem'
//                             }}
//                         >
//                             <div className="modal-header py-0">
//                                 <h5 className="modal-title" style={{ fontSize: '0.9rem' }}>Select Item</h5>
//                                 <div className="d-flex align-items-center" style={{ flex: 1, marginLeft: '10px' }}>
//                                     <div className="position-relative" style={{ width: '100%' }}>
//                                         <input
//                                             type="text"
//                                             className="form-control form-control-sm"
//                                             placeholder="Search items... (Press F6 to create new item)"
//                                             autoComplete='off'
//                                             value={headerSearchQuery}
//                                             onChange={(e) => {
//                                                 const query = e.target.value;
//                                                 setHeaderSearchQuery(query);
//                                                 if (query.trim() !== '' && headerShouldShowLastSearchResults) {
//                                                     setHeaderShouldShowLastSearchResults(false);
//                                                     setHeaderLastSearchQuery('');
//                                                 }
//                                             }}
//                                             autoFocus
//                                             onKeyDown={(e) => {
//                                                 if (e.key === 'ArrowDown') {
//                                                     e.preventDefault();
//                                                     const firstItem = document.querySelector('.dropdown-item');
//                                                     if (firstItem) {
//                                                         firstItem.focus();
//                                                     }
//                                                 } else if (e.key === 'Enter') {
//                                                     e.preventDefault();
//                                                     const activeItem = document.querySelector('.dropdown-item.active');

//                                                     if (activeItem) {
//                                                         const index = parseInt(activeItem.getAttribute('data-index'));
//                                                         const itemToAdd = headerSearchResults[index];
//                                                         if (itemToAdd) {
//                                                             selectItemForInsert(itemToAdd);
//                                                             setShowHeaderItemModal(false);
//                                                         }
//                                                     } else {
//                                                         if (!headerSearchQuery.trim()) {
//                                                             setShowHeaderItemModal(false);
//                                                             setTimeout(() => {
//                                                                 const discountInput = document.getElementById('discountPercentage');
//                                                                 if (discountInput) {
//                                                                     discountInput.focus();
//                                                                     discountInput.select();
//                                                                 }
//                                                             }, 50);
//                                                         }
//                                                     }
//                                                 } else if (e.key === 'F6') {
//                                                     e.preventDefault();
//                                                     setShowItemsModal(true);
//                                                     setShowHeaderItemModal(false);
//                                                     setHeaderSearchQuery('');
//                                                     setHeaderShouldShowLastSearchResults(false);
//                                                     setHeaderLastSearchQuery('');
//                                                 } else if (e.key === 'Escape') {
//                                                     e.preventDefault();
//                                                     setShowHeaderItemModal(false);
//                                                 }
//                                             }}
//                                             style={{
//                                                 height: '24px',
//                                                 fontSize: '0.75rem',
//                                                 padding: '0.25rem 0.5rem',
//                                                 width: '100%'
//                                             }}
//                                         />
//                                     </div>
//                                 </div>
//                                 <button
//                                     type="button"
//                                     className="btn-close"
//                                     onClick={handleHeaderItemModalClose}
//                                     aria-label="Close"
//                                     style={{ fontSize: '0.6rem', padding: '0.25rem' }}
//                                 ></button>
//                             </div>

//                             <div className="modal-body p-0">
//                                 <div style={{ height: 'calc(55vh - 120px)' }}>
//                                     <div
//                                         id="dropdownMenu"
//                                         className="w-100 h-100"
//                                         style={{
//                                             border: '1px solid #dee2e6',
//                                             borderRadius: '0.25rem',
//                                             overflow: 'hidden'
//                                         }}
//                                     >
//                                         <div className="dropdown-header" style={{
//                                             display: 'grid',
//                                             gridTemplateColumns: 'repeat(7, 1fr)',
//                                             alignItems: 'center',
//                                             padding: '0 8px',
//                                             height: '20px',
//                                             background: '#f0f0f0',
//                                             fontWeight: 'bold',
//                                             borderBottom: '1px solid #dee2e6',
//                                             position: 'sticky',
//                                             top: 0,
//                                             zIndex: 1,
//                                             fontSize: '0.7rem'
//                                         }}>
//                                             <div><strong>#</strong></div>
//                                             <div><strong>HSN</strong></div>
//                                             <div><strong>Description</strong></div>
//                                             <div><strong>Category</strong></div>
//                                             <div><strong>Stock</strong></div>
//                                             <div><strong>Unit</strong></div>
//                                             <div><strong>Rate</strong></div>
//                                         </div>

//                                         {(headerSearchResults.length > 0 || (headerShouldShowLastSearchResults && headerSearchResults.length > 0)) ? (
//                                             <VirtualizedItemListForPurchase
//                                                 items={headerSearchResults}
//                                                 onItemClick={(item) => {
//                                                     selectItemForInsert(item);
//                                                     setShowHeaderItemModal(false);
//                                                 }}
//                                                 searchRef={{ current: document.querySelector('#headerItemModal input[type="text"]') }}
//                                                 hasMore={hasMoreHeaderSearchResults}
//                                                 isSearching={isHeaderSearching}
//                                                 onLoadMore={loadMoreHeaderSearchItems}
//                                                 totalItems={totalHeaderSearchItems}
//                                                 page={headerSearchPage}
//                                                 searchQuery={headerShouldShowLastSearchResults ? headerLastSearchQuery : headerSearchQuery}
//                                                 setNotification={setNotification}
//                                             />
//                                         ) : (
//                                             <div className="text-center py-3 text-muted" style={{ fontSize: '0.75rem' }}>
//                                                 {headerSearchQuery ? 'No items found' : 'Type to search items'}
//                                                 <div className="small mt-1">
//                                                     <small className="text-info">Press F6 to create a new item</small>
//                                                 </div>
//                                             </div>
//                                         )}
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             )}

//             {/* Batch Modal */}
//             {showBatchModal && selectedItemForBatch && (
//                 <div className="modal fade show" id="batchModal" tabIndex="-1" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
//                     <div className="modal-dialog modal-lg modal-dialog-centered">
//                         <div className="modal-content" style={{ borderRadius: '8px', overflow: 'hidden', minHeight: '200px' }}>
//                             <div className="modal-header py-0" style={{ backgroundColor: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
//                                 <h5 className="modal-title mb-0 mx-auto fw-semibold" style={{ fontSize: '1.1rem' }}>
//                                     <i className="bi bi-box-seam me-2"></i>
//                                     {selectedItemForInsert === selectedItemForBatch
//                                         ? "Select Batch for Insertion"
//                                         : "Batch Information: " + selectedItemForBatch.name}
//                                 </h5>
//                                 <button
//                                     type="button"
//                                     className="btn-close position-absolute"
//                                     style={{ right: '1rem', top: '0.25rem' }}
//                                     onClick={() => {
//                                         setShowBatchModal(false);
//                                         setSelectedItemForBatch(null);
//                                         if (selectedItemForInsert === selectedItemForBatch) {
//                                             setSelectedItemForInsert(null);
//                                             setTimeout(() => {
//                                                 const searchInput = document.getElementById('headerItemSearch');
//                                                 if (searchInput) {
//                                                     searchInput.focus();
//                                                     searchInput.select();
//                                                 }
//                                             }, 100);
//                                         }
//                                     }}
//                                     aria-label="Close"
//                                 ></button>
//                             </div>
//                             <div className="modal-body p-0" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
//                                 {selectedItemForBatch.stockEntries.every(entry => entry.quantity === 0) ? (
//                                     <div className="d-flex justify-content-center align-items-center py-2">
//                                         <div className="alert alert-warning d-flex align-items-center py-2 px-3 mb-0 w-75 text-center">
//                                             <i className="bi bi-exclamation-triangle-fill me-2"></i>
//                                             <span>Out of stock</span>
//                                         </div>
//                                     </div>
//                                 ) : (
//                                     <div className="table-responsive" style={{
//                                         maxHeight: 'calc(55vh - 110px)',
//                                         overflowY: 'auto'
//                                     }} id="batchTableContainer">
//                                         <table className="table table-sm table-hover mb-0">
//                                             <thead className="table-light" style={{
//                                                 position: 'sticky',
//                                                 top: 0,
//                                                 zIndex: 1,
//                                                 backgroundColor: '#f8f9fa'
//                                             }}>
//                                                 <tr className="text-center">
//                                                     <th className="py-0" style={{ padding: '0px', fontSize: '0.75rem' }}>Batch No.</th>
//                                                     <th className="py-0" style={{ padding: '0px', fontSize: '0.75rem' }}>Expiry Date</th>
//                                                     <th className="py-0" style={{ padding: '0px', fontSize: '0.75rem' }}>Stock</th>
//                                                     <th className="py-0" style={{ padding: '0px', fontSize: '0.75rem' }}>P.P</th>
//                                                     <th className="py-0" style={{ padding: '0px', fontSize: '0.75rem' }}>C.P</th>
//                                                     <th className="py-0" style={{ padding: '0px', fontSize: '0.75rem' }}>%</th>
//                                                     <th className="py-0" style={{ padding: '0px', fontSize: '0.75rem' }}>MRP</th>
//                                                 </tr>
//                                             </thead>
//                                             <tbody>
//                                                 {selectedItemForBatch.stockEntries
//                                                     .filter(entry => entry.quantity > 0)
//                                                     .map((entry, index) => (
//                                                         <tr
//                                                             key={index}
//                                                             className={`batch-row text-center ${index === 0 ? 'bg-primary text-white' : ''}`}
//                                                             style={{
//                                                                 height: '24px',
//                                                                 cursor: 'pointer',
//                                                                 fontSize: '0.75rem'
//                                                             }}
//                                                             onClick={() => {
//                                                                 handleBatchRowClick({
//                                                                     batchNumber: entry.batchNumber,
//                                                                     expiryDate: entry.expiryDate,
//                                                                     puPrice: entry.puPrice,
//                                                                     netPuPrice: entry.netPuPrice,
//                                                                     uniqueUuId: entry.uniqueUuId
//                                                                 });
//                                                             }}
//                                                             tabIndex={0}
//                                                             onKeyDown={(e) => {
//                                                                 if (e.key === 'Enter') {
//                                                                     e.preventDefault();
//                                                                     handleBatchRowClick({
//                                                                         batchNumber: entry.batchNumber,
//                                                                         expiryDate: entry.expiryDate,
//                                                                         puPrice: entry.puPrice,
//                                                                         netPuPrice: entry.netPuPrice,
//                                                                         uniqueUuId: entry.uniqueUuId
//                                                                     });
//                                                                 } else if (e.key === 'ArrowDown') {
//                                                                     e.preventDefault();
//                                                                     const nextRow = e.currentTarget.nextElementSibling;
//                                                                     if (nextRow) {
//                                                                         e.currentTarget.classList.remove('bg-primary', 'text-white');
//                                                                         nextRow.classList.add('bg-primary', 'text-white');
//                                                                         nextRow.focus();
//                                                                         const tableContainer = document.getElementById('batchTableContainer');
//                                                                         if (tableContainer) {
//                                                                             const rowRect = nextRow.getBoundingClientRect();
//                                                                             const containerRect = tableContainer.getBoundingClientRect();
//                                                                             if (rowRect.bottom > containerRect.bottom) {
//                                                                                 nextRow.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
//                                                                             }
//                                                                         }
//                                                                     }
//                                                                 } else if (e.key === 'ArrowUp') {
//                                                                     e.preventDefault();
//                                                                     const prevRow = e.currentTarget.previousElementSibling;
//                                                                     if (prevRow) {
//                                                                         e.currentTarget.classList.remove('bg-primary', 'text-white');
//                                                                         prevRow.classList.add('bg-primary', 'text-white');
//                                                                         prevRow.focus();
//                                                                         const tableContainer = document.getElementById('batchTableContainer');
//                                                                         if (tableContainer) {
//                                                                             const rowRect = prevRow.getBoundingClientRect();
//                                                                             const containerRect = tableContainer.getBoundingClientRect();
//                                                                             if (rowRect.top < containerRect.top) {
//                                                                                 prevRow.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
//                                                                             }
//                                                                         }
//                                                                     } else {
//                                                                         e.currentTarget.focus();
//                                                                         e.currentTarget.classList.add('bg-primary', 'text-white');
//                                                                     }
//                                                                 } else if (e.key === 'Escape') {
//                                                                     e.preventDefault();
//                                                                     setShowBatchModal(false);
//                                                                     setSelectedItemForBatch(null);
//                                                                 }
//                                                             }}
//                                                             onFocus={(e) => {
//                                                                 document.querySelectorAll('.batch-row').forEach(row => {
//                                                                     row.classList.remove('bg-primary', 'text-white');
//                                                                 });
//                                                                 e.currentTarget.classList.add('bg-primary', 'text-white');
//                                                                 const tableContainer = document.getElementById('batchTableContainer');
//                                                                 if (tableContainer) {
//                                                                     const rowRect = e.currentTarget.getBoundingClientRect();
//                                                                     const containerRect = tableContainer.getBoundingClientRect();
//                                                                     if (rowRect.bottom > containerRect.bottom) {
//                                                                         e.currentTarget.scrollIntoView({ block: 'end', behavior: 'smooth' });
//                                                                     } else if (rowRect.top < containerRect.top) {
//                                                                         e.currentTarget.scrollIntoView({ block: 'start', behavior: 'smooth' });
//                                                                     }
//                                                                 }
//                                                             }}
//                                                             onMouseEnter={(e) => {
//                                                                 document.querySelectorAll('.batch-row').forEach(row => {
//                                                                     row.classList.remove('bg-primary', 'text-white');
//                                                                 });
//                                                                 e.currentTarget.classList.add('bg-primary', 'text-white');
//                                                                 const tableContainer = document.getElementById('batchTableContainer');
//                                                                 if (tableContainer) {
//                                                                     const rowRect = e.currentTarget.getBoundingClientRect();
//                                                                     const containerRect = tableContainer.getBoundingClientRect();
//                                                                     if (rowRect.bottom > containerRect.bottom) {
//                                                                         e.currentTarget.scrollIntoView({ block: 'end', behavior: 'smooth' });
//                                                                     } else if (rowRect.top < containerRect.top) {
//                                                                         e.currentTarget.scrollIntoView({ block: 'start', behavior: 'smooth' });
//                                                                     }
//                                                                 }
//                                                             }}
//                                                         >
//                                                             <td className="align-middle" style={{ padding: '3px' }}>{entry.batchNumber || 'N/A'}</td>
//                                                             <td className="align-middle" style={{ padding: '3px' }}>{formatDateForInput(entry.expiryDate)}</td>
//                                                             <td className="align-middle fw-semibold" style={{ padding: '3px' }}>
//                                                                 <span
//                                                                     style={{
//                                                                         color: entry.quantity <= 0 ? '#dc3545' :
//                                                                             entry.quantity < 5 ? '#ffc107' :
//                                                                                 '#198754'
//                                                                     }}
//                                                                 >
//                                                                     {entry.quantity}
//                                                                 </span>
//                                                             </td>
//                                                             <td className="align-middle" style={{ padding: '3px' }}>{Math.round(entry.puPrice * 100) / 100}</td>
//                                                             <td className="align-middle" style={{ padding: '3px' }}>{Math.round(entry.puPrice * 100) / 100}</td>
//                                                             <td className="align-middle" style={{ padding: '3px' }}>{Math.round(entry.marginPercentage * 100) / 100}</td>
//                                                             <td className="align-middle" style={{ padding: '3px' }}>{Math.round(entry.mrp * 100) / 100}</td>
//                                                         </tr>
//                                                     ))
//                                                 }
//                                             </tbody>
//                                         </table>
//                                         {selectedItemForBatch.stockEntries.filter(entry => entry.quantity > 0).length > 6 && (
//                                             <div className="text-center py-0" style={{
//                                                 fontSize: '0.5rem',
//                                                 color: '#6c757d',
//                                                 backgroundColor: '#f8f9fa',
//                                                 borderTop: '1px solid #dee2e6',
//                                                 position: 'sticky',
//                                                 bottom: 0
//                                             }}>
//                                             </div>
//                                         )}
//                                     </div>
//                                 )}
//                             </div>

//                             <div className="modal-footer py-0 justify-content-center" style={{
//                                 backgroundColor: '#f8f9fa',
//                                 borderTop: '1px solid #dee2e6',
//                             }}>
//                                 <button
//                                     type="button"
//                                     className="btn btn-primary btn-sm py-1 px-3 d-flex align-items-center"
//                                     onClick={() => {
//                                         setShowBatchModal(false);
//                                         setSelectedItemForBatch(null);
//                                         if (selectedItemForInsert === selectedItemForBatch) {
//                                             setSelectedItemForInsert(null);
//                                             setTimeout(() => {
//                                                 const searchInput = document.getElementById('headerItemSearch');
//                                                 if (searchInput) {
//                                                     searchInput.focus();
//                                                     searchInput.select();
//                                                 }
//                                             }, 100);
//                                         }
//                                     }}
//                                     onKeyDown={(e) => {
//                                         if (e.key === 'Enter') {
//                                             e.preventDefault();
//                                             setShowBatchModal(false);
//                                             setSelectedItemForBatch(null);
//                                             if (selectedItemForInsert === selectedItemForBatch) {
//                                                 setSelectedItemForInsert(null);
//                                                 setTimeout(() => {
//                                                     const searchInput = document.getElementById('headerItemSearch');
//                                                     if (searchInput) {
//                                                         searchInput.focus();
//                                                         searchInput.select();
//                                                     }
//                                                 }, 100);
//                                             }
//                                         } else if (e.key === 'Escape') {
//                                             e.preventDefault();
//                                             setShowBatchModal(false);
//                                             setSelectedItemForBatch(null);
//                                         }
//                                     }}
//                                     style={{
//                                         fontSize: '0.8rem',
//                                         lineHeight: '1.2',
//                                         minHeight: '28px'
//                                     }}
//                                 >
//                                     <i className="bi bi-x-circle me-1"></i>
//                                     Close
//                                 </button>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             )}

//             {/* Product modal */}
//             {showProductModal && (
//                 <ProductModal onClose={() => setShowProductModal(false)} />
//             )}

//             <NotificationToast
//                 show={notification.show}
//                 message={notification.message}
//                 type={notification.type}
//                 onClose={() => setNotification({ ...notification, show: false })}
//             />

//             {/* Account Creation Modal */}
//             {showAccountCreationModal && (
//                 <div className="modal fade show" tabIndex="-1" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.7)' }}>
//                     <div className="modal-dialog modal-fullscreen">
//                         <div className="modal-content" style={{ height: '95vh', margin: '2.5vh auto' }}>
//                             <div className="modal-header bg-primary text-white">
//                                 <h5 className="modal-title">Create New Account</h5>
//                                 <div className="d-flex align-items-center">
//                                     <button
//                                         type="button"
//                                         className="btn-close btn-close-white"
//                                         onClick={handleAccountCreationModalClose}
//                                     ></button>
//                                 </div>
//                             </div>
//                             <div className="modal-body p-0">
//                                 <iframe
//                                     src="/retailer/accounts"
//                                     title="Account Creation"
//                                     style={{ width: '100%', height: '100%', border: 'none' }}
//                                 />
//                             </div>
//                             <div className="modal-footer bg-light">
//                                 <button
//                                     type="button"
//                                     className="btn btn-secondary"
//                                     onClick={handleAccountCreationModalClose}
//                                 >
//                                     <i className="bi bi-arrow-left me-2"></i>Close
//                                 </button>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             )}

//             {/* Items Modal */}
//             {showItemsModal && (
//                 <div className="modal fade show" tabIndex="-1" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.7)' }}>
//                     <div className="modal-dialog modal-fullscreen">
//                         <div className="modal-content" style={{ height: '95vh', margin: '2.5vh auto' }}>
//                             <div className="modal-header bg-primary text-white">
//                                 <h5 className="modal-title">Create New Item</h5>
//                                 <div className="d-flex align-items-center">
//                                     <button
//                                         type="button"
//                                         className="btn-close btn-close-white"
//                                         onClick={() => setShowItemsModal(false)}
//                                     ></button>
//                                 </div>
//                             </div>
//                             <div className="modal-body p-0">
//                                 <iframe
//                                     src="/retailer/items"
//                                     title="Item Creation"
//                                     style={{ width: '100%', height: '100%', border: 'none' }}
//                                 />
//                             </div>
//                             <div className="modal-footer bg-light">
//                                 <button
//                                     type="button"
//                                     className="btn btn-secondary"
//                                     onClick={() => setShowItemsModal(false)}
//                                 >
//                                     <i className="bi bi-arrow-left me-2"></i>Close
//                                 </button>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// };

// function convertToRupeesAndPaisa(amount) {
//     const rupees = Math.floor(amount);
//     const paisa = Math.round((amount - rupees) * 100);

//     let words = '';

//     if (rupees > 0) {
//         words += numberToWords(rupees) + ' Rupees';
//     }

//     if (paisa > 0) {
//         words += (rupees > 0 ? ' and ' : '') + numberToWords(paisa) + ' Paisa';
//     }

//     return words || 'Zero Rupees';
// }

// function numberToWords(num) {
//     const ones = [
//         '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
//         'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
//         'Seventeen', 'Eighteen', 'Nineteen'
//     ];

//     const tens = [
//         '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
//     ];

//     const scales = ['', 'Thousand', 'Million', 'Billion'];

//     function convertHundreds(num) {
//         let words = '';

//         if (num > 99) {
//             words += ones[Math.floor(num / 100)] + ' Hundred ';
//             num %= 100;
//         }

//         if (num > 19) {
//             words += tens[Math.floor(num / 10)] + ' ';
//             num %= 10;
//         }

//         if (num > 0) {
//             words += ones[num] + ' ';
//         }

//         return words.trim();
//     }

//     if (num === 0) return 'Zero';
//     if (num < 0) return 'Negative ' + numberToWords(Math.abs(num));

//     let words = '';

//     for (let i = 0; i < scales.length; i++) {
//         let unit = Math.pow(1000, scales.length - i - 1);
//         let currentNum = Math.floor(num / unit);

//         if (currentNum > 0) {
//             words += convertHundreds(currentNum) + ' ' + scales[scales.length - i - 1] + ' ';
//         }

//         num %= unit;
//     }

//     return words.trim();
// }

// export default EditPurcRtn;

//---------------------------------------------------------------------end

// import React, { useState, useEffect, useRef } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import NepaliDate from 'nepali-date-converter';
// import axios from 'axios';
// import Header from '../Header';
// import NotificationToast from '../../NotificationToast';
// import '../../../stylesheet/retailer/purchase/EditPurchase.css';
// import '../../../stylesheet/noDateIcon.css';
// import ProductModal from '../dashboard/modals/ProductModal';
// import AccountBalanceDisplay from '../payment/AccountBalanceDisplay';
// import useDebounce from '../../../hooks/useDebounce';
// import VirtualizedItemListForPurchase from '../../VirtualizedItemListForPurchase';
// import VirtualizedAccountList from '../../VirtualizedAccountList';
// import { Button } from 'react-bootstrap';
// import { BiArrowBack } from 'react-icons/bi';

// const EditPurcRtn = () => {
//     const { id } = useParams();
//     const navigate = useNavigate();

//     // Search states
//     const [searchQuery, setSearchQuery] = useState('');
//     const [lastSearchQuery, setLastSearchQuery] = useState('');
//     const [shouldShowLastSearchResults, setShouldShowLastSearchResults] = useState(false);
//     const debouncedSearchQuery = useDebounce(searchQuery, 50);
//     const [showItemDropdown, setShowItemDropdown] = useState(false);
//     const [showAccountModal, setShowAccountModal] = useState(false);
//     const [transactions, setTransactions] = useState([]);
//     const [transactionType, setTransactionType] = useState('purchase');
//     const [showTransactionModal, setShowTransactionModal] = useState(false);
//     const [selectedItemIndex, setSelectedItemIndex] = useState(-1);

//     // Account search states
//     const [isAccountSearching, setIsAccountSearching] = useState(false);
//     const [accountSearchResults, setAccountSearchResults] = useState([]);
//     const [accountSearchPage, setAccountSearchPage] = useState(1);
//     const [hasMoreAccountResults, setHasMoreAccountResults] = useState(false);
//     const [totalAccounts, setTotalAccounts] = useState(0);
//     const [accountSearchQuery, setAccountSearchQuery] = useState('');
//     const [accountLastSearchQuery, setAccountLastSearchQuery] = useState('');
//     const [accountShouldShowLastSearchResults, setAccountShouldShowLastSearchResults] = useState(false);

//     // Item search states for header
//     const [isHeaderSearching, setIsHeaderSearching] = useState(false);
//     const [headerSearchQuery, setHeaderSearchQuery] = useState('');
//     const [showHeaderItemModal, setShowHeaderItemModal] = useState(false);
//     const [selectedItemForInsert, setSelectedItemForInsert] = useState(null);
//     const [selectedItemQuantity, setSelectedItemQuantity] = useState(0);
//     const [selectedItemRate, setSelectedItemRate] = useState(0);
//     const [selectedItemWsUnit, setSelectedItemWsUnit] = useState(1);
//     const [selectedItemBatchNumber, setSelectedItemBatchNumber] = useState('');
//     const [selectedItemExpiryDate, setSelectedItemExpiryDate] = useState('');
//     const [headerLastSearchQuery, setHeaderLastSearchQuery] = useState('');
//     const [headerShouldShowLastSearchResults, setHeaderShouldShowLastSearchResults] = useState(false);
//     const [headerSearchResults, setHeaderSearchResults] = useState([]);
//     const [headerSearchPage, setHeaderSearchPage] = useState(1);
//     const [hasMoreHeaderSearchResults, setHasMoreHeaderSearchResults] = useState(false);
//     const [totalHeaderSearchItems, setTotalHeaderSearchItems] = useState(0);

//     const itemsTableRef = useRef(null);
//     const [transactionSettings, setTransactionSettings] = useState({
//         displayTransactions: false,
//         displayTransactionsForPurchase: false,
//         displayTransactionsForSalesReturn: false,
//         displayTransactionsForPurchaseReturn: false
//     });
//     const [showItemsModal, setShowItemsModal] = useState(false);
//     const [showAccountCreationModal, setShowAccountCreationModal] = useState(false);
//     const [showProductModal, setShowProductModal] = useState(false);
//     const [printAfterSave, setPrintAfterSave] = useState(
//         localStorage.getItem('printAfterSavePurchaseReturn') === 'true' || false
//     );
//     const continueButtonRef = useRef(null);
//     const [transactionCache, setTransactionCache] = useState(new Map());
//     const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
//     const transactionDateRef = useRef(null);
//     const [isLoading, setIsLoading] = useState(true);
//     const [isInitialDataLoaded, setIsInitialDataLoaded] = useState(false);
//     const [isSaving, setIsSaving] = useState(false);
//     const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
//     const [notification, setNotification] = useState({
//         show: false,
//         message: '',
//         type: 'success'
//     });
//     const [dateErrors, setDateErrors] = useState({
//         transactionDateNepali: '',
//         nepaliDate: ''
//     });

//     const [formData, setFormData] = useState({
//         accountId: '',
//         accountName: '',
//         accountAddress: '',
//         accountPan: '',
//         transactionDateNepali: currentNepaliDate,
//         transactionDateRoman: new Date().toISOString().split('T')[0],
//         nepaliDate: currentNepaliDate,
//         billDate: new Date().toISOString().split('T')[0],
//         billNumber: '',
//         paymentMode: 'credit',
//         isVatExempt: 'all',
//         discountPercentage: 0,
//         discountAmount: 0,
//         roundOffAmount: 0,
//         vatPercentage: 13,
//         items: []
//     });

//     const [items, setItems] = useState([]);
//     const [accounts, setAccounts] = useState([]);
//     const [company, setCompany] = useState({
//         dateFormat: 'english',
//         vatEnabled: true,
//         fiscalYear: {}
//     });

//     const [roundOffPurchase, setRoundOffPurchase] = useState(false);
//     const [manualRoundOffOverride, setManualRoundOffOverride] = useState(false);

//     const accountSearchRef = useRef(null);
//     const itemSearchRef = useRef(null);
//     const accountModalRef = useRef(null);
//     const transactionModalRef = useRef(null);

//     const api = axios.create({
//         baseURL: process.env.REACT_APP_API_BASE_URL,
//         withCredentials: true,
//     });

//     // Add authorization header to all requests
//     api.interceptors.request.use(
//         (config) => {
//             const token = localStorage.getItem('token');
//             if (token) {
//                 config.headers.Authorization = `Bearer ${token}`;
//             }
//             return config;
//         },
//         (error) => {
//             return Promise.reject(error);
//         }
//     );

//     // Fetch accounts from backend
//     const fetchAccountsFromBackend = async (searchTerm = '', page = 1) => {
//         try {
//             setIsAccountSearching(true);

//             const response = await api.get('/api/retailer/accounts/search', {
//                 params: {
//                     search: searchTerm,
//                     page: page,
//                     limit: searchTerm.trim() ? 15 : 25,
//                 }
//             });

//             if (response.data.success) {
//                 if (page === 1) {
//                     setAccountSearchResults(response.data.accounts);
//                     setAccounts(response.data.accounts);
//                 } else {
//                     setAccountSearchResults(prev => [...prev, ...response.data.accounts]);
//                     setAccounts(prev => [...prev, ...response.data.accounts]);
//                 }
//                 setHasMoreAccountResults(response.data.pagination.hasNextPage);
//                 setTotalAccounts(response.data.pagination.totalAccounts);
//                 setAccountSearchPage(page);

//                 if (searchTerm.trim() !== '') {
//                     setAccountLastSearchQuery(searchTerm);
//                     setAccountShouldShowLastSearchResults(true);
//                 }
//             }
//         } catch (error) {
//             console.error('Error fetching accounts:', error);
//             setNotification({
//                 show: true,
//                 message: 'Error loading accounts',
//                 type: 'error'
//             });
//         } finally {
//             setIsAccountSearching(false);
//         }
//     };

//     // Fetch items from backend for header modal
//     const fetchItemsFromBackend = async (searchTerm = '', page = 1, isHeaderModal = true) => {
//         try {
//             setIsHeaderSearching(true);

//             const response = await api.get('/api/retailer/items/search', {
//                 params: {
//                     search: searchTerm,
//                     page: page,
//                     limit: 15,
//                     vatStatus: formData.isVatExempt,
//                     sortBy: searchTerm.trim() ? 'relevance' : 'name'
//                 }
//             });

//             if (response.data.success) {
//                 const itemsWithLatestPrice = response.data.items.map(item => {
//                     let latestPuPrice = 0;
//                     let latestBatchNumber = '';
//                     let latestExpiryDate = '';
//                     let latestWsUnit = 1;
//                     let totalStock = 0;

//                     if (item.stockEntries && item.stockEntries.length > 0) {
//                         totalStock = item.stockEntries.reduce((sum, entry) => sum + (entry.quantity || 0), 0);

//                         const sortedEntries = item.stockEntries.sort((a, b) =>
//                             new Date(b.date) - new Date(a.date)
//                         );
//                         latestPuPrice = sortedEntries[0].puPrice || 0;
//                         latestBatchNumber = sortedEntries[0].batchNumber || '';
//                         latestExpiryDate = sortedEntries[0].expiryDate || '';
//                         latestWsUnit = sortedEntries[0].wsUnit || 1;
//                     }

//                     return {
//                         ...item,
//                         latestPuPrice,
//                         latestBatchNumber,
//                         latestExpiryDate,
//                         latestWsUnit,
//                         stock: totalStock,
//                         unitName: item.unit?.name || item.unitName || '',
//                         unitId: item.unit?.id || item.unitId
//                     };
//                 });

//                 if (page === 1) {
//                     setHeaderSearchResults(itemsWithLatestPrice);
//                 } else {
//                     setHeaderSearchResults(prev => [...prev, ...itemsWithLatestPrice]);
//                 }
//                 setHasMoreHeaderSearchResults(response.data.pagination.hasNextPage);
//                 setTotalHeaderSearchItems(response.data.pagination.totalItems);
//                 setHeaderSearchPage(page);
//             }
//         } catch (error) {
//             console.error('Error fetching items:', error);
//             setNotification({
//                 show: true,
//                 message: 'Error loading items',
//                 type: 'error'
//             });
//         } finally {
//             setIsHeaderSearching(false);
//         }
//     };

//     // For header modal search
//     const debouncedHeaderSearchQuery = useDebounce(headerSearchQuery, 500);

//     useEffect(() => {
//         if (showHeaderItemModal) {
//             setHeaderSearchPage(1);

//             let searchTerm = '';
//             if (headerSearchQuery.trim() !== '') {
//                 searchTerm = headerSearchQuery;
//             } else if (headerShouldShowLastSearchResults && headerLastSearchQuery.trim() !== '') {
//                 searchTerm = headerLastSearchQuery;
//             }

//             fetchItemsFromBackend(searchTerm, 1, true);
//         }
//     }, [debouncedHeaderSearchQuery, formData.isVatExempt, showHeaderItemModal, headerShouldShowLastSearchResults, headerLastSearchQuery]);

//     useEffect(() => {
//         const fetchTransactionSettings = async () => {
//             try {
//                 const response = await api.get('/api/retailer/get-display-purchase-return-transactions');
//                 if (response.data.success) {
//                     setTransactionSettings(response.data.data);
//                 }
//             } catch (error) {
//                 console.error('Error fetching transaction settings:', error);
//             }
//         };
//         fetchTransactionSettings();
//     }, []);

//     useEffect(() => {
//         const handleF6Key = (e) => {
//             if (e.key === 'F6' && showHeaderItemModal) {
//                 e.preventDefault();
//                 setShowItemsModal(true);
//                 setShowHeaderItemModal(false);
//                 setHeaderSearchQuery('');
//                 setHeaderLastSearchQuery('');
//                 setHeaderShouldShowLastSearchResults(false);
//             }
//         };

//         window.addEventListener('keydown', handleF6Key);
//         return () => {
//             window.removeEventListener('keydown', handleF6Key);
//         };
//     }, [showHeaderItemModal]);

//     useEffect(() => {
//         const handleF6KeyForAccounts = (e) => {
//             if (e.key === 'F6' && showAccountModal) {
//                 e.preventDefault();
//                 setShowAccountCreationModal(true);
//                 setShowAccountModal(false);
//             }
//         };

//         window.addEventListener('keydown', handleF6KeyForAccounts);
//         return () => {
//             window.removeEventListener('keydown', handleF6KeyForAccounts);
//         };
//     }, [showAccountModal]);

//     useEffect(() => {
//         const handleF9KeyDown = (e) => {
//             if (e.key === 'F9') {
//                 e.preventDefault();
//                 setShowProductModal(prev => !prev);
//             }
//         };
//         window.addEventListener('keydown', handleF9KeyDown);
//         return () => {
//             window.removeEventListener('keydown', handleF9KeyDown);
//         };
//     }, []);

//     // Initial data loading
//     useEffect(() => {
//         const fetchPurchaseReturnData = async () => {
//             try {
//                 setIsLoading(true);

//                 const response = await api.get(`/api/retailer/purchase-return/edit/${id}`);
//                 const { data } = response.data;

//                 setCompany({
//                     ...data.company,
//                     dateFormat: data.company.dateFormat || 'english',
//                     vatEnabled: data.company.vatEnabled || true
//                 });

//                 const purchaseReturn = data.purchaseReturn;
//                 const dateFormat = data.company.dateFormat;

//                 const accountDoc = data.accounts.find(acc => acc.id === purchaseReturn.accountId);
//                 const accountNameWithNumber = accountDoc?.uniqueNumber
//                     ? `${accountDoc.uniqueNumber} ${purchaseReturn.accountName}`
//                     : purchaseReturn.accountName;

//                 const itemsData = purchaseReturn.items.map(item => ({
//                     itemId: item.itemId,
//                     uniqueNumber: item.uniqueNumber,
//                     hscode: item.hscode,
//                     name: item.itemName,
//                     category: item.category?.name || 'No Category',
//                     wsUnit: item.wsUnit || 1,
//                     batchNumber: item.batchNumber || '',
//                     expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString().split('T')[0] : '',
//                     quantity: item.quantity || 0,
//                     unitId: item.unitId,
//                     unitName: item.unitName,
//                     puPrice: item.puPrice || 0,
//                     amount: ((item.quantity || 0) * (item.puPrice || 0)).toFixed(2),
//                     vatStatus: item.vatStatus,
//                     uniqueUuid: item.uniqueUuid
//                 }));

//                 setFormData({
//                     accountId: purchaseReturn.accountId,
//                     accountName: accountNameWithNumber,
//                     accountAddress: purchaseReturn.accountAddress || '',
//                     accountPan: purchaseReturn.accountPan || '',
//                     transactionDateNepali: dateFormat === 'nepali' ?
//                         new Date(purchaseReturn.transactionDate).toISOString().split('T')[0] : currentNepaliDate,
//                     transactionDateRoman: dateFormat !== 'nepali' ?
//                         new Date(purchaseReturn.transactionDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
//                     nepaliDate: dateFormat === 'nepali' ?
//                         new Date(purchaseReturn.date).toISOString().split('T')[0] : currentNepaliDate,
//                     billDate: dateFormat !== 'nepali' ?
//                         new Date(purchaseReturn.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
//                     billNumber: purchaseReturn.billNumber,
//                     paymentMode: purchaseReturn.paymentMode || 'credit',
//                     isVatExempt: purchaseReturn.isVatExempt ? 'true' :
//                         (purchaseReturn.isVatAll === 'all' ? 'all' : 'false'),
//                     discountPercentage: purchaseReturn.discountPercentage || 0,
//                     discountAmount: purchaseReturn.discountAmount || 0,
//                     roundOffAmount: purchaseReturn.roundOffAmount || 0,
//                     vatPercentage: purchaseReturn.vatPercentage || 13,
//                     items: itemsData
//                 });

//                 setItems(itemsData);
//                 setAccounts(data.accounts || []);

//                 setIsInitialDataLoaded(true);
//             } catch (error) {
//                 console.error('Error fetching purchase return data:', error);
//                 setNotification({
//                     show: true,
//                     message: 'Failed to load purchase return data',
//                     type: 'error'
//                 });
//                 navigate('/retailer/purchase-return');
//             } finally {
//                 setIsLoading(false);
//             }
//         };

//         if (id) {
//             fetchPurchaseReturnData();
//         }
//     }, [id, navigate]);

//     useEffect(() => {
//         if (isInitialDataLoaded && transactionDateRef.current) {
//             const timer = setTimeout(() => {
//                 transactionDateRef.current.focus();
//             }, 50);

//             return () => clearTimeout(timer);
//         }
//     }, [isInitialDataLoaded, company.dateFormat]);

//     useEffect(() => {
//         calculateTotal();
//     }, [items, formData.discountPercentage, formData.discountAmount, formData.roundOffAmount]);

//     useEffect(() => {
//         fetchRoundOffSetting();
//     }, []);

//     const fetchRoundOffSetting = async () => {
//         try {
//             const response = await api.get('/api/retailer/roundoff-purchase-return');
//             if (response.data.success) {
//                 setRoundOffPurchase(response.data.data.settingsForPurchaseReturn?.roundOffPurchaseReturn || false);
//             }
//         } catch (error) {
//             console.error("Error fetching round-off setting:", error);
//             setRoundOffPurchase(false);
//         }
//     };

//     const handleAccountSearch = (e) => {
//         const searchText = e.target.value;
//         setAccountSearchQuery(searchText);
//         setAccountSearchPage(1);

//         if (searchText.trim() !== '' && accountShouldShowLastSearchResults) {
//             setAccountShouldShowLastSearchResults(false);
//             setAccountLastSearchQuery('');
//         }

//         const timer = setTimeout(() => {
//             fetchAccountsFromBackend(searchText, 1);
//         }, 300);

//         return () => clearTimeout(timer);
//     };

//     useEffect(() => {
//         if (showAccountModal) {
//             setAccountSearchQuery('');
//             setAccountSearchPage(1);

//             if (accountShouldShowLastSearchResults && accountLastSearchQuery.trim() !== '') {
//                 fetchAccountsFromBackend(accountLastSearchQuery, 1);
//             } else {
//                 fetchAccountsFromBackend('', 1);
//             }
//         }
//     }, [showAccountModal]);

//     const handleAccountModalClose = () => {
//         setShowAccountModal(false);
//     };

//     const selectAccount = (account) => {
//         setFormData({
//             ...formData,
//             accountId: account.id,
//             accountName: `${account.uniqueNumber || ''} ${account.name}`.trim(),
//             accountAddress: account.address || '',
//             accountPan: account.pan || ''
//         });
//         setShowAccountModal(false);
//     };

//     const handleHeaderItemSearch = (e) => {
//         const query = e.target.value;
//         setHeaderSearchQuery(query);
//         setHeaderSearchPage(1);

//         if (query.trim() !== '' && headerShouldShowLastSearchResults) {
//             setHeaderShouldShowLastSearchResults(false);
//             setHeaderLastSearchQuery('');
//         }

//         fetchItemsFromBackend(query, 1, true);
//     };

//     const selectItemForInsert = async (item) => {
//         setSelectedItemForInsert(item);
//         setShowHeaderItemModal(false);

//         if (headerSearchQuery.trim() !== '') {
//             setHeaderLastSearchQuery(headerSearchQuery);
//             setHeaderShouldShowLastSearchResults(true);
//         } else if (headerShouldShowLastSearchResults && headerLastSearchQuery) {
//             setHeaderShouldShowLastSearchResults(true);
//         }
//         setHeaderSearchQuery('');

//         // Set default batch and expiry date
//         setSelectedItemBatchNumber(item.latestBatchNumber || 'XXX');
//         setSelectedItemExpiryDate(item.latestExpiryDate || getDefaultExpiryDate());
//         setSelectedItemRate(item.latestPuPrice || 0);
//         setSelectedItemWsUnit(item.latestWsUnit || 1);

//         let hasTransactions = false;

//         if (transactionSettings.displayTransactionsForPurchaseReturn && formData.accountId) {
//             const cacheKey = `${item.id}-${formData.accountId}`;

//             if (transactionCache.has(cacheKey)) {
//                 const cachedTransactions = transactionCache.get(cacheKey);
//                 if (cachedTransactions.length > 0) {
//                     setTransactions(cachedTransactions);
//                     setTransactionType('purchasereturn');
//                     setShowTransactionModal(true);
//                     hasTransactions = true;
//                 }
//             }

//             if (!hasTransactions) {
//                 try {
//                     setIsLoadingTransactions(true);

//                     const controller = new AbortController();
//                     const timeoutId = setTimeout(() => controller.abort(), 3000);

//                     const response = await api.get(`/api/retailer/transactions/${item.id}/${formData.accountId}/PurchaseReturn`, {
//                         signal: controller.signal
//                     });

//                     clearTimeout(timeoutId);

//                     if (response.data.success && response.data.data.transactions.length > 0) {
//                         setTransactionCache(prev => new Map(prev.set(cacheKey, response.data.data.transactions)));
//                         setTransactions(response.data.data.transactions);
//                         setTransactionType('purchasereturn');
//                         setShowTransactionModal(true);
//                         hasTransactions = true;
//                     }
//                 } catch (error) {
//                     if (error.name !== 'AbortError') {
//                         console.error('Error fetching transactions:', error);
//                     }
//                 } finally {
//                     setIsLoadingTransactions(false);
//                 }
//             }
//         }

//         if (!hasTransactions) {
//             setTimeout(() => {
//                 const headerBatchInput = document.getElementById('headerBatch');
//                 if (headerBatchInput) {
//                     headerBatchInput.focus();
//                     headerBatchInput.select();
//                 }
//             }, 100);
//         }
//     };

//     const insertSelectedItem = () => {
//         if (!selectedItemForInsert) {
//             setNotification({
//                 show: true,
//                 message: 'Please select an item first',
//                 type: 'error'
//             });
//             return;
//         }

//         if (!selectedItemBatchNumber.trim()) {
//             setNotification({
//                 show: true,
//                 message: 'Batch number is required before inserting item',
//                 type: 'error'
//             });
//             setTimeout(() => {
//                 const batchInput = document.getElementById('headerBatch');
//                 if (batchInput) {
//                     batchInput.focus();
//                     batchInput.select();
//                 }
//             }, 100);
//             return;
//         }

//         if (!selectedItemExpiryDate.trim()) {
//             setNotification({
//                 show: true,
//                 message: 'Expiry date is required before inserting item',
//                 type: 'error'
//             });
//             setTimeout(() => {
//                 const expiryInput = document.getElementById('headerExpiryDate');
//                 if (expiryInput) {
//                     expiryInput.focus();
//                     expiryInput.select();
//                 }
//             }, 100);
//             return;
//         }

//         const unitId = selectedItemForInsert.unitId || selectedItemForInsert.unit?.id;
//         const unitName = selectedItemForInsert.unitName || selectedItemForInsert.unit?.name || '';

//         const newItem = {
//             itemId: selectedItemForInsert.id,
//             uniqueNumber: selectedItemForInsert.uniqueNumber || 'N/A',
//             hscode: selectedItemForInsert.hscode,
//             name: selectedItemForInsert.name,
//             category: selectedItemForInsert.category?.name || 'No Category',
//             wsUnit: selectedItemWsUnit || 1,
//             batchNumber: selectedItemBatchNumber,
//             expiryDate: selectedItemExpiryDate,
//             quantity: selectedItemQuantity || 0,
//             unitId: unitId,
//             unitName: unitName,
//             puPrice: selectedItemRate || 0,
//             amount: (selectedItemQuantity || 0) * (selectedItemRate || 0),
//             vatStatus: selectedItemForInsert.vatStatus,
//             uniqueUuid: selectedItemForInsert.uniqueUuid || `uuid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
//         };

//         const updatedItems = [...items, newItem];
//         setItems(updatedItems);
//         setFormData(prev => ({
//             ...prev,
//             items: updatedItems
//         }));

//         setSelectedItemForInsert(null);
//         setSelectedItemQuantity(0);
//         setSelectedItemRate(0);
//         setSelectedItemWsUnit(1);
//         setSelectedItemBatchNumber('');
//         setSelectedItemExpiryDate('');
//         setHeaderSearchQuery('');

//         setTimeout(() => {
//             const searchInput = document.getElementById('headerItemSearch');
//             if (searchInput) {
//                 searchInput.focus();
//                 searchInput.select();
//             }
//         }, 50);
//     };

//     const getDefaultExpiryDate = () => {
//         const today = new Date();
//         today.setFullYear(today.getFullYear() + 2);
//         return today.toISOString().split('T')[0];
//     };

//     const updateItemField = (index, field, value) => {
//         const updatedItems = [...items];

//         const fieldMap = {
//             'WSUnit': 'wsUnit',
//             'batchNumber': 'batchNumber',
//             'expiryDate': 'expiryDate',
//             'quantity': 'quantity',
//             'puPrice': 'puPrice'
//         };

//         const mappedField = fieldMap[field] || field;
//         updatedItems[index][mappedField] = value;

//         if (field === 'quantity' || field === 'puPrice') {
//             updatedItems[index].amount = ((updatedItems[index].quantity || 0) * (updatedItems[index].puPrice || 0)).toFixed(2);
//         }

//         setItems(updatedItems);

//         setFormData(prev => ({
//             ...prev,
//             items: updatedItems
//         }));

//         if (formData.discountPercentage || formData.discountAmount) {
//             const subTotal = calculateTotal(updatedItems).subTotal;

//             if (formData.discountPercentage) {
//                 const discountAmount = (subTotal * formData.discountPercentage) / 100;
//                 setFormData(prev => ({
//                     ...prev,
//                     discountAmount: discountAmount.toFixed(2)
//                 }));
//             } else if (formData.discountAmount) {
//                 const discountPercentage = subTotal > 0 ? (formData.discountAmount / subTotal) * 100 : 0;
//                 setFormData(prev => ({
//                     ...prev,
//                     discountPercentage: discountPercentage.toFixed(2)
//                 }));
//             }
//         }
//     };

//     const removeItem = (index) => {
//         if (items.length <= 1) {
//             setNotification({
//                 show: true,
//                 message: 'You cannot remove the last item. A bill must have at least one item.',
//                 type: 'error'
//             });
//             return;
//         }

//         const updatedItems = items.filter((_, i) => i !== index);
//         setItems(updatedItems);
//         setFormData(prev => ({
//             ...prev,
//             items: updatedItems
//         }));
//     };

//     useEffect(() => {
//         if (itemsTableRef.current && items.length > 0) {
//             setTimeout(() => {
//                 itemsTableRef.current.scrollTop = itemsTableRef.current.scrollHeight;
//             }, 10);
//         }
//     }, [items]);

//     useEffect(() => {
//         if (showTransactionModal && continueButtonRef.current) {
//             const timer = setTimeout(() => {
//                 continueButtonRef.current.focus();
//             }, 100);
//             return () => clearTimeout(timer);
//         }
//     }, [showTransactionModal]);

//     // Precision utility functions
//     const preciseAdd = (a, b) => {
//         return parseFloat((parseFloat(a) + parseFloat(b)).toFixed(10));
//     };

//     const preciseSubtract = (a, b) => {
//         return parseFloat((parseFloat(a) - parseFloat(b)).toFixed(10));
//     };

//     const preciseMultiply = (a, b) => {
//         return parseFloat((parseFloat(a) * parseFloat(b)).toFixed(10));
//     };

//     const preciseDivide = (a, b) => {
//         return b !== 0 ? parseFloat((parseFloat(a) / parseFloat(b)).toFixed(10)) : 0;
//     };

//     const preciseRound = (value, decimals = 2) => {
//         return parseFloat(value.toFixed(decimals));
//     };

//     const calculateTotal = (itemsToCalculate = items) => {
//         let subTotal = 0;
//         let taxableAmount = 0;
//         let nonTaxableAmount = 0;

//         itemsToCalculate.forEach(item => {
//             const itemAmount = parseFloat(item.amount) || 0;
//             subTotal = preciseAdd(subTotal, itemAmount);

//             if (item.vatStatus === 'vatable') {
//                 taxableAmount = preciseAdd(taxableAmount, itemAmount);
//             } else {
//                 nonTaxableAmount = preciseAdd(nonTaxableAmount, itemAmount);
//             }
//         });

//         const discountPercentage = parseFloat(formData.discountPercentage) || 0;
//         const discountAmount = parseFloat(formData.discountAmount) || 0;

//         let effectiveDiscount = 0;
//         let discountForTaxable = 0;
//         let discountForNonTaxable = 0;

//         if (discountAmount > 0) {
//             effectiveDiscount = discountAmount;

//             if (subTotal > 0) {
//                 const taxableRatio = preciseDivide(taxableAmount, subTotal);
//                 const nonTaxableRatio = preciseDivide(nonTaxableAmount, subTotal);

//                 discountForTaxable = preciseMultiply(effectiveDiscount, taxableRatio);
//                 discountForNonTaxable = preciseMultiply(effectiveDiscount, nonTaxableRatio);
//             }
//         } else if (discountPercentage > 0) {
//             discountForTaxable = preciseMultiply(taxableAmount, preciseDivide(discountPercentage, 100));
//             discountForNonTaxable = preciseMultiply(nonTaxableAmount, preciseDivide(discountPercentage, 100));
//             effectiveDiscount = preciseAdd(discountForTaxable, discountForNonTaxable);
//         }

//         const finalTaxableAmount = preciseSubtract(taxableAmount, discountForTaxable);
//         const finalNonTaxableAmount = preciseSubtract(nonTaxableAmount, discountForNonTaxable);

//         let vatAmount = 0;
//         if (formData.isVatExempt === 'false' || formData.isVatExempt === 'all') {
//             vatAmount = preciseMultiply(finalTaxableAmount, preciseDivide(formData.vatPercentage, 100));
//         }

//         let totalBeforeRoundOff = preciseAdd(
//             preciseAdd(finalTaxableAmount, finalNonTaxableAmount),
//             vatAmount
//         );

//         let roundOffAmount = 0;
//         let autoRoundOffAmount = 0;

//         if (roundOffPurchase) {
//             const roundedTotal = Math.round(totalBeforeRoundOff);
//             autoRoundOffAmount = preciseSubtract(roundedTotal, totalBeforeRoundOff);
//         }

//         if (roundOffPurchase && !manualRoundOffOverride) {
//             roundOffAmount = autoRoundOffAmount;
//         } else {
//             roundOffAmount = parseFloat(formData.roundOffAmount) || 0;
//         }

//         const totalAmount = preciseAdd(totalBeforeRoundOff, roundOffAmount);

//         return {
//             subTotal: preciseRound(subTotal, 2),
//             taxableAmount: preciseRound(finalTaxableAmount, 2),
//             nonTaxableAmount: preciseRound(finalNonTaxableAmount, 2),
//             vatAmount: preciseRound(vatAmount, 2),
//             totalAmount: preciseRound(totalAmount, 2),
//             discountAmount: preciseRound(effectiveDiscount, 2),
//             roundOffAmount: preciseRound(roundOffAmount, 2),
//             autoRoundOffAmount: preciseRound(autoRoundOffAmount, 2)
//         };
//     };

//     const totals = calculateTotal();

//     const handleDiscountPercentageChange = (e) => {
//         const value = parseFloat(e.target.value) || 0;
//         const validatedValue = Math.min(Math.max(value, 0), 100);

//         const subTotal = calculateTotal().subTotal;
//         const discountAmount = preciseMultiply(subTotal, validatedValue / 100);

//         setFormData({
//             ...formData,
//             discountPercentage: validatedValue,
//             discountAmount: preciseRound(discountAmount, 2)
//         });
//     };

//     const handleDiscountAmountChange = (e) => {
//         const value = parseFloat(e.target.value) || 0;
//         const subTotal = calculateTotal().subTotal;

//         const validatedValue = Math.min(Math.max(value, 0), subTotal);

//         const discountPercentage = subTotal > 0 ?
//             preciseMultiply(validatedValue / subTotal, 100) : 0;

//         setFormData({
//             ...formData,
//             discountAmount: validatedValue,
//             discountPercentage: preciseRound(discountPercentage, 2)
//         });
//     };

//     const fetchLastTransactions = async (itemId, index) => {
//         if (!formData.accountId) {
//             setNotification({
//                 show: true,
//                 message: 'Please select an account first',
//                 type: 'error'
//             });
//             return;
//         }

//         setSelectedItemIndex(index);
//         setIsLoadingTransactions(true);

//         try {
//             const cacheKey = `${itemId}-${formData.accountId}`;

//             if (transactionCache.has(cacheKey)) {
//                 const cachedTransactions = transactionCache.get(cacheKey);
//                 setTransactions(cachedTransactions);
//                 setTransactionType('purchasereturn');
//                 setShowTransactionModal(true);
//                 return;
//             }

//             const controller = new AbortController();
//             const timeoutId = setTimeout(() => controller.abort(), 3000);

//             const response = await api.get(`/api/retailer/transactions/${itemId}/${formData.accountId}/PurchaseReturn`, {
//                 signal: controller.signal
//             });

//             clearTimeout(timeoutId);

//             if (response.data.success) {
//                 setTransactionCache(prev => new Map(prev.set(cacheKey, response.data.data.transactions)));
//                 setTransactions(response.data.data.transactions);
//                 setTransactionType('purchasereturn');
//                 setShowTransactionModal(true);
//             }
//         } catch (error) {
//             if (error.name !== 'AbortError') {
//                 console.error('Error fetching transactions:', error);
//             }
//         } finally {
//             setIsLoadingTransactions(false);
//         }
//     };

//     const handleTransactionModalClose = () => {
//         setShowTransactionModal(false);

//         setTimeout(() => {
//             const headerBatchInput = document.getElementById('headerBatch');
//             if (headerBatchInput) {
//                 headerBatchInput.focus();
//                 headerBatchInput.select();
//             } else if (items.length > 0) {
//                 const quantityInput = document.getElementById(`quantity-${items.length - 1}`);
//                 if (quantityInput) {
//                     quantityInput.focus();
//                     quantityInput.select();
//                 }
//             }
//         }, 100);
//     };

//     const handleKeyDown = (e, currentFieldId) => {
//         if (e.key === 'Enter') {
//             e.preventDefault();
//             const form = e.target.form;
//             const inputs = Array.from(form.querySelectorAll('input, select, textarea')).filter(
//                 el => !el.hidden && !el.disabled && el.offsetParent !== null
//             );
//             const currentIndex = inputs.findIndex(input => input.id === currentFieldId);

//             if (currentIndex > -1 && currentIndex < inputs.length - 1) {
//                 inputs[currentIndex + 1].focus();
//             }
//         }
//     };

//     const loadMoreAccounts = () => {
//         if (!isAccountSearching) {
//             fetchAccountsFromBackend(accountSearchQuery, accountSearchPage + 1);
//         }
//     };

//     const loadMoreHeaderSearchItems = () => {
//         if (!isHeaderSearching && hasMoreHeaderSearchResults) {
//             fetchItemsFromBackend(
//                 headerShouldShowLastSearchResults ? headerLastSearchQuery : headerSearchQuery,
//                 headerSearchPage + 1,
//                 true
//             );
//         }
//     };

//     const handleHeaderSearchFocus = () => {
//         if (headerLastSearchQuery && !headerSearchQuery) {
//             setHeaderShouldShowLastSearchResults(true);
//             if (headerLastSearchQuery.trim() !== '') {
//                 fetchItemsFromBackend(headerLastSearchQuery, 1, true);
//             }
//         }
//     };

//     const handleAccountCreationModalClose = () => {
//         setShowAccountCreationModal(false);
//         setShowAccountModal(true);

//         fetchAccountsFromBackend('', 1);
//     };

//     const validateHeaderFields = () => {
//         if (!selectedItemBatchNumber.trim()) {
//             setNotification({
//                 show: true,
//                 message: 'Batch number is required before inserting item',
//                 type: 'error'
//             });

//             setTimeout(() => {
//                 const batchInput = document.getElementById('headerBatch');
//                 if (batchInput) {
//                     batchInput.focus();
//                     batchInput.select();
//                 }
//             }, 100);

//             return false;
//         }

//         if (!selectedItemExpiryDate.trim()) {
//             setNotification({
//                 show: true,
//                 message: 'Expiry date is required before inserting item',
//                 type: 'error'
//             });

//             setTimeout(() => {
//                 const expiryInput = document.getElementById('headerExpiryDate');
//                 if (expiryInput) {
//                     expiryInput.focus();
//                     expiryInput.select();
//                 }
//             }, 100);

//             return false;
//         }

//         return true;
//     };

//     const handlePrintAfterSaveChange = (e) => {
//         const isChecked = e.target.checked;
//         setPrintAfterSave(isChecked);
//         localStorage.setItem('printAfterSavePurchaseReturn', isChecked);
//     };

//     const handleSubmit = async (e, print = false) => {
//         e.preventDefault();
//         setIsSaving(true);

//         try {
//             const calculatedValues = calculateTotal();

//             // Prepare data according to your ASP.NET UpdatePurchaseReturnDTO
//             const billData = {
//                 accountId: formData.accountId,
//                 partyBillNumber: '',
//                 paymentMode: formData.paymentMode,
//                 isVatExempt: formData.isVatExempt === 'true',
//                 isVatAll: formData.isVatExempt,
//                 discountPercentage: parseFloat(formData.discountPercentage) || 0,
//                 discountAmount: parseFloat(formData.discountAmount) || 0,
//                 vatPercentage: parseFloat(formData.vatPercentage) || 13,
//                 vatAmount: calculatedValues.vatAmount,
//                 roundOffAmount: calculatedValues.roundOffAmount,
//                 subTotal: calculatedValues.subTotal,
//                 taxableAmount: calculatedValues.taxableAmount,
//                 nonVatPurchaseReturn: calculatedValues.nonTaxableAmount,
//                 totalAmount: calculatedValues.totalAmount,
//                 nepaliDate: formData.nepaliDate,
//                 date: formData.billDate,
//                 transactionDateNepali: formData.transactionDateNepali,
//                 transactionDate: formData.transactionDateRoman,
//                 print: print || printAfterSave,
//                 items: items.map(item => ({
//                     itemId: item.itemId,
//                     batchNumber: item.batchNumber,
//                     expiryDate: item.expiryDate,
//                     wsUnit: item.wsUnit || 1,
//                     quantity: item.quantity,
//                     puPrice: item.puPrice,
//                     unitId: item.unitId,
//                     vatStatus: item.vatStatus,
//                     uniqueUuid: item.uniqueUuid
//                 }))
//             };

//             const response = await api.put(`/api/retailer/purchase-return/edit/${id}`, billData);

//             setNotification({
//                 show: true,
//                 message: 'Purchase return updated successfully!',
//                 type: 'success'
//             });

//             if (print || printAfterSave) {
//                 if (response.data.data?.billId) {
//                     await printImmediately(response.data.data.billId);
//                     setTimeout(() => {
//                         handleBack();
//                     }, 1000);
//                 }
//             } else {
//                 handleBack();
//             }
//         } catch (error) {
//             console.error('Error updating purchase return:', error);
//             setNotification({
//                 show: true,
//                 message: error.response?.data?.error || 'Failed to update purchase return. Please try again.',
//                 type: 'error'
//             });
//         } finally {
//             setIsSaving(false);
//         }
//     };

//     const handleBack = () => {
//         navigate(-1);
//     };

//     const printImmediately = async (billId) => {
//         try {
//             const response = await api.get(`/api/retailer/purchase-return/${billId}/print`);
//             const printData = response.data.data;

//             const tempDiv = document.createElement('div');
//             tempDiv.style.position = 'absolute';
//             tempDiv.style.left = '-9999px';
//             document.body.appendChild(tempDiv);

//             const formatTo2Decimal = (num) => {
//                 const rounded = Math.round(num * 100) / 100;
//                 const parts = rounded.toString().split(".");
//                 if (!parts[1]) return parts[0] + ".00";
//                 if (parts[1].length === 1) return parts[0] + "." + parts[1] + "0";
//                 return rounded.toString();
//             };

//             tempDiv.innerHTML = `
//                 <div id="printableContent" class="print-version">
//                     <div class="print-invoice-container">
//                         <div class="print-invoice-header">
//                             <div class="print-company-name">${printData.currentCompanyName || ''}</div>
//                             <div class="print-company-details">
//                                 ${printData.currentCompany?.address || ''} | Tel: ${printData.currentCompany?.phone || ''} | PAN: ${printData.currentCompany?.pan || ''}
//                             </div>
//                             <div class="print-invoice-title">PURCHASE RETURN</div>
//                         </div>

//                         <div class="print-invoice-details">
//                             <div>
//                                 <div><strong>Supplier:</strong> ${printData.bill.account?.name || 'N/A'}</div>
//                                 <div><strong>Address:</strong> ${printData.bill.account?.address || 'N/A'}</div>
//                                 <div><strong>PAN:</strong> ${printData.bill.account?.pan || 'N/A'}</div>
//                                 <div><strong>Payment Mode:</strong> ${printData.bill.paymentMode || 'N/A'}</div>
//                             </div>
//                             <div>
//                                 <div><strong>Return No:</strong> ${printData.bill.billNumber || 'N/A'}</div>
//                                 <div><strong>Supplier Inv No:</strong> ${printData.bill.partyBillNumber || 'N/A'}</div>
//                                 <div><strong>Transaction Date:</strong> ${new Date(printData.bill.transactionDate).toLocaleDateString()}</div>
//                                 <div><strong>Return Date:</strong> ${new Date(printData.bill.date).toLocaleDateString()}</div>
//                             </div>
//                         </div>

//                         <table class="print-invoice-table">
//                             <thead>
//                                 <tr>
//                                     <th>SN</th>
//                                     <th>Code</th>
//                                     <th>HSN</th>
//                                     <th>Description of Goods</th>
//                                     <th>Unit</th>
//                                     <th>Batch</th>
//                                     <th>Expiry</th>
//                                     <th>Qty</th>
//                                     <th>Rate</th>
//                                     <th>Amount</th>
//                                 </tr>
//                             </thead>
//                             <tbody>
//                                 ${printData.bill.items?.map((item, i) => `
//                                     <tr key="${i}">
//                                         <td>${i + 1}</td>
//                                         <td>${item.uniqueNumber || ''}</td>
//                                         <td>${item.hscode || ''}</td>
//                                         <td>${item.itemName || ''}</td>
//                                         <td>${item.unitName || ''}</td>
//                                         <td>${item.batchNumber || ''}</td>
//                                         <td>${item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'N/A'}</td>
//                                         <td>${item.quantity || 0}</td>
//                                         <td>${formatTo2Decimal(item.puPrice || 0)}</td>
//                                         <td>${formatTo2Decimal((item.quantity || 0) * (item.puPrice || 0))}</td>
//                                     </tr>
//                                 `).join('') || ''}
//                             </tbody>
//                         </table>

//                         <table class="print-totals-table">
//                             <tbody>
//                                 <tr>
//                                     <td><strong>Sub Total:</strong></td>
//                                     <td class="print-text-right">${formatTo2Decimal(printData.bill.subTotal || 0)}</td>
//                                 </tr>
//                                 <tr>
//                                     <td><strong>Discount (${printData.bill.discountPercentage || 0}%):</strong></td>
//                                     <td class="print-text-right">${formatTo2Decimal(printData.bill.discountAmount || 0)}</td>
//                                 </tr>
//                                 ${!printData.bill.isVatExempt ? `
//                                     <tr>
//                                         <td><strong>Taxable Amount:</strong></td>
//                                         <td class="print-text-right">${formatTo2Decimal(printData.bill.taxableAmount || 0)}</td>
//                                     </tr>
//                                     <tr>
//                                         <td><strong>VAT (${printData.bill.vatPercentage || 13}%):</strong></td>
//                                         <td class="print-text-right">${formatTo2Decimal(printData.bill.vatAmount || 0)}</td>
//                                     </tr>
//                                 ` : ''}
//                                 <tr>
//                                     <td><strong>Round Off:</strong></td>
//                                     <td class="print-text-right">${formatTo2Decimal(printData.bill.roundOffAmount || 0)}</td>
//                                 </tr>
//                                 <tr>
//                                     <td><strong>Grand Total:</strong></td>
//                                     <td class="print-text-right">${formatTo2Decimal(printData.bill.totalAmount || 0)}</td>
//                                 </tr>
//                             </tbody>
//                         </table>

//                         <div class="print-amount-in-words">
//                             <strong>In Words:</strong> ${convertToRupeesAndPaisa(printData.bill.totalAmount || 0)} Only.
//                         </div>

//                         <div class="print-signature-area">
//                             <div class="print-signature-box">Prepared By</div>
//                             <div class="print-signature-box">Checked By</div>
//                             <div class="print-signature-box">Approved By</div>
//                         </div>
//                     </div>
//                 </div>
//             `;

//             const styles = `
//                 @media print {
//                     @page { size: A4; margin: 5mm; }
//                     body { font-family: 'Arial Narrow', Arial, sans-serif; font-size: 9pt; line-height: 1.2; color: #000; background: white; margin: 0; padding: 0; }
//                     .print-invoice-container { width: 100%; max-width: 210mm; margin: 0 auto; padding: 2mm; }
//                     .print-invoice-header { text-align: center; margin-bottom: 3mm; border-bottom: 1px dashed #000; padding-bottom: 2mm; }
//                     .print-invoice-title { font-size: 12pt; font-weight: bold; margin: 2mm 0; text-transform: uppercase; }
//                     .print-company-name { font-size: 16pt; font-weight: bold; }
//                     .print-company-details { font-size: 8pt; font-weight: bold; margin: 1mm 0; }
//                     .print-invoice-details { display: flex; justify-content: space-between; margin: 2mm 0; font-size: 8pt; }
//                     .print-invoice-table { width: 100%; border-collapse: collapse; margin: 3mm 0; font-size: 8pt; border: none; }
//                     .print-invoice-table thead { border-top: 1px dashed #000; border-bottom: 1px dashed #000; }
//                     .print-invoice-table th { background-color: transparent; border: none; padding: 1mm; text-align: left; font-weight: bold; }
//                     .print-invoice-table td { border: none; padding: 1mm; border-bottom: 1px solid #eee; }
//                     .print-text-right { text-align: right; }
//                     .print-amount-in-words { font-size: 8pt; margin: 2mm 0; padding: 1mm; border: 1px dashed #000; }
//                     .print-signature-area { display: flex; justify-content: space-between; margin-top: 5mm; font-size: 8pt; }
//                     .print-signature-box { text-align: center; width: 30%; border-top: 1px dashed #000; padding-top: 1mm; font-weight: bold; }
//                     .print-totals-table { width: 60%; margin-left: auto; border-collapse: collapse; font-size: 8pt; }
//                     .print-totals-table td { padding: 1mm; }
//                 }
//                 @media screen { .print-version { display: none; } }
//             `;

//             const printWindow = window.open('', '_blank');
//             printWindow.document.write(`
//                 <html>
//                     <head>
//                         <title>Purchase_Return_${printData.bill.billNumber}</title>
//                         <style>${styles}</style>
//                     </head>
//                     <body>
//                         ${tempDiv.innerHTML}
//                         <script>
//                             window.onload = function() {
//                                 setTimeout(function() {
//                                     window.print();
//                                     window.close();
//                                 }, 200);
//                             };
//                         </script>
//                     </body>
//                 </html>
//             `);
//             printWindow.document.close();

//             document.body.removeChild(tempDiv);
//         } catch (error) {
//             console.error('Error fetching print data:', error);
//             setNotification({
//                 show: true,
//                 message: 'Return updated but failed to load print data',
//                 type: 'warning'
//             });
//         }
//     };

//     const formatter = new Intl.NumberFormat('en-NP', {
//         minimumFractionDigits: 2,
//         maximumFractionDigits: 2,
//     });

//     if (isLoading) {
//         return (
//             <div className="container-fluid">
//                 <Header />
//                 <div className="text-center py-5">
//                     <div className="spinner-border" role="status">
//                         <span className="visually-hidden">Loading...</span>
//                     </div>
//                 </div>
//             </div>
//         );
//     }

//     return (
//         <div className="container-fluid">
//             <Header />
//             <div className="card mt-2 shadow-lg p-2 animate__animated animate__fadeInUp expanded-card ledger-card compact">
//                 <div className="card-header">
//                     <div className="d-flex justify-content-between align-items-center">
//                         <h2 className="card-title mb-0">
//                             <i className="bi bi-file-text me-2"></i>
//                             Update Purchase Return Entry
//                         </h2>
//                         <div>
//                             {dateErrors.transactionDateNepali && (
//                                 <span className="badge bg-danger me-2">{dateErrors.transactionDateNepali}</span>
//                             )}
//                             {dateErrors.nepaliDate && (
//                                 <span className="badge bg-danger">{dateErrors.nepaliDate}</span>
//                             )}
//                         </div>
//                     </div>
//                 </div>
//                 <div className="card-body p-2 p-md-3">
//                     <form onSubmit={handleSubmit} id="billForm" className="needs-validation" noValidate>
//                         {/* Date and Basic Info Row */}
//                         <div className="row g-2 mb-3">
//                             {company.dateFormat === 'nepali' || company.dateFormat === 'Nepali' ? (
//                                 <>
//                                     <div className="col-12 col-md-6 col-lg-3">
//                                         <div className="position-relative">
//                                             <input
//                                                 type="text"
//                                                 name="transactionDateNepali"
//                                                 id="transactionDateNepali"
//                                                 ref={transactionDateRef}
//                                                 autoComplete='off'
//                                                 className={`form-control form-control-sm no-date-icon ${dateErrors.transactionDateNepali ? 'is-invalid' : ''}`}
//                                                 value={formData.transactionDateNepali}
//                                                 onChange={(e) => {
//                                                     const value = e.target.value;
//                                                     const sanitizedValue = value.replace(/[^0-9/-]/g, '');

//                                                     if (sanitizedValue.length <= 10) {
//                                                         setFormData({ ...formData, transactionDateNepali: sanitizedValue });
//                                                         setDateErrors(prev => ({ ...prev, transactionDateNepali: '' }));
//                                                     }
//                                                 }}
//                                                 onKeyDown={(e) => {
//                                                     const allowedKeys = [
//                                                         'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
//                                                         'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
//                                                         'Home', 'End'
//                                                     ];

//                                                     if (!allowedKeys.includes(e.key) &&
//                                                         !/^\d$/.test(e.key) &&
//                                                         e.key !== '/' &&
//                                                         e.key !== '-' &&
//                                                         !e.ctrlKey && !e.metaKey) {
//                                                         e.preventDefault();
//                                                     }

//                                                     if (e.key === 'Enter') {
//                                                         e.preventDefault();
//                                                         handleKeyDown(e, 'transactionDateNepali');
//                                                     }
//                                                 }}
//                                                 placeholder="YYYY-MM-DD"
//                                                 required
//                                                 style={{
//                                                     height: '26px',
//                                                     fontSize: '0.875rem',
//                                                     paddingTop: '0.75rem',
//                                                     width: '100%'
//                                                 }}
//                                             />
//                                             <label
//                                                 className="position-absolute"
//                                                 style={{
//                                                     top: '-0.5rem',
//                                                     left: '0.75rem',
//                                                     fontSize: '0.75rem',
//                                                     backgroundColor: 'white',
//                                                     padding: '0 0.25rem',
//                                                     color: '#6c757d',
//                                                     fontWeight: '500'
//                                                 }}
//                                             >
//                                                 Transaction Date: <span className="text-danger">*</span>
//                                             </label>
//                                         </div>
//                                     </div>

//                                     <div className="col-12 col-md-6 col-lg-3">
//                                         <div className="position-relative">
//                                             <input
//                                                 type="text"
//                                                 name="nepaliDate"
//                                                 id="nepaliDate"
//                                                 autoComplete='off'
//                                                 className={`form-control form-control-sm no-date-icon ${dateErrors.nepaliDate ? 'is-invalid' : ''}`}
//                                                 value={formData.nepaliDate}
//                                                 onChange={(e) => {
//                                                     const value = e.target.value;
//                                                     const sanitizedValue = value.replace(/[^0-9/-]/g, '');

//                                                     if (sanitizedValue.length <= 10) {
//                                                         setFormData({ ...formData, nepaliDate: sanitizedValue });
//                                                         setDateErrors(prev => ({ ...prev, nepaliDate: '' }));
//                                                     }
//                                                 }}
//                                                 onKeyDown={(e) => {
//                                                     if (e.key === 'Enter') {
//                                                         e.preventDefault();
//                                                         handleKeyDown(e, 'nepaliDate');
//                                                     }
//                                                 }}
//                                                 placeholder="YYYY-MM-DD"
//                                                 required
//                                                 style={{
//                                                     height: '26px',
//                                                     fontSize: '0.875rem',
//                                                     paddingTop: '0.75rem',
//                                                     width: '100%'
//                                                 }}
//                                             />
//                                             <label
//                                                 className="position-absolute"
//                                                 style={{
//                                                     top: '-0.5rem',
//                                                     left: '0.75rem',
//                                                     fontSize: '0.75rem',
//                                                     backgroundColor: 'white',
//                                                     padding: '0 0.25rem',
//                                                     color: '#6c757d',
//                                                     fontWeight: '500'
//                                                 }}
//                                             >
//                                                 Return Date: <span className="text-danger">*</span>
//                                             </label>
//                                         </div>
//                                     </div>
//                                 </>
//                             ) : (
//                                 <>
//                                     <div className="col-12 col-md-6 col-lg-3">
//                                         <div className="position-relative">
//                                             <input
//                                                 type="date"
//                                                 name="transactionDateRoman"
//                                                 id="transactionDateRoman"
//                                                 className="form-control form-control-sm"
//                                                 ref={transactionDateRef}
//                                                 value={formData.transactionDateRoman}
//                                                 onChange={(e) => {
//                                                     const value = e.target.value;
//                                                     setFormData({ ...formData, transactionDateRoman: value });
//                                                 }}
//                                                 onKeyDown={(e) => {
//                                                     if (e.key === 'Enter') {
//                                                         e.preventDefault();
//                                                         handleKeyDown(e, 'transactionDateRoman');
//                                                     }
//                                                 }}
//                                                 max={new Date().toISOString().split('T')[0]}
//                                                 required
//                                                 style={{
//                                                     height: '26px',
//                                                     fontSize: '0.875rem',
//                                                     paddingTop: '0.75rem',
//                                                     width: '100%'
//                                                 }}
//                                             />
//                                             <label
//                                                 className="position-absolute"
//                                                 style={{
//                                                     top: '-0.5rem',
//                                                     left: '0.75rem',
//                                                     fontSize: '0.75rem',
//                                                     backgroundColor: 'white',
//                                                     padding: '0 0.25rem',
//                                                     color: '#6c757d',
//                                                     fontWeight: '500'
//                                                 }}
//                                             >
//                                                 Transaction Date: <span className="text-danger">*</span>
//                                             </label>
//                                         </div>
//                                     </div>

//                                     <div className="col-12 col-md-6 col-lg-3">
//                                         <div className="position-relative">
//                                             <input
//                                                 type="date"
//                                                 name="billDate"
//                                                 id="billDate"
//                                                 className="form-control form-control-sm"
//                                                 value={formData.billDate}
//                                                 onChange={(e) => {
//                                                     const value = e.target.value;
//                                                     setFormData({ ...formData, billDate: value });
//                                                 }}
//                                                 onKeyDown={(e) => {
//                                                     if (e.key === 'Enter') {
//                                                         e.preventDefault();
//                                                         handleKeyDown(e, 'billDate');
//                                                     }
//                                                 }}
//                                                 max={new Date().toISOString().split('T')[0]}
//                                                 required
//                                                 style={{
//                                                     height: '26px',
//                                                     fontSize: '0.875rem',
//                                                     paddingTop: '0.75rem',
//                                                     width: '100%'
//                                                 }}
//                                             />
//                                             <label
//                                                 className="position-absolute"
//                                                 style={{
//                                                     top: '-0.5rem',
//                                                     left: '0.75rem',
//                                                     fontSize: '0.75rem',
//                                                     backgroundColor: 'white',
//                                                     padding: '0 0.25rem',
//                                                     color: '#6c757d',
//                                                     fontWeight: '500'
//                                                 }}
//                                             >
//                                                 Return Date: <span className="text-danger">*</span>
//                                             </label>
//                                         </div>
//                                     </div>
//                                 </>
//                             )}

//                             <div className="col-12 col-md-6 col-lg-2">
//                                 <div className="position-relative">
//                                     <input
//                                         type="text"
//                                         name="billNumber"
//                                         id="billNumber"
//                                         className="form-control form-control-sm"
//                                         value={formData.billNumber}
//                                         readOnly
//                                         onKeyDown={(e) => {
//                                             if (e.key === 'Enter') {
//                                                 e.preventDefault();
//                                                 document.getElementById('paymentMode')?.focus();
//                                             }
//                                         }}
//                                         style={{
//                                             height: '26px',
//                                             fontSize: '0.875rem',
//                                             paddingTop: '0.75rem',
//                                             width: '100%'
//                                         }}
//                                     />
//                                     <label
//                                         className="position-absolute"
//                                         style={{
//                                             top: '-0.5rem',
//                                             left: '0.75rem',
//                                             fontSize: '0.75rem',
//                                             backgroundColor: 'white',
//                                             padding: '0 0.25rem',
//                                             color: '#6c757d',
//                                             fontWeight: '500'
//                                         }}
//                                     >
//                                         Return No:
//                                     </label>
//                                 </div>
//                             </div>

//                             <div className="col-12 col-md-6 col-lg-2">
//                                 <div className="position-relative">
//                                     <select
//                                         className="form-control form-control-sm"
//                                         name="paymentMode"
//                                         id="paymentMode"
//                                         value={formData.paymentMode}
//                                         onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
//                                         onKeyDown={(e) => {
//                                             if (e.key === 'Enter') {
//                                                 handleKeyDown(e, 'paymentMode');
//                                             }
//                                         }}
//                                         style={{
//                                             height: '26px',
//                                             fontSize: '0.875rem',
//                                             paddingTop: '0.25rem',
//                                             width: '100%'
//                                         }}
//                                     >
//                                         <option value="credit">credit</option>
//                                         <option value="cash">cash</option>
//                                     </select>
//                                     <label
//                                         className="position-absolute"
//                                         style={{
//                                             top: '-0.5rem',
//                                             left: '0.75rem',
//                                             fontSize: '0.75rem',
//                                             backgroundColor: 'white',
//                                             padding: '0 0.25rem',
//                                             color: '#6c757d',
//                                             fontWeight: '500'
//                                         }}
//                                     >
//                                         Payment Mode:
//                                     </label>
//                                 </div>
//                             </div>

//                             <div className="col-12 col-md-6 col-lg-2">
//                                 <div className="position-relative">
//                                     <select
//                                         className="form-control form-control-sm"
//                                         name="isVatExempt"
//                                         id="isVatExempt"
//                                         value={formData.isVatExempt}
//                                         onChange={(e) => setFormData({ ...formData, isVatExempt: e.target.value })}
//                                         onKeyDown={(e) => {
//                                             if (e.key === 'Enter') {
//                                                 handleKeyDown(e, 'isVatExempt');
//                                             }
//                                         }}
//                                         style={{
//                                             height: '26px',
//                                             fontSize: '0.875rem',
//                                             paddingTop: '0.25rem',
//                                             width: '100%'
//                                         }}
//                                     >
//                                         {company.vatEnabled && <option value="all">All</option>}
//                                         {company.vatEnabled && <option value="false">13%</option>}
//                                         <option value="true">Exempt</option>
//                                     </select>
//                                     <label
//                                         className="position-absolute"
//                                         style={{
//                                             top: '-0.5rem',
//                                             left: '0.75rem',
//                                             fontSize: '0.75rem',
//                                             backgroundColor: 'white',
//                                             padding: '0 0.25rem',
//                                             color: '#6c757d',
//                                             fontWeight: '500'
//                                         }}
//                                     >
//                                         VAT
//                                     </label>
//                                 </div>
//                             </div>
//                         </div>

//                         <div className="row g-2 mb-3">
//                             {/* Party Name Field */}
//                             <div className="col-12 col-md-6">
//                                 <div className="position-relative">
//                                     <input
//                                         type="text"
//                                         id="account"
//                                         name="account"
//                                         className="form-control form-control-sm"
//                                         value={formData.accountName}
//                                         onClick={() => setShowAccountModal(true)}
//                                         onFocus={() => setShowAccountModal(true)}
//                                         readOnly
//                                         required
//                                         onKeyDown={(e) => {
//                                             if (e.key === 'Enter') {
//                                                 handleKeyDown(e, 'account');
//                                             }
//                                         }}
//                                         style={{
//                                             height: '26px',
//                                             fontSize: '0.875rem',
//                                             paddingTop: '0.75rem',
//                                             width: '100%'
//                                         }}
//                                     />
//                                     <label
//                                         className="position-absolute"
//                                         style={{
//                                             top: '-0.5rem',
//                                             left: '0.75rem',
//                                             fontSize: '0.75rem',
//                                             backgroundColor: 'white',
//                                             padding: '0 0.25rem',
//                                             color: '#6c757d',
//                                             fontWeight: '500'
//                                         }}
//                                     >
//                                         Party Name: <span className="text-danger">*</span>
//                                     </label>
//                                     <input type="hidden" id="accountId" name="accountId" value={formData.accountId} />
//                                 </div>
//                             </div>

//                             <div className="col-12 col-md-2">
//                                 <div className="position-relative">
//                                     <div
//                                         className="form-control form-control-sm"
//                                         style={{
//                                             height: '26px',
//                                             fontSize: '0.875rem',
//                                             paddingTop: '0.4rem',
//                                             width: '100%',
//                                             border: '1px solid #ced4da',
//                                             borderRadius: '0.375rem',
//                                             overflow: 'hidden',
//                                             whiteSpace: 'nowrap'
//                                         }}
//                                     >
//                                         <AccountBalanceDisplay
//                                             accountId={formData.accountId}
//                                             api={api}
//                                             newTransactionAmount={parseFloat(totals.totalAmount) || 0}
//                                             compact={true}
//                                             transactionType="payment"
//                                             dateFormat={company.dateFormat}
//                                         />
//                                     </div>
//                                 </div>
//                             </div>

//                             {/* Party Address Field */}
//                             <div className="col-12 col-md-2">
//                                 <div className="position-relative">
//                                     <input
//                                         type="text"
//                                         id="address"
//                                         className="form-control form-control-sm"
//                                         value={formData.accountAddress}
//                                         onKeyDown={(e) => {
//                                             if (e.key === 'Enter') {
//                                                 handleKeyDown(e, 'address');
//                                             }
//                                         }}
//                                         readOnly
//                                         style={{
//                                             height: '26px',
//                                             fontSize: '0.875rem',
//                                             paddingTop: '0.75rem',
//                                             width: '100%'
//                                         }}
//                                     />
//                                     <label
//                                         className="position-absolute"
//                                         style={{
//                                             top: '-0.5rem',
//                                             left: '0.75rem',
//                                             fontSize: '0.75rem',
//                                             backgroundColor: 'white',
//                                             padding: '0 0.25rem',
//                                             color: '#6c757d',
//                                             fontWeight: '500'
//                                         }}
//                                     >
//                                         Address:
//                                     </label>
//                                 </div>
//                             </div>

//                             {/* VAT No Field */}
//                             <div className="col-12 col-md-2">
//                                 <div className="position-relative">
//                                     <input
//                                         type="text"
//                                         id="pan"
//                                         name="pan"
//                                         className="form-control form-control-sm"
//                                         value={formData.accountPan}
//                                         onKeyDown={(e) => {
//                                             if (e.key === 'Enter') {
//                                                 handleKeyDown(e, 'pan');
//                                             }
//                                         }}
//                                         readOnly
//                                         style={{
//                                             height: '26px',
//                                             fontSize: '0.875rem',
//                                             paddingTop: '0.75rem',
//                                             width: '100%'
//                                         }}
//                                     />
//                                     <label
//                                         className="position-absolute"
//                                         style={{
//                                             top: '-0.5rem',
//                                             left: '0.75rem',
//                                             fontSize: '0.75rem',
//                                             backgroundColor: 'white',
//                                             padding: '0 0.25rem',
//                                             color: '#6c757d',
//                                             fontWeight: '500'
//                                         }}
//                                     >
//                                         Vat No:
//                                     </label>
//                                 </div>
//                             </div>
//                         </div>

//                         <div
//                             className="table-responsive"
//                             style={{
//                                 minHeight: "270px",
//                                 maxHeight: "270px",
//                                 overflowY: "auto",
//                                 border: items.length > 0 ? '1px solid #dee2e6' : '1px dashed #ced4da',
//                                 backgroundColor: '#fff'
//                             }}
//                             ref={itemsTableRef}
//                         >
//                             <table className="table table-sm table-bordered table-hover mb-0">
//                                 <thead className="sticky-top bg-light">
//                                     {/* Header item selection row */}
//                                     <tr style={{
//                                         height: '26px',
//                                         backgroundColor: '#ffffff',
//                                         position: 'sticky',
//                                         top: 0,
//                                         zIndex: 10,
//                                         boxShadow: '0 2px 3px rgba(0,0,0,0.1)'
//                                     }}>
//                                         <td width="5%" style={{ padding: '2px', backgroundColor: '#ffffff' }}>
//                                             <div className="position-relative">
//                                                 <input
//                                                     type="text"
//                                                     id="headerItemSearch"
//                                                     className="form-control form-control-sm"
//                                                     placeholder="Search..."
//                                                     value={headerSearchQuery}
//                                                     onChange={handleHeaderItemSearch}
//                                                     onFocus={() => {
//                                                         setShowHeaderItemModal(true);
//                                                         handleHeaderSearchFocus();
//                                                     }}
//                                                     onKeyDown={(e) => {
//                                                         if (e.key === 'Enter') {
//                                                             e.preventDefault();
//                                                             if (!headerSearchQuery.trim()) {
//                                                                 setShowHeaderItemModal(false);
//                                                                 setTimeout(() => {
//                                                                     const discountInput = document.getElementById('discountPercentage');
//                                                                     if (discountInput) {
//                                                                         discountInput.focus();
//                                                                         discountInput.select();
//                                                                     }
//                                                                 }, 50);
//                                                             } else {
//                                                                 setShowHeaderItemModal(true);
//                                                             }
//                                                         } else if (e.key === 'Escape') {
//                                                             e.preventDefault();
//                                                             setShowHeaderItemModal(false);
//                                                         }
//                                                     }}
//                                                     style={{
//                                                         height: '20px',
//                                                         fontSize: '0.75rem',
//                                                         padding: '0 4px',
//                                                         backgroundColor: '#ffffff'
//                                                     }}
//                                                 />
//                                             </div>
//                                         </td>
//                                         <td width="5%" style={{
//                                             padding: '2px',
//                                             fontSize: '0.75rem',
//                                             textAlign: 'center',
//                                             backgroundColor: '#ffffff'
//                                         }}>
//                                             {selectedItemForInsert ? selectedItemForInsert.uniqueNumber || 'N/A' : ''}
//                                         </td>
//                                         <td width="8%" style={{
//                                             padding: '2px',
//                                             fontSize: '0.75rem',
//                                             textAlign: 'center',
//                                             backgroundColor: '#ffffff'
//                                         }}>
//                                             {selectedItemForInsert ? selectedItemForInsert.hscode || 'N/A' : ''}
//                                         </td>
//                                         <td width="20%" style={{
//                                             padding: '2px',
//                                             fontSize: '0.75rem',
//                                             backgroundColor: '#ffffff'
//                                         }}>
//                                             {selectedItemForInsert ? selectedItemForInsert.name : ''}
//                                         </td>
//                                         <td width="5%" style={{ padding: '2px', backgroundColor: '#ffffff' }}>
//                                             <input
//                                                 type="number"
//                                                 className="form-control form-control-sm"
//                                                 id='headerWsUnit'
//                                                 placeholder="WS Unit"
//                                                 value={selectedItemWsUnit}
//                                                 onChange={(e) => setSelectedItemWsUnit(parseFloat(e.target.value))}
//                                                 onKeyDown={(e) => {
//                                                     if ((e.key === 'Tab' || e.key === 'Enter')) {
//                                                         e.preventDefault();
//                                                         document.getElementById('headerBatch').focus();
//                                                         document.getElementById('headerBatch').select();
//                                                     }
//                                                 }}
//                                                 style={{
//                                                     height: '20px',
//                                                     fontSize: '0.75rem',
//                                                     padding: '0 4px',
//                                                     backgroundColor: '#ffffff'
//                                                 }}
//                                             />
//                                         </td>
//                                         <td width="8%" style={{ padding: '2px', backgroundColor: '#ffffff' }}>
//                                             <input
//                                                 type="text"
//                                                 className="form-control form-control-sm"
//                                                 id='headerBatch'
//                                                 placeholder="Batch"
//                                                 value={selectedItemBatchNumber}
//                                                 onChange={(e) => setSelectedItemBatchNumber(e.target.value)}
//                                                 onKeyDown={(e) => {
//                                                     if ((e.key === 'Tab' || e.key === 'Enter')) {
//                                                         e.preventDefault();
//                                                         document.getElementById('headerExpiryDate').focus();
//                                                     }
//                                                 }}
//                                                 style={{
//                                                     height: '20px',
//                                                     fontSize: '0.75rem',
//                                                     padding: '0 4px',
//                                                     backgroundColor: '#ffffff'
//                                                 }}
//                                             />
//                                         </td>
//                                         <td width="8%" style={{ padding: '2px', backgroundColor: '#ffffff' }}>
//                                             <input
//                                                 type="date"
//                                                 className="form-control form-control-sm"
//                                                 placeholder="Expiry"
//                                                 id="headerExpiryDate"
//                                                 value={selectedItemExpiryDate}
//                                                 onChange={(e) => setSelectedItemExpiryDate(e.target.value)}
//                                                 onKeyDown={(e) => {
//                                                     if ((e.key === 'Tab' || e.key === 'Enter')) {
//                                                         e.preventDefault();
//                                                         document.getElementById('headerQuantity').focus();
//                                                     }
//                                                 }}
//                                                 style={{
//                                                     height: '20px',
//                                                     fontSize: '0.75rem',
//                                                     padding: '0 4px',
//                                                     backgroundColor: '#ffffff'
//                                                 }}
//                                             />
//                                         </td>
//                                         <td width="8%" style={{ padding: '2px', backgroundColor: '#ffffff' }}>
//                                             <input
//                                                 type="number"
//                                                 className="form-control form-control-sm"
//                                                 placeholder="Qty"
//                                                 id="headerQuantity"
//                                                 value={selectedItemQuantity}
//                                                 onChange={(e) => setSelectedItemQuantity(parseFloat(e.target.value))}
//                                                 onFocus={(e) => e.target.select()}
//                                                 onKeyDown={(e) => {
//                                                     if ((e.key === 'Tab' || e.key === 'Enter')) {
//                                                         e.preventDefault();
//                                                         document.getElementById('headerRate').focus();
//                                                     }
//                                                 }}
//                                                 style={{
//                                                     height: '20px',
//                                                     fontSize: '0.75rem',
//                                                     padding: '0 4px',
//                                                     backgroundColor: '#ffffff'
//                                                 }}
//                                             />
//                                         </td>
//                                         <td width="8%" style={{
//                                             padding: '2px',
//                                             fontSize: '0.75rem',
//                                             textAlign: 'center',
//                                             backgroundColor: '#ffffff'
//                                         }}>
//                                             {selectedItemForInsert ? (selectedItemForInsert.unitName || 'N/A') : '-'}
//                                         </td>
//                                         <td width="8%" style={{ padding: '2px', backgroundColor: '#ffffff' }}>
//                                             <input
//                                                 type="number"
//                                                 className="form-control form-control-sm"
//                                                 placeholder="Rate"
//                                                 id="headerRate"
//                                                 value={Math.round(selectedItemRate * 100) / 100}
//                                                 onChange={(e) => setSelectedItemRate(parseFloat(e.target.value))}
//                                                 onFocus={(e) => e.target.select()}
//                                                 onKeyDown={(e) => {
//                                                     if ((e.key === 'Tab' || e.key === 'Enter')) {
//                                                         e.preventDefault();

//                                                         if (e.key === 'Enter') {
//                                                             if (!selectedItemBatchNumber.trim()) {
//                                                                 setNotification({
//                                                                     show: true,
//                                                                     message: 'Batch number is required before inserting item',
//                                                                     type: 'error'
//                                                                 });

//                                                                 setTimeout(() => {
//                                                                     const batchInput = document.getElementById('headerBatch');
//                                                                     if (batchInput) {
//                                                                         batchInput.focus();
//                                                                         batchInput.select();
//                                                                     }
//                                                                 }, 100);
//                                                                 return;
//                                                             }

//                                                             if (!selectedItemExpiryDate.trim()) {
//                                                                 setNotification({
//                                                                     show: true,
//                                                                     message: 'Expiry date is required before inserting item',
//                                                                     type: 'error'
//                                                                 });

//                                                                 setTimeout(() => {
//                                                                     const expiryInput = document.getElementById('headerExpiryDate');
//                                                                     if (expiryInput) {
//                                                                         expiryInput.focus();
//                                                                         expiryInput.select();
//                                                                     }
//                                                                 }, 100);
//                                                                 return;
//                                                             }

//                                                             insertSelectedItem();
//                                                         } else {
//                                                             document.getElementById('insertButton').focus();
//                                                         }
//                                                     }
//                                                 }}
//                                                 style={{
//                                                     height: '20px',
//                                                     fontSize: '0.75rem',
//                                                     padding: '0 4px',
//                                                     backgroundColor: '#ffffff'
//                                                 }}
//                                             />
//                                         </td>
//                                         <td width="10%" style={{
//                                             padding: '2px',
//                                             fontSize: '0.75rem',
//                                             textAlign: 'center',
//                                             backgroundColor: '#ffffff'
//                                         }}>
//                                             {formatter.format(selectedItemQuantity * selectedItemRate)}
//                                         </td>

//                                         <td width="10%" style={{
//                                             padding: '2px',
//                                             textAlign: 'center',
//                                             backgroundColor: '#ffffff'
//                                         }}>
//                                             <button
//                                                 type="button"
//                                                 id="insertButton"
//                                                 className="btn btn-sm btn-success py-0 px-2"
//                                                 onClick={() => {
//                                                     if (validateHeaderFields()) {
//                                                         insertSelectedItem();
//                                                     }
//                                                 }}
//                                                 disabled={!selectedItemForInsert}
//                                                 title={selectedItemForInsert ?
//                                                     `Insert item ${selectedItemQuantity > 0 ? `(Quantity: ${selectedItemQuantity})` : '(Quantity will be 0)'}`
//                                                     : 'Insert item'}
//                                                 onKeyDown={(e) => {
//                                                     if ((e.key === 'Tab' || e.key === 'Enter')) {
//                                                         e.preventDefault();
//                                                         if (validateHeaderFields()) {
//                                                             insertSelectedItem();
//                                                         }
//                                                     }
//                                                 }}
//                                                 style={{
//                                                     height: '20px',
//                                                     fontSize: '0.7rem',
//                                                     fontWeight: 'bold',
//                                                     backgroundColor: '#198754',
//                                                     borderColor: '#198754',
//                                                     opacity: !selectedItemForInsert ? 0.5 : 1
//                                                 }}
//                                             >
//                                                 INSERT
//                                             </button>
//                                         </td>
//                                     </tr>

//                                     {/* Column headers row */}
//                                     <tr style={{
//                                         height: '26px',
//                                         backgroundColor: '#e9ecef',
//                                         position: 'sticky',
//                                         top: '26px',
//                                         zIndex: 9
//                                     }}>
//                                         <th width="5%" style={{ padding: '3px', fontSize: '0.75rem' }}>S.N.</th>
//                                         <th width="5%" style={{ padding: '3px', fontSize: '0.75rem' }}>#</th>
//                                         <th width="8%" style={{ padding: '3px', fontSize: '0.75rem' }}>HSN</th>
//                                         <th width="20%" style={{ padding: '3px', fontSize: '0.75rem' }}>Description of Goods</th>
//                                         <th width="5%" style={{ padding: '3px', fontSize: '0.75rem' }}>WS Unit</th>
//                                         <th width="8%" style={{ padding: '3px', fontSize: '0.75rem' }}>Batch</th>
//                                         <th width="8%" style={{ padding: '3px', fontSize: '0.75rem' }}>Expiry</th>
//                                         <th width="8%" style={{ padding: '3px', fontSize: '0.75rem' }}>Qty</th>
//                                         <th width="8%" style={{ padding: '3px', fontSize: '0.75rem' }}>Unit</th>
//                                         <th width="8%" style={{ padding: '3px', fontSize: '0.75rem' }}>Rate</th>
//                                         <th width="10%" style={{ padding: '3px', fontSize: '0.75rem' }}>Amount</th>
//                                         <th width="10%" style={{ padding: '3px', fontSize: '0.75rem' }}>Action</th>
//                                     </tr>
//                                 </thead>
//                                 <tbody id="items" style={{ backgroundColor: '#fff' }}>
//                                     {items.map((item, index) => (
//                                         <tr key={index} className={`item ${item.vatStatus === 'vatable' ? 'vatable-item' : 'non-vatable-item'}`} style={{ height: '26px' }}>
//                                             <td style={{ padding: '3px', fontSize: '0.75rem' }}>{index + 1}</td>
//                                             <td style={{ padding: '3px', fontSize: '0.75rem' }}>{item.uniqueNumber}</td>
//                                             <td style={{ padding: '3px', fontSize: '0.75rem' }}>
//                                                 <input type="hidden" name={`items[${index}][hscode]`} value={item.hscode} />
//                                                 {item.hscode}
//                                             </td>
//                                             <td style={{ padding: '3px', fontSize: '0.75rem' }}>
//                                                 <input type="hidden" name={`items[${index}][itemId]`} value={item.itemId} />
//                                                 {item.name}
//                                             </td>
//                                             <td style={{ padding: '3px' }}>
//                                                 <input
//                                                     type="number"
//                                                     name={`items[${index}][wsUnit]`}
//                                                     className="form-control form-control-sm"
//                                                     id={`wsUnit-${index}`}
//                                                     value={item.wsUnit}
//                                                     onChange={(e) => updateItemField(index, 'wsUnit', parseFloat(e.target.value))}
//                                                     required
//                                                     onFocus={(e) => {
//                                                         e.target.select();
//                                                     }}
//                                                     onKeyDown={(e) => {
//                                                         if (e.key === 'Enter') {
//                                                             e.preventDefault();
//                                                             document.getElementById(`batchNumber-${index}`)?.focus();
//                                                         }
//                                                     }}
//                                                     style={{
//                                                         height: '20px',
//                                                         fontSize: '0.75rem',
//                                                         padding: '0 4px'
//                                                     }}
//                                                 />
//                                             </td>
//                                             <td style={{ padding: '3px' }}>
//                                                 <input
//                                                     type="text"
//                                                     name={`items[${index}][batchNumber]`}
//                                                     className="form-control form-control-sm"
//                                                     id={`batchNumber-${index}`}
//                                                     value={item.batchNumber}
//                                                     onChange={(e) => updateItemField(index, 'batchNumber', e.target.value)}
//                                                     onFocus={(e) => {
//                                                         e.target.select();
//                                                     }}
//                                                     required
//                                                     onKeyDown={(e) => {
//                                                         if (e.key === 'Enter') {
//                                                             e.preventDefault();
//                                                             document.getElementById(`expiryDate-${index}`)?.focus();
//                                                         }
//                                                     }}
//                                                     style={{
//                                                         height: '20px',
//                                                         fontSize: '0.75rem',
//                                                         padding: '0 4px'
//                                                     }}
//                                                 />
//                                             </td>
//                                             <td style={{ padding: '3px' }}>
//                                                 <input
//                                                     type="date"
//                                                     name={`items[${index}][expiryDate]`}
//                                                     className="form-control form-control-sm"
//                                                     id={`expiryDate-${index}`}
//                                                     value={item.expiryDate}
//                                                     onChange={(e) => updateItemField(index, 'expiryDate', e.target.value)}
//                                                     required
//                                                     onKeyDown={(e) => {
//                                                         if (e.key === 'Enter') {
//                                                             e.preventDefault();
//                                                             document.getElementById(`quantity-${index}`)?.focus();
//                                                         }
//                                                     }}
//                                                     style={{
//                                                         height: '20px',
//                                                         fontSize: '0.75rem',
//                                                         padding: '0 4px'
//                                                     }}
//                                                 />
//                                             </td>
//                                             <td style={{ padding: '3px' }}>
//                                                 <input
//                                                     type="number"
//                                                     name={`items[${index}][quantity]`}
//                                                     className="form-control form-control-sm"
//                                                     id={`quantity-${index}`}
//                                                     value={item.quantity}
//                                                     onChange={(e) => updateItemField(index, 'quantity', parseFloat(e.target.value))}
//                                                     required
//                                                     onFocus={(e) => {
//                                                         e.target.select();
//                                                     }}
//                                                     onKeyDown={(e) => {
//                                                         if (e.key === 'Enter') {
//                                                             e.preventDefault();
//                                                             document.getElementById(`puPrice-${index}`)?.focus();
//                                                         }
//                                                     }}
//                                                     style={{
//                                                         height: '20px',
//                                                         fontSize: '0.75rem',
//                                                         padding: '0 4px'
//                                                     }}
//                                                 />
//                                             </td>
//                                             <td className="text-nowrap" style={{ padding: '3px', fontSize: '0.75rem' }}>
//                                                 {item.unitName}
//                                                 <input type="hidden" name={`items[${index}][unitId]`} value={item.unitId} />
//                                             </td>
//                                             <td style={{ padding: '3px' }}>
//                                                 <input
//                                                     type="number"
//                                                     name={`items[${index}][puPrice]`}
//                                                     className="form-control form-control-sm"
//                                                     id={`puPrice-${index}`}
//                                                     value={item.puPrice}
//                                                     onChange={(e) => updateItemField(index, 'puPrice', parseFloat(e.target.value))}
//                                                     onFocus={(e) => {
//                                                         e.target.select();
//                                                     }}
//                                                     onKeyDown={(e) => {
//                                                         if (e.key === 'Enter') {
//                                                             e.preventDefault();
//                                                             document.getElementById('headerItemSearch')?.focus();
//                                                         }
//                                                     }}
//                                                     style={{
//                                                         height: '20px',
//                                                         fontSize: '0.75rem',
//                                                         padding: '0 4px'
//                                                     }}
//                                                 />
//                                             </td>
//                                             <td className="item-amount" style={{ padding: '3px', fontSize: '0.75rem' }}>{formatter.format(item.amount)}</td>
//                                             <td className="text-center" style={{ padding: '2px', whiteSpace: 'nowrap' }}>
//                                                 <button
//                                                     type="button"
//                                                     className="btn btn-sm btn-info py-0 px-1"
//                                                     onClick={() => fetchLastTransactions(item.itemId, index)}
//                                                     title="View last transactions"
//                                                     disabled={isLoadingTransactions}
//                                                     style={{
//                                                         height: '18px',
//                                                         width: '18px',
//                                                         minWidth: '18px',
//                                                         fontSize: '0.6rem',
//                                                         marginRight: '2px',
//                                                         backgroundColor: '#0dcaf0',
//                                                         borderColor: '#0dcaf0'
//                                                     }}
//                                                 >
//                                                     {isLoadingTransactions ? (
//                                                         <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" style={{ width: "8px", height: "8px" }}></span>
//                                                     ) : (
//                                                         <i className="bi bi-clock-history"></i>
//                                                     )}
//                                                 </button>
//                                                 <button
//                                                     type="button"
//                                                     className="btn btn-sm btn-danger py-0 px-1"
//                                                     onClick={() => removeItem(index)}
//                                                     style={{
//                                                         height: '18px',
//                                                         width: '18px',
//                                                         minWidth: '18px',
//                                                         fontSize: '0.6rem',
//                                                         marginLeft: '2px',
//                                                         backgroundColor: '#dc3545',
//                                                         borderColor: '#dc3545'
//                                                     }}
//                                                 >
//                                                     <i className="bi bi-trash"></i>
//                                                 </button>
//                                             </td>
//                                             <input type="hidden" name={`items[${index}][vatStatus]`} value={item.vatStatus} />
//                                             <input type="hidden" name={`items[${index}][uniqueUuid]`} value={item.uniqueUuid} />
//                                         </tr>
//                                     ))}

//                                     {items.length === 0 && (
//                                         <tr style={{ height: '24px' }}>
//                                             <td colSpan={12} className="text-center text-muted py-1" style={{ fontSize: '0.75rem' }}>
//                                                 No items added yet. Use the search box above to add items.
//                                             </td>
//                                         </tr>
//                                     )}
//                                 </tbody>
//                             </table>
//                         </div>

//                         {/* Totals Section */}
//                         <div className="table-responsive mb-2">
//                             <table className="table table-sm table-bordered mb-1">
//                                 <thead>
//                                     <tr>
//                                         <th colSpan="6" className="text-center bg-light py-1" style={{ padding: '2px' }}>Bill Details</th>
//                                     </tr>
//                                 </thead>
//                                 <tbody>
//                                     <tr>
//                                         <td style={{ width: '15%', padding: '1px' }}>
//                                             <label className="form-label mb-0" style={{ fontSize: '0.8rem' }}>Sub Total:</label>
//                                         </td>
//                                         <td style={{ width: '20%', padding: '1px' }}>
//                                             <p className="form-control-plaintext mb-0" style={{ fontSize: '0.8rem' }}>Rs. {totals.subTotal.toFixed(2)}</p>
//                                         </td>
//                                         <td style={{ width: '15%', padding: '1px' }}>
//                                             <label className="form-label mb-0" style={{ fontSize: '0.8rem' }}>Discount %:</label>
//                                         </td>
//                                         <td style={{ width: '20%', padding: '1px' }}>
//                                             <div className="position-relative">
//                                                 <input
//                                                     type="number"
//                                                     step="any"
//                                                     name="discountPercentage"
//                                                     id="discountPercentage"
//                                                     className="form-control form-control-sm"
//                                                     value={formData.discountPercentage}
//                                                     onChange={handleDiscountPercentageChange}
//                                                     onFocus={(e) => {
//                                                         e.target.select();
//                                                     }}
//                                                     onKeyDown={(e) => {
//                                                         if (e.key === 'Enter') {
//                                                             handleKeyDown(e, 'discountPercentage');
//                                                         }
//                                                     }}
//                                                     style={{
//                                                         height: '22px',
//                                                         fontSize: '0.875rem',
//                                                         paddingTop: '0.5rem',
//                                                         width: '100%'
//                                                     }}
//                                                 />
//                                             </div>
//                                         </td>
//                                         <td style={{ width: '15%', padding: '1px' }}>
//                                             <label className="form-label mb-0" style={{ fontSize: '0.8rem' }}>Discount (Rs.):</label>
//                                         </td>
//                                         <td style={{ width: '15%', padding: '1px' }}>
//                                             <div className="position-relative">
//                                                 <input
//                                                     type="number"
//                                                     step="any"
//                                                     name="discountAmount"
//                                                     id="discountAmount"
//                                                     value={formData.discountAmount}
//                                                     className="form-control form-control-sm"
//                                                     onChange={handleDiscountAmountChange}
//                                                     onFocus={(e) => {
//                                                         e.target.select();
//                                                     }}
//                                                     onKeyDown={(e) => {
//                                                         if (e.key === 'Enter') {
//                                                             handleKeyDown(e, 'discountAmount');
//                                                         }
//                                                     }}
//                                                     style={{
//                                                         height: '22px',
//                                                         fontSize: '0.875rem',
//                                                         paddingTop: '0.5rem',
//                                                         width: '100%'
//                                                     }}
//                                                 />
//                                             </div>
//                                         </td>
//                                     </tr>

//                                     <tr id="taxableAmountRow">
//                                         {company.vatEnabled && formData.isVatExempt !== 'true' && (
//                                             <>
//                                                 <td style={{ padding: '1px' }}>
//                                                     <label className="form-label mb-0" style={{ fontSize: '0.8rem' }}>Taxable Amount:</label>
//                                                 </td>
//                                                 <td style={{ padding: '1px' }}>
//                                                     <p className="form-control-plaintext mb-0" style={{ fontSize: '0.8rem' }}>Rs. {totals.taxableAmount.toFixed(2)}</p>
//                                                 </td>
//                                                 <td style={{ padding: '1px' }}>
//                                                     <label className="form-label mb-0" style={{ fontSize: '0.8rem' }}>VAT %:</label>
//                                                 </td>
//                                                 <td style={{ padding: '1px' }}>
//                                                     <p className="form-control-plaintext mb-0" style={{ fontSize: '0.8rem' }}>{formData.vatPercentage}%</p>
//                                                 </td>
//                                                 <td style={{ padding: '1px' }}>
//                                                     <label className="form-label mb-0" style={{ fontSize: '0.8rem' }}>VAT Amount:</label>
//                                                 </td>
//                                                 <td style={{ padding: '1px' }}>
//                                                     <p className="form-control-plaintext mb-0" style={{ fontSize: '0.8rem' }}>Rs. {totals.vatAmount.toFixed(2)}</p>
//                                                 </td>
//                                             </>
//                                         )}
//                                         {company.vatEnabled && formData.isVatExempt === 'true' && (
//                                             <td colSpan="6" className="text-center text-muted">
//                                                 VAT Exempt
//                                             </td>
//                                         )}
//                                     </tr>

//                                     <tr>
//                                         <td style={{ padding: '1px' }}>
//                                             <label className="form-label mb-0" style={{ fontSize: '0.8rem' }}>Round Off:</label>
//                                         </td>
//                                         <td style={{ padding: '1px' }}>
//                                             <div className="position-relative">
//                                                 <div className="input-group input-group-sm">
//                                                     <input
//                                                         type="number"
//                                                         className="form-control form-control-sm"
//                                                         step="any"
//                                                         id="roundOffAmount"
//                                                         name="roundOffAmount"
//                                                         value={roundOffPurchase && !manualRoundOffOverride ? totals.autoRoundOffAmount.toFixed(2) : formData.roundOffAmount}
//                                                         onChange={(e) => {
//                                                             if (roundOffPurchase) {
//                                                                 setManualRoundOffOverride(true);
//                                                             }
//                                                             setFormData({ ...formData, roundOffAmount: parseFloat(e.target.value) || 0 });
//                                                         }}
//                                                         onFocus={(e) => {
//                                                             e.target.select();
//                                                             if (roundOffPurchase && !manualRoundOffOverride) {
//                                                                 setFormData(prev => ({
//                                                                     ...prev,
//                                                                     roundOffAmount: totals.autoRoundOffAmount.toFixed(2)
//                                                                 }));
//                                                             }
//                                                         }}
//                                                         onBlur={(e) => {
//                                                             if (roundOffPurchase && parseFloat(e.target.value) === totals.autoRoundOffAmount) {
//                                                                 setManualRoundOffOverride(false);
//                                                             }
//                                                         }}
//                                                         onKeyDown={(e) => {
//                                                             if (e.key === 'Enter') {
//                                                                 e.preventDefault();
//                                                                 document.getElementById('saveBill')?.focus();
//                                                             }
//                                                         }}
//                                                         style={{
//                                                             height: '22px',
//                                                             fontSize: '0.875rem',
//                                                             width: '100%'
//                                                         }}
//                                                     />
//                                                     {roundOffPurchase && (
//                                                         <button
//                                                             type="button"
//                                                             className="btn btn-outline-secondary btn-sm"
//                                                             onClick={() => {
//                                                                 if (manualRoundOffOverride) {
//                                                                     setManualRoundOffOverride(false);
//                                                                     setFormData(prev => ({
//                                                                         ...prev,
//                                                                         roundOffAmount: totals.autoRoundOffAmount.toFixed(2)
//                                                                     }));
//                                                                 } else {
//                                                                     setManualRoundOffOverride(true);
//                                                                     setFormData(prev => ({
//                                                                         ...prev,
//                                                                         roundOffAmount: totals.autoRoundOffAmount.toFixed(2)
//                                                                     }));
//                                                                 }
//                                                             }}
//                                                             title={manualRoundOffOverride ? "Use auto round-off" : "Switch to manual input"}
//                                                             style={{
//                                                                 height: '22px',
//                                                                 fontSize: '0.75rem'
//                                                             }}
//                                                         >
//                                                             {manualRoundOffOverride ? (
//                                                                 <i className="bi bi-arrow-clockwise"></i>
//                                                             ) : (
//                                                                 <i className="bi bi-pencil"></i>
//                                                             )}
//                                                         </button>
//                                                     )}
//                                                 </div>
//                                                 {roundOffPurchase && (
//                                                     <small className="text-muted" style={{ fontSize: '0.65rem' }}>
//                                                         {manualRoundOffOverride ? "Manual override active" : "Auto round-off enabled"}
//                                                     </small>
//                                                 )}
//                                             </div>
//                                         </td>
//                                         <td style={{ padding: '1px' }}>
//                                             <label className="form-label mb-0" style={{ fontSize: '0.8rem' }}>Total Amount:</label>
//                                         </td>
//                                         <td style={{ padding: '1px' }}>
//                                             <p className="form-control-plaintext mb-0" style={{ fontSize: '0.8rem' }}>Rs. {totals.totalAmount.toFixed(2)}</p>
//                                         </td>
//                                         <td style={{ padding: '1px' }}>
//                                             <label className="form-label mb-0" style={{ fontSize: '0.8rem' }}>In Words:</label>
//                                         </td>
//                                         <td style={{ padding: '1px' }}>
//                                             <div
//                                                 className="form-control-plaintext mb-0"
//                                                 style={{
//                                                     fontSize: '0.7rem',
//                                                     lineHeight: '1.1',
//                                                     maxHeight: '44px',
//                                                     overflow: 'hidden',
//                                                     textOverflow: 'ellipsis',
//                                                     display: '-webkit-box',
//                                                     WebkitLineClamp: 2,
//                                                     WebkitBoxOrient: 'vertical',
//                                                     wordBreak: 'break-word',
//                                                     whiteSpace: 'normal'
//                                                 }}
//                                                 id="amountInWords"
//                                                 title={convertToRupeesAndPaisa(totals.totalAmount) + " Only."}
//                                             >
//                                                 {convertToRupeesAndPaisa(totals.totalAmount)} Only.
//                                             </div>
//                                         </td>
//                                     </tr>
//                                 </tbody>
//                             </table>
//                         </div>

//                         {/* Action Buttons */}
//                         <div className="d-flex justify-content-between align-items-center">
//                             {/* Print After Save Checkbox */}
//                             <div className="form-check mb-0 d-flex align-items-center">
//                                 <input
//                                     className="form-check-input mt-0"
//                                     type="checkbox"
//                                     id="printAfterSave"
//                                     checked={printAfterSave}
//                                     onChange={handlePrintAfterSaveChange}
//                                     style={{
//                                         height: '14px',
//                                         width: '14px'
//                                     }}
//                                 />
//                                 <label
//                                     className="form-check-label ms-2"
//                                     htmlFor="printAfterSave"
//                                     style={{
//                                         fontSize: '0.8rem',
//                                         marginBottom: '0'
//                                     }}
//                                 >
//                                     Print after save
//                                 </label>
//                             </div>

//                             {/* Action Buttons */}
//                             <div className="d-flex gap-2">
//                                 <Button variant="secondary" className="btn-sm d-flex align-items-center" onClick={handleBack}>
//                                     <BiArrowBack /> Back
//                                 </Button>
//                                 <button
//                                     type="submit"
//                                     className="btn btn-primary btn-sm d-flex align-items-center"
//                                     id="saveBill"
//                                     disabled={isSaving}
//                                     onKeyDown={(e) => {
//                                         if (e.key === 'Enter') {
//                                             e.preventDefault();
//                                             handleSubmit(e, printAfterSave);
//                                         }
//                                     }}
//                                     style={{
//                                         height: '26px',
//                                         padding: '0 16px',
//                                         fontSize: '0.8rem',
//                                         fontWeight: '500'
//                                     }}
//                                 >
//                                     {isSaving ? (
//                                         <>
//                                             <span
//                                                 className="spinner-border spinner-border-sm me-2"
//                                                 role="status"
//                                                 aria-hidden="true"
//                                                 style={{ width: '10px', height: '10px' }}
//                                             ></span>
//                                             Updating...
//                                         </>
//                                     ) : (
//                                         <>
//                                             <i className="bi bi-save me-1" style={{ fontSize: '0.9rem' }}></i> Update
//                                         </>
//                                     )}
//                                 </button>
//                             </div>
//                         </div>
//                     </form>
//                 </div>
//             </div>

//             {/* Header Item Modal */}
//             {showHeaderItemModal && (
//                 <div
//                     className="modal fade show"
//                     id="headerItemModal"
//                     tabIndex="-1"
//                     style={{
//                         display: 'block',
//                         backgroundColor: 'rgba(0,0,0,0.5)',
//                         position: 'fixed',
//                         top: 0,
//                         left: 0,
//                         right: 0,
//                         bottom: 0,
//                         zIndex: 1050
//                     }}
//                 >
//                     <div
//                         className="modal-dialog modal-xl"
//                         style={{
//                             position: 'absolute',
//                             top: 'auto',
//                             bottom: '0',
//                             left: '50%',
//                             transform: 'translateX(-50%)',
//                             margin: '0',
//                             width: '90%',
//                             maxWidth: '90%'
//                         }}
//                     >
//                         <div
//                             className="modal-content"
//                             style={{
//                                 height: '35vh',
//                                 borderBottomLeftRadius: '0',
//                                 borderBottomRightRadius: '0',
//                                 borderTopLeftRadius: '0.5rem',
//                                 borderTopRightRadius: '0.5rem'
//                             }}
//                         >
//                             <div className="modal-header py-0">
//                                 <h5 className="modal-title" style={{ fontSize: '0.9rem' }}>Select Item</h5>
//                                 <div className="d-flex align-items-center" style={{ flex: 1, marginLeft: '10px' }}>
//                                     <div className="position-relative" style={{ width: '100%' }}>
//                                         <input
//                                             type="text"
//                                             className="form-control form-control-sm"
//                                             placeholder="Search items... (Press F6 to create new item)"
//                                             autoComplete='off'
//                                             value={headerSearchQuery}
//                                             onChange={handleHeaderItemSearch}
//                                             autoFocus
//                                             onKeyDown={(e) => {
//                                                 if (e.key === 'ArrowDown') {
//                                                     e.preventDefault();
//                                                     const firstItem = document.querySelector('.dropdown-item');
//                                                     if (firstItem) {
//                                                         firstItem.focus();
//                                                     }
//                                                 } else if (e.key === 'Enter') {
//                                                     e.preventDefault();
//                                                     const activeItem = document.querySelector('.dropdown-item.active');

//                                                     if (activeItem) {
//                                                         const index = parseInt(activeItem.getAttribute('data-index'));
//                                                         const itemToAdd = headerSearchResults[index];
//                                                         if (itemToAdd) {
//                                                             selectItemForInsert(itemToAdd);
//                                                             setShowHeaderItemModal(false);
//                                                         }
//                                                     } else {
//                                                         if (!headerSearchQuery.trim()) {
//                                                             setShowHeaderItemModal(false);
//                                                             setTimeout(() => {
//                                                                 const discountInput = document.getElementById('discountPercentage');
//                                                                 if (discountInput) {
//                                                                     discountInput.focus();
//                                                                     discountInput.select();
//                                                                 }
//                                                             }, 50);
//                                                         }
//                                                     }
//                                                 } else if (e.key === 'F6') {
//                                                     e.preventDefault();
//                                                     setShowItemsModal(true);
//                                                     setShowHeaderItemModal(false);
//                                                     setHeaderSearchQuery('');
//                                                     setHeaderShouldShowLastSearchResults(false);
//                                                     setHeaderLastSearchQuery('');
//                                                 } else if (e.key === 'Escape') {
//                                                     e.preventDefault();
//                                                     setShowHeaderItemModal(false);
//                                                 }
//                                             }}
//                                             style={{
//                                                 height: '24px',
//                                                 fontSize: '0.75rem',
//                                                 padding: '0.25rem 0.5rem',
//                                                 width: '100%'
//                                             }}
//                                         />
//                                     </div>
//                                 </div>
//                                 <button
//                                     type="button"
//                                     className="btn-close"
//                                     onClick={() => {
//                                         setShowHeaderItemModal(false);
//                                         if (!headerShouldShowLastSearchResults) {
//                                             setHeaderSearchQuery('');
//                                             setHeaderLastSearchQuery('');
//                                         }
//                                         setHeaderSearchResults([]);
//                                         setHeaderSearchPage(1);
//                                     }}
//                                     aria-label="Close"
//                                     style={{ fontSize: '0.6rem', padding: '0.25rem' }}
//                                 ></button>
//                             </div>

//                             <div className="modal-body p-0">
//                                 <div style={{ height: 'calc(35vh - 60px)' }}>
//                                     <div
//                                         id="dropdownMenu"
//                                         className="w-100 h-100"
//                                         style={{
//                                             border: '1px solid #dee2e6',
//                                             borderRadius: '0.25rem',
//                                             overflow: 'hidden'
//                                         }}
//                                     >
//                                         <div className="dropdown-header" style={{
//                                             display: 'grid',
//                                             gridTemplateColumns: 'repeat(7, 1fr)',
//                                             alignItems: 'center',
//                                             padding: '0 8px',
//                                             height: '20px',
//                                             background: '#f0f0f0',
//                                             fontWeight: 'bold',
//                                             borderBottom: '1px solid #dee2e6',
//                                             position: 'sticky',
//                                             top: 0,
//                                             zIndex: 1,
//                                             fontSize: '0.7rem'
//                                         }}>
//                                             <div><strong>#</strong></div>
//                                             <div><strong>HSN</strong></div>
//                                             <div><strong>Description</strong></div>
//                                             <div><strong>Category</strong></div>
//                                             <div><strong>Stock</strong></div>
//                                             <div><strong>Unit</strong></div>
//                                             <div><strong>Rate</strong></div>
//                                         </div>

//                                         {(headerSearchResults.length > 0 || (headerShouldShowLastSearchResults && headerSearchResults.length > 0)) ? (
//                                             <VirtualizedItemListForPurchase
//                                                 items={headerSearchResults}
//                                                 onItemClick={(item) => {
//                                                     selectItemForInsert(item);
//                                                     setShowHeaderItemModal(false);
//                                                 }}
//                                                 searchRef={{ current: document.querySelector('#headerItemModal input[type="text"]') }}
//                                                 hasMore={hasMoreHeaderSearchResults}
//                                                 isSearching={isHeaderSearching}
//                                                 onLoadMore={loadMoreHeaderSearchItems}
//                                                 totalItems={totalHeaderSearchItems}
//                                                 page={headerSearchPage}
//                                                 searchQuery={headerShouldShowLastSearchResults ? headerLastSearchQuery : headerSearchQuery}
//                                                 setNotification={setNotification}
//                                             />
//                                         ) : (
//                                             <div className="text-center py-3 text-muted" style={{ fontSize: '0.75rem' }}>
//                                                 {headerSearchQuery ? 'No items found' : 'Type to search items'}
//                                                 <div className="small mt-1">
//                                                     <small className="text-info">Press F6 to create a new item</small>
//                                                 </div>
//                                             </div>
//                                         )}
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             )}

//             {/* Account Modal */}
//             {showAccountModal && (
//                 <div
//                     className="modal fade show"
//                     id="accountModal"
//                     tabIndex="-1"
//                     style={{ display: 'block' }}
//                     onKeyDown={(e) => {
//                         if (e.key === 'Escape') {
//                             handleAccountModalClose();
//                             setTimeout(() => {
//                                 document.getElementById('address').focus();
//                             }, 0);
//                         }
//                     }}
//                 >
//                     <div className="modal-dialog modal-xl modal-dialog-centered">
//                         <div className="modal-content" style={{ height: '400px' }}>
//                             <div className="modal-header py-1">
//                                 <h5 className="modal-title" id="accountModalLabel" style={{ fontSize: '0.9rem' }}>
//                                     Select an Account
//                                 </h5>
//                                 <small className="ms-auto text-muted" style={{ fontSize: '0.7rem' }}>
//                                     {totalAccounts > 0 ? `${accounts.length} of ${totalAccounts} accounts shown` : 'Loading accounts...'}
//                                 </small>
//                                 <button
//                                     type="button"
//                                     className="btn-close"
//                                     onClick={handleAccountModalClose}
//                                     aria-label="Close"
//                                     style={{ fontSize: '0.6rem', padding: '0.25rem' }}
//                                 ></button>
//                             </div>
//                             <div className="p-2 bg-white sticky-top">
//                                 <input
//                                     type="text"
//                                     id="searchAccount"
//                                     className="form-control form-control-sm"
//                                     placeholder="Search Account... (Press F6 to create new account)"
//                                     autoFocus
//                                     autoComplete='off'
//                                     value={accountSearchQuery}
//                                     onChange={handleAccountSearch}
//                                     onKeyDown={(e) => {
//                                         if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
//                                             e.preventDefault();
//                                             const firstAccountItem = document.querySelector('.account-item');
//                                             if (firstAccountItem) {
//                                                 firstAccountItem.focus();
//                                             }
//                                         } else if (e.key === 'Enter') {
//                                             e.preventDefault();
//                                             const firstAccountItem = document.querySelector('.account-item.active');
//                                             if (firstAccountItem) {
//                                                 const accountId = firstAccountItem.getAttribute('data-account-id');
//                                                 const account = accounts.find(a => a.id === accountId);
//                                                 if (account) {
//                                                     selectAccount(account);
//                                                     document.getElementById('address').focus();
//                                                 }
//                                             }
//                                         } else if (e.key === 'F6') {
//                                             e.preventDefault();
//                                             setShowAccountCreationModal(true);
//                                             handleAccountModalClose();
//                                         }
//                                     }}
//                                     ref={accountSearchRef}
//                                     style={{
//                                         height: '24px',
//                                         fontSize: '0.75rem',
//                                         padding: '0.25rem 0.5rem'
//                                     }}
//                                 />
//                             </div>
//                             <div className="modal-body p-0">
//                                 <div style={{ height: 'calc(320px - 40px)' }}>
//                                     <VirtualizedAccountList
//                                         accounts={accounts}
//                                         onAccountClick={(account) => {
//                                             selectAccount(account);
//                                             document.getElementById('address').focus();
//                                         }}
//                                         searchRef={accountSearchRef}
//                                         hasMore={hasMoreAccountResults}
//                                         isSearching={isAccountSearching}
//                                         onLoadMore={loadMoreAccounts}
//                                         totalAccounts={totalAccounts}
//                                         page={accountSearchPage}
//                                         searchQuery={accountShouldShowLastSearchResults ? accountLastSearchQuery : accountSearchQuery}
//                                     />
//                                 </div>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             )}

//             {/* Transaction Modal */}
//             {showTransactionModal && (
//                 <div className="modal fade show" id="transactionModal" tabIndex="-1" style={{ display: 'block' }} role="dialog" aria-labelledby="transactionModalLabel" aria-modal="true">
//                     <div className="modal-dialog modal-xl modal-dialog-centered">
//                         <div className="modal-content">
//                             <div className="modal-header py-1 px-3" style={{ minHeight: '40px' }}>
//                                 <h6 className="modal-title mb-0" id="transactionModalLabel" style={{ fontSize: '1rem' }}>
//                                     Last Purchase Return Transactions
//                                 </h6>
//                                 <button
//                                     type="button"
//                                     className="close p-0"
//                                     onClick={handleTransactionModalClose}
//                                     aria-label="Close"
//                                     style={{
//                                         margin: '0',
//                                         fontSize: '1.2rem',
//                                         lineHeight: '1',
//                                         background: 'none',
//                                         border: 'none'
//                                     }}
//                                 >
//                                     <span aria-hidden="true">&times;</span>
//                                 </button>
//                             </div>

//                             <div className="modal-body p-0">
//                                 <div className="table-responsive" style={{ maxHeight: '200px', overflowY: 'auto' }}>
//                                     <table className="table table-sm table-hover mb-0 small">
//                                         <thead>
//                                             <tr className="sticky-top bg-light" style={{ top: 0 }}>
//                                                 <th style={{
//                                                     width: '5%',
//                                                     padding: '0.15rem 0.3rem',
//                                                     fontSize: '0.75rem',
//                                                     whiteSpace: 'nowrap'
//                                                 }}>#</th>
//                                                 <th style={{
//                                                     width: '15%',
//                                                     padding: '0.15rem 0.3rem',
//                                                     fontSize: '0.75rem',
//                                                     whiteSpace: 'nowrap'
//                                                 }}>Date</th>
//                                                 <th style={{
//                                                     width: '15%',
//                                                     padding: '0.15rem 0.3rem',
//                                                     fontSize: '0.75rem',
//                                                     whiteSpace: 'nowrap'
//                                                 }}>Return No.</th>
//                                                 <th style={{
//                                                     width: '10%',
//                                                     padding: '0.15rem 0.3rem',
//                                                     fontSize: '0.75rem',
//                                                     whiteSpace: 'nowrap'
//                                                 }}>Type</th>
//                                                 <th style={{
//                                                     width: '10%',
//                                                     padding: '0.15rem 0.3rem',
//                                                     fontSize: '0.75rem',
//                                                     whiteSpace: 'nowrap'
//                                                 }}>A/c Type</th>
//                                                 <th style={{
//                                                     width: '10%',
//                                                     padding: '0.15rem 0.3rem',
//                                                     fontSize: '0.75rem',
//                                                     whiteSpace: 'nowrap'
//                                                 }}>Pay.Mode</th>
//                                                 <th style={{
//                                                     width: '10%',
//                                                     padding: '0.15rem 0.3rem',
//                                                     fontSize: '0.75rem',
//                                                     whiteSpace: 'nowrap',
//                                                     textAlign: 'right'
//                                                 }}>Qty.</th>
//                                                 <th style={{
//                                                     width: '10%',
//                                                     padding: '0.15rem 0.3rem',
//                                                     fontSize: '0.75rem',
//                                                     whiteSpace: 'nowrap'
//                                                 }}>Unit</th>
//                                                 <th style={{
//                                                     width: '15%',
//                                                     padding: '0.15rem 0.3rem',
//                                                     fontSize: '0.75rem',
//                                                     whiteSpace: 'nowrap',
//                                                     textAlign: 'right'
//                                                 }}>Rate</th>
//                                             </tr>
//                                         </thead>
//                                         <tbody>
//                                             {transactions.length > 0 ? (
//                                                 transactions.map((transaction, index) => (
//                                                     <tr
//                                                         key={index}
//                                                         style={{
//                                                             cursor: 'pointer',
//                                                             height: '28px',
//                                                             fontSize: '0.8rem'
//                                                         }}
//                                                         onClick={() => {
//                                                             if (transaction.purchaseReturnBillId && transaction.purchaseReturnBillId.id) {
//                                                                 navigate(`/retailer/purchase-return/${transaction.purchaseReturnBillId.id}/print`);
//                                                             }
//                                                         }}
//                                                         onKeyDown={(e) => {
//                                                             if (e.key === 'Enter') {
//                                                                 e.preventDefault();
//                                                                 if (transaction.purchaseReturnBillId && transaction.purchaseReturnBillId.id) {
//                                                                     navigate(`/retailer/purchase-return/${transaction.purchaseReturnBillId.id}/print`);
//                                                                 }
//                                                             } else if (e.key === 'Tab') {
//                                                                 e.preventDefault();
//                                                                 continueButtonRef.current?.focus();
//                                                             }
//                                                         }}
//                                                         tabIndex={0}
//                                                     >
//                                                         <td style={{ padding: '0.15rem 0.3rem' }}>{index + 1}</td>
//                                                         <td style={{ padding: '0.15rem 0.3rem', whiteSpace: 'nowrap' }}>
//                                                             {new NepaliDate(transaction.date).format('YYYY-MM-DD')}
//                                                         </td>
//                                                         <td style={{ padding: '0.15rem 0.3rem', fontWeight: '500' }}>
//                                                             {transaction.billNumber || 'N/A'}
//                                                         </td>
//                                                         <td style={{ padding: '0.15rem 0.3rem' }}>{transaction.type || 'N/A'}</td>
//                                                         <td style={{ padding: '0.15rem 0.3rem' }}>{transaction.purchaseSalesReturnType || 'N/A'}</td>
//                                                         <td style={{ padding: '0.15rem 0.3rem' }}>{transaction.paymentMode || 'N/A'}</td>
//                                                         <td style={{ padding: '0.15rem 0.3rem', textAlign: 'right' }}>{transaction.quantity || 0}</td>
//                                                         <td style={{ padding: '0.15rem 0.3rem' }}>{transaction.unit?.name || 'N/A'}</td>
//                                                         <td style={{ padding: '0.15rem 0.3rem', textAlign: 'right', fontWeight: '500' }}>
//                                                             Rs.{transaction.puPrice ? Math.round(transaction.puPrice * 100) / 100 : 0}
//                                                         </td>
//                                                     </tr>
//                                                 ))
//                                             ) : (
//                                                 <tr style={{ height: '28px' }}>
//                                                     <td colSpan="9" className="text-center text-muted align-middle" style={{ padding: '0.15rem 0.3rem' }}>
//                                                         No previous purchase return transactions found
//                                                     </td>
//                                                 </tr>
//                                             )}
//                                         </tbody>
//                                     </table>
//                                 </div>
//                             </div>

//                             <div className="modal-footer py-1 px-3" style={{ minHeight: '45px' }}>
//                                 <button
//                                     ref={continueButtonRef}
//                                     type="button"
//                                     className="btn btn-primary btn-sm py-1 px-3"
//                                     onClick={handleTransactionModalClose}
//                                     onKeyDown={(e) => {
//                                         if (e.key === 'Enter') {
//                                             e.preventDefault();
//                                             handleTransactionModalClose();
//                                         } else if (e.key === 'Tab' && !e.shiftKey) {
//                                             e.preventDefault();
//                                             const firstTransactionRow = document.querySelector('tbody tr');
//                                             if (firstTransactionRow) {
//                                                 firstTransactionRow.focus();
//                                             }
//                                         }
//                                     }}
//                                     style={{
//                                         fontSize: '0.8rem',
//                                         lineHeight: '1.2',
//                                         minHeight: '28px'
//                                     }}
//                                 >
//                                     Continue
//                                 </button>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             )}

//             {/* Product modal */}
//             {showProductModal && (
//                 <ProductModal onClose={() => setShowProductModal(false)} />
//             )}

//             {/* Account Creation Modal */}
//             {showAccountCreationModal && (
//                 <div className="modal fade show" tabIndex="-1" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.7)' }}>
//                     <div className="modal-dialog modal-fullscreen">
//                         <div className="modal-content" style={{ height: '95vh', margin: '2.5vh auto' }}>
//                             <div className="modal-header bg-primary text-white">
//                                 <h5 className="modal-title">Create New Account</h5>
//                                 <div className="d-flex align-items-center">
//                                     <button
//                                         type="button"
//                                         className="btn-close btn-close-white"
//                                         onClick={handleAccountCreationModalClose}
//                                     ></button>
//                                 </div>
//                             </div>
//                             <div className="modal-body p-0">
//                                 <iframe
//                                     src="/retailer/accounts"
//                                     title="Account Creation"
//                                     style={{ width: '100%', height: '100%', border: 'none' }}
//                                 />
//                             </div>
//                             <div className="modal-footer bg-light">
//                                 <button
//                                     type="button"
//                                     className="btn btn-secondary"
//                                     onClick={handleAccountCreationModalClose}
//                                 >
//                                     <i className="bi bi-arrow-left me-2"></i>Close
//                                 </button>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             )}

//             {/* Items Modal */}
//             {showItemsModal && (
//                 <div className="modal fade show" tabIndex="-1" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.7)' }}>
//                     <div className="modal-dialog modal-fullscreen">
//                         <div className="modal-content" style={{ height: '95vh', margin: '2.5vh auto' }}>
//                             <div className="modal-header bg-primary text-white">
//                                 <h5 className="modal-title">Create New Item</h5>
//                                 <div className="d-flex align-items-center">
//                                     <button
//                                         type="button"
//                                         className="btn-close btn-close-white"
//                                         onClick={() => setShowItemsModal(false)}
//                                     ></button>
//                                 </div>
//                             </div>
//                             <div className="modal-body p-0">
//                                 <iframe
//                                     src="/retailer/items"
//                                     title="Item Creation"
//                                     style={{ width: '100%', height: '100%', border: 'none' }}
//                                 />
//                             </div>
//                             <div className="modal-footer bg-light">
//                                 <button
//                                     type="button"
//                                     className="btn btn-secondary"
//                                     onClick={() => setShowItemsModal(false)}
//                                 >
//                                     <i className="bi bi-arrow-left me-2"></i>Close
//                                 </button>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             )}

//             <NotificationToast
//                 show={notification.show}
//                 message={notification.message}
//                 type={notification.type}
//                 onClose={() => setNotification({ ...notification, show: false })}
//             />
//         </div>
//     );
// };

// function convertToRupeesAndPaisa(amount) {
//     const rupees = Math.floor(amount);
//     const paisa = Math.round((amount - rupees) * 100);

//     let words = '';

//     if (rupees > 0) {
//         words += numberToWords(rupees) + ' Rupees';
//     }

//     if (paisa > 0) {
//         words += (rupees > 0 ? ' and ' : '') + numberToWords(paisa) + ' Paisa';
//     }

//     return words || 'Zero Rupees';
// }

// function numberToWords(num) {
//     const ones = [
//         '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
//         'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
//         'Seventeen', 'Eighteen', 'Nineteen'
//     ];

//     const tens = [
//         '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
//     ];

//     const scales = ['', 'Thousand', 'Million', 'Billion'];

//     function convertHundreds(num) {
//         let words = '';

//         if (num > 99) {
//             words += ones[Math.floor(num / 100)] + ' Hundred ';
//             num %= 100;
//         }

//         if (num > 19) {
//             words += tens[Math.floor(num / 10)] + ' ';
//             num %= 10;
//         }

//         if (num > 0) {
//             words += ones[num] + ' ';
//         }

//         return words.trim();
//     }

//     if (num === 0) return 'Zero';
//     if (num < 0) return 'Negative ' + numberToWords(Math.abs(num));

//     let words = '';

//     for (let i = 0; i < scales.length; i++) {
//         let unit = Math.pow(1000, scales.length - i - 1);
//         let currentNum = Math.floor(num / unit);

//         if (currentNum > 0) {
//             words += convertHundreds(currentNum) + ' ' + scales[scales.length - i - 1] + ' ';
//         }

//         num %= unit;
//     }

//     return words.trim();
// }

// export default EditPurcRtn;

//-----------------------------------------------------------------------end

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import NepaliDate from 'nepali-date-converter';
import axios from 'axios';
import Header from '../Header';
import NotificationToast from '../../NotificationToast';
import '../../../stylesheet/retailer/purchase/EditPurchase.css';
import '../../../stylesheet/noDateIcon.css';
import ProductModal from '../dashboard/modals/ProductModal';
import AccountBalanceDisplay from '../payment/AccountBalanceDisplay';
import useDebounce from '../../../hooks/useDebounce';
import VirtualizedItemListForPurchase from '../../VirtualizedItemListForPurchase';
import VirtualizedAccountList from '../../VirtualizedAccountList';
import { Button } from 'react-bootstrap';
import { BiArrowBack } from 'react-icons/bi';

const EditPurcRtn = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // Search states
    const [searchQuery, setSearchQuery] = useState('');
    const [lastSearchQuery, setLastSearchQuery] = useState('');
    const [shouldShowLastSearchResults, setShouldShowLastSearchResults] = useState(false);
    const debouncedSearchQuery = useDebounce(searchQuery, 50);
    const [showItemDropdown, setShowItemDropdown] = useState(false);
    const [showAccountModal, setShowAccountModal] = useState(false);
    const [transactions, setTransactions] = useState([]);
    const [transactionType, setTransactionType] = useState('purchasereturn');
    const [showTransactionModal, setShowTransactionModal] = useState(false);
    const [selectedItemIndex, setSelectedItemIndex] = useState(-1);

    // Stock validation states
    const [quantityErrors, setQuantityErrors] = useState({});
    const [stockValidation, setStockValidation] = useState({
        itemStockMap: new Map(),
        batchStockMap: new Map(),
        usedStockMap: new Map(),
    });

    // Account search states
    const [isAccountSearching, setIsAccountSearching] = useState(false);
    const [accountSearchResults, setAccountSearchResults] = useState([]);
    const [accountSearchPage, setAccountSearchPage] = useState(1);
    const [hasMoreAccountResults, setHasMoreAccountResults] = useState(false);
    const [totalAccounts, setTotalAccounts] = useState(0);
    const [accountSearchQuery, setAccountSearchQuery] = useState('');
    const [accountLastSearchQuery, setAccountLastSearchQuery] = useState('');
    const [accountShouldShowLastSearchResults, setAccountShouldShowLastSearchResults] = useState(false);

    // Item search states for header
    const [isHeaderSearching, setIsHeaderSearching] = useState(false);
    const [headerSearchQuery, setHeaderSearchQuery] = useState('');
    const [showHeaderItemModal, setShowHeaderItemModal] = useState(false);
    const [selectedItemForInsert, setSelectedItemForInsert] = useState(null);
    const [selectedItemQuantity, setSelectedItemQuantity] = useState(0);
    const [selectedItemRate, setSelectedItemRate] = useState(0);
    const [selectedItemWsUnit, setSelectedItemWsUnit] = useState(1);
    const [selectedItemBatchNumber, setSelectedItemBatchNumber] = useState('');
    const [selectedItemExpiryDate, setSelectedItemExpiryDate] = useState('');
    const [headerLastSearchQuery, setHeaderLastSearchQuery] = useState('');
    const [headerShouldShowLastSearchResults, setHeaderShouldShowLastSearchResults] = useState(false);
    const [headerSearchResults, setHeaderSearchResults] = useState([]);
    const [headerSearchPage, setHeaderSearchPage] = useState(1);
    const [hasMoreHeaderSearchResults, setHasMoreHeaderSearchResults] = useState(false);
    const [totalHeaderSearchItems, setTotalHeaderSearchItems] = useState(0);

    // Batch modal states
    const [showBatchModal, setShowBatchModal] = useState(false);
    const [selectedItemForBatch, setSelectedItemForBatch] = useState(null);
    const [headerQuantityError, setHeaderQuantityError] = useState('');

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
        localStorage.getItem('printAfterSavePurchaseReturn') === 'true' || false
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
        dateFormat: 'english',
        vatEnabled: true,
        fiscalYear: {}
    });

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

    // Fetch items from backend for header modal
    const fetchItemsFromBackend = async (searchTerm = '', page = 1, isHeaderModal = true) => {
        try {
            setIsHeaderSearching(true);

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
                const itemsWithLatestPrice = response.data.items.map(item => {
                    let latestPrice = 0;
                    let latestBatchNumber = '';
                    let latestExpiryDate = '';
                    let latestWsUnit = 1;
                    let totalStock = 0;

                    if (item.stockEntries && item.stockEntries.length > 0) {
                        totalStock = item.stockEntries.reduce((sum, entry) => sum + (entry.quantity || 0), 0);

                        const sortedEntries = item.stockEntries.sort((a, b) =>
                            new Date(b.date) - new Date(a.date)
                        );
                        latestPrice = sortedEntries[0].puPrice || 0;
                        latestBatchNumber = sortedEntries[0].batchNumber || '';
                        latestExpiryDate = sortedEntries[0].expiryDate || '';
                        latestWsUnit = sortedEntries[0].wsUnit || 1;
                    }

                    return {
                        ...item,
                        id: item.id,
                        _id: item.id,
                        latestPrice,
                        latestBatchNumber,
                        latestExpiryDate,
                        latestWsUnit,
                        stock: totalStock,
                        unitName: item.unit?.name || item.unitName || '',
                        unitId: item.unit?.id || item.unitId,
                        stockEntries: item.stockEntries || []
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
                const response = await api.get('/api/retailer/get-display-purchase-return-transactions');
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

    // Update stock maps when search results change
    useEffect(() => {
        const updateStockMaps = () => {
            const newItemStockMap = new Map();
            const newBatchStockMap = new Map();

            const allItemsToCheck = [...headerSearchResults];

            allItemsToCheck.forEach(item => {
                const totalStock = item.stockEntries?.reduce((sum, entry) => sum + (entry.quantity || 0), 0) || 0;
                newItemStockMap.set(item.id, totalStock);

                item.stockEntries?.forEach(entry => {
                    const batchKey = `${item.id}-${entry.batchNumber}-${entry.uniqueUuid}`;
                    newBatchStockMap.set(batchKey, entry.quantity || 0);
                });
            });

            setStockValidation(prev => ({
                ...prev,
                itemStockMap: newItemStockMap,
                batchStockMap: newBatchStockMap
            }));

            if (items.length > 0) {
                setTimeout(() => {
                    validateAllQuantities();
                }, 100);
            }
        };

        if (headerSearchResults.length > 0) {
            updateStockMaps();
        }
    }, [headerSearchResults]);

    // Calculate used stock
    const calculateUsedStock = (itemsToCheck) => {
        const newUsedStockMap = new Map();

        itemsToCheck.forEach(item => {
            const batchKey = `${item.itemId}-${item.batchNumber}-${item.uniqueUuid}`;
            const currentUsed = newUsedStockMap.get(batchKey) || 0;
            const itemQuantity = parseFloat(item.quantity) || 0;

            newUsedStockMap.set(batchKey, currentUsed + itemQuantity);
        });

        return newUsedStockMap;
    };

    // Get available stock for display
    const getAvailableStockForDisplay = (item) => {
        if (!item) return 0;

        const batchKey = `${item.itemId}-${item.batchNumber}-${item.uniqueUuid}`;
        const totalStock = stockValidation.batchStockMap.get(batchKey) || 0;

        const usedStockMap = calculateUsedStock(items);
        const usedStock = usedStockMap.get(batchKey) || 0;

        return Math.max(0, totalStock - usedStock);
    };

    // Get remaining stock
    const getRemainingStock = (item, itemsToCheck = items) => {
        if (!item) return 0;

        const batchKey = `${item.itemId}-${item.batchNumber}-${item.uniqueUuid}`;
        const availableStock = stockValidation.batchStockMap.get(batchKey);

        if (availableStock === undefined) return 0;

        const usedStockMap = calculateUsedStock(itemsToCheck);
        const totalUsed = usedStockMap.get(batchKey) || 0;

        return availableStock - totalUsed;
    };

    // Validate quantity
    const validateQuantity = (index, quantity, itemsToValidate = items) => {
        const item = itemsToValidate[index];
        if (!item) return true;

        const batchKey = `${item.itemId}-${item.batchNumber}-${item.uniqueUuid}`;
        const availableStock = stockValidation.batchStockMap.get(batchKey) || 0;

        if (availableStock === 0 && !stockValidation.batchStockMap.has(batchKey)) {
            return true;
        }

        const usedStockMap = calculateUsedStock(itemsToValidate);
        const totalUsed = usedStockMap.get(batchKey) || 0;

        return totalUsed <= availableStock;
    };

    // Validate all quantities
    const validateAllQuantities = (itemsToValidate = items) => {
        const newErrors = {};

        itemsToValidate.forEach((item, index) => {
            const batchKey = `${item.itemId}-${item.batchNumber}-${item.uniqueUuid}`;

            if (stockValidation.batchStockMap.has(batchKey)) {
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

    // Initial data loading
    // useEffect(() => {
    //     const fetchPurchaseReturnData = async () => {
    //         try {
    //             setIsLoading(true);

    //             const response = await api.get(`/api/retailer/purchase-return/edit/${id}`);
    //             const { data } = response.data;

    //             setCompany({
    //                 ...data.company,
    //                 dateFormat: data.company.dateFormat || 'english',
    //                 vatEnabled: data.company.vatEnabled || true
    //             });

    //             const purchaseReturn = data.purchaseReturn;
    //             const dateFormat = data.company.dateFormat;

    //             const accountDoc = data.accounts.find(acc => acc.id === purchaseReturn.accountId);
    //             const accountNameWithNumber = accountDoc?.uniqueNumber
    //                 ? `${accountDoc.uniqueNumber} ${purchaseReturn.accountName}`
    //                 : purchaseReturn.accountName;

    //             const itemsData = purchaseReturn.items.map(item => ({
    //                 itemId: item.itemId,
    //                 uniqueNumber: item.uniqueNumber,
    //                 hscode: item.hscode,
    //                 name: item.itemName,
    //                 category: item.category?.name || 'No Category',
    //                 wsUnit: item.wsUnit || 1,
    //                 batchNumber: item.batchNumber || '',
    //                 expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString().split('T')[0] : '',
    //                 quantity: item.quantity || 0,
    //                 unitId: item.unitId,
    //                 unitName: item.unitName,
    //                 price: item.price || 0,
    //                 puPrice: item.puPrice || 0,
    //                 amount: ((item.quantity || 0) * (item.puPrice || 0)).toFixed(2),
    //                 vatStatus: item.vatStatus,
    //                 uniqueUuid: item.uniqueUuid
    //             }));

    //             setFormData({
    //                 accountId: purchaseReturn.accountId,
    //                 accountName: accountNameWithNumber,
    //                 accountAddress: purchaseReturn.accountAddress || '',
    //                 accountPan: purchaseReturn.accountPan || '',
    //                 transactionDateNepali: dateFormat === 'nepali' ?
    //                     new Date(purchaseReturn.transactionDateNepali).toISOString().split('T')[0] : currentNepaliDate,
    //                 transactionDateRoman: dateFormat !== 'nepali' ?
    //                     new Date(purchaseReturn.transactionDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    //                 nepaliDate: dateFormat === 'nepali' ?
    //                     new Date(purchaseReturn.nepaliDate).toISOString().split('T')[0] : currentNepaliDate,
    //                 billDate: dateFormat !== 'nepali' ?
    //                     new Date(purchaseReturn.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    //                 billNumber: purchaseReturn.billNumber,
    //                 paymentMode: purchaseReturn.paymentMode || 'credit',
    //                 isVatExempt: purchaseReturn.isVatExempt ? 'true' :
    //                     (purchaseReturn.isVatAll === 'all' ? 'all' : 'false'),
    //                 discountPercentage: purchaseReturn.discountPercentage || 0,
    //                 discountAmount: purchaseReturn.discountAmount || 0,
    //                 roundOffAmount: purchaseReturn.roundOffAmount || 0,
    //                 vatPercentage: purchaseReturn.vatPercentage || 13,
    //                 items: itemsData
    //             });

    //             setItems(itemsData);
    //             setAccounts(data.accounts || []);

    //             setIsInitialDataLoaded(true);
    //         } catch (error) {
    //             console.error('Error fetching purchase return data:', error);
    //             setNotification({
    //                 show: true,
    //                 message: 'Failed to load purchase return data',
    //                 type: 'error'
    //             });
    //             navigate('/retailer/purchase-return');
    //         } finally {
    //             setIsLoading(false);
    //         }
    //     };

    //     if (id) {
    //         fetchPurchaseReturnData();
    //     }
    // }, [id, navigate]);

    // Initial data loading
    useEffect(() => {
        const fetchPurchaseReturnData = async () => {
            try {
                setIsLoading(true);

                const response = await api.get(`/api/retailer/purchase-return/edit/${id}`);
                const { data } = response.data;

                setCompany({
                    ...data.company,
                    dateFormat: data.company.dateFormat || 'english',
                    vatEnabled: data.company.vatEnabled || true
                });

                const purchaseReturn = data.purchaseReturn;
                const dateFormat = data.company.dateFormat?.toLowerCase() || 'english';

                console.log("Purchase Return Data:", purchaseReturn); // Debug log
                console.log("Date Format:", dateFormat);
                console.log("nepaliDate:", purchaseReturn.nepaliDate);
                console.log("Date:", purchaseReturn.Date);
                console.log("transactionDateNepali:", purchaseReturn.transactionDateNepali);
                console.log("TransactionDate:", purchaseReturn.TransactionDate);

                const accountDoc = data.accounts.find(acc => acc.id === purchaseReturn.accountId);
                const accountNameWithNumber = accountDoc?.uniqueNumber
                    ? `${accountDoc.uniqueNumber} ${purchaseReturn.accountName}`
                    : purchaseReturn.accountName;

                const itemsData = purchaseReturn.items.map(item => ({
                    itemId: item.itemId,
                    uniqueNumber: item.uniqueNumber,
                    hscode: item.hscode,
                    name: item.itemName,
                    category: item.category?.name || 'No Category',
                    wsUnit: item.wsUnit || 1,
                    batchNumber: item.batchNumber || '',
                    expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString().split('T')[0] : '',
                    quantity: item.quantity || 0,
                    unitId: item.unitId,
                    unitName: item.unitName,
                    price: item.price || 0,
                    puPrice: item.puPrice || 0,
                    amount: ((item.quantity || 0) * (item.puPrice || 0)).toFixed(2),
                    vatStatus: item.vatStatus,
                    uniqueUuid: item.uniqueUuid
                }));

                // Helper function to format date properly
                const formatDate = (dateValue) => {
                    if (!dateValue) return '';

                    // If it's already a string in YYYY-MM-DD format
                    if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
                        return dateValue;
                    }

                    // Convert to Date object and format
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

                setFormData({
                    accountId: purchaseReturn.accountId,
                    accountName: accountNameWithNumber,
                    accountAddress: purchaseReturn.accountAddress || '',
                    accountPan: purchaseReturn.accountPan || '',
                    // Always use the actual dates from the database
                    transactionDateNepali: formatDate(purchaseReturn.transactionDateNepali || purchaseReturn.TransactionDate),
                    transactionDateRoman: formatDate(purchaseReturn.TransactionDate || purchaseReturn.transactionDateNepali),
                    nepaliDate: formatDate(purchaseReturn.nepaliDate || purchaseReturn.Date),
                    billDate: formatDate(purchaseReturn.Date || purchaseReturn.nepaliDate),
                    billNumber: purchaseReturn.billNumber,
                    paymentMode: purchaseReturn.paymentMode || 'credit',
                    isVatExempt: purchaseReturn.isVatExempt ? 'true' :
                        (purchaseReturn.isVatAll === 'all' ? 'all' : 'false'),
                    discountPercentage: purchaseReturn.discountPercentage || 0,
                    discountAmount: purchaseReturn.discountAmount || 0,
                    roundOffAmount: purchaseReturn.roundOffAmount || 0,
                    vatPercentage: purchaseReturn.vatPercentage || 13,
                    items: itemsData
                });

                setItems(itemsData);
                setAccounts(data.accounts || []);

                setIsInitialDataLoaded(true);
            } catch (error) {
                console.error('Error fetching purchase return data:', error);
                setNotification({
                    show: true,
                    message: 'Failed to load purchase return data',
                    type: 'error'
                });
                navigate('/retailer/purchase-return');
            } finally {
                setIsLoading(false);
            }
        };

        if (id) {
            fetchPurchaseReturnData();
        }
    }, [id, navigate]);

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
    }, [items, formData.discountPercentage, formData.discountAmount, formData.roundOffAmount]);

    useEffect(() => {
        fetchRoundOffSetting();
    }, []);

    const fetchRoundOffSetting = async () => {
        try {
            const response = await api.get('/api/retailer/roundoff-purchase-return');
            if (response.data.success) {
                setRoundOffPurchase(response.data.data.settingsForPurchaseReturn?.roundOffPurchaseReturn || false);
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

        setSelectedItemBatchNumber('');
        setSelectedItemExpiryDate('');
        setSelectedItemRate(item.latestPrice || 0);

        setTimeout(() => {
            showBatchModalForItem(item);
        }, 100);
    };

    const handleBatchRowClick = async (batchInfo) => {
        if (!selectedItemForBatch) return;

        const isHeaderInsert = selectedItemForBatch === selectedItemForInsert;

        if (isHeaderInsert) {
            const batchKey = `${selectedItemForBatch.id}-${batchInfo.batchNumber}-${batchInfo.uniqueUuid}`;
            const availableStock = stockValidation.batchStockMap.get(batchKey) || 0;

            if (availableStock === 0) {
                setNotification({
                    show: true,
                    message: `Item "${selectedItemForBatch.name}" has zero stock in this batch and cannot be added to the bill.`,
                    type: 'error'
                });
                setShowBatchModal(false);
                setSelectedItemForBatch(null);
                setSelectedItemForInsert(null);
                setSelectedItemBatchNumber('');
                setSelectedItemExpiryDate('');
                setSelectedItemRate(0);

                setTimeout(() => {
                    const searchInput = document.getElementById('headerItemSearch');
                    if (searchInput) {
                        searchInput.focus();
                        searchInput.select();
                    }
                }, 100);
                return;
            }

            setSelectedItemForInsert({
                ...selectedItemForInsert,
                batchInfo: {
                    batchNumber: batchInfo.batchNumber,
                    expiryDate: batchInfo.expiryDate,
                    price: batchInfo.price,
                    puPrice: batchInfo.puPrice,
                    netPuPrice: batchInfo.netPuPrice,
                    uniqueUuid: batchInfo.uniqueUuid
                }
            });

            setSelectedItemBatchNumber(batchInfo.batchNumber || '');
            setSelectedItemExpiryDate(batchInfo.expiryDate ? formatDateForInput(batchInfo.expiryDate) : '');
            setSelectedItemRate(batchInfo.puPrice || 0);

            // Close batch modal first
            setShowBatchModal(false);
            setSelectedItemForBatch(null);

            if (transactionSettings.displayTransactionsForPurchaseReturn && formData.accountId) {
                await fetchLastTransactions(selectedItemForBatch.id);
            } else {
                setTimeout(() => {
                    const quantityInput = document.getElementById('selectedItemQuantity');
                    if (quantityInput) {
                        quantityInput.focus();
                        quantityInput.select();
                    }
                }, 100);
            }
        } else {
            // For non-header insert (regular item addition)
            setShowBatchModal(false);
            setSelectedItemForBatch(null);

            // Add item to bill
            addItemToBill(selectedItemForBatch, {
                batchNumber: batchInfo.batchNumber,
                expiryDate: batchInfo.expiryDate,
                price: batchInfo.price,
                puPrice: batchInfo.puPrice,
                netPuPrice: batchInfo.netPuPrice,
                uniqueUuid: batchInfo.uniqueUuid
            });
        }
    };

    const addItemToBill = (item, batchInfo) => {
        const batchKey = `${item.id}-${batchInfo.batchNumber}-${batchInfo.uniqueUuid}`;
        const availableStock = stockValidation.batchStockMap.get(batchKey) || 0;

        if (availableStock === 0) {
            setNotification({
                show: true,
                message: `Item "${item.name}" has zero stock in this batch and cannot be added to the bill.`,
                type: 'error'
            });
            return;
        }

        const newItem = {
            itemId: item.id,
            uniqueNumber: item.uniqueNumber || 'N/A',
            hscode: item.hscode,
            name: item.name,
            category: item.category?.name || 'No Category',
            batchNumber: batchInfo.batchNumber || '',
            expiryDate: batchInfo.expiryDate ? new Date(batchInfo.expiryDate).toISOString().split('T')[0] : '',
            quantity: 0,
            unitId: item.unit?.id || item.unitId,
            unitName: item.unit?.name || item.unitName,
            price: batchInfo.price || 0,
            puPrice: batchInfo.puPrice || 0,
            netPuPrice: batchInfo.netPuPrice || 0,
            amount: 0,
            vatStatus: item.vatStatus,
            uniqueUuid: batchInfo.uniqueUuid
        };

        const updatedItems = [...items, newItem];
        setItems(updatedItems);

        setTimeout(() => {
            if (itemsTableRef.current) {
                itemsTableRef.current.scrollTop = itemsTableRef.current.scrollHeight;
            }
        }, 50);

        setTimeout(() => {
            const quantityInput = document.getElementById(`quantity-${updatedItems.length - 1}`);
            if (quantityInput) {
                quantityInput.focus();
                quantityInput.select();
            }
        }, 100);
    };

    const insertSelectedItem = () => {
        if (showTransactionModal) {
            setShowTransactionModal(false);
        }

        const batchNumber = selectedItemBatchNumber || selectedItemForInsert?.batchInfo?.batchNumber;
        const expiryDate = selectedItemExpiryDate || selectedItemForInsert?.batchInfo?.expiryDate;
        const uniqueUuid = selectedItemForInsert?.batchInfo?.uniqueUuid;

        if (!selectedItemForInsert || !batchNumber) {
            setNotification({
                show: true,
                message: 'Please enter batch information first',
                type: 'error'
            });
            return;
        }

        const batchKey = `${selectedItemForInsert.id}-${batchNumber}-${uniqueUuid}`;
        const totalStock = stockValidation.batchStockMap.get(batchKey) || 0;

        const existingItems = items.filter(item =>
            item.itemId === selectedItemForInsert.id &&
            item.batchNumber === batchNumber &&
            item.uniqueUuid === uniqueUuid
        );

        let totalExistingQuantity = 0;
        if (existingItems.length > 0) {
            totalExistingQuantity = existingItems.reduce((sum, item) => {
                return sum + (parseFloat(item.quantity) || 0);
            }, 0);
        }

        const availableStock = totalStock - totalExistingQuantity;

        if (selectedItemQuantity > availableStock) {
            setNotification({
                show: true,
                message: `Insufficient stock. Total: ${totalStock}, Used: ${totalExistingQuantity}, Available: ${availableStock}`,
                type: 'error'
            });
            document.getElementById('selectedItemQuantity')?.focus();
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

        const newItem = {
            itemId: selectedItemForInsert.id,
            uniqueNumber: selectedItemForInsert.uniqueNumber || 'N/A',
            hscode: selectedItemForInsert.hscode,
            name: selectedItemForInsert.name,
            category: selectedItemForInsert.category?.name || 'No Category',
            batchNumber: batchNumber,
            expiryDate: expiryDate ? new Date(expiryDate).toISOString().split('T')[0] : '',
            quantity: selectedItemQuantity || 0,
            unitId: selectedItemForInsert.unit?.id || selectedItemForInsert.unitId,
            unitName: selectedItemForInsert.unit?.name || selectedItemForInsert.unitName,
            price: selectedItemRate || Math.round(selectedItemForInsert.batchInfo?.price * 100) / 100,
            puPrice: selectedItemForInsert.batchInfo?.puPrice || 0,
            netPuPrice: selectedItemForInsert.batchInfo?.netPuPrice || 0,
            amount: (selectedItemQuantity || 0) * selectedItemForInsert.batchInfo?.puPrice,
            vatStatus: selectedItemForInsert.vatStatus,
            uniqueUuid: uniqueUuid
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

    const updateItemField = (index, field, value) => {
        const updatedItems = [...items];
        updatedItems[index][field] = value;

        if (field === 'quantity' || field === 'puPrice') {
            if (field === 'quantity') {
                const item = updatedItems[index];
                const batchKey = `${item.itemId}-${item.batchNumber}-${item.uniqueUuid}`;

                if (stockValidation.batchStockMap.has(batchKey)) {
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

            updatedItems[index].amount = (updatedItems[index].quantity * updatedItems[index].puPrice).toFixed(2);
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

        setTimeout(() => {
            validateAllQuantities(updatedItems);
        }, 0);
    };

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

    const calculateTotal = (itemsToCalculate = items) => {
        let subTotal = 0;
        let taxableAmount = 0;
        let nonTaxableAmount = 0;

        itemsToCalculate.forEach(item => {
            const itemAmount = parseFloat(item.amount) || 0;
            subTotal = preciseAdd(subTotal, itemAmount);

            if (item.vatStatus === 'vatable') {
                taxableAmount = preciseAdd(taxableAmount, itemAmount);
            } else {
                nonTaxableAmount = preciseAdd(nonTaxableAmount, itemAmount);
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
                const taxableRatio = preciseDivide(taxableAmount, subTotal);
                const nonTaxableRatio = preciseDivide(nonTaxableAmount, subTotal);

                discountForTaxable = preciseMultiply(effectiveDiscount, taxableRatio);
                discountForNonTaxable = preciseMultiply(effectiveDiscount, nonTaxableRatio);
            }
        } else if (discountPercentage > 0) {
            discountForTaxable = preciseMultiply(taxableAmount, preciseDivide(discountPercentage, 100));
            discountForNonTaxable = preciseMultiply(nonTaxableAmount, preciseDivide(discountPercentage, 100));
            effectiveDiscount = preciseAdd(discountForTaxable, discountForNonTaxable);
        }

        const finalTaxableAmount = preciseSubtract(taxableAmount, discountForTaxable);
        const finalNonTaxableAmount = preciseSubtract(nonTaxableAmount, discountForNonTaxable);

        let vatAmount = 0;
        if (formData.isVatExempt === 'false' || formData.isVatExempt === 'all') {
            vatAmount = preciseMultiply(finalTaxableAmount, preciseDivide(formData.vatPercentage, 100));
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
            discountAmount: preciseRound(effectiveDiscount, 2),
            roundOffAmount: preciseRound(roundOffAmount, 2),
            autoRoundOffAmount: preciseRound(autoRoundOffAmount, 2)
        };
    };

    const totals = calculateTotal();

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

    const fetchLastTransactions = async (itemId, index = null) => {
        if (!formData.accountId) {
            setNotification({
                show: true,
                message: 'Please select an account first',
                type: 'error'
            });
            return;
        }

        if (index !== null) {
            setSelectedItemIndex(index);
        }

        setIsLoadingTransactions(true);

        try {
            const cacheKey = `${itemId}-${formData.accountId}`;

            if (transactionCache.has(cacheKey)) {
                const cachedTransactions = transactionCache.get(cacheKey);
                setTransactions(cachedTransactions);
                setTransactionType('purchasereturn');
                setShowTransactionModal(true);
                return;
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);

            const response = await api.get(`/api/retailer/transactions/${itemId}/${formData.accountId}/PurchaseReturn`, {
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.data.success) {
                setTransactionCache(prev => new Map(prev.set(cacheKey, response.data.data.transactions)));
                setTransactions(response.data.data.transactions);
                setTransactionType('purchasereturn');
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

    const handleTransactionModalClose = () => {
        setShowTransactionModal(false);

        setTimeout(() => {
            if (selectedItemForInsert && selectedItemForInsert.batchInfo) {
                const quantityInput = document.getElementById('selectedItemQuantity');
                if (quantityInput) {
                    quantityInput.focus();
                    quantityInput.select();
                }
            } else if (items.length > 0) {
                const quantityInput = document.getElementById(`quantity-${items.length - 1}`);
                if (quantityInput) {
                    quantityInput.focus();
                    quantityInput.select();
                }
            }
        }, 200);
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

    const handleHeaderItemModalClose = () => {
        setShowHeaderItemModal(false);
        if (!headerShouldShowLastSearchResults) {
            setHeaderSearchQuery('');
            setHeaderLastSearchQuery('');
        }
        setHeaderSearchResults([]);
        setHeaderSearchPage(1);
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
                const batchInput = document.getElementById('selectedItemBatch');
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
        localStorage.setItem('printAfterSavePurchaseReturn', isChecked);
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

            // Prepare data according to your ASP.NET UpdatePurchaseReturnDTO
            const billData = {
                accountId: formData.accountId,
                partyBillNumber: '',
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
                nonVatPurchaseReturn: calculatedValues.nonTaxableAmount,
                totalAmount: calculatedValues.totalAmount,
                nepaliDate: formData.nepaliDate,
                date: formData.billDate,
                transactionDateNepali: formData.transactionDateNepali,
                transactionDate: formData.transactionDateRoman,
                print: print || printAfterSave,
                items: items.map(item => ({
                    itemId: item.itemId,
                    batchNumber: item.batchNumber,
                    expiryDate: item.expiryDate,
                    wsUnit: item.wsUnit || 1,
                    quantity: item.quantity,
                    puPrice: item.puPrice,
                    price: item.price,
                    unitId: item.unitId,
                    vatStatus: item.vatStatus,
                    uniqueUuid: item.uniqueUuid
                }))
            };

            const response = await api.put(`/api/retailer/purchase-return/edit/${id}`, billData);

            setNotification({
                show: true,
                message: 'Purchase return updated successfully!',
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
            console.error('Error updating purchase return:', error);
            setNotification({
                show: true,
                message: error.response?.data?.error || 'Failed to update purchase return. Please try again.',
                type: 'error'
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleBack = () => {
        navigate(-1);
    };

    const printImmediately = async (billId) => {
        try {
            const response = await api.get(`/api/retailer/purchase-return/${billId}/print`);
            const printData = response.data.data;

            const tempDiv = document.createElement('div');
            tempDiv.style.position = 'absolute';
            tempDiv.style.left = '-9999px';
            document.body.appendChild(tempDiv);

            const formatTo2Decimal = (num) => {
                const rounded = Math.round(num * 100) / 100;
                const parts = rounded.toString().split(".");
                if (!parts[1]) return parts[0] + ".00";
                if (parts[1].length === 1) return parts[0] + "." + parts[1] + "0";
                return rounded.toString();
            };

            tempDiv.innerHTML = `
                <div id="printableContent" class="print-version">
                    <div class="print-invoice-container">
                        <div class="print-invoice-header">
                            <div class="print-company-name">${printData.currentCompanyName || ''}</div>
                            <div class="print-company-details">
                                ${printData.currentCompany?.address || ''} | Tel: ${printData.currentCompany?.phone || ''} | PAN: ${printData.currentCompany?.pan || ''}
                            </div>
                            <div class="print-invoice-title">PURCHASE RETURN</div>
                        </div>

                        <div class="print-invoice-details">
                            <div>
                                <div><strong>Supplier:</strong> ${printData.bill.account?.name || 'N/A'}</div>
                                <div><strong>Address:</strong> ${printData.bill.account?.address || 'N/A'}</div>
                                <div><strong>PAN:</strong> ${printData.bill.account?.pan || 'N/A'}</div>
                                <div><strong>Payment Mode:</strong> ${printData.bill.paymentMode || 'N/A'}</div>
                            </div>
                            <div>
                                <div><strong>Return No:</strong> ${printData.bill.billNumber || 'N/A'}</div>
                                <div><strong>Supplier Inv No:</strong> ${printData.bill.partyBillNumber || 'N/A'}</div>
                                <div><strong>Transaction Date:</strong> ${new Date(printData.bill.transactionDate).toLocaleDateString()}</div>
                                <div><strong>Return Date:</strong> ${new Date(printData.bill.date).toLocaleDateString()}</div>
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
                                        <td>${formatTo2Decimal(item.puPrice || 0)}</td>
                                        <td>${formatTo2Decimal((item.quantity || 0) * (item.puPrice || 0))}</td>
                                    </tr>
                                `).join('') || ''}
                            </tbody>
                        </table>

                        <table class="print-totals-table">
                            <tbody>
                                <tr>
                                    <td><strong>Sub Total:</strong></td>
                                    <td class="print-text-right">${formatTo2Decimal(printData.bill.subTotal || 0)}</td>
                                </tr>
                                <tr>
                                    <td><strong>Discount (${printData.bill.discountPercentage || 0}%):</strong></td>
                                    <td class="print-text-right">${formatTo2Decimal(printData.bill.discountAmount || 0)}</td>
                                </tr>
                                ${!printData.bill.isVatExempt ? `
                                    <tr>
                                        <td><strong>Taxable Amount:</strong></td>
                                        <td class="print-text-right">${formatTo2Decimal(printData.bill.taxableAmount || 0)}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>VAT (${printData.bill.vatPercentage || 13}%):</strong></td>
                                        <td class="print-text-right">${formatTo2Decimal(printData.bill.vatAmount || 0)}</td>
                                    </tr>
                                ` : ''}
                                <tr>
                                    <td><strong>Round Off:</strong></td>
                                    <td class="print-text-right">${formatTo2Decimal(printData.bill.roundOffAmount || 0)}</td>
                                </tr>
                                <tr>
                                    <td><strong>Grand Total:</strong></td>
                                    <td class="print-text-right">${formatTo2Decimal(printData.bill.totalAmount || 0)}</td>
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
                        <title>Purchase_Return_${printData.bill.billNumber}</title>
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
                message: 'Return updated but failed to load print data',
                type: 'warning'
            });
        }
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
                            Update Purchase Return Entry
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
                                                Return Date: <span className="text-danger">*</span>
                                            </label>
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
                                                Return Date: <span className="text-danger">*</span>
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
                                                value={selectedItemWsUnit}
                                                onChange={(e) => setSelectedItemWsUnit(parseFloat(e.target.value))}
                                                onKeyDown={(e) => {
                                                    if ((e.key === 'Tab' || e.key === 'Enter')) {
                                                        e.preventDefault();
                                                        document.getElementById('selectedItemBatch').focus();
                                                        document.getElementById('selectedItemBatch').select();
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
                                                id='selectedItemBatch'
                                                placeholder="Batch"
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
                                                        document.getElementById('headerExpiryDate').focus();
                                                    } else if (e.key === 'Escape') {
                                                        setShowHeaderItemModal(true);
                                                        setTimeout(() => {
                                                            document.getElementById('headerItemSearch')?.focus();
                                                        }, 100);
                                                    }
                                                }}
                                                readOnly
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

                                                    if (selectedItemForInsert && selectedItemForInsert.batchInfo) {
                                                        const batchKey = `${selectedItemForInsert.id}-${selectedItemForInsert.batchInfo.batchNumber}-${selectedItemForInsert.batchInfo.uniqueUuid}`;
                                                        const totalStock = stockValidation.batchStockMap.get(batchKey) || 0;

                                                        const existingItems = items.filter(item =>
                                                            item.itemId === selectedItemForInsert.id &&
                                                            item.batchNumber === selectedItemForInsert.batchInfo.batchNumber &&
                                                            item.uniqueUuid === selectedItemForInsert.batchInfo.uniqueUuid
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
                                            {selectedItemForInsert ? (selectedItemForInsert.unitName || 'N/A') : '-'}
                                        </td>
                                        <td width="8%" style={{ padding: '2px', backgroundColor: '#ffffff' }}>
                                            <input
                                                type="number"
                                                className="form-control form-control-sm"
                                                placeholder="Rate"
                                                id='selectedItemRate'
                                                value={Math.round(selectedItemRate * 100) / 100}
                                                onChange={(e) => setSelectedItemRate(parseFloat(e.target.value))}
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
                                                    if (validateHeaderFields()) {
                                                        insertSelectedItem();
                                                    }
                                                }}
                                                disabled={!selectedItemForInsert || !selectedItemForInsert.batchInfo}
                                                title={!selectedItemForInsert?.batchInfo ? "Select batch first" : "Insert item below"}
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
                                                    backgroundColor: selectedItemForInsert?.batchInfo ? '#198754' : '#6c757d',
                                                    borderColor: selectedItemForInsert?.batchInfo ? '#198754' : '#6c757d',
                                                    cursor: selectedItemForInsert?.batchInfo ? 'pointer' : 'not-allowed'
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
                                                        type="number"
                                                        name={`items[${index}][wsUnit]`}
                                                        className="form-control form-control-sm"
                                                        id={`wsUnit-${index}`}
                                                        value={item.wsUnit}
                                                        onChange={(e) => updateItemField(index, 'wsUnit', parseFloat(e.target.value))}
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
                                                        readOnly
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
                                                        readOnly
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
                                                        className={`form-control form-control-sm ${quantityErrors[index] ? 'is-invalid' : ''}`}
                                                        id={`quantity-${index}`}
                                                        value={item.quantity}
                                                        onChange={(e) => updateItemField(index, 'quantity', parseFloat(e.target.value))}
                                                        required
                                                        min="0"
                                                        max={availableStock}
                                                        onFocus={(e) => {
                                                            e.target.select();
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                if (!quantityErrors[index]) {
                                                                    document.getElementById(`puPrice-${index}`)?.focus();
                                                                } else {
                                                                    e.target.focus();
                                                                    e.target.select();
                                                                }
                                                            }
                                                        }}
                                                        style={{
                                                            height: '20px',
                                                            fontSize: '0.75rem',
                                                            padding: '0 4px'
                                                        }}
                                                    />
                                                    {quantityErrors[index] && (
                                                        <div className="invalid-feedback d-block small" style={{ fontSize: '0.7rem' }}>
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
                                                        name={`items[${index}][puPrice]`}
                                                        className="form-control form-control-sm"
                                                        id={`puPrice-${index}`}
                                                        value={Math.round(item.puPrice * 100) / 100}
                                                        onChange={(e) => updateItemField(index, 'puPrice', parseFloat(e.target.value))}
                                                        onFocus={(e) => {
                                                            e.target.select();
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                document.getElementById('headerItemSearch')?.focus();
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
                                                <input type="hidden" name={`items[${index}][uniqueUuid]`} value={item.uniqueUuid} />
                                            </tr>
                                        );
                                    })}

                                    {items.length === 0 && (
                                        <tr style={{ height: '24px' }}>
                                            <td colSpan={12} className="text-center text-muted py-1" style={{ fontSize: '0.75rem' }}>
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
                                        {company.vatEnabled && formData.isVatExempt !== 'true' && (
                                            <>
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
                                                    <p className="form-control-plaintext mb-0" style={{ fontSize: '0.8rem' }}>{formData.vatPercentage}%</p>
                                                </td>
                                                <td style={{ padding: '1px' }}>
                                                    <label className="form-label mb-0" style={{ fontSize: '0.8rem' }}>VAT Amount:</label>
                                                </td>
                                                <td style={{ padding: '1px' }}>
                                                    <p className="form-control-plaintext mb-0" style={{ fontSize: '0.8rem' }}>Rs. {totals.vatAmount.toFixed(2)}</p>
                                                </td>
                                            </>
                                        )}
                                        {company.vatEnabled && formData.isVatExempt === 'true' && (
                                            <td colSpan="6" className="text-center text-muted">
                                                VAT Exempt
                                            </td>
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
                                                            setFormData({ ...formData, roundOffAmount: parseFloat(e.target.value) || 0 });
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

            {/* Batch Modal */}
            {showBatchModal && selectedItemForBatch && (
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
                                                    .map((entry, index) => {
                                                        const batchKey = `${selectedItemForBatch.id}-${entry.batchNumber}-${entry.uniqueUuid}`;
                                                        const totalStock = stockValidation.batchStockMap.get(batchKey) || 0;

                                                        const usedStock = items
                                                            .filter(item =>
                                                                item.itemId === selectedItemForBatch.id &&
                                                                item.batchNumber === entry.batchNumber &&
                                                                item.uniqueUuid === entry.uniqueUuid
                                                            )
                                                            .reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);

                                                        const availableStock = Math.max(0, totalStock - usedStock);

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
                                                                        handleBatchRowClick({
                                                                            batchNumber: entry.batchNumber,
                                                                            expiryDate: entry.expiryDate,
                                                                            price: entry.price,
                                                                            puPrice: entry.puPrice,
                                                                            netPuPrice: entry.netPuPrice,
                                                                            uniqueUuid: entry.uniqueUuid
                                                                        });
                                                                    }
                                                                }}
                                                                tabIndex={availableStock > 0 ? 0 : -1}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter' && availableStock > 0) {
                                                                        e.preventDefault();
                                                                        handleBatchRowClick({
                                                                            batchNumber: entry.batchNumber,
                                                                            expiryDate: entry.expiryDate,
                                                                            price: entry.price,
                                                                            puPrice: entry.puPrice,
                                                                            netPuPrice: entry.netPuPrice,
                                                                            uniqueUuid: entry.uniqueUuid
                                                                        });
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
                                                                        } else {
                                                                            e.currentTarget.focus();
                                                                            e.currentTarget.classList.add('bg-primary', 'text-white');
                                                                        }
                                                                    } else if (e.key === 'Escape') {
                                                                        e.preventDefault();
                                                                        setShowBatchModal(false);
                                                                        setSelectedItemForBatch(null);
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
                                                                title={availableStock > 0
                                                                    ? `Total: ${totalStock} | Used in current bill: ${usedStock} | Available: ${availableStock}\nClick to select this batch`
                                                                    : `Total: ${totalStock} | Used in current bill: ${usedStock} | Available: ${availableStock}\nOut of stock`
                                                                }
                                                            >
                                                                <td className="align-middle" style={{ padding: '3px' }}>{entry.batchNumber || 'N/A'}</td>
                                                                <td className="align-middle" style={{ padding: '3px' }}>{formatDateForInput(entry.expiryDate)}</td>
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
                                                                <td className="align-middle" style={{ padding: '3px' }}>{Math.round(entry.price * 100) / 100}</td>
                                                                <td className="align-middle" style={{ padding: '3px' }}>{Math.round(entry.puPrice * 100) / 100}</td>
                                                                <td className="align-middle" style={{ padding: '3px' }}>{Math.round(entry.marginPercentage * 100) / 100}</td>
                                                                <td className="align-middle d-none" style={{ padding: '3px' }}>{entry.uniqueUuid}</td>
                                                                <td className="align-middle" style={{ padding: '3px' }}>{Math.round(entry.mrp * 100) / 100}</td>
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
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
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
                                        } else if (e.key === 'Escape') {
                                            e.preventDefault();
                                            setShowBatchModal(false);
                                            setSelectedItemForBatch(null);
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
            {showTransactionModal && (
                <div className="modal fade show" id="transactionModal" tabIndex="-1" style={{ display: 'block' }} role="dialog" aria-labelledby="transactionModalLabel" aria-modal="true">
                    <div className="modal-dialog modal-xl modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header py-1 px-3" style={{ minHeight: '40px' }}>
                                <h6 className="modal-title mb-0" id="transactionModalLabel" style={{ fontSize: '1rem' }}>
                                    Last Purchase Return Transactions
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
                                                }}>Return No.</th>
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
                                                            if (transaction.purchaseReturnBillId && transaction.purchaseReturnBillId.id) {
                                                                navigate(`/retailer/purchase-return/${transaction.purchaseReturnBillId.id}/print`);
                                                            }
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                if (transaction.purchaseReturnBillId && transaction.purchaseReturnBillId.id) {
                                                                    navigate(`/retailer/purchase-return/${transaction.purchaseReturnBillId.id}/print`);
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
                                                        <td style={{ padding: '0.15rem 0.3rem' }}>{transaction.purchaseSalesReturnType || 'N/A'}</td>
                                                        <td style={{ padding: '0.15rem 0.3rem' }}>{transaction.paymentMode || 'N/A'}</td>
                                                        <td style={{ padding: '0.15rem 0.3rem', textAlign: 'right' }}>{transaction.quantity || 0}</td>
                                                        <td style={{ padding: '0.15rem 0.3rem' }}>{transaction.unit?.name || 'N/A'}</td>
                                                        <td style={{ padding: '0.15rem 0.3rem', textAlign: 'right', fontWeight: '500' }}>
                                                            Rs.{transaction.puPrice ? Math.round(transaction.puPrice * 100) / 100 : 0}
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr style={{ height: '28px' }}>
                                                    <td colSpan="9" className="text-center text-muted align-middle" style={{ padding: '0.15rem 0.3rem' }}>
                                                        No previous purchase return transactions found
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

export default EditPurcRtn;