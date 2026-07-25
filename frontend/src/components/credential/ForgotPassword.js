// import React, { useState } from 'react';
// import { useNavigate, Link } from 'react-router-dom';
// import axios from 'axios';
// import { FaEnvelope, FaArrowLeft, FaPaperPlane } from 'react-icons/fa';
// import NotificationToast from '../NotificationToast';
// import Skeleton from 'react-loading-skeleton';
// import 'react-loading-skeleton/dist/skeleton.css';

// const ForgotPassword = () => {
//   const [email, setEmail] = useState('');
//   const [loading, setLoading] = useState(false);
//   const [submitted, setSubmitted] = useState(false);
//   const [notification, setNotification] = useState({
//     show: false,
//     message: '',
//     type: 'success',
//     duration: 3000
//   });
//   const navigate = useNavigate();

//   const api = axios.create({
//     baseURL: process.env.REACT_APP_API_BASE_URL,
//     withCredentials: true,
//   });

//   // Add authorization header to all requests (optional for this endpoint)
//   api.interceptors.request.use(
//     (config) => {
//       const token = localStorage.getItem('token');
//       if (token) {
//         config.headers.Authorization = `Bearer ${token}`;
//       }
//       return config;
//     },
//     (error) => {
//       return Promise.reject(error);
//     }
//   );

//   const handleSubmit = async (e) => {
//     e.preventDefault();
    
//     // Basic validation
//     if (!email) {
//       setNotification({
//         show: true,
//         message: 'Please enter your email address',
//         type: 'error',
//         duration: 3000
//       });
//       return;
//     }

//     // Email format validation
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     if (!emailRegex.test(email)) {
//       setNotification({
//         show: true,
//         message: 'Please enter a valid email address',
//         type: 'error',
//         duration: 3000
//       });
//       return;
//     }

//     setLoading(true);

//     try {
//       const response = await api.post('/api/user/forgot-password', { email });

//       if (response.data.success) {
//         setSubmitted(true);
//         setNotification({
//           show: true,
//           message: response.data.message || 'Password reset link sent to your email!',
//           type: 'success',
//           duration: 5000
//         });
//       } else {
//         setNotification({
//           show: true,
//           message: response.data.message || 'Failed to send reset link',
//           type: 'error',
//           duration: 3000
//         });
//       }
//     } catch (err) {
//       console.error('Forgot password error:', err);
      
//       // Handle different error responses
//       let errorMessage = 'Error processing your request. Please try again later.';
      
//       if (err.response?.data?.message) {
//         errorMessage = err.response.data.message;
//       } else if (err.response?.data?.error) {
//         errorMessage = err.response.data.error;
//       } else if (err.response?.data?.errors) {
//         errorMessage = err.response.data.errors.map(e => e.msg).join(', ');
//       }
      
//       setNotification({
//         show: true,
//         message: errorMessage,
//         type: 'error',
//         duration: 3000
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   if (submitted) {
//     return (
//       <div className='container-fluid'>
//         <div className="container mt-4">
//           <div className="row justify-content-center">
//             <div className="col-lg-6 col-md-8 col-sm-10">
//               <div className="card shadow-sm border-0 mt-4">
//                 <div className="card-header bg-success text-white text-center py-3">
//                   <h4 className="mb-0">Check Your Email</h4>
//                 </div>
//                 <div className="card-body p-4 text-center">
//                   <div className="mb-4">
//                     <FaEnvelope size={48} className="text-success" />
//                   </div>
//                   <h5 className="mb-3">Password Reset Link Sent!</h5>
//                   <p className="text-muted mb-4">
//                     We've sent a password reset link to <strong>{email}</strong>.
//                     Please check your inbox and follow the instructions to reset your password.
//                   </p>
//                   <p className="text-muted small mb-4">
//                     Didn't receive the email? Check your spam folder or try again.
//                   </p>
//                   <div className="d-flex justify-content-center gap-3">
//                     <button
//                       className="btn btn-outline-primary"
//                       onClick={() => {
//                         setSubmitted(false);
//                         setEmail('');
//                       }}
//                     >
//                       Try Again
//                     </button>
//                     <Link to="/auth/login" className="btn btn-primary">
//                       Go to Login
//                     </Link>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//         <NotificationToast
//           show={notification.show}
//           message={notification.message}
//           type={notification.type}
//           duration={notification.duration}
//           onClose={() => setNotification({ ...notification, show: false })}
//         />
//       </div>
//     );
//   }

//   return (
//     <div className='container-fluid'>
//       <div className="container mt-4">
//         <div className="row justify-content-center">
//           <div className="col-lg-6 col-md-8 col-sm-10">
//             <div className="card shadow-sm border-0 mt-4">
//               <div className="card-header bg-primary text-white text-center py-3">
//                 <h4 className="mb-0">Forgot Password</h4>
//                 <p className="mb-0 mt-1 small text-white-50">
//                   Enter your email to receive a reset link
//                 </p>
//               </div>
//               <div className="card-body p-4">
//                 <form onSubmit={handleSubmit}>
//                   <div className="mb-4">
//                     <label htmlFor="email" className="form-label" style={{ fontSize: '0.85rem' }}>
//                       Email Address <span className="text-danger">*</span>
//                     </label>
//                     <div className="input-group">
//                       <span className="input-group-text bg-white border-end-0">
//                         <FaEnvelope className="text-muted" size={16} />
//                       </span>
//                       <input
//                         type="email"
//                         className="form-control border-start-0"
//                         id="email"
//                         value={email}
//                         onChange={(e) => setEmail(e.target.value)}
//                         required
//                         placeholder="Enter your registered email"
//                         style={{ height: '38px', fontSize: '0.85rem' }}
//                         autoFocus
//                       />
//                     </div>
//                     <div className="form-text text-muted small mt-1">
//                       We'll send a password reset link to this email address.
//                     </div>
//                   </div>

//                   <div className="d-flex justify-content-between align-items-center">
//                     <Link 
//                       to="/auth/login" 
//                       className="btn btn-outline-secondary btn-sm"
//                       style={{ height: '34px', fontSize: '0.8rem', padding: '0 16px' }}
//                     >
//                       <FaArrowLeft className="me-1" size={12} />
//                       Back to Login
//                     </Link>
//                     <button
//                       type="submit"
//                       className="btn btn-primary btn-sm"
//                       disabled={loading}
//                       style={{ height: '34px', fontSize: '0.8rem', padding: '0 20px' }}
//                     >
//                       {loading ? (
//                         <>
//                           <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" style={{ width: '12px', height: '12px' }}></span>
//                           Sending...
//                         </>
//                       ) : (
//                         <>
//                           <FaPaperPlane className="me-1" size={12} />
//                           Send Reset Link
//                         </>
//                       )}
//                     </button>
//                   </div>
//                 </form>

//                 <hr className="my-4" />

//                 <div className="text-center">
//                   <p className="small text-muted mb-0">
//                     Remember your password?{' '}
//                     <Link to="/auth/login" className="text-decoration-none">
//                       Sign In
//                     </Link>
//                   </p>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>

//       <NotificationToast
//         show={notification.show}
//         message={notification.message}
//         type={notification.type}
//         duration={notification.duration}
//         onClose={() => setNotification({ ...notification, show: false })}
//       />
//     </div>
//   );
// };

// export default ForgotPassword;

//-------------------------------------------------------------------end

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { FaEnvelope, FaArrowLeft, FaPaperPlane, FaCheckCircle } from 'react-icons/fa';
import NotificationToast from '../NotificationToast';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [notification, setNotification] = useState({
    show: false,
    message: '',
    type: 'success',
    duration: 3000
  });
  const navigate = useNavigate();

  const api = axios.create({
    baseURL: process.env.REACT_APP_API_BASE_URL,
    withCredentials: true,
  });

  api.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      setNotification({
        show: true,
        message: 'Please enter your email address',
        type: 'error',
        duration: 3000
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setNotification({
        show: true,
        message: 'Please enter a valid email address',
        type: 'error',
        duration: 3000
      });
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/api/user/forgot-password', { email });

      if (response.data.success) {
        setSubmitted(true);
        setNotification({
          show: true,
          message: response.data.message || 'Password reset link sent to your email!',
          type: 'success',
          duration: 5000
        });
      } else {
        setNotification({
          show: true,
          message: response.data.message || 'Failed to send reset link',
          type: 'error',
          duration: 3000
        });
      }
    } catch (err) {
      console.error('Forgot password error:', err);
      
      let errorMessage = 'Error processing your request. Please try again later.';
      
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.response?.data?.errors) {
        errorMessage = err.response.data.errors.map(e => e.msg).join(', ');
      }
      
      setNotification({
        show: true,
        message: errorMessage,
        type: 'error',
        duration: 3000
      });
    } finally {
      setLoading(false);
    }
  };

  // Styles matching the Akaunting-style design
  const styles = {
    container: {
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'stretch',
      backgroundColor: '#f8f9fa',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    },
    heroPanel: {
      flex: '0 0 55%',
      background: 'linear-gradient(145deg, #1e3a5f 0%, #2a4d7a 100%)',
      color: 'white',
      padding: '60px 50px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
    },
    heroTitle: {
      fontSize: '2.8rem',
      fontWeight: '700',
      marginBottom: '0.5rem',
      lineHeight: '1.2',
    },
    heroSubtitle: {
      fontSize: '1.1rem',
      opacity: '0.85',
      marginBottom: '3rem',
      maxWidth: '80%',
    },
    featureGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '25px 40px',
      maxWidth: '90%',
    },
    featureItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '15px',
    },
    featureIcon: {
      fontSize: '1.5rem',
      width: '40px',
      height: '40px',
      background: 'rgba(255,255,255,0.15)',
      borderRadius: '10px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: '0',
    },
    featureText: {
      fontSize: '0.95rem',
      fontWeight: '500',
      lineHeight: '1.3',
    },
    formPanel: {
      flex: '1',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 30px',
      backgroundColor: '#ffffff',
    },
    card: {
      width: '100%',
      maxWidth: '420px',
      padding: '20px 10px',
    },
    cardTitle: {
      fontSize: '1.8rem',
      fontWeight: '700',
      color: '#1a202c',
      marginBottom: '0.5rem',
    },
    cardSubtitle: {
      color: '#718096',
      marginBottom: '2rem',
      fontSize: '0.95rem',
    },
    field: {
      marginBottom: '1.5rem',
    },
    label: {
      display: 'block',
      fontWeight: '500',
      color: '#2d3748',
      fontSize: '0.85rem',
      marginBottom: '0.3rem',
    },
    inputWrapper: {
      position: 'relative',
    },
    inputIcon: {
      position: 'absolute',
      left: '12px',
      top: '50%',
      transform: 'translateY(-50%)',
      color: '#a0aec0',
    },
    input: {
      width: '100%',
      padding: '0.65rem 1rem 0.65rem 2.5rem',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      fontSize: '0.95rem',
      outline: 'none',
      transition: 'all 0.2s',
      backgroundColor: '#fff',
      color: '#2d3748',
      height: '46px',
    },
    inputFocus: {
      borderColor: '#2a4d7a',
      boxShadow: '0 0 0 3px rgba(42, 77, 122, 0.15)',
    },
    inputError: {
      borderColor: '#fc8181',
    },
    helpText: {
      display: 'block',
      marginTop: '6px',
      color: '#718096',
      fontSize: '0.8rem',
    },
    buttonGroup: {
      display: 'flex',
      gap: '12px',
      marginTop: '8px',
    },
    buttonPrimary: {
      flex: 1,
      padding: '0.7rem',
      background: '#2a4d7a',
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      fontSize: '0.95rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s',
      height: '46px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
    },
    buttonPrimaryHover: {
      background: '#1e3a5f',
    },
    buttonOutline: {
      padding: '0.7rem 1.5rem',
      background: 'transparent',
      color: '#4a5568',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      fontSize: '0.95rem',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s',
      height: '46px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      textDecoration: 'none',
    },
    buttonOutlineHover: {
      backgroundColor: '#f7fafc',
      borderColor: '#2a4d7a',
      color: '#2a4d7a',
    },
    divider: {
      margin: '1.5rem 0',
      border: 'none',
      borderTop: '1px solid #e2e8f0',
    },
    footerLink: {
      textAlign: 'center',
      fontSize: '0.9rem',
      color: '#718096',
    },
    footerLinkText: {
      color: '#2a4d7a',
      fontWeight: '600',
      textDecoration: 'none',
    },
    // Success State
    successContainer: {
      textAlign: 'center',
    },
    successIcon: {
      fontSize: '4rem',
      color: '#2ecc71',
      marginBottom: '1rem',
    },
    successTitle: {
      fontSize: '1.5rem',
      fontWeight: '700',
      color: '#1a202c',
      marginBottom: '0.5rem',
    },
    successMessage: {
      color: '#718096',
      marginBottom: '1rem',
      lineHeight: '1.6',
    },
    successEmail: {
      fontWeight: '600',
      color: '#2a4d7a',
    },
    successNote: {
      fontSize: '0.85rem',
      color: '#a0aec0',
      marginBottom: '1.5rem',
    },
    successButtons: {
      display: 'flex',
      gap: '12px',
      justifyContent: 'center',
    },
    // Responsive
    '@media (max-width: 992px)': {
      container: {
        flexDirection: 'column',
      },
      heroPanel: {
        flex: 'none',
        width: '100%',
        padding: '40px 30px',
      },
      heroSubtitle: {
        maxWidth: '100%',
      },
      featureGrid: {
        maxWidth: '100%',
        gap: '15px 25px',
      },
      formPanel: {
        flex: 'none',
        width: '100%',
        padding: '30px 20px',
      },
      card: {
        maxWidth: '100%',
      },
    },
    '@media (max-width: 576px)': {
      heroTitle: {
        fontSize: '2rem',
      },
      featureGrid: {
        gridTemplateColumns: '1fr',
        gap: '12px',
      },
      cardTitle: {
        fontSize: '1.5rem',
      },
      buttonGroup: {
        flexDirection: 'column',
      },
      successButtons: {
        flexDirection: 'column',
      },
    },
  };

  // Success State
  if (submitted) {
    return (
      <div style={styles.container}>
        {/* Left Hero Panel */}
        <div style={styles.heroPanel}>
          <h1 style={styles.heroTitle}>Accounting Management System</h1>
          <p style={styles.heroSubtitle}>Track your finances efficiently</p>
          <div style={styles.featureGrid}>
            <div style={styles.featureItem}>
              <span style={styles.featureIcon}><i className="bi bi-diagram-3"></i></span>
              <span style={styles.featureText}>Double-Entry</span>
            </div>
            <div style={styles.featureItem}>
              <span style={styles.featureIcon}><i className="bi bi-box-seam"></i></span>
              <span style={styles.featureText}>Inventory</span>
            </div>
            <div style={styles.featureItem}>
              <span style={styles.featureIcon}><i className="bi bi-kanban"></i></span>
              <span style={styles.featureText}>Projects</span>
            </div>
            <div style={styles.featureItem}>
              <span style={styles.featureIcon}><i className="bi bi-people"></i></span>
              <span style={styles.featureText}>CRM</span>
            </div>
            <div style={styles.featureItem}>
              <span style={styles.featureIcon}><i className="bi bi-wallet2"></i></span>
              <span style={styles.featureText}>Payroll</span>
            </div>
            <div style={styles.featureItem}>
              <span style={styles.featureIcon}><i className="bi bi-receipt"></i></span>
              <span style={styles.featureText}>Expense Claims</span>
            </div>
          </div>
        </div>

        {/* Right Form Panel - Success State */}
        <div style={styles.formPanel}>
          <div style={styles.card}>
            <div style={styles.successContainer}>
              <div style={styles.successIcon}>
                <FaCheckCircle />
              </div>
              <h2 style={styles.successTitle}>Check Your Email</h2>
              <p style={styles.successMessage}>
                We've sent a password reset link to{' '}
                <span style={styles.successEmail}>{email}</span>
              </p>
              <p style={styles.successMessage}>
                Please check your inbox and follow the instructions to reset your password.
              </p>
              <p style={styles.successNote}>
                <i className="bi bi-info-circle me-1"></i>
                Didn't receive the email? Check your spam folder or try again.
              </p>
              <div style={styles.successButtons}>
                <button
                  className="btn btn-outline-primary"
                  onClick={() => {
                    setSubmitted(false);
                    setEmail('');
                  }}
                  style={{
                    padding: '0.7rem 1.5rem',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    fontWeight: '500',
                    border: '1px solid #2a4d7a',
                    color: '#2a4d7a',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#2a4d7a';
                    e.target.style.color = '#ffffff';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.color = '#2a4d7a';
                  }}
                >
                  <FaArrowLeft className="me-2" />
                  Try Again
                </button>
                <Link
                  to="/auth/login"
                  style={{
                    padding: '0.7rem 1.5rem',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    backgroundColor: '#2a4d7a',
                    color: '#ffffff',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#1e3a5f';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#2a4d7a';
                  }}
                >
                  Go to Login
                  <i className="bi bi-arrow-right"></i>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <NotificationToast
          show={notification.show}
          message={notification.message}
          type={notification.type}
          duration={notification.duration}
          onClose={() => setNotification({ ...notification, show: false })}
        />
      </div>
    );
  }

  // Form State
  return (
    <div style={styles.container}>
      {/* Left Hero Panel */}
      <div style={styles.heroPanel}>
        <h1 style={styles.heroTitle}>Accounting Management System</h1>
        <p style={styles.heroSubtitle}>Track your finances efficiently</p>
        <div style={styles.featureGrid}>
          <div style={styles.featureItem}>
            <span style={styles.featureIcon}><i className="bi bi-diagram-3"></i></span>
            <span style={styles.featureText}>Double-Entry</span>
          </div>
          <div style={styles.featureItem}>
            <span style={styles.featureIcon}><i className="bi bi-box-seam"></i></span>
            <span style={styles.featureText}>Inventory</span>
          </div>
          <div style={styles.featureItem}>
            <span style={styles.featureIcon}><i className="bi bi-kanban"></i></span>
            <span style={styles.featureText}>Projects</span>
          </div>
          <div style={styles.featureItem}>
            <span style={styles.featureIcon}><i className="bi bi-people"></i></span>
            <span style={styles.featureText}>CRM</span>
          </div>
          <div style={styles.featureItem}>
            <span style={styles.featureIcon}><i className="bi bi-wallet2"></i></span>
            <span style={styles.featureText}>Payroll</span>
          </div>
          <div style={styles.featureItem}>
            <span style={styles.featureIcon}><i className="bi bi-receipt"></i></span>
            <span style={styles.featureText}>Expense Claims</span>
          </div>
        </div>
      </div>

      {/* Right Form Panel */}
      <div style={styles.formPanel}>
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Forgot Password</h2>
          <p style={styles.cardSubtitle}>
            Enter your email to receive a reset link
          </p>

          <form onSubmit={handleSubmit}>
            <div style={styles.field}>
              <label htmlFor="email" style={styles.label}>
                Email Address <span style={{ color: '#e53e3e' }}>*</span>
              </label>
              <div style={styles.inputWrapper}>
                <span style={styles.inputIcon}>
                  <FaEnvelope size={16} />
                </span>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your registered email"
                  style={{
                    ...styles.input,
                    ...(notification.type === 'error' && notification.show ? styles.inputError : {}),
                  }}
                  onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e2e8f0';
                    e.target.style.boxShadow = 'none';
                  }}
                  autoFocus
                  required
                />
              </div>
              <span style={styles.helpText}>
                <i className="bi bi-info-circle me-1"></i>
                We'll send a password reset link to this email address.
              </span>
            </div>

            <div style={styles.buttonGroup}>
              <Link
                to="/auth/login"
                style={styles.buttonOutline}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = styles.buttonOutlineHover.backgroundColor;
                  e.target.style.borderColor = styles.buttonOutlineHover.borderColor;
                  e.target.style.color = styles.buttonOutlineHover.color;
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.color = '#4a5568';
                }}
              >
                <FaArrowLeft size={14} />
                Back
              </Link>
              <button
                type="submit"
                style={styles.buttonPrimary}
                disabled={loading}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.target.style.background = styles.buttonPrimaryHover.background;
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = styles.buttonPrimary.background;
                }}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" style={{ width: '16px', height: '16px' }}></span>
                    Sending...
                  </>
                ) : (
                  <>
                    <FaPaperPlane size={14} />
                    Send Reset Link
                  </>
                )}
              </button>
            </div>
          </form>

          <hr style={styles.divider} />

          <div style={styles.footerLink}>
            Remember your password?{' '}
            <Link to="/auth/login" style={styles.footerLinkText}>
              Sign In
            </Link>
          </div>
        </div>
      </div>

      <NotificationToast
        show={notification.show}
        message={notification.message}
        type={notification.type}
        duration={notification.duration}
        onClose={() => setNotification({ ...notification, show: false })}
      />

      <style>{`
        a:hover {
          text-decoration: none !important;
        }
        @media (max-width: 992px) {
          .bi { font-size: 1.2rem; }
        }
      `}</style>
    </div>
  );
};

export default ForgotPassword;