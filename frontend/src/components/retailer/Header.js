import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaBars, FaTimes } from 'react-icons/fa';
import { BiSun, BiMoon } from 'react-icons/bi';
import '../../stylesheet/retailer/Header.css';
import { useAuth } from '../../context/AuthContext';
import { useSelector } from 'react-redux';
import axios from 'axios';
import Footer from './Footer';
import { usePageNotRefreshContext } from './PageNotRefreshContext';
import AccountsModal from './accounts/AccountModal';

const Header = () => {
  const { logout, currentUser } = useAuth();
  const { headerDraftSave, setHeaderDraftSave, clearHeaderDraft } = usePageNotRefreshContext();
  const [showAccountsModal, setShowAccountsModal] = useState(false);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState('light');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(!headerDraftSave);
  const [user, setUser] = useState(headerDraftSave?.user || null);
  const [companyData, setCompanyData] = useState(headerDraftSave?.companyData || {
    name: '',
    renewalDate: null
  });
  const [fiscalYear, setFiscalYear] = useState(headerDraftSave?.fiscalYear || null);
  const [isFresh, setIsFresh] = useState(false);
  const [error, setError] = useState('');

  // Get current company from Redux store
  const { currentCompany, userInfo } = useSelector((state) => state.auth);

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

  // Function to build query parameters for dashboard API
  const buildDashboardApiParams = () => {
    if (!currentCompany) return '';

    const params = new URLSearchParams();

    // Add company ID (with multiple fallbacks)
    const companyId = currentCompany.id || currentCompany.Id || currentCompany._id;
    if (companyId) {
      params.append('companyId', companyId);
    }

    // Add company name (with multiple fallbacks)
    const companyName = currentCompany.name || currentCompany.Name;
    if (companyName) {
      params.append('companyName', companyName);
    }

    // Add fiscal year if available
    if (currentCompany.fiscalYear) {
      const fiscalYearJson = JSON.stringify({
        id: currentCompany.fiscalYear.id || currentCompany.fiscalYear.Id || '',
        name: currentCompany.fiscalYear.name || currentCompany.fiscalYear.Name || '',
        startDate: currentCompany.fiscalYear.startDate || currentCompany.fiscalYear.StartDate || '',
        endDate: currentCompany.fiscalYear.endDate || currentCompany.fiscalYear.EndDate || '',
        isActive: currentCompany.fiscalYear.isActive || currentCompany.fiscalYear.IsActive || false
      });
      params.append('fiscalYearJson', fiscalYearJson);
    }

    return params.toString();
  };

  // Fetch data from the single dashboard API
  const fetchDashboardData = async () => {
    try {
      // If we don't have a current company, we can't fetch dashboard data
      if (!currentCompany) {
        console.log('No current company, cannot fetch dashboard data');
        setLoading(false);
        return;
      }

      // Build query parameters
      const params = buildDashboardApiParams();
      if (!params) {
        console.log('No parameters for dashboard API');
        setLoading(false);
        return;
      }

      console.log('Fetching dashboard data with params:', params);

      // Call the single dashboard API
      const response = await api.get(`/api/retailer/retailerDashboard/indexv1?${params}`);

      if (response.data.success) {
        const dashboardData = response.data.data;
        console.log('Dashboard data received:', dashboardData);

        // Extract user info from dashboard response
        const userData = dashboardData.user || {};

        // Extract company info from dashboard response
        const companyDataFromApi = {
          name: dashboardData.company?.name || currentCompany.name || currentCompany.Name || '',
          renewalDate: dashboardData.company?.renewalDate || null,
          dateFormat: dashboardData.company?.dateFormat || 'English',
          vatEnabled: dashboardData.company?.vatEnabled || false
        };

        // Extract fiscal year from dashboard response
        const fiscalYearFromApi = dashboardData.fiscalYear;

        // Update state with fresh data
        setUser(userData);
        setCompanyData(companyDataFromApi);
        setFiscalYear(fiscalYearFromApi);
        setIsFresh(true);
        setLoading(false);

        // Save to draft
        setHeaderDraftSave({
          user: userData,
          companyData: companyDataFromApi,
          fiscalYear: fiscalYearFromApi
        });
      } else {
        throw new Error(response.data.error || 'Failed to fetch dashboard data');
      }
    } catch (err) {
      console.error('Dashboard data fetch failed:', err);

      // If we have headerDraftSave, use it
      if (headerDraftSave) {
        console.log('Using cached header data');
        setLoading(false);
      } else {
        setError(err.response?.data?.error || 'Failed to fetch data');
        setLoading(false);
      }
    }
  };

  // Initial data fetch
  useEffect(() => {
    if (!currentUser || !currentCompany) {
      console.log('Waiting for user or company data...');
      setLoading(false);
      return;
    }

    // If we have draft data, show it immediately and fetch fresh in background
    if (headerDraftSave) {
      console.log('Using cached header data, fetching fresh in background');
      setLoading(false);
      fetchDashboardData().catch(e => console.log('Background update failed:', e));
    }
    // If no draft data, fetch fresh data
    else {
      console.log('Fetching fresh header data');
      fetchDashboardData();
    }

    // Set up auto-refresh every 5 minutes
    const interval = setInterval(fetchDashboardData, 300000);
    return () => clearInterval(interval);
  }, [currentUser, currentCompany]);

  // Determine which data to display (prefer fresh data if available)
  const displayUser = isFresh ? user : headerDraftSave?.user || user;
  const displayCompanyData = isFresh ? companyData : headerDraftSave?.companyData || companyData;
  const displayFiscalYear = isFresh ? fiscalYear : headerDraftSave?.fiscalYear || fiscalYear;

  // Fallback: If we still don't have user data, use Redux userInfo
  const finalUser = displayUser || userInfo || currentUser || {};

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Close mobile menu when route changes
  useEffect(() => {
    const unlisten = navigate.listen?.(() => setMobileMenuOpen(false));
    return () => unlisten?.();
  }, [navigate]);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const isAdminOrSupervisor = currentUser?.isAdmin || currentUser?.role === 'Supervisor' || finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Admin';

  if (loading && !headerDraftSave) {
    return (
      <div className="header-container">
        <div className="header">
          <div className="header-row container-fluid" role="navigation">
            <div className="header-right">
              <div className="placeholder-glow">
                <div style={{ height: '60px', width: '100%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (error && !headerDraftSave) {
    return (
      <div className="header-container">
        <div className="header">
          <div className="header-row container-fluid" role="navigation">
            <div className="header-right">
              <div className="alert alert-danger m-2">
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                {error}
                <button
                  className="btn btn-sm btn-outline-danger ms-3"
                  onClick={() => {
                    setError(null);
                    setLoading(true);
                    setHeaderDraftSave(null);
                    fetchDashboardData();
                  }}
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const mainMenuContent = (
    <ul className="main-menu">
      <li className="menu-item">
        <Link to="/retailerDashboard/indexv1" className="active" id="home">
          Home
        </Link>
      </li>
      {/* Accounts Menu */}
      {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Sales' ||
        finalUser?.role === 'Purchase' || finalUser?.role === 'Account' || finalUser?.isAdmin ||
        finalUser?.menuPermissions?.get('AccountsHeader')) && (
          <li className="menu-item dropdown">
            <Link to="#" className="active">
              Accounts
            </Link>
            <div className="sub-menu-wrapper slideInUp">
              <ul className="sub-menu">
                {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Sales' ||
                  finalUser?.role === 'Purchase' || finalUser?.role === 'Account' || finalUser?.isAdmin ||
                  finalUser?.menuPermissions?.get('Account')) && (
                    <li className="menu-item">
                      <Link to="/retailer/accounts">Account</Link>
                    </li>
                  )}
                {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Account' || finalUser?.isAdmin ||
                  finalUser?.menuPermissions?.get('AccountGroup')) && (
                    <li className="menu-item">
                      <Link to="/retailer/account-group">Account Group</Link>
                    </li>
                  )}
              </ul>
            </div>
          </li>
        )}

      {/* Items Menu */}
      {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Sales' ||
        finalUser?.role === 'Purchase' || finalUser?.role === 'Account' || finalUser?.isAdmin ||
        finalUser?.menuPermissions?.get('itemsHeader')) && (
          <li className="menu-item dropdown">
            <Link to="#" className="active">
              Items
            </Link>
            <div className="sub-menu-wrapper slideInUp">
              <ul className="sub-menu">
                {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Sales' ||
                  finalUser?.role === 'Purchase' || finalUser?.role === 'Account' || finalUser?.isAdmin ||
                  finalUser?.menuPermissions?.get('createItem')) && (
                    <li className="menu-item">
                      <Link to="/retailer/items">Item</Link>
                    </li>
                  )}
                {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Sales' ||
                  finalUser?.role === 'Purchase' || finalUser?.role === 'Account' || finalUser?.isAdmin ||
                  finalUser?.menuPermissions?.get('category')) && (
                    <li className="menu-item">
                      <Link to="/retailer/categories">Category</Link>
                    </li>
                  )}
                {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Sales' ||
                  finalUser?.role === 'Purchase' || finalUser?.role === 'Account' || finalUser?.isAdmin ||
                  finalUser?.menuPermissions?.get('company')) && (
                    <li className="menu-item">
                      <Link to="/retailer/items-company">Company</Link>
                    </li>
                  )}
                {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Sales' ||
                  finalUser?.role === 'Purchase' || finalUser?.role === 'Account' || finalUser?.isAdmin ||
                  finalUser?.menuPermissions?.get('unit')) && (
                    <li className="menu-item">
                      <Link to="/retailer/units">Unit</Link>
                    </li>
                  )}
                {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Sales' ||
                  finalUser?.role === 'Purchase' || finalUser?.role === 'Account' || finalUser?.isAdmin ||
                  finalUser?.menuPermissions?.get('mainUnit')) && (
                    <li className="menu-item">
                      <Link to="/retailer/mainUnits">Main Unit</Link>
                    </li>
                  )}
                {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Sales' ||
                  finalUser?.role === 'Purchase' || finalUser?.role === 'Account' || finalUser?.isAdmin ||
                  finalUser?.menuPermissions?.get('composition')) && (
                    <li className="menu-item">
                      <Link to="/retailer/compositions">Composition</Link>
                    </li>
                  )}
              </ul>
            </div>
          </li>
        )}

      {/* Sales Department Menu */}
      {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Sales' || finalUser?.isAdmin ||
        finalUser?.menuPermissions?.get('salesDepartment')) && (
          <li className="menu-item dropdown">
            <Link to="#" className="active">
              Sales Department
            </Link>
            <div className="sub-menu-wrapper slideInUp">
              <ul className="sub-menu">
                {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Sales' || finalUser?.isAdmin ||
                  finalUser?.menuPermissions?.get('salesQuotation')) && (
                    <li className="menu-item dropdown">
                      <Link to="#">Sales Quotation</Link>
                      <ul className="sub-menu">
                        <li className="menu-item">
                          <Link to="/retailer/sales-quotation">Add</Link>
                        </li>
                        <li className="menu-item">
                          <Link to="/retailer/sales-quotation/finds">Edit</Link>
                        </li>
                        <li className="menu-item">
                          <Link to="/retailer/sales-quotation/register">List</Link>
                        </li>
                      </ul>
                    </li>
                  )}
                {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Sales' || finalUser?.isAdmin ||
                  finalUser?.menuPermissions?.get('creditSales')) && (
                    <li className="menu-item dropdown">
                      <Link to="#">Sales</Link>
                      <ul className="sub-menu">
                        <li className="menu-item">
                          <Link to="/retailer/sales">Add Sales</Link>
                        </li>
                        <li className="menu-item">
                          <Link to="/retailer/sales-open">Add Sales Open</Link>
                        </li>
                        {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Sales' || finalUser?.isAdmin ||
                          finalUser?.menuPermissions?.get('creditSalesModify')) && (
                            <li className="menu-item">
                              <Link to="/retailer/sales/finds">Edit Sales</Link>
                            </li>
                          )}
                      </ul>
                    </li>
                  )}

                {/* {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Sales' || finalUser?.isAdmin ||
                  finalUser?.menuPermissions?.get('cashSales')) && (
                    <li className="menu-item dropdown">
                      <Link to="#">Cash Sales</Link>
                      <ul className="sub-menu">
                        <li className="menu-item">
                          <Link to="/retailer/cash-sales">Add Sales</Link>
                        </li>
                        <li className="menu-item">
                          <Link to="/retailer/cash-sales/open">Add Sales Open</Link>
                        </li>
                        {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Sales' || finalUser?.isAdmin ||
                          finalUser?.menuPermissions?.get('cashSalesModify')) && (
                            <li className="menu-item">
                              <Link to="/retailer/cash-sales/finds">Edit Sales</Link>
                            </li>
                          )}
                      </ul>
                    </li>
                  )} */}
                {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Sales' || finalUser?.isAdmin ||
                  finalUser?.menuPermissions?.get('creditSalesRtn')) && (
                    <li className="menu-item dropdown">
                      <Link to="#">Credit Sales Rtn</Link>
                      <ul className="sub-menu">
                        <li className="menu-item">
                          <Link to="/retailer/sales-return">Add</Link>
                        </li>
                        <li className="menu-item">
                          <Link to="/retailer/sales-return/finds">Edit</Link>
                        </li>
                      </ul>
                    </li>
                  )}
                {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Sales' || finalUser?.isAdmin ||
                  finalUser?.menuPermissions?.get('cashSalesRtn')) && (
                    <li className="menu-item dropdown">
                      <Link to="#">Cash Sales Rtn</Link>
                      <ul className="sub-menu">
                        <li className="menu-item">
                          <Link to="/retailer/cash/sales-return">Add</Link>
                        </li>
                        <li className="menu-item">
                          <Link to="/retailer/cash/sales-return/finds">Edit</Link>
                        </li>
                      </ul>
                    </li>
                  )}

                {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Sales' ||
                  finalUser?.role === 'Account' || finalUser?.isAdmin ||
                  finalUser?.menuPermissions?.get('salesRtnRegister')) && (
                    <li className="menu-item dropdown">
                      <Link to="#">Register</Link>
                      <ul className="sub-menu">
                        {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Sales' || finalUser?.isAdmin ||
                          finalUser?.menuPermissions?.get('salesRegister')) && (
                            <li className="menu-item">
                              <Link to="/retailer/sales-register">Sales Register</Link>
                            </li>
                          )}
                        {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Sales' || finalUser?.isAdmin ||
                          finalUser?.menuPermissions?.get('salesRtnRegister')) && (
                            <li className="menu-item">
                              <Link to="/retailer/sales-return/register">Sales Rtn Register</Link>
                            </li>
                          )}
                        {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Sales' || finalUser?.isAdmin ||
                          finalUser?.menuPermissions?.get('salesSummary')) && (
                            <li className="menu-item">
                              <Link to="/retailer/sales-summary">Sales Summary</Link>
                            </li>
                          )}
                      </ul>
                    </li>
                  )}
              </ul>
            </div>
          </li>
        )}

      {/* Purchase Department Menu */}
      {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Purchase' ||
        finalUser?.role === 'Account' || finalUser?.isAdmin ||
        finalUser?.menuPermissions?.get('purchaseDepartment')) && (
          <li className="menu-item dropdown">
            <Link to="#" className="active">
              Purchase Department
            </Link>
            <div className="sub-menu-wrapper slideInUp">
              <ul className="sub-menu">
                {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Purchase' ||
                  finalUser?.role === 'Account' || finalUser?.isAdmin ||
                  finalUser?.menuPermissions?.get('createPurchase')) && (
                    <li className="menu-item dropdown">
                      <Link to="#">Purchase</Link>
                      <ul className="sub-menu">
                        <li className="menu-item">
                          <Link to="/retailer/purchase">Add</Link>
                        </li>
                        {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Purchase' ||
                          finalUser?.role === 'Account' || finalUser?.isAdmin ||
                          finalUser?.menuPermissions?.get('purchaseModify')) && (
                            <li className="menu-item">
                              <Link to="/retailer/purchase/finds">Edit</Link>
                            </li>
                          )}
                      </ul>
                    </li>
                  )}
                {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Purchase' ||
                  finalUser?.isAdmin || finalUser?.menuPermissions?.get('createPurchaseRtn')) && (
                    <li className="menu-item dropdown">
                      <Link to="#">Purchase Return</Link>
                      <ul className="sub-menu">
                        <li className="menu-item">
                          <Link to="/retailer/purchase-return">Add</Link>
                        </li>
                        {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Purchase' ||
                          finalUser?.isAdmin || finalUser?.menuPermissions?.get('purchaseRtnModify')) && (
                            <li className="menu-item">
                              <Link to="/retailer/purchase-return/finds">Edit</Link>
                            </li>
                          )}
                      </ul>
                    </li>
                  )}

                {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Purchase' ||
                  finalUser?.role === 'Account' || finalUser?.isAdmin ||
                  finalUser?.menuPermissions?.get('createPurchase')) && (
                    <li className="menu-item dropdown">
                      <Link to="#">Register</Link>
                      <ul className="sub-menu">
                        {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Purchase' ||
                          finalUser?.role === 'Account' || finalUser?.isAdmin ||
                          finalUser?.menuPermissions?.get('purchaseRegister')) && (
                            <li className="menu-item">
                              <Link to="/retailer/purchase-register">Purchase Register</Link>
                            </li>
                          )}
                        {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Purchase' ||
                          finalUser?.isAdmin || finalUser?.menuPermissions?.get('purchaseRtnRegister')) && (
                            <li className="menu-item">
                              <Link to="/retailer/purchase-return/register">Purchase Rtn Register</Link>
                            </li>
                          )}
                        {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Purchase' ||
                          finalUser?.isAdmin || finalUser?.menuPermissions?.get('purchaseSummary')) && (
                            <li className="menu-item">
                              <Link to="/retailer/purchase-summary">Purchase Summary</Link>
                            </li>
                          )}
                      </ul>
                    </li>
                  )}
              </ul>
            </div>
          </li>
        )}

      {/* Inventory Menu */}
      {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Purchase'
        || finalUser?.role === 'Sales' || finalUser?.role === 'Account' ||
        finalUser?.isAdmin || finalUser?.menuPermissions?.get('inventoryHeader')) && (
          <li className="menu-item dropdown">
            <Link to="#" className="active">
              Inventory
            </Link>
            <div className="sub-menu-wrapper slideInUp">
              <ul className="sub-menu">
                {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Purchase'
                  || finalUser?.role === 'Sales' || finalUser?.role === 'Account' ||
                  finalUser?.isAdmin || finalUser?.menuPermissions?.get('itemLedger')) && (
                    <li className="menu-item">
                      <Link to="/retailer/items-ledger">Item Ledger</Link>
                    </li>
                  )}
                {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' ||
                  finalUser?.isAdmin || finalUser?.menuPermissions?.get('createStockAdj')) && (
                    <li className="menu-item dropdown">
                      <Link to="#">Stock Adjustment</Link>
                      <ul className="sub-menu">
                        <li className="menu-item">
                          <Link to="/retailer/stockAdjustments/new">Add</Link>
                        </li>
                        {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' ||
                          finalUser?.isAdmin || finalUser?.menuPermissions?.get('stockAdjRegister')) && (
                            <li className="menu-item">
                              <Link to="/retailer/stockAdjustments/register">Stock Adj. Register</Link>
                            </li>
                          )}
                      </ul>
                    </li>
                  )}
                {/*
                {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' ||
                  finalUser?.isAdmin || finalUser?.menuPermissions?.get('storeRackSubHeader')) && (
                    <li className="menu-item dropdown">
                      <Link to="#">Store/Rack</Link>
                      <ul className="sub-menu">
                        {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' ||
                          finalUser?.isAdmin || finalUser?.menuPermissions?.get('store')) && (
                            <li className="menu-item">
                              <Link to="/retailer/store/management">Store</Link>
                            </li>
                          )}
                        {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' ||
                          finalUser?.isAdmin || finalUser?.menuPermissions?.get('rack')) && (
                            <li className="menu-item">
                              <Link to="/retailer/rack/management">Rack</Link>
                            </li>
                          )}
                      </ul>
                    </li>
                  )}
                    */}
                {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' ||
                  finalUser?.isAdmin || finalUser?.menuPermissions?.get('stockStatus')) && (
                    <li className="menu-item">
                      <Link to="/retailer/stock-status">Stock Status</Link>
                    </li>
                  )}
                {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Purchase' ||
                  finalUser?.isAdmin || finalUser?.menuPermissions?.get('reorderLevel')) && (
                    <li className="menu-item">
                      <Link to="/retailer/items/reorder">Re Order Level</Link>
                    </li>
                  )}
                {/* {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Purchase' ||
                  finalUser?.isAdmin || finalUser?.menuPermissions?.get('itemSalesReport')) && (
                    <li className="menu-item">
                      <Link to="/sold-items">Item Sales Report</Link>
                    </li>
                  )} */}
              </ul>
            </div>
          </li>
        )}

      {/* Account Department Menu */}
      {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Purchase' || finalUser?.role === 'Account' ||
        finalUser?.isAdmin || finalUser?.menuPermissions?.get('accountDepartment')) && (
          <li className="menu-item dropdown">
            <Link to="#" className="active">
              Account Department
            </Link>
            <div className="sub-menu-wrapper slideInUp">
              <ul className="sub-menu">
                {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Purchase' || finalUser?.role === 'Account' ||
                  finalUser?.isAdmin || finalUser?.menuPermissions?.get('payment')) && (
                    <li className="menu-item dropdown">
                      <Link to="#">Payment</Link>
                      <ul className="sub-menu">
                        <li className="menu-item">
                          <Link to="/retailer/payments">Add</Link>
                        </li>
                        {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Purchase' || finalUser?.role === 'Account' ||
                          finalUser?.isAdmin || finalUser?.menuPermissions?.get('paymentModify')) && (
                            <li className="menu-item">
                              <Link to="/retailer/payments/finds">Edit</Link>
                            </li>
                          )}
                        {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Purchase' || finalUser?.role === 'Account' ||
                          finalUser?.isAdmin || finalUser?.menuPermissions?.get('paymentRegister')) && (
                            <li className="menu-item">
                              <Link to="/retailer/payments/register">List</Link>
                            </li>
                          )}
                      </ul>
                    </li>
                  )}
                {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Account' ||
                  finalUser?.isAdmin || finalUser?.menuPermissions?.get('receipt')) && (
                    <li className="menu-item dropdown">
                      <Link to="#">Receipt</Link>
                      <ul className="sub-menu">
                        <li className="menu-item">
                          <Link to="/retailer/receipts">Add</Link>
                        </li>
                        {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Account' ||
                          finalUser?.isAdmin || finalUser?.menuPermissions?.get('receiptModify')) && (
                            <li className="menu-item">
                              <Link to="/retailer/receipts/finds">Edit</Link>
                            </li>
                          )}
                        {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Account' ||
                          finalUser?.isAdmin || finalUser?.menuPermissions?.get('receiptRegister')) && (
                            <li className="menu-item">
                              <Link to="/retailer/receipts/register">List</Link>
                            </li>
                          )}
                      </ul>
                    </li>
                  )}
                {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Account' ||
                  finalUser?.isAdmin || finalUser?.menuPermissions?.get('journal')) && (
                    <li className="menu-item dropdown">
                      <Link to="#">Journal</Link>
                      <ul className="sub-menu">
                        <li className="menu-item">
                          <Link to="/retailer/journal">Add</Link>
                        </li>
                        {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Account' ||
                          finalUser?.isAdmin || finalUser?.menuPermissions?.get('journalModify')) && (
                            <li className="menu-item">
                              <Link to="/retailer/journal/finds">Edit</Link>
                            </li>
                          )}
                        {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Account' ||
                          finalUser?.isAdmin || finalUser?.menuPermissions?.get('journalRegister')) && (
                            <li className="menu-item">
                              <Link to="/retailer/journal/register">List</Link>
                            </li>
                          )}
                      </ul>
                    </li>
                  )}
                {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Account' ||
                  finalUser?.isAdmin || finalUser?.menuPermissions?.get('debitNote')) && (
                    <li className="menu-item dropdown">
                      <Link to="#">Debit Note</Link>
                      <ul className="sub-menu">
                        <li className="menu-item">
                          <Link to="/retailer/debit-note">Add</Link>
                        </li>
                        {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Account' ||
                          finalUser?.isAdmin || finalUser?.menuPermissions?.get('debitNoteModify')) && (
                            <li className="menu-item">
                              <Link to="/retailer/debit-note/finds">Edit</Link>
                            </li>
                          )}
                        {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Account' ||
                          finalUser?.isAdmin || finalUser?.menuPermissions?.get('debitNoteRegister')) && (
                            <li className="menu-item">
                              <Link to="/retailer/debit-note/register">List</Link>
                            </li>
                          )}
                      </ul>
                    </li>
                  )}
                {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Account' ||
                  finalUser?.isAdmin || finalUser?.menuPermissions?.get('creditNote')) && (
                    <li className="menu-item dropdown">
                      <Link to="#">Credit Note</Link>
                      <ul className="sub-menu">
                        <li className="menu-item">
                          <Link to="/retailer/credit-note">Add</Link>
                        </li>
                        {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Account' ||
                          finalUser?.isAdmin || finalUser?.menuPermissions?.get('creditNoteModify')) && (
                            <li className="menu-item">
                              <Link to="/retailer/credit-note/finds">Edit</Link>
                            </li>
                          )}
                        {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Account' ||
                          finalUser?.isAdmin || finalUser?.menuPermissions?.get('creditNoteRegister')) && (
                            <li className="menu-item">
                              <Link to="/retailer/credit-note/register">List</Link>
                            </li>
                          )}
                      </ul>
                    </li>
                  )}
              </ul>
            </div>
          </li>
        )}

      {/* Outstanding Menu */}
      {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Account' ||
        finalUser?.isAdmin || finalUser?.menuPermissions?.get('outstandingHeader')) && (
          <li className="menu-item dropdown">
            <Link to="#" className="active">
              Reports-Account
            </Link>
            <div className="sub-menu-wrapper slideInUp">
              <ul className="sub-menu">
                {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Account' ||
                  finalUser?.isAdmin || finalUser?.menuPermissions?.get('ageingSubHeader')) && (
                    <li className="menu-item dropdown">
                      <Link to="#">Ageing Reports</Link>
                      <ul className="sub-menu">
                        {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Account' ||
                          finalUser?.isAdmin || finalUser?.menuPermissions?.get('ageingAllParty')) && (
                            <li className="menu-item">
                              <Link to="/retailer/ageing-report/all-accounts">All Party</Link>
                            </li>
                          )}
                        {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Account' ||
                          finalUser?.isAdmin || finalUser?.menuPermissions?.get('ageingDayWise')) && (
                            <li className="menu-item">
                              <Link to="/retailer/day-count-aging">Day Wise</Link>
                            </li>
                          )}
                      </ul>
                    </li>
                  )}
                {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Account' ||
                  finalUser?.isAdmin || finalUser?.menuPermissions?.get('statements')) && (
                    <li className="menu-item">
                      <Link to="/retailer/statement">Statements</Link>
                    </li>
                  )}
                {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Account' ||
                  finalUser?.isAdmin || finalUser?.menuPermissions?.get('vatSummaryHeader')) && (
                    <li className="menu-item dropdown">
                      <Link to="#">VAT Reports</Link>
                      <ul className="sub-menu">
                        {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' ||
                          finalUser?.isAdmin || finalUser?.menuPermissions?.get('salesVatRegister')) && (
                            <li className="menu-item">
                              <Link to="/retailer/sales-vat-report">Sales Vat Register</Link>
                            </li>
                          )}
                        {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' ||
                          finalUser?.isAdmin || finalUser?.menuPermissions?.get('salesRtnVatRegister')) && (
                            <li className="menu-item">
                              <Link to="/retailer/salesReturn-vat-report">Sales Return Register</Link>
                            </li>
                          )}
                        {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' ||
                          finalUser?.isAdmin || finalUser?.menuPermissions?.get('purchaseVatRegister')) && (
                            <li className="menu-item">
                              <Link to="/retailer/purchase-vat-report">Purchase Vat Register</Link>
                            </li>
                          )}
                        {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' ||
                          finalUser?.isAdmin || finalUser?.menuPermissions?.get('purchaseRtnVatRegister')) && (
                            <li className="menu-item">
                              <Link to="/retailer/purchaseReturn-vat-report">Purchase Return Register</Link>
                            </li>
                          )}
                        {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' ||
                          finalUser?.isAdmin || finalUser?.menuPermissions?.get('monthlyVatSummary')) && (
                            <li className="menu-item">
                              <Link to="/retailer/monthly-vat-summary">Monthly Vat Summary</Link>
                            </li>
                          )}
                        {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' ||
                          finalUser?.isAdmin || finalUser?.menuPermissions?.get('monthlyVatSummary')) && (
                            <li className="menu-item">
                              <Link to="/retailer/confirmation-of-vat">Confirmation of VAT</Link>
                            </li>
                          )}
                      </ul>
                    </li>
                  )}
                {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Account' ||
                  finalUser?.isAdmin || finalUser?.menuPermissions?.get('reportsSubHeader')) && (
                    <li className="menu-item dropdown">
                      <Link to="#">Profitability Reports</Link>
                      <ul className="sub-menu">
                        {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Account' ||
                          finalUser?.isAdmin || finalUser?.menuPermissions?.get('dailyProfitSaleAnalysis')) && (
                            <li className="menu-item">
                              <Link to="/retailer/daily-profit/sales-analysis">Daily Profit/Sale Analysis</Link>
                            </li>
                          )}
                        {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Account' ||
                          finalUser?.isAdmin || finalUser?.menuPermissions?.get('invoiceWiseProfitLoss')) && (
                            <li className="menu-item">
                              <Link to="/retailer/invoicewise/profitloss">Invoice Wise Profit & Loss</Link>
                            </li>
                          )}
                      </ul>
                    </li>
                  )}

                {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Account' ||
                  finalUser?.isAdmin || finalUser?.menuPermissions?.get('reportsSubHeader')) && (
                    <li className="menu-item dropdown">
                      <Link to="#">MIS Reports</Link>
                      <ul className="sub-menu">
                        {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Account' ||
                          finalUser?.isAdmin || finalUser?.menuPermissions?.get('partyTurnoverDetails')) && (
                            <li className="menu-item">
                              <Link to="/retailer/party-turnover-details">Party Turnover Details</Link>
                            </li>
                          )}
                      </ul>
                    </li>
                  )}
              </ul>
            </div>
          </li>
        )}

      {/* Configuration Menu */}
      {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' ||
        finalUser?.isAdmin || finalUser?.menuPermissions?.get('configurationHeader')) && (
          <li className="menu-item dropdown">
            <Link to="#" className="active">
              Configuration
            </Link>
            <div className="sub-menu-wrapper slideInUp">
              <ul className="sub-menu">
                {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' ||
                  finalUser?.isAdmin || finalUser?.menuPermissions?.get('voucherConfiguration')) && (
                    <li className="menu-item">
                      <Link to="/retailer/voucherConfiguration">Voucher Configuration</Link>
                    </li>
                  )}
                {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' ||
                  finalUser?.isAdmin || finalUser?.menuPermissions?.get('changeFiscalYear')) && (
                    <li className="menu-item">
                      <Link to="/change-fiscal-year">Change Fiscal Year</Link>
                    </li>
                  )}
                {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' ||
                  finalUser?.isAdmin || finalUser?.menuPermissions?.get('existingFiscalYear')) && (
                    <li className="menu-item">
                      <Link to="/list-of-existing/fiscalYears">Existing Fiscal Year</Link>
                    </li>
                  )}
                {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' ||
                  finalUser?.isAdmin || finalUser?.menuPermissions?.get('importExportSubHeader')) && (
                    <li className="menu-item dropdown">
                      <Link to="#">Import</Link>
                      <ul className="sub-menu">
                        {(finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' ||
                          finalUser?.isAdmin || finalUser?.menuPermissions?.get('itemsImport')) && (
                            <>
                              <li className="menu-item">
                                <Link to="/retailer/items-import">Items Import</Link>
                              </li>
                              <li className="menu-item">
                                <Link to="/retailer/accounts-import">Accounts Import</Link>
                              </li>
                            </>
                          )}
                      </ul>
                    </li>
                  )}
              </ul>
            </div>
          </li>
        )}

      {/* User Profile Menu */}
      <li className="menu-item dropdown">
        <Link to="#" className="active">
          <i className="bi bi-person" style={{ fontSize: '20px' }}></i>
        </Link>
        <div className="sub-menu-wrapper slideInUp">
          <ul className="sub-menu">
            {/* {isAdminOrSupervisor ? (
              <li className="menu-item">
                <Link to={`/auth/users/view/${finalUser?._id || finalUser?.id}`}>
                  {finalUser?.name || finalUser?.Name || 'User'}
                </Link>
              </li>
            ) : ( */}
            <li className="menu-item">
              <Link to={`/auth/users/view/${finalUser?._id || finalUser?.id}`}>
                {finalUser?.name || finalUser?.Name || 'User'}
              </Link>
            </li>
            {/* )} */}
            <li className="menu-item">
              <Link to="/auth/user/change-password">Change Password</Link>
            </li>
            {isAdminOrSupervisor && (
              <>
                <li className="menu-item">
                  <Link to="/auth/admin/users/list">Users</Link>
                </li>

                <li className="menu-item">
                  <Link to="/user-logs">Logs & Activity</Link>
                </li>
              </>
            )}
            <li className="menu-item">
              <Link to="/dashboard">My Company</Link>
            </li>
            <li className="menu-item">
              <button
                onClick={logout}
                style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
              >
                Logout
              </button>
            </li>
          </ul>
        </div>
      </li>
      {/* Theme Toggle */}
      <li className="menu-item theme-toggle-container">
        <div className="theme-toggle">
          <button
            id="theme-switcher"
            className="btn btn-sm btn-outline-secondary"
            onClick={toggleTheme}
          >
            {theme === 'light' ? <BiMoon /> : <BiSun />}
          </button>
        </div>
      </li>
    </ul>
  );

  return (
    <div className='header-container'>
      <Footer
        currentCompanyName={displayCompanyData.name}
        user={displayUser}
        currentFiscalYear={displayFiscalYear}
        company={displayCompanyData}
      />
      <header className="header">
        <div className="header-row container-fluid" role="navigation">
          <div className="header-right">
            {/* Desktop Menu */}
            <nav className="desktop-menu">
              {mainMenuContent}
            </nav>
            {/* Mobile Menu Toggle */}
            {/* Three dots (hamburger) */}
            {!mobileMenuOpen && (
              <button
                id="three-dots"
                className="mobile-toggler"
                onClick={toggleMobileMenu}
                aria-label="Open menu"
              >
                <FaBars />
              </button>
            )}
            {/* Cross (close) icon at the same place */}
            {mobileMenuOpen && (
              <button
                id="mobile-close"
                className="mobile-toggler"
                onClick={toggleMobileMenu}
                aria-label="Close menu"
                style={{
                  position: 'absolute',
                  top: 8, // match your .mobile-toggler margin
                  right: 15,
                  zIndex: 2003
                }}
              >
                <FaTimes />
              </button>
            )}

            {/* Accounts Modal */}
            <AccountsModal
              show={showAccountsModal}
              onClose={() => setShowAccountsModal(false)}
              onAccountCreated={(accountData) => {
                // Handle account creation if needed
                console.log('Account created:', accountData);
              }}
            />


            {/* Mobile Menu */}
            <nav className={`mobile-menu${mobileMenuOpen ? ' open' : ''}`}>
              {mainMenuContent}
            </nav>
          </div>
        </div>
      </header>
    </div>
  );
};

export default Header;

//-------------------------------------------------------end1

// // Header.js
// import React, { useState, useEffect } from 'react';
// import { Link, useNavigate, useLocation } from 'react-router-dom';
// import { FaBars, FaTimes, FaUserCircle, FaCog, FaSignOutAlt, FaBell, FaChevronDown, FaHome, FaBox, FaShoppingCart, FaUsers, FaChartLine, FaExchangeAlt, FaFileInvoice, FaDatabase } from 'react-icons/fa';
// import { BiSun, BiMoon } from 'react-icons/bi';
// import '../../stylesheet/retailer/Header.css';
// import { useAuth } from '../../context/AuthContext';
// import { useSelector } from 'react-redux';
// import axios from 'axios';
// import Footer from './Footer';
// import { usePageNotRefreshContext } from './PageNotRefreshContext';
// import AccountsModal from './accounts/AccountModal';

// const Header = () => {
//   const { logout, currentUser } = useAuth();
//   const { headerDraftSave, setHeaderDraftSave, clearHeaderDraft } = usePageNotRefreshContext();
//   const [showAccountsModal, setShowAccountsModal] = useState(false);
//   const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
//   const [theme, setTheme] = useState('light');
//   const navigate = useNavigate();
//   const location = useLocation();
//   const [loading, setLoading] = useState(!headerDraftSave);
//   const [user, setUser] = useState(headerDraftSave?.user || null);
//   const [companyData, setCompanyData] = useState(headerDraftSave?.companyData || {
//     name: '',
//     renewalDate: null
//   });
//   const [fiscalYear, setFiscalYear] = useState(headerDraftSave?.fiscalYear || null);
//   const [isFresh, setIsFresh] = useState(false);
//   const [error, setError] = useState('');
//   const [activeDropdown, setActiveDropdown] = useState(null);

//   // Get current company from Redux store
//   const { currentCompany, userInfo } = useSelector((state) => state.auth);

//   // Create axios instance with auth header
//   const api = axios.create({
//     baseURL: process.env.REACT_APP_API_BASE_URL || '',
//     withCredentials: true,
//   });

//   // Add Authorization header to all requests
//   api.interceptors.request.use(config => {
//     const token = localStorage.getItem('token');
//     if (token) {
//       config.headers.Authorization = `Bearer ${token}`;
//     }
//     return config;
//   });

//   // Function to build query parameters for dashboard API
//   const buildDashboardApiParams = () => {
//     if (!currentCompany) return '';

//     const params = new URLSearchParams();

//     // Add company ID (with multiple fallbacks)
//     const companyId = currentCompany.id || currentCompany.Id || currentCompany._id;
//     if (companyId) {
//       params.append('companyId', companyId);
//     }

//     // Add company name (with multiple fallbacks)
//     const companyName = currentCompany.name || currentCompany.Name;
//     if (companyName) {
//       params.append('companyName', companyName);
//     }

//     // Add fiscal year if available
//     if (currentCompany.fiscalYear) {
//       const fiscalYearJson = JSON.stringify({
//         id: currentCompany.fiscalYear.id || currentCompany.fiscalYear.Id || '',
//         name: currentCompany.fiscalYear.name || currentCompany.fiscalYear.Name || '',
//         startDate: currentCompany.fiscalYear.startDate || currentCompany.fiscalYear.StartDate || '',
//         endDate: currentCompany.fiscalYear.endDate || currentCompany.fiscalYear.EndDate || '',
//         isActive: currentCompany.fiscalYear.isActive || currentCompany.fiscalYear.IsActive || false
//       });
//       params.append('fiscalYearJson', fiscalYearJson);
//     }

//     return params.toString();
//   };

//   // Fetch data from the single dashboard API
//   const fetchDashboardData = async () => {
//     try {
//       // If we don't have a current company, we can't fetch dashboard data
//       if (!currentCompany) {
//         console.log('No current company, cannot fetch dashboard data');
//         setLoading(false);
//         return;
//       }

//       // Build query parameters
//       const params = buildDashboardApiParams();
//       if (!params) {
//         console.log('No parameters for dashboard API');
//         setLoading(false);
//         return;
//       }

//       console.log('Fetching dashboard data with params:', params);

//       // Call the single dashboard API
//       const response = await api.get(`/api/retailer/retailerDashboard/indexv1?${params}`);

//       if (response.data.success) {
//         const dashboardData = response.data.data;
//         console.log('Dashboard data received:', dashboardData);

//         // Extract user info from dashboard response
//         const userData = dashboardData.user || {};

//         // Extract company info from dashboard response
//         const companyDataFromApi = {
//           name: dashboardData.company?.name || currentCompany.name || currentCompany.Name || '',
//           renewalDate: dashboardData.company?.renewalDate || null,
//           dateFormat: dashboardData.company?.dateFormat || 'English',
//           vatEnabled: dashboardData.company?.vatEnabled || false
//         };

//         // Extract fiscal year from dashboard response
//         const fiscalYearFromApi = dashboardData.fiscalYear;

//         // Update state with fresh data
//         setUser(userData);
//         setCompanyData(companyDataFromApi);
//         setFiscalYear(fiscalYearFromApi);
//         setIsFresh(true);
//         setLoading(false);

//         // Save to draft
//         setHeaderDraftSave({
//           user: userData,
//           companyData: companyDataFromApi,
//           fiscalYear: fiscalYearFromApi
//         });
//       } else {
//         throw new Error(response.data.error || 'Failed to fetch dashboard data');
//       }
//     } catch (err) {
//       console.error('Dashboard data fetch failed:', err);

//       // If we have headerDraftSave, use it
//       if (headerDraftSave) {
//         console.log('Using cached header data');
//         setLoading(false);
//       } else {
//         setError(err.response?.data?.error || 'Failed to fetch data');
//         setLoading(false);
//       }
//     }
//   };

//   // Initial data fetch
//   useEffect(() => {
//     if (!currentUser || !currentCompany) {
//       console.log('Waiting for user or company data...');
//       setLoading(false);
//       return;
//     }

//     // If we have draft data, show it immediately and fetch fresh in background
//     if (headerDraftSave) {
//       console.log('Using cached header data, fetching fresh in background');
//       setLoading(false);
//       fetchDashboardData().catch(e => console.log('Background update failed:', e));
//     }
//     // If no draft data, fetch fresh data
//     else {
//       console.log('Fetching fresh header data');
//       fetchDashboardData();
//     }

//     // Set up auto-refresh every 5 minutes
//     const interval = setInterval(fetchDashboardData, 300000);
//     return () => clearInterval(interval);
//   }, [currentUser, currentCompany]);

//   // Determine which data to display (prefer fresh data if available)
//   const displayUser = isFresh ? user : headerDraftSave?.user || user;
//   const displayCompanyData = isFresh ? companyData : headerDraftSave?.companyData || companyData;
//   const displayFiscalYear = isFresh ? fiscalYear : headerDraftSave?.fiscalYear || fiscalYear;

//   // Fallback: If we still don't have user data, use Redux userInfo
//   const finalUser = displayUser || userInfo || currentUser || {};

//   // Theme effect
//   useEffect(() => {
//     document.documentElement.setAttribute('data-theme', theme);
//   }, [theme]);

//   // Close mobile menu when route changes
//   useEffect(() => {
//     setMobileMenuOpen(false);
//   }, [location.pathname]);

//   // Close dropdown when clicking outside
//   useEffect(() => {
//     const handleClickOutside = (e) => {
//       if (!e.target.closest('.dropdown-container')) {
//         setActiveDropdown(null);
//       }
//     };
//     document.addEventListener('click', handleClickOutside);
//     return () => document.removeEventListener('click', handleClickOutside);
//   }, []);

//   const toggleMobileMenu = () => {
//     setMobileMenuOpen(!mobileMenuOpen);
//   };

//   const toggleTheme = () => {
//     setTheme(theme === 'light' ? 'dark' : 'light');
//   };

//   const handleDropdownToggle = (dropdownId, e) => {
//     e.preventDefault();
//     e.stopPropagation();
//     setActiveDropdown(activeDropdown === dropdownId ? null : dropdownId);
//   };

//   const isAdminOrSupervisor = currentUser?.isAdmin || currentUser?.role === 'Supervisor' || finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Admin';

//   if (loading && !headerDraftSave) {
//     return (
//       <div className="header-container">
//         <div className="header-skeleton">
//           <div className="header-skeleton-content">
//             <div className="skeleton-logo"></div>
//             <div className="skeleton-nav"></div>
//             <div className="skeleton-user"></div>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   if (error && !headerDraftSave) {
//     return (
//       <div className="header-container">
//         <div className="header-error">
//           <div className="header-error-content">
//             <div className="error-icon"><i className="bi bi-exclamation-triangle-fill"></i></div>
//             <span className="error-message">{error}</span>
//             <button
//               className="error-retry-btn"
//               onClick={() => {
//                 setError(null);
//                 setLoading(true);
//                 setHeaderDraftSave(null);
//                 fetchDashboardData();
//               }}
//             >
//               <i className="bi bi-arrow-clockwise"></i> Retry
//             </button>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   const getActiveClass = (path) => {
//     return location.pathname === path || location.pathname.startsWith(path + '/') ? 'active' : '';
//   };

//   // Render a menu item with dropdown
//   const renderDropdownItem = (label, icon, items, id) => {
//     const isOpen = activeDropdown === id;
//     return (
//       <li className={`menu-item dropdown-container ${isOpen ? 'open' : ''}`}>
//         <button
//           className="menu-link dropdown-trigger"
//           onClick={(e) => handleDropdownToggle(id, e)}
//           aria-expanded={isOpen}
//         >
//           {icon && <span className="menu-icon">{icon}</span>}
//           <span className="menu-label">{label}</span>
//           <FaChevronDown className={`dropdown-arrow ${isOpen ? 'rotated' : ''}`} />
//         </button>
//         <div className={`dropdown-menu ${isOpen ? 'open' : ''}`}>
//           {items.map((item, index) => (
//             <div key={index} className="dropdown-item">
//               {item.subItems ? (
//                 <div className="nested-dropdown">
//                   <div className="nested-dropdown-header">
//                     <span>{item.label}</span>
//                     <FaChevronDown className="nested-arrow" />
//                   </div>
//                   <div className="nested-dropdown-menu">
//                     {item.subItems.map((subItem, subIndex) => (
//                       <Link
//                         key={subIndex}
//                         to={subItem.path}
//                         className={`dropdown-sub-item ${getActiveClass(subItem.path)}`}
//                         onClick={() => setActiveDropdown(null)}
//                       >
//                         {subItem.label}
//                       </Link>
//                     ))}
//                   </div>
//                 </div>
//               ) : (
//                 <Link
//                   to={item.path}
//                   className={`dropdown-link ${getActiveClass(item.path)}`}
//                   onClick={() => setActiveDropdown(null)}
//                 >
//                   {item.label}
//                 </Link>
//               )}
//             </div>
//           ))}
//         </div>
//       </li>
//     );
//   };

//   // Build menu structure
//   const buildMenuStructure = () => {
//     const menuItems = [];

//     // Home
//     menuItems.push({
//       id: 'home',
//       label: 'Home',
//       icon: <FaHome />,
//       path: '/retailerDashboard/indexv1',
//       type: 'link'
//     });

//     // Accounts
//     if (finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Sales' ||
//         finalUser?.role === 'Purchase' || finalUser?.role === 'Account' || finalUser?.isAdmin ||
//         finalUser?.menuPermissions?.get('AccountsHeader')) {
//       menuItems.push({
//         id: 'accounts',
//         label: 'Accounts',
//         icon: <FaUsers />,
//         type: 'dropdown',
//         items: [
//           ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Sales' ||
//                 finalUser?.role === 'Purchase' || finalUser?.role === 'Account' || finalUser?.isAdmin ||
//                 finalUser?.menuPermissions?.get('Account')) ? [{
//             label: 'Account',
//             path: '/retailer/accounts'
//           }] : []),
//           ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Account' || finalUser?.isAdmin ||
//                 finalUser?.menuPermissions?.get('AccountGroup')) ? [{
//             label: 'Account Group',
//             path: '/retailer/account-group'
//           }] : [])
//         ]
//       });
//     }

//     // Items
//     if (finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Sales' ||
//         finalUser?.role === 'Purchase' || finalUser?.role === 'Account' || finalUser?.isAdmin ||
//         finalUser?.menuPermissions?.get('itemsHeader')) {
//       menuItems.push({
//         id: 'items',
//         label: 'Items',
//         icon: <FaBox />,
//         type: 'dropdown',
//         items: [
//           ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Sales' ||
//                 finalUser?.role === 'Purchase' || finalUser?.role === 'Account' || finalUser?.isAdmin ||
//                 finalUser?.menuPermissions?.get('createItem')) ? [{
//             label: 'Item',
//             path: '/retailer/items'
//           }] : []),
//           ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Sales' ||
//                 finalUser?.role === 'Purchase' || finalUser?.role === 'Account' || finalUser?.isAdmin ||
//                 finalUser?.menuPermissions?.get('category')) ? [{
//             label: 'Category',
//             path: '/retailer/categories'
//           }] : []),
//           ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Sales' ||
//                 finalUser?.role === 'Purchase' || finalUser?.role === 'Account' || finalUser?.isAdmin ||
//                 finalUser?.menuPermissions?.get('company')) ? [{
//             label: 'Company',
//             path: '/retailer/items-company'
//           }] : []),
//           ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Sales' ||
//                 finalUser?.role === 'Purchase' || finalUser?.role === 'Account' || finalUser?.isAdmin ||
//                 finalUser?.menuPermissions?.get('unit')) ? [{
//             label: 'Unit',
//             path: '/retailer/units'
//           }] : []),
//           ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Sales' ||
//                 finalUser?.role === 'Purchase' || finalUser?.role === 'Account' || finalUser?.isAdmin ||
//                 finalUser?.menuPermissions?.get('mainUnit')) ? [{
//             label: 'Main Unit',
//             path: '/retailer/mainUnits'
//           }] : []),
//           ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Sales' ||
//                 finalUser?.role === 'Purchase' || finalUser?.role === 'Account' || finalUser?.isAdmin ||
//                 finalUser?.menuPermissions?.get('composition')) ? [{
//             label: 'Composition',
//             path: '/retailer/compositions'
//           }] : [])
//         ]
//       });
//     }

//     // Sales Department
//     if (finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Sales' || finalUser?.isAdmin ||
//         finalUser?.menuPermissions?.get('salesDepartment')) {
//       menuItems.push({
//         id: 'sales',
//         label: 'Sales',
//         icon: <FaShoppingCart />,
//         type: 'dropdown',
//         items: [
//           ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Sales' || finalUser?.isAdmin ||
//                 finalUser?.menuPermissions?.get('salesQuotation')) ? [{
//             label: 'Sales Quotation',
//             path: '#',
//             subItems: [
//               { label: 'Add', path: '/retailer/sales-quotation' },
//               { label: 'Edit', path: '/retailer/sales-quotation/finds' },
//               { label: 'List', path: '/retailer/sales-quotation/register' }
//             ]
//           }] : []),
//           ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Sales' || finalUser?.isAdmin ||
//                 finalUser?.menuPermissions?.get('creditSales')) ? [{
//             label: 'Credit Sales',
//             path: '#',
//             subItems: [
//               { label: 'Add Sales', path: '/retailer/credit-sales' },
//               { label: 'Add Sales Open', path: '/retailer/credit-sales/open' },
//               ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Sales' || finalUser?.isAdmin ||
//                     finalUser?.menuPermissions?.get('creditSalesModify')) ? [{ label: 'Edit Sales', path: '/retailer/credit-sales/finds' }] : [])
//             ]
//           }] : []),
//           ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Sales' || finalUser?.isAdmin ||
//                 finalUser?.menuPermissions?.get('cashSales')) ? [{
//             label: 'Cash Sales',
//             path: '#',
//             subItems: [
//               { label: 'Add Sales', path: '/retailer/cash-sales' },
//               { label: 'Add Sales Open', path: '/retailer/cash-sales/open' },
//               ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Sales' || finalUser?.isAdmin ||
//                     finalUser?.menuPermissions?.get('cashSalesModify')) ? [{ label: 'Edit Sales', path: '/retailer/cash-sales/finds' }] : [])
//             ]
//           }] : []),
//           ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Sales' || finalUser?.isAdmin ||
//                 finalUser?.menuPermissions?.get('creditSalesRtn')) ? [{
//             label: 'Credit Sales Rtn',
//             path: '#',
//             subItems: [
//               { label: 'Add', path: '/retailer/sales-return' },
//               { label: 'Edit', path: '/retailer/sales-return/finds' }
//             ]
//           }] : []),
//           ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Sales' || finalUser?.isAdmin ||
//                 finalUser?.menuPermissions?.get('cashSalesRtn')) ? [{
//             label: 'Cash Sales Rtn',
//             path: '#',
//             subItems: [
//               { label: 'Add', path: '/retailer/cash/sales-return' },
//               { label: 'Edit', path: '/retailer/cash/sales-return/finds' }
//             ]
//           }] : []),
//           ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Sales' ||
//                 finalUser?.role === 'Account' || finalUser?.isAdmin ||
//                 finalUser?.menuPermissions?.get('salesRtnRegister')) ? [{
//             label: 'Register',
//             path: '#',
//             subItems: [
//               ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Sales' || finalUser?.isAdmin ||
//                     finalUser?.menuPermissions?.get('salesRegister')) ? [{ label: 'Sales Register', path: '/retailer/sales-register' }] : []),
//               ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Sales' || finalUser?.isAdmin ||
//                     finalUser?.menuPermissions?.get('salesRtnRegister')) ? [{ label: 'Sales Rtn Register', path: '/retailer/sales-return/register' }] : []),
//               ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Sales' || finalUser?.isAdmin ||
//                     finalUser?.menuPermissions?.get('salesSummary')) ? [{ label: 'Sales Summary', path: '/retailer/sales-summary' }] : [])
//             ]
//           }] : [])
//         ]
//       });
//     }

//     // Purchase Department
//     if (finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Purchase' ||
//         finalUser?.role === 'Account' || finalUser?.isAdmin ||
//         finalUser?.menuPermissions?.get('purchaseDepartment')) {
//       menuItems.push({
//         id: 'purchase',
//         label: 'Purchase',
//         icon: <FaExchangeAlt />,
//         type: 'dropdown',
//         items: [
//           ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Purchase' ||
//                 finalUser?.role === 'Account' || finalUser?.isAdmin ||
//                 finalUser?.menuPermissions?.get('createPurchase')) ? [{
//             label: 'Purchase',
//             path: '#',
//             subItems: [
//               { label: 'Add', path: '/retailer/purchase' },
//               ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Purchase' ||
//                     finalUser?.role === 'Account' || finalUser?.isAdmin ||
//                     finalUser?.menuPermissions?.get('purchaseModify')) ? [{ label: 'Edit', path: '/retailer/purchase/finds' }] : [])
//             ]
//           }] : []),
//           ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Purchase' ||
//                 finalUser?.isAdmin || finalUser?.menuPermissions?.get('createPurchaseRtn')) ? [{
//             label: 'Purchase Return',
//             path: '#',
//             subItems: [
//               { label: 'Add', path: '/retailer/purchase-return' },
//               ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Purchase' ||
//                     finalUser?.isAdmin || finalUser?.menuPermissions?.get('purchaseRtnModify')) ? [{ label: 'Edit', path: '/retailer/purchase-return/finds' }] : [])
//             ]
//           }] : []),
//           ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Purchase' ||
//                 finalUser?.role === 'Account' || finalUser?.isAdmin ||
//                 finalUser?.menuPermissions?.get('createPurchase')) ? [{
//             label: 'Register',
//             path: '#',
//             subItems: [
//               ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Purchase' ||
//                     finalUser?.role === 'Account' || finalUser?.isAdmin ||
//                     finalUser?.menuPermissions?.get('purchaseRegister')) ? [{ label: 'Purchase Register', path: '/retailer/purchase-register' }] : []),
//               ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Purchase' ||
//                     finalUser?.isAdmin || finalUser?.menuPermissions?.get('purchaseRtnRegister')) ? [{ label: 'Purchase Rtn Register', path: '/retailer/purchase-return/register' }] : []),
//               ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Purchase' ||
//                     finalUser?.isAdmin || finalUser?.menuPermissions?.get('purchaseSummary')) ? [{ label: 'Purchase Summary', path: '/retailer/purchase-summary' }] : [])
//             ]
//           }] : [])
//         ]
//       });
//     }

//     // Inventory
//     if (finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Purchase' ||
//         finalUser?.role === 'Sales' || finalUser?.role === 'Account' ||
//         finalUser?.isAdmin || finalUser?.menuPermissions?.get('inventoryHeader')) {
//       menuItems.push({
//         id: 'inventory',
//         label: 'Inventory',
//         icon: <FaDatabase />,
//         type: 'dropdown',
//         items: [
//           ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Purchase' ||
//                 finalUser?.role === 'Sales' || finalUser?.role === 'Account' ||
//                 finalUser?.isAdmin || finalUser?.menuPermissions?.get('itemLedger')) ? [{
//             label: 'Item Ledger',
//             path: '/retailer/items-ledger'
//           }] : []),
//           ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' ||
//                 finalUser?.isAdmin || finalUser?.menuPermissions?.get('createStockAdj')) ? [{
//             label: 'Stock Adjustment',
//             path: '#',
//             subItems: [
//               { label: 'Add', path: '/retailer/stockAdjustments/new' },
//               ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' ||
//                     finalUser?.isAdmin || finalUser?.menuPermissions?.get('stockAdjRegister')) ? [{ label: 'Stock Adj. Register', path: '/retailer/stockAdjustments/register' }] : [])
//             ]
//           }] : []),
//           ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' ||
//                 finalUser?.isAdmin || finalUser?.menuPermissions?.get('stockStatus')) ? [{
//             label: 'Stock Status',
//             path: '/retailer/stock-status'
//           }] : []),
//           ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Purchase' ||
//                 finalUser?.isAdmin || finalUser?.menuPermissions?.get('reorderLevel')) ? [{
//             label: 'Re Order Level',
//             path: '/retailer/items/reorder'
//           }] : [])
//         ]
//       });
//     }

//     // Account Department
//     if (finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Purchase' || finalUser?.role === 'Account' ||
//         finalUser?.isAdmin || finalUser?.menuPermissions?.get('accountDepartment')) {
//       menuItems.push({
//         id: 'accountDept',
//         label: 'Accounts',
//         icon: <FaFileInvoice />,
//         type: 'dropdown',
//         items: [
//           ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Purchase' || finalUser?.role === 'Account' ||
//                 finalUser?.isAdmin || finalUser?.menuPermissions?.get('payment')) ? [{
//             label: 'Payment',
//             path: '#',
//             subItems: [
//               { label: 'Add', path: '/retailer/payments' },
//               ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Purchase' || finalUser?.role === 'Account' ||
//                     finalUser?.isAdmin || finalUser?.menuPermissions?.get('paymentModify')) ? [{ label: 'Edit', path: '/retailer/payments/finds' }] : []),
//               ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Purchase' || finalUser?.role === 'Account' ||
//                     finalUser?.isAdmin || finalUser?.menuPermissions?.get('paymentRegister')) ? [{ label: 'List', path: '/retailer/payments/register' }] : [])
//             ]
//           }] : []),
//           ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Account' ||
//                 finalUser?.isAdmin || finalUser?.menuPermissions?.get('receipt')) ? [{
//             label: 'Receipt',
//             path: '#',
//             subItems: [
//               { label: 'Add', path: '/retailer/receipts' },
//               ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Account' ||
//                     finalUser?.isAdmin || finalUser?.menuPermissions?.get('receiptModify')) ? [{ label: 'Edit', path: '/retailer/receipts/finds' }] : []),
//               ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Account' ||
//                     finalUser?.isAdmin || finalUser?.menuPermissions?.get('receiptRegister')) ? [{ label: 'List', path: '/retailer/receipts/register' }] : [])
//             ]
//           }] : []),
//           ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Account' ||
//                 finalUser?.isAdmin || finalUser?.menuPermissions?.get('journal')) ? [{
//             label: 'Journal',
//             path: '#',
//             subItems: [
//               { label: 'Add', path: '/retailer/journal' },
//               ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Account' ||
//                     finalUser?.isAdmin || finalUser?.menuPermissions?.get('journalModify')) ? [{ label: 'Edit', path: '/retailer/journal/finds' }] : []),
//               ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Account' ||
//                     finalUser?.isAdmin || finalUser?.menuPermissions?.get('journalRegister')) ? [{ label: 'List', path: '/retailer/journal/register' }] : [])
//             ]
//           }] : []),
//           ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Account' ||
//                 finalUser?.isAdmin || finalUser?.menuPermissions?.get('debitNote')) ? [{
//             label: 'Debit Note',
//             path: '#',
//             subItems: [
//               { label: 'Add', path: '/retailer/debit-note' },
//               ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Account' ||
//                     finalUser?.isAdmin || finalUser?.menuPermissions?.get('debitNoteModify')) ? [{ label: 'Edit', path: '/retailer/debit-note/finds' }] : []),
//               ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Account' ||
//                     finalUser?.isAdmin || finalUser?.menuPermissions?.get('debitNoteRegister')) ? [{ label: 'List', path: '/retailer/debit-note/register' }] : [])
//             ]
//           }] : []),
//           ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Account' ||
//                 finalUser?.isAdmin || finalUser?.menuPermissions?.get('creditNote')) ? [{
//             label: 'Credit Note',
//             path: '#',
//             subItems: [
//               { label: 'Add', path: '/retailer/credit-note' },
//               ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Account' ||
//                     finalUser?.isAdmin || finalUser?.menuPermissions?.get('creditNoteModify')) ? [{ label: 'Edit', path: '/retailer/credit-note/finds' }] : []),
//               ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Account' ||
//                     finalUser?.isAdmin || finalUser?.menuPermissions?.get('creditNoteRegister')) ? [{ label: 'List', path: '/retailer/credit-note/register' }] : [])
//             ]
//           }] : [])
//         ]
//       });
//     }

//     // Reports
//     if (finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Account' ||
//         finalUser?.isAdmin || finalUser?.menuPermissions?.get('outstandingHeader')) {
//       menuItems.push({
//         id: 'reports',
//         label: 'Reports',
//         icon: <FaChartLine />,
//         type: 'dropdown',
//         items: [
//           ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Account' ||
//                 finalUser?.isAdmin || finalUser?.menuPermissions?.get('ageingSubHeader')) ? [{
//             label: 'Ageing Reports',
//             path: '#',
//             subItems: [
//               ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Account' ||
//                     finalUser?.isAdmin || finalUser?.menuPermissions?.get('ageingAllParty')) ? [{ label: 'All Party', path: '/retailer/ageing-report/all-accounts' }] : []),
//               ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Account' ||
//                     finalUser?.isAdmin || finalUser?.menuPermissions?.get('ageingDayWise')) ? [{ label: 'Day Wise', path: '/retailer/day-count-aging' }] : [])
//             ]
//           }] : []),
//           ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Account' ||
//                 finalUser?.isAdmin || finalUser?.menuPermissions?.get('statements')) ? [{
//             label: 'Statements',
//             path: '/retailer/statement'
//           }] : []),
//           ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Account' ||
//                 finalUser?.isAdmin || finalUser?.menuPermissions?.get('vatSummaryHeader')) ? [{
//             label: 'VAT Reports',
//             path: '#',
//             subItems: [
//               ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' ||
//                     finalUser?.isAdmin || finalUser?.menuPermissions?.get('salesVatRegister')) ? [{ label: 'Sales Vat Register', path: '/retailer/sales-vat-report' }] : []),
//               ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' ||
//                     finalUser?.isAdmin || finalUser?.menuPermissions?.get('salesRtnVatRegister')) ? [{ label: 'Sales Return Register', path: '/retailer/salesReturn-vat-report' }] : []),
//               ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' ||
//                     finalUser?.isAdmin || finalUser?.menuPermissions?.get('purchaseVatRegister')) ? [{ label: 'Purchase Vat Register', path: '/retailer/purchase-vat-report' }] : []),
//               ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' ||
//                     finalUser?.isAdmin || finalUser?.menuPermissions?.get('purchaseRtnVatRegister')) ? [{ label: 'Purchase Return Register', path: '/retailer/purchaseReturn-vat-report' }] : []),
//               ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' ||
//                     finalUser?.isAdmin || finalUser?.menuPermissions?.get('monthlyVatSummary')) ? [{ label: 'Monthly Vat Summary', path: '/retailer/monthly-vat-summary' }] : []),
//               ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' ||
//                     finalUser?.isAdmin || finalUser?.menuPermissions?.get('monthlyVatSummary')) ? [{ label: 'Confirmation of VAT', path: '/retailer/confirmation-of-vat' }] : [])
//             ]
//           }] : []),
//           ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Account' ||
//                 finalUser?.isAdmin || finalUser?.menuPermissions?.get('reportsSubHeader')) ? [{
//             label: 'Profitability Reports',
//             path: '#',
//             subItems: [
//               ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Account' ||
//                     finalUser?.isAdmin || finalUser?.menuPermissions?.get('dailyProfitSaleAnalysis')) ? [{ label: 'Daily Profit/Sale Analysis', path: '/retailer/daily-profit/sales-analysis' }] : []),
//               ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Account' ||
//                     finalUser?.isAdmin || finalUser?.menuPermissions?.get('invoiceWiseProfitLoss')) ? [{ label: 'Invoice Wise Profit & Loss', path: '/retailer/invoicewise/profitloss' }] : [])
//             ]
//           }] : []),
//           ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Account' ||
//                 finalUser?.isAdmin || finalUser?.menuPermissions?.get('reportsSubHeader')) ? [{
//             label: 'MIS Reports',
//             path: '#',
//             subItems: [
//               ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' || finalUser?.role === 'Account' ||
//                     finalUser?.isAdmin || finalUser?.menuPermissions?.get('partyTurnoverDetails')) ? [{ label: 'Party Turnover Details', path: '/retailer/party-turnover-details' }] : [])
//             ]
//           }] : [])
//         ]
//       });
//     }

//     // Configuration
//     if (finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' ||
//         finalUser?.isAdmin || finalUser?.menuPermissions?.get('configurationHeader')) {
//       menuItems.push({
//         id: 'config',
//         label: 'Config',
//         icon: <FaCog />,
//         type: 'dropdown',
//         items: [
//           ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' ||
//                 finalUser?.isAdmin || finalUser?.menuPermissions?.get('voucherConfiguration')) ? [{
//             label: 'Voucher Configuration',
//             path: '/retailer/voucherConfiguration'
//           }] : []),
//           ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' ||
//                 finalUser?.isAdmin || finalUser?.menuPermissions?.get('changeFiscalYear')) ? [{
//             label: 'Change Fiscal Year',
//             path: '/change-fiscal-year'
//           }] : []),
//           ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' ||
//                 finalUser?.isAdmin || finalUser?.menuPermissions?.get('existingFiscalYear')) ? [{
//             label: 'Existing Fiscal Year',
//             path: '/list-of-existing/fiscalYears'
//           }] : []),
//           ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' ||
//                 finalUser?.isAdmin || finalUser?.menuPermissions?.get('importExportSubHeader')) ? [{
//             label: 'Import',
//             path: '#',
//             subItems: [
//               ...((finalUser?.role === 'ADMINISTRATOR' || finalUser?.role === 'Supervisor' ||
//                     finalUser?.isAdmin || finalUser?.menuPermissions?.get('itemsImport')) ? [
//                 { label: 'Items Import', path: '/retailer/items-import' },
//                 { label: 'Accounts Import', path: '/retailer/accounts-import' }
//               ] : [])
//             ]
//           }] : [])
//         ]
//       });
//     }

//     return menuItems;
//   };

//   const menuItems = buildMenuStructure();

//   return (
//     <div className='header-container'>
//       <Footer
//         currentCompanyName={displayCompanyData.name}
//         user={displayUser}
//         currentFiscalYear={displayFiscalYear}
//         company={displayCompanyData}
//       />
//       <header className="header">
//         <div className="header-inner">

//           {/* Desktop Navigation */}
//           <nav className="desktop-nav">
//             <ul className="nav-list">
//               {menuItems.map((item) => {
//                 if (item.type === 'link') {
//                   return (
//                     <li key={item.id} className="nav-item">
//                       <Link
//                         to={item.path}
//                         className={`nav-link ${getActiveClass(item.path)}`}
//                       >
//                         <span className="nav-icon">{item.icon}</span>
//                         <span className="nav-label">{item.label}</span>
//                       </Link>
//                     </li>
//                   );
//                 } else if (item.type === 'dropdown') {
//                   return renderDropdownItem(
//                     item.label,
//                     item.icon,
//                     item.items,
//                     item.id
//                   );
//                 }
//                 return null;
//               })}
//             </ul>
//           </nav>

//           {/* Right Actions */}
//           <div className="header-actions">
//             {/* Theme Toggle */}
//             <button
//               className="action-btn theme-btn"
//               onClick={toggleTheme}
//               aria-label="Toggle theme"
//             >
//               {theme === 'light' ? <BiMoon /> : <BiSun />}
//             </button>

//             {/* User Menu */}
//             <div className="user-menu-container">
//               <button
//                 className="user-menu-trigger"
//                 onClick={(e) => handleDropdownToggle('userMenu', e)}
//               >
//                 <FaUserCircle className="user-avatar" />
//                 <span className="user-name">{finalUser?.name || finalUser?.Name || 'User'}</span>
//                 <FaChevronDown className={`dropdown-arrow ${activeDropdown === 'userMenu' ? 'rotated' : ''}`} />
//               </button>
//               <div className={`user-dropdown ${activeDropdown === 'userMenu' ? 'open' : ''}`}>
//                 <Link
//                   to={`/auth/users/view/${finalUser?._id || finalUser?.id}`}
//                   className="user-dropdown-item"
//                   onClick={() => setActiveDropdown(null)}
//                 >
//                   <FaUserCircle /> Profile
//                 </Link>
//                 <Link
//                   to="/auth/user/change-password"
//                   className="user-dropdown-item"
//                   onClick={() => setActiveDropdown(null)}
//                 >
//                   <FaCog /> Change Password
//                 </Link>
//                 {isAdminOrSupervisor && (
//                   <>
//                     <Link
//                       to="/auth/admin/users/list"
//                       className="user-dropdown-item"
//                       onClick={() => setActiveDropdown(null)}
//                     >
//                       <FaUsers /> Users
//                     </Link>
//                     <Link
//                       to="/user-logs"
//                       className="user-dropdown-item"
//                       onClick={() => setActiveDropdown(null)}
//                     >
//                       <FaDatabase /> Logs & Activity
//                     </Link>
//                   </>
//                 )}
//                 <Link
//                   to="/dashboard"
//                   className="user-dropdown-item"
//                   onClick={() => setActiveDropdown(null)}
//                 >
//                   <FaBox /> My Company
//                 </Link>
//                 <button
//                   className="user-dropdown-item logout-btn"
//                   onClick={logout}
//                 >
//                   <FaSignOutAlt /> Logout
//                 </button>
//               </div>
//             </div>

//             {/* Mobile Menu Toggle */}
//             <button
//               className="mobile-toggle"
//               onClick={toggleMobileMenu}
//               aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
//             >
//               {mobileMenuOpen ? <FaTimes /> : <FaBars />}
//             </button>
//           </div>
//         </div>

//         {/* Mobile Menu Overlay */}
//         <div className={`mobile-overlay ${mobileMenuOpen ? 'open' : ''}`} onClick={toggleMobileMenu} />

//         {/* Mobile Menu */}
//         <div className={`mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
//           <div className="mobile-menu-header">
//             <div className="mobile-brand">
//               <FaBox className="mobile-brand-icon" />
//               <span className="mobile-brand-name">{displayCompanyData.name || 'Company'}</span>
//             </div>
//             <button className="mobile-close-btn" onClick={toggleMobileMenu}>
//               <FaTimes />
//             </button>
//           </div>
//           <div className="mobile-menu-body">
//             <ul className="mobile-nav-list">
//               {menuItems.map((item) => {
//                 if (item.type === 'link') {
//                   return (
//                     <li key={item.id} className="mobile-nav-item">
//                       <Link
//                         to={item.path}
//                         className={`mobile-nav-link ${getActiveClass(item.path)}`}
//                         onClick={() => setMobileMenuOpen(false)}
//                       >
//                         <span className="mobile-nav-icon">{item.icon}</span>
//                         <span className="mobile-nav-label">{item.label}</span>
//                       </Link>
//                     </li>
//                   );
//                 } else if (item.type === 'dropdown') {
//                   return (
//                     <li key={item.id} className="mobile-nav-item">
//                       <button
//                         className="mobile-dropdown-trigger"
//                         onClick={() => setActiveDropdown(activeDropdown === item.id ? null : item.id)}
//                       >
//                         <span className="mobile-nav-icon">{item.icon}</span>
//                         <span className="mobile-nav-label">{item.label}</span>
//                         <FaChevronDown className={`mobile-dropdown-arrow ${activeDropdown === item.id ? 'rotated' : ''}`} />
//                       </button>
//                       <div className={`mobile-dropdown-content ${activeDropdown === item.id ? 'open' : ''}`}>
//                         {item.items.map((subItem, index) => (
//                           <div key={index} className="mobile-dropdown-item">
//                             {subItem.subItems ? (
//                               <div className="mobile-nested-dropdown">
//                                 <div className="mobile-nested-header">
//                                   <span>{subItem.label}</span>
//                                   <FaChevronDown className="mobile-nested-arrow" />
//                                 </div>
//                                 <div className="mobile-nested-content">
//                                   {subItem.subItems.map((nestedItem, nestedIndex) => (
//                                     <Link
//                                       key={nestedIndex}
//                                       to={nestedItem.path}
//                                       className="mobile-nested-link"
//                                       onClick={() => {
//                                         setActiveDropdown(null);
//                                         setMobileMenuOpen(false);
//                                       }}
//                                     >
//                                       {nestedItem.label}
//                                     </Link>
//                                   ))}
//                                 </div>
//                               </div>
//                             ) : (
//                               <Link
//                                 to={subItem.path}
//                                 className="mobile-dropdown-link"
//                                 onClick={() => {
//                                   setActiveDropdown(null);
//                                   setMobileMenuOpen(false);
//                                 }}
//                               >
//                                 {subItem.label}
//                               </Link>
//                             )}
//                           </div>
//                         ))}
//                       </div>
//                     </li>
//                   );
//                 }
//                 return null;
//               })}
//             </ul>
//           </div>
//         </div>

//         {/* Accounts Modal */}
//         <AccountsModal
//           show={showAccountsModal}
//           onClose={() => setShowAccountsModal(false)}
//           onAccountCreated={(accountData) => {
//             console.log('Account created:', accountData);
//           }}
//         />
//       </header>
//     </div>
//   );
// };

// export default Header;