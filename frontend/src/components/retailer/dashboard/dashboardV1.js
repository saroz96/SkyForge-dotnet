import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useAuth } from '../../../context/AuthContext';
import { useLoading } from '../../../context/LoadingContext';
import {
    FaHome,
    FaShoppingCart,
    FaUsers,
    FaBox,
    FaChartLine,
    FaUserCircle,
    FaClock,
    FaCalendarCheck,
    FaStore,
    FaTag,
    FaTruck,
    FaThLarge
} from 'react-icons/fa';
import { setCurrentCompany, setUserInfo, setUserCompanies } from '../../../auth/authSlice';
import Header from '../Header';
import StatsCards from './StatsCards';
import SalesChart from './SalesChart';
import QuickActions from './QuickActions';
import ProductModal from './modals/ProductModal';
import ContactModal from './modals/ContactModal';
import PosCashSalesModal from '../sales/PosCashSalesModal';
import axios from 'axios';
import IncomeExpensePieChart from './IncomeExpensePieChart';
import TopItemsCard from './TopItemsCard';
import TopCustomersCard from './TopCustomersCard';

const DashboardV1 = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { currentUser: authContextUser, logout, loading: authLoading } = useAuth();
    const { showLoading, hideLoading, updateProgress, isLoading: globalLoading } = useLoading();
    const { userInfo, currentCompany, userCompanies } = useSelector((state) => state.auth);
    const currentUser = authContextUser || userInfo;
    const isAdminOrSupervisor = currentUser?.isAdmin || currentUser?.role === 'Supervisor';

    const [isInitializing, setIsInitializing] = useState(true);
    const [error, setError] = useState('');
    const [isHovered, setIsHovered] = useState(false);
    const [showProductModal, setShowProductModal] = useState(false);
    const [showContactsModal, setShowContactsModal] = useState(false);
    const [showPosModal, setShowPosModal] = useState(false);
    const [activeMenu, setActiveMenu] = useState('Dashboard');

    // ✅ State for top items data - will be populated from dashboard response
    const [topItemsData, setTopItemsData] = useState({
        topItemsByTransaction: [],
        topItemsByRevenue: [],
        topItemsByFrequency: []
    });
    const [isLoadingTopItems, setIsLoadingTopItems] = useState(false);

    const [topCustomersData, setTopCustomersData] = useState({
        topByPurchase: [],
        topByFrequency: [],
        topByAverageValue: [],
        topByOutstanding: []
    });
    const [isLoadingTopCustomers, setIsLoadingTopCustomers] = useState(false);

    const api = axios.create({
        baseURL: process.env.REACT_APP_API_BASE_URL || '',
        withCredentials: true,
    });

    api.interceptors.request.use(config => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    });

    // ✅ Function to update top items from dashboard data
    const updateTopItemsFromDashboard = (dashboardData) => {
        if (dashboardData) {
            console.log('Updating top items from dashboard data:', {
                byTransaction: dashboardData.topItemsByTransaction,
                byRevenue: dashboardData.topItemsByRevenue,
                byFrequency: dashboardData.topItemsByFrequency
            });

            setTopItemsData({
                topItemsByTransaction: dashboardData.topItemsByTransaction || [],
                topItemsByRevenue: dashboardData.topItemsByRevenue || [],
                topItemsByFrequency: dashboardData.topItemsByFrequency || []
            });
        }
    };

    // ✅ Refresh Top Items - now just refetches the dashboard data
    const refreshTopItems = () => {
        // Refresh the stats cards which will refetch all dashboard data
        // We'll use a ref to call the stats cards refresh
        if (window.statsCardsRef && window.statsCardsRef.current) {
            window.statsCardsRef.current.refreshData();
        } else {
            // Fallback: reload the page or trigger a re-fetch
            window.location.reload();
        }
    };

    const updateTopCustomersFromDashboard = (dashboardData) => {
        if (dashboardData) {
            console.log('Updating top customers from dashboard data:', {
                topByPurchase: dashboardData.topCustomersByPurchase,
                topByFrequency: dashboardData.topCustomersByFrequency,
                topByAverageValue: dashboardData.topCustomersByAverageValue,
                topByOutstanding: dashboardData.topCustomersByOutstanding
            });

            setTopCustomersData({
                topByPurchase: dashboardData.topCustomersByPurchase || [],
                topByFrequency: dashboardData.topCustomersByFrequency || [],
                topByAverageValue: dashboardData.topCustomersByAverageValue || [],
                topByOutstanding: dashboardData.topCustomersByOutstanding || []
            });
        }
    };

    const refreshTopCustomers = () => {
        setIsLoadingTopCustomers(true);
        // The StatsCards will call the callback when data loads
        setTimeout(() => {
            setIsLoadingTopCustomers(false);
        }, 2000);
    };

    // Modern dashboard styles with icon-only sidebar
    const styles = {
        container: {
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100vh',
            backgroundColor: '#f1f5f9',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        },
        headerWrapper: {
            position: 'sticky',
            top: 0,
            zIndex: 100,
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #e8ecf1',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        },
        mainLayout: {
            display: 'flex',
            flex: 1,
            position: 'relative',
        },
        sidebar: {
            width: isHovered ? '240px' : '64px',
            backgroundColor: '#ffffff',
            borderRight: '1px solid #e8ecf1',
            transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            flexDirection: 'column',
            position: 'sticky',
            top: '72px',
            height: 'calc(100vh - 72px)',
            overflow: 'hidden',
            flexShrink: 0,
            boxShadow: '2px 0 8px rgba(0,0,0,0.04)',
            zIndex: 50,
        },
        sidebarInner: {
            width: isHovered ? '240px' : '64px',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        },
        sidebarHeader: {
            padding: '16px 12px',
            borderBottom: '1px solid #e8ecf1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60px',
            flexShrink: 0,
        },
        sidebarLogo: {
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            overflow: 'hidden',
        },
        sidebarLogoImage: {
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            objectFit: 'contain',
            flexShrink: 0,
        },
        sidebarLogoText: {
            fontSize: '16px',
            fontWeight: '600',
            color: '#1a202c',
            whiteSpace: 'nowrap',
            opacity: isHovered ? 1 : 0,
            transition: 'opacity 0.3s ease',
        },
        sidebarMenu: {
            flex: 1,
            padding: '12px 8px',
            overflowY: 'auto',
        },
        sidebarMenuLabel: {
            fontSize: '10px',
            fontWeight: '600',
            color: '#9ca3af',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            padding: '8px 12px',
            marginTop: '4px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textAlign: 'left',
            opacity: isHovered ? 1 : 0,
            transition: 'opacity 0.3s ease',
        },
        sidebarMenuItem: {
            display: 'flex',
            alignItems: 'center',
            padding: '10px 12px',
            borderRadius: '10px',
            color: '#4a5568',
            textDecoration: 'none',
            transition: 'all 0.2s ease',
            cursor: 'pointer',
            marginBottom: '2px',
            gap: '12px',
            position: 'relative',
            justifyContent: 'flex-start',
        },
        sidebarMenuItemActive: {
            backgroundColor: '#eff6ff',
            color: '#2563eb',
        },
        sidebarMenuItemActiveBefore: {
            content: '""',
            position: 'absolute',
            left: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            width: '3px',
            height: '24px',
            backgroundColor: '#2563eb',
            borderRadius: '0 4px 4px 0',
        },
        sidebarMenuItemHover: {
            backgroundColor: '#f7fafc',
        },
        sidebarMenuIcon: {
            fontSize: '20px',
            width: '24px',
            textAlign: 'center',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        },
        sidebarMenuLabelText: {
            fontSize: '14px',
            fontWeight: '500',
            whiteSpace: 'nowrap',
            opacity: isHovered ? 1 : 0,
            transition: 'opacity 0.3s ease',
        },
        sidebarMenuBadge: {
            marginLeft: 'auto',
            backgroundColor: '#2563eb',
            color: '#ffffff',
            fontSize: '10px',
            padding: '2px 8px',
            borderRadius: '12px',
            fontWeight: '600',
            opacity: isHovered ? 1 : 0,
            transition: 'opacity 0.3s ease',
        },
        sidebarMenuBadgeOrange: {
            backgroundColor: '#f59e0b',
        },
        sidebarDivider: {
            border: 'none',
            borderTop: '1px solid #e8ecf1',
            margin: '8px 12px',
            opacity: isHovered ? 1 : 0.5,
            transition: 'opacity 0.3s ease',
        },
        sidebarUser: {
            padding: '12px 12px',
            borderTop: '1px solid #e8ecf1',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexShrink: 0,
            justifyContent: 'flex-start',
        },
        sidebarUserAvatar: {
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: '#e8ecf1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            color: '#4a5568',
            flexShrink: 0,
        },
        sidebarUserInfo: {
            flex: 1,
            minWidth: 0,
            opacity: isHovered ? 1 : 0,
            transition: 'opacity 0.3s ease',
        },
        sidebarUserName: {
            fontSize: '13px',
            fontWeight: '600',
            color: '#1a202c',
            margin: 0,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
        },
        sidebarUserEmail: {
            fontSize: '11px',
            color: '#6b7280',
            margin: 0,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
        },
        contentArea: {
            flex: 1,
            padding: '24px',
            minHeight: 'calc(100vh - 72px)',
            overflowY: 'auto',
        },
        welcomeSection: {
            marginBottom: '24px',
        },
        welcomeTitle: {
            fontSize: '24px',
            fontWeight: '600',
            color: '#1a202c',
            marginBottom: '4px',
        },
        welcomeSubtitle: {
            fontSize: '14px',
            color: '#718096',
        },
        statsGrid: {
            marginBottom: '24px',
        },
        contentGrid: {
            display: 'grid',
            gridTemplateColumns: '1.4fr 1.2fr 0.8fr',
            gap: '20px',
            marginBottom: '24px',
            alignItems: 'stretch',
        },
        contentGridMedium: {
            gridTemplateColumns: '1fr 1fr',
        },
        contentGridSmall: {
            gridTemplateColumns: '1fr',
        },
        // ✅ Add topItemsGrid style
        topItemsGrid: {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '20px',
            marginBottom: '24px',
        },
        loadingContainer: {
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            backgroundColor: '#f1f5f9',
        },
        errorContainer: {
            maxWidth: '500px',
            margin: '40px auto',
            padding: '30px',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            border: '1px solid #e8ecf1',
            textAlign: 'center',
        },
        '@media (max-width: 1200px)': {
            contentGrid: {
                gridTemplateColumns: '1fr 1fr',
            },
        },
        '@media (max-width: 992px)': {
            contentGrid: {
                gridTemplateColumns: '1fr 1fr',
            },
        },
        '@media (max-width: 768px)': {
            sidebar: {
                position: 'fixed',
                top: '72px',
                left: 0,
                height: 'calc(100vh - 72px)',
                width: isHovered ? '240px' : '0px',
                boxShadow: isHovered ? '0 4px 20px rgba(0,0,0,0.15)' : 'none',
                zIndex: 99,
                borderRight: isHovered ? '1px solid #e8ecf1' : 'none',
            },
            sidebarInner: {
                width: isHovered ? '240px' : '0px',
            },
            contentArea: {
                padding: '16px',
            },
            welcomeTitle: {
                fontSize: '20px',
            },
            contentGrid: {
                gridTemplateColumns: '1fr',
                gap: '16px',
            },
            topItemsGrid: {
                gridTemplateColumns: '1fr',
                gap: '16px',
            },
        },
        '@media (max-width: 576px)': {
            contentArea: {
                padding: '12px',
            },
            welcomeTitle: {
                fontSize: '18px',
            },
            contentGrid: {
                gridTemplateColumns: '1fr',
                gap: '12px',
            },
            topItemsGrid: {
                gridTemplateColumns: '1fr',
                gap: '12px',
            },
        },
    };

    // Load data from localStorage
    useEffect(() => {
        const loadPersistedData = () => {
            try {
                const savedUserInfo = localStorage.getItem('userInfo');
                if (savedUserInfo) {
                    const parsedUserInfo = JSON.parse(savedUserInfo);
                    dispatch(setUserInfo(parsedUserInfo));
                }

                const savedCurrentCompany = localStorage.getItem('currentCompany');
                if (savedCurrentCompany) {
                    const parsedCurrentCompany = JSON.parse(savedCurrentCompany);
                    dispatch(setCurrentCompany({
                        company: parsedCurrentCompany.company,
                        fiscalYear: parsedCurrentCompany.fiscalYear
                    }));
                }

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
            setIsInitializing(true);
            showLoading(8000);
            updateProgress(10);

            setError('');

            const token = localStorage.getItem('token');
            if (!token) {
                hideLoading();
                navigate('/auth/login');
                return;
            }

            updateProgress(30);

            if (authLoading) {
                return;
            }

            updateProgress(40);

            if (!currentUser) {
                await fetchUserData();
                return;
            }

            updateProgress(50);

            if (!currentCompany) {
                const savedCompanyId = localStorage.getItem('currentCompanyId');
                const savedCompanyData = localStorage.getItem('currentCompany');

                if (savedCompanyId && savedCompanyData) {
                    try {
                        const parsedCompanyData = JSON.parse(savedCompanyData);
                        updateProgress(60);
                        dispatch(setCurrentCompany({
                            company: parsedCompanyData.company,
                            fiscalYear: parsedCompanyData.fiscalYear
                        }));
                        updateProgress(100);
                        setTimeout(() => {
                            hideLoading();
                            setIsInitializing(false);
                        }, 300);
                        return;
                    } catch (error) {
                        console.error('Error parsing saved company data:', error);
                    }
                }

                updateProgress(60);

                let availableCompanies = userCompanies;

                if (!availableCompanies || availableCompanies.length === 0) {
                    const savedCompanies = localStorage.getItem('userCompanies');
                    if (savedCompanies) {
                        availableCompanies = JSON.parse(savedCompanies);
                    }
                }

                updateProgress(70);

                if (!availableCompanies || availableCompanies.length === 0) {
                    await fetchUserCompanies();
                    return;
                }

                updateProgress(80);

                if (availableCompanies && availableCompanies.length > 0) {
                    if (availableCompanies.length === 1) {
                        const singleCompany = availableCompanies[0];
                        await switchToCompany(singleCompany);
                        return;
                    } else {
                        updateProgress(100);
                        setTimeout(() => {
                            hideLoading();
                            setIsInitializing(false);
                            navigate('/companies');
                        }, 300);
                        return;
                    }
                } else {
                    updateProgress(100);
                    setTimeout(() => {
                        hideLoading();
                        setIsInitializing(false);
                        setError('No companies found. Please create a company first.');
                    }, 300);
                    return;
                }
            }

            updateProgress(90);
            updateProgress(100);
            setTimeout(() => {
                hideLoading();
                setIsInitializing(false);
            }, 300);

        } catch (err) {
            console.error('Dashboard initialization error:', err);
            hideLoading();
            setError('Failed to initialize dashboard: ' + err.message);
            setIsInitializing(false);
        }
    };

    const fetchUserData = async () => {
        try {
            updateProgress(45);
            const response = await api.get('/api/auth/me');
            if (response.data.user) {
                const userData = response.data.user;
                updateProgress(55);
                dispatch(setUserInfo(userData));
                localStorage.setItem('userInfo', JSON.stringify(userData));
                updateProgress(65);
                await fetchUserCompanies();
            } else {
                throw new Error('No user data received');
            }
        } catch (err) {
            console.error('Error fetching user data:', err);
            hideLoading();
            if (err.response?.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('userInfo');
                localStorage.removeItem('currentCompany');
                localStorage.removeItem('userCompanies');
                navigate('/auth/login');
            } else {
                setError('Failed to load user data. Please try again.');
                setIsInitializing(false);
            }
        }
    };

    const fetchUserCompanies = async () => {
        try {
            updateProgress(75);
            const response = await api.get('/api/Companies/user-companies');
            const companies = response.data || [];

            updateProgress(85);

            dispatch(setUserCompanies(companies));
            localStorage.setItem('userCompanies', JSON.stringify(companies));

            const savedCompanyId = localStorage.getItem('currentCompanyId');
            if (savedCompanyId && companies.length > 0) {
                const company = companies.find(c =>
                    (c.id || c.Id || c._id).toString() === savedCompanyId
                );

                if (company) {
                    await switchToCompany(company);
                } else {
                    updateProgress(100);
                    setTimeout(() => {
                        hideLoading();
                        setIsInitializing(false);
                        navigate('/user-dashboard');
                    }, 300);
                }
            } else if (companies.length > 0) {
                updateProgress(100);
                setTimeout(() => {
                    hideLoading();
                    setIsInitializing(false);
                    navigate('/user-dashboard');
                }, 300);
            } else {
                updateProgress(100);
                setTimeout(() => {
                    hideLoading();
                    setIsInitializing(false);
                    setError('No companies found. Please create a company first.');
                }, 300);
            }
        } catch (err) {
            console.error('Error fetching companies:', err);
            hideLoading();
            setError('Failed to load companies. Please try again.');
            setIsInitializing(false);
        }
    };

    const switchToCompany = async (company) => {
        try {
            updateProgress(85);
            const companyId = company.id || company.Id || company._id;
            const response = await api.get(`/api/companies/switch/${companyId}`);

            updateProgress(92);

            if (response.data.success) {
                const { sessionData } = response.data.data;

                dispatch(setCurrentCompany({
                    company: sessionData.company,
                    fiscalYear: sessionData.fiscalYear
                }));

                localStorage.setItem('currentCompany', JSON.stringify({
                    company: sessionData.company,
                    fiscalYear: sessionData.fiscalYear
                }));
                localStorage.setItem('currentCompanyId', companyId.toString());

                updateProgress(100);

                setTimeout(() => {
                    hideLoading();
                    setIsInitializing(false);
                }, 300);
            } else {
                throw new Error(response.data.message || 'Failed to switch company');
            }
        } catch (err) {
            console.error('Error switching company:', err);
            hideLoading();
            setError('Failed to switch company. Please try again.');
            setIsInitializing(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            initializeDashboard();
        }, 300);

        return () => clearTimeout(timer);
    }, [currentUser, currentCompany, userCompanies, authLoading]);

    // Keydown handlers
    useEffect(() => {
        if (!isInitializing && currentUser && currentCompany) {
            const handleKeyDown = (e) => {
                if (e.key === 'F9') {
                    e.preventDefault();
                    setShowProductModal(prev => !prev);
                }
                if (e.key === 'F10') {
                    e.preventDefault();
                    setShowPosModal(true);
                }
                if (e.key === 'F4') {
                    e.preventDefault();
                    setShowContactsModal(true);
                }
            };

            window.addEventListener('keydown', handleKeyDown);
            return () => {
                window.removeEventListener('keydown', handleKeyDown);
            };
        }
    }, [isInitializing, currentUser, currentCompany]);

    // Sidebar menu items with icons
    const menuItems = [
        { icon: <FaHome size={20} />, label: 'Dashboard', active: true, badge: null },
        { icon: <FaThLarge size={20} />, label: 'Ecommerce', active: false, badge: 'New' },
        { icon: <FaUsers size={20} />, label: 'Customers', active: false, badge: null },
        { icon: <FaBox size={20} />, label: 'Products', active: false, badge: null },
        { icon: <FaShoppingCart size={20} />, label: 'Sales', active: false, badge: null },
        { icon: <FaChartLine size={20} />, label: 'Analytics', active: false, badge: null },
    ];

    const managementItems = [
        { icon: <FaCalendarCheck size={20} />, label: 'Attendance', path: '/attendance' },
        { icon: <FaStore size={20} />, label: 'Store' },
        { icon: <FaTruck size={20} />, label: 'Suppliers' },
    ];

    const handleMenuItemClick = (item) => {
        if (item.path) {
            setActiveMenu(item.label);
            navigate(item.path);
        }
    };

    const getCompanyId = () => {
        return currentCompany?.id || currentCompany?._id || '';
    };

    const getFiscalYearForApi = () => {
        if (currentCompany?.fiscalYear) {
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

    const handleSaleComplete = (saleData) => {
        console.log('Sale completed:', saleData);
    };

    const handlePosSaleClick = () => {
        setShowPosModal(true);
    };

    if (authLoading && isInitializing) {
        return (
            <div style={styles.loadingContainer}>
                <div className="spinner-border" style={{ color: '#2563eb', width: '40px', height: '40px' }} role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
                <p style={{ color: '#718096', marginTop: '16px', fontSize: '14px' }}>Loading your dashboard...</p>
            </div>
        );
    }

    if (isInitializing || globalLoading) {
        return null;
    }

    if (error) {
        return (
            <div style={styles.loadingContainer}>
                <div style={styles.errorContainer}>
                    <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#1a202c', marginBottom: '8px' }}>
                        <i className="bi bi-exclamation-triangle me-2" style={{ color: '#dc2626' }}></i>
                        Error Loading Dashboard
                    </h4>
                    <p style={{ color: '#718096', marginBottom: '20px' }}>{error}</p>
                    <button
                        style={{
                            padding: '8px 24px',
                            backgroundColor: '#2563eb',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer',
                        }}
                        onClick={() => window.location.reload()}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#1d4ed8'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = '#2563eb'}
                    >
                        Refresh
                    </button>
                </div>
            </div>
        );
    }

    if (!currentUser) {
        return (
            <div style={styles.loadingContainer}>
                <div style={styles.errorContainer}>
                    <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#1a202c', marginBottom: '8px' }}>
                        <i className="bi bi-shield-exclamation me-2" style={{ color: '#ed8936' }}></i>
                        Authentication Required
                    </h4>
                    <p style={{ color: '#718096', marginBottom: '20px' }}>Please login to access the dashboard.</p>
                    <button
                        style={{
                            padding: '8px 24px',
                            backgroundColor: '#2563eb',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer',
                        }}
                        onClick={() => navigate('/auth/login')}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#1d4ed8'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = '#2563eb'}
                    >
                        <i className="bi bi-box-arrow-in-right me-2"></i>
                        Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.headerWrapper}>
                <Header />
            </div>

            {/* Main Layout with Sidebar and Content */}
            <div style={styles.mainLayout}>
                {/* Sidebar */}
                <div
                    style={styles.sidebar}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                >
                    <div style={styles.sidebarInner}>
                        <div style={styles.sidebarHeader}>
                            <div style={styles.sidebarLogo}>
                                <img
                                    src="/logo/logo.png"
                                    alt="Ams Logo"
                                    style={styles.sidebarLogoImage}
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                    }}
                                />
                                <span style={styles.sidebarLogoText}>Ams</span>
                            </div>
                        </div>
                        <nav style={styles.sidebarMenu}>
                            <div style={styles.sidebarMenuLabel}>Main</div>
                            {menuItems.map((item, index) => (
                                <div
                                    key={index}
                                    style={{
                                        ...styles.sidebarMenuItem,
                                        ...(item.active ? styles.sidebarMenuItemActive : {})
                                    }}
                                    onClick={() => handleMenuItemClick(item)}
                                    onMouseEnter={(e) => {
                                        if (!item.active) {
                                            e.currentTarget.style.backgroundColor = styles.sidebarMenuItemHover.backgroundColor;
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!item.active) {
                                            e.currentTarget.style.backgroundColor = 'transparent';
                                        }
                                    }}
                                >
                                    {item.active && <div style={styles.sidebarMenuItemActiveBefore} />}
                                    <span style={styles.sidebarMenuIcon}>
                                        {item.icon}
                                    </span>
                                    <span style={styles.sidebarMenuLabelText}>{item.label}</span>
                                    {item.badge && (
                                        <span style={{
                                            ...styles.sidebarMenuBadge,
                                            ...(item.badge === 'New' ? styles.sidebarMenuBadgeOrange : {})
                                        }}>
                                            {item.badge}
                                        </span>
                                    )}
                                </div>
                            ))}
                            <hr style={styles.sidebarDivider} />
                            <div style={styles.sidebarMenuLabel}>Management</div>
                            {managementItems.map((item, index) => (
                                <div
                                    key={index}
                                    style={styles.sidebarMenuItem}
                                    onClick={() => handleMenuItemClick(item)}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = styles.sidebarMenuItemHover.backgroundColor;
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                    }}
                                >
                                    <span style={styles.sidebarMenuIcon}>
                                        {item.icon}
                                    </span>
                                    <span style={styles.sidebarMenuLabelText}>{item.label}</span>
                                </div>
                            ))}
                        </nav>
                        <div style={styles.sidebarUser}>
                            <div style={styles.sidebarUserAvatar}>
                                <FaUserCircle size={18} />
                            </div>
                            <div style={styles.sidebarUserInfo}>
                                <p style={styles.sidebarUserName}>{currentUser?.name || 'User'}</p>
                                <p style={styles.sidebarUserEmail}>{currentUser?.email || 'user@company.com'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div style={styles.contentArea}>
                    {/* Stats Cards */}
                    <div style={styles.statsGrid}>
                        <StatsCards
                            companyId={getCompanyId()}
                            companyName={currentCompany?.name || currentCompany?.Name}
                            fiscalYearJson={getFiscalYearForApi()}
                            onDataLoaded={(dashboardData) => {
                                // ✅ Callback to update top items when dashboard data loads
                                if (dashboardData) {
                                    updateTopItemsFromDashboard(dashboardData);
                                    updateTopCustomersFromDashboard(dashboardData);
                                }
                            }}
                        />
                    </div>

                    {/* Chart, Pie Chart and Quick Actions in same row */}
                    <div style={styles.contentGrid}>
                        {/* Left: Sales Chart - Larger */}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <SalesChart
                                companyId={getCompanyId()}
                                companyName={currentCompany?.name || currentCompany?.Name}
                                fiscalYearJson={getFiscalYearForApi()}
                            />
                        </div>

                        {/* Center: Income vs Expenses Pie Chart - Same size */}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <IncomeExpensePieChart
                                companyId={getCompanyId()}
                                companyName={currentCompany?.name || currentCompany?.Name}
                                fiscalYearJson={getFiscalYearForApi()}
                            />
                        </div>

                        {/* Right: Quick Actions - Smaller */}
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            transform: 'scale(0.95)',
                            transformOrigin: 'top left',
                        }}>
                            <QuickActions
                                onPosSaleClick={handlePosSaleClick}
                                companyId={getCompanyId()}
                            />
                        </div>
                    </div>

                    {/* ✅ Top Items Card
                    <div style={styles.topItemsGrid}>
                        {console.log('📊 Passing to TopItemsCard:', {
                            byTransaction: topItemsData.topItemsByTransaction,
                            byRevenue: topItemsData.topItemsByRevenue,
                            byFrequency: topItemsData.topItemsByFrequency,
                            isLoading: isLoadingTopItems
                        })}
                        <TopItemsCard
                            topItemsByTransaction={topItemsData.topItemsByTransaction || []}
                            topItemsByRevenue={topItemsData.topItemsByRevenue || []}
                            topItemsByFrequency={topItemsData.topItemsByFrequency || []}
                            isLoading={isLoadingTopItems}
                            onRefresh={refreshTopItems}
                        />
                    </div>

                    <div style={styles.topItemsGrid}>
                        {console.log('👥 Passing to TopCustomersCard:', {
                            topByPurchase: topCustomersData.topByPurchase,
                            topByFrequency: topCustomersData.topByFrequency,
                            topByAverageValue: topCustomersData.topByAverageValue,
                            topByOutstanding: topCustomersData.topByOutstanding,
                            isLoading: isLoadingTopCustomers
                        })}
                        <TopCustomersCard
                            topByPurchase={topCustomersData.topByPurchase || []}
                            topByFrequency={topCustomersData.topByFrequency || []}
                            topByAverageValue={topCustomersData.topByAverageValue || []}
                            topByOutstanding={topCustomersData.topByOutstanding || []}
                            isLoading={isLoadingTopCustomers}
                            onRefresh={refreshTopCustomers}
                        />
                    </div> */}

                    {/* ✅ Top Items & Top Customers Cards - Same Row */}
                    <div style={styles.topItemsGrid}>
                        {/* Log the data being passed */}
                        {console.log('📊 Passing to TopItemsCard:', {
                            byTransaction: topItemsData.topItemsByTransaction,
                            byRevenue: topItemsData.topItemsByRevenue,
                            byFrequency: topItemsData.topItemsByFrequency,
                            isLoading: isLoadingTopItems
                        })}
                        {console.log('👥 Passing to TopCustomersCard:', {
                            topByPurchase: topCustomersData.topByPurchase,
                            topByFrequency: topCustomersData.topByFrequency,
                            topByAverageValue: topCustomersData.topByAverageValue,
                            topByOutstanding: topCustomersData.topByOutstanding,
                            isLoading: isLoadingTopCustomers
                        })}

                        {/* Left: Top Items Card */}
                        <div style={{ height: '100%' }}>
                            <TopItemsCard
                                topItemsByTransaction={topItemsData.topItemsByTransaction || []}
                                topItemsByRevenue={topItemsData.topItemsByRevenue || []}
                                topItemsByFrequency={topItemsData.topItemsByFrequency || []}
                                isLoading={isLoadingTopItems}
                                onRefresh={refreshTopItems}
                            />
                        </div>

                        {/* Right: Top Customers Card */}
                        <div style={{ height: '100%' }}>
                            <TopCustomersCard
                                topByPurchase={topCustomersData.topByPurchase || []}
                                topByFrequency={topCustomersData.topByFrequency || []}
                                topByAverageValue={topCustomersData.topByAverageValue || []}
                                topByOutstanding={topCustomersData.topByOutstanding || []}
                                isLoading={isLoadingTopCustomers}
                                onRefresh={refreshTopCustomers}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <PosCashSalesModal
                show={showPosModal}
                onClose={() => setShowPosModal(false)}
                onSaleComplete={handleSaleComplete}
                companyId={getCompanyId()}
            />

            {showProductModal && (
                <ProductModal
                    onClose={() => setShowProductModal(false)}
                    companyId={getCompanyId()}
                />
            )}

            <ContactModal
                show={showContactsModal}
                onHide={() => setShowContactsModal(false)}
                companyId={getCompanyId()}
            />

            {/* Global Styles */}
            <style>{`
                * {
                    box-sizing: border-box;
                }
                
                ::-webkit-scrollbar {
                    width: 4px;
                }
                
                ::-webkit-scrollbar-track {
                    background: transparent;
                }
                
                ::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 4px;
                }
                
                ::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }
                
                @media (max-width: 768px) {
                    .sidebar-overlay {
                        position: fixed;
                        top: 72px;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: rgba(0,0,0,0.3);
                        z-index: 98;
                    }
                }
            `}</style>
        </div>
    );
};

export default DashboardV1;