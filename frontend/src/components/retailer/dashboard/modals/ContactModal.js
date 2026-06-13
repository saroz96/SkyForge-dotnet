import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Modal, Button, Card, Row, Col, Badge } from 'react-bootstrap';
import axios from 'axios';

const ContactModal = ({ show, onHide }) => {
    const [contacts, setContacts] = useState([]);
    const [filteredContacts, setFilteredContacts] = useState([]);
    const [displayedContacts, setDisplayedContacts] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentFocus, setCurrentFocus] = useState(0);
    const [isSearching, setIsSearching] = useState(false);
    const [searchPage, setSearchPage] = useState(1);
    const [hasMoreResults, setHasMoreResults] = useState(false);
    const [totalContacts, setTotalContacts] = useState(0);
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [showAccountModal, setShowAccountModal] = useState(false);
    const [accountDetails, setAccountDetails] = useState(null);
    const [accountLoading, setAccountLoading] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const listRef = useRef(null);
    const rowRefs = useRef([]);
    const searchInputRef = useRef(null);
    const loadingRef = useRef(false);

    // Create axios instance with auth interceptor
    const api = useMemo(() => {
        const instance = axios.create({
            baseURL: process.env.REACT_APP_API_BASE_URL || '',
            withCredentials: true,
        });
        
        instance.interceptors.request.use(
            (config) => {
                const token = localStorage.getItem('token');
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error) => Promise.reject(error)
        );
        
        return instance;
    }, []);

    // Fetch contacts from backend with pagination - USING CORRECT ENDPOINT
    const fetchContacts = useCallback(async (searchTerm = '', page = 1, append = false) => {
        try {
            setIsSearching(true);
            setError(null);
            
            // Use the correct endpoint - /api/retailer/contacts (not /search)
            const response = await api.get('/api/retailer/contacts', {
                params: {
                    search: searchTerm,
                    page: page,
                    limit: 15
                }
            });

            if (response.data.success) {
                const newContacts = response.data.data || [];
                
                if (append) {
                    setContacts(prev => [...prev, ...newContacts]);
                    setDisplayedContacts(prev => [...prev, ...newContacts]);
                } else {
                    setContacts(newContacts);
                    setFilteredContacts(newContacts);
                    setDisplayedContacts(newContacts);
                }
                
                setHasMoreResults(response.data.pagination?.hasNextPage || false);
                setTotalContacts(response.data.pagination?.totalItems || newContacts.length);
                setSearchPage(page);
            } else {
                throw new Error(response.data.error || 'Failed to fetch contacts');
            }
        } catch (err) {
            console.error('Error fetching contacts:', err);
            setError(err.response?.data?.error || 'Error fetching contacts. Please try again.');
        } finally {
            setIsSearching(false);
        }
    }, [api]);

    // Load more contacts for infinite scrolling
    const loadMoreContacts = useCallback(() => {
        if (!isSearching && hasMoreResults && !loadingRef.current && !searchQuery) {
            loadingRef.current = true;
            fetchContacts(searchQuery, searchPage + 1, true);
            setTimeout(() => {
                loadingRef.current = false;
            }, 500);
        }
    }, [isSearching, hasMoreResults, searchQuery, searchPage, fetchContacts]);

    // Debounced search effect
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery) {
                fetchContacts(searchQuery, 1, false);
            } else {
                fetchContacts('', 1, false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, fetchContacts]);

    // Load initial contacts when modal opens
    useEffect(() => {
        if (show) {
            fetchContacts('', 1, false);
        }
    }, [show, fetchContacts]);

    // Handle scroll for infinite loading
    useEffect(() => {
        const handleScroll = () => {
            if (!listRef.current) return;
            
            const container = listRef.current;
            const scrollTop = container.scrollTop;
            const clientHeight = container.clientHeight;
            const scrollHeight = container.scrollHeight;
            
            // Load more when scrolled near bottom (90% threshold)
            if (!isSearching && hasMoreResults && !searchQuery) {
                const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;
                if (scrollPercentage > 0.9) {
                    loadMoreContacts();
                }
            }
        };
        
        const container = listRef.current;
        if (container && !searchQuery) {
            container.addEventListener('scroll', handleScroll);
            return () => container.removeEventListener('scroll', handleScroll);
        }
    }, [hasMoreResults, isSearching, searchQuery, loadMoreContacts]);

    const fetchAccountDetails = async (accountId) => {
        setAccountLoading(true);
        try {
            const response = await api.get(`/api/retailer/companies/${accountId}`);
            
            if (response.data.success) {
                setAccountDetails(response.data.data);
                setShowAccountModal(true);
            } else {
                throw new Error(response.data.error || 'Failed to fetch account details');
            }
        } catch (error) {
            console.error('Error fetching account details:', error);
            alert(error.response?.data?.error || 'Error fetching account details. Please try again.');
        } finally {
            setAccountLoading(false);
        }
    };

    const handleSearch = (e) => {
        const query = e.target.value;
        setSearchQuery(query);
        setCurrentFocus(0);
    };

    const handleKeyDown = (e) => {
        const currentContacts = searchQuery ? displayedContacts : contacts;
        if (currentContacts.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            const nextFocus = (currentFocus + 1) % currentContacts.length;
            setCurrentFocus(nextFocus);
            scrollToItem(nextFocus);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const nextFocus = (currentFocus - 1 + currentContacts.length) % currentContacts.length;
            setCurrentFocus(nextFocus);
            scrollToItem(nextFocus);
        } else if (e.key === 'Enter' && currentContacts[currentFocus]) {
            e.preventDefault();
            selectContact(currentContacts[currentFocus]);
        } else if (e.key === 'Escape') {
            onHide();
        }
    };

    const scrollToItem = (index) => {
        if (rowRefs.current[index] && listRef.current) {
            const rowElement = rowRefs.current[index];
            const listContainer = listRef.current;
            const rowTop = rowElement.offsetTop;
            const rowBottom = rowTop + rowElement.offsetHeight;
            const containerTop = listContainer.scrollTop;
            const containerBottom = containerTop + listContainer.clientHeight;

            if (rowTop < containerTop) {
                listContainer.scrollTop = rowTop;
            } else if (rowBottom > containerBottom) {
                listContainer.scrollTop = rowBottom - listContainer.clientHeight;
            }
        }
    };

    const selectContact = async (contact) => {
        setSelectedAccount(contact);
        if (contact.id || contact._id) {
            const accountId = contact.id || contact._id;
            await fetchAccountDetails(accountId);
        }
    };

    const handleAccountModalClose = () => {
        setShowAccountModal(false);
        setAccountDetails(null);
        setSelectedAccount(null);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString();
    };

    const formatBalance = (amount, type) => {
        if (!amount && amount !== 0) return 'N/A';
        return `${amount} ${type || 'Dr'}`;
    };

    const getCurrentOpeningBalance = () => {
        if (!accountDetails?.financialInfo?.currentOpeningBalance) return null;
        return accountDetails.financialInfo.currentOpeningBalance;
    };

    const compressText = (text, maxLength = 30) => {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    };

    const displayedContactList = searchQuery ? displayedContacts : contacts;
    const displayCount = displayedContactList.length;

    return (
        <>
            {/* Main Contact Modal */}
            <Modal
                show={show}
                onHide={onHide}
                size="xl"
                centered
                backdrop="static"
                style={{ zIndex: 1050 }}
            >
                <Modal.Body className="p-0">
                    <div className="modal-content" style={{ height: '440px', border: 'none' }}>
                        <div className="modal-header py-1 border-bottom">
                            <p className="modal-title mb-0" style={{ fontSize: '0.9rem', fontWeight: '500' }}>
                                Contact Details
                            </p>
                            <button
                                type="button"
                                className="btn-close"
                                onClick={onHide}
                                style={{ fontSize: '0.7rem' }}
                            ></button>
                        </div>

                        {/* Search Input */}
                        <div className="p-2 bg-white sticky-top border-bottom">
                            <div className="row g-2 align-items-center">
                                <div className="col-md-12">
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        id="searchContact"
                                        className="form-control form-control-sm"
                                        placeholder="Search contacts by name, address, phone, email or contact person..."
                                        autoFocus
                                        autoComplete="off"
                                        value={searchQuery}
                                        onChange={handleSearch}
                                        onKeyDown={handleKeyDown}
                                        style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Contacts Table */}
                        <div style={{ height: 'calc(440px - 100px)' }}>
                            <div
                                className="w-100 h-100"
                                style={{
                                    border: '1px solid #dee2e6',
                                    borderRadius: '0.25rem',
                                    overflow: 'hidden'
                                }}
                            >
                                {/* Table Header */}
                                <div className="dropdown-header" style={{
                                    display: 'grid',
                                    gridTemplateColumns: '2fr 2fr 1.5fr 2fr 1.5fr',
                                    alignItems: 'center',
                                    padding: '0 8px',
                                    height: '28px',
                                    background: '#f0f0f0',
                                    fontWeight: 'bold',
                                    borderBottom: '1px solid #dee2e6',
                                    position: 'sticky',
                                    top: 0,
                                    zIndex: 1,
                                    fontSize: '0.7rem'
                                }}>
                                    <div><strong>Name</strong></div>
                                    <div><strong>Address</strong></div>
                                    <div><strong>Phone</strong></div>
                                    <div><strong>Email</strong></div>
                                    <div><strong>Contact Person</strong></div>
                                </div>

                                {/* Contacts List with infinite scroll */}
                                <div
                                    ref={listRef}
                                    style={{
                                        height: 'calc(100% - 28px)',
                                        overflowY: 'auto',
                                        position: 'relative'
                                    }}
                                    onKeyDown={handleKeyDown}
                                    tabIndex={0}
                                >
                                    {isSearching && displayCount === 0 ? (
                                        <div className="text-center py-3 text-muted" style={{ fontSize: '0.75rem' }}>
                                            Loading contacts...
                                        </div>
                                    ) : error ? (
                                        <div className="text-center py-3 text-danger" style={{ fontSize: '0.75rem' }}>
                                            {error}
                                            <button className="btn btn-sm btn-danger ms-2" onClick={() => fetchContacts(searchQuery, 1, false)}>
                                                Retry
                                            </button>
                                        </div>
                                    ) : displayCount === 0 ? (
                                        <div className="text-center py-3 text-muted" style={{ fontSize: '0.75rem' }}>
                                            {searchQuery ? 'No contacts match your search' : 'No contacts available'}
                                        </div>
                                    ) : (
                                        <>
                                            {displayedContactList.map((contact, index) => (
                                                <div
                                                    key={contact.id || contact._id || index}
                                                    ref={el => rowRefs.current[index] = el}
                                                    className={`dropdown-item ${index === currentFocus ? 'active' : ''}`}
                                                    onClick={() => selectContact(contact)}
                                                    style={{
                                                        display: 'grid',
                                                        gridTemplateColumns: '2fr 2fr 1.5fr 2fr 1.5fr',
                                                        alignItems: 'center',
                                                        padding: '6px 8px',
                                                        cursor: 'pointer',
                                                        fontSize: '0.75rem',
                                                        borderBottom: '1px solid #f0f0f0',
                                                        margin: 0,
                                                        gap: 0
                                                    }}
                                                    tabIndex={0}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            selectContact(contact);
                                                        }
                                                    }}
                                                >
                                                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={contact.name}>
                                                        {compressText(contact.name, 30) || 'N/A'}
                                                    </div>
                                                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={contact.address}>
                                                        {compressText(contact.address, 30) || 'N/A'}
                                                    </div>
                                                    <div>{contact.phone || 'N/A'}</div>
                                                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={contact.email}>
                                                        {compressText(contact.email, 25) || 'N/A'}
                                                    </div>
                                                    <div>{contact.contactPerson || contact.contactperson || 'N/A'}</div>
                                                </div>
                                            ))}
                                            
                                            {/* Loading indicator for infinite scroll */}
                                            {hasMoreResults && !searchQuery && (
                                                <div style={{
                                                    height: '28px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '0.7rem',
                                                    color: '#666'
                                                }}>
                                                    Loading more...
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="modal-footer py-1 border-top" style={{ fontSize: '0.75rem' }}>
                            <div className="d-flex justify-content-between w-100">
                                <div>
                                    Showing {displayCount} of {totalContacts} contact{totalContacts !== 1 ? 's' : ''}
                                    {searchQuery && searchPage > 1 && ` (Page ${searchPage})`}
                                </div>
                                <div className="text-muted">
                                    {searchQuery ? 'Press ESC to close' : 'Scroll for more'}
                                </div>
                            </div>
                        </div>
                    </div>
                </Modal.Body>
            </Modal>

            {/* Account Details Modal - Keep same as before */}
            <Modal
                show={showAccountModal}
                onHide={handleAccountModalClose}
                size="lg"
                centered
                backdrop="static"
            >
                <Modal.Header closeButton className="py-2">
                    <Modal.Title style={{ fontSize: '0.9rem' }}>
                        {accountLoading ? 'Loading Account Details...' : `Account Details - ${accountDetails?.account?.name || 'N/A'}`}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ fontSize: '0.8rem', maxHeight: '60vh', overflowY: 'auto' }}>
                    {accountLoading ? (
                        <div className="text-center py-4">
                            <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                            <p className="mt-2 text-muted">Loading account details...</p>
                        </div>
                    ) : accountDetails ? (
                        <div className="account-details">
                            {/* Basic Information - Two column layout */}
                            <Row className="g-3 mb-4">
                                <Col md={6}>
                                    <Card className="h-100 shadow-sm border-0">
                                        <Card.Header className="bg-light py-2">
                                            <h6 className="mb-0 fw-semibold" style={{ fontSize: '0.85rem' }}>Basic Information</h6>
                                        </Card.Header>
                                        <Card.Body className="py-3" style={{ fontSize: '0.85rem' }}>
                                            <div className="mb-2 d-flex justify-content-between">
                                                <span className="text-muted">Account Name:</span>
                                                <span className="fw-medium">{accountDetails.account?.name || 'N/A'}</span>
                                            </div>
                                            <div className="mb-2 d-flex justify-content-between">
                                                <span className="text-muted">Unique Number:</span>
                                                <span className="fw-medium">{accountDetails.account?.uniqueNumber || 'N/A'}</span>
                                            </div>
                                            <div className="mb-2 d-flex justify-content-between">
                                                <span className="text-muted">Contact Person:</span>
                                                <span className="fw-medium">{accountDetails.account?.contactperson || 'N/A'}</span>
                                            </div>
                                            <div className="mb-2 d-flex justify-content-between">
                                                <span className="text-muted">Email:</span>
                                                <span className="fw-medium">{accountDetails.account?.email || 'N/A'}</span>
                                            </div>
                                            <div className="mb-0 d-flex justify-content-between">
                                                <span className="text-muted">Phone:</span>
                                                <span className="fw-medium">{accountDetails.account?.phone || 'N/A'}</span>
                                            </div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col md={6}>
                                    <Card className="h-100 shadow-sm border-0">
                                        <Card.Header className="bg-light py-2">
                                            <h6 className="mb-0 fw-semibold" style={{ fontSize: '0.85rem' }}>Address & Status</h6>
                                        </Card.Header>
                                        <Card.Body className="py-3" style={{ fontSize: '0.85rem' }}>
                                            <div className="mb-2">
                                                <span className="text-muted">Address:</span>
                                                <div className="mt-1 text-dark">{accountDetails.account?.address || 'N/A'}</div>
                                            </div>
                                            <div className="mb-2 d-flex justify-content-between">
                                                <span className="text-muted">Ward:</span>
                                                <span className="fw-medium">{accountDetails.account?.ward || 'N/A'}</span>
                                            </div>
                                            <div className="mb-2 d-flex justify-content-between">
                                                <span className="text-muted">PAN:</span>
                                                <span className="fw-medium">{accountDetails.account?.pan || 'N/A'}</span>
                                            </div>
                                            <div className="mb-2 d-flex justify-content-between">
                                                <span className="text-muted">Status:</span>
                                                <Badge bg={accountDetails.account?.isActive ? 'success' : 'danger'} className="px-2 py-1">
                                                    {accountDetails.account?.isActive ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </div>
                                            <div className="mb-0 d-flex justify-content-between">
                                                <span className="text-muted">Default Cash Account:</span>
                                                <Badge bg={accountDetails.account?.defaultCashAccount ? 'primary' : 'secondary'} className="px-2 py-1">
                                                    {accountDetails.account?.defaultCashAccount ? 'Yes' : 'No'}
                                                </Badge>
                                            </div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>

                            {/* Financial Information */}
                            <Row className="g-3 mb-4">
                                <Col md={6}>
                                    <Card className="shadow-sm border-0">
                                        <Card.Header className="bg-light py-2">
                                            <h6 className="mb-0 fw-semibold" style={{ fontSize: '0.85rem' }}>Financial Information</h6>
                                        </Card.Header>
                                        <Card.Body className="py-3" style={{ fontSize: '0.85rem' }}>
                                            <div className="mb-2 d-flex justify-content-between">
                                                <span className="text-muted">Credit Limit:</span>
                                                <span className="fw-medium">{accountDetails.account?.creditLimit ? `₹${accountDetails.account.creditLimit}` : 'N/A'}</span>
                                            </div>
                                            <div className="mb-2 d-flex justify-content-between">
                                                <span className="text-muted">Current Opening Balance:</span>
                                                <span className="fw-medium">{getCurrentOpeningBalance() ? formatBalance(getCurrentOpeningBalance().amount, getCurrentOpeningBalance().type) : 'N/A'}</span>
                                            </div>
                                            <div className="mb-2 d-flex justify-content-between">
                                                <span className="text-muted">Current Fiscal Year:</span>
                                                <span className="fw-medium">{accountDetails.financialInfo?.fiscalYear?.name || 'N/A'}</span>
                                            </div>
                                            <div className="mb-0">
                                                <span className="text-muted">Fiscal Year Period:</span>
                                                <div className="mt-1 text-dark">{accountDetails.financialInfo?.fiscalYear ? `${formatDate(accountDetails.financialInfo.fiscalYear.startDate)} - ${formatDate(accountDetails.financialInfo.fiscalYear.endDate)}` : 'N/A'}</div>
                                            </div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col md={6}>
                                    <Card className="shadow-sm border-0">
                                        <Card.Header className="bg-light py-2">
                                            <h6 className="mb-0 fw-semibold" style={{ fontSize: '0.85rem' }}>Account History</h6>
                                        </Card.Header>
                                        <Card.Body className="py-3" style={{ fontSize: '0.85rem' }}>
                                            <div className="mb-2 d-flex justify-content-between">
                                                <span className="text-muted">Created Date:</span>
                                                <span className="fw-medium">{formatDate(accountDetails.account?.createdAt)}</span>
                                            </div>
                                            <div className="mb-2 d-flex justify-content-between">
                                                <span className="text-muted">Last Updated:</span>
                                                <span className="fw-medium">{formatDate(accountDetails.account?.date)}</span>
                                            </div>
                                            <div className="mb-2 d-flex justify-content-between">
                                                <span className="text-muted">Opening Balance Date:</span>
                                                <span className="fw-medium">{formatDate(accountDetails.account?.openingBalanceDate)}</span>
                                            </div>
                                            <div className="mb-0 d-flex justify-content-between">
                                                <span className="text-muted">Transactions Count:</span>
                                                <span className="fw-medium">{accountDetails.account?.transactions ? accountDetails.account.transactions.length : 0}</span>
                                            </div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>

                            {/* Opening Balances by Fiscal Year */}
                            {accountDetails.account?.openingBalanceByFiscalYear && 
                             accountDetails.account.openingBalanceByFiscalYear.length > 0 && (
                                <Card className="mb-3 shadow-sm border-0">
                                    <Card.Header className="bg-light py-2">
                                        <h6 className="mb-0 fw-semibold" style={{ fontSize: '0.85rem' }}>Opening Balances by Fiscal Year</h6>
                                    </Card.Header>
                                    <Card.Body className="p-0">
                                        <div className="table-responsive">
                                            <table className="table table-sm table-striped mb-0" style={{ fontSize: '0.8rem' }}>
                                                <thead className="table-light">
                                                    <tr>
                                                        <th style={{ padding: '8px 10px' }}>Fiscal Year</th>
                                                        <th style={{ padding: '8px 10px' }} className="text-end">Amount</th>
                                                        <th style={{ padding: '8px 10px' }} className="text-center">Type</th>
                                                        <th style={{ padding: '8px 10px' }} className="text-center">Date</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {accountDetails.account.openingBalanceByFiscalYear.map((balance, index) => (
                                                        <tr key={index}>
                                                            <td style={{ padding: '8px 10px' }}>{balance.fiscalYear?.name || 'N/A'}</td>
                                                            <td style={{ padding: '8px 10px' }} className="text-end fw-medium">{balance.amount}</td>
                                                            <td style={{ padding: '8px 10px' }} className="text-center">
                                                                <Badge bg={balance.type === 'Dr' ? 'primary' : 'success'} className="px-2 py-1" style={{ fontSize: '0.7rem' }}>
                                                                    {balance.type}
                                                                </Badge>
                                                            </td>
                                                            <td style={{ padding: '8px 10px' }} className="text-center">{formatDate(balance.date)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                             </table>
                                        </div>
                                    </Card.Body>
                                </Card>
                            )}

                            {/* Company Groups */}
                            {accountDetails.account?.companyGroups && 
                             accountDetails.account.companyGroups.length > 0 && (
                                <Card className="shadow-sm border-0">
                                    <Card.Header className="bg-light py-2">
                                        <h6 className="mb-0 fw-semibold" style={{ fontSize: '0.85rem' }}>Company Groups</h6>
                                    </Card.Header>
                                    <Card.Body className="py-3">
                                        <div className="d-flex flex-wrap gap-2">
                                            {accountDetails.account.companyGroups.map((group, index) => (
                                                <Badge key={index} bg="secondary" className="px-3 py-2" style={{ fontSize: '0.75rem', fontWeight: '500' }}>
                                                    {group.name}
                                                </Badge>
                                            ))}
                                        </div>
                                    </Card.Body>
                                </Card>
                            )}
                        </div>
                    ) : (
                        <div className="alert alert-warning text-center py-4">
                            No account details available.
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer className="py-2">
                    <Button variant="secondary" size="sm" onClick={handleAccountModalClose}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default ContactModal;