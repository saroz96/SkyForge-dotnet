import React, { useState, useEffect, useRef } from 'react';
import { Table, Badge, Button, Spinner, Alert } from 'react-bootstrap';
import { FaEye } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useDispatch } from 'react-redux';
import { setCurrentCompany } from '../../auth/authSlice';
import { useLoading } from '../../context/LoadingContext';

const CompanyList = ({ companies, onCompanyClick, isAdminOrSupervisor }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loadingCompanyId, setLoadingCompanyId] = useState(null);
  const [error, setError] = useState(null);
  const tableRef = useRef(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { showLoading, hideLoading, updateProgress } = useLoading();

  useEffect(() => {
    if (companies.length > 0) {
      focusRow(0);
    }
  }, [companies]);

  const focusRow = (index) => {
    setSelectedIndex(index);
    if (tableRef.current) {
      const rows = tableRef.current.querySelectorAll('tbody tr');
      if (rows.length > index) {
        rows[index].focus();
      }
    }
  };

  const handleKeyDown = (e, companyId, index) => {
    if (companies.length === 0) return;

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        if (selectedIndex > 0) {
          focusRow(selectedIndex - 1);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (selectedIndex < companies.length - 1) {
          focusRow(selectedIndex + 1);
        }
        break;
      case 'Enter':
        e.preventDefault();
        handleSwitchCompany(companyId);
        break;
      default:
        break;
    }
  };

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

  const handleSwitchCompany = async (companyId) => {
    if (loadingCompanyId) return;

    setLoadingCompanyId(companyId);
    setError(null);
    showLoading(5000);

    try {
      const token = localStorage.getItem('token');
      console.log('Switching to company:', companyId);

      updateProgress(30);
      
      const response = await api.get(`/api/companies/switch/${companyId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      updateProgress(70);

      if (response.data.success) {
        const { token: newToken, sessionData, redirectPath } = response.data.data;

        updateProgress(85);

        if (newToken) {
          localStorage.setItem('token', newToken);
          axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
          api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        }

        localStorage.removeItem('cachedUserCompanies');
        localStorage.removeItem('cachedUserCompaniesTimestamp');

        sessionStorage.setItem('currentCompany', JSON.stringify(sessionData.company));
        sessionStorage.setItem('currentFiscalYear', JSON.stringify(sessionData.fiscalYear));

        localStorage.setItem('currentCompanyId', companyId.toString());
        localStorage.setItem('currentCompany', JSON.stringify({
          company: sessionData.company,
          fiscalYear: sessionData.fiscalYear
        }));

        dispatch(setCurrentCompany({
          company: sessionData.company,
          fiscalYear: sessionData.fiscalYear
        }));

        updateProgress(95);

        console.log('Company switch successful:', {
          companyId: companyId,
          companyName: sessionData.company.name,
          tradeType: sessionData.company.tradeType,
        });

        updateProgress(100);

        if (redirectPath) {
          setTimeout(() => {
            hideLoading();
            navigate(redirectPath);
          }, 300);
        } else {
          const tradeType = sessionData.company.tradeType;
          let defaultPath = '/dashboard';
          
          if (tradeType === 'Retailer') {
            defaultPath = '/retailerDashboard/indexv1';
          } else if (tradeType === 'Pharmacy') {
            defaultPath = '/pharmacy/dashboard';
          }
          
          setTimeout(() => {
            hideLoading();
            navigate(defaultPath);
          }, 300);
        }

      } else {
        hideLoading();
        setError(response.data.message || 'Failed to switch company');
      }
    } catch (err) {
      console.error('Error switching company:', err);
      hideLoading();

      if (err.response) {
        if (err.response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('userInfo');
          localStorage.removeItem('currentCompany');
          localStorage.removeItem('currentCompanyId');
          localStorage.removeItem('userCompanies');
          navigate('/auth/login');
          return;
        } else if (err.response.status === 403) {
          setError('You do not have access to this company');
        } else if (err.response.status === 404) {
          setError('Company not found');
        } else if (err.response.status === 400) {
          setError(err.response.data?.message || 'Company setup incomplete');
        } else {
          setError(err.response.data?.message || `Server error: ${err.response.status}`);
        }
      } else if (err.request) {
        setError('Network error. Please check your connection.');
      } else {
        setError('An unexpected error occurred: ' + err.message);
      }
    } finally {
      setLoadingCompanyId(null);
    }
  };

  // Styles for CompanyList (no background, just table styling)
  const styles = {
    container: {
      width: '100%',
    },
    error: {
      marginBottom: '12px',
    },
    tableWrapper: {
      maxHeight: '320px',
      overflowY: 'auto',
      border: '1px solid #dee2e6',
      borderRadius: '4px',
      backgroundColor: '#ffffff', // White background for table
    },
    thead: {
      backgroundColor: '#f8f9fa',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
      position: 'sticky',
      top: 0,
      zIndex: 2,
    },
    th: {
      padding: '6px 8px',
      fontSize: '0.85rem',
      fontWeight: '600',
      borderBottom: '2px solid #dee2e6',
    },
    td: {
      padding: '4px 8px',
      verticalAlign: 'middle',
    },
    emptyState: {
      textAlign: 'center',
      padding: '20px',
      minHeight: '150px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#ffffff',
      borderRadius: '8px',
    },
    badge: {
      fontSize: '0.75rem',
      fontWeight: '500',
      padding: '4px 10px',
    },
    button: {
      fontSize: '0.8rem',
      height: '26px',
      display: 'flex',
      alignItems: 'center',
      minWidth: '70px',
      justifyContent: 'center',
    },
    iconButton: {
      width: '26px',
      height: '26px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0',
    },
  };

  if (companies.length === 0) {
    return (
      <div style={styles.emptyState}>
        <i className="fas fa-building fa-2x text-muted mb-2"></i>
        <h5 className="mb-1" style={{ fontSize: '1rem' }}>No Companies Available</h5>
        <p className="text-muted mb-2" style={{ fontSize: '0.85rem' }}>
          {isAdminOrSupervisor
            ? "Create your first company to get started."
            : "You haven't been added to any companies yet."}
        </p>
        {isAdminOrSupervisor && (
          <Button
            as={Link}
            to="/company/new"
            variant="primary"
            size="sm"
            className="mt-1"
            style={{ padding: '4px 12px', fontSize: '0.85rem' }}
          >
            <i className="fas fa-plus-circle me-1"></i>Create Company
          </Button>
        )}
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {error && (
        <Alert 
          variant="danger" 
          dismissible 
          onClose={() => setError(null)}
          style={styles.error}
        >
          {error}
        </Alert>
      )}

      <div style={styles.tableWrapper} ref={tableRef}>
        <Table hover size="sm" className="mb-0" style={{ marginBottom: '0' }}>
          <thead style={styles.thead}>
            <tr>
              <th style={{ ...styles.th, width: '5%' }}>#</th>
              <th style={{ ...styles.th, width: '35%' }}>Company Name</th>
              <th style={{ ...styles.th, width: '20%' }}>Trade Type</th>
              <th style={{ ...styles.th, width: '20%' }}>Date Format</th>
              <th style={{ ...styles.th, width: '20%', textAlign: 'end' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((company, index) => {
              const companyId = company.id || company.Id;
              const isThisCompanyLoading = loadingCompanyId === companyId;

              return (
                <tr
                  key={companyId}
                  tabIndex={0}
                  className={selectedIndex === index ? 'table-active' : ''}
                  onKeyDown={(e) => handleKeyDown(e, companyId, index)}
                  onClick={() => {
                    setSelectedIndex(index);
                  }}
                  style={{
                    cursor: 'pointer',
                    height: '36px',
                    backgroundColor: selectedIndex === index ? 'rgba(102, 126, 234, 0.1)' : 'transparent',
                  }}
                >
                  <td style={styles.td}>{index + 1}</td>
                  <td style={styles.td}>
                    <strong style={{ fontSize: '0.9rem' }}>
                      {company.name || company.Name || 'Unnamed Company'}
                    </strong>
                  </td>
                  <td style={styles.td}>
                    <Badge
                      bg="primary"
                      style={styles.badge}
                    >
                      {company.tradeType || company.TradeType || 'Unknown'}
                    </Badge>
                  </td>
                  <td style={styles.td}>
                    <Badge
                      bg="info"
                      text="dark"
                      style={styles.badge}
                    >
                      {(company.dateFormat || company.DateFormat || 'English')
                        .charAt(0)
                        .toUpperCase() +
                        (company.dateFormat || company.DateFormat || 'English')
                          .slice(1)}
                    </Badge>
                  </td>
                  <td style={{ ...styles.td, textAlign: 'end' }}>
                    <div className="d-flex justify-content-end gap-1">
                      <Button
                        variant="primary"
                        size="sm"
                        className="py-0 px-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSwitchCompany(companyId);
                        }}
                        disabled={!!loadingCompanyId}
                        style={styles.button}
                      >
                        {isThisCompanyLoading ? (
                          <Spinner
                            animation="border"
                            size="sm"
                            className="me-1"
                            style={{ width: '12px', height: '12px' }}
                          />
                        ) : (
                          <>
                            <i className="fas fa-door-open me-1" style={{ fontSize: '0.75rem' }}></i>
                            <span>Open</span>
                          </>
                        )}
                      </Button>
                      <Button
                        as={Link}
                        to={`/company/${companyId}`}
                        variant="outline-info"
                        size="sm"
                        className="py-0 px-2"
                        onClick={(e) => e.stopPropagation()}
                        style={styles.iconButton}
                      >
                        <FaEye style={{ fontSize: '0.8rem' }} />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>
    </div>
  );
};

export default CompanyList;