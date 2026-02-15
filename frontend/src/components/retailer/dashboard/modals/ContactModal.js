// import React, { useState, useEffect, useRef } from 'react';
// import { Modal, Button, Form } from 'react-bootstrap';
// import axios from 'axios';
// import '../../../../stylesheet/retailer/dashboard/modals/ContactModal.css';
// import { usePageNotRefreshContext } from '../../PageNotRefreshContext';

// const ContactModal = ({ show, onHide }) => {
//     const { contactDraftSave, setContactDraftSave } = usePageNotRefreshContext();
//     const [contacts, setContacts] = useState([]);
//     const [filteredContacts, setFilteredContacts] = useState([]);
//     const [searchQuery, setSearchQuery] = useState('');
//     const [currentFocus, setCurrentFocus] = useState(0);
//     const [loadingState, setLoadingState] = useState({
//         isLoading: !contactDraftSave,
//         error: null,
//         isFresh: false
//     });
//     const listRef = useRef(null);
//     const rowRefs = useRef([]);
//     const searchInputRef = useRef(null);

//     useEffect(() => {
//         if (!loadingState.isLoading && contactDraftSave && contactDraftSave.contacts) {
//             setContacts(contactDraftSave.contacts);
//             setFilteredContacts(contactDraftSave.contacts);
//         }
//     }, [loadingState.isLoading, contactDraftSave]);

//     useEffect(() => {
//         if (show) {
//             fetchContacts();
//             const interval = setInterval(fetchContacts, 300000); // 5 minutes
//             return () => clearInterval(interval);
//         }
//     }, [show]);

//     const fetchContacts = async () => {
//         if (!contactDraftSave) {
//             setLoadingState(prev => ({ ...prev, isLoading: true }));
//         }

//         try {
//             const response = await axios.get('/api/retailer/contacts');
//             // Handle both response formats - check if data has success property
//             const responseData = response.data;

//             if (responseData.success) {
//                 // Format: { success: true, data: [...] }
//                 const freshContacts = responseData.data || [];
//                 setContacts(freshContacts);
//                 // Only update filteredContacts if there's no active search
//                 if (!searchQuery) {
//                     setFilteredContacts(freshContacts);
//                 }
//                 setContactDraftSave({ contacts: freshContacts });
//                 setLoadingState({ isLoading: false, error: null, isFresh: true });
//             } else {
//                 // Format: direct array response
//                 const freshContacts = Array.isArray(responseData) ? responseData : [];
//                 setContacts(freshContacts);
//                 if (!searchQuery) {
//                     setFilteredContacts(freshContacts);
//                 }
//                 setContactDraftSave({ contacts: freshContacts });
//                 setLoadingState({ isLoading: false, error: null, isFresh: true });
//             }
//         } catch (error) {
//             console.error('Error fetching contacts:', error);
//             if (!contactDraftSave) {
//                 setLoadingState({
//                     isLoading: false,
//                     error: error.response?.data?.error || 'Error fetching contacts. Please try again.',
//                     isFresh: false
//                 });
//             }
//         }
//     };

//     const handleSearch = (e) => {
//         const query = e.target.value.toLowerCase();
//         setSearchQuery(query);

//         // Determine which data source to use for filtering
//         const sourceContacts = loadingState.isFresh ? contacts :
//             (contactDraftSave?.contacts || contacts);

//         const filtered = (sourceContacts || []).filter(contact =>
//             (contact.name && contact.name.toLowerCase().includes(query)) ||
//             (contact.address && contact.address.toLowerCase().includes(query)) ||
//             (contact.phone && contact.phone.toLowerCase().includes(query)) ||
//             (contact.email && contact.email.toLowerCase().includes(query)) ||
//             (contact.contactperson && contact.contactperson.toLowerCase().includes(query))
//         );
//         setFilteredContacts(filtered);
//         setCurrentFocus(0);
//     };

//     const handleKeyDown = (e) => {
//         const currentFilteredContacts = filteredContacts || [];
//         if (currentFilteredContacts.length === 0) return;

//         if (e.key === 'ArrowDown') {
//             e.preventDefault();
//             const nextFocus = (currentFocus + 1) % currentFilteredContacts.length;
//             setCurrentFocus(nextFocus);
//             // Ensure the focused item is visible
//             scrollToItem(nextFocus);
//         } else if (e.key === 'ArrowUp') {
//             e.preventDefault();
//             const nextFocus = (currentFocus - 1 + currentFilteredContacts.length) % currentFilteredContacts.length;
//             setCurrentFocus(nextFocus);
//             // Ensure the focused item is visible
//             scrollToItem(nextFocus);
//         } else if (e.key === 'Enter' && currentFilteredContacts[currentFocus]) {
//             e.preventDefault();
//             selectContact(currentFilteredContacts[currentFocus]);
//         } else if (e.key === 'Escape') {
//             onHide();
//         }
//     };

//     // Scroll to ensure the focused item is visible
//     const scrollToItem = (index) => {
//         if (rowRefs.current[index] && listRef.current) {
//             const rowElement = rowRefs.current[index];
//             const listContainer = listRef.current;

//             // Calculate positions
//             const rowTop = rowElement.offsetTop;
//             const rowBottom = rowTop + rowElement.offsetHeight;
//             const containerTop = listContainer.scrollTop;
//             const containerBottom = containerTop + listContainer.clientHeight;

//             // Check if the row is not fully visible
//             if (rowTop < containerTop) {
//                 // Row is above the visible area
//                 listContainer.scrollTop = rowTop;
//             } else if (rowBottom > containerBottom) {
//                 // Row is below the visible area
//                 listContainer.scrollTop = rowBottom - listContainer.clientHeight;
//             }
//         }
//     };

//     const selectContact = (contact) => {
//         console.log('Selected contact:', contact);
//         onHide();
//     };

//     // Determine which data to display with proper null checks
//     const displayContacts = loadingState.isFresh ? contacts :
//         (contactDraftSave?.contacts || contacts || []);

//     const displayFilteredContacts = loadingState.isFresh ?
//         (searchQuery ? (filteredContacts || []) : (contacts || [])) :
//         (contactDraftSave?.contacts ?
//             (searchQuery ?
//                 (contactDraftSave.contacts || []).filter(contact =>
//                     (contact.name && contact.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
//                     (contact.address && contact.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
//                     (contact.phone && contact.phone.toLowerCase().includes(searchQuery.toLowerCase())) ||
//                     (contact.email && contact.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
//                     (contact.contactperson && contact.contactperson.toLowerCase().includes(searchQuery.toLowerCase()))
//                 ) :
//                 (contactDraftSave.contacts || [])
//             ) :
//             (filteredContacts || []));

//     // Safe length check
//     const displayCount = displayFilteredContacts ? displayFilteredContacts.length : 0;

//     if (loadingState.isLoading && !contactDraftSave) {
//         return (
//             <Modal show={show} onHide={onHide} size="lg" centered backdrop="static" dialogClassName="modal-custom-width">
//                 <Modal.Header closeButton className="bg-primary text-white">
//                     <Modal.Title>Contact Details</Modal.Title>
//                 </Modal.Header>
//                 <Modal.Body className="d-flex justify-content-center align-items-center" style={{ height: '600px' }}>
//                     <div className="text-center">
//                         <div className="spinner-border text-primary" role="status">
//                             <span className="visually-hidden">Loading...</span>
//                         </div>
//                         <p className="mt-2">Loading contacts...</p>
//                     </div>
//                 </Modal.Body>
//             </Modal>
//         );
//     }

//     if (loadingState.error && !contactDraftSave) {
//         return (
//             <Modal show={show} onHide={onHide} size="lg" centered backdrop="static" dialogClassName="modal-custom-width">
//                 <Modal.Header closeButton className="bg-primary text-white">
//                     <Modal.Title>Contact Details</Modal.Title>
//                 </Modal.Header>
//                 <Modal.Body className="d-flex justify-content-center align-items-center" style={{ height: '600px' }}>
//                     <div className="alert alert-danger">
//                         {loadingState.error}
//                         <button className="btn btn-sm btn-danger ms-2" onClick={fetchContacts}>
//                             Retry
//                         </button>
//                     </div>
//                 </Modal.Body>
//             </Modal>
//         );
//     }

//     return (
//         <Modal
//             show={show}
//             onHide={onHide}
//             size="lg"
//             onKeyDown={handleKeyDown}
//             centered
//             backdrop="static"
//             dialogClassName="modal-custom-width"
//         >
//             <Modal.Header closeButton className="bg-primary text-white">
//                 <Modal.Title>Contact Details</Modal.Title>
//             </Modal.Header>
//             <Modal.Body style={{
//                 overflowY: 'auto',
//                 height: '600px',
//                 display: 'flex',
//                 flexDirection: 'column'
//             }}>
//                 <Form.Group className="mb-4">
//                     <Form.Control
//                         ref={searchInputRef}
//                         type="text"
//                         placeholder="Search contacts by name, address, phone, email or contact person..."
//                         value={searchQuery}
//                         onChange={handleSearch}
//                         autoFocus
//                         className="search-input"
//                         autoComplete='off'
//                         onKeyDown={handleKeyDown}
//                     />
//                 </Form.Group>

//                 <div
//                     style={{
//                         overflow: 'hidden',
//                         flex: '1',
//                         minHeight: '200px',
//                         position: 'relative'
//                     }}
//                     tabIndex="0"
//                     onKeyDown={handleKeyDown}
//                 >
//                     <div className="contacts-container">
//                         <div className="contacts-header">
//                             <div className="contact-cell header-cell">Name</div>
//                             <div className="contact-cell header-cell">Address</div>
//                             <div className="contact-cell header-cell">Phone</div>
//                             <div className="contact-cell header-cell">Email</div>
//                             <div className="contact-cell header-cell">Contact Person</div>
//                         </div>
//                         <div
//                             className="contacts-list"
//                             ref={listRef}
//                             style={{
//                                 maxHeight: '400px',
//                                 overflowY: 'auto',
//                                 position: 'relative'
//                             }}
//                         >
//                             {displayCount === 0 ? (
//                                 <div className="contact-row text-center py-4 text-muted">
//                                     {searchQuery ? 'No contacts match your search' : 'No contacts available'}
//                                 </div>
//                             ) : (
//                                 displayFilteredContacts.map((contact, index) => (
//                                     <div
//                                         key={index}
//                                         ref={el => rowRefs.current[index] = el}
//                                         className={`contact-row ${index === currentFocus ? 'active' : ''}`}
//                                         onClick={() => selectContact(contact)}
//                                     >
//                                         <div className="contact-cell">{contact.name || 'N/A'}</div>
//                                         <div className="contact-cell">{contact.address || 'N/A'}</div>
//                                         <div className="contact-cell">{contact.phone || 'N/A'}</div>
//                                         <div className="contact-cell">{contact.email || 'N/A'}</div>
//                                         <div className="contact-cell">{contact.contactperson || 'N/A'}</div>
//                                     </div>
//                                 ))
//                             )}
//                         </div>
//                     </div>
//                 </div>
//             </Modal.Body>
//             <Modal.Footer className="d-flex justify-content-between">
//                 <div className="text-muted small">
//                     {displayCount} contact{displayCount !== 1 ? 's' : ''} found
//                     {contactDraftSave && !loadingState.isFresh && (
//                         <span className="ms-2 text-info">
//                             • Using saved data
//                         </span>
//                     )}
//                 </div>
//                 <Button variant="danger" onClick={onHide}>
//                     Close
//                 </Button>
//             </Modal.Footer>
//         </Modal>
//     );
// };

// export default ContactModal;

import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Form, Card, Row, Col, Badge } from 'react-bootstrap';
import axios from 'axios';
import '../../../../stylesheet/retailer/dashboard/modals/ContactModal.css';
import { usePageNotRefreshContext } from '../../PageNotRefreshContext';

const ContactModal = ({ show, onHide }) => {
    const { contactDraftSave, setContactDraftSave } = usePageNotRefreshContext();
    const [contacts, setContacts] = useState([]);
    const [filteredContacts, setFilteredContacts] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentFocus, setCurrentFocus] = useState(0);
    const [loadingState, setLoadingState] = useState({
        isLoading: !contactDraftSave,
        error: null,
        isFresh: false
    });
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [showAccountModal, setShowAccountModal] = useState(false);
    const [accountDetails, setAccountDetails] = useState(null);
    const [accountLoading, setAccountLoading] = useState(false);
    
    const listRef = useRef(null);
    const rowRefs = useRef([]);
    const searchInputRef = useRef(null);

    useEffect(() => {
        if (!loadingState.isLoading && contactDraftSave && contactDraftSave.contacts) {
            setContacts(contactDraftSave.contacts);
            setFilteredContacts(contactDraftSave.contacts);
        }
    }, [loadingState.isLoading, contactDraftSave]);

    useEffect(() => {
        if (show) {
            fetchContacts();
            const interval = setInterval(fetchContacts, 300000); // 5 minutes
            return () => clearInterval(interval);
        }
    }, [show]);

    const fetchContacts = async () => {
        if (!contactDraftSave) {
            setLoadingState(prev => ({ ...prev, isLoading: true }));
        }

        try {
            const response = await axios.get('/api/retailer/contacts');
            const responseData = response.data;

            if (responseData.success) {
                const freshContacts = responseData.data || [];
                setContacts(freshContacts);
                if (!searchQuery) {
                    setFilteredContacts(freshContacts);
                }
                setContactDraftSave({ contacts: freshContacts });
                setLoadingState({ isLoading: false, error: null, isFresh: true });
            } else {
                const freshContacts = Array.isArray(responseData) ? responseData : [];
                setContacts(freshContacts);
                if (!searchQuery) {
                    setFilteredContacts(freshContacts);
                }
                setContactDraftSave({ contacts: freshContacts });
                setLoadingState({ isLoading: false, error: null, isFresh: true });
            }
        } catch (error) {
            console.error('Error fetching contacts:', error);
            if (!contactDraftSave) {
                setLoadingState({
                    isLoading: false,
                    error: error.response?.data?.error || 'Error fetching contacts. Please try again.',
                    isFresh: false
                });
            }
        }
    };

    const fetchAccountDetails = async (accountId) => {
        setAccountLoading(true);
        try {
            const response = await axios.get(`/api/retailer/companies/${accountId}`);
            
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
        const query = e.target.value.toLowerCase();
        setSearchQuery(query);

        const sourceContacts = loadingState.isFresh ? contacts :
            (contactDraftSave?.contacts || contacts);

        const filtered = (sourceContacts || []).filter(contact =>
            (contact.name && contact.name.toLowerCase().includes(query)) ||
            (contact.address && contact.address.toLowerCase().includes(query)) ||
            (contact.phone && contact.phone.toLowerCase().includes(query)) ||
            (contact.email && contact.email.toLowerCase().includes(query)) ||
            (contact.contactperson && contact.contactperson.toLowerCase().includes(query))
        );
        setFilteredContacts(filtered);
        setCurrentFocus(0);
    };

    const handleKeyDown = (e) => {
        const currentFilteredContacts = filteredContacts || [];
        if (currentFilteredContacts.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            const nextFocus = (currentFocus + 1) % currentFilteredContacts.length;
            setCurrentFocus(nextFocus);
            scrollToItem(nextFocus);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const nextFocus = (currentFocus - 1 + currentFilteredContacts.length) % currentFilteredContacts.length;
            setCurrentFocus(nextFocus);
            scrollToItem(nextFocus);
        } else if (e.key === 'Enter' && currentFilteredContacts[currentFocus]) {
            e.preventDefault();
            selectContact(currentFilteredContacts[currentFocus]);
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
        console.log('Selected contact:', contact);
        setSelectedAccount(contact);
        
        // Fetch full account details using the correct endpoint
        if (contact._id) {
            await fetchAccountDetails(contact._id);
        } else {
            console.warn('Contact does not have an ID');
        }
    };

    const handleAccountModalClose = () => {
        setShowAccountModal(false);
        setAccountDetails(null);
        setSelectedAccount(null);
    };

    // Format date for display
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString();
    };

    // Format balance display
    const formatBalance = (amount, type) => {
        if (!amount && amount !== 0) return 'N/A';
        return `${amount} ${type || 'Dr'}`;
    };

    // Helper to get current opening balance
    const getCurrentOpeningBalance = () => {
        if (!accountDetails?.financialInfo?.currentOpeningBalance) return null;
        return accountDetails.financialInfo.currentOpeningBalance;
    };

    // Determine which data to display with proper null checks
    const displayContacts = loadingState.isFresh ? contacts :
        (contactDraftSave?.contacts || contacts || []);

    const displayFilteredContacts = loadingState.isFresh ?
        (searchQuery ? (filteredContacts || []) : (contacts || [])) :
        (contactDraftSave?.contacts ?
            (searchQuery ?
                (contactDraftSave.contacts || []).filter(contact =>
                    (contact.name && contact.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                    (contact.address && contact.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
                    (contact.phone && contact.phone.toLowerCase().includes(searchQuery.toLowerCase())) ||
                    (contact.email && contact.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
                    (contact.contactperson && contact.contactperson.toLowerCase().includes(searchQuery.toLowerCase()))
                ) :
                (contactDraftSave.contacts || [])
            ) :
            (filteredContacts || []));

    const displayCount = displayFilteredContacts ? displayFilteredContacts.length : 0;

    if (loadingState.isLoading && !contactDraftSave) {
        return (
            <Modal show={show} onHide={onHide} size="lg" centered backdrop="static" dialogClassName="modal-custom-width">
                <Modal.Header closeButton className="bg-primary text-white">
                    <Modal.Title>Contact Details</Modal.Title>
                </Modal.Header>
                <Modal.Body className="d-flex justify-content-center align-items-center" style={{ height: '600px' }}>
                    <div className="text-center">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                        <p className="mt-2">Loading contacts...</p>
                    </div>
                </Modal.Body>
            </Modal>
        );
    }

    if (loadingState.error && !contactDraftSave) {
        return (
            <Modal show={show} onHide={onHide} size="lg" centered backdrop="static" dialogClassName="modal-custom-width">
                <Modal.Header closeButton className="bg-primary text-white">
                    <Modal.Title>Contact Details</Modal.Title>
                </Modal.Header>
                <Modal.Body className="d-flex justify-content-center align-items-center" style={{ height: '600px' }}>
                    <div className="alert alert-danger">
                        {loadingState.error}
                        <button className="btn btn-sm btn-danger ms-2" onClick={fetchContacts}>
                            Retry
                        </button>
                    </div>
                </Modal.Body>
            </Modal>
        );
    }

    return (
        <>
            <Modal
                show={show}
                onHide={onHide}
                size="lg"
                onKeyDown={handleKeyDown}
                centered
                backdrop="static"
                dialogClassName="modal-custom-width"
            >
                <Modal.Header closeButton className="bg-primary text-white">
                    <Modal.Title>Contact Details</Modal.Title>
                </Modal.Header>
                <Modal.Body style={{
                    overflowY: 'auto',
                    height: '600px',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <Form.Group className="mb-4">
                        <Form.Control
                            ref={searchInputRef}
                            type="text"
                            placeholder="Search contacts by name, address, phone, email or contact person..."
                            value={searchQuery}
                            onChange={handleSearch}
                            autoFocus
                            className="search-input"
                            autoComplete='off'
                            onKeyDown={handleKeyDown}
                        />
                    </Form.Group>

                    <div
                        style={{
                            overflow: 'hidden',
                            flex: '1',
                            minHeight: '200px',
                            position: 'relative'
                        }}
                        tabIndex="0"
                        onKeyDown={handleKeyDown}
                    >
                        <div className="contacts-container">
                            <div className="contacts-header">
                                <div className="contact-cell header-cell">Name</div>
                                <div className="contact-cell header-cell">Address</div>
                                <div className="contact-cell header-cell">Phone</div>
                                <div className="contact-cell header-cell">Email</div>
                                <div className="contact-cell header-cell">Contact Person</div>
                            </div>
                            <div
                                className="contacts-list"
                                ref={listRef}
                                style={{
                                    maxHeight: '400px',
                                    overflowY: 'auto',
                                    position: 'relative'
                                }}
                            >
                                {displayCount === 0 ? (
                                    <div className="contact-row text-center py-4 text-muted">
                                        {searchQuery ? 'No contacts match your search' : 'No contacts available'}
                                    </div>
                                ) : (
                                    displayFilteredContacts.map((contact, index) => (
                                        <div
                                            key={index}
                                            ref={el => rowRefs.current[index] = el}
                                            className={`contact-row ${index === currentFocus ? 'active' : ''}`}
                                            onClick={() => selectContact(contact)}
                                        >
                                            <div className="contact-cell">{contact.name || 'N/A'}</div>
                                            <div className="contact-cell">{contact.address || 'N/A'}</div>
                                            <div className="contact-cell">{contact.phone || 'N/A'}</div>
                                            <div className="contact-cell">{contact.email || 'N/A'}</div>
                                            <div className="contact-cell">{contact.contactperson || 'N/A'}</div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </Modal.Body>
                <Modal.Footer className="d-flex justify-content-between">
                    <div className="text-muted small">
                        {displayCount} contact{displayCount !== 1 ? 's' : ''} found
                        {contactDraftSave && !loadingState.isFresh && (
                            <span className="ms-2 text-info">
                                • Using saved data
                            </span>
                        )}
                    </div>
                    <Button variant="danger" onClick={onHide}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Account Details Modal */}
            <Modal 
                show={showAccountModal} 
                onHide={handleAccountModalClose} 
                size="lg" 
                centered
                backdrop="static"
                dialogClassName="modal-account-details"
            >
                <Modal.Header closeButton className="bg-info text-white">
                    <Modal.Title>
                        {accountLoading ? 'Loading Account Details...' : `Account Details - ${accountDetails?.account?.name || 'N/A'}`}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                    {accountLoading ? (
                        <div className="text-center py-4">
                            <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                            <p className="mt-2">Loading account details...</p>
                        </div>
                    ) : accountDetails ? (
                        <div className="account-details">
                            {/* Basic Account Information */}
                            <Row className="mb-3">
                                <Col md={6}>
                                    <Card className="h-100">
                                        <Card.Header className="bg-light">
                                            <h6 className="mb-0">Basic Information</h6>
                                        </Card.Header>
                                        <Card.Body>
                                            <div className="mb-2">
                                                <strong>Account Name:</strong> {accountDetails.account?.name || 'N/A'}
                                            </div>
                                            <div className="mb-2">
                                                <strong>Unique Number:</strong> {accountDetails.account?.uniqueNumber || 'N/A'}
                                            </div>
                                            <div className="mb-2">
                                                <strong>Contact Person:</strong> {accountDetails.account?.contactperson || 'N/A'}
                                            </div>
                                            <div className="mb-2">
                                                <strong>Email:</strong> {accountDetails.account?.email || 'N/A'}
                                            </div>
                                            <div className="mb-2">
                                                <strong>Phone:</strong> {accountDetails.account?.phone || 'N/A'}
                                            </div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col md={6}>
                                    <Card className="h-100">
                                        <Card.Header className="bg-light">
                                            <h6 className="mb-0">Address & Status</h6>
                                        </Card.Header>
                                        <Card.Body>
                                            <div className="mb-2">
                                                <strong>Address:</strong> 
                                                <div className="mt-1 text-muted">
                                                    {accountDetails.account?.address || 'N/A'}
                                                </div>
                                            </div>
                                            <div className="mb-2">
                                                <strong>Ward:</strong> {accountDetails.account?.ward || 'N/A'}
                                            </div>
                                            <div className="mb-2">
                                                <strong>PAN:</strong> {accountDetails.account?.pan || 'N/A'}
                                            </div>
                                            <div className="mb-2">
                                                <strong>Status:</strong>{' '}
                                                <Badge bg={accountDetails.account?.isActive ? 'success' : 'danger'}>
                                                    {accountDetails.account?.isActive ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </div>
                                            <div className="mb-2">
                                                <strong>Default Cash Account:</strong>{' '}
                                                <Badge bg={accountDetails.account?.defaultCashAccount ? 'primary' : 'secondary'}>
                                                    {accountDetails.account?.defaultCashAccount ? 'Yes' : 'No'}
                                                </Badge>
                                            </div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>

                            {/* Financial Information */}
                            <Row className="mb-3">
                                <Col md={6}>
                                    <Card>
                                        <Card.Header className="bg-light">
                                            <h6 className="mb-0">Current Financial Information</h6>
                                        </Card.Header>
                                        <Card.Body>
                                            <div className="mb-2">
                                                <strong>Credit Limit:</strong> {accountDetails.account?.creditLimit ? `₹${accountDetails.account.creditLimit}` : 'N/A'}
                                            </div>
                                            <div className="mb-2">
                                                <strong>Current Opening Balance:</strong>{' '}
                                                {getCurrentOpeningBalance() ? 
                                                    formatBalance(getCurrentOpeningBalance().amount, getCurrentOpeningBalance().type) : 
                                                    'N/A'
                                                }
                                            </div>
                                            <div className="mb-2">
                                                <strong>Current Fiscal Year:</strong> {accountDetails.financialInfo?.fiscalYear?.name || 'N/A'}
                                            </div>
                                            <div className="mb-2">
                                                <strong>Fiscal Year Period:</strong>{' '}
                                                {accountDetails.financialInfo?.fiscalYear ? 
                                                    `${formatDate(accountDetails.financialInfo.fiscalYear.startDate)} - ${formatDate(accountDetails.financialInfo.fiscalYear.endDate)}` : 
                                                    'N/A'
                                                }
                                            </div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col md={6}>
                                    <Card>
                                        <Card.Header className="bg-light">
                                            <h6 className="mb-0">Account History</h6>
                                        </Card.Header>
                                        <Card.Body>
                                            <div className="mb-2">
                                                <strong>Created Date:</strong> {formatDate(accountDetails.account?.createdAt)}
                                            </div>
                                            <div className="mb-2">
                                                <strong>Last Updated:</strong> {formatDate(accountDetails.account?.date)}
                                            </div>
                                            <div className="mb-2">
                                                <strong>Opening Balance Date:</strong> {formatDate(accountDetails.account?.openingBalanceDate)}
                                            </div>
                                            <div className="mb-2">
                                                <strong>Transactions Count:</strong> {accountDetails.account?.transactions ? accountDetails.account.transactions.length : 0}
                                            </div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>

                            {/* Opening Balances by Fiscal Year */}
                            {accountDetails.account?.openingBalanceByFiscalYear && 
                             accountDetails.account.openingBalanceByFiscalYear.length > 0 && (
                                <Card className="mb-3">
                                    <Card.Header className="bg-light">
                                        <h6 className="mb-0">Opening Balances by Fiscal Year</h6>
                                    </Card.Header>
                                    <Card.Body>
                                        <div className="table-responsive">
                                            <table className="table table-sm table-striped">
                                                <thead>
                                                    <tr>
                                                        <th>Fiscal Year</th>
                                                        <th>Amount</th>
                                                        <th>Type</th>
                                                        <th>Date</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {accountDetails.account.openingBalanceByFiscalYear.map((balance, index) => (
                                                        <tr key={index}>
                                                            <td>{balance.fiscalYear?.name || 'N/A'}</td>
                                                            <td>{balance.amount}</td>
                                                            <td>
                                                                <Badge bg={balance.type === 'Dr' ? 'primary' : 'success'}>
                                                                    {balance.type}
                                                                </Badge>
                                                            </td>
                                                            <td>{formatDate(balance.date)}</td>
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
                                <Card className="mb-3">
                                    <Card.Header className="bg-light">
                                        <h6 className="mb-0">Company Groups</h6>
                                    </Card.Header>
                                    <Card.Body>
                                        <div className="d-flex flex-wrap gap-2">
                                            {accountDetails.account.companyGroups.map((group, index) => (
                                                <Badge key={index} bg="secondary" className="fs-6">
                                                    {group.name}
                                                </Badge>
                                            ))}
                                        </div>
                                    </Card.Body>
                                </Card>
                            )}
                        </div>
                    ) : (
                        <div className="alert alert-warning text-center">
                            No account details available.
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleAccountModalClose}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default ContactModal;