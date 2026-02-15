// import React, { useState, useEffect, useRef } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import axios from 'axios';
// import NepaliDate from 'nepali-date-converter';
// import Header from '../Header';
// import NotificationToast from '../../NotificationToast';
// import { calculateExpiryStatus } from '../dashboard/modals/ExpiryStatus';
// import '../../../stylesheet/noDateIcon.css'
// import ProductModal from '../dashboard/modals/ProductModal';
// import AccountBalanceDisplay from '../payment/AccountBalanceDisplay';

// import useDebounce from '../../../hooks/useDebounce';
// import VirtualizedItemList from '../../VirtualizedItemList';
// import { Button } from 'react-bootstrap';
// import { BiArrowBack } from 'react-icons/bi';

// const EditSalesQuotation = () => {
//     const { id } = useParams();
//     const navigate = useNavigate();
//     const [searchQuery, setSearchQuery] = useState('');
//     const [lastSearchQuery, setLastSearchQuery] = useState('');
//     const [shouldShowLastSearchResults, setShouldShowLastSearchResults] = useState(false);
//     const debouncedSearchQuery = useDebounce(searchQuery, 50);
//     const transactionDateRef = useRef(null);
//     const itemsTableRef = useRef(null);
//     const [transactionSettings, setTransactionSettings] = useState({
//         displayTransactions: false,
//         displayTransactionsForPurchase: false,
//         displayTransactionsForSalesReturn: false,
//         displayTransactionsForPurchaseReturn: false
//     });
//     // Add print state
//     const [printAfterSave, setPrintAfterSave] = useState(
//         localStorage.getItem('printAfterSave') === 'true' || false
//     );
//     const continueButtonRef = useRef(null);
//     const [transactionCache, setTransactionCache] = useState(new Map());
//     const [loadingItems, setLoadingItems] = useState(new Set());
//     const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
//     const [transactions, setTransactions] = useState([]);
//     const itemSearchRef = useRef(null);
//     const accountSearchRef = useRef(null);
//     const [showAccountCreationModal, setShowAccountCreationModal] = useState(false);
//     const [showItemsModal, setShowItemsModal] = useState(false);
//     const [pollInterval, setPollInterval] = useState(null);
//     const [showTransactionModal, setShowTransactionModal] = useState(false);

//     const [isLoading, setIsLoading] = useState(true);
//     const [isSaving, setIsSaving] = useState(false);
//     const itemDropdownRef = useRef(null);
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
//         transactionDateNepali: '',
//         transactionDateRoman: '',
//         nepaliDate: '',
//         billDate: '',
//         billNumber: '',
//         paymentMode: 'credit',
//         isVatExempt: 'all',
//         discountPercentage: 0,
//         discountAmount: 0,
//         roundOffAmount: 0,
//         vatPercentage: 13,
//         items: []
//     });
//     const [showProductModal, setShowProductModal] = useState(false);
//     const [items, setItems] = useState([]);
//     const [allItems, setAllItems] = useState([]);
//     const [accounts, setAccounts] = useState([]);
//     const [filteredAccounts, setFilteredAccounts] = useState([]);
//     const [showAccountModal, setShowAccountModal] = useState(false);
//     const [showItemDropdown, setShowItemDropdown] = useState(false);
//     const [filteredItems, setFilteredItems] = useState([]);

//     const [company, setCompany] = useState({
//         dateFormat: 'english',
//         vatEnabled: true,
//         fiscalYear: {}
//     });

//     const api = axios.create({
//         baseURL: process.env.REACT_APP_API_BASE_URL,
//         withCredentials: true,
//     });

//     useEffect(() => {
//         const fetchTransactionSettings = async () => {
//             try {
//                 const response = await api.get('/api/retailer/get-display-sales-transactions');
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
//         // When VAT selection changes or items are loaded, update the filtered items
//         const filtered = allItems.filter(item => {
//             if (formData.isVatExempt === 'all') return true;
//             if (formData.isVatExempt === 'false') return item.vatStatus === 'vatable';
//             if (formData.isVatExempt === 'true') return item.vatStatus === 'vatExempt';
//             return true;
//         });
//         setFilteredItems(filtered);
//     }, [formData.isVatExempt, allItems]);

//     useEffect(() => {
//         // Add F9 key handler here
//         const handF9leKeyDown = (e) => {
//             if (e.key === 'F9') {
//                 e.preventDefault();
//                 setShowProductModal(prev => !prev); // Toggle modal visibility
//             }
//         };
//         window.addEventListener('keydown', handF9leKeyDown);
//         return () => {
//             window.removeEventListener('keydown', handF9leKeyDown);
//         };
//     }, []);

//     useEffect(() => {
//         const fetchSalesQuotationData = async () => {
//             try {
//                 const response = await api.get(`/api/retailer/sales-quotation/edit/${id}`);
//                 const { data } = response;

//                 const sortedItems = data.data.items.sort((a, b) => a.name.localeCompare(b.name));

//                 setCompany(data.data.company);
//                 setAllItems(sortedItems);
//                 setAccounts(data.data.accounts || []);

//                 const salesQuotation = data.data.salesQuotation;
//                 const dateFormat = data.data.company.dateFormat;

//                 setFormData({
//                     accountId: salesQuotation.account._id,
//                     accountName: salesQuotation.account.name,
//                     accountAddress: salesQuotation.account.address,
//                     accountPan: salesQuotation.account.pan,
//                     transactionDateNepali: dateFormat === 'nepali' ?
//                         new NepaliDate(salesQuotation.transactionDate).format('YYYY-MM-DD') : '',
//                     transactionDateRoman: dateFormat !== 'nepali' ?
//                         new Date(salesQuotation.transactionDate).toISOString().split('T')[0] : '',
//                     nepaliDate: dateFormat === 'nepali' ?
//                         new NepaliDate(salesQuotation.date).format('YYYY-MM-DD') : '',
//                     billDate: dateFormat !== 'nepali' ?
//                         new Date(salesQuotation.date).toISOString().split('T')[0] : '',
//                     billNumber: salesQuotation.billNumber,
//                     paymentMode: salesQuotation.paymentMode,
//                     isVatExempt: salesQuotation.isVatExempt ? 'true' :
//                         (salesQuotation.isVatAll === 'true' ? 'all' : 'false'),
//                     discountPercentage: salesQuotation.discountPercentage,
//                     discountAmount: salesQuotation.discountAmount,
//                     roundOffAmount: salesQuotation.roundOffAmount,
//                     vatPercentage: salesQuotation.vatPercentage,
//                     items: salesQuotation.items.map(item => ({
//                         ...item,
//                         item: item.item?._id || item.item,
//                         unit: item.unit ? {
//                             _id: item.unit._id,
//                             name: item.unit.name
//                         } : null,
//                         amount: (item.quantity * item.price).toFixed(2)
//                     }))
//                 });

//                 setIsLoading(false);
//             } catch (error) {
//                 console.error('Error fetching sales quotation data:', error);
//                 setNotification({
//                     show: true,
//                     message: 'Failed to load sales quotation data',
//                     type: 'error'
//                 });
//                 setIsLoading(false);
//             }
//         };

//         fetchSalesQuotationData();
//     }, [id]);

//     // Add function to fetch items
//     const fetchItems = async () => {
//         try {
//             const response = await api.get('/api/retailer/items');
//             if (response.data.success) {
//                 const sortedItems = response.data.items.sort((a, b) => a.name.localeCompare(b.name));
//                 setAllItems(sortedItems);

//                 // Update filtered items based on current search
//                 if (itemSearchRef.current?.value) {
//                     handleItemSearch({ target: { value: itemSearchRef.current.value } });
//                 }
//             }
//         } catch (error) {
//             console.error('Error fetching items:', error);
//         }
//     };

//     useEffect(() => {
//         if (showItemsModal) {
//             const interval = setInterval(fetchItems, 2000); // Poll every 2 seconds
//             setPollInterval(interval);
//         } else {
//             if (pollInterval) {
//                 clearInterval(pollInterval);
//                 setPollInterval(null);
//             }
//         }

//         return () => {
//             if (pollInterval) {
//                 clearInterval(pollInterval);
//             }
//         };
//     }, [showItemsModal]);

//     useEffect(() => {
//         calculateTotal();
//     }, [formData.items, formData.discountPercentage, formData.discountAmount, formData.roundOffAmount]);

//     useEffect(() => {
//         const handleClickOutside = (event) => {
//             if (itemSearchRef.current && !itemSearchRef.current.contains(event.target)) {
//                 setShowItemDropdown(false);
//             }
//         };

//         document.addEventListener('mousedown', handleClickOutside);
//         return () => {
//             document.removeEventListener('mousedown', handleClickOutside);
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
//             // Reset search memory when component unmounts
//             setLastSearchQuery('');
//             setShouldShowLastSearchResults(false);
//         };
//     }, []);

//     const handleAccountSearch = (e) => {
//         const searchText = e.target.value.toLowerCase();
//         const filtered = accounts.filter(account =>
//             account.name.toLowerCase().includes(searchText)
//         ).sort((a, b) => a.name.localeCompare(b.name));

//         setFilteredAccounts(filtered);
//     };

//     const selectAccount = (account) => {
//         setFormData({
//             ...formData,
//             accountId: account._id,
//             accountName: account.name,
//             accountAddress: account.address,
//             accountPan: account.pan
//         });
//         setShowAccountModal(false);
//     };

//     const handleItemSearch = (e) => {
//         const query = e.target.value.toLowerCase();
//         setSearchQuery(query);

//         // When user starts typing, disable showing last search results
//         if (query.length > 0) {
//             setShouldShowLastSearchResults(false);
//         }

//         setShowItemDropdown(true);
//     };

//     const handleSearchFocus = () => {
//         setShowItemDropdown(true);

//         // If we have a last search query and the input is empty, show those results
//         if (lastSearchQuery && !searchQuery) {
//             setShouldShowLastSearchResults(true);
//         }

//         document.querySelectorAll('.dropdown-item').forEach(item => {
//             item.classList.remove('active');
//         });

//         // Scroll to items table when search input is focused
//         scrollToItemsTable();
//     };

//     const fetchLastTransactions = async (itemId) => {
//         if (!formData.accountId) {
//             setNotification({
//                 show: true,
//                 message: 'Please select an account first',
//                 type: 'error'
//             });
//             return;
//         }

//         setLoadingItems(prev => new Set(prev).add(itemId));
//         setIsLoadingTransactions(true);

//         try {
//             const cacheKey = `${itemId}-${formData.accountId}`;

//             if (transactionCache.has(cacheKey)) {
//                 const cachedTransactions = transactionCache.get(cacheKey);
//                 setTransactions(cachedTransactions);
//                 setShowTransactionModal(true);
//                 return;
//             }

//             const controller = new AbortController();
//             const timeoutId = setTimeout(() => controller.abort(), 3000);

//             const response = await api.get(`/api/retailer/transactions/${itemId}/${formData.accountId}/Sales`, {
//                 signal: controller.signal
//             });

//             clearTimeout(timeoutId);

//             if (response.data.success) {
//                 setTransactionCache(prev => new Map(prev.set(cacheKey, response.data.data.transactions)));
//                 setTransactions(response.data.data.transactions);
//                 setShowTransactionModal(true);
//             }
//         } catch (error) {
//             if (error.name !== 'AbortError') {
//                 console.error('Error fetching transactions:', error);
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


//     const addItemToBill = async (item) => {

//         // Store the search query when adding an item
//         if (itemSearchRef.current?.value) {
//             setLastSearchQuery(itemSearchRef.current.value);
//             setShouldShowLastSearchResults(true);
//         }

//         const newItem = {
//             item: item._id,
//             uniqueNumber: item.uniqueNumber || 'N/A',
//             hscode: item.hscode,
//             name: item.name,
//             description: item.description,
//             quantity: 1,
//             unit: item.unit ? {
//                 _id: item.unit._id,
//                 name: item.unit.name
//             } : null,
//             price: item.latestPrice || 0,
//             amount: (1 * (item.latestPrice || 0)).toFixed(2),
//             vatStatus: item.vatStatus
//         };

//         setFormData(prev => ({
//             ...prev,
//             items: [...prev.items, newItem]
//         }));
//         setShowItemDropdown(false);
//         itemSearchRef.current.value = '';

//         // Clear search after adding item
//         setSearchQuery('');
//         if (itemSearchRef.current) {
//             itemSearchRef.current.value = '';
//         }

//         // Update the transaction fetching part for SALES QUOTATION
//         if (transactionSettings.displayTransactions && formData.accountId) {
//             const cacheKey = `${item._id}-${formData.accountId}`;

//             // Check cache first
//             if (transactionCache.has(cacheKey)) {
//                 const cachedTransactions = transactionCache.get(cacheKey);
//                 if (cachedTransactions.length > 0) {
//                     setTransactions(cachedTransactions);
//                     setShowTransactionModal(true);
//                     return;
//                 }
//             }

//             try {
//                 setIsLoadingTransactions(true);

//                 const controller = new AbortController();
//                 const timeoutId = setTimeout(() => controller.abort(), 3000);

//                 const response = await api.get(`/api/retailer/transactions/${item._id}/${formData.accountId}/Sales`, {
//                     signal: controller.signal
//                 });

//                 clearTimeout(timeoutId);

//                 if (response.data.success) {
//                     setTransactionCache(prev => new Map(prev.set(cacheKey, response.data.data.transactions)));

//                     if (response.data.data.transactions.length > 0) {
//                         setTransactions(response.data.data.transactions);
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
//             const newItemIndex = formData.items.length; // New item will be at this index
//             const descriptionInput = document.getElementById(`description-${newItemIndex}`);
//             if (descriptionInput) {
//                 descriptionInput.focus();
//                 descriptionInput.select(); // Optional: select the text for easy editing
//             }
//         }, 100);
//     };

//     // Memoized filtered items calculation
//     const memoizedFilteredItems = React.useMemo(() => {
//         // If we should show last search results and there's a last search query
//         if (shouldShowLastSearchResults && lastSearchQuery && !searchQuery) {
//             return allItems.filter(item => {
//                 const matchesSearch = item.name.toLowerCase().includes(lastSearchQuery.toLowerCase()) ||
//                     (item.hscode && item.hscode.toString().toLowerCase().includes(lastSearchQuery.toLowerCase())) ||
//                     (item.uniqueNumber && item.uniqueNumber.toString().toLowerCase().includes(lastSearchQuery.toLowerCase())) ||
//                     (item.category && item.category.name.toLowerCase().includes(lastSearchQuery.toLowerCase()));

//                 if (formData.isVatExempt === 'all') return matchesSearch;
//                 if (formData.isVatExempt === 'false') return matchesSearch && item.vatStatus === 'vatable';
//                 if (formData.isVatExempt === 'true') return matchesSearch && item.vatStatus === 'vatExempt';
//                 return matchesSearch;
//             });
//         }

//         // Normal search behavior
//         if (!searchQuery && allItems.length > 0) {
//             return allItems.filter(item => {
//                 if (formData.isVatExempt === 'all') return true;
//                 if (formData.isVatExempt === 'false') return item.vatStatus === 'vatable';
//                 if (formData.isVatExempt === 'true') return item.vatStatus === 'vatExempt';
//                 return true;
//             });
//         }

//         if (searchQuery.length === 0) return [];

//         return allItems.filter(item => {
//             const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
//                 (item.hscode && item.hscode.toString().toLowerCase().includes(searchQuery.toLowerCase())) ||
//                 (item.uniqueNumber && item.uniqueNumber.toString().toLowerCase().includes(searchQuery.toLowerCase())) ||
//                 (item.category && item.category.name.toLowerCase().includes(searchQuery.toLowerCase()));

//             if (formData.isVatExempt === 'all') return matchesSearch;
//             if (formData.isVatExempt === 'false') return matchesSearch && item.vatStatus === 'vatable';
//             if (formData.isVatExempt === 'true') return matchesSearch && item.vatStatus === 'vatExempt';
//             return matchesSearch;
//         });
//     }, [allItems, formData.isVatExempt, searchQuery, lastSearchQuery, shouldShowLastSearchResults]);

//     const updateItemField = (index, field, value) => {
//         const updatedItems = [...formData.items];
//         updatedItems[index][field] = value;

//         if (field === 'quantity' || field === 'price') {
//             updatedItems[index].amount = (updatedItems[index].quantity * updatedItems[index].price).toFixed(2);
//         }

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
//         if (formData.items.length <= 1) {
//             setNotification({
//                 show: true,
//                 message: 'You cannot remove the last item. A quotation must have at least one item.',
//                 type: 'error'
//             });
//             return;
//         }

//         const updatedItems = formData.items.filter((_, i) => i !== index);
//         setFormData(prev => ({
//             ...prev,
//             items: updatedItems
//         }));
//     };

//     const calculateTotal = (itemsToCalculate = formData.items) => {
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
//             subTotal,
//             taxableAmount: finalTaxableAmount,
//             nonTaxableAmount: finalNonTaxableAmount,
//             vatAmount,
//             totalAmount
//         };
//     };

//     const handleDiscountPercentageChange = (e) => {
//         const value = parseFloat(e.target.value) || 0;
//         const subTotal = calculateTotal().subTotal;
//         const discountAmount = (subTotal * value) / 100;

//         setFormData(prev => ({
//             ...prev,
//             discountPercentage: value,
//             discountAmount: discountAmount.toFixed(2)
//         }));
//     };

//     const handleDiscountAmountChange = (e) => {
//         const value = parseFloat(e.target.value) || 0;
//         const subTotal = calculateTotal().subTotal;
//         const discountPercentage = subTotal > 0 ? (value / subTotal) * 100 : 0;

//         setFormData(prev => ({
//             ...prev,
//             discountAmount: value,
//             discountPercentage: discountPercentage.toFixed(2)
//         }));
//     };

//     const handleSubmit = async (e, print = false) => {
//         e.preventDefault();
//         setIsSaving(true);

//         try {
//             const quotationData = {
//                 ...formData,
//                 items: formData.items.map(item => ({
//                     ...item,
//                     item: item.item?._id || item.item,
//                     unit: item.unit?._id || item.unit,
//                     vatStatus: item.vatStatus
//                 })),
//                 print
//             };

//             const response = await api.put(`/api/retailer/sales-quotation/edit/${id}`, quotationData);

//             setNotification({
//                 show: true,
//                 message: 'Sales quotation updated successfully!',
//                 type: 'success'
//             });

//             if (print && response.data.data?.quotation?._id) {
//                 setItems([]);
//                 setIsSaving(false);
//                 await printQuotationImmediately(response.data.data.quotation._id);
//                 setTimeout(() => {
//                     handleBack();
//                 }, 1000);
//             } else {
//                 setItems([]);
//                 setIsSaving(false);
//                 handleBack();
//             }

//         } catch (error) {
//             console.error('Error updating sales quotation:', error);
//             setNotification({
//                 show: true,
//                 message: error.response?.data?.error || 'Failed to update sales quotation. Please try again.',
//                 type: 'error'
//             });
//         } finally {
//             setIsSaving(false);
//         }
//     };

//     const totals = calculateTotal();

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

//     const fetchAccounts = async () => {
//         try {
//             const response = await api.get('/api/retailer/fetchlatest/accounts');
//             const sortedAccounts = response.data.sort((a, b) => a.name.localeCompare(b.name));
//             setAccounts(sortedAccounts);
//             setFilteredAccounts(sortedAccounts);
//         } catch (error) {
//             console.error('Error fetching accounts:', error);
//             setNotification({
//                 show: true,
//                 message: 'Error refreshing accounts',
//                 type: 'error'
//             });
//         }
//     };

//     const handleTransactionModalClose = () => {
//         setShowTransactionModal(false);

//         // Focus on description field of the last item in formData.items
//         setTimeout(() => {
//             if (formData.items.length > 0) {
//                 const lastIndex = formData.items.length - 1;
//                 const descriptionInput = document.getElementById(`description-${lastIndex}`);
//                 if (descriptionInput) {
//                     descriptionInput.focus();
//                     descriptionInput.select();
//                 }
//             }
//         }, 100);
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
//                 setShowAccountCreationModal(false);
//                 setShowAccountModal(true);
//             } else if (showAccountModal && e.key === 'F6') {
//                 e.preventDefault();
//                 setShowAccountCreationModal(true);
//                 setShowAccountModal(false);
//             }
//         };

//         document.addEventListener('keydown', handleGlobalKeyDown);
//         return () => {
//             document.removeEventListener('keydown', handleGlobalKeyDown);
//         };
//     }, [showTransactionModal, showAccountCreationModal, showAccountModal, handleTransactionModalClose]);


//     const handleAccountCreationModalClose = () => {
//         setShowAccountCreationModal(false);
//         setShowAccountModal(true);

//         // Refresh accounts data
//         fetchAccounts();
//     };

//     // Add print function
//     const printQuotationImmediately = async (quotationId) => {
//         try {
//             const response = await api.get(`/api/retailer/sales-quotation/${quotationId}/print`);
//             const printData = response.data.data;

//             // Create a temporary div to hold the print content
//             const tempDiv = document.createElement('div');
//             tempDiv.style.position = 'absolute';
//             tempDiv.style.left = '-9999px';
//             document.body.appendChild(tempDiv);

//             // Create the printable content
//             tempDiv.innerHTML = `
//       <div id="printableContent">
//         <div class="print-quotation-container">
//           <div class="print-quotation-header">
//             <div class="print-company-name">${printData.currentCompanyName}</div>
//             <div class="print-company-details">
//               ${printData.currentCompany.address} | Tel: ${printData.currentCompany.phone} | PAN: ${printData.currentCompany.pan}
//             </div>
//             <div class="print-quotation-title">SALES QUOTATION</div>
//           </div>

//           <div class="print-quotation-details">
//             <div>
//               <div><strong>M/S:</strong> ${printData.salesQuotation.account?.name || printData.salesQuotation.cashAccount || 'Account Not Found'}</div>
//               <div><strong>Address:</strong> ${printData.salesQuotation.account?.address || printData.salesQuotation.cashAccountAddress || 'N/A'}</div>
//               <div><strong>PAN:</strong> ${printData.salesQuotation.account?.pan || printData.salesQuotation.cashAccountPan || 'N/A'} | <strong>Tel:</strong> ${printData.salesQuotation.account?.phone || printData.salesQuotation.cashAccountPhone || 'N/A'}</div>
//               <div><strong>Email:</strong> ${printData.salesQuotation.account?.email || printData.salesQuotation.cashAccountEmail || 'N/A'}</div>
//             </div>
//             <div>
//               <div><strong>Quotation No:</strong> ${printData.salesQuotation.billNumber}</div>
//               <div><strong>Validity Periods:</strong> ${new Date(printData.salesQuotation.transactionDate).toLocaleDateString()}</div>
//               <div><strong>Quotation Issue Date:</strong> ${new Date(printData.salesQuotation.date).toLocaleDateString()}</div>
//               <div><strong>Mode of Payment:</strong> ${printData.salesQuotation.paymentMode}</div>
//             </div>
//           </div>

//           <table class="print-quotation-table">
//             <thead>
//               <tr>
//                 <th>S.N.</th>
//                 <th>#</th>
//                 <th>HSN</th>
//                 <th>Description of Goods</th>
//                 <th>Description</th>
//                 <th>Qty</th>
//                 <th>Unit</th>
//                 <th>Rate (Rs.)</th>
//                 <th>Total (Rs.)</th>
//               </tr>
//             </thead>
//             <tbody>
//               ${printData.salesQuotation.items.map((item, i) => `
//                 <tr key="${i}">
//                   <td>${i + 1}</td>
//                   <td>${item.item.uniqueNumber}</td>
//                   <td>${item.item.hscode}</td>
//                   <td>
//                     ${item.item.vatStatus === 'vatExempt' ?
//                     `${item.item.name} *` :
//                     item.item.name
//                 }
//                   </td>
//                   <td>${item.description ? item.description : ''}</td>
//                   <td>${item.quantity}</td>
//                   <td>${item.item.unit?.name || ''}</td>
//                   <td>${item.price.toFixed(2)}</td>
//                   <td>${(item.quantity * item.price).toFixed(2)}</td>
//                 </tr>
//               `).join('')}
//             </tbody>
//             <tr>
//               <td colSpan="9" style="border-bottom: 1px solid #000"></td>
//             </tr>
//           </table>

//           <table class="print-totals-table">
//             <tbody>
//               <tr>
//                 <td><strong>Sub-Total:</strong></td>
//                 <td class="print-text-right">${printData.salesQuotation.subTotal.toFixed(2)}</td>
//               </tr>
//               <tr>
//                 <td><strong>Discount (${printData.salesQuotation.discountPercentage}%):</strong></td>
//                 <td class="print-text-right">${printData.salesQuotation.discountAmount.toFixed(2)}</td>
//               </tr>
//               <tr>
//                 <td><strong>Non-Taxable:</strong></td>
//                 <td class="print-text-right">${printData.salesQuotation.nonVatSales.toFixed(2)}</td>
//               </tr>
//               <tr>
//                 <td><strong>Taxable Amount:</strong></td>
//                 <td class="print-text-right">${printData.salesQuotation.taxableAmount.toFixed(2)}</td>
//               </tr>
//               ${!printData.salesQuotation.isVatExempt ? `
//                 <tr>
//                   <td><strong>VAT (${printData.salesQuotation.vatPercentage}%):</strong></td>
//                   <td class="print-text-right">${(printData.salesQuotation.taxableAmount * printData.salesQuotation.vatPercentage / 100).toFixed(2)}</td>
//                 </tr>
//               ` : ''}
//               <tr>
//                 <td><strong>Round Off:</strong></td>
//                 <td class="print-text-right">${printData.salesQuotation.roundOffAmount.toFixed(2)}</td>
//               </tr>
//               <tr>
//                 <td><strong>Grand Total:</strong></td>
//                 <td class="print-text-right">${printData.salesQuotation.totalAmount.toFixed(2)}</td>
//               </tr>
//             </tbody>
//           </table>

//           <div class="print-amount-in-words">
//             <strong>In Words:</strong> ${convertToRupeesAndPaisa(printData.salesQuotation.totalAmount)} Only.
//           </div>

//           ${printData.salesQuotation.description ? `
//             <div class="mt-3 print-note">
//               <strong>Note:</strong> ${printData.salesQuotation.description}
//             </div>
//           ` : ''}

//           <div class="print-signature-area">
//             <div class="print-signature-box">Received By</div>
//             <div class="print-signature-box">Prepared By: ${printData.salesQuotation.user.name}</div>
//             <div class="print-signature-box">For: ${printData.currentCompanyName}</div>
//           </div>
//         </div>
//       </div>
//     `;

//             // Add print styles
//             const styles = `
//       @page {
//         size: A4;
//         margin: 5mm;
//       }
//       body {
//         font-family: 'Arial Narrow', Arial, sans-serif;
//         font-size: 9pt;
//         line-height: 1.2;
//         color: #000;
//         background: white;
//         margin: 0;
//         padding: 0;
//       }
//       .print-quotation-container {
//         width: 100%;
//         max-width: 210mm;
//         margin: 0 auto;
//         padding: 2mm;
//       }
//       .print-quotation-header {
//         text-align: center;
//         margin-bottom: 3mm;
//         border-bottom: 1px solid #000;
//         padding-bottom: 2mm;
//       }
//       .print-quotation-title {
//         font-size: 12pt;
//         font-weight: bold;
//         margin: 2mm 0;
//         text-transform: uppercase;
//       }
//       .print-company-name {
//         font-size: 16pt;
//         font-weight: bold;
//       }
//       .print-company-details {
//         font-size: 8pt;
//         margin: 1mm 0;
//         font-weight: bold;
//       }
//       .print-quotation-details {
//         display: flex;
//         justify-content: space-between;
//         margin: 2mm 0;
//         font-size: 8pt;
//       }
//       .print-quotation-table {
//         width: 100%;
//         border-collapse: collapse;
//         margin: 3mm 0;
//         font-size: 8pt;
//         border: none;
//       }
//       .print-quotation-table thead {
//         border-top: 1px solid #000;
//         border-bottom: 1px solid #000;
//       }
//       .print-quotation-table th {
//         background-color: transparent;
//         border: none;
//         padding: 1mm;
//         text-align: left;
//         font-weight: bold;
//       }
//       .print-quotation-table td {
//         border: none;
//         padding: 1mm;
//         border-bottom: 1px solid #eee;
//       }
//       .print-text-right {
//         text-align: right;
//       }
//       .print-text-center {
//         text-align: center;
//       }
//       .print-amount-in-words {
//         font-size: 8pt;
//         margin: 2mm 0;
//         padding: 1mm;
//         border: 1px dashed #000;
//       }
//       .print-signature-area {
//         display: flex;
//         justify-content: space-between;
//         margin-top: 5mm;
//         font-size: 8pt;
//       }
//       .print-signature-box {
//         text-align: center;
//         width: 30%;
//         border-top: 1px solid #000;
//         padding-top: 1mm;
//         font-weight: bold;
//       }
//       .print-totals-table {
//         width: 60%;
//         margin-left: auto;
//         border-collapse: collapse;
//         font-size: 8pt;
//       }
//       .print-totals-table td {
//         padding: 1mm;
//       }
//     `;

//             // Create print window
//             const printWindow = window.open('', '_blank');
//             printWindow.document.write(`
//       <html>
//         <head>
//           <title>Sales_Quotation_${printData.salesQuotation.billNumber}</title>
//           <style>${styles}</style>
//         </head>
//         <body>
//           ${tempDiv.innerHTML}
//           <script>
//             window.onload = function() {
//               setTimeout(function() {
//                 window.print();
//                 window.close();
//               }, 200);
//             };
//           </script>
//         </body>
//       </html>
//     `);
//             printWindow.document.close();

//             // Clean up
//             document.body.removeChild(tempDiv);
//         } catch (error) {
//             console.error('Error fetching print data:', error);
//             setNotification({
//                 show: true,
//                 message: 'Quotation saved but failed to load print data',
//                 type: 'warning'
//             });
//         }
//     };

//     const scrollToItemsTable = () => {
//         if (itemsTableRef.current) {
//             // Add a small delay to ensure the DOM is updated
//             setTimeout(() => {
//                 itemsTableRef.current.scrollIntoView({
//                     behavior: 'smooth',
//                     block: 'start'
//                 });
//             }, 100);
//         }
//     };

//     const handlePrintAfterSaveChange = (e) => {
//         const isChecked = e.target.checked;
//         setPrintAfterSave(isChecked);
//         localStorage.setItem('printAfterSave', isChecked);
//     };

//     useEffect(() => {
//         const handleF6KeyForItems = (e) => {
//             if (e.key === 'F6' && document.activeElement === itemSearchRef.current) {
//                 e.preventDefault();
//                 setShowItemsModal(true);
//                 // Clear search when opening modal
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

//     const handleBack = () => {
//         navigate(-1);
//     };

//     const ItemDropdown = React.useMemo(() => {
//         if (!showItemDropdown) return null;

//         const itemsToShow = memoizedFilteredItems;

//         // Determine what message to show
//         let message = null;
//         if (itemsToShow.length === 0) {
//             if (shouldShowLastSearchResults && lastSearchQuery) {
//                 message = `No items found matching "${lastSearchQuery}"`;
//             } else if (searchQuery) {
//                 message = `No items found matching "${searchQuery}"`;
//             } else {
//                 message = "No items available";
//             }
//         }

//         return (
//             <div
//                 id="dropdownMenu"
//                 className="dropdown-menu show w-100"
//                 style={{
//                     maxHeight: '280px',
//                     height: '280px',
//                     overflow: 'hidden',
//                     position: 'absolute',
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
//                     <div><strong>Qty</strong></div>
//                     <div><strong>Unit</strong></div>
//                     <div><strong>Rate</strong></div>
//                 </div>

//                 {itemsToShow.length > 0 ? (
//                     <VirtualizedItemList
//                         items={itemsToShow}
//                         onItemClick={addItemToBill}
//                         searchRef={itemSearchRef}
//                     />
//                 ) : (
//                     <div className="text-center py-3 text-muted">
//                         {message}
//                     </div>
//                 )}
//             </div>
//         );
//     }, [showItemDropdown, memoizedFilteredItems, searchQuery, lastSearchQuery, shouldShowLastSearchResults]);


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
//             <div className="container-fluid wow-form expanded-container">
//                 <div className="card mt-4 shadow-lg p-4 animate__animated animate__fadeInUp expanded-card">
//                     <div className="card-header">
//                         Update Sales Quotation
//                         <span id="customAlertForBillNumber" style={{ color: 'red', display: 'none' }}>Quotation no. is required!</span>
//                         <span id="transactionDateError" style={{ color: 'red', display: 'none' }}>Invalid date!</span>
//                         <span id="nepaliDateError" style={{ color: 'red', display: 'none' }}>Invalid date!</span>
//                     </div>
//                     <div className="card-body">
//                         <form onSubmit={handleSubmit} id="billForm" className="wow-form">
//                             <div className="form-group row">
//                                 {company.dateFormat === 'nepali' ? (
//                                     <>
//                                         <div className="col">
//                                             <label htmlFor="transactionDateNepali">Validity Periods:</label>
//                                             <input
//                                                 type="text"
//                                                 name="transactionDateNepali"
//                                                 id="transactionDateNepali"
//                                                 ref={company.dateFormat === 'nepali' ? transactionDateRef : null}
//                                                 className={`form-control no-date-icon ${dateErrors.transactionDateNepali ? 'is-invalid' : ''}`}
//                                                 value={formData.transactionDateNepali}
//                                                 onChange={(e) => {
//                                                     setFormData({ ...formData, transactionDateNepali: e.target.value });
//                                                     setDateErrors(prev => ({ ...prev, transactionDateNepali: '' }));
//                                                 }}
//                                                 onBlur={(e) => {
//                                                     try {
//                                                         const dateStr = e.target.value;
//                                                         if (!dateStr) {
//                                                             setDateErrors(prev => ({ ...prev, transactionDateNepali: 'Date is required' }));
//                                                             return;
//                                                         }
//                                                         if (!/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(dateStr)) {
//                                                             return;
//                                                         }
//                                                         const [year, month, day] = dateStr.split('/').map(Number);
//                                                         if (month < 1 || month > 12) throw new Error("Month must be between 1-12");
//                                                         if (day < 1 || day > 33) throw new Error("Day must be between 1-32");
//                                                         const nepaliDate = new NepaliDate(year, month - 1, day);

//                                                         setFormData({
//                                                             ...formData,
//                                                             transactionDateNepali: nepaliDate.format('MM/DD/YYYY')
//                                                         });
//                                                         setDateErrors(prev => ({ ...prev, transactionDateNepali: '' }));
//                                                     } catch (error) {
//                                                         setDateErrors(prev => ({
//                                                             ...prev,
//                                                             transactionDateNepali: error.message || 'Invalid Nepali date'
//                                                         }));
//                                                     }
//                                                 }}
//                                                 onKeyDown={(e) => {
//                                                     if ((e.key === 'Tab' || e.key === 'Enter') && dateErrors.transactionDateNepali) {
//                                                         e.preventDefault();
//                                                         e.target.focus();
//                                                     } else if (e.key === 'Enter') {
//                                                         handleKeyDown(e, 'transactionDateNepali');
//                                                     }
//                                                 }}
//                                                 autoFocus
//                                                 autoComplete='off'
//                                                 required
//                                             />
//                                             {dateErrors.transactionDateNepali && (
//                                                 <div className="invalid-feedback">
//                                                     {dateErrors.transactionDateNepali}
//                                                 </div>
//                                             )}
//                                         </div>
//                                         <div className="col">
//                                             <label htmlFor="nepaliDate">Quotation Date:</label>
//                                             <input
//                                                 type="text"
//                                                 name="nepaliDate"
//                                                 id="nepaliDate"
//                                                 className={`form-control no-date-icon ${dateErrors.nepaliDate ? 'is-invalid' : ''}`}
//                                                 value={formData.nepaliDate}
//                                                 onChange={(e) => {
//                                                     setFormData({ ...formData, nepaliDate: e.target.value });
//                                                     setDateErrors(prev => ({ ...prev, nepaliDate: '' }));
//                                                 }}
//                                                 onBlur={(e) => {
//                                                     try {
//                                                         const dateStr = e.target.value.trim();
//                                                         if (!dateStr) {
//                                                             setDateErrors(prev => ({ ...prev, nepaliDate: 'Date is required' }));
//                                                             return;
//                                                         }

//                                                         if (!/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(dateStr)) {
//                                                             return;
//                                                         }

//                                                         const [year, month, day] = dateStr.split('/').map(Number);
//                                                         if (month < 1 || month > 12) throw new Error("Month must be between 1-12");
//                                                         if (day < 1 || day > 33) throw new Error("Day must be between 1-32");

//                                                         const nepaliDate = new NepaliDate(year, month - 1, day);

//                                                         if (
//                                                             nepaliDate.getYear() !== year ||
//                                                             nepaliDate.getMonth() + 1 !== month ||
//                                                             nepaliDate.getDate() !== day
//                                                         ) {
//                                                             throw new Error("Invalid Nepali date");
//                                                         }

//                                                         setFormData({
//                                                             ...formData,
//                                                             nepaliDate: nepaliDate.format('MM/DD/YYYY')
//                                                         });
//                                                         setDateErrors(prev => ({ ...prev, nepaliDate: '' }));
//                                                     } catch (error) {
//                                                         setDateErrors(prev => ({
//                                                             ...prev,
//                                                             nepaliDate: error.message || 'Invalid Nepali date'
//                                                         }));
//                                                     }
//                                                 }}
//                                                 onKeyDown={(e) => {
//                                                     if ((e.key === 'Tab' || e.key === 'Enter') && dateErrors.nepaliDate) {
//                                                         e.preventDefault();
//                                                         e.target.focus();
//                                                     } else if (e.key === 'Enter') {
//                                                         handleKeyDown(e, 'nepaliDate');
//                                                     }
//                                                 }}
//                                                 required
//                                                 autoComplete='off'
//                                             />
//                                             {dateErrors.nepaliDate && (
//                                                 <div className="invalid-feedback">
//                                                     {dateErrors.nepaliDate}
//                                                 </div>
//                                             )}
//                                         </div>
//                                     </>
//                                 ) : (
//                                     <>
//                                         <div className="col">
//                                             <label htmlFor="transactionDateRoman">Transaction Date:</label>
//                                             <input
//                                                 type="text"
//                                                 name="transactionDateRoman"
//                                                 id="transactionDateRoman"
//                                                 className="form-control"
//                                                 value={formData.transactionDateRoman}
//                                                 onChange={(e) => setFormData({ ...formData, transactionDateRoman: e.target.value })}
//                                                 onKeyDown={(e) => {
//                                                     if ((e.key === 'Tab' || e.key === 'Enter') && dateErrors.transactionDateRoman) {
//                                                         e.preventDefault();
//                                                         e.target.focus();
//                                                     } else if (e.key === 'Enter') {
//                                                         handleKeyDown(e, 'transactionDateRoman');
//                                                     }
//                                                 }}
//                                                 required
//                                             />
//                                         </div>
//                                         <div className="col">
//                                             <label htmlFor="billDate">Quotation Date:</label>
//                                             <input
//                                                 type="date"
//                                                 name="billDate"
//                                                 id="billDate"
//                                                 className="form-control"
//                                                 value={formData.billDate}
//                                                 onChange={(e) => setFormData({ ...formData, billDate: e.target.value })}
//                                                 onKeyDown={(e) => {
//                                                     if ((e.key === 'Tab' || e.key === 'Enter') && dateErrors.billDate) {
//                                                         e.preventDefault();
//                                                         e.target.focus();
//                                                     } else if (e.key === 'Enter') {
//                                                         handleKeyDown(e, 'billDate');
//                                                     }
//                                                 }}
//                                                 required
//                                             />
//                                         </div>
//                                     </>
//                                 )}

//                                 <div className="col">
//                                     <label htmlFor="billNumber">Inv. No:</label>
//                                     <input
//                                         type="text"
//                                         name="billNumber"
//                                         id="billNumber"
//                                         className="form-control"
//                                         value={formData.billNumber}
//                                         onChange={(e) => setFormData({ ...formData, billNumber: e.target.value })}
//                                         onKeyDown={(e) => {
//                                             if (e.key === 'Enter') {
//                                                 handleKeyDown(e, 'billNumber');
//                                             }
//                                         }}
//                                         readOnly
//                                     />
//                                 </div>

//                                 <div className="col">
//                                     <label htmlFor="paymentMode">Payment Mode:</label>
//                                     <select
//                                         className="form-control"
//                                         id="paymentMode"
//                                         name="paymentMode"
//                                         value={formData.paymentMode}
//                                         onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
//                                         onKeyDown={(e) => {
//                                             if (e.key === 'Enter') {
//                                                 handleKeyDown(e, 'paymentMode');
//                                             }
//                                         }}
//                                     >
//                                         <option value="credit">credit</option>
//                                         <option value="cash">cash</option>
//                                     </select>
//                                 </div>

//                                 <div className="col">
//                                     <label htmlFor="isVatExempt">VAT</label>
//                                     <select
//                                         name="isVatExempt"
//                                         id="isVatExempt"
//                                         className="form-control"
//                                         value={formData.isVatExempt}
//                                         onChange={(e) => setFormData({ ...formData, isVatExempt: e.target.value })}
//                                         onKeyDown={(e) => {
//                                             if (e.key === 'Enter') {
//                                                 handleKeyDown(e, 'isVatExempt');
//                                             }
//                                         }}
//                                     >
//                                         {company.vatEnabled && <option value="all">All</option>}
//                                         {company.vatEnabled && <option value="false">13%</option>}
//                                         <option value="true">Exempt</option>
//                                     </select>
//                                 </div>
//                             </div>

//                             <div className="form-group row">
//                                 <div className="col-6">
//                                     <label htmlFor="account">Party Name:</label>
//                                     <input
//                                         type="text"
//                                         id="account"
//                                         name="account"
//                                         className="form-control"
//                                         value={formData.accountName}
//                                         onClick={() => setShowAccountModal(true)}
//                                         onFocus={() => setShowAccountModal(true)}
//                                         readOnly
//                                         required
//                                     />
//                                     <AccountBalanceDisplay
//                                         accountId={formData.accountId}
//                                         api={api}
//                                         compact={true}
//                                         dateFormat={company.dateFormat}
//                                     />
//                                     <input type="hidden" id="accountId" name="accountId" value={formData.accountId} />
//                                 </div>

//                                 <div className="col">
//                                     <label htmlFor="address">Party Address:</label>
//                                     <input
//                                         type="text"
//                                         id="address"
//                                         name="address"
//                                         className="form-control"
//                                         value={formData.accountAddress}
//                                         onKeyDown={(e) => {
//                                             if (e.key === 'Enter') {
//                                                 handleKeyDown(e, 'address');
//                                             }
//                                         }}
//                                         readOnly
//                                     />
//                                 </div>

//                                 <div className="col">
//                                     <label htmlFor="pan">Vat No:</label>
//                                     <input
//                                         type="text"
//                                         id="pan"
//                                         name="pan"
//                                         className="form-control"
//                                         value={formData.accountPan}
//                                         onKeyDown={(e) => {
//                                             if (e.key === 'Enter') {
//                                                 handleKeyDown(e, 'pan');
//                                             }
//                                         }}
//                                         readOnly
//                                     />
//                                 </div>
//                             </div>

//                             <hr style={{ border: "1px solid gray" }} />

//                             <div
//                                 className="table-responsive"
//                                 style={{ maxHeight: "400px", overflowY: "auto" }}
//                                 ref={itemsTableRef}
//                             >
//                                 <table className="table table-bordered compact-table" id="itemsTable">
//                                     <thead>
//                                         <tr>
//                                             <th>S.N.</th>
//                                             <th>#</th>
//                                             <th>HSN</th>
//                                             <th>Description of Goods</th>
//                                             <th>Description</th>
//                                             <th>Qty</th>
//                                             <th>Unit</th>
//                                             <th>Rate</th>
//                                             <th>Amount</th>
//                                             <th>Action</th>
//                                         </tr>
//                                     </thead>
//                                     <tbody id="items">
//                                         {formData.items.map((item, index) => (
//                                             <tr key={index} className={`item ${item.vatStatus === 'vatable' ? 'vatable-item' : 'non-vatable-item'}`}>
//                                                 <td>{index + 1}</td>
//                                                 <td>{item.uniqueNumber}</td>
//                                                 <td>
//                                                     <input type="hidden" name={`items[${index}][hscode]`} value={item.hscode} />
//                                                     {item.hscode}
//                                                 </td>
//                                                 <td className="col-3">
//                                                     <input type="hidden" name={`items[${index}][item]`} value={item.item?._id || item.item} />
//                                                     {item.name}
//                                                 </td>
//                                                 <td>
//                                                     <input
//                                                         type="text"
//                                                         name={`items[${index}][description]`}
//                                                         className="form-control form-control-sm"
//                                                         autoComplete='off'
//                                                         value={item.description}
//                                                         id={`description-${index}`}
//                                                         onChange={(e) => updateItemField(index, 'description', e.target.value)}
//                                                         onFocus={(e) => {
//                                                             e.target.select();
//                                                         }}
//                                                         onKeyDown={(e) => {
//                                                             if (e.key === 'Enter') {
//                                                                 e.preventDefault();
//                                                                 document.getElementById(`quantity-${index}`)?.focus();
//                                                             }
//                                                         }}
//                                                     />
//                                                 </td>
//                                                 <td>
//                                                     <input
//                                                         type="number"
//                                                         name={`items[${index}][quantity]`}
//                                                         className="form-control item-quantity"
//                                                         id={`quantity-${index}`}
//                                                         value={item.quantity}
//                                                         onChange={(e) => updateItemField(index, 'quantity', e.target.value)}
//                                                         min="1"
//                                                         step="any"
//                                                         onFocus={(e) => e.target.select()}
//                                                         onKeyDown={(e) => {
//                                                             if (e.key === 'Enter') {
//                                                                 e.preventDefault();
//                                                                 document.getElementById(`price-${index}`)?.focus();
//                                                             }
//                                                         }}
//                                                     />
//                                                 </td>
//                                                 <td>
//                                                     {item.unit?.name}
//                                                     <input type="hidden" name={`items[${index}][unit]`} value={item.unit?._id} />
//                                                 </td>
//                                                 <td>
//                                                     <input
//                                                         type="number"
//                                                         name={`items[${index}][price]`}
//                                                         className="form-control item-price"
//                                                         id={`price-${index}`}
//                                                         value={item.price}
//                                                         onChange={(e) => updateItemField(index, 'price', e.target.value)}
//                                                         step="any"
//                                                         onFocus={(e) => e.target.select()}
//                                                         onKeyDown={(e) => {
//                                                             if (e.key === 'Enter') {
//                                                                 e.preventDefault();
//                                                                 itemSearchRef.current?.focus();
//                                                             }
//                                                         }}
//                                                     />
//                                                 </td>
//                                                 <td className="item-amount">{item.amount}</td>
//                                                 <td>
//                                                     <button
//                                                         type="button"
//                                                         className="btn btn-sm btn-info"
//                                                         onClick={() => fetchLastTransactions(item.item)}
//                                                         title="View last transactions"
//                                                         disabled={isLoadingTransactions}
//                                                     >
//                                                         {isLoadingTransactions ? (
//                                                             <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" style={{ width: "14px", height: "14px" }}></span>
//                                                         ) : (
//                                                             <i className="bi bi-clock-history"></i>
//                                                         )}
//                                                     </button>

//                                                     <button
//                                                         type="button"
//                                                         className="btn btn-sm btn-danger"
//                                                         onClick={() => removeItem(index)}
//                                                     >
//                                                         <i className="bi bi-trash"></i>
//                                                     </button>
//                                                 </td>
//                                                 <input type="hidden" name={`items[${index}][vatStatus]`} value={item.vatStatus} />
//                                             </tr>
//                                         ))}
//                                     </tbody>
//                                 </table>
//                             </div>
//                             <hr style={{ border: "1px solid gray" }} />


//                             <div className="form-group row">
//                                 <div className="col">
//                                     <label htmlFor="itemSearch">Search Item</label>
//                                     <input
//                                         type="text"
//                                         id="itemSearch"
//                                         className="form-control"
//                                         placeholder="Search item (Press F6 to create new item)"
//                                         autoComplete='off'
//                                         onFocus={handleSearchFocus}
//                                         onChange={(e) => {
//                                             handleItemSearch(e);
//                                             setShowItemDropdown(true);
//                                         }}
//                                         ref={itemSearchRef}
//                                         onKeyDown={(e) => {
//                                             if (e.key === 'ArrowDown') {
//                                                 e.preventDefault();
//                                                 const firstItem = document.querySelector('.dropdown-item');
//                                                 if (firstItem) {
//                                                     firstItem.classList.add('active');
//                                                     firstItem.focus();
//                                                 }
//                                             } else if (e.key === 'Enter') {
//                                                 // Always prevent default to stop form submission
//                                                 e.preventDefault();

//                                                 // Handle adding item if one is selected
//                                                 const activeItem = document.querySelector('.dropdown-item.active');
//                                                 if (activeItem) {
//                                                     const index = parseInt(activeItem.getAttribute('data-index'));
//                                                     const filteredItem = filteredItems.length > 0 ? filteredItems[index] : allItems[index];
//                                                     if (filteredItem) {
//                                                         addItemToBill(filteredItem);
//                                                     }
//                                                 }
//                                                 // Move to discount if search is empty AND there are items
//                                                 else if (!e.target.value && formData.items.length > 0) {
//                                                     setShowItemDropdown(false); // Hide dropdown first
//                                                     setTimeout(() => {
//                                                         document.getElementById('discountPercentage')?.focus();
//                                                     }, 0);
//                                                 }
//                                             }
//                                         }}
//                                     />
//                                     {showItemDropdown && (
//                                         <div
//                                             id="dropdownMenu"
//                                             className="dropdown-menu show"
//                                             style={{
//                                                 maxHeight: '280px',
//                                                 height: '280px',
//                                                 overflowY: 'auto',
//                                                 position: 'absolute',
//                                                 width: '100%',
//                                                 zIndex: 1000,
//                                                 border: '1px solid #ddd',
//                                                 borderRadius: '4px'
//                                             }}
//                                             ref={itemDropdownRef}
//                                         >
//                                             <div className="dropdown-header" style={{
//                                                 display: 'grid',
//                                                 gridTemplateColumns: 'repeat(7, 1fr)',
//                                                 alignItems: 'center',
//                                                 padding: '0 10px',
//                                                 height: '40px',
//                                                 background: '#f0f0f0',
//                                                 fontWeight: 'bold',
//                                                 borderBottom: '1px solid #dee2e6'
//                                             }}>
//                                                 <div><strong>#</strong></div>
//                                                 <div><strong>HSN</strong></div>
//                                                 <div><strong>Description</strong></div>
//                                                 <div><strong>Category</strong></div>
//                                                 <div><strong>Qty</strong></div>
//                                                 <div><strong>Unit</strong></div>
//                                                 <div><strong>Rate</strong></div>
//                                             </div>

//                                             {filteredItems.length > 0 ? (
//                                                 filteredItems
//                                                     .sort((a, b) => a.name.localeCompare(b.name))
//                                                     .map((item, index) => (
//                                                         <div
//                                                             key={index}
//                                                             data-index={index}
//                                                             className={`dropdown-item ${item.vatStatus === 'vatable' ? 'vatable' : 'vatExempt'} expiry-${calculateExpiryStatus(item)}`}
//                                                             style={{
//                                                                 height: '40px',
//                                                                 display: 'grid',
//                                                                 gridTemplateColumns: 'repeat(7, 1fr)',
//                                                                 alignItems: 'center',
//                                                                 padding: '0 10px',
//                                                                 borderBottom: '1px solid #eee',
//                                                                 cursor: 'pointer'
//                                                             }}
//                                                             onClick={() => addItemToBill(item)}
//                                                             tabIndex={0}
//                                                             onKeyDown={(e) => {
//                                                                 if (e.key === 'Enter') {
//                                                                     e.preventDefault();
//                                                                     addItemToBill(item);
//                                                                 } else if (e.key === 'ArrowDown') {
//                                                                     e.preventDefault();
//                                                                     const nextItem = e.target.nextElementSibling;
//                                                                     if (nextItem) {
//                                                                         e.target.classList.remove('active');
//                                                                         nextItem.classList.add('active');
//                                                                         nextItem.focus();
//                                                                     }
//                                                                 } else if (e.key === 'ArrowUp') {
//                                                                     e.preventDefault();
//                                                                     const prevItem = e.target.previousElementSibling;
//                                                                     if (prevItem) {
//                                                                         e.target.classList.remove('active');
//                                                                         prevItem.classList.add('active');
//                                                                         prevItem.focus();
//                                                                     } else {
//                                                                         itemSearchRef.current.focus();
//                                                                     }
//                                                                 }
//                                                             }}
//                                                             onFocus={(e) => {
//                                                                 document.querySelectorAll('.dropdown-item').forEach(item => {
//                                                                     item.classList.remove('active');
//                                                                 });
//                                                                 e.target.classList.add('active');
//                                                             }}
//                                                         >
//                                                             <div>{item.uniqueNumber || 'N/A'}</div>
//                                                             <div>{item.hscode || 'N/A'}</div>
//                                                             <div className="dropdown-items-name">{item.name}</div>
//                                                             <div>{item.category?.name || 'No Category'}</div>
//                                                             <div>{item.stock || 0}</div>
//                                                             <div>{item.unit?.name || ''}</div>
//                                                             <div>Rs.{item.latestPuPrice || 0}</div>
//                                                         </div>
//                                                     ))
//                                             ) : itemSearchRef.current?.value ? (
//                                                 <div className="text-center py-3 text-muted">
//                                                     No items found matching "{itemSearchRef.current.value}"
//                                                 </div>
//                                             ) : allItems.length > 0 ? (
//                                                 allItems
//                                                     // Filter items based on VAT selection
//                                                     .filter(item => {
//                                                         if (formData.isVatExempt === 'all') return true;
//                                                         if (formData.isVatExempt === 'false') return item.vatStatus === 'vatable';
//                                                         if (formData.isVatExempt === 'true') return item.vatStatus === 'vatExempt';
//                                                         return true;
//                                                     })
//                                                     .sort((a, b) => a.name.localeCompare(b.name))
//                                                     .map((item, index) => (
//                                                         <div
//                                                             key={index}
//                                                             data-index={index}
//                                                             className={`dropdown-item ${item.vatStatus === 'vatable' ? 'vatable' : 'vatExempt'}`}
//                                                             style={{
//                                                                 height: '40px',
//                                                                 display: 'grid',
//                                                                 gridTemplateColumns: 'repeat(7, 1fr)',
//                                                                 alignItems: 'center',
//                                                                 padding: '0 10px',
//                                                                 borderBottom: '1px solid #eee',
//                                                                 cursor: 'pointer'
//                                                             }}
//                                                             onClick={() => addItemToBill(item)}
//                                                             tabIndex={0}
//                                                             onKeyDown={(e) => {
//                                                                 if (e.key === 'Enter') {
//                                                                     e.preventDefault();
//                                                                     addItemToBill(item);
//                                                                 } else if (e.key === 'ArrowDown') {
//                                                                     e.preventDefault();
//                                                                     const nextItem = e.target.nextElementSibling;
//                                                                     if (nextItem) {
//                                                                         e.target.classList.remove('active');
//                                                                         nextItem.classList.add('active');
//                                                                         nextItem.focus();
//                                                                     }
//                                                                 } else if (e.key === 'ArrowUp') {
//                                                                     e.preventDefault();
//                                                                     const prevItem = e.target.previousElementSibling;
//                                                                     if (prevItem) {
//                                                                         e.target.classList.remove('active');
//                                                                         prevItem.classList.add('active');
//                                                                         prevItem.focus();
//                                                                     } else {
//                                                                         itemSearchRef.current.focus();
//                                                                     }
//                                                                 }
//                                                             }}
//                                                             onFocus={(e) => {
//                                                                 document.querySelectorAll('.dropdown-item').forEach(item => {
//                                                                     item.classList.remove('active');
//                                                                 });
//                                                                 e.target.classList.add('active');
//                                                             }}
//                                                         >
//                                                             <div>{item.uniqueNumber || 'N/A'}</div>
//                                                             <div>{item.hscode || 'N/A'}</div>
//                                                             <div className="dropdown-items-name">{item.name}</div>
//                                                             <div>{item.category?.name || 'No Category'}</div>
//                                                             <div>{item.stock || 0}</div>
//                                                             <div>{item.unit?.name || ''}</div>
//                                                             <div>Rs.{item.latestPuPrice || 0}</div>
//                                                         </div>
//                                                     ))
//                                             ) : (
//                                                 <div className="text-center py-3 text-muted">
//                                                     No items available
//                                                 </div>
//                                             )}
//                                         </div>
//                                     )}
//                                 </div>
//                             </div>
//                             <hr style={{ border: "1px solid gray" }} />

//                             <div className="table-responsive">
//                                 <table className="table table-bordered">
//                                     <thead>
//                                         <tr>
//                                             <th colSpan="6" className="text-center bg-light">Bill Details</th>
//                                         </tr>
//                                     </thead>
//                                     <tbody>
//                                         <tr>
//                                             <td><label htmlFor="subTotal">Sub Total:</label></td>
//                                             <td className="text-right">
//                                                 <p className="form-control-plaintext">Rs. <span id="subTotal">{totals.subTotal.toFixed(2)}</span></p>
//                                             </td>

//                                             <td><label htmlFor="discountPercentage">Discount %:</label></td>
//                                             <td>
//                                                 <input
//                                                     type="number"
//                                                     step="any"
//                                                     name="discountPercentage"
//                                                     id="discountPercentage"
//                                                     className="form-control"
//                                                     value={formData.discountPercentage}
//                                                     onChange={handleDiscountPercentageChange}
//                                                     onFocus={(e) => e.target.select()}
//                                                     onKeyDown={(e) => {
//                                                         if (e.key === 'Enter') {
//                                                             handleKeyDown(e, 'discountPercentage');
//                                                         }
//                                                     }}
//                                                 />
//                                             </td>
//                                             <td><label htmlFor="discountAmount">Discount (Rs.):</label></td>
//                                             <td>
//                                                 <input
//                                                     type="number"
//                                                     step="any"
//                                                     name="discountAmount"
//                                                     id="discountAmount"
//                                                     value={Math.round(formData.discountAmount * 100) / 100}
//                                                     className="form-control"
//                                                     onChange={handleDiscountAmountChange}
//                                                     onFocus={(e) => e.target.select()}
//                                                     onKeyDown={(e) => {
//                                                         if (e.key === 'Enter') {
//                                                             handleKeyDown(e, 'discountAmount');
//                                                         }
//                                                     }}
//                                                 />
//                                             </td>
//                                         </tr>

//                                         {company.vatEnabled && formData.isVatExempt !== 'true' && (
//                                             <>
//                                                 <tr id="taxableAmountRow">
//                                                     <td><label htmlFor="taxableAmount">Taxable Amount:</label></td>
//                                                     <td className="text-right">
//                                                         <p className="form-control-plaintext">Rs. <span id="taxableAmount">{totals.taxableAmount.toFixed(2)}</span></p>
//                                                     </td>

//                                                     <td><label htmlFor="vatPercentage">VAT %:</label></td>
//                                                     <td>
//                                                         <input
//                                                             type="number"
//                                                             name="vatPercentage"
//                                                             id="vatPercentage"
//                                                             className="form-control"
//                                                             value="13.00"
//                                                             onKeyDown={(e) => {
//                                                                 if (e.key === 'Enter') {
//                                                                     handleKeyDown(e, 'vatPercentage');
//                                                                 }
//                                                             }}
//                                                             readOnly
//                                                         />
//                                                     </td>
//                                                     <td><label htmlFor="vatAmount">VAT Amount:</label></td>
//                                                     <td className="text-right">
//                                                         <p className="form-control-plaintext">Rs. <span id="vatAmount">{totals.vatAmount.toFixed(2)}</span></p>
//                                                     </td>
//                                                 </tr>
//                                             </>
//                                         )}
//                                         {/* Add empty cells to maintain table structure when exempt */}
//                                         {company.vatEnabled && formData.isVatExempt === 'true' && (
//                                             <>
//                                                 <td colSpan="4"></td>
//                                             </>
//                                         )}

//                                         <tr>
//                                             <td><label htmlFor="roundOffAmount">Round Off:</label></td>
//                                             <td>
//                                                 <input
//                                                     type="number"
//                                                     className="form-control"
//                                                     step="any"
//                                                     id="roundOffAmount"
//                                                     name="roundOffAmount"
//                                                     value={formData.roundOffAmount}
//                                                     onChange={(e) => setFormData({ ...formData, roundOffAmount: e.target.value })}
//                                                     onFocus={(e) => e.target.select()}
//                                                     onKeyDown={(e) => {
//                                                         if (e.key === 'Enter') {
//                                                             e.preventDefault();
//                                                             document.getElementById('saveBill')?.focus();
//                                                         }
//                                                     }}
//                                                 />
//                                             </td>

//                                             <td><label htmlFor="totalAmount">Total Amount:</label></td>
//                                             <td>
//                                                 <p className="form-control-plaintext">Rs. <span id="totalAmount">{totals.totalAmount.toFixed(2)}</span></p>
//                                             </td>
//                                             <td><label htmlFor="amountInWords">In Words:</label></td>
//                                             <td className="text-right">
//                                                 <p className="form-control-plaintext" id="amountInWords">
//                                                     {convertToRupeesAndPaisa(totals.totalAmount)} Only.
//                                                 </p>
//                                             </td>
//                                         </tr>
//                                     </tbody>
//                                 </table>
//                             </div>

//                             {/* Action Buttons */}
//                             <div className="d-flex justify-content-end mt-4">
//                                 {/* Add Print After Save Checkbox */}
//                                 <div className="form-check me-3 align-self-center">
//                                     <input
//                                         className="form-check-input"
//                                         type="checkbox"
//                                         id="printAfterSave"
//                                         checked={printAfterSave}
//                                         onChange={handlePrintAfterSaveChange}
//                                     />
//                                     <label className="form-check-label" htmlFor="printAfterSave">
//                                         Print after save
//                                     </label>
//                                 </div>

//                                 <div className="d-flex justify-content-end gap-2">
//                                     <Button variant="secondary" className="me-2" onClick={handleBack}>
//                                         <BiArrowBack /> Back
//                                     </Button>
//                                     <button
//                                         type="submit"
//                                         className="btn btn-primary btn-sm"
//                                         id="saveBill"
//                                         onClick={(e) => handleSubmit(e, printAfterSave)}
//                                         disabled={isSaving}
//                                     >
//                                         {isSaving ? (
//                                             <>
//                                                 <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
//                                                 Saving...
//                                             </>
//                                         ) : (
//                                             <>
//                                                 <i className="bi bi-save me-1"></i> Update
//                                             </>
//                                         )}
//                                     </button>
//                                 </div>
//                             </div>
//                         </form>
//                     </div>
//                 </div>
//             </div>
//             {/* Account Modal */}
//             {showAccountModal && (
//                 <div className="modal fade show" id="accountModal" tabIndex="-1" style={{ display: 'block' }}>
//                     <div className="modal-dialog modal-xl modal-dialog-centered">
//                         <div className="modal-content" style={{ height: '500px' }}>
//                             <div className="modal-header">
//                                 <h5 className="modal-title" id="accountModalLabel">Select an Account</h5>
//                                 <small className="ms-auto text-muted">Press F6 to create new account</small>
//                                 <button type="button" className="btn-close" onClick={() => setShowAccountModal(false)}></button>
//                             </div>
//                             <div className="p-3 bg-white sticky-top">
//                                 <input
//                                     type="text"
//                                     id="searchAccount"
//                                     className="form-control form-control-sm"
//                                     placeholder="Search Account"
//                                     autoFocus
//                                     autoComplete='off'
//                                     onChange={handleAccountSearch}
//                                     onKeyDown={(e) => {
//                                         // Handle arrow keys and Enter in search input
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
//                                                 const account = filteredAccounts.length > 0
//                                                     ? filteredAccounts.find(a => a._id === accountId)
//                                                     : accounts.find(a => a._id === accountId);
//                                                 if (account) {
//                                                     selectAccount(account);
//                                                     document.getElementById('address').focus();
//                                                 }
//                                             }
//                                         }
//                                     }}
//                                     ref={accountSearchRef}
//                                 />
//                             </div>
//                             <div className="modal-body p-0">
//                                 <div className="overflow-auto" style={{ height: 'calc(400px - 120px)' }}>
//                                     <ul id="accountList" className="list-group">
//                                         {filteredAccounts.length > 0 ? (
//                                             filteredAccounts
//                                                 .sort((a, b) => a.name.localeCompare(b.name))
//                                                 .map((account, index) => (
//                                                     <li
//                                                         key={account._id}
//                                                         data-account-id={account._id}
//                                                         className={`list-group-item account-item py-2 ${index === 0 ? 'active' : ''}`}
//                                                         onClick={() => {
//                                                             selectAccount(account);
//                                                             document.getElementById('address').focus();
//                                                         }}
//                                                         style={{ cursor: 'pointer' }}
//                                                         tabIndex={0}
//                                                         onKeyDown={(e) => {
//                                                             // Handle keyboard navigation
//                                                             if (e.key === 'ArrowDown') {
//                                                                 e.preventDefault();
//                                                                 const nextItem = e.target.nextElementSibling;
//                                                                 if (nextItem) {
//                                                                     e.target.classList.remove('active');
//                                                                     nextItem.classList.add('active');
//                                                                     nextItem.focus();
//                                                                 }
//                                                             } else if (e.key === 'ArrowUp') {
//                                                                 e.preventDefault();
//                                                                 const prevItem = e.target.previousElementSibling;
//                                                                 if (prevItem) {
//                                                                     e.target.classList.remove('active');
//                                                                     prevItem.classList.add('active');
//                                                                     prevItem.focus();
//                                                                 } else {
//                                                                     // If at top, go back to search input
//                                                                     accountSearchRef.current.focus();
//                                                                 }
//                                                             } else if (e.key === 'Enter') {
//                                                                 e.preventDefault();
//                                                                 selectAccount(account);
//                                                                 document.getElementById('address').focus();
//                                                             }
//                                                         }}
//                                                         onFocus={(e) => {
//                                                             // Remove active class from all items and add to focused one
//                                                             document.querySelectorAll('.account-item').forEach(item => {
//                                                                 item.classList.remove('active');
//                                                             });
//                                                             e.target.classList.add('active');
//                                                         }}
//                                                     >
//                                                         <div className="d-flex justify-content-between small">
//                                                             <strong>{account.uniqueNumber || 'N/A'} {account.name}</strong>
//                                                             <span>📍 {account.address || 'N/A'} | 🆔 PAN: {account.pan || 'N/A'}</span>
//                                                         </div>
//                                                     </li>
//                                                 ))
//                                         ) : (
//                                             // If search is active and no result found
//                                             accountSearchRef.current?.value ? (
//                                                 <li className="list-group-item text-center text-muted small py-2">No accounts found</li>
//                                             ) : (
//                                                 accounts
//                                                     .sort((a, b) => a.name.localeCompare(b.name))
//                                                     .map((account, index) => (
//                                                         <li
//                                                             key={account._id}
//                                                             data-account-id={account._id}
//                                                             className={`list-group-item account-item py-2 ${index === 0 ? 'active' : ''}`}
//                                                             onClick={() => {
//                                                                 selectAccount(account);
//                                                                 document.getElementById('address').focus();
//                                                             }}
//                                                             style={{ cursor: 'pointer' }}
//                                                             tabIndex={0}
//                                                             onKeyDown={(e) => {
//                                                                 // Handle keyboard navigation
//                                                                 if (e.key === 'ArrowDown') {
//                                                                     e.preventDefault();
//                                                                     const nextItem = e.target.nextElementSibling;
//                                                                     if (nextItem) {
//                                                                         e.target.classList.remove('active');
//                                                                         nextItem.classList.add('active');
//                                                                         nextItem.focus();
//                                                                     }
//                                                                 } else if (e.key === 'ArrowUp') {
//                                                                     e.preventDefault();
//                                                                     const prevItem = e.target.previousElementSibling;
//                                                                     if (prevItem) {
//                                                                         e.target.classList.remove('active');
//                                                                         prevItem.classList.add('active');
//                                                                         prevItem.focus();
//                                                                     } else {
//                                                                         // If at top, go back to search input
//                                                                         accountSearchRef.current.focus();
//                                                                     }
//                                                                 } else if (e.key === 'Enter') {
//                                                                     e.preventDefault();
//                                                                     selectAccount(account);
//                                                                     document.getElementById('address').focus();
//                                                                 }
//                                                             }}
//                                                             onFocus={(e) => {
//                                                                 // Remove active class from all items and add to focused one
//                                                                 document.querySelectorAll('.account-item').forEach(item => {
//                                                                     item.classList.remove('active');
//                                                                 });
//                                                                 e.target.classList.add('active');
//                                                             }}
//                                                         >
//                                                             <div className="d-flex justify-content-between small">
//                                                                 <strong>{account.uniqueNumber || 'N/A'} {account.name}</strong>
//                                                                 <span>📍 {account.address || 'N/A'} | 🆔 PAN: {account.pan || 'N/A'}</span>
//                                                             </div>
//                                                         </li>
//                                                     ))
//                                             )
//                                         )}
//                                     </ul>
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
//                             <div className="modal-header">
//                                 <h5 className="modal-title" id="transactionModalLabel">Last Transactions</h5>
//                                 <button
//                                     type="button"
//                                     className="close"
//                                     onClick={handleTransactionModalClose}
//                                     aria-label="Close"
//                                 >
//                                     <span aria-hidden="true">&times;</span>
//                                 </button>
//                             </div>
//                             <div className="modal-body p-0">
//                                 <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
//                                     <table className="table table-sm table-hover mb-0">
//                                         <thead>
//                                             <tr className="sticky-top bg-light" style={{ top: 0 }}>
//                                                 <th style={{ width: '5%' }}>S.N.</th>
//                                                 <th style={{ width: '15%' }}>Date</th>
//                                                 <th style={{ width: '15%' }}>Inv. No.</th>
//                                                 <th style={{ width: '10%' }}>Type</th>
//                                                 <th style={{ width: '10%' }}>A/c Type</th>
//                                                 <th style={{ width: '10%' }}>Pay.Mode</th>
//                                                 <th style={{ width: '10%' }}>Qty.</th>
//                                                 <th style={{ width: '10%' }}>Unit</th>
//                                                 <th style={{ width: '15%' }}>Rate</th>
//                                             </tr>
//                                         </thead>
//                                         <tbody>
//                                             {transactions.length > 0 ? (
//                                                 transactions.map((transaction, index) => (
//                                                     <tr
//                                                         key={index}
//                                                         style={{ cursor: 'pointer' }}
//                                                         onClick={() => {
//                                                             if (transaction.billId && transaction.billId._id) {
//                                                                 navigate(`/retailer/sales/${transaction.billId._id}/print`);
//                                                             } else if (transaction.purchaseBillId && transaction.purchaseBillId._id) {
//                                                                 navigate(`/bills/${transaction.purchaseBillId._id}/print`);
//                                                             }
//                                                         }}
//                                                         onKeyDown={(e) => {
//                                                             if (e.key === 'Enter') {
//                                                                 e.preventDefault();
//                                                                 if (transaction.billId && transaction.billId._id) {
//                                                                     navigate(`/bills/${transaction.billId._id}/print`);
//                                                                 } else if (transaction.purchaseBillId && transaction.purchaseBillId._id) {
//                                                                     navigate(`/bills/${transaction.purchaseBillId._id}/print`);
//                                                                 }
//                                                             } else if (e.key === 'Tab') {
//                                                                 e.preventDefault();
//                                                                 continueButtonRef.current?.focus();
//                                                             }
//                                                         }}
//                                                         tabIndex={0}
//                                                     >
//                                                         <td>{index + 1}</td>
//                                                         <td>
//                                                             {transaction.date ?
//                                                                 new Date(transaction.date).toLocaleDateString() :
//                                                                 'N/A'
//                                                             }
//                                                         </td>
//                                                         <td>{transaction.billNumber || 'N/A'}</td>
//                                                         <td>{transaction.type || 'N/A'}</td>
//                                                         <td>{transaction.purchaseSalesType || 'N/A'}</td>
//                                                         <td>{transaction.paymentMode || 'N/A'}</td>
//                                                         <td>{transaction.quantity || 0}</td>
//                                                         <td>{transaction.unit?.name || 'N/A'}</td>
//                                                         <td>Rs.{transaction.price ? Math.round(transaction.price * 100) / 100 : 0}</td>
//                                                     </tr>
//                                                 ))
//                                             ) : (
//                                                 <tr>
//                                                     <td colSpan="9" className="text-center text-muted py-3">
//                                                         No previous transactions found
//                                                     </td>
//                                                 </tr>
//                                             )}
//                                         </tbody>
//                                     </table>
//                                 </div>

//                                 {/* Show row count information */}
//                                 {transactions.length > 5 && (
//                                     <div className="text-center small text-muted mt-2">
//                                         Showing {transactions.length} transactions. Scroll to see more.
//                                     </div>
//                                 )}
//                             </div>
//                             <div className="modal-footer">
//                                 <button
//                                     ref={continueButtonRef}
//                                     type="button"
//                                     className="btn btn-primary"
//                                     onClick={handleTransactionModalClose}
//                                     onKeyDown={(e) => {
//                                         if (e.key === 'Enter') {
//                                             e.preventDefault();
//                                             handleTransactionModalClose();
//                                         } else if (e.key === 'Tab' && !e.shiftKey) {
//                                             e.preventDefault();
//                                             // Loop back to first transaction row
//                                             const firstTransactionRow = document.querySelector('tbody tr');
//                                             if (firstTransactionRow) {
//                                                 firstTransactionRow.focus();
//                                             }
//                                         }
//                                     }}
//                                 >
//                                     Continue
//                                 </button>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             )}

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
//         </div>
//     );
// };
// // Helper function to convert amount to words
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
// export default EditSalesQuotation;

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import NepaliDate from 'nepali-date-converter';
import Header from '../Header';
import NotificationToast from '../../NotificationToast';
import { calculateExpiryStatus } from '../dashboard/modals/ExpiryStatus';
import '../../../stylesheet/noDateIcon.css'
import ProductModal from '../dashboard/modals/ProductModal';
import AccountBalanceDisplay from '../payment/AccountBalanceDisplay';
import useDebounce from '../../../hooks/useDebounce';
import VirtualizedItemList from '../../VirtualizedItemList';
import VirtualizedAccountList from '../../VirtualizedAccountList';
import { Button } from 'react-bootstrap';
import { BiArrowBack } from 'react-icons/bi';

const EditSalesQuotation = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // Search states
    const [searchQuery, setSearchQuery] = useState('');
    const [lastSearchQuery, setLastSearchQuery] = useState('');
    const [shouldShowLastSearchResults, setShouldShowLastSearchResults] = useState(false);
    const debouncedSearchQuery = useDebounce(searchQuery, 50);
    const [showProductModal, setShowProductModal] = useState(false);
    // Account search states
    const [isAccountSearching, setIsAccountSearching] = useState(false);
    const [accountSearchResults, setAccountSearchResults] = useState([]);
    const [accountSearchPage, setAccountSearchPage] = useState(1);
    const [hasMoreAccountResults, setHasMoreAccountResults] = useState(false);
    const [totalAccounts, setTotalAccounts] = useState(0);
    const [accountSearchQuery, setAccountSearchQuery] = useState('');
    const [accountLastSearchQuery, setAccountLastSearchQuery] = useState('');
    const [accountShouldShowLastSearchResults, setAccountShouldShowLastSearchResults] = useState(false);

    // Header modal search states
    const [showHeaderItemModal, setShowHeaderItemModal] = useState(false);
    const [headerLastSearchQuery, setHeaderLastSearchQuery] = useState('');
    const [headerShouldShowLastSearchResults, setHeaderShouldShowLastSearchResults] = useState(false);
    const [isHeaderSearching, setIsHeaderSearching] = useState(false);
    const [headerSearchResults, setHeaderSearchResults] = useState([]);
    const [headerSearchPage, setHeaderSearchPage] = useState(1);
    const [hasMoreHeaderSearchResults, setHasMoreHeaderSearchResults] = useState(false);
    const [totalHeaderSearchItems, setTotalHeaderSearchItems] = useState(0);
    const [headerSearchQuery, setHeaderSearchQuery] = useState('');
    const [showHeaderItemDropdown, setShowHeaderItemDropdown] = useState(false);

    // Item selection for header modal
    const [selectedItemForInsert, setSelectedItemForInsert] = useState(null);
    const [selectedItemQuantity, setSelectedItemQuantity] = useState(0);
    const [selectedItemRate, setSelectedItemRate] = useState(0);
    const [selectedItemDescription, setSelectedItemDescription] = useState('');

    // Main item search states
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [searchPage, setSearchPage] = useState(1);
    const [hasMoreSearchResults, setHasMoreSearchResults] = useState(false);
    const [totalSearchItems, setTotalSearchItems] = useState(0);

    // Transaction settings
    const [transactionSettings, setTransactionSettings] = useState({
        displayTransactions: false,
        displayTransactionsForPurchase: false,
        displayTransactionsForSalesReturn: false,
        displayTransactionsForPurchaseReturn: false
    });

    // Refs
    const transactionDateRef = useRef(null);
    const itemsTableRef = useRef(null);
    const continueButtonRef = useRef(null);
    const itemSearchRef = useRef(null);
    const accountSearchRef = useRef(null);
    const itemDropdownRef = useRef(null);
    const accountModalRef = useRef(null);
    const transactionModalRef = useRef(null);

    // State variables
    const [printAfterSave, setPrintAfterSave] = useState(
        localStorage.getItem('printAfterSave') === 'true' || false
    );
    const [transactionCache, setTransactionCache] = useState(new Map());
    const [loadingItems, setLoadingItems] = useState(new Set());
    const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
    const [transactions, setTransactions] = useState([]);
    const [showAccountCreationModal, setShowAccountCreationModal] = useState(false);
    const [showItemsModal, setShowItemsModal] = useState(false);
    const [pollInterval, setPollInterval] = useState(null);
    const [showTransactionModal, setShowTransactionModal] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isInitialDataLoaded, setIsInitialDataLoaded] = useState(false);

    // Notification and errors
    const [notification, setNotification] = useState({
        show: false,
        message: '',
        type: 'success'
    });
    const [dateErrors, setDateErrors] = useState({
        transactionDateNepali: '',
        nepaliDate: ''
    });

    // Form data
    const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
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
        description: '',
        items: []
    });

    // Data states
    const [items, setItems] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [filteredAccounts, setFilteredAccounts] = useState([]);
    const [showAccountModal, setShowAccountModal] = useState(false);
    const [showItemDropdown, setShowItemDropdown] = useState(false);

    // Company settings
    const [company, setCompany] = useState({
        dateFormat: 'english',
        vatEnabled: true,
        fiscalYear: {}
    });

    const api = axios.create({
        baseURL: process.env.REACT_APP_API_BASE_URL,
        withCredentials: true,
    });

    // Fetch functions
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
                    // limit: searchTerm.trim() ? 15 : 25,
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

    // Effects
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
        // Add F9 key handler here
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
        const fetchSalesQuotationData = async () => {
            try {
                const response = await api.get(`/api/retailer/sales-quotation/edit/${id}`);
                const { data } = response;

                setCompany(data.data.company);

                const salesQuotation = data.data.salesQuotation;
                const dateFormat = data.data.company.dateFormat;

                setFormData({
                    accountId: salesQuotation.account._id,
                    accountName: salesQuotation.account.name,
                    accountAddress: salesQuotation.account.address,
                    accountPan: salesQuotation.account.pan,
                    transactionDateNepali: dateFormat === 'nepali' ?
                        new NepaliDate(salesQuotation.transactionDate).format('YYYY-MM-DD') : '',
                    transactionDateRoman: dateFormat !== 'nepali' ?
                        new Date(salesQuotation.transactionDate).toISOString().split('T')[0] : '',
                    nepaliDate: dateFormat === 'nepali' ?
                        new NepaliDate(salesQuotation.date).format('YYYY-MM-DD') : '',
                    billDate: dateFormat !== 'nepali' ?
                        new Date(salesQuotation.date).toISOString().split('T')[0] : '',
                    billNumber: salesQuotation.billNumber,
                    paymentMode: salesQuotation.paymentMode,
                    isVatExempt: salesQuotation.isVatExempt ? 'true' :
                        (salesQuotation.isVatAll === 'true' ? 'all' : 'false'),
                    discountPercentage: salesQuotation.discountPercentage,
                    discountAmount: salesQuotation.discountAmount,
                    roundOffAmount: salesQuotation.roundOffAmount,
                    vatPercentage: salesQuotation.vatPercentage,
                    description: salesQuotation.description || '',
                    items: salesQuotation.items
                });

                const convertedItems = salesQuotation.items.map(item => ({
                    item: item.item?._id || item.item,
                    uniqueNumber: item.uniqueNumber || item.item?.uniqueNumber || 'N/A',
                    hscode: item.hscode || item.item?.hscode,
                    name: item.name || item.item?.name,
                    category: item.category?.name || item.item?.category?.name || 'No Category',
                    quantity: item.quantity,
                    unit: item.unit || item.item?.unit,
                    price: item.price,
                    puPrice: item.puPrice || 0,
                    netPuPrice: item.netPuPrice || 0,
                    amount: (item.quantity * item.price).toFixed(2),
                    vatStatus: item.vatStatus || item.item?.vatStatus || 'vatable',
                    uniqueUuId: item.uniqueUuId,
                    description: item.description || ''
                }));

                setItems(convertedItems);
                setIsInitialDataLoaded(true);
                setIsLoading(false);
            } catch (error) {
                console.error('Error fetching sales quotation data:', error);
                setNotification({
                    show: true,
                    message: 'Failed to load sales quotation data',
                    type: 'error'
                });
                setIsLoading(false);
            }
        };

        fetchSalesQuotationData();
        fetchAccountsFromBackend('', 1);
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
    }, [items, formData]);

    useEffect(() => {
        return () => {
            setLastSearchQuery('');
            setShouldShowLastSearchResults(false);
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
    }, [headerSearchQuery, formData.isVatExempt, showHeaderItemModal, headerShouldShowLastSearchResults, headerLastSearchQuery]);

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
        if (showTransactionModal && continueButtonRef.current) {
            const timer = setTimeout(() => {
                continueButtonRef.current.focus();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [showTransactionModal]);

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
    }, [showTransactionModal, showAccountCreationModal, showAccountModal]);

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

    // Handler functions
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
            accountId: account._id,
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

    // const handleHeaderItemSearch = (e) => {
    //     const query = e.target.value;
    //     setHeaderSearchQuery(query);

    //     if (query.trim() !== '' && headerShouldShowLastSearchResults) {
    //         setHeaderShouldShowLastSearchResults(false);
    //         setHeaderLastSearchQuery('');
    //     }
    // };

    const handleHeaderItemSearch = (e) => {
        const query = e.target.value;
        setHeaderSearchQuery(query);
        setHeaderSearchPage(1); // Reset to page 1 on new search

        if (query.trim() !== '' && headerShouldShowLastSearchResults) {
            setHeaderShouldShowLastSearchResults(false);
            setHeaderLastSearchQuery('');
        }

        // Fetch items with the search term
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

    const addItemToBill = async (item) => {
        if (itemSearchRef.current?.value) {
            setLastSearchQuery(itemSearchRef.current.value);
            setShouldShowLastSearchResults(true);
        }

        const sortedStockEntries = item.stockEntries?.sort((a, b) => new Date(a.date) - new Date(b.date)) || [];
        const firstStockEntry = sortedStockEntries[0] || {};

        const newItem = {
            item: item._id,
            uniqueNumber: item.uniqueNumber || 'N/A',
            hscode: item.hscode,
            name: item.name,
            category: item.category?.name || 'No Category',
            quantity: 0,
            unit: item.unit,
            price: Math.round(firstStockEntry.price * 100) / 100,
            puPrice: firstStockEntry.puPrice || 0,
            netPuPrice: firstStockEntry.netPuPrice || 0,
            amount: 0,
            vatStatus: item.vatStatus,
            uniqueUuId: firstStockEntry.uniqueUuId
        };

        setItems([...items, newItem]);
        setShowItemDropdown(false);

        if (itemSearchRef.current) {
            itemSearchRef.current.value = '';
        }
        setSearchQuery('');

        if (transactionSettings.displayTransactions && formData.accountId) {
            const cacheKey = `${item._id}-${formData.accountId}`;
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

                const response = await api.get(`/api/retailer/transactions/${item._id}/${formData.accountId}/Sales`, {
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

        setTimeout(() => {
            const descriptionInput = document.getElementById(`description-${items.length}`);
            if (descriptionInput) {
                descriptionInput.focus();
                descriptionInput.select();
            }
        }, 100);
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
        if (items.length <= 1) {
            setNotification({
                show: true,
                message: 'You cannot remove the last item. A quotation must have at least one item.',
                type: 'error'
            });
            return;
        }

        const updatedItems = items.filter((_, i) => i !== index);
        setItems(updatedItems);
    };

    const calculateTotal = (itemsToCalculate = items) => {
        let subTotal = 0;
        let taxableAmount = 0;
        let nonTaxableAmount = 0;

        itemsToCalculate.forEach(item => {
            subTotal += parseFloat(item.amount) || 0;

            if (item.vatStatus === 'vatable') {
                taxableAmount += parseFloat(item.amount) || 0;
            } else {
                nonTaxableAmount += parseFloat(item.amount) || 0;
            }
        });

        const discountPercentage = parseFloat(formData.discountPercentage) || 0;
        const discountAmount = parseFloat(formData.discountAmount) || 0;

        const discountForTaxable = (taxableAmount * discountPercentage) / 100;
        const discountForNonTaxable = (nonTaxableAmount * discountPercentage) / 100;

        const finalTaxableAmount = taxableAmount - discountForTaxable;
        const finalNonTaxableAmount = nonTaxableAmount - discountForNonTaxable;

        let vatAmount = 0;
        if (formData.isVatExempt === 'false' || formData.isVatExempt === 'all') {
            vatAmount = (finalTaxableAmount * formData.vatPercentage) / 100;
        }

        const roundOffAmount = parseFloat(formData.roundOffAmount) || 0;
        const totalAmount = finalTaxableAmount + finalNonTaxableAmount + vatAmount + roundOffAmount;

        return {
            subTotal,
            taxableAmount: finalTaxableAmount,
            nonTaxableAmount: finalNonTaxableAmount,
            vatAmount,
            totalAmount
        };
    };

    const handleDiscountPercentageChange = (e) => {
        const value = parseFloat(e.target.value) || 0;
        const subTotal = calculateTotal().subTotal;
        const discountAmount = (subTotal * value) / 100;

        setFormData(prev => ({
            ...prev,
            discountPercentage: value,
            discountAmount: discountAmount.toFixed(2)
        }));
    };

    const handleDiscountAmountChange = (e) => {
        const value = parseFloat(e.target.value) || 0;
        const subTotal = calculateTotal().subTotal;
        const discountPercentage = subTotal > 0 ? (value / subTotal) * 100 : 0;

        setFormData(prev => ({
            ...prev,
            discountAmount: value,
            discountPercentage: discountPercentage.toFixed(2)
        }));
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

    // const handleSubmit = async (e, print = false) => {
    //     e.preventDefault();
    //     setIsSaving(true);

    //     try {
    //         const quotationData = {
    //             ...formData,
    //             items: items.map(item => ({
    //                 item: item.item,
    //                 quantity: item.quantity,
    //                 unit: item.unit?._id,
    //                 price: item.price,
    //                 puPrice: item.puPrice,
    //                 netPuPrice: item.netPuPrice,
    //                 vatStatus: item.vatStatus,
    //                 uniqueUuId: item.uniqueUuId,
    //                 description: item.description
    //             })),
    //             print
    //         };

    //         const response = await api.put(`/api/retailer/sales-quotation/edit/${id}`, quotationData);

    //         setNotification({
    //             show: true,
    //             message: 'Sales quotation updated successfully!',
    //             type: 'success'
    //         });

    //         if (print && response.data.data?.quotation?._id) {
    //             setIsSaving(false);
    //             await printQuotationImmediately(response.data.data.quotation._id);
    //             setTimeout(() => {
    //                 handleBack();
    //             }, 1000);
    //         } else {
    //             setIsSaving(false);
    //             handleBack();
    //         }

    //     } catch (error) {
    //         console.error('Error updating sales quotation:', error);
    //         setNotification({
    //             show: true,
    //             message: error.response?.data?.error || 'Failed to update sales quotation. Please try again.',
    //             type: 'error'
    //         });
    //         setIsSaving(false);
    //     }
    // };

    // const handleSubmit = async (e, print = false) => {
    //     e.preventDefault();
    //     setIsSaving(true);

    //     try {
    //         const quotationData = {
    //             ...formData,
    //             items: formData.items.map(item => ({
    //                 ...item,
    //                 item: item.item?._id || item.item,
    //                 unit: item.unit?._id || item.unit,
    //                 vatStatus: item.vatStatus
    //             })),
    //             print
    //         };

    //         const response = await api.put(`/api/retailer/sales-quotation/edit/${id}`, quotationData);

    //         setNotification({
    //             show: true,
    //             message: 'Sales quotation updated successfully!',
    //             type: 'success'
    //         });

    //         if (print && response.data.data?.quotation?._id) {
    //             setItems([]);
    //             setIsSaving(false);
    //             await printQuotationImmediately(response.data.data.quotation._id);
    //             setTimeout(() => {
    //                 handleBack();
    //             }, 1000);
    //         } else {
    //             setItems([]);
    //             setIsSaving(false);
    //             handleBack();
    //         }

    //     } catch (error) {
    //         console.error('Error updating sales quotation:', error);
    //         setNotification({
    //             show: true,
    //             message: error.response?.data?.error || 'Failed to update sales quotation. Please try again.',
    //             type: 'error'
    //         });
    //     } finally {
    //         setIsSaving(false);
    //     }
    // };

    // const handleSubmit = async (e, print = false) => {
    //     e.preventDefault();
    //     setIsSaving(true);

    //     try {
    //         const quotationData = {
    //             ...formData,
    //             items: formData.items.map(item => ({
    //                 ...item,
    //                 item: item.item?._id || item.item,
    //                 unit: item.unit?._id || item.unit,
    //                 vatStatus: item.vatStatus
    //             })),
    //             print // Pass the print flag to backend
    //         };

    //         const response = await api.put(`/api/retailer/sales-quotation/edit/${id}`, quotationData);

    //         setNotification({
    //             show: true,
    //             message: 'Sales quotation updated successfully!',
    //             type: 'success'
    //         });

    //         if (print && response.data.data?.quotation?._id) {
    //             setIsSaving(false);
    //             // Print immediately after saving
    //             await printQuotationImmediately(response.data.data.quotation._id);
    //             // Navigate back after printing
    //             setTimeout(() => {
    //                 handleBack();
    //             }, 1000);
    //         } else {
    //             setIsSaving(false);
    //             handleBack();
    //         }

    //     } catch (error) {
    //         console.error('Error updating sales quotation:', error);
    //         setNotification({
    //             show: true,
    //             message: error.response?.data?.error || 'Failed to update sales quotation. Please try again.',
    //             type: 'error'
    //         });
    //         setIsSaving(false);
    //     }
    // };

    const formatter = new Intl.NumberFormat('en-NP', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });


    const handleSubmit = async (e, print = false) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            // Prepare items for submission
            const formattedItems = items.map(item => ({
                item: item.item, // This should be the item ID
                quantity: parseFloat(item.quantity) || 0,
                unit: item.unit?._id || item.unit,
                price: parseFloat(item.price) || 0,
                puPrice: parseFloat(item.puPrice) || 0,
                netPuPrice: parseFloat(item.netPuPrice) || 0,
                vatStatus: item.vatStatus,
                uniqueUuId: item.uniqueUuId,
                description: item.description || '',
                hscode: item.hscode || '',
                uniqueNumber: item.uniqueNumber || '',
                name: item.name || ''
            }));

            const quotationData = {
                ...formData,
                items: formattedItems,
                print // Pass the print flag to backend
            };

            const response = await api.put(`/api/retailer/sales-quotation/edit/${id}`, quotationData);

            setNotification({
                show: true,
                message: 'Sales quotation updated successfully!',
                type: 'success'
            });

            if (print && response.data.data?.quotation?._id) {
                setIsSaving(false);
                // Print immediately after saving
                await printQuotationImmediately(response.data.data.quotation._id);
                // Navigate back after printing
                setTimeout(() => {
                    handleBack();
                }, 1000);
            } else {
                setIsSaving(false);
                handleBack();
            }

        } catch (error) {
            console.error('Error updating sales quotation:', error);
            setNotification({
                show: true,
                message: error.response?.data?.error || 'Failed to update sales quotation. Please try again.',
                type: 'error'
            });
            setIsSaving(false);
        }
    };

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

    const handleTransactionModalClose = () => {
        setShowTransactionModal(false);
        setTimeout(() => {
            if (selectedItemForInsert) {
                const descriptionInput = document.getElementById('headerItemDescription');
                if (descriptionInput) {
                    descriptionInput.focus();
                    descriptionInput.select();
                }
            }
        }, 100);
    };

    const handleAccountCreationModalClose = () => {
        setShowAccountCreationModal(false);
        setShowAccountModal(true);
        fetchAccountsFromBackend('', 1);
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

    const handlePrintAfterSaveChange = (e) => {
        const isChecked = e.target.checked;
        setPrintAfterSave(isChecked);
        localStorage.setItem('printAfterSave', isChecked);
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

        if (item.stockEntries && item.stockEntries.length > 0) {
            const sortedStockEntries = item.stockEntries.sort((a, b) => new Date(a.date) - new Date(b.date));
            const firstStockEntry = sortedStockEntries[0];
            setSelectedItemRate(firstStockEntry.price || 0);
        }

        let hasTransactions = false;
        if (transactionSettings.displayTransactions && formData.accountId) {
            const cacheKey = `${item._id}-${formData.accountId}`;
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

                    const response = await api.get(`/api/retailer/transactions/${item._id}/${formData.accountId}/Sales`, {
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
                const descriptionInput = document.getElementById('headerItemDescription');
                if (descriptionInput) {
                    descriptionInput.focus();
                    descriptionInput.select();
                }
            }, 100);
        }
    };

    const insertSelectedItem = () => {
        if (!selectedItemForInsert) return;

        const sortedStockEntries = selectedItemForInsert.stockEntries?.sort((a, b) => new Date(a.date) - new Date(b.date)) || [];
        const firstStockEntry = sortedStockEntries[0] || {};

        const newItem = {
            item: selectedItemForInsert._id,
            uniqueNumber: selectedItemForInsert.uniqueNumber || 'N/A',
            hscode: selectedItemForInsert.hscode,
            name: selectedItemForInsert.name,
            category: selectedItemForInsert.category?.name || 'No Category',
            quantity: selectedItemQuantity || 0,
            unit: selectedItemForInsert.unit,
            price: selectedItemRate || Math.round(firstStockEntry.price * 100) / 100,
            puPrice: firstStockEntry.puPrice || 0,
            netPuPrice: firstStockEntry.netPuPrice || 0,
            amount: (selectedItemQuantity || 0) * (selectedItemRate || Math.round(firstStockEntry.price * 100) / 100),
            vatStatus: selectedItemForInsert.vatStatus,
            uniqueUuId: firstStockEntry.uniqueUuId,
            description: selectedItemDescription || ''
        };

        setItems([...items, newItem]);
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
    };

    const handleBack = () => {
        navigate(-1);
    };

    const printQuotationImmediately = async (quotationId) => {
        try {
            const response = await api.get(`/api/retailer/sales-quotation/${quotationId}/print`);
            const printData = response.data.data;

            const tempDiv = document.createElement('div');
            tempDiv.style.position = 'absolute';
            tempDiv.style.left = '-9999px';
            document.body.appendChild(tempDiv);

            tempDiv.innerHTML = `
                <div id="printableContent">
                    <div class="print-quotation-container">
                        <div class="print-quotation-header">
                            <div class="print-company-name">${printData.currentCompanyName}</div>
                            <div class="print-company-details">
                                ${printData.currentCompany.address} | Tel: ${printData.currentCompany.phone} | PAN: ${printData.currentCompany.pan}
                            </div>
                            <div class="print-quotation-title">SALES QUOTATION</div>
                        </div>

                        <div class="print-quotation-details">
                            <div>
                                <div><strong>M/S:</strong> ${printData.salesQuotation.account?.name || printData.salesQuotation.cashAccount || 'Account Not Found'}</div>
                                <div><strong>Address:</strong> ${printData.salesQuotation.account?.address || printData.salesQuotation.cashAccountAddress || 'N/A'}</div>
                                <div><strong>PAN:</strong> ${printData.salesQuotation.account?.pan || printData.salesQuotation.cashAccountPan || 'N/A'} | <strong>Tel:</strong> ${printData.salesQuotation.account?.phone || printData.salesQuotation.cashAccountPhone || 'N/A'}</div>
                                <div><strong>Email:</strong> ${printData.salesQuotation.account?.email || printData.salesQuotation.cashAccountEmail || 'N/A'}</div>
                            </div>
                            <div>
                                <div><strong>Quotation No:</strong> ${printData.salesQuotation.billNumber}</div>
                                <div><strong>Validity Periods:</strong> ${new Date(printData.salesQuotation.transactionDate).toLocaleDateString()}</div>
                                <div><strong>Quotation Issue Date:</strong> ${new Date(printData.salesQuotation.date).toLocaleDateString()}</div>
                                <div><strong>Mode of Payment:</strong> ${printData.salesQuotation.paymentMode}</div>
                            </div>
                        </div>

                        <table class="print-quotation-table">
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
                                ${printData.salesQuotation.items.map((item, i) => `
                                    <tr key="${i}">
                                        <td>${i + 1}</td>
                                        <td>${item.item.uniqueNumber}</td>
                                        <td>${item.item.hscode}</td>
                                        <td>
                                            ${item.item.vatStatus === 'vatExempt' ?
                    `${item.item.name} *` :
                    item.item.name
                }
                                        </td>
                                        <td>${item.description ? item.description : ''}</td>
                                        <td>${item.quantity}</td>
                                        <td>${item.item.unit?.name || ''}</td>
                                        <td>${item.price.toFixed(2)}</td>
                                        <td>${(item.quantity * item.price).toFixed(2)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                            <tr>
                                <td colSpan="9" style="border-bottom: 1px solid #000"></td>
                            </tr>
                        </table>

                        <table class="print-totals-table">
                            <tbody>
                                <tr>
                                    <td><strong>Sub-Total:</strong></td>
                                    <td class="print-text-right">${printData.salesQuotation.subTotal.toFixed(2)}</td>
                                </tr>
                                <tr>
                                    <td><strong>Discount (${printData.salesQuotation.discountPercentage}%):</strong></td>
                                    <td class="print-text-right">${printData.salesQuotation.discountAmount.toFixed(2)}</td>
                                </tr>
                                <tr>
                                    <td><strong>Non-Taxable:</strong></td>
                                    <td class="print-text-right">${printData.salesQuotation.nonVatSales.toFixed(2)}</td>
                                </tr>
                                <tr>
                                    <td><strong>Taxable Amount:</strong></td>
                                    <td class="print-text-right">${printData.salesQuotation.taxableAmount.toFixed(2)}</td>
                                </tr>
                                ${!printData.salesQuotation.isVatExempt ? `
                                    <tr>
                                        <td><strong>VAT (${printData.salesQuotation.vatPercentage}%):</strong></td>
                                        <td class="print-text-right">${(printData.salesQuotation.taxableAmount * printData.salesQuotation.vatPercentage / 100).toFixed(2)}</td>
                                    </tr>
                                ` : ''}
                                <tr>
                                    <td><strong>Round Off:</strong></td>
                                    <td class="print-text-right">${printData.salesQuotation.roundOffAmount.toFixed(2)}</td>
                                </tr>
                                <tr>
                                    <td><strong>Grand Total:</strong></td>
                                    <td class="print-text-right">${printData.salesQuotation.totalAmount.toFixed(2)}</td>
                                </tr>
                            </tbody>
                        </table>

                        <div class="print-amount-in-words">
                            <strong>In Words:</strong> ${convertToRupeesAndPaisa(printData.salesQuotation.totalAmount)} Only.
                        </div>

                        ${printData.salesQuotation.description ? `
                            <div class="mt-3 print-note">
                                <strong>Note:</strong> ${printData.salesQuotation.description}
                            </div>
                        ` : ''}

                        <div class="print-signature-area">
                            <div class="print-signature-box">Received By</div>
                            <div class="print-signature-box">Prepared By: ${printData.salesQuotation.user.name}</div>
                            <div class="print-signature-box">For: ${printData.currentCompanyName}</div>
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
                .print-quotation-container {
                    width: 100%;
                    max-width: 210mm;
                    margin: 0 auto;
                    padding: 2mm;
                }
                .print-quotation-header {
                    text-align: center;
                    margin-bottom: 3mm;
                    border-bottom: 1px solid #000;
                    padding-bottom: 2mm;
                }
                .print-quotation-title {
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
                .print-quotation-details {
                    display: flex;
                    justify-content: space-between;
                    margin: 2mm 0;
                    font-size: 8pt;
                }
                .print-quotation-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 3mm 0;
                    font-size: 8pt;
                    border: none;
                }
                .print-quotation-table thead {
                    border-top: 1px solid #000;
                    border-bottom: 1px solid #000;
                }
                .print-quotation-table th {
                    background-color: transparent;
                    border: none;
                    padding: 1mm;
                    text-align: left;
                    font-weight: bold;
                }
                .print-quotation-table td {
                    border: none;
                    padding: 1mm;
                    border-bottom: 1px solid #eee;
                }
                .print-text-right {
                    text-align: right;
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
            `;

            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Sales_Quotation_${printData.salesQuotation.billNumber}</title>
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
                message: 'Quotation saved but failed to load print data',
                type: 'warning'
            });
        }
    };

    // Loading state
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
                            <i className="bi bi-pencil-square me-2"></i>
                            Update Sales Quotation
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
                    <form onSubmit={handleSubmit} id="quotationForm" className="needs-validation" noValidate>
                        {/* Date and Basic Info Row */}
                        <div className="row g-2 mb-3">
                            {/* {company.dateFormat === 'nepali' ? (
                                <>
                                    <div className="col-12 col-md-6 col-lg-3">
                                        <div className="position-relative">
                                            <input
                                                type="text"
                                                name="transactionDateNepali"
                                                id="transactionDateNepali"
                                                ref={company.dateFormat === 'nepali' ? transactionDateRef : null}
                                                autoComplete='off'
                                                className={`form-control form-control-sm no-date-icon ${dateErrors.transactionDateNepali ? 'is-invalid' : ''}`}
                                                value={formData.transactionDateNepali}
                                                onChange={(e) => {
                                                    setFormData({ ...formData, transactionDateNepali: e.target.value });
                                                    setDateErrors(prev => ({ ...prev, transactionDateNepali: '' }));
                                                }}
                                                onBlur={(e) => {
                                                    try {
                                                        const dateStr = e.target.value;
                                                        if (!dateStr) {
                                                            setDateErrors(prev => ({ ...prev, transactionDateNepali: 'Date is required' }));
                                                            return;
                                                        }
                                                        if (!/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(dateStr)) {
                                                            return;
                                                        }
                                                        const [year, month, day] = dateStr.split('/').map(Number);
                                                        if (month < 1 || month > 12) throw new Error("Month must be between 1-12");
                                                        if (day < 1 || day > 33) throw new Error("Day must be between 1-32");
                                                        const nepaliDate = new NepaliDate(year, month - 1, day);

                                                        setFormData({
                                                            ...formData,
                                                            transactionDateNepali: nepaliDate.format('MM/DD/YYYY')
                                                        });
                                                        setDateErrors(prev => ({ ...prev, transactionDateNepali: '' }));
                                                    } catch (error) {
                                                        setDateErrors(prev => ({
                                                            ...prev,
                                                            transactionDateNepali: error.message || 'Invalid Nepali date'
                                                        }));
                                                    }
                                                }}
                                                onKeyDown={(e) => {
                                                    if ((e.key === 'Tab' || e.key === 'Enter') && dateErrors.transactionDateNepali) {
                                                        e.preventDefault();
                                                        e.target.focus();
                                                    } else if (e.key === 'Enter') {
                                                        handleKeyDown(e, 'transactionDateNepali');
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
                                                    setFormData({ ...formData, nepaliDate: e.target.value });
                                                    setDateErrors(prev => ({ ...prev, nepaliDate: '' }));
                                                }}
                                                onBlur={(e) => {
                                                    try {
                                                        const dateStr = e.target.value.trim();
                                                        if (!dateStr) {
                                                            setDateErrors(prev => ({ ...prev, nepaliDate: 'Date is required' }));
                                                            return;
                                                        }

                                                        if (!/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(dateStr)) {
                                                            return;
                                                        }

                                                        const [year, month, day] = dateStr.split('/').map(Number);
                                                        if (month < 1 || month > 12) throw new Error("Month must be between 1-12");
                                                        if (day < 1 || day > 33) throw new Error("Day must be between 1-32");

                                                        const nepaliDate = new NepaliDate(year, month - 1, day);

                                                        if (
                                                            nepaliDate.getYear() !== year ||
                                                            nepaliDate.getMonth() + 1 !== month ||
                                                            nepaliDate.getDate() !== day
                                                        ) {
                                                            throw new Error("Invalid Nepali date");
                                                        }

                                                        setFormData({
                                                            ...formData,
                                                            nepaliDate: nepaliDate.format('MM/DD/YYYY')
                                                        });
                                                        setDateErrors(prev => ({ ...prev, nepaliDate: '' }));
                                                    } catch (error) {
                                                        setDateErrors(prev => ({
                                                            ...prev,
                                                            nepaliDate: error.message || 'Invalid Nepali date'
                                                        }));
                                                    }
                                                }}
                                                onKeyDown={(e) => {
                                                    if ((e.key === 'Tab' || e.key === 'Enter') && dateErrors.nepaliDate) {
                                                        e.preventDefault();
                                                        e.target.focus();
                                                    } else if (e.key === 'Enter') {
                                                        handleKeyDown(e, 'nepaliDate');
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
                                                type="text"
                                                name="transactionDateRoman"
                                                id="transactionDateRoman"
                                                className="form-control form-control-sm"
                                                value={formData.transactionDateRoman}
                                                onChange={(e) => setFormData({ ...formData, transactionDateRoman: e.target.value })}
                                                onKeyDown={(e) => {
                                                    if ((e.key === 'Tab' || e.key === 'Enter') && dateErrors.transactionDateRoman) {
                                                        e.preventDefault();
                                                        e.target.focus();
                                                    } else if (e.key === 'Enter') {
                                                        handleKeyDown(e, 'transactionDateRoman');
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
                                                onChange={(e) => setFormData({ ...formData, billDate: e.target.value })}
                                                onKeyDown={(e) => {
                                                    if ((e.key === 'Tab' || e.key === 'Enter') && dateErrors.billDate) {
                                                        e.preventDefault();
                                                        e.target.focus();
                                                    } else if (e.key === 'Enter') {
                                                        handleKeyDown(e, 'billDate');
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
                                                Quotation Date: <span className="text-danger">*</span>
                                            </label>
                                        </div>
                                    </div>
                                </>
                            )} */}

                            {company.dateFormat === 'nepali' ? (
                                <>
                                    <div className="col-12 col-md-6 col-lg-3">
                                        <div className="position-relative">
                                            <input
                                                type="text"
                                                name="transactionDateNepali"
                                                id="transactionDateNepali"
                                                ref={company.dateFormat === 'nepali' ? transactionDateRef : null}
                                                autoComplete='off'
                                                className={`form-control form-control-sm no-date-icon ${dateErrors.transactionDateNepali ? 'is-invalid' : ''}`}
                                                value={formData.transactionDateNepali}
                                                onChange={(e) => {
                                                    // Allow only numbers and allowed separators (/, -)
                                                    const value = e.target.value;
                                                    const sanitizedValue = value.replace(/[^0-9/-]/g, '');

                                                    // Limit to typical Nepali date format length
                                                    if (sanitizedValue.length <= 10) {
                                                        setFormData({ ...formData, transactionDateNepali: sanitizedValue });
                                                        setDateErrors(prev => ({ ...prev, transactionDateNepali: '' }));
                                                    }
                                                }}
                                                onKeyDown={(e) => {
                                                    // Prevent typing letters
                                                    const allowedKeys = [
                                                        'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
                                                        'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
                                                        'Home', 'End'
                                                    ];

                                                    // Allow numbers (0-9) and separators (/, -)
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
                                                            // Auto-correct to current date if blank on Enter
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

                                                            // Move to next field after auto-correction
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
                                                    // Clean pasted data - keep only numbers and separators
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

                                                        // Check if it matches Nepali date format (YYYY/MM/DD or YYYY-MM-DD)
                                                        const nepaliDateFormat = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/;
                                                        if (!nepaliDateFormat.test(dateStr)) {
                                                            // Auto-correct to current date
                                                            const currentDate = new NepaliDate();
                                                            const correctedDate = currentDate.format('YYYY-MM-DD');
                                                            setFormData({
                                                                ...formData,
                                                                transactionDateNepali: correctedDate
                                                            });
                                                            setDateErrors(prev => ({ ...prev, transactionDateNepali: '' }));

                                                            // Show notification
                                                            setNotification({
                                                                show: true,
                                                                message: 'Invalid date format. Auto-corrected to current date.',
                                                                type: 'warning',
                                                                duration: 3000
                                                            });
                                                            return;
                                                        }

                                                        // Normalize separators to forward slash
                                                        const normalizedDateStr = dateStr.replace(/-/g, '/');
                                                        const [year, month, day] = normalizedDateStr.split('/').map(Number);

                                                        // Validate month and day ranges
                                                        if (month < 1 || month > 12) {
                                                            throw new Error("Month must be between 1-12");
                                                        }
                                                        if (day < 1 || day > 32) {
                                                            throw new Error("Day must be between 1-32");
                                                        }

                                                        // Try to create Nepali date
                                                        const nepaliDate = new NepaliDate(year, month - 1, day);

                                                        // Validate if date is valid
                                                        if (
                                                            nepaliDate.getYear() !== year ||
                                                            nepaliDate.getMonth() + 1 !== month ||
                                                            nepaliDate.getDate() !== day
                                                        ) {
                                                            // Auto-correct to current date if invalid
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
                                                            // Valid date - format it consistently (MM/DD/YYYY as per your original format)
                                                            setFormData({
                                                                ...formData,
                                                                transactionDateNepali: nepaliDate.format('YYYY-MM-DD')
                                                            });
                                                            setDateErrors(prev => ({ ...prev, transactionDateNepali: '' }));
                                                        }
                                                    } catch (error) {
                                                        // Auto-correct to current date on any error
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
                                                    // Allow only numbers and allowed separators (/, -)
                                                    const value = e.target.value;
                                                    const sanitizedValue = value.replace(/[^0-9/-]/g, '');

                                                    // Limit to typical Nepali date format length
                                                    if (sanitizedValue.length <= 10) {
                                                        setFormData({ ...formData, nepaliDate: sanitizedValue });
                                                        setDateErrors(prev => ({ ...prev, nepaliDate: '' }));
                                                    }
                                                }}
                                                onKeyDown={(e) => {
                                                    // Prevent typing letters
                                                    const allowedKeys = [
                                                        'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
                                                        'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
                                                        'Home', 'End'
                                                    ];

                                                    // Allow numbers (0-9) and separators (/, -)
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
                                                            // Auto-correct to current date if blank on Enter
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

                                                            // Move to next field after auto-correction
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
                                                    // Clean pasted data - keep only numbers and separators
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

                                                        // Check if it matches Nepali date format (YYYY/MM/DD or YYYY-MM-DD)
                                                        const nepaliDateFormat = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/;
                                                        if (!nepaliDateFormat.test(dateStr)) {
                                                            // Auto-correct to current date
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

                                                        // Normalize separators to forward slash
                                                        const normalizedDateStr = dateStr.replace(/-/g, '/');
                                                        const [year, month, day] = normalizedDateStr.split('/').map(Number);

                                                        // Validate month and day ranges
                                                        if (month < 1 || month > 12) {
                                                            throw new Error("Month must be between 1-12");
                                                        }
                                                        if (day < 1 || day > 32) {
                                                            throw new Error("Day must be between 1-32");
                                                        }

                                                        // Try to create Nepali date
                                                        const nepaliDate = new NepaliDate(year, month - 1, day);

                                                        // Validate if date is valid
                                                        if (
                                                            nepaliDate.getYear() !== year ||
                                                            nepaliDate.getMonth() + 1 !== month ||
                                                            nepaliDate.getDate() !== day
                                                        ) {
                                                            // Auto-correct to current date if invalid
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
                                                            // Valid date - format it consistently (MM/DD/YYYY as per your original format)
                                                            setFormData({
                                                                ...formData,
                                                                nepaliDate: nepaliDate.format('YYYY-MM-DD')
                                                            });
                                                            setDateErrors(prev => ({ ...prev, nepaliDate: '' }));
                                                        }
                                                    } catch (error) {
                                                        // Auto-correct to current date on any error
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
                                                type="text"
                                                name="transactionDateRoman"
                                                id="transactionDateRoman"
                                                className="form-control form-control-sm"
                                                value={formData.transactionDateRoman}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    // Allow only numbers and allowed separators (/, -)
                                                    const sanitizedValue = value.replace(/[^0-9/-]/g, '');

                                                    // Limit to typical date format length
                                                    if (sanitizedValue.length <= 10) {
                                                        setFormData({ ...formData, transactionDateRoman: sanitizedValue });
                                                        setDateErrors(prev => ({ ...prev, transactionDateRoman: '' }));
                                                    }
                                                }}
                                                onKeyDown={(e) => {
                                                    // Prevent typing letters
                                                    const allowedKeys = [
                                                        'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
                                                        'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
                                                        'Home', 'End'
                                                    ];

                                                    // Allow numbers (0-9) and separators (/, -)
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
                                                            // Auto-correct to today's date if blank on Enter
                                                            const today = new Date();
                                                            const todayStr = today.toISOString().split('T')[0];
                                                            setFormData({ ...formData, transactionDateRoman: todayStr });

                                                            setNotification({
                                                                show: true,
                                                                message: 'Date required. Auto-corrected to today.',
                                                                type: 'warning',
                                                                duration: 3000
                                                            });

                                                            // Move to next field after auto-correction
                                                            handleKeyDown(e, 'transactionDateRoman');
                                                        } else if (dateErrors.transactionDateRoman) {
                                                            e.target.focus();
                                                        } else {
                                                            handleKeyDown(e, 'transactionDateRoman');
                                                        }
                                                    }
                                                }}
                                                onPaste={(e) => {
                                                    e.preventDefault();
                                                    const pastedData = e.clipboardData.getData('text');
                                                    // Clean pasted data - keep only numbers and separators
                                                    const cleanedData = pastedData.replace(/[^0-9/-]/g, '');
                                                    const newValue = formData.transactionDateRoman + cleanedData;
                                                    if (newValue.length <= 10) {
                                                        setFormData({ ...formData, transactionDateRoman: newValue });
                                                    }
                                                }}
                                                onBlur={(e) => {
                                                    try {
                                                        const dateStr = e.target.value.trim();
                                                        if (!dateStr) {
                                                            setDateErrors(prev => ({ ...prev, transactionDateRoman: '' }));
                                                            return;
                                                        }

                                                        // Check if it matches date format (YYYY/MM/DD or YYYY-MM-DD)
                                                        const dateFormat = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/;
                                                        if (!dateFormat.test(dateStr)) {
                                                            // Auto-correct to today's date
                                                            const today = new Date();
                                                            const correctedDate = today.toISOString().split('T')[0];
                                                            setFormData({
                                                                ...formData,
                                                                transactionDateRoman: correctedDate
                                                            });
                                                            setDateErrors(prev => ({ ...prev, transactionDateRoman: '' }));

                                                            setNotification({
                                                                show: true,
                                                                message: 'Invalid date format. Auto-corrected to today.',
                                                                type: 'warning',
                                                                duration: 3000
                                                            });
                                                            return;
                                                        }

                                                        // Normalize separators to forward slash
                                                        const normalizedDateStr = dateStr.replace(/-/g, '/');
                                                        const [year, month, day] = normalizedDateStr.split('/').map(Number);

                                                        // Validate month and day ranges
                                                        if (month < 1 || month > 12) {
                                                            throw new Error("Month must be between 1-12");
                                                        }
                                                        if (day < 1 || day > 31) {
                                                            throw new Error("Day must be between 1-31");
                                                        }

                                                        // Try to create date
                                                        const selectedDate = new Date(year, month - 1, day);

                                                        // Validate if date is valid and not in future
                                                        const today = new Date();
                                                        today.setHours(0, 0, 0, 0);

                                                        if (selectedDate > today) {
                                                            // Auto-correct to today's date if future date
                                                            const todayStr = today.toISOString().split('T')[0];
                                                            setFormData({
                                                                ...formData,
                                                                transactionDateRoman: todayStr
                                                            });
                                                            setDateErrors(prev => ({ ...prev, transactionDateRoman: '' }));

                                                            setNotification({
                                                                show: true,
                                                                message: 'Future date not allowed. Auto-corrected to today.',
                                                                type: 'warning',
                                                                duration: 3000
                                                            });
                                                        } else {
                                                            // Valid date - format it consistently (YYYY-MM-DD)
                                                            const formattedDate = selectedDate.toISOString().split('T')[0];
                                                            setFormData({
                                                                ...formData,
                                                                transactionDateRoman: formattedDate
                                                            });
                                                            setDateErrors(prev => ({ ...prev, transactionDateRoman: '' }));
                                                        }
                                                    } catch (error) {
                                                        // Auto-correct to today's date on any error
                                                        const today = new Date();
                                                        const correctedDate = today.toISOString().split('T')[0];
                                                        setFormData({
                                                            ...formData,
                                                            transactionDateRoman: correctedDate
                                                        });
                                                        setDateErrors(prev => ({ ...prev, transactionDateRoman: '' }));

                                                        setNotification({
                                                            show: true,
                                                            message: error.message ? `${error.message}. Auto-corrected to today.` : 'Invalid date. Auto-corrected to today.',
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
                                            {dateErrors.transactionDateRoman && (
                                                <div className="invalid-feedback d-block" style={{ fontSize: '0.7rem' }}>
                                                    {dateErrors.transactionDateRoman}
                                                </div>
                                            )}
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
                                                    // Validate that the date is not in the future
                                                    const selectedDate = new Date(value);
                                                    const today = new Date();
                                                    today.setHours(0, 0, 0, 0);

                                                    if (selectedDate > today) {
                                                        // Auto-correct to today's date if future date is selected
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
                                                            // Auto-correct to today's date if blank on Enter
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
                                                        // Auto-correct to today's date if empty
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
                                                max={new Date().toISOString().split('T')[0]} // Prevent future dates in date picker
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
                                            {dateErrors.billDate && (
                                                <div className="invalid-feedback d-block" style={{ fontSize: '0.7rem' }}>
                                                    {dateErrors.billDate}
                                                </div>
                                            )}
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

                        {/* Party Information Row */}
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
                                            compact={true}
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
                                                        document.getElementById('quantity').focus();
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
                                                id='quantity'
                                                value={selectedItemQuantity}
                                                onChange={(e) => setSelectedItemQuantity(e.target.value)}
                                                onFocus={(e) => e.target.select()}
                                                onKeyDown={(e) => {
                                                    if ((e.key === 'Tab' || e.key === 'Enter')) {
                                                        e.preventDefault();
                                                        document.getElementById('rate').focus();
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
                                            {selectedItemForInsert ? (selectedItemForInsert.unit?.name || 'N/A') : '-'}
                                        </td>
                                        <td width="8%" style={{ padding: '2px', backgroundColor: '#ffffff' }}>
                                            <input
                                                type="number"
                                                className="form-control form-control-sm"
                                                placeholder="Rate"
                                                id='rate'
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
                                                    insertSelectedItem();
                                                    setTimeout(() => {
                                                        if (itemsTableRef.current) {
                                                            itemsTableRef.current.scrollTop = itemsTableRef.current.scrollHeight;
                                                        }
                                                    }, 50);
                                                }}
                                                disabled={!selectedItemForInsert}
                                                title="Insert item below"
                                                onKeyDown={(e) => {
                                                    if ((e.key === 'Tab' || e.key === 'Enter')) {
                                                        e.preventDefault();
                                                        insertSelectedItem();
                                                        setTimeout(() => {
                                                            if (itemsTableRef.current) {
                                                                itemsTableRef.current.scrollTop = itemsTableRef.current.scrollHeight;
                                                            }
                                                        }, 50);
                                                    }
                                                }}
                                                style={{
                                                    height: '20px',
                                                    fontSize: '0.7rem',
                                                    fontWeight: 'bold',
                                                    backgroundColor: '#198754',
                                                    borderColor: '#198754'
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
                                            <td style={{ padding: '3px', fontSize: '0.75rem' }}>{item.uniqueNumber}</td>
                                            <td style={{ padding: '3px', fontSize: '0.75rem' }}>
                                                <input type="hidden" name={`items[${index}][hscode]`} value={item.hscode || ''} />
                                                {item.hscode || ''}
                                            </td>
                                            <td style={{ padding: '3px', fontSize: '0.75rem' }}>
                                                <input type="hidden" name={`items[${index}][item]`} value={item.item} />
                                                {item.name}
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
                                                    required
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
                                                {item.unit?.name}
                                                <input type="hidden" name={`items[${index}][unit]`} value={item.unit?._id} />
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
                                                    onClick={() => fetchLastTransactions(item.item)}
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
                                                <input type="hidden" name={`items[${index}][puPrice]`} value={item.puPrice} />
                                                <input type="hidden" name={`items[${index}][netPuPrice]`} value={item.netPuPrice} />
                                                <input type="hidden" name={`items[${index}][uniqueUuId]`} value={item.uniqueUuId} />
                                            </td>
                                        </tr>
                                    ))}

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
                                        <td style={{ padding: '1px' }}>
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

                        <div className="row g-2 mb-2">
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
                                                document.getElementById('saveBill')?.focus();
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
                                        <Button variant="secondary" className="btn-sm d-flex align-items-center" onClick={handleBack} style={{ height: '26px', padding: '0 12px', fontSize: '0.8rem', fontWeight: '500' }}>
                                            <BiArrowBack className="me-1" style={{ fontSize: '0.9rem' }} /> Back
                                        </Button>
                                        {/* <button
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
                                                    <i className="bi bi-save me-1" style={{ fontSize: '0.9rem' }}></i> Update
                                                </>
                                            )}
                                        </button> */}

                                        <button
                                            type="submit"
                                            className="btn btn-primary btn-sm"
                                            id="saveBill"
                                            onClick={(e) => handleSubmit(e, printAfterSave)}
                                            disabled={isSaving}
                                        >
                                            {isSaving ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                    Saving...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="bi bi-save me-1"></i> Update
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

            {/* Modals */}
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
                                                const account = accounts.find(a => a._id === accountId);
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
                                                <th style={{ width: '5%', padding: '0.15rem 0.3rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>#</th>
                                                <th style={{ width: '15%', padding: '0.15rem 0.3rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>Date</th>
                                                <th style={{ width: '15%', padding: '0.15rem 0.3rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>Inv. No.</th>
                                                <th style={{ width: '10%', padding: '0.15rem 0.3rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>Type</th>
                                                <th style={{ width: '10%', padding: '0.15rem 0.3rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>A/c Type</th>
                                                <th style={{ width: '10%', padding: '0.15rem 0.3rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>Pay.Mode</th>
                                                <th style={{ width: '10%', padding: '0.15rem 0.3rem', fontSize: '0.75rem', whiteSpace: 'nowrap', textAlign: 'right' }}>Qty.</th>
                                                <th style={{ width: '10%', padding: '0.15rem 0.3rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>Unit</th>
                                                <th style={{ width: '15%', padding: '0.15rem 0.3rem', fontSize: '0.75rem', whiteSpace: 'nowrap', textAlign: 'right' }}>Rate</th>
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
                                                            if (transaction.billId && transaction.billId._id) {
                                                                navigate(`/retailer/sales/${transaction.billId._id}/print`);
                                                            } else if (transaction.purchaseBillId && transaction.purchaseBillId._id) {
                                                                navigate(`/bills/${transaction.purchaseBillId._id}/print`);
                                                            }
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                if (transaction.billId && transaction.billId._id) {
                                                                    navigate(`/bills/${transaction.billId._id}/print`);
                                                                } else if (transaction.purchaseBillId && transaction.purchaseBillId._id) {
                                                                    navigate(`/bills/${transaction.purchaseBillId._id}/print`);
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

            {showProductModal && (
                <ProductModal onClose={() => setShowProductModal(false)} />
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

// Helper functions
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

export default EditSalesQuotation;