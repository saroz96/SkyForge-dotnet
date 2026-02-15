// import React, { useState, useEffect, useRef } from 'react';
// import { useNavigate } from 'react-router-dom';
// import NepaliDate from 'nepali-date-converter';
// import axios from 'axios';
// import Header from '../Header';
// import '../../../stylesheet/retailer/salesReturn/AddCashSalesReturn.css';
// import NotificationToast from '../../NotificationToast';
// import '../../../stylesheet/noDateIcon.css'
// import ProductModal from '../dashboard/modals/ProductModal';
// import useDebounce from '../../../hooks/useDebounce';
// import VirtualizedItemList from '../../VirtualizedItemList';
// import AccountCreationModal from '../sales/AccountCreationModal';

// const AddCashSalesReturn = () => {
//     const navigate = useNavigate();
//     const transactionDateRef = useRef(null);
//     const [isInitialDataLoaded, setIsInitialDataLoaded] = useState(false);
//     const [isSaving, setIsSaving] = useState(false);
//     const [isLoading, setIsLoading] = useState(true);
//     const addressRef = useRef(null);
//     const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
//     const itemsTableRef = useRef(null);
//     const [showItemsModal, setShowItemsModal] = useState(false);
//     const [pollInterval, setPollInterval] = useState(null);
//     const [notification, setNotification] = useState({
//         show: false,
//         message: '',
//         type: 'success'
//     });
//     const [dateErrors, setDateErrors] = useState({
//         transactionDateNepali: '',
//         nepaliDate: ''
//     });
//     const [showAccountCreationModal, setShowAccountCreationModal] = useState(false);
//     // Add this state near your other state declarations
//     const [printAfterSave, setPrintAfterSave] = useState(
//         localStorage.getItem('printAfterSaveCashSalesReturn') === 'true' || false
//     );

//     const [formData, setFormData] = useState({
//         accountId: '',
//         accountName: '',
//         accountAddress: '',
//         accountPhone: '',
//         transactionDateNepali: currentNepaliDate,
//         transactionDateRoman: new Date().toISOString().split('T')[0],
//         nepaliDate: currentNepaliDate,
//         billDate: new Date().toISOString().split('T')[0],
//         billNumber: '',
//         paymentMode: 'cash',
//         isVatExempt: 'all',
//         discountPercentage: 0,
//         discountAmount: 0,
//         roundOffAmount: 0,
//         vatPercentage: 13,
//         items: []
//     });

//     const [items, setItems] = useState([]);
//     const [allItems, setAllItems] = useState([]);
//     const [accounts, setAccounts] = useState([]);
//     const [filteredAccounts, setFilteredAccounts] = useState([]);
//     const [showAccountModal, setShowAccountModal] = useState(false);
//     const [showItemDropdown, setShowItemDropdown] = useState(false);
//     const [showTransactionModal, setShowTransactionModal] = useState(false);
//     const [transactions, setTransactions] = useState([]);
//     const [filteredItems, setFilteredItems] = useState([]);
//     const itemDropdownRef = useRef(null);
//     const [currentFocus, setCurrentFocus] = useState(0);
//     const [isFirstLoad, setIsFirstLoad] = useState(true);
//     const [showProductModal, setShowProductModal] = useState(false);
//     // Add these state variables with your existing state declarations
//     const [searchQuery, setSearchQuery] = useState('');
//     const [lastSearchQuery, setLastSearchQuery] = useState(''); // Store the last search
//     const [shouldShowLastSearchResults, setShouldShowLastSearchResults] = useState(false);
//     const debouncedSearchQuery = useDebounce(searchQuery, 50);

//     const api = axios.create({
//         baseURL: process.env.REACT_APP_API_BASE_URL,
//         withCredentials: true,
//     });

//     const [company, setCompany] = useState({
//         dateFormat: 'nepali',
//         vatEnabled: true,
//         fiscalYear: {}
//     });

//     const [nextBillNumber, setNextBillNumber] = useState('');

//     const accountSearchRef = useRef(null);
//     const itemSearchRef = useRef(null);
//     const accountModalRef = useRef(null);
//     const transactionModalRef = useRef(null);

//     useEffect(() => {
//         const fetchInitialData = async () => {
//             try {
//                 const response = await api.get('/api/retailer/cash/sales-return');
//                 const { data } = response;

//                 const sortedAccounts = data.data.accounts.sort((a, b) => a.name.localeCompare(b.name));
//                 const sortedItems = data.data.items.sort((a, b) => a.name.localeCompare(b.name));

//                 setCompany(data.data.company);
//                 setAllItems(sortedItems);
//                 setAccounts(sortedAccounts);
//                 setNextBillNumber(data.data.nextSalesReturnBillNumber);

//                 setFormData(prev => ({
//                     ...prev,
//                     billNumber: data.data.nextSalesReturnBillNumber
//                 }));
//                 setIsInitialDataLoaded(true);
//             } catch (error) {
//                 console.error('Error fetching initial data:', error);
//             }
//         };
//         fetchInitialData();
//     }, []);

//     useEffect(() => {
//         if (isInitialDataLoaded && transactionDateRef.current) {
//             const timer = setTimeout(() => {
//                 transactionDateRef.current.focus();
//             }, 50);

//             return () => clearTimeout(timer);
//         }
//     }, [isInitialDataLoaded, company.dateFormat]);

//     useEffect(() => {
//         const handleKeyDown = (e) => {
//             // F9 toggles product modal
//             if (e.key === 'F9') {
//                 e.preventDefault();
//                 setShowProductModal(prev => !prev);
//             }
//             // F6 opens account creation modal when account modal is open
//             else if (e.key === 'F6' && showAccountModal) {
//                 e.preventDefault();
//                 setShowAccountModal(false);
//                 setShowAccountCreationModal(true);
//             }
//         };

//         window.addEventListener('keydown', handleKeyDown);
//         return () => {
//             window.removeEventListener('keydown', handleKeyDown);
//         };
//     }, [showAccountModal]); // Add showAccountModal to dependencies

//     useEffect(() => {
//         calculateTotal();
//     }, [items, formData]);

//     useEffect(() => {
//         if (itemSearchRef.current?.value) {
//             handleItemSearch({ target: { value: itemSearchRef.current.value } });
//         } else {
//             const filtered = allItems.filter(item => {
//                 if (formData.isVatExempt === 'all') return true;
//                 if (formData.isVatExempt === 'false') return item.vatStatus === 'vatable';
//                 if (formData.isVatExempt === 'true') return item.vatStatus === 'vatExempt';
//                 return true;
//             });
//             setFilteredItems(filtered);
//         }
//     }, [formData.isVatExempt, allItems]);

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

//     const handleAccountCreated = async (newAccountData) => {
//         try {
//             // Refresh accounts list
//             const { accounts: refreshedAccounts } = await fetchItemsAndAccounts();
//             const sortedAccounts = refreshedAccounts.sort((a, b) => a.name.localeCompare(b.name));
//             setAccounts(sortedAccounts);

//             // Automatically select the newly created account
//             if (newAccountData?.name) {
//                 setFormData({
//                     ...formData,
//                     cashAccount: newAccountData.name,
//                     cashAccountId: newAccountData._id,
//                     cashAccountAddress: newAccountData.address || '',
//                     cashAccountPan: newAccountData.pan || '',
//                     cashAccountEmail: newAccountData.email || '',
//                     cashAccountPhone: newAccountData.phone || ''
//                 });

//                 setNotification({
//                     show: true,
//                     message: 'Account created and selected!',
//                     type: 'success'
//                 });
//             }

//             setShowAccountCreationModal(false);

//             // Focus on address field
//             setTimeout(() => {
//                 addressRef.current?.focus();
//             }, 100);
//         } catch (error) {
//             console.error('Error refreshing accounts:', error);
//             setNotification({
//                 show: true,
//                 message: 'Error refreshing accounts list',
//                 type: 'error'
//             });
//         }
//     };

//     const fetchItemsAndAccounts = async () => {
//         try {
//             const response = await api.get('/api/retailer/cash/sales-return');
//             const { data } = response;

//             const sortedItems = data.data.items.sort((a, b) => a.name.localeCompare(b.name));
//             const sortedAccounts = data.data.accounts.sort((a, b) => a.name.localeCompare(b.name));

//             setAllItems(sortedItems);
//             setAccounts(sortedAccounts);

//             return {
//                 items: sortedItems,
//                 accounts: sortedAccounts
//             };
//         } catch (error) {
//             console.error('Error fetching items and accounts:', error);
//             throw error;
//         }
//     };

//     const fetchItems = async () => {
//         try {
//             const response = await api.get('/api/retailer/items');
//             if (response.data.success) {
//                 const sortedItems = response.data.items.sort((a, b) => a.name.localeCompare(b.name));
//                 setAllItems(sortedItems);
//             }
//         } catch (error) {
//             console.error('Error fetching items:', error);
//         }
//     };

//     const handleAccountSearch = (e) => {
//         const searchText = e.target.value.toLowerCase();
//         const filtered = accounts.filter(account =>
//             account.name.toLowerCase().includes(searchText) ||
//             (account.phone && account.phone.toLowerCase().includes(searchText)) ||
//             (account.address && account.address.toLowerCase().includes(searchText))
//         ).sort((a, b) => a.name.localeCompare(b.name));

//         setFilteredAccounts(filtered);
//     };

//     const selectAccount = (account) => {
//         setFormData({
//             ...formData,
//             accountId: account._id,
//             accountName: account.name,
//             accountAddress: account.address || '',
//             accountPhone: account.phone || ''
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

//     const addItemToBill = (item) => {

//         // Store the current search query before clearing
//         if (itemSearchRef.current?.value) {
//             setLastSearchQuery(itemSearchRef.current.value);
//             setShouldShowLastSearchResults(true);
//         }

//         const newItem = {
//             item: item._id,
//             uniqueNumber: item.uniqueNumber || 'N/A',
//             hscode: item.hscode,
//             name: item.name,
//             batchNumber: 'XXX',
//             expiryDate: getDefaultExpiryDate(),
//             quantity: 0,
//             unit: item.unit,
//             price: item.latestPrice || 0,
//             amount: 0,
//             vatStatus: item.vatStatus
//         };

//         setItems([...items, newItem]);
//         setShowItemDropdown(false);
//         // itemSearchRef.current.value = '';

//         // Clear the input field but preserve the search query in memory
//         setSearchQuery('');
//         if (itemSearchRef.current) {
//             itemSearchRef.current.value = '';
//         }

//         setTimeout(() => {
//             document.getElementById(`batchNumber-${items.length}`)?.focus();
//         }, 100);
//     };

//     const getDefaultExpiryDate = () => {
//         const today = new Date();
//         today.setFullYear(today.getFullYear() + 2);
//         return today.toISOString().split('T')[0];
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

//     // Update your search input's onFocus handler
//     const handleSearchFocus = () => {
//         setShowItemDropdown(true);

//         // If we have a last search query and the input is empty, show those results
//         if (lastSearchQuery && !searchQuery) {
//             setShouldShowLastSearchResults(true);
//         }

//         document.querySelectorAll('.dropdown-item').forEach(item => {
//             item.classList.remove('active');
//         });

//         scrollToItemsTable();
//     };

//     const updateItemField = (index, field, value) => {
//         const updatedItems = [...items];
//         updatedItems[index][field] = value;

//         if (field === 'quantity' || field === 'price') {
//             updatedItems[index].amount = (updatedItems[index].quantity * updatedItems[index].price).toFixed(2);
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

//     const fetchLastTransactions = async (itemId) => {
//         try {
//             const response = await api.get(`/api/retailer/transactions/${itemId}/${formData.accountId}/sales`);
//             setTransactions(response.data);
//             setShowTransactionModal(true);
//         } catch (error) {
//             console.error('Error fetching transactions:', error);
//         }
//     };

//     // Add this useEffect to reset search memory
//     useEffect(() => {
//         return () => {
//             // Reset search memory when component unmounts
//             setLastSearchQuery('');
//             setShouldShowLastSearchResults(false);
//         };
//     }, []);

//     const resetForm = async () => {
//         try {
//             setIsLoading(true); // Show loading state while refreshing data

//             // Fetch fresh data from the backend
//             const response = await api.get('/api/retailer/cash/sales-return');
//             const { data } = response;

//             // Update all necessary states
//             const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
//             const currentRomanDate = new Date().toISOString().split('T')[0];

//             setFormData({
//                 cashAccount: '',
//                 cashAccountAddress: '',
//                 cashAccountPan: '',
//                 cashAccountEmail: '',
//                 cashAccountPhone: '',
//                 transactionDateNepali: currentNepaliDate,
//                 transactionDateRoman: currentRomanDate,
//                 nepaliDate: currentNepaliDate,
//                 billDate: currentRomanDate,
//                 billNumber: data.data.nextSalesReturnBillNumber,
//                 paymentMode: 'cash',
//                 isVatExempt: 'all',
//                 discountPercentage: 0,
//                 discountAmount: 0,
//                 roundOffAmount: 0,
//                 vatPercentage: 13,
//                 items: []
//             });

//             // Update all data states with fresh data
//             setAllItems(data.data.items.sort((a, b) => a.name.localeCompare(b.name)));
//             const sortedAccounts = data.data.accounts.sort((a, b) => a.name.localeCompare(b.name));
//             setAccounts(sortedAccounts);
//             setFilteredAccounts([]); // Reset filtered accounts
//             setNextBillNumber(data.data.nextSalesReturnBillNumber);
//             setItems([]);

//             // Reset search memory
//             setSearchQuery('');
//             setLastSearchQuery('');
//             setShouldShowLastSearchResults(false);

//             if (itemSearchRef.current) {
//                 itemSearchRef.current.value = '';
//             }

//             // Clear the account search input if it exists
//             if (accountSearchRef.current) {
//                 accountSearchRef.current.value = '';
//             }

//             // Focus back to the date field
//             setTimeout(() => {
//                 if (transactionDateRef.current) {
//                     transactionDateRef.current.focus();
//                 }
//             }, 100);
//         } catch (err) {
//             console.error('Error resetting form:', err);
//             setNotification({
//                 show: true,
//                 message: 'Error refreshing form data',
//                 type: 'error'
//             });
//         } finally {
//             setIsLoading(false);
//         }
//     };

//     const handleSubmit = async (e, print = false) => {
//         // Prevent default only if event exists (form submission)
//         if (e) {
//             e.preventDefault();
//         }

//         setIsSaving(true);

//         try {
//             const billData = {
//                 cashAccount: formData.cashAccount,
//                 cashAccountAddress: formData.cashAccountAddress,
//                 cashAccountPan: formData.cashAccountPan,
//                 cashAccountEmail: formData.cashAccountEmail,
//                 cashAccountPhone: formData.cashAccountPhone,
//                 items: items.map(item => ({
//                     item: item.item,
//                     batchNumber: item.batchNumber,
//                     expiryDate: item.expiryDate,
//                     quantity: item.quantity,
//                     unit: item.unit?._id,
//                     price: item.price,
//                     vatStatus: item.vatStatus
//                 })),
//                 vatPercentage: formData.vatPercentage,
//                 transactionDateNepali: formData.transactionDateNepali,
//                 transactionDateRoman: formData.transactionDateRoman,
//                 billDate: formData.billDate,
//                 nepaliDate: formData.nepaliDate,
//                 isVatExempt: formData.isVatExempt,
//                 discountPercentage: formData.discountPercentage,
//                 paymentMode: formData.paymentMode,
//                 roundOffAmount: formData.roundOffAmount,
//                 print
//             };

//             const response = await api.post('/api/retailer/cash/sales-return', billData);

//             if (response.data.success) {
//                 setNotification({
//                     show: true,
//                     message: 'Sales return saved successfully!',
//                     type: 'success'
//                 });

//                 if (print && response.data.data?.bill?._id) {
//                     setIsSaving(false);
//                     await printImmediately(response.data.data.bill._id);
//                     setTimeout(() => {
//                         resetForm();
//                     }, 1000);
//                 } else {
//                     setIsSaving(false);
//                     resetForm();
//                 }

//             } else {
//                 setNotification({
//                     show: true,
//                     message: response.data.error || 'Failed to save sales return',
//                     type: 'error'
//                 });
//                 setIsSaving(false);
//             }
//         } catch (error) {
//             console.error('Error saving sales return:', error);
//             setNotification({
//                 show: true,
//                 message: error.response?.data?.error || 'Failed to save sales return. Please try again.',
//                 type: 'error'
//             });
//             setIsSaving(false);
//         }
//     };
//     const handlePrintAfterSaveChange = (e) => {
//         const isChecked = e.target.checked;
//         setPrintAfterSave(isChecked);
//         localStorage.setItem('printAfterSaveCashSalesReturn', isChecked);
//     };

//     const printImmediately = async (billId) => {
//         try {
//             const response = await api.get(`/api/retailer/sales-return/${billId}/print`);
//             const printData = response.data.data;

//             // Create a temporary div to hold the print content
//             const tempDiv = document.createElement('div');
//             tempDiv.style.position = 'absolute';
//             tempDiv.style.left = '-9999px';
//             document.body.appendChild(tempDiv);

//             // Create the printable content
//             tempDiv.innerHTML = `
//         <div id="printableContent">
//             <div class="print-invoice-container">
//                 <div class="print-invoice-header">
//                     <div class="print-company-name">${printData.currentCompanyName}</div>
//                     <div class="print-company-details">
//                         ${printData.currentCompany.address} | Tel: ${printData.currentCompany.phone} | PAN: ${printData.currentCompany.pan}
//                     </div>
//                     <div class="print-invoice-title">SALES RETURN</div>
//                 </div>

//                 <div class="print-invoice-details">
//                     <div>
//                         <div><strong>M/S:</strong> ${printData.bill.cashAccount || 'Account Not Found'}</div>
//                         <div><strong>Address:</strong> ${printData.bill.cashAccountAddress || 'N/A'}</div>
//                         <div><strong>PAN:</strong> ${printData.bill.cashAccountPan || 'N/A'} | <strong>Tel:</strong> ${printData.bill.cashAccountPhone || 'N/A'}</div>
//                         <div><strong>Email:</strong> ${printData.bill.cashAccountEmail || 'N/A'}</div>
//                     </div>
//                     <div>
//                         <div><strong>Invoice No:</strong> ${printData.bill.billNumber}</div>
//                         <div><strong>Transaction Date:</strong> ${new Date(printData.bill.transactionDate).toLocaleDateString()}</div>
//                         <div><strong>Invoice Issue Date:</strong> ${new Date(printData.bill.date).toLocaleDateString()}</div>
//                         <div><strong>Mode of Payment:</strong> ${printData.bill.paymentMode}</div>
//                     </div>
//                 </div>

//                 <table class="print-invoice-table">
//                     <thead>
//                         <tr>
//                             <th>S.N.</th>
//                             <th>Code</th>
//                             <th>HSN</th>
//                             <th>Description of Goods</th>
//                             <th>Unit</th>
//                             <th>Batch</th>
//                             <th>Expiry</th>
//                             <th>Qty</th>
//                             <th>Price (Rs.)</th>
//                             <th>Total (Rs.)</th>
//                         </tr>
//                     </thead>
//                     <tbody>
//                         ${printData.bill.items.map((item, i) => `
//                             <tr key="${i}">
//                                 <td>${i + 1}</td>
//                                 <td>${item.item.uniqueNumber}</td>
//                                 <td>${item.item.hscode}</td>
//                                 <td>
//                                     ${item.item.vatStatus === 'vatExempt' ?
//                     `${item.item.name} *` :
//                     item.item.name
//                 }
//                                 </td>
//                                 <td>${item.item.unit?.name || ''}</td>
//                                 <td>${item.batchNumber}</td>
//                                 <td>${item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'N/A'}</td>
//                                 <td>${item.quantity}</td>
//                                 <td>${item.price.toFixed(2)}</td>
//                                 <td>${(item.quantity * item.price).toFixed(2)}</td>
//                             </tr>
//                         `).join('')}
//                     </tbody>
//                     <tr>
//                         <td colSpan="11" style="borderBottom: '1px dashed #000'"></td>
//                     </tr>
//                 </table>

//                 <table class="print-totals-table">
//                     <tbody>
//                         <tr>
//                             <td><strong>Sub-Total:</strong></td>
//                             <td class="print-text-right">${printData.bill.subTotal.toFixed(2)}</td>
//                         </tr>
//                         <tr>
//                             <td><strong>Discount:</strong></td>
//                             <td class="print-text-right">${printData.bill.discountAmount.toFixed(2)}</td>
//                         </tr>
//                         <tr>
//                             <td><strong>Non-Taxable:</strong></td>
//                             <td class="print-text-right">${printData.bill.nonVatSalesReturn.toFixed(2)}</td>
//                         </tr>
//                         <tr>
//                             <td><strong>Taxable Amount:</strong></td>
//                             <td class="print-text-right">${printData.bill.taxableAmount.toFixed(2)}</td>
//                         </tr>
//                         ${!printData.bill.isVatExempt ? `
//                             <tr>
//                                 <td><strong>VAT (${printData.bill.vatPercentage}%):</strong></td>
//                                 <td class="print-text-right">${(printData.bill.taxableAmount * printData.bill.vatPercentage / 100).toFixed(2)}</td>
//                             </tr>
//                         ` : ''}
//                         <tr>
//                             <td><strong>Round Off:</strong></td>
//                             <td class="print-text-right">${printData.bill.roundOffAmount.toFixed(2)}</td>
//                         </tr>
//                         <tr>
//                             <td><strong>Grand Total:</strong></td>
//                             <td class="print-text-right">${printData.bill.totalAmount.toFixed(2)}</td>
//                         </tr>
//                     </tbody>
//                 </table>

//                 <div class="print-amount-in-words">
//                     <strong>In Words:</strong> ${convertToRupeesAndPaisa(printData.bill.totalAmount)} Only.
//                 </div>
//                 <br /><br />
//                 <div class="print-signature-area">
//                     <div class="print-signature-box">Received By</div>
//                     <div class="print-signature-box">Prepared By: ${printData.bill.user.name}</div>
//                     <div class="print-signature-box">For: ${printData.currentCompanyName}</div>
//                 </div>
//             </div>
//         </div>
//     `;

//             // Add print styles
//             const styles = `
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
//         .print-invoice-container {
//             width: 100%;
//             max-width: 210mm;
//             margin: 0 auto;
//             padding: 2mm;
//         }
//         .print-invoice-header {
//             text-align: center;
//             margin-bottom: 3mm;
//             border-bottom: 1px dashed #000;
//             padding-bottom: 2mm;
//         }
//         .print-invoice-title {
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
//         .print-invoice-details {
//             display: flex;
//             justify-content: space-between;
//             margin: 2mm 0;
//             font-size: 8pt;
//         }
//         .print-invoice-table {
//             width: 100%;
//             border-collapse: collapse;
//             margin: 3mm 0;
//             font-size: 8pt;
//             border: none;
//         }
//         .print-invoice-table thead {
//             border-top: 1px dashed #000;
//             border-bottom: 1px dashed #000;
//         }
//         .print-invoice-table th {
//             background-color: transparent;
//             border: none;
//             padding: 1mm;
//             text-align: left;
//             font-weight: bold;
//         }
//         .print-invoice-table td {
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
//             border-top: 1px dashed #000;
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

//             // Create print window
//             const printWindow = window.open('', '_blank');
//             printWindow.document.write(`
//         <html>
//             <head>
//                 <title>Cash_Sales_Return_${printData.bill.billNumber}</title>
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
//             printWindow.document.close();

//             // Clean up
//             document.body.removeChild(tempDiv);
//         } catch (error) {
//             console.error('Error fetching print data:', error);
//             setNotification({
//                 show: true,
//                 message: 'Bill saved but failed to load print data',
//                 type: 'warning'
//             });
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

//     const handleItemSearchKeydown = (e) => {
//         if (e.key === 'Enter') {
//             e.preventDefault();
//             if (currentFocus > -1 && filteredItems[currentFocus]) {
//                 addItemToBill(filteredItems[currentFocus]);
//             } else if (!e.target.value && items.length > 0) {
//                 document.getElementById('discountPercentage')?.focus();
//             }
//         } else if (e.key === 'ArrowDown') {
//             e.preventDefault();
//             setCurrentFocus(prev => (prev < filteredItems.length - 1 ? prev + 1 : 0));
//         } else if (e.key === 'ArrowUp') {
//             e.preventDefault();
//             setCurrentFocus(prev => (prev > 0 ? prev - 1 : filteredItems.length - 1));
//         }
//     };

//     const handleBatchKeydown = (e, index) => {
//         if (e.key === 'Enter') {
//             e.preventDefault();
//             document.getElementById(`expiryDate-${index}`)?.focus();
//         }
//     };

//     const handleExpDateKeydown = (e, index) => {
//         if (e.key === 'Enter') {
//             e.preventDefault();
//             document.getElementById(`quantity-${index}`)?.focus();
//         }
//     };

//     const handleQuantityKeydown = (e, index) => {
//         if (e.key === 'Enter') {
//             e.preventDefault();
//             document.getElementById(`price-${index}`)?.focus();
//         }
//     };

//     const handlePriceKeydown = (e, index) => {
//         if (e.key === 'Enter') {
//             e.preventDefault();
//             itemSearchRef.current?.focus();
//         }
//     };

//     const handleCloseButtonKeydown = (e) => {
//         if (e.key === 'Enter') {
//             e.preventDefault();
//             setShowTransactionModal(false);
//             document.getElementById(`batchNumber-${items.length - 1}`)?.focus();
//         }
//     };

//     // Memoized dropdown component
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

//     return (
//         <div className="container-fluid">
//             <Header />
//             <div className="card mt-4 shadow-lg p-4 animate__animated animate__fadeInUp expanded-card">
//                 <div className="card-header">
//                     Cash Sales Return Entry
//                     {formData.billNumber === '' && (
//                         <span id="customAlertForBillNumber" style={{ color: 'red' }}>Invoice is required!</span>
//                     )}
//                     {dateErrors.transactionDateNepali && (
//                         <span id="transactionDateError" style={{ color: 'red' }}>{dateErrors.transactionDateNepali}</span>
//                     )}
//                     {dateErrors.nepaliDate && (
//                         <span id="nepaliDateError" style={{ color: 'red' }}>{dateErrors.nepaliDate}</span>
//                     )}
//                 </div>
//                 <div className="card-body">
//                     <form onSubmit={handleSubmit} id="billForm" className="wow-form">
//                         <div className="form-group row">
//                             {company.dateFormat === 'nepali' ? (
//                                 <>
//                                     <div className="col">
//                                         <label htmlFor="transactionDateNepali">Transaction Date:</label>
//                                         <input
//                                             type="text"
//                                             name="transactionDateNepali"
//                                             id="transactionDateNepali"
//                                             className={`form-control no-date-icon ${dateErrors.transactionDateNepali ? 'is-invalid' : ''}`}
//                                             value={formData.transactionDateNepali}
//                                             onChange={(e) => {
//                                                 setFormData({ ...formData, transactionDateNepali: e.target.value });
//                                                 setDateErrors(prev => ({ ...prev, transactionDateNepali: '' }));
//                                             }}
//                                             onBlur={(e) => {
//                                                 try {
//                                                     const dateStr = e.target.value;
//                                                     if (!dateStr) {
//                                                         setDateErrors(prev => ({ ...prev, transactionDateNepali: 'Date is required' }));
//                                                         return;
//                                                     }
//                                                     if (!/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(dateStr)) {
//                                                         return;
//                                                     }
//                                                     const [year, month, day] = dateStr.split('/').map(Number);
//                                                     if (month < 1 || month > 12) throw new Error("Month must be between 1-12");
//                                                     if (day < 1 || day > 33) throw new Error("Day must be between 1-32");
//                                                     const nepaliDate = new NepaliDate(year, month - 1, day);

//                                                     setFormData({
//                                                         ...formData,
//                                                         transactionDateNepali: nepaliDate.format('MM/DD/YYYY')
//                                                     });
//                                                     setDateErrors(prev => ({ ...prev, transactionDateNepali: '' }));
//                                                 } catch (error) {
//                                                     setDateErrors(prev => ({
//                                                         ...prev,
//                                                         transactionDateNepali: error.message || 'Invalid Nepali date'
//                                                     }));
//                                                 }
//                                             }}
//                                             onKeyDown={(e) => {
//                                                 if ((e.key === 'Tab' || e.key === 'Enter') && dateErrors.transactionDateNepali) {
//                                                     e.preventDefault();
//                                                     e.target.focus();
//                                                 } else if (e.key === 'Enter') {
//                                                     handleKeyDown(e, 'transactionDateNepali');
//                                                 }
//                                             }}
//                                             required
//                                             autoFocus
//                                             ref={transactionDateRef}
//                                         />
//                                     </div>
//                                     <div className="col">
//                                         <label htmlFor="nepaliDate">Invoice Date:</label>
//                                         <input
//                                             type="text"
//                                             name="nepaliDate"
//                                             id="nepaliDate"
//                                             className={`form-control no-date-icon ${dateErrors.nepaliDate ? 'is-invalid' : ''}`}
//                                             value={formData.nepaliDate}
//                                             onChange={(e) => {
//                                                 setFormData({ ...formData, nepaliDate: e.target.value });
//                                                 setDateErrors(prev => ({ ...prev, nepaliDate: '' }));
//                                             }}
//                                             onBlur={(e) => {
//                                                 try {
//                                                     const dateStr = e.target.value.trim();
//                                                     if (!dateStr) {
//                                                         setDateErrors(prev => ({ ...prev, nepaliDate: 'Date is required' }));
//                                                         return;
//                                                     }

//                                                     if (!/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(dateStr)) {
//                                                         return;
//                                                     }

//                                                     const [year, month, day] = dateStr.split('/').map(Number);
//                                                     if (month < 1 || month > 12) throw new Error("Month must be between 1-12");
//                                                     if (day < 1 || day > 33) throw new Error("Day must be between 1-32");

//                                                     const nepaliDate = new NepaliDate(year, month - 1, day);

//                                                     if (
//                                                         nepaliDate.getYear() !== year ||
//                                                         nepaliDate.getMonth() + 1 !== month ||
//                                                         nepaliDate.getDate() !== day
//                                                     ) {
//                                                         throw new Error("Invalid Nepali date");
//                                                     }

//                                                     setFormData({
//                                                         ...formData,
//                                                         nepaliDate: nepaliDate.format('MM/DD/YYYY')
//                                                     });
//                                                     setDateErrors(prev => ({ ...prev, nepaliDate: '' }));
//                                                 } catch (error) {
//                                                     setDateErrors(prev => ({
//                                                         ...prev,
//                                                         nepaliDate: error.message || 'Invalid Nepali date'
//                                                     }));
//                                                 }
//                                             }}
//                                             onKeyDown={(e) => {
//                                                 if ((e.key === 'Tab' || e.key === 'Enter') && dateErrors.nepaliDate) {
//                                                     e.preventDefault();
//                                                     e.target.focus();
//                                                 } else if (e.key === 'Enter') {
//                                                     handleKeyDown(e, 'nepaliDate');
//                                                 }
//                                             }}
//                                             required
//                                         />
//                                     </div>
//                                 </>
//                             ) : (
//                                 <>
//                                     <div className="col">
//                                         <label htmlFor="transactionDateRoman">Transaction Date:</label>
//                                         <input
//                                             type="date"
//                                             name="transactionDateRoman"
//                                             id="transactionDateRoman"
//                                             className="form-control"
//                                             value={formData.transactionDateRoman}
//                                             onChange={(e) => setFormData({ ...formData, transactionDateRoman: e.target.value })}
//                                             required
//                                             onKeyDown={(e) => {
//                                                 if (e.key === 'Enter') {
//                                                     handleKeyDown(e, 'transactionDateRoman');
//                                                 }
//                                             }}
//                                             autoFocus
//                                             ref={transactionDateRef}
//                                         />
//                                     </div>
//                                     <div className="col">
//                                         <label htmlFor="billDate">Invoice Date:</label>
//                                         <input
//                                             type="date"
//                                             name="billDate"
//                                             id="billDate"
//                                             className="form-control"
//                                             value={formData.billDate}
//                                             onChange={(e) => setFormData({ ...formData, billDate: e.target.value })}
//                                             required
//                                             onKeyDown={(e) => {
//                                                 if (e.key === 'Enter') {
//                                                     handleKeyDown(e, 'billDate');
//                                                 }
//                                             }}
//                                         />
//                                     </div>
//                                 </>
//                             )}

//                             <div className="col">
//                                 <label htmlFor="billNumber">Vch. No:</label>
//                                 <input
//                                     type="text"
//                                     name="billNumber"
//                                     id="billNumber"
//                                     className="form-control"
//                                     value={formData.billNumber}
//                                     onChange={(e) => setFormData({ ...formData, billNumber: e.target.value })}
//                                     onKeyDown={(e) => {
//                                         if (e.key === 'Enter') {
//                                             handleKeyDown(e, 'billNumber');
//                                         }
//                                     }}
//                                     required
//                                 />
//                             </div>
//                             <div className="col">
//                                 <label htmlFor="isVatExempt">VAT</label>
//                                 <select
//                                     name="isVatExempt"
//                                     id="isVatExempt"
//                                     className="form-control"
//                                     value={formData.isVatExempt}
//                                     onChange={(e) => setFormData({ ...formData, isVatExempt: e.target.value })}
//                                     onKeyDown={(e) => {
//                                         if (e.key === 'Enter') {
//                                             handleKeyDown(e, 'isVatExempt');
//                                         }
//                                     }}
//                                 >
//                                     {company.vatEnabled && <option value="all">All</option>}
//                                     {company.vatEnabled && <option value="false">13%</option>}
//                                     <option value="true">Exempt</option>
//                                 </select>
//                             </div>
//                         </div>

//                         <div className="form-group row">
//                             <div className="col-6">
//                                 <label htmlFor="account">Cash Account:</label>
//                                 <input
//                                     type="text"
//                                     id="account"
//                                     name="account"
//                                     className="form-control"
//                                     value={formData.cashAccount}
//                                     onChange={(e) => {
//                                         setFormData({
//                                             ...formData,
//                                             cashAccount: e.target.value,
//                                             cashAccountAddress: '',
//                                             cashAccountPhone: ''
//                                         });
//                                     }}
//                                     onClick={() => setShowAccountModal(true)}
//                                     onFocus={() => setShowAccountModal(true)}
//                                     readOnly
//                                     required
//                                     onKeyDown={(e) => {
//                                         if (e.key === 'Enter') {
//                                             handleKeyDown(e, 'account');
//                                         }
//                                     }}
//                                 />
//                             </div>

//                             <div className="col">
//                                 <label htmlFor="cashAccountAddress">Address:</label>
//                                 <input
//                                     type="text"
//                                     id="cashAccountAddress"
//                                     className="form-control"
//                                     value={formData.cashAccountAddress}
//                                     onChange={(e) => setFormData({ ...formData, cashAccountAddress: e.target.value })}
//                                     onKeyDown={(e) => {
//                                         if (e.key === 'Enter') {
//                                             handleKeyDown(e, 'cashAccountAddress');
//                                         }
//                                     }}
//                                     ref={addressRef}
//                                     autoComplete='off'
//                                 />
//                             </div>
//                             <div className="col">
//                                 <label htmlFor="cashAccountPhone">Phone:</label>
//                                 <input
//                                     type="text"
//                                     id="cashAccountPhone"
//                                     className="form-control"
//                                     value={formData.cashAccountPhone}
//                                     onChange={(e) => setFormData({ ...formData, cashAccountPhone: e.target.value })}
//                                     onKeyDown={(e) => {
//                                         if (e.key === 'Enter') {
//                                             handleKeyDown(e, 'cashAccountPhone');
//                                         }
//                                     }}
//                                     autoComplete='off'
//                                 />
//                             </div>
//                         </div>

//                         <div id="bill-details-container" style={{ maxHeight: "400px", overflowY: "auto", border: "1px solid #ccc", padding: "10px" }} ref={itemsTableRef}>
//                             <table className="table table-bordered compact-table" id="itemsTable">
//                                 <thead>
//                                     <tr>
//                                         <th>S.No.</th>
//                                         <th>#</th>
//                                         <th>HSN</th>
//                                         <th>Description of Goods</th>
//                                         <th>Batch</th>
//                                         <th>Expiry</th>
//                                         <th>Qty</th>
//                                         <th>Unit</th>
//                                         <th>Rate</th>
//                                         <th>Amount</th>
//                                         <th>Action</th>
//                                     </tr>
//                                 </thead>
//                                 <tbody id="items">
//                                     {items.map((item, index) => (
//                                         <tr key={index} className={`item ${item.vatStatus === 'vatable' ? 'vatable-item' : 'non-vatable-item'}`}>
//                                             <td>{index + 1}</td>
//                                             <td>{item.uniqueNumber}</td>
//                                             <td>
//                                                 <input type="hidden" name={`items[${index}][hscode]`} value={item.hscode} />
//                                                 {item.hscode}
//                                             </td>
//                                             <td className="col-3">
//                                                 <input type="hidden" name={`items[${index}][item]`} value={item.item} />
//                                                 {item.name}
//                                             </td>
//                                             <td>
//                                                 <input
//                                                     type="text"
//                                                     name={`items[${index}][batchNumber]`}
//                                                     className="form-control item-batchNumber"
//                                                     id={`batchNumber-${index}`}
//                                                     value={item.batchNumber}
//                                                     onChange={(e) => updateItemField(index, 'batchNumber', e.target.value)}
//                                                     onKeyDown={(e) => handleBatchKeydown(e, index)}
//                                                     required
//                                                     onFocus={(e) => e.target.select()}
//                                                 />
//                                             </td>
//                                             <td>
//                                                 <input
//                                                     type="date"
//                                                     name={`items[${index}][expiryDate]`}
//                                                     className="form-control item-expiryDate"
//                                                     id={`expiryDate-${index}`}
//                                                     value={item.expiryDate}
//                                                     onChange={(e) => updateItemField(index, 'expiryDate', e.target.value)}
//                                                     onKeyDown={(e) => handleExpDateKeydown(e, index)}
//                                                     required
//                                                     onFocus={(e) => e.target.select()}
//                                                 />
//                                             </td>
//                                             <td>
//                                                 <input
//                                                     type="number"
//                                                     name={`items[${index}][quantity]`}
//                                                     className="form-control item-quantity"
//                                                     id={`quantity-${index}`}
//                                                     value={item.quantity}
//                                                     onChange={(e) => updateItemField(index, 'quantity', e.target.value)}
//                                                     onKeyDown={(e) => handleQuantityKeydown(e, index)}
//                                                     required
//                                                     min="1"
//                                                     step="any"
//                                                     onFocus={(e) => e.target.select()}
//                                                 />
//                                             </td>
//                                             <td>
//                                                 {item.unit?.name}
//                                                 <input type="hidden" name={`items[${index}][unit]`} value={item.unit?._id} />
//                                             </td>
//                                             <td>
//                                                 <input
//                                                     type="number"
//                                                     name={`items[${index}][price]`}
//                                                     className="form-control item-price"
//                                                     id={`price-${index}`}
//                                                     value={item.price}
//                                                     onChange={(e) => updateItemField(index, 'price', e.target.value)}
//                                                     onFocus={(e) => {
//                                                         e.target.select();
//                                                     }}
//                                                     onKeyDown={(e) => {
//                                                         if (e.key === 'Enter') {
//                                                             e.preventDefault();
//                                                             const itemSearchInput = document.getElementById('itemSearch');
//                                                             if (itemSearchInput) {
//                                                                 itemSearchInput.focus();
//                                                                 itemSearchInput.select();
//                                                             }
//                                                         }
//                                                     }}
//                                                 />
//                                             </td>
//                                             <td className="item-amount">{item.amount}</td>
//                                             <td>
//                                                 <button
//                                                     type="button"
//                                                     className="btn btn-danger"
//                                                     onClick={() => removeItem(index)}
//                                                 >
//                                                     <span aria-hidden="true">&times;</span>
//                                                 </button>
//                                             </td>
//                                             <input type="hidden" name={`items[${index}][vatStatus]`} value={item.vatStatus} />
//                                         </tr>
//                                     ))}
//                                 </tbody>
//                             </table>
//                         </div>

//                         <div className="row mb-3">
//                             <div className="col-12">
//                                 <label htmlFor="itemSearch" className="form-label">Search Item</label>
//                                 <div className="position-relative">
//                                     <input
//                                         type="text"
//                                         id="itemSearch"
//                                         className="form-control"
//                                         placeholder="Search item (Press F6 to create new item)"
//                                         autoComplete='off'
//                                         value={searchQuery}
//                                         onChange={handleItemSearch}
//                                         onFocus={handleSearchFocus}
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
//                                                 e.preventDefault();
//                                                 const activeItem = document.querySelector('.dropdown-item.active');
//                                                 if (activeItem) {
//                                                     const index = parseInt(activeItem.getAttribute('data-index'));
//                                                     const itemToAdd = memoizedFilteredItems[index];
//                                                     if (itemToAdd) {
//                                                         addItemToBill(itemToAdd);
//                                                     }
//                                                 } else if (!searchQuery && items.length > 0) {
//                                                     setShowItemDropdown(false);
//                                                     setTimeout(() => {
//                                                         document.getElementById('discountPercentage')?.focus();
//                                                     }, 0);
//                                                 }
//                                             }
//                                         }}
//                                     />
//                                     {ItemDropdown}
//                                 </div>
//                             </div>
//                         </div>
//                         <div className="table-responsive">
//                             <table className="table table-bordered">
//                                 <thead>
//                                     <tr>
//                                         <th colSpan="6" className="text-center bg-light">Bill Details</th>
//                                     </tr>
//                                 </thead>
//                                 <tbody>
//                                     <tr>
//                                         <td><label htmlFor="subTotal">Sub Total:</label></td>
//                                         <td className="text-right">
//                                             <p className="form-control-plaintext">Rs. <span id="subTotal">{totals.subTotal.toFixed(2)}</span></p>
//                                         </td>
//                                         <td><label htmlFor="discountPercentage">Discount %:</label></td>
//                                         <td>
//                                             <input
//                                                 type="number"
//                                                 step="any"
//                                                 name="discountPercentage"
//                                                 id="discountPercentage"
//                                                 className="form-control"
//                                                 value={formData.discountPercentage}
//                                                 onChange={handleDiscountPercentageChange}
//                                                 onFocus={(e) => e.target.select()}
//                                                 onKeyDown={(e) => {
//                                                     if (e.key === 'Enter') {
//                                                         handleKeyDown(e, 'discountPercentage');
//                                                     }
//                                                 }}
//                                             />
//                                         </td>
//                                         <td><label htmlFor="discountAmount">Discount (Rs.):</label></td>
//                                         <td>
//                                             <input
//                                                 type="number"
//                                                 step="any"
//                                                 name="discountAmount"
//                                                 id="discountAmount"
//                                                 value={formData.discountAmount}
//                                                 className="form-control"
//                                                 onChange={handleDiscountAmountChange}
//                                                 onFocus={(e) => e.target.select()}
//                                                 onKeyDown={(e) => {
//                                                     if (e.key === 'Enter') {
//                                                         handleKeyDown(e, 'discountAmount');
//                                                     }
//                                                 }}
//                                             />
//                                         </td>
//                                     </tr>

//                                     {company.vatEnabled && formData.isVatExempt !== 'true' && (
//                                         <tr id="taxableAmountRow">
//                                             <td><label htmlFor="taxableAmount">Taxable Amount:</label></td>
//                                             <td className="text-right">
//                                                 <p className="form-control-plaintext">Rs. <span id="taxableAmount">{totals.taxableAmount.toFixed(2)}</span></p>
//                                             </td>
//                                             <td><label htmlFor="vatPercentage">VAT (13%):</label></td>
//                                             <td>
//                                                 <input
//                                                     type="number"
//                                                     name="vatPercentage"
//                                                     id="vatPercentage"
//                                                     className="form-control"
//                                                     value={formData.vatPercentage}
//                                                     readOnly
//                                                     onFocus={(e) => {
//                                                         e.target.select();
//                                                     }}
//                                                     onKeyDown={(e) => {
//                                                         if (e.key === 'Enter') {
//                                                             handleKeyDown(e, 'vatPercentage');
//                                                         }
//                                                     }}
//                                                 />
//                                             </td>
//                                             <td><label htmlFor="vatAmount">VAT Amount:</label></td>
//                                             <td className="text-right">
//                                                 <p className="form-control-plaintext">Rs. <span id="vatAmount">{totals.vatAmount.toFixed(2)}</span></p>
//                                             </td>
//                                         </tr>
//                                     )}
//                                     {/* Add empty cells to maintain table structure when exempt */}
//                                     {company.vatEnabled && formData.isVatExempt === 'true' && (
//                                         <>
//                                             <td colSpan="4"></td>
//                                         </>
//                                     )}

//                                     <tr>
//                                         <td><label htmlFor="roundOffAmount">Round Off:</label></td>
//                                         <td>
//                                             <input
//                                                 type="number"
//                                                 className="form-control"
//                                                 step="any"
//                                                 id="roundOffAmount"
//                                                 name="roundOffAmount"
//                                                 value={formData.roundOffAmount}
//                                                 onChange={(e) => setFormData({ ...formData, roundOffAmount: e.target.value })}
//                                                 onFocus={(e) => {
//                                                     e.target.select();
//                                                 }}
//                                                 onKeyDown={(e) => {
//                                                     if (e.key === 'Enter') {
//                                                         e.preventDefault();
//                                                         document.getElementById('saveBill')?.focus();
//                                                     }
//                                                 }}
//                                             />
//                                         </td>
//                                         <td><label htmlFor="totalAmount">Total Amount:</label></td>
//                                         <td>
//                                             <p className="form-control-plaintext">Rs. <span id="totalAmount">{totals.totalAmount.toFixed(2)}</span></p>
//                                         </td>
//                                         <td><label htmlFor="amountInWords">In Words:</label></td>
//                                         <td className="text-right">
//                                             <p className="form-control-plaintext" id="amountInWords">
//                                                 {convertToRupeesAndPaisa(totals.totalAmount)} Only.
//                                             </p>
//                                         </td>
//                                     </tr>
//                                 </tbody>
//                             </table>
//                         </div>

//                         {/* Action Buttons */}
//                         <div className="d-flex justify-content-end mt-4">
//                             {/* Add Print After Save Checkbox */}
//                             <div className="form-check me-3 align-self-center">
//                                 <input
//                                     className="form-check-input"
//                                     type="checkbox"
//                                     id="printAfterSave"
//                                     checked={printAfterSave}
//                                     onChange={handlePrintAfterSaveChange}
//                                 />
//                                 <label className="form-check-label" htmlFor="printAfterSave">
//                                     Print after save
//                                 </label>
//                             </div>

//                             <div className="d-flex justify-content-end gap-2">
//                                 <button
//                                     type="submit"
//                                     className="btn btn-primary btn-sm"
//                                     id="saveBill"
//                                     onClick={(e) => handleSubmit(e, printAfterSave)}
//                                     disabled={isSaving}
//                                 >
//                                     {isSaving ? (
//                                         <>
//                                             <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
//                                             Saving...
//                                         </>
//                                     ) : (
//                                         <>
//                                             <i className="bi bi-save me-1"></i> Save
//                                         </>
//                                     )}
//                                 </button>
//                             </div>
//                         </div>
//                     </form>
//                 </div>
//             </div>

//             {showAccountModal && (
//                 <div className="modal fade show" id="accountModal" tabIndex="-1" style={{ display: 'block' }}>
//                     <div className="modal-dialog modal-xl modal-dialog-centered">
//                         <div className="modal-content" style={{ height: '500px' }}>
//                             <div className="modal-header">
//                                 <h5 className="modal-title" id="accountModalLabel">Select or Enter Cash Account</h5>
//                                 <button
//                                     type="button"
//                                     className="btn-close"
//                                     onClick={() => setShowAccountModal(false)}
//                                 ></button>
//                             </div>
//                             <div className="p-3 bg-white sticky-top">
//                                 <input
//                                     type="text"
//                                     id="searchAccount"
//                                     autoComplete='off'
//                                     className="form-control form-control-lg"
//                                     placeholder="Type to search or enter new account name"
//                                     autoFocus
//                                     value={formData.cashAccount}
//                                     onChange={(e) => {
//                                         const value = e.target.value;
//                                         setFormData(prev => ({
//                                             ...prev,
//                                             cashAccount: value,
//                                             cashAccountAddress: '',
//                                             cashAccountPhone: ''
//                                         }));

//                                         // Filter accounts based on search
//                                         if (value === '') {
//                                             setFilteredAccounts([]);
//                                         } else {
//                                             const filtered = accounts.filter(account =>
//                                                 account.name.toLowerCase().includes(value.toLowerCase())
//                                             );
//                                             setFilteredAccounts(filtered);
//                                         }
//                                     }}
//                                     onKeyDown={(e) => {
//                                         if (e.key === 'ArrowDown') {
//                                             e.preventDefault();
//                                             const firstAccountItem = document.querySelector('.account-item');
//                                             if (firstAccountItem) {
//                                                 firstAccountItem.focus();
//                                             }
//                                         } else if (e.key === 'Enter') {
//                                             e.preventDefault();
//                                             // Always use the typed text when pressing Enter in the input
//                                             setShowAccountModal(false);
//                                             setTimeout(() => {
//                                                 addressRef.current?.focus();
//                                             }, 100);
//                                         }
//                                     }}
//                                     ref={accountSearchRef}
//                                 />
//                             </div>
//                             <div className="modal-body p-0">
//                                 <div className="overflow-auto" style={{ height: 'calc(400px - 120px)' }}>
//                                     <ul id="accountList" className="list-group">
//                                         {(filteredAccounts.length > 0 ? filteredAccounts : accounts).map((account, index) => (
//                                             <li
//                                                 key={account._id}
//                                                 data-account-id={account._id}
//                                                 className={`list-group-item account-item py-2`}
//                                                 onClick={() => {
//                                                     setFormData({
//                                                         ...formData,
//                                                         cashAccount: account.name,
//                                                         cashAccountAddress: account.address,
//                                                         cashAccountPhone: account.phone
//                                                     });
//                                                     setShowAccountModal(false);
//                                                     setTimeout(() => {
//                                                         addressRef.current?.focus();
//                                                     }, 100);
//                                                 }}
//                                                 style={{ cursor: 'pointer' }}
//                                                 tabIndex={0}
//                                                 onKeyDown={(e) => {
//                                                     if (e.key === 'ArrowDown') {
//                                                         e.preventDefault();
//                                                         const nextItem = e.target.nextElementSibling;
//                                                         if (nextItem) {
//                                                             e.target.classList.remove('active');
//                                                             nextItem.classList.add('active');
//                                                             nextItem.focus();
//                                                         }
//                                                     } else if (e.key === 'ArrowUp') {
//                                                         e.preventDefault();
//                                                         const prevItem = e.target.previousElementSibling;
//                                                         if (prevItem) {
//                                                             e.target.classList.remove('active');
//                                                             prevItem.classList.add('active');
//                                                             prevItem.focus();
//                                                         } else {
//                                                             accountSearchRef.current?.focus();
//                                                         }
//                                                     } else if (e.key === 'Enter') {
//                                                         e.preventDefault();
//                                                         setFormData({
//                                                             ...formData,
//                                                             cashAccount: account.name,
//                                                             cashAccountAddress: account.address,
//                                                             cashAccountPhone: account.phone
//                                                         });
//                                                         setShowAccountModal(false);
//                                                         setTimeout(() => {
//                                                             addressRef.current?.focus();
//                                                         }, 100);
//                                                     }
//                                                 }}
//                                                 onFocus={(e) => {
//                                                     document.querySelectorAll('.account-item').forEach(item => {
//                                                         item.classList.remove('active');
//                                                     });
//                                                     e.target.classList.add('active');
//                                                 }}
//                                             >
//                                                 <div className="d-flex justify-content-between small">
//                                                     <strong>{account.name}</strong>
//                                                     <span>📍 {account.address || 'N/A'} | 📞 {account.phone || 'N/A'}</span>
//                                                 </div>
//                                             </li>
//                                         ))}
//                                     </ul>
//                                 </div>
//                             </div>
//                             <div className="modal-footer">
//                                 <button
//                                     type="button"
//                                     className="btn btn-primary"
//                                     onClick={() => {
//                                         setShowAccountModal(false);
//                                         setTimeout(() => {
//                                             addressRef.current?.focus();
//                                         }, 100);
//                                     }}
//                                 >
//                                     Use Entered Name
//                                 </button>
//                                 <button
//                                     type="button"
//                                     className="btn btn-secondary"
//                                     onClick={() => setShowAccountModal(false)}
//                                 >
//                                     Cancel
//                                 </button>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             )}


//             {/* Transaction Modal */}
//             {
//                 showTransactionModal && (
//                     <div className="modal fade show" id="transactionModal" tabIndex="-1" style={{ display: 'block' }}>
//                         <div className="modal-dialog modal-lg">
//                             <div className="modal-content">
//                                 <div className="modal-header">
//                                     <h5 className="modal-title" id="transactionModalLabel">Last Transactions</h5>
//                                     <button type="button" className="close" onClick={() => setShowTransactionModal(false)}>
//                                         <span aria-hidden="true">&times;</span>
//                                     </button>
//                                 </div>
//                                 <div className="modal-body">
//                                     <ul id="transactionList" className="list-group">
//                                         {transactions.map((transaction, index) => (
//                                             <li key={index} className="list-group-item">
//                                                 <div className="d-flex justify-content-between">
//                                                     <div>
//                                                         <strong>Date:</strong> {new Date(transaction.date).toLocaleDateString()}<br />
//                                                         <strong>Bill No:</strong> {transaction.billNumber}<br />
//                                                         <strong>Type:</strong> {transaction.type}
//                                                     </div>
//                                                     <div>
//                                                         <strong>Qty:</strong> {transaction.quantity}<br />
//                                                         <strong>Rate:</strong> Rs.{Math.round(transaction.price * 100) / 100}<br />
//                                                         <strong>Unit:</strong> {transaction.unit?.name || 'N/A'}
//                                                     </div>
//                                                 </div>
//                                             </li>
//                                         ))}
//                                     </ul>
//                                 </div>
//                                 <div className="modal-footer">
//                                     <button
//                                         type="button"
//                                         className="btn btn-secondary"
//                                         id="closeModalButton"
//                                         onClick={() => setShowTransactionModal(false)}
//                                         onKeyDown={handleCloseButtonKeydown}
//                                     >
//                                         Close
//                                     </button>
//                                 </div>
//                             </div>
//                         </div>
//                     </div>
//                 )
//             }

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

//             {showAccountCreationModal && (
//                 <AccountCreationModal
//                     show={showAccountCreationModal}
//                     onClose={() => setShowAccountCreationModal(false)}
//                     onAccountCreated={handleAccountCreated}
//                     companyId={company?._id}
//                     fiscalYear={company?.fiscalYear?._id}
//                 />
//             )}
//         </div >
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

// export default AddCashSalesReturn;


//------------------------------------------------------------------end

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import NepaliDate from 'nepali-date-converter';
import axios from 'axios';
import Header from '../Header';
import '../../../stylesheet/retailer/salesReturn/AddCashSalesReturn.css';
import NotificationToast from '../../NotificationToast';
import '../../../stylesheet/noDateIcon.css'
import ProductModal from '../dashboard/modals/ProductModal';
import useDebounce from '../../../hooks/useDebounce';
import VirtualizedItemList from '../../VirtualizedItemList';
import AccountCreationModal from '../sales/AccountCreationModal';
import VirtualizedAccountList from '../../VirtualizedAccountList';

const AddCashSalesReturn = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [isAccountSearching, setIsAccountSearching] = useState(false);
    const [accountSearchResults, setAccountSearchResults] = useState([]);
    const [accountSearchPage, setAccountSearchPage] = useState(1);
    const [showProductModal, setShowProductModal] = useState(false);
    const [hasMoreAccountResults, setHasMoreAccountResults] = useState(false);
    const [totalAccounts, setTotalAccounts] = useState(0);
    const [accountSearchQuery, setAccountSearchQuery] = useState('');
    const [accountLastSearchQuery, setAccountLastSearchQuery] = useState('');
    const [accountShouldShowLastSearchResults, setAccountShouldShowLastSearchResults] = useState(false);
    const [lastSearchQuery, setLastSearchQuery] = useState('');
    const [shouldShowLastSearchResults, setShouldShowLastSearchResults] = useState(false);
    const debouncedSearchQuery = useDebounce(searchQuery, 50);
    const [showHeaderItemModal, setShowHeaderItemModal] = useState(false);
    const [headerLastSearchQuery, setHeaderLastSearchQuery] = useState('');
    const [headerShouldShowLastSearchResults, setHeaderShouldShowLastSearchResults] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [searchPage, setSearchPage] = useState(1);
    const [hasMoreSearchResults, setHasMoreSearchResults] = useState(false);
    const [totalSearchItems, setTotalSearchItems] = useState(0);
    const [isHeaderSearching, setIsHeaderSearching] = useState(false);
    const [headerSearchResults, setHeaderSearchResults] = useState([]);
    const [headerSearchPage, setHeaderSearchPage] = useState(1);
    const [hasMoreHeaderSearchResults, setHasMoreHeaderSearchResults] = useState(false);
    const [totalHeaderSearchItems, setTotalHeaderSearchItems] = useState(0);
    const [headerSearchQuery, setHeaderSearchQuery] = useState('');
    const [showHeaderItemDropdown, setShowHeaderItemDropdown] = useState(false);
    const [selectedItemForInsert, setSelectedItemForInsert] = useState(null);
    const [selectedItemQuantity, setSelectedItemQuantity] = useState(0);
    const [selectedItemRate, setSelectedItemRate] = useState(0);
    const [selectedItemDescription, setSelectedItemDescription] = useState('');
    // Add these state variables
    const [selectedItemBatchNumber, setSelectedItemBatchNumber] = useState('');
    const [selectedItemExpiryDate, setSelectedItemExpiryDate] = useState('');
    const transactionDateRef = useRef(null);
    const [isInitialDataLoaded, setIsInitialDataLoaded] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const addressRef = useRef(null);
    const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
    const itemsTableRef = useRef(null);
    const [showItemsModal, setShowItemsModal] = useState(false);
    const [pollInterval, setPollInterval] = useState(null);
    const [notification, setNotification] = useState({
        show: false,
        message: '',
        type: 'success'
    });
    const [dateErrors, setDateErrors] = useState({
        transactionDateNepali: '',
        nepaliDate: ''
    });
    const [showAccountCreationModal, setShowAccountCreationModal] = useState(false);
    const [printAfterSave, setPrintAfterSave] = useState(
        localStorage.getItem('printAfterSaveCashSalesReturn') === 'true' || false
    );

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
        description: '',
        items: []
    });

    const [items, setItems] = useState([]);
    const [allItems, setAllItems] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [filteredAccounts, setFilteredAccounts] = useState([]);
    const [showAccountModal, setShowAccountModal] = useState(false);
    const [showItemDropdown, setShowItemDropdown] = useState(false);
    const [showTransactionModal, setShowTransactionModal] = useState(false);
    const [transactions, setTransactions] = useState([]);
    const [filteredItems, setFilteredItems] = useState([]);
    const itemDropdownRef = useRef(null);
    const [company, setCompany] = useState({
        dateFormat: 'nepali',
        vatEnabled: true,
        fiscalYear: {}
    });
    const [nextBillNumber, setNextBillNumber] = useState('');

    const accountSearchRef = useRef(null);
    const itemSearchRef = useRef(null);
    const accountModalRef = useRef(null);
    const transactionModalRef = useRef(null);

    const api = axios.create({
        baseURL: process.env.REACT_APP_API_BASE_URL,
        withCredentials: true,
    });

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

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const numberResponse = await api.get('/api/retailer/cash/sales-return/next-number');
                setFormData(prev => ({
                    ...prev,
                    billNumber: numberResponse.data.data.nextSalesReturnBillNumber
                }));

                const response = await api.get('/api/retailer/cash/sales-return');
                const { data } = response;

                setCompany(data.data.company);
                setNextBillNumber(data.data.nextSalesReturnBillNumber);
                fetchAccountsFromBackend('', 1);
                setIsInitialDataLoaded(true);
            } catch (error) {
                console.error('Error fetching initial data:', error);
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
        if (showItemDropdown) {
            setSearchPage(1);
            fetchItemsFromBackend(debouncedSearchQuery, 1, false);
        }
    }, [debouncedSearchQuery, formData.isVatExempt, showItemDropdown]);

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

    const handleAccountCreated = async (newAccountData) => {
        try {
            fetchAccountsFromBackend('', 1);

            if (newAccountData?.name) {
                setFormData({
                    ...formData,
                    cashAccount: newAccountData.name,
                    cashAccountId: newAccountData._id,
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
            setNotification({
                show: true,
                message: 'Error refreshing accounts list',
                type: 'error'
            });
        }
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

    const selectAccount = (account) => {
        setFormData({
            ...formData,
            cashAccount: account.name,
            cashAccountId: account._id,
            cashAccountAddress: account.address || '',
            cashAccountPan: account.pan || '',
            cashAccountEmail: account.email || '',
            cashAccountPhone: account.phone || ''
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

    const addItemToBill = (item) => {
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
            batchNumber: 'XXX',
            expiryDate: getDefaultExpiryDate(),
            quantity: 0,
            unit: item.unit,
            price: Math.round(firstStockEntry.price * 100) / 100,
            amount: 0,
            vatStatus: item.vatStatus
        };

        setItems([...items, newItem]);
        setShowItemDropdown(false);

        setSearchQuery('');
        if (itemSearchRef.current) {
            itemSearchRef.current.value = '';
        }

        setTimeout(() => {
            document.getElementById(`batchNumber-${items.length}`)?.focus();
        }, 100);
    };

    const getDefaultExpiryDate = () => {
        const today = new Date();
        today.setFullYear(today.getFullYear() + 2);
        return today.toISOString().split('T')[0];
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

    useEffect(() => {
        if (itemsTableRef.current && items.length > 0) {
            setTimeout(() => {
                itemsTableRef.current.scrollTop = itemsTableRef.current.scrollHeight;
            }, 10);
        }
    }, [items]);

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

    const resetForm = async () => {
        try {
            setIsLoading(true);
            const response = await api.get('/api/retailer/cash/sales-return');
            const { data } = response;

            const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
            const currentRomanDate = new Date().toISOString().split('T')[0];

            setFormData({
                cashAccount: '',
                cashAccountAddress: '',
                cashAccountPan: '',
                cashAccountEmail: '',
                cashAccountPhone: '',
                transactionDateNepali: currentNepaliDate,
                transactionDateRoman: currentRomanDate,
                nepaliDate: currentNepaliDate,
                billDate: currentRomanDate,
                billNumber: data.data.nextSalesReturnBillNumber,
                paymentMode: 'cash',
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
            fetchAccountsFromBackend('', 1);

            setItems([]);
            setSearchQuery('');
            setSearchResults([]);
            setSearchPage(1);
            setHasMoreSearchResults(false);
            setTotalSearchItems(0);
            setShowItemDropdown(false);

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

    const handleSubmit = async (e, print = false) => {
        if (e) {
            e.preventDefault();
        }

        setIsSaving(true);

        try {
            const billData = {
                cashAccount: formData.cashAccount,
                cashAccountAddress: formData.cashAccountAddress,
                cashAccountPan: formData.cashAccountPan,
                cashAccountEmail: formData.cashAccountEmail,
                cashAccountPhone: formData.cashAccountPhone,
                items: items.map(item => ({
                    item: item.item,
                    batchNumber: item.batchNumber,
                    expiryDate: item.expiryDate,
                    quantity: item.quantity,
                    unit: item.unit?._id,
                    price: item.price,
                    vatStatus: item.vatStatus
                })),
                vatPercentage: formData.vatPercentage,
                transactionDateNepali: formData.transactionDateNepali,
                transactionDateRoman: formData.transactionDateRoman,
                billDate: formData.billDate,
                nepaliDate: formData.nepaliDate,
                isVatExempt: formData.isVatExempt,
                discountPercentage: formData.discountPercentage,
                paymentMode: formData.paymentMode,
                roundOffAmount: formData.roundOffAmount,
                description: formData.description,
                print
            };

            const response = await api.post('/api/retailer/cash/sales-return', billData);

            if (response.data.success) {
                setNotification({
                    show: true,
                    message: 'Sales return saved successfully!',
                    type: 'success'
                });

                if (print && response.data.data?.bill?._id) {
                    setIsSaving(false);
                    await printImmediately(response.data.data.bill._id);
                    setTimeout(() => {
                        resetForm();
                    }, 1000);
                } else {
                    setIsSaving(false);
                    resetForm();
                }
            } else {
                setNotification({
                    show: true,
                    message: response.data.error || 'Failed to save sales return',
                    type: 'error'
                });
                setIsSaving(false);
            }
        } catch (error) {
            console.error('Error saving sales return:', error);
            setNotification({
                show: true,
                message: error.response?.data?.error || 'Failed to save sales return. Please try again.',
                type: 'error'
            });
            setIsSaving(false);
        }
    };

    const handlePrintAfterSaveChange = (e) => {
        const isChecked = e.target.checked;
        setPrintAfterSave(isChecked);
        localStorage.setItem('printAfterSaveCashSalesReturn', isChecked);
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
                            <div class="print-company-name">${printData.currentCompanyName}</div>
                            <div class="print-company-details">
                                ${printData.currentCompany.address} | Tel: ${printData.currentCompany.phone} | PAN: ${printData.currentCompany.pan}
                            </div>
                            <div class="print-invoice-title">SALES RETURN</div>
                        </div>

                        <div class="print-invoice-details">
                            <div>
                                <div><strong>M/S:</strong> ${printData.bill.cashAccount || 'Account Not Found'}</div>
                                <div><strong>Address:</strong> ${printData.bill.cashAccountAddress || 'N/A'}</div>
                                <div><strong>PAN:</strong> ${printData.bill.cashAccountPan || 'N/A'} | <strong>Tel:</strong> ${printData.bill.cashAccountPhone || 'N/A'}</div>
                                <div><strong>Email:</strong> ${printData.bill.cashAccountEmail || 'N/A'}</div>
                            </div>
                            <div>
                                <div><strong>Invoice No:</strong> ${printData.bill.billNumber}</div>
                                <div><strong>Transaction Date:</strong> ${new Date(printData.bill.transactionDate).toLocaleDateString()}</div>
                                <div><strong>Invoice Issue Date:</strong> ${new Date(printData.bill.date).toLocaleDateString()}</div>
                                <div><strong>Mode of Payment:</strong> ${printData.bill.paymentMode}</div>
                            </div>
                        </div>

                        <table class="print-invoice-table">
                            <thead>
                                <tr>
                                    <th>S.N.</th>
                                    <th>#</th>
                                    <th>HSN</th>
                                    <th>Description of Goods</th>
                                    <th>Unit</th>
                                    <th>Batch</th>
                                    <th>Expiry</th>
                                    <th>Qty</th>
                                    <th>Price (Rs.)</th>
                                    <th>Total (Rs.)</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${printData.bill.items.map((item, i) => `
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
                                        <td>${item.item.unit?.name || ''}</td>
                                        <td>${item.batchNumber}</td>
                                        <td>${item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'N/A'}</td>
                                        <td>${item.quantity}</td>
                                        <td>${item.price.toFixed(2)}</td>
                                        <td>${(item.quantity * item.price).toFixed(2)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                            <tr>
                                <td colSpan="11" style="borderBottom: '1px dashed #000'"></td>
                            </tr>
                        </table>

                        <table class="print-totals-table">
                            <tbody>
                                <tr>
                                    <td><strong>Sub-Total:</strong></td>
                                    <td class="print-text-right">${printData.bill.subTotal.toFixed(2)}</td>
                                </tr>
                                <tr>
                                    <td><strong>Discount:</strong></td>
                                    <td class="print-text-right">${printData.bill.discountAmount.toFixed(2)}</td>
                                </tr>
                                <tr>
                                    <td><strong>Non-Taxable:</strong></td>
                                    <td class="print-text-right">${printData.bill.nonVatSalesReturn.toFixed(2)}</td>
                                </tr>
                                <tr>
                                    <td><strong>Taxable Amount:</strong></td>
                                    <td class="print-text-right">${printData.bill.taxableAmount.toFixed(2)}</td>
                                </tr>
                                ${!printData.bill.isVatExempt ? `
                                    <tr>
                                        <td><strong>VAT (${printData.bill.vatPercentage}%):</strong></td>
                                        <td class="print-text-right">${(printData.bill.taxableAmount * printData.bill.vatPercentage / 100).toFixed(2)}</td>
                                    </tr>
                                ` : ''}
                                <tr>
                                    <td><strong>Round Off:</strong></td>
                                    <td class="print-text-right">${printData.bill.roundOffAmount.toFixed(2)}</td>
                                </tr>
                                <tr>
                                    <td><strong>Grand Total:</strong></td>
                                    <td class="print-text-right">${printData.bill.totalAmount.toFixed(2)}</td>
                                </tr>
                            </tbody>
                        </table>

                        <div class="print-amount-in-words">
                            <strong>In Words:</strong> ${convertToRupeesAndPaisa(printData.bill.totalAmount)} Only.
                        </div>
                        <br /><br />
                        <div class="print-signature-area">
                            <div class="print-signature-box">Received By</div>
                            <div class="print-signature-box">Prepared By: ${printData.bill.user.name}</div>
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
                .print-invoice-container {
                    width: 100%;
                    max-width: 210mm;
                    margin: 0 auto;
                    padding: 2mm;
                }
                .print-invoice-header {
                    text-align: center;
                    margin-bottom: 3mm;
                    border-bottom: 1px dashed #000;
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
                    border-top: 1px dashed #000;
                    border-bottom: 1px dashed #000;
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
                    border-top: 1px dashed #000;
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
                        <title>Cash_Sales_Return_${printData.bill.billNumber}</title>
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

    const formatter = new Intl.NumberFormat('en-NP', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

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

    // const handleHeaderSearchFocus = () => {
    //     if (headerLastSearchQuery && !headerSearchQuery) {
    //         setHeaderShouldShowLastSearchResults(true);
    //         if (headerLastSearchQuery.trim() !== '') {
    //             fetchItemsFromBackend(headerLastSearchQuery, 1, true);
    //         }
    //     }
    // };

    const handleHeaderSearchFocus = () => {
        setShowHeaderItemModal(true);

        if (headerLastSearchQuery && !headerSearchQuery) {
            setHeaderShouldShowLastSearchResults(true);
            if (headerLastSearchQuery.trim() !== '') {
                fetchItemsFromBackend(headerLastSearchQuery, 1, true);
            }
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

        // Set default values for batch and expiry
        setSelectedItemBatchNumber('XXX');
        setSelectedItemExpiryDate(getDefaultExpiryDate());

        setTimeout(() => {
            const headerBatchInput = document.getElementById('headerBatch');
            if (headerBatchInput) {
                headerBatchInput.focus();
                headerBatchInput.select();
            }
        }, 100);
    };

    const insertSelectedItem = () => {
        if (!selectedItemForInsert) return;

        // Validate required fields
        if (!validateHeaderFields()) {
            return;
        }

        const sortedStockEntries = selectedItemForInsert.stockEntries.sort((a, b) => new Date(a.date) - new Date(b.date));
        const firstStockEntry = sortedStockEntries[0] || {};

        const newItem = {
            item: selectedItemForInsert._id,
            uniqueNumber: selectedItemForInsert.uniqueNumber || 'N/A',
            hscode: selectedItemForInsert.hscode,
            name: selectedItemForInsert.name,
            category: selectedItemForInsert.category?.name || 'No Category',
            batchNumber: 'XXX',
            expiryDate: getDefaultExpiryDate(),
            quantity: selectedItemQuantity || 0,
            unit: selectedItemForInsert.unit,
            price: selectedItemRate || Math.round(firstStockEntry.price * 100) / 100,
            amount: (selectedItemQuantity || 0) * (selectedItemRate || Math.round(firstStockEntry.price * 100) / 100),
            vatStatus: selectedItemForInsert.vatStatus,
            description: selectedItemDescription || ''
        };

        setItems([...items, newItem]);

        setSelectedItemForInsert(null);
        setSelectedItemQuantity(0);
        setSelectedItemRate(0);
        setSelectedItemBatchNumber('');
        setSelectedItemExpiryDate('');
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

    const handleAccountModalClose = () => {
        setShowAccountModal(false);
    };

    const handleAccountCreationModalClose = () => {
        setShowAccountCreationModal(false);
        setShowAccountModal(true);
        fetchAccountsFromBackend('', 1);
    };

    return (
        <div className="container-fluid">
            <Header />
            <div className="card mt-2 shadow-lg p-2 animate__animated animate__fadeInUp expanded-card ledger-card compact">
                <div className="card-header">
                    <div className="d-flex justify-content-between align-items-center">
                        <h2 className="card-title mb-0">
                            <i className="bi bi-file-text me-2"></i>
                            Cash Sales Return
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
                            {/* Party Name Field */}
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

                            {/* Party Address Field */}
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

                            {/* VAT No Field */}
                            <div className="col-12 col-md-2">
                                <div className="position-relative">
                                    <input
                                        type="text"
                                        id="cashAccountPan"
                                        name="cashAccountPan"
                                        className="form-control form-control-sm"
                                        value={formData.cashAccountPan}
                                        onChange={(e) => setFormData({ ...formData, cashAccountPan: e.target.value })}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleKeyDown(e, 'cashAccountPan');
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
                                                id='headerQuantity'
                                                value={selectedItemQuantity}
                                                onChange={(e) => setSelectedItemQuantity(e.target.value)}
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
                                            {selectedItemForInsert ? (selectedItemForInsert.unit?.name || 'N/A') : '-'}
                                        </td>
                                        <td width="8%" style={{ padding: '2px', backgroundColor: '#ffffff' }}>
                                            <input
                                                type="number"
                                                className="form-control form-control-sm"
                                                placeholder="Rate"
                                                id='headerRate'
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
                                        <th width="10%" style={{ padding: '3px', fontSize: '0.75rem' }}>Batch</th>
                                        <th width="10%" style={{ padding: '3px', fontSize: '0.75rem' }}>Expiry</th>
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
                                                    name={`items[${index}][batchNumber]`}
                                                    className="form-control form-control-sm item-batchNumber"
                                                    id={`batchNumber-${index}`}
                                                    value={item.batchNumber}
                                                    onChange={(e) => updateItemField(index, 'batchNumber', e.target.value)}
                                                    onFocus={(e) => e.target.select()}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            document.getElementById(`expiryDate-${index}`)?.focus();
                                                        }
                                                    }}
                                                    required
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
                                                    className="form-control form-control-sm item-expiryDate"
                                                    id={`expiryDate-${index}`}
                                                    value={item.expiryDate}
                                                    onChange={(e) => updateItemField(index, 'expiryDate', e.target.value)}
                                                    onFocus={(e) => e.target.select()}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            document.getElementById(`quantity-${index}`)?.focus();
                                                        }
                                                    }}
                                                    required
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
                                                    onFocus={(e) => e.target.select()}
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
                                    {/* Row 1: Sub Total, Discount %, Discount Amount */}
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

                                    {/* Row 3: Round Off, Total Amount, In Words */}
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
                            {/* Description Field - Left side */}
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

                            {/* Checkbox and Action Buttons - Right side */}
                            <div className="col-md-4 col-lg-3">
                                <div className="d-flex justify-content-between align-items-center h-100">
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
                                            onClick={resetForm}
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
                                document.getElementById('cashAccountAddress').focus();
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
                                                    document.getElementById('cashAccountAddress').focus();
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
                                            document.getElementById('cashAccountAddress').focus();
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

export default AddCashSalesReturn;
