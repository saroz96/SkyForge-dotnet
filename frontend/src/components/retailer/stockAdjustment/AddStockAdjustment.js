// import React, { useState, useEffect, useRef } from 'react';
// import { useNavigate } from 'react-router-dom';
// import NepaliDate from 'nepali-date-converter';
// import axios from 'axios';
// import Header from '../Header';
// import NotificationToast from '../../NotificationToast';
// import '../../../stylesheet/noDateIcon.css'
// import VirtualizedItemList from '../../VirtualizedItemList';
// import useDebounce from '../../../hooks/useDebounce';
// import ProductModal from '../dashboard/modals/ProductModal';

// const AddStockAdjustment = () => {
//     const navigate = useNavigate();
//     const transactionDateRef = useRef(null);
//     const nepaliDateRef = useRef(null);
//     const marginPercentageRef = useRef(null);
//     const [showProductModal, setShowProductModal] = useState(false);
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
//         nepaliDate: '',
//         billDate: ''
//     });

//     const [searchQuery, setSearchQuery] = useState('');
//     const [lastSearchQuery, setLastSearchQuery] = useState('');
//     const [shouldShowLastSearchResults, setShouldShowLastSearchResults] = useState(false);
//     const debouncedSearchQuery = useDebounce(searchQuery, 50);

//     const [formData, setFormData] = useState({
//         adjustmentType: 'xcess',
//         nepaliDate: currentNepaliDate,
//         billDate: new Date().toISOString().split('T')[0],
//         billNumber: '',
//         isVatExempt: 'all',
//         note: '',
//         vatPercentage: 13,
//         items: []
//     });

//     const [items, setItems] = useState([]);
//     const [allItems, setAllItems] = useState([]);
//     const [filteredItems, setFilteredItems] = useState([]);
//     const [showItemDropdown, setShowItemDropdown] = useState(false);
//     const [company, setCompany] = useState({
//         dateFormat: 'english',
//         vatEnabled: true,
//         fiscalYear: {}
//     });
//     const [nextBillNumber, setNextBillNumber] = useState('');
//     const itemDropdownRef = useRef(null);
//     const itemSearchRef = useRef(null);

//     // Modals state
//     const [showSalesPriceModal, setShowSalesPriceModal] = useState(false);
//     const [showBatchModal, setShowBatchModal] = useState(false);
//     const [selectedItemIndex, setSelectedItemIndex] = useState(-1);
//     const [selectedItemForBatch, setSelectedItemForBatch] = useState(null);
//     const [salesPriceData, setSalesPriceData] = useState({
//         puPrice: 0,
//         marginPercentage: 0,
//         currency: 'NPR',
//         mrp: 0,
//         salesPrice: 0
//     });

//     const api = axios.create({
//         baseURL: process.env.REACT_APP_API_BASE_URL,
//         withCredentials: true,
//     });

//     useEffect(() => {
//         return () => {
//             // Reset search memory when component unmounts
//             setLastSearchQuery('');
//             setShouldShowLastSearchResults(false);
//         };
//     }, []);

//     useEffect(() => {
//         const fetchInitialData = async () => {
//             try {
//                 const response = await api.get('/api/retailer/stockAdjustments/new');
//                 const { data } = response;

//                 setCompany(data.data.company);
//                 setAllItems(data.data.items.sort((a, b) => a.name.localeCompare(b.name)));
//                 setNextBillNumber(data.data.nextBillNumber);

//                 setFormData(prev => ({
//                     ...prev,
//                     billNumber: data.data.nextBillNumber
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
//     };

//     const addItemToBill = (item, batchInfo = null) => {

//         // Store the search query when adding an item
//         if (itemSearchRef.current?.value) {
//             setLastSearchQuery(itemSearchRef.current.value);
//             setShouldShowLastSearchResults(true);
//         }

//         let newItem;

//         if (formData.adjustmentType === 'xcess') {
//             // For xcess type, create a new item with default values
//             newItem = {
//                 item: item._id,
//                 uniqueNumber: item.uniqueNumber || 'N/A',
//                 hscode: item.hscode,
//                 name: item.name,
//                 category: item.category?.name || 'No Category',
//                 batchNumber: 'XXX',
//                 expiryDate: getDefaultExpiryDate(),
//                 quantity: 0,
//                 unit: item.unit,
//                 puPrice: item.latestPuPrice || 0,
//                 price: item.latestPuPrice || 0, // Default price same as puPrice
//                 mrp: 0,
//                 amount: 0,
//                 vatStatus: item.vatStatus,
//                 reason: '',
//                 uniqueUuId: ''
//             };
//         } else {
//             // For short type, use the batch info
//             newItem = {
//                 item: item._id,
//                 uniqueNumber: item.uniqueNumber || 'N/A',
//                 hscode: item.hscode,
//                 name: item.name,
//                 category: item.category?.name || 'No Category',
//                 batchNumber: batchInfo.batchNumber || '',
//                 expiryDate: batchInfo.expiryDate ? formatDateForInput(batchInfo.expiryDate) : '',
//                 quantity: 0,
//                 unit: item.unit,
//                 puPrice: batchInfo.puPrice || 0,
//                 price: batchInfo.price || 0,
//                 mrp: batchInfo.mrp || 0,
//                 amount: 0,
//                 vatStatus: item.vatStatus,
//                 reason: '',
//                 uniqueUuId: batchInfo.uniqueUuId || ''
//             };
//         }

//         setItems([...items, newItem]);
//         setShowItemDropdown(false);
//         itemSearchRef.current.value = '';

//         // Clear search after adding item
//         setSearchQuery('');
//         if (itemSearchRef.current) {
//             itemSearchRef.current.value = '';
//         }

//         setTimeout(() => {
//             const newItemIndex = items.length;
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



//     const updateItemField = (index, field, value) => {
//         const updatedItems = [...items];
//         updatedItems[index][field] = value;

//         if (field === 'quantity' || field === 'puPrice') {
//             updatedItems[index].amount = (updatedItems[index].quantity * updatedItems[index].puPrice).toFixed(2);
//         }

//         setItems(updatedItems);
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

//     const calculateTotal = () => {
//         let subTotal = 0;
//         let taxableAmount = 0;
//         let nonTaxableAmount = 0;

//         items.forEach(item => {
//             const amount = parseFloat(item.amount) || 0;
//             subTotal += amount;

//             if (item.vatStatus === 'vatable') {
//                 taxableAmount += amount;
//             } else {
//                 nonTaxableAmount += amount;
//             }
//         });

//         const vatPercentage = parseFloat(formData.vatPercentage) || 13;
//         const vatAmount = (formData.isVatExempt === 'false' || formData.isVatExempt === 'all') ?
//             (taxableAmount * vatPercentage) / 100 : 0;

//         const totalAmount = taxableAmount + nonTaxableAmount + vatAmount;

//         return {
//             subTotal,
//             taxableAmount,
//             nonTaxableAmount,
//             vatAmount,
//             totalAmount
//         };
//     };

//     const resetForm = async () => {
//         try {
//             setIsLoading(true);
//             const response = await api.get('/api/retailer/stockAdjustments/new');
//             const { data } = response;

//             const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
//             const currentRomanDate = new Date().toISOString().split('T')[0];

//             setFormData({
//                 adjustmentType: 'xcess',
//                 nepaliDate: currentNepaliDate,
//                 billDate: currentRomanDate,
//                 billNumber: data.data.nextBillNumber,
//                 isVatExempt: 'all',
//                 note: '',
//                 vatPercentage: 13,
//                 items: []
//             });

//             setAllItems(data.data.items.sort((a, b) => a.name.localeCompare(b.name)));
//             setNextBillNumber(data.data.nextBillNumber);
//             setItems([]);
//             setFilteredItems([]);

//             // Clear the item search input if it exists
//             if (itemSearchRef.current) {
//                 itemSearchRef.current.value = '';
//             }

//             // Focus back to the date field
//             setTimeout(() => {
//                 if (company.dateFormat === 'nepali' && nepaliDateRef.current) {
//                     nepaliDateRef.current.focus();
//                 } else if (transactionDateRef.current) {
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
//         e.preventDefault();
//         setIsSaving(true);

//         try {
//             const adjustmentData = {
//                 ...formData,
//                 items: items.map(item => ({
//                     item: item.item,
//                     batchNumber: item.batchNumber,
//                     expiryDate: item.expiryDate,
//                     quantity: item.quantity,
//                     unit: item.unit?._id,
//                     puPrice: item.puPrice,
//                     price: item.price,
//                     mrp: item.mrp,
//                     reason: item.reason ? [item.reason] : [],
//                     vatStatus: item.vatStatus,
//                     uniqueUuId: item.uniqueUuId
//                 })),
//                 print
//             };

//             const response = await api.post('/api/retailer/stockAdjustments/new', adjustmentData);

//             setNotification({
//                 show: true,
//                 message: 'Stock adjustment saved successfully!',
//                 type: 'success'
//             });

//             setItems([]);

//             if (print) {
//                 setIsSaving(false);
//                 navigate(`/stockAdjustments/${response.data.data.adjustmentId}/print`);
//             } else {
//                 setIsSaving(false);
//                 resetForm();
//             }
//         } catch (error) {
//             console.error('Error saving stock adjustment:', error);
//             setNotification({
//                 show: true,
//                 message: 'Failed to save stock adjustment. Please try again.',
//                 type: 'error'
//             });
//             setIsSaving(false);
//         }
//     };

//     // Sales Price Modal functions
//     const openSalesPriceModal = (index) => {
//         setSelectedItemIndex(index);
//         const item = items[index];

//         // Get the item from allItems to access the full data including stockEntries
//         const fullItem = allItems.find(i => i._id === item.item) || item;
//         // Get the latest stock entry (sorted by date in descending order)
//         const latestStockEntry = fullItem.stockEntries[fullItem.stockEntries.length - 1]

//         // Calculate initial values
//         const prevPuPrice = (latestStockEntry?.puPrice * latestStockEntry?.WSUnit) || 0;
//         const currentPuPrice = item.puPrice;
//         const marginPercentage = latestStockEntry?.marginPercentage || 0;
//         const currency = latestStockEntry?.currency || 'NPR';
//         const mrp = latestStockEntry?.mrp || 0;
//         const salesPrice = latestStockEntry?.price || currentPuPrice;

//         setSalesPriceData({
//             prevPuPrice: prevPuPrice,
//             puPrice: currentPuPrice,
//             marginPercentage: marginPercentage,
//             currency: currency,
//             mrp: mrp,
//             salesPrice: salesPrice
//         });

//         setShowSalesPriceModal(true);
//     };

//     const saveSalesPrice = () => {
//         if (selectedItemIndex === -1) return;

//         const updatedItems = [...items];
//         updatedItems[selectedItemIndex] = {
//             ...updatedItems[selectedItemIndex],
//             price: salesPriceData.salesPrice,
//             mrp: salesPriceData.mrp,
//             marginPercentage: salesPriceData.marginPercentage,
//             currency: salesPriceData.currency,
//         };

//         setItems(updatedItems);
//         setShowSalesPriceModal(false);

//         setTimeout(() => {
//             const nextField = document.getElementById(`reason-${selectedItemIndex}`);
//             if (nextField) {
//                 nextField.focus();
//             }
//         }, 0);
//     };

//     useEffect(() => {
//         if (showSalesPriceModal && marginPercentageRef.current) {
//             // Use setTimeout to ensure the modal is fully rendered before focusing
//             setTimeout(() => {
//                 marginPercentageRef.current.focus();
//                 marginPercentageRef.current.select();
//             }, 100);
//         }
//     }, [showSalesPriceModal]);

//     // Batch Modal functions
//     // const showBatchModalForItem = (item) => {
//     //     setSelectedItemForBatch(item);
//     //     setShowBatchModal(true);
//     // };

//     const showBatchModalForItem = (item) => {
//         setSelectedItemForBatch(item);
//         setShowBatchModal(true);

//         // Use setTimeout to ensure the modal is rendered before focusing
//         setTimeout(() => {
//             const firstBatchRow = document.querySelector('.batch-row');
//             if (firstBatchRow) {
//                 firstBatchRow.classList.add('bg-primary', 'text-white');
//                 firstBatchRow.focus();
//             }
//         }, 100);
//     };

//     const handleBatchRowClick = (batchInfo) => {
//         if (!selectedItemForBatch) return;

//         addItemToBill(selectedItemForBatch, {
//             batchNumber: batchInfo.batchNumber,
//             expiryDate: batchInfo.expiryDate,
//             puPrice: batchInfo.puPrice,
//             price: batchInfo.price,
//             mrp: batchInfo.mrp,
//             uniqueUuId: batchInfo.uniqueUuId
//         });

//         setShowBatchModal(false);
//         setSelectedItemForBatch(null);
//     };

//     const formatDateForInput = (date) => {
//         if (!date) return '';
//         const d = new Date(date);
//         const year = d.getFullYear();
//         const month = String(d.getMonth() + 1).padStart(2, '0');
//         const day = String(d.getDate()).padStart(2, '0');
//         return `${year}-${month}-${day}`;
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
//                         onItemClick={(item) => {
//                             if (formData.adjustmentType === 'short') {
//                                 showBatchModalForItem(item);
//                             } else {
//                                 addItemToBill(item);
//                             }
//                         }}
//                         searchRef={itemSearchRef}
//                     />
//                 ) : (
//                     <div className="text-center py-3 text-muted">
//                         {message}
//                     </div>
//                 )}
//             </div>
//         );
//     }, [showItemDropdown, memoizedFilteredItems, searchQuery, lastSearchQuery, shouldShowLastSearchResults, formData.adjustmentType]);


//     return (
//         <div className="container-fluid">
//             <Header />
//             <div className="card mt-4 shadow-lg p-4 animate__animated animate__fadeInUp expanded-card">
//                 <div className="card-header">
//                     Stock Adjustment
//                 </div>
//                 <div className="card-body">
//                     <form onSubmit={handleSubmit} id="adjustmentForm" className="needs-validation" noValidate>
//                         <div className="form-group row">
//                             {company.dateFormat === 'nepali' ? (
//                                 <>
//                                     <div className="col">
//                                         <label htmlFor="nepaliDate">Date:</label>
//                                         <input
//                                             type="text"
//                                             name="nepaliDate"
//                                             id="nepaliDate"
//                                             autoComplete='off'
//                                             ref={nepaliDateRef}
//                                             autoFocus
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
//                                 <div className="col">
//                                     <label htmlFor="billDate">Date:</label>
//                                     <input
//                                         type="date"
//                                         name="billDate"
//                                         id="billDate"
//                                         className="form-control"
//                                         ref={company.dateFormat === 'english' ? transactionDateRef : null}
//                                         autoFocus
//                                         value={formData.billDate}
//                                         onChange={(e) => setFormData({ ...formData, billDate: e.target.value })}
//                                         required
//                                         onKeyDown={(e) => {
//                                             if (e.key === 'Enter') {
//                                                 handleKeyDown(e, 'billDate');
//                                             }
//                                         }}
//                                     />
//                                 </div>
//                             )}

//                             <div className="col">
//                                 <label htmlFor="adjustmentType">Type:</label>
//                                 <select
//                                     id="adjustmentType"
//                                     name="adjustmentType"
//                                     className="form-control"
//                                     value={formData.adjustmentType}
//                                     onChange={(e) => setFormData({ ...formData, adjustmentType: e.target.value })}
//                                     onKeyDown={(e) => {
//                                         if (e.key === 'Enter') {
//                                             handleKeyDown(e, 'adjustmentType');
//                                         }
//                                     }}
//                                 >
//                                     <option value="xcess">Xcess</option>
//                                     <option value="short">Short</option>
//                                 </select>
//                             </div>

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
//                                             document.getElementById('isVatExempt')?.focus();
//                                         }
//                                     }}
//                                 />
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

//                         <hr style={{ border: "1px solid gray" }} />

//                         <div id="bill-details-container" style={{ maxHeight: "400px", overflowY: "auto", border: "1px solid #ccc", padding: "10px" }}>
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
//                                         <th>Reason</th>
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
//                                                     onFocus={(e) => {
//                                                         e.target.select();
//                                                     }}
//                                                     autoComplete='off'
//                                                     required
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
//                                                             document.getElementById(`puPrice-${index}`)?.focus();
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
//                                                     name={`items[${index}][puPrice]`}
//                                                     className="form-control item-puPrice"
//                                                     id={`puPrice-${index}`}
//                                                     value={Math.round(item.puPrice * 100) / 100}
//                                                     onChange={(e) => updateItemField(index, 'puPrice', e.target.value)}
//                                                     onFocus={(e) => {
//                                                         e.target.select();
//                                                     }}
//                                                     onKeyDown={(e) => {
//                                                         if (e.key === 'Enter') {
//                                                             e.preventDefault();
//                                                             if (formData.adjustmentType === 'xcess') {
//                                                                 openSalesPriceModal(index);
//                                                             } else {
//                                                                 document.getElementById(`reason-${index}`)?.focus();
//                                                             }
//                                                         }
//                                                     }}
//                                                 />
//                                             </td>
//                                             <td className="item-amount">{item.amount}</td>
//                                             <td>
//                                                 <select
//                                                     name={`items[${index}][reason]`}
//                                                     className="form-control"
//                                                     id={`reason-${index}`}
//                                                     value={item.reason}
//                                                     onChange={(e) => updateItemField(index, 'reason', e.target.value)}
//                                                     onKeyDown={(e) => {
//                                                         if (e.key === 'Enter') {
//                                                             e.preventDefault();
//                                                             document.getElementById('itemSearch')?.focus();
//                                                         }
//                                                     }}
//                                                 >
//                                                     <option value="">Select Reason</option>
//                                                     {formData.adjustmentType === 'short' ? (
//                                                         <>
//                                                             <option value="Expired">Expired</option>
//                                                             <option value="Damage">Damage</option>
//                                                             <option value="Donate">Donate</option>
//                                                         </>
//                                                     ) : (
//                                                         <option value="Bonus">Bonus</option>
//                                                     )}
//                                                 </select>
//                                             </td>
//                                             <td className="align-middle">
//                                                 <button
//                                                     type="button"
//                                                     className="btn btn-sm btn-danger"
//                                                     onClick={() => removeItem(index)}
//                                                 >
//                                                     <i className="bi bi-trash"></i>
//                                                 </button>
//                                             </td>
//                                             <input type="hidden" name={`items[${index}][vatStatus]`} value={item.vatStatus} />
//                                             <input type="hidden" name={`items[${index}][uniqueUuId]`} value={item.uniqueUuId} />
//                                             <input type="hidden" name={`items[${index}][mrp]`} value={item.mrp} />
//                                         </tr>
//                                     ))}
//                                 </tbody>
//                             </table>
//                         </div>

//                         {/* Item Search */}
//                         <div className="row mb-3">
//                             <div className="col-12">
//                                 <label htmlFor="itemSearch" className="form-label">Search Item</label>
//                                 <div className="position-relative">
//                                     <input
//                                         type="text"
//                                         id="itemSearch"
//                                         className="form-control form-control-sm"
//                                         placeholder="Search for an item"
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
//                                                         if (formData.adjustmentType === 'short') {
//                                                             showBatchModalForItem(itemToAdd);
//                                                         } else {
//                                                             addItemToBill(itemToAdd);
//                                                         }
//                                                     }
//                                                 } else if (!searchQuery && items.length > 0) {
//                                                     setShowItemDropdown(false);
//                                                     setTimeout(() => {
//                                                         document.getElementById('note')?.focus();
//                                                     }, 0);
//                                                 }
//                                             }
//                                         }}
//                                     />
//                                     {ItemDropdown}
//                                 </div>
//                             </div>
//                         </div>

//                         <hr style={{ border: "1px solid gray" }} />

//                         <div className="table-responsive">
//                             <table className="table table-bordered">
//                                 <thead>
//                                     <tr>
//                                         <th colSpan="6" className="text-center bg-light">Adjustment Details</th>
//                                     </tr>
//                                 </thead>
//                                 <tbody>
//                                     <tr>
//                                         <td><label htmlFor="subTotal">Sub Total:</label></td>
//                                         <td>
//                                             <p className="form-control-plaintext">Rs. {totals.subTotal.toFixed(2)}</p>
//                                         </td>
//                                         <td colSpan="4"></td>
//                                     </tr>

//                                     {company.vatEnabled && formData.isVatExempt !== 'true' && (
//                                         <>
//                                             <tr id="taxableAmountRow">
//                                                 <td><label htmlFor="taxableAmount">Taxable Amount:</label></td>
//                                                 <td>
//                                                     <p className="form-control-plaintext">Rs. {totals.taxableAmount.toFixed(2)}</p>
//                                                 </td>
//                                                 <td><label htmlFor="vatPercentage">VAT (13%):</label></td>
//                                                 <td className='d-none'>
//                                                     <input
//                                                         type="number"
//                                                         name="vatPercentage"
//                                                         id="vatPercentage"
//                                                         className="form-control"
//                                                         value={formData.vatPercentage}
//                                                         readOnly
//                                                     />
//                                                 </td>
//                                                 <td className='d-none'><label htmlFor="vatAmount">VAT Amount:</label></td>
//                                                 <td>
//                                                     <p className="form-control-plaintext">Rs. {totals.vatAmount.toFixed(2)}</p>
//                                                 </td>
//                                             </tr>
//                                         </>
//                                     )}
//                                     {company.vatEnabled && formData.isVatExempt === 'true' && (
//                                         <td colSpan="4"></td>
//                                     )}
//                                     <tr>
//                                         <td><label htmlFor="totalAmount">Total Amount:</label></td>
//                                         <td>
//                                             <p className="form-control-plaintext">Rs. {totals.totalAmount.toFixed(2)}</p>
//                                         </td>
//                                         <td><label htmlFor="amountInWords">In Words:</label></td>
//                                         <td colSpan="3">
//                                             <p className="form-control-plaintext" id="amountInWords">
//                                                 {convertToRupeesAndPaisa(totals.totalAmount)} Only.
//                                             </p>
//                                         </td>
//                                     </tr>
//                                 </tbody>
//                             </table>
//                         </div>

//                         <div className="form-group">
//                             <label htmlFor="note">Description:</label>
//                             <input
//                                 type="text"
//                                 className="form-control"
//                                 id="note"
//                                 name="note"
//                                 value={formData.note}
//                                 onChange={(e) => setFormData({ ...formData, note: e.target.value })}
//                                 placeholder="add note"
//                                 autoComplete='off'
//                                 onKeyDown={(e) => {
//                                     if (e.key === 'Enter') {
//                                         e.preventDefault();
//                                         document.getElementById('saveBill')?.focus();
//                                     }
//                                 }}
//                             />
//                         </div>

//                         <div className="d-flex justify-content-end mt-4">
//                             <button
//                                 type="submit"
//                                 className="btn btn-primary mr-2 p-3"
//                                 id="saveBill"
//                                 disabled={isSaving}
//                                 onKeyDown={(e) => {
//                                     if (e.key === 'Enter') {
//                                         e.preventDefault();
//                                         handleSubmit(e);
//                                     }
//                                 }}
//                             >
//                                 {isSaving ? (
//                                     <>
//                                         <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
//                                         Saving...
//                                     </>
//                                 ) : (
//                                     <i className="bi bi-save"></i>
//                                 )}
//                             </button>
//                             <button
//                                 type="button"
//                                 className="btn btn-secondary p-3"
//                                 onClick={(e) => handleSubmit(e, true)}
//                                 disabled={isSaving}
//                             >
//                                 <i className="bi bi-printer"></i>
//                             </button>
//                         </div>
//                     </form>
//                 </div>
//             </div>

//             {/* Sales Price Modal */}
//             {showSalesPriceModal && (
//                 <div className="modal fade show" id="setSalesPriceModal" tabIndex="-1" style={{ display: 'block' }}>
//                     <div className="modal-dialog modal-lg">
//                         <div className="modal-content">
//                             <div className="modal-header">
//                                 <h5 className="modal-title" id="setSalesPriceModalLabel">Set Sales Price for New Batch</h5>
//                                 <button type="button" className="btn-close" onClick={() => setShowSalesPriceModal(false)}></button>
//                             </div>
//                             <div className="modal-body">
//                                 <div className="row">
//                                     <div className="col">
//                                         <label htmlFor="prevPuPrice" className="form-label">Prev. Price</label>
//                                         <input
//                                             type="number"
//                                             className="form-control"
//                                             id="prePuPrice"
//                                             step="any"
//                                             value={salesPriceData.prevPuPrice || ''}
//                                             readOnly
//                                         />
//                                     </div>
//                                     <div className="col">
//                                         <label htmlFor="puPrice" className="form-label">New Price</label>
//                                         <input
//                                             type="number"
//                                             className="form-control"
//                                             id="puPrice"
//                                             step="any"
//                                             value={salesPriceData.puPrice}
//                                             readOnly
//                                         />
//                                     </div>
//                                 </div>
//                                 <div className="mb-3">
//                                     <label htmlFor="marginPercentage" className="form-label">Margin Percentage (%)</label>
//                                     <input
//                                         type="number"
//                                         className="form-control"
//                                         id="marginPercentage"
//                                         min="0"
//                                         step="any"
//                                         value={Math.round(salesPriceData.marginPercentage * 100) / 100}
//                                         onFocus={(e) => {
//                                             e.target.select();
//                                         }}
//                                         onChange={(e) => {
//                                             const margin = parseFloat(e.target.value) || 0;
//                                             const puPrice = parseFloat(salesPriceData.puPrice) || 0;
//                                             const salesPrice = puPrice + (puPrice * margin / 100);

//                                             setSalesPriceData({
//                                                 ...salesPriceData,
//                                                 marginPercentage: margin,
//                                                 salesPrice: parseFloat(salesPrice.toFixed(2))
//                                             });
//                                         }}
//                                         onKeyDown={(e) => {
//                                             if (e.key === 'Enter') {
//                                                 e.preventDefault();
//                                                 document.getElementById('currency')?.focus();
//                                             }
//                                         }}
//                                         ref={marginPercentageRef}
//                                     />
//                                 </div>
//                                 <div className="mb-3">
//                                     <label htmlFor="currency" className="form-label">Currency</label>
//                                     <select
//                                         className="form-select"
//                                         id="currency"
//                                         value={salesPriceData.currency}
//                                         onChange={(e) => setSalesPriceData({ ...salesPriceData, currency: e.target.value })}
//                                         onKeyDown={(e) => {
//                                             if (e.key === 'Enter') {
//                                                 e.preventDefault();
//                                                 document.getElementById('mrp')?.focus();
//                                             }
//                                         }}
//                                     >
//                                         <option value="NPR">NPR</option>
//                                         <option value="INR">INR</option>
//                                     </select>
//                                 </div>
//                                 <div className="mb-3">
//                                     <label htmlFor="mrp" className="form-label">MRP</label>
//                                     <input
//                                         type="number"
//                                         className="form-control"
//                                         id="mrp"
//                                         step="any"
//                                         value={salesPriceData.mrp}
//                                         onFocus={(e) => {
//                                             e.target.select();
//                                         }}
//                                         onChange={(e) => {
//                                             const mrp = parseFloat(e.target.value) || 0;
//                                             const salesPrice = salesPriceData.currency === 'INR' ? mrp * 1.6 : mrp;
//                                             const margin = ((salesPrice - salesPriceData.puPrice) / salesPriceData.puPrice) * 100;
//                                             setSalesPriceData({
//                                                 ...salesPriceData,
//                                                 mrp: mrp,
//                                                 salesPrice: salesPrice,
//                                                 marginPercentage: margin
//                                             });
//                                         }}
//                                         onKeyDown={(e) => {
//                                             if (e.key === 'Enter') {
//                                                 e.preventDefault();
//                                                 document.getElementById('salesPrice')?.focus();
//                                             }
//                                         }}
//                                     />
//                                 </div>
//                                 <div className="mb-3">
//                                     <label htmlFor="salesPrice" className="form-label">Sales Price</label>
//                                     <input
//                                         type="number"
//                                         className="form-control"
//                                         id="salesPrice"
//                                         step="any"
//                                         value={Math.round(salesPriceData.salesPrice * 100) / 100}
//                                         onFocus={(e) => {
//                                             e.target.select();
//                                         }}
//                                         onChange={(e) => {
//                                             const salesPrice = parseFloat(e.target.value) || 0;
//                                             const margin = ((salesPrice - salesPriceData.puPrice) / salesPriceData.puPrice) * 100;
//                                             setSalesPriceData({
//                                                 ...salesPriceData,
//                                                 salesPrice: salesPrice,
//                                                 marginPercentage: margin
//                                             });
//                                         }}
//                                         onKeyDown={(e) => {
//                                             if (e.key === 'Enter') {
//                                                 e.preventDefault();
//                                                 document.getElementById('saveSalesPrice')?.focus();
//                                             }
//                                         }}
//                                         required
//                                     />
//                                 </div>
//                             </div>
//                             <div className="modal-footer">
//                                 <button
//                                     type="button"
//                                     className="btn btn-secondary"
//                                     id='saveSalesPriceClose'
//                                     onClick={() => setShowSalesPriceModal(false)}
//                                 >
//                                     Close
//                                 </button>
//                                 <button
//                                     type="button"
//                                     className="btn btn-primary"
//                                     id='saveSalesPrice'
//                                     onClick={() => {
//                                         saveSalesPrice();
//                                     }}
//                                 >
//                                     Save Sales Price
//                                 </button>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             )}

//             {showBatchModal && selectedItemForBatch && (
//                 <div className="modal fade show" id="batchModal" tabIndex="-1" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
//                     <div className="modal-dialog modal-lg modal-dialog-centered">
//                         <div className="modal-content" style={{ borderRadius: '8px', overflow: 'hidden' }}>
//                             {/* Modal Header */}
//                             <div className="modal-header py-2" style={{ backgroundColor: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
//                                 <h5 className="modal-title mb-0 mx-auto fw-semibold" style={{ fontSize: '1.1rem' }}>
//                                     <i className="bi bi-box-seam me-2"></i>
//                                     Batch Information: {selectedItemForBatch.name}
//                                 </h5>
//                                 <button
//                                     type="button"
//                                     className="btn-close position-absolute"
//                                     style={{ right: '1rem', top: '0.75rem' }}
//                                     onClick={() => setShowBatchModal(false)}
//                                     aria-label="Close"
//                                 ></button>
//                             </div>

//                             {/* Modal Body */}
//                             <div className="modal-body p-0" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
//                                 {selectedItemForBatch.stockEntries.every(entry => entry.quantity === 0) ? (
//                                     <div className="d-flex justify-content-center align-items-center py-4">
//                                         <div className="alert alert-warning d-flex align-items-center py-2 px-3 mb-0 w-75 text-center">
//                                             <i className="bi bi-exclamation-triangle-fill me-2"></i>
//                                             <span>This item is currently out of stock</span>
//                                         </div>
//                                     </div>
//                                 ) : (
//                                     <div className="table-responsive">
//                                         <table className="table table-sm table-hover mb-0">
//                                             <thead className="table-light">
//                                                 <tr className="text-center">
//                                                     <th className="py-2">Batch No.</th>
//                                                     <th className="py-2">Expiry Date</th>
//                                                     <th className="py-2">Quantity</th>
//                                                     <th className="py-2">S.P</th>
//                                                     <th className="py-2">C.P</th>
//                                                     <th className="py-2">%</th>
//                                                     <th className="py-2">MRP</th>
//                                                 </tr>
//                                             </thead>
//                                             <tbody>
//                                                 {selectedItemForBatch.stockEntries
//                                                     .filter(entry => entry.quantity > 0)
//                                                     .map((entry, index) => (
//                                                         <tr
//                                                             key={index}
//                                                             className={`batch-row text-center ${index === 0 ? 'bg-primary text-white' : ''}`}
//                                                             style={{ height: '42px', cursor: 'pointer' }}
//                                                             onClick={() => handleBatchRowClick({
//                                                                 batchNumber: entry.batchNumber,
//                                                                 expiryDate: entry.expiryDate,
//                                                                 price: entry.price,
//                                                                 puPrice: entry.puPrice,
//                                                                 mrp: entry.mrp,
//                                                                 uniqueUuId: entry.uniqueUuId
//                                                             })}
//                                                             tabIndex={0}
//                                                             onKeyDown={(e) => {
//                                                                 if (e.key === 'Enter') {
//                                                                     e.preventDefault();
//                                                                     handleBatchRowClick({
//                                                                         batchNumber: entry.batchNumber,
//                                                                         expiryDate: entry.expiryDate,
//                                                                         price: entry.price,
//                                                                         puPrice: entry.puPrice,
//                                                                         mrp: entry.mrp,
//                                                                         uniqueUuId: entry.uniqueUuId
//                                                                     });
//                                                                 } else if (e.key === 'ArrowDown') {
//                                                                     e.preventDefault();
//                                                                     const nextRow = e.currentTarget.nextElementSibling;
//                                                                     if (nextRow) {
//                                                                         e.currentTarget.classList.remove('bg-primary', 'text-white');
//                                                                         nextRow.classList.add('bg-primary', 'text-white');
//                                                                         nextRow.focus();
//                                                                     }
//                                                                 } else if (e.key === 'ArrowUp') {
//                                                                     e.preventDefault();
//                                                                     const prevRow = e.currentTarget.previousElementSibling;
//                                                                     if (prevRow) {
//                                                                         e.currentTarget.classList.remove('bg-primary', 'text-white');
//                                                                         prevRow.classList.add('bg-primary', 'text-white');
//                                                                         prevRow.focus();
//                                                                     } else {
//                                                                         e.currentTarget.focus();
//                                                                     }
//                                                                 }
//                                                             }}
//                                                             onFocus={(e) => {
//                                                                 document.querySelectorAll('.batch-row').forEach(row => {
//                                                                     row.classList.remove('bg-primary', 'text-white');
//                                                                 });
//                                                                 e.currentTarget.classList.add('bg-primary', 'text-white');
//                                                             }}
//                                                             onMouseEnter={(e) => {
//                                                                 document.querySelectorAll('.batch-row').forEach(row => {
//                                                                     row.classList.remove('bg-primary', 'text-white');
//                                                                 });
//                                                                 e.currentTarget.classList.add('bg-primary', 'text-white');
//                                                             }}
//                                                         >
//                                                             <td className="py-2 align-middle">{entry.batchNumber || 'N/A'}</td>
//                                                             <td className="py-2 align-middle">{formatDateForInput(entry.expiryDate)}</td>
//                                                             <td className="py-2 align-middle fw-semibold">{entry.quantity}</td>
//                                                             <td className="py-2 align-middle">{Math.round(entry.price * 100) / 100}</td>
//                                                             <td className="py-2 align-middle">{Math.round(entry.puPrice * 100) / 100}</td>
//                                                             <td className="py-2 align-middle">{Math.round(entry.marginPercentage * 100) / 100}</td>
//                                                             <td className="py-2 align-middle">{Math.round(entry.mrp * 100) / 100}</td>
//                                                         </tr>
//                                                     ))
//                                                 }
//                                             </tbody>
//                                         </table>
//                                     </div>
//                                 )}
//                             </div>

//                             {/* Modal Footer */}
//                             <div className="modal-footer py-2 justify-content-center" style={{ backgroundColor: '#f8f9fa', borderTop: '1px solid #dee2e6' }}>
//                                 <button
//                                     type="button"
//                                     className="btn btn-primary btn-sm py-1 px-3 d-flex align-items-center"
//                                     onClick={() => setShowBatchModal(false)}
//                                 >
//                                     <i className="bi bi-x-circle me-1"></i>
//                                     Close
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

//             {/* Product modal */}
//             {showProductModal && (
//                 <ProductModal onClose={() => setShowProductModal(false)} />
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

// export default AddStockAdjustment;

//----------------------------------------------------------------------------end

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import NepaliDate from 'nepali-date-converter';
import axios from 'axios';
import Header from '../Header';
import NotificationToast from '../../NotificationToast';
import '../../../stylesheet/noDateIcon.css'
import VirtualizedItemList from '../../VirtualizedItemList';
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
    const [notification, setNotification] = useState({
        show: false,
        message: '',
        type: 'success'
    });
    const [dateErrors, setDateErrors] = useState({
        nepaliDate: '',
        billDate: ''
    });

    const [searchQuery, setSearchQuery] = useState('');
    const [lastSearchQuery, setLastSearchQuery] = useState('');
    const [shouldShowLastSearchResults, setShouldShowLastSearchResults] = useState(false);
    const debouncedSearchQuery = useDebounce(searchQuery, 50);

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

    const api = axios.create({
        baseURL: process.env.REACT_APP_API_BASE_URL,
        withCredentials: true,
    });

    useEffect(() => {
        return () => {
            setLastSearchQuery('');
            setShouldShowLastSearchResults(false);
            setHeaderLastSearchQuery('');
            setHeaderShouldShowLastSearchResults(false);
        };
    }, []);

    // useEffect(() => {
    //     const fetchInitialData = async () => {
    //         try {
    //             const response = await api.get('/api/retailer/stockAdjustments/new');
    //             const { data } = response;

    //             setCompany(data.data.company);
    //             setNextBillNumber(data.data.nextBillNumber);

    //             setFormData(prev => ({
    //                 ...prev,
    //                 billNumber: data.data.nextBillNumber
    //             }));
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
                // Fetch next bill number separately
                const numberResponse = await api.get('/api/retailer/stockAdjustments/new/next-number');

                // Fetch company settings
                const companyResponse = await api.get('/api/retailer/stockAdjustments/new');
                const { data } = companyResponse;

                setCompany(data.data.company);

                // Use the bill number from the separate endpoint
                setNextBillNumber(numberResponse.data.data.nextBillNumber);

                setFormData(prev => ({
                    ...prev,
                    billNumber: numberResponse.data.data.nextBillNumber
                }));

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
                item: item._id,
                uniqueNumber: item.uniqueNumber || 'N/A',
                hscode: item.hscode,
                name: item.name,
                category: item.category?.name || 'No Category',
                batchNumber: 'XXX',
                expiryDate: getDefaultExpiryDate(),
                quantity: 0,
                unit: item.unit,
                puPrice: item.latestPrice || 0,
                price: item.latestPrice || 0, // Default price same as puPrice
                mrp: 0,
                amount: 0,
                vatStatus: item.vatStatus,
                reason: '',
                uniqueUuId: ''
            };
        } else {
            // For short type, use the batch info
            newItem = {
                item: item._id,
                uniqueNumber: item.uniqueNumber || 'N/A',
                hscode: item.hscode,
                name: item.name,
                category: item.category?.name || 'No Category',
                batchNumber: batchInfo.batchNumber || '',
                expiryDate: batchInfo.expiryDate ? formatDateForInput(batchInfo.expiryDate) : '',
                quantity: 0,
                unit: item.unit,
                puPrice: batchInfo.puPrice || 0,
                price: batchInfo.price || 0,
                mrp: batchInfo.mrp || 0,
                amount: 0,
                vatStatus: item.vatStatus,
                reason: '',
                uniqueUuId: batchInfo.uniqueUuId || ''
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
                    uniqueUuId: batchInfo.uniqueUuId,
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
                uniqueUuId: batchInfo.uniqueUuId,
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
            item: selectedItemForInsert._id,
            uniqueNumber: selectedItemForInsert.uniqueNumber || 'N/A',
            hscode: selectedItemForInsert.hscode,
            name: selectedItemForInsert.name,
            category: selectedItemForInsert.category?.name || 'No Category',
            batchNumber: finalBatchNumber,
            expiryDate: finalExpiryDate ? new Date(finalExpiryDate).toISOString().split('T')[0] : '',
            quantity: selectedItemQuantity || 0,
            unit: selectedItemForInsert.unit,
            price: finalPrice,
            puPrice: finalPuPrice, // Use the finalPuPrice (could be user-modified)
            amount: (selectedItemQuantity || 0) * finalPuPrice,
            vatStatus: selectedItemForInsert.vatStatus,
            reason: '',
            uniqueUuId: selectedItemForInsert?.batchInfo?.uniqueUuId || '',
            mrp: 0
        };

        const updatedItems = [...items, newItem];
        setItems(updatedItems);

        // Reset all fields including the rate
        setSelectedItemForInsert(null);
        setSelectedItemQuantity(0);
        setSelectedItemRate(0); // Reset rate back to 0
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

            if (item.vatStatus === 'vatable') {
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

    // const resetForm = async () => {
    //     try {
    //         setIsLoading(true);
    //         const response = await api.get('/api/retailer/stockAdjustments/new');
    //         const { data } = response;

    //         const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
    //         const currentRomanDate = new Date().toISOString().split('T')[0];

    //         setFormData({
    //             adjustmentType: 'xcess',
    //             nepaliDate: currentNepaliDate,
    //             billDate: currentRomanDate,
    //             billNumber: data.data.nextBillNumber,
    //             isVatExempt: 'all',
    //             note: '',
    //             vatPercentage: 13,
    //             items: []
    //         });

    //         setNextBillNumber(data.data.nextBillNumber);
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

    const resetForm = async () => {
        try {
            setIsLoading(true);

            // Fetch next bill number separately
            const numberResponse = await api.get('/api/retailer/stockAdjustments/new/next-number');

            // Fetch company settings if needed
            const companyResponse = await api.get('/api/retailer/stockAdjustments/new');
            const { data } = companyResponse;

            const currentNepaliDate = new NepaliDate().format('YYYY-MM-DD');
            const currentRomanDate = new Date().toISOString().split('T')[0];

            setFormData({
                adjustmentType: 'xcess',
                nepaliDate: currentNepaliDate,
                billDate: currentRomanDate,
                billNumber: numberResponse.data.data.nextBillNumber, // Use from separate endpoint
                isVatExempt: 'all',
                note: '',
                vatPercentage: 13,
                items: []
            });

            setCompany(data.data.company);
            setNextBillNumber(numberResponse.data.data.nextBillNumber);
            setItems([]);

            setSelectedItemForInsert(null);
            setSelectedItemQuantity(0);
            setSelectedItemRate(0);
            setHeaderSearchQuery('');
            setHeaderLastSearchQuery('');
            setHeaderShouldShowLastSearchResults(false);
            setSelectedItemBatchNumber('');
            setSelectedItemExpiryDate('');

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

    const handleSubmit = async (e, print = false) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            const adjustmentData = {
                ...formData,
                items: items.map(item => ({
                    item: item.item,
                    batchNumber: item.batchNumber,
                    expiryDate: item.expiryDate,
                    quantity: item.quantity,
                    unit: item.unit?._id,
                    puPrice: item.puPrice,
                    price: item.price,
                    mrp: item.mrp,
                    reason: item.reason ? [item.reason] : [],
                    vatStatus: item.vatStatus,
                    uniqueUuId: item.uniqueUuId
                })),
                print
            };

            const response = await api.post('/api/retailer/stockAdjustments/new', adjustmentData);

            setNotification({
                show: true,
                message: 'Stock adjustment saved successfully!',
                type: 'success'
            });

            setItems([]);

            if (print) {
                setIsSaving(false);
                navigate(`/stockAdjustments/${response.data.data.adjustmentId}/print`);
            } else {
                setIsSaving(false);
                resetForm();
            }
        } catch (error) {
            console.error('Error saving stock adjustment:', error);
            setNotification({
                show: true,
                message: 'Failed to save stock adjustment. Please try again.',
                type: 'error'
            });
            setIsSaving(false);
        }
    };

    // Sales Price Modal functions
    const openSalesPriceModal = (index) => {
        setSelectedItemIndex(index);
        const item = items[index];

        const fullItem = searchResults.find(i => i._id === item.item) || headerSearchResults.find(i => i._id === item.item) || item;
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
                    <VirtualizedItemList
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
                    </div>
                )}
            </div>
        );
    }, [showItemDropdown, searchResults, searchQuery, lastSearchQuery, shouldShowLastSearchResults, formData.adjustmentType]);

    const formatter = new Intl.NumberFormat('en-NP', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

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
                    </div>
                </div>
                <div className="card-body p-2 p-md-3">
                    <form onSubmit={handleSubmit} id="adjustmentForm" className="needs-validation" noValidate>
                        {/* Date and Basic Info Row */}
                        <div className="row g-2 mb-3">
                            {company.dateFormat === 'nepali' ? (
                                <div className="col-12 col-md-6 col-lg-3">
                                    <div className="position-relative">
                                        <input
                                            type="text"
                                            name="nepaliDate"
                                            id="nepaliDate"
                                            autoComplete='off'
                                            ref={nepaliDateRef}
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
                                            Date: <span className="text-danger">*</span>
                                        </label>
                                        {dateErrors.nepaliDate && (
                                            <div className="invalid-feedback d-block" style={{ fontSize: '0.7rem' }}>
                                                {dateErrors.nepaliDate}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="col-12 col-md-6 col-lg-3">
                                    <div className="position-relative">
                                        <input
                                            type="date"
                                            name="billDate"
                                            id="billDate"
                                            className="form-control form-control-sm"
                                            ref={company.dateFormat === 'english' ? transactionDateRef : null}
                                            autoFocus
                                            value={formData.billDate}
                                            onChange={(e) => setFormData({ ...formData, billDate: e.target.value })}
                                            required
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    handleKeyDown(e, 'billDate');
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
                                            {selectedItemForInsert ? (selectedItemForInsert.unit?.name || 'N/A') : '-'}
                                        </td>
                                        {/* <td width="8%" style={{ padding: '2px', backgroundColor: '#ffffff' }}>
                                            <input
                                                type="number"
                                                className="form-control form-control-sm"
                                                placeholder="Rate"
                                                id='selectedItemRate'
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
                                        </td> */}

                                        <td width="8%" style={{ padding: '2px', backgroundColor: '#ffffff' }}>
                                            <input
                                                type="number"
                                                className="form-control form-control-sm"
                                                placeholder="Rate"
                                                id='selectedItemRate'
                                                value={Math.round(selectedItemRate * 100) / 100}
                                                onChange={(e) => {
                                                    // Always update with the user's input
                                                    const newRate = parseFloat(e.target.value) || 0;
                                                    setSelectedItemRate(newRate);
                                                }}
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
                                            {/* <button
                                                type="button"
                                                id="insertButton"
                                                className="btn btn-sm btn-success py-0 px-2"
                                                onClick={insertSelectedItem}
                                                disabled={!selectedItemForInsert || !selectedItemForInsert.batchInfo}
                                                title={!selectedItemForInsert?.batchInfo ? "Select batch first" : "Insert item below"}
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
                                                    backgroundColor: selectedItemForInsert?.batchInfo ? '#198754' : '#6c757d',
                                                    borderColor: selectedItemForInsert?.batchInfo ? '#198754' : '#6c757d',
                                                    cursor: selectedItemForInsert?.batchInfo ? 'pointer' : 'not-allowed'
                                                }}
                                            >
                                                INSERT
                                            </button> */}

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
                                                {item.unit?.name}
                                                <input type="hidden" name={`items[${index}][unit]`} value={item.unit?._id} />
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
                                                <input type="hidden" name={`items[${index}][uniqueUuId]`} value={item.uniqueUuId} />
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

                        {/* Item Search */}
                        {/* <div className="row mb-2">
                            <div className="col-12">
                                <div className="position-relative">
                                    <input
                                        type="text"
                                        id="itemSearch"
                                        className="form-control form-control-sm"
                                        placeholder="Search for an item"
                                        autoComplete='off'
                                        value={searchQuery}
                                        onChange={handleItemSearch}
                                        onFocus={handleSearchFocus}
                                        ref={itemSearchRef}
                                        onKeyDown={(e) => {
                                            if (e.key === 'ArrowDown') {
                                                e.preventDefault();
                                                const firstItem = document.querySelector('.dropdown-item');
                                                if (firstItem) {
                                                    firstItem.classList.add('active');
                                                    firstItem.focus();
                                                }
                                            } else if (e.key === 'Enter') {
                                                e.preventDefault();
                                                const activeItem = document.querySelector('.dropdown-item.active');
                                                if (activeItem) {
                                                    const index = parseInt(activeItem.getAttribute('data-index'));
                                                    const itemToAdd = searchResults[index];
                                                    if (itemToAdd) {
                                                        if (formData.adjustmentType === 'short') {
                                                            showBatchModalForItem(itemToAdd);
                                                        } else {
                                                            addItemToBill(itemToAdd);
                                                        }
                                                    }
                                                } else if (!searchQuery && items.length > 0) {
                                                    setShowItemDropdown(false);
                                                    setTimeout(() => {
                                                        document.getElementById('note')?.focus();
                                                    }, 0);
                                                }
                                            }
                                        }}
                                        style={{
                                            height: '24px',
                                            fontSize: '0.75rem',
                                            padding: '0.25rem 0.5rem'
                                        }}
                                    />
                                    {ItemDropdown}
                                </div>
                            </div>
                        </div> */}

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
                                <div className="d-flex justify-content-end gap-2">
                                    <button
                                        type="submit"
                                        className="btn btn-primary btn-sm d-flex align-items-center"
                                        id="saveBill"
                                        disabled={isSaving}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleSubmit(e);
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
                                        className="btn btn-secondary btn-sm d-flex align-items-center"
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
                                    <button
                                        type="button"
                                        className="btn btn-warning btn-sm d-flex align-items-center"
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
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            {/* Sales Price Modal */}
            {showSalesPriceModal && (
                <div className="modal fade show" id="setSalesPriceModal" tabIndex="-1" style={{ display: 'block' }}>
                    <div className="modal-dialog modal-lg">
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
                                            id="prePuPrice"
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
                                {selectedItemForBatch.stockEntries.every(entry => entry.quantity === 0) ? (
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
                                                                    uniqueUuId: entry.uniqueUuId
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
                                                                        uniqueUuId: entry.uniqueUuId
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
                                            placeholder="Search items..."
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