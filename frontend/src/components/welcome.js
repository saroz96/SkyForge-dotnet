// import React from 'react';
// import { Link } from 'react-router-dom';
// import 'bootstrap/dist/css/bootstrap.min.css';

// const WelcomePage = () => {
//   return (
//     <div style={styles.body}>
//       <div style={styles.container}>
//         <h1 style={styles.heading}>Skyforge</h1>
//         <p style={styles.paragraph}>Get started by creating an account or logging in.</p>
//         <Link to="/auth/register" className="btn btn-primary" style={styles.button}>
//           Register
//         </Link>
//         <Link to="/auth/login" className="btn btn-secondary" style={styles.button}>
//           Login
//         </Link>
//       </div>
//     </div>
//   );
// };

// const styles = {
//   body: {
//     display: 'flex',
//     justifyContent: 'center',
//     alignItems: 'center',
//     height: '100vh',
//     margin: 0,
//     fontFamily: 'Arial, sans-serif',
//     backgroundImage: 'url(/logo/background.png)',
//     backgroundSize: 'cover',
//     backgroundPosition: 'center',
//     backgroundRepeat: 'no-repeat',
//     backgroundAttachment: 'fixed',
//   },
//   container: {
//     textAlign: 'center',
//     background: '#ffffff',
//     padding: '3rem',
//     borderRadius: '15px',
//     boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
//     maxWidth: '400px',
//     width: '100%',
//   },
//   heading: {
//     color: '#007bff',
//     fontSize: '2rem',
//     marginBottom: '1.5rem',
//   },
//   paragraph: {
//     color: '#495057',
//     marginBottom: '2rem',
//     fontSize: '1.1rem',
//   },
//   button: {
//     width: '100%',
//     padding: '0.75rem 1.5rem',
//     fontSize: '1.2rem',
//     borderRadius: '8px',
//     marginBottom: '1rem',
//     transition: 'all 0.3s ease-in-out',
//   },
// };

// export default WelcomePage;

//------------------------------------------------end

import React from 'react';
import { Link } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

const WelcomePage = () => {
  return (
    <div className="welcome-container">
      <section className="welcome-section">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-xl-4 col-lg-5 col-md-6">
              <div className="welcome-card">
                <div className="welcome-header text-center mb-4">
                  <img
                    src="/logo/logo.jpg"
                    alt="Skyforge Logo"
                    className="welcome-logo mb-3"
                    style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      objectFit: 'cover'
                    }}
                  />
                  <h1 className="welcome-title">Skyforge</h1>
                  <p className="welcome-subtitle text-muted">
                    Get started by creating an account or logging in
                  </p>
                </div>

                <div className="welcome-body">
                  <div className="d-grid gap-3">
                    <Link
                      to="/auth/register"
                      className="btn btn-primary btn-lg py-2"
                      style={{
                        fontSize: '1.1rem',
                        fontWeight: '500'
                      }}
                    >
                      <i className="bi bi-person-plus me-2"></i>
                      Create Account
                    </Link>

                    <Link
                      to="/auth/login"
                      className="btn btn-outline-primary btn-lg py-2"
                      style={{
                        fontSize: '1.1rem',
                        fontWeight: '500'
                      }}
                    >
                      <i className="bi bi-box-arrow-in-right me-2"></i>
                      Sign In
                    </Link>
                  </div>

                  <div className="text-center mt-4 pt-3 border-top">
                    <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>
                      Continue to explore Skyforge's features
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <style jsx>{`
        .welcome-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          position: relative;
        }
        
        .welcome-container::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: url('/logo/background.png');
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          opacity: 0.1;
        }
        
        .welcome-section {
          position: relative;
          z-index: 1;
          width: 100%;
        }
        
        .welcome-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          padding: 2.5rem;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.2);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        
        .welcome-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 25px 80px rgba(0, 0, 0, 0.35);
        }
        
        .welcome-title {
          font-size: 2rem;
          font-weight: 700;
          color: #2c3e50;
          margin-bottom: 0.5rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .welcome-subtitle {
          font-size: 1.1rem;
          line-height: 1.5;
        }
        
        @media (max-width: 768px) {
          .welcome-card {
            padding: 2rem 1.5rem;
          }
          
          .welcome-title {
            font-size: 2rem;
          }
        }
        
        @media (max-width: 576px) {
          .welcome-card {
            padding: 1.5rem 1rem;
          }
          
          .welcome-title {
            font-size: 1.75rem;
          }
          
          .welcome-subtitle {
            font-size: 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default WelcomePage;


