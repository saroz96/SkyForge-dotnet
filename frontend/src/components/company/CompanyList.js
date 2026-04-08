
// import React, { useState, useEffect, useRef } from 'react';
// import { Table, Badge, Button, Spinner, Alert } from 'react-bootstrap';
// import { FaEye } from 'react-icons/fa';
// import { Link, useNavigate } from 'react-router-dom';
// import axios from 'axios';
// import { useDispatch } from 'react-redux';
// import { setCurrentCompany } from '../../auth/authSlice';

// const CompanyList = ({ companies, onCompanyClick, isAdminOrSupervisor }) => {
//   const [selectedIndex, setSelectedIndex] = useState(0);
//   const [loading, setLoading] = useState(false);
//   const [loadingCompanyId, setLoadingCompanyId] = useState(null);
//   const [error, setError] = useState(null);
//   const tableRef = useRef(null);
//   const navigate = useNavigate();
//   const dispatch = useDispatch();

//   useEffect(() => {
//     if (companies.length > 0) {
//       focusRow(0);
//     }
//   }, [companies]);

//   const focusRow = (index) => {
//     setSelectedIndex(index);
//     if (tableRef.current) {
//       const rows = tableRef.current.querySelectorAll('tbody tr');
//       if (rows.length > index) {
//         rows[index].focus();
//       }
//     }
//   };

//   const handleKeyDown = (e, companyId, index) => {
//     if (companies.length === 0) return;

//     switch (e.key) {
//       case 'ArrowUp':
//         e.preventDefault();
//         if (selectedIndex > 0) {
//           focusRow(selectedIndex - 1);
//         }
//         break;
//       case 'ArrowDown':
//         e.preventDefault();
//         if (selectedIndex < companies.length - 1) {
//           focusRow(selectedIndex + 1);
//         }
//         break;
//       case 'Enter':
//         e.preventDefault();
//         handleSwitchCompany(companyId);
//         break;
//       default:
//         break;
//     }
//   };

//     const api = axios.create({
//       baseURL: process.env.REACT_APP_API_BASE_URL,
//       withCredentials: true,
//     });
  
//     // Add Authorization header to all requests
//     api.interceptors.request.use(config => {
//       const token = localStorage.getItem('token');
//       if (token) {
//         config.headers.Authorization = `Bearer ${token}`;
//       }
//       return config;
//     });

//   const handleSwitchCompany = async (companyId) => {
//     // Prevent multiple clicks
//     if (loading) return;

//     setLoadingCompanyId(companyId);
//     setLoading(true);
//     setError(null);

//     try {
//         const token = localStorage.getItem('token');
//         console.log('Switching to company:', companyId, 'with token:', token ? 'exists' : 'missing');

//         const response = await api.get(`/api/companies/switch/${companyId}`, {
//             headers: {
//                 'Authorization': `Bearer ${token}`
//             }
//         });

//         if (response.data.success) {
//             const { token: newToken, sessionData, redirectPath } = response.data.data;

//             console.log('Switch company response:', {
//                 hasNewToken: !!newToken,
//                 sessionData,
//                 redirectPath
//             });

//             // ⭐️ CRITICAL: Update the JWT token if returned ⭐️
//             if (newToken) {
//                 console.log('Updating JWT token after company switch');
//                 localStorage.setItem('token', newToken);
                
//                 // Update axios default headers for future requests
//                 axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
                
//                 // Also update your api instance headers
//                 api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
//             } else {
//                 console.warn('No new token returned from switch company API');
//             }

//             // Clear caches
//             localStorage.removeItem('cachedUserCompanies');
//             localStorage.removeItem('cachedUserCompaniesTimestamp');

//             // Store in session storage (for backward compatibility)
//             sessionStorage.setItem('currentCompany', JSON.stringify(sessionData.company));
//             sessionStorage.setItem('currentFiscalYear', JSON.stringify(sessionData.fiscalYear));

//             // Store in local storage for persistence
//             localStorage.setItem('currentCompanyId', companyId.toString());
//             localStorage.setItem('currentCompany', JSON.stringify({
//                 company: sessionData.company,
//                 fiscalYear: sessionData.fiscalYear
//             }));

//             // ⭐️ IMPORTANT: Update Redux store ⭐️
//             dispatch(setCurrentCompany({
//                 company: sessionData.company,
//                 fiscalYear: sessionData.fiscalYear
//             }));

//             // Log for debugging
//             console.log('Company switch successful. Stored data:', {
//                 companyId: companyId,
//                 companyName: sessionData.company.name,
//                 tradeType: sessionData.company.tradeType,
//                 hasToken: !!localStorage.getItem('token')
//             });

//             // Navigate to the appropriate dashboard
//             if (redirectPath) {
//                 console.log('Redirecting to:', redirectPath);
//                 navigate(redirectPath);
//             } else {
//                 // Default redirect based on trade type
//                 const tradeType = sessionData.company.tradeType;
//                 let defaultPath = '/dashboard';
                
//                 if (tradeType === 'Retailer') {
//                     defaultPath = '/retailerDashboard/indexv1';
//                 } else if (tradeType === 'Pharmacy') {
//                     defaultPath = '/pharmacy/dashboard';
//                 }
                
//                 console.log('No redirect path provided, using default:', defaultPath);
//                 navigate(defaultPath);
//             }

//             // Force a small delay and refresh to ensure token is applied
//             setTimeout(() => {
//                 window.location.reload();
//             }, 500);

//         } else {
//             setError(response.data.message || 'Failed to switch company');
//         }
//     } catch (err) {
//         console.error('Error switching company:', err);

//         // Detailed error logging
//         if (err.response) {
//             console.error('Response error details:', {
//                 status: err.response.status,
//                 data: err.response.data,
//                 headers: err.response.headers
//             });

//             if (err.response.status === 401) {
//                 // Token expired or invalid
//                 console.log('Token invalid, clearing storage and redirecting to login');
//                 localStorage.removeItem('token');
//                 localStorage.removeItem('userInfo');
//                 localStorage.removeItem('currentCompany');
//                 localStorage.removeItem('currentCompanyId');
//                 localStorage.removeItem('userCompanies');
//                 navigate('/auth/login');
//                 return;
//             } else if (err.response.status === 403) {
//                 setError('You do not have access to this company');
//             } else if (err.response.status === 404) {
//                 setError('Company not found');
//             } else if (err.response.status === 400) {
//                 setError(err.response.data?.message || 'Company setup incomplete');
//             } else {
//                 setError(err.response.data?.message || `Server error: ${err.response.status}`);
//             }
//         } else if (err.request) {
//             console.error('Request error:', err.request);
//             setError('Network error. Please check your connection.');
//         } else {
//             console.error('Error:', err.message);
//             setError('An unexpected error occurred: ' + err.message);
//         }
//     } finally {
//         setLoading(false);
//         setLoadingCompanyId(null);
//     }
// };

//   if (companies.length === 0) {
//     return (
//       <div className="text-center py-3" style={{ minHeight: '150px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
//         <i className="fas fa-building fa-2x text-muted mb-2"></i>
//         <h5 className="mb-1" style={{ fontSize: '1rem' }}>No Companies Available</h5>
//         <p className="text-muted mb-2" style={{ fontSize: '0.85rem' }}>
//           {isAdminOrSupervisor
//             ? "Create your first company to get started."
//             : "You haven't been added to any companies yet."}
//         </p>
//         {isAdminOrSupervisor && (
//           <Button
//             as={Link}
//             to="/company/new"
//             variant="primary"
//             size="sm"
//             className="mt-1"
//             style={{ padding: '4px 12px', fontSize: '0.85rem' }}
//           >
//             <i className="fas fa-plus-circle me-1"></i>Create Company
//           </Button>
//         )}
//       </div>
//     );
//   }

//   return (
//     <>
//       {error && (
//         <Alert variant="danger" dismissible onClose={() => setError(null)}>
//           {error}
//         </Alert>
//       )}

//       <div
//         className="table-responsive"
//         ref={tableRef}
//         style={{
//           maxHeight: '320px',
//           overflowY: 'auto',
//           border: '1px solid #dee2e6',
//           borderRadius: '4px'
//         }}
//       >
//         <Table hover size="sm" className="mb-0" style={{ marginBottom: '0' }}>
//           <thead className="sticky-top" style={{
//             backgroundColor: '#f8f9fa',
//             boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
//           }}>
//             <tr>
//               <th style={{
//                 width: '5%',
//                 padding: '6px 8px',
//                 fontSize: '0.85rem',
//                 fontWeight: '600',
//                 borderBottom: '2px solid #dee2e6'
//               }}>#</th>
//               <th style={{
//                 width: '35%',
//                 padding: '6px 8px',
//                 fontSize: '0.85rem',
//                 fontWeight: '600',
//                 borderBottom: '2px solid #dee2e6'
//               }}>Company Name</th>
//               <th style={{
//                 width: '20%',
//                 padding: '6px 8px',
//                 fontSize: '0.85rem',
//                 fontWeight: '600',
//                 borderBottom: '2px solid #dee2e6'
//               }}>Trade Type</th>
//               <th style={{
//                 width: '20%',
//                 padding: '6px 8px',
//                 fontSize: '0.85rem',
//                 fontWeight: '600',
//                 borderBottom: '2px solid #dee2e6'
//               }}>Date Format</th>
//               <th style={{
//                 width: '20%',
//                 padding: '6px 8px',
//                 fontSize: '0.85rem',
//                 fontWeight: '600',
//                 borderBottom: '2px solid #dee2e6'
//               }} className="text-end">Actions</th>
//             </tr>
//           </thead>
//           <tbody>
//             {companies.map((company, index) => {
//               const companyId = company.id || company.Id;
//               const isThisCompanyLoading = loading && loadingCompanyId === companyId;

//               return (
//                 <tr
//                   key={companyId}
//                   tabIndex={0}
//                   className={selectedIndex === index ? 'table-active' : ''}
//                   onKeyDown={(e) => handleKeyDown(e, companyId, index)}
//                   onClick={() => {
//                     setSelectedIndex(index);
//                   }}
//                   style={{
//                     cursor: 'pointer',
//                     height: '36px'
//                   }}
//                 >
//                   <td style={{
//                     padding: '4px 8px',
//                     verticalAlign: 'middle',
//                     fontSize: '0.85rem'
//                   }}>{index + 1}</td>
//                   <td style={{
//                     padding: '4px 8px',
//                     verticalAlign: 'middle'
//                   }}>
//                     <strong style={{ fontSize: '0.9rem' }}>
//                       {company.name || company.Name || 'Unnamed Company'}
//                     </strong>
//                   </td>
//                   <td style={{
//                     padding: '4px 8px',
//                     verticalAlign: 'middle'
//                   }}>
//                     <Badge
//                       bg="primary"
//                       className="px-2 py-1"
//                       style={{
//                         fontSize: '0.75rem',
//                         fontWeight: '500'
//                       }}
//                     >
//                       {company.tradeType || company.TradeType || 'Unknown'}
//                     </Badge>
//                   </td>
//                   <td style={{
//                     padding: '4px 8px',
//                     verticalAlign: 'middle'
//                   }}>
//                     <Badge
//                       bg="info"
//                       text="dark"
//                       className="px-2 py-1"
//                       style={{
//                         fontSize: '0.75rem',
//                         fontWeight: '500'
//                       }}
//                     >
//                       {(company.dateFormat || company.DateFormat || 'English')
//                         .charAt(0)
//                         .toUpperCase() +
//                         (company.dateFormat || company.DateFormat || 'English')
//                           .slice(1)}
//                     </Badge>
//                   </td>
//                   <td style={{
//                     padding: '4px 8px',
//                     verticalAlign: 'middle'
//                   }} className="text-end">
//                     <div className="d-flex justify-content-end gap-1">
//                       <Button
//                         variant="primary"
//                         size="sm"
//                         className="py-0 px-2"
//                         onClick={(e) => {
//                           e.stopPropagation();
//                           handleSwitchCompany(companyId);
//                         }}
//                         disabled={loading}
//                         style={{
//                           fontSize: '0.8rem',
//                           height: '26px',
//                           display: 'flex',
//                           alignItems: 'center',
//                           minWidth: '70px',
//                           justifyContent: 'center'
//                         }}
//                       >
//                         {isThisCompanyLoading ? (
//                           <Spinner
//                             animation="border"
//                             size="sm"
//                             className="me-1"
//                             style={{ width: '12px', height: '12px' }}
//                           />
//                         ) : (
//                           <>
//                             <i className="fas fa-door-open me-1" style={{ fontSize: '0.75rem' }}></i>
//                             <span>Open</span>
//                           </>
//                         )}
//                       </Button>
//                       <Button
//                         as={Link}
//                         to={`/company/${companyId}`}
//                         variant="outline-info"
//                         size="sm"
//                         className="py-0 px-2"
//                         onClick={(e) => e.stopPropagation()}
//                         style={{
//                           width: '26px',
//                           height: '26px',
//                           display: 'flex',
//                           alignItems: 'center',
//                           justifyContent: 'center',
//                           padding: '0'
//                         }}
//                       >
//                         <FaEye style={{ fontSize: '0.8rem' }} />
//                       </Button>
//                     </div>
//                   </td>
//                 </tr>
//               );
//             })}
//           </tbody>
//         </Table>
//       </div>
//     </>
//   );
// };

// export default CompanyList;

//------------------------------------------------------end

import React, { useState, useEffect, useRef } from 'react';
import { Table, Badge, Button, Spinner, Alert } from 'react-bootstrap';
import { FaEye } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useDispatch } from 'react-redux';
import { setCurrentCompany } from '../../auth/authSlice';
import { useLoading } from '../../context/LoadingContext'; // Import the loading hook

const CompanyList = ({ companies, onCompanyClick, isAdminOrSupervisor }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loadingCompanyId, setLoadingCompanyId] = useState(null);
  const [error, setError] = useState(null);
  const tableRef = useRef(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  // Use the loading context
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

  // Add Authorization header to all requests
  api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  const handleSwitchCompany = async (companyId) => {
    // Prevent multiple clicks
    if (loadingCompanyId) return;

    setLoadingCompanyId(companyId);
    setError(null);
    
    // Show the YouTube-style progress bar
    showLoading(5000); // Expect switch to take ~5 seconds

    try {
      const token = localStorage.getItem('token');
      console.log('Switching to company:', companyId, 'with token:', token ? 'exists' : 'missing');

      // Update progress to 30% - Request sent
      updateProgress(30);
      
      const response = await api.get(`/api/companies/switch/${companyId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Update progress to 70% - Response received
      updateProgress(70);

      if (response.data.success) {
        const { token: newToken, sessionData, redirectPath } = response.data.data;

        console.log('Switch company response:', {
          hasNewToken: !!newToken,
          sessionData,
          redirectPath
        });

        // Update progress to 85% - Processing response
        updateProgress(85);

        // ⭐️ CRITICAL: Update the JWT token if returned ⭐️
        if (newToken) {
          console.log('Updating JWT token after company switch');
          localStorage.setItem('token', newToken);
          
          // Update axios default headers for future requests
          axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
          
          // Also update your api instance headers
          api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        } else {
          console.warn('No new token returned from switch company API');
        }

        // Clear caches
        localStorage.removeItem('cachedUserCompanies');
        localStorage.removeItem('cachedUserCompaniesTimestamp');

        // Store in session storage (for backward compatibility)
        sessionStorage.setItem('currentCompany', JSON.stringify(sessionData.company));
        sessionStorage.setItem('currentFiscalYear', JSON.stringify(sessionData.fiscalYear));

        // Store in local storage for persistence
        localStorage.setItem('currentCompanyId', companyId.toString());
        localStorage.setItem('currentCompany', JSON.stringify({
          company: sessionData.company,
          fiscalYear: sessionData.fiscalYear
        }));

        // ⭐️ IMPORTANT: Update Redux store ⭐️
        dispatch(setCurrentCompany({
          company: sessionData.company,
          fiscalYear: sessionData.fiscalYear
        }));

        // Update progress to 95% - Almost done
        updateProgress(95);

        // Log for debugging
        console.log('Company switch successful. Stored data:', {
          companyId: companyId,
          companyName: sessionData.company.name,
          tradeType: sessionData.company.tradeType,
          hasToken: !!localStorage.getItem('token')
        });

        // Update progress to 100% - Complete
        updateProgress(100);

        // Navigate to the appropriate dashboard
        if (redirectPath) {
          console.log('Redirecting to:', redirectPath);
          // Small delay to show 100% before redirect
          setTimeout(() => {
            hideLoading();
            navigate(redirectPath);
          }, 300);
        } else {
          // Default redirect based on trade type
          const tradeType = sessionData.company.tradeType;
          let defaultPath = '/dashboard';
          
          if (tradeType === 'Retailer') {
            defaultPath = '/retailerDashboard/indexv1';
          } else if (tradeType === 'Pharmacy') {
            defaultPath = '/pharmacy/dashboard';
          }
          
          console.log('No redirect path provided, using default:', defaultPath);
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

      // Detailed error logging
      if (err.response) {
        console.error('Response error details:', {
          status: err.response.status,
          data: err.response.data,
          headers: err.response.headers
        });

        if (err.response.status === 401) {
          // Token expired or invalid
          console.log('Token invalid, clearing storage and redirecting to login');
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
        console.error('Request error:', err.request);
        setError('Network error. Please check your connection.');
      } else {
        console.error('Error:', err.message);
        setError('An unexpected error occurred: ' + err.message);
      }
    } finally {
      setLoadingCompanyId(null);
    }
  };

  if (companies.length === 0) {
    return (
      <div className="text-center py-3" style={{ minHeight: '150px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
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
    <>
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <div
        className="table-responsive"
        ref={tableRef}
        style={{
          maxHeight: '320px',
          overflowY: 'auto',
          border: '1px solid #dee2e6',
          borderRadius: '4px'
        }}
      >
        <Table hover size="sm" className="mb-0" style={{ marginBottom: '0' }}>
          <thead className="sticky-top" style={{
            backgroundColor: '#f8f9fa',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}>
            <tr>
              <th style={{
                width: '5%',
                padding: '6px 8px',
                fontSize: '0.85rem',
                fontWeight: '600',
                borderBottom: '2px solid #dee2e6'
              }}>#</th>
              <th style={{
                width: '35%',
                padding: '6px 8px',
                fontSize: '0.85rem',
                fontWeight: '600',
                borderBottom: '2px solid #dee2e6'
              }}>Company Name</th>
              <th style={{
                width: '20%',
                padding: '6px 8px',
                fontSize: '0.85rem',
                fontWeight: '600',
                borderBottom: '2px solid #dee2e6'
              }}>Trade Type</th>
              <th style={{
                width: '20%',
                padding: '6px 8px',
                fontSize: '0.85rem',
                fontWeight: '600',
                borderBottom: '2px solid #dee2e6'
              }}>Date Format</th>
              <th style={{
                width: '20%',
                padding: '6px 8px',
                fontSize: '0.85rem',
                fontWeight: '600',
                borderBottom: '2px solid #dee2e6'
              }} className="text-end">Actions</th>
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
                    height: '36px'
                  }}
                >
                  <td style={{
                    padding: '4px 8px',
                    verticalAlign: 'middle',
                    fontSize: '0.85rem'
                  }}>{index + 1}</td>
                  <td style={{
                    padding: '4px 8px',
                    verticalAlign: 'middle'
                  }}>
                    <strong style={{ fontSize: '0.9rem' }}>
                      {company.name || company.Name || 'Unnamed Company'}
                    </strong>
                  </td>
                  <td style={{
                    padding: '4px 8px',
                    verticalAlign: 'middle'
                  }}>
                    <Badge
                      bg="primary"
                      className="px-2 py-1"
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: '500'
                      }}
                    >
                      {company.tradeType || company.TradeType || 'Unknown'}
                    </Badge>
                  </td>
                  <td style={{
                    padding: '4px 8px',
                    verticalAlign: 'middle'
                  }}>
                    <Badge
                      bg="info"
                      text="dark"
                      className="px-2 py-1"
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: '500'
                      }}
                    >
                      {(company.dateFormat || company.DateFormat || 'English')
                        .charAt(0)
                        .toUpperCase() +
                        (company.dateFormat || company.DateFormat || 'English')
                          .slice(1)}
                    </Badge>
                  </td>
                  <td style={{
                    padding: '4px 8px',
                    verticalAlign: 'middle'
                  }} className="text-end">
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
                        style={{
                          fontSize: '0.8rem',
                          height: '26px',
                          display: 'flex',
                          alignItems: 'center',
                          minWidth: '70px',
                          justifyContent: 'center'
                        }}
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
                        style={{
                          width: '26px',
                          height: '26px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0'
                        }}
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
    </>
  );
};

export default CompanyList;