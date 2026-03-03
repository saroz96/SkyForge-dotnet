
import React, { useState, useEffect } from 'react';
import StatsCards from './StatsCards';
import SalesChart from './SalesChart';
import QuickActions from './QuickActions';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../../../stylesheet/loader.css';
import Header from '../Header';
import { useAuth } from '../../../context/AuthContext';
import { useSelector, useDispatch } from 'react-redux';

import ProductModal from './modals/ProductModal';
import ContactModal from './modals/ContactModal';
import { Button, Alert, Spinner } from 'react-bootstrap';
import ChatbotWhatsApp from './ChatbotWhatsApp';
import PosCashSalesModal from '../sales/PosCashSalesModal';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { setCurrentCompany, setUserInfo, setUserCompanies } from '../../../auth/authSlice';

const DashboardV1 = () => {
    const [showProductModal, setShowProductModal] = useState(false);
    const [showContactsModal, setShowContactsModal] = useState(false);
    const [showPosModal, setShowPosModal] = useState(false);
    const [showButton, setShowButton] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const { currentUser: authContextUser, logout, loading: authLoading } = useAuth();

    // Get data directly from Redux store
    const { userInfo, currentCompany, userCompanies } = useSelector((state) => state.auth);

    // Use authContextUser as primary, fall back to userInfo from Redux
    const currentUser = authContextUser || userInfo;

    // Derive values from user data
    const isAdminOrSupervisor = currentUser?.isAdmin || currentUser?.role === 'Supervisor';

    // Create axios instance with auth header
    const api = axios.create({
        baseURL: process.env.REACT_APP_API_BASE_URL || '',
        withCredentials: true,
    });

    // Add Authorization header to all requests
    api.interceptors.request.use(config => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    });

    // Load data from localStorage on refresh
    useEffect(() => {
        const loadPersistedData = () => {
            try {
                // Load user info from localStorage
                const savedUserInfo = localStorage.getItem('userInfo');
                if (savedUserInfo) {
                    const parsedUserInfo = JSON.parse(savedUserInfo);
                    dispatch(setUserInfo(parsedUserInfo));
                }

                // Load current company from localStorage
                const savedCurrentCompany = localStorage.getItem('currentCompany');
                if (savedCurrentCompany) {
                    const parsedCurrentCompany = JSON.parse(savedCurrentCompany);
                    dispatch(setCurrentCompany({
                        company: parsedCurrentCompany.company,
                        fiscalYear: parsedCurrentCompany.fiscalYear
                    }));
                }

                // Load user companies from localStorage
                const savedUserCompanies = localStorage.getItem('userCompanies');
                if (savedUserCompanies) {
                    const parsedUserCompanies = JSON.parse(savedUserCompanies);
                    dispatch(setUserCompanies(parsedUserCompanies));
                }
            } catch (error) {
                console.error('Error loading persisted data:', error);
            }
        };

        loadPersistedData();
    }, [dispatch]);

    const initializeDashboard = async () => {
        try {
            setLoading(true);
            setError('');

            console.log('=== Dashboard Initialization Debug ===');
            console.log('Token exists:', !!localStorage.getItem('token'));
            console.log('Auth loading:', authLoading);
            console.log('Current user from Redux:', userInfo);
            console.log('Current user from AuthContext:', authContextUser);
            console.log('Current company:', currentCompany);
            console.log('User companies:', userCompanies);

            // Check 1: Check if user has a token
            const token = localStorage.getItem('token');
            if (!token) {
                console.log('❌ No token found, redirecting to login');
                navigate('/auth/login');
                return;
            }

            // Check 2: Wait for AuthProvider to finish loading
            if (authLoading) {
                console.log('⏳ AuthProvider still loading, waiting...');
                return;
            }

            // Check 3: If we don't have user data, fetch it
            if (!currentUser) {
                console.log('🔄 No user data, fetching from API...');
                await fetchUserData();
                return;
            }

            // Check 4: Check if company is selected
            if (!currentCompany) {
                console.log('🏢 No company selected, checking for saved company...');

                // FIRST: Check if we have a saved company ID
                const savedCompanyId = localStorage.getItem('currentCompanyId');
                const savedCompanyData = localStorage.getItem('currentCompany');

                if (savedCompanyId && savedCompanyData) {
                    console.log('📦 Found saved company data in localStorage');
                    try {
                        const parsedCompanyData = JSON.parse(savedCompanyData);
                        console.log('🏢 Restoring saved company:', parsedCompanyData.company?.name);

                        // Restore the company from localStorage
                        dispatch(setCurrentCompany({
                            company: parsedCompanyData.company,
                            fiscalYear: parsedCompanyData.fiscalYear
                        }));

                        // Dashboard is ready
                        console.log('✅ Company restored from localStorage');
                        setLoading(false);
                        return;
                    } catch (error) {
                        console.error('Error parsing saved company data:', error);
                        // Continue to check available companies
                    }
                }

                // If no saved company or parsing failed, check available companies
                console.log('🔍 No saved company found, checking available companies...');

                let availableCompanies = userCompanies;

                // If no companies in Redux, check localStorage
                if (!availableCompanies || availableCompanies.length === 0) {
                    const savedCompanies = localStorage.getItem('userCompanies');
                    if (savedCompanies) {
                        availableCompanies = JSON.parse(savedCompanies);
                        console.log('📦 Loaded companies from localStorage:', availableCompanies.length);
                    }
                }

                // If still no companies, fetch from API
                if (!availableCompanies || availableCompanies.length === 0) {
                    console.log('🔄 No companies found, fetching from API...');
                    await fetchUserCompanies();
                    return;
                }

                if (availableCompanies && availableCompanies.length > 0) {
                    // Check if user has only ONE company
                    if (availableCompanies.length === 1) {
                        console.log('✅ User has only one company, auto-selecting it...');
                        const singleCompany = availableCompanies[0];

                        // Auto-select the single company
                        await switchToCompany(singleCompany);
                        return;
                    } else {
                        console.log('✅ User has multiple companies, redirecting to selection');
                        navigate('/companies');
                        return;
                    }
                } else {
                    console.log('❌ User has no companies');
                    setError('No companies found. Please create a company first.');
                    setLoading(false);
                    return;
                }
            }

            console.log('✅ All checks passed, dashboard ready');
            setLoading(false);
        } catch (err) {
            console.error('❌ Dashboard initialization error:', err);
            setError('Failed to initialize dashboard: ' + err.message);
            setLoading(false);
        }
    };

    const fetchUserData = async () => {
        try {
            const response = await api.get('/api/auth/me');
            if (response.data.user) {
                const userData = response.data.user;

                // Save to Redux
                dispatch(setUserInfo(userData));

                // Save to localStorage
                localStorage.setItem('userInfo', JSON.stringify(userData));

                // Now fetch companies
                await fetchUserCompanies();
            } else {
                throw new Error('No user data received');
            }
        } catch (err) {
            console.error('Error fetching user data:', err);
            if (err.response?.status === 401) {
                // Token expired or invalid
                localStorage.removeItem('token');
                localStorage.removeItem('userInfo');
                localStorage.removeItem('currentCompany');
                localStorage.removeItem('userCompanies');
                navigate('/auth/login');
            } else {
                setError('Failed to load user data. Please try again.');
                setLoading(false);
            }
        }
    };

    const fetchUserCompanies = async () => {
        try {
            const response = await api.get('/api/Companies/user-companies');
            const companies = response.data || [];

            // Save to Redux
            dispatch(setUserCompanies(companies));

            // Save to localStorage
            localStorage.setItem('userCompanies', JSON.stringify(companies));

            // Check if we have a current company ID saved
            const savedCompanyId = localStorage.getItem('currentCompanyId');
            if (savedCompanyId && companies.length > 0) {
                const company = companies.find(c =>
                    (c.id || c.Id || c._id).toString() === savedCompanyId
                );

                if (company) {
                    // Switch to the saved company
                    await switchToCompany(company);
                } else {
                    // Company not found in list, show company selection
                    navigate('/user-dashboard');
                }
            } else if (companies.length > 0) {
                // No saved company, show selection
                navigate('/user-dashboard');
            } else {
                // No companies
                setError('No companies found. Please create a company first.');
                setLoading(false);
            }
        } catch (err) {
            console.error('Error fetching companies:', err);
            setError('Failed to load companies. Please try again.');
            setLoading(false);
        }
    };

    const switchToCompany = async (company) => {
        try {
            const companyId = company.id || company.Id || company._id;
            const response = await api.get(`/api/companies/switch/${companyId}`);

            if (response.data.success) {
                const { sessionData } = response.data.data;

                // Save to Redux
                dispatch(setCurrentCompany({
                    company: sessionData.company,
                    fiscalYear: sessionData.fiscalYear
                }));

                // Save to localStorage
                localStorage.setItem('currentCompany', JSON.stringify({
                    company: sessionData.company,
                    fiscalYear: sessionData.fiscalYear
                }));
                localStorage.setItem('currentCompanyId', companyId.toString());

                // Dashboard is now ready
                setLoading(false);
            } else {
                throw new Error(response.data.message || 'Failed to switch company');
            }
        } catch (err) {
            console.error('Error switching company:', err);
            setError('Failed to switch company. Please try again.');
            setLoading(false);
        }
    };

    useEffect(() => {
        // Give a small delay to ensure all data is loaded
        const timer = setTimeout(() => {
            initializeDashboard();
        }, 300);

        return () => clearTimeout(timer);
    }, [currentUser, currentCompany, userCompanies, authLoading]);

    // Rest of your useEffect hooks remain the same...
    useEffect(() => {
        if (!loading && currentUser && currentCompany) {
            const handleKeyDown = (e) => {
                if (e.key === 'F9') {
                    e.preventDefault();
                    setShowProductModal(prev => !prev);
                }
                if (e.key === 'F10') {
                    e.preventDefault();
                    setShowPosModal(true);
                }
            };

            window.addEventListener('keydown', handleKeyDown);
            return () => {
                window.removeEventListener('keydown', handleKeyDown);
            };
        }
    }, [loading, currentUser, currentCompany]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'F4') {
                e.preventDefault();
                setShowContactsModal(true);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    const handleSaleComplete = (saleData) => {
        console.log('Sale completed:', saleData);
    };

    const handlePosSaleClick = () => {
        setShowPosModal(true);
    };

    const handleSwitchCompany = () => {
        navigate('/companies');
    };

    const handleLogout = async () => {
        try {
            // Clear localStorage
            localStorage.removeItem('token');
            localStorage.removeItem('userInfo');
            localStorage.removeItem('currentCompany');
            localStorage.removeItem('currentCompanyId');
            localStorage.removeItem('userCompanies');

            // Clear sessionStorage
            sessionStorage.clear();

            // Call logout from AuthContext
            await logout();

            // Redirect to login
            navigate('/auth/login');
        } catch (err) {
            console.error('Logout error:', err);
        }
    };

    const handleRetry = () => {
        // Clear all storage and reload
        localStorage.clear();
        sessionStorage.clear();
        window.location.reload();
    };

    if (authLoading || loading) {
        return (
            <div className="d-flex flex-column justify-content-center align-items-center" style={{ height: '100vh' }}>
                <Spinner animation="border" role="status" className="mb-3">
                    <span className="visually-hidden">Loading...</span>
                </Spinner>
                {/* <span>Loading Dashboard...</span>
                <small className="text-muted mt-2">Please wait while we load your data</small> */}
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mt-5">
                <Alert variant="danger">
                    <Alert.Heading>Error Loading Dashboard</Alert.Heading>
                    <p>{error}</p>
                    <div className="d-flex gap-2">
                        <Button variant="primary" onClick={() => window.location.reload()}>
                            Refresh
                        </Button>
                        <Button variant="outline-secondary" onClick={handleRetry}>
                            Clear & Retry
                        </Button>
                        <Button variant="outline-danger" onClick={handleLogout}>
                            Logout
                        </Button>
                    </div>
                </Alert>
            </div>
        );
    }

    if (!currentUser) {
        return (
            <div className="container mt-5">
                <Alert variant="warning">
                    <Alert.Heading>Authentication Required</Alert.Heading>
                    <p>Please login to access the dashboard.</p>
                    <div className="d-flex gap-2">
                        <Button variant="primary" onClick={() => navigate('/auth/login')}>
                            Login
                        </Button>
                        <Button variant="outline-secondary" onClick={handleRetry}>
                            Clear Cache
                        </Button>
                    </div>
                </Alert>
            </div>
        );
    }

    // if (!currentCompany) {
    //     return (
    //         <div className="container mt-5">
    //             <Alert variant="info">
    //                 <Alert.Heading>Select a Company</Alert.Heading>
    //                 <p>Please select a company to continue.</p>
    //                 <Button variant="primary" onClick={handleSwitchCompany}>
    //                     Select Company
    //                 </Button>
    //             </Alert>
    //         </div>
    //     );
    // }

    // Get company ID with multiple fallbacks
    const getCompanyId = () => {
        return currentCompany?.id || currentCompany._id || '';
    };

    // Get fiscal year for API call
    const getFiscalYearForApi = () => {
        if (currentCompany.fiscalYear) {
            return JSON.stringify({
                id: currentCompany.fiscalYear.id || currentCompany.fiscalYear.Id || '',
                name: currentCompany.fiscalYear.name || currentCompany.fiscalYear.Name || '',
                startDate: currentCompany.fiscalYear.startDate || currentCompany.fiscalYear.StartDate || '',
                endDate: currentCompany.fiscalYear.endDate || currentCompany.fiscalYear.EndDate || '',
                isActive: currentCompany.fiscalYear.isActive || currentCompany.fiscalYear.IsActive || false
            });
        }
        return null;
    };

    const getUserDisplayName = () => {
        return currentUser.name || currentUser.Name || currentUser.email || currentUser.Email || 'User';
    };

    return (
        <>
            <div className="app-content-header">
                <Header />
            </div>

            {showButton && (
                <div style={{ position: 'fixed', top: '100px', right: '20px', zIndex: 1000 }}>
                    <button
                        className="btn btn-primary me-2"
                        onClick={() => setShowProductModal(true)}
                    >
                        View Products (F9)
                    </button>
                    <button
                        className="btn btn-success"
                        onClick={() => setShowPosModal(true)}
                    >
                        Open POS (F10)
                    </button>
                </div>
            )}

            <div>
                {showButton && (
                    <Button variant="primary" onClick={() => setShowContactsModal(true)}>
                        Open Contacts (F4)
                    </Button>
                )}

                <ContactModal
                    show={showContactsModal}
                    onHide={() => setShowContactsModal(false)}
                    companyId={getCompanyId()}
                />
            </div>

            <div className="app-content pt-2">
                <div className="container-fluid">
                    <div className="row">
                        {isAdminOrSupervisor && (
                            <StatsCards
                                companyId={getCompanyId()}
                                companyName={currentCompany.name || currentCompany.Name}
                                fiscalYearJson={getFiscalYearForApi()}
                            />
                        )}
                        <div className="row">
                            <div className="col-lg-7 connectedSortable">
                                <SalesChart
                                    companyId={getCompanyId()}
                                    companyName={currentCompany.name || currentCompany.Name}
                                    fiscalYearJson={getFiscalYearForApi()}
                                />
                            </div>

                            <div className="col-lg-5 connectedSortable">
                                <QuickActions
                                    onPosSaleClick={handlePosSaleClick}
                                    companyId={getCompanyId()}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* POS Modal */}
            <PosCashSalesModal
                show={showPosModal}
                onClose={() => setShowPosModal(false)}
                onSaleComplete={handleSaleComplete}
                companyId={getCompanyId()}
            />

            {/* Product modal */}
            {showProductModal && (
                <ProductModal
                    onClose={() => setShowProductModal(false)}
                    companyId={getCompanyId()}
                />
            )}
        </>
    );
};

export default DashboardV1;