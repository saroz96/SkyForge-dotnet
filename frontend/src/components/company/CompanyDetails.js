import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useSelector } from 'react-redux';
import {
    Container,
    Card,
    Row,
    Col,
    Button,
    Badge,
    Navbar,
    Nav,
    Spinner,
    Alert
} from 'react-bootstrap';
import {
    FaBuilding,
    FaInfoCircle,
    FaUserTie,
    FaCalendarAlt,
    FaEdit,
    FaTrashAlt,
    FaPlusCircle,
    FaSignOutAlt,
    FaPhone,
    FaEnvelope,
    FaTachometerAlt
} from 'react-icons/fa';
import NotificationToast from '../NotificationToast';
import Loader from '../Loader';

const CompanyDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [company, setCompany] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [notification, setNotification] = useState({
        show: false,
        message: '',
        type: 'success'
    });

    // Get user from Redux store
    const userInfo = useSelector((state) => state.auth.userInfo);
    const [isAdminOrSupervisor, setIsAdminOrSupervisor] = useState(false);

    useEffect(() => {
        const fetchCompanyData = async () => {
            try {
                setLoading(true);
                setError(null);

                // Check if user is logged in
                const token = localStorage.getItem('token');
                if (!token) {
                    navigate('/auth/login');
                    return;
                }

                // Set user info from Redux
                if (userInfo) {
                    setIsAdminOrSupervisor(userInfo.isAdmin || userInfo.role === 'Supervisor');
                }

                console.log(`Fetching company with ID: ${id}`);

                // Use your existing axios instance or create one
                const api = axios.create({
                    baseURL: process.env.REACT_APP_API_BASE_URL,
                    withCredentials: true,
                });

                // Add Authorization header
                api.interceptors.request.use(config => {
                    const token = localStorage.getItem('token');
                    if (token) {
                        config.headers.Authorization = `Bearer ${token}`;
                    }
                    return config;
                });

                // Fetch company data - CORRECT ENDPOINT
                const response = await api.get(`/api/Companies/${id}`);

                console.log('Company response:', response.data);

                // Set company data directly (response.data is the company object)
                setCompany(response.data);

                setLoading(false);
            } catch (err) {
                console.error('Error fetching company:', err);
                setError(err.response?.data?.error || err.response?.data?.message || 'Failed to fetch company details');
                setLoading(false);

                if (err.response?.status === 401) {
                    localStorage.removeItem('token');
                    navigate('/auth/login');
                } else if (err.response?.status === 404) {
                    setError('Company not found');
                }
            }
        };

        fetchCompanyData();
    }, [id, navigate, userInfo]);

    // const handleDelete = async () => {
    //     if (window.confirm("Are you sure you want to delete this company? This action cannot be undone.")) {
    //         setIsDeleting(true);
    //         try {
    //             const api = axios.create({
    //                 baseURL: process.env.REACT_APP_API_BASE_URL,
    //                 withCredentials: true,
    //             });

    //             api.interceptors.request.use(config => {
    //                 const token = localStorage.getItem('token');
    //                 if (token) {
    //                     config.headers.Authorization = `Bearer ${token}`;
    //                 }
    //                 return config;
    //             });

    //             // Note: You need to create a delete endpoint in your backend
    //             await api.delete(`/api/Companies/${id}`);

    //             setNotification({
    //                 show: true,
    //                 message: 'Company deleted successfully!',
    //                 type: 'success'
    //             });

    //             setTimeout(() => {
    //                 navigate('/dashboard');
    //             }, 1500);
    //         } catch (err) {
    //             setNotification({
    //                 show: true,
    //                 message: err.response?.data?.message || 'Error deleting company',
    //                 type: 'error'
    //             });
    //         } finally {
    //             setIsDeleting(false);
    //         }
    //     }
    // };

    const handleDelete = async () => {
        if (window.confirm("Are you sure you want to delete this company? This action will permanently delete:\n\n• Company information\n• All fiscal years\n• All accounts and account groups\n• All items, units, and categories\n• All stores and racks\n• All associated settings\n\nThis action cannot be undone!")) {
            setIsDeleting(true);
            try {
                const api = axios.create({
                    baseURL: process.env.REACT_APP_API_BASE_URL,
                    withCredentials: true,
                });

                api.interceptors.request.use(config => {
                    const token = localStorage.getItem('token');
                    if (token) {
                        config.headers.Authorization = `Bearer ${token}`;
                    }
                    return config;
                });

                // Call the delete endpoint
                const response = await api.delete(`/api/Companies/${id}`);

                if (response.data.success) {
                    setNotification({
                        show: true,
                        message: response.data.message || 'Company and all associated data deleted successfully!',
                        type: 'success'
                    });

                    setTimeout(() => {
                        navigate('/user-dashboard');
                    }, 1500);
                } else {
                    setNotification({
                        show: true,
                        message: response.data.message || 'Error deleting company',
                        type: 'error'
                    });
                }
            } catch (err) {
                console.error('Delete error:', err);
                setNotification({
                    show: true,
                    message: err.response?.data?.error || err.response?.data?.message || 'Error deleting company',
                    type: 'error'
                });
            } finally {
                setIsDeleting(false);
            }
        }
    };

    if (loading) return <Loader />;

    if (error) {
        return (
            <Container className="my-4">
                <Alert variant="danger" className="py-2">
                    <Alert.Heading style={{ fontSize: '1rem' }}>Error</Alert.Heading>
                    <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>{error}</p>
                    <hr style={{ margin: '0.5rem 0' }} />
                    <div className="d-flex justify-content-end">
                        <Button variant="outline-danger" size="sm" onClick={() => navigate('/dashboard')}>
                            Back to Dashboard
                        </Button>
                    </div>
                </Alert>
            </Container>
        );
    }

    if (!company) {
        return (
            <Container className="my-4">
                <Alert variant="warning" className="py-2">
                    <Alert.Heading style={{ fontSize: '1rem' }}>Company Not Found</Alert.Heading>
                    <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>The company you are looking for does not exist.</p>
                    <hr style={{ margin: '0.5rem 0' }} />
                    <div className="d-flex justify-content-end">
                        <Button variant="outline-warning" size="sm" onClick={() => navigate('/dashboard')}>
                            Back to Dashboard
                        </Button>
                    </div>
                </Alert>
            </Container>
        );
    }

    // Helper function to format date
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <>
            {/* Navigation Bar - Compact */}
            <Navbar bg="light" expand="lg" className="shadow-sm py-2">
                <Container fluid>
                    <Navbar.Brand as={Link} to="/dashboard" style={{ fontSize: '0.95rem', fontWeight: '500' }}>
                        <FaTachometerAlt className="me-2" style={{ fontSize: '0.9rem' }} />
                        Dashboard | {userInfo?.name || userInfo?.firstName || 'User'}
                    </Navbar.Brand>
                    <Navbar.Toggle aria-controls="basic-navbar-nav" style={{ padding: '0.25rem 0.5rem' }} />
                    <Navbar.Collapse id="basic-navbar-nav">
                        <Nav className="ms-auto">
                            {isAdminOrSupervisor && (
                                <Nav.Link as={Link} to="/company/new" style={{ fontSize: '0.875rem', padding: '0.25rem 0.5rem' }}>
                                    <FaPlusCircle className="me-1" style={{ fontSize: '0.8rem' }} />
                                    Create Company
                                </Nav.Link>
                            )}
                            <Nav.Link as={Link} to="/logout" style={{ fontSize: '0.875rem', padding: '0.25rem 0.5rem' }}>
                                <FaSignOutAlt className="me-1" style={{ fontSize: '0.8rem' }} />
                                Logout
                            </Nav.Link>
                        </Nav>
                    </Navbar.Collapse>
                </Container>
            </Navbar>

            {/* Main Content */}
            <Container className="my-3">
                <Card className="shadow-sm">
                    {/* Company Header - Compact */}
                    <Card.Header className="d-flex justify-content-between align-items-center py-2">
                        <div>
                            <h1 className="m-0" style={{ fontSize: '1.25rem', fontWeight: '600' }}>
                                <FaBuilding className="me-2" style={{ fontSize: '1rem' }} />
                                {company.Name || company.name}
                            </h1>
                            <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                                Company ID: {company.Id || company.id}
                            </small>
                        </div>
                        {isAdminOrSupervisor && (
                            <div>
                                <Button
                                    variant="primary"
                                    size="sm"
                                    className="me-2 py-1 px-2"
                                    as={Link}
                                    to={`/company/edit/${company.Id || company.id}`}
                                    style={{ fontSize: '0.8rem' }}
                                >
                                    <FaEdit className="me-1" style={{ fontSize: '0.75rem' }} />
                                    Edit
                                </Button>
                                <Button
                                    variant="danger"
                                    size="sm"
                                    className="py-1 px-2"
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                    style={{ fontSize: '0.8rem' }}
                                >
                                    {isDeleting ? (
                                        <>
                                            <Spinner
                                                as="span"
                                                animation="border"
                                                size="sm"
                                                role="status"
                                                aria-hidden="true"
                                                className="me-1"
                                                style={{ width: '0.75rem', height: '0.75rem' }}
                                            />
                                            Deleting...
                                        </>
                                    ) : (
                                        <>
                                            <FaTrashAlt className="me-1" style={{ fontSize: '0.75rem' }} />
                                            Delete
                                        </>
                                    )}
                                </Button>
                            </div>
                        )}
                    </Card.Header>

                    <Card.Body className="py-3">
                        <Row>
                            {/* General Information - Compact */}
                            <Col md={6}>
                                <div className="mb-3">
                                    <h3 className="border-bottom pb-1 mb-2" style={{ fontSize: '1rem', fontWeight: '600' }}>
                                        <FaInfoCircle className="me-2" style={{ fontSize: '0.9rem' }} />
                                        General Information
                                    </h3>

                                    <div className="d-flex mb-2 align-items-center">
                                        <span className="text-muted" style={{ minWidth: '100px', fontSize: '0.8rem' }}>Name:</span>
                                        <span style={{ fontSize: '0.85rem' }}>{company.Name || company.name}</span>
                                    </div>

                                    <div className="d-flex mb-2 align-items-center">
                                        <span className="text-muted" style={{ minWidth: '100px', fontSize: '0.8rem' }}>Address:</span>
                                        <span style={{ fontSize: '0.85rem' }}>{company.Address || company.address}</span>
                                    </div>

                                    <div className="d-flex mb-2 align-items-center">
                                        <span className="text-muted" style={{ minWidth: '100px', fontSize: '0.8rem' }}>Location:</span>
                                        <span style={{ fontSize: '0.85rem' }}>
                                            {company.Country || company.country},
                                            {company.State || company.state},
                                            {company.City || company.city},
                                            Ward {company.Ward || company.ward}
                                        </span>
                                    </div>

                                    <div className="d-flex mb-2 align-items-center">
                                        <span className="text-muted" style={{ minWidth: '100px', fontSize: '0.8rem' }}>PAN:</span>
                                        <span style={{ fontSize: '0.85rem' }}>{company.Pan || company.pan}</span>
                                    </div>

                                    <div className="d-flex mb-2 align-items-center">
                                        <span className="text-muted" style={{ minWidth: '100px', fontSize: '0.8rem' }}>Contact:</span>
                                        <span style={{ fontSize: '0.85rem' }}>
                                            <div className="d-flex align-items-center">
                                                <FaPhone className="me-1" style={{ fontSize: '0.7rem' }} />
                                                {company.Phone || company.phone}
                                            </div>
                                            <div className="d-flex align-items-center mt-1">
                                                <FaEnvelope className="me-1" style={{ fontSize: '0.7rem' }} />
                                                {company.Email || company.email}
                                            </div>
                                        </span>
                                    </div>

                                    <div className="d-flex mb-2 align-items-center">
                                        <span className="text-muted" style={{ minWidth: '100px', fontSize: '0.8rem' }}>Trade Type:</span>
                                        <span style={{ fontSize: '0.85rem' }}>
                                            <Badge bg="primary" className="px-2 py-1" style={{ fontSize: '0.7rem' }}>
                                                {company.TradeType || company.tradeType || 'Unknown'}
                                            </Badge>
                                        </span>
                                    </div>

                                    <div className="d-flex mb-2 align-items-center">
                                        <span className="text-muted" style={{ minWidth: '100px', fontSize: '0.8rem' }}>Date Format:</span>
                                        <span style={{ fontSize: '0.85rem' }}>
                                            <Badge bg="info" text="dark" className="px-2 py-1" style={{ fontSize: '0.7rem' }}>
                                                {(company.DateFormat || company.dateFormat || 'English')
                                                    .charAt(0)
                                                    .toUpperCase() +
                                                    (company.DateFormat || company.dateFormat || 'English')
                                                        .slice(1)}
                                            </Badge>
                                        </span>
                                    </div>

                                    <div className="d-flex mb-2 align-items-center">
                                        <span className="text-muted" style={{ minWidth: '100px', fontSize: '0.8rem' }}>Created At:</span>
                                        <span style={{ fontSize: '0.85rem' }}>{formatDate(company.CreatedAt || company.createdAt)}</span>
                                    </div>

                                    <div className="d-flex mb-2 align-items-center">
                                        <span className="text-muted" style={{ minWidth: '100px', fontSize: '0.8rem' }}>VAT Enabled:</span>
                                        <span style={{ fontSize: '0.85rem' }}>
                                            <Badge bg={company.VatEnabled || company.vatEnabled ? 'success' : 'secondary'}
                                                className="px-2 py-1"
                                                style={{ fontSize: '0.7rem' }}>
                                                {company.VatEnabled || company.vatEnabled ? 'Yes' : 'No'}
                                            </Badge>
                                        </span>
                                    </div>
                                </div>
                            </Col>

                            {/* Owner Information - Compact */}
                            <Col md={6}>
                                <div className="mb-3">
                                    <h3 className="border-bottom pb-1 mb-2" style={{ fontSize: '1rem', fontWeight: '600' }}>
                                        <FaUserTie className="me-2" style={{ fontSize: '0.9rem' }} />
                                        Owner Information
                                    </h3>

                                    <div className="d-flex mb-2 align-items-center">
                                        <span className="text-muted" style={{ minWidth: '100px', fontSize: '0.8rem' }}>Owner ID:</span>
                                        <span style={{ fontSize: '0.85rem' }}>{company.OwnerId || company.ownerId}</span>
                                    </div>

                                    <div className="d-flex mb-2 align-items-center">
                                        <span className="text-muted" style={{ minWidth: '100px', fontSize: '0.8rem' }}>Owner Name:</span>
                                        <span style={{ fontSize: '0.85rem' }}>{company.OwnerName || company.ownerName || 'N/A'}</span>
                                    </div>

                                    <div className="d-flex mb-2 align-items-center">
                                        <span className="text-muted" style={{ minWidth: '100px', fontSize: '0.8rem' }}>Owner Email:</span>
                                        <span style={{ fontSize: '0.85rem' }}>{company.OwnerEmail || company.ownerEmail || 'N/A'}</span>
                                    </div>
                                </div>

                                {/* System Information - Compact */}
                                <div className="mb-3">
                                    <h3 className="border-bottom pb-1 mb-2" style={{ fontSize: '1rem', fontWeight: '600' }}>
                                        <FaCalendarAlt className="me-2" style={{ fontSize: '0.9rem' }} />
                                        System Information
                                    </h3>

                                    <div className="d-flex mb-2 align-items-center">
                                        <span className="text-muted" style={{ minWidth: '100px', fontSize: '0.8rem' }}>Fiscal Year:</span>
                                        <span style={{ fontSize: '0.85rem' }}>
                                            {company.FiscalYearStartDate || company.fiscalYearStartDate || 'Not set'}
                                        </span>
                                    </div>

                                    <div className="d-flex mb-2 align-items-center">
                                        <span className="text-muted" style={{ minWidth: '100px', fontSize: '0.8rem' }}>Renewal Date:</span>
                                        <span style={{ fontSize: '0.85rem' }}>{company.RenewalDate || company.renewalDate || 'N/A'}</span>
                                    </div>

                                    <div className="d-flex mb-2 align-items-center">
                                        <span className="text-muted" style={{ minWidth: '100px', fontSize: '0.8rem' }}>Last Updated:</span>
                                        <span style={{ fontSize: '0.85rem' }}>{formatDate(company.UpdatedAt || company.updatedAt) || 'Never'}</span>
                                    </div>

                                    <div className="d-flex mb-2 align-items-center">
                                        <span className="text-muted" style={{ minWidth: '100px', fontSize: '0.8rem' }}>Store Management:</span>
                                        <span style={{ fontSize: '0.85rem' }}>
                                            <Badge bg={company.StoreManagement || company.storeManagement ? 'success' : 'secondary'}
                                                className="px-2 py-1"
                                                style={{ fontSize: '0.7rem' }}>
                                                {company.StoreManagement || company.storeManagement ? 'Enabled' : 'Disabled'}
                                            </Badge>
                                        </span>
                                    </div>
                                </div>

                                {/* Notification Emails - Compact */}
                                {company.NotificationEmails && company.NotificationEmails.length > 0 && (
                                    <div className="mb-3">
                                        <h3 className="border-bottom pb-1 mb-2" style={{ fontSize: '1rem', fontWeight: '600' }}>
                                            <FaEnvelope className="me-2" style={{ fontSize: '0.9rem' }} />
                                            Notification Emails
                                        </h3>
                                        <ul className="list-unstyled mb-0">
                                            {company.NotificationEmails.map((email, index) => (
                                                <li key={index} className="mb-1">
                                                    <small style={{ fontSize: '0.75rem' }}>{email}</small>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>
            </Container>

            <NotificationToast
                show={notification.show}
                message={notification.message}
                type={notification.type}
                onClose={() => setNotification({ ...notification, show: false })}
            />
        </>
    );
};

export default CompanyDetails;