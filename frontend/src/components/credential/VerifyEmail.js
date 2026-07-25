// import React, { useState, useEffect } from 'react';
// import { useNavigate, useSearchParams } from 'react-router-dom';
// import axios from 'axios';
// import { Container, Alert, Spinner, Button } from 'react-bootstrap';

// const VerifyEmail = () => {
//   const [searchParams] = useSearchParams();
//   const token = searchParams.get('token');
//   const navigate = useNavigate();
//   const [loading, setLoading] = useState(true);
//   const [message, setMessage] = useState('');
//   const [error, setError] = useState('');
//   const [isVerified, setIsVerified] = useState(false);

//   const api = axios.create({
//     baseURL: process.env.REACT_APP_API_BASE_URL,
//     withCredentials: true,
//   });

//   useEffect(() => {
//     const verifyEmail = async () => {
//       if (!token) {
//         setError('Verification token is missing. Please check your email link.');
//         setLoading(false);
//         return;
//       }

//       try {
//         const response = await api.get(`/api/user/verify-email?token=${encodeURIComponent(token)}`);
        
//         // Now this returns JSON instead of HTML
//         if (response.data.success) {
//           setMessage(response.data.message || 'Email successfully verified! You can now log in.');
//           setIsVerified(true);
//         } else {
//           setError(response.data.message || 'Email verification failed');
//         }
//       } catch (err) {
//         console.error('Verification error:', err);
//         setError(err.response?.data?.message || 'Error verifying email. Please try again.');
//       } finally {
//         setLoading(false);
//       }
//     };

//     verifyEmail();
//   }, [token]);

//   const handleLoginRedirect = () => {
//     navigate('/auth/login');
//   };

//   const handleResendVerification = () => {
//     navigate('/auth/resend-verification');
//   };

//   return (
//     <Container className="mt-5">
//       <div className="text-center">
//         <h2>Email Verification</h2>
        
//         {loading && (
//           <div className="my-4">
//             <Spinner animation="border" role="status" />
//             <p className="mt-2">Verifying your email...</p>
//           </div>
//         )}

//         {message && (
//           <div className="mt-4">
//             <Alert variant="success">
//               <h4 className="alert-heading">Success!</h4>
//               <p>{message}</p>
//             </Alert>
//             {isVerified && (
//               <Button 
//                 variant="primary" 
//                 onClick={handleLoginRedirect}
//                 className="mt-3"
//               >
//                 Go to Login
//               </Button>
//             )}
//           </div>
//         )}

//         {error && (
//           <div className="mt-4">
//             <Alert variant="danger">
//               <h4 className="alert-heading">Verification Failed</h4>
//               <p>{error}</p>
//               <hr />
//               <p className="mb-0">
//                 The verification link may have expired or been used already.
//                 You can request a new verification email.
//               </p>
//             </Alert>
//             <Button 
//               variant="primary" 
//               onClick={handleResendVerification}
//               className="mt-3"
//             >
//               Resend Verification Email
//             </Button>
//             <Button 
//               variant="outline-secondary" 
//               onClick={handleLoginRedirect}
//               className="mt-3 ms-2"
//             >
//               Back to Login
//             </Button>
//           </div>
//         )}
//       </div>
//     </Container>
//   );
// };

// export default VerifyEmail;

//------------------------------------------------------------end

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { FaCheckCircle, FaExclamationCircle, FaSpinner, FaArrowLeft, FaEnvelope } from 'react-icons/fa';
import { Link } from 'react-router-dom';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isVerified, setIsVerified] = useState(false);

  const api = axios.create({
    baseURL: process.env.REACT_APP_API_BASE_URL,
    withCredentials: true,
  });

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setError('Verification token is missing. Please check your email link.');
        setLoading(false);
        return;
      }

      try {
        const response = await api.get(`/api/user/verify-email?token=${encodeURIComponent(token)}`);
        
        if (response.data.success) {
          setMessage(response.data.message || 'Email successfully verified! You can now log in.');
          setIsVerified(true);
        } else {
          setError(response.data.message || 'Email verification failed');
        }
      } catch (err) {
        console.error('Verification error:', err);
        setError(err.response?.data?.message || 'Error verifying email. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    verifyEmail();
  }, [token]);

  const handleLoginRedirect = () => {
    navigate('/auth/login');
  };

  const handleResendVerification = () => {
    navigate('/auth/resend-verification');
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
      maxWidth: '450px',
      padding: '20px 10px',
    },
    cardTitle: {
      fontSize: '1.8rem',
      fontWeight: '700',
      color: '#1a202c',
      marginBottom: '0.5rem',
      textAlign: 'center',
    },
    cardSubtitle: {
      color: '#718096',
      marginBottom: '2rem',
      fontSize: '0.95rem',
      textAlign: 'center',
    },
    loadingContainer: {
      textAlign: 'center',
      padding: '40px 20px',
    },
    spinner: {
      display: 'inline-block',
      width: '48px',
      height: '48px',
      border: '3px solid #e2e8f0',
      borderTop: '3px solid #2a4d7a',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
    },
    loadingText: {
      marginTop: '16px',
      color: '#718096',
      fontSize: '0.95rem',
    },
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
      color: '#4a5568',
      marginBottom: '1.5rem',
      lineHeight: '1.6',
      fontSize: '0.95rem',
    },
    errorContainer: {
      textAlign: 'center',
    },
    errorIcon: {
      fontSize: '4rem',
      color: '#e53e3e',
      marginBottom: '1rem',
    },
    errorTitle: {
      fontSize: '1.5rem',
      fontWeight: '700',
      color: '#1a202c',
      marginBottom: '0.5rem',
    },
    errorMessage: {
      color: '#4a5568',
      marginBottom: '0.5rem',
      lineHeight: '1.6',
      fontSize: '0.95rem',
    },
    errorNote: {
      color: '#718096',
      fontSize: '0.85rem',
      marginBottom: '1.5rem',
    },
    buttonGroup: {
      display: 'flex',
      gap: '12px',
      justifyContent: 'center',
      flexWrap: 'wrap',
    },
    buttonPrimary: {
      padding: '0.7rem 1.5rem',
      background: '#2a4d7a',
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      fontSize: '0.95rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      textDecoration: 'none',
    },
    buttonPrimaryHover: {
      background: '#1e3a5f',
    },
    buttonOutline: {
      padding: '0.7rem 1.5rem',
      background: 'transparent',
      color: '#2a4d7a',
      border: '1px solid #2a4d7a',
      borderRadius: '8px',
      fontSize: '0.95rem',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      textDecoration: 'none',
    },
    buttonOutlineHover: {
      background: '#2a4d7a',
      color: '#ffffff',
    },
    buttonSecondary: {
      padding: '0.7rem 1.5rem',
      background: 'transparent',
      color: '#4a5568',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      fontSize: '0.95rem',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      textDecoration: 'none',
    },
    buttonSecondaryHover: {
      backgroundColor: '#f7fafc',
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
        alignItems: 'stretch',
      },
    },
  };

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
          <h2 style={styles.cardTitle}>Email Verification</h2>
          <p style={styles.cardSubtitle}>
            {loading ? 'Verifying your email...' : isVerified ? 'Email Verified!' : 'Verification Failed'}
          </p>

          {/* Loading State */}
          {loading && (
            <div style={styles.loadingContainer}>
              <div style={styles.spinner}></div>
              <p style={styles.loadingText}>
                <FaSpinner className="me-2" style={{ animation: 'spin 0.8s linear infinite' }} />
                Please wait while we verify your email...
              </p>
            </div>
          )}

          {/* Success State */}
          {!loading && isVerified && message && (
            <div style={styles.successContainer}>
              <div style={styles.successIcon}>
                <FaCheckCircle />
              </div>
              <h3 style={styles.successTitle}>Email Verified!</h3>
              <p style={styles.successMessage}>{message}</p>
              <div style={styles.buttonGroup}>
                <button
                  onClick={handleLoginRedirect}
                  style={styles.buttonPrimary}
                  onMouseEnter={(e) => {
                    e.target.style.background = styles.buttonPrimaryHover.background;
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = styles.buttonPrimary.background;
                  }}
                >
                  <FaArrowLeft size={14} />
                  Go to Login
                </button>
              </div>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div style={styles.errorContainer}>
              <div style={styles.errorIcon}>
                <FaExclamationCircle />
              </div>
              <h3 style={styles.errorTitle}>Verification Failed</h3>
              <p style={styles.errorMessage}>{error}</p>
              <p style={styles.errorNote}>
                <FaEnvelope className="me-2" />
                The verification link may have expired or been used already.
                You can request a new verification email.
              </p>
              <div style={styles.buttonGroup}>
                <button
                  onClick={handleResendVerification}
                  style={styles.buttonPrimary}
                  onMouseEnter={(e) => {
                    e.target.style.background = styles.buttonPrimaryHover.background;
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = styles.buttonPrimary.background;
                  }}
                >
                  <FaEnvelope size={14} />
                  Resend Verification Email
                </button>
                <button
                  onClick={handleLoginRedirect}
                  style={styles.buttonSecondary}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = styles.buttonSecondaryHover.backgroundColor;
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                  }}
                >
                  <FaArrowLeft size={14} />
                  Back to Login
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
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

export default VerifyEmail;