import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { FaEnvelope, FaArrowLeft, FaPaperPlane } from 'react-icons/fa';
import NotificationToast from '../NotificationToast';
import Header from '../retailer/Header';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

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

  // Add authorization header to all requests (optional for this endpoint)
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
    
    // Basic validation
    if (!email) {
      setNotification({
        show: true,
        message: 'Please enter your email address',
        type: 'error',
        duration: 3000
      });
      return;
    }

    // Email format validation
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
      
      // Handle different error responses
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

  if (submitted) {
    return (
      <div className='container-fluid'>
        <Header />
        <div className="container mt-4">
          <div className="row justify-content-center">
            <div className="col-lg-6 col-md-8 col-sm-10">
              <div className="card shadow-sm border-0 mt-4">
                <div className="card-header bg-success text-white text-center py-3">
                  <h4 className="mb-0">Check Your Email</h4>
                </div>
                <div className="card-body p-4 text-center">
                  <div className="mb-4">
                    <FaEnvelope size={48} className="text-success" />
                  </div>
                  <h5 className="mb-3">Password Reset Link Sent!</h5>
                  <p className="text-muted mb-4">
                    We've sent a password reset link to <strong>{email}</strong>.
                    Please check your inbox and follow the instructions to reset your password.
                  </p>
                  <p className="text-muted small mb-4">
                    Didn't receive the email? Check your spam folder or try again.
                  </p>
                  <div className="d-flex justify-content-center gap-3">
                    <button
                      className="btn btn-outline-primary"
                      onClick={() => {
                        setSubmitted(false);
                        setEmail('');
                      }}
                    >
                      Try Again
                    </button>
                    <Link to="/auth/login" className="btn btn-primary">
                      Go to Login
                    </Link>
                  </div>
                </div>
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

  return (
    <div className='container-fluid'>
      <Header />
      <div className="container mt-4">
        <div className="row justify-content-center">
          <div className="col-lg-6 col-md-8 col-sm-10">
            <div className="card shadow-sm border-0 mt-4">
              <div className="card-header bg-primary text-white text-center py-3">
                <h4 className="mb-0">Forgot Password</h4>
                <p className="mb-0 mt-1 small text-white-50">
                  Enter your email to receive a reset link
                </p>
              </div>
              <div className="card-body p-4">
                <form onSubmit={handleSubmit}>
                  <div className="mb-4">
                    <label htmlFor="email" className="form-label" style={{ fontSize: '0.85rem' }}>
                      Email Address <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-white border-end-0">
                        <FaEnvelope className="text-muted" size={16} />
                      </span>
                      <input
                        type="email"
                        className="form-control border-start-0"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="Enter your registered email"
                        style={{ height: '38px', fontSize: '0.85rem' }}
                        autoFocus
                      />
                    </div>
                    <div className="form-text text-muted small mt-1">
                      We'll send a password reset link to this email address.
                    </div>
                  </div>

                  <div className="d-flex justify-content-between align-items-center">
                    <Link 
                      to="/auth/login" 
                      className="btn btn-outline-secondary btn-sm"
                      style={{ height: '34px', fontSize: '0.8rem', padding: '0 16px' }}
                    >
                      <FaArrowLeft className="me-1" size={12} />
                      Back to Login
                    </Link>
                    <button
                      type="submit"
                      className="btn btn-primary btn-sm"
                      disabled={loading}
                      style={{ height: '34px', fontSize: '0.8rem', padding: '0 20px' }}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" style={{ width: '12px', height: '12px' }}></span>
                          Sending...
                        </>
                      ) : (
                        <>
                          <FaPaperPlane className="me-1" size={12} />
                          Send Reset Link
                        </>
                      )}
                    </button>
                  </div>
                </form>

                <hr className="my-4" />

                <div className="text-center">
                  <p className="small text-muted mb-0">
                    Remember your password?{' '}
                    <Link to="/auth/login" className="text-decoration-none">
                      Sign In
                    </Link>
                  </p>
                </div>
              </div>
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
};

export default ForgotPassword;