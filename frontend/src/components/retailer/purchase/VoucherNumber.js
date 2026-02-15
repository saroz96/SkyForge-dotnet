import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../Header';
import ProductModal from '../dashboard/modals/ProductModal';
import '../../../stylesheet/retailer/purchase/FindPurchase.css';
import VirtualizedAccountList from '../../VirtualizedAccountList';

const PurchaseVoucherNumber = () => {
    const [billNumber, setBillNumber] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingLatest, setIsFetchingLatest] = useState(true);
    const [showProductModal, setShowProductModal] = useState(false);

    // Modal states - IMPORTANT: Initialize showPartyModal as false
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

    // Fetch the latest bill number when component mounts
    useEffect(() => {
        const fetchLatestBillNumber = async () => {
            try {
                const response = await api.get('/api/retailer/purchase/finds');
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

    const handleFindPurchase = async (e) => {
        e.preventDefault();
        console.log('Find Purchase clicked');
        setError('');

        if (!billNumber.trim()) {
            setError('Please enter a voucher number');
            return;
        }

        setIsLoading(true);
        try {
            console.log('Fetching party info for bill:', billNumber);
            // Step 1: Fetch party information for the voucher
            const response = await api.get('/api/retailer/purchase/find-party', {
                params: { billNumber: billNumber }
            });

            console.log('Party info response:', response.data);

            if (response.data.success) {
                setCurrentPartyInfo(response.data.data);

                // Pre-select the current account - using id instead of _id for ASP.NET
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
                console.log('Opening party modal');
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
        console.log('Account selected:', account);
        setSelectedAccount(account);
    };

    const handleClosePartyModal = () => {
        console.log('Closing party modal');
        setShowPartyModal(false);
        setSelectedAccount(null);
        setCurrentPartyInfo(null);
        setAccountSearchQuery('');
        setAccounts([]);
    };

    const handleChangeParty = async () => {
        console.log('Change party clicked');
        if (!selectedAccount || !currentPartyInfo) {
            setError('Please select a party');
            return;
        }

        // Check if party is actually changed - using id instead of _id
        if (selectedAccount.id === currentPartyInfo.accountId) {
            setError('Selected party is same as current party');
            return;
        }

        setIsLoading(true);
        try {
            const response = await api.put(`/api/retailer/purchase/change-party/${billNumber}`, {
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

                // Success message
                setError('');
                alert(`✓ Party changed successfully from "${currentPartyInfo.accountName}" to "${selectedAccount.name}"`);

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
        console.log('Edit purchase clicked');
        if (!currentPartyInfo) {
            setError('Please find a voucher first');
            return;
        }

        setIsLoading(true);
        try {
            // Get the GUID ID for navigation
            const response = await api.get('/api/retailer/purchase/get-id-by-number', {
                params: { billNumber: billNumber }
            });

            if (response.data.success) {
                console.log('Navigating to edit page with ID:', response.data.data.id);
                // Navigate to edit page with GUID ID
                navigate(`/retailer/purchase/edit/${response.data.data.id}`);
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
        if (e.key === 'Enter' && !showPartyModal) {
            e.preventDefault();
            handleFindPurchase();
        }
    };

    // Add this debug log
    useEffect(() => {
        console.log('Current state:', {
            showPartyModal,
            currentPartyInfo,
            accountsCount: accounts.length,
            selectedAccount
        });
    }, [showPartyModal, currentPartyInfo, accounts, selectedAccount]);

    return (
        <div className='Container-fluid'>
            <Header />

            {/* Main Search Form - ALWAYS VISIBLE */}
            <div className="container mt-5 wow-form centered-container">
                <div className="card shadow-lg p-4 animate__animated animate__fadeInUp expanded-card">
                    <h1 className="text-center mb-4">Enter Purchase Voucher Number</h1>

                    {error && (
                        <div className="alert alert-danger alert-dismissible fade show" role="alert">
                            <strong>Error:</strong> {error}
                            <button type="button" className="btn-close" onClick={() => setError('')}></button>
                        </div>
                    )}

                    <form onSubmit={handleFindPurchase} className="needs-validation" noValidate>
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
                                autoFocus
                                value={billNumber}
                                onChange={(e) => setBillNumber(e.target.value)}
                                onKeyDown={handleKeyDown}
                                disabled={isFetchingLatest}
                            />
                            {isFetchingLatest && (
                                <div className="text-muted small mt-1">Loading latest voucher number...</div>
                            )}
                            <small id="billHelp" className="form-text text-muted">
                                Enter voucher number to find and edit purchase
                            </small>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-block mt-3"
                            disabled={isLoading || isFetchingLatest || !billNumber.trim()}
                            id="findBill"
                        >
                            {isLoading ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2"></span>
                                    Searching...
                                </>
                            ) : 'Find Purchase'}
                        </button>
                    </form>
                </div>
            </div>


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
                                            {currentPartyInfo.partyBillNumber && (
                                                <small className="text-light opacity-75">• Inv: {currentPartyInfo.partyBillNumber}</small>
                                            )}
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
                                                    {/* <div className="d-flex align-items-center mt-1">
                                            <i className="bi bi-geo-alt text-muted me-1" style={{ fontSize: '0.7rem' }}></i>
                                            <small className="text-muted">{currentPartyInfo.accountAddress || 'No address'}</small>
                                        </div> */}
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
                                                            {/* <div className="d-flex align-items-center mt-1">
                                                    <i className="bi bi-geo-alt text-muted me-1" style={{ fontSize: '0.7rem' }}></i>
                                                    <small className="text-muted">{selectedAccount.address || 'No address'}</small>
                                                </div> */}
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
                                                            const account = accounts.find(a => a.id === accountId); // Changed from _id to id
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
                                                    disabled={!selectedAccount || selectedAccount.id === currentPartyInfo?.accountId || isLoading} // Changed from _id to id
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

export default PurchaseVoucherNumber;
