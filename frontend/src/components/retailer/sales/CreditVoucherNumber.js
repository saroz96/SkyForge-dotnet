// import React, { useState, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
// import axios from 'axios';
// import Header from '../Header';
// import ProductModal from '../dashboard/modals/ProductModal';

// const CreditSalesVoucherNumber = () => {
//     const [billNumber, setBillNumber] = useState('');
//     const [error, setError] = useState('');
//     const [isLoading, setIsLoading] = useState(false);
//     const [isFetchingLatest, setIsFetchingLatest] = useState(true);
//     const navigate = useNavigate();
//     const [showProductModal, setShowProductModal] = useState(false);

//     const api = axios.create({
//         baseURL: process.env.REACT_APP_API_BASE_URL,
//         withCredentials: true,
//     });

//     // Fetch the latest bill number when component mounts
//     useEffect(() => {
//         const fetchLatestBillNumber = async () => {
//             try {
//                 const response = await api.get('/api/retailer/credit-sales/finds', {
//                     withCredentials: true
//                 });

//                 console.log('API Response:', response.data);
//                 if (response.data.success) {
//                     console.log('Bill number from API:', response.data.data.latestBillNumber);
//                     setBillNumber(response.data.data.latestBillNumber);
//                 }
//             } catch (err) {
//                 console.error('Error fetching latest bill number:', err);
//                 // Don't show error to user - just proceed with empty field
//             } finally {
//                 setIsFetchingLatest(false);
//             }
//         };

//         fetchLatestBillNumber();
//     }, []);

//     useEffect(() => {
//         // Add F9 key handler here
//         const handleF9KeyDown = (e) => {
//             if (e.key === 'F9') {
//                 e.preventDefault();
//                 setShowProductModal(prev => !prev); // Toggle modal visibility
//             }
//         };
//         window.addEventListener('keydown', handleF9KeyDown);
//         return () => {
//             window.removeEventListener('keydown', handleF9KeyDown);
//         };
//     }, []);

//     const handleSubmit = async (e) => {
//         e.preventDefault();
//         setError('');

//         if (!billNumber.trim()) {
//             setError('Please enter a voucher number');
//             return;
//         }

//         setIsLoading(true);
//         try {
//             // Call the API endpoint to find sales bill by bill number
//             const response = await axios.get('/api/retailer/credit-sales/edit/billNumber', {
//                 params: { billNumber },
//                 withCredentials: true
//             });

//             if (response.data.success) {
//                 // Navigate to edit page with the sales bill ID
//                 navigate(`/retailer/credit-sales/edit/${response.data.data.salesBill._id}`);
//             } else {
//                 setError(response.data.error || 'Sales voucher not found');
//             }
//         } catch (err) {
//             setError(err.response?.data?.error || 'An error occurred while fetching sales bill');
//             console.error('Error fetching sales bill:', err);
//         } finally {
//             setIsLoading(false);
//         }
//     };

//     return (
//         <div className='Container-fluid'>
//             <Header />
//             <div className="container mt-5 wow-form centered-container">
//                 <div className="card shadow-lg p-4 animate__animated animate__fadeInUp expanded-card">
//                     <h1 className="text-center mb-4">Enter Voucher Number</h1>
//                     <form onSubmit={handleSubmit} className="needs-validation" noValidate>
//                         <div className="form-group">
//                             <label htmlFor="billNumber">Voucher Number:</label>
//                             <input
//                                 type="text"
//                                 name="billNumber"
//                                 id="billNumber"
//                                 className={`form-control ${error ? 'is-invalid' : ''}`}
//                                 required
//                                 placeholder="Enter your voucher number"
//                                 aria-describedby="billHelp"
//                                 autoComplete="off"
//                                 autoFocus
//                                 value={billNumber}
//                                 onChange={(e) => setBillNumber(e.target.value)}
//                                 onKeyDown={(e) => {
//                                     if (e.key === 'Enter') {
//                                         e.preventDefault();
//                                         document.getElementById('findBill')?.focus();
//                                     }
//                                 }}
//                                 disabled={isFetchingLatest} // Disable while loading
//                             />
//                             {isFetchingLatest && (
//                                 <div className="text-muted small">Loading latest voucher number...</div>
//                             )}
//                             <small id="billHelp" className="form-text text-muted">
//                                 Please enter a valid voucher number to find the sales invoice.
//                             </small>
//                             {error && (
//                                 <div className="invalid-feedback">
//                                     {error}
//                                 </div>
//                             )}
//                         </div>
//                         <button
//                             type="submit"
//                             className="btn btn-primary btn-block"
//                             disabled={isLoading || isFetchingLatest}
//                             id="findBill"
//                         >
//                             {isLoading ? 'Searching...' : 'Find Voucher'}
//                         </button>
//                     </form>
//                 </div>
//             </div>

//             {/* Product modal */}
//             {showProductModal && (
//                 <ProductModal onClose={() => setShowProductModal(false)} />
//             )}
//         </div>
//     );
// };

// export default CreditSalesVoucherNumber;

//-----------------------------------------------------------------end

// import React, { useState, useEffect, useRef } from 'react';
// import { useNavigate } from 'react-router-dom';
// import axios from 'axios';
// import Header from '../Header';
// import ProductModal from '../dashboard/modals/ProductModal';
// import VirtualizedAccountList from '../../VirtualizedAccountList';

// const CreditSalesVoucherNumber = () => {
//     const [billNumber, setBillNumber] = useState('');
//     const [error, setError] = useState('');
//     const [isLoading, setIsLoading] = useState(false);
//     const [isFetchingLatest, setIsFetchingLatest] = useState(true);
//     const [showProductModal, setShowProductModal] = useState(false);
//     const billNumberInputRef = useRef(null);

//     // Modal states
//     const [showPartyModal, setShowPartyModal] = useState(false);
//     const [currentPartyInfo, setCurrentPartyInfo] = useState(null);
//     const [accounts, setAccounts] = useState([]);
//     const [selectedAccount, setSelectedAccount] = useState(null);

//     // Account search states
//     const [isAccountSearching, setIsAccountSearching] = useState(false);
//     const [accountSearchQuery, setAccountSearchQuery] = useState('');
//     const [accountSearchPage, setAccountSearchPage] = useState(1);
//     const [hasMoreAccountResults, setHasMoreAccountResults] = useState(false);
//     const [totalAccounts, setTotalAccounts] = useState(0);

//     const accountSearchRef = useRef(null);
//     const navigate = useNavigate();

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

//     // Focus the input when component mounts
//     useEffect(() => {
//         const timer = setTimeout(() => {
//             if (billNumberInputRef.current) {
//                 billNumberInputRef.current.focus();
//             }
//         }, 100);

//         return () => clearTimeout(timer);
//     }, []);

//     // Also focus when modal closes
//     useEffect(() => {
//         if (!showPartyModal) {
//             const timer = setTimeout(() => {
//                 if (billNumberInputRef.current) {
//                     billNumberInputRef.current.focus();
//                 }
//             }, 200);

//             return () => clearTimeout(timer);
//         }
//     }, [showPartyModal]);

//     // Fetch the latest bill number when component mounts
//     useEffect(() => {
//         const fetchLatestBillNumber = async () => {
//             try {
//                 const response = await api.get('/api/retailer/credit-sales/finds');
//                 if (response.data.success) {
//                     setBillNumber(response.data.data.billNumber || '');
//                 }
//             } catch (err) {
//                 console.error('Error fetching latest bill number:', err);
//             } finally {
//                 setIsFetchingLatest(false);
//             }
//         };
//         fetchLatestBillNumber();
//     }, []);

//     // F9 key handler for product modal
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

//     // Fetch accounts for party selection
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
//                     setAccounts(response.data.accounts);
//                 } else {
//                     setAccounts(prev => [...prev, ...response.data.accounts]);
//                 }
//                 setHasMoreAccountResults(response.data.pagination.hasNextPage);
//                 setTotalAccounts(response.data.pagination.totalAccounts);
//                 setAccountSearchPage(page);
//             }
//         } catch (error) {
//             console.error('Error fetching accounts:', error);
//             setError('Error loading accounts');
//         } finally {
//             setIsAccountSearching(false);
//         }
//     };

//     const handleAccountSearch = (e) => {
//         const searchText = e.target.value;
//         setAccountSearchQuery(searchText);
//         setAccountSearchPage(1);

//         const timer = setTimeout(() => {
//             fetchAccountsFromBackend(searchText, 1);
//         }, 300);

//         return () => clearTimeout(timer);
//     };

//     const loadMoreAccounts = () => {
//         if (!isAccountSearching) {
//             fetchAccountsFromBackend(accountSearchQuery, accountSearchPage + 1);
//         }
//     };

//     const handleFindCreditSales = async (e) => {
//         e.preventDefault();
//         setError('');

//         if (!billNumber.trim()) {
//             setError('Please enter a voucher number');
//             return;
//         }

//         setIsLoading(true);
//         try {
//             // Step 1: Fetch party information for the voucher
//             const response = await api.get('/api/retailer/credit-sales/find-party', {
//                 params: { billNumber: billNumber }
//             });

//             if (response.data.success) {
//                 setCurrentPartyInfo(response.data.data);

//                 // Pre-select the current account
//                 const currentAccount = {
//                     id: response.data.data.accountId,
//                     name: response.data.data.accountName,
//                     address: response.data.data.accountAddress,
//                     pan: response.data.data.accountPan,
//                     uniqueNumber: response.data.data.accountUniqueNumber
//                 };
//                 setSelectedAccount(currentAccount);

//                 // Fetch accounts for selection
//                 await fetchAccountsFromBackend('', 1);

//                 // Show party selection modal
//                 setShowPartyModal(true);
//             } else {
//                 setError(response.data.error || 'Voucher not found');
//             }
//         } catch (err) {
//             console.error('Error fetching voucher:', err);
//             setError(err.response?.data?.error || 'An error occurred while fetching voucher');
//         } finally {
//             setIsLoading(false);
//         }
//     };

//     const handleAccountSelect = (account) => {
//         setSelectedAccount(account);
//     };

//     const handleClosePartyModal = () => {
//         setShowPartyModal(false);
//         setSelectedAccount(null);
//         setCurrentPartyInfo(null);
//         setAccountSearchQuery('');
//         setAccounts([]);
//     };

//     const handleChangeParty = async () => {
//         if (!selectedAccount || !currentPartyInfo) {
//             setError('Please select a party');
//             return;
//         }

//         // Check if party is actually changed
//         if (selectedAccount.id === currentPartyInfo.accountId) {
//             setError('Selected party is same as current party');
//             return;
//         }

//         setIsLoading(true);
//         try {
//             const response = await api.put(`/api/retailer/credit-sales/change-party/${billNumber}`, {
//                 accountId: selectedAccount.id
//             });

//             if (response.data.success) {
//                 // Update local party info
//                 setCurrentPartyInfo({
//                     ...currentPartyInfo,
//                     accountId: selectedAccount.id,
//                     accountName: selectedAccount.name,
//                     accountAddress: selectedAccount.address,
//                     accountPan: selectedAccount.pan,
//                     accountUniqueNumber: selectedAccount.uniqueNumber
//                 });

//                 // Show success message from backend
//                 alert(`✓ ${response.data.message || `Party changed successfully from "${currentPartyInfo.accountName}" to "${selectedAccount.name}"`}`);

//                 // Clear any errors
//                 setError('');

//                 // Don't close modal - keep it open for further editing
//             } else {
//                 setError(response.data.error || 'Failed to update party');
//             }
//         } catch (err) {
//             console.error('Error changing party:', err);
//             setError(err.response?.data?.error || 'An error occurred while updating party');
//         } finally {
//             setIsLoading(false);
//         }
//     };

//     const handleGoToEditPage = async () => {
//         if (!currentPartyInfo) {
//             setError('Please find a voucher first');
//             return;
//         }

//         setIsLoading(true);
//         try {
//             // Get the GUID ID for navigation using the correct endpoint
//             const response = await api.get('/api/retailer/credit-sales/get-id-by-number', {
//                 params: { billNumber: billNumber }
//             });

//             if (response.data.success) {
//                 // Navigate to edit page with GUID ID
//                 navigate(`/retailer/credit-sales/edit/${response.data.data.id}`);
//             } else {
//                 setError('Could not find voucher details for editing');
//             }
//         } catch (err) {
//             console.error('Error getting ID:', err);
//             setError('Error loading voucher for editing');
//         } finally {
//             setIsLoading(false);
//         }
//     };

//     const handleKeyDown = (e) => {
//         if (e.key === 'Enter') {
//             e.preventDefault();

//             if (!showPartyModal) {
//                 // Programmatically click the submit button
//                 document.getElementById('findBill').click();
//             }
//         }
//     };

//     return (
//         <div className='Container-fluid'>
//             <Header />

//             {/* Main Search Form - ALWAYS VISIBLE */}
//             <div className="container mt-5 wow-form centered-container">
//                 <div className="card shadow-lg p-4 animate__animated animate__fadeInUp expanded-card">
//                     <h1 className="text-center mb-4">Enter Credit Sales Voucher Number</h1>

//                     {error && (
//                         <div className="alert alert-danger alert-dismissible fade show" role="alert">
//                             <strong>Error:</strong> {error}
//                             <button type="button" className="btn-close" onClick={() => setError('')}></button>
//                         </div>
//                     )}

//                     <form onSubmit={handleFindCreditSales} className="needs-validation" noValidate>
//                         <div className="form-group">
//                             <label htmlFor="billNumber" className="form-label">Voucher Number</label>
//                             <input
//                                 type="text"
//                                 name="billNumber"
//                                 id="billNumber"
//                                 className={`form-control ${error ? 'is-invalid' : ''}`}
//                                 required
//                                 placeholder="Enter voucher number"
//                                 aria-describedby="billHelp"
//                                 autoComplete="off"
//                                 ref={billNumberInputRef}
//                                 value={billNumber}
//                                 onChange={(e) => setBillNumber(e.target.value)}
//                                 onKeyDown={handleKeyDown}
//                                 disabled={isFetchingLatest}
//                             />
//                             {isFetchingLatest && (
//                                 <div className="text-muted small mt-1">Loading latest voucher number...</div>
//                             )}
//                             <small id="billHelp" className="form-text text-muted">
//                                 Enter voucher number to find and edit credit sales
//                             </small>
//                         </div>

//                         <button
//                             type="button"
//                             className="btn btn-primary btn-block mt-3"
//                             onClick={handleFindCreditSales}
//                             disabled={isLoading || isFetchingLatest || !billNumber.trim()}
//                             id="findBill"
//                         >
//                             {isLoading ? (
//                                 <>
//                                     <span className="spinner-border spinner-border-sm me-2"></span>
//                                     Searching...
//                                 </>
//                             ) : 'Find Credit Sales'}
//                         </button>
//                     </form>
//                 </div>
//             </div>

//             {/* Party Selection Modal - SHOWS AFTER FINDING VOUCHER */}
//             {showPartyModal && currentPartyInfo && (
//                 <>
//                     <div className="modal-backdrop fade show" style={{ zIndex: 1040 }}></div>
//                     <div className="modal fade show" tabIndex="-1" style={{ display: 'block', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1050 }}>
//                         <div className="modal-dialog modal-xl modal-dialog-centered" style={{ maxWidth: '95%' }}>
//                             <div className="modal-content" style={{ height: '80vh', maxHeight: '80vh' }}>

//                                 {/* Compact Header */}
//                                 <div className="modal-header py-1 px-3 bg-primary text-white">
//                                     <div className="d-flex align-items-center justify-content-between w-100">
//                                         <div className="d-flex align-items-center flex-wrap gap-1">
//                                             <i className="bi bi-file-text fs-6"></i>
//                                             <span className="fw-semibold"># {currentPartyInfo.billNumber}</span>
//                                             <small className="text-light opacity-75">• {new Date(currentPartyInfo.date).toLocaleDateString()}</small>
//                                             <span className="badge bg-light text-dark ms-1 fs-6">{currentPartyInfo.paymentMode}</span>
//                                         </div>
//                                         <button type="button" className="btn-close btn-close-white" onClick={handleClosePartyModal} aria-label="Close"></button>
//                                     </div>
//                                 </div>

//                                 <div className="modal-body p-0 d-flex flex-column">

//                                     {/* Ultra Compact Party Comparison */}
//                                     <div className="p-1 border-bottom bg-light">
//                                         <div className="row g-1">
//                                             <div className="col-md-6">
//                                                 <div className="border rounded p-1 bg-white">
//                                                     <div className="d-flex align-items-center mb-1">
//                                                         <i className="bi bi-person text-primary fs-6 me-1"></i>
//                                                         <small className="fw-semibold">Current Party</small>
//                                                     </div>
//                                                     <h6 className="mb-0 text-primary fs-6">{currentPartyInfo.accountName}</h6>
//                                                     <div className="d-flex align-items-center">
//                                                         <i className="bi bi-credit-card text-muted me-1" style={{ fontSize: '0.7rem' }}></i>
//                                                         <small className="text-muted">PAN: {currentPartyInfo.accountPan || 'N/A'}</small>
//                                                     </div>
//                                                 </div>
//                                             </div>
//                                             <div className="col-md-6">
//                                                 <div className="border border-primary rounded p-1 bg-white">
//                                                     <div className="d-flex align-items-center mb-1">
//                                                         <i className="bi bi-person-check text-primary fs-6 me-1"></i>
//                                                         <small className="fw-semibold">New Party</small>
//                                                     </div>
//                                                     {selectedAccount ? (
//                                                         <>
//                                                             <h6 className="mb-0 text-success fs-6">{selectedAccount.name}</h6>
//                                                             <div className="d-flex align-items-center">
//                                                                 <i className="bi bi-credit-card text-muted me-1" style={{ fontSize: '0.7rem' }}></i>
//                                                                 <small className="text-muted">PAN: {selectedAccount.pan || 'N/A'}</small>
//                                                             </div>
//                                                         </>
//                                                     ) : (
//                                                         <div className="text-center text-muted py-1">
//                                                             <i className="bi bi-info-circle fs-5 mb-1 d-block"></i>
//                                                             <small>Select a party</small>
//                                                         </div>
//                                                     )}
//                                                 </div>
//                                             </div>
//                                         </div>
//                                     </div>

//                                     {/* Compact Search */}
//                                     <div className="p-1 border-bottom">
//                                         <div className="input-group input-group-sm">
//                                             <span className="input-group-text bg-light border-end-0"><i className="bi bi-search"></i></span>
//                                             <input
//                                                 type="text"
//                                                 className="form-control form-control-sm border-start-0"
//                                                 placeholder="Search party by name, address, PAN..."
//                                                 autoFocus
//                                                 autoComplete='off'
//                                                 value={accountSearchQuery}
//                                                 onChange={handleAccountSearch}
//                                                 onKeyDown={(e) => {
//                                                     if (e.key === 'ArrowDown') {
//                                                         e.preventDefault();
//                                                         const firstItem = document.querySelector('.account-item');
//                                                         if (firstItem) firstItem.focus();
//                                                     } else if (e.key === 'Enter') {
//                                                         e.preventDefault();
//                                                         const activeItem = document.querySelector('.account-item.active');
//                                                         if (activeItem) {
//                                                             const accountId = activeItem.getAttribute('data-account-id');
//                                                             const account = accounts.find(a => a.id === accountId);
//                                                             if (account) handleAccountSelect(account);
//                                                         }
//                                                     }
//                                                 }}
//                                                 ref={accountSearchRef}
//                                             />
//                                         </div>
//                                     </div>

//                                     {/* Virtualized List */}
//                                     <div style={{ flex: 1, overflow: 'hidden' }}>
//                                         {accounts.length > 0 ? (
//                                             <VirtualizedAccountList
//                                                 accounts={accounts}
//                                                 onAccountClick={handleAccountSelect}
//                                                 searchRef={accountSearchRef}
//                                                 hasMore={hasMoreAccountResults}
//                                                 isSearching={isAccountSearching}
//                                                 onLoadMore={loadMoreAccounts}
//                                                 totalAccounts={totalAccounts}
//                                                 page={accountSearchPage}
//                                                 searchQuery={accountSearchQuery}
//                                             />
//                                         ) : (
//                                             <div className="d-flex justify-content-center align-items-center h-100">
//                                                 <div className="text-center text-muted">
//                                                     <i className="bi bi-people fs-4 mb-2"></i>
//                                                     <p className="small">Loading accounts...</p>
//                                                 </div>
//                                             </div>
//                                         )}
//                                     </div>

//                                     {/* Compact Footer */}
//                                     <div className="border-top bg-light p-1">
//                                         <div className="d-flex justify-content-between align-items-center">
//                                             <div className="text-muted small">
//                                                 <i className="bi bi-info-circle me-1"></i>
//                                                 <span>{accounts.length}/{totalAccounts} shown</span>
//                                             </div>
//                                             <div className="d-flex gap-1">
//                                                 <button type="button" className="btn btn-sm btn-outline-secondary" onClick={handleClosePartyModal} disabled={isLoading}>
//                                                     Cancel
//                                                 </button>
//                                                 <button type="button" className="btn btn-sm btn-warning" onClick={handleGoToEditPage} disabled={isLoading}>
//                                                     Edit
//                                                 </button>
//                                                 <button
//                                                     type="button"
//                                                     className="btn btn-sm btn-primary"
//                                                     onClick={handleChangeParty}
//                                                     disabled={!selectedAccount || selectedAccount.id === currentPartyInfo?.accountId || isLoading}
//                                                 >
//                                                     {isLoading ? (
//                                                         <>
//                                                             <span className="spinner-border spinner-border-sm me-1"></span>
//                                                             Changing...
//                                                         </>
//                                                     ) : (
//                                                         'Change Party'
//                                                     )}
//                                                 </button>
//                                             </div>
//                                         </div>
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>
//                     </div>
//                 </>
//             )}

//             {/* Product Modal */}
//             {showProductModal && (
//                 <ProductModal onClose={() => setShowProductModal(false)} />
//             )}
//         </div>
//     );
// };

// export default CreditSalesVoucherNumber;

//----------------------------------------------------------------end

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../Header';
import ProductModal from '../dashboard/modals/ProductModal';
import VirtualizedAccountList from '../../VirtualizedAccountList';

const CreditSalesVoucherNumber = () => {
    const [billNumber, setBillNumber] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingLatest, setIsFetchingLatest] = useState(true);
    const [showProductModal, setShowProductModal] = useState(false);
    const billNumberInputRef = useRef(null);

    // Modal states
    const [showPartyModal, setShowPartyModal] = useState(false);
    const [currentPartyInfo, setCurrentPartyInfo] = useState(null);
    const [accounts, setAccounts] = useState([]);
    const [selectedAccount, setSelectedAccount] = useState(null);

    // Account search states
    const [isAccountSearching, setIsAccountSearching] = useState(false);
    const [accountSearchQuery, setAccountSearchQuery] = useState('');
    const [accountSearchPage, setAccountSearchPage] = useState(1);
    const [hasMoreAccountResults, setHasMoreAccountResults] = useState(false);
    const [totalAccounts, setTotalAccounts] = useState(0);

    // NEW: State for cash sales warning
    const [showCashSalesWarning, setShowCashSalesWarning] = useState(false);
    const [cashSalesBillNumber, setCashSalesBillNumber] = useState('');

    const accountSearchRef = useRef(null);
    const navigate = useNavigate();

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

    // Focus the input when component mounts
    useEffect(() => {
        const timer = setTimeout(() => {
            if (billNumberInputRef.current) {
                billNumberInputRef.current.focus();
            }
        }, 100);

        return () => clearTimeout(timer);
    }, []);

    // Also focus when modal closes
    useEffect(() => {
        if (!showPartyModal && !showCashSalesWarning) {
            const timer = setTimeout(() => {
                if (billNumberInputRef.current) {
                    billNumberInputRef.current.focus();
                }
            }, 200);

            return () => clearTimeout(timer);
        }
    }, [showPartyModal, showCashSalesWarning]);

    // Fetch the latest bill number when component mounts
    useEffect(() => {
        const fetchLatestBillNumber = async () => {
            try {
                const response = await api.get('/api/retailer/credit-sales/finds');
                if (response.data.success) {
                    setBillNumber(response.data.data.billNumber || '');
                }
            } catch (err) {
                console.error('Error fetching latest bill number:', err);
            } finally {
                setIsFetchingLatest(false);
            }
        };
        fetchLatestBillNumber();
    }, []);

    // F9 key handler for product modal
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

    // Fetch accounts for party selection
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
                    setAccounts(response.data.accounts);
                } else {
                    setAccounts(prev => [...prev, ...response.data.accounts]);
                }
                setHasMoreAccountResults(response.data.pagination.hasNextPage);
                setTotalAccounts(response.data.pagination.totalAccounts);
                setAccountSearchPage(page);
            }
        } catch (error) {
            console.error('Error fetching accounts:', error);
            setError('Error loading accounts');
        } finally {
            setIsAccountSearching(false);
        }
    };

    const handleAccountSearch = (e) => {
        const searchText = e.target.value;
        setAccountSearchQuery(searchText);
        setAccountSearchPage(1);

        const timer = setTimeout(() => {
            fetchAccountsFromBackend(searchText, 1);
        }, 300);

        return () => clearTimeout(timer);
    };

    const loadMoreAccounts = () => {
        if (!isAccountSearching) {
            fetchAccountsFromBackend(accountSearchQuery, accountSearchPage + 1);
        }
    };

    // NEW: Check if bill is editable before proceeding
    const checkBillEditable = async (billNum) => {
        try {
            const response = await api.get('/api/retailer/credit-sales/check-editable', {
                params: { billNumber: billNum }
            });

            if (response.data.success) {
                return {
                    isEditable: response.data.isEditable,
                    hasCashAccount: response.data.hasCashAccount,
                    message: response.data.message
                };
            }
            return { isEditable: false, hasCashAccount: false, message: response.data.error };
        } catch (err) {
            console.error('Error checking bill editability:', err);
            return { isEditable: false, hasCashAccount: false, message: 'Error checking voucher' };
        }
    };

    const handleFindCreditSales = async (e) => {
        e.preventDefault();
        setError('');
        setShowCashSalesWarning(false);

        if (!billNumber.trim()) {
            setError('Please enter a voucher number');
            return;
        }

        setIsLoading(true);
        try {
            // NEW: First check if bill is editable
            const editableCheck = await checkBillEditable(billNumber);

            if (!editableCheck.isEditable) {
                if (editableCheck.hasCashAccount) {
                    // Show cash sales warning
                    setCashSalesBillNumber(billNumber);
                    setShowCashSalesWarning(true);
                } else {
                    setError(editableCheck.message || 'Voucher not found or cannot be edited');
                }
                setIsLoading(false);
                return;
            }

            // Step 1: Fetch party information for the voucher
            const response = await api.get('/api/retailer/credit-sales/find-party', {
                params: { billNumber: billNumber }
            });

            if (response.data.success) {
                setCurrentPartyInfo(response.data.data);

                // Pre-select the current account
                const currentAccount = {
                    id: response.data.data.accountId,
                    name: response.data.data.accountName,
                    address: response.data.data.accountAddress,
                    pan: response.data.data.accountPan,
                    uniqueNumber: response.data.data.accountUniqueNumber
                };
                setSelectedAccount(currentAccount);

                // Fetch accounts for selection
                await fetchAccountsFromBackend('', 1);

                // Show party selection modal
                setShowPartyModal(true);
            } else {
                setError(response.data.error || 'Voucher not found');
            }
        } catch (err) {
            console.error('Error fetching voucher:', err);
            setError(err.response?.data?.error || 'An error occurred while fetching voucher');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAccountSelect = (account) => {
        setSelectedAccount(account);
    };

    const handleClosePartyModal = () => {
        setShowPartyModal(false);
        setSelectedAccount(null);
        setCurrentPartyInfo(null);
        setAccountSearchQuery('');
        setAccounts([]);
    };

    // NEW: Handle close cash sales warning
    const handleCloseCashSalesWarning = () => {
        setShowCashSalesWarning(false);
        setCashSalesBillNumber('');
        // Focus back on input
        setTimeout(() => {
            if (billNumberInputRef.current) {
                billNumberInputRef.current.focus();
            }
        }, 100);
    };

    const handleChangeParty = async () => {
        if (!selectedAccount || !currentPartyInfo) {
            setError('Please select a party');
            return;
        }

        // Check if party is actually changed
        if (selectedAccount.id === currentPartyInfo.accountId) {
            setError('Selected party is same as current party');
            return;
        }

        setIsLoading(true);
        try {
            const response = await api.put(`/api/retailer/credit-sales/change-party/${billNumber}`, {
                accountId: selectedAccount.id
            });

            if (response.data.success) {
                // Update local party info
                setCurrentPartyInfo({
                    ...currentPartyInfo,
                    accountId: selectedAccount.id,
                    accountName: selectedAccount.name,
                    accountAddress: selectedAccount.address,
                    accountPan: selectedAccount.pan,
                    accountUniqueNumber: selectedAccount.uniqueNumber
                });

                // Show success message from backend
                alert(`✓ ${response.data.message || `Party changed successfully from "${currentPartyInfo.accountName}" to "${selectedAccount.name}"`}`);

                // Clear any errors
                setError('');

                // Don't close modal - keep it open for further editing
            } else {
                setError(response.data.error || 'Failed to update party');
            }
        } catch (err) {
            console.error('Error changing party:', err);
            setError(err.response?.data?.error || 'An error occurred while updating party');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoToEditPage = async () => {
        if (!currentPartyInfo) {
            setError('Please find a voucher first');
            return;
        }

        setIsLoading(true);
        try {
            // Get the GUID ID for navigation using the correct endpoint
            const response = await api.get('/api/retailer/credit-sales/get-id-by-number', {
                params: { billNumber: billNumber }
            });

            if (response.data.success) {
                // Navigate to edit page with GUID ID
                navigate(`/retailer/credit-sales/edit/${response.data.data.id}`);
            } else {
                setError('Could not find voucher details for editing');
            }
        } catch (err) {
            console.error('Error getting ID:', err);
            setError('Error loading voucher for editing');
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();

            if (!showPartyModal && !showCashSalesWarning) {
                // Programmatically click the submit button
                document.getElementById('findBill').click();
            }
        }
    };

    return (
        <div className='Container-fluid'>
            <Header />

            {/* Main Search Form - ALWAYS VISIBLE */}
            <div className="container mt-5 wow-form centered-container">
                <div className="card shadow-lg p-4 animate__animated animate__fadeInUp expanded-card">
                    <h1 className="text-center mb-4">Enter Credit Sales Voucher Number</h1>

                    {error && (
                        <div className="alert alert-danger alert-dismissible fade show" role="alert">
                            <strong>Error:</strong> {error}
                            <button type="button" className="btn-close" onClick={() => setError('')}></button>
                        </div>
                    )}

                    <form onSubmit={handleFindCreditSales} className="needs-validation" noValidate>
                        <div className="form-group">
                            <label htmlFor="billNumber" className="form-label">Voucher Number</label>
                            <input
                                type="text"
                                name="billNumber"
                                id="billNumber"
                                className={`form-control ${error ? 'is-invalid' : ''}`}
                                required
                                placeholder="Enter voucher number"
                                aria-describedby="billHelp"
                                autoComplete="off"
                                ref={billNumberInputRef}
                                value={billNumber}
                                onChange={(e) => setBillNumber(e.target.value)}
                                onKeyDown={handleKeyDown}
                                disabled={isFetchingLatest}
                            />
                            {isFetchingLatest && (
                                <div className="text-muted small mt-1">Loading latest voucher number...</div>
                            )}
                            <small id="billHelp" className="form-text text-muted">
                                Enter voucher number to find and edit credit sales
                            </small>
                        </div>

                        <button
                            type="button"
                            className="btn btn-primary btn-block mt-3"
                            onClick={handleFindCreditSales}
                            disabled={isLoading || isFetchingLatest || !billNumber.trim()}
                            id="findBill"
                        >
                            {isLoading ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2"></span>
                                    Searching...
                                </>
                            ) : 'Find Credit Sales'}
                        </button>
                    </form>
                </div>
            </div>

            {/* NEW: Cash Sales Warning Modal */}
            {showCashSalesWarning && (
                <>
                    <div className="modal-backdrop fade show" style={{ zIndex: 1040 }}></div>
                    <div className="modal fade show" tabIndex="-1" style={{ display: 'block', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1050 }}>
                        <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '400px' }}>
                            <div className="modal-content">
                                <div className="modal-header bg-warning text-dark">
                                    <h5 className="modal-title">
                                        <i className="bi bi-exclamation-triangle me-2"></i>
                                        Cannot Edit Cash Sales
                                    </h5>
                                    <button type="button" className="btn-close" onClick={handleCloseCashSalesWarning}></button>
                                </div>
                                <div className="modal-body text-center py-4">
                                    <i className="bi bi-cash-stack text-warning" style={{ fontSize: '3rem' }}></i>
                                    <h6 className="mt-3">Voucher #{cashSalesBillNumber}</h6>
                                    <p className="mt-2">
                                        This is a cash sales voucher and cannot be edited as credit sales.
                                        Cash sales vouchers are processed through the cash sales module.
                                    </p>
                                </div>
                                <div className="modal-footer">
                                    <button
                                        type="button"
                                        className="btn btn-primary w-100"
                                        onClick={handleCloseCashSalesWarning}
                                    >
                                        OK, Got It
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Party Selection Modal - SHOWS AFTER FINDING VOUCHER */}
            {showPartyModal && currentPartyInfo && (
                <>
                    <div className="modal-backdrop fade show" style={{ zIndex: 1040 }}></div>
                    <div className="modal fade show" tabIndex="-1" style={{ display: 'block', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1050 }}>
                        <div className="modal-dialog modal-xl modal-dialog-centered" style={{ maxWidth: '95%' }}>
                            <div className="modal-content" style={{ height: '80vh', maxHeight: '80vh' }}>

                                {/* Compact Header */}
                                <div className="modal-header py-1 px-3 bg-primary text-white">
                                    <div className="d-flex align-items-center justify-content-between w-100">
                                        <div className="d-flex align-items-center flex-wrap gap-1">
                                            <i className="bi bi-file-text fs-6"></i>
                                            <span className="fw-semibold"># {currentPartyInfo.billNumber}</span>
                                            <small className="text-light opacity-75">• {new Date(currentPartyInfo.date).toLocaleDateString()}</small>
                                            <span className="badge bg-light text-dark ms-1 fs-6">{currentPartyInfo.paymentMode}</span>
                                        </div>
                                        <button type="button" className="btn-close btn-close-white" onClick={handleClosePartyModal} aria-label="Close"></button>
                                    </div>
                                </div>

                                <div className="modal-body p-0 d-flex flex-column">

                                    {/* Ultra Compact Party Comparison */}
                                    <div className="p-1 border-bottom bg-light">
                                        <div className="row g-1">
                                            <div className="col-md-6">
                                                <div className="border rounded p-1 bg-white">
                                                    <div className="d-flex align-items-center mb-1">
                                                        <i className="bi bi-person text-primary fs-6 me-1"></i>
                                                        <small className="fw-semibold">Current Party</small>
                                                    </div>
                                                    <h6 className="mb-0 text-primary fs-6">{currentPartyInfo.accountName}</h6>
                                                    <div className="d-flex align-items-center">
                                                        <i className="bi bi-credit-card text-muted me-1" style={{ fontSize: '0.7rem' }}></i>
                                                        <small className="text-muted">PAN: {currentPartyInfo.accountPan || 'N/A'}</small>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="border border-primary rounded p-1 bg-white">
                                                    <div className="d-flex align-items-center mb-1">
                                                        <i className="bi bi-person-check text-primary fs-6 me-1"></i>
                                                        <small className="fw-semibold">New Party</small>
                                                    </div>
                                                    {selectedAccount ? (
                                                        <>
                                                            <h6 className="mb-0 text-success fs-6">{selectedAccount.name}</h6>
                                                            <div className="d-flex align-items-center">
                                                                <i className="bi bi-credit-card text-muted me-1" style={{ fontSize: '0.7rem' }}></i>
                                                                <small className="text-muted">PAN: {selectedAccount.pan || 'N/A'}</small>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="text-center text-muted py-1">
                                                            <i className="bi bi-info-circle fs-5 mb-1 d-block"></i>
                                                            <small>Select a party</small>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Compact Search */}
                                    <div className="p-1 border-bottom">
                                        <div className="input-group input-group-sm">
                                            <span className="input-group-text bg-light border-end-0"><i className="bi bi-search"></i></span>
                                            <input
                                                type="text"
                                                className="form-control form-control-sm border-start-0"
                                                placeholder="Search party by name, address, PAN..."
                                                autoFocus
                                                autoComplete='off'
                                                value={accountSearchQuery}
                                                onChange={handleAccountSearch}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'ArrowDown') {
                                                        e.preventDefault();
                                                        const firstItem = document.querySelector('.account-item');
                                                        if (firstItem) firstItem.focus();
                                                    } else if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        const activeItem = document.querySelector('.account-item.active');
                                                        if (activeItem) {
                                                            const accountId = activeItem.getAttribute('data-account-id');
                                                            const account = accounts.find(a => a.id === accountId);
                                                            if (account) handleAccountSelect(account);
                                                        }
                                                    }
                                                }}
                                                ref={accountSearchRef}
                                            />
                                        </div>
                                    </div>

                                    {/* Virtualized List */}
                                    <div style={{ flex: 1, overflow: 'hidden' }}>
                                        {accounts.length > 0 ? (
                                            <VirtualizedAccountList
                                                accounts={accounts}
                                                onAccountClick={handleAccountSelect}
                                                searchRef={accountSearchRef}
                                                hasMore={hasMoreAccountResults}
                                                isSearching={isAccountSearching}
                                                onLoadMore={loadMoreAccounts}
                                                totalAccounts={totalAccounts}
                                                page={accountSearchPage}
                                                searchQuery={accountSearchQuery}
                                            />
                                        ) : (
                                            <div className="d-flex justify-content-center align-items-center h-100">
                                                <div className="text-center text-muted">
                                                    <i className="bi bi-people fs-4 mb-2"></i>
                                                    <p className="small">Loading accounts...</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Compact Footer */}
                                    <div className="border-top bg-light p-1">
                                        <div className="d-flex justify-content-between align-items-center">
                                            <div className="text-muted small">
                                                <i className="bi bi-info-circle me-1"></i>
                                                <span>{accounts.length}/{totalAccounts} shown</span>
                                            </div>
                                            <div className="d-flex gap-1">
                                                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={handleClosePartyModal} disabled={isLoading}>
                                                    Cancel
                                                </button>
                                                <button type="button" className="btn btn-sm btn-warning" onClick={handleGoToEditPage} disabled={isLoading}>
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-primary"
                                                    onClick={handleChangeParty}
                                                    disabled={!selectedAccount || selectedAccount.id === currentPartyInfo?.accountId || isLoading}
                                                >
                                                    {isLoading ? (
                                                        <>
                                                            <span className="spinner-border spinner-border-sm me-1"></span>
                                                            Changing...
                                                        </>
                                                    ) : (
                                                        'Change Party'
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Product Modal */}
            {showProductModal && (
                <ProductModal onClose={() => setShowProductModal(false)} />
            )}
        </div>
    );
};

export default CreditSalesVoucherNumber;