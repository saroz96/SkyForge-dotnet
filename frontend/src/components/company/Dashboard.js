import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Container, Card, Alert } from 'react-bootstrap';
import DashboardLayout from '../company/DashboardLayout';
import CompanyList from '../company/CompanyList';
import SearchBar from './SearchBar';
import Loader from '../Loader';
import { setCurrentCompany, setUserCompanies } from '../../auth/authSlice';
import axios from 'axios';

const Dashboard = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();

  // ⭐️ Get data from Redux store
  const { userInfo, userCompanies } = useSelector((state) => state.auth);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filteredCompanies, setFilteredCompanies] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const api = axios.create({
    baseURL: process.env.REACT_APP_API_BASE_URL,
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

  // Fetch user companies function
  const fetchUserCompanies = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setIsRefreshing(true);
      setError('');
      
      console.log('Fetching companies from API...');
      
      // Fetch companies from API - NO CACHING
      const response = await api.get('/api/Companies/user-companies');
      const companies = response.data || [];

      console.log('Companies fetched:', companies.length);

      // Update Redux store with fetched companies
      dispatch(setUserCompanies(companies));

      // Initialize filtered companies
      setFilteredCompanies(companies);

      // Clear cache from localStorage to ensure fresh data next time
      localStorage.removeItem('cachedUserCompanies');
      localStorage.removeItem('cachedUserCompaniesTimestamp');

      setIsRefreshing(false);
      if (showLoading) {
        setLoading(false);
      }
      
      return companies;
    } catch (err) {
      console.error('Error fetching companies:', err);
      setError(err.response?.data?.message || 'Failed to load companies');
      setIsRefreshing(false);
      if (showLoading) {
        setLoading(false);
      }
      
      // If unauthorized, redirect to login
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('cachedUserCompanies');
        localStorage.removeItem('cachedUserCompaniesTimestamp');
        navigate('/auth/login');
      }
      
      return [];
    }
  }, [api, dispatch, navigate]);

  // Initial fetch - always fetch fresh data
  useEffect(() => {
    fetchUserCompanies(true);
  }, []); // Empty dependency array - runs only once on mount

  // Listen for company changes via storage events and custom events
  useEffect(() => {
    // Function to handle company changes
    const handleCompanyChange = (event) => {
      console.log('Company change detected, refreshing list...');
      fetchUserCompanies(false); // Fetch without showing full loading
    };

    // Listen for custom events from CompanyForm and other components
    window.addEventListener('companyCreated', handleCompanyChange);
    window.addEventListener('companyDeleted', handleCompanyChange);
    window.addEventListener('companyUpdated', handleCompanyChange);
    
    // Listen for storage events (for cross-tab updates)
    window.addEventListener('storage', (event) => {
      if (event.key === 'companyDataChanged') {
        console.log('Storage event detected company change');
        fetchUserCompanies(false);
      }
    });

    // Check URL params for refresh flag
    const queryParams = new URLSearchParams(location.search);
    if (queryParams.get('refresh') === 'true') {
      console.log('Refresh flag found in URL');
      fetchUserCompanies(false);
      // Clean URL
      navigate(location.pathname, { replace: true });
    }

    return () => {
      window.removeEventListener('companyCreated', handleCompanyChange);
      window.removeEventListener('companyDeleted', handleCompanyChange);
      window.removeEventListener('companyUpdated', handleCompanyChange);
      window.removeEventListener('storage', handleCompanyChange);
    };
  }, [fetchUserCompanies, location, navigate]);

  // Sync filteredCompanies with Redux when userCompanies changes
  useEffect(() => {
    if (userCompanies && userCompanies.length > 0) {
      // Apply current search filter
      if (searchTerm.trim()) {
        const filtered = userCompanies.filter(company =>
          company.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredCompanies(filtered);
      } else {
        setFilteredCompanies(userCompanies);
      }
    } else if (userCompanies && userCompanies.length === 0) {
      setFilteredCompanies([]);
    }
  }, [userCompanies, searchTerm]);

  const handleSearch = (searchTerm) => {
    setSearchTerm(searchTerm);
    if (!searchTerm.trim()) {
      setFilteredCompanies(userCompanies || []);
      return;
    }

    const filtered = (userCompanies || []).filter(company =>
      company.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCompanies(filtered);
  };

  const handleCompanyClick = useCallback(async (companyId) => {
    try {
      setLoading(true);
      setError('');

      // Clear cache before switching
      localStorage.removeItem('cachedUserCompanies');
      localStorage.removeItem('cachedUserCompaniesTimestamp');

      // Call your backend to switch company
      const response = await api.get(`/api/switch/${companyId}`);

      if (response.data.success) {
        // Update Redux store with company info
        dispatch(setCurrentCompany({
          company: response.data.company,
          fiscalYear: response.data.fiscalYear
        }));

        // Store in localStorage for persistence
        localStorage.setItem('currentCompany', JSON.stringify(response.data.company));
        localStorage.setItem('currentCompanyId', companyId.toString());

        // Clear company cache since we're switching companies
        localStorage.removeItem('cachedUserCompanies');
        localStorage.removeItem('cachedUserCompaniesTimestamp');

        // Redirect to the appropriate dashboard
        navigate('/company-dashboard');
      } else {
        setError(response.data.message);
        setLoading(false);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to switch company');
      console.error('Switch company error:', err);
      setLoading(false);
    }
  }, [api, dispatch, navigate]);

  // Manual refresh handler
  const handleRefresh = async () => {
    console.log('Manual refresh triggered');
    await fetchUserCompanies(true);
  };

  // Listen for navigation state (when coming back from create/delete)
  useEffect(() => {
    // Check if we're returning from company creation/deletion
    if (location.state && location.state.shouldRefresh) {
      console.log('Navigation state indicates need to refresh');
      fetchUserCompanies(false);
      // Clear the state to prevent repeated refreshes
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, fetchUserCompanies, navigate]);

  // Polling for changes (optional - every 30 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      // Only poll if the tab is visible to save resources
      if (document.visibilityState === 'visible') {
        console.log('Polling for company changes...');
        fetchUserCompanies(false);
      }
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  }, [fetchUserCompanies]);

  if (loading && !isRefreshing) {
    return <Loader />;
  }

  return (
    <DashboardLayout
      user={userInfo}
      isAdminOrSupervisor={userInfo?.isAdmin || userInfo?.role === 'Supervisor'}
    >
      <Container className="dashboard-container">
        <Card className="dashboard-card">
          <Card.Header style={{ padding: '12px 20px' }}>
            <div className="d-flex justify-content-between align-items-center">
              <div style={{ padding: '0' }}>
                <h3 className="welcome-title mb-1" style={{ fontSize: '1.25rem', fontWeight: '600' }}>
                  Welcome, {userInfo?.name}
                </h3>
                <div className="d-flex align-items-center gap-2">
                  <h2 className="card-title mb-0" style={{ fontSize: '1.1rem', fontWeight: '500' }}>
                    Your Companies
                  </h2>
                  <button 
                    className="btn btn-sm btn-outline-secondary"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                  >
                    <i className={`fas fa-sync-alt ${isRefreshing ? 'fa-spin' : ''}`}></i>
                  </button>
                  {isRefreshing && (
                    <span style={{ fontSize: '0.7rem', color: '#6c757d' }}>Updating...</span>
                  )}
                </div>
              </div>
              <SearchBar onSearch={handleSearch} />
            </div>
          </Card.Header>

          <Card.Body style={{ padding: '16px 20px' }}>
            {error && (
              <Alert variant="danger" dismissible onClose={() => setError('')}>
                <i className="fas fa-exclamation-circle me-2"></i>
                {error}
                <button 
                  className="btn btn-sm btn-outline-danger ms-2"
                  onClick={handleRefresh}
                >
                  Retry
                </button>
              </Alert>
            )}

            <CompanyList
              companies={filteredCompanies}
              onCompanyClick={handleCompanyClick}
              isAdminOrSupervisor={userInfo?.isAdmin || userInfo?.role === 'Supervisor'}
            />
          </Card.Body>
        </Card>
      </Container>
    </DashboardLayout>
  );
};

export default Dashboard;