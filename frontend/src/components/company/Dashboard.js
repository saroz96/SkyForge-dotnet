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
  const [hasFetchedCompanies, setHasFetchedCompanies] = useState(false);

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

  // ✅ FIX: Fetch companies only once when component mounts
  useEffect(() => {
    const fetchData = async () => {
      // Check if we already have companies in Redux or localStorage
      if (userCompanies && userCompanies.length > 0) {
        console.log('Using existing companies from Redux');
        setFilteredCompanies(userCompanies);
        setHasFetchedCompanies(true);
        return;
      }

      // Check localStorage for cached companies
      const cachedCompanies = localStorage.getItem('cachedUserCompanies');
      if (cachedCompanies) {
        try {
          const parsedCompanies = JSON.parse(cachedCompanies);
          console.log('Using cached companies from localStorage');
          dispatch(setUserCompanies(parsedCompanies));
          setFilteredCompanies(parsedCompanies);
          setHasFetchedCompanies(true);
        } catch (e) {
          console.error('Error parsing cached companies:', e);
        }
      }

      // Only fetch from API if we haven't fetched yet
      if (!hasFetchedCompanies) {
        await fetchUserCompanies();
      }
    };

    fetchData();
  }, []); // Empty dependency array - runs only once on mount

  const fetchUserCompanies = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Fetching companies from API...');
      
      // Fetch companies from API
      const response = await api.get('/api/Companies/user-companies');
      const companies = response.data || [];

      console.log('Companies fetched:', companies.length);

      // Update Redux store with fetched companies
      dispatch(setUserCompanies(companies));

      // Initialize filtered companies
      setFilteredCompanies(companies);

      // Cache in localStorage with timestamp
      localStorage.setItem('cachedUserCompanies', JSON.stringify(companies));
      localStorage.setItem('cachedUserCompaniesTimestamp', Date.now().toString());

      setHasFetchedCompanies(true);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching companies:', err);
      setError(err.response?.data?.message || 'Failed to load companies');
      setLoading(false);
      
      // If unauthorized, redirect to login
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('cachedUserCompanies');
        localStorage.removeItem('cachedUserCompaniesTimestamp');
        navigate('/auth/login');
      }
    }
  }, [api, dispatch, navigate]);

  // Sync filteredCompanies with Redux when userCompanies changes
  useEffect(() => {
    if (userCompanies && userCompanies.length > 0) {
      setFilteredCompanies(userCompanies);
    }
  }, [userCompanies]);

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

  // Add a refresh button handler
  const handleRefresh = async () => {
    console.log('Manual refresh triggered');
    localStorage.removeItem('cachedUserCompanies');
    localStorage.removeItem('cachedUserCompaniesTimestamp');
    setHasFetchedCompanies(false);
    await fetchUserCompanies();
  };

  // Check cache age and refresh if too old (optional)
  useEffect(() => {
    const checkCacheAge = () => {
      const timestamp = localStorage.getItem('cachedUserCompaniesTimestamp');
      if (timestamp) {
        const age = Date.now() - parseInt(timestamp);
        const FIVE_MINUTES = 5 * 60 * 1000;
        
        if (age > FIVE_MINUTES) {
          console.log('Cache is stale, refreshing...');
          localStorage.removeItem('cachedUserCompanies');
          localStorage.removeItem('cachedUserCompaniesTimestamp');
          if (!loading) {
            fetchUserCompanies();
          }
        }
      }
    };

    // Check cache age every minute
    const interval = setInterval(checkCacheAge, 60000);
    return () => clearInterval(interval);
  }, [fetchUserCompanies, loading]);

  if (loading && !hasFetchedCompanies) {
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
                  {hasFetchedCompanies && (
                    <button 
                      className="btn btn-sm btn-outline-secondary"
                      onClick={handleRefresh}
                      disabled={loading}
                      style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                    >
                      <i className="fas fa-sync-alt"></i>
                    </button>
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