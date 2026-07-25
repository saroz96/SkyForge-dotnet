// import React, { useState, useEffect } from 'react';
// import StatsCards from './StatsCards';
// import SalesChart from './SalesChart';
// import QuickActions from './QuickActions';
// import 'bootstrap/dist/css/bootstrap.min.css';
// import Header from '../Header';
// import { useAuth } from '../../../context/AuthContext';
// import { useSelector, useDispatch } from 'react-redux';
// import { useLoading } from '../../../context/LoadingContext'; // Import the loading hook

// import ProductModal from './modals/ProductModal';
// import ContactModal from './modals/ContactModal';
// import { Button, Alert, Spinner } from 'react-bootstrap';
// import ChatbotWhatsApp from './ChatbotWhatsApp';
// import PosCashSalesModal from '../sales/PosCashSalesModal';
// import { useNavigate } from 'react-router-dom';
// import axios from 'axios';
// import { setCurrentCompany, setUserInfo, setUserCompanies } from '../../../auth/authSlice';

// const DashboardV1 = () => {
//     const [showProductModal, setShowProductModal] = useState(false);
//     const [showContactsModal, setShowContactsModal] = useState(false);
//     const [showPosModal, setShowPosModal] = useState(false);
//     const [showButton, setShowButton] = useState(false);
//     const [isInitializing, setIsInitializing] = useState(true);
//     const [error, setError] = useState('');
//     const navigate = useNavigate();
//     const dispatch = useDispatch();

//     const { currentUser: authContextUser, logout, loading: authLoading } = useAuth();
    
//     // Use the YouTube-style loading hook
//     const { showLoading, hideLoading, updateProgress, isLoading: globalLoading } = useLoading();

//     // Get data directly from Redux store
//     const { userInfo, currentCompany, userCompanies } = useSelector((state) => state.auth);

//     // Use authContextUser as primary, fall back to userInfo from Redux
//     const currentUser = authContextUser || userInfo;

//     // Derive values from user data
//     const isAdminOrSupervisor = currentUser?.isAdmin || currentUser?.role === 'Supervisor';

//     // Create axios instance with auth header
//     const api = axios.create({
//         baseURL: process.env.REACT_APP_API_BASE_URL || '',
//         withCredentials: true,
//     });

//     // Add Authorization header to all requests
//     api.interceptors.request.use(config => {
//         const token = localStorage.getItem('token');
//         if (token) {
//             config.headers.Authorization = `Bearer ${token}`;
//         }
//         return config;
//     });

//     // Load data from localStorage on refresh
//     useEffect(() => {
//         const loadPersistedData = () => {
//             try {
//                 // Load user info from localStorage
//                 const savedUserInfo = localStorage.getItem('userInfo');
//                 if (savedUserInfo) {
//                     const parsedUserInfo = JSON.parse(savedUserInfo);
//                     dispatch(setUserInfo(parsedUserInfo));
//                 }

//                 // Load current company from localStorage
//                 const savedCurrentCompany = localStorage.getItem('currentCompany');
//                 if (savedCurrentCompany) {
//                     const parsedCurrentCompany = JSON.parse(savedCurrentCompany);
//                     dispatch(setCurrentCompany({
//                         company: parsedCurrentCompany.company,
//                         fiscalYear: parsedCurrentCompany.fiscalYear
//                     }));
//                 }

//                 // Load user companies from localStorage
//                 const savedUserCompanies = localStorage.getItem('userCompanies');
//                 if (savedUserCompanies) {
//                     const parsedUserCompanies = JSON.parse(savedUserCompanies);
//                     dispatch(setUserCompanies(parsedUserCompanies));
//                 }
//             } catch (error) {
//                 console.error('Error loading persisted data:', error);
//             }
//         };

//         loadPersistedData();
//     }, [dispatch]);

//     const initializeDashboard = async () => {
//         try {
//             setIsInitializing(true);
//             // Show the YouTube-style progress bar
//             showLoading(8000); // Expect initialization to take ~8 seconds
//             updateProgress(10);
            
//             setError('');

//             console.log('=== Dashboard Initialization Debug ===');
//             console.log('Token exists:', !!localStorage.getItem('token'));
//             console.log('Auth loading:', authLoading);
//             console.log('Current user from Redux:', userInfo);
//             console.log('Current user from AuthContext:', authContextUser);
//             console.log('Current company:', currentCompany);
//             console.log('User companies:', userCompanies);

//             updateProgress(20);

//             // Check 1: Check if user has a token
//             const token = localStorage.getItem('token');
//             if (!token) {
//                 console.log('❌ No token found, redirecting to login');
//                 hideLoading();
//                 navigate('/auth/login');
//                 return;
//             }

//             updateProgress(30);

//             // Check 2: Wait for AuthProvider to finish loading
//             if (authLoading) {
//                 console.log('⏳ AuthProvider still loading, waiting...');
//                 return;
//             }

//             updateProgress(40);

//             // Check 3: If we don't have user data, fetch it
//             if (!currentUser) {
//                 console.log('🔄 No user data, fetching from API...');
//                 await fetchUserData();
//                 return;
//             }

//             updateProgress(50);

//             // Check 4: Check if company is selected
//             if (!currentCompany) {
//                 console.log('🏢 No company selected, checking for saved company...');

//                 // FIRST: Check if we have a saved company ID
//                 const savedCompanyId = localStorage.getItem('currentCompanyId');
//                 const savedCompanyData = localStorage.getItem('currentCompany');

//                 if (savedCompanyId && savedCompanyData) {
//                     console.log('📦 Found saved company data in localStorage');
//                     try {
//                         const parsedCompanyData = JSON.parse(savedCompanyData);
//                         console.log('🏢 Restoring saved company:', parsedCompanyData.company?.name);

//                         updateProgress(60);

//                         // Restore the company from localStorage
//                         dispatch(setCurrentCompany({
//                             company: parsedCompanyData.company,
//                             fiscalYear: parsedCompanyData.fiscalYear
//                         }));

//                         // Dashboard is ready
//                         console.log('✅ Company restored from localStorage');
//                         updateProgress(100);
//                         setTimeout(() => {
//                             hideLoading();
//                             setIsInitializing(false);
//                         }, 300);
//                         return;
//                     } catch (error) {
//                         console.error('Error parsing saved company data:', error);
//                         // Continue to check available companies
//                     }
//                 }

//                 updateProgress(60);

//                 // If no saved company or parsing failed, check available companies
//                 console.log('🔍 No saved company found, checking available companies...');

//                 let availableCompanies = userCompanies;

//                 // If no companies in Redux, check localStorage
//                 if (!availableCompanies || availableCompanies.length === 0) {
//                     const savedCompanies = localStorage.getItem('userCompanies');
//                     if (savedCompanies) {
//                         availableCompanies = JSON.parse(savedCompanies);
//                         console.log('📦 Loaded companies from localStorage:', availableCompanies.length);
//                     }
//                 }

//                 updateProgress(70);

//                 // If still no companies, fetch from API
//                 if (!availableCompanies || availableCompanies.length === 0) {
//                     console.log('🔄 No companies found, fetching from API...');
//                     await fetchUserCompanies();
//                     return;
//                 }

//                 updateProgress(80);

//                 if (availableCompanies && availableCompanies.length > 0) {
//                     // Check if user has only ONE company
//                     if (availableCompanies.length === 1) {
//                         console.log('✅ User has only one company, auto-selecting it...');
//                         const singleCompany = availableCompanies[0];

//                         // Auto-select the single company
//                         await switchToCompany(singleCompany);
//                         return;
//                     } else {
//                         console.log('✅ User has multiple companies, redirecting to selection');
//                         updateProgress(100);
//                         setTimeout(() => {
//                             hideLoading();
//                             setIsInitializing(false);
//                             navigate('/companies');
//                         }, 300);
//                         return;
//                     }
//                 } else {
//                     console.log('❌ User has no companies');
//                     updateProgress(100);
//                     setTimeout(() => {
//                         hideLoading();
//                         setIsInitializing(false);
//                         setError('No companies found. Please create a company first.');
//                     }, 300);
//                     return;
//                 }
//             }

//             updateProgress(90);
//             console.log('✅ All checks passed, dashboard ready');
//             updateProgress(100);
//             setTimeout(() => {
//                 hideLoading();
//                 setIsInitializing(false);
//             }, 300);
            
//         } catch (err) {
//             console.error('❌ Dashboard initialization error:', err);
//             hideLoading();
//             setError('Failed to initialize dashboard: ' + err.message);
//             setIsInitializing(false);
//         }
//     };

//     const fetchUserData = async () => {
//         try {
//             updateProgress(45);
//             const response = await api.get('/api/auth/me');
//             if (response.data.user) {
//                 const userData = response.data.user;
                
//                 updateProgress(55);

//                 // Save to Redux
//                 dispatch(setUserInfo(userData));

//                 // Save to localStorage
//                 localStorage.setItem('userInfo', JSON.stringify(userData));

//                 updateProgress(65);

//                 // Now fetch companies
//                 await fetchUserCompanies();
//             } else {
//                 throw new Error('No user data received');
//             }
//         } catch (err) {
//             console.error('Error fetching user data:', err);
//             hideLoading();
//             if (err.response?.status === 401) {
//                 // Token expired or invalid
//                 localStorage.removeItem('token');
//                 localStorage.removeItem('userInfo');
//                 localStorage.removeItem('currentCompany');
//                 localStorage.removeItem('userCompanies');
//                 navigate('/auth/login');
//             } else {
//                 setError('Failed to load user data. Please try again.');
//                 setIsInitializing(false);
//             }
//         }
//     };

//     const fetchUserCompanies = async () => {
//         try {
//             updateProgress(75);
//             const response = await api.get('/api/Companies/user-companies');
//             const companies = response.data || [];

//             updateProgress(85);

//             // Save to Redux
//             dispatch(setUserCompanies(companies));

//             // Save to localStorage
//             localStorage.setItem('userCompanies', JSON.stringify(companies));

//             // Check if we have a current company ID saved
//             const savedCompanyId = localStorage.getItem('currentCompanyId');
//             if (savedCompanyId && companies.length > 0) {
//                 const company = companies.find(c =>
//                     (c.id || c.Id || c._id).toString() === savedCompanyId
//                 );

//                 if (company) {
//                     // Switch to the saved company
//                     await switchToCompany(company);
//                 } else {
//                     // Company not found in list, show company selection
//                     updateProgress(100);
//                     setTimeout(() => {
//                         hideLoading();
//                         setIsInitializing(false);
//                         navigate('/user-dashboard');
//                     }, 300);
//                 }
//             } else if (companies.length > 0) {
//                 // No saved company, show selection
//                 updateProgress(100);
//                 setTimeout(() => {
//                     hideLoading();
//                     setIsInitializing(false);
//                     navigate('/user-dashboard');
//                 }, 300);
//             } else {
//                 // No companies
//                 updateProgress(100);
//                 setTimeout(() => {
//                     hideLoading();
//                     setIsInitializing(false);
//                     setError('No companies found. Please create a company first.');
//                 }, 300);
//             }
//         } catch (err) {
//             console.error('Error fetching companies:', err);
//             hideLoading();
//             setError('Failed to load companies. Please try again.');
//             setIsInitializing(false);
//         }
//     };

//     const switchToCompany = async (company) => {
//         try {
//             updateProgress(85);
//             const companyId = company.id || company.Id || company._id;
//             const response = await api.get(`/api/companies/switch/${companyId}`);

//             updateProgress(92);

//             if (response.data.success) {
//                 const { sessionData } = response.data.data;

//                 // Save to Redux
//                 dispatch(setCurrentCompany({
//                     company: sessionData.company,
//                     fiscalYear: sessionData.fiscalYear
//                 }));

//                 // Save to localStorage
//                 localStorage.setItem('currentCompany', JSON.stringify({
//                     company: sessionData.company,
//                     fiscalYear: sessionData.fiscalYear
//                 }));
//                 localStorage.setItem('currentCompanyId', companyId.toString());

//                 updateProgress(100);
                
//                 // Dashboard is now ready
//                 setTimeout(() => {
//                     hideLoading();
//                     setIsInitializing(false);
//                 }, 300);
//             } else {
//                 throw new Error(response.data.message || 'Failed to switch company');
//             }
//         } catch (err) {
//             console.error('Error switching company:', err);
//             hideLoading();
//             setError('Failed to switch company. Please try again.');
//             setIsInitializing(false);
//         }
//     };

//     useEffect(() => {
//         // Give a small delay to ensure all data is loaded
//         const timer = setTimeout(() => {
//             initializeDashboard();
//         }, 300);

//         return () => clearTimeout(timer);
//     }, [currentUser, currentCompany, userCompanies, authLoading]);

//     // Rest of your useEffect hooks remain the same...
//     useEffect(() => {
//         if (!isInitializing && currentUser && currentCompany) {
//             const handleKeyDown = (e) => {
//                 if (e.key === 'F9') {
//                     e.preventDefault();
//                     setShowProductModal(prev => !prev);
//                 }
//                 if (e.key === 'F10') {
//                     e.preventDefault();
//                     setShowPosModal(true);
//                 }
//             };

//             window.addEventListener('keydown', handleKeyDown);
//             return () => {
//                 window.removeEventListener('keydown', handleKeyDown);
//             };
//         }
//     }, [isInitializing, currentUser, currentCompany]);

//     useEffect(() => {
//         const handleKeyDown = (e) => {
//             if (e.key === 'F4') {
//                 e.preventDefault();
//                 setShowContactsModal(true);
//             }
//         };

//         document.addEventListener('keydown', handleKeyDown);
//         return () => {
//             document.removeEventListener('keydown', handleKeyDown);
//         };
//     }, []);

//     // Show the spinner only during initial load (before YouTube bar appears)
//     if (authLoading && isInitializing) {
//         return (
//             <div className="d-flex flex-column justify-content-center align-items-center" style={{ height: '100vh' }}>
//                 <Spinner animation="border" role="status" className="mb-3">
//                     <span className="visually-hidden">Loading...</span>
//                 </Spinner>
//             </div>
//         );
//     }

//     // Don't show anything while YouTube progress bar is active
//     if (isInitializing || globalLoading) {
//         return null; // The YouTube progress bar will show instead
//     }

//     if (error) {
//         return (
//             <div className="container mt-5">
//                 <Alert variant="danger">
//                     <Alert.Heading>Error Loading Dashboard</Alert.Heading>
//                     <p>{error}</p>
//                     <div className="d-flex gap-2">
//                         <Button variant="primary" onClick={() => window.location.reload()}>
//                             Refresh
//                         </Button>
//                         <Button variant="outline-secondary" onClick={() => {
//                             localStorage.clear();
//                             sessionStorage.clear();
//                             window.location.reload();
//                         }}>
//                             Clear & Retry
//                         </Button>
//                         <Button variant="outline-danger" onClick={async () => {
//                             localStorage.clear();
//                             sessionStorage.clear();
//                             await logout();
//                             navigate('/auth/login');
//                         }}>
//                             Logout
//                         </Button>
//                     </div>
//                 </Alert>
//             </div>
//         );
//     }

//     if (!currentUser) {
//         return (
//             <div className="container mt-5">
//                 <Alert variant="warning">
//                     <Alert.Heading>Authentication Required</Alert.Heading>
//                     <p>Please login to access the dashboard.</p>
//                     <div className="d-flex gap-2">
//                         <Button variant="primary" onClick={() => navigate('/auth/login')}>
//                             Login
//                         </Button>
//                         <Button variant="outline-secondary" onClick={() => {
//                             localStorage.clear();
//                             sessionStorage.clear();
//                             window.location.reload();
//                         }}>
//                             Clear Cache
//                         </Button>
//                     </div>
//                 </Alert>
//             </div>
//         );
//     }

//     // Get company ID with multiple fallbacks
//     const getCompanyId = () => {
//         return currentCompany?.id || currentCompany?._id || '';
//     };

//     // Get fiscal year for API call
//     const getFiscalYearForApi = () => {
//         if (currentCompany?.fiscalYear) {
//             return JSON.stringify({
//                 id: currentCompany.fiscalYear.id || currentCompany.fiscalYear.Id || '',
//                 name: currentCompany.fiscalYear.name || currentCompany.fiscalYear.Name || '',
//                 startDate: currentCompany.fiscalYear.startDate || currentCompany.fiscalYear.StartDate || '',
//                 endDate: currentCompany.fiscalYear.endDate || currentCompany.fiscalYear.EndDate || '',
//                 isActive: currentCompany.fiscalYear.isActive || currentCompany.fiscalYear.IsActive || false
//             });
//         }
//         return null;
//     };

//     const handleSaleComplete = (saleData) => {
//         console.log('Sale completed:', saleData);
//     };

//     const handlePosSaleClick = () => {
//         setShowPosModal(true);
//     };

//     return (
//         <>
//             <div className="app-content-header">
//                 <Header />
//             </div>

//             {showButton && (
//                 <div style={{ position: 'fixed', top: '100px', right: '20px', zIndex: 1000 }}>
//                     <button
//                         className="btn btn-primary me-2"
//                         onClick={() => setShowProductModal(true)}
//                     >
//                         View Products (F9)
//                     </button>
//                     <button
//                         className="btn btn-success"
//                         onClick={() => setShowPosModal(true)}
//                     >
//                         Open POS (F10)
//                     </button>
//                 </div>
//             )}

//             <div>
//                 {showButton && (
//                     <Button variant="primary" onClick={() => setShowContactsModal(true)}>
//                         Open Contacts (F4)
//                     </Button>
//                 )}

//                 <ContactModal
//                     show={showContactsModal}
//                     onHide={() => setShowContactsModal(false)}
//                     companyId={getCompanyId()}
//                 />
//             </div>

//             <div className="app-content pt-2">
//                 <div className="container-fluid">
//                     <div className="row">
//                         {isAdminOrSupervisor && (
//                             <StatsCards
//                                 companyId={getCompanyId()}
//                                 companyName={currentCompany.name || currentCompany.Name}
//                                 fiscalYearJson={getFiscalYearForApi()}
//                             />
//                         )}
//                         <div className="row">
//                             <div className="col-lg-7 connectedSortable">
//                                 <SalesChart
//                                     companyId={getCompanyId()}
//                                     companyName={currentCompany.name || currentCompany.Name}
//                                     fiscalYearJson={getFiscalYearForApi()}
//                                 />
//                             </div>

//                             <div className="col-lg-5 connectedSortable">
//                                 <QuickActions
//                                     onPosSaleClick={handlePosSaleClick}
//                                     companyId={getCompanyId()}
//                                 />
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             </div>

//             {/* POS Modal */}
//             <PosCashSalesModal
//                 show={showPosModal}
//                 onClose={() => setShowPosModal(false)}
//                 onSaleComplete={handleSaleComplete}
//                 companyId={getCompanyId()}
//             />

//             {/* Product modal */}
//             {showProductModal && (
//                 <ProductModal
//                     onClose={() => setShowProductModal(false)}
//                     companyId={getCompanyId()}
//                 />
//             )}
//         </>
//     );
// };

// export default DashboardV1;

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
        sidebarLogoIcon: {
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontWeight: '700',
            fontSize: '14px',
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
            gridTemplateColumns: '2fr 1fr',
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
                gridTemplateColumns: '1fr',
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
            },
        },
        '@media (max-width: 576px)': {
            contentArea: {
                padding: '12px',
            },
            welcomeTitle: {
                fontSize: '18px',
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
        { icon: <FaStore size={20} />, label: 'Store' },
        { icon: <FaTag size={20} />, label: 'Categories' },
        { icon: <FaTruck size={20} />, label: 'Suppliers' },
    ];

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
            {/* Header - Your existing Header component */}
            <div style={styles.headerWrapper}>
                <Header />
            </div>

            {/* Main Layout with Sidebar and Content */}
            <div style={styles.mainLayout}>
                {/* Sidebar - Icon only, expands on hover */}
                <div 
                    style={styles.sidebar}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                >
                    <div style={styles.sidebarInner}>
                        <div style={styles.sidebarHeader}>
                            <div style={styles.sidebarLogo}>
                                <div style={styles.sidebarLogoIcon}>A</div>
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
                        />
                    </div>

                    {/* Chart and Quick Actions */}
                    <div style={styles.contentGrid}>
                        <div>
                            <SalesChart
                                companyId={getCompanyId()}
                                companyName={currentCompany?.name || currentCompany?.Name}
                                fiscalYearJson={getFiscalYearForApi()}
                            />
                        </div>
                        <div>
                            <QuickActions
                                onPosSaleClick={handlePosSaleClick}
                                companyId={getCompanyId()}
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