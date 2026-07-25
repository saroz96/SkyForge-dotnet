// import React from 'react';
// import { Link } from 'react-router-dom';
// import 'bootstrap/dist/css/bootstrap.min.css';
// import 'bootstrap-icons/font/bootstrap-icons.css';

// const WelcomePage = () => {
//   return (
//     <div className="welcome-container">
//       <section className="welcome-section">
//         <div className="container">
//           <div className="row justify-content-center">
//             <div className="col-xl-4 col-lg-5 col-md-6">
//               <div className="welcome-card">
//                 <div className="welcome-header text-center mb-4">
//                   <img
//                     src="/logo/logo.png"
//                     alt="Ams Software Logo"
//                     className="welcome-logo mb-3"
//                     style={{
//                       width: '80px',
//                       height: '80px',
//                       borderRadius: '50%',
//                       objectFit: 'cover'
//                     }}
//                   />
//                   <h1 className="welcome-title">Ams Software</h1>
//                   <p className="welcome-subtitle text-muted">
//                     Get started by creating an account or logging in
//                   </p>
//                 </div>

//                 <div className="welcome-body">
//                   <div className="d-grid gap-3">
//                     <Link
//                       to="/auth/register"
//                       className="btn btn-primary btn-lg py-2"
//                       style={{
//                         fontSize: '1.1rem',
//                         fontWeight: '500'
//                       }}
//                     >
//                       <i className="bi bi-person-plus me-2"></i>
//                       Create Account
//                     </Link>

//                     <Link
//                       to="/auth/login"
//                       className="btn btn-outline-primary btn-lg py-2"
//                       style={{
//                         fontSize: '1.1rem',
//                         fontWeight: '500'
//                       }}
//                     >
//                       <i className="bi bi-box-arrow-in-right me-2"></i>
//                       Sign In
//                     </Link>
//                   </div>

//                   <div className="text-center mt-4 pt-3 border-top">
//                     <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>
//                       Continue to explore Ams Software's features
//                     </p>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       </section>

//       <style jsx>{`
//         .welcome-container {
//           min-height: 100vh;
//           display: flex;
//           align-items: center;
//           justify-content: center;
//           padding: 20px;
//           background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
//           position: relative;
//         }
        
//         .welcome-container::before {
//           content: '';
//           position: absolute;
//           top: 0;
//           left: 0;
//           right: 0;
//           bottom: 0;
//           background-image: url('/logo/background.png');
//           background-size: cover;
//           background-position: center;
//           background-repeat: no-repeat;
//           opacity: 0.1;
//         }
        
//         .welcome-section {
//           position: relative;
//           z-index: 1;
//           width: 100%;
//         }
        
//         .welcome-card {
//           background: rgba(255, 255, 255, 0.95);
//           backdrop-filter: blur(10px);
//           border-radius: 20px;
//           padding: 2.5rem;
//           box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
//           border: 1px solid rgba(255, 255, 255, 0.2);
//           transition: transform 0.3s ease, box-shadow 0.3s ease;
//         }
        
//         .welcome-card:hover {
//           transform: translateY(-5px);
//           box-shadow: 0 25px 80px rgba(0, 0, 0, 0.35);
//         }
        
//         .welcome-title {
//           font-size: 2rem;
//           font-weight: 700;
//           color: #2c3e50;
//           margin-bottom: 0.5rem;
//           background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
//           -webkit-background-clip: text;
//           -webkit-text-fill-color: transparent;
//           background-clip: text;
//         }
        
//         .welcome-subtitle {
//           font-size: 1.1rem;
//           line-height: 1.5;
//         }
        
//         @media (max-width: 768px) {
//           .welcome-card {
//             padding: 2rem 1.5rem;
//           }
          
//           .welcome-title {
//             font-size: 2rem;
//           }
//         }
        
//         @media (max-width: 576px) {
//           .welcome-card {
//             padding: 1.5rem 1rem;
//           }
          
//           .welcome-title {
//             font-size: 1.75rem;
//           }
          
//           .welcome-subtitle {
//             font-size: 1rem;
//           }
//         }
//       `}</style>
//     </div>
//   );
// };

// export default WelcomePage;


//----------------------------------------------------------end1

import React from 'react';
import { Link } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

const WelcomePage = () => {
  // Styles matching the Akaunting-style layout
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
      maxWidth: '400px',
      padding: '20px 10px',
    },
    cardTitle: {
      fontSize: '1.8rem',
      fontWeight: '700',
      color: '#1a202c',
      marginBottom: '0.75rem',
      textAlign: 'center',
    },
    cardSubtitle: {
      color: '#718096',
      marginBottom: '2rem',
      fontSize: '0.95rem',
      textAlign: 'center',
    },
    logo: {
      width: '100px',
      height: '100px',
      margin: '0 auto 1rem',
      display: 'block',
      objectFit: 'contain',
    },
    buttonPrimary: {
      width: '100%',
      padding: '0.75rem',
      background: '#2a4d7a',
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      fontSize: '1rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s',
      height: '48px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '10px',
      textDecoration: 'none',
    },
    buttonPrimaryHover: {
      background: '#1e3a5f',
    },
    buttonOutline: {
      width: '100%',
      padding: '0.75rem',
      background: 'transparent',
      color: '#2a4d7a',
      border: '2px solid #2a4d7a',
      borderRadius: '8px',
      fontSize: '1rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s',
      height: '48px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '10px',
      textDecoration: 'none',
    },
    buttonOutlineHover: {
      background: '#2a4d7a',
      color: '#fff',
    },
    footerText: {
      textAlign: 'center',
      marginTop: '2rem',
      paddingTop: '1.5rem',
      borderTop: '1px solid #e2e8f0',
      color: '#718096',
      fontSize: '0.85rem',
    },
    // Responsive adjustments
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
          <img
            src="/logo/logo.png"
            alt="Ams Logo"
            style={styles.logo}
          />
          <h2 style={styles.cardTitle}>Ams Software</h2>
          <p style={styles.cardSubtitle}>
            Get started by creating an account or logging in
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Link
              to="/auth/register"
              style={styles.buttonPrimary}
              onMouseEnter={(e) => {
                e.target.style.background = styles.buttonPrimaryHover.background;
              }}
              onMouseLeave={(e) => {
                e.target.style.background = styles.buttonPrimary.background;
              }}
            >
              <i className="bi bi-person-plus"></i>
              Create Account
            </Link>

            <Link
              to="/auth/login"
              style={styles.buttonOutline}
              onMouseEnter={(e) => {
                e.target.style.background = styles.buttonOutlineHover.background;
                e.target.style.color = styles.buttonOutlineHover.color;
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
                e.target.style.color = '#2a4d7a';
              }}
            >
              <i className="bi bi-box-arrow-in-right"></i>
              Sign In
            </Link>
          </div>

          <div style={styles.footerText}>
            <i className="bi bi-shield-check me-1"></i>
            Secure &nbsp;·&nbsp; 
            <i className="bi bi-clock-history me-1 ms-1"></i>
            24/7 Access &nbsp;·&nbsp;
            <i className="bi bi-graph-up-arrow me-1 ms-1"></i>
            Real-time Analytics
          </div>
        </div>
      </div>

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

export default WelcomePage;