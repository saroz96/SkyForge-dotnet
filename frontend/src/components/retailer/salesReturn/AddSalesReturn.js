// import React, { useState, useEffect, useRef } from 'react';
// import { useNavigate } from 'react-router-dom';
// import NepaliDate from 'nepali-date-converter';
// import axios from 'axios';
// import Header from '../Header';
// import '../../../stylesheet/retailer/salesReturn/AddSalesReturn.css';
// import NotificationToast from '../../NotificationToast';
// import { usePageNotRefreshContext } from '../PageNotRefreshContext';
// import { calculateExpiryStatus } from '../dashboard/modals/ExpiryStatus';
// import '../../../stylesheet/noDateIcon.css'
// import ProductModal from '../dashboard/modals/ProductModal';
// import AccountBalanceDisplay from '../payment/AccountBalanceDisplay';
// import useDebounce from '../../../hooks/useDebounce';
// import VirtualizedItemList from '../../VirtualizedItemList';

// const AddSalesReturn = () => {
//     // const { draftSave, setDraftSave, clearDraft } = usePageNotRefreshContext();
//     const { draftCreditSalesReturnSave, setDraftCreditSalesReturnSave, clearCreditSalesReturnDraft } = usePageNotRefreshContext();
//     const navigate = useNavigate();
//     const [transactionSettings, setTransactionSettings] = useState({
//         displayTransactions: false,
//         displayTransactionsForPurchase: false,
//         displayTransactionsForSalesReturn: false,
//         displayTransactionsForPurchaseReturn: false
//     });
//     const [showItemsModal, setShowItemsModal] = useState(false);
//     const itemsTableRef = useRef(null);
//     // Add this state near your other state declarations
//     const [printAfterSave, setPrintAfterSave] = useState(
//         localStorage.getItem('printAfterSaveSalesReturn') === 'true' || false
//     );
//     // Add to your existing state declarations
//     const [salesInvoiceData, setSalesInvoiceData] = useState(null);
//     const [salesInvoiceLoading, setSalesInvoiceLoading] = useState(false);
//     const [showAccountCreationModal, setShowAccountCreationModal] = useState(false);
//     const [pollInterval, setPollInterval] = useState(null);

//     // Add these state variables with your existing state declarations
//     const [searchQuery, setSearchQuery] = useState('');
//     const [lastSearchQuery, setLastSearchQuery] = useState(''); // Store the last search
//     const [shouldShowLastSearchResults, setShouldShowLastSearchResults] = useState(false);
//     const debouncedSearchQuery = useDebounce(searchQuery, 50);

//     const [showProductModal, setShowProductModal] = useState(false);
//     const [loadingItems, setLoadingItems] = useState(new Set());
//     const continueButtonRef = useRef(null);
//     const [transactionCache, setTransactionCache] = useState(new Map());
//     const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
//     const transactionDateRef = useRef(null);
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
//     const [formData, setFormData] = useState(draftCreditSalesReturnSave?.formData || {
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
//         salesInvoiceNumber: '',
//         items: []
//     });

//     const [items, setItems] = useState(draftCreditSalesReturnSave?.items || []);
//     const [allItems, setAllItems] = useState([]);
//     const [salesInvoices, setSalesInvoices] = useState([]);
//     const [accounts, setAccounts] = useState(draftCreditSalesReturnSave?.accounts || []);
//     const [filteredAccounts, setFilteredAccounts] = useState([]);
//     const [showAccountModal, setShowAccountModal] = useState(false);
//     const [showItemDropdown, setShowItemDropdown] = useState(false);
//     const [showTransactionModal, setShowTransactionModal] = useState(false);
//     const [transactions, setTransactions] = useState([]);
//     const [filteredItems, setFilteredItems] = useState([]);
//     const itemDropdownRef = useRef(null);

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
//         if (formData.accountId || items.length > 0) {
//             setDraftCreditSalesReturnSave({
//                 formData,
//                 items,
//                 accounts
//             });
//         }
//     }, [formData, items, accounts, setDraftCreditSalesReturnSave]);

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
//         const fetchInitialData = async () => {
//             try {
//                 const response = await api.get('/api/retailer/sales-return');
//                 const { data } = response;

//                 const sortedAccounts = data.data.accounts.sort((a, b) => a.name.localeCompare(b.name));
//                 const sortedItems = data.data.items.sort((a, b) => a.name.localeCompare(b.name));

//                 setCompany(data.data.company);
//                 setAllItems(sortedItems);
//                 setAccounts(sortedAccounts);
//                 setSalesInvoices(data.data.salesInvoices || []);
//                 setNextBillNumber(data.data.nextSalesReturnNumber);

//                 setFormData(prev => ({
//                     ...prev,
//                     billNumber: data.data.nextSalesReturnNumber
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
//         const fetchTransactionSettings = async () => {
//             try {
//                 const response = await api.get('/api/retailer/get-display-sales-return-transactions');
//                 if (response.data.success) {
//                     setTransactionSettings(response.data.data);
//                 }
//             } catch (error) {
//                 console.error('Error fetching transaction settings:', error);
//             }
//         };
//         fetchTransactionSettings();
//     }, []);

//     // Add this useEffect to handle modal focus
//     useEffect(() => {
//         if (showTransactionModal && continueButtonRef.current) {
//             // Small timeout to ensure modal is fully rendered
//             const timer = setTimeout(() => {
//                 continueButtonRef.current.focus();
//             }, 100);

//             return () => clearTimeout(timer);
//         }
//     }, [showTransactionModal]);

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

//     // Add this function to close account creation modal
//     const handleAccountCreationModalClose = () => {
//         setShowAccountCreationModal(false);
//         setShowAccountModal(true);

//         // Refresh accounts data
//         fetchAccounts();
//     };

//     const handleAccountSearch = (e) => {
//         const searchText = e.target.value.toLowerCase();
//         const filtered = accounts.filter(account =>
//             account.name.toLowerCase().includes(searchText) ||
//             (account.uniqueNumber && account.uniqueNumber.toString().toLowerCase().includes(searchText))
//         ).sort((a, b) => a.name.localeCompare(b.name));

//         setFilteredAccounts(filtered);
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
//         const query = e.target.value.toLowerCase();
//         setSearchQuery(query);

//         // When user starts typing, disable showing last search results
//         if (query.length > 0) {
//             setShouldShowLastSearchResults(false);
//         }

//         setShowItemDropdown(true);
//     };

//     const fetchSalesBillDetails = async (e) => {
//         const invoiceNumber = e?.target?.value || formData.salesInvoiceNumber;

//         if (!invoiceNumber) return;

//         setSalesInvoiceLoading(true);
//         try {
//             const response = await api.get(`/api/retailer/sales-bill-by-number/${invoiceNumber}`);

//             if (response.data.success) {
//                 const billData = response.data.data.bill;

//                 // Check if this is a credit sales bill
//                 if (billData.billType !== 'credit') {
//                     setSalesInvoiceLoading(false);

//                     setNotification({
//                         show: true,
//                         message: `Bill ${invoiceNumber} is not a credit sales bill. Please check the bill type.`,
//                         type: 'warning'
//                     });

//                     setFormData(prev => ({ ...prev, salesInvoiceNumber: '' }));
//                     setSalesInvoiceData(null);
//                     setItems([]);

//                     return;
//                 }

//                 // Check if this bill already has existing returns
//                 if (billData.hasExistingReturns && billData.existingReturns.length > 0) {
//                     setSalesInvoiceLoading(false);

//                     // Show detailed warning message
//                     const returnDetails = billData.existingReturns
//                         .map((ret, idx) =>
//                             `Return ${idx + 1}: ${ret.billNumber} (${new Date(ret.date).toLocaleDateString()}) - Rs. ${ret.totalAmount?.toFixed(2) || '0.00'}`
//                         )
//                         .join('\n');

//                     setNotification({
//                         show: true,
//                         message: `⚠️ Sales return already exists for invoice ${invoiceNumber}!\n\nExisting Returns:\n${returnDetails}\n\nYou cannot create another return for the same invoice.`,
//                         type: 'warning'
//                     });

//                     // Clear the input field
//                     setFormData(prev => ({ ...prev, salesInvoiceNumber: '' }));

//                     // Clear any loaded data
//                     setSalesInvoiceData(null);
//                     setItems([]);

//                     return;
//                 }

//                 // Check if bill is fully returned
//                 if (billData.isFullyReturned) {
//                     setSalesInvoiceLoading(false);

//                     setNotification({
//                         show: true,
//                         message: `All items from invoice ${invoiceNumber} have already been returned.`,
//                         type: 'warning'
//                     });

//                     setFormData(prev => ({ ...prev, salesInvoiceNumber: '' }));
//                     setSalesInvoiceData(null);
//                     setItems([]);

//                     return;
//                 }

//                 // Calculate VAT status based on items in the bill
//                 let isVatExemptValue = 'all'; // Default to 'all'

//                 if (billData.items && billData.items.length > 0) {
//                     // Get all vat statuses from items
//                     const vatStatuses = billData.items.map(item => {
//                         return item.item?.vatStatus || item.vatStatus || 'vatable';
//                     });

//                     console.log('VAT statuses in bill:', vatStatuses);

//                     // Check if all items are vatable
//                     const allVatable = vatStatuses.every(status => status === 'vatable');
//                     // Check if all items are vatExempt
//                     const allVatExempt = vatStatuses.every(status => status === 'vatExempt');

//                     console.log('All vatable?', allVatable);
//                     console.log('All vatExempt?', allVatExempt);

//                     // Apply logic:
//                     if (allVatable) {
//                         isVatExemptValue = 'false'; // All items are vatable, so show 13%
//                     } else if (allVatExempt) {
//                         isVatExemptValue = 'true'; // All items are exempt, so show Exempt
//                     } else {
//                         isVatExemptValue = 'all'; // Mixed items, show All
//                     }

//                     console.log('Setting isVatExempt to:', isVatExemptValue);
//                 }

//                 // Update account information
//                 setFormData(prev => ({
//                     ...prev,
//                     accountId: billData.account?._id || '',
//                     accountName: billData.account?.name || '',
//                     accountAddress: billData.account?.address || '',
//                     accountPan: billData.account?.pan || '',
//                     // Copy bill summary details
//                     discountPercentage: billData.billSummary?.discountPercentage || 0,
//                     discountAmount: billData.billSummary?.discountAmount || 0,
//                     vatPercentage: billData.billSummary?.vatPercentage || 13,
//                     paymentMode: billData.billSummary?.paymentMode || 'credit',
//                     isVatExempt: isVatExemptValue, // Use calculated value
//                     roundOffAmount: billData.billSummary?.roundOffAmount || 0,
//                     salesInvoiceNumber: invoiceNumber // Ensure this is set
//                 }));

//                 // CRITICAL FIX: Transform items correctly
//                 const transformedItems = billData.items.map((item, index) => {
//                     console.log(`Processing item ${index}:`, {
//                         itemData: item,
//                         unitType: typeof item.unit,
//                         unitValue: item.unit,
//                         expiryDateType: typeof item.expiryDate,
//                         expiryDateValue: item.expiryDate,
//                         vatStatus: item.item?.vatStatus || item.vatStatus
//                     });

//                     // Handle unit - ensure it has the correct structure
//                     let unit = item.unit;
//                     if (unit && typeof unit === 'string') {
//                         // If unit is just an ID string, convert to object format
//                         unit = { _id: unit };
//                     } else if (unit && unit._id) {
//                         // Already in correct format, keep as is
//                         unit = { _id: unit._id, name: unit.name || '' };
//                     } else {
//                         // Default unit structure
//                         unit = { _id: null, name: '' };
//                     }

//                     // Handle expiry date - convert to YYYY-MM-DD format
//                     let expiryDate = item.expiryDate;
//                     if (expiryDate) {
//                         if (typeof expiryDate === 'string' && expiryDate.includes('T')) {
//                             // ISO string like "2027-11-28T00:00:00.000Z"
//                             expiryDate = expiryDate.split('T')[0];
//                         } else if (expiryDate instanceof Date) {
//                             // Date object
//                             expiryDate = expiryDate.toISOString().split('T')[0];
//                         }
//                         // If it's already in YYYY-MM-DD format, keep it
//                     } else {
//                         // No expiry date, use default
//                         expiryDate = getDefaultExpiryDate();
//                     }

//                     // Use available quantity as default, but user can change it
//                     const defaultQuantity = Math.max(0, item.availableQuantity || 0);

//                     return {
//                         item: item.item?._id || item.item,
//                         _id: item.item?._id || item.item, // Add _id for reference
//                         uniqueNumber: item.item?.uniqueNumber || '',
//                         hscode: item.item?.hscode || '',
//                         name: item.item?.name || '',
//                         batchNumber: item.batchNumber || 'XXX',
//                         expiryDate: expiryDate,
//                         quantity: defaultQuantity,
//                         unit: unit, // Now correctly formatted
//                         price: item.originalPrice || item.price || item.item?.sellingPrice || 0,
//                         amount: (defaultQuantity * (item.originalPrice || item.price || item.item?.sellingPrice || 0)).toFixed(2),
//                         vatStatus: item.item?.vatStatus || item.vatStatus || 'vatable',
//                         // DON'T include these fields in the final submission
//                         // They're only for reference
//                         _originalQuantity: item.originalQuantity,
//                         _availableQuantity: item.availableQuantity,
//                         _returnedQuantity: item.returnedQuantity
//                     };
//                 });

//                 console.log('Transformed items:', transformedItems);
//                 console.log('First transformed item unit:', transformedItems[0]?.unit);
//                 console.log('Setting VAT dropdown to:', isVatExemptValue);

//                 setItems(transformedItems);
//                 setSalesInvoiceData(billData);

//                 setNotification({
//                     show: true,
//                     message: `✅ Sales bill ${invoiceNumber} loaded successfully. ${transformedItems.length} items found.}`,
//                     type: 'success'
//                 });

//                 // Focus on first item's quantity
//                 setTimeout(() => {
//                     if (transformedItems.length > 0) {
//                         const batchNumberInput = document.getElementById(`batchNumber-0`);
//                         if (batchNumberInput) {
//                             batchNumberInput.focus();
//                             batchNumberInput.select();
//                         }
//                     }
//                 }, 100);

//             } else {
//                 // Handle specific error cases from backend
//                 const errorData = response.data;

//                 if (errorData.isCashSales) {
//                     // This is a cash sales bill
//                     setNotification({
//                         show: true,
//                         message: `❌ ${invoiceNumber} is a Cash Sales bill!\n\nCash Account: ${errorData.cashAccount || 'N/A'}\nAddress: ${errorData.cashAccountAddress || 'N/A'}\n\nCash sales returns should be created from the Cash Sales Return section.`,
//                         type: 'error'
//                     });
//                 } else if (errorData.isCreditSales === false) {
//                     // Not a valid credit sales bill
//                     setNotification({
//                         show: true,
//                         message: `❌ ${invoiceNumber} is not a valid credit sales bill.\nPlease check the bill type.`,
//                         type: 'error'
//                     });
//                 } else {
//                     // Generic error
//                     setNotification({
//                         show: true,
//                         message: errorData.error || 'Sales bill not found',
//                         type: 'error'
//                     });
//                 }

//                 // Clear the input field on error
//                 setFormData(prev => ({ ...prev, salesInvoiceNumber: '' }));
//                 setSalesInvoiceData(null);
//                 setItems([]);
//             }
//         } catch (error) {
//             console.error('Error fetching sales bill:', error);

//             // Check for specific error responses from backend
//             if (error.response?.data?.isCashSales) {
//                 const errorData = error.response.data;
//                 setNotification({
//                     show: true,
//                     message: `❌ ${invoiceNumber} is a Cash Sales bill!\n\nCash Account: ${errorData.cashAccount || 'N/A'}\nAddress: ${errorData.cashAccountAddress || 'N/A'}\n\nCash sales returns should be created from the Cash Sales Return section.`,
//                     type: 'error'
//                 });
//             } else if (error.response?.data?.isCreditSales === false) {
//                 setNotification({
//                     show: true,
//                     message: `❌ ${invoiceNumber} is not a valid credit sales bill.\nPlease check the bill type.`,
//                     type: 'error'
//                 });
//             } else if (error.response?.data?.error) {
//                 setNotification({
//                     show: true,
//                     message: error.response.data.error,
//                     type: 'error'
//                 });
//             } else {
//                 setNotification({
//                     show: true,
//                     message: 'Error fetching sales bill details',
//                     type: 'error'
//                 });
//             }

//             // Clear the input field on error
//             setFormData(prev => ({ ...prev, salesInvoiceNumber: '' }));
//             setSalesInvoiceData(null);
//             setItems([]);
//         } finally {
//             setSalesInvoiceLoading(false);
//         }
//     };

//     const addItemToBill = async (item) => {
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
//             price: item.latestPrice,
//             amount: 0,
//             vatStatus: item.vatStatus
//         };

//         const updatedItems = [...items, newItem];
//         setItems(updatedItems);
//         setShowItemDropdown(false);
//         // itemSearchRef.current.value = '';

//         // Clear the input field but preserve the search query in memory
//         setSearchQuery('');
//         if (itemSearchRef.current) {
//             itemSearchRef.current.value = '';
//         }

//         // Update the transaction fetching part
//         if (transactionSettings.displayTransactionsForSalesReturn && formData.accountId) {
//             const cacheKey = `${item._id}-${formData.accountId}`;

//             // Check cache first
//             if (transactionCache.has(cacheKey)) {
//                 const cachedTransactions = transactionCache.get(cacheKey);
//                 if (cachedTransactions.length > 0) {
//                     setTransactions(cachedTransactions);
//                     setShowTransactionModal(true);
//                     return; // Exit early to prevent focusing on quantity
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
//                         return; // Exit early to prevent focusing on quantity
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

//         // Only focus on quantity if no transactions are shown
//         setTimeout(() => {
//             const newItemIndex = updatedItems.length - 1;
//             const batchNumberInput = document.getElementById(`batchNumber-${newItemIndex}`);
//             if (batchNumberInput) {
//                 batchNumberInput.focus();
//                 batchNumberInput.select();
//             }
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

//     // Update the fetch function
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
//             // Fetch fresh data from the backend
//             const response = await api.get('/api/retailer/sales-return');
//             const { data } = response;

//             // Update all necessary states
//             const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
//             const currentRomanDate = new Date().toISOString().split('T')[0];

//             setFormData({
//                 accountId: '',
//                 accountName: '',
//                 accountAddress: '',
//                 accountPan: '',
//                 transactionDateNepali: currentNepaliDate,
//                 transactionDateRoman: currentRomanDate,
//                 nepaliDate: currentNepaliDate,
//                 billDate: currentRomanDate,
//                 billNumber: data.data.nextSalesReturnNumber,
//                 paymentMode: 'credit',
//                 isVatExempt: 'all',
//                 discountPercentage: 0,
//                 discountAmount: 0,
//                 roundOffAmount: 0,
//                 vatPercentage: 13,
//                 items: []
//             });

//             setSalesInvoiceData(null);
//             setSalesInvoiceLoading(false);

//             // Update all data states with fresh data
//             setAllItems(data.data.items.sort((a, b) => a.name.localeCompare(b.name)));
//             const sortedAccounts = data.data.accounts.sort((a, b) => a.name.localeCompare(b.name));
//             setAccounts(sortedAccounts);
//             setFilteredAccounts([]); // Reset filtered accounts
//             setNextBillNumber(data.data.nextSalesReturnNumber);
//             setItems([]);
//             clearCreditSalesReturnDraft();
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
//         }
//     };

//     const handleSubmit = async (e, print = false) => {
//         e.preventDefault();

//         if (salesInvoiceData?.hasExistingReturns) {
//             setNotification({
//                 show: true,
//                 message: `Cannot save: Sales return already exists for invoice ${formData.salesInvoiceNumber}`,
//                 type: 'error'
//             });
//             return;
//         }

//         // Validation
//         if (!formData.accountId) {
//             setNotification({
//                 show: true,
//                 message: 'Please select an account first',
//                 type: 'error'
//             });
//             return;
//         }

//         if (items.length === 0) {
//             setNotification({
//                 show: true,
//                 message: 'Please add at least one item',
//                 type: 'error'
//             });
//             return;
//         }

//         setIsSaving(true);

//         try {
//             // Debug: Log the current items structure
//             console.log('Current items structure before submission:', items);
//             console.log('First item structure:', items[0]);
//             console.log('First item unit:', items[0]?.unit);
//             console.log('First item unit type:', typeof items[0]?.unit);
//             console.log('First item unit._id:', items[0]?.unit?._id);

//             // Prepare items for submission - handle both cases
//             const preparedItems = items.map(item => {
//                 console.log('Processing item for submission:', {
//                     originalItem: item,
//                     unit: item.unit,
//                     unitType: typeof item.unit,
//                     unitHasId: item.unit?._id !== undefined
//                 });

//                 // Extract unit ID correctly
//                 let unitId = null;
//                 if (item.unit) {
//                     if (typeof item.unit === 'object' && item.unit._id) {
//                         unitId = item.unit._id;
//                     } else if (typeof item.unit === 'string') {
//                         unitId = item.unit;
//                     }
//                 }

//                 // Format expiry date
//                 let expiryDate = item.expiryDate;
//                 if (expiryDate) {
//                     if (typeof expiryDate === 'string' && expiryDate.includes('T')) {
//                         expiryDate = expiryDate.split('T')[0];
//                     } else if (expiryDate instanceof Date) {
//                         expiryDate = expiryDate.toISOString().split('T')[0];
//                     }
//                 } else {
//                     // Default expiry date
//                     const defaultDate = new Date();
//                     defaultDate.setFullYear(defaultDate.getFullYear() + 2);
//                     expiryDate = defaultDate.toISOString().split('T')[0];
//                 }

//                 // Remove any underscore-prefixed fields (reference fields)
//                 const submissionItem = {
//                     item: item.item,
//                     batchNumber: item.batchNumber || 'XXX',
//                     expiryDate: expiryDate,
//                     quantity: Number(item.quantity) || 0,
//                     unit: unitId, // Send just the ID
//                     price: Number(item.price) || 0,
//                     vatStatus: item.vatStatus || 'vatable'
//                 };

//                 console.log('Submission item:', submissionItem);
//                 return submissionItem;
//             });

//             // Prepare bill data
//             const billData = {
//                 accountId: formData.accountId,
//                 items: preparedItems,
//                 vatPercentage: Number(formData.vatPercentage) || 13,
//                 transactionDateNepali: formData.transactionDateNepali,
//                 transactionDateRoman: formData.transactionDateRoman,
//                 billDate: formData.billDate,
//                 nepaliDate: formData.nepaliDate,
//                 isVatExempt: formData.isVatExempt,
//                 discountPercentage: Number(formData.discountPercentage) || 0,
//                 discountAmount: Number(formData.discountAmount) || 0,
//                 paymentMode: formData.paymentMode,
//                 roundOffAmount: Number(formData.roundOffAmount) || 0,
//                 originalSalesBill: salesInvoiceData?._id || null,
//                 originalSalesBillNumber: formData.salesInvoiceNumber || ''
//             };

//             console.log('Final bill data for submission:', JSON.stringify(billData, null, 2));
//             console.log('First item in submission:', billData.items[0]);

//             const response = await api.post('/api/retailer/sales-return', billData);

//             if (response.data.success) {
//                 setNotification({
//                     show: true,
//                     message: 'Sales return saved successfully!',
//                     type: 'success'
//                 });

//                 setItems([]);
//                 setSalesInvoiceData(null);
//                 clearCreditSalesReturnDraft();

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
//                 console.error('Server error response:', response.data);
//                 setNotification({
//                     show: true,
//                     message: response.data.message || response.data.error || 'Failed to save sales return',
//                     type: 'error'
//                 });
//                 setIsSaving(false);
//             }
//         } catch (error) {
//             console.error('Full error:', error);
//             console.error('Error response data:', error.response?.data);

//             setNotification({
//                 show: true,
//                 message: error.response?.data?.message || error.response?.data?.error || 'Failed to save sales return',
//                 type: 'error'
//             });
//             setIsSaving(false);
//         }
//     };

//     const handlePrintAfterSaveChange = (e) => {
//         const isChecked = e.target.checked;
//         setPrintAfterSave(isChecked);
//         localStorage.setItem('printAfterSaveSalesReturn', isChecked);
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
//                         <div><strong>M/S:</strong> ${printData.bill.account?.name || printData.bill.cashAccount || 'Account Not Found'}</div>
//                         <div><strong>Address:</strong> ${printData.bill.account?.address || printData.bill.cashAccountAddress || 'N/A'}</div>
//                         <div><strong>PAN:</strong> ${printData.bill.account?.pan || printData.bill.cashAccountPan || 'N/A'} | <strong>Tel:</strong> ${printData.bill.account?.phone || printData.bill.cashAccountPhone || 'N/A'}</div>
//                         <div><strong>Email:</strong> ${printData.bill.account?.email || printData.bill.cashAccountEmail || 'N/A'}</div>
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
//                 <title>Sales_Return_${printData.bill.billNumber}</title>
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

//     const handleTransactionModalClose = () => {
//         setShowTransactionModal(false);

//         // Focus on quantity field of the last added item
//         setTimeout(() => {
//             if (items.length > 0) {
//                 const quantityInput = document.getElementById(`quantity-${items.length - 1}`);
//                 if (quantityInput) {
//                     quantityInput.focus();
//                     quantityInput.select();
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
//                 handleAccountCreationModalClose();
//             } else if (showItemsModal && e.key === 'Escape') {
//                 e.preventDefault();
//                 setShowItemsModal(false);
//                 // Focus back to item search
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
//                     Credit Sales Return Entry
//                 </div>
//                 <div className="card-body">
//                     <form onSubmit={handleSubmit} id="billForm" className="needs-validation" noValidate>
//                         <div className="form-group row">
//                             {company.dateFormat === 'nepali' ? (
//                                 <>
//                                     <div className="col">
//                                         <label htmlFor="transactionDateNepali">Transaction Date:</label>
//                                         <input
//                                             type="text"
//                                             name="transactionDateNepali"
//                                             id="transactionDateNepali"
//                                             ref={company.dateFormat === 'nepali' ? transactionDateRef : null}
//                                             autoComplete='off'
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
//                                         />
//                                         {dateErrors.transactionDateNepali && (
//                                             <div className="invalid-feedback">
//                                                 {dateErrors.transactionDateNepali}
//                                             </div>
//                                         )}
//                                     </div>
//                                     <div className="col">
//                                         <label htmlFor="nepaliDate">Invoice Date:</label>
//                                         <input
//                                             type="text"
//                                             name="nepaliDate"
//                                             id="nepaliDate"
//                                             autoComplete='off'
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
//                                         {dateErrors.nepaliDate && (
//                                             <div className="invalid-feedback">
//                                                 {dateErrors.nepaliDate}
//                                             </div>
//                                         )}
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
//                                             ref={company.dateFormat === 'nepali' ? transactionDateRef : null}
//                                             value={formData.transactionDateRoman}
//                                             onChange={(e) => setFormData({ ...formData, transactionDateRoman: e.target.value })}
//                                             required
//                                             onKeyDown={(e) => {
//                                                 if (e.key === 'Enter') {
//                                                     handleKeyDown(e, 'fieldId');
//                                                 }
//                                             }}
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
//                                                     handleKeyDown(e, 'fieldId');
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
//                                     readOnly
//                                     tabIndex={0}
//                                     onKeyDown={(e) => {
//                                         if (e.key === 'Enter') {
//                                             e.preventDefault();
//                                             document.getElementById('paymentMode')?.focus();
//                                         }
//                                     }}
//                                 />
//                             </div>

//                             <div className="col">
//                                 <label htmlFor="paymentMode">Payment Mode:</label>
//                                 <select
//                                     className="form-control"
//                                     name="paymentMode"
//                                     id="paymentMode"
//                                     value={formData.paymentMode}
//                                     onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
//                                     onKeyDown={(e) => {
//                                         if (e.key === 'Enter') {
//                                             handleKeyDown(e, 'paymentMode');
//                                         }
//                                     }}
//                                 >
//                                     <option value="credit">credit</option>
//                                     <option value="cash">cash</option>
//                                 </select>
//                             </div>
//                             <div className="col">
//                                 <label htmlFor="salesInvoiceNumber">Org. Invoice No:</label>
//                                 <div className="input-group">
//                                     <input
//                                         type="text"
//                                         name="salesInvoiceNumber"
//                                         id="salesInvoiceNumber"
//                                         className="form-control"
//                                         autoComplete='off'
//                                         value={formData.salesInvoiceNumber || ''}
//                                         onChange={(e) => setFormData({ ...formData, salesInvoiceNumber: e.target.value })}
//                                         onBlur={fetchSalesBillDetails}
//                                         onKeyDown={(e) => {
//                                             if (e.key === 'Enter') {
//                                                 e.preventDefault();
//                                                 fetchSalesBillDetails(e);
//                                                 handleKeyDown(e, 'salesInvoiceNumber');
//                                             }
//                                         }}
//                                         placeholder="Enter sales inv. number"
//                                         disabled={salesInvoiceLoading}
//                                     />
//                                     {salesInvoiceLoading && (
//                                         <span className="input-group-text">
//                                             <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
//                                         </span>
//                                     )}
//                                 </div>
//                             </div>

//                             <div className="col">
//                                 <label htmlFor="isVatExempt">VAT:</label>
//                                 <select
//                                     className="form-control"
//                                     name="isVatExempt"
//                                     id="isVatExempt"
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
//                                 <label htmlFor="account">Party Name:</label>
//                                 <input
//                                     type="text"
//                                     id="account"
//                                     name="account"
//                                     className="form-control"
//                                     value={formData.accountName}
//                                     onClick={() => setShowAccountModal(true)}
//                                     onFocus={() => setShowAccountModal(true)}
//                                     readOnly
//                                     required
//                                     onKeyDown={(e) => {
//                                         if (e.key === 'Enter') {
//                                             handleKeyDown(e, 'fieldId');
//                                         }
//                                     }}
//                                 />
//                                 <AccountBalanceDisplay
//                                     accountId={formData.accountId}
//                                     api={api}
//                                     newTransactionAmount={parseFloat(totals.totalAmount) || 0}
//                                     compact={true}
//                                     transactionType="receipt" // Add this prop
//                                     dateFormat={company.dateFormat}
//                                     refreshTrigger={showAccountCreationModal}
//                                 />
//                                 <input type="hidden" id="accountId" name="accountId" value={formData.accountId} />
//                             </div>

//                             <div className="col">
//                                 <label htmlFor="address">Party Address:</label>
//                                 <input
//                                     type="text"
//                                     id="address"
//                                     className="form-control"
//                                     value={formData.accountAddress}
//                                     onKeyDown={(e) => {
//                                         if (e.key === 'Enter') {
//                                             handleKeyDown(e, 'address');
//                                         }
//                                     }}
//                                     readOnly
//                                 />
//                             </div>

//                             <div className="col">
//                                 <label htmlFor="pan">Vat No:</label>
//                                 <input
//                                     type="text"
//                                     id="pan"
//                                     name="pan"
//                                     className="form-control"
//                                     value={formData.accountPan}
//                                     onKeyDown={(e) => {
//                                         if (e.key === 'Enter') {
//                                             handleKeyDown(e, 'pan');
//                                         }
//                                     }}
//                                     readOnly
//                                 />
//                             </div>
//                         </div>

//                         <div id="bill-details-container" style={{ maxHeight: "400px", overflowY: "auto", border: "1px solid #ccc", padding: "10px" }} ref={itemsTableRef}>
//                             <table className="table table-bordered compact-table" id="itemsTable">
//                                 <thead>
//                                     <tr>
//                                         <th>S.N.</th>
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
//                                                 <input type="hidden" name={`items[${index}][item]`} value={item._id} />
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
//                                                     required
//                                                     onKeyDown={(e) => {
//                                                         if (e.key === 'Enter') {
//                                                             e.preventDefault();
//                                                             document.getElementById(`quantity-${index}`)?.focus();
//                                                         }
//                                                     }}
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
//                                                     required
//                                                     onFocus={(e) => {
//                                                         e.target.select();
//                                                     }}
//                                                     onKeyDown={(e) => {
//                                                         if (e.key === 'Enter') {
//                                                             e.preventDefault();
//                                                             document.getElementById(`price-${index}`)?.focus();
//                                                         }
//                                                     }}
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
//                                             <td className="align-middle">
//                                                 <div className="d-flex gap-2">
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
//                                                 </div>
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
//                                         <td>
//                                             <p className="form-control-plaintext">Rs. {totals.subTotal.toFixed(2)}</p>
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
//                                                 onFocus={(e) => {
//                                                     e.target.select();
//                                                 }}
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
//                                                 onFocus={(e) => {
//                                                     e.target.select();
//                                                 }}
//                                                 onKeyDown={(e) => {
//                                                     if (e.key === 'Enter') {
//                                                         handleKeyDown(e, 'discountAmount');
//                                                     }
//                                                 }}
//                                             />
//                                         </td>
//                                     </tr>
//                                     {company.vatEnabled && formData.isVatExempt !== 'true' && (
//                                         <>
//                                             <tr id="taxableAmountRow">
//                                                 <td><label htmlFor="taxableAmount">Taxable Amount:</label></td>
//                                                 <td>
//                                                     <p className="form-control-plaintext">Rs. {totals.taxableAmount.toFixed(2)}</p>
//                                                 </td>
//                                                 <td><label htmlFor="vatPercentage">VAT (13%):</label></td>
//                                                 <td>
//                                                     <input
//                                                         type="number"
//                                                         name="vatPercentage"
//                                                         id="vatPercentage"
//                                                         className="form-control"
//                                                         value={formData.vatPercentage}
//                                                         readOnly
//                                                         onFocus={(e) => {
//                                                             e.target.select();
//                                                         }}
//                                                         onKeyDown={(e) => {
//                                                             if (e.key === 'Enter') {
//                                                                 handleKeyDown(e, 'vatPercentage');
//                                                             }
//                                                         }}
//                                                     />
//                                                 </td>
//                                                 <td><label htmlFor="vatAmount">VAT Amount:</label></td>
//                                                 <td>
//                                                     <p className="form-control-plaintext">Rs. {totals.vatAmount.toFixed(2)}</p>
//                                                 </td>
//                                             </tr>
//                                         </>
//                                     )}
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
//                                             <p className="form-control-plaintext">Rs. {totals.totalAmount.toFixed(2)}</p>
//                                         </td>
//                                         <td><label htmlFor="amountInWords">In Words:</label></td>
//                                         <td className="col-3">
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

//             {/* Account Modal */}
//             {showAccountModal && (
//                 <div
//                     className="modal fade show"
//                     id="accountModal"
//                     tabIndex="-1"
//                     style={{ display: 'block' }}
//                     onKeyDown={(e) => {
//                         if (e.key === 'Escape') {
//                             setShowAccountModal(false);

//                             setTimeout(() => {
//                                 document.getElementById('address').focus();
//                             }, 0);
//                         }
//                     }}
//                 >
//                     <div className="modal-dialog modal-xl modal-dialog-centered">
//                         <div className="modal-content" style={{ height: '500px' }}>
//                             <div className="modal-header">
//                                 <h5 className="modal-title" id="accountModalLabel">Select an Account</h5>
//                                 {/* Add F6 hint here */}
//                                 <small className="ms-auto text-muted">Press F6 to create new account</small>
//                                 <button
//                                     type="button"
//                                     className="btn-close"
//                                     onClick={() => setShowAccountModal(false)}
//                                     aria-label="Close"
//                                 ></button>
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
//                                             filteredAccounts.map((account, index) => (
//                                                 <li
//                                                     key={account._id}
//                                                     data-account-id={account._id}
//                                                     className={`list-group-item account-item py-2 ${index === 0 ? 'active' : ''}`}
//                                                     onClick={() => {
//                                                         selectAccount(account);
//                                                         document.getElementById('address').focus();
//                                                     }}
//                                                     style={{ cursor: 'pointer' }}
//                                                     tabIndex={0}
//                                                     onKeyDown={(e) => {
//                                                         if (e.key === 'ArrowDown') {
//                                                             e.preventDefault();
//                                                             const nextItem = e.target.nextElementSibling;
//                                                             if (nextItem) {
//                                                                 e.target.classList.remove('active');
//                                                                 nextItem.classList.add('active');
//                                                                 nextItem.focus();
//                                                             }
//                                                         } else if (e.key === 'ArrowUp') {
//                                                             e.preventDefault();
//                                                             const prevItem = e.target.previousElementSibling;
//                                                             if (prevItem) {
//                                                                 e.target.classList.remove('active');
//                                                                 prevItem.classList.add('active');
//                                                                 prevItem.focus();
//                                                             } else {
//                                                                 accountSearchRef.current.focus();
//                                                             }
//                                                         } else if (e.key === 'Enter') {
//                                                             e.preventDefault();
//                                                             selectAccount(account);
//                                                             document.getElementById('address').focus();
//                                                         } else if (e.key === 'Escape') {
//                                                             e.preventDefault();
//                                                             setShowAccountModal(false);
//                                                         }
//                                                     }}
//                                                     onFocus={(e) => {
//                                                         document.querySelectorAll('.account-item').forEach(item => {
//                                                             item.classList.remove('active');
//                                                         });
//                                                         e.target.classList.add('active');
//                                                     }}
//                                                 >
//                                                     <div className="d-flex justify-content-between small">
//                                                         <strong>{account.uniqueNumber || 'N/A'} {account.name}</strong>
//                                                         <span>📍 {account.address || 'N/A'} | 🆔 PAN: {account.pan || 'N/A'}</span>
//                                                     </div>
//                                                 </li>
//                                             ))
//                                         ) : (
//                                             accountSearchRef.current?.value ? (
//                                                 <li className="list-group-item text-center text-muted small py-2">No accounts found</li>
//                                             ) : (
//                                                 accounts.map((account, index) => (
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
//                                                                     accountSearchRef.current.focus();
//                                                                 }
//                                                             } else if (e.key === 'Enter') {
//                                                                 e.preventDefault();
//                                                                 selectAccount(account);
//                                                                 document.getElementById('address').focus();
//                                                             } else if (e.key === 'Escape') {
//                                                                 e.preventDefault();
//                                                                 setShowAccountModal(false);
//                                                             }
//                                                         }}
//                                                         onFocus={(e) => {
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

// export default AddSalesReturn;

// import React, { useState, useEffect, useRef } from 'react';
// import { useNavigate } from 'react-router-dom';
// import NepaliDate from 'nepali-date-converter';
// import axios from 'axios';
// import Header from '../Header';
// import NotificationToast from '../../NotificationToast';
// import { usePageNotRefreshContext } from '../PageNotRefreshContext';
// import '../../../stylesheet/noDateIcon.css'
// import ProductModal from '../dashboard/modals/ProductModal';
// import AccountBalanceDisplay from '../payment/AccountBalanceDisplay';
// import useDebounce from '../../../hooks/useDebounce';
// import VirtualizedItemList from '../../VirtualizedItemList';
// import VirtualizedAccountList from '../../VirtualizedAccountList';

// const AddSalesReturn = () => {
//     const { draftCreditSalesReturnSave, setDraftCreditSalesReturnSave, clearCreditSalesReturnDraft } = usePageNotRefreshContext();
//     const navigate = useNavigate();

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
//     const [searchQuery, setSearchQuery] = useState('');
//     const [lastSearchQuery, setLastSearchQuery] = useState('');
//     const [shouldShowLastSearchResults, setShouldShowLastSearchResults] = useState(false);
//     const debouncedSearchQuery = useDebounce(searchQuery, 500);

//     const [isSearching, setIsSearching] = useState(false);
//     const [searchResults, setSearchResults] = useState([]);
//     const [searchPage, setSearchPage] = useState(1);
//     const [hasMoreSearchResults, setHasMoreSearchResults] = useState(false);
//     const [totalSearchItems, setTotalSearchItems] = useState(0);

//     // Header search states
//     const [headerSearchQuery, setHeaderSearchQuery] = useState('');
//     const [showHeaderItemModal, setShowHeaderItemModal] = useState(false);
//     const [selectedItemForInsert, setSelectedItemForInsert] = useState(null);
//     const [selectedItemQuantity, setSelectedItemQuantity] = useState(0);
//     const [selectedItemRate, setSelectedItemRate] = useState(0);
//     const [selectedItemBatchNumber, setSelectedItemBatchNumber] = useState('');
//     const [selectedItemExpiryDate, setSelectedItemExpiryDate] = useState('');
//     const [headerLastSearchQuery, setHeaderLastSearchQuery] = useState('');
//     const [headerShouldShowLastSearchResults, setHeaderShouldShowLastSearchResults] = useState(false);
//     const [isHeaderSearching, setIsHeaderSearching] = useState(false);
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
//     const [quantityErrors, setQuantityErrors] = useState({});
//     const [stockValidation, setStockValidation] = useState({
//         itemStockMap: new Map(),
//         usedStockMap: new Map(),
//     });
//     const [printAfterSave, setPrintAfterSave] = useState(
//         localStorage.getItem('printAfterSaveSalesReturn') === 'true' || false
//     );
//     const continueButtonRef = useRef(null);
//     const [transactionCache, setTransactionCache] = useState(new Map());
//     const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
//     const transactionDateRef = useRef(null);
//     const [isInitialDataLoaded, setIsInitialDataLoaded] = useState(false);
//     const [isSaving, setIsSaving] = useState(false);
//     const [isLoading, setIsLoading] = useState(true);
//     const [loadingItems, setLoadingItems] = useState(new Set());
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

//     const [formData, setFormData] = useState(draftCreditSalesReturnSave?.formData || {
//         accountId: '',
//         accountName: '',
//         accountAddress: '',
//         accountPan: '',
//         transactionDateNepali: new NepaliDate(currentNepaliDate).format('YYYY-MM-DD'),
//         transactionDateRoman: new Date().toISOString().split('T')[0],
//         nepaliDate: new NepaliDate(currentNepaliDate).format('YYYY-MM-DD'),
//         billDate: new Date().toISOString().split('T')[0],
//         billNumber: '',
//         paymentMode: 'credit',
//         isVatExempt: 'all',
//         discountPercentage: 0,
//         discountAmount: 0,
//         roundOffAmount: 0,
//         vatPercentage: 13,
//         salesInvoiceNumber: '',
//         items: []
//     });

//     const [items, setItems] = useState(draftCreditSalesReturnSave?.items || []);
//     const [salesInvoiceData, setSalesInvoiceData] = useState(null);
//     const [salesInvoiceLoading, setSalesInvoiceLoading] = useState(false);
//     const [accounts, setAccounts] = useState([]);
//     const [showAccountModal, setShowAccountModal] = useState(false);
//     const [showItemDropdown, setShowItemDropdown] = useState(false);
//     const [showTransactionModal, setShowTransactionModal] = useState(false);
//     const [transactions, setTransactions] = useState([]);
//     const itemDropdownRef = useRef(null);
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

//     const api = axios.create({
//         baseURL: process.env.REACT_APP_API_BASE_URL,
//         withCredentials: true,
//     });

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

//     // Fetch items from backend
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
//                     // Get latest price from stockEntries
//                     let latestPrice = 0;
//                     let latestBatchNumber = '';
//                     let latestExpiryDate = '';

//                     if (item.stockEntries && item.stockEntries.length > 0) {
//                         const sortedEntries = item.stockEntries.sort((a, b) =>
//                             new Date(b.date) - new Date(a.date)
//                         );
//                         latestPrice = sortedEntries[0].price || 0;
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

//     useEffect(() => {
//         if (showItemDropdown) {
//             setSearchPage(1);
//             fetchItemsFromBackend(debouncedSearchQuery, 1, false);
//         }
//     }, [debouncedSearchQuery, formData.isVatExempt, showItemDropdown]);

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
//         if (formData.accountId || items.length > 0) {
//             setDraftCreditSalesReturnSave({
//                 formData,
//                 items,
//                 accounts
//             });
//         }
//     }, [formData, items, accounts, setDraftCreditSalesReturnSave]);

//     useEffect(() => {
//         const handF9leKeyDown = (e) => {
//             if (e.key === 'F9') {
//                 e.preventDefault();
//                 setShowProductModal(prev => !prev);
//             }
//         };
//         window.addEventListener('keydown', handF9leKeyDown);
//         return () => {
//             window.removeEventListener('keydown', handF9leKeyDown);
//         };
//     }, []);

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

//     // Initial data loading
//     useEffect(() => {
//         const fetchInitialData = async () => {
//             try {
//                 const response = await api.get('/api/retailer/sales-return');
//                 const { data } = response;

//                 setCompany(data.data.company);
//                 setNextBillNumber(data.data.nextSalesReturnNumber);
//                 setFormData(prev => ({
//                     ...prev,
//                     billNumber: data.data.nextSalesReturnNumber
//                 }));

//                 fetchAccountsFromBackend('', 1);
//                 setIsInitialDataLoaded(true);
//             } catch (error) {
//                 console.error('Error fetching initial data:', error);
//             }
//         };
//         fetchInitialData();
//     }, []);

//     useEffect(() => {
//         const fetchTransactionSettings = async () => {
//             try {
//                 const response = await api.get('/api/retailer/get-display-sales-return-transactions');
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
//         if (isInitialDataLoaded && transactionDateRef.current) {
//             const timer = setTimeout(() => {
//                 transactionDateRef.current.focus();
//             }, 50);
//             return () => clearTimeout(timer);
//         }
//     }, [isInitialDataLoaded, company.dateFormat]);

//     useEffect(() => {
//         calculateTotal();
//     }, [items, formData]);

//     useEffect(() => {
//         return () => {
//             setLastSearchQuery('');
//             setShouldShowLastSearchResults(false);
//         };
//     }, []);

//     const loadMoreAccounts = () => {
//         if (!isAccountSearching) {
//             fetchAccountsFromBackend(accountSearchQuery, accountSearchPage + 1);
//         }
//     };

//     const validateHeaderFields = () => {
//         if (!selectedItemBatchNumber.trim()) {
//             setNotification({
//                 show: true,
//                 message: 'Batch number is required before inserting item',
//                 type: 'error'
//             });

//             setTimeout(() => {
//                 const batchInput = document.querySelector('input[placeholder="Batch"]');
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

//     useEffect(() => {
//         const updateStockMaps = () => {
//             const newItemStockMap = new Map();

//             const allItemsToCheck = [...searchResults];

//             if (headerSearchResults.length > 0) {
//                 headerSearchResults.forEach(item => {
//                     const existingItem = allItemsToCheck.find(i => i._id === item._id);
//                     if (!existingItem) {
//                         allItemsToCheck.push(item);
//                     }
//                 });
//             }

//             allItemsToCheck.forEach(item => {
//                 const totalStock = item.stockEntries?.reduce((sum, entry) => sum + (entry.quantity || 0), 0) || 0;
//                 newItemStockMap.set(item._id, totalStock);
//             });

//             setStockValidation(prev => ({
//                 ...prev,
//                 itemStockMap: newItemStockMap
//             }));

//             if (items.length > 0) {
//                 validateAllQuantities();
//             }
//         };

//         if (searchResults.length > 0 || headerSearchResults.length > 0) {
//             updateStockMaps();
//         }
//     }, [searchResults, headerSearchResults]);

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

//         // Focus on address field after account selection
//     setTimeout(() => {
//         document.getElementById('address').focus();
//         document.getElementById('address').select();
//     }, 50);
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

//     const addItemToBill = async (item) => {
//         if (itemSearchRef.current?.value) {
//             setLastSearchQuery(itemSearchRef.current.value);
//             setShouldShowLastSearchResults(true);
//         }

//         const totalStock = item.stockEntries.reduce((sum, entry) => sum + (entry.quantity || 0), 0);

//         if (totalStock === 0) {
//             setNotification({
//                 show: true,
//                 message: `Item "${item.name}" has zero stock and cannot be added to the bill.`,
//                 type: 'error'
//             });
//             itemSearchRef.current.value = '';
//             itemSearchRef.current.focus();
//             return;
//         }

//         const sortedStockEntries = item.stockEntries.sort((a, b) => new Date(a.date) - new Date(b.date));
//         const firstStockEntry = sortedStockEntries[0] || {};

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

//         const newItem = {
//             item: item._id,
//             uniqueNumber: item.uniqueNumber || 'N/A',
//             hscode: item.hscode,
//             name: item.name,
//             category: item.category?.name || 'No Category',
//             batchNumber: firstStockEntry.batchNumber || '',
//             expiryDate: expiryDate,
//             quantity: 0,
//             unit: item.unit,
//             price: Math.round(firstStockEntry.price * 100) / 100 || 0,
//             amount: 0,
//             vatStatus: item.vatStatus,
//             uniqueUuId: firstStockEntry.uniqueUuId
//         };

//         const updatedItems = [...items, newItem];
//         setItems(updatedItems);
//         setShowItemDropdown(false);
//         itemSearchRef.current.value = '';

//         setSearchQuery('');
//         if (itemSearchRef.current) {
//             itemSearchRef.current.value = '';
//         }

//         if (transactionSettings.displayTransactionsForSalesReturn && formData.accountId) {
//             const cacheKey = `${item._id}-${formData.accountId}`;

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

//         const availableStock = stockValidation.itemStockMap.get(item._id) || 0;

//         setNotification({
//             show: true,
//             message: `Available stock: ${availableStock}`,
//             type: 'success'
//         });

//         setTimeout(() => {
//             const quantityInput = document.getElementById(`quantity-${updatedItems.length - 1}`);
//             if (quantityInput) {
//                 quantityInput.focus();
//                 quantityInput.select();
//             }
//         }, 100);
//     };

//     const validateQuantity = (index, quantity, itemsToValidate = items) => {
//         const item = itemsToValidate[index];
//         if (!item) return true;

//         const itemId = item.item;
//         const availableStock = stockValidation.itemStockMap.get(itemId) || 0;

//         if (!stockValidation.itemStockMap.has(itemId)) {
//             return true;
//         }

//         const usedStockMap = calculateUsedStock(itemsToValidate);
//         const totalUsed = usedStockMap.get(itemId) || 0;

//         const isValid = totalUsed <= availableStock;

//         return isValid;
//     };

//     const calculateUsedStock = (items) => {
//         const newUsedStockMap = new Map();

//         items.forEach(item => {
//             const itemId = item.item;
//             const currentUsed = newUsedStockMap.get(itemId) || 0;
//             const itemQuantity = parseFloat(item.quantity) || 0;

//             newUsedStockMap.set(itemId, currentUsed + itemQuantity);
//         });

//         return newUsedStockMap;
//     };

//     const getAvailableStockForDisplay = (item) => {
//         if (!item) return 0;
//         return stockValidation.itemStockMap.get(item.item) || 0;
//     };

//     const getRemainingStock = (item, itemsToCheck = items) => {
//         if (!item) return 0;
//         const itemId = item.item;
//         const availableStock = stockValidation.itemStockMap.get(itemId) || 0;
//         const usedStockMap = calculateUsedStock(itemsToCheck);
//         const totalUsed = usedStockMap.get(itemId) || 0;
//         return availableStock - totalUsed;
//     };

//     const updateItemField = (index, field, value) => {
//         const updatedItems = [...items];
//         updatedItems[index][field] = value;

//         if (field === 'quantity' || field === 'price') {
//             if (field === 'quantity') {
//                 const item = updatedItems[index];
//                 const itemId = item.item;

//                 if (stockValidation.itemStockMap.has(itemId)) {
//                     const isValid = validateQuantity(index, value, updatedItems);
//                     const remainingStock = getRemainingStock(item, updatedItems);
//                     const availableStock = getAvailableStockForDisplay(item);

//                     if (!isValid) {
//                         setQuantityErrors(prev => ({
//                             ...prev,
//                             [index]: `Stock: ${availableStock} | Rem.: ${remainingStock}`
//                         }));
//                     } else {
//                         setQuantityErrors(prev => {
//                             const newErrors = { ...prev };
//                             delete newErrors[index];
//                             return newErrors;
//                         });
//                     }
//                 }
//             }

//             updatedItems[index].amount = (updatedItems[index].quantity * updatedItems[index].price).toFixed(2);
//         }

//         setItems(updatedItems);

//         if (formData.discountPercentage || formData.discountAmount) {
//             const subTotal = calculateTotal(updatedItems).subTotal;

//             if (formData.discountPercentage) {
//                 const discountAmount = preciseMultiply(subTotal, preciseDivide(formData.discountPercentage, 100));
//                 setFormData(prev => ({
//                     ...prev,
//                     discountAmount: preciseRound(discountAmount, 2)
//                 }));
//             } else if (formData.discountAmount) {
//                 const discountPercentage = subTotal > 0 ?
//                     preciseMultiply(preciseDivide(formData.discountAmount, subTotal), 100) : 0;
//                 setFormData(prev => ({
//                     ...prev,
//                     discountPercentage: preciseRound(discountPercentage, 2)
//                 }));
//             }
//         }
//     };

//     const removeItem = (index) => {
//         const updatedItems = items.filter((_, i) => i !== index);
//         setItems(updatedItems);

//         setTimeout(() => {
//             validateAllQuantities(updatedItems);
//         }, 0);
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

//     const validateAllQuantities = (itemsToValidate = items) => {
//         const newErrors = {};

//         itemsToValidate.forEach((item, index) => {
//             const itemId = item.item;

//             if (stockValidation.itemStockMap.has(itemId)) {
//                 const isValid = validateQuantity(index, item.quantity, itemsToValidate);
//                 if (!isValid) {
//                     const remainingStock = getRemainingStock(item, itemsToValidate);
//                     const availableStock = getAvailableStockForDisplay(item);
//                     newErrors[index] = `Stock: ${availableStock} | Rem.: ${remainingStock}`;
//                 }
//             }
//         });

//         setQuantityErrors(newErrors);
//         return Object.keys(newErrors).length === 0;
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

//     useEffect(() => {
//         if (searchResults.length > 0) {
//             const newItemStockMap = new Map();

//             searchResults.forEach(item => {
//                 const totalStock = item.stockEntries.reduce((sum, entry) => sum + (entry.quantity || 0), 0);
//                 newItemStockMap.set(item._id, totalStock);
//             });

//             setStockValidation(prev => ({
//                 ...prev,
//                 itemStockMap: newItemStockMap
//             }));

//             if (items.length > 0) {
//                 validateAllQuantities();
//             }
//         }
//     }, [searchResults]);

//     useEffect(() => {
//         if (draftCreditSalesReturnSave?.items && draftCreditSalesReturnSave.items.length > 0 && searchResults.length > 0) {
//             setTimeout(() => {
//                 validateAllQuantities();
//             }, 100);
//         }
//     }, [draftCreditSalesReturnSave?.items, searchResults]);

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

//         const roundOffAmount = parseFloat(formData.roundOffAmount) || 0;
//         const totalAmount = preciseAdd(totalBeforeRoundOff, roundOffAmount);

//         return {
//             subTotal: preciseRound(subTotal, 2),
//             taxableAmount: preciseRound(finalTaxableAmount, 2),
//             nonTaxableAmount: preciseRound(finalNonTaxableAmount, 2),
//             vatAmount: preciseRound(vatAmount, 2),
//             totalAmount: preciseRound(totalAmount, 2),
//             discountAmount: preciseRound(effectiveDiscount, 2),
//             roundOffAmount: preciseRound(roundOffAmount, 2)
//         };
//     };

//     const handleDiscountPercentageChange = (e) => {
//         const value = parseFloat(e.target.value) || 0;
//         const validatedValue = Math.min(Math.max(value, 0), 100);

//         const subTotal = calculateTotal().subTotal;
//         const discountAmount = preciseMultiply(subTotal, preciseDivide(validatedValue, 100));

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
//             preciseMultiply(preciseDivide(validatedValue, subTotal), 100) : 0;

//         setFormData({
//             ...formData,
//             discountAmount: validatedValue,
//             discountPercentage: preciseRound(discountPercentage, 2)
//         });
//     };

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

//     const resetForm = async () => {
//         try {
//             setIsLoading(true);

//             const response = await api.get('/api/retailer/sales-return');
//             const { data } = response;

//             const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
//             const currentRomanDate = new Date().toISOString().split('T')[0];

//             setFormData({
//                 accountId: '',
//                 accountName: '',
//                 accountAddress: '',
//                 accountPan: '',
//                 transactionDateNepali: new NepaliDate(currentNepaliDate).format('YYYY-MM-DD'),
//                 transactionDateRoman: currentRomanDate,
//                 nepaliDate: new NepaliDate(currentNepaliDate).format('YYYY-MM-DD'),
//                 billDate: currentRomanDate,
//                 billNumber: data.data.nextSalesReturnNumber,
//                 paymentMode: 'credit',
//                 isVatExempt: 'all',
//                 discountPercentage: 0,
//                 discountAmount: 0,
//                 roundOffAmount: 0,
//                 vatPercentage: 13,
//                 salesInvoiceNumber: '',
//                 items: []
//             });

//             setAccountSearchQuery('');
//             setAccountSearchPage(1);
//             setAccountSearchResults([]);
//             setHasMoreAccountResults(false);
//             setTotalAccounts(0);

//             fetchAccountsFromBackend('', 1);

//             setAccounts([]);
//             setNextBillNumber(data.data.nextSalesReturnNumber);
//             setItems([]);
//             setSalesInvoiceData(null);
//             setSalesInvoiceLoading(false);
//             clearCreditSalesReturnDraft();

//             if (accountSearchRef.current) {
//                 accountSearchRef.current.value = '';
//             }

//             setSearchQuery('');
//             setSearchResults([]);
//             setSearchPage(1);
//             setHasMoreSearchResults(false);
//             setTotalSearchItems(0);
//             setShowItemDropdown(false);

//             setHeaderSearchQuery('');
//             setHeaderLastSearchQuery('');
//             setHeaderShouldShowLastSearchResults(false);
//             setSelectedItemForInsert(null);

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

//     const formatter = new Intl.NumberFormat('en-NP', {
//         minimumFractionDigits: 2,
//         maximumFractionDigits: 2,
//     });

//     const fetchSalesBillDetails = async (e) => {
//         const invoiceNumber = e?.target?.value || formData.salesInvoiceNumber;

//         if (!invoiceNumber) return;

//         setSalesInvoiceLoading(true);
//         try {
//             const response = await api.get(`/api/retailer/sales-bill-by-number/${invoiceNumber}`);

//             if (response.data.success) {
//                 const billData = response.data.data.bill;

//                 // Check if this is a credit sales bill
//                 if (billData.billType !== 'credit') {
//                     setSalesInvoiceLoading(false);

//                     setNotification({
//                         show: true,
//                         message: `Bill ${invoiceNumber} is not a credit sales bill. Please check the bill type.`,
//                         type: 'warning'
//                     });

//                     setFormData(prev => ({ ...prev, salesInvoiceNumber: '' }));
//                     setSalesInvoiceData(null);
//                     setItems([]);

//                     return;
//                 }

//                 // Check if this bill already has existing returns
//                 if (billData.hasExistingReturns && billData.existingReturns.length > 0) {
//                     setSalesInvoiceLoading(false);

//                     // Show detailed warning message
//                     const returnDetails = billData.existingReturns
//                         .map((ret, idx) =>
//                             `Return ${idx + 1}: ${ret.billNumber} (${new Date(ret.date).toLocaleDateString()}) - Rs. ${ret.totalAmount?.toFixed(2) || '0.00'}`
//                         )
//                         .join('\n');

//                     setNotification({
//                         show: true,
//                         message: `⚠️ Sales return already exists for invoice ${invoiceNumber}!\n\nExisting Returns:\n${returnDetails}\n\nYou cannot create another return for the same invoice.`,
//                         type: 'warning'
//                     });

//                     // Clear the input field
//                     setFormData(prev => ({ ...prev, salesInvoiceNumber: '' }));

//                     // Clear any loaded data
//                     setSalesInvoiceData(null);
//                     setItems([]);

//                     return;
//                 }

//                 // Check if bill is fully returned
//                 if (billData.isFullyReturned) {
//                     setSalesInvoiceLoading(false);

//                     setNotification({
//                         show: true,
//                         message: `All items from invoice ${invoiceNumber} have already been returned.`,
//                         type: 'warning'
//                     });

//                     setFormData(prev => ({ ...prev, salesInvoiceNumber: '' }));
//                     setSalesInvoiceData(null);
//                     setItems([]);

//                     return;
//                 }

//                 // Calculate VAT status based on items in the bill
//                 let isVatExemptValue = 'all'; // Default to 'all'

//                 if (billData.items && billData.items.length > 0) {
//                     const vatStatuses = billData.items.map(item => {
//                         return item.item?.vatStatus || item.vatStatus || 'vatable';
//                     });

//                     // Check if all items are vatable
//                     const allVatable = vatStatuses.every(status => status === 'vatable');
//                     // Check if all items are vatExempt
//                     const allVatExempt = vatStatuses.every(status => status === 'vatExempt');

//                     // Apply logic:
//                     if (allVatable) {
//                         isVatExemptValue = 'false'; // All items are vatable, so show 13%
//                     } else if (allVatExempt) {
//                         isVatExemptValue = 'true'; // All items are exempt, so show Exempt
//                     } else {
//                         isVatExemptValue = 'all'; // Mixed items, show All
//                     }
//                 }

//                 // Update account information
//                 setFormData(prev => ({
//                     ...prev,
//                     accountId: billData.account?._id || '',
//                     accountName: billData.account?.name || '',
//                     accountAddress: billData.account?.address || '',
//                     accountPan: billData.account?.pan || '',
//                     // Copy bill summary details
//                     discountPercentage: billData.billSummary?.discountPercentage || 0,
//                     discountAmount: billData.billSummary?.discountAmount || 0,
//                     vatPercentage: billData.billSummary?.vatPercentage || 13,
//                     paymentMode: billData.billSummary?.paymentMode || 'credit',
//                     isVatExempt: isVatExemptValue,
//                     roundOffAmount: billData.billSummary?.roundOffAmount || 0,
//                     salesInvoiceNumber: invoiceNumber
//                 }));

//                 // Transform items correctly
//                 const transformedItems = billData.items.map((item, index) => {
//                     // Handle unit
//                     let unit = item.unit;
//                     if (unit && typeof unit === 'string') {
//                         unit = { _id: unit };
//                     } else if (unit && unit._id) {
//                         unit = { _id: unit._id, name: unit.name || '' };
//                     } else {
//                         unit = { _id: null, name: '' };
//                     }

//                     // Handle expiry date
//                     let expiryDate = item.expiryDate;
//                     if (expiryDate) {
//                         if (typeof expiryDate === 'string' && expiryDate.includes('T')) {
//                             expiryDate = expiryDate.split('T')[0];
//                         } else if (expiryDate instanceof Date) {
//                             expiryDate = expiryDate.toISOString().split('T')[0];
//                         }
//                     } else {
//                         expiryDate = getDefaultExpiryDate();
//                     }

//                     // Use available quantity as default
//                     const defaultQuantity = Math.max(0, item.availableQuantity || 0);

//                     return {
//                         item: item.item?._id || item.item,
//                         _id: item.item?._id || item.item,
//                         uniqueNumber: item.item?.uniqueNumber || '',
//                         hscode: item.item?.hscode || '',
//                         name: item.item?.name || '',
//                         category: item.item?.category?.name || 'No Category',
//                         batchNumber: item.batchNumber || 'XXX',
//                         expiryDate: expiryDate,
//                         quantity: defaultQuantity,
//                         unit: unit,
//                         price: item.originalPrice || item.price || item.item?.sellingPrice || 0,
//                         amount: (defaultQuantity * (item.originalPrice || item.price || item.item?.sellingPrice || 0)).toFixed(2),
//                         vatStatus: item.item?.vatStatus || item.vatStatus || 'vatable',
//                         _originalQuantity: item.originalQuantity,
//                         _availableQuantity: item.availableQuantity,
//                         _returnedQuantity: item.returnedQuantity
//                     };
//                 });

//                 setItems(transformedItems);
//                 setSalesInvoiceData(billData);

//                 setNotification({
//                     show: true,
//                     message: `✅ Sales bill ${invoiceNumber} loaded successfully. ${transformedItems.length} items found.`,
//                     type: 'success'
//                 });

//                 // Focus on first item's quantity
//                 setTimeout(() => {
//                     if (transformedItems.length > 0) {
//                         const batchNumberInput = document.getElementById(`batchNumber-0`);
//                         if (batchNumberInput) {
//                             batchNumberInput.focus();
//                             batchNumberInput.select();
//                         }
//                     }
//                 }, 100);

//             } else {
//                 const errorData = response.data;

//                 if (errorData.isCashSales) {
//                     setNotification({
//                         show: true,
//                         message: `❌ ${invoiceNumber} is a Cash Sales bill!\n\nCash Account: ${errorData.cashAccount || 'N/A'}\nAddress: ${errorData.cashAccountAddress || 'N/A'}\n\nCash sales returns should be created from the Cash Sales Return section.`,
//                         type: 'error'
//                     });
//                 } else if (errorData.isCreditSales === false) {
//                     setNotification({
//                         show: true,
//                         message: `❌ ${invoiceNumber} is not a valid credit sales bill.\nPlease check the bill type.`,
//                         type: 'error'
//                     });
//                 } else {
//                     setNotification({
//                         show: true,
//                         message: errorData.error || 'Sales bill not found',
//                         type: 'error'
//                     });
//                 }

//                 setFormData(prev => ({ ...prev, salesInvoiceNumber: '' }));
//                 setSalesInvoiceData(null);
//                 setItems([]);
//             }
//         } catch (error) {
//             console.error('Error fetching sales bill:', error);

//             if (error.response?.data?.isCashSales) {
//                 const errorData = error.response.data;
//                 setNotification({
//                     show: true,
//                     message: `❌ ${invoiceNumber} is a Cash Sales bill!\n\nCash Account: ${errorData.cashAccount || 'N/A'}\nAddress: ${errorData.cashAccountAddress || 'N/A'}\n\nCash sales returns should be created from the Cash Sales Return section.`,
//                     type: 'error'
//                 });
//             } else if (error.response?.data?.isCreditSales === false) {
//                 setNotification({
//                     show: true,
//                     message: `❌ ${invoiceNumber} is not a valid credit sales bill.\nPlease check the bill type.`,
//                     type: 'error'
//                 });
//             } else if (error.response?.data?.error) {
//                 setNotification({
//                     show: true,
//                     message: error.response.data.error,
//                     type: 'error'
//                 });
//             } else {
//                 setNotification({
//                     show: true,
//                     message: 'Error fetching sales bill details',
//                     type: 'error'
//                 });
//             }

//             setFormData(prev => ({ ...prev, salesInvoiceNumber: '' }));
//             setSalesInvoiceData(null);
//             setItems([]);
//         } finally {
//             setSalesInvoiceLoading(false);
//         }
//     };

//     const getDefaultExpiryDate = () => {
//         const today = new Date();
//         today.setFullYear(today.getFullYear() + 2);
//         return today.toISOString().split('T')[0];
//     };

//     const handleSubmit = async (e, print = false) => {
//         e.preventDefault();

//         if (salesInvoiceData?.hasExistingReturns) {
//             setNotification({
//                 show: true,
//                 message: `Cannot save: Sales return already exists for invoice ${formData.salesInvoiceNumber}`,
//                 type: 'error'
//             });
//             return;
//         }

//         // Validation
//         if (!formData.accountId) {
//             setNotification({
//                 show: true,
//                 message: 'Please select an account first',
//                 type: 'error'
//             });
//             return;
//         }

//         if (items.length === 0) {
//             setNotification({
//                 show: true,
//                 message: 'Please add at least one item',
//                 type: 'error'
//             });
//             return;
//         }

//         setIsSaving(true);

//         try {
//             // Prepare items for submission
//             const preparedItems = items.map(item => {
//                 // Extract unit ID correctly
//                 let unitId = null;
//                 if (item.unit) {
//                     if (typeof item.unit === 'object' && item.unit._id) {
//                         unitId = item.unit._id;
//                     } else if (typeof item.unit === 'string') {
//                         unitId = item.unit;
//                     }
//                 }

//                 // Format expiry date
//                 let expiryDate = item.expiryDate;
//                 if (expiryDate) {
//                     if (typeof expiryDate === 'string' && expiryDate.includes('T')) {
//                         expiryDate = expiryDate.split('T')[0];
//                     } else if (expiryDate instanceof Date) {
//                         expiryDate = expiryDate.toISOString().split('T')[0];
//                     }
//                 } else {
//                     const defaultDate = new Date();
//                     defaultDate.setFullYear(defaultDate.getFullYear() + 2);
//                     expiryDate = defaultDate.toISOString().split('T')[0];
//                 }

//                 return {
//                     item: item.item,
//                     batchNumber: item.batchNumber || 'XXX',
//                     expiryDate: expiryDate,
//                     quantity: Number(item.quantity) || 0,
//                     unit: unitId,
//                     price: Number(item.price) || 0,
//                     vatStatus: item.vatStatus || 'vatable'
//                 };
//             });

//             const calculatedValues = calculateTotal();

//             // Prepare bill data
//             const billData = {
//                 accountId: formData.accountId,
//                 items: preparedItems,
//                 vatPercentage: Number(formData.vatPercentage) || 13,
//                 transactionDateNepali: formData.transactionDateNepali,
//                 transactionDateRoman: formData.transactionDateRoman,
//                 billDate: formData.billDate,
//                 nepaliDate: formData.nepaliDate,
//                 isVatExempt: formData.isVatExempt,
//                 discountPercentage: Number(formData.discountPercentage) || 0,
//                 discountAmount: Number(formData.discountAmount) || 0,
//                 paymentMode: formData.paymentMode,
//                 roundOffAmount: Number(formData.roundOffAmount) || 0,
//                 originalSalesBill: salesInvoiceData?._id || null,
//                 originalSalesBillNumber: formData.salesInvoiceNumber || '',
//                 subTotal: calculatedValues.subTotal,
//                 taxableAmount: calculatedValues.taxableAmount,
//                 nonTaxableAmount: calculatedValues.nonTaxableAmount,
//                 vatAmount: calculatedValues.vatAmount,
//                 totalAmount: calculatedValues.totalAmount,
//                 print
//             };

//             const response = await api.post('/api/retailer/sales-return', billData);

//             if (response.data.success) {
//                 setNotification({
//                     show: true,
//                     message: 'Sales return saved successfully!',
//                     type: 'success'
//                 });

//                 setTransactionCache(new Map());

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
//                     message: response.data.message || response.data.error || 'Failed to save sales return',
//                     type: 'error'
//                 });
//                 setIsSaving(false);
//             }
//         } catch (error) {
//             console.error('Error saving sales return:', error);
//             setNotification({
//                 show: true,
//                 message: error.response?.data?.message || error.response?.data?.error || 'Failed to save sales return',
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

//     const handleTransactionModalClose = () => {
//         setShowTransactionModal(false);

//         setTimeout(() => {
//             const headerQuantityInput = document.getElementById('headerQuantity');
//             if (headerQuantityInput) {
//                 headerQuantityInput.focus();
//                 headerQuantityInput.select();
//             } else if (items.length > 0) {
//                 const quantityInput = document.getElementById(`quantity-${items.length - 1}`);
//                 if (quantityInput) {
//                     quantityInput.focus();
//                     quantityInput.select();
//                 }
//             }
//         }, 100);
//     };

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

//     const fetchAccounts = async () => {
//         try {
//             const response = await api.get('/api/retailer/fetchlatest/accounts');
//             const sortedAccounts = response.data.sort((a, b) => a.name.localeCompare(b.name));
//             setAccounts(sortedAccounts);
//         } catch (error) {
//             console.error('Error fetching accounts:', error);
//             setNotification({
//                 show: true,
//                 message: 'Error refreshing accounts',
//                 type: 'error'
//             });
//         }
//     };

//     const handleAccountCreationModalClose = () => {
//         setShowAccountCreationModal(false);
//         setShowAccountModal(true);
//         fetchAccounts();
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

//     const handleHeaderSearchFocus = () => {
//         if (headerLastSearchQuery && !headerSearchQuery) {
//             setHeaderShouldShowLastSearchResults(true);
//             if (headerLastSearchQuery.trim() !== '') {
//                 fetchItemsFromBackend(headerLastSearchQuery, 1, true);
//             }
//         }
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

//         if (item.stockEntries && item.stockEntries.length > 0) {
//             const sortedStockEntries = item.stockEntries.sort((a, b) => new Date(a.date) - new Date(b.date));
//             const firstStockEntry = sortedStockEntries[0];
//             setSelectedItemRate(firstStockEntry.price || 0);
//             setSelectedItemBatchNumber(firstStockEntry.batchNumber || '');

//             let expiryDate = '';
//             if (item.firstExpiryDate) {
//                 expiryDate = item.firstExpiryDate;
//             } else if (firstStockEntry.expiryDate) {
//                 if (firstStockEntry.expiryDate instanceof Date) {
//                     expiryDate = firstStockEntry.expiryDate.toISOString().split('T')[0];
//                 } else if (typeof firstStockEntry.expiryDate === 'string') {
//                     try {
//                         const parsedDate = new Date(firstStockEntry.expiryDate);
//                         if (!isNaN(parsedDate.getTime())) {
//                             expiryDate = parsedDate.toISOString().split('T')[0];
//                         }
//                     } catch (error) {
//                         console.error('Error parsing expiry date:', error);
//                     }
//                 }
//             }
//             setSelectedItemExpiryDate(expiryDate);
//         }

//         let hasTransactions = false;

//         if (transactionSettings.displayTransactionsForSalesReturn && formData.accountId) {
//             const cacheKey = `${item._id}-${formData.accountId}`;

//             if (transactionCache.has(cacheKey)) {
//                 const cachedTransactions = transactionCache.get(cacheKey);
//                 if (cachedTransactions.length > 0) {
//                     setTransactions(cachedTransactions);
//                     setShowTransactionModal(true);
//                     hasTransactions = true;
//                 }
//             }

//             if (!hasTransactions) {
//                 try {
//                     setIsLoadingTransactions(true);

//                     const controller = new AbortController();
//                     const timeoutId = setTimeout(() => controller.abort(), 3000);

//                     const response = await api.get(`/api/retailer/transactions/${item._id}/${formData.accountId}/Sales`, {
//                         signal: controller.signal
//                     });

//                     clearTimeout(timeoutId);

//                     if (response.data.success && response.data.data.transactions.length > 0) {
//                         setTransactionCache(prev => new Map(prev.set(cacheKey, response.data.data.transactions)));
//                         setTransactions(response.data.data.transactions);
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
//                 const quantityInput = document.getElementById('headerQuantity');
//                 if (quantityInput) {
//                     quantityInput.focus();
//                     quantityInput.select();
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

//         // Validate required fields
//         if (!validateHeaderFields()) {
//             return;
//         }

//         const totalStock = selectedItemForInsert.stockEntries?.reduce((sum, entry) => sum + (entry.quantity || 0), 0) || 0;

//         if (selectedItemQuantity > totalStock) {
//             setNotification({
//                 show: true,
//                 message: `Quantity (${selectedItemQuantity}) exceeds available stock (${totalStock}) for "${selectedItemForInsert.name}"`,
//                 type: 'error'
//             });

//             setTimeout(() => {
//                 const quantityInput = document.getElementById('headerQuantity');
//                 if (quantityInput) {
//                     quantityInput.focus();
//                     quantityInput.select();
//                 }
//             }, 100);

//             return;
//         }

//         if (selectedItemQuantity > 0) {
//             const existingItems = items.filter(item => item.item === selectedItemForInsert._id);
//             if (existingItems.length > 0) {
//                 const totalExistingQuantity = existingItems.reduce((sum, item) => {
//                     return sum + (parseFloat(item.quantity) || 0);
//                 }, 0);

//                 const combinedQuantity = totalExistingQuantity + parseFloat(selectedItemQuantity);

//                 if (combinedQuantity > totalStock) {
//                     setNotification({
//                         show: true,
//                         message: `Stock exceeded (${combinedQuantity}/${totalStock})`,
//                         type: 'error'
//                     });

//                     setTimeout(() => {
//                         const quantityInput = document.getElementById('headerQuantity');
//                         if (quantityInput) {
//                             quantityInput.focus();
//                             quantityInput.select();
//                         }
//                     }, 100);

//                     return;
//                 }
//             }
//         }

//         const sortedStockEntries = selectedItemForInsert.stockEntries.sort((a, b) => new Date(a.date) - new Date(b.date));
//         const firstStockEntry = sortedStockEntries[0] || {};

//         const newItem = {
//             item: selectedItemForInsert._id,
//             uniqueNumber: selectedItemForInsert.uniqueNumber || 'N/A',
//             hscode: selectedItemForInsert.hscode,
//             name: selectedItemForInsert.name,
//             category: selectedItemForInsert.category?.name || 'No Category',
//             batchNumber: selectedItemBatchNumber || firstStockEntry.batchNumber || '',
//             expiryDate: selectedItemExpiryDate || (firstStockEntry.expiryDate ? new Date(firstStockEntry.expiryDate).toISOString().split('T')[0] : ''),
//             quantity: selectedItemQuantity || 0,
//             unit: selectedItemForInsert.unit,
//             price: selectedItemRate || Math.round(firstStockEntry.price * 100) / 100,
//             amount: (selectedItemQuantity || 0) * (selectedItemRate || Math.round(firstStockEntry.price * 100) / 100),
//             vatStatus: selectedItemForInsert.vatStatus,
//             uniqueUuId: firstStockEntry.uniqueUuId
//         };

//         setItems([...items, newItem]);

//         setSelectedItemForInsert(null);
//         setSelectedItemQuantity(0);
//         setSelectedItemRate(0);
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

//     const handlePrintAfterSaveChange = (e) => {
//         const isChecked = e.target.checked;
//         setPrintAfterSave(isChecked);
//         localStorage.setItem('printAfterSaveSalesReturn', isChecked);
//     };

//     const printImmediately = async (billId) => {
//         try {
//             const response = await api.get(`/api/retailer/sales-return/${billId}/print`);
//             const printData = response.data.data;

//             const tempDiv = document.createElement('div');
//             tempDiv.style.position = 'absolute';
//             tempDiv.style.left = '-9999px';
//             document.body.appendChild(tempDiv);

//             tempDiv.innerHTML = `
//                 <div id="printableContent">
//                     <div class="print-invoice-container">
//                         <div class="print-invoice-header">
//                             <div class="print-company-name">${printData.currentCompanyName}</div>
//                             <div class="print-company-details">
//                                 ${printData.currentCompany.address} | Tel: ${printData.currentCompany.phone} | PAN: ${printData.currentCompany.pan}
//                             </div>
//                             <div class="print-invoice-title">SALES RETURN</div>
//                         </div>

//                         <div class="print-invoice-details">
//                             <div>
//                                 <div><strong>M/S:</strong> ${printData.bill.account?.name || printData.bill.cashAccount || 'Account Not Found'}</div>
//                                 <div><strong>Address:</strong> ${printData.bill.account?.address || printData.bill.cashAccountAddress || 'N/A'}</div>
//                                 <div><strong>PAN:</strong> ${printData.bill.account?.pan || printData.bill.cashAccountPan || 'N/A'} | <strong>Tel:</strong> ${printData.bill.account?.phone || printData.bill.cashAccountPhone || 'N/A'}</div>
//                                 <div><strong>Email:</strong> ${printData.bill.account?.email || printData.bill.cashAccountEmail || 'N/A'}</div>
//                             </div>
//                             <div>
//                                 <div><strong>Invoice No:</strong> ${printData.bill.billNumber}</div>
//                                 <div><strong>Transaction Date:</strong> ${new Date(printData.bill.transactionDate).toLocaleDateString()}</div>
//                                 <div><strong>Invoice Issue Date:</strong> ${new Date(printData.bill.date).toLocaleDateString()}</div>
//                                 <div><strong>Mode of Payment:</strong> ${printData.bill.paymentMode}</div>
//                             </div>
//                         </div>

//                         <table class="print-invoice-table">
//                             <thead>
//                                 <tr>
//                                     <th>S.N.</th>
//                                     <th>#</th>
//                                     <th>HSN</th>
//                                     <th>Description of Goods</th>
//                                     <th>Unit</th>
//                                     <th>Batch</th>
//                                     <th>Expiry</th>
//                                     <th>Qty</th>
//                                     <th>Price (Rs.)</th>
//                                     <th>Total (Rs.)</th>
//                                 </tr>
//                             </thead>
//                             <tbody>
//                                 ${printData.bill.items.map((item, i) => `
//                                     <tr key="${i}">
//                                         <td>${i + 1}</td>
//                                         <td>${item.item.uniqueNumber}</td>
//                                         <td>${item.item.hscode}</td>
//                                         <td>
//                                             ${item.item.vatStatus === 'vatExempt' ?
//                     `${item.item.name} *` :
//                     item.item.name
//                 }
//                                         </td>
//                                         <td>${item.item.unit?.name || ''}</td>
//                                         <td>${item.batchNumber}</td>
//                                         <td>${item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'N/A'}</td>
//                                         <td>${item.quantity}</td>
//                                         <td>${item.price.toFixed(2)}</td>
//                                         <td>${(item.quantity * item.price).toFixed(2)}</td>
//                                     </tr>
//                                 `).join('')}
//                             </tbody>
//                             <tr>
//                                 <td colSpan="10" style="border-bottom: 1px solid #000"></td>
//                             </tr>
//                         </table>

//                         <table class="print-totals-table">
//                             <tbody>
//                                 <tr>
//                                     <td><strong>Sub-Total:</strong></td>
//                                     <td class="print-text-right">${printData.bill.subTotal.toFixed(2)}</td>
//                                 </tr>
//                                 <tr>
//                                     <td><strong>Discount:</strong></td>
//                                     <td class="print-text-right">${printData.bill.discountAmount.toFixed(2)}</td>
//                                 </tr>
//                                 <tr>
//                                     <td><strong>Non-Taxable:</strong></td>
//                                     <td class="print-text-right">${printData.bill.nonVatSalesReturn.toFixed(2)}</td>
//                                 </tr>
//                                 <tr>
//                                     <td><strong>Taxable Amount:</strong></td>
//                                     <td class="print-text-right">${printData.bill.taxableAmount.toFixed(2)}</td>
//                                 </tr>
//                                 ${!printData.bill.isVatExempt ? `
//                                     <tr>
//                                         <td><strong>VAT (${printData.bill.vatPercentage}%):</strong></td>
//                                         <td class="print-text-right">${(printData.bill.taxableAmount * printData.bill.vatPercentage / 100).toFixed(2)}</td>
//                                     </tr>
//                                 ` : ''}
//                                 <tr>
//                                     <td><strong>Round Off:</strong></td>
//                                     <td class="print-text-right">${printData.bill.roundOffAmount.toFixed(2)}</td>
//                                 </tr>
//                                 <tr>
//                                     <td><strong>Grand Total:</strong></td>
//                                     <td class="print-text-right">${printData.bill.totalAmount.toFixed(2)}</td>
//                                 </tr>
//                             </tbody>
//                         </table>

//                         <div class="print-amount-in-words">
//                             <strong>In Words:</strong> ${convertToRupeesAndPaisa(printData.bill.totalAmount)} Only.
//                         </div>
//                         <br /><br />
//                         <div class="print-signature-area">
//                             <div class="print-signature-box">Received By</div>
//                             <div class="print-signature-box">Prepared By: ${printData.bill.user.name}</div>
//                             <div class="print-signature-box">For: ${printData.currentCompanyName}</div>
//                         </div>
//                     </div>
//                 </div>
//             `;

//             const styles = `
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
//                     border-bottom: 1px solid #000;
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
//                     margin: 1mm 0;
//                     font-weight: bold;
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
//                     border-top: 1px solid #000;
//                     border-bottom: 1px solid #000;
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
//                     border-top: 1px solid #000;
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
//             `;

//             const printWindow = window.open('', '_blank');
//             printWindow.document.write(`
//                 <html>
//                     <head>
//                         <title>Sales_Return_${printData.bill.billNumber}</title>
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
//                 message: 'Bill saved but failed to load print data',
//                 type: 'warning'
//             });
//         }
//     };

//     const totals = calculateTotal();

//     return (
//         <div className="container-fluid">
//             <Header />
//             <div className="card mt-2 shadow-lg p-2 animate__animated animate__fadeInUp expanded-card ledger-card compact">
//                 <div className="card-header">
//                     <div className="d-flex justify-content-between align-items-center">
//                         <h2 className="card-title mb-0">
//                             <i className="bi bi-file-text me-2"></i>
//                             Credit Sales Return Entry
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
//                                     <div className="col-12 col-md-6 col-lg-2">
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

//                                     <div className="col-12 col-md-6 col-lg-2">
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
//                                     <div className="col-12 col-md-6 col-lg-2">
//                                         <div className="position-relative">
//                                             <input
//                                                 type="date"
//                                                 name="transactionDateRoman"
//                                                 id="transactionDateRoman"
//                                                 className="form-control form-control-sm"
//                                                 ref={company.dateFormat === 'roman' ? transactionDateRef : null}
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

//                                     <div className="col-12 col-md-6 col-lg-2">
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
//                                         Inv. No:
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
//                                     <div className="input-group">
//                                         <input
//                                             type="text"
//                                             name="salesInvoiceNumber"
//                                             id="salesInvoiceNumber"
//                                             className="form-control form-control-sm"
//                                             autoComplete='off'
//                                             value={formData.salesInvoiceNumber || ''}
//                                             onChange={(e) => setFormData({ ...formData, salesInvoiceNumber: e.target.value })}
//                                             onBlur={fetchSalesBillDetails}
//                                             onKeyDown={(e) => {
//                                                 if (e.key === 'Enter') {
//                                                     e.preventDefault();
//                                                     fetchSalesBillDetails(e);
//                                                     handleKeyDown(e, 'salesInvoiceNumber');
//                                                 }
//                                             }}
//                                             placeholder="Enter org. sales invoice"
//                                             disabled={salesInvoiceLoading}
//                                             style={{
//                                                 height: '26px',
//                                                 fontSize: '0.875rem',
//                                                 paddingTop: '0.75rem',
//                                                 width: '100%'
//                                             }}
//                                         />
//                                         {salesInvoiceLoading && (
//                                             <span className="input-group-text">
//                                                 <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
//                                             </span>
//                                         )}
//                                     </div>
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
//                                         Org. Inv. No:
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
//                                                 onChange={(e) => {
//                                                     const value = parseFloat(e.target.value) || 0;
//                                                     setSelectedItemQuantity(value);
//                                                     if (selectedItemForInsert) {
//                                                         const totalStock = selectedItemForInsert.stockEntries?.reduce((sum, entry) => sum + (entry.quantity || 0), 0) || 0;
//                                                         const existingItems = items.filter(item => item.item === selectedItemForInsert._id);
//                                                         let totalExistingQuantity = 0;
//                                                         if (existingItems.length > 0) {
//                                                             totalExistingQuantity = existingItems.reduce((sum, item) => {
//                                                                 return sum + (parseFloat(item.quantity) || 0);
//                                                             }, 0);
//                                                         }
//                                                         const availableStock = totalStock - totalExistingQuantity;
//                                                         if (value > availableStock) {
//                                                             setNotification({
//                                                                 show: true,
//                                                                 message: `Stock exceeded ${value}/${availableStock}`,
//                                                                 type: 'warning'
//                                                             });
//                                                         }
//                                                     }
//                                                 }}
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
//                                             {selectedItemForInsert ? (selectedItemForInsert.unit?.name || 'N/A') : '-'}
//                                         </td>
//                                         <td width="8%" style={{ padding: '2px', backgroundColor: '#ffffff' }}>
//                                             <input
//                                                 type="number"
//                                                 className="form-control form-control-sm"
//                                                 placeholder="Rate"
//                                                 id="headerRate"
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
//                                                 onClick={() => {
//                                                     if (selectedItemForInsert && selectedItemQuantity > 0) {
//                                                         const totalStock = selectedItemForInsert.stockEntries?.reduce((sum, entry) => sum + (entry.quantity || 0), 0) || 0;
//                                                         const existingItems = items.filter(item => item.item === selectedItemForInsert._id);
//                                                         let totalExistingQuantity = 0;
//                                                         if (existingItems.length > 0) {
//                                                             totalExistingQuantity = existingItems.reduce((sum, item) => {
//                                                                 return sum + (parseFloat(item.quantity) || 0);
//                                                             }, 0);
//                                                         }
//                                                         const availableStock = totalStock - totalExistingQuantity;
//                                                         if (selectedItemQuantity > availableStock) {
//                                                             setNotification({
//                                                                 show: true,
//                                                                 message: `Stock exceeded ${selectedItemQuantity}/${availableStock}`,
//                                                                 type: 'error'
//                                                             });
//                                                             return;
//                                                         }
//                                                     }
//                                                     insertSelectedItem();
//                                                     setTimeout(() => {
//                                                         if (itemsTableRef.current) {
//                                                             itemsTableRef.current.scrollTop = itemsTableRef.current.scrollHeight;
//                                                         }
//                                                     }, 50);
//                                                 }}
//                                                 disabled={!selectedItemForInsert}
//                                                 title={selectedItemForInsert ?
//                                                     `Insert item ${selectedItemQuantity > 0 ? `(Quantity: ${selectedItemQuantity})` : '(Quantity will be 0)'}`
//                                                     : 'Insert item'}
//                                                 onKeyDown={(e) => {
//                                                     if ((e.key === 'Tab' || e.key === 'Enter')) {
//                                                         e.preventDefault();
//                                                         if (selectedItemForInsert && selectedItemQuantity > 0) {
//                                                             const totalStock = selectedItemForInsert.stockEntries?.reduce((sum, entry) => sum + (entry.quantity || 0), 0) || 0;
//                                                             const existingItems = items.filter(item => item.item === selectedItemForInsert._id);
//                                                             let totalExistingQuantity = 0;
//                                                             if (existingItems.length > 0) {
//                                                                 totalExistingQuantity = existingItems.reduce((sum, item) => {
//                                                                     return sum + (parseFloat(item.quantity) || 0);
//                                                                 }, 0);
//                                                             }
//                                                             const availableStock = totalStock - totalExistingQuantity;
//                                                             if (selectedItemQuantity > availableStock) {
//                                                                 setNotification({
//                                                                     show: true,
//                                                                     message: `Stock exceeded ${selectedItemQuantity}/${availableStock}`,
//                                                                     type: 'error'
//                                                                 });
//                                                                 return;
//                                                             }
//                                                         }
//                                                         insertSelectedItem();
//                                                         setTimeout(() => {
//                                                             if (itemsTableRef.current) {
//                                                                 itemsTableRef.current.scrollTop = itemsTableRef.current.scrollHeight;
//                                                             }
//                                                         }, 50);
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
//                                         <th width="8%" style={{ padding: '3px', fontSize: '0.75rem' }}>Rate</th>
//                                         <th width="10%" style={{ padding: '3px', fontSize: '0.75rem' }}>Amount</th>
//                                         <th width="10%" style={{ padding: '3px', fontSize: '0.75rem' }}>Action</th>
//                                     </tr>
//                                 </thead>
//                                 <tbody id="items" style={{ backgroundColor: '#fff' }}>
//                                     {items.map((item, index) => {
//                                         const availableStock = getAvailableStockForDisplay(item);
//                                         const remainingStock = getRemainingStock(item);
//                                         return (
//                                             <tr key={index} className={`item ${item.vatStatus === 'vatable' ? 'vatable-item' : 'non-vatable-item'}`} style={{ height: '26px' }}>
//                                                 <td style={{ padding: '3px', fontSize: '0.75rem' }}>{index + 1}</td>
//                                                 <td style={{ padding: '3px', fontSize: '0.75rem' }}>{item.uniqueNumber}</td>
//                                                 <td style={{ padding: '3px', fontSize: '0.75rem' }}>
//                                                     <input type="hidden" name={`items[${index}][hscode]`} value={item.hscode} />
//                                                     {item.hscode}
//                                                 </td>
//                                                 <td style={{ padding: '3px', fontSize: '0.75rem' }}>
//                                                     <input type="hidden" name={`items[${index}][item]`} value={item.item} />
//                                                     {item.name}
//                                                 </td>
//                                                 <td style={{ padding: '3px' }}>
//                                                     <input
//                                                         type="text"
//                                                         name={`items[${index}][batchNumber]`}
//                                                         className="form-control form-control-sm"
//                                                         id={`batchNumber-${index}`}
//                                                         value={item.batchNumber}
//                                                         onChange={(e) => updateItemField(index, 'batchNumber', e.target.value)}
//                                                         required
//                                                         onFocus={(e) => {
//                                                             e.target.select();
//                                                         }}
//                                                         onKeyDown={(e) => {
//                                                             if (e.key === 'Enter') {
//                                                                 e.preventDefault();
//                                                                 document.getElementById(`expiryDate-${index}`)?.focus();
//                                                             }
//                                                         }}
//                                                         readOnly={!!salesInvoiceData}
//                                                         style={{
//                                                             height: '20px',
//                                                             fontSize: '0.75rem',
//                                                             padding: '0 4px'
//                                                         }}
//                                                     />
//                                                 </td>
//                                                 <td style={{ padding: '3px' }}>
//                                                     <input
//                                                         type="date"
//                                                         name={`items[${index}][expiryDate]`}
//                                                         className="form-control form-control-sm"
//                                                         id={`expiryDate-${index}`}
//                                                         value={item.expiryDate}
//                                                         onChange={(e) => updateItemField(index, 'expiryDate', e.target.value)}
//                                                         required
//                                                         onKeyDown={(e) => {
//                                                             if (e.key === 'Enter') {
//                                                                 e.preventDefault();
//                                                                 document.getElementById(`quantity-${index}`)?.focus();
//                                                             }
//                                                         }}
//                                                         readOnly={!!salesInvoiceData}
//                                                         style={{
//                                                             height: '20px',
//                                                             fontSize: '0.75rem',
//                                                             padding: '0 4px'
//                                                         }}
//                                                     />
//                                                 </td>
//                                                 <td style={{ padding: '3px' }}>
//                                                     <input
//                                                         type="number"
//                                                         name={`items[${index}][quantity]`}
//                                                         className={`form-control form-control-sm ${quantityErrors[index] ? 'is-invalid' : ''}`}
//                                                         id={`quantity-${index}`}
//                                                         value={item.quantity}
//                                                         onChange={(e) => {
//                                                             const value = parseFloat(e.target.value) || 0;
//                                                             if (stockValidation.itemStockMap.has(item.item)) {
//                                                                 const isValid = validateQuantity(index, value);
//                                                                 const availableStock = getAvailableStockForDisplay(item);
//                                                                 const remainingStock = getRemainingStock(item);
//                                                                 if (!isValid) {
//                                                                     setQuantityErrors(prev => ({
//                                                                         ...prev,
//                                                                         [index]: `Stock: ${availableStock} | Rem.: ${Math.max(remainingStock, 0)}`
//                                                                     }));
//                                                                 } else {
//                                                                     setQuantityErrors(prev => {
//                                                                         const newErrors = { ...prev };
//                                                                         delete newErrors[index];
//                                                                         return newErrors;
//                                                                     });
//                                                                 }
//                                                             }
//                                                             updateItemField(index, 'quantity', value);
//                                                         }}
//                                                         onBlur={(e) => {
//                                                             const value = parseFloat(e.target.value) || 0;
//                                                             if (stockValidation.itemStockMap.has(item.item)) {
//                                                                 const availableStock = getAvailableStockForDisplay(item);
//                                                                 const remainingStock = getRemainingStock(item);
//                                                                 if (value > availableStock) {
//                                                                     setQuantityErrors(prev => ({
//                                                                         ...prev,
//                                                                         [index]: `Stock: ${availableStock} | Rem.: ${Math.max(remainingStock, 0)}`
//                                                                     }));
//                                                                     setTimeout(() => {
//                                                                         updateItemField(index, 'quantity', availableStock);
//                                                                     }, 100);
//                                                                 }
//                                                             }
//                                                         }}
//                                                         required
//                                                         min="0"
//                                                         step="0.01"
//                                                         onFocus={(e) => {
//                                                             e.target.select();
//                                                         }}
//                                                         onKeyDown={(e) => {
//                                                             if (e.key === 'Enter') {
//                                                                 e.preventDefault();
//                                                                 if (!quantityErrors[index]) {
//                                                                     document.getElementById(`price-${index}`)?.focus();
//                                                                 } else {
//                                                                     e.target.focus();
//                                                                     e.target.select();
//                                                                 }
//                                                             } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
//                                                                 e.preventDefault();
//                                                                 const currentValue = parseFloat(e.target.value) || 0;
//                                                                 const step = e.shiftKey ? 10 : (e.ctrlKey ? 0.1 : 1);
//                                                                 const newValue = e.key === 'ArrowUp' ? currentValue + step : Math.max(0, currentValue - step);
//                                                                 if (stockValidation.itemStockMap.has(item.item)) {
//                                                                     const availableStock = getAvailableStockForDisplay(item);
//                                                                     const remainingStock = getRemainingStock(item);
//                                                                     if (newValue > availableStock) {
//                                                                         setQuantityErrors(prev => ({
//                                                                             ...prev,
//                                                                             [index]: `Stock: ${availableStock} | Rem.: ${Math.max(remainingStock, 0)}`
//                                                                         }));
//                                                                         updateItemField(index, 'quantity', availableStock);
//                                                                     } else {
//                                                                         setQuantityErrors(prev => {
//                                                                             const newErrors = { ...prev };
//                                                                             delete newErrors[index];
//                                                                             return newErrors;
//                                                                         });
//                                                                         updateItemField(index, 'quantity', newValue);
//                                                                     }
//                                                                 } else {
//                                                                     updateItemField(index, 'quantity', newValue);
//                                                                 }
//                                                             }
//                                                         }}
//                                                         style={{
//                                                             height: '20px',
//                                                             fontSize: '0.75rem',
//                                                             padding: '0 4px',
//                                                             backgroundColor: quantityErrors[index] ? '#fff5f5' : '#fff'
//                                                         }}
//                                                     />
//                                                     {quantityErrors[index] && (
//                                                         <div className="invalid-feedback d-block small" style={{
//                                                             fontSize: '0.65rem',
//                                                             color: '#dc3545',
//                                                             fontWeight: 'bold'
//                                                         }}>
//                                                             {quantityErrors[index]}
//                                                         </div>
//                                                     )}
//                                                 </td>
//                                                 <td className="text-nowrap" style={{ padding: '3px', fontSize: '0.75rem' }}>
//                                                     {item.unit?.name}
//                                                     <input type="hidden" name={`items[${index}][unit]`} value={item.unit?._id} />
//                                                 </td>
//                                                 <td style={{ padding: '3px' }}>
//                                                     <input
//                                                         type="number"
//                                                         name={`items[${index}][price]`}
//                                                         className="form-control form-control-sm"
//                                                         id={`price-${index}`}
//                                                         value={Math.round(item.price * 100) / 100}
//                                                         onChange={(e) => updateItemField(index, 'price', e.target.value)}
//                                                         onFocus={(e) => {
//                                                             e.target.select();
//                                                             setTimeout(() => {
//                                                                 const row = e.target.closest('tr');
//                                                                 if (row && itemsTableRef.current) {
//                                                                     row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
//                                                                 }
//                                                             }, 10);
//                                                         }}
//                                                         onKeyDown={(e) => {
//                                                             if (e.key === 'Enter') {
//                                                                 e.preventDefault();
//                                                                 itemSearchRef.current?.focus();
//                                                             }
//                                                         }}
//                                                         readOnly={!!salesInvoiceData}
//                                                         style={{
//                                                             height: '20px',
//                                                             fontSize: '0.75rem',
//                                                             padding: '0 4px'
//                                                         }}
//                                                     />
//                                                 </td>
//                                                 <td className="item-amount" style={{ padding: '3px', fontSize: '0.75rem' }}>{formatter.format(item.amount)}</td>
//                                                 <td className="text-center" style={{ padding: '2px', whiteSpace: 'nowrap' }}>
//                                                     <button
//                                                         type="button"
//                                                         className="btn btn-sm btn-info py-0 px-1"
//                                                         onClick={() => fetchLastTransactions(item.item)}
//                                                         title="View last transactions"
//                                                         disabled={isLoadingTransactions}
//                                                         style={{
//                                                             height: '18px',
//                                                             width: '18px',
//                                                             minWidth: '18px',
//                                                             fontSize: '0.6rem',
//                                                             marginRight: '2px',
//                                                             backgroundColor: '#0dcaf0',
//                                                             borderColor: '#0dcaf0'
//                                                         }}
//                                                     >
//                                                         {isLoadingTransactions ? (
//                                                             <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" style={{ width: "8px", height: "8px" }}></span>
//                                                         ) : (
//                                                             <i className="bi bi-clock-history"></i>
//                                                         )}
//                                                     </button>
//                                                     <button
//                                                         type="button"
//                                                         className="btn btn-sm btn-danger py-0 px-1"
//                                                         onClick={() => removeItem(index)}
//                                                         style={{
//                                                             height: '18px',
//                                                             width: '18px',
//                                                             minWidth: '18px',
//                                                             fontSize: '0.6rem',
//                                                             marginLeft: '2px',
//                                                             backgroundColor: '#dc3545',
//                                                             borderColor: '#dc3545'
//                                                         }}
//                                                     >
//                                                         <i className="bi bi-trash"></i>
//                                                     </button>
//                                                 </td>
//                                                 <td className="d-none">
//                                                     <input type="hidden" name={`items[${index}][vatStatus]`} value={item.vatStatus} />
//                                                 </td>
//                                             </tr>
//                                         );
//                                     })}
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

//                                     {company.vatEnabled && formData.isVatExempt !== 'true' && (
//                                         <tr id="taxableAmountRow">
//                                             <td style={{ padding: '1px' }}>
//                                                 <label className="form-label mb-0" style={{ fontSize: '0.8rem' }}>Taxable Amount:</label>
//                                             </td>
//                                             <td style={{ padding: '1px' }}>
//                                                 <p className="form-control-plaintext mb-0" style={{ fontSize: '0.8rem' }}>Rs. {totals.taxableAmount.toFixed(2)}</p>
//                                             </td>
//                                             <td style={{ padding: '1px' }}>
//                                                 <label className="form-label mb-0" style={{ fontSize: '0.8rem' }}>VAT %:</label>
//                                             </td>
//                                             <td style={{ padding: '1px' }}>
//                                                 <div className="position-relative">
//                                                     <input
//                                                         type="number"
//                                                         name="vatPercentage"
//                                                         id="vatPercentage"
//                                                         className="form-control form-control-sm"
//                                                         value={formData.vatPercentage}
//                                                         readOnly
//                                                         onFocus={(e) => {
//                                                             e.target.select();
//                                                         }}
//                                                         onKeyDown={(e) => {
//                                                             if (e.key === 'Enter') {
//                                                                 handleKeyDown(e, 'vatPercentage');
//                                                             }
//                                                         }}
//                                                         style={{
//                                                             height: '22px',
//                                                             fontSize: '0.875rem',
//                                                             paddingTop: '0.5rem',
//                                                             width: '100%',
//                                                             backgroundColor: '#f8f9fa'
//                                                         }}
//                                                     />
//                                                 </div>
//                                             </td>
//                                             <td style={{ padding: '1px' }}>
//                                                 <label className="form-label mb-0" style={{ fontSize: '0.8rem' }}>VAT Amount:</label>
//                                             </td>
//                                             <td style={{ padding: '1px' }}>
//                                                 <p className="form-control-plaintext mb-0" style={{ fontSize: '0.8rem' }}>Rs. {totals.vatAmount.toFixed(2)}</p>
//                                             </td>
//                                         </tr>
//                                     )}

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
//                         <div className="d-flex justify-content-between align-items-center">
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

//                             <div className="d-flex gap-2">
//                                 <button
//                                     type="button"
//                                     className="btn btn-secondary btn-sm d-flex align-items-center"
//                                     onClick={resetForm}
//                                     disabled={isSaving}
//                                     style={{
//                                         height: '26px',
//                                         padding: '0 12px',
//                                         fontSize: '0.8rem',
//                                         fontWeight: '500'
//                                     }}
//                                 >
//                                     <i className="bi bi-arrow-counterclockwise me-1" style={{ fontSize: '0.9rem' }}></i> Reset
//                                 </button>
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
//                                             Saving...
//                                         </>
//                                     ) : (
//                                         <>
//                                             <i className="bi bi-save me-1" style={{ fontSize: '0.9rem' }}></i> Save
//                                         </>
//                                     )}
//                                 </button>
//                             </div>
//                         </div>
//                     </form>
//                 </div>
//             </div>

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
//                                             <VirtualizedItemList
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
//                                 document.getElementById('salesInvoiceNumber').focus();
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
//                                     Last Transactions
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
//                                                         <td style={{ padding: '0.15rem 0.3rem' }}>{index + 1}</td>
//                                                         <td style={{ padding: '0.15rem 0.3rem', whiteSpace: 'nowrap' }}>
//                                                             {new NepaliDate(transaction.date).format('YYYY-MM-DD')}
//                                                         </td>
//                                                         <td style={{ padding: '0.15rem 0.3rem', fontWeight: '500' }}>
//                                                             {transaction.billNumber || 'N/A'}
//                                                         </td>
//                                                         <td style={{ padding: '0.15rem 0.3rem' }}>{transaction.type || 'N/A'}</td>
//                                                         <td style={{ padding: '0.15rem 0.3rem' }}>{transaction.purchaseSalesType || 'N/A'}</td>
//                                                         <td style={{ padding: '0.15rem 0.3rem' }}>{transaction.paymentMode || 'N/A'}</td>
//                                                         <td style={{ padding: '0.15rem 0.3rem', textAlign: 'right' }}>{transaction.quantity || 0}</td>
//                                                         <td style={{ padding: '0.15rem 0.3rem' }}>{transaction.unit?.name || 'N/A'}</td>
//                                                         <td style={{ padding: '0.15rem 0.3rem', textAlign: 'right', fontWeight: '500' }}>
//                                                             Rs.{transaction.price ? Math.round(transaction.price * 100) / 100 : 0}
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

// export default AddSalesReturn;

//-----------------------------------------------------------------------end

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
import VirtualizedItemList from '../../VirtualizedItemList';
import VirtualizedAccountList from '../../VirtualizedAccountList';

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

    const accountSearchRef = useRef(null);
    const itemSearchRef = useRef(null);
    const accountModalRef = useRef(null);
    const transactionModalRef = useRef(null);

    const api = axios.create({
        baseURL: process.env.REACT_APP_API_BASE_URL,
        withCredentials: true,
    });

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
                    // Get latest price from stockEntries
                    let latestPrice = 0;
                    let latestBatchNumber = '';
                    let latestExpiryDate = '';

                    if (item.stockEntries && item.stockEntries.length > 0) {
                        const sortedEntries = item.stockEntries.sort((a, b) =>
                            new Date(b.date) - new Date(a.date)
                        );
                        latestPrice = sortedEntries[0].price || 0;
                        latestBatchNumber = sortedEntries[0].batchNumber || '';
                        latestExpiryDate = sortedEntries[0].expiryDate || '';
                    }

                    return {
                        ...item,
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

    // Initial data loading
    // useEffect(() => {
    //     const fetchInitialData = async () => {
    //         try {
    //             const response = await api.get('/api/retailer/sales-return');
    //             const { data } = response;

    //             setCompany(data.data.company);
    //             setNextBillNumber(data.data.nextSalesReturnNumber);
    //             setFormData(prev => ({
    //                 ...prev,
    //                 billNumber: data.data.nextSalesReturnNumber
    //             }));

    //             fetchAccountsFromBackend('', 1);
    //             setIsInitialDataLoaded(true);
    //         } catch (error) {
    //             console.error('Error fetching initial data:', error);
    //         }
    //     };
    //     fetchInitialData();
    // }, []);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                // First, fetch the next bill number
                const numberResponse = await api.get('/api/retailer/sales-return/next-number');
                setFormData(prev => ({
                    ...prev,
                    billNumber: numberResponse.data.data.nextSalesReturnNumber
                }));

                // Then fetch other initial data (if needed)
                const response = await api.get('/api/retailer/sales-return');
                const { data } = response;

                setCompany(data.data.company);
                setNextBillNumber(numberResponse.data.data.nextSalesReturnNumber);

                fetchAccountsFromBackend('', 1);
                setIsInitialDataLoaded(true);
            } catch (error) {
                console.error('Error fetching initial data:', error);
            }
        };
        fetchInitialData();
    }, []);

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

    const loadMoreAccounts = () => {
        if (!isAccountSearching) {
            fetchAccountsFromBackend(accountSearchQuery, accountSearchPage + 1);
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


    const addItemToBill = async (item) => {
        if (itemSearchRef.current?.value) {
            setLastSearchQuery(itemSearchRef.current.value);
            setShouldShowLastSearchResults(true);
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
            item: item._id,
            uniqueNumber: item.uniqueNumber || 'N/A',
            hscode: item.hscode,
            name: item.name,
            category: item.category?.name || 'No Category',
            batchNumber: 'XXX',
            expiryDate: getDefaultExpiryDate(),
            quantity: 0,
            unit: item.unit,
            price: Math.round(firstStockEntry.price * 100) / 100 || 0,
            amount: 0,
            vatStatus: item.vatStatus,
            uniqueUuId: firstStockEntry.uniqueUuId
        };

        const updatedItems = [...items, newItem];
        setItems(updatedItems);
        setShowItemDropdown(false);
        itemSearchRef.current.value = '';

        setSearchQuery('');
        if (itemSearchRef.current) {
            itemSearchRef.current.value = '';
        }

        if (transactionSettings.displayTransactionsForSalesReturn && formData.accountId) {
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
            const quantityInput = document.getElementById(`quantity-${updatedItems.length - 1}`);
            if (quantityInput) {
                quantityInput.focus();
                quantityInput.select();
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
                const discountAmount = preciseMultiply(subTotal, preciseDivide(formData.discountPercentage, 100));
                setFormData(prev => ({
                    ...prev,
                    discountAmount: preciseRound(discountAmount, 2)
                }));
            } else if (formData.discountAmount) {
                const discountPercentage = subTotal > 0 ?
                    preciseMultiply(preciseDivide(formData.discountAmount, subTotal), 100) : 0;
                setFormData(prev => ({
                    ...prev,
                    discountPercentage: preciseRound(discountPercentage, 2)
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

        const roundOffAmount = parseFloat(formData.roundOffAmount) || 0;
        const totalAmount = preciseAdd(totalBeforeRoundOff, roundOffAmount);

        return {
            subTotal: preciseRound(subTotal, 2),
            taxableAmount: preciseRound(finalTaxableAmount, 2),
            nonTaxableAmount: preciseRound(finalNonTaxableAmount, 2),
            vatAmount: preciseRound(vatAmount, 2),
            totalAmount: preciseRound(totalAmount, 2),
            discountAmount: preciseRound(effectiveDiscount, 2),
            roundOffAmount: preciseRound(roundOffAmount, 2)
        };
    };

    const handleDiscountPercentageChange = (e) => {
        const value = parseFloat(e.target.value) || 0;
        const validatedValue = Math.min(Math.max(value, 0), 100);

        const subTotal = calculateTotal().subTotal;
        const discountAmount = preciseMultiply(subTotal, preciseDivide(validatedValue, 100));

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
            preciseMultiply(preciseDivide(validatedValue, subTotal), 100) : 0;

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

    // const resetForm = async () => {
    //     try {
    //         setIsLoading(true);

    //         const response = await api.get('/api/retailer/sales-return');
    //         const { data } = response;

    //         const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
    //         const currentRomanDate = new Date().toISOString().split('T')[0];

    //         setFormData({
    //             accountId: '',
    //             accountName: '',
    //             accountAddress: '',
    //             accountPan: '',
    //             transactionDateNepali: new NepaliDate(currentNepaliDate).format('YYYY-MM-DD'),
    //             transactionDateRoman: currentRomanDate,
    //             nepaliDate: new NepaliDate(currentNepaliDate).format('YYYY-MM-DD'),
    //             billDate: currentRomanDate,
    //             billNumber: data.data.nextSalesReturnNumber,
    //             paymentMode: 'credit',
    //             isVatExempt: 'all',
    //             discountPercentage: 0,
    //             discountAmount: 0,
    //             roundOffAmount: 0,
    //             vatPercentage: 13,
    //             salesInvoiceNumber: '',
    //             items: []
    //         });

    //         setAccountSearchQuery('');
    //         setAccountSearchPage(1);
    //         setAccountSearchResults([]);
    //         setHasMoreAccountResults(false);
    //         setTotalAccounts(0);

    //         fetchAccountsFromBackend('', 1);

    //         setAccounts([]);
    //         setNextBillNumber(data.data.nextSalesReturnNumber);
    //         setItems([]);
    //         setSalesInvoiceData(null);
    //         setSalesInvoiceLoading(false);
    //         clearCreditSalesReturnDraft();

    //         if (accountSearchRef.current) {
    //             accountSearchRef.current.value = '';
    //         }

    //         setSearchQuery('');
    //         setSearchResults([]);
    //         setSearchPage(1);
    //         setHasMoreSearchResults(false);
    //         setTotalSearchItems(0);
    //         setShowItemDropdown(false);

    //         setHeaderSearchQuery('');
    //         setHeaderLastSearchQuery('');
    //         setHeaderShouldShowLastSearchResults(false);
    //         setSelectedItemForInsert(null);

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

    const resetForm = async () => {
        try {
            setIsLoading(true);

            // Fetch the next bill number
            const numberResponse = await api.get('/api/retailer/sales-return/next-number');
            const nextBillNum = numberResponse.data.data.nextSalesReturnNumber;

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
                billNumber: nextBillNum, // Use the fetched number
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

            fetchAccountsFromBackend('', 1);

            setAccounts([]);
            setNextBillNumber(nextBillNum); // Update the state
            setItems([]);
            setSalesInvoiceData(null);
            setSalesInvoiceLoading(false);
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

                    // Show detailed warning message
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

                    // Clear the input field
                    setFormData(prev => ({ ...prev, salesInvoiceNumber: '' }));

                    // Clear any loaded data
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
                let isVatExemptValue = 'all'; // Default to 'all'

                if (billData.items && billData.items.length > 0) {
                    const vatStatuses = billData.items.map(item => {
                        return item.item?.vatStatus || item.vatStatus || 'vatable';
                    });

                    // Check if all items are vatable
                    const allVatable = vatStatuses.every(status => status === 'vatable');
                    // Check if all items are vatExempt
                    const allVatExempt = vatStatuses.every(status => status === 'vatExempt');

                    // Apply logic:
                    if (allVatable) {
                        isVatExemptValue = 'false'; // All items are vatable, so show 13%
                    } else if (allVatExempt) {
                        isVatExemptValue = 'true'; // All items are exempt, so show Exempt
                    } else {
                        isVatExemptValue = 'all'; // Mixed items, show All
                    }
                }

                // Update account information
                setFormData(prev => ({
                    ...prev,
                    accountId: billData.account?._id || '',
                    accountName: billData.account?.name || '',
                    accountAddress: billData.account?.address || '',
                    accountPan: billData.account?.pan || '',
                    // Copy bill summary details
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
                    // Handle unit
                    let unit = item.unit;
                    if (unit && typeof unit === 'string') {
                        unit = { _id: unit };
                    } else if (unit && unit._id) {
                        unit = { _id: unit._id, name: unit.name || '' };
                    } else {
                        unit = { _id: null, name: '' };
                    }

                    // Handle expiry date
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

                    // Use available quantity as default
                    const defaultQuantity = Math.max(0, item.availableQuantity || 0);

                    return {
                        item: item.item?._id || item.item,
                        _id: item.item?._id || item.item,
                        uniqueNumber: item.item?.uniqueNumber || '',
                        hscode: item.item?.hscode || '',
                        name: item.item?.name || '',
                        category: item.item?.category?.name || 'No Category',
                        batchNumber: item.batchNumber || 'XXX',
                        expiryDate: expiryDate,
                        quantity: defaultQuantity,
                        unit: unit,
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

                // Focus on first item's quantity
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
            // Prepare items for submission
            const preparedItems = items.map(item => {
                // Extract unit ID correctly
                let unitId = null;
                if (item.unit) {
                    if (typeof item.unit === 'object' && item.unit._id) {
                        unitId = item.unit._id;
                    } else if (typeof item.unit === 'string') {
                        unitId = item.unit;
                    }
                }

                // Format expiry date
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
                    item: item.item,
                    batchNumber: item.batchNumber || 'XXX',
                    expiryDate: expiryDate,
                    quantity: Number(item.quantity) || 0,
                    unit: unitId,
                    price: Number(item.price) || 0,
                    vatStatus: item.vatStatus || 'vatable'
                };
            });

            const calculatedValues = calculateTotal();

            // Prepare bill data
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
                originalSalesBill: salesInvoiceData?._id || null,
                originalSalesBillNumber: formData.salesInvoiceNumber || '',
                subTotal: calculatedValues.subTotal,
                taxableAmount: calculatedValues.taxableAmount,
                nonTaxableAmount: calculatedValues.nonTaxableAmount,
                vatAmount: calculatedValues.vatAmount,
                totalAmount: calculatedValues.totalAmount,
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
                const headerBatchInput = document.getElementById(`headerBatch`);
                if (headerBatchInput) {
                    headerBatchInput.focus();
                    headerBatchInput.select();
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

    const fetchAccounts = async () => {
        try {
            const response = await api.get('/api/retailer/fetchlatest/accounts');
            const sortedAccounts = response.data.sort((a, b) => a.name.localeCompare(b.name));
            setAccounts(sortedAccounts);
        } catch (error) {
            console.error('Error fetching accounts:', error);
            setNotification({
                show: true,
                message: 'Error refreshing accounts',
                type: 'error'
            });
        }
    };

    const handleAccountCreationModalClose = () => {
        setShowAccountCreationModal(false);
        setShowAccountModal(true);
        fetchAccounts();
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

    const handleHeaderSearchFocus = () => {
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

        // Set default values for batch and expiry
        setSelectedItemBatchNumber('XXX');
        setSelectedItemExpiryDate(getDefaultExpiryDate());

        if (item.stockEntries && item.stockEntries.length > 0) {
            const sortedStockEntries = item.stockEntries.sort((a, b) => new Date(a.date) - new Date(b.date));
            const firstStockEntry = sortedStockEntries[0];
            setSelectedItemRate(firstStockEntry.price || 0);
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
        }

        let hasTransactions = false;

        if (transactionSettings.displayTransactionsForSalesReturn && formData.accountId) {
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
                const headerBatchInput = document.getElementById('headerBatch');
                if (headerBatchInput) {
                    headerBatchInput.focus();
                    headerBatchInput.select();
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

        // Validate required fields
        if (!validateHeaderFields()) {
            return;
        }

        if (selectedItemQuantity > 0) {
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
                price: selectedItemRate || 0,
                amount: (selectedItemQuantity || 0) * (selectedItemRate || 0),
                vatStatus: selectedItemForInsert.vatStatus
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

    const handlePrintAfterSaveChange = (e) => {
        const isChecked = e.target.checked;
        setPrintAfterSave(isChecked);
        localStorage.setItem('printAfterSaveSalesReturn', isChecked);
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
                                <div><strong>M/S:</strong> ${printData.bill.account?.name || printData.bill.cashAccount || 'Account Not Found'}</div>
                                <div><strong>Address:</strong> ${printData.bill.account?.address || printData.bill.cashAccountAddress || 'N/A'}</div>
                                <div><strong>PAN:</strong> ${printData.bill.account?.pan || printData.bill.cashAccountPan || 'N/A'} | <strong>Tel:</strong> ${printData.bill.account?.phone || printData.bill.cashAccountPhone || 'N/A'}</div>
                                <div><strong>Email:</strong> ${printData.bill.account?.email || printData.bill.cashAccountEmail || 'N/A'}</div>
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
                                <td colSpan="10" style="border-bottom: 1px solid #000"></td>
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

    const totals = calculateTotal();

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
                            {company.dateFormat === 'nepali' ? (
                                <>
                                    <div className="col-12 col-md-6 col-lg-2">
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
                                            placeholder="Enter org. sales invoice"
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
                                            {selectedItemForInsert ? (selectedItemForInsert.unit?.name || 'N/A') : '-'}
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
                                                    <input type="hidden" name={`items[${index}][item]`} value={item.item} />
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
                                                const account = accounts.find(a => a._id === accountId);
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
